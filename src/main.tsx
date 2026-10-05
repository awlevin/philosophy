import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "./index.css";
import { App } from "./App";

// We restore scroll ourselves (the grid stays mounted under detail pages).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Pages are prerendered without query strings; hydrate only when the HTML matches the URL.
if (root.hasChildNodes() && !location.search) {
  hydrateRoot(root, app);
} else {
  root.textContent = "";
  createRoot(root).render(app);
}
