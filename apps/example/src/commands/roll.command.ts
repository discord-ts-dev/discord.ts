import { Injectable } from '@nestjs/common';
import { Max, Min } from 'class-validator';
import type { ChatInputCommandInteraction } from 'discord.js';
import { Context, IntegerOption, Options, SlashCommand, StringOption } from '@discord.ts/core';

class RollDto {
  @StringOption({ name: 'sides', description: 'Dice type', required: true, choices: [{ name: 'd6', value: 'd6' }, { name: 'd20', value: 'd20' }] })
  sides!: string;

  @IntegerOption({ name: 'count', description: 'How many dice', required: false })
  @Min(1)
  @Max(10)
  count?: number;
}

@Injectable()
export class RollCommand {
  @SlashCommand({ name: 'roll', description: 'Roll dice' })
  async handle(
    @Context() interaction: ChatInputCommandInteraction,
    @Options() dto: RollDto,
  ): Promise<void> {
    const count = dto.count ?? 1;
    const max = dto.sides === 'd20' ? 20 : 6;
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * max));
    await interaction.reply(`Rolled ${dto.sides} x${count}: ${rolls.join(', ')}`);
  }
}
