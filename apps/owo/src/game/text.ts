import { resolveLocale, t } from '@discord.ts/i18n';

/** Translate a `game:` key for the caller's Discord locale. */
export function tt(source: unknown, key: string, params?: Record<string, string | number>): string {
  return t(key, params, resolveLocale(source));
}

export function fmt(amount: number): string {
  return amount.toLocaleString('en-US');
}
