// PROTOTYPE helper: inlines the v1 and v2 item files into the template, so the page is one self-contained file.
// Usage (from the repo root): node .scratch/map-format-v2/prototype/build-prototype.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('.', import.meta.url);
const read = (p) => readFileSync(new URL(p, dir), 'utf8');
const html = read('map-v2-prototype.template.html')
  .replace('/*V2_JSON*/null', read('../first-challenge-001.v2.json').trim())
  .replace('/*V1_JSON*/null', read('../../../docs/content/items/first-challenge-001.json').trim())
  .replace('/*ANCHORED_JSON*/null', read('../first-challenge-001.anchored.json').trim());
writeFileSync(process.argv[2], html);

