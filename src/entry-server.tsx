import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { App } from "./App";

export { philosophers } from "./data/philosophers";

/** Used by scripts/prerender.ts to emit static HTML for every route. */
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
}
