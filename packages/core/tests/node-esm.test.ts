import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Bun provides globals (`Bun.pathToFileURL`, `Bun.color`) that Node does not, and
// it resolves CommonJS named exports Node cannot. A package can therefore be
// fully green under Bun and still unusable under Node. This file imports the
// built packages with a real `node` so that class of bug fails here.
//
// Skips when `node` is absent: worth catching, not worth a red build on a
// Bun-only machine. See docs/adr/0014-signale-cjs-named-import.md.
const node = (() => {
  try {
    execFileSync('node', ['--version'], { stdio: 'ignore' });
    return 'node';
  } catch {
    return null;
  }
})();

const PACKAGES = ['common', 'core', 'utils', 'ux', 'i18n', 'systems'] as const;

/** Import `specifier` from a throwaway ESM file under a real `node`. */
function importUnderNode(specifier: string, cwd: string): { ok: boolean; detail: string } {
  const probe = join(cwd, `node-esm-probe-${Date.now()}.mjs`);
  writeFileSync(probe, `import '${specifier}';\nconsole.log('ok');\n`);
  try {
    const out = execFileSync(node as string, [probe], {
      encoding: 'utf8',
      cwd,
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: out.includes('ok'), detail: out.trim() };
  } catch (err) {
    const e = err as { stderr?: Buffer | string; message?: string };
    return { ok: false, detail: (e.stderr ? String(e.stderr) : e.message || String(err)).trim() };
  } finally {
    rmSync(probe, { force: true });
  }
}

// The workspace root resolves every @discord-ts-dev/* package, and a probe
// written there walks the same node_modules chain a consumer would.
const workspaceRoot = join(import.meta.dirname, '..', '..', '..');

describe.skipIf(!node)('Node ESM compatibility', () => {
  for (const pkg of PACKAGES) {
    test(`@discord-ts-dev/${pkg} imports under Node ESM`, () => {
      const result = importUnderNode(`@discord-ts-dev/${pkg}`, workspaceRoot);
      assert.ok(
        result.ok,
        `@discord-ts-dev/${pkg} failed to import under Node ESM:\n${result.detail}`,
      );
    });
  }

  // Importing core is not enough: loadDiscordConfig ran Bun.pathToFileURL on the
  // first call, which is where a bare import passes and a real boot fails. It
  // also validates token/clientId, so the fixture has to supply them.
  test('core loads a discord.config.ts under Node ESM', () => {
    const cwd = workspaceRoot;
    const probe = join(cwd, `node-esm-config-probe-${Date.now()}.mjs`);
    const cfg = join(cwd, `node-esm-fixture-${Date.now()}.ts`);
    writeFileSync(
      cfg,
      [`export default { token: 'probe-token', clientId: 'probe-client', intents: [] };`, ``].join(
        '\n',
      ),
    );
    writeFileSync(
      probe,
      [
        `import { loadDiscordConfig } from '@discord-ts-dev/core';`,
        `const c = await loadDiscordConfig({ configPath: ${JSON.stringify(cfg)} });`,
        `console.log(c.token === 'probe-token' && Array.isArray(c.intents) ? 'ok' : 'bad');`,
      ].join('\n'),
    );
    try {
      const out = execFileSync(node as string, [probe], {
        encoding: 'utf8',
        cwd,
        timeout: 30_000,
        stdio: ['ignore', 'pipe', 'pipe'],
        // Keep a developer's real env from leaking into the assertion.
        env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '' },
      });
      assert.match(out, /ok/);
    } catch (err) {
      const e = err as { stderr?: Buffer | string; message?: string };
      assert.fail(
        `loadDiscordConfig failed under Node:\n${e.stderr ? String(e.stderr) : e.message}`,
      );
    } finally {
      rmSync(probe, { force: true });
      rmSync(cfg, { force: true });
    }
  });
});
