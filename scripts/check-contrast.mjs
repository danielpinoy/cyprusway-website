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
 *     contrast: <fg> on <bg> = <ratio> (decorative) boundary carrying no state  -> recorded
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
  const css = readFileSync(TOKENS, 'utf8').replace(/\r\n/g, '\n');
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

/** The three characters that can end the construct preceding a selector. */
const DELIMITERS = new Set(['{', '}', ';']);

/**
 * The stylesheet with every comment blanked to spaces of the same length.
 *
 * Offsets and line counts are unchanged, so anything found in here can be sliced straight
 * out of the original. Two separate defects need it. Braces written inside a comment were
 * being counted as real ones, which silently mis-locates every rule after them; and
 * `color: var(--cw-gold)` written in prose is not a declaration, which was the first false
 * positive this check ever produced.
 */
function blankComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

/**
 * The region a declaration's annotation may live in — the rule's own body plus the
 * comments written directly above its selector — as `[start, end)`, or **null** when the
 * declaration is not inside a rule at all.
 *
 * READ THIS BEFORE CHANGING IT. Every defect this function has had was one defect wearing
 * different clothes: a search that did not find what it was looking for fell back to byte
 * 0, which turns "I could not locate the rule" into "the rule is the whole file" — and a
 * file with one annotation anywhere then passed for all of its gold. That shipped twice,
 * and both times the run kept printing a coverage number that read like assurance. So the
 * rule, stated once: **a search that fails here narrows the region or returns null. It
 * never widens it, and byte 0 is never a fallback.** The one region that legitimately
 * starts at 0 is a rule that genuinely begins the file, whose preamble is the file header.
 */
function enclosingBlock(code, offset) {
  /* The innermost `{` still open at `offset`. */
  let depth = 0;
  let brace = -1;
  for (let i = offset; i >= 0; i -= 1) {
    if (code[i] === '}') depth += 1;
    else if (code[i] === '{') {
      if (depth === 0) {
        brace = i;
        break;
      }
      depth -= 1;
    }
  }
  if (brace === -1) return null;

  /* Its match. */
  depth = 0;
  let end = code.length;
  for (let i = brace + 1; i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    else if (code[i] === '}') {
      if (depth === 0) {
        end = i;
        break;
      }
      depth -= 1;
    }
  }

  /* Back over the selector and the comment block above it, stopping at the end of
     whatever precedes them: the previous rule's `}`, a declaration's `;`, or the
     enclosing `{`. Comments are blanked by now, so one walk over "not a delimiter"
     collects the selector and its comments together — and a rule can no longer reach
     back into the rule before it for an annotation, which is the whole point. */
  let start = brace;
  while (start > 0 && !DELIMITERS.has(code[start - 1])) start -= 1;
  return [start, end];
}

function lineOf(css, offset) {
  return css.slice(0, offset).split('\n').length;
}

/* ---- the checks ---------------------------------------------------------- */

/* One line, deliberately: `contrast:` followed by a newline is prose, and prose that
   happened to end in the word "contrast" was the first false positive this found. */
