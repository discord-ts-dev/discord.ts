export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface Animal {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
}

export interface RarityDef {
  label: string;
  weight: number;
  sellPrice: number;
  color: number;
}

export const RARITIES: Record<Rarity, RarityDef> = {
  common: { label: 'Common', weight: 60, sellPrice: 50, color: 0x95a5a6 },
  uncommon: { label: 'Uncommon', weight: 25, sellPrice: 150, color: 0x57f287 },
  rare: { label: 'Rare', weight: 12, sellPrice: 500, color: 0x5865f2 },
  legendary: { label: 'Legendary', weight: 3, sellPrice: 2000, color: 0xfee75c },
};

/** Weakest to strongest. Derived from the table so it can never drift. */
export const RARITY_ORDER = Object.keys(RARITIES) as Rarity[];

/** Own roster. Clean-room: no data copied from the original bot. */
export const ROSTER: Animal[] = [
  { id: 'rat', name: 'Rat', emoji: '🐀', rarity: 'common' },
  { id: 'pigeon', name: 'Pigeon', emoji: '🐦', rarity: 'common' },
  { id: 'frog', name: 'Frog', emoji: '🐸', rarity: 'common' },
  { id: 'squirrel', name: 'Squirrel', emoji: '🐿️', rarity: 'common' },
  { id: 'raccoon', name: 'Raccoon', emoji: '🦝', rarity: 'common' },
  { id: 'fox', name: 'Fox', emoji: '🦊', rarity: 'uncommon' },
  { id: 'owl', name: 'Owl', emoji: '🦉', rarity: 'uncommon' },
  { id: 'otter', name: 'Otter', emoji: '🦦', rarity: 'uncommon' },
  { id: 'hedgehog', name: 'Hedgehog', emoji: '🦔', rarity: 'uncommon' },
  { id: 'boar', name: 'Boar', emoji: '🐗', rarity: 'uncommon' },
  { id: 'panda', name: 'Panda', emoji: '🐼', rarity: 'rare' },
  { id: 'tiger', name: 'Tiger', emoji: '🐯', rarity: 'rare' },
  { id: 'wolf', name: 'Wolf', emoji: '🐺', rarity: 'rare' },
  { id: 'crocodile', name: 'Crocodile', emoji: '🐊', rarity: 'rare' },
  { id: 'giraffe', name: 'Giraffe', emoji: '🦒', rarity: 'rare' },
  { id: 'dragon', name: 'Dragon', emoji: '🐉', rarity: 'legendary' },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', rarity: 'legendary' },
  { id: 'kraken', name: 'Kraken', emoji: '🦑', rarity: 'legendary' },
];

export function animalById(id: string): Animal | undefined {
  return ROSTER.find((a) => a.id === id);
}
