import { describe, expect, test } from 'bun:test';
import { parseDefinitions, parseTranslation } from '../src/game/words.js';

const dictionaryPayload = [
  {
    word: 'paw',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [
          { definition: 'The soft foot of a mammal.', example: 'The cat licked its paw.' },
          { definition: 'A human hand.' },
        ],
      },
      { partOfSpeech: 'verb', definitions: [{ definition: 'To touch with a paw.' }] },
    ],
  },
];

const translationPayload = {
  responseData: { translatedText: 'Hola mundo', match: 1 },
  responseStatus: 200,
};

describe('parseDefinitions', () => {
  test('reads word, parts of speech, and examples', () => {
    const defs = parseDefinitions(dictionaryPayload);
    expect(defs).toHaveLength(3);
    expect(defs[0]).toEqual({
      word: 'paw',
      partOfSpeech: 'noun',
      text: 'The soft foot of a mammal.',
      example: 'The cat licked its paw.',
    });
    expect(defs[2]).toMatchObject({ partOfSpeech: 'verb', text: 'To touch with a paw.' });
  });

  test('returns empty on garbage', () => {
    expect(parseDefinitions(null)).toEqual([]);
    expect(parseDefinitions({})).toEqual([]);
    expect(parseDefinitions([{ word: 'x', meanings: 'nope' }])).toEqual([]);
  });
});

describe('parseTranslation', () => {
  test('reads the text out of the payload', () => {
    expect(parseTranslation(translationPayload)).toBe('Hola mundo');
  });

  test('returns null on garbage or empty text', () => {
    expect(parseTranslation(null)).toBeNull();
    expect(parseTranslation({})).toBeNull();
    expect(parseTranslation({ responseData: { translatedText: '   ' } })).toBeNull();
  });
});
