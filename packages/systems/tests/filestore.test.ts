import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { FileStore } from '../src/index.js';
import { storeConformance } from '../../../tests/store-conformance.js';

const dirs: string[] = [];

function tmpFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'filestore-'));
  dirs.push(dir);
  return path.join(dir, 'nested', 'store.json');
}

afterEach(() => {
  while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
});

// The shared port contract. FileStore-specific behavior (persistence, flush
// discipline, mixed-type keys) is tested below.
storeConformance('FileStore', () => new FileStore(tmpFile()));

describe('FileStore persistence', () => {
  test('starts empty on missing file, creates dirs on flush', async () => {
    const file = tmpFile();
    const s = new FileStore(file);
    expect(await s.get('k')).toBeNull();
    await s.set('k', 'v');
    expect(fs.existsSync(file)).toBeTrue();
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).strings.k.v).toBe('v');
  });

  test('starts empty on corrupt file', async () => {
    const file = tmpFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'not json{');
    const s = new FileStore(file);
    expect(await s.get('k')).toBeNull();
    await s.set('k', 'v');
    expect(await s.get('k')).toBe('v');
  });

  test('state survives reload', async () => {
    const file = tmpFile();
    const a = new FileStore(file);
    await a.set('k', 'v');
    await a.zadd('lb', 10, 'u');
    await a.zincrBy('lb', 5, 'u');
    const b = new FileStore(file);
    expect(await b.get('k')).toBe('v');
    expect(await b.zscore('lb', 'u')).toBe(15);
  });
});

describe('FileStore strings', () => {
  test('update without writes skips flush', async () => {
    const file = tmpFile();
    const s = new FileStore(file);
    await s.set('k', 'v');
    const mtime = fs.statSync(file).mtimeMs;
    await Bun.sleep(5);
    await s.update(['k'], (current) => ({ result: current.k }));
    expect(fs.statSync(file).mtimeMs).toBe(mtime);
  });

  test('del removes strings and sorted sets', async () => {
    const s = new FileStore(tmpFile());
    await s.set('k', 'v');
    await s.zadd('k', 1, 'u');
    await s.del('k');
    expect(await s.get('k')).toBeNull();
    expect(await s.zscore('k', 'u')).toBeNull();
  });
});
