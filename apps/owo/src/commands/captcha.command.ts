import { Button, Command, Context, Injectable, Options } from '@discord.ts/common';
import { RequireGuild, RequirePermissions } from '@discord.ts/core';
import {
  MessageFlags,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { captchaRoleOf, setCaptchaRole } from '../game/captcha.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { CaptchaRoleDto } from './dto/community.dto.js';

const VERIFY_ID = /^owo:verify_/;

@Injectable()
@PlayerGuarded()
@RequireGuild()
export class CaptchaCommand {
  @Command({ name: 'captcha', description: 'Set the verification role (manage server)' })
  @RequirePermissions(PermissionFlagsBits.ManageGuild)
  async captcha(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: CaptchaRoleDto,
  ): Promise<void> {
    await setCaptchaRole(store, (ctx.guild as { id: string }).id, dto.role.id);
    await replyEphemeral(ctx, tt(ctx, 'game:captcha.set', { role: dto.role.name }));
  }

  @Button(VERIFY_ID)
  async verify(@Context() ix: ButtonInteraction): Promise<void> {
    const guildId = ix.customId.replace(VERIFY_ID, '');
    const roleId = await captchaRoleOf(store, guildId);
    if (!roleId || !ix.guild) {
      await replyEphemeral(ix, tt(ix, 'game:captcha.unset'));
      return;
    }
    try {
      const member = await ix.guild.members.fetch(ix.user.id);
      await member.roles.add(roleId);
      await ix.reply({
        content: tt(ix, 'game:captcha.verified'),
        flags: MessageFlags.Ephemeral,
      });
    } catch {
      await replyEphemeral(ix, tt(ix, 'game:captcha.fail'));
    }
  }
}
