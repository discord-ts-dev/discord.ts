# ADR 0016 — The Store port tolerates any key and any member

Date: 2026-10-02

Status: accepted. Amends ADR 0010's key contract.

## Context

CodeQL flagged `js/prototype-polluting-assignment` on `FileStore.setScore`, one
write of a sorted-set member into the JSON object behind a key. A plain `{}`
resolves `__proto__` to its prototype rather than a missing key, so a member of
that name re-parents the object instead of storing a score; `constructor` and
`prototype` reach further. Nothing reached it — every call site passed a
`lb:<board>` key and a snowflake member — but the port advertised no promise
either way, so the safety was incidental.

That is what ADR 0010 left open. It closed the *key* side: systems address keys
through one `keys` module, so `key` is always a prefixed, framework-chosen
name. It said nothing about *member*, which is the one parameter with nothing
behind it. Today members are snowflakes, but the port is what apps program
against, and a member is exactly as caller-chosen as an item id is.

Writing the test surfaced four real defects, not the one CodeQL named: a
`__proto__` member scored as `[Object: null prototype] {}` instead of a number,
a `get` of an unwritten `constructor` key returned the inherited constructor
instead of `null`, `incrBy` over a `__proto__` key started from zero rather
than the stored value, and any of the three was dropped on flush because a
re-parented write is never an own property. The last is the dangerous one: a
purchase could report success and store nothing. `MemoryStore` and
`RedisStore` shared the second and third through the object `update` builds
for its callback.

## Decision

- The port tolerates **any** `key` and **any** `member`. Names that collide
  with `Object.prototype` are ordinary keys, not errors, and must round-trip
  through every operation.
- Adapters that hold caller-chosen names in an object use a prototype-free one
  (`Object.create(null)`), both for objects it builds and for maps it reads
  back from disk or a stored string. `constructor` and `prototype` are in the
  contract for the same reason as `__proto__`; a fix that only special-cases
  the one CodeQL named leaves the other two.
- The shared conformance suite pins this, so a new adapter cannot be added
  without inheriting the guarantee. Item ids in `shop` are the same class of
  name and get the same treatment, since a component button carries one.
- Validity of a name is a system's call, made where the domain knows the rules
  (a board is one of three, a command is a registered one). The port is the
  wrong place for a key filter: it would reject names Redis already accepts.

## Consequences

- The conformance suite gains cases for the three names, and every adapter has
  to pass them. All three needed a change, though not the same one. `FileStore`
  held names in plain objects throughout. `MemoryStore` and `RedisStore` store
  in `Map`s and Redis, which have no prototype — but each builds the map it
  hands to `update`'s `fn` as a plain object, so a stored value could be
  shadowed by an inherited one on the way in. Only `FileStore` lost data.
- `RedisStore` was not running the conformance suite at all, so none of this
  was being enforced on it. It runs now, which is how the `update` case above
  was found rather than assumed.
- Rejecting rather than tolerating was the alternative, and it is worse: it
  makes the port stricter than Redis, pushes validation into call sites that
  currently need none, and turns a name into a runtime failure instead of a
  wrong value.
- Nothing about keys being framework-chosen changes. The `keys` module stays
  what it was in ADR 0010: a scheme apps may read, and the reason a key can
  still be an app's own string.

## Rejected

- Guarding the one flagged line. It leaves `shop`'s item id and the two
  neighbouring names broken, and pins the file to CodeQL's current output
  rather than to the contract.
- A `#nosec` / suppression comment on the alert with no code change: the
  behaviour was genuinely wrong, and the alert was right to fire even though
  the finding understated it.
