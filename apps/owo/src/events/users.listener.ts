import { Context, Injectable, OnEvent } from '@discord.ts/common';
import { Events } from 'discord.js';
import { rememberUser } from '../game/users.js';
import { store } from '../game/store.js';

/** Keep a bounded index of users seen in any interaction, for broadcasts. */
@Injectable()
export class UsersListener {
  @OnEvent(Events.InteractionCreate)
  async onInteraction(@Context() interaction: { user?: { id?: string } }): Promise<void> {
    const userId = interaction.user?.id;
    if (userId) await rememberUser(store, userId);
  }
}
