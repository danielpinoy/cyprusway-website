# Phase 4 — Ask Pete on the web

Branch `web-phase-4`, from `web-phase-3`.

Frames: chat default `3558-17951`, limit reached `3571-37223`, premium `3571-37748`.

Everything in §0 was run against the deployed function or read out of the deployed
commit, not inferred. Where the brief and the deployment disagree, the deployment is
recorded here and the disagreement is in §16.

---

## 0 · What I checked, and what came back

### 0.1 Four probes against the live function

`POST https://knvjmsnwzskbageetbam.supabase.co/functions/v1/mike`, 28 Aug 2026:

| Sent | Status | Body |
|---|---|---|
| `OPTIONS` preflight | **204** | `Access-Control-Allow-Origin: *`, allows `authorization, content-type, x-client-info, apikey`, methods `POST, OPTIONS` |
| No `Authorization` header | **401** | `{"code":"UNAUTHORIZED_NO_AUTH_HEADER","message":"Missing authorization header"}` |
| `Authorization: Bearer <anon key>` | **401** | `{"error":"unauthorized","detail":"invalid token"}` |
| `Authorization: Bearer not.a.jwt` | **401** | `{"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"}` |

**CORS is open — that part of the brief holds.** The 401s carry
`Access-Control-Allow-Origin: *`, so a browser can read the body rather than seeing an
opaque network error.

**`verify_jwt` is ON, not off.** Two independent confirmations: the gateway answered
`UNAUTHORIZED_NO_AUTH_HEADER` before the function ran, and the deploy commit
(`4e90661`) says in as many words *"Deployed honouring config.toml's verify_jwt = true"*.
`config.toml` line 42 reads `verify_jwt = true`. See §16.1 — it changes nothing about the
client, but it changes which of two error shapes arrives.

### 0.2 The deployed build is the source I read

`4e90661` verified the deploy per file by SHA-256 against the downloaded bundle
("All four files MATCH after"). One commit has touched `mike` since — `85f612d`, +37/−2
on `index.ts`. I diffed it: it adds a `retrieval_state` enum persisted to `ai_messages`
for telemetry (migration 0042). **It does not touch the SSE contract, `meta`, the request
shape or any status code.** So whichever of the two builds is live, the client contract
below is identical.

### 0.3 Retrieval is on, which is what makes place chips real

`MIKE_RAG_ENABLED` was flipped to `true` in production at **2026-08-25 11:47:55 UTC**
(recorded in `4e90661`). This matters more than it looks: under the echo model
`meta.places` is non-empty *only* when the client asserts a `place_id`, and the web's
Ask Pete screen has no place context. With retrieval on, ordinary questions return up
to three verified catalogue rows. The chips in the frame will actually populate.

---

## 1 · The contract

### Request

```
POST {SUPABASE_URL}/functions/v1/mike
Authorization: Bearer <user access token>
Content-Type: application/json
Accept: text/event-stream

{ "message": string }            // and optionally "place_id": number
```

`ACCEPTED_REQUEST_KEYS = {message, place_id}` and **unknown keys are a 400** — nothing
speculative goes in the body. `message` must be non-empty after trim and ≤ 4000 chars
server-side; the app caps at 500 per spec §9 and the web will too (§7.4).

### Response — 200 `text/event-stream`

Events are written by one helper, ``sseEvent(d) => `data: ${JSON.stringify(d)}\n\n` ``,
and the stream ends with `data: [DONE]\n\n`. There are no `event:`, `id:` or `retry:`
fields and no multi-line `data:` continuations.

```
data: {"type":"text","content":"<delta>"}          // many
data: {"type":"meta", ...}                          // exactly one, last
data: [DONE]
```

or, if OpenAI fails after the 200 headers are already gone:

```
data: {"type":"error","code":"stream_failed","message":"Stream failed"}
```

### `meta`, in full

```json
{ "type": "meta", "message_id": 42, "model": "gpt-4.1-mini",
  "input_tokens": 318, "output_tokens": 204,
  "remaining": 4, "is_premium": false, "places": [ … ] }
```

`remaining` is the allowance left **after** this message; `-1` means premium. `places` is
always present and always an array, capped server-side at `MIKE_PLACE_REF_CAP = 3`.
`message_id`, `model` and the token counts exist for the server's cost analysis; the web
will not model them, on the app's stated principle that a type is a claim about what was
validated.

### Errors — three channels, all of which the client must read

1. **Ours:** `{"error":"<snake_case>","detail":"<prose>"}`. Codes: `method_not_allowed`,
   `unauthorized`, `invalid_request`, `account_required`, `place_not_found`,
   `rate_limited`, `upstream`. The 429 carries `remaining` and `is_premium` as siblings.
   `detail` names internal steps and is never rendered.
