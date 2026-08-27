/**
 * Fail fast, and say exactly what to do, when the Supabase credentials are missing or
 * malformed.
 *
 * This exists because the alternative cost twenty minutes twice. Without it, a missing or
 * broken `.env` surfaces as the designed full-page error state — "Cyprus is still there" —
 * with no network request in the panel and nothing anywhere pointing at credentials. The
 * page looks like a data outage and is actually a two-line config problem.
 *
 * It checks shape, not just presence, because one of those two failures was a `.env` whose
 * key had been written twice: present, non-empty, and rejected by the server with
 * "Invalid API key".
 *
 * Runs on `predev` and `prebuild`. Reads `process.env` first so CI and the Cloudflare build
 * environment — which have no `.env` file — pass on their own variables.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = resolve(ROOT, '.env');

const REQUIRED = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

function readEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  const out = {};
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const fromFile = readEnvFile();
const value = (name) => process.env[name] || fromFile[name] || '';

const problems = [];

for (const name of REQUIRED) {
  if (!value(name)) problems.push(`${name} is missing or empty.`);
}

const url = value('VITE_SUPABASE_URL');
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  problems.push(
    `VITE_SUPABASE_URL does not look like a Supabase project URL: ${url}\n` +
      '     Expected something like https://<project-ref>.supabase.co',
  );
}

/* A JWT is three dot-separated base64url segments. The failure this catches is a value
   that was concatenated with itself, which has five segments and is rejected at request
   time with a message that says nothing about the file it came from. */
const key = value('VITE_SUPABASE_ANON_KEY');
if (key) {
  const segments = key.split('.');
  if (segments.length !== 3 || !key.startsWith('eyJ')) {
    problems.push(
      `VITE_SUPABASE_ANON_KEY is not a well-formed JWT (${segments.length} segments, ` +
        `${key.length} characters).\n` +
        '     A doubled or truncated paste looks valid to the eye and fails at request\n' +
        '     time with "Invalid API key".',
    );
  }
}

if (problems.length > 0) {
  const hasFile = existsSync(ENV_FILE);
  console.error('\n  Supabase credentials are not usable.\n');
  for (const problem of problems) console.error(`   - ${problem}`);
  console.error(
    hasFile
      ? `\n  Checked process.env, then ${ENV_FILE}\n`
      : '\n  There is no .env file. Create one:\n' +
          '\n     cp .env.example .env\n' +
          '\n  then fill in VITE_SUPABASE_ANON_KEY from the Supabase dashboard:\n' +
          '  Project Settings -> API -> Project API keys -> anon public\n',
  );
  console.error(
    '  Vite inlines VITE_* at build time, so these must also be set in the Cloudflare\n' +
      '  build environment — a deployment built without them ships a bundle with\n' +
      '  undefined credentials and every auth call fails at runtime.\n',
  );
  process.exit(1);
}

console.log('env check passed');
