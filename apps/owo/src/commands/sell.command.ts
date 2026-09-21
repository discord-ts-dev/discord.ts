import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { credit, sellCount } from '../game/economy.js';
import { advanceQuest } from '../game/quests.js';
import { animalById } from '../game/roster.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { getZoo, setZoo } from '../game/zoo.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { SellDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class SellCommand {
  @Command({
    name: 'sell',
    description: 'Sell zoo animals for pawcoins',
    category: 'Economy',
    toggleable: true,
  })
  async sell(@Context() ctx: ChatInputCommandInteraction, @Options() dto: SellDto): Promise<void> {
    const userId = ctx.user.id;
    const zoo = await getZoo(store, userId);
    const { sold, proceeds } = sellCount(zoo, dto.animal, dto.count ?? Number.MAX_SAFE_INTEGER);
    if (!sold) {
      await ctx.reply({
        content: tt(ctx, 'game:sell.fail'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const remaining = (zoo[dto.animal] ?? 0) - sold;
    if (remaining > 0) zoo[dto.animal] = remaining;
    else delete zoo[dto.animal];
    await setZoo(store, userId, zoo);

    const balance = await credit(store, userId, proceeds);
    await advanceQuest(store, userId, 'sell', sold);

    const animal = animalById(dto.animal);
    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(tt(ctx, 'game:sell.title'))
      .setDescription(
        tt(ctx, 'game:sell.done', {
          count: sold,
          animal: animal ? `${animal.emoji} ${animal.name}` : dto.animal,
          proceeds: fmt(proceeds),
          balance: fmt(balance),
        }),
      );
    await ctx.reply({ embeds: [embed] });
  }
}
