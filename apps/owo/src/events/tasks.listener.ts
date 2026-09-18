import { Context, Injectable, Logger, OnceEvent } from '@discord.ts/common';
import { TaskRunner } from '@discord.ts/systems';
import { Events, type Client, type TextChannel } from 'discord.js';
import { autohuntTask } from '../game/autohunt.js';
import { battleRefundTask } from '../game/battles.js';
import { giveawayTask, setDrawHandler } from '../game/giveaway.js';
import { lotteryTask } from '../game/lottery.js';
import { tt } from '../game/text.js';

@Injectable()
export class TasksListener {
  private readonly log = new Logger(TasksListener.name);
  private runner: TaskRunner | null = null;

  @OnceEvent(Events.ClientReady)
  ready(@Context() client: Client<true>): void {
    setDrawHandler(async (giveaway, draw) => {
      try {
        const channel = await client.channels.fetch(giveaway.channelId);
        if (!channel || !channel.isTextBased() || !('send' in channel)) return;
        const winners = draw.winners.length
          ? draw.winners.map((id) => `<@${id}>`).join(', ')
          : tt(client, 'game:giveaway.no-winners');
        await (channel as TextChannel).send(
          tt(client, 'game:giveaway.ended', {
            prize: draw.prize,
            winners,
            entries: draw.entries,
            host: giveaway.hostId,
          }),
        );
      } catch {
        // channel gone: the draw still happened, the prize pool is empty anyway
      }
    });
    this.runner = new TaskRunner([lotteryTask, battleRefundTask, autohuntTask, giveawayTask]);
    this.runner.start();
    this.log.log(`Started ${this.runner.names.length} task(s) for ${client.user.tag}`);
  }
}
