# Proposal: Kokoro text-to-speech for draft item audio

Status: **Proposed** (2026-11-17), waiting for the owner. Process: `docs/development/agent-rules.md` section 5. Nothing is installed yet.

## Need (approved)

The owner found the macOS `say` voice too robotic for draft audio and chose Kokoro (free, runs locally) over cloud services. Scope: **synthetic draft audio only**. A published item still needs a human recording (validator rule `audio-source`). *Superseded 2026-11-18 by D24: published items may use Kokoro audio with an `audio.synthetic` record.*

## What would be installed

Everything lives **outside the repository**, in its own virtual environment (`~/.local/share/ielts-tts/venv`). Nothing ships with the app, and nothing is added to `package.json`. A small render script would be added to the repo later (`tools/tts/`, not protected) after you approve this proposal.

| Piece | Source and pin | Licence | Size (from the sources) |
|---|---|---|---|
| Python 3.12 | `brew install python@3.12` | PSF | — |
| `kokoro` 0.9.4 | PyPI, from github.com/hexgrad/kokoro (`pyproject.toml` version 0.9.4) | Apache-2.0 | small |
| its dependencies | `misaki[en]` 0.9.4 (Apache-2.0), `torch`, `transformers`, `huggingface_hub`, `numpy`, `loguru`, `spacy`, `num2words`, `phonemizer-fork`, `espeakng-loader` | various permissive, except espeak-ng (see risks) | about 1–2 GB with torch (estimate, NOT VERIFIED) |
| Kokoro-82M model and voice files | Hugging Face `hexgrad/Kokoro-82M`, downloaded on first use | Apache-2.0; trained on "permissive/non-copyrighted audio data" (model card) | model about 330 MB (estimate) |

The pins are exact versions. The install records pip's SHA-256 for every package it downloads, and the model is checked against the model card's SHA-256 (`496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4`).

## What it does, and its network calls

- **Install:** pip downloads from PyPI, and Homebrew downloads Python.
- **First render:** `huggingface_hub` fetches the model and voices from huggingface.co. misaki may also fetch a spaCy English model.
- **Every render after that:** run with `HF_HUB_OFFLINE=1`, so nothing is fetched.
- **Telemetry:** none mentioned in the sources (NOT VERIFIED in the code).
- **Text sent:** only our invented transcripts, which stay on this Mac. No learner data is involved.
- **Hooks, permissions, MCP:** none.

## Why not the alternatives

- **kokoro-onnx 0.6.1** (MIT, no torch, about 114–326 MB): lighter, but its model files are a third-party re-export with **no published checksums**. It also has the same Python limit.
- **macOS Premium voices:** free and already permitted, but you preferred Kokoro.
- **Duplicates:** none in the repo. It replaces `say` for drafts only.

## Risks and things to decide

1. **Python 3.14 is not supported.** kokoro and misaki require `>=3.10,<3.14`, and this Mac has 3.14. Hence the separate Python 3.12.
2. **espeak-ng is GPL-3.0.** It is used for words missing from the dictionary. It runs only on this Mac and is never shipped, and the audio it helps produce is our own content, so the GPL does not reach the app. Note it for the pre-launch licence review.
3. **The British voices are weaker.** The VOICES.md grades are estimates of training-data quality:
   - British female: `bf_emma` B-, `bf_isabella` C, `bf_alice` D, `bf_lily` D.
   - American female: `af_heart` A, `af_bella` A-.

   IELTS uses several accents (spec: tier 3 has mixed accents), so a US voice is acceptable.
4. **Size and pins:** the PyPI page could not be read (it showed a browser challenge), so 0.9.4 being the latest release is NOT VERIFIED; the install will confirm the version. The download sizes above are estimates.

## Plan after approval

1. Install the pieces above.
2. Render c1, c9 and c14 of `first-challenge-001` in four voices: `bf_emma`, `bf_isabella`, `af_heart` and `af_bella`. The files are named only A to D for a blind listening test.
3. The owner picks a voice. I re-make the audio, re-time the cues with the same measured-and-checked method, and record the voice in `docs/content/prompts/draft-map-item.md`.

## Decision and install record

- **2026-11-17, owner:** approved as proposed. The blind test uses 2 British and 2 American voices.
- **Installed:** Homebrew `python@3.12` (3.12.16). Virtual environment `~/.local/share/ielts-tts/venv`: `kokoro` 0.9.4, `misaki` 0.9.4, `torch` 2.15.0, and `soundfile` (BSD-3-Clause, to write WAV files; **not listed above, added at install**). That is 94 packages, 1.1 GB. pip's report, with a SHA-256 for every package, is saved at `~/.local/share/ielts-tts/install-report.json`.
- **First render** fetched the model and four voices from huggingface.co (628 MB, snapshot `f3ff3571791e39611d31c381e3a41a3af07b4987`). misaki pip-installed `en-core-web-sm` 3.8.0 (spaCy English model) into the virtual environment.
- **Checksums:**
  - `kokoro-v1_0.pth` SHA-256 matches the model card (`496dba11…ad1e4`).
  - Voice `af_heart` matches its VOICES.md prefix `0ab5709b`.
  - The other voices (`af_bella` `8cb64e02`, `bf_emma` `d0a423de`, `bf_isabella` `cdd4c370`) were not compared: NOT VERIFIED.
- **Telemetry:** none observed, but network traffic was not monitored (NOT VERIFIED).
