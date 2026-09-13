import { Injectable } from '@nestjs/common';
import type { Message } from 'discord.js';
import { Context, PrefixArgs, PrefixCommand } from '@discord-ts/common';

@Injectable()
export class EchoPrefixCommand {
  @PrefixCommand({ name: 'echo', aliases: ['say'], description: 'Repeat text' })
  async handle(@Context() message: Message, @PrefixArgs() args: string[]): Promise<void> {
    await message.reply(args.join(' ') || '(empty)');
  }
}
