import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import * as common from '@discord.ts/common';
import * as core from '@discord.ts/core';
import * as i18n from '@discord.ts/i18n';
import * as systems from '@discord.ts/systems';
import * as utils from '@discord.ts/utils';
import * as ux from '@discord.ts/ux';

const surfaces = {
  common: [common, ['CommandContext', 'SlashCommand', 'DiscordLogger']],
  core: [core, ['DiscordModule', 'bootstrapApp', 'Cooldown']],
  i18n: [i18n, ['t', 'initI18n', 'resolveLocale']],
  systems: [systems, ['MemoryStore', 'claimDaily', 'awardVote']],
  utils: [utils, ['parseMentionId', 'parseAmount', 'containsBlocked']],
  ux: [ux, ['confirm', 'paginate', 'pickOne', 'errorEmbed']],
} as const;

describe('workspace surface through the test preload', () => {
  for (const [name, [surface, names]] of Object.entries(surfaces)) {
    test(`${name} resolves and exports its public names`, () => {
      for (const exported of names) {
        assert.ok(exported in surface, `${name} is missing ${exported}`);
      }
    });
  }
});
