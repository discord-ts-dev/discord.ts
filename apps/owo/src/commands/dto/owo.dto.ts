import { IntegerOption, StringOption, UserOption } from '@discord.ts/common';
import { Max, Min } from 'class-validator';
import type { User } from 'discord.js';
import { SHOP_ITEMS } from '../../game/config.js';
import { ROSTER } from '../../game/roster.js';

export class UserTargetDto {
  @UserOption({ name: 'user', description: 'Whose data to show (default: you)', required: false })
  user?: User | string;
}

export class CoinflipDto {
  @StringOption({ name: 'amount', description: 'Bet size: 100, 1.5k, all', required: true })
  amount!: string;

  @StringOption({
    name: 'choice',
    description: 'Your side of the coin',
    required: false,
    choices: [
      { name: 'Heads', value: 'heads' },
      { name: 'Tails', value: 'tails' },
    ],
  })
  choice?: string;
}

export class GiveDto {
  @UserOption({ name: 'user', description: 'Receiver', required: true })
  user!: User | string;

  @IntegerOption({ name: 'amount', description: 'Pawcoins to grant', required: true })
  @Min(1)
  @Max(1_000_000_000)
  amount!: number;
}

export class ShopItemDto {
  @StringOption({
    name: 'item',
    description: 'Item to act on',
    required: true,
    choices: SHOP_ITEMS.map((item) => ({ name: item.name, value: item.id })),
  })
  item!: string;
}

export class SellDto {
  @StringOption({
    name: 'animal',
    description: 'Species to sell',
    required: true,
    choices: ROSTER.map((animal) => ({ name: animal.name, value: animal.id })),
  })
  animal!: string;

  @IntegerOption({
    name: 'count',
    description: 'How many to sell (default: every one you own)',
    required: false,
  })
  @Min(1)
  @Max(1000)
  count?: number;
}

export class TopDto {
  @StringOption({
    name: 'board',
    description: 'Which board to show',
    required: false,
    choices: [
      { name: 'XP', value: 'xp' },
      { name: 'Wealth', value: 'wealth' },
      { name: 'Zoo size', value: 'zoo' },
    ],
  })
  board?: string;
}

export class ToggleDto {
  @StringOption({
    name: 'command',
    description: 'Command to toggle in this server',
    required: true,
    autocomplete: true,
  })
  command!: string;
}

export class BetDto {
  @StringOption({ name: 'amount', description: 'Bet size: 100, 1.5k, all', required: true })
  amount!: string;
}

export class LotteryBuyDto {
  @IntegerOption({ name: 'count', description: 'How many tickets (1-50)', required: true })
  @Min(1)
  @Max(50)
  count!: number;
}

export class OwoifyDto {
  @StringOption({ name: 'text', description: 'Text to owoify (max 500 chars)', required: true })
  text!: string;
}

export class MathDto {
  @StringOption({
    name: 'expression',
    description: 'Expression: + - * / % ^ and parentheses',
    required: true,
  })
  expression!: string;
}

export class EightballDto {
  @StringOption({ name: 'question', description: 'Your question', required: true })
  question!: string;
}

export class ShipDto {
  @UserOption({ name: 'first', description: 'One half of the pair', required: true })
  first!: User | string;

  @UserOption({ name: 'second', description: 'The other half', required: true })
  second!: User | string;
}

export class BanDto {
  @UserOption({ name: 'user', description: 'User to ban from Paw', required: true })
  user!: User | string;

  @StringOption({ name: 'reason', description: 'Why (shown to the user)', required: false })
  reason?: string;
}

export class TargetDto {
  @UserOption({ name: 'user', description: 'Target user', required: true })
  user!: User | string;
}

export class GiveAnimalDto {
  @UserOption({ name: 'user', description: 'Receiver', required: true })
  user!: User | string;

  @StringOption({
    name: 'animal',
    description: 'Species to grant',
    required: true,
    choices: ROSTER.map((animal) => ({ name: animal.name, value: animal.id })),
  })
  animal!: string;

  @IntegerOption({ name: 'count', description: 'How many (1-100)', required: false })
  @Min(1)
  @Max(100)
  count?: number;
}

export class ResetDto {
  @UserOption({ name: 'user', description: 'User to reset', required: true })
  user!: User | string;

  @StringOption({
    name: 'what',
    description: 'What to reset',
    required: true,
    choices: [
      { name: 'Pawcoins', value: 'coins' },
      { name: 'Zoo', value: 'zoo' },
      { name: 'Everything', value: 'all' },
    ],
  })
  what!: string;
}
