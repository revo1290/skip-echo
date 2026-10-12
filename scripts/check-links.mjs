// Checks relative links and heading anchors in the project's Markdown files.
// External links (http, https, mailto, ...) are not fetched, so CI stays offline and deterministic.
// Generated eval suites are skipped: their prompts are synthetic conversation text, not project documentation.
// Known limit: only ATX headings (`# Title`) are anchors; links to setext headings (underlined with === or ---) are reported as missing.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKIP = new Set(['.git', 'node_modules', 'evals/native', 'evals/conditions', 'evals/hard']);
const rel = (root, path) => relative(root, path).split(sep).join('/');

function markdownFiles(root, dir = root) {
 return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
  const path = resolve(dir, e.name);
  if (SKIP.has(e.name) && dir === root || SKIP.has(rel(root, path))) return [];
  return e.isDirectory() ? markdownFiles(root, path) : e.name.endsWith('.md') ? [path] : [];
 });
}

// GitHub's anchor for a heading: lowercase, drop punctuation except hyphen and underscore, spaces become hyphens.
const slug = text => text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/[`*]/g, '').replace(/(^|\W)_+([^_]+?)_+(?=\W|$)/g, '$1$2').trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');

// Lines outside fenced code blocks and HTML comments, with their 1-based numbers.
function prose(text) {
 let fence = null;
 return text.replace(/<!--[\s\S]*?-->/g, c => c.replace(/[^\n]/g, '')).split('\n').flatMap((line, i) => {
  const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (fence) {
   if (m && m[1][0] === fence.char && m[1].length >= fence.length && !m[2].trim()) fence = null;
   return [];
  }
  if (m && !(m[1][0] === '`' && m[2].includes('`'))) { fence = { char: m[1][0], length: m[1].length }; return []; }
  return [[i + 1, line]];
 });
}

function anchors(path) {
 const seen = new Map();
 const out = new Set();
 for (const [, line] of prose(readFileSync(path, 'utf8'))) {
  const m = line.match(/^ {0,3}#{1,6}\s+(.*?)\s*#*\s*$/);
  if (!m) continue;
  const s = slug(m[1]);
  const n = seen.get(s) ?? 0;
  seen.set(s, n + 1);
  out.add(n ? `${s}-${n}` : s);
 }
 return out;
}

export function checkLinks(root) {
 const problems = [];
 const cache = new Map();
 const headings = path => cache.get(path) ?? cache.set(path, anchors(path)).get(path);
 for (const file of markdownFiles(root)) {
  for (const [no, raw] of prose(readFileSync(file, 'utf8'))) {
   const line = raw.replace(/`[^`]*`/g, '');
   const targets = [...line.matchAll(/!?\[[^\]]*\]\((<[^>]+>|(?:[^()\s]|\([^()\s]*\))+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g)].map(m => m[1].replace(/^<|>$/g, ''));
   const ref = line.match(/^ {0,3}\[[^\]]+\]:\s*(\S+)/);
   if (ref) targets.push(ref[1]);
   for (const target of targets) {
    if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(target)) continue;
    const fail = why => problems.push(`${rel(root, file)}:${no}: (${target}) ${why}`);
    const hash = target.indexOf('#');
    const [pathPart, anchor] = hash === -1 ? [target, ''] : [target.slice(0, hash), target.slice(hash + 1)];
    let dest = file;
    try {
     const clean = decodeURIComponent(pathPart.replace(/\?.*$/, ''));
     if (clean) dest = clean.startsWith('/') ? resolve(root, clean.slice(1)) : resolve(dirname(file), clean);
     if (!existsSync(dest)) { fail('file not found'); continue; }
     if (anchor && dest.endsWith('.md') && statSync(dest).isFile() && !/^L\d+(-L\d+)?$/.test(anchor) && !headings(dest).has(decodeURIComponent(anchor).toLowerCase())) fail('no such heading');
    } catch {
     fail('malformed link');
    }
   }
  }
 }
 return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
 const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
 const problems = checkLinks(root);
 for (const p of problems) console.error(p);
 console.log(problems.length ? `${problems.length} broken link(s)` : 'All relative Markdown links resolve.');
 process.exitCode = problems.length ? 1 : 0;
}