2. **Mid-stream, on a 200:** `{"type":"error","code":"stream_failed"}`.
3. **The gateway's, not ours:** `{"code":"…","message":"…"}` — no `error`, no `detail`.
   With `verify_jwt = true` this is what a browser sees for *most* auth failures.

Branch on the typed code first, status second. Never on prose — it breaks across five
languages.

---

## 2 · The daily cap — the change has not landed

**Checked, not assumed.** `MIKE_FREE_DAILY_CAP` appears exactly twice in the function: as
the env read at `index.ts:76`, and at `index.ts:237` as the `daily_cap` argument to the
`consume_ai_query` RPC. It is **not in the `meta` event**, it is not in any other
response, the `cyprusway-directus` working tree is clean, and
`git log --all -S"daily_cap"` across every branch turns up nothing that would add it.
The post-deploy delta (§0.2) does not add it either.

**So the fallback case applies.** The web will carry:

```ts
/**
 * TODO(contracts): mike does not report the cap. `meta` carries `remaining` and
 * `is_premium` and nothing else about the allowance, so the denominator in
 * "3 of 5 today" is a MIRROR of the server's MIKE_FREE_DAILY_CAP — if that secret
 * is changed, this goes stale silently and the counter lies.
 *
 * Expected field: `meta.daily_cap` (number). The moment it exists, delete this
 * constant and read it — the whole reason it is written like this, rather than as a
 * bare 5, is that a second hardcoded copy of a server constant is the thing worth
 * not having.
 */
const ASSUMED_FREE_DAILY_CAP = 5;
```

and it will **self-correct upward** the way the app does, because one thing the server
does report constrains the cap:

```ts
// After a successful turn cap = used + remaining and used is at least 1, so
// `remaining + 1` is a floor on the real cap. From the counter row, `used` itself is
// a floor. Neither can be wrong in the other direction and neither costs a request.
capFromRemaining = (previous, remaining) => Math.max(previous ?? ASSUMED, remaining + 1);
capFromUsed = (used) => Math.max(ASSUMED, used);
```

That is not a substitute for the server emitting it — a *lowered* cap is still invisible
— but it turns one of the two failure directions into a non-event.

**Counter semantics — the frame counts used, not remaining.** The limit frame reads
"5 of 5 today" in red, so the first number is questions *used*: `used = cap − remaining`.
Read as "remaining" it would say "0 of 5" at the limit. Getting this backwards inverts
the whole pill, so it is written down. The visible string stays as drawn; the pill gets
an accessible name that removes the ambiguity ("5 of 5 questions used today").

---

## 3 · The reset boundary — and a conflict with entry 64

The brief says entry 64 rules the reset follows the **Cyprus calendar day**. I could not
verify that, and what is deployed does something else.

- **`meta` does not carry a reset time.** No `resets_at`, no `reset_at`, nowhere in any
  function.
- **The RPC uses `CURRENT_DATE`.** `0031_consume_ai_query_no_user.sql` compares and
  writes `ai_queries_reset_at < CURRENT_DATE`. `CURRENT_DATE` is evaluated in the
  database's timezone; **no migration sets one**, so it is Supabase's default, UTC.
- **The app agrees it is UTC**, in as many words: *"Apply the same midnight-UTC rule the
  RPC uses"*, `new Date().toISOString().slice(0, 10)`.
- **Entry 64 could not be read, because the copy in the app repo stops at 49.**
  `cyprusway-app/docs/CyprusWay_Decision_Log_v3_0.md` and
  `cyprusway-directus/docs/CyprusWay_Decision_Log_v3_0.md` are byte-identical, 1299 lines
  each, and their last entry is 49. Entry 50 exists only as a draft file. Entries 50 to 64
  are somewhere neither checkout can see.

  **That stale copy has now cost something twice.** Phase 3 could not verify the entry that
  ruled `viewpoints-landmarks` out of `nature_trails` and had to re-derive it from the
  catalogue; phase 4 could not verify the reset-boundary ruling and had to re-derive it from
  the migration. Both times the answer came out right, and both times the checking was work
  that a current log would have made unnecessary. It is the cheapest fix on this list.

Midnight UTC is **03:00 in Cyprus** under EEST and 02:00 under EET. So for three hours
every night a Cyprus user's allowance has already reset while a Cyprus-calendar client
would still say zero — or the reverse, depending which side you implement.

**What I will do.** Mirror the app exactly: compare `ai_queries_reset_at` against the UTC
date, purely to stop a stale counter reading zero after rollover, and **make no
user-facing claim about when the reset happens**. The copy is "Pete is back tomorrow",
not a time and not a countdown. A screen that names an hour it cannot substantiate is
worse than one that does not mention it.

