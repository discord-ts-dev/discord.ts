import { Command, Context, Injectable } from '@discord.ts/common';
import { paginate } from '@discord.ts/ux';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { RARITIES, ROSTER, type Rarity } from '../game/roster.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { getZoo, zooTotals } from '../game/zoo.js';
import { PlayerGuarded } from '../guards/player.guard.js';

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
const PAGE_SIZE = 12;

@Injectable()
@PlayerGuarded()
export class DexCommand {
  @Command({
    name: 'dex',
    description: 'Dex: every species, caught or not',
    category: 'Gameplay',
    toggleable: true,
  })
  async dex(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const zoo = await getZoo(store, ctx.user.id);
    const sorted = [...ROSTER].sort(
      (a, b) =>
        RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
        a.name.localeCompare(b.name),
    );

    const totals = zooTotals(zoo);
    const pages: EmbedBuilder[] = [];
    for (let i = 0; i < sorted.length; i += PAGE_SIZE) {
      const lines = sorted.slice(i, i + PAGE_SIZE).map((animal) => {
        const count = zoo[animal.id] ?? 0;
        return tt(ctx, 'game:dex.line', {
          emoji: animal.emoji,
          name: `${animal.name} (${RARITIES[animal.rarity].label})`,
          count: count > 0 ? `x${count}` : tt(ctx, 'game:dex.missing'),
        });
      });
      pages.push(
        new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(tt(ctx, 'game:dex.title'))
          .setDescription(
            `${lines.join('\n')}\n\n${tt(ctx, 'game:dex.totals', {
              unique: totals.unique,
              total: sorted.length,
            })}`,
          ),
      );
    }
    await paginate(ctx, pages, { allowedUserId: ctx.user.id });
  }
}
