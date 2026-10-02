// Plain objects and the names callers choose. A `{}` resolves `__proto__` to
// its prototype instead of a missing key, so a write of that name re-parents
// the object rather than storing a value, and a read of it returns
// `Object.prototype` where the caller asked whether anything is there.
// `constructor` and `prototype` reach further: they are shared with every
// object in the process, so polluting one is not local.
//
// The Store port tolerates any key and any member (ADR 0016), so an adapter
// that holds one in an object has to use a prototype-free one, and a map read
// back from disk or from a stored string has to be copied through `adopt` —
// `JSON.parse` returns plain objects.
//
// These are internal, not part of any published surface: they are an
// implementation of a port guarantee, not a utility for apps.

/**
 * A prototype-free object for holding names the caller chose.
 *
 * ponytail: the return type is a bare `Record`, so nothing at the type level
 * says "do not hand this to app code" — `inventory()` copies out for that
 * reason. If a second value shape ever needs the same guard, promote this to a
 * branded `KeyBag<T>` so the escape is a compile error instead of a comment.
 */
export const bag = <T>(): Record<string, T> => Object.create(null) as Record<string, T>;

/**
 * Copy a map read off disk or out of a stored string into a prototype-free one,
 * so `__proto__` stays data. Also drops an inherited name: the result has no
 * prototype to inherit from, so `Object.entries` sees only real entries and
 * `JSON.stringify` writes back only real entries.
 */
export function adopt<T>(raw: Record<string, T> | undefined): Record<string, T> {
  const out = bag<T>();
  for (const [name, value] of Object.entries(raw ?? {})) out[name] = value;
  return out;
}
