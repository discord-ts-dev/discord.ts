import type { ClientOptions } from 'discord.js';

export interface DiscordModuleOptions {
  token: string;
  clientId: string;
  intents: ClientOptions['intents'];
  /** Guild ids for instant dev sync. Empty = global. */
  development?: string[];
  /** Skip REST sync on boot (CI / manual deploy). */
  skipRegistration?: boolean;
  /** Prefix for text commands. Default '!'. Prefix routing only active if a @PrefixCommand exists. */
  prefix?: string | string[];
  /** Shard ids for this process (large bots). Passed to discord.js Client. */
  shards?: number[] | 'auto';
  /** Total shard count. Passed to discord.js Client. Also total for --shards gate. */
  shardCount?: number;
  /** Entry file each shard boots. Read by --shards gate. Default './src/main.ts'. */
  shardFile?: string;
  /** Respawn dead shards. Read by --shards gate. Default true. */
  respawn?: boolean;
  /** Native i18n. Presence enables loading `src/locales/<lang>/<namespace>.json`. */
  i18n?: I18nOptions;
}

/** Native i18n options. Locales live under `localesDir` as `<lang>/<namespace>.json`. */
export interface I18nOptions {
  /** Fallback locale for missing keys. Default 'en-US'. */
  defaultLocale?: string;
  /** Locale dir relative to the app cwd. Default './src/locales'. */
  localesDir?: string;
  /** Namespace for bare keys. Default 'common'. */
  defaultNamespace?: string;
}
