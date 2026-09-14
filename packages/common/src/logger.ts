import { Signale } from 'signale';

// ponytail: signale scope = Nest context, styleText stays at call sites.
const base = new Signale({
  scope: 'discord.ts',
  types: {
    route: { badge: '◆', color: 'cyan', label: 'route', logLevel: 'info' },
    ready: { badge: '★', color: 'green', label: 'ready', logLevel: 'info' },
  },
});

type BaseLogger = Pick<Signale, 'info' | 'success' | 'warn' | 'error' | 'debug' | 'log'> & {
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
