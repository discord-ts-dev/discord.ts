import { Context, Injectable, Logger, OnEvent } from '@discord.ts/common';
import { Events, type Client } from 'discord.js';
import { lavalinkService } from '../music/lavalink.service.js';
import { musicService } from '../music/music.service.js';
import { premiumService } from '../music/premium.service.js';

@Injectable()
export class ReadyListener {
  private readonly log = new Logger(ReadyListener.name);

  @OnEvent(Events.ClientReady)
  ready(@Context() client: Client<true>): void {
    this.log.log(`Music bot logged in as ${client.user.tag}`);
    void premiumService.hydrate();
    void musicService.hydratePlaylists();
    lavalinkService.attach(client, {
      onTrackStart: (guildId, track) => musicService.mirrorLiveCurrent(guildId, track),
      onQueueEnd: (guildId) => musicService.mirrorQueueEnd(guildId),
    });
  }
}
