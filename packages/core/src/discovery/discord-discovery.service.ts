import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { Client, ContextMenuCommandBuilder, SlashCommandBuilder } from 'discord.js';
import { styleText } from 'node:util';
import {
  AUTOCOMPLETE_METADATA,
  BUTTON_METADATA,
  COMMAND_GROUP_METADATA,
  COMMAND_METADATA,
  CONTEXT_MENU_METADATA,
  DISCORD_CLIENT,
  DISCORD_MODULE_OPTIONS,
  DiscordLogger,
  MODAL_METADATA,
  ON_EVENT_METADATA,
  PREFIX_COMMAND_METADATA,
  SELECT_METADATA,
  SLASH_COMMAND_METADATA,
  SUBCOMMAND_METADATA,
  type CommandMeta,
  type DiscordModuleOptions,
  type SlashCommandMeta,
} from '@discord.ts/common';
import { DiscordSyncService } from './discord-sync.service';
import { applyOptions, optionsDto } from './discord-args';
import { validateDiscoveryState } from './discord-validate';
import type {
  AutocompleteEntry,
  ButtonEntry,
  EventEntry,
  Handler,
  MenuEntry,
  ModalEntry,
  PrefixEntry,
  SelectEntry,
  SlashEntry,
} from './handler.types';

