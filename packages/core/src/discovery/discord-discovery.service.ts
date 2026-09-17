import { Client, ContextMenuCommandBuilder, SlashCommandBuilder } from 'discord.js';
import {
  AUTOCOMPLETE_METADATA,
  BUTTON_METADATA,
  COMMAND_GROUP_METADATA,
  COMMAND_METADATA,
  type CommandGroupMeta,
  CONTEXT_MENU_METADATA,
  type CommandFlags,
  type CommandMeta,
  type DiscordModuleOptions,
  DiscordLogger,
  MODAL_METADATA,
  ON_EVENT_METADATA,
  SELECT_METADATA,
  SUBCOMMAND_METADATA,
  type SubcommandMeta,
} from '@discord.ts/common';
import { DiscordSyncService } from './discord-sync.service.js';
import { applyOptions, optionsDto } from './discord-args.js';
import {
  applyLocalizations,
  explicitPair,
  localizedPair,
  unknownLocales,
} from './discord-localize.js';
import { validateDiscoveryState } from './discord-validate.js';
import type {
  AutocompleteEntry,
  ButtonEntry,
  EventEntry,
  Handler,
  MenuEntry,
  ModalEntry,
  SelectEntry,
  SlashEntry,
} from './handler.types.js';

// ponytail: Bun.color instead of node:util styleText, one reset code.
const paint = (name: string, text: string): string =>
  `${Bun.color(name, 'ansi') ?? ''}${text}\x1b[0m`;

// Standalone scan: instances -> methods -> metadata. No Nest dep.
// Routing lives in DiscordRoutingService; this service owns scan state, JSON, login.
export class DiscordDiscoveryService {
  readonly slash: SlashEntry[] = [];
  readonly menus: MenuEntry[] = [];
  readonly buttons: ButtonEntry[] = [];
  readonly selects: SelectEntry[] = [];
  readonly modals: ModalEntry[] = [];
  readonly autocompletes: AutocompleteEntry[] = [];
  readonly events: EventEntry[] = [];
  private readonly logger = new DiscordLogger('Discovery');

  constructor(
    private readonly client: Client,
    private readonly opts: DiscordModuleOptions,
    private readonly sync: DiscordSyncService,
  ) {}

  init(instances: object[]): void {
    this.scan(instances);
    validateDiscoveryState(this);
    const unknown = unknownLocales();
    if (unknown.length)
      this.logger.warn(
        `i18n locales not recognized by Discord, skipped for command metadata: ${unknown.join(', ')}`,
      );
    this.logRoutes();
  }

  async start(): Promise<void> {
    if (!this.opts.skipRegistration) await this.sync.sync(this.buildJson());
    await this.client.login(this.opts.token);
    this.logger.ready('Logged in to Discord gateway');
  }

  async stop(): Promise<void> {
    await this.client.destroy();
  }

