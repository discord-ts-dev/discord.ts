import {
  Context,
  Injectable,
  Options,
  Subcommand,
  createCommandGroupDecorator,
} from '@discord.ts/common';
import { AttachmentBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { replyEphemeral } from '@discord.ts/ux';
import { renderMeme } from '../game/meme.js';
import { tt } from '../game/text.js';
import { PlayerGuarded } from '../guards/player.guard.js';
import { MemeOneDto, MemeTwoDto } from './dto/memegen.dto.js';

const Memegen = createCommandGroupDecorator({
  name: 'memegen',
  description: 'Draw a quick meme: caption, drake, distracted, more',
  category: 'Utility',
  toggleable: true,
});

@Injectable()
@PlayerGuarded()
@Memegen()
export class MemegenCommand {
  @Subcommand({ name: 'caption', description: 'One-panel caption' })
  async caption(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: MemeOneDto,
  ): Promise<void> {
    await this.send(ctx, 'caption', [dto.text]);
  }

  @Subcommand({ name: 'drake', description: 'Two panels: reject, then approve' })
  async drake(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: MemeTwoDto,
  ): Promise<void> {
    await this.send(ctx, 'drake', [dto.first, dto.second]);
  }

  @Subcommand({ name: 'distracted', description: 'Two panels: what distracts, what matters' })
  async distracted(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: MemeTwoDto,
  ): Promise<void> {
    await this.send(ctx, 'distracted', [dto.first, dto.second]);
  }

  @Subcommand({ name: 'tradeoffer', description: 'Two panels: what you get, what you give' })
  async tradeoffer(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: MemeTwoDto,
  ): Promise<void> {
    await this.send(ctx, 'tradeoffer', [dto.first, dto.second]);
  }

  @Subcommand({ name: 'isthisa', description: 'Two panels: the question, the label' })
  async isthisa(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: MemeTwoDto,
  ): Promise<void> {
    await this.send(ctx, 'isthisa', [dto.first, dto.second]);
  }

  @Subcommand({ name: 'eject', description: 'Two panels: the accusation, the exit' })
  async eject(
    @Context() ctx: ChatInputCommandInteraction,
    @Options() dto: MemeTwoDto,
  ): Promise<void> {
    await this.send(ctx, 'eject', [dto.first, dto.second]);
  }

  private async send(
    ctx: ChatInputCommandInteraction,
    template: string,
    texts: string[],
  ): Promise<void> {
    const png = await renderMeme(template, texts);
    if (!png) {
      await replyEphemeral(ctx, tt(ctx, 'game:memegen.fail'));
      return;
    }
    await ctx.reply({ files: [new AttachmentBuilder(png, { name: `${template}.png` })] });
  }
}