const ANNOTATION =
  /contrast:[ \t]*([#a-z0-9-]+)[ \t]+on[ \t]+([#a-z0-9-]+)[ \t]*=[ \t]*(\d+(?:\.\d+)?)[ \t]*(\(large\)|\(graphic\)|\(logotype\)|\(rejected\)|\(decorative\))?/gi;

/* Text roles, and the two boundary roles that carry meaning.
 *
 * `outline` and `border-color` were added after a composer focus ring shipped in gold
 * without a measurement and this file did not notice — it was scoped to legibility, and a
 * focus ring is not legibility, it is WCAG 1.4.11 non-text contrast at 3:1. Adding them
 * immediately found a selected gallery thumbnail at 2.32 against its own ground.
 *
 * Genuinely decorative boundaries are not exempted by omission; they are annotated
 * `(decorative)`, so the number still exists and still gets re-derived. */
const ROLE =
  /(^|[\s;{])(color|background|background-color|outline|outline-color|border-color)\s*:\s*([^;}]+)/gi;

/**
 * Everything wrong with one stylesheet, and what it counted.
 *
 * Taking a string rather than a path is what lets the guard below run the real checker
 * over the exact shapes that have defeated it before. A checker whose own failure modes
 * are only written down in prose gets to fail the same way twice, which is what happened.
 */
function analyse(name, source, tokens, family) {
  const css = source.replace(/\r\n/g, '\n');
  const code = blankComments(css);
  const problems = [];
  let annotations = 0;
  let goldDeclarations = 0;

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
    const exempt = ['(logotype)', '(rejected)', '(decorative)'].includes(
      qualifier?.toLowerCase() ?? '',
    );
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

  /* 2. Gold in a text or background role must be measured. Matched against the blanked
     copy, so a colour named in prose is not mistaken for a declaration. */
  for (const match of code.matchAll(ROLE)) {
    const value = match[3];
    const usesGold =
      [...value.matchAll(/var\(\s*(--cw-[a-z0-9-]+)/gi)].some((v) => family.has(v[1])) ||
      /#c49a10/i.test(value);
    if (!usesGold) continue;

    goldDeclarations += 1;
    const line = lineOf(code, match.index);
    const region = enclosingBlock(code, match.index);

    if (region === null) {
      problems.push(
        `${name}:${line}  gold in a \`${match[2]}\` role that is not inside any rule, so ` +
          `there is nowhere for its annotation to be.\n` +
          `      This used to be reported as measured: the search for the enclosing rule ` +
          `fell back to byte 0 and inherited the first rule's annotation.`,
      );
      continue;
    }

    /* Sliced out of the ORIGINAL, because the annotation is a comment. */
    if (!/contrast:/i.test(css.slice(region[0], region[1]))) {
      problems.push(
        `${name}:${line}  gold in a \`${match[2]}\` role with no ` +
          `contrast annotation in its rule.\n` +
          `      Measure it and write:  /* contrast: <fg> on <bg> = <ratio> */\n` +
          `      Ten failures across four phases were all this shape.`,
      );
    }
  }

  return { problems, annotations, goldDeclarations };
}

/* ---- the checker's own guard ---------------------------------------------
 *
 * Job 2 has failed open twice. First because it located a rule by searching backwards for
 * a blank line, which never matched under CRLF; then because "no enclosing rule found"
 * fell back to byte 0. Both times every file passed, the coverage number went up, and the
 * number was offered as the evidence that gold was being measured. Prose in a doc did not
 * prevent the second one.
 *
 * So the shapes that got through are fixtures now. They run on every invocation, before
 * the tree, against the real `analyse` — a checker that has stopped catching them cannot
 * report a pass, and the failure names the shape that came back.
 */
const GUARD = [
  {
    what: 'gold outside every rule, in a file that is annotated elsewhere',
    expect: 'problem',
    css: [
      'color: var(--cw-gold);',
      '',
      '.rule {',
      '  /* contrast: --cw-navy on --cw-white = 11.14 */',
      '  color: var(--cw-navy);',
      '}',
      '',
    ].join('\n'),
  },
  {
    what: 'unmeasured gold in the rule after an annotated one, no blank line between',
    expect: 'problem',
    css: [
      '.a {',
      '  /* contrast: --cw-navy on --cw-white = 11.14 */',
      '  color: var(--cw-navy);',
      '}',
      '.b {',
      '  color: var(--cw-gold);',
      '}',
      '',
    ].join('\n'),
  },
  {
    what: 'unmeasured gold below an annotated rule, blank line between',
    expect: 'problem',
    css: [
      '.a {',
      '  /* contrast: --cw-navy on --cw-white = 11.14 */',
      '  color: var(--cw-navy);',
      '}',
      '',
      '.b {',
      '  color: var(--cw-gold);',
      '}',
      '',
    ].join('\n'),
  },
  {
    what: 'unmeasured gold whose annotation is in the NEXT rule, not its own',
    expect: 'problem',
    css: [
      '.b {',
      '  color: var(--cw-gold);',
      '}',
      '',
      '/* contrast: --cw-navy on --cw-white = 11.14 */',
      '.a {',
      '  color: var(--cw-navy);',
      '}',
      '',
    ].join('\n'),
  },
  {
    what: 'unmeasured gold nested in a media query, annotated only outside it',
    expect: 'problem',
    css: [
      '/* contrast: --cw-black-1 on --cw-gold = 6.46 */',
      '.chip {',
      '  background: var(--cw-gold);',
      '}',
      '',
      '@media (min-width: 640px) {',
      '  .other {',
      '    color: var(--cw-gold);',
      '  }',
      '}',
      '',
    ].join('\n'),
  },
  {
    what: 'an annotation whose arithmetic is wrong',
    expect: 'problem',
    css: [
      '.gold {',
      '  /* contrast: --cw-black-1 on --cw-gold = 9.99 */',
      '  background: var(--cw-gold);',
      '}',
      '',
    ].join('\n'),
  },
  {
    what: 'measured gold, annotation in the comment above its selector',
    expect: 'clean',
    css: [
      '/* contrast: --cw-black-1 on --cw-gold = 6.46 */',
      '.gold {',
      '  background: var(--cw-gold);',
      '}',
      '',
    ].join('\n'),
  },
  {
    what: 'measured gold whose own comment contains a closing brace',
    expect: 'clean',
    css: [
      '.gold {',
      '  /* the frame draws this as } shaped, which used to break the brace count.',
      '     contrast: --cw-black-1 on --cw-gold = 6.46 */',
      '  background: var(--cw-gold);',
      '}',
      '',
    ].join('\n'),
  },
  {
    what: 'gold named in prose only, which is not a declaration',
    expect: 'clean',
    css: [
      '/* This used to be color: var(--cw-gold) and no longer is. */',
      '.a {',
      '  color: var(--cw-navy);',
      '}',
      '',
    ].join('\n'),
  },
];

/* ---- run ----------------------------------------------------------------- */

const tokens = readTokens();
const family = goldFamily(tokens);

let guardFailed = false;
for (const fixture of GUARD) {
  const { problems: found } = analyse('guard.css', fixture.css, tokens, family);
  const caught = found.length > 0;
  if (caught !== (fixture.expect === 'problem')) {
    guardFailed = true;
    console.error(
      `\ncontrast check GUARD FAILED — ${caught ? 'now reports' : 'no longer catches'}: ` +
        `${fixture.what}`,
    );
    for (const problem of found) console.error(`      ${problem}`);
  }
}
if (guardFailed) {
  console.error(
    '\n  The checker itself is broken, so nothing it says about src/ means anything.\n' +
      '  Fix `enclosingBlock` before trusting another coverage number.\n',
  );
  process.exit(1);
}

const problems = [];
let annotations = 0;
let goldDeclarations = 0;

for (const file of cssFiles(SRC)) {
  const name = relative(ROOT, file).replace(/\\/g, '/');
  const result = analyse(name, readFileSync(file, 'utf8'), tokens, family);
  problems.push(...result.problems);
  annotations += result.annotations;
  goldDeclarations += result.goldDeclarations;
}

if (problems.length > 0) {
  console.error(`\ncontrast check FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exit(1);
}

console.log(
  `contrast check passed — ${GUARD.length} guard fixture(s) still caught, ` +
    `${annotations} annotation(s) re-derived, ` +
    `${goldDeclarations} gold declaration(s) all measured`,
);
