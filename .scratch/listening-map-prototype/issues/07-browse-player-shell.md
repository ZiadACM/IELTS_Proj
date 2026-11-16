# 07: Browse and player shell

**What to build:** A learner opens Browse, sees published map items grouped by difficulty tier, opens one, gets 30 seconds of reading time (skippable in guided practice), then sees the map with lettered places and the question list while the first listen plays straight through with clear playback status.

**Blocked by:** 02 First real item; 04 Invite codes and guest onboarding; 06 Staff: import, list, publish

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Browse lists only published items, by tier; empty tier state designed
- [ ] Delivery payload contains no answers, route, transcript, hints or explanations (answer-key leakage suite passes)
- [ ] Reading time counts down and can be skipped in guided practice
- [ ] First listen cannot be paused or sought; playback status is visible and announced
- [ ] English content stays left-to-right inside the RTL frame; works at 360 px and on desktop

## Comments
