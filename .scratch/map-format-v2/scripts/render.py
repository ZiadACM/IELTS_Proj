# Throwaway: voices an item with Kokoro and writes cue times and word times (map-format-v2 tickets 02, 03, 04).
# Ticket 04 (map redesign, owner interview 2026-11-18): renders whole paragraphs instead of one cue at a time, keeps
# Kokoro's own pauses (no caps), and makes the pause before each self-correction at least CORR_PAUSE long.
# Cue times and `atSec` come from Kokoro's per-token start_ts/end_ts, mapped through the outer trim and any
# inserted correction pause.
#
#   render.py <item.json> <out.wav> <times.json> [voice] [speed]      (defaults: bf_emma 0.70, D22)
#
# Paragraphs: a new one starts at the cue of each leg's first event, and after the last event's cue. For a
# 3-question item that is: intro, question 1, question 2, question 3, closing.
import json, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
item_path, wav_out, times_out = sys.argv[1:4]
VOICE = sys.argv[4] if len(sys.argv) > 4 else 'bf_emma'
SPEED = float(sys.argv[5]) if len(sys.argv) > 5 else 0.70
item = json.load(open(item_path))
SR, WIN = 24000, 240  # 10 ms windows
LEAD, PARA_GAP, TAIL = 0.3, 1.0, 0.5
CORR_PAUSE = 1.2      # at least this much silence before a self-correction ("south of the café ... oh, sorry")
LONG_PAUSE = 1.5      # reported, not cut
pipe = KPipeline(lang_code=VOICE[0], repo_id='hexgrad/Kokoro-82M')

def speech_mask(a):
    n = len(a) // WIN
    rms = np.sqrt((a[: n * WIN].reshape(n, WIN) ** 2).mean(axis=1))
    return rms > 0.01

def silence_runs(m):
    """(start_window, end_window) of every silent run inside the speech."""
    runs, i = [], 0
    while i < len(m):
        j = i
        while j < len(m) and m[j] == m[i]: j += 1
        if not m[i] and i > 0 and j < len(m): runs.append((i, j))
        i = j
    return runs

cues = item['transcript']['cues']
events = item.get('events', [])
cue_index = {c['id']: k for k, c in enumerate(cues)}
breaks = {0}
for i, e in enumerate(events):
    if i == 0 or e.get('startsLeg'): breaks.add(cue_index[e['cueId']])
if events: breaks.add(cue_index[events[-1]['cueId']] + 1)
paragraphs = [[]]
for k in range(len(cues)):
    if k in breaks and paragraphs[-1]: paragraphs.append([])
    paragraphs[-1].append(k)

