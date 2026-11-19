// Splits text into English (Latin script) runs and the rest, so English quoted inside an Arabic explanation can be
// isolated (`<bdi dir="ltr" lang="en">`) and the bidirectional algorithm cannot move the punctuation around it (ticket
// 09). A run starts and ends with a Latin letter or digit and may hold spaces, commas, full stops, apostrophes and
// hyphens between them, so "oh, sorry, I mean" is one run; punctuation after the last word belongs to the sentence.
export type BidiRun = { text: string; latin: boolean };

const LATIN_RUN = /[A-Za-z0-9](?:[A-Za-z0-9 ,.'’-]*[A-Za-z0-9])?/g;

export function bidiRuns(text: string): BidiRun[] {
  const runs: BidiRun[] = [];
  let from = 0;
  for (const match of text.matchAll(LATIN_RUN)) {
    if (match.index > from) runs.push({ text: text.slice(from, match.index), latin: false });
    runs.push({ text: match[0], latin: true });
    from = match.index + match[0].length;
  }
  if (from < text.length) runs.push({ text: text.slice(from), latin: false });
  return runs;
}
