import { Command, Context, Inject, Injectable } from '@discord.ts/common';
import { STORE, addScore, top, type Store } from '@discord.ts/systems';
import type { ChatInputCommandInteraction } from 'discord.js';

@Injectable()
export class LeaderboardCommand {
  constructor(@Inject(STORE) private readonly store: Store) {}

  @Command({ name: 'leaderboard', description: 'Score a ping and show the top pingers' })
  async handle(@Context() interaction: ChatInputCommandInteraction): Promise<void> {
    const score = await addScore(this.store, 'pings', interaction.user.id, 1);
    const leaders = await top(this.store, 'pings', 5);
    const board = leaders
      .map((entry, index) => `${index + 1}. <@${entry.member}> — ${entry.score}`)
      .join('\n');
    await interaction.reply(`Ping #${score} for you.\n\n${board}`);
  }
}