  buildJson(): unknown[] {
    const tops = new Map<string, SlashCommandBuilder>();
    const groups = new Map<
      string,
      Map<string, { localizations?: SlashEntry['groupLocalizations']; subs: SlashEntry[] }>
    >();
    const topOf = (s: SlashEntry): SlashCommandBuilder => {
      let b = tops.get(s.top);
      if (!b) {
        b = new SlashCommandBuilder().setName(s.top).setDescription(s.topDescription);
        applyLocalizations(b, localizedPair(`commands:${s.top}`, s.topLocalizations));
        this.applyCommandFlags(b, s.flags);
        tops.set(s.top, b);
      }
      return b;
    };
    for (const s of this.slash) {
      const b = topOf(s);
      if (!s.sub) {
        applyOptions(b, optionsDto(s), `commands:${s.top}`);
        continue;
      }
      const subKey = `commands:${s.top}.subcommands.${s.sub}`;
      if (!s.group) {
        const dto = optionsDto(s);
        const desc = s.subDescription ?? s.sub ?? '';
        b.addSubcommand((sub) => {
          sub.setName(s.sub as string).setDescription(desc);
          applyLocalizations(sub, localizedPair(subKey, s.subLocalizations));
          applyOptions(sub as unknown as SlashCommandBuilder, dto, subKey);
          return sub;
        });
        continue;
      }
      let byGroup = groups.get(s.top);
      if (!byGroup) {
        byGroup = new Map();
        groups.set(s.top, byGroup);
      }
      const g = byGroup.get(s.group) ?? { localizations: s.groupLocalizations, subs: [] };
      g.subs.push(s);
      byGroup.set(s.group, g);
    }
    for (const [top, byGroup] of groups) {
      const b = tops.get(top);
      if (!b) continue;
      for (const [group, g] of byGroup) {
        const desc = g.subs[0]?.groupDescription ?? group;
        b.addSubcommandGroup((grp) => {
          grp.setName(group).setDescription(desc);
          applyLocalizations(
            grp,
            localizedPair(`commands:${top}.groups.${group}`, g.localizations),
          );
          for (const s of g.subs) {
            const subKey = `commands:${top}.subcommands.${s.sub}`;
            const dto = optionsDto(s);
            const subDesc = s.subDescription ?? s.sub ?? '';
            grp.addSubcommand((sub) => {
              sub.setName(s.sub as string).setDescription(subDesc);
              applyLocalizations(sub, localizedPair(subKey, s.subLocalizations));
              applyOptions(sub as unknown as SlashCommandBuilder, dto, subKey);
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
    b: Pick<
      SlashCommandBuilder,
      'setNSFW' | 'setDefaultMemberPermissions' | 'setContexts' | 'setDMPermission'
    >,
    flags: CommandFlags,
  ): void {
    if (flags.nsfw !== undefined) b.setNSFW(flags.nsfw);
    if (flags.defaultMemberPermissions !== undefined)
      b.setDefaultMemberPermissions(flags.defaultMemberPermissions);
    if (flags.contexts !== undefined) b.setContexts(...flags.contexts);
    if (flags.dmPermission !== undefined) b.setDMPermission(flags.dmPermission);
  }

  // ponytail: Nest RoutesResolver style, one line per route plus summary
  private logRoutes(): void {
    for (const s of this.slash) {
      const name = s.sub ? `/${s.top} ${s.sub}` : `/${s.top}`;
      this.logger.route(
        `Slash ${paint('green', name)} -> ${s.instance.constructor.name}.${s.method}`,
      );
    }
    for (const m of this.menus)
      this.logger.route(
        `Menu ${paint('green', m.name)} -> ${m.instance.constructor.name}.${m.method}`,
      );
    for (const e of this.events)
      this.logger.route(
        `Event ${paint('yellow', e.event)} -> ${e.instance.constructor.name}.${e.method}`,
      );
    this.logger.log(
      `Discovered ${this.slash.length} slash, ${this.menus.length} menus, ${this.buttons.length} buttons, ${this.selects.length} selects, ${this.modals.length} modals, ${this.events.length} events`,
    );
  }

  private scan(instances: object[]): void {
    for (const instance of instances) {
      if (!instance || typeof instance !== 'object') continue;
      const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
      if (!proto) continue;
      const names = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
      const group = Reflect.getMetadata(COMMAND_GROUP_METADATA, instance.constructor) as
        | CommandGroupMeta
        | undefined;
      for (const name of names) {
        const fn = (instance as Record<string, (...a: never[]) => unknown>)[name];
        if (typeof fn !== 'function') continue;
        const base = { instance, method: name } as Handler;

        const cmd = Reflect.getMetadata(COMMAND_METADATA, fn) as CommandMeta | undefined;
        const sub = Reflect.getMetadata(SUBCOMMAND_METADATA, fn) as SubcommandMeta | undefined;
        const methodGroup = Reflect.getMetadata(COMMAND_GROUP_METADATA, fn) as
          | Partial<CommandGroupMeta>
          | undefined;
        if (cmd && !sub) {
          this.slash.push({
            ...base,
            top: cmd.name,
            topDescription: cmd.description,
            topLocalizations: explicitPair(cmd),
            flags: cmd,
          });
        } else if (sub && (group ?? methodGroup)) {
          const top = group?.name ?? cmd?.name ?? methodGroup?.name ?? sub.name;
          const topDescription = group?.description ?? cmd?.description ?? sub.description;
          this.slash.push({
            ...base,
            top,
            topDescription,
            topLocalizations: group
              ? explicitPair(group)
              : cmd
                ? explicitPair(cmd)
                : methodGroup
                  ? {
                      name: methodGroup.nameLocalizations,
                      description: sub.descriptionLocalizations,
                    }
                  : explicitPair(sub),
            group: group && methodGroup ? methodGroup.name : undefined,
            groupDescription: group?.description,
            groupLocalizations:
              group && methodGroup
                ? {
                    name: methodGroup.nameLocalizations,
                    description: group.descriptionLocalizations,
                  }
                : undefined,
            sub: sub.name,
            subDescription: sub.description,
            subLocalizations: explicitPair(sub),
            flags: cmd ?? {},
          });
        } else if (sub && cmd) {
          this.slash.push({
            ...base,
            top: cmd.name,
            topDescription: cmd.description,
            topLocalizations: explicitPair(cmd),
            sub: sub.name,
            subDescription: sub.description,
            subLocalizations: explicitPair(sub),
            flags: cmd,
          });
        }

        const menu = Reflect.getMetadata(CONTEXT_MENU_METADATA, fn) as
          | { name: string; type: MenuEntry['type'] }
          | undefined;
        if (menu) this.menus.push({ ...base, ...menu, meta: menu });

        const btn = Reflect.getMetadata(BUTTON_METADATA, fn) as
          | { customId: string | RegExp }
          | undefined;
        if (btn) this.buttons.push({ ...base, ...btn });

        const sel = Reflect.getMetadata(SELECT_METADATA, fn) as
          | { kind: string; customId: string | RegExp }
          | undefined;
        if (sel) this.selects.push({ ...base, ...sel });

        const modal = Reflect.getMetadata(MODAL_METADATA, fn) as
          | { customId: string | RegExp }
          | undefined;
        if (modal) this.modals.push({ ...base, ...modal });

        const ac = Reflect.getMetadata(AUTOCOMPLETE_METADATA, fn) as
          | { commandName?: string }
          | undefined;
        if (ac) this.autocompletes.push({ ...base, ...ac });

        const ev = Reflect.getMetadata(ON_EVENT_METADATA, fn) as
          | { event: string; once: boolean }
          | undefined;
        if (ev) this.events.push({ ...base, ...ev });
      }
    }
  }
}
