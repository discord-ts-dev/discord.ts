import { Module } from '@discord.ts/common';
import { DiscordModule } from '@discord.ts/core';
import { STORE } from '@discord.ts/systems';
import { store } from './game/store.js';
import { AdminCommand } from './commands/admin.command.js';
import { AutohuntCommand } from './commands/autohunt.command.js';
import { AvatarCommand } from './commands/avatar.command.js';
import { BalanceCommand } from './commands/balance.command.js';
import { BanCommand } from './commands/ban.command.js';
import { BattleCommand } from './commands/battle.command.js';
import { BeehiveCommand } from './commands/beehive.command.js';
import { BlackjackCommand } from './commands/blackjack.command.js';
import { BroadcastCommand } from './commands/broadcast.command.js';
import { CaptchaCommand } from './commands/captcha.command.js';
import { CensorCommand } from './commands/censor.command.js';
import { ChecklistCommand } from './commands/checklist.command.js';
import { CoinflipCommand } from './commands/coinflip.command.js';
import { ColorCommand } from './commands/color.command.js';
import { CookieCommand } from './commands/cookie.command.js';
import { DailyCommand } from './commands/daily.command.js';
import { DefineCommand } from './commands/define.command.js';
import { DexCommand } from './commands/dex.command.js';
import { DropCommand } from './commands/drop.command.js';
import { EightballCommand } from './commands/eightball.command.js';
import { EmojiCommand } from './commands/emoji.command.js';
import { EmoteCommand } from './commands/emote.command.js';
import { GiveAnimalCommand } from './commands/giveanimal.command.js';
import { GiveCommand } from './commands/give.command.js';
import { GiveawayCommand } from './commands/giveaway.command.js';
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
import { SacrificeCommand } from './commands/sacrifice.command.js';
import { SellCommand } from './commands/sell.command.js';
import { SettingsCommand } from './commands/settings.command.js';
import { ShipCommand } from './commands/ship.command.js';
import { ShopCommand } from './commands/shop.command.js';
import { SlotsCommand } from './commands/slots.command.js';
import { SuggestCommand } from './commands/suggest.command.js';
import { SurveyCommand } from './commands/survey.command.js';
import { TopCommand } from './commands/top.command.js';
import { TradeCommand } from './commands/trade.command.js';
import { TranslateCommand } from './commands/translate.command.js';
import { UpgradeCommand } from './commands/upgrade.command.js';
import { VoteCommand } from './commands/vote.command.js';
import { WeaponsCommand } from './commands/weapons.command.js';
import { ZooCommand } from './commands/zoo.command.js';
import { CaptchaListener } from './events/captcha.listener.js';
import { CensorListener } from './events/censor.listener.js';
import { TasksListener } from './events/tasks.listener.js';
import { UsersListener } from './events/users.listener.js';

@Module({
  imports: [DiscordModule.forRootAsync()],
  providers: [
    { provide: STORE, useValue: store },
    HuntCommand,
    ZooCommand,
    DexCommand,
    ProfileCommand,
    LevelCommand,
    UpgradeCommand,
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
    SacrificeCommand,
    AutohuntCommand,
    BeehiveCommand,
    QuestCommand,
    TradeCommand,
    GiveawayCommand,
    OwoifyCommand,
    EmoteCommand,
    EightballCommand,
    ShipCommand,
    CookieCommand,
    PrayCommand,
    MarriageCommand,
    MathCommand,
    DefineCommand,
    TranslateCommand,
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
    CaptchaCommand,
    BroadcastCommand,
    ResetCommand,
    HelpCommand,
    TasksListener,
    CensorListener,
    CaptchaListener,
    UsersListener,
  ],
})
export class AppModule {}
