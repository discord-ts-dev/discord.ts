import assert from 'node:assert/strict';
import { describe, test } from 'bun:test';
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Bun resolves CommonJS named exports that Node cannot, so a bug like this
// passes every test in this repo and only appears in the published package.
// See docs/adr/0014-signale-cjs-named-import.md.
//
// These tests therefore spawn a real `node` and let it do the importing. If node
// is missing the test skips rather than fails: the bug is worth catching, but
// not worth a red build on a machine that only has Bun.
const node = (() => {
  try {
    execFileSync('node', ['--version'], { stdio: 'ignore' });
    return 'node';
  } catch {
    return null;
  }
})();

/**
 * Import `specifier` from a throwaway ESM file using a real `node`, and report
 * what happened. The probe is written next to dist/ so module resolution walks
 * the same chain a published consumer would, and deleted afterwards.
 */
function importUnderNode(specifier: string): { ok: boolean; detail: string } {
  const pkgRoot = join(import.meta.dirname, '..');
  const probe = join(pkgRoot, 'node-esm-probe.mjs');
  writeFileSync(probe, `import '${specifier}';\nconsole.log('ok');\n`);
  try {
    const out = execFileSync(node as string, [probe], {
      encoding: 'utf8',
      cwd: pkgRoot,
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: out.includes('ok'), detail: out.trim() };
  } catch (err) {
    const e = err as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const stderr = e.stderr ? String(e.stderr) : '';
    return { ok: false, detail: (stderr || e.message || String(err)).trim() };
  } finally {
    rmSync(probe, { force: true });
  }
}

describe.skipIf(!node)('Node ESM compatibility', () => {
  // The import that shipped broken. It is a SyntaxError at parse time, so it
  // throws before any test body could assert on it.
  test('@discord-ts-dev/common loads under Node ESM', () => {
    const result = importUnderNode('@discord-ts-dev/common');
    assert.ok(
      result.ok,
      `@discord-ts-dev/common failed to import under Node ESM:\n${result.detail}`,
    );
  });
});