parts, t, times, events_out, problems, notes = [np.zeros(int(LEAD * SR))], LEAD, [], [], [], []
for pi, para in enumerate(paragraphs):
    # 1. Render the paragraph in one call; keep each token's character span and raw times.
    text, spans = '', []
    for k in para:
        if text: text += ' '
        spans.append((k, len(text), len(text) + len(cues[k]['text'])))
        text += cues[k]['text']
    chunks, tokens, raw_off, pos = [], [], 0.0, 0
    for r in pipe(text, voice=VOICE, speed=SPEED):
        a = np.asarray(r.audio, dtype=np.float32)
        for tok in (r.tokens or []):
            if tok.start_ts is None or tok.end_ts is None or not tok.text.strip(): continue
            p = text.find(tok.text, pos)
            if p < 0: problems.append(f'paragraph {pi + 1}: token {tok.text!r} not found in the text'); continue
            pos = p + len(tok.text)
            tokens.append((p, pos, raw_off + tok.start_ts, raw_off + tok.end_ts))
        chunks.append(a); raw_off += len(a) / SR
    raw = np.concatenate(chunks)

    # 2. Trim outer silence only.
    m = speech_mask(raw)
    idx = np.flatnonzero(m)
    off = idx[0] * WIN
    audio = raw[off: (idx[-1] + 1) * WIN]

    def snap_back(s, mask):
        """A time inside a pause moves back to where speech stopped."""
        w = min(int(s // WIN), len(mask))
        if w > 0 and not mask[w - 1]:
            while w > 0 and not mask[w - 1]: w -= 1
            return w * WIN
        return s

    def phrase_end(word, lo, hi):
        """Raw end time (s) of `word` searched in text[lo:hi], and the character after it."""
        k = text.lower().find(word.lower(), lo, hi)
        if k < 0: return None, lo
        end = k + len(word)
        last = [tk for tk in tokens if tk[0] < end]
        return (last[-1][3] if last else None), end

    # 3. Lengthen the pause before each self-correction to CORR_PAUSE (insert silence mid-pause).
    m = speech_mask(audio)
    inserts = []  # (sample in trimmed audio, samples inserted)
    for e in events:
        if e.get('kind') != 'correction' or e['cueId'] not in {cues[k]['id'] for k in para} or not e.get('word'): continue
        _, lo, hi = next(sp for sp in spans if cues[sp[0]]['id'] == e['cueId'])
        r_end, _ = phrase_end(e['word'], lo, hi)
        if r_end is None: problems.append(f"{e['id']}: correction word not found; no pause added"); continue
        s0 = snap_back(r_end * SR - off, m)
        w = int(s0 // WIN)
        while w < len(m) and not m[w]: w += 1
        s1 = w * WIN
        have = (s1 - s0) / SR
        if have < CORR_PAUSE:
            inserts.append(((s0 + s1) // 2, int((CORR_PAUSE - have) * SR)))
            notes.append(f"{e['id']}: pause before the correction {have:.2f} s -> {CORR_PAUSE:.2f} s")
        else:
            notes.append(f"{e['id']}: pause before the correction already {have:.2f} s")
    for at, n in sorted(inserts, reverse=True):
        audio = np.concatenate([audio[:at], np.zeros(n, dtype=np.float32), audio[at:]])
    inserts.sort()

    def to_out(raw_sec):
        """Raw paragraph time -> samples in the final paragraph audio."""
        s = raw_sec * SR - off
        s += sum(n for at, n in inserts if at <= s)
        return int(min(max(s, 0), len(audio)))

    # 4. Cue times from token times, snapped onto speech; word times as before (ticket 03).
    m = speech_mask(audio)
    prev_end = 0
    for k, lo, hi in spans:
        c = cues[k]
        toks = [tk for tk in tokens if tk[0] >= lo and tk[1] <= hi]
        if not toks: problems.append(f"{c['id']}: no token times"); continue
        w = int(to_out(toks[0][2]) // WIN)
        if w < len(m) and m[w]:  # Kokoro's first token time can be late: move back to where this speech began
            while w > 0 and m[w - 1] and (w - 1) * WIN >= prev_end: w -= 1
        else:                    # a start in silence moves forward to the speech
            while w < len(m) and not m[w]: w += 1
        start = w * WIN
        end = prev_end = snap_back(to_out(toks[-1][3]), m)
        times.append({'id': c['id'], 'start': round(t + start / SR, 2), 'end': round(t + end / SR, 2)})
        cursor = lo
        for e in (e for e in events if e['cueId'] == c['id'] and e.get('word')):
            r_end, cursor_new = phrase_end(e['word'], cursor, hi)
            if r_end is None:
                problems.append(f"{e['id']}: word {e['word']!r} not found in {c['id']} after earlier events' words, or no token times")
                continue
            cursor = cursor_new
            events_out.append({'id': e['id'], 'atSec': round(t + snap_back(to_out(r_end), m) / SR, 2)})
    for a0, a1 in silence_runs(m):
        if (a1 - a0) / 100 > LONG_PAUSE:
            notes.append(f'paragraph {pi + 1}: long natural pause {(a1 - a0) / 100:.2f} s at {t + a0 / 100:.2f} s (kept)')

    parts.append(audio); t += len(audio) / SR
    gap = TAIL if pi == len(paragraphs) - 1 else PARA_GAP
    parts.append(np.zeros(int(gap * SR), dtype=np.float32)); t += gap

full = np.concatenate(parts)
sf.write(wav_out, full, SR)
json.dump({'durationSec': round(len(full) / SR, 2), 'voice': VOICE, 'speed': SPEED, 'cues': times, 'events': events_out}, open(times_out, 'w'), indent=1)
print(VOICE, SPEED, '| paragraphs:', [[cues[k]['id'] for k in p] for p in paragraphs])
print('duration', round(len(full) / SR, 2), '| word times:', len(events_out), 'of', sum(1 for e in events if e.get('word')), 'events with a word')
for n in notes: print('NOTE', n)
for p in problems: print('PROBLEM', p)
