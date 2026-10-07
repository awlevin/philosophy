# AGENTS.md

## Ship to main

We are the only users of this project. Mainline every change:

- Commit straight to `main` and push. No feature branches, no PRs.
- Before you push, run `npm run build`. It typechecks, builds, and prerenders every route. Do not push a failing build.
- Also run `npm run e2e` (Playwright, phone and desktop). Look at the screens it saves in `test-results/shots/`.

## Deploys

The Vercel account has a limit of 100 deployments a day, shared by every project.

- Every push to `main` deploys to production (https://butwhy.aaronideas.com). Each push spends one deployment, so batch your commits and push to `main` when a piece of work is done, not after every small commit.
- After you push, confirm the deploy is `READY` (`vercel ls` or the Vercel dashboard) and check the live site.
- Branches named `preview/*` get a preview deployment. Other branches get none. Name a branch `preview/<name>` only when someone must look at it on Vercel.
- `git.deploymentEnabled` in `vercel.json` sets this. Do not change it.

## Project

- Vite + React + TypeScript + Tailwind + Framer Motion. Static site, no backend.
- All content lives in `src/data/philosophers.ts`. See `README.md` for structure.
- Vercel config is in `vercel.json`.
