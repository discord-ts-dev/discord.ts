import { Context, Injectable, Logger, OnceEvent } from '@discord.ts/common';
import { TaskRunner } from '@discord.ts/systems';
import { Events, type Client } from 'discord.js';
import { battleRefundTask } from '../game/battles.js';
import { lotteryTask } from '../game/lottery.js';

@Injectable()
export class TasksListener {
  private readonly log = new Logger(TasksListener.name);
  private runner: TaskRunner | null = null;

  @OnceEvent(Events.ClientReady)
  ready(@Context() client: Client<true>): void {
    this.runner = new TaskRunner([lotteryTask, battleRefundTask]);
    this.runner.start();
    this.log.log(`Started ${this.runner.names.length} task(s) for ${client.user.tag}`);
  }
}
