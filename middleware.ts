import { next, rewrite } from "@vercel/functions";

/**
 * Slack crops the wide preview image to a small square. Its crawler gets /slack, the same page
 * pointing at a square wall of faces (see scripts/prerender.ts). Everyone else gets "/".
 * A rewrite in vercel.json can't do this: the static index.html wins over it.
 */
export const config = { matcher: "/" };

export default function middleware(request: Request) {
  if (/slackbot/i.test(request.headers.get("user-agent") ?? "")) return rewrite(new URL("/slack", request.url));
  return next();
}
