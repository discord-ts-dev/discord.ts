import { Button, Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import { getBalance } from '@discord.ts/systems';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { readBet } from './bet.js';
import {
  dealerPlay,
  drawCard,
  handText,
  handValue,
  isNatural,
  resolve,
  type Card,
} from '../game/blackjack.js';
import { COLORS } from '../game/config.js';
import { credit } from '../game/economy.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { BetDto } from './dto/owo.dto.js';

const HIT_ID = /^owo:bj:hit_/;
const STAND_ID = /^owo:bj:stand_/;
const GAME_TTL_MS = 5 * 60_000;

interface Game {
  bet: number;
  player: Card[];
  dealer: Card[];
}

const gameKey = (gameId: string) => `bj:${gameId}`;

function row(gameId: string, source: unknown): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`owo:bj:hit_${gameId}`)
      .setLabel(tt(source, 'game:blackjack.hit'))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`owo:bj:stand_${gameId}`)
      .setLabel(tt(source, 'game:blackjack.stand'))
      .setStyle(ButtonStyle.Secondary),
  );
}

@Injectable()
@PlayerGuarded()
export class BlackjackCommand {
  @Command({ name: 'blackjack', description: 'Play blackjack against the dealer' })
  @Cooldown(5)
  async blackjack(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: BetDto,
  ): Promise<void> {
    const userId = ctx.user.id;
    const bet = await readBet(ctx, dto.amount);
    if (bet === null) return;

    const gameId = `${ctx.channelId ?? 'dm'}_${userId}`;
    await credit(store, userId, -bet);
    const player = [drawCard(), drawCard()];
    const dealer = [drawCard()];

    if (isNatural(player)) {
      const finished = dealerPlay([...dealer, drawCard()]);
      await this.settle(ctx, gameId, { bet, player, dealer: finished });
      return;
    }

    const game: Game = { bet, player, dealer };
    await store.set(gameKey(gameId), JSON.stringify(game), GAME_TTL_MS);
    await ctx.reply({
      embeds: [this.render(ctx, game, true)],
      components: [row(gameId, ctx)],
    });
  }

  @Button(HIT_ID)
  async hit(@Context() ix: ButtonInteraction): Promise<void> {
    const gameId = ix.customId.replace(HIT_ID, '');
    const game = await this.load(ix, gameId);
    if (!game) return;

    game.player.push(drawCard());
    if (handValue(game.player) > 21) {
      await store.del(gameKey(gameId));
      await ix.update({
        embeds: [this.render(ix, game, false).setDescription(tt(ix, 'game:blackjack.bust'))],
        components: [],
      });
      return;
    }
    await store.set(gameKey(gameId), JSON.stringify(game), GAME_TTL_MS);
    await ix.update({ embeds: [this.render(ix, game, true)], components: [row(gameId, ix)] });
  }

  @Button(STAND_ID)
  async stand(@Context() ix: ButtonInteraction): Promise<void> {
    const gameId = ix.customId.replace(STAND_ID, '');
    const game = await this.load(ix, gameId);
    if (!game) return;
    const dealer = dealerPlay([...game.dealer, drawCard()]);
    await this.settle(ix, gameId, { bet: game.bet, player: game.player, dealer });
  }

  /** Loads the game; only the owner may act, and a missing game means expired. */
  private async load(ix: ButtonInteraction, gameId: string): Promise<Game | null> {
    const owner = gameId.split('_').pop();
    if (owner !== ix.user.id) {
      await ix.reply({
        content: tt(ix, 'game:blackjack.not-yours'),
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    const raw = await store.get(gameKey(gameId));
    if (!raw) {
      await ix.reply({
        content: tt(ix, 'game:blackjack.expired'),
        flags: MessageFlags.Ephemeral,
      });
      return null;
    }
    return JSON.parse(raw) as Game;
  }

  private async settle(
    source: ChatInputCommandInteraction | ButtonInteraction,
    gameId: string,
    game: Game,
  ): Promise<void> {
    const outcome = resolve(game.player, game.dealer);
    const payout = Math.floor(game.bet * outcome.payout);
    if (payout > 0) await credit(store, source.user.id, payout);
    await store.del(gameKey(gameId));
    const balance = await getBalance(store, source.user.id);
    const embed = this.render(source, game, false)
      .setDescription(tt(source, `game:blackjack.${outcome.outcome}`))
      .setFooter({
        text: tt(source, 'game:blackjack.balance', {
          payout: fmt(payout),
          balance: fmt(balance),
        }),
      });
    if ('update' in source) await source.update({ embeds: [embed], components: [] });
    else await source.reply({ embeds: [embed] });
  }

  private render(source: unknown, game: Game, live: boolean): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(live ? COLORS.info : COLORS.gold)
      .setTitle(tt(source, 'game:blackjack.title'))
      .addFields(
        {
          name: tt(source, 'game:blackjack.player', { value: handValue(game.player) }),
          value: handText(game.player),
        },
        {
          name: tt(source, 'game:blackjack.dealer', { value: handValue(game.dealer) }),
          value: handText(game.dealer),
        },
        { name: tt(source, 'game:blackjack.bet'), value: fmt(game.bet), inline: true },
      );
  }
}
