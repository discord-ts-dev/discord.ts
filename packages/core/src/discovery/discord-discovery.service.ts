import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { Client, ContextMenuCommandBuilder, SlashCommandBuilder } from 'discord.js';
import chalk from 'chalk';
import {
  AUTOCOMPLETE_METADATA,
  BUTTON_METADATA,
  COMMAND_GROUP_METADATA,
  CONTEXT_MENU_METADATA,
  DISCORD_CLIENT,
  DISCORD_MODULE_OPTIONS,
  DiscordLogger,
  MODAL_METADATA,
  ON_EVENT_METADATA,
  OPTION_FIELD_METADATA,
  PREFIX_COMMAND_METADATA,
  SELECT_METADATA,
  SLASH_COMMAND_METADATA,
  SUBCOMMAND_METADATA,
  type DiscordModuleOptions,
  type OptionFieldMeta,
} from '@discord.ts/common';
import { DiscordSyncService } from './discord-sync.service';
import { optionsDto } from './discord-args';
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
    for (const s of this.slash) {
      let b = tops.get(s.top);
      if (!b) {
        b = new SlashCommandBuilder().setName(s.top).setDescription(s.topDescription);
        tops.set(s.top, b);
      }
      if (s.sub) {
        const dto = optionsDto(s);
        const desc = s.subDescription ?? s.sub;
        b.addSubcommand((sub) => {
          sub.setName(s.sub as string).setDescription(desc);
          this.applyOptions(sub as unknown as SlashCommandBuilder, dto);
          return sub;
        });
      } else {
        this.applyOptions(b, optionsDto(s));
      }
    }
    const out: unknown[] = [...tops.values()].map((b) => b.toJSON());
    for (const m of this.menus) {
      out.push(new ContextMenuCommandBuilder().setName(m.name).setType(m.type).toJSON());
    }
    return out;
  }

  // ponytail: Nest RoutesResolver style, one line per route plus summary
  private logRoutes(): void {
    for (const s of this.slash) {
      const name = s.sub ? `/${s.top} ${s.sub}` : `/${s.top}`;
      this.logger.route(`Slash ${chalk.green(name)} -> ${s.instance.constructor.name}.${s.method}`);
    }
    for (const m of this.menus)
      this.logger.route(
        `Menu ${chalk.green(m.name)} -> ${m.instance.constructor.name}.${m.method}`,
      );
    for (const p of this.prefix)
      this.logger.route(
        `Prefix ${chalk.green(`!${p.name}`)} -> ${p.instance.constructor.name}.${p.method}`,
      );
    for (const e of this.events)
      this.logger.route(
        `Event ${chalk.yellow(e.event)} -> ${e.instance.constructor.name}.${e.method}`,
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

        const slash = this.reflect<{ name: string; description: string }>(
          SLASH_COMMAND_METADATA,
          fn,
        );
        const sub = this.reflect<{ name: string; description: string }>(SUBCOMMAND_METADATA, fn);
        const methodGroup = this.reflect<{ name: string }>(COMMAND_GROUP_METADATA, fn);
        if (slash && !sub) {
          this.slash.push({ ...base, top: slash.name, topDescription: slash.description });
        } else if (sub && (group ?? methodGroup)) {
          this.slash.push({
            ...base,
            top: group?.name ?? slash?.name ?? methodGroup?.name ?? sub.name,
            topDescription: group?.description ?? slash?.description ?? sub.description,
            group: group && methodGroup ? methodGroup.name : undefined,
            sub: sub.name,
            subDescription: sub.description,
          });
        } else if (sub && slash) {
          this.slash.push({
            ...base,
            top: slash.name,
            topDescription: slash.description,
            sub: sub.name,
            subDescription: sub.description,
          });
        }

        const menu = this.reflect<{
          name: string;
          type: MenuEntry['type'];
        }>(CONTEXT_MENU_METADATA, fn);
        if (menu) this.menus.push({ ...base, ...menu });

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

  private applyOptions(
    b: Pick<
      SlashCommandBuilder,
      | 'addStringOption'
      | 'addIntegerOption'
      | 'addNumberOption'
      | 'addBooleanOption'
      | 'addUserOption'
      | 'addChannelOption'
      | 'addRoleOption'
      | 'addMentionableOption'
      | 'addAttachmentOption'
    >,
    dto?: (new () => Record<string, unknown>) | undefined,
  ): void {
    if (!dto) return;
    const fields: Record<string, OptionFieldMeta> =
      Reflect.getMetadata(OPTION_FIELD_METADATA, dto) ?? {};
    for (const f of Object.values(fields)) {
      const setup = (o: {
        setName(n: string): unknown;
        setDescription(d: string): unknown;
        setRequired(r: boolean): unknown;
      }) => {
        o.setName(f.name);
        o.setDescription(f.description);
        o.setRequired(!!f.required);
        return o;
      };
      if (f.kind === 'string') b.addStringOption((o) => setup(o) as never);
      else if (f.kind === 'integer') b.addIntegerOption((o) => setup(o) as never);
      else if (f.kind === 'number') b.addNumberOption((o) => setup(o) as never);
      else if (f.kind === 'boolean') b.addBooleanOption((o) => setup(o) as never);
      else if (f.kind === 'user') b.addUserOption((o) => setup(o) as never);
      else if (f.kind === 'channel') b.addChannelOption((o) => setup(o) as never);
      else if (f.kind === 'role') b.addRoleOption((o) => setup(o) as never);
      else if (f.kind === 'mentionable') b.addMentionableOption((o) => setup(o) as never);
      else b.addAttachmentOption((o) => setup(o) as never);
    }
  }
}
