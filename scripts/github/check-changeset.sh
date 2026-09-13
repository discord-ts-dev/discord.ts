#!/usr/bin/env bash
# ponytail: native git check, no extra action. Fails when packages change with no changeset.
set -euo pipefail

base="${1:?usage: check-changeset.sh <base-ref>}"
if git diff --name-only "$base"...HEAD -- packages | grep -q .; then
  if ! git diff --name-only "$base"...HEAD -- '.changeset/*.md' | grep -qv -e README.md; then
    echo "::error::packages/* changed but no changeset added. Run 'bunx changeset'." >&2
    exit 1
  fi
fi
echo "changeset check ok"
