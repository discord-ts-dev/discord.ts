import * as fs from 'node:fs';
import * as path from 'node:path';
import type { I18nOptions } from '@discord.ts/common';

type Table = Record<string, unknown>;

interface I18nState {
  defaultLocale: string;
  defaultNamespace: string;
  /** locale -> namespace -> table */
  catalogs: Map<string, Map<string, Table>>;
}

let state: I18nState = { defaultLocale: 'en-US', defaultNamespace: 'common', catalogs: new Map() };

// ponytail: sync file load at boot, tiny tables. Flat `<lang>.json` files are
// normalized to namespaces by top-level key, so old layouts keep working.
export function initI18n(opts: I18nOptions = {}, cwd: string = process.cwd()): void {
  const dir = path.resolve(cwd, opts.localesDir ?? './src/locales');
  const allow = opts.languages?.length ? new Set(opts.languages) : undefined;
  const next: I18nState = {
    defaultLocale: opts.defaultLocale ?? 'en-US',
    defaultNamespace: opts.defaultNamespace ?? 'common',
    catalogs: new Map(),
  };
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      try {
        if (fs.statSync(full).isDirectory()) {
          if (allow && !allow.has(entry)) continue;
          const namespaces = new Map<string, Table>();
          for (const file of fs.readdirSync(full)) {
            if (!file.endsWith('.json')) continue;
            namespaces.set(file.slice(0, -5), readTable(path.join(full, file)));
          }
          next.catalogs.set(entry, namespaces);
        } else if (entry.endsWith('.json')) {
          const lang = entry.slice(0, -5);
          if (allow && !allow.has(lang)) continue;
          if (next.catalogs.has(lang)) continue;
          const flat = readTable(full);
          const namespaces = new Map<string, Table>();
          for (const [ns, table] of Object.entries(flat)) {
            if (typeof table === 'object' && table !== null) namespaces.set(ns, table as Table);
          }
          next.catalogs.set(lang, namespaces);
        }
      } catch {
        // skip unreadable entries, t() echoes keys
      }
    }
  }
  state = next;
}

function readTable(file: string): Table {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Table;
  } catch {
    return {};
  }
}

function deepGet(table: Table, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((node, part) => {
    if (typeof node !== 'object' || node === null) return undefined;
    return (node as Table)[part];
  }, table);
}

function lookupIn(locale: string, key: string): unknown {
  const namespaces = state.catalogs.get(locale);
  if (!namespaces) return undefined;
  const colon = key.indexOf(':');
  if (colon > 0) {
    const table = namespaces.get(key.slice(0, colon));
    return table ? deepGet(table, key.slice(colon + 1)) : undefined;
  }
  const dot = key.indexOf('.');
  if (dot > 0) {
    const table = namespaces.get(key.slice(0, dot));
    if (table) {
      const hit = deepGet(table, key.slice(dot + 1));
      if (hit !== undefined) return hit;
    }
  }
  const fallback = namespaces.get(state.defaultNamespace);
  return fallback ? deepGet(fallback, key) : undefined;
}

function fill(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

/** Loaded locale names, sorted. Reflects the `languages` allowlist when set. */
export function availableLocales(): string[] {
  return [...state.catalogs.keys()].sort();
}

/** Translate a key (`ns:key`, dotted, or bare) with locale fallback to default. Echoes unknown keys. */
export function t(key: string, params?: Record<string, string | number>, locale?: string): string {
  const loc = locale && locale ? locale : state.defaultLocale;
  const hit =
    lookupIn(loc, key) ??
    (loc !== state.defaultLocale ? lookupIn(state.defaultLocale, key) : undefined);
  return typeof hit === 'string' ? fill(hit, params) : key;
}

/** Discord locale of a call: interaction.locale, else guild preferred locale, else fallback. */
export function resolveLocale(source: unknown, fallback?: string): string {
  const rec = source as { locale?: unknown; guild?: { preferredLocale?: unknown } | null };
  const raw = rec.locale ?? rec.guild?.preferredLocale ?? fallback ?? state.defaultLocale;
  return typeof raw === 'string' && raw ? raw : state.defaultLocale;
}
