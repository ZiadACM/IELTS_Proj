// Proves the live security suites work before the real app exists (task: security tests baseline, test-plan item 3).
// For every live suite it starts the SYNTHETIC fixture server (tests/security/fixtures/fixture-server.mjs) and runs the
// suite in a child process against it:
//   1. SAFE fixture        -> every test passes, none skipped;
//   2. VULNERABLE fixture  -> every test fails;
//   3. ONE vulnerability   -> the test with that case id fails (so each test detects ITS flaw, not just any flaw).
// Every vulnerability must be caught by a test and every live test must be shown failing at least once.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { repoRoot } from './lib/matrix.mjs';
import { createFixtureServer, VULNERABILITIES } from './fixtures/fixture-server.mjs';

const dir = path.join(repoRoot, 'tests', 'security');
const reporter = path.join(dir, 'lib', 'json-reporter.mjs');
export const LIVE_SUITES = ['answer-key-leakage', 'exam-mode', 'cross-user-access', 'authorization-enforcement', 'xss', 'auth'];
const caseId = (name) => /^([A-Z]+-\d+)/.exec(name)?.[1];

async function runSuite(suite, vulnerable) {
  const fx = createFixtureServer({ vulnerable });
  const url = await fx.listen();
  try {
    // NODE_TEST_CONTEXT marks a child of a test runner; Node then refuses to run the files. This is a separate run.
    const { NODE_TEST_CONTEXT, ...parentEnv } = process.env;
    const child = spawn(process.execPath, ['--test', `--test-reporter=${reporter}`, path.join(dir, `${suite}.test.mjs`)], {
      env: { ...parentEnv, SECURITY_BASE_URL: url, SECURITY_TEST_SUPPORT_TOKEN: fx.supportToken, SECURITY_REQUIRE_TARGET: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = ''; let errOut = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { errOut += d; });
    const code = await new Promise((resolve) => child.on('close', resolve));
    const results = out.split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l)).filter((r) => r.nesting === 0);
    assert.ok(results.length > 0, `${suite}: no test results (exit ${code}). stderr: ${errOut.slice(0, 500)}`);
    return { code, results };
  } finally {
    await fx.close();
  }
}

const allCaseIds = new Map(); // case id -> suite

for (const suite of LIVE_SUITES) {
  test(`${suite}: passes against the SAFE fixture (nothing skipped)`, async () => {
    const { code, results } = await runSuite(suite, []);
    const bad = results.filter((r) => r.result !== 'pass').map((r) => `${r.result}: ${r.name}${r.error ? ` -> ${r.error}` : ''}`);
    assert.deepEqual(bad, []);
    assert.equal(code, 0);
    for (const r of results) { const id = caseId(r.name); assert.ok(id, `test name must start with a case id: ${r.name}`); allCaseIds.set(id, suite); }
  });

  test(`${suite}: every test fails against the VULNERABLE fixture`, async () => {
    const { code, results } = await runSuite(suite, 'all');
    const notFailing = results.filter((r) => r.result !== 'fail').map((r) => `${r.result}: ${r.name}`);
    assert.deepEqual(notFailing, []);
    assert.notEqual(code, 0);
  });
}

test('each vulnerability alone is caught by the test with the same case id, and every live test is covered', async () => {
  assert.ok(allCaseIds.size > 0, 'safe-fixture runs must happen first (they collect the case ids)');
  const problems = [];
  for (const id of Object.keys(VULNERABILITIES)) {
    const suite = allCaseIds.get(id);
    if (!suite) { problems.push(`${id}: vulnerability has no live test`); continue; }
    const { results } = await runSuite(suite, [id]);
    const hit = results.find((r) => caseId(r.name) === id);
    if (!hit || hit.result !== 'fail') problems.push(`${id}: with only this vulnerability on, its test ${hit ? hit.result + 'ed' : 'did not run'}`);
  }
  for (const id of allCaseIds.keys()) if (!VULNERABILITIES[id]) problems.push(`${id}: test never demonstrated failing (no matching fixture vulnerability)`);
  assert.deepEqual(problems, []);
});
