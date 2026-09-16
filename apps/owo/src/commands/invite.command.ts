import { Command, Context, Injectable } from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class InviteCommand {
  @Command({ name: 'invite', description: 'Get the invite link for Paw' })
  async invite(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const id = ctx.client.application?.id;
    const url = id
      ? `https://discord.com/oauth2/authorize?client_id=${id}&scope=bot%20applications.commands&permissions=0`
      : null;
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:invite.title'))
      .setDescription(url ? tt(ctx, 'game:invite.body') : tt(ctx, 'game:invite.unavailable'))
      .setURL(url);
    await ctx.reply({ embeds: [embed] });
  }
}
