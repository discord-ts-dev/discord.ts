import {
  Context,
  Injectable,
  Options,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import {
  AUTOHUNT_INTERVAL_MS,
  AUTOHUNT_PRICE,
  autohuntState,
  buyAutohunt,
} from '../game/autohunt.js';
import { COLORS } from '../game/config.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { ChargesDto } from './dto/community.dto.js';

const Autohunt = createCommandGroupDecorator({
  name: 'autohunt',
  description: 'Idle hunting: charges hunt for you; view and buy charges',
  category: 'Economy',
  toggleable: true,
});

@Injectable()
@PlayerGuarded()
@Autohunt()
export class AutohuntCommand {
  @Subcommand({ name: 'view', description: 'Show your charges and next tick' })
  async view(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const state = await autohuntState(store, ctx.user.id);
    const waitMs = Math.max(0, state.at + AUTOHUNT_INTERVAL_MS - Date.now());
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:autohunt.title'))
      .setDescription(
        tt(ctx, 'game:autohunt.status', {
          charges: state.charges,
          next: state.charges > 0 ? Math.ceil(waitMs / 60_000) : 0,
        }),
      )
      .setFooter({ text: tt(ctx, 'game:autohunt.price', { price: fmt(AUTOHUNT_PRICE) }) });
    await ctx.reply({ embeds: [embed] });
  }

  @Subcommand({ name: 'buy', description: 'Buy autohunt charges' })
  async buy(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ChargesDto,
  ): Promise<void> {
    const result = await buyAutohunt(store, ctx.user.id, dto.count);
    if (!result.ok) {
      await replyEphemeral(ctx, tt(ctx, 'game:autohunt.fail'));
      return;
    }
    await ctx.reply(tt(ctx, 'game:autohunt.bought', { charges: result.charges }));
  }
}
