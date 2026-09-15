import { Client, Events } from 'discord.js';
import {
  DISCORD_CLIENT,
  DISCORD_MODULE_OPTIONS,
  DiscordLogger,
  GUARDS_METADATA,
  OPTION_FIELD_METADATA,
  PARAM_OPTIONS_METADATA,
  PIPES_METADATA,
  type DiscordModuleOptions,
  type OptionFieldMeta,
} from '@discord.ts/common';
import { DiscordExecutionContext } from '../context/discord-execution-context.js';
import { buildArgs, buildEventArgs } from './discord-args.js';
import { DiscordDiscoveryService } from './discord-discovery.service.js';
import { matches, splitArgs, type Handler } from './handler.types.js';

// Reads scan state from DiscordDiscoveryService. Subscribe after discovery init.
export class DiscordRoutingService {
  private readonly logger = new DiscordLogger('Routing');

  constructor(
    private readonly client: Client,
    private readonly opts: DiscordModuleOptions,
    private readonly discovery: DiscordDiscoveryService,
    private readonly guards: Map<unknown, { canActivate(ctx: unknown): unknown }>,
    private readonly pipes: Map<
      unknown,
      { transform(v: unknown, m: unknown): unknown }
    > = new Map(),
  ) {
    void DISCORD_CLIENT;
    void DISCORD_MODULE_OPTIONS;
  }

  subscribe(): void {
    this.client.on(Events.InteractionCreate, (i) => void this.route(i));
    // ponytail: warn/error always, debug only with DISCORD_DEBUG=true
    this.client.on(Events.Warn, (m) => this.logger.warn(m));
    this.client.on(Events.Error, (e) => this.logger.error(e));
    if (process.env.DISCORD_DEBUG === 'true')
      this.client.on(Events.Debug, (m) => this.logger.debug(m));
    for (const e of this.discovery.events) {
      const run = (...args: unknown[]) => void this.invoke(e, args[0], args);
      if (e.once) this.client.once(e.event, run);
      else this.client.on(e.event, run);
    }
    if (this.discovery.prefix.length) {
      this.client.on(Events.MessageCreate, (m) => void this.routePrefix(m));
    }
  }

  private async route(interaction: {
    isChatInputCommand(): boolean;
    isContextMenuCommand(): boolean;
    isButton(): boolean;
    isAnySelectMenu?(): boolean;
    isModalSubmit(): boolean;
    isAutocomplete(): boolean;
  }): Promise<void> {
    const anyIx = interaction as unknown as Record<string, (...a: never[]) => unknown> & {
      commandName?: string;
      customId?: string;
    };
    if (interaction.isChatInputCommand()) {
      const cmd = anyIx as unknown as {
        commandName: string;
        options: {
          getSubcommandGroup(required: false): string | null;
          getSubcommand(required: false): string | null;
        };
      };
      const group = cmd.options.getSubcommandGroup(false);
      const sub = cmd.options.getSubcommand(false);
      const found =
        this.discovery.slash.find(
          (s) => s.top === cmd.commandName && s.group === group && s.sub === sub,
        ) ??
        this.discovery.slash.find((s) => s.top === cmd.commandName && s.sub === sub && !s.group) ??
        this.discovery.slash.find((s) => s.top === cmd.commandName && !s.sub);
      if (found) await this.invoke(found, anyIx, [anyIx]);
      return;
    }
    if (interaction.isContextMenuCommand()) {
      const cmd = anyIx as unknown as { commandName: string };
      const found = this.discovery.menus.find((m) => m.name === cmd.commandName);
      if (found) await this.invoke(found, anyIx, [anyIx]);
      return;
    }
    if (interaction.isButton()) {
      const found = this.discovery.buttons.find((b) =>
        matches(b.customId, anyIx.customId as string),
      );
      if (found) await this.invoke(found, anyIx, [anyIx]);
      return;
    }
    const maybeSelect = anyIx as unknown as {
      isStringSelectMenu(): boolean;
      isUserSelectMenu(): boolean;
      isRoleSelectMenu(): boolean;
      isChannelSelectMenu(): boolean;
      isMentionableSelectMenu(): boolean;
    };
    if (typeof maybeSelect.isStringSelectMenu === 'function') {
      const kind = maybeSelect.isStringSelectMenu()
        ? 'string'
        : maybeSelect.isUserSelectMenu()
          ? 'user'
          : maybeSelect.isRoleSelectMenu()
            ? 'role'
            : maybeSelect.isChannelSelectMenu()
              ? 'channel'
              : maybeSelect.isMentionableSelectMenu()
                ? 'mentionable'
                : undefined;
      if (kind) {
        const found = this.discovery.selects.find(
          (s) => s.kind === kind && matches(s.customId, anyIx.customId as string),
        );
        if (found) await this.invoke(found, anyIx, [anyIx]);
        return;
      }
    }
    if (interaction.isModalSubmit()) {
      const found = this.discovery.modals.find((m) =>
        matches(m.customId, anyIx.customId as string),
      );
      if (found) await this.invoke(found, anyIx, [anyIx]);
      return;
    }
    if (interaction.isAutocomplete()) {
      const cmd = anyIx as unknown as { commandName: string };
      const found = this.discovery.autocompletes.find(
        (a) => !a.commandName || a.commandName === cmd.commandName,
      );
      if (found) await this.invoke(found, anyIx, [anyIx]);
    }
  }

