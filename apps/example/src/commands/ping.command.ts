import { Command, CommandContext, Context, Injectable } from '@discord.ts/common';

@Injectable()
export class PingCommand {
  @Command({ name: 'ping', description: 'Reply with pong', slash: true, prefix: true })
  async handle(@Context() ctx: CommandContext): Promise<void> {
    await ctx.reply('pong');
  }
}
