import type { Locale, LocalizationMap } from 'discord.js';
import { availableLocales, lookup } from '@discord.ts/i18n';
import type { LocalizationPair } from './handler.types.js';

// ponytail: Discord's accepted locale codes, kept in sync by hand.
const DISCORD_LOCALES: ReadonlySet<string> = new Set([
  'en-US',
  'en-GB',
  'bg',
  'zh-CN',
  'zh-TW',
  'hr',
  'cs',
  'da',
  'nl',
  'fi',
  'fr',
  'de',
  'el',
  'hi',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'lt',
  'no',
  'pl',
  'pt-BR',
  'ro',
  'ru',
  'es-ES',
  'es-419',
  'sv-SE',
  'th',
  'tr',
  'uk',
  'vi',
]);

/** Loaded locale dirs Discord does not accept. Logged once at boot. */
export function unknownLocales(): string[] {
  return availableLocales().filter((l) => !DISCORD_LOCALES.has(l));
}

export function explicitPair(m?: {
  nameLocalizations?: LocalizationMap;
  descriptionLocalizations?: LocalizationMap;
}): LocalizationPair | undefined {
  if (!m?.nameLocalizations && !m?.descriptionLocalizations) return undefined;
  return { name: m.nameLocalizations, description: m.descriptionLocalizations };
}

/** Catalog values for one key base (`commands:<name>`), explicit maps winning per locale. */
export function localizedPair(
  keyBase?: string,
  explicit?: LocalizationPair,
): LocalizationPair | undefined {
  const name = { ...catalog(keyBase, 'name'), ...explicit?.name };
  const description = { ...catalog(keyBase, 'description'), ...explicit?.description };
  if (!Object.keys(name).length && !Object.keys(description).length) return undefined;
  return { name, description };
}

export function applyLocalizations(
  b: {
    setNameLocalizations(l: LocalizationMap | null): unknown;
    setDescriptionLocalizations(l: LocalizationMap | null): unknown;
  },
  pair?: LocalizationPair,
): void {
  if (pair?.name && Object.keys(pair.name).length) b.setNameLocalizations(pair.name);
  if (pair?.description && Object.keys(pair.description).length)
    b.setDescriptionLocalizations(pair.description);
}

function catalog(keyBase: string | undefined, field: 'name' | 'description'): LocalizationMap {
  const out: LocalizationMap = {};
  if (!keyBase) return out;
  for (const locale of availableLocales()) {
    if (!DISCORD_LOCALES.has(locale)) continue;
    const value = lookup(`${keyBase}.${field}`, locale);
    if (value) out[locale as Locale] = value;
  }
  return out;
}
