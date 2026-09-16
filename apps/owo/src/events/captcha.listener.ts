import { Context, Injectable, OnEvent } from '@discord.ts/common';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, type GuildMember } from 'discord.js';
import { captchaRoleOf } from '../game/captcha.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';

/** Greet a new member with a verification DM when the guild configured a role. */
@Injectable()
export class CaptchaListener {
  @OnEvent(Events.GuildMemberAdd)
  async onJoin(@Context() member: GuildMember): Promise<void> {
    const roleId = await captchaRoleOf(store, member.guild.id);
    if (!roleId) return;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`owo:verify_${member.guild.id}`)
        .setLabel(tt(member, 'game:captcha.button'))
        .setStyle(ButtonStyle.Success),
    );
    await member.send({ content: tt(member, 'game:captcha.dm'), components: [row] }).catch(() => {
      // DMs closed: nothing to do, an admin can verify manually
    });
  }
}
