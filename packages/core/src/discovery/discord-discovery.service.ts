import { Client, ContextMenuCommandBuilder } from 'discord.js';
import {
  AUTOCOMPLETE_METADATA,
  BUTTON_METADATA,
  CONTEXT_MENU_METADATA,
  type DiscordModuleOptions,
  DiscordLogger,
  MODAL_METADATA,
  ON_EVENT_METADATA,
  SELECT_METADATA,
} from '@discord.ts/common';
import {
  buildCommandDefinitions,
  commandLeaves,
  renderCommandDefinition,
  type CommandDefinition,
} from './command-definition.js';
import { DiscordSyncService } from './discord-sync.service.js';
import { unknownLocales } from './discord-localize.js';
import { validateDiscoveryState } from './discord-validate.js';
import type {
  AutocompleteEntry,
  ButtonEntry,
  EventEntry,
  Handler,
  MenuEntry,
  ModalEntry,
  SelectEntry,
} from './handler.types.js';

// ponytail: Bun.color instead of node:util styleText, one reset code.
const paint = (name: string, text: string): string =>
  `${Bun.color(name, 'ansi') ?? ''}${text}\x1b[0m`;

// Standalone scan: instances -> methods -> metadata. No Nest dep.
// Slash metadata becomes CommandDefinitions (command-definition.ts); this
// service keeps the other handler kinds plus login/JSON orchestration.
export class DiscordDiscoveryService {
  readonly commands: CommandDefinition[] = [];
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
    this.commands.push(...buildCommandDefinitions(instances));
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
    const out: unknown[] = this.commands.map(renderCommandDefinition);
    for (const m of this.menus) {
      const mb = new ContextMenuCommandBuilder().setName(m.name).setType(m.type);
      if (m.meta.defaultMemberPermissions !== undefined)
        mb.setDefaultMemberPermissions(m.meta.defaultMemberPermissions);
      if (m.meta.contexts !== undefined) mb.setContexts(...m.meta.contexts);
      out.push(mb.toJSON());
    }
    return out;
  }

  // ponytail: Nest RoutesResolver style, one line per route plus summary
  private logRoutes(): void {
    for (const def of this.commands) {
      for (const leaf of commandLeaves(def)) {
        const name = leaf.sub
          ? `/${def.name} ${leaf.group ? `${leaf.group} ` : ''}${leaf.sub}`
          : `/${def.name}`;
        this.logger.route(
          `Slash ${paint('green', name)} -> ${leaf.instance.constructor.name}.${leaf.method}`,
        );
      }
    }
    for (const m of this.menus)
      this.logger.route(
        `Menu ${paint('green', m.name)} -> ${m.instance.constructor.name}.${m.method}`,
      );
    for (const e of this.events)
      this.logger.route(
        `Event ${paint('yellow', e.event)} -> ${e.instance.constructor.name}.${e.method}`,
      );
    const leaves = this.commands.reduce((n, c) => n + commandLeaves(c).length, 0);
    this.logger.log(
      `Discovered ${leaves} slash, ${this.menus.length} menus, ${this.buttons.length} buttons, ${this.selects.length} selects, ${this.modals.length} modals, ${this.events.length} events`,
    );
  }

  private scan(instances: object[]): void {
    for (const instance of instances) {
      if (!instance || typeof instance !== 'object') continue;
      const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
      if (!proto) continue;
      const names = Object.getOwnPropertyNames(proto).filter((n) => n !== 'constructor');
      for (const name of names) {
        const fn = (instance as Record<string, (...a: never[]) => unknown>)[name];
        if (typeof fn !== 'function') continue;
        const base = { instance, method: name } as Handler;

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
