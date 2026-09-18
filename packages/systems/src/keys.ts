// ponytail: one owner per prefix. The scheme is the data contract documented
// in CONTEXT.md; systems never compose each other's keys by hand.
export const keys = {
  balance: (userId: string): string => `bal:${userId}`,
  inventory: (userId: string): string => `inv:${userId}`,
  dailyIndex: (userId: string): string => `daily:${userId}:idx`,
  dailyStreak: (userId: string): string => `daily:${userId}:streak`,
  quest: (userId: string): string => `quest:${userId}`,
  leaderboard: (board: string): string => `lb:${board}`,
  guildSettings: (guildId: string): string => `guild:${guildId}`,
  vote: (userId: string): string => `vote:${userId}`,
};
