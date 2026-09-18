import type { Animal, Rarity } from './roster.js';

export type WeaponEffect = 'crit' | 'stun' | 'lifesteal';

export interface Weapon {
  id: string;
  name: string;
  emoji: string;
  price: number;
  atk: number;
  effect?: WeaponEffect;
}

export const WEAPONS: Weapon[] = [
  { id: 'stick', name: 'Stick', emoji: '🪵', price: 500, atk: 3 },
  { id: 'dagger', name: 'Dagger', emoji: '🗡️', price: 2000, atk: 6, effect: 'crit' },
  { id: 'hammer', name: 'Hammer', emoji: '🔨', price: 4000, atk: 9, effect: 'stun' },
  { id: 'trident', name: 'Trident', emoji: '🔱', price: 8000, atk: 12, effect: 'lifesteal' },
];

export function weaponById(id: string | null | undefined): Weapon | undefined {
  if (!id) return undefined;
  return WEAPONS.find((weapon) => weapon.id === id);
}

export const RARITY_STATS: Record<Rarity, { hp: number; atk: number; def: number }> = {
  common: { hp: 60, atk: 6, def: 1 },
  uncommon: { hp: 75, atk: 8, def: 2 },
  rare: { hp: 95, atk: 10, def: 3 },
  legendary: { hp: 120, atk: 14, def: 5 },
};

export interface Fighter {
  userId: string;
  animalId: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  weaponId?: string;
  guard?: boolean;
}

export function fighterFor(userId: string, animal: Animal, weapon?: Weapon): Fighter {
  const stats = RARITY_STATS[animal.rarity];
  return {
    userId,
    animalId: animal.id,
    name: animal.name,
    emoji: animal.emoji,
    hp: stats.hp,
    maxHp: stats.hp,
    atk: stats.atk + (weapon?.atk ?? 0),
    def: stats.def,
    ...(weapon ? { weaponId: weapon.id } : {}),
  };
}

export type Move = 'attack' | 'defend' | 'special';

export interface MoveResult {
  damage: number;
  crit: boolean;
  heal: number;
  stun: boolean;
  guard: boolean;
}

const CRIT_CHANCE = 0.1;
const SPECIAL_CRIT_CHANCE = 0.3;
const STUN_CHANCE = 0.25;
const LIFESTEAL_RATIO = 0.3;

// ponytail: one formula for every move. Rolls are positional (damage, then
// crit, then a stun roll) so tests can drive them with a sequence.
export function moveResult(
  attacker: Fighter,
  defender: Fighter,
  move: Move,
  rand: () => number = Math.random,
): MoveResult {
  if (move === 'defend') return { damage: 0, crit: false, heal: 0, stun: false, guard: true };

  const weapon = WEAPONS.find((w) => w.id === attacker.weaponId);
  const effect = move === 'special' ? weapon?.effect : undefined;

  let damage = Math.max(1, Math.floor(attacker.atk * (0.8 + rand() * 0.4) - defender.def));
  const critChance = effect === 'crit' ? SPECIAL_CRIT_CHANCE : CRIT_CHANCE;
  const crit = rand() < critChance;
  if (crit) damage = Math.floor(damage * 1.5);
  // Guard first, then read lifesteal off the damage that actually landed.
  if (defender.guard) damage = Math.max(1, Math.floor(damage / 2));

  const heal = effect === 'lifesteal' ? Math.floor(damage * LIFESTEAL_RATIO) : 0;
  const stun = effect === 'stun' ? rand() < STUN_CHANCE : false;

  return { damage, crit, heal, stun, guard: false };
}

export function battleReward(bet: number, won: boolean): { coins: number; xp: number } {
  return won ? { coins: bet, xp: 25 } : { coins: 0, xp: 10 };
}

export interface BattleState {
  /** channel_attacker_defender */
  id: string;
  a: Fighter;
  b: Fighter;
  turn: 'a' | 'b';
  bet: number;
  log: string[];
}

export interface MoveEvent {
  side: 'a' | 'b';
  move: Move;
  damage: number;
  crit: boolean;
  heal: number;
  stun: boolean;
  guard: boolean;
}

/** Resolve one side's move. A stun keeps the turn; a guard is spent on the hit it absorbs. */
export function applyMove(
  state: BattleState,
  side: 'a' | 'b',
  move: Move,
  rand: () => number = Math.random,
): { state: BattleState; event: MoveEvent; finished: 'a' | 'b' | null } {
  const other = side === 'a' ? 'b' : 'a';
  const attacker = { ...state[side] };
  const defender = { ...state[other] };

  const result = moveResult(attacker, defender, move, rand);
  defender.hp = Math.max(0, defender.hp - result.damage);
  if (result.damage > 0) defender.guard = false;
  attacker.hp = Math.min(attacker.maxHp, attacker.hp + result.heal);
  if (move === 'defend') attacker.guard = true;

  const finished = defender.hp <= 0 ? side : null;
  const next: BattleState = {
    ...state,
    [side]: attacker,
    [other]: defender,
    turn: result.stun ? side : other,
  };
  const event: MoveEvent = {
    side,
    move,
    damage: result.damage,
    crit: result.crit,
    heal: result.heal,
    stun: result.stun,
    guard: result.guard,
  };
  return { state: next, event, finished };
}
