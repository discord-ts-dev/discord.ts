import { Command, Context, Guild, Injectable, Options } from '@discord.ts/common';
import { Cooldown, RequireGuild, RequireOwner, RequirePermissions } from '@discord.ts/core';
import { availableLocales, t } from '@discord.ts/i18n';
import { confirm } from '@discord.ts/ux';
import { runInNewContext } from 'node:vm';
import { inspect } from 'node:util';
import {
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Guild as DiscordGuild,
  type Message,
} from 'discord.js';
import { EvalDto, GrantPremiumDto, LanguageDto, ScopeTargetDto } from './dto/admin.dto.js';
import { PremiumService, premiumService } from './premium.service.js';
import { botConfig } from './bot-config.js';

type Ctx = ChatInputCommandInteraction | Message;

function cleanId(raw: string): string {
  return raw.replace(/[<@!>]/g, '');
}

@Injectable()
@RequireGuild()
export class AdminCommand {
  // ponytail: singletons, the framework builds providers with `new P()`.
  private readonly premium: PremiumService = premiumService;

  @Command({
    name: 'language',
    description: 'Show or change bot language',
    slash: true,
    prefix: true,
  })
  @RequirePermissions(PermissionFlagsBits.Administrator)
  async language(
    @Context() ctx: Ctx,
    @Guild() guild: DiscordGuild | null,
    @Options() dto: LanguageDto,
  ): Promise<void> {
    if (!guild) return;
    const current = this.premium.languageOf(guild.id);
    if (!dto.lang) {
      await ctx.reply(t('success.language', { lang: current }, current));
      return;
    }
    const match = dto.lang
      ? availableLocales().find((l) => l.toLowerCase() === dto.lang!.toLowerCase())
      : undefined;
    if (!match) {
      await ctx.reply(t('error.language', { valid: availableLocales().join(', ') }, current));
      return;
    }
    this.premium.setLanguage(guild.id, match);
    await ctx.reply(t('success.language_change', undefined, match));
  }

  @Command({ name: 'addpremium', description: 'Grant premium (owner)', slash: true, prefix: true })
  @RequireOwner()
  async addpremium(@Context() ctx: Ctx, @Options() dto: GrantPremiumDto): Promise<void> {
    const plan = dto.plan === 'month' ? 'Premium' : 'TrialPremium';
    this.premium.grant(dto.scope as 'guild' | 'user', cleanId(dto.target), plan);
    await ctx.reply(`${botConfig.emoji.done}`);
  }

  @Command({
    name: 'revokepremium',
    description: 'Revoke premium (owner)',
    slash: true,
    prefix: true,
  })
  @RequireOwner()
  async revokepremium(@Context() ctx: Ctx, @Options() dto: ScopeTargetDto): Promise<void> {
    const ok = this.premium.revoke(dto.scope as 'guild' | 'user', cleanId(dto.target));
    await ctx.reply(ok ? `${botConfig.emoji.done}` : 'No premium row.');
  }

  @Command({
    name: 'register',
    description: 'Register guild/user row (dev)',
    slash: true,
    prefix: true,
  })
  @RequireOwner()
  async register(@Context() ctx: Ctx, @Options() dto: ScopeTargetDto): Promise<void> {
    const created = this.premium.ensure(dto.scope as 'guild' | 'user', cleanId(dto.target));
    await ctx.reply(created ? `${botConfig.emoji.done}` : 'Already exists.');
  }

  @Command({ name: 'data', description: 'Show stored row (dev)', slash: true, prefix: true })
  @RequireOwner()
  async data(@Context() ctx: Ctx, @Options() dto: ScopeTargetDto): Promise<void> {
    const row = this.premium.dump(dto.scope as 'guild' | 'user', cleanId(dto.target));
    await ctx.reply(`\`\`\`json\n${JSON.stringify(row, null, 2).slice(0, 1900)}\n\`\`\``);
  }

  @Command({ name: 'eval', description: 'Evaluate code (owner)', slash: true, prefix: true })
  @RequireOwner()
  async evalJs(@Context() ctx: Ctx, @Options() dto: EvalDto): Promise<void> {
    const started = Date.now();
    try {
      const output = runInNewContext(dto.code, { process, console, Math, Date }, { timeout: 5000 });
      const embed = new EmbedBuilder()
        .setColor(botConfig.color.green)
        .addFields(
          { name: 'Type', value: typeof output },
          { name: 'Speed', value: `${Date.now() - started}ms` },
          { name: 'Code', value: `\`\`\`js\n${dto.code.slice(0, 1000)}\n\`\`\`` },
          { name: 'Output', value: `\`\`\`js\n${inspect(output).slice(0, 1000)}\n\`\`\`` },
        );
      await ctx.reply({ embeds: [embed] });
    } catch (error) {
      const err = error as Error;
      const embed = new EmbedBuilder()
        .setColor(botConfig.color.red)
        .addFields(
          { name: 'Code', value: `\`\`\`js\n${dto.code.slice(0, 1000)}\n\`\`\`` },
          { name: 'Error', value: `${err.name}: ${err.message}`.slice(0, 1000) },
        );
      await ctx.reply({ embeds: [embed] });
    }
  }

  @Command({ name: 'restart', description: 'Restart bot (owner)', slash: true, prefix: true })
  @Cooldown(30)
  @RequireOwner()
  async restart(@Context() ctx: Ctx): Promise<void> {
    const ok = await confirm(ctx as never, 'Confirm restart?');
    if (!ok) {
      await ctx.reply('Restart cancelled.');
      return;
    }
    await ctx.reply('Restarting…');
    process.exit(0);
  }
}