**And a correction, if entry 64 is real:** this cannot be fixed in a client. If the reset
should follow the Cyprus day, the change belongs in `consume_ai_query`
(`(now() AT TIME ZONE 'Asia/Nicosia')::date`), because a client applying a Cyprus-day
rule against a server applying a UTC one would show five prompts available while the
server refuses them. **→ Q3.**

---

## 4 · Place chips — verified: slugs, so they link

**The answer is the first of your three cases.** `meta.places` entries are:

```ts
interface PlaceRef {
  id: number;
  slug: string | null;
  name: string;            // already localised server-side, English fallback
  category: string | null;
  hero_image_url: string | null;   // BARE 2000px Directus original, not chip-ready
}
```

Both producers carry the slug — `toPlaceRef` (the `place_id` echo path) and
`retrievedToPlaceRef` (the retrieval path, from `match_places_pete`, ordered by ascending
distance and sliced to 3).

So the chips become `<Link to={`/place/${slug}`}>`, and Pete becomes the strongest entry
point on the site: an answer that names Konnos Bay hands you the page for it.

Four things I will hold to:

1. **Validate, do not cast.** A row without a non-empty string `slug`, `name` or integer
   `id` is dropped rather than rendered — the same rule `toPlace` applies in the app. The
   server types `slug` as `string | null`, so a null is contract-legal and must not
   produce `/place/null`.
2. **Never parse prose.** These are rows the server put in front of the model. A chip can
   therefore never point at somewhere Pete invented — which is not hypothetical: the
   retrieval write-up records Pete fabricating *"Stin Yialo Tavern (listed in CyprusWay)"*
   when ungrounded, against 181 real rows where nothing of the sort exists.
3. **Cross-check the slug against the catalogue before linking.** The web already holds
   all 181 places (`fetchPlaces`) on other routes. Ask Pete does not need that query, so
   I will not add it — but a slug that 404s lands on the phase-3 place-page not-found,
   which is a designed state, so this is safe without it. Noted rather than built.
4. **`hero_image_url` is not used.** The frame's chip is a pin icon and a name; no image
   is drawn, which is just as well, since the URL is a 2000px original that would have to
   go through `directusImageUrl` first, and it is null for the majority of places.

The chip's colour is a contrast failure as drawn — see §10.

---

## 5 · Signed out — what actually comes back, and the design

### What comes back

**A signed-out web visitor gets `{"error":"unauthorized","detail":"invalid token"}`, 401.**
Not `account_required`. That is worth being precise about, because the app's guest state
and the web's are different conditions:

- In the app, a "guest" is a Supabase **anonymous session** — genuinely authenticated,
  `is_anonymous: true` — and `mike` refuses it at step 3 with **403 `account_required`**.
- The web has no anonymous auth. A signed-out visitor has **no session at all**, so
  `supabase-js` sends the project anon key as the bearer. That key is a valid project JWT,
  so it clears the gateway, reaches the handler, and dies at `getUser()` → **401
  `unauthorized`**. I confirmed this with the third probe in §0.1.

There is no useful response for a signed-out caller. So:

### The design: never send the request

The client gates on session state before it composes anything. `unauthorized` remains
mapped in the failure table as a backstop — a token can expire between page load and send
— but the signed-out visitor is never routed into it.

**The screen does the prompting, not the entry points.** The nav item, the hero input and
the footer link all go to `/ask-pete` for everyone. Sending a signed-out visitor somewhere
else, or dimming the entry points again, would keep Ask Pete invisible on a public
marketing site — and this is likely the most common state the screen will ever render.

What the signed-out screen shows, top to bottom:

- Title, subtitle — unchanged.
- **No counter pill and no upgrade link.** There is no allowance to report. The app is
  explicit about why: the quota read *succeeds* for a session with no entitlement and
  returns a full five, and "a counter promising five prompts they cannot spend is the lie
  the whole guest state exists to stop telling."
- **Pete's opening message and the three suggestion chips, rendered exactly as drawn.**
  This is the part worth arguing for: it is the only honest demonstration of what the
  screen is, it is real product copy rather than a marketing paraphrase, and it is what
  makes the page worth prerendering and indexing at all.
- **The chips are not inert.** Clicking one puts that question in the box and then asks
  for sign-in, so the intent survives the round trip. It is also the natural sign-in
  trigger — a person who has just chosen a question has a reason to make an account.
