import { REST, Routes } from 'discord.js';
import { type DiscordModuleOptions } from '@discord.ts/common';

export class DiscordSyncService {
  constructor(private readonly opts: DiscordModuleOptions) {}

  // ponytail: full PUT each deploy, Discord has no diff endpoint
  async sync(body: unknown[]): Promise<void> {
    const rest = new REST().setToken(this.opts.token);
    if (this.opts.development?.length) {
      await Promise.all(
        this.opts.development.map((guildId) =>
          rest.put(Routes.applicationGuildCommands(this.opts.clientId, guildId), { body }),
        ),
      );
      return;
    }
    await rest.put(Routes.applicationCommands(this.opts.clientId), { body });
  }
}
