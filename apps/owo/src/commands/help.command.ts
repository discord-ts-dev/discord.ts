import { Command, Context, Injectable } from '@discord.ts/common';
import { buildHelp, type HelpCommand as HelpEntry } from '@discord.ts/systems';
import { EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { COLORS } from '../game/config.js';
import { tt } from '../game/text.js';

const HELP: HelpEntry[] = [
  { name: 'hunt', description: 'Catch a wild animal for your zoo', category: 'Gameplay' },
  { name: 'zoo', description: 'Show a zoo: every animal a user has caught', category: 'Gameplay' },
  { name: 'dex', description: 'Dex: every species, caught or not', category: 'Gameplay' },
  { name: 'profile', description: 'Show pawcoins, level, and zoo summary', category: 'Gameplay' },
  { name: 'level', description: 'Show XP, level, and progress', category: 'Gameplay' },
  { name: 'daily', description: 'Claim your daily pawcoins', category: 'Gameplay' },
  { name: 'quest', description: 'Daily quests: view, reroll, claim', category: 'Gameplay' },
  { name: 'balance', description: 'Show pawcoin balance', category: 'Economy' },
  { name: 'coinflip', description: 'Bet pawcoins on a coin flip', category: 'Economy' },
  { name: 'slots', description: 'Spin the slot machine', category: 'Economy' },
  { name: 'blackjack', description: 'Play blackjack against the dealer', category: 'Economy' },
  { name: 'drop', description: 'Drop pawcoins for anyone to grab', category: 'Economy' },
  {
    name: 'lottery',
    description: 'Ticket lottery: buy tickets, the pot pays hourly',
    category: 'Economy',
  },
  { name: 'shop', description: 'Paw shop and bag: list, buy, use, inventory', category: 'Economy' },
  { name: 'sell', description: 'Sell zoo animals for pawcoins', category: 'Economy' },
  { name: 'top', description: 'Leaderboards: XP, wealth, or zoo size', category: 'Economy' },
  { name: 'me', description: 'Your ranks across the boards', category: 'Economy' },
  { name: 'owoify', description: 'Rewrite text in fluent owo', category: 'Social' },
  { name: 'eightball', description: 'Ask the magic 8 ball', category: 'Social' },
  { name: 'ship', description: 'Measure the love between two users', category: 'Social' },
  { name: 'cookie', description: 'Give a cookie to someone', category: 'Social' },
  { name: 'pray', description: 'Pray to the paw gods', category: 'Social' },
  { name: 'marry', description: 'Propose to someone', category: 'Social' },
  { name: 'accept', description: 'Accept a marriage proposal', category: 'Social' },
  { name: 'decline', description: 'Decline a marriage proposal', category: 'Social' },
  { name: 'divorce', description: 'End your marriage', category: 'Social' },
  { name: 'math', description: 'Evaluate a math expression', category: 'Utility' },
  { name: 'ping', description: 'Check the bot round trip', category: 'Utility' },
  { name: 'avatar', description: 'Show a user avatar', category: 'Utility' },
  { name: 'color', description: 'Show a random color', category: 'Utility' },
  { name: 'invite', description: 'Get the invite link for Paw', category: 'Utility' },
  { name: 'enable', description: 'Turn a command back on in this server', category: 'Settings' },
  { name: 'disable', description: 'Turn a command off in this server', category: 'Settings' },
  { name: 'give', description: 'Grant pawcoins to a user (manage server)', category: 'Admin' },
  {
    name: 'giveanimal',
    description: 'Grant zoo animals to a user (manage server)',
    category: 'Admin',
  },
  { name: 'ban', description: 'Ban a user from Paw (manage server)', category: 'Admin' },
  { name: 'unban', description: 'Lift a Paw ban (manage server)', category: 'Admin' },
  { name: 'banstatus', description: 'Show Paw bans (manage server)', category: 'Admin' },
  {
    name: 'reset',
    description: 'Wipe pawcoins or zoo for a user (manage server)',
    category: 'Admin',
  },
  { name: 'help', description: 'Show this command list', category: 'General' },
];

@Injectable()
export class HelpCommand {
  @Command({ name: 'help', description: 'Show the Paw command list' })
  async help(@Context() ctx: ChatInputCommandInteraction): Promise<void> {
    const sections = buildHelp(HELP);
    const embed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(tt(ctx, 'game:help.title'))
      .setFooter({ text: tt(ctx, 'game:help.footer') })
      .setFields(
        sections.map((section) => ({
          name: section.category,
          value: section.commands.map((cmd) => `**/${cmd.name}** — ${cmd.description}`).join('\n'),
        })),
      );
    await ctx.reply({ embeds: [embed] });
  }
}