- **In place of the composer, a sign-in panel** — the app's `GuestPanel` shape, adapted:
  a line saying Pete needs a free account, that everything saved comes with it, and a
  button that opens the existing phase-1 auth modal. Not a disabled composer: a text box
  you cannot type in is worse than an honest panel.

After signing in, the modal returns to `/ask-pete` (the phase-1 Q5 behaviour: close, stay
put, signed in), the thread loads, and the pre-filled question is still in the box.

---

## 6 · Streaming over browser `fetch`

The app's constraint does not exist here. It injects `expo/fetch` because React Native's
`fetch` is an XHR polyfill whose `response.body` is `null` — so the stream could only be
read once finished. The web has a real `ReadableStream` on `response.body`, so a plain
`fetch` is the whole mechanism and there is no `fetchImpl` seam to build.

**But I will not port the app's reader, and this is the one place I want to do better
rather than mirror.** It carries two fragilities its own header records, both of which
delete answer text *silently*:

> 1. An event is treated as a single line. An `id:` or `event:` field before the `data:`,
>    or SSE's legal multi-line `data:` continuation, would make the whole event fall
>    through the `startsWith` guard.
> 2. The trailing buffer is never flushed after `done`, so a final event not terminated by
>    a blank line is discarded.

The app says fixing either "is its own pass against a live stream". The web is a new
client with no legacy, so it gets the correct parser now: split the buffer on `\n\n`,
then for each event take *every* line beginning `data:`, join their payloads with `\n`,
ignore `event:`/`id:`/`retry:`/comment lines, and **flush the trailing buffer after
`done`**. That is a dozen lines and it removes both failure modes. Fragility 2 is not
theoretical: `[DONE]` is the last thing written and the writer is closed immediately
after, so a final event arriving without its terminator is exactly the shape at risk.

**Not verified, and I will say so:** I have not driven an authenticated stream. That needs
a real user JWT, and I will not create an account to mint one. What I did verify is the
framing — the only writer is `sseEvent`, its output is `data: <json>\n\n`, and no other
SSE field is ever emitted — plus that the transport reaches the browser at all (CORS
preflight 204, error bodies readable cross-origin). The first live stream is the first
thing I will run in phase 4 proper. **→ Q1** offers the cheapest way to close this now.

Also carried over from the contract, and shaping the UI:

- **The allowance is spent before OpenAI is called.** A timeout or a stream error still
  burns one of five. **Never auto-retry** — that spends a second allowance on the same
  question. Where the server rejected the turn before recording it, the question goes back
  in the composer instead, which is a retry the person controls.
- **An `AbortController` tied to unmount**, so navigating away does not leave a reader
  running. The server persists both messages after the stream completes, independently of
  whether the client is still listening, so history reconciles on the next load either
  way.

---

## 7 · The screen

### 7.1 Route

**`/ask-pete`.** Phase 1 wired *no* path — both `PRIMARY_NAV` and `MENU_NAV` carry
`{ id: 'ask-pete', labelKey: 'nav_ap', pending: true }` with no `to`, and there is no
`ask-pete.html` on `main`, so there is no legacy URL to preserve. `/ask-pete` is chosen
because it is the app's own route (`src/app/(app)/ask-pete.tsx`) and it matches the nav
id already in the table.

`nav_ap` is **already translated into all five languages** — "Frag Pete", "Ρωτήστε τον
Pete", "Zapytaj Pete'a", "Fråga Pete". Making the item real costs no new strings, and it
removes three more "Coming soon" labels (header, overlay menu, footer Discover).

Prerendered like every other route, added to `ROUTE_META` and the sitemap.

**Corrected during the build, because the first version of this claim was wrong.** I wrote
that the signed-out state is what a crawler sees. It is not: `useSession` starts
`resolving` on the server and on the client alike, so the prerendered file carries the
loading shape, and the signed-out panel appears once the session resolves. What a crawler
without JavaScript gets is the title, description and canonical plus a skeleton — the same
as `/explore`, and for the same reason.

Rendering the greeting during `resolving` would have fixed that, since it depends on no
session. It was rejected: a returning visitor with a thread would see "Hi! I am Pete, what
can I help with?" flash before their own conversation replaced it, which is precisely the
lie §7.3 exists to prevent. A brief skeleton for everyone beats a false fresh start for the
people who use it most.

**Carrying phase 3's lesson forward:** the prerendered file has no session, and a
signed-in visitor hydrates against it. That is the same hazard that produced the Explore
chip bug — React does not patch attribute mismatches found during hydration, so anything
that disagrees at first render stays wrong for the life of the page. It is safe here for
the same reason the region row was safe: `useSession` starts `resolving` on both sides and
the screen renders its loading shape until the session lands. Nothing on this screen may
be derived from a session, a query string or `localStorage` during the first render. This
gets an explicit comment rather than being left to luck.

