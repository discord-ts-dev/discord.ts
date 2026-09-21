import { Context, Injectable, Subcommand, createCommandGroupDecorator } from '@discord.ts/common';
import { progressBar } from '@discord.ts/utils';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { credit } from '../game/economy.js';
import { claimQuest, ensureQuest, QUESTS, reroll } from '../game/quests.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

const Quest = createCommandGroupDecorator({
  name: 'quest',
  description: 'Daily quests: view, reroll, claim',
  category: 'Gameplay',
  toggleable: true,
});

@Injectable()
@PlayerGuarded()
@Quest()
export class QuestCommand {
  @Subcommand({ name: 'view', description: 'Show your quest and progress' })
  async view(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const quest = await ensureQuest(store, ctx.user.id);
    const def = QUESTS[quest.id];
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:quest.title'))
      .setDescription(tt(ctx, `game:quest.${quest.id}`))
      .addFields(
        {
          name: tt(ctx, 'game:quest.progress'),
          value: `${quest.progress}/${quest.goal} ${progressBar(quest.progress, quest.goal)}`,
          inline: true,
        },
        {
          name: tt(ctx, 'game:quest.reward'),
          value: fmt(def?.reward ?? 0),
          inline: true,
        },
      );
    if (quest.done) embed.setFooter({ text: tt(ctx, 'game:quest.done') });
    await ctx.reply({ embeds: [embed] });
  }

  @Subcommand({ name: 'reroll', description: 'Swap your quest once a day' })
  async reroll(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const result = await reroll(store, ctx.user.id);
    if (!result.ok) {
      await ctx.reply(
        result.reason === 'no-quest'
          ? tt(ctx, 'game:quest.reroll-none')
          : tt(ctx, 'game:quest.reroll-fail'),
      );
      return;
    }
    await ctx.reply(
      tt(ctx, 'game:quest.reroll-ok', { label: tt(ctx, `game:quest.${result.quest.id}`) }),
    );
  }

  @Subcommand({ name: 'claim', description: 'Claim the reward when your quest is done' })
  async claim(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const claimed = await claimQuest(store, ctx.user.id);
    if (!claimed) {
      await ctx.reply(tt(ctx, 'game:quest.not-done'));
      return;
    }
    const balance = await credit(store, ctx.user.id, claimed.reward);
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(tt(ctx, 'game:quest.title'))
      .setDescription(
        tt(ctx, 'game:quest.claimed', {
          reward: fmt(claimed.reward),
          balance: fmt(balance),
        }),
      );
    await ctx.reply({ embeds: [embed] });
  }
}
