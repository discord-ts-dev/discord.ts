import { Command, Context, Injectable } from '@discord.ts/common';
import { getBalance } from '@discord.ts/systems';
import type { ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { GAME } from '../game/config.js';
import { credit } from '../game/economy.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import {
  huntChance,
  setUpgradeLevel,
  upgradeCost,
  upgradeLevel,
  UPGRADE_MAX_LEVEL,
} from '../game/upgrades.js';
import { PlayerGuarded } from '../guards/player.guard.js';

@Injectable()
@PlayerGuarded()
export class UpgradeCommand {
  @Command({
    name: 'upgrade',
    description: 'Upgrade your hunting luck (better catch chance)',
    category: 'Gameplay',
    toggleable: true,
  })
  async upgrade(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const level = await upgradeLevel(store, ctx.user.id);
    if (level >= UPGRADE_MAX_LEVEL) {
      await replyEphemeral(ctx, tt(ctx, 'game:upgrade.maxed'));
      return;
    }
    const cost = upgradeCost(level);
    const balance = await getBalance(store, ctx.user.id);
    if (balance < cost) {
      await replyEphemeral(
        ctx,
        tt(ctx, 'game:upgrade.fail', { cost: fmt(cost), balance: fmt(balance) }),
      );
      return;
    }
    await credit(store, ctx.user.id, -cost);
    await setUpgradeLevel(store, ctx.user.id, level + 1);
    const chance = Math.round(huntChance(GAME.catchChance, level + 1) * 100);
    await ctx.reply(tt(ctx, 'game:upgrade.done', { level: level + 1, chance }));
  }
}