### 7.2 Layout

Sand ground, one centred column (~702px), the phase-1 `Layout` shell above and below.

| Element | Treatment |
|---|---|
| Title / subtitle | "Ask Pete" H1 navy, "Cyprus travel assistant" grey-3 |
| Counter row | pill left, upgrade link right — **the link is omitted** (§9) |
| Thread | timestamp above the first message of a group; bot left with 40px avatar and a white bubble (radius 24, square top-left); user right, `black 10%` fill, square bottom-right |
| Place chips | pin icon + name, inline under the answer text, inside the bubble |
| Composer | white card, radius 12, textarea + action bar, gold circular send |

### 7.3 The opening message and chips

Client-side copy, never sent and never persisted, and rendered **only when the server's
history window came back empty**. Above a loaded thread it would be a lie: `mike` keeps
one rolling conversation per person, so "Hi! I am Pete — what can I help with?" over three
exchanges from yesterday is the screen claiming an amnesia the server does not have.

The three starters are the app's `STARTERS`, word for word, and identical to the frame:
"Best beach near me" / "What should I do tonight?" / "Know about Cyprus history or
culture?"

### 7.4 The thread is shared, and the screen must show that

`ai_conversations` is `UNIQUE (user_id)`. The web reads the same window the server reads —
`ai_messages`, last `HISTORY_WINDOW = 6`, ordered `created_at DESC, id DESC` then
reversed — so the thread is a *view* of Pete's memory rather than a second, poorer copy.
The `id` tiebreak is load-bearing: `mike` inserts both rows in one transaction and
`now()` is transaction-time, so identical timestamps are normal and would otherwise let an
answer sort above its own question.

Quota comes from `public.users` (`ai_queries_today`, `ai_queries_reset_at`, `is_premium`)
under the existing "users can read own profile" policy — there is no read-only quota
endpoint, and calling the RPC to find out would spend an allowance to display it. Re-read
on mount and after **every** failure, because `meta` only arrives on success while the
allowance is spent regardless.

Message cap 500 chars, mirroring the app and spec §9 (the function allows 4000 as
deliberate slack).

---

## 8 · The states the frames do not draw

| State | Trigger | Treatment |
|---|---|---|
| **Loading the thread** | mount, session resolved | Skeleton in the thread area; composer present but send disabled. No greeting until the history read resolves — it is only correct if history came back *empty*, and "not yet read" is not empty. |
| **Empty thread** | history read returned zero rows | Greeting + three chips. This *is* the frame's default state. |
| **Sending** | after send, before the first token | The question appears immediately, right-aligned; Pete's bubble appears with a three-dot indicator; composer disabled; send button shows the pending state. |
| **Streaming** | deltas arriving | Text grows in Pete's bubble. Auto-scroll only while the reader is within ~48px of the bottom — scrolling up to re-read must not be yanked back. Chips appear when `meta` lands, not before. |
| **Stream failed mid-answer** | `{"type":"error","code":"stream_failed"}` on a 200 | **Keep the partial text** — it is a real answer as far as it got — and put a notice under it: "Pete stopped mid-answer. That one still counted, sorry." No retry button. |
| **429 / `rate_limited`** | cap reached | §9. |
| **`unauthorized`** | token expired mid-session | "Your session expired. Sign in again to keep chatting." Opens the auth modal. |
| **`invalid_request`** / **`place_not_found`** | 400 / 404 | Rejected *before* the allowance is consumed, so the copy says nothing was used and the question goes back in the box. |
| **`upstream` / 500 / 405** | server-side | "Pete is having trouble right now. Try again in a moment." |
| **Network failure** | fetch threw | "Couldn't reach Pete. Check your connection and try again." |
| **Signed out** | no session | §5. |
| **Premium** | `is_premium` | No counter row at all — frame `3571-37748` removes the whole row, not just the pill. |

Two rules taken from the app because they are right and were paid for:

**A failure is never rendered as a message from Pete.** It is a notice — no avatar, no
bubble, not in the position an answer occupies. A timeout drawn beside Pete's face reads
as something he said.

**Retract what the server did not record.** `rejectedBeforeRecording` is a contract fact,
not a guess: the order is auth → guest gate → key validation → place fetch →
`consume_ai_query` → OpenAI → persist, so `quota`, `auth`, `account_required`,
`place_not_found` and `invalid_request` all leave no row. Those questions are pulled back
out of the thread and returned to the composer — a question sitting on screen that Pete
has no record of is what makes him look like he ignored it. `transport` and `server` are
deliberately *not* in that list: the request may have arrived and failed afterwards, and
over-claiming in either direction is worse than the ambiguity.

