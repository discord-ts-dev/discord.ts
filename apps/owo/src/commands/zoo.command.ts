import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { userIdOf } from '@discord.ts/utils';
import { paginate } from '@discord.ts/ux';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { animalById, RARITIES, type Rarity } from '../game/roster.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { getZoo, zooTotals } from '../game/zoo.js';
import { GuildToggleable } from '../guards/enabled.guard.js';
import type { UserTargetDto } from './dto/owo.dto.js';

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
const PAGE_SIZE = 15;

@Injectable()
@GuildToggleable()
export class ZooCommand {
  @Command({ name: 'zoo', description: 'Show a zoo: every animal a user has caught' })
  async zoo(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: UserTargetDto,
  ): Promise<void> {
    const target = userIdOf(dto.user) ?? ctx.user.id;
    const zoo = await getZoo(store, target);
    const owned = Object.entries(zoo).filter(([, count]) => count > 0);

    if (!owned.length) {
      await ctx.reply(tt(ctx, 'game:zoo.empty'));
      return;
    }

    owned.sort(([a], [b]) => {
      const left = animalById(a);
      const right = animalById(b);
      if (!left || !right) return a.localeCompare(b);
      return (
        RARITY_ORDER.indexOf(left.rarity) - RARITY_ORDER.indexOf(right.rarity) ||
        left.name.localeCompare(right.name)
      );
    });

    const totals = zooTotals(zoo);
    const pages: EmbedBuilder[] = [];
    for (let i = 0; i < owned.length; i += PAGE_SIZE) {
      const lines = owned.slice(i, i + PAGE_SIZE).map(([id, count]) => {
        const animal = animalById(id);
        if (!animal) return tt(ctx, 'game:zoo.line', { emoji: '❓', name: id, count });
        return tt(ctx, 'game:zoo.line', {
          emoji: animal.emoji,
          name: `${animal.name} (${RARITIES[animal.rarity].label})`,
          count,
        });
      });
      pages.push(
        new EmbedBuilder()
          .setColor(COLORS.info)
          .setTitle(tt(ctx, 'game:zoo.title', { user: `<@${target}>` }))
          .setDescription(`${lines.join('\n')}\n\n${tt(ctx, 'game:zoo.totals', totals)}`),
      );
    }
    await paginate(ctx, pages);
  }
}
