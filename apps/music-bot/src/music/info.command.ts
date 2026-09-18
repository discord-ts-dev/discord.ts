import { Author, Command, Context, Guild, Inject, Injectable, Options } from '@discord.ts/common';
import { Cooldown, RequireGuild } from '@discord.ts/core';
import { t } from '@discord.ts/i18n';
import { buildHelp } from '@discord.ts/systems';
import { deliver } from '@discord.ts/ux';
import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Guild as DiscordGuild,
  type User,
} from 'discord.js';
import { HelpDto, PremiumScopeDto } from './dto/admin.dto.js';
import { PremiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';

const COMMANDS = [
  { name: 'play', description: 'Play a song or URL', category: 'Music' },
  { name: 'playnext', description: 'Add a song to play next', category: 'Music' },
  { name: 'pause', description: 'Pause playback', category: 'Music' },
  { name: 'resume', description: 'Resume playback', category: 'Music' },
  { name: 'skip', description: 'Skip current track', category: 'Music' },
  { name: 'replay', description: 'Replay current track', category: 'Music' },
  { name: 'seek', description: 'Seek in current track', category: 'Music' },
  { name: 'volume', description: 'Set volume 0-200', category: 'Music' },
  { name: 'queue', description: 'Show current queue', category: 'Music' },
  { name: 'clearqueue', description: 'Clear the queue', category: 'Music' },
  { name: 'shuffle', description: 'Shuffle the queue', category: 'Music' },
  { name: 'remove', description: 'Remove a track by position', category: 'Music' },
  { name: 'nowplaying', description: 'Show current track', category: 'Music' },
  { name: 'autoplay', description: 'Toggle autoplay', category: 'Music' },
  { name: 'loop', description: 'Loop track, queue, or off', category: 'Music' },
  { name: 'join', description: 'Join your voice channel', category: 'Music' },
  { name: 'leave', description: 'Leave voice channel', category: 'Music' },
  { name: 'search', description: 'Search songs', category: 'Music' },
  { name: 'lyric', description: 'Get lyrics', category: 'Music' },
  { name: 'playlist', description: 'List your playlists', category: 'Playlist' },
  { name: 'playlist-create', description: 'Create a playlist', category: 'Playlist' },
  { name: 'playlist-add', description: 'Add a song to a playlist', category: 'Playlist' },
  { name: 'playlist-load', description: 'Load a playlist into queue', category: 'Playlist' },
  { name: 'playlist-delete', description: 'Delete a playlist', category: 'Playlist' },
  { name: 'playlist-remove', description: 'Remove a song from a playlist', category: 'Playlist' },
  { name: 'playlist-steal', description: "Copy another user's playlist", category: 'Playlist' },
  { name: 'filters bassboost', description: 'Toggle bassboost', category: 'Filters' },
  { name: 'filters nightcore', description: 'Toggle nightcore', category: 'Filters' },
  { name: 'filters karaoke', description: 'Toggle karaoke', category: 'Filters' },
  { name: 'filters 8d', description: 'Toggle 8d rotation', category: 'Filters' },
  { name: 'filters pitch', description: 'Toggle pitch', category: 'Filters' },
  { name: 'filters speed', description: 'Toggle speed', category: 'Filters' },
  { name: 'filters tremolo', description: 'Toggle tremolo', category: 'Filters' },
  { name: 'filters vibrato', description: 'Toggle vibrato', category: 'Filters' },
  { name: 'filters lowpass', description: 'Toggle lowpass', category: 'Filters' },
  { name: 'filters rotation', description: 'Toggle rotation', category: 'Filters' },
  { name: 'filters reset', description: 'Reset all filters', category: 'Filters' },
  { name: 'help', description: 'Show all commands or one command', category: 'Info' },
  { name: 'ping', description: 'Check bot latency', category: 'Info' },
  { name: 'premium', description: 'Check premium status', category: 'Info' },
];

const HELP = buildHelp(COMMANDS);

@Injectable()
@RequireGuild()
export class InfoCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  constructor(@Inject(PremiumService) private readonly premium: PremiumService) {}

  @Command({
    name: 'help',
    description: 'Show all commands or one command',
  })
  @Cooldown(5)
  async help(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
    @Options() dto: HelpDto,
  ): Promise<void> {
    const lang = this.premium.languageOf(guild.id);
    if (dto.command) {
      const found = COMMANDS.find((n) => n.name === dto.command);
      const embed = new EmbedBuilder()
        .setColor(botConfig.color.main)
        .setTitle(dto.command)
        .setDescription(
          found
            ? `${found.description}\n${t('help.detail', { command: found.name }, lang)}`
            : t('error.cmd.not_found', undefined, lang),
        );
      await ctx.reply({ embeds: [embed] });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(botConfig.color.main)
      .setTitle(t('help.title', undefined, lang))
      .setDescription(t('help.description', undefined, lang))
      .addFields(
        HELP.map((h) => ({
          name: h.category,
          value: h.commands.map((c) => `\`${c.name}\``).join(' '),
        })),
      )
      .setFooter({ text: t('help.footer', undefined, lang) });
    await ctx.reply({ embeds: [embed] });
  }

  @Command({ name: 'ping', description: 'Check bot latency' })
  @Cooldown(5)
  async ping(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
  ): Promise<void> {
    const lang = this.premium.languageOf(guild.id);
    const t0 = Date.now();
    await ctx.reply(t('ping.checking', undefined, lang));
    const botLatency = Date.now() - t0;
    const apiLatency = ctx.client.ws.ping;
    const embed = new EmbedBuilder().setColor(botConfig.color.main).addFields(
      {
        name: t('ping.bot_latency', undefined, lang),
        value: `${botLatency >= 600 ? '' : '+'}${botLatency}ms`,
      },
      {
        name: t('ping.api_latency', undefined, lang),
        value: `${apiLatency >= 500 || apiLatency < 0 ? '' : '+'}${apiLatency}ms`,
      },
    );
    await deliver(ctx, { embeds: [embed] });
  }

  @Command({ name: 'premium', description: 'Check premium status' })
  @Cooldown(5)
  async premiumStatus(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
    @Author() author: User,
    @Options() dto: PremiumScopeDto,
  ): Promise<void> {
    const lang = this.premium.languageOf(guild.id);
    if (dto.scope === 'guild') {
      const d = this.premium.describeGuild(guild.id);
      await ctx.reply(
        t(
          'premium.message',
          {
            status: d.active ? 'active' : 'inactive',
            from: d.from,
            to: d.to,
          },
          lang,
        ),
      );
      return;
    }
    const d = this.premium.describeUser(author.id);
    await ctx.reply(
      t(
        'premium.message',
        {
          status: d.active ? 'active' : 'inactive',
          from: d.from,
          to: d.to,
        },
        lang,
      ),
    );
  }
}
