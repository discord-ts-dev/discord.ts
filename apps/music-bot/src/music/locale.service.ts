import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@discord.ts/common';
import { botConfig } from './bot-config.js';

export const LANGUAGES = ['EnglishUS', 'Indonesian', 'Japanese', 'Korean', 'Vietnamese'] as const;
export type Language = (typeof LANGUAGES)[number];

function normalize(input: string | null | undefined): Language {
  if (!input) return botConfig.defaultLanguage as Language;
  const lower = input.toLowerCase();
  if (['en-us', 'en', 'englishus'].includes(lower)) return 'EnglishUS';
  if (['ja', 'japanese'].includes(lower)) return 'Japanese';
  if (['ko', 'korean'].includes(lower)) return 'Korean';
  if (['id', 'indonesian'].includes(lower)) return 'Indonesian';
  if (['vi', 'vietnamese'].includes(lower)) return 'Vietnamese';
  if ((LANGUAGES as readonly string[]).includes(input)) return input as Language;
  return 'EnglishUS';
}

// ponytail: tiny i18n (dotted-key lookup + {param} fill) over copied Shiroko
// locale JSON. Swap for i18next-fs-backend when plural rules matter.
@Injectable()
export class LocaleService {
  private readonly tables = new Map<Language, Record<string, unknown>>();

  private tableOf(lang: Language): Record<string, unknown> {
    let table = this.tables.get(lang);
    if (!table) {
      try {
        table = JSON.parse(
          readFileSync(join(process.cwd(), 'apps/music-bot/locales', `${lang}.json`), 'utf8'),
        ) as Record<string, unknown>;
      } catch {
        table = {};
      }
      this.tables.set(lang, table);
    }
    return table;
  }

  t(
    locale: string | null | undefined,
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const lang = normalize(locale);
    const hit = this.lookup(this.tableOf(lang), key) ?? this.lookup(this.tableOf('EnglishUS'), key);
    if (typeof hit !== 'string') return key;
    if (!params) return hit;
    return hit.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
  }

  resolve(input: string | null | undefined): Language {
    return normalize(input);
  }

  supported(): readonly string[] {
    return LANGUAGES;
  }

  private lookup(table: Record<string, unknown>, key: string): unknown {
    return key.split('.').reduce<unknown>((node, part) => {
      if (typeof node !== 'object' || node === null) return undefined;
      return (node as Record<string, unknown>)[part];
    }, table);
  }
}

export const localeService = new LocaleService();
