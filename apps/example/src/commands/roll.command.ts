import { Injectable } from '@nestjs/common';
import type { ChatInputCommandInteraction } from 'discord.js';
import { Context, Options, SlashCommand } from 'discord.ts';
import { RollDto } from './dto/roll.dto';

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
