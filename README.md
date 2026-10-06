# Philosophers — a cheat sheet

Sixty-one philosophers, Thales to Foucault, as a scannable grid of faces. Click one and the card
morphs into a museum-placard page of 4–6 big, skimmable facts.

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
- **Routes** — `/` is the grid; `/p/:slug` is a detail page. The grid stays mounted underneath the
  detail page, so the portrait and name share a Framer Motion `layoutId` and morph card → page and
  back again (including on the browser back button), and the grid keeps its scroll and filters.
- **Filters** — Era / Tradition / Big Question chips (OR within a group, AND across groups), name
  search (diacritic-insensitive), chronological or A–Z sort. All of it is mirrored in the URL,
  e.g. `/?era=ancient,medieval&question=live&sort=alpha&q=th`.
- **Detail navigation** — prev/next buttons, ← / → keys, swipe on touch screens, Esc to close.
- **Prerendering** — `npm run build` renders `/` and all 61 `/p/:slug` pages to static HTML
  (`dist/index.html`, `dist/p/{slug}.html`) and hydrates on load, so text paints before the JS
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
