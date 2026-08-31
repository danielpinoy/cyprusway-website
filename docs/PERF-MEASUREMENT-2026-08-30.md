# Performance measurement — 30 Aug 2026

The question that prompted it: "Images load slowly on first paint." Measured before
anything was changed. Method: headless Chrome 152 driven over CDP, cache disabled,
the built `dist` served by `vite preview`, talking to the **real** Supabase project and
the **real** Directus on Railway; then the deployed site itself, from Cyprus (Cloudflare
edge `LCA` — Larnaca). Desktop 1440×1000 DPR 1 and mobile 390×844 DPR 3; unthrottled and
a Fast-3G class emulation (1.6 Mbps down, 150 ms RTT, 4× CPU slowdown). LCP and long
tasks captured by a `PerformanceObserver` installed before any page script runs; bytes
are `encodedDataLength` — what actually crossed the wire.

Caveats, honestly: one machine, one location, one day; the throttled numbers are
emulated; and one observation below (a 20.5 s image response) happened once and did not
reproduce.

## The headline, plainly

**The images themselves are already correct.** Every Directus photo on every surface is
WebP at the exact slot size the layout renders — 14 of 14 on the desktop homepage at
natural = rendered, averaging **11 KB each**. Requesting the transforms was verified by
running, not reading: the 2000×1332, 487 KB source JPEG comes back as a **14.5 KB WebP
at 282×300**. The finding is the **340–420 ms TTFB on an already-cached derivative** —
and 716 ms median when a rail requests fifteen at once. That is infrastructure (a
CDN-less origin on Railway), not code.

## 1. Cold homepage — what crosses the wire

Desktop, cache disabled, production backends:

| resource | requests | wire |
|---|---:|---:|
| HTML (prerendered; skeletons only, 0 `<img>`) | 1 | 4.1 KB |
| JS — one chunk, `index-*.js` | 1 | **194 KB** gz (197 KB br in production; 660 KB raw) |
| CSS | 1 | 16.7 KB |
| Font — `inter-latin` only (unicode-range works; the other 6 subsets never load) | 1 | 47 KB |
| Catalogue fetch `places_sync`, 181 rows | 1 (+1 CORS preflight) | 99.5 KB (338 KB decoded) |
| Images | 26 | 294 KB |
| **total** | **33** | **657 KB** |

The 26 images: **14 Directus photos = 155 KB** (avg 11 KB); 12 local = 143 KB, of which
`pete.webp` alone is **76 KB — the largest image on the page** (560×745 shipped for a
302×402 slot) and the 11 category icons are 62 KB (48×48 RGBA PNGs, 4.6–6.5 KB each).
The largest file on the page overall is the JS.

