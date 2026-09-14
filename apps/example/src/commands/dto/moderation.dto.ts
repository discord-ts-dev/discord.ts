import { IntegerOption, StringOption, UserOption } from '@discord.ts/common';
import { Max, Min } from 'class-validator';
import type { User } from 'discord.js';

export class TargetReasonDto {
  @UserOption({ name: 'target', description: 'Member to moderate', required: true })
  target!: User | string;

  @StringOption({ name: 'reason', description: 'Reason', required: false })
  reason?: string;
}

export class UnbanDto {
  @StringOption({ name: 'userid', description: 'Banned user id', required: true })
  userId!: string;

  @StringOption({ name: 'reason', description: 'Reason', required: false })
  reason?: string;
}

export class TimeoutDto {
  @UserOption({ name: 'target', description: 'Member to timeout', required: true })
  target!: User | string;

  @IntegerOption({ name: 'minutes', description: 'Minutes 1-40320', required: true })
  @Min(1)
  @Max(40320)
  minutes!: number;

  @StringOption({ name: 'reason', description: 'Reason', required: false })
  reason?: string;
}

export class ClearDto {
  @IntegerOption({ name: 'count', description: 'Messages 1-100', required: true })
  @Min(1)
  @Max(100)
  count!: number;

  @UserOption({ name: 'target', description: 'Only this user (slash only)', required: false })
  target?: User | string;
}

export class WarningsDto {
  @UserOption({ name: 'target', description: 'Member to inspect', required: true })
  target!: User | string;
}
