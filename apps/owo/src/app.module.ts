import { Module } from '@discord.ts/common';
import { DiscordModule } from '@discord.ts/core';
import { BalanceCommand } from './commands/balance.command.js';
import { CoinflipCommand } from './commands/coinflip.command.js';
import { CookieCommand } from './commands/cookie.command.js';
import { DailyCommand } from './commands/daily.command.js';
import { DexCommand } from './commands/dex.command.js';
import { EightballCommand } from './commands/eightball.command.js';
import { GiveCommand } from './commands/give.command.js';
import { HelpCommand } from './commands/help.command.js';
import { HuntCommand } from './commands/hunt.command.js';
import { LotteryCommand } from './commands/lottery.command.js';
import { MeCommand } from './commands/me.command.js';
import { OwoifyCommand } from './commands/owoify.command.js';
import { ProfileCommand } from './commands/profile.command.js';
import { QuestCommand } from './commands/quest.command.js';
import { ResetCommand } from './commands/reset.command.js';
import { SellCommand } from './commands/sell.command.js';
import { SettingsCommand } from './commands/settings.command.js';
import { ShipCommand } from './commands/ship.command.js';
import { ShopCommand } from './commands/shop.command.js';
import { SlotsCommand } from './commands/slots.command.js';
import { TopCommand } from './commands/top.command.js';
import { ZooCommand } from './commands/zoo.command.js';
import { TasksListener } from './events/tasks.listener.js';

@Module({
  imports: [DiscordModule.forRootAsync()],
  providers: [
    HuntCommand,
    ZooCommand,
    DexCommand,
    ProfileCommand,
    DailyCommand,
    BalanceCommand,
    CoinflipCommand,
    SlotsCommand,
    LotteryCommand,
    TopCommand,
    MeCommand,
    ShopCommand,
    SellCommand,
    QuestCommand,
    OwoifyCommand,
    EightballCommand,
    ShipCommand,
    CookieCommand,
    SettingsCommand,
    GiveCommand,
    ResetCommand,
    HelpCommand,
    TasksListener,
  ],
})
export class AppModule {}
