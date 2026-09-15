import type { Store } from './store.js';

export interface GuildSettings {
  disabled?: string[];
}

const settingsKey = (guildId: string) => `guild:${guildId}`;

export async function getSettings(store: Store, guildId: string): Promise<GuildSettings> {
  return JSON.parse((await store.get(settingsKey(guildId))) ?? '{}') as GuildSettings;
}

async function patch(store: Store, guildId: string, part: Partial<GuildSettings>): Promise<void> {
  await store.set(
    settingsKey(guildId),
    JSON.stringify({ ...(await getSettings(store, guildId)), ...part }),
  );
}

export async function setCommandEnabled(
  store: Store,
  guildId: string,
  command: string,
  enabled: boolean,
): Promise<void> {
  const name = command.toLowerCase();
  const disabled = new Set(
    ((await getSettings(store, guildId)).disabled ?? []).map((c) => c.toLowerCase()),
  );
  if (enabled) disabled.delete(name);
  else disabled.add(name);
  await patch(store, guildId, { disabled: [...disabled] });
}

export async function isCommandEnabled(
  store: Store,
  guildId: string,
  command: string,
): Promise<boolean> {
  const { disabled = [] } = await getSettings(store, guildId);
  return !disabled.map((c) => c.toLowerCase()).includes(command.toLowerCase());
}