---

## 9 · The limit state, without an upgrade action

The frame fuses the message and the sale into one gold card sitting in Pete's message
position, with Pete's avatar: a crown, "THAT'S ALL 5 FREE QUESTIONS FOR TODAY", a line of
upgrade copy, and a dark "Unlock Unlimited" button. Plus the red counter pill and the
header link.

Per the ruling: **the message ships, the button and the header link do not, and nothing is
rendered disabled.** That leaves three decisions the ruling does not make, and I want them
on the record because two of them change what is drawn.

1. **It cannot stay gold with white text.** Measured: white on `--cw-gold` `#c49a10` is
   **2.63:1**. That is the tenth instance of the family that has produced nine failures
   across three phases.

   **Where the alarm ended up, after building it.** The plan first put the whole notice in
   the alert palette. What shipped splits it: the **counter pill** turns to
   `--cw-alert-tint` with `--cw-alert-text` (**5.11:1**) exactly as the frame draws it, and
   the **sentence underneath stays calm** in a navy tint (`--cw-navy` on `#e4e2de`,
   **8.61:1**). One loud signal and one quiet explanation, rather than two alarms saying the
   same thing. It also keeps the app's ruling intact — the cap costs nothing and is refused
   before anything is spent, and "half of what made Pete look broken was benign refusals
   dressed as breakage".

2. **It should not wear Pete's avatar.** With the upsell removed, what remains is a
   system fact about an account, not something Pete said — and the rule in §8 applies to
   it exactly as it applies to a timeout. It renders as a notice.

3. **The composer stays, with the question still in it.** The frame keeps the composer
   and dims the send button. Send stays disabled while `remaining === 0`; the text is not
   cleared. Copy: *"That's all {cap} for today. Pete is back tomorrow — your question is
   still in the box."* — with `{cap}` interpolated rather than the literal "five" the app
   hardcodes, so the sentence cannot go stale against §2.

The counter pill turns to the alert tint at zero, as drawn.

`PARKED.md` gets one entry: **"Unlock Unlimited — the upgrade path, in two places on the
Ask Pete screen."** It records that `stripeEnabled` is false so there is no purchase to
make, that both the header link and the limit-state button are removed rather than
disabled, that **the limit state is the design's intended conversion moment** and is
therefore the thing to revisit first when Stripe is enabled — not a leftover to rediscover
— and that the gold-and-white treatment must be re-measured, not restored, when the button
comes back.

---

## 10 · Contrast: the frames introduce two failures

Measured against WCAG 2.1 AA, 4.5:1 for text under 18.66px bold / 24px regular.

| Pair | Ratio | |
|---|---|---|
| White on the gold limit banner | **2.63** | **FAIL** → alert tint + `--cw-alert-text`, 5.11 (§9) |
| Gold `#c49a10` place-chip text on the white bubble | **2.63** | **FAIL** → `--cw-gold-link` `#7f640a`, **5.63** on white |
| `--cw-alert-text` on `--cw-alert-tint` | 5.11 | pass |
| Black-2 answer text on the white bubble | 10.58 | pass |
| Black-1 on the user bubble (`black 10%` over sand) | 11.98 | pass |
| Black-1 on the white counter pill | 17.01 | pass |
| Grey-3 placeholder on white | 6.08 | pass |
| Grey-3 timestamp on sand | 5.36 | pass |
| White on the "Unlock Unlimited" button `#816717` | 5.40 | pass — but parked |

Both failures are the same family the project keeps hitting, and both already have a
measured phase-1 token waiting for them. `--cw-gold-link` was created in phase 1 for
exactly this — gold-coloured text that has to be readable — and has been sitting unused.

The chips keep the underline. It is in the frame, and it is the only non-colour signal
that they are links.

---

## 11 · RTL

A chat thread is the most directional thing this site has, and every part of it mirrors.
The build already fails on physical CSS properties (`check-logical-css.mjs`), which covers
most of it, but four things are not CSS:

1. **Message alignment and the avatar side.** Bot messages start at the inline start, user
   messages at the inline end; the avatar follows. Logical properties only — no `left`,
   no `right`, no `flex-direction: row-reverse` hacks.
2. **The bubble's square corner.** The bot bubble is square at the top *inline-start*
   corner and the user bubble at the bottom *inline-end* — `border-start-start-radius`
   and friends, so the tail points at the right speaker in both directions.
3. **The send arrow.** It is an up arrow in the frame, which does not mirror. If it
   becomes a horizontal arrow it goes in `MIRRORED` in `src/lib/dir.ts` — the list exists
   so nobody has to guess.
