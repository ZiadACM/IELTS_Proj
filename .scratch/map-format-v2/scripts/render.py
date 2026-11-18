# Throwaway: renders each cue with Kokoro, caps pauses, joins, and writes cue times (ticket 02, map-format-v2)
# and word times (ticket 03, D23): every event with a `word` gets `atSec`, the time in the final audio at which
# its word phrase ends. Kokoro's English pipeline returns per-token start_ts/end_ts; those raw times are mapped
# through the trim and pause caps below.
import json, sys, numpy as np, soundfile as sf
from kokoro import KPipeline
item_path, wav_out, times_out = sys.argv[1:4]
item = json.load(open(item_path))
SR, WIN = 24000, 240  # 10 ms windows
LEAD, GAP, TAIL = 0.3, 0.35, 0.5
CAP = {'c10': 0.35}  # the self-correction hesitation stays audible
pipe = KPipeline(lang_code='b')

def speech_mask(a):
    n = len(a) // WIN
    rms = np.sqrt((a[: n * WIN].reshape(n, WIN) ** 2).mean(axis=1))
    return rms > 0.01

def tidy(a, cap):
    """Trims outer silence and caps inner pauses. Returns the audio and the kept pieces as (raw_start, raw_end, out_start) samples."""
    m = speech_mask(a)
    idx = np.flatnonzero(m)
    off = idx[0] * WIN
    a = a[off: (idx[-1] + 1) * WIN]  # trim outer silence
    m = m[idx[0]: idx[-1] + 1]
    out, kept, n, i, capw = [], [], 0, 0, int(cap * SR / WIN)
    while i < len(m):
        j = i
        while j < len(m) and m[j] == m[i]: j += 1
        seg = a[i * WIN: j * WIN]
        if not m[i] and (j - i) > capw: seg = seg[: capw * WIN]
        kept.append((off + i * WIN, off + i * WIN + len(seg), n))
        out.append(seg); n += len(seg); i = j
    return np.concatenate(out), kept

def to_out(raw_sec, kept, total):
    """Maps a raw time to the tidied audio. A time inside a cut (trimmed edge or the dropped end of a long pause)
    moves to the nearest kept sample before it."""
    s = raw_sec * SR
    if s <= kept[0][0]: return 0
    for r0, r1, o in kept:
        if s < r0: return o
        if s <= r1: return o + (s - r0)
    return total

def phrase_end(text, tokens, word, cursor):
    """Raw end time of `word` in `text`, searched from character `cursor`. tokens are (char_start, char_end, end_ts)."""
    k = text.lower().find(word.lower(), cursor)
    if k < 0: return None, cursor
    end = k + len(word)
    last = [t for t in tokens if t[0] < end]
    return (last[-1][2] if last else None), end

parts, t, times, events_out, problems = [np.zeros(int(LEAD * SR))], LEAD, [], [], []
events = item.get('events', [])
for k, c in enumerate(item['transcript']['cues']):
    chunks, tokens, raw_off, pos = [], [], 0.0, 0
    for r in pipe(c['text'], voice='bf_emma', speed=0.70):
        a = np.asarray(r.audio if hasattr(r, 'audio') else r[2], dtype=np.float32)
        for tok in (getattr(r, 'tokens', None) or []):
            if tok.end_ts is None or not tok.text.strip(): continue
            p = c['text'].find(tok.text, pos)
            if p < 0: problems.append(f"{c['id']}: token {tok.text!r} not found in the cue text"); continue
            pos = p + len(tok.text)
            tokens.append((p, pos, raw_off + tok.end_ts))
        chunks.append(a); raw_off += len(a) / SR
    audio, kept = tidy(np.concatenate(chunks), CAP.get(c['id'], 0.25))
    times.append({'id': c['id'], 'start': round(t, 2), 'end': round(t + len(audio) / SR, 2)})
    cursor = 0
    for e in (e for e in events if e['cueId'] == c['id'] and e.get('word')):
        raw, cursor_new = phrase_end(c['text'], tokens, e['word'], cursor)
        if raw is None:
            problems.append(f"{e['id']}: word {e['word']!r} not found in {c['id']} after earlier events' words, or no token times")
            continue
        cursor = cursor_new
        s = to_out(raw, kept, len(audio))
        # Kokoro can give a following pause to the word's token, so a time can land in the pause or at the start of
        # the next words. A phrase never ends just after silence: move back to where speech stopped.
        m, w = speech_mask(audio), min(int(s // WIN), len(audio) // WIN)
        if w > 0 and not m[w - 1]:
            while w > 0 and not m[w - 1]: w -= 1
            s = w * WIN
        events_out.append({'id': e['id'], 'atSec': round(t + min(s, len(audio)) / SR, 2)})
    parts.append(audio); t += len(audio) / SR
    gap = TAIL if k == len(item['transcript']['cues']) - 1 else GAP
    parts.append(np.zeros(int(gap * SR))); t += gap
full = np.concatenate(parts)
sf.write(wav_out, full, SR)
json.dump({'durationSec': round(len(full) / SR, 2), 'cues': times, 'events': events_out}, open(times_out, 'w'), indent=1)
print('duration', round(len(full) / SR, 2), '| word times:', len(events_out), 'of', sum(1 for e in events if e.get('word')), 'events with a word')
for p in problems: print('PROBLEM', p)
