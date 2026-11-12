// Endpoint discovery for the AUTHZ-02 coverage gate (tests/security/authorization-matrix.test.mjs), stack per
// docs/adr/0001-stack.md: Fastify API under server/. Static scan, no dependencies, nothing from the app is executed.
// Recognised registrations (full paths only; see the route conventions in the ADR):
//   <name>.get('/path', ...)   .post .put .patch .delete .head .options .all       (string or plain template literal)
//   <name>.route({ method: 'GET' | ['GET', 'HEAD'], url: '/path', ... })
// FAILS CLOSED (throws) on anything it cannot read, so an unlisted endpoint can never hide behind it:
//   - a route call on fastify/app/server/instance/api/router whose path is not a literal;
//   - a template literal with ${...} in the path; .route({ ... }) without a literal method and url;
//   - register(..., { prefix }) (prefixes would change real paths).
// Ignored: test files (*.test.*, *.spec.*), and files under a `test-support/` directory (the /__test__ contract
// in docs/security/test-harness-contract.md, which must never be mounted in production).
import fs from 'node:fs';
import path from 'node:path';

export const SCAN_DIRS = ['server'];
const EXT = /\.(m?[jt]s|cjs|cts|mts)$/;
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo', 'test-support']);
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'all'];
const ROUTER_NAMES = /^(fastify|app|server|instance|api|router|f)$/;

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isSymbolicLink()) throw new Error(`discover-endpoints: symlink not allowed in app code: ${path.join(dir, ent.name)}`);
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) { if (!SKIP_DIR.has(ent.name)) yield* walk(p); }
    else if (EXT.test(ent.name) && !/\.(test|spec)\.[^.]+$/.test(ent.name) && !/\.d\.ts$/.test(ent.name)) yield p;
  }
}

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
const lineOf = (src, i) => src.slice(0, i).split('\n').length;

export function discoverInSource(src, file = '<source>') {
  const code = stripComments(src);
  const found = [];
  const fail = (i, why) => { throw new Error(`discover-endpoints: ${file}:${lineOf(code, i)}: ${why}. Use a literal full path (see docs/adr/0001-stack.md, route conventions).`); };

  const call = new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\.\\s*(${METHODS.join('|')})\\s*(?:<[^>()]*>)?\\s*\\(\\s*`, 'g');
  for (let m; (m = call.exec(code));) {
    const [, recv, method] = m;
    const rest = code.slice(call.lastIndex);
    const lit = /^(['"])((?:\\.|(?!\1).)*)\1/.exec(rest) ?? /^`([^`]*)`/.exec(rest);
    if (lit) {
      const p = lit[2] ?? lit[1];
      if (!p.startsWith('/')) continue; // e.g. map.get('key')
      if (p.includes('${')) fail(m.index, `dynamic template path ${p}`);
      for (const verb of method === 'all' ? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] : [method.toUpperCase()]) found.push({ method: verb, path: p, file, line: lineOf(code, m.index) });
    } else if (ROUTER_NAMES.test(recv)) {
      fail(m.index, `${recv}.${method}(...) with a non-literal path`);
    }
  }

  const routeCall = /\.\s*route\s*\(\s*\{/g;
  for (let m; (m = routeCall.exec(code));) {
    // read the object literal up to its matching brace
    let depth = 0; let i = routeCall.lastIndex - 1; const start = i;
    for (; i < code.length; i++) { if (code[i] === '{') depth++; else if (code[i] === '}' && --depth === 0) break; }
    const obj = code.slice(start, i + 1);
    const url = /\b(?:url|path)\s*:\s*(['"`])([^'"`$]*)\1/.exec(obj);
    const mStr = /\bmethod\s*:\s*(['"])([A-Za-z]+)\1/.exec(obj);
    const mArr = /\bmethod\s*:\s*\[([^\]]*)\]/.exec(obj);
    const verbs = mStr ? [mStr[2]] : mArr ? [...mArr[1].matchAll(/(['"])([A-Za-z]+)\1/g)].map((x) => x[2]) : null;
    if (!url || !verbs?.length) fail(m.index, '.route({...}) without a literal method and url');
    for (const v of verbs) found.push({ method: v.toUpperCase(), path: url[2], file, line: lineOf(code, m.index) });
  }

  const prefix = /\bregister\s*\([^)]*\bprefix\s*:/g;
  const pm = prefix.exec(code);
  if (pm) fail(pm.index, 'register(..., { prefix }) changes real paths');
  return found;
}

export async function discoverEndpoints({ root }) {
  const out = [];
  for (const d of SCAN_DIRS) {
    const dir = path.join(root, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of walk(dir)) out.push(...discoverInSource(fs.readFileSync(f, 'utf8'), path.relative(root, f)));
  }
  return out;
}
