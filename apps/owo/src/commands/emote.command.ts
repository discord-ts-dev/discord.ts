import { Command, Context, Injectable, Options, StringOption } from '@discord.ts/common';
import { userIdOf } from '@discord.ts/utils';
import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { EMOTES, emoteById } from '../game/emotes.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';

class EmoteDto {
  @StringOption({
    name: 'type',
    description: 'Which emote',
    required: true,
    choices: EMOTES.map((emote) => ({ name: emote.id, value: emote.id })),
  })
  type!: string;

  @StringOption({ name: 'user', description: 'Target user', required: false })
  user?: string;
}

@Injectable()
@PlayerGuarded()
export class EmoteCommand {
  @Command({
    name: 'emote',
    description: 'Hug, pat, poke, or slap someone',
    category: 'Social',
    toggleable: true,
  })
  async emote(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: EmoteDto,
  ): Promise<void> {
    const emote = emoteById(dto.type);
    if (!emote) {
      await ctx.reply({ content: tt(ctx, 'game:emote.unknown'), flags: MessageFlags.Ephemeral });
      return;
    }
    const target = userIdOf(dto.user);
    if (emote.target && !target) {
      await ctx.reply({
        content: tt(ctx, 'game:emote.needs-target'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await ctx.reply(
      target
        ? tt(ctx, 'game:emote.target', {
            from: ctx.user.id,
            verb: emote.verb,
            to: target,
            emoji: emote.emoji,
          })
        : tt(ctx, 'game:emote.self', { from: ctx.user.id, verb: emote.verb, emoji: emote.emoji }),
    );
  }
}