Other surfaces, cold: Explore desktop 27 requests / 563 KB (20 Directus photos, 206 KB).
Mobile DPR 3 picks the 2× srcset candidate: homepage 688 KB (only 7 photos fetched —
lazy loading skips the rails' off-screen cards), **Explore 1,070 KB** (20 × ~35 KB).

## 2. Format, size, and whether responsive sizing is real

Real, on desktop: natural = rendered for every Directus photo (ratio 1.00), because the
slots are fixed-px and `directusImage.ts` requests exactly them with a 1×/2× srcset.
Verified against the source: `?width=282&height=300&fit=cover&quality=70&format=webp&withoutEnlargement=true`
→ 14.5 KB; the same asset at 180×251 → 8 KB; at 564×600 → 49 KB; **a mistyped parameter
(`?w=282`) returns the full 487 KB original**, so the builder's exactness is
load-bearing.

Where it is not exact:

- Mobile DPR 3 gets the 2× candidate — 0.67× of device pixels. That is the standard 2×
  cap; fine, and deliberate.
- **Explore on mobile**: the grid column is 167 CSS px but the slot is 240, so the
  480-wide 2× image is *cropped* by `object-fit: cover`, not downscaled. A 334-wide
  image would do: ≈ −250 KB of the 708 KB image load. (Held — see decisions.)
- `pete.webp` at 1.85× (76 KB where ~30 would do); category icons at 1.5× on DPR 1.

## 3. `directusImage` and the source

The builder does everything the source supports: width/height/fit/quality/format
transforms, `withoutEnlargement`, 30-day `Cache-Control` on derivatives. The cost is
**where the derivatives are served from** — Directus on Railway, no CDN in front
(`Server: railway-hikari`, no cache-status header of any kind):

| measurement | value |
|---|---|
| cached 11 KB derivative, single request (curl ×4) | TTFB **340–420 ms** (DNS 5 + TCP 55 + TLS 60 + **~250–290 ms origin**) |
| `/server/health` (no asset work at all) | 330–530 ms |
| 15 rail images requested within 2 ms (production run) | min 423 / **median 716** / max 1,040 ms |
| never-before-requested size (transform generated) | 0.9–1.1 s first, ~0.4 s after |
| observed **once**, not reproduced in ~30 later requests | 20.5 s — consistent with a Railway service waking from sleep; worth checking the service's App Sleeping setting |
| Cloudflare-served files on the same page, same run | **39–54 ms** (CSS 20 KB, `pete.webp` 78 KB) |

That last row is the comparison that matters: same page, same moment, same client —
a CDN-served 78 KB file arrives 13× faster than an 11 KB Directus derivative.

## 4. LCP — the number and the path

**Desktop homepage, deployed site, from Cyprus, fast line: LCP = 1,224 ms.** The element
is the first Top Recommendations photo (282×300). The path:

```
    0– 74   HTML (Cloudflare HIT)                        ~15%  HTML+JS
   80– 178  JS, 203 KB br
  178– 319  hydrate + effects                            ~12%
  321– 403  CORS preflight ─┐
  319– 694  catalogue fetch ┘  338 KB JSON               ~31%
  694– 747  render cards
  747–1230  first photo from Directus                    ~39%
      1224  LCP paint
```

| page / condition | FCP | LCP | LCP element |
|---|---:|---:|---|
| `/` production, desktop, cold | 232 | **1,224** | rail photo |
| `/` local build, desktop, unthrottled | 108 | 1,604 | rail photo |
| `/` Fast-3G class + 4× CPU | 624 | **3,604** | rail photo |
| `/explore` production warm / local / throttled | — | 856 / 1,212 / 3,160 | grid photo |
| `/place/petra-tou-romiou` desktop | 48 | 1,284 | gallery main (eager, 55 KB) |
| `/` mobile 390×844 | 56 | 56 (600 throttled) | **hero subtitle text** |
| `/about` desktop / throttled | 56 / 644 | 136 / 1,860 | paragraph text |

On mobile the first photo's top edge sits at y = 786 in an 844 px viewport — the photos
are below the fold, so LCP is text and paints at FCP. What a phone user experiences as
"slow images" is the rails after scrolling: each card fills 450–1,550 ms after entering
the viewport, and a rail's off-screen cards load only when swiped.

Long tasks: zero unthrottled on every page; 4 totalling 439 ms on the throttled
homepage (hydration), worst 159 ms.

## 5. What is already right — and what was missing

Right: transforms + WebP + q70 + `withoutEnlargement`; explicit `width`/`height` on
every `<img>` (no image-driven layout shift anywhere); `loading="lazy"` on rails;
`decoding="async"` on cards and gallery; only the latin font subset downloads (47 of
218 KB shipped); `font-display: swap`; one 17 KB CSS file; language dictionaries
code-split; 4 KB HTML; the place gallery's main image is eager (it is that page's LCP).

Missing, as of this measurement: no `fetchpriority` anywhere; the four above-fold
desktop cards were lazy; no `preconnect` to either backend; no `public/_headers`, so
Cloudflare Pages served the content-hashed assets with `max-age=0, must-revalidate` —
every page open revalidated JS + CSS (304s measured at 22 ms in-browser, 57–67 ms via
curl).

## Side finding — Explore scrolled sideways, live

`document.scrollWidth` 1,770 on a 1,440 desktop and 1,674 at 390 mobile, on production.
Cause pinned by hiding candidates one class at a time: the chips' visually-hidden count
spans (`, 12`) are `position: absolute`; their containing block was `.row`
(`position: relative`) but the clipping scroll container is `.scroller` (static,
`overflow-x: auto`) — so the spans escaped the clip and parked at the un-scrolled chip
row's full width. Hiding `.cw-visually-hidden` → 1,425. Fix: `position: relative` on
`.scroller`. The chain, as measured:

```
span.cw-visually-hidden[absolute] < button.chip[static] < div.scroller[static, overflow-x: auto]
                                  < div.row[relative]   ← containing block was here, outside the clip
```

## The Supabase SDK — measured, not assumed

The working assumption was "~120 KB, lazy on most pages." Measured: **not lazy on any
page.** `supabase.ts` was statically imported by ten modules, so the SDK sits in the
single chunk everywhere; only *instantiation* is deferred, and instantiation happens on
every page once session status resolves. Sourcemap attribution of the 675 KB chunk
(compressed shares proportional):

