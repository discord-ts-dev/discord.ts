import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { GUARDS_METADATA, PIPES_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, MetadataScanner, ModuleRef, Reflector } from '@nestjs/core';
import {
  ApplicationCommandType,
  Client,
  ContextMenuCommandBuilder,
  Events,
  SlashCommandBuilder,
} from 'discord.js';
import {
  AUTOCOMPLETE_METADATA,
  BUTTON_METADATA,
  COMMAND_GROUP_METADATA,
  CONTEXT_MENU_METADATA,
  DISCORD_CLIENT,
  DISCORD_MODULE_OPTIONS,
  MODAL_METADATA,
  ON_EVENT_METADATA,
  OPTION_FIELD_METADATA,
  PARAM_CONTEXT_METADATA,
  PARAM_OPTIONS_METADATA,
  PARAM_PREFIX_ARGS_METADATA,
  PREFIX_COMMAND_METADATA,
  SELECT_METADATA,
  SLASH_COMMAND_METADATA,
  SUBCOMMAND_METADATA,
} from '../constants';
import type { DiscordModuleOptions } from '../types';
import { DiscordExecutionContext } from '../context/discord-execution-context';
import type { OptionFieldMeta } from '../decorators/options.decorator';
import { DiscordSyncService } from './discord-sync.service';

interface Handler {
  instance: Record<string, (...args: never[]) => unknown>;
  method: string;
}

interface SlashEntry extends Handler {
  top: string;
  topDescription: string;
  group?: string;
  sub?: string;
  subDescription?: string;
}

function matches(id: string | RegExp, value: string): boolean {
  return typeof id === 'string' ? id === value : id.test(value);
}

/** Split on spaces, keep "quoted parts" together. */
function splitArgs(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out.filter((s) => s.length > 0);
}

