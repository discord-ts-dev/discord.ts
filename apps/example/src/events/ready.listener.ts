import { Injectable, Logger } from '@nestjs/common';
import { Events, type Client } from 'discord.js';
import { Context, OnEvent } from '@discord-ts/common';

@Injectable()
export class ReadyListener {
  private readonly log = new Logger(ReadyListener.name);

  @OnEvent(Events.ClientReady)
  ready(@Context() client: Client<true>): void {
    this.log.log(`Logged in as ${client.user.tag}`);
  }
}