// Nest discovery reference: providers -> methods -> metadata (@nestjs/core DiscoveryService).
// Routing lives in DiscordRoutingService; this service owns scan state, JSON, login.
@Injectable()
export class DiscordDiscoveryService
  implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown
{
  readonly slash: SlashEntry[] = [];
  readonly menus: MenuEntry[] = [];
  readonly buttons: ButtonEntry[] = [];
  readonly selects: SelectEntry[] = [];
  readonly modals: ModalEntry[] = [];
  readonly autocompletes: AutocompleteEntry[] = [];
  readonly events: EventEntry[] = [];
  readonly prefix: PrefixEntry[] = [];
  private readonly logger = new DiscordLogger('Discovery');

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
    @Inject(DISCORD_MODULE_OPTIONS) private readonly opts: DiscordModuleOptions,
    private readonly sync: DiscordSyncService,
  ) {}

  onModuleInit(): void {
    this.scan();
    validateDiscoveryState(this);
    this.logRoutes();
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.opts.skipRegistration) await this.sync.sync(this.buildJson());
    await this.client.login(this.opts.token);
    this.logger.ready('Logged in to Discord gateway');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.destroy();
  }

  buildJson(): unknown[] {
    const tops = new Map<string, SlashCommandBuilder>();
    const groups = new Map<string, Map<string, { desc: string; subs: SlashEntry[] }>>();
    const topOf = (s: SlashEntry): SlashCommandBuilder => {
      let b = tops.get(s.top);
      if (!b) {
        b = new SlashCommandBuilder().setName(s.top).setDescription(s.topDescription);
        this.applyCommandFlags(b, s.meta);
        tops.set(s.top, b);
      }
      return b;
    };
    for (const s of this.slash) {
      const b = topOf(s);
      if (!s.sub) {
        applyOptions(b, optionsDto(s));
        continue;
      }
      if (!s.group) {
        const dto = optionsDto(s);
        const desc = s.subDescription ?? s.sub ?? '';
        b.addSubcommand((sub) => {
          sub.setName(s.sub as string).setDescription(desc);
          applyOptions(sub as unknown as SlashCommandBuilder, dto);
          return sub;
        });
        continue;
      }
      let byGroup = groups.get(s.top);
      if (!byGroup) {
        byGroup = new Map();
        groups.set(s.top, byGroup);
      }
      const g = byGroup.get(s.group) ?? {
        desc: s.groupDescription ?? s.group,
        subs: [] as SlashEntry[],
      };
      g.subs.push(s);
      byGroup.set(s.group, g);
    }
    for (const [top, byGroup] of groups) {
      const b = tops.get(top);
      if (!b) continue;
      for (const [group, g] of byGroup) {
        b.addSubcommandGroup((grp) => {
          grp.setName(group).setDescription(g.desc);
          for (const s of g.subs) {
            const dto = optionsDto(s);
            const desc = s.subDescription ?? s.sub ?? '';
            grp.addSubcommand((sub) => {
              sub.setName(s.sub as string).setDescription(desc);
              applyOptions(sub as unknown as SlashCommandBuilder, dto);
              return sub;
            });
          }
          return grp;
        });
      }
    }
    const out: unknown[] = [...tops.values()].map((b) => b.toJSON());
    for (const m of this.menus) {
      const mb = new ContextMenuCommandBuilder().setName(m.name).setType(m.type);
      if (m.meta.defaultMemberPermissions !== undefined)
        mb.setDefaultMemberPermissions(m.meta.defaultMemberPermissions);
      if (m.meta.contexts !== undefined) mb.setContexts(...m.meta.contexts);
      out.push(mb.toJSON());
    }
    return out;
  }

  private applyCommandFlags(
    b: Pick<SlashCommandBuilder, 'setNSFW' | 'setDefaultMemberPermissions' | 'setContexts'>,
    meta: SlashCommandMeta,
  ): void {
    if (meta.nsfw !== undefined) b.setNSFW(meta.nsfw);
    if (meta.defaultMemberPermissions !== undefined)
      b.setDefaultMemberPermissions(meta.defaultMemberPermissions);
    if (meta.contexts !== undefined) b.setContexts(...meta.contexts);
  }

  // ponytail: Nest RoutesResolver style, one line per route plus summary
  private logRoutes(): void {
    for (const s of this.slash) {
      const name = s.sub ? `/${s.top} ${s.sub}` : `/${s.top}`;
      this.logger.route(
        `Slash ${styleText('green', name)} -> ${s.instance.constructor.name}.${s.method}`,
      );
    }
    for (const m of this.menus)
      this.logger.route(
        `Menu ${styleText('green', m.name)} -> ${m.instance.constructor.name}.${m.method}`,
      );
    for (const p of this.prefix)
      this.logger.route(
        `Prefix ${styleText('green', `!${p.name}`)} -> ${p.instance.constructor.name}.${p.method}`,
      );
    for (const e of this.events)
      this.logger.route(
        `Event ${styleText('yellow', e.event)} -> ${e.instance.constructor.name}.${e.method}`,
      );
    this.logger.log(
      `Discovered ${this.slash.length} slash, ${this.menus.length} menus, ${this.buttons.length} buttons, ${this.selects.length} selects, ${this.modals.length} modals, ${this.events.length} events, ${this.prefix.length} prefix`,
    );
  }

  private scan(): void {
    const providers = this.discovery.getProviders();
    for (const w of providers) {
      const instance = w.instance as Record<string, unknown> | null | undefined;
      if (!instance || typeof instance !== 'object') continue;
      const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
      if (!proto) continue;
      const names = this.scanner.getAllMethodNames(proto);
      const group = Reflect.getMetadata(COMMAND_GROUP_METADATA, instance.constructor) as
        | { name: string; description: string }
        | undefined;
      for (const name of names) {
        const fn = (instance as Record<string, (...a: never[]) => unknown>)[name];
        if (typeof fn !== 'function') continue;
        const base = { instance, method: name } as Handler;

        const cmd = this.reflect<CommandMeta>(COMMAND_METADATA, fn);
        if (cmd && !cmd.slash && !cmd.prefix)
          throw new Error(
            `[discord.ts] @Command ${instance.constructor.name}.${name}: set slash or prefix to true.`,
          );
        if (cmd?.slash)
          this.slash.push({
            ...base,
            top: cmd.name,
            topDescription: cmd.description,
            meta: {
              name: cmd.name,
              description: cmd.description,
              nsfw: cmd.nsfw,
              defaultMemberPermissions: cmd.defaultMemberPermissions,
              contexts: cmd.contexts,
            },
          });
        if (cmd?.prefix) this.prefix.push({ ...base, name: cmd.name, aliases: cmd.aliases ?? [] });

        const slash = this.reflect<{ name: string; description: string }>(
          SLASH_COMMAND_METADATA,
          fn,
        );
        const sub = this.reflect<{ name: string; description: string }>(SUBCOMMAND_METADATA, fn);
        const methodGroup = this.reflect<{ name: string }>(COMMAND_GROUP_METADATA, fn);
        if (slash && !sub) {
          this.slash.push({
            ...base,
            top: slash.name,
            topDescription: slash.description,
            meta: slash,
          });
        } else if (sub && (group ?? methodGroup)) {
          const top = group?.name ?? slash?.name ?? methodGroup?.name ?? sub.name;
          const topDescription = group?.description ?? slash?.description ?? sub.description;
          this.slash.push({
            ...base,
            top,
            topDescription,
            group: group && methodGroup ? methodGroup.name : undefined,
            groupDescription: group?.description,
            sub: sub.name,
            subDescription: sub.description,
            meta: slash ?? { name: top, description: topDescription },
          });
        } else if (sub && slash) {
          this.slash.push({
            ...base,
            top: slash.name,
            topDescription: slash.description,
            sub: sub.name,
            subDescription: sub.description,
            meta: slash,
          });
        }

        const menu = this.reflect<{
          name: string;
          type: MenuEntry['type'];
        }>(CONTEXT_MENU_METADATA, fn);
        if (menu) this.menus.push({ ...base, ...menu, meta: menu });

        const btn = this.reflect<{ customId: string | RegExp }>(BUTTON_METADATA, fn);
        if (btn) this.buttons.push({ ...base, ...btn });

        const sel = this.reflect<{ kind: string; customId: string | RegExp }>(SELECT_METADATA, fn);
        if (sel) this.selects.push({ ...base, ...sel });

        const modal = this.reflect<{ customId: string | RegExp }>(MODAL_METADATA, fn);
        if (modal) this.modals.push({ ...base, ...modal });

        const ac = this.reflect<{ commandName?: string }>(AUTOCOMPLETE_METADATA, fn);
        if (ac) this.autocompletes.push({ ...base, ...ac });

        const ev = this.reflect<{ event: string; once: boolean }>(ON_EVENT_METADATA, fn);
        if (ev) this.events.push({ ...base, ...ev });

        const pre = this.reflect<{ name: string; aliases?: string[] }>(PREFIX_COMMAND_METADATA, fn);
        if (pre) this.prefix.push({ ...base, name: pre.name, aliases: pre.aliases ?? [] });
      }
    }
  }

  private reflect<T>(key: string, fn: unknown): T | undefined {
    return this.reflector.get<T, unknown>(key, fn as never) as T | undefined;
  }
}
