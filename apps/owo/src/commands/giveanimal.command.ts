import { Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import { userIdOf } from '@discord.ts/utils';
import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { COLORS } from '../game/config.js';
import { animalById, RARITIES } from '../game/roster.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { addAnimal } from '../game/zoo.js';
import { GiveAnimalDto } from './dto/owo.dto.js';

@Injectable()
@RequireGuild()
export class GiveAnimalCommand {
  @Command({
    name: 'giveanimal',
    description: 'Grant zoo animals to a user (manage server)',
    category: 'Admin',
  })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async giveanimal(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: GiveAnimalDto,
  ): Promise<void> {
    const target = userIdOf(dto.user);
    const animal = animalById(dto.animal);
    if (!target || !animal) {
      await ctx.reply({ content: tt(ctx, 'game:giveanimal.fail'), flags: MessageFlags.Ephemeral });
      return;
    }
    const count = dto.count ?? 1;
    const total = await addAnimal(store, target, animal.id, count);
    const embed = new EmbedBuilder().setColor(COLORS.gold).setDescription(
      tt(ctx, 'game:giveanimal.done', {
        count,
        animal: `${animal.emoji} ${animal.name}`,
        rarity: RARITIES[animal.rarity].label,
        user: `<@${target}>`,
        total,
      }),
    );
    await ctx.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
