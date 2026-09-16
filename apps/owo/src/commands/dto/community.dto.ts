import {
  ChannelOption,
  IntegerOption,
  RoleOption,
  StringOption,
  UserOption,
} from '@discord.ts/common';
import { Max, Min } from 'class-validator';
import type { Role, User } from 'discord.js';
import { WEAPONS } from '../../game/battle.js';
import { SHOP_ITEMS } from '../../game/config.js';
import { weaponItemId } from '../../game/loadout.js';

/** Languages MyMemory takes in the `langpair` parameter. */
export const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja'] as const;

export class EchoDto {
  @StringOption({ name: 'text', description: 'What the bot should say', required: true })
  text!: string;
}

export class BotReplyDto {
  @StringOption({ name: 'messageid', description: 'Message id to reply to', required: true })
  messageId!: string;

  @StringOption({ name: 'text', description: 'Reply text', required: true })
  text!: string;
}

export class WarnDto {
  @UserOption({ name: 'user', description: 'User to warn', required: true })
  user!: User | string;

  @StringOption({ name: 'reason', description: 'Why', required: true })
  reason!: string;
}

export class ChecklistAddDto {
  @StringOption({ name: 'text', description: 'Item text', required: true })
  text!: string;
}

export class ChecklistIdDto {
  @IntegerOption({ name: 'id', description: 'Item id from the list', required: true })
  @Min(1)
  id!: number;
}

export class SurveyDto {
  @StringOption({ name: 'question', description: 'The question', required: true })
  question!: string;

  @StringOption({ name: 'option1', description: 'First option', required: true })
  option1!: string;

  @StringOption({ name: 'option2', description: 'Second option', required: true })
  option2!: string;

  @StringOption({ name: 'option3', description: 'Third option', required: false })
  option3?: string;

  @StringOption({ name: 'option4', description: 'Fourth option', required: false })
  option4?: string;
}

export class CensorWordDto {
  @StringOption({ name: 'word', description: 'Word to manage', required: true })
  word!: string;
}

export class RulesDto {
  @StringOption({ name: 'text', description: 'Server rules text', required: true })
  text!: string;
}

export class EmojiDto {
  @StringOption({
    name: 'emoji',
    description: 'A custom emoji to copy, e.g. from another server',
    required: true,
  })
  emoji!: string;

  @StringOption({ name: 'name', description: 'Name for the new emoji', required: true })
  name!: string;
}

export class TranslateDto {
  @StringOption({ name: 'text', description: 'Text to translate (max 400 chars)', required: true })
  text!: string;

  @StringOption({
    name: 'to',
    description: 'Target language',
    required: true,
    choices: LANGUAGES.map((language) => ({ name: language, value: language })),
  })
  to!: string;

  @StringOption({
    name: 'from',
    description: 'Source language (default English)',
    required: false,
    choices: LANGUAGES.map((language) => ({ name: language, value: language })),
  })
  from?: string;
}

export class CaptchaRoleDto {
  @RoleOption({ name: 'role', description: 'Role granted after verification', required: true })
  role!: Role;
}

export class TradeDto {
  @UserOption({ name: 'user', description: 'Who receives the offer', required: true })
  user!: User | string;

  @StringOption({
    name: 'item',
    description: 'Item to offer',
    required: true,
    choices: [
      ...SHOP_ITEMS.map((item) => ({ name: item.name, value: item.id })),
      ...WEAPONS.map((weapon) => ({
        name: `${weapon.name} (weapon)`,
        value: weaponItemId(weapon.id),
      })),
    ],
  })
  item!: string;

  @IntegerOption({ name: 'count', description: 'How many (default 1)', required: false })
  @Min(1)
  @Max(100)
  count?: number;
}

export class TextOptionDto {
  @StringOption({ name: 'text', description: 'Text', required: true })
  text!: string;
}

export class SetTierDto {
  @UserOption({ name: 'user', description: 'Who gets the tier', required: true })
  user!: User | string;

  @StringOption({
    name: 'tier',
    description: 'Premium tier',
    required: true,
    choices: [
      { name: 'Free', value: 'free' },
      { name: 'Supporter', value: 'supporter' },
      { name: 'Patron', value: 'patron' },
    ],
  })
  tier!: string;
}

export class ChargesDto {
  @IntegerOption({ name: 'count', description: 'Charges to buy (1-24)', required: true })
  @Min(1)
  @Max(24)
  count!: number;
}

export class GiveawayDto {
  @StringOption({ name: 'prize', description: 'What the winner gets', required: true })
  prize!: string;

  @IntegerOption({ name: 'minutes', description: 'How long it runs (1-1440)', required: true })
  @Min(1)
  @Max(1440)
  minutes!: number;

  @IntegerOption({ name: 'winners', description: 'How many winners (1-10)', required: false })
  @Min(1)
  @Max(10)
  winners?: number;
}

export class AnnounceDto {
  @StringOption({
    name: 'text',
    description: 'Announcement text (max 1500 chars)',
    required: true,
  })
  text!: string;
}

export class AnnounceChannelDto {
  @ChannelOption({
    name: 'channel',
    description: 'Where /announcement posts in this server',
    required: true,
  })
  channel!: { id: string };
}

export class GiveAllDto {
  @IntegerOption({ name: 'amount', description: 'Pawcoins per user', required: true })
  @Min(1)
  @Max(100_000)
  amount!: number;
}

export class DmUsersDto {
  @StringOption({ name: 'text', description: 'Message text', required: true })
  text!: string;
}
