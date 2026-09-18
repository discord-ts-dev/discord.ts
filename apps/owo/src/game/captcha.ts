import type { Store } from '@discord.ts/systems';

const captchaKey = (guildId: string) => `captcha:${guildId}`;

export async function captchaRoleOf(store: Store, guildId: string): Promise<string | null> {
  return store.get(captchaKey(guildId));
}

export async function setCaptchaRole(
  store: Store,
  guildId: string,
  roleId: string | null,
): Promise<void> {
  if (roleId === null) await store.del(captchaKey(guildId));
  else await store.set(captchaKey(guildId), roleId);
}
