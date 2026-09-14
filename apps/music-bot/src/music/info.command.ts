import { Author, Command, Context, Guild, Injectable, Options } from '@discord.ts/common';
import { Cooldown } from '@discord.ts/core';
import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Guild as DiscordGuild,
  type Message,
  type User,
} from 'discord.js';
import { HelpDto, PremiumScopeDto } from './dto/admin.dto.js';
import { LocaleService, localeService } from './locale.service.js';
import { PremiumService, premiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';

type Ctx = ChatInputCommandInteraction | Message;

const HELP: { category: string; lines: string[] }[] = [
  {
    category: 'Music',
    lines: [
      'play',
      'playnext',
      'pause',
      'resume',
      'skip',
      'replay',
      'seek',
      'volume',
      'queue',
      'clearqueue',
      'shuffle',
      'remove',
      'nowplaying',
      'autoplay',
      'loop',
      'join',
      'leave',
      'search',
      'lyric',
    ],
  },
  {
    category: 'Playlist',
    lines: [
      'playlist',
      'playlist-create',
      'playlist-add',
      'playlist-load',
      'playlist-delete',
      'playlist-steal',
    ],
  },
  {
    category: 'Filters',
    lines: [
      'filters bassboost',
      'filters nightcore',
      'filters karaoke',
      'filters 8d',
      'filters pitch',
      'filters speed',
      'filters tremolo',
      'filters vibrato',
      'filters lowpass',
      'filters rotation',
      'filters reset',
    ],
  },
  { category: 'Info', lines: ['help', 'ping', 'premium'] },
];

@Injectable()
export class InfoCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly locale: LocaleService = localeService;
  private readonly premium: PremiumService = premiumService;

  @Command({
    name: 'help',
    description: 'Show all commands or one command',
    slash: true,
    prefix: true,
  })
  @Cooldown(5)
  async help(
    @Context() ctx: Ctx,
    @Guild() guild: DiscordGuild | null,
    @Options() dto: HelpDto,
  ): Promise<void> {
    const lang = this.premium.languageOf(guild?.id ?? null);
    if (dto.command) {
      const found = HELP.flatMap((h) => h.lines).find((n) => n === dto.command);
      const embed = new EmbedBuilder()
        .setColor(botConfig.color.main)
        .setTitle(dto.command)
        .setDescription(
          found
            ? this.locale.t(lang, 'help.detail', { command: found })
            : this.locale.t(lang, 'error.cmd.not_found'),
        );
      await ctx.reply({ embeds: [embed] });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(botConfig.color.main)
      .setTitle(this.locale.t(lang, 'help.title'))
      .setDescription(this.locale.t(lang, 'help.description'))
      .addFields(
        HELP.map((h) => ({ name: h.category, value: h.lines.map((l) => `\`${l}\``).join(' ') })),
      )
      .setFooter({ text: this.locale.t(lang, 'help.footer') });
    await ctx.reply({ embeds: [embed] });
  }

  @Command({ name: 'ping', description: 'Check bot latency', slash: true, prefix: true })
  @Cooldown(5)
  async ping(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    const lang = this.premium.languageOf(guild?.id ?? null);
    const t0 = Date.now();
    await ctx.reply(this.locale.t(lang, 'ping.checking'));
    const botLatency = Date.now() - t0;
    const apiLatency = 'client' in ctx ? ctx.client.ws.ping : -1;
    const embed = new EmbedBuilder().setColor(botConfig.color.main).addFields(
      {
        name: this.locale.t(lang, 'ping.bot_latency'),
        value: `${botLatency >= 600 ? '' : '+'}${botLatency}ms`,
      },
      {
        name: this.locale.t(lang, 'ping.api_latency'),
        value: `${apiLatency >= 500 || apiLatency < 0 ? '' : '+'}${apiLatency}ms`,
      },
    );
    await ctx.reply({ embeds: [embed] });
  }

  @Command({ name: 'premium', description: 'Check premium status', slash: true, prefix: true })
  @Cooldown(5)
  async premiumStatus(
    @Context() ctx: Ctx,
    @Guild() guild: DiscordGuild | null,
    @Author() author: User,
    @Options() dto: PremiumScopeDto,
  ): Promise<void> {
    const lang = this.premium.languageOf(guild?.id ?? null);
    if (dto.scope === 'guild') {
      if (!guild) {
        await ctx.reply('Use in a guild.');
        return;
      }
      const d = this.premium.describeGuild(guild.id);
      await ctx.reply(
        this.locale.t(lang, 'premium.message', {
          status: d.active ? 'active' : 'inactive',
          from: d.from,
          to: d.to,
        }),
      );
      return;
    }
    const d = this.premium.describeUser(author.id);
    await ctx.reply(
      this.locale.t(lang, 'premium.message', {
        status: d.active ? 'active' : 'inactive',
        from: d.from,
        to: d.to,
      }),
    );
  }
}