@Injectable()
export class DiscordDiscoveryService
  implements OnModuleInit, OnApplicationBootstrap, OnApplicationShutdown
{
  private slash: SlashEntry[] = [];
  private menus: (Handler & {
    name: string;
    type: ApplicationCommandType.User | ApplicationCommandType.Message;
  })[] = [];
  private buttons: (Handler & { customId: string | RegExp })[] = [];
  private selects: (Handler & { kind: string; customId: string | RegExp })[] = [];
  private modals: (Handler & { customId: string | RegExp })[] = [];
  private autocompletes: (Handler & { commandName?: string })[] = [];
  private events: (Handler & { event: string; once: boolean })[] = [];
  private prefix: (Handler & { name: string; aliases: string[] })[] = [];

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    @Inject(DISCORD_CLIENT) private readonly client: Client,
    @Inject(DISCORD_MODULE_OPTIONS) private readonly opts: DiscordModuleOptions,
    private readonly sync: DiscordSyncService,
  ) {}

  onModuleInit(): void {
    this.scan();
    this.client.on(Events.InteractionCreate, (i) => void this.route(i));
    for (const e of this.events) {
      const run = (...args: unknown[]) => void this.invoke(e, args[0], args);
      if (e.once) this.client.once(e.event, run);
      else this.client.on(e.event, run);
    }
    if (this.prefix.length) {
      this.client.on(Events.MessageCreate, (m) => void this.routePrefix(m));
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.opts.skipRegistration) await this.sync.sync(this.buildJson());
    await this.client.login(this.opts.token);
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
        const dto = this.optionsDto(s);
        const desc = s.subDescription ?? s.sub;
        b.addSubcommand((sub) => {
          sub.setName(s.sub as string).setDescription(desc);
          this.applyOptions(sub as unknown as SlashCommandBuilder, dto);
          return sub;
        });
      } else {
        this.applyOptions(b, this.optionsDto(s));
      }
    }
    const out: unknown[] = [...tops.values()].map((b) => b.toJSON());
    for (const m of this.menus) {
      out.push(new ContextMenuCommandBuilder().setName(m.name).setType(m.type).toJSON());
    }
    return out;
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
          const g = methodGroup?.name ?? group?.name;
          this.slash.push({
            ...base,
            top: group?.name ?? slash?.name ?? methodGroup?.name ?? sub.name,
            topDescription:
              group?.description ?? slash?.description ?? sub.description,
            group: group && methodGroup ? methodGroup.name : undefined,
            sub: sub.name,
            subDescription: sub.description,
          });
          void g;
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
          type: ApplicationCommandType.User | ApplicationCommandType.Message;
        }>(CONTEXT_MENU_METADATA, fn);
        if (menu) this.menus.push({ ...base, ...menu });

        const btn = this.reflect<{ customId: string | RegExp }>(BUTTON_METADATA, fn);
        if (btn) this.buttons.push({ ...base, ...btn });

        const sel = this.reflect<{ kind: string; customId: string | RegExp }>(
          SELECT_METADATA,
          fn,
        );
        if (sel) this.selects.push({ ...base, ...sel });

        const modal = this.reflect<{ customId: string | RegExp }>(MODAL_METADATA, fn);
        if (modal) this.modals.push({ ...base, ...modal });

        const ac = this.reflect<{ commandName?: string }>(AUTOCOMPLETE_METADATA, fn);
        if (ac) this.autocompletes.push({ ...base, ...ac });

        const ev = this.reflect<{ event: string; once: boolean }>(ON_EVENT_METADATA, fn);
        if (ev) this.events.push({ ...base, ...ev });

        const pre = this.reflect<{ name: string; aliases?: string[] }>(
          PREFIX_COMMAND_METADATA,
          fn,
        );
        if (pre) this.prefix.push({ ...base, name: pre.name, aliases: pre.aliases ?? [] });
      }
    }
  }

  private reflect<T>(key: string, fn: unknown): T | undefined {
    return this.reflector.get<T, unknown>(key, fn as never) as T | undefined;
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
        options: { getSubcommandGroup(required: false): string | null; getSubcommand(required: false): string | null };
      };
      const group = cmd.options.getSubcommandGroup(false);
      const sub = cmd.options.getSubcommand(false);
      const found =
        this.slash.find(
          (s) => s.top === cmd.commandName && s.group === group && s.sub === sub,
        ) ??
        this.slash.find((s) => s.top === cmd.commandName && s.sub === sub && !s.group) ??
        this.slash.find((s) => s.top === cmd.commandName && !s.sub);
      if (found) await this.invoke(found, anyIx, [anyIx]);
      return;
    }
    if (interaction.isContextMenuCommand()) {
      const cmd = anyIx as unknown as { commandName: string };
      const found = this.menus.find((m) => m.name === cmd.commandName);
      if (found) await this.invoke(found, anyIx, [anyIx]);
      return;
    }
    if (interaction.isButton()) {
      const found = this.buttons.find((b) => matches(b.customId, anyIx.customId as string));
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
        const found = this.selects.find(
          (s) => s.kind === kind && matches(s.customId, anyIx.customId as string),
        );
        if (found) await this.invoke(found, anyIx, [anyIx]);
        return;
      }
    }
    if (interaction.isModalSubmit()) {
      const found = this.modals.find((m) => matches(m.customId, anyIx.customId as string));
      if (found) await this.invoke(found, anyIx, [anyIx]);
      return;
    }
    if (interaction.isAutocomplete()) {
      const cmd = anyIx as unknown as { commandName: string };
      const found = this.autocompletes.find(
        (a) => !a.commandName || a.commandName === cmd.commandName,
      );
      if (found) await this.invoke(found, anyIx, [anyIx]);
    }
  }

  private optionsDto(h: Handler): (new () => Record<string, unknown>) | undefined {
    const idxs: number[] =
      Reflect.getMetadata(PARAM_OPTIONS_METADATA, h.instance[h.method]) ?? [];
    if (!idxs.length) return undefined;
    const types: unknown[] =
      Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
    return types[idxs[0]] as new () => Record<string, unknown>;
  }

  private applyOptions(
    b: Pick<SlashCommandBuilder, 'addStringOption' | 'addIntegerOption' | 'addNumberOption' | 'addBooleanOption' | 'addUserOption' | 'addChannelOption' | 'addRoleOption' | 'addMentionableOption' | 'addAttachmentOption'>,
    dto?: (new () => Record<string, unknown>) | undefined,
  ): void {
    if (!dto) return;
    const fields: Record<string, OptionFieldMeta> =
      Reflect.getMetadata(OPTION_FIELD_METADATA, dto) ?? {};
    for (const f of Object.values(fields)) {
      const setup = (o: { setName(n: string): unknown; setDescription(d: string): unknown; setRequired(r: boolean): unknown }) => {
        (o.setName(f.name), o.setDescription(f.description), o.setRequired(!!f.required));
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

  private buildArgs(h: Handler, interaction: unknown, prefixArgs?: string[]): unknown[] {
    const fn = h.instance[h.method] as (...a: never[]) => unknown;
    const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
    const args: unknown[] = new Array(types.length).fill(undefined);
    const ctxIdx: number[] = Reflect.getMetadata(PARAM_CONTEXT_METADATA, fn) ?? [];
    const optIdx: number[] = Reflect.getMetadata(PARAM_OPTIONS_METADATA, fn) ?? [];
    const argIdx: number[] = Reflect.getMetadata(PARAM_PREFIX_ARGS_METADATA, fn) ?? [];
    for (const i of ctxIdx) args[i] = interaction;
    for (const i of optIdx) {
      const Dto = (types[i] ?? Object) as new () => Record<string, unknown>;
      args[i] = this.buildDto(Dto, interaction);
    }
    for (const i of argIdx) args[i] = prefixArgs ?? [];
    // No decorators: pass interaction as single arg (lazy default)
    if (!ctxIdx.length && !optIdx.length && !argIdx.length && types.length)
      args[0] = interaction;
    return args;
  }

  private buildDto(
    Dto: new () => Record<string, unknown>,
    interaction: unknown,
  ): Record<string, unknown> {
    const dto = new Dto();
    const fields: Record<string, OptionFieldMeta> =
      Reflect.getMetadata(OPTION_FIELD_METADATA, Dto) ?? {};
    const opts = (interaction as { options?: Record<string, (n: string) => { value?: unknown } | null> }).options;
    if (!opts) return dto;
    const getters: Record<OptionFieldMeta['kind'], string> = {
      string: 'getString',
      integer: 'getInteger',
      number: 'getNumber',
      boolean: 'getBoolean',
      user: 'getUser',
      channel: 'getChannel',
      role: 'getRole',
      mentionable: 'getMentionable',
      attachment: 'getAttachment',
    };
    for (const [key, f] of Object.entries(fields)) {
      try {
        const get = (opts as unknown as Record<string, (n: string) => unknown>)[getters[f.kind]];
        if (typeof get === 'function')
          dto[key] = (get as (n: string) => unknown).call(opts, f.name) as unknown;
      } catch {
        dto[key] = undefined;
      }
    }
    return dto;
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
          ? this.buildEventArgs(h, raw)
          : this.buildArgs(h, interaction, prefixArgs);
      if (!(await this.runPipesAndValidate(h, args, interaction))) return;
      await (h.instance[h.method] as (...a: unknown[]) => unknown).apply(h.instance, args);
    } catch (err) {
      // ponytail: log, never crash gateway loop
      console.error(`[discord.ts] handler ${h.method} failed:`, err);
    }
  }

  /** Prefix text routing. Ignores bots, matches prefix + name/alias. */
  private async routePrefix(message: {
    author?: { bot?: boolean };
    content?: string;
    reply(msg: unknown): Promise<unknown>;
  }): Promise<void> {
    if (message.author?.bot) return;
    const prefixes = Array.isArray(this.opts.prefix)
      ? this.opts.prefix
      : [this.opts.prefix ?? '!'];
    const content = message.content ?? '';
    const hit = prefixes.find((p) => content.startsWith(p));
    if (!hit) return;
    const [name, ...rest] = content.slice(hit.length).trim().split(/\s+/);
    if (!name) return;
    const found = this.prefix.find((p) => p.name === name || p.aliases.includes(name));
    if (!found) return;
    const args = splitArgs(rest.join(' '));
    await this.invoke(found, message, [message], args);
  }

  /** Stock @UsePipes() + required check + class-validator (if installed). False = blocked. */
  private async runPipesAndValidate(
    h: Handler,
    args: unknown[],
    interaction: unknown,
  ): Promise<boolean> {
    const fn = h.instance[h.method] as (...a: never[]) => unknown;
    const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
    const optIdx: number[] = Reflect.getMetadata(PARAM_OPTIONS_METADATA, fn) ?? [];
    if (!optIdx.length) return true;
    const pipes =
      this.reflector.getAllAndOverride<unknown[]>(PIPES_METADATA, [
        fn as never,
        h.instance.constructor as never,
      ]) ?? [];
    for (const i of optIdx) {
      let value = args[i];
      const metatype = types[i] as new (...a: never[]) => unknown;
      for (const p of pipes) {
        const inst =
          typeof p === 'object' && p !== null && 'transform' in (p as object)
            ? (p as { transform(v: unknown, m: unknown): unknown })
            : (this.moduleRef.get(p as never, { strict: false }) as {
                transform(v: unknown, m: unknown): unknown;
              });
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

  private buildEventArgs(h: Handler, raw: unknown[]): unknown[] {
    const fn = h.instance[h.method] as (...a: never[]) => unknown;
    const types: unknown[] = Reflect.getMetadata('design:paramtypes', h.instance, h.method) ?? [];
    const ctxIdx: number[] = Reflect.getMetadata(PARAM_CONTEXT_METADATA, fn) ?? [];
    const args: unknown[] = new Array(Math.max(types.length, raw.length)).fill(undefined);
    raw.forEach((v, i) => {
      args[i] = v;
    });
    for (const i of ctxIdx) args[i] = raw[0];
    return args;
  }

  private async canActivate(h: Handler, interaction: unknown): Promise<boolean> {
    const guards = this.reflector.getAllAndOverride<unknown[]>(GUARDS_METADATA, [
      h.instance[h.method] as never,
      h.instance.constructor as never,
    ]);
    if (!guards?.length) return true;
    for (const g of guards) {
      const inst = this.moduleRef.get(g as never, { strict: false }) as {
        canActivate(ctx: unknown): boolean | Promise<boolean>;
      };
      const can = await inst.canActivate(DiscordExecutionContext.create([interaction]));
      if (!can) return false;
    }
    return true;
  }
}
