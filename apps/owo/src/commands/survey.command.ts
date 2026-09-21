import { Button, Command, Context, Injectable, Options } from '@discord.ts/common';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from 'discord.js';

import { COLORS } from '../game/config.js';
import { startSurvey, voteSurvey, type SurveyState } from '../game/community.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { SurveyDto } from './dto/community.dto.js';

const VOTE_ID = /^owo:sv:(\d+)_(.+)$/;

@Injectable()
@PlayerGuarded()
export class SurveyCommand {
  @Command({
    name: 'survey',
    description: 'Start a quick button poll',
    category: 'Utility',
    toggleable: true,
  })
  async survey(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: SurveyDto,
  ): Promise<void> {
    const labels = [dto.option1, dto.option2, dto.option3, dto.option4].filter(
      (label): label is string => Boolean(label),
    );
    const tag = Math.random().toString(36).slice(2, 10);
    await startSurvey(store, tag, dto.question, labels);
    await ctx.reply({
      embeds: [
        this.render(ctx, {
          question: dto.question,
          options: labels.map((label) => ({ label, votes: 0 })),
        }),
      ],
      components: [this.row(tag, labels.length)],
    });
  }

  @Button(VOTE_ID)
  async vote(@Context() ix: ButtonInteraction): Promise<void> {
    const match = VOTE_ID.exec(ix.customId);
    const index = Number(match?.[1] ?? -1);
    const tag = match?.[2] ?? '';
    const state = await voteSurvey(store, tag, index);
    if (!state) {
      await ix.reply({ content: tt(ix, 'game:survey.expired'), flags: MessageFlags.Ephemeral });
      return;
    }
    await ix.update({
      embeds: [this.render(ix, state)],
      components: [this.row(tag, state.options.length)],
    });
  }

  private row(tag: string, count: number): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      Array.from({ length: count }, (_, i) =>
        new ButtonBuilder()
          .setCustomId(`owo:sv:${i}_${tag}`)
          .setLabel(String(i + 1))
          .setStyle(ButtonStyle.Primary),
      ),
    );
  }

  private render(source: unknown, state: SurveyState): EmbedBuilder {
    const total = state.options.reduce((sum, option) => sum + option.votes, 0);
    return new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(source, 'game:survey.title'))
      .setDescription(
        `${state.question}\n\n${state.options
          .map((option, i) => `**${i + 1}.** ${option.label} — ${option.votes}`)
          .join('\n')}`,
      )
      .setFooter({ text: tt(source, 'game:survey.footer', { total }) });
  }
}
