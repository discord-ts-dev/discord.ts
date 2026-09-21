import {
  Author,
  Command,
  Context,
  DISCORD_DISCOVERY,
  Guild,
  Inject,
  Injectable,
  Options,
} from '@discord.ts/common';
import { Cooldown, RequireGuild, type DiscordDiscoveryService } from '@discord.ts/core';
import { t } from '@discord.ts/i18n';
import { buildHelpFromRegistry } from '@discord.ts/systems';
import { deliver } from '@discord.ts/ux';
import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type Guild as DiscordGuild,
  type Locale,
  type User,
} from 'discord.js';
import { HelpDto, PremiumScopeDto } from './dto/admin.dto.js';
import { PremiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';

@Injectable()
@RequireGuild()
export class InfoCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  constructor(
    @Inject(PremiumService) private readonly premium: PremiumService,
    @Inject(DISCORD_DISCOVERY) private readonly discovery: DiscordDiscoveryService,
  ) {}

  @Command({
    name: 'help',
    description: 'Show all commands or one command',
    category: 'Info',
  })
  @Cooldown(5)
  async help(
    @Context() ctx: ChatInputCommandInteraction,
    @Guild() guild: DiscordGuild,
    @Options() dto: HelpDto,
  ): Promise<void> {
    const lang = this.premium.languageOf(guild.id);
    const entries = this.discovery.helpEntries();
    if (dto.command) {
      const found = entries.find((entry) => entry.name === dto.command);
      const embed = new EmbedBuilder()
        .setColor(botConfig.color.main)
        .setTitle(dto.command)
        .setDescription(
          found
            ? `${found.descriptionLocalizations?.[lang as Locale] ?? found.description}\n${t('help.detail', { command: found.name }, lang)}`
            : t('error.cmd.not_found', undefined, lang),
        );
      await ctx.reply({ embeds: [embed] });
      return;
    }
    const sections = buildHelpFromRegistry(entries, { locale: lang });
    const embed = new EmbedBuilder()
      .setColor(botConfig.color.main)
      .setTitle(t('help.title', undefined, lang))
      .setDescription(t('help.description', undefined, lang))
      .addFields(
        sections.map((h) => ({
          name: h.category,
          value: h.commands.map((c) => `\`${c.name}\``).join(' '),
        })),
      )
      .setFooter({ text: t('help.footer', undefined, lang) });
    await ctx.reply({ embeds: [embed] });
  }

  @Command({ name: 'ping', description: 'Check bot latency', category: 'Info' })
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

  @Command({ name: 'premium', description: 'Check premium status', category: 'Info' })
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
