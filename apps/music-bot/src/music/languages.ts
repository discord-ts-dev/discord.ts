// ponytail: app catalog names. Framework t() takes any locale string;
// this list bounds the `language` command to shipped catalogs.
export const SUPPORTED_LANGUAGES = [
  'EnglishUS',
  'Indonesian',
  'Japanese',
  'Korean',
  'Vietnamese',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export function normalizeLanguage(input: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find((l) => l.toLowerCase() === input.toLowerCase());
}
