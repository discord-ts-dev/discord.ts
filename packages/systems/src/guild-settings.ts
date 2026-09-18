import type { Store } from './store.js';
import { keys } from './keys.js';

export interface GuildSettings {
  disabled?: string[];
}

export async function getSettings(store: Store, guildId: string): Promise<GuildSettings> {
  return JSON.parse((await store.get(keys.guildSettings(guildId))) ?? '{}') as GuildSettings;
}

export async function setCommandEnabled(
  store: Store,
  guildId: string,
  command: string,
  enabled: boolean,
): Promise<void> {
  const name = command.toLowerCase();
  const settingsKey = keys.guildSettings(guildId);
  await store.update([settingsKey], (current) => {
    const settings = JSON.parse(current[settingsKey] ?? '{}') as GuildSettings;
    const disabled = new Set((settings.disabled ?? []).map((c) => c.toLowerCase()));
    if (enabled) disabled.delete(name);
    else disabled.add(name);
    return {
      result: undefined,
      writes: { [settingsKey]: JSON.stringify({ ...settings, disabled: [...disabled] }) },
    };
  });
}

export async function isCommandEnabled(
  store: Store,
  guildId: string,
  command: string,
): Promise<boolean> {
  const { disabled = [] } = await getSettings(store, guildId);
  return !disabled.map((c) => c.toLowerCase()).includes(command.toLowerCase());
}
