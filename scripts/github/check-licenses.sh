#!/usr/bin/env bash
# ponytail: eight copies of one immutable MIT text, not a build step. npm needs
# LICENSE at each tarball root and `files` cannot reach the repo root, so a
# prepack copy would make published content depend on a script running. Ceiling:
# the copies can drift from the root. Upgrade path: this check is the guard; if
# a package ever needs a different license, drop the copies for publishConfig.
set -euo pipefail

cd "$(dirname "$0")/../.."

for f in packages/*/LICENSE; do
  if ! diff -q LICENSE "$f" >/dev/null; then
    echo "::error::$f differs from the root LICENSE. Copy it: cp LICENSE $f" >&2
    exit 1
  fi
done

# A package that lists LICENSE in `files` but has no LICENSE ships none.
for p in packages/*/package.json; do
  dir="$(dirname "$p")"
  if grep -q '"LICENSE"' "$p" && [ ! -f "$dir/LICENSE" ]; then
    echo "::error::$p lists LICENSE in files but $dir/LICENSE is missing" >&2
    exit 1
  fi
done

echo "license check ok"
