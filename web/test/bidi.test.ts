// The split behind isolating English inside Arabic text (ticket 09, 2026-11-18 comment). Expected runs are read by hand
// from the reviewed Arabic explanations of first-challenge-001 (docs/content/items/first-challenge-001.json), not
// produced by the code under test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bidiRuns } from '../src/bidi.ts';

const latin = (text: string) =>
  bidiRuns(text)
    .filter((r) => r.latin)
    .map((r) => r.text);

test('q1: the quoted phrase and each map letter are English runs; the guillemets stay Arabic', () => {
  const q1 =
    'تقول المرشدة إن غرفة الهدوء تقع «at the far end» من الممر، أي في آخره تماماً، على يمينك بعد غرفة الاجتماعات. الحرف D يقع أيضاً بعد غرفة الاجتماعات وعلى اليمين، لكنه ليس في آخر الممر. والحرف A في الممر نفسه، لكنه على اليسار. لذلك فالحرف C وحده هو الذي يقع في آخر الممر وعلى اليمين.';
  assert.deepEqual(latin(q1), ['at the far end', 'D', 'A', 'C']);
  assert.equal(
    bidiRuns(q1)
      .map((r) => r.text)
      .join(''),
    q1,
  );
});

test('q2 and q3: a phrase with commas inside is one run', () => {
  assert.deepEqual(
    latin(
      'تقول المرشدة إن غرفة الأشغال اليدوية تقع «just past» مكتب الموظفين. أما الحرف E فيقع مقابل المكتب. الإجابة الصحيحة هي الحرف F لأنه',
    ),
    ['just past', 'E', 'F'],
  );
  assert.deepEqual(
    latin(
      'ثم تستدرك بعبارة «oh, sorry, I mean» وتقول إنها في الجانب الشرقي. فالحرف G في الجانب الغربي، والإجابة الصحيحة هي الحرف H في الجانب الشرقي.',
    ),
    ['oh, sorry, I mean', 'G', 'H'],
  );
});

test('punctuation after an English word belongs to the Arabic sentence', () => {
  assert.deepEqual(bidiRuns('هي الحرف C.'), [
    { text: 'هي الحرف ', latin: false },
    { text: 'C', latin: true },
    { text: '.', latin: false },
  ]);
});

test('all-Arabic, all-English and empty text', () => {
  assert.deepEqual(bidiRuns('شمال النافورة يعني فوقها.'), [{ text: 'شمال النافورة يعني فوقها.', latin: false }]);
  assert.deepEqual(bidiRuns('North of the fountain'), [{ text: 'North of the fountain', latin: true }]);
  assert.deepEqual(bidiRuns(''), []);
});
