import { Context, Injectable, PrefixArgs, PrefixCommand } from '@discord.ts/common';
import type { Message } from 'discord.js';

@Injectable()
export class EchoPrefixCommand {
  @PrefixCommand({ name: 'echo', aliases: ['say'], description: 'Repeat text' })
  async handle(@Context() message: Message, @PrefixArgs() args: string[]): Promise<void> {
    await message.reply(args.join(' ') || '(empty)');
  }
}
