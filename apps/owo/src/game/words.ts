export interface Definition {
  word: string;
  partOfSpeech: string;
  text: string;
  example?: string;
}

interface Meaning {
  partOfSpeech?: unknown;
  definitions?: unknown;
}

/** Parse a dictionaryapi.dev payload into flat definitions. Empty on any surprise. */
export function parseDefinitions(payload: unknown): Definition[] {
  if (!Array.isArray(payload)) return [];
  const out: Definition[] = [];
  for (const entry of payload) {
    const word = (entry as { word?: unknown })?.word;
    const meanings = (entry as { meanings?: unknown })?.meanings;
    if (typeof word !== 'string' || !Array.isArray(meanings)) continue;
    for (const meaning of meanings as Meaning[]) {
      const partOfSpeech =
        typeof meaning?.partOfSpeech === 'string' ? meaning.partOfSpeech : 'unknown';
      const definitions = meaning?.definitions;
      if (!Array.isArray(definitions)) continue;
      for (const definition of definitions as { definition?: unknown; example?: unknown }[]) {
        if (typeof definition?.definition !== 'string' || !definition.definition) continue;
        out.push({
          word,
          partOfSpeech,
          text: definition.definition,
          ...(typeof definition.example === 'string' && definition.example
            ? { example: definition.example }
            : {}),
        });
      }
    }
  }
  return out;
}

/** Parse a MyMemory payload into the translated text. Null when empty. */
export function parseTranslation(payload: unknown): string | null {
  const text = (payload as { responseData?: { translatedText?: unknown } })?.responseData
    ?.translatedText;
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  return trimmed ? trimmed : null;
}
