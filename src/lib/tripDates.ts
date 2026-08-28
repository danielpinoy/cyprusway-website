/**
 * Trip dates, on the device clock — deliberately, and matched to the app.
 *
 * `itineraries` carries no timezone. Whether a day is "Today" is therefore a device-clock
 * decision in both clients, and matching the app matters more than being right in
 * isolation: the alternative is the two clients disagreeing about which day of the trip it
 * is, on the same row, at the same moment.
 *
 * **This is NOT the `quota_day` case.** Ask Pete's counter reads its day off the wire
 * because the server counts against a Cyprus calendar day and telling the client to derive
 * one would be a second copy of a server rule. Nothing on a trip is metered, nothing is
 * counted, and no endpoint reports a day — `date` on a stored day is just a date. So there
 * is nothing to read and the device clock is the whole answer.
 */

export interface Ymd {
  y: number;
  m: number;
  d: number;
}

export function toIso(date: Ymd): string {
  return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
}

export function parseIso(value: string | null | undefined): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const [, y, m, d] = match;
  return { y: Number(y), m: Number(m), d: Number(d) };
}

export function addDays(date: Ymd, days: number): Ymd {
  const shifted = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
  };
}

export function daysBetween(from: Ymd, to: Ymd): number {
  return Math.round(
    (Date.UTC(to.y, to.m - 1, to.d) - Date.UTC(from.y, from.m - 1, from.d)) / 86_400_000,
  );
}

function compare(a: Ymd, b: Ymd): number {
  return Date.UTC(a.y, a.m - 1, a.d) - Date.UTC(b.y, b.m - 1, b.d);
}

export function localToday(): Ymd {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

function utcToday(): Ymd {
  const now = new Date();
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
}

/**
 * The first selectable `trip_start`: strictly after today on **both** clocks.
 *
 * Both, because the server's same-day check is UTC while the traveller is on local time,
 * and a Cyprus evening runs a day ahead of UTC. Taking the later of the two is the only
 * bound that cannot be refused by the server or look wrong to the user.
 */
export function minTripStart(): Ymd {
  const local = addDays(localToday(), 1);
  const utc = addDays(utcToday(), 1);
  return compare(local, utc) >= 0 ? local : utc;
}

/**
 * "Today" / "Tomorrow", or nothing.
 *
 * The frames also draw "After Tomorrow", against dates that contradict it — placeholder
 * sloppiness rather than a spec, and the app rejected it for that reason. Two labels is
 * the established vocabulary.
 */
export function relativeDayKey(date: string | null): 'today' | 'tomorrow' | null {
  const parsed = parseIso(date);
  if (!parsed) return null;
  const diff = daysBetween(localToday(), parsed);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return null;
}

/** "Wed, 3 June" — the frame's day-header format, localised by the browser. */
export function formatDayHeading(date: string | null, lang: string): string | null {
  const parsed = parseIso(date);
  if (!parsed) return null;
  return new Intl.DateTimeFormat(lang, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)));
}

/** "10 Sep 2026" — never the frame's "09-10-2026", which is ambiguous between DD-MM and
 *  MM-DD and would read as a different date to half the audience. */
export function formatDate(date: string | null, lang: string): string {
  const parsed = parseIso(date);
  if (!parsed) return '';
  return new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)));
}

/** Stored "HH:MM" in the reader's locale. The stored value is the server's clock-of-day
 *  and carries no zone; it is displayed, never converted. */
export function formatTime(hhmm: string | null | undefined, lang: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!match) return '';
  const [, h, m] = match;
  return new Intl.DateTimeFormat(lang, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(Date.UTC(2000, 0, 1, Number(h), Number(m))),
  );
}
