import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  STANDARD_PATHS,
  checkAppStructure,
  defineConfig,
  loadDiscordConfig,
  loadShardingOptions,
} from '../src/index.js';

const dirs: string[] = [];
function tmp(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'discord-ts-config-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const ENV = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_GUILD_ID',
  'DISCORD_OWNER_IDS',
  'SKIP_REGISTRATION',
  'SHARD_COUNT',
] as const;

async function withEnv(
  vars: Partial<Record<(typeof ENV)[number], string>>,
  run: () => Promise<void>,
): Promise<void> {
  const saved = new Map(ENV.map((key) => [key, process.env[key]]));
  for (const key of ENV) delete process.env[key];
  Object.assign(process.env, vars);
  try {
    await run();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

describe('defineConfig and checkAppStructure', () => {
  test('defineConfig is the identity', () => {
    const config = { token: 't' };
    assert.equal(defineConfig(config), config);
  });

  test('checkAppStructure reports every missing standard path', () => {
    const cwd = tmp();
    assert.deepEqual(checkAppStructure(cwd), { ok: false, missing: [...STANDARD_PATHS] });
    fs.mkdirSync(path.join(cwd, 'src/commands'), { recursive: true });
    fs.mkdirSync(path.join(cwd, 'src/events'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src/main.ts'), '');
    fs.writeFileSync(path.join(cwd, 'discord.config.ts'), '');
    assert.deepEqual(checkAppStructure(cwd), { ok: true, missing: [] });
  });
});

describe('loadDiscordConfig', () => {
  test('throws when token or clientId is missing', async () => {
    await withEnv({}, async () => {
      await assert.rejects(loadDiscordConfig({ cwd: tmp() }), /missing token\/clientId/);
    });
  });

  test('fills defaults and skips validation on demand', async () => {
    await withEnv({}, async () => {
      const cfg = await loadDiscordConfig({ cwd: tmp(), skipValidation: true });
      assert.deepEqual(cfg, {
        development: [],
        skipRegistration: false,
      });
    });
  });

  test('reads a default-export config file and lets env win', async () => {
    const cwd = tmp();
    fs.writeFileSync(
      path.join(cwd, 'discord.config.ts'),
      `export default { token: 'file-token', clientId: 'file-client', respawn: false, owners: ['file-owner'] };\n`,
    );
    await withEnv({ DISCORD_TOKEN: 'env-token', DISCORD_OWNER_IDS: 'a, b ,' }, async () => {
      const cfg = await loadDiscordConfig({ cwd });
      assert.equal(cfg.token, 'env-token');
      assert.equal(cfg.clientId, 'file-client');
      assert.equal(cfg.respawn, false);
      assert.deepEqual(cfg.owners, ['a', 'b']);
    });
  });

  test('accepts a config module without a default export', async () => {
    const cwd = tmp();
    fs.writeFileSync(
      path.join(cwd, 'discord.config.ts'),
      `export const token = 'named';\nexport const clientId = 'named-client';\n`,
    );
    await withEnv({}, async () => {
      const cfg = await loadDiscordConfig({ cwd });
      assert.equal(cfg.token, 'named');
      assert.equal(cfg.clientId, 'named-client');
    });
  });

  test('honours configPath and drops undefined values', async () => {
    const cwd = tmp();
    fs.writeFileSync(
      path.join(cwd, 'custom.ts'),
      `export default { token: undefined, clientId: 'custom-client' };\n`,
    );
    await withEnv({ DISCORD_TOKEN: 'env-token' }, async () => {
      const cfg = await loadDiscordConfig({ cwd, configPath: 'custom.ts' });
      assert.equal(cfg.token, 'env-token');
      assert.equal(cfg.clientId, 'custom-client');
    });
  });

  test('env overlay maps guild, skip flag and shard count', async () => {
    await withEnv(
      {
        DISCORD_TOKEN: 't',
        DISCORD_CLIENT_ID: 'c',
        DISCORD_GUILD_ID: 'g1',
        SKIP_REGISTRATION: 'yes',
        SHARD_COUNT: 'auto',
      },
      async () => {
        const cfg = await loadDiscordConfig({ cwd: tmp() });
        assert.deepEqual(cfg.development, ['g1']);
        assert.equal(cfg.skipRegistration, true);
        assert.equal(cfg.shards, 'auto');
        assert.equal(cfg.shardCount, undefined);
      },
    );
    await withEnv(
      { DISCORD_TOKEN: 't', DISCORD_CLIENT_ID: 'c', SKIP_REGISTRATION: 'false', SHARD_COUNT: '3' },
      async () => {
        const cfg = await loadDiscordConfig({ cwd: tmp() });
        assert.equal(cfg.skipRegistration, false);
        assert.equal(cfg.shardCount, 3);
      },
    );
    await withEnv({ DISCORD_TOKEN: 't', DISCORD_CLIENT_ID: 'c', SHARD_COUNT: 'many' }, async () => {
      const cfg = await loadDiscordConfig({ cwd: tmp() });
      assert.equal(cfg.shards, undefined);
      assert.equal(cfg.shardCount, undefined);
    });
  });

  test('warns about a non-standard layout without failing', async () => {
    await withEnv({ DISCORD_TOKEN: 't', DISCORD_CLIENT_ID: 'c' }, async () => {
      const cfg = await loadDiscordConfig({ cwd: tmp() });
      assert.equal(cfg.token, 't');
    });
  });
});

describe('loadShardingOptions', () => {
  test('defaults file, totalShards and respawn', async () => {
    await withEnv({}, async () => {
      const opts = await loadShardingOptions({ cwd: tmp() });
      assert.deepEqual(opts, {
        file: './src/main.ts',
        token: '',
        totalShards: 'auto',
        respawn: true,
      });
    });
  });

  test('reads shard settings from the config file', async () => {
    const cwd = tmp();
    fs.writeFileSync(
      path.join(cwd, 'discord.config.ts'),
      `export default { token: 't', clientId: 'c', shardCount: 4, respawn: false, shardFile: './shard.ts' };\n`,
    );
    await withEnv({}, async () => {
      const opts = await loadShardingOptions({ cwd });
      assert.deepEqual(opts, {
        file: './shard.ts',
        token: 't',
        totalShards: 4,
        respawn: false,
      });
    });
  });

  test('SHARD_COUNT env overrides the file, explicit file wins', async () => {
    const cwd = tmp();
    fs.writeFileSync(
      path.join(cwd, 'discord.config.ts'),
      `export default { token: 't', clientId: 'c', shardCount: 4 };\n`,
    );
    await withEnv({ SHARD_COUNT: '2' }, async () => {
      const opts = await loadShardingOptions({ cwd, file: './custom.ts' });
      assert.equal(opts.totalShards, 2);
      assert.equal(opts.file, './custom.ts');
    });
    await withEnv({ SHARD_COUNT: 'auto' }, async () => {
      const opts = await loadShardingOptions({ cwd });
      assert.equal(opts.totalShards, 4);
    });
    await withEnv({ SHARD_COUNT: 'nope' }, async () => {
      const opts = await loadShardingOptions({ cwd });
      assert.equal(opts.totalShards, 'auto');
    });
  });
});
