import { Button, Command, Context, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import { addScore, getBalance } from '@discord.ts/systems';
import { progressBar, userIdOf } from '@discord.ts/utils';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { readBet } from './bet.js';
import {
  applyMove,
  battleReward,
  fighterFor,
  weaponById,
  type BattleState,
  type Move,
} from '../game/battle.js';
import { COLORS } from '../game/config.js';
import { credit, XP_BOARD } from '../game/economy.js';
import { addRecord, equippedWeaponId } from '../game/loadout.js';
import { BATTLE_TTL_MS, indexBattle, unindexBattle } from '../game/battles.js';
import { RARITY_ORDER, ROSTER, type Animal } from '../game/roster.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { getZoo } from '../game/zoo.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { BattleDto } from './dto/battle.dto.js';

const MOVE_ID = /^owo:bt:(attack|defend|special)_/;

const battleKey = (id: string) => `battle:${id}`;

// ponytail: one battle resolves one press at a time in this process. Shards
// need a store-level lock; the gate closes the double-press race today.
const busy = new Set<string>();

/** Strongest owned animal by rarity tier. */
function bestAnimal(zoo: Record<string, number>): Animal | null {
  let best: Animal | null = null;
  for (const animal of ROSTER) {
    if ((zoo[animal.id] ?? 0) <= 0) continue;
    if (!best) {
      best = animal;
      continue;
    }
    const rank = RARITY_ORDER.indexOf(animal.rarity) - RARITY_ORDER.indexOf(best.rarity);
    if (rank > 0) best = animal;
  }
  return best;
}

@Injectable()
@PlayerGuarded()
export class BattleCommand {
  @Command({
    name: 'battle',
    description: 'Battle another user with your strongest animal',
    category: 'Battle',
    toggleable: true,
  })
  @Cooldown(10)
  async battle(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: BattleDto,
  ): Promise<void> {
    const opponentId = userIdOf(dto.user);
    if (!opponentId || opponentId === ctx.user.id) {
      await replyEphemeral(ctx, tt(ctx, 'game:battle.bad-opponent'));
      return;
    }

    const [mine, theirs, myWeaponId, theirWeaponId] = await Promise.all([
      getZoo(store, ctx.user.id),
      getZoo(store, opponentId),
      equippedWeaponId(store, ctx.user.id),
      equippedWeaponId(store, opponentId),
    ]);
    const myAnimal = bestAnimal(mine);
    const theirAnimal = bestAnimal(theirs);
    if (!myAnimal) {
      await replyEphemeral(ctx, tt(ctx, 'game:battle.no-animal'));
      return;
    }
    if (!theirAnimal) {
      await replyEphemeral(ctx, tt(ctx, 'game:battle.opponent-no-animal'));
      return;
    }

    const bet = await readBet(ctx, dto.amount);
    if (bet === null) return;
    const opponentBalance = await getBalance(store, opponentId);
    if (opponentBalance < bet) {
      await replyEphemeral(ctx, tt(ctx, 'game:battle.opponent-broke'));
      return;
    }

    await credit(store, ctx.user.id, -bet);
    await credit(store, opponentId, -bet);

    const battleId = `${ctx.channelId ?? 'dm'}_${ctx.user.id}_${opponentId}`;
    const state: BattleState = {
      id: battleId,
      a: fighterFor(ctx.user.id, myAnimal, weaponById(myWeaponId ?? '')),
      b: fighterFor(opponentId, theirAnimal, weaponById(theirWeaponId ?? '')),
      turn: 'a',
      bet,
      log: [],
    };
    await store.set(battleKey(battleId), JSON.stringify(state), BATTLE_TTL_MS);
    await indexBattle(store, {
      id: battleId,
      players: [ctx.user.id, opponentId],
      bet,
      at: Date.now(),
    });

    await ctx.reply({
      embeds: [this.render(ctx, state, null)],
      components: [this.row(battleId, ctx)],
    });
  }

  @Button(MOVE_ID)
  async move(@Context() ix: ButtonInteraction): Promise<void> {
    const match = MOVE_ID.exec(ix.customId);
    const move = (match?.[1] ?? 'attack') as Move;
    const battleId = ix.customId.replace(MOVE_ID, '');
    const raw = await store.get(battleKey(battleId));
    const state = raw ? (JSON.parse(raw) as BattleState) : null;
    if (!state) {
      await replyEphemeral(ix, tt(ix, 'game:battle.expired'));
      return;
    }

    const side = state.a.userId === ix.user.id ? 'a' : state.b.userId === ix.user.id ? 'b' : null;
    if (!side) {
      await replyEphemeral(ix, tt(ix, 'game:battle.not-yours'));
      return;
    }
    if (state.turn !== side) {
      await replyEphemeral(
        ix,
        tt(ix, 'game:battle.not-your-turn', { user: state[state.turn].userId }),
      );
      return;
    }
    if (busy.has(battleId)) {
      await replyEphemeral(ix, tt(ix, 'game:battle.busy'));
      return;
    }
    busy.add(battleId);
    try {
      const { state: next, event, finished } = applyMove(state, side, move);
      const line = tt(ix, `game:battle.line.${move}`, {
        user: next[side].userId,
        damage: event.damage,
        crit: event.crit ? tt(ix, 'game:battle.crit') : '',
        heal: event.heal,
        stun: event.stun ? tt(ix, 'game:battle.stunned') : '',
      });
      next.log = [...state.log, line].slice(-5);

      if (!finished) {
        await store.set(battleKey(battleId), JSON.stringify(next), BATTLE_TTL_MS);
        await ix.update({
          embeds: [this.render(ix, next, line)],
          components: [this.row(battleId, ix)],
        });
        return;
      }

      await store.del(battleKey(battleId));
      await unindexBattle(store, battleId);
      const winnerId = next[finished].userId;
      const loserId = next[finished === 'a' ? 'b' : 'a'].userId;
      const winner = next[finished];
      await credit(store, winnerId, next.bet * 2);
      const reward = battleReward(next.bet, true);
      await addScore(store, XP_BOARD, winnerId, reward.xp);
      await addScore(store, XP_BOARD, loserId, battleReward(next.bet, false).xp);
      await addRecord(store, winnerId, true);
      await addRecord(store, loserId, false);
      const balance = await getBalance(store, winnerId);

      const embed = this.render(ix, next, line)
        .setColor(COLORS.success)
        .setDescription(
          tt(ix, 'game:battle.finished', {
            winner: winnerId,
            loser: loserId,
            animal: `${winner.emoji} ${winner.name}`,
            pot: fmt(next.bet * 2),
            balance: fmt(balance),
          }),
        );
      await ix.update({ embeds: [embed], components: [] });
    } finally {
      busy.delete(battleId);
    }
  }

  private row(battleId: string, source: unknown): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`owo:bt:attack_${battleId}`)
        .setLabel(tt(source, 'game:battle.move.attack'))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`owo:bt:defend_${battleId}`)
        .setLabel(tt(source, 'game:battle.move.defend'))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`owo:bt:special_${battleId}`)
        .setLabel(tt(source, 'game:battle.move.special'))
        .setStyle(ButtonStyle.Success),
    );
  }

  private render(source: unknown, state: BattleState, lastLine: string | null): EmbedBuilder {
    const field = (fighter: BattleState['a'], active: boolean) => ({
      name: tt(source, 'game:battle.fighter', {
        user: fighter.userId,
        animal: `${fighter.emoji} ${fighter.name}`,
        active: active ? tt(source, 'game:battle.your-turn') : '',
      }),
      value: `${progressBar(fighter.hp, fighter.maxHp)} ${fighter.hp}/${fighter.maxHp}`,
      inline: true,
    });
    const embed = new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle(tt(source, 'game:battle.title'))
      .addFields(field(state.a, state.turn === 'a'), field(state.b, state.turn === 'b'));
    if (lastLine) embed.setDescription(lastLine);
    if (state.log.length > 1) {
      embed.setFooter({ text: state.log.slice(-3).join(' · ') });
    }
    return embed;
  }
}
