import { Context, Inject, Injectable, Logger, OnEvent } from '@discord.ts/common';
import { Events, type Client } from 'discord.js';
import { GuildPlayer } from '../music/guild-player.js';
import { PlaylistService } from '../music/playlist.service.js';
import { PremiumService } from '../music/premium.service.js';

@Injectable()
export class ReadyListener {
  private readonly log = new Logger(ReadyListener.name);

  constructor(
    @Inject(PremiumService) private readonly premium: PremiumService,
    @Inject(PlaylistService) private readonly playlists: PlaylistService,
    @Inject(GuildPlayer) private readonly player: GuildPlayer,
  ) {}

  @OnEvent(Events.ClientReady)
  ready(@Context() client: Client<true>): void {
    this.log.log(`Music bot logged in as ${client.user.tag}`);
    void this.premium.hydrate();
    void this.playlists.hydratePlaylists();
    this.player.attach(client);
  }
}
