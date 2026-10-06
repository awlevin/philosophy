# Philosophers Quick Reference

Sixty-one philosophers, Thales to Foucault, as a scannable wall of faces (or a timeline list). Open
one and the card morphs into a museum-placard page of 4–6 big, skimmable facts.

Vite · React · TypeScript · Tailwind · Framer Motion. Static site, no backend.

```sh
npm install
npm run dev              # http://localhost:5173
npm run build            # typecheck, client build, SSR build, prerender every route into dist/
npm run preview
npm run fetch-portraits  # (re)download portraits from Wikidata / Wikimedia Commons
npm run e2e              # Playwright, phone + desktop-dark (screens in test-results/shots); BASE_URL=… to test a deploy
```

## How it's put together

- **Data** — everything lives in [`src/data/philosophers.ts`](src/data/philosophers.ts), typed by
  [`src/data/types.ts`](src/data/types.ts) (Era, Tradition, Big Question taxonomies included).
  Each philosopher has a one-line `take` for every Big Question they're tagged with, shown in the
  peek sheet while that question is filtered; `scripts/check-data.ts` (first step of the build)
  keeps takes and tags in sync.
- **Routes** — `/` is the grid; `/p/:slug` is a detail page. The grid stays mounted underneath the
  detail page, so the portrait and name share a Framer Motion `layoutId` and morph card → page and
  back again (including on the browser back button), and the grid keeps its scroll and filters.
- **Gallery** — three views: Faces (default), List, or Classic (the original flat, sepia grid,
  set page-wide via `<html data-look="classic">`). Faces and List are grouped by era (by time) or by initial (A–Z).
  The choice of view is remembered per device (`src/lib/view.ts`). In Faces and List, on touch screens a tap opens a peek sheet (face, dates, and their take on any
  filtered question, else a fact); "Open" or a swipe up goes to the full page; tapping the face again puts the peek away. Peeking is
  on while filtering; otherwise a tap opens the page unless "When you tap a face" under Show as is set to "Peek first".
- **Color** — each era has a color, an ink and a tint (`--era-*` tokens in `src/index.css`, scoped
  to an element with `eraVars()` from `src/lib/era.ts`). Portraits sit on their era's tint.
- **Filters** — a menu per facet (Era, Tradition, Big question) with counts, plus Order and the
  view: popovers on larger screens, bottom sheets from a row of pills on phones (`FilterBar.tsx`,
  `Menu.tsx`). OR within a group, AND across groups. Search (`SearchField.tsx`, debounced, with a clear button) matches names and birthplaces, diacritic-insensitive. Filters
  and order are mirrored in the URL, e.g. `/?era=ancient,medieval&question=live&sort=alpha&q=th`.
  Chips on a detail page ("See others like …") filter the gallery; the tapped chip flies into the
  bar, and "Back to …" returns to the page.
- **Quiz** — `/quiz` (one quiet card under the home header leads there): react to 14 statements on a
  five-step scale, see after each who's with you and who isn't, then get your closest five and five
  to argue with. Statements and each philosopher's stance on them live in
  [`src/data/quiz.ts`](src/data/quiz.ts); `scripts/check-data.ts` makes sure every source line is
  quoted verbatim from that philosopher's facts or takes, and that everyone has at least two stances.
  Scoring is in `src/lib/quiz.ts`. The last finished run is kept in `localStorage`; with it, the
  home card shows your closest three, Order gains "For you" (`?sort=match`: closest ten, in between,
  furthest ten, with each match %), and detail pages show "You & …".
- **Detail navigation** — prev/next buttons, ← / → keys, swipe sideways on touch screens, pull down from
  the top to close (`src/lib/usePullToDismiss.ts`), Esc to close.
- **Prerendering** — `npm run build` renders `/`, `/quiz` and all 61 `/p/:slug` pages to static HTML
  (`dist/index.html`, `dist/quiz.html`, `dist/p/{slug}.html`) and hydrates on load, so text paints before the JS
  arrives. Other paths fall back to the SPA (`vercel.json` on Vercel, `public/_redirects` on Netlify).

## Deploying to Vercel

Live at https://philosophy-virid.vercel.app. The GitHub repo is connected to the Vercel project
`philosophy`, so every push to `main` deploys to production.

`vercel.json` is set up: Vite preset, `npm run build`, output `dist`, `cleanUrls` so
`/p/plato` serves the prerendered `p/plato.html`, an SPA fallback, and long-lived caching for
hashed assets.

## Portraits

`scripts/fetch-portraits.ts` reads each philosopher's Wikidata **P18** image (or a hand-picked
Commons file in `OVERRIDES` where P18 is unsuitable), pulls author + license from the Commons
`imageinfo`/`extmetadata` API, rejects anything that isn't public domain, CC0 or CC BY(-SA), and
writes `public/portraits/{slug}.jpg` (600w) plus `{slug}-480.jpg` and `{slug}-320.jpg` for the grid,
each with an `.avif` twin. It
then rewrites that entry's `portrait: { … }` line in the data file. Hand-tuned `focus`
(object-position) and `zoom` values are preserved across runs.

Wikimedia rate-limits API calls from shared IPs; the script backs off and, if the API keeps
returning 429, falls back to `Special:EntityData` and the rendered File: page (which carries the
same license templates `extmetadata` reads).

Philosophers without a usable free image fall back to a generated monogram medallion
(currently none — Nāgārjuna's P18 is "Copyrighted free use", so an override supplies a CC BY 4.0 image of a
Heian-period painting instead).
