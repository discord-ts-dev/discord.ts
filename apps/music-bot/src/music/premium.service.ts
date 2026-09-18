import { Injectable } from '@discord.ts/common';
import { botConfig } from './bot-config.js';
import { db } from './db.js';

interface PremiumRow {
  from: Date | null;
  to: Date | null;
  plans: string[];
}

// ponytail: memory-first premium/language store mirroring the Prisma shape
// (Guild/User + language). Boot hydrate + write-through when DATABASE_URL is
// set; pure memory otherwise. One instance per App via the provider registry.
@Injectable()
export class PremiumService {
  private readonly guilds = new Map<string, { premium: PremiumRow; language: string }>();
  private readonly users = new Map<string, { premium: PremiumRow }>();

  async hydrate(): Promise<void> {
    const client = await db();
    if (!client) return;
    const [guilds, users] = await Promise.all([
      client.guild.findMany().catch(() => null),
      client.user.findMany().catch(() => null),
    ]);
    for (const g of guilds ?? []) {
      this.guilds.set(g.guildId, {
        premium: { from: g.premiumFrom, to: g.premiumTo, plans: [] },
        language: g.language,
      });
    }
    for (const u of users ?? []) {
      this.users.set(u.userId, { premium: { from: u.premiumFrom, to: u.premiumTo, plans: [] } });
    }
  }

  languageOf(guildId: string | null): string {
    if (!guildId) return botConfig.defaultLanguage;
    return this.guilds.get(guildId)?.language ?? botConfig.defaultLanguage;
  }

  setLanguage(guildId: string, language: string): void {
    const row = this.guilds.get(guildId) ?? {
      premium: { from: null, to: null, plans: [] },
      language: botConfig.defaultLanguage,
    };
    row.language = language;
    this.guilds.set(guildId, row);
    void this.persistGuild(guildId, row.premium, language);
  }

  isPremium(guildId: string | null, userId: string): boolean {
    const now = new Date();
    const alive = (row: PremiumRow | undefined): boolean =>
      !!row?.to && row.to instanceof Date && row.to > now;
    return (
      alive(guildId ? this.guilds.get(guildId)?.premium : undefined) ||
      alive(this.users.get(userId)?.premium)
    );
  }

  describeGuild(guildId: string): { active: boolean; from: string; to: string } {
    const row = this.guilds.get(guildId)?.premium;
    return {
      active: this.isPremium(guildId, ''),
      from: row?.from ? row.from.toISOString().slice(0, 10) : 'R',
      to: row?.to ? row.to.toISOString().slice(0, 10) : 'R',
    };
  }

  describeUser(userId: string): { active: boolean; from: string; to: string } {
    const row = this.users.get(userId)?.premium;
    return {
      active: this.isPremium(null, userId),
      from: row?.from ? row.from.toISOString().slice(0, 10) : 'R',
      to: row?.to ? row.to.toISOString().slice(0, 10) : 'R',
    };
  }

  grant(scope: 'guild' | 'user', id: string, plan: string): void {
    const now = new Date();
    const to = new Date(now);
    to.setMonth(to.getMonth() + 1);
    if (scope === 'guild') {
      const row = this.guilds.get(id) ?? {
        premium: { from: null, to: null, plans: [] },
        language: botConfig.defaultLanguage,
      };
      row.premium = { from: row.premium.from ?? now, to, plans: [...row.premium.plans, plan] };
      this.guilds.set(id, row);
      void this.persistGuild(id, row.premium, row.language);
    } else {
      const row = this.users.get(id) ?? { premium: { from: null, to: null, plans: [] } };
      row.premium = { from: row.premium.from ?? now, to, plans: [...row.premium.plans, plan] };
      this.users.set(id, row);
      void this.persistUser(id, row.premium);
    }
  }

  revoke(scope: 'guild' | 'user', id: string): boolean {
    if (scope === 'guild') {
      const row = this.guilds.get(id);
      if (!row) return false;
      row.premium.to = null;
      void this.persistGuild(id, row.premium, row.language);
      return true;
    }
    const row = this.users.get(id);
    if (!row) return false;
    row.premium.to = null;
    void this.persistUser(id, row.premium);
    return true;
  }

  ensure(scope: 'guild' | 'user', id: string): boolean {
    if (scope === 'guild') {
      if (this.guilds.has(id)) return false;
      const row = {
        premium: { from: null, to: null, plans: [] },
        language: botConfig.defaultLanguage,
      };
      this.guilds.set(id, row);
      void this.persistGuild(id, row.premium, row.language);
      return true;
    }
    if (this.users.has(id)) return false;
    const row = { premium: { from: null, to: null, plans: [] } };
    this.users.set(id, row);
    void this.persistUser(id, row.premium);
    return true;
  }

  dump(scope: 'guild' | 'user', id: string): unknown {
    return scope === 'guild' ? (this.guilds.get(id) ?? null) : (this.users.get(id) ?? null);
  }

  private async persistGuild(id: string, premium: PremiumRow, language: string): Promise<void> {
    const client = await db();
    if (!client) return;
    await client.guild
      .upsert({
        where: { guildId: id },
        update: { premiumFrom: premium.from, premiumTo: premium.to, language },
        create: { guildId: id, premiumFrom: premium.from, premiumTo: premium.to, language },
      })
      .catch(() => null);
  }

  private async persistUser(id: string, premium: PremiumRow): Promise<void> {
    const client = await db();
    if (!client) return;
    await client.user
      .upsert({
        where: { userId: id },
        update: { premiumFrom: premium.from, premiumTo: premium.to },
        create: { userId: id, premiumFrom: premium.from, premiumTo: premium.to },
      })
      .catch(() => null);
  }
}