4. **The scrolling thread is a new consumer of the direction bug.** Phase 2 found
   `scrollByInline` direction-broken and fixed it, and phase 3 added `inlineArrowStep` for
   keyboard cases. A chat thread scrolls on the **block** axis, where RTL changes nothing —
   so the one thing to be careful about is not reaching for the inline helpers by reflex.
   The horizontally-scrolling piece here is the suggestion-chip row, which is a native
   scroller and needs no helper.

---

## 12 · Model output inside a translated interface

This turned out to be the most interesting thing I found, and it is a defect rather than
a philosophical question.

**Pete already replies in the user's language.** `mike` fetches `preferred_language` from
`public.users` and the system prompt says: *"Respond in {languageName}. If the user writes
in a different language, match their language for that response."* All five web languages
— en, pl, de, el, sv — are in `LANGUAGE_NAMES`, exactly matching the web's `LANGUAGES`.
Place-chip names are localised server-side too, with an English fallback.

**But the web's language switcher never writes that column.** `preferred_language` appears
nowhere in `src/`; `I18nProvider.setLanguage` writes `localStorage` and nothing else. So a
signed-in visitor who switches the site to Greek gets a Greek interface and Pete replying
in whatever their *app* profile says — English, for anyone who has never opened the app.
Greek chrome around English answers, in the same column, with no explanation.

**Recommendation.** When a signed-in visitor changes the language, write
`public.users.preferred_language`. It is one `update`, the values are identical
vocabularies, the row is the shared profile by design, and a language switcher is an
explicit statement of preference rather than an incidental UI toggle. The consequence has
to be stated plainly rather than buried: **it also changes the app's language**, because
it is one row. That is a product decision, so **→ Q2**.

Three things are true regardless of Q2 and go in the plan either way:

- **Pete's replies are never translated by us.** They are generated, once, in one language,
  and they are not in the dictionary. `TRANSLATION-QUEUE.md` gets a note saying so
  explicitly, so no future translator looks for them.
- **The bubble carries no `lang` override.** Phases 2 and 3 put `lang="en"` on catalogue
  names and prose because those are English on all 181 rows. Pete's text is *not* reliably
  any one language — it follows the profile, and it follows the user's own language when
  they write in another. Asserting `lang="en"` there would tell a screen reader to
  pronounce Greek with English phonemes. The safe answer is to inherit the document
  language and add nothing.
- **The interface strings around him are ours and are translated normally.**

---

## 13 · Accessibility

**The streaming answer.** A live region that fires per token is unusable — a screen
reader would read a word, interrupt itself, read two words. So: the growing bubble is
`aria-live="off"` while streaming, and **the completed answer is announced once**, when
`meta` or the stream close lands, via a polite live region carrying the finished text.
The state changes around it are announced separately and cheaply: "Pete is answering" when
the request goes out, and the notice text on failure.

Also:

- The thread is a labelled region; each message is an `<article>` with a visually hidden
  speaker label, so "Pete said" / "You said" is available without relying on which side of
  the column a bubble sits on.
- Timestamps get a `<time datetime>` with a full accessible string, not just "Wed 8:21 AM".
- The composer is a real `<form>`: Enter sends, Shift+Enter breaks the line, and there is a
  real submit button rather than a click handler on a div.
- Suggestion chips are `<button>`s, not divs.
- Place chips are links with an accessible name that says what they are — the visible text
  is a bare place name, and "Ayia Napa" alone does not say it goes to a page.
- The counter pill is `role="status"` and announces on change, with the unambiguous name
  from §2.
- Send is disabled on empty input, while sending, and at the cap — with the reason in the
  accessible name each time, since a disabled control that does not say why is the
  complaint phase 1 already fixed twice.

---

## 14 · The `+` affordance — omitted

In the frame it is a 32px `--cw-grey-1` circle with a Carbon "Add-Large" glyph, at the
inline start of the composer action bar. It has no behaviour anywhere I can find:

- No handler, no target, no variant in the frame.
- **The app never built it.** Its composer has one control — send. There is no plus, no
  attachment, no picker.
- The function accepts exactly two keys, `message` and `place_id`, and rejects anything
  else with a 400. There is no upload path, no attachment column, and no storage bucket in
  play.

So it is drawn but undefined, and inventing an attachment feature behind it would be
inventing a capability the backend refuses. **It is omitted**, and it goes in `PARKED.md`
with what it would need: a defined behaviour, and — if it is attachments — a request shape
that does not currently exist.

The one plausible reading I can see, and I am *not* building it on a guess: it is the
place-context affordance, "ask about a place", which would attach `place_id`. That
mechanism is real, is already in the contract, and would be the natural way to reach Pete
from a place page. If that is what it is, it is a good feature and a small one. **→ Q4.**

