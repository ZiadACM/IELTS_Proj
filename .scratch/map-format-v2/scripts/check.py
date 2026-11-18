import json, sys, numpy as np, soundfile as sf
item = json.load(open(sys.argv[1])); a, sr = sf.read(sys.argv[2]); W = int(0.01 * sr); TOL = 0.06
n = len(a) // W; rms = np.sqrt((a[: n * W].reshape(n, W) ** 2).mean(axis=1)); loud = rms > 0.01
def speech(t0, t1): return loud[int(t0 * 100): max(int(t1 * 100), int(t0 * 100) + 1)].any()
cues = item['transcript']['cues']; bad = []
for k, c in enumerate(cues):
    if not speech(c['start'], c['start'] + TOL): bad.append(f"{c['id']} no speech at start")
    if not speech(c['end'] - TOL, c['end']): bad.append(f"{c['id']} no speech before end")
    nxt = cues[k + 1]['start'] if k + 1 < len(cues) else len(a) / sr
    if speech(c['end'] + TOL, nxt - TOL): bad.append(f"{c['id']} speech in gap after it")
if speech(0, cues[0]['start'] - TOL): bad.append('speech in lead-in')
print('decoded length', round(len(a) / sr, 2), 'item', item['audio']['durationSec'])
print('PASS' if not bad else 'FAIL: ' + '; '.join(bad))