  private async invoke(
    h: Handler,
    interaction: unknown,
    raw: unknown[],
    prefixArgs?: string[],
  ): Promise<void> {
    try {
      if (!(await this.canActivate(h, interaction))) return;
      const args =
        h && raw.length > 1
          ? buildEventArgs(h, raw, this.opts.i18n?.defaultLocale)
          : buildArgs(h, interaction, prefixArgs, this.opts.i18n?.defaultLocale);
      if (!(await this.runPipesAndValidate(h, args, interaction))) return;
      await (h.instance[h.method] as (...a: unknown[]) => unknown).apply(h.instance, args);
    } catch (err) {
      // ponytail: log, never crash gateway loop
      this.logger.error(`handler ${h.method} failed:`, err);
    }
  }

  /** Prefix text routing. Ignores bots, matches prefix + name/alias,
   * then first token to a @Subcommand() method, else the bare handler. */
  private async routePrefix(message: {
    author?: { bot?: boolean };
    content?: string;
    reply(msg: unknown): Promise<unknown>;
  }): Promise<void> {
    if (message.author?.bot) return;
    const prefixes = Array.isArray(this.opts.prefix) ? this.opts.prefix : [this.opts.prefix ?? '!'];
    const content = message.content ?? '';
    const hit = prefixes.find((p) => content.startsWith(p));
    if (!hit) return;
    const [name, ...rest] = content.slice(hit.length).trim().split(/\s+/);
    if (!name) return;
    const candidates = this.discovery.prefix.filter(
      (p) => p.name === name || p.aliases.includes(name),
    );
    if (!candidates.length) return;
    const args = splitArgs(rest.join(' '));
    const sub =
      args.length > 0
        ? candidates.find(
            (c) => c.sub !== undefined && c.sub.toLowerCase() === args[0]?.toLowerCase(),
          )
        : undefined;
    const target = sub ?? candidates.find((c) => c.sub === undefined);
    if (!target) return;
    await this.invoke(target, message, [message], sub ? args.slice(1) : args);
  }

  /** @UsePipes() + required check + class-validator (if installed). False = blocked. */
  private async runPipesAndValidate(
    h: Handler,
    args: unknown[],
    interaction: unknown,
  ): Promise<boolean> {
    const fn = h.instance[h.method] as (...a: never[]) => unknown;
    const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
    const optIdx: number[] = Reflect.getMetadata(PARAM_OPTIONS_METADATA, fn) ?? [];
    if (!optIdx.length) return true;
    const pipes = this.collectMeta<unknown>(PIPES_METADATA, h);
    for (const i of optIdx) {
      let value = args[i];
      const metatype = types[i] as new (...a: never[]) => unknown;
      for (const p of pipes) {
        const inst =
          typeof p === 'object' && p !== null && 'transform' in (p as object)
            ? (p as { transform(v: unknown, m: unknown): unknown })
            : this.resolvePipe(p);
        value = await inst.transform(value, { type: 'custom', metatype, data: undefined });
      }
      args[i] = value;
      const err = await this.validateDto(value);
      if (err) {
        await this.replyError(interaction, err);
        return false;
      }
    }
    return true;
  }

  private resolvePipe(p: unknown): { transform(v: unknown, m: unknown): unknown } {
    const found = this.pipes.get(p);
    if (found) return found as { transform(v: unknown, m: unknown): unknown };
    const Ctor = p as new () => { transform(v: unknown, m: unknown): unknown };
    return new Ctor();
  }

  private async validateDto(dto: unknown): Promise<string | null> {
    const rec = dto as Record<string, unknown> | null;
    if (!rec || typeof rec !== 'object') return null;
    const fields: Record<string, OptionFieldMeta> =
      Reflect.getMetadata(OPTION_FIELD_METADATA, (rec as object).constructor) ?? {};
    for (const [key, f] of Object.entries(fields)) {
      if (f.required && (rec[key] === null || rec[key] === undefined))
        return `Missing required option "${f.name}".`;
    }
    try {
      // ponytail: optional peer, plain DTOs without decorators pass free
      const { validate } = (await import('class-validator')) as unknown as {
        validate(o: object): Promise<{ constraints?: Record<string, string> }[]>;
      };
      const errors = await validate(rec as object);
      if (errors.length) {
        const first = Object.values(errors[0].constraints ?? {})[0] ?? 'Invalid options.';
        return first;
      }
    } catch {
      return null;
    }
    return null;
  }

  private async replyError(interaction: unknown, text: string): Promise<void> {
    const ix = interaction as {
      replied?: boolean;
      deferred?: boolean;
      reply?(msg: unknown): Promise<unknown>;
    };
    try {
      if (ix.reply && !ix.replied && !ix.deferred)
        await ix.reply({ content: text, ephemeral: true });
    } catch {
      // ignore reply failures, handler already blocked
    }
  }

  private collectMeta<T>(key: string, h: Handler): T[] {
    const fn = h.instance[h.method] as object;
    const cls = h.instance.constructor as object;
    return [
      ...((Reflect.getMetadata(key, cls) as T[] | undefined) ?? []),
      ...((Reflect.getMetadata(key, fn) as T[] | undefined) ?? []),
    ];
  }

  private async canActivate(h: Handler, interaction: unknown): Promise<boolean> {
    const guards = this.collectMeta<unknown>(GUARDS_METADATA, h);
    if (!guards.length) return true;
    const fn = h.instance[h.method] as (...args: never[]) => unknown;
    const cls = h.instance.constructor as new (...args: never[]) => unknown;
    for (const g of guards) {
      const inst = this.resolveGuard(g);
      const can = await inst.canActivate(DiscordExecutionContext.create([interaction], fn, cls));
      if (!can) return false;
    }
    return true;
  }

  private resolveGuard(g: unknown): { canActivate(ctx: unknown): unknown } {
    const found = this.guards.get(g);
    if (found) return found;
    const Ctor = g as new () => { canActivate(ctx: unknown): unknown };
    return new Ctor();
  }
}
