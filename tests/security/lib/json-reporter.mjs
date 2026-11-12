// node:test reporter that prints one JSON line per finished test (used by fixture-proof.test.mjs to read
// another run's results without parsing human output). Usage: node --test --test-reporter=<this file> <files>
export default async function* jsonReporter(source) {
  for await (const ev of source) {
    if (ev.type !== 'test:pass' && ev.type !== 'test:fail') continue;
    if (ev.data.details?.type === 'suite') continue;
    const err = ev.data.details?.error;
    yield JSON.stringify({
      result: ev.type === 'test:pass' ? (ev.data.skip !== undefined && ev.data.skip !== false ? 'skip' : 'pass') : 'fail',
      name: ev.data.name,
      nesting: ev.data.nesting,
      skip: typeof ev.data.skip === 'string' ? ev.data.skip : undefined,
      error: err ? String(err.cause?.message ?? err.cause ?? err.message ?? err).slice(0, 2000) : undefined,
    }) + '\n';
  }
}
