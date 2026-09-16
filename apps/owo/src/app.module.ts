import { Module } from '@discord.ts/common';
import { DiscordModule } from '@discord.ts/core';
import { AdminCommand } from './commands/admin.command.js';
import { AvatarCommand } from './commands/avatar.command.js';
import { BalanceCommand } from './commands/balance.command.js';
import { BanCommand } from './commands/ban.command.js';
import { BattleCommand } from './commands/battle.command.js';
import { BlackjackCommand } from './commands/blackjack.command.js';
import { CensorCommand } from './commands/censor.command.js';
import { ChecklistCommand } from './commands/checklist.command.js';
import { CoinflipCommand } from './commands/coinflip.command.js';
import { ColorCommand } from './commands/color.command.js';
import { CookieCommand } from './commands/cookie.command.js';
import { DailyCommand } from './commands/daily.command.js';
import { DexCommand } from './commands/dex.command.js';
import { DropCommand } from './commands/drop.command.js';
import { EightballCommand } from './commands/eightball.command.js';
import { EmojiCommand } from './commands/emoji.command.js';
import { GiveAnimalCommand } from './commands/giveanimal.command.js';
import { GiveCommand } from './commands/give.command.js';
import { HelpCommand } from './commands/help.command.js';
import { HuntCommand } from './commands/hunt.command.js';
import { InfoCommand } from './commands/info.command.js';
import { InviteCommand } from './commands/invite.command.js';
import { LevelCommand } from './commands/level.command.js';
import { LotteryCommand } from './commands/lottery.command.js';
import { MarriageCommand } from './commands/marriage.command.js';
import { MathCommand } from './commands/math.command.js';
import { MeCommand } from './commands/me.command.js';
import { MemegenCommand } from './commands/memegen.command.js';
import { OwoifyCommand } from './commands/owoify.command.js';
import { PatreonCommand } from './commands/patreon.command.js';
import { PingCommand } from './commands/ping.command.js';
import { PrayCommand } from './commands/pray.command.js';
import { ProfileCommand } from './commands/profile.command.js';
import { QuestCommand } from './commands/quest.command.js';
import { ResetCommand } from './commands/reset.command.js';
import { RulesCommand } from './commands/rules.command.js';
import { SellCommand } from './commands/sell.command.js';
import { SettingsCommand } from './commands/settings.command.js';
import { ShipCommand } from './commands/ship.command.js';
import { ShopCommand } from './commands/shop.command.js';
import { SlotsCommand } from './commands/slots.command.js';
import { SuggestCommand } from './commands/suggest.command.js';
import { SurveyCommand } from './commands/survey.command.js';
import { TopCommand } from './commands/top.command.js';
import { VoteCommand } from './commands/vote.command.js';
import { WeaponsCommand } from './commands/weapons.command.js';
import { ZooCommand } from './commands/zoo.command.js';
import { CensorListener } from './events/censor.listener.js';
import { TasksListener } from './events/tasks.listener.js';

@Module({
  imports: [DiscordModule.forRootAsync()],
  providers: [
    HuntCommand,
    ZooCommand,
    DexCommand,
    ProfileCommand,
    LevelCommand,
    DailyCommand,
    BalanceCommand,
    CoinflipCommand,
    SlotsCommand,
    BlackjackCommand,
    BattleCommand,
    WeaponsCommand,
    DropCommand,
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
    PrayCommand,
    MarriageCommand,
    MathCommand,
    PingCommand,
    AvatarCommand,
    ColorCommand,
    InviteCommand,
    ChecklistCommand,
    SuggestCommand,
    SurveyCommand,
    RulesCommand,
    VoteCommand,
    PatreonCommand,
    EmojiCommand,
    MemegenCommand,
    SettingsCommand,
    GiveCommand,
    GiveAnimalCommand,
    BanCommand,
    AdminCommand,
    InfoCommand,
    CensorCommand,
    ResetCommand,
    HelpCommand,
    TasksListener,
    CensorListener,
  ],
})
export class AppModule {}
