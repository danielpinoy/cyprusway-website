/**
 * Fail the build on a physical CSS property.
 *
 * Adding Hebrew later is meant to be a language file and a `dir` attribute, not a
 * rewrite. That only stays true if every stylesheet uses logical properties, and the
 * way that guarantee rots is one `margin-left` at a time in a language nobody on the
 * team reads. A review cannot catch that reliably; a build can.
 *
 * Escape hatch: put `rtl-ok` in a comment on the same line, for the rare case where a
 * physical direction is genuinely what is meant.
 *
 * Run by `npm run build`.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'src');

const CSS_RULES = [
  { pattern: /(?<![\w-])margin-(left|right)\s*:/, fix: 'margin-inline-start / margin-inline-end' },
  { pattern: /(?<![\w-])padding-(left|right)\s*:/, fix: 'padding-inline-start / padding-inline-end' },
  { pattern: /(?<![\w-])border-(left|right)(-\w+)?\s*:/, fix: 'border-inline-start / border-inline-end' },
  { pattern: /(?<![\w-])border-(top|bottom)-(left|right)-radius\s*:/, fix: 'border-start-start-radius and friends' },
  { pattern: /^\s*(left|right)\s*:/, fix: 'inset-inline-start / inset-inline-end' },
  { pattern: /text-align\s*:\s*(left|right)/, fix: 'text-align: start / end' },
  { pattern: /float\s*:\s*(left|right)/, fix: 'float: inline-start / inline-end' },
  { pattern: /flex-direction\s*:\s*row-reverse/, fix: 'row — it already follows dir' },
  { pattern: /(?<![\w-])(width|height)\s*:/, fix: 'inline-size / block-size' },
  { pattern: /(?<![\w-])(min|max)-(width|height)\s*:/, fix: 'min-inline-size / max-block-size and friends' },
];

/* Sizes are direction-neutral, so they are a house-style rule rather than an RTL one,
   and they are noisy in media queries. Only the direction-sensitive rules are errors. */
const DIRECTIONAL = CSS_RULES.slice(0, 8);

const SCRIPT_RULES = [
  { pattern: /\.scrollLeft\b/, fix: 'scrollByInline() in src/lib/dir.ts — scrollLeft is signed inconsistently under RTL' },
];

const SCRIPT_EXEMPT = new Set([join('src', 'lib', 'dir.ts')]);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const problems = [];

for (const file of walk(SRC)) {
  const ext = extname(file);
  const rel = relative(ROOT, file);

  const rules =
    ext === '.css' ? DIRECTIONAL : ext === '.ts' || ext === '.tsx' ? SCRIPT_RULES : null;
  if (!rules) continue;
  if (rules === SCRIPT_RULES && SCRIPT_EXEMPT.has(rel)) continue;

  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, index) => {
    if (line.includes('rtl-ok')) return;
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        problems.push(`${rel}:${index + 1}  ${line.trim()}\n      use ${rule.fix}`);
      }
    }
  });
}

if (problems.length > 0) {
  console.error(`\nPhysical direction used in ${problems.length} place(s):\n`);
  for (const problem of problems) console.error(`  ${problem}\n`);
  console.error('Add `rtl-ok` in a comment on the line if the physical direction is intended.\n');
  process.exit(1);
}

console.log('logical-property check passed');
