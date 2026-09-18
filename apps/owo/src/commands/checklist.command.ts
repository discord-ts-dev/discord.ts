import {
  Context,
  Injectable,
  Options,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from './bet.js';
import { COLORS } from '../game/config.js';
import {
  addChecklistItem,
  checklistOf,
  removeChecklistItem,
  toggleChecklistItem,
  type ChecklistItem,
} from '../game/community.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import type { ChecklistAddDto, ChecklistIdDto } from './dto/community.dto.js';

const Checklist = createCommandGroupDecorator({
  name: 'checklist',
  description: 'Your personal checklist',
});

@Injectable()
@PlayerGuarded()
@Checklist()
export class ChecklistCommand {
  @Subcommand({ name: 'add', description: 'Add an item' })
  async add(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ChecklistAddDto,
  ): Promise<void> {
    const list = await addChecklistItem(store, ctx.user.id, dto.text);
    await ctx.reply({ embeds: [this.render(ctx, list)] });
  }

  @Subcommand({ name: 'done', description: 'Toggle an item done or not' })
  async done(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ChecklistIdDto,
  ): Promise<void> {
    const list = await toggleChecklistItem(store, ctx.user.id, dto.id);
    await ctx.reply({ embeds: [this.render(ctx, list)] });
  }

  @Subcommand({ name: 'remove', description: 'Remove an item' })
  async remove(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: ChecklistIdDto,
  ): Promise<void> {
    const list = await removeChecklistItem(store, ctx.user.id, dto.id);
    await ctx.reply({ embeds: [this.render(ctx, list)] });
  }

  @Subcommand({ name: 'list', description: 'Show your checklist' })
  async list(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const items = await checklistOf(store, ctx.user.id);
    if (!items.length) {
      await replyEphemeral(ctx, tt(ctx, 'game:checklist.empty'));
      return;
    }
    await ctx.reply({ embeds: [this.render(ctx, items)] });
  }

  private render(source: unknown, items: ChecklistItem[]): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(source, 'game:checklist.title'))
      .setDescription(
        items.length
          ? items
              .map((item) => `${item.done ? '✅' : '⬜'} **${item.id}.** ${item.text}`)
              .join('\n')
          : tt(source, 'game:checklist.empty'),
      );
  }
}
