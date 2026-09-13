#!/usr/bin/env bash
# ponytail: autofix push-back used by the /autofix workflow.
set -euo pipefail

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git add -A
git diff --staged --quiet || git commit -m "chore: autofix lint"
git push
