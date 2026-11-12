---
name: validate-ielts-content
description: Validate an original IELTS-style practice item (currently Listening Map Labelling) before it can be published: runs the deterministic validator, then does the human-judgement checks a script cannot. Use when a content item is created, edited, AI-drafted, imported, or promoted from draft to reviewed/published, or when Answer Replay shows a wrong route, wrong answer, or misaligned transcript.
---

# Validate IELTS content

A technically valid app can still teach wrong content. This skill has two layers and **never reports an item as good on the first layer alone**.

## Layer 1: deterministic (always run)

```bash
node tools/validate-content.mjs <item.json> [more.json ...] --assets <audio-root>
node tools/validate-content.mjs <item.json> --assets <audio-root> --require-published   # before publish
node --test tools/*.test.mjs                                                            # if the validator itself changed
```

Exit 0 = internally consistent. Exit 1 = fix the item (never the validator or its tests; they are protected files). Exit 2 = usage or unreadable file.

What it proves: unique ids; cues sorted and inside the audio; events follow audio order and reference real cues/landmarks; every question has exactly one destination event; the route **ends at the answer target** (so Answer Replay cannot show a wrong place); distractors carry an explanation and do not sit on a real answer; exam mode forbids replay; published items name a reviewer; the audio file exists and the path cannot escape the assets directory.

What it does **not** prove: that the item is unambiguous, natural to listen to, correctly timed against the real audio, or at the claimed difficulty.

## Layer 2: judgement (record each as PASS / FAIL / NOT CHECKED, with the evidence)

1. **Listen, don't just read.** Play the audio against the cue timestamps at 3 points (start, middle, last destination). If you cannot play audio, mark timestamps **NOT CHECKED**; never infer alignment from the transcript.
2. **One defensible answer.** Could a careful listener reasonably choose a different label? Try the two most plausible wrong labels and argue for them. If one is defensible, the item is ambiguous: FAIL.
3. **Distractors are fair.** Each distractor is something a real speaker could say and a real listener could be misled by, and the correct route is still unambiguous on a careful first listen.
4. **Difficulty claims match.** `difficulty` fields (landmarks, steps, distractors, corrections, pace) describe what is actually in the audio.
5. **Language.** Natural spoken English at the claimed level; no invented place names that read as real-world facts; no copied Cambridge/IELTS material (originals only).
6. **Arabic explanation (if present).** Reviewed by a fluent Arabic reader, not machine-checked. If nobody has reviewed it, mark **NOT CHECKED** and do not publish it.
7. **Accessibility.** A transcript exists for review mode; map labels are not colour-only.

## Report format

```
Item: <id> v<version>     Layer 1: PASS|FAIL (<n> errors)
Layer 2: 1 <result> | 2 <result> | ... 
NOT CHECKED: <list, with why>
Verdict: READY FOR HUMAN REVIEW | NEEDS FIXES | BLOCKED
```

Only a human sets `validation.status` to `reviewed` or `published`. An agent may propose it; it may not write it.

## When AI drafted the item

AI-drafted items start as `draft`. The drafting agent must not be the one that validates it (use a fresh context). Treat the answer key as unproven until Layer 2 step 2 is done by a person.
