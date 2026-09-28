import { createRequire } from 'node:module';
import type signale from 'signale';
import type { Signale as SignaleInstance, SignaleOptions } from 'signale';

// ponytail: signale is CommonJS and exports via
// `module.exports = Object.assign(new Signale(), { Signale })`. That assignment is
// computed, so Node's cjs-module-lexer cannot see a named export and
// `import { Signale } from 'signale'` throws
// "does not provide an export named 'Signale'" under Node ESM. Bun tolerates it,
// which is why the bug only reached published consumers. createRequire always
// works. See docs/adr/0014-signale-cjs-named-import.md.
// `types` is keyed by the DefaultMethods union, so the two custom badges have to
// be declared through SignaleOptions' generic rather than smuggled in as a wider
// object. SignaleOptions carries the generic; the constructor's own type erases
// it, so the ctor is written by hand instead of read off the d.ts.
type BaseTypes = signale.DefaultMethods | 'route' | 'ready';
const { Signale } = createRequire(import.meta.url)('signale') as {
  Signale: new (options?: SignaleOptions<BaseTypes>) => SignaleInstance<BaseTypes>;
};

const base = new Signale({
  scope: 'discord.ts',
  types: {
    route: { badge: '◆', color: 'cyan', label: 'route', logLevel: 'info' },
    ready: { badge: '★', color: 'green', label: 'ready', logLevel: 'info' },
  },
});

type BaseLogger = Pick<SignaleInstance, 'info' | 'success' | 'warn' | 'error' | 'debug' | 'log'> & {
  route(message?: unknown, ...args: unknown[]): void;
  ready(message?: unknown, ...args: unknown[]): void;
};

/** Nest-style scoped logger for discord.ts core. Beautiful via signale. */
export class DiscordLogger {
  constructor(private readonly context = 'Discord') {}

  private scoped(): BaseLogger {
    // ponytail: repeat root scope, signale replaces scope instead of nesting
    return base.scope('discord.ts', this.context) as unknown as BaseLogger;
  }

  log(message?: unknown, ...args: unknown[]): void {
    this.scoped().info(message, ...args);
  }

  success(message?: unknown, ...args: unknown[]): void {
    this.scoped().success(message, ...args);
  }

  route(message?: unknown, ...args: unknown[]): void {
    this.scoped().route(message, ...args);
  }

  ready(message?: unknown, ...args: unknown[]): void {
    this.scoped().ready(message, ...args);
  }

  warn(message?: unknown, ...args: unknown[]): void {
    this.scoped().warn(message, ...args);
  }

  error(message?: unknown, ...args: unknown[]): void {
    this.scoped().error(message, ...args);
  }

  debug(message?: unknown, ...args: unknown[]): void {
    this.scoped().debug(message, ...args);
  }
}

export const discordLogger = new DiscordLogger();
