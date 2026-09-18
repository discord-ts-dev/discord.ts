import { WEAPONS } from '../../game/battle.js';
import { StringOption, UserOption } from '@discord.ts/common';
import type { User } from 'discord.js';

export class BattleDto {
  @UserOption({ name: 'user', description: 'Opponent', required: true })
  user!: User | string;

  @StringOption({ name: 'amount', description: 'Bet size: 100, 1.5k, all', required: true })
  amount!: string;
}

export class WeaponChoiceDto {
  @StringOption({
    name: 'weapon',
    description: 'Weapon',
    required: true,
    choices: WEAPONS.map((weapon) => ({ name: weapon.name, value: weapon.id })),
  })
  weapon!: string;
}
