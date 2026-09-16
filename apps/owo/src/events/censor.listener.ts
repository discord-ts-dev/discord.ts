import { Context, Injectable, OnEvent } from '@discord.ts/common';
import { GatewayIntentBits, Events, type Message } from 'discord.js';
import { censoredWords } from '../game/community.js';
import { store } from '../game/store.js';
import { tt } from '../game/text.js';

@Injectable()
export class CensorListener {
  @OnEvent(Events.MessageCreate)
  async onMessage(@Context() message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;
    // ponytail: no-op unless the operator opts into the privileged
    // MessageContent intent in discord.config.ts. See the comment there.
    if (!message.client.options.intents.has(GatewayIntentBits.MessageContent)) return;
    const words = await censoredWords(store, message.guild.id);
    if (!words.length) return;
    const text = message.content.toLowerCase();
    if (!words.some((word) => text.includes(word))) return;
    try {
      await message.delete();
      const channel = message.channel;
      if (!('send' in channel)) return;
      const notice = await channel.send(
        tt(message, 'game:censor.notice', { user: message.author.id }),
      );
      setTimeout(() => void notice.delete().catch(() => undefined), 4000);
    } catch {
      // missing permissions: leave the message alone
    }
  }
}
