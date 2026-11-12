// SYNTHETIC rule self-test for .semgrep/security.yml (run: semgrep --test .semgrep). Not application code.
declare const cue: { text: string };

export function Bad() {
  // ruleid: ielts-raw-html-sink
  return <p dangerouslySetInnerHTML={{ __html: cue.text }} />;
}

export function Good() {
  // ok: ielts-raw-html-sink
  return <p>{cue.text}</p>;
}
