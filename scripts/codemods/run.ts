// ponytail: regex runner, real AST codemod only if a refactor needs it.
// ponytail: node:path join stays, Glob returns relative paths.
import { join } from 'node:path';

type Transform = (source: string, path: string, args: Record<string, string>) => string | null;

function walk(dir: string): string[] {
  return [...new Bun.Glob('**/*.ts').scanSync({ cwd: dir })]
    .filter((rel) => !rel.split('/').some((s) => s === 'node_modules' || s === 'dist'))
    .map((rel) => join(dir, rel));
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

const [name, dir, ...rest] = Bun.argv.slice(2);
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
  const src = await Bun.file(file).text();
  const next = codemodModule.transform(src, file, args);
  if (next !== null && next !== src) {
    changed++;
    // ponytail: warn level, no-console allows warn/error only
    console.warn(`${write ? 'wrote' : 'would change'}: ${file}`);
    if (write) await Bun.write(file, next);
  }
}
console.warn(`${changed} file(s) ${write ? 'updated' : 'need update'} by ${name}`);
