import { Max, Min } from 'class-validator';
import { IntegerOption, StringOption } from 'discord.ts';

export class RollDto {
  @StringOption({ name: 'sides', description: 'Dice type', required: true, choices: [{ name: 'd6', value: 'd6' }, { name: 'd20', value: 'd20' }] })
  sides!: string;

  @IntegerOption({ name: 'count', description: 'How many dice', required: false })
  @Min(1)
  @Max(10)
  count?: number;
}
