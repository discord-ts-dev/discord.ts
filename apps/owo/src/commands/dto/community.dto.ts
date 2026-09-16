import { IntegerOption, StringOption, UserOption } from '@discord.ts/common';
import { Min } from 'class-validator';
import type { User } from 'discord.js';

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
