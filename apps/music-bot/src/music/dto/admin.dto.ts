import { StringOption } from '@discord.ts/common';

export class HelpDto {
  @StringOption({ name: 'command', description: 'Command name', required: false })
  command?: string;
}

export class PremiumScopeDto {
  @StringOption({
    name: 'scope',
    description: 'Inspect guild instead of user',
    required: false,
    choices: [{ name: 'guild', value: 'guild' }],
  })
  scope?: string;
}

export class LanguageDto {
  @StringOption({
    name: 'lang',
    description: 'e.g. EnglishUS, Vietnamese, Japanese',
    required: false,
  })
  lang?: string;
}

export class ScopeTargetDto {
  @StringOption({
    name: 'scope',
    description: 'guild or user',
    required: true,
    choices: [
      { name: 'guild', value: 'guild' },
      { name: 'user', value: 'user' },
    ],
  })
  scope!: string;

  @StringOption({ name: 'target', description: 'Id or mention', required: true })
  target!: string;
}

export class GrantPremiumDto extends ScopeTargetDto {
  @StringOption({
    name: 'plan',
    description: 'trial or month',
    required: true,
    choices: [
      { name: 'trial', value: 'trial' },
      { name: 'month', value: 'month' },
    ],
  })
  plan!: string;
}

export class EvalDto {
  @StringOption({ name: 'code', description: 'Code to run', required: true })
  code!: string;
}
