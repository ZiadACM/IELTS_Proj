# 03: Validator rules for v2

**What to build:** Add the v2 rules from `docs/content/map-format-v2.md` to `tools/validate-content.mjs`, each with a failing fixture and a test, tests first. First batch (handoff): `v2-shape`, `v2-ref`, `v2-inside`, `v2-wrong-path`. The rest of the list (`v2-named-answer`, `v2-label-fit`, `v2-compass`, `v2-start`, `v2-leg-start`, `v2-leg-question`, `v2-hint-leg`, `v2-word`, `v2-at-time`, `v2-route-walkable`) only if the owner says so.

**Blocked by:** none. **Protected files** (`tools/validate-content.mjs`, its tests, `tools/fixtures/**`): needs the owner's explicit approval in the session that builds it.

**Status:** needs-info (owner approval; which rules)

Spec: `../spec.md`

- [ ] Each rule has a fixture that fails with its code, seen failing first
- [ ] The anchored first challenge passes all rules
- [ ] v1 items and existing fixtures unchanged
- [ ] Staff import shows the new codes (it calls the validator itself)

## Comments
