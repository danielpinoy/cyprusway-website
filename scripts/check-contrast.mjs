/**
 * Refuse to ship gold that nobody measured.
 *
 * WHY THIS EXISTS. Across four phases this project has found **ten** WCAG contrast
 * failures and every single one was the same shape: light text on gold, or gold text on
 * something light. Phase 1 found eight and created `--cw-gold-link` as the remedy. Phase 4
 * found two more — the frame's place chips and its limit banner — and `--cw-gold-link` had
 * been sitting unused the entire time. The fix was already in the codebase; what was
 * missing was anything that noticed.
 *
 * So this is not a tenth fix, it is the thing that makes an eleventh hard. It does two
 * jobs:
 *
 *   1. **Gold must be measured.** Any declaration that puts a gold-derived colour into a
 *      text or background role must carry a `contrast:` annotation. No annotation, no
 *      build.
 *
 *   2. **Every annotation must be true.** Anywhere in the CSS, a `contrast:` comment is
 *      re-derived from the two colours it names and checked against the ratio it claims
 *      and against the threshold. A number that was right when it was written and wrong
 *      after a token changed becomes a build failure rather than a comment.
 *
 * Job 2 is the more valuable half. It applies to every colour, not just gold — the
 * annotations are how the measurements stop being prose and start being checked.
 *
 * GRAMMAR
 *
 *     contrast: <fg> on <bg> = <ratio>
 *     contrast: <fg> on <bg> = <ratio> (large)      18.66px bold / 24px regular -> 3:1
 *     contrast: <fg> on <bg> = <ratio> (graphic)    WCAG 1.4.11 non-text        -> 3:1
 *     contrast: <fg> on <bg> = <ratio> (logotype)   1.4.3 brand exemption       -> recorded
 *     contrast: <fg> on <bg> = <ratio> (rejected)   measured and NOT used       -> recorded
 *
 * `<fg>` and `<bg>` are either a `--cw-*` token or a literal hex. A token whose value
 * composites over something unknown — anything built on `transparent` — cannot be resolved
 * to a flat colour, so the annotation must name the composited hex instead. That is not a
 * loophole: writing `#f4d3cc` forces whoever wrote it to work out what the tint actually
 * lands on, which is the part that gets skipped.
 *
 * WHAT IT DOES NOT DO. It cannot know that the background a rule names is the background
 * the element actually gets — that needs a rendered page. It checks the arithmetic and it
 * checks that gold was thought about. Those are the two failures that actually happened.
 *
 * Run by `npm run build`, after check:css.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const TOKENS = join(SRC, 'styles', 'tokens.css');

const AA_TEXT = 4.5;
const AA_LARGE = 3.0;
/** How far a stated ratio may sit from the computed one before it is a lie. */
const TOLERANCE = 0.05;

/* ---- colour ------------------------------------------------------------- */

