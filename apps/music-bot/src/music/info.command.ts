import { Author, Command, Context, Guild, Injectable, Options } from '@discord.ts/common';
import { Cooldown, RequireGuild, t } from '@discord.ts/core';
import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Guild as DiscordGuild,
  type Message,
  type User,
} from 'discord.js';
import { HelpDto, PremiumScopeDto } from './dto/admin.dto.js';
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
@RequireGuild()
export class InfoCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
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
            ? t('help.detail', { command: found }, lang)
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
        HELP.map((h) => ({ name: h.category, value: h.lines.map((l) => `\`${l}\``).join(' ') })),
      )
      .setFooter({ text: t('help.footer', undefined, lang) });
    await ctx.reply({ embeds: [embed] });
  }

  @Command({ name: 'ping', description: 'Check bot latency', slash: true, prefix: true })
  @Cooldown(5)
  async ping(@Context() ctx: Ctx, @Guild() guild: DiscordGuild | null): Promise<void> {
    const lang = this.premium.languageOf(guild?.id ?? null);
    const t0 = Date.now();
    await ctx.reply(t('ping.checking', undefined, lang));
    const botLatency = Date.now() - t0;
    const apiLatency = 'client' in ctx ? ctx.client.ws.ping : -1;
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
      if (!guild) return;
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
