// PROTOTYPE helper: inlines the v1 and v2 item files into the template, so the page is one self-contained file.
// Usage (from the repo root): node .scratch/map-format-v2/prototype/build-prototype.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, dir), 'utf8');
const html = read('map-v2-prototype.template.html')
  .replace('/*V2_JSON*/null', read('../first-challenge-001.v2.json').trim())
  .replace('/*V1_JSON*/null', read('../../../docs/content/items/first-challenge-001.json').trim())
  .replace('/*ANCHORED_JSON*/null', JSON.stringify(anchoredWithDemo(), null, 2));
writeFileSync(process.argv[2], html);

// Ticket 06 demo only: the current anchored draft's correction ("directly south of the café") has no wrongPath yet
// (the redraft, ticket 07, brings a left/right one). Until then the prototype adds a short wrong path from the
// corridor south to room E's door, so the pull-back can be seen. Marked demoWrongPath; never written to the item.
function anchoredWithDemo() {
  const item = JSON.parse(read('../first-challenge-001.anchored.json'));
  for (const e of item.events) if (e.kind === 'correction' && !e.wrongPath && e.id === 'e18') {
    e.wrongPath = [{ x: 290, y: 467 }, { x: 315, y: 467 }];
    e.at = { x: 315, y: 467 };
    e.demoWrongPath = true;
  }
  return item;
}