| slice | raw | ≈ compressed |
|---|---:|---:|
| `@supabase/*` (auth 96.5 + realtime 30.6 + phoenix 25.7 + storage 21.6 + postgrest 15.2 + core 10.3 + functions 2.8) | **203 KB** | **59 KB (30%)** |
| react-dom | 180 KB | 52 KB |
| app code + i18n + content prose | ≈ 200 KB | 58 KB |
| react-router | 38 KB | 11 KB |
| lucide-react | 17 KB | 5 KB |

It matters because the chunk is on the LCP path of every rail page: the catalogue fetch
cannot start until the chunk is parsed. On throttled mobile the fetch began at
1,750 ms — ~1,450 ms of that was JS download. The anonymous catalogue read does not
need the SDK at all: a plain GET with `apikey` in the query string returns 200 in
290 ms **with no CORS preflight**.

## 192 prerendered pages

The cost is CPU, not bytes: the chunk is fetched once and cached (after the `_headers`
fix, without revalidation). Hydration: 14–20 ms on a prose page unthrottled, 99 ms on
the production homepage, 111–195 ms at 4× CPU with a worst long task ~150 ms. Not the
problem it was suspected to be.

## Recommendations, in cost order — and what was decided (31 Aug)

| # | change | measured worth | decision |
|---|---|---|---|
| 1 | `public/_headers`: `/assets/*` → immutable, 1 y | −22–60 ms per page open; no revalidation | **built** |
| 2 | `preconnect` to Directus + Supabase | ~120 ms of connection setup moved off the critical path | **built** |
| 3 | `.scroller { position: relative }` | not perf — ends the live sideways scroll | **built first, as its own commit** — a live bug does not wait behind performance work |
| 4 | Top-4 cards + gallery main: `loading="eager"` / `fetchpriority="high"` | removes the ~40 ms render→request gap; puts the LCP candidates first in a queue whose spread is 423→1,040 ms (est. up to ~300 ms) | **built** |
| 5 | icons → SVG; `pete.webp` proper srcset; Explore-mobile 334-wide slot | ≈ −100 KB homepage, −250 KB Explore mobile; off the LCP path | **held** |
| 6 | CDN in front of Directus `/assets/*` | the biggest lever on the actual complaint: 716 ms median → ~50 ms per photo; homepage LCP ≈ 1,224 → ~700 ms; mobile rails fill near-instantly | **owner: PM** — being set up outside this repo; the origin-shape note below is the input |
| 7 | catalogue read off the SDK (plain fetch, `apikey` in query, `preload as="fetch"` in the HTML) + dynamic-import the SDK | −82 ms preflight; the fetch starts at ~10 ms instead of 319 (desktop) / 1,750 (throttled mobile); −59 KB compressed off the critical chunk | **built** |
| 8 | prerender the rails with real cards | images requested at ~30 ms instead of 747 → LCP ≈ 550 ms once the CDN exists | **held — to be costed properly first.** The signed-in re-rank flash is already a recorded problem (the prerendered sign-in flash, PARKED.md), and prerendering real cards makes it worse before it makes it better |

Not worth doing now, recorded so nobody re-derives them: `sizes`/w-descriptors on
desktop (already exact); font preload (only 47 KB loads, swap is in place, and it would
compete with the JS for bandwidth); route-level code splitting (content + trip +
planner ≈ 25 KB compressed, combined).

### The origin-shape note for item 6

Verified 31 Aug 2026: **assets, API and admin are one hostname.** On
`cyprusway-directus-production.up.railway.app`, `/admin` answers 200 with the admin
HTML and `/server/info` answers 200 with project JSON — the same origin that serves
`/assets/*`. So pointing a Cloudflare-proxied hostname at Railway proxies the admin and
the API through it too; the admin remains reachable on the new name unless a WAF or
path rule blocks everything except `/assets/*` on that hostname. Two more inputs from
the Directus repo: `PUBLIC_URL` exists in its `.env.example` (Directus supports living
behind a different public hostname), and the storage driver is **Supabase Storage
first** (`STORAGE_LOCATIONS=supabase,local` — decision log §642), which is a plausible
source of the ~250–290 ms per-request origin overhead: an asset request that misses the
local derivative cache reads from Supabase Storage before it can stream.

Expected after 1–4 and 7: desktop homepage LCP 1.2 s → ~0.8–0.9 s (the Directus origin
remains the floor until 6); throttled-mobile time-to-photos 3.6 s → ~2 s.