---

## 15 · Found while in the files

**Documentation drift in `mike/README.md`, three places.** Not blocking, and I am not
touching another repo without being asked, but a client author reading it would be misled:

- Its "Response shape" example predates `places` in `meta`, so the chip contract is absent
  from the README entirely.
- Its error examples are the pre-v31 prose shape — `{ "error": "Daily message limit
  reached" }` and `{ "error": "Invalid token" }` — where the deployed function returns
  `{"error":"rate_limited","detail":"…","remaining":0,"is_premium":false}` and
  `{"error":"unauthorized","detail":"invalid token"}`. A client that branched on the
  README's strings would break on every one of the five launch languages, which is the
  exact thing the typed codes were introduced to stop.
- The prose says Pete "does **not** query the curated places database, does not embed
  queries, does not perform RAG" — while the deployment block two screens down says
  `supabase secrets set MIKE_RAG_ENABLED=true`, and retrieval has been on in production
  since 25 August.

The `index.ts` file header is accurate and is what I read. It is also the only place all
three error channels are written down, which is worth saying out loud.

**Nothing wrong found in phases 1–3 this round.** The one real defect from last round —
the prerender pass writing outside `dist` for an unsafe slug — was fixed and is staged.

---

## 16 · Disagreements

**16.1 `verify_jwt` is true, not false.** The brief says the function is deployed with
`verify_jwt = false`. It is not: the gateway rejected my header-less probe with
`UNAUTHORIZED_NO_AUTH_HEADER` before the function ran, `config.toml` line 42 says `true`,
and the deploy commit says it deployed honouring that. It changes nothing about what I
build — the client sends a bearer either way — but it decides *which shape* an auth
failure arrives in, and a client that only handled `{"error":…}` would read the gateway's
`{"code":…}` as an unrecognised failure. The web will read both, plus the status, in that
order. Worth correcting in case the intent was to open the function to anonymous callers,
because that has not happened.

**16.2 The reset boundary is UTC, not the Cyprus day.** §3. I could not find entry 64 in
either repo — both decision logs stop at 49 — and everything I *can* read says midnight
UTC. If entry 64 is real, the client is the wrong place to fix it.

**16.3 The limit banner cannot ship as drawn.** §9.1. White on gold is 2.63:1. This is not
a preference; it is the tenth of a family that has produced nine failures, on the one
screen where the reader is already frustrated.

**16.4 The limit message should not wear Pete's avatar.** §9.2. Smaller, and I will follow
a different ruling happily — but with the sale removed, what is left is a fact about an
account, and the app's own rule says that does not go in Pete's mouth.

**16.5 The place chips need a different gold.** §10. Also 2.63:1, also already solved by a
phase-1 token that has been sitting unused since it was created.

---

## 17 · Questions

**Q1 — A user JWT, so the first live stream is verified rather than assumed.**
Everything in §1 is read from the deployed source and confirmed against the deploy digest,
and the transport is probed — but I have not driven an authenticated stream, and I will not
create an account to mint a token. The cheapest close: paste a session access token, or run
the README's smoke curl yourself and paste the first twenty lines. Either answers, in one
shot, whether `meta` on the live build carries anything the source does not, and what
`places` looks like on a real question now that retrieval is on. **If you would rather not,
say so — I will build against the contract as read and verify on the first signed-in run,
and I will not claim the stream is verified until then.**

**Q2 — Should the web's language switcher write `public.users.preferred_language`?**
§12. Today it does not, so a Greek interface can carry English answers. Writing it fixes
that in one `update` — and also changes the language of the app on the user's phone,
because it is one shared row. My recommendation is yes, for signed-in users only, from the
explicit switcher only. But it is a cross-device side effect from a control that does not
advertise one, so it is yours.

**Q3 — Entry 64: is the reset the Cyprus day or midnight UTC?** §3. If Cyprus, the fix is
`consume_ai_query`, not the client, and it is a backend ticket rather than phase-4 work. I
will build the UTC mirror either way, since that is what the server does today, and make no
user-facing claim about the hour.

**Q4 — The `+`: is it the place-context affordance?** §14. If it is "ask Pete about this
place", the mechanism already exists (`place_id`), it is verified before the allowance is
consumed, and it would make `meta.places` populate on the echo path as well as retrieval.
If it is attachments, there is no backend for it and it stays parked. If you do not know
either, it stays omitted — that is the default and it needs no answer.

**Q5 — Does the counter pill count questions used, or questions left?** §2. I read the
frames as *used* because the limit state says "5 of 5", which only works that way. Confirm,
because reading it backwards inverts the number on every render.
