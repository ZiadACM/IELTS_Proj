# 16: Recommendations and Home

**What to build:** Home shows one provisional recommendation with a careful reason and 'Choose something else'. Rules A, B and C use the last two counted attempts, with precedence C, then B, then A, never moving more than one tier and never down on one attempt. A new learner is taken from onboarding into the featured first challenge; the first challenge and pilot items are hidden from Browse and recommendations.

**Blocked by:** 11 Replays and hints; 12 Resuming and repeating; 13 Independent check

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Rules built test-first from a worked-example table taken from the spec; seams confirmed with the owner first
- [ ] Property tests for tier limits
- [ ] No fresh item at the tier: least recently attempted item recommended, and the reason says so
- [ ] Reason wording careful and shown in the interface language
- [ ] First challenge offered once after onboarding; hidden items never appear in Browse or recommendations

## Comments
