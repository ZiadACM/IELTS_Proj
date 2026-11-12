#!/bin/bash
# Verifies every installed third-party skill and our hook/adapted files against the audited lock (skills-manifest.lock.json).
# A mismatch means a file changed after review: stop and ask the owner. Run: bash scripts/verify-vendored.sh
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$root/scripts/install-skills.mjs" verify
