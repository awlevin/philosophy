# AGENTS.md

## Ship to main

We are the only users of this project. Mainline every change:

- Commit straight to `main` and push. No feature branches, no PRs.
- Before you push, run `npm run build`. It typechecks, builds, and prerenders every route. Do not push a failing build.
- Also run `npm run e2e` (Playwright, phone and desktop). Look at the screens it saves in `test-results/shots/`.

## Deploys

The Vercel account has a limit of 100 deployments a day, shared by every project. Do not spend them on every push.

- A push to `main` does not deploy. The `hourly production deploy` GitHub Action deploys `main` to production (https://philosophy-virid.vercel.app) once an hour, and only when `main` changed since the last deploy.
- If the change must be live now, run `gh workflow run hourly-deploy.yml`. Do not run `vercel deploy --prod`; the workflow keeps track of what it shipped.
- Only branches named `preview/*` get a preview deployment. Other branches get none. Name a branch `preview/<name>` only when someone must look at it on Vercel.
- After a deploy, confirm it is `READY` (`vercel ls` or the Vercel dashboard) and check the live site.
- Do not change `git.deploymentEnabled` in `vercel.json` or the workflow to deploy on every push.

## Project

- Vite + React + TypeScript + Tailwind + Framer Motion. Static site, no backend.
- All content lives in `src/data/philosophers.ts`. See `README.md` for structure.
- Vercel config is in `vercel.json`.
