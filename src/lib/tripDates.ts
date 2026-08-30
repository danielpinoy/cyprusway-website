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

/**
 * The locale a DATE is formatted in, for a site language.
 *
 * `Intl` resolves a bare `en` to `en-US`, which puts the month first — "Sep 15, 2026" —
 * and that is what the site's English had been rendering on every trip card, day heading
 * and review line until 30 Aug 2026 (the comment on `formatDate` below claimed "10 Sep
 * 2026"; it produced "Sep 10, 2026"). The site's English is Cyprus's English, which is
 * day-first like every other language it ships. Mapped once, here, so no caller has to
 * remember.
 *
 * Deliberately NOT applied to `formatTime`: `en-GB` would also switch the clock to
 * 24-hour, and the frames and the app both draw "6:00 AM". That is a separate decision.
 */
function dateLocale(lang: string): string {
  return lang === 'en' ? 'en-GB' : lang;
}

/**
 * "Wed 3 June" — the frame's day-header format, localised by the browser.
 *
 * `timeZone: 'UTC'` is not decoration. Every formatter below is handed a `Date` built
 * with `Date.UTC`, which is a way of saying "these components, no zone" — and
 * `Intl.DateTimeFormat` then renders it in the READER's zone unless told otherwise. West
 * of Greenwich that turns midnight UTC into the previous evening, so a trip day dated
 * 31 August displayed "Sun, 30 August" to a reader in New York. The trip carries no
 * timezone and none is wanted: the stored value is the day, and UTC is how you ask for it
 * back unchanged. Fixed in phase 6 — see formatTime, where the same omission moved every
 * stop's clock.
 */
export function formatDayHeading(date: string | null, lang: string): string | null {
  const parsed = parseIso(date);
  if (!parsed) return null;
  return new Intl.DateTimeFormat(dateLocale(lang), {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)));
}

/** "10 Sept 2026" (ICU's en-GB abbreviation) — never the frame's "09-10-2026", which is
 *  ambiguous between DD-MM and MM-DD and would read as a different date to half the
 *  audience. Day-first in every site language; see `dateLocale`. */
export function formatDate(date: string | null, lang: string): string {
  const parsed = parseIso(date);
  if (!parsed) return '';
  return new Intl.DateTimeFormat(dateLocale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)));
}

/**
 * "Tue 15 Sept 2026" — the date step's echo line: weekday, day, month, year.
 *
 * Why it exists: a native `<input type="date">` displays in the BROWSER's locale, not the
 * site's, and nothing on the page can change that — so the two inputs read `mm/dd/yyyy`
 * on an en-US machine whatever language the site is in. This line under them is in the
 * site's language and in day-first order, with the weekday, which is also the part of a
 * date people actually check a trip against. It is the whole of the date step's design
 * (PHASE-6-PLAN §18.3, option C): the inputs stay native for keyboard, screen reader,
 * locale and RTL, and the sentence carries what they cannot.
 */
export function formatDateLong(date: string | null, lang: string): string {
  const parsed = parseIso(date);
  if (!parsed) return '';
  return new Intl.DateTimeFormat(dateLocale(lang), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)));
}

/**
 * Stored "HH:MM" in the reader's locale. The stored value is the server's clock-of-day
 * and carries no zone; it is displayed, **never converted**.
 *
 * It was being converted. Without `timeZone: 'UTC'` the formatter renders the UTC instant
 * this function builds in whatever zone the reader's device is in, so a stop stored at
 * `09:00` displayed as **11:00 AM** in Cyprus (measured, Europe/Bucharest, 30 Aug 2026)
 * and as 5:00 AM in New York in summer. Every time on every trip was wrong by the reader's offset,
 * and the comment above this function said the opposite the whole time.
 *
 * It matters more from phase 6 on, not less: a generated day starts at the profile's
 * morning threshold — 08:00, 09:00 or 10:00 — and a Cyprus traveller was being shown a
 * plan that began two or three hours after the one the server built.
 */
export function formatTime(hhmm: string | null | undefined, lang: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!match) return '';
  const [, h, m] = match;
  return new Intl.DateTimeFormat(lang, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, Number(h), Number(m))));
}
