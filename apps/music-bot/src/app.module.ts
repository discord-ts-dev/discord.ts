import { Module } from '@discord.ts/common';
import { DiscordModule } from '@discord.ts/core';
import { AdminCommand } from './music/admin.command.js';
import { FiltersCommand } from './music/filters.command.js';
import { InfoCommand } from './music/info.command.js';
import { LavalinkService } from './music/lavalink.service.js';
import { LocaleService } from './music/locale.service.js';
import { LyricService } from './music/lyric.service.js';
import { MusicCommand } from './music/music.command.js';
import { MusicHudCommand } from './music/music-hud.command.js';
import { MusicService } from './music/music.service.js';
import { PlaylistCommand } from './music/playlist.command.js';
import { PremiumService } from './music/premium.service.js';
import { ReadyListener } from './events/ready.listener.js';

@Module({
  imports: [DiscordModule.forRootAsync()],
  providers: [
    MusicService,
    LavalinkService,
    LyricService,
    LocaleService,
    PremiumService,
    MusicCommand,
    MusicHudCommand,
    PlaylistCommand,
    FiltersCommand,
    InfoCommand,
    AdminCommand,
    ReadyListener,
  ],
})
export class AppModule {}
