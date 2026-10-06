# AGENTS.md

## Ship to main

We are the only users of this project. Mainline every change:

- Commit straight to `main` and push. No feature branches, no PRs.
- Every push to `main` deploys to production on Vercel (https://philosophy-virid.vercel.app).
- Before you push, run `npm run build`. It typechecks, builds, and prerenders every route. Do not push a failing build.
- Also run `npm run e2e` (Playwright, phone and desktop). Look at the screens it saves in `test-results/shots/`.
- After you push, confirm the deploy is `READY` (`vercel ls` or the Vercel dashboard) and check the live site.

## Project

- Vite + React + TypeScript + Tailwind + Framer Motion. Static site, no backend.
- All content lives in `src/data/philosophers.ts`. See `README.md` for structure.
- Vercel config is in `vercel.json`.
