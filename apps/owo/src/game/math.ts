export type MathResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'invalid' | 'divide-by-zero' | 'too-long' };

export const MATH_MAX_LENGTH = 100;

// ponytail: recursive descent over a tiny grammar
// (expr → term → unary → factor → primary), no dependency. If functions or
// variables ever show up, swap in a real parser.
export function evaluate(source: string): MathResult {
  const raw = source.trim();
  if (!raw) return { ok: false, reason: 'empty' };
  if (raw.length > MATH_MAX_LENGTH) return { ok: false, reason: 'too-long' };
  const text = raw.replace(/\s+/g, '');

  let pos = 0;

  const peek = (): string => text[pos] ?? '';
  const eat = (ch: string): boolean => {
    if (peek() !== ch) return false;
    pos++;
    return true;
  };

  type Parse = { ok: true; value: number } | { ok: false; reason: 'invalid' | 'divide-by-zero' };
  const invalid: Parse = { ok: false, reason: 'invalid' };

  function expr(): Parse {
    let left = term();
    if (!left.ok) return left;
    for (;;) {
      if (eat('+')) {
        const right = term();
        if (!right.ok) return right;
        left = { ok: true, value: left.value + right.value };
      } else if (eat('-')) {
        const right = term();
        if (!right.ok) return right;
        left = { ok: true, value: left.value - right.value };
      } else return left;
    }
  }

  function term(): Parse {
    let left = unary();
    if (!left.ok) return left;
    for (;;) {
      if (eat('*')) {
        const right = unary();
        if (!right.ok) return right;
        left = { ok: true, value: left.value * right.value };
      } else if (eat('/') || eat('%')) {
        const isMod = text[pos - 1] === '%';
        const right = unary();
        if (!right.ok) return right;
        if (right.value === 0) return { ok: false, reason: 'divide-by-zero' };
        left = {
          ok: true,
          value: isMod ? left.value % right.value : left.value / right.value,
        };
      } else return left;
    }
  }

  function unary(): Parse {
    if (eat('-')) {
      const inner = unary();
      return inner.ok ? { ok: true, value: -inner.value } : inner;
    }
    if (eat('+')) return unary();
    return power();
  }

  function power(): Parse {
    const base = primary();
    if (!base.ok) return base;
    if (eat('^')) {
      const exp = unary();
      if (!exp.ok) return exp;
      return { ok: true, value: base.value ** exp.value };
    }
    return base;
  }

  function primary(): Parse {
    if (eat('(')) {
      const inner = expr();
      if (!inner.ok) return inner;
      return eat(')') ? inner : invalid;
    }
    const start = pos;
    while (/[0-9.]/.test(peek())) pos++;
    if (pos === start) return invalid;
    const value = Number(text.slice(start, pos));
    return Number.isFinite(value) ? { ok: true, value } : invalid;
  }

  const result = expr();
  if (!result.ok) return { ok: false, reason: result.reason };
  if (pos !== text.length) return { ok: false, reason: 'invalid' };
  if (!Number.isFinite(result.value)) return { ok: false, reason: 'invalid' };
  return { ok: true, value: result.value };
}
