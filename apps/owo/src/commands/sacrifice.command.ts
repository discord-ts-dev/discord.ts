import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { addScore } from '@discord.ts/systems';
import type { ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from './bet.js';
import { XP_BOARD } from '../game/economy.js';
import { animalById, RARITIES } from '../game/roster.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { sacrificeXp } from '../game/upgrades.js';
import { getZoo, setZoo } from '../game/zoo.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { SellDto } from './dto/owo.dto.js';

@Injectable()
@PlayerGuarded()
export class SacrificeCommand {
  @Command({ name: 'sacrifice', description: 'Trade zoo animals for xp' })
  async sacrifice(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: SellDto,
  ): Promise<void> {
    const animal = animalById(dto.animal);
    if (!animal) return replyEphemeral(ctx, tt(ctx, 'game:sacrifice.fail'));
    const zoo = await getZoo(store, ctx.user.id);
    const owned = zoo[animal.id] ?? 0;
    if (owned <= 0) return replyEphemeral(ctx, tt(ctx, 'game:sacrifice.fail'));

    const count = Math.min(dto.count ?? owned, owned);
    const remaining = owned - count;
    if (remaining > 0) zoo[animal.id] = remaining;
    else delete zoo[animal.id];
    await setZoo(store, ctx.user.id, zoo);

    const xp = sacrificeXp(animal.rarity) * count;
    await addScore(store, XP_BOARD, ctx.user.id, xp);
    await ctx.reply(
      tt(ctx, 'game:sacrifice.done', {
        count,
        animal: `${animal.emoji} ${animal.name}`,
        rarity: RARITIES[animal.rarity].label,
        xp,
      }),
    );
  }
}
