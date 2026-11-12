// Helpers for the authorization matrix (docs/security/authorization-matrix.json).
// Stack-neutral: no dependencies beyond Node 22+. Shared by the matrix test now and by the
// stack-specific security tests later (they iterate the matrix so new endpoints are covered automatically).
import fs from 'node:fs';
import path from 'node:path';

export const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..', '..');
export const matrixJsonPath = path.join(repoRoot, 'docs', 'security', 'authorization-matrix.json');
export const matrixMdPath = path.join(repoRoot, 'docs', 'security', 'authorization-matrix.md');

export function loadMatrix(p = matrixJsonPath) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Treat `{id}`, `:id`, `[id]`, `[...id]` and `<id>` path segments as the same placeholder,
// so router syntax from any framework compares equal to the matrix's `{param}` form.
export function normalizePath(p) {
  const clean = String(p).split('?')[0].replace(/\/+$/, '') || '/';
  return clean
    .split('/')
    .map((seg) => (/^(\{[^}]+\}|:[^/]+|\[{1,2}(\.\.\.)?[^\]]+\]{1,2}|<[^>]+>)$/.test(seg) ? '{}' : seg))
    .join('/');
}

export const endpointKey = (e) => `${String(e.method).toUpperCase()} ${normalizePath(e.path)}`;

// Returns the discovered endpoints that have no row in the matrix.
export function findUnlisted(discovered, matrix) {
  const known = new Set(matrix.endpoints.map(endpointKey));
  return discovered.map(endpointKey).filter((k) => !known.has(k));
}

// Parses the endpoint table in authorization-matrix.md into { id: { method, path, access } }.
export function parseMarkdownTable(md, roles) {
  const rows = {};
  for (const line of md.split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim().replace(/`/g, ''));
    if (!/^[A-Z]+-\d+$/.test(cells[0] ?? '')) continue;
    const [id, method, p, ...rest] = cells;
    if (rows[id]) throw new Error(`duplicate row ${id} in authorization-matrix.md`);
    rows[id] = { method, path: p, access: Object.fromEntries(roles.map((r, i) => [r, rest[i]])) };
  }
  return rows;
}
