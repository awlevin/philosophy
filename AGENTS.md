# AGENTS.md

## Ship to main

We are the only users of this project. Mainline every change:

- Commit straight to `main` and push. No feature branches, no PRs.
- Before you push, run `npm run build`. It typechecks, builds, and prerenders every route. Do not push a failing build.
- Also run `npm run e2e` (Playwright, phone and desktop). Look at the screens it saves in `test-results/shots/`.

## Deploys

The Vercel account has a limit of 100 deployments a day, shared by every project. Deploys are manual, so none are spent by accident.

- A push to `main` does not deploy. Production (https://philosophy-virid.vercel.app) changes only when someone runs the `production deploy` GitHub Action.
- Deploy when Aaron asks for it, or when a batch of work on `main` is finished and should be live. Do not deploy after every commit. Run `gh workflow run deploy.yml`. It does nothing if `main` has not changed since the last deploy.
- Do not run `vercel deploy --prod`. The workflow keeps track of what it shipped, with the `deployed` tag.
- After a deploy, confirm it is `READY` (`vercel ls` or the Vercel dashboard) and check the live site.
- Only branches named `preview/*` get a preview deployment. Other branches get none. Name a branch `preview/<name>` only when someone must look at it on Vercel.
- Do not change `git.deploymentEnabled` in `vercel.json`, and do not add a schedule or a push trigger to the workflow.

## Project

- Vite + React + TypeScript + Tailwind + Framer Motion. Static site, no backend.
- All content lives in `src/data/philosophers.ts`. See `README.md` for structure.
- Vercel config is in `vercel.json`.
