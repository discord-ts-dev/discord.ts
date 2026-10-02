#!/usr/bin/env bash
# Attest a published npm tarball and attach the Sigstore bundle to its GitHub release.
#
# Runs from .github/workflows/attest-releases.yml (on `release: published`), NOT
# from release.yml. Keeping it separate means a Fulcio/Rekor outage can never
# break publishing — the release is already on npm by the time this runs.
#
# OpenSSF Scorecard's Signed-Releases check ignores releases that have no assets
# and only looks at release assets named *.sig / *.sigstore / *.intoto.jsonl.
# changesets creates asset-less releases, so the check was reporting
# "no releases found" (inconclusive, -1).
set -euo pipefail

tag="${1:?usage: attest-release.sh <release-tag>}"

# Tags look like `@discord-ts-dev/core@1.3.0` — an `@` at both ends, so a naive
# split breaks. Peel from each side instead.
name="${tag%@*}"
version="${tag##*@}"

if [[ "$name" == "$tag" || "$version" == "$tag" ]]; then
  echo "::error::tag '$tag' is not of the form <package>@<version>" >&2
  exit 1
fi

builder="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}"

workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

npm pack "${name}@${version}" --pack-destination "$workdir" >/dev/null
tarball=$(find "$workdir" -name '*.tgz' -print -quit)

if [[ -z "$tarball" ]]; then
  echo "::error::npm pack produced no tarball for ${name}@${version}" >&2
  exit 1
fi

# cosign fills in the subject digest from the blob; the predicate only carries
# build metadata. SLSA v1 shape.
cat >"$workdir/predicate.json" <<JSON
{
  "buildDefinition": {
    "buildType": "https://github.com/discord-ts-dev/discord.ts/attestation/npm-pack/v1",
    "externalParameters": {
      "package": "${name}",
      "version": "${version}",
      "tag": "${tag}"
    }
  },
  "runDetails": {
    "builder": { "id": "${builder}" },
    "metadata": { "invocationId": "${builder}" }
  }
}
JSON

# Keyless: no signing key to manage, identity comes from the workflow's OIDC
# token and the certificate is bound to this run by Fulcio.
cosign attest-blob \
  --yes \
  --type slsaprovenance \
  --predicate "$workdir/predicate.json" \
  --bundle "$workdir/provenance.sigstore" \
  "$tarball"

gh release upload "$tag" "$workdir/provenance.sigstore" \
  --clobber \
  --repo "$GITHUB_REPOSITORY"

echo "attached provenance.sigstore to ${tag}"