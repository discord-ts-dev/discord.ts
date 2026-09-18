import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { FileStore, MemoryStore } from '../src/index.js';

const dirs: string[] = [];

function tmpFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'filestore-'));
  dirs.push(dir);
  return path.join(dir, 'nested', 'store.json');
}

afterEach(() => {
  while (dirs.length > 0) fs.rmSync(dirs.pop() as string, { recursive: true, force: true });
});

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
    const b = new FileStore(file);
    expect(await b.get('k')).toBe('v');
    expect(await b.zscore('lb', 'u')).toBe(10);
  });

  test('ttl expires on read', async () => {
    const file = tmpFile();
    const s = new FileStore(file);
    await s.set('k', 'v', 20);
    expect(await s.get('k')).toBe('v');
    await Bun.sleep(40);
    expect(await s.get('k')).toBeNull();
  });
});

describe('FileStore strings', () => {
  test('incrBy truncates toward zero', async () => {
    const s = new FileStore(tmpFile());
    expect(await s.incrBy('c', 1.9)).toBe(1);
    expect(await s.incrBy('c', 0.9)).toBe(1);
    expect(await s.incrBy('neg', -1.9)).toBe(-1);
  });

  test('incrBy from non-numeric treats as zero', async () => {
    const s = new FileStore(tmpFile());
    await s.set('c', 'nope');
    expect(await s.incrBy('c', 5)).toBe(5);
  });

  test('update preserves TTL, deletes nulls, applies zadds', async () => {
    const s = new FileStore(tmpFile());
    await s.set('keep', '1', 60);
    const out = await s.update(['keep', 'fresh'], (current) => {
      expect(current).toEqual({ keep: '1', fresh: null });
      return {
        result: 'ok' as const,
        writes: { keep: '2', fresh: 'x' },
        zadds: [{ key: 'lb', score: 7, member: 'u' }],
      };
    });
    expect(out).toBe('ok');
    expect(await s.get('keep')).toBe('2');
    expect(await s.get('fresh')).toBe('x');
    expect(await s.zscore('lb', 'u')).toBe(7);
    await Bun.sleep(80);
    expect(await s.get('keep')).toBeNull();
  });

  test('update with null write deletes', async () => {
    const s = new FileStore(tmpFile());
    await s.set('gone', 'y');
    await s.update(['gone'], () => ({ result: true, writes: { gone: null } }));
    expect(await s.get('gone')).toBeNull();
  });

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

describe('FileStore sorted sets', () => {
  test('zadd, zscore, zrank, zrange parity', async () => {
    const s = new FileStore(tmpFile());
    await s.zadd('lb', 10, 'a');
    await s.zadd('lb', 30, 'b');
    await s.zadd('lb', 20, 'c');
    expect(await s.zscore('lb', 'b')).toBe(30);
    expect(await s.zscore('lb', 'x')).toBeNull();
    expect(await s.zrank('lb', 'b', true)).toBe(0);
    expect(await s.zrank('lb', 'missing', true)).toBeNull();
    expect(await s.zrange('lb', 0, 1, true)).toEqual([
      { member: 'b', score: 30 },
      { member: 'c', score: 20 },
    ]);
    expect(await s.zrange('lb', 0, -1)).toEqual([
      { member: 'a', score: 10 },
      { member: 'c', score: 20 },
      { member: 'b', score: 30 },
    ]);
  });

  test('equal scores order by member', async () => {
    const s = new FileStore(tmpFile());
    await s.zadd('lb', 10, 'c');
    await s.zadd('lb', 10, 'a');
    await s.zadd('lb', 10, 'b');
    expect(await s.zrange('lb', 0, -1)).toEqual([
      { member: 'a', score: 10 },
      { member: 'b', score: 10 },
      { member: 'c', score: 10 },
    ]);
    expect(await s.zrange('lb', 0, -1, true)).toEqual([
      { member: 'c', score: 10 },
      { member: 'b', score: 10 },
      { member: 'a', score: 10 },
    ]);
  });

  test('zincrBy starts from zero and persists', async () => {
    const file = tmpFile();
    const s = new FileStore(file);
    expect(await s.zincrBy('lb', 5, 'u')).toBe(5);
    expect(await s.zincrBy('lb', -2, 'u')).toBe(3);
    const reloaded = new FileStore(file);
    expect(await reloaded.zscore('lb', 'u')).toBe(3);
  });
});

describe('MemoryStore integer incrBy', () => {
  test('truncates toward zero', async () => {
    const s = new MemoryStore();
    expect(await s.incrBy('c', 1.9)).toBe(1);
    expect(await s.incrBy('c', 0.9)).toBe(1);
    expect(await s.incrBy('neg', -1.9)).toBe(-1);
  });

  test('non-numeric treats as zero', async () => {
    const s = new MemoryStore();
    await s.set('c', 'nope');
    expect(await s.incrBy('c', 5)).toBe(5);
  });
});
