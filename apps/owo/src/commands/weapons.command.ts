import {
  Context,
  Injectable,
  Options,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { inventory } from '@discord.ts/systems';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { purchase } from './purchase.js';
import { replyEphemeral } from '@discord.ts/ux';
import { WEAPONS, weaponById } from '../game/battle.js';
import { COLORS } from '../game/config.js';
import { equippedWeaponId, recordOf, setEquippedWeapon, weaponItemId } from '../game/loadout.js';
import { store } from '../game/store.js';
import { fmt, tt } from '../game/text.js';
import { premiumTierOf, shopPrice } from '../game/premium.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { WeaponChoiceDto } from './dto/battle.dto.js';

const Weapons = createCommandGroupDecorator({
  name: 'weapons',
  description: 'Buy, equip, and inspect battle weapons',
});

@Injectable()
@PlayerGuarded()
@Weapons()
export class WeaponsCommand {
  @Subcommand({ name: 'list', description: 'Show every weapon and your record' })
  async list(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const [bag, equipped, record, tier] = await Promise.all([
      inventory(store, ctx.user.id),
      equippedWeaponId(store, ctx.user.id),
      recordOf(store, ctx.user.id),
      premiumTierOf(store, ctx.user.id),
    ]);
    const lines = WEAPONS.map((weapon) => {
      const owned = (bag[weaponItemId(weapon.id)] ?? 0) > 0;
      const marks = [
        owned ? tt(ctx, 'game:weapons.owned') : '',
        equipped === weapon.id ? tt(ctx, 'game:weapons.equipped') : '',
      ]
        .filter(Boolean)
        .join(' ');
      return tt(ctx, 'game:weapons.line', {
        emoji: weapon.emoji,
        name: weapon.name,
        atk: weapon.atk,
        price: fmt(shopPrice(weapon.price, tier)),
        effect: weapon.effect ? tt(ctx, `game:weapons.effect.${weapon.effect}`) : '',
        marks,
      });
    });
    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(tt(ctx, 'game:weapons.title'))
      .setDescription(lines.join('\n'))
      .setFooter({
        text: tt(ctx, 'game:weapons.record', { wins: record.wins, losses: record.losses }),
      });
    await ctx.reply({ embeds: [embed] });
  }

  @Subcommand({ name: 'buy', description: 'Buy a weapon' })
  async buy(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: WeaponChoiceDto,
  ): Promise<void> {
    const weapon = weaponById(dto.weapon);
    if (!weapon) return replyEphemeral(ctx, tt(ctx, 'game:weapons.unknown'));
    const result = await purchase(ctx, {
      id: weaponItemId(weapon.id),
      name: weapon.name,
      price: weapon.price,
    });
    if (!result.ok) {
      await replyEphemeral(
        ctx,
        tt(ctx, 'game:fail.purchase', {
          name: weapon.name,
          price: fmt(result.price),
          balance: fmt(result.balance),
        }),
      );
      return;
    }
    await ctx.reply(
      tt(ctx, 'game:weapons.bought', {
        name: weapon.name,
        price: fmt(result.price),
        balance: fmt(result.balance),
      }),
    );
  }

  @Subcommand({ name: 'equip', description: 'Equip an owned weapon' })
  async equip(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: WeaponChoiceDto,
  ): Promise<void> {
    const weapon = weaponById(dto.weapon);
    if (!weapon) return replyEphemeral(ctx, tt(ctx, 'game:weapons.unknown'));
    const bag = await inventory(store, ctx.user.id);
    if ((bag[weaponItemId(weapon.id)] ?? 0) <= 0) {
      await replyEphemeral(ctx, tt(ctx, 'game:weapons.not-owned', { name: weapon.name }));
      return;
    }
    await setEquippedWeapon(store, ctx.user.id, weapon.id);
    await ctx.reply(tt(ctx, 'game:weapons.equipped-ok', { name: weapon.name }));
  }

  @Subcommand({ name: 'unequip', description: 'Fight bare-handed again' })
  async unequip(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    await setEquippedWeapon(store, ctx.user.id, null);
    await ctx.reply(tt(ctx, 'game:weapons.unequipped'));
  }
}
