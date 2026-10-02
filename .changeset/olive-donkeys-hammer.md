---
'@discord-ts-dev/systems': patch
'@discord-ts-dev/redis': patch
---

Hold any Store key or member, including names that collide with a property of
`Object.prototype`.

`FileStore` resolved `__proto__`, `constructor`, and `prototype` against
`Object.prototype` instead of treating them as stored names. A sorted-set
member of that name scored as an object rather than a number, `get` on an
unwritten `constructor` key returned the inherited constructor instead of
`null`, `incrBy` over such a key started from zero rather than the stored
value, and any of the three was dropped on flush because a re-parented write
is never an own property — so a shop purchase could report success and store
nothing. `shop`'s inventory map had the same shape on a caller-chosen item id.

No production input reached these, so this is a latent-defect fix rather than a
live vulnerability. The port now promises to tolerate any key and any member
(ADR 0016), the shared conformance suite pins it across all three adapters, and
`FileStore` holds such names in prototype-free maps. `inventory()` still
returns an ordinary object, so app code is unaffected.