function parseHex(value) {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

function toHex(rgb) {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ---- tokens -------------------------------------------------------------- */

/** Split a comma list at top level, so nested parens survive. */
function splitTopLevel(input) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const character of input) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (character === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * Resolve a CSS colour expression to flat RGB, or null when it cannot be — which is the
 * honest answer for anything mixed with `transparent`, since what it composites over is a
 * property of the page and not of the declaration.
 */
function resolveColour(expression, tokens, seen = new Set()) {
  const value = expression.trim();

  const hex = parseHex(value);
  if (hex) return hex;
  if (value === 'white') return [255, 255, 255];
  if (value === 'black' || value === '#000') return [0, 0, 0];
  if (value === 'transparent') return null;

  const varMatch = /^var\(\s*(--[a-z0-9-]+)\s*(?:,.*)?\)$/i.exec(value);
  if (varMatch) {
    const name = varMatch[1];
    if (seen.has(name)) return null;
    const token = tokens.get(name);
    return token === undefined ? null : resolveColour(token, tokens, new Set([...seen, name]));
  }

  const mixMatch = /^color-mix\(\s*in\s+srgb\s*,([\s\S]*)\)$/i.exec(value);
  if (mixMatch) {
    const parts = splitTopLevel(mixMatch[1]);
    if (parts.length !== 2) return null;

    const read = (part) => {
      const percent = /\s(\d+(?:\.\d+)?)%$/.exec(part);
      const colour = percent ? part.slice(0, percent.index).trim() : part.trim();
      return { colour, weight: percent ? Number.parseFloat(percent[1]) / 100 : null };
    };

    const first = read(parts[0]);
    const second = read(parts[1]);
    const firstWeight = first.weight ?? (second.weight != null ? 1 - second.weight : 0.5);
    const secondWeight = 1 - firstWeight;

    const a = resolveColour(first.colour, tokens, seen);
    const b = resolveColour(second.colour, tokens, seen);
    if (!a || !b) return null;
    return [0, 1, 2].map((i) => a[i] * firstWeight + b[i] * secondWeight);
  }

  return null;
}

function readTokens() {
  const css = readFileSync(TOKENS, 'utf8');
  const tokens = new Map();
  for (const match of css.matchAll(/(--cw-[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

/** Token names whose derivation reaches `--cw-gold`. */
function goldFamily(tokens) {
  const family = new Set(['--cw-gold']);
  for (let pass = 0; pass < 5; pass += 1) {
    for (const [name, value] of tokens) {
      if (family.has(name)) continue;
      for (const reference of value.matchAll(/var\(\s*(--cw-[a-z0-9-]+)/gi)) {
        if (family.has(reference[1])) family.add(name);
      }
    }
  }
  return family;
}

/* ---- files --------------------------------------------------------------- */

function cssFiles(directory) {
  const out = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) out.push(...cssFiles(path));
    else if (entry.endsWith('.css')) out.push(path);
  }
  return out;
}

/** The block a character offset sits inside, as `[start, end)`. */
function enclosingBlock(css, offset) {
  let depth = 0;
  let start = 0;
  for (let i = offset; i >= 0; i -= 1) {
    if (css[i] === '}') depth += 1;
    else if (css[i] === '{') {
      if (depth === 0) {
        start = i;
        break;
      }
      depth -= 1;
    }
  }
  depth = 0;
  let end = css.length;
  for (let i = start + 1; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      if (depth === 0) {
        end = i;
        break;
      }
      depth -= 1;
    }
  }
  /* Include the comment block immediately above the selector, which is where an
     annotation most naturally goes. */
  const selectorStart = css.lastIndexOf('\n\n', start);
  return [selectorStart === -1 ? 0 : selectorStart, end];
}

function lineOf(css, offset) {
  return css.slice(0, offset).split('\n').length;
}

/* ---- the checks ---------------------------------------------------------- */

const tokens = readTokens();
const family = goldFamily(tokens);
const problems = [];
let annotations = 0;
let goldDeclarations = 0;

/* One line, deliberately: `contrast:` followed by a newline is prose, and prose that
   happened to end in the word "contrast" was the first false positive this found. */
const ANNOTATION =
  /contrast:[ \t]*([#a-z0-9-]+)[ \t]+on[ \t]+([#a-z0-9-]+)[ \t]*=[ \t]*(\d+(?:\.\d+)?)[ \t]*(\(large\)|\(graphic\)|\(logotype\)|\(rejected\))?/gi;

/* Only the roles where a colour is read as text or sits behind it. `border-color` and
   friends are out of scope: this is about legibility, not decoration. */
const ROLE = /(^|[\s;{])(color|background|background-color)\s*:\s*([^;}]+)/gi;

for (const file of cssFiles(SRC)) {
  const css = readFileSync(file, 'utf8');
  const name = relative(ROOT, file).replace(/\\/g, '/');

  /* 1. Every annotation must be true. */
  for (const match of css.matchAll(ANNOTATION)) {
    annotations += 1;
    const [, rawFg, rawBg, rawRatio, qualifier] = match;
    const line = lineOf(css, match.index);

    const fg = resolveColour(rawFg.startsWith('--') ? `var(${rawFg})` : rawFg, tokens);
    const bg = resolveColour(rawBg.startsWith('--') ? `var(${rawBg})` : rawBg, tokens);

    if (!fg || !bg) {
      problems.push(
        `${name}:${line}  contrast annotation names a colour that cannot be resolved to a ` +
          `flat value (${!fg ? rawFg : rawBg}). Anything built on \`transparent\` composites ` +
          `over the page — name the resulting hex instead.`,
      );
      continue;
    }

    const actual = contrastRatio(fg, bg);
    const claimed = Number.parseFloat(rawRatio);
    /* Two qualifiers record a number without enforcing a threshold on it:
       `(logotype)` is WCAG 1.4.3's brand exemption, and `(rejected)` documents a pairing
       that was measured and NOT used. Both are still re-derived, so a token change that
       invalidates the note is still a build failure — which is the point of writing the
       rejected options down at all. */
    const exempt =
      qualifier?.toLowerCase() === '(logotype)' || qualifier?.toLowerCase() === '(rejected)';
    const threshold = qualifier ? AA_LARGE : AA_TEXT;

    if (Math.abs(actual - claimed) > TOLERANCE) {
      problems.push(
        `${name}:${line}  contrast annotation says ${claimed.toFixed(2)} but ` +
          `${toHex(fg)} on ${toHex(bg)} measures ${actual.toFixed(2)}.`,
      );
    } else if (!exempt && actual < threshold) {
      problems.push(
        `${name}:${line}  ${toHex(fg)} on ${toHex(bg)} is ${actual.toFixed(2)}, below the ` +
          `${threshold} this needs${qualifier ? ` ${qualifier}` : ''}.`,
      );
    }
  }

  /* 2. Gold in a text or background role must be measured. */
  for (const match of css.matchAll(ROLE)) {
    const value = match[3];
    const usesGold =
      [...value.matchAll(/var\(\s*(--cw-[a-z0-9-]+)/gi)].some((v) => family.has(v[1])) ||
      /#c49a10/i.test(value);
    if (!usesGold) continue;

    goldDeclarations += 1;
    const [start, end] = enclosingBlock(css, match.index);
    const block = css.slice(start, end);
    if (!/contrast:/i.test(block)) {
      problems.push(
        `${name}:${lineOf(css, match.index)}  gold in a \`${match[2]}\` role with no ` +
          `contrast annotation in its rule.\n` +
          `      Measure it and write:  /* contrast: <fg> on <bg> = <ratio> */\n` +
          `      Ten failures across four phases were all this shape.`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(`\ncontrast check FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exit(1);
}

console.log(
  `contrast check passed — ${annotations} annotation(s) re-derived, ` +
    `${goldDeclarations} gold declaration(s) all measured`,
);
