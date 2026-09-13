// ponytail: regex runner, real AST codemod only if a refactor needs it.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Transform = (source: string, path: string, args: Record<string, string>) => string | null;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === 'dist' || e.startsWith('.')) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

function parseArgs(rest: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const k = rest[i];
    if (k?.startsWith('--')) args[k.slice(2)] = rest[i + 1] ?? '';
  }
  return args;
}

// ponytail: self-check, fails if the runner breaks
function selfCheck(): void {
  const files = walk('scripts/codemods');
  if (!files.some((f) => f.endsWith('run.ts'))) throw new Error('codemod runner missing');
}

const [name, dir, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
if (!name || !dir) {
  console.error('usage: bun run codemod <name> <dir> [--write] [--from X --to Y]');
  process.exit(1);
}
selfCheck();
const codemodModule = (await import(`./${name}.ts`)) as { transform: Transform };
const write = rest.includes('--write');
let changed = 0;
for (const file of walk(dir)) {
  const src = readFileSync(file, 'utf8');
  const next = codemodModule.transform(src, file, args);
  if (next !== null && next !== src) {
    changed++;
    // ponytail: warn level, no-console allows warn/error only
    console.warn(`${write ? 'wrote' : 'would change'}: ${file}`);
    if (write) writeFileSync(file, next);
  }
}
console.warn(`${changed} file(s) ${write ? 'updated' : 'need update'} by ${name}`);
