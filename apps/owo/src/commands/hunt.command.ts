import { Command, Context, Injectable } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import { addScore } from '@discord.ts/systems';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GAME } from '../game/config.js';
import { XP_BOARD } from '../game/economy.js';
import { advanceQuest } from '../game/quests.js';
import { RARITIES } from '../game/roster.js';
import { pickAnimal, rollCatch } from '../game/rng.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { huntChance, upgradeLevel } from '../game/upgrades.js';
import { addAnimal } from '../game/zoo.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class HuntCommand {
  @Command({ name: 'hunt', description: 'Catch a wild animal for your zoo' })
  @Cooldown(GAME.huntCooldownSeconds)
  async hunt(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const level = await upgradeLevel(store, ctx.user.id);
    if (!rollCatch(huntChance(GAME.catchChance, level))) {
      await ctx.reply(tt(ctx, 'game:hunt.escaped'));
      return;
    }

    const animal = pickAnimal();
    const count = await addAnimal(store, ctx.user.id, animal.id);
    await addScore(store, XP_BOARD, ctx.user.id, GAME.huntXp);
    await advanceQuest(store, ctx.user.id, 'hunt');

    const embed = new EmbedBuilder()
      .setColor(RARITIES[animal.rarity].color)
      .setTitle(tt(ctx, 'game:hunt.title'))
      .setDescription(
        tt(ctx, 'game:hunt.caught', {
          animal: `${animal.emoji} **${animal.name}**`,
          rarity: RARITIES[animal.rarity].label,
          count,
          xp: GAME.huntXp,
        }),
      );
    await ctx.reply({ embeds: [embed] });
  }
}
