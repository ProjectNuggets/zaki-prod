import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import "./styles/v3.css";

const rootElement = document.getElementById("root");

// StrictMode removed: its dev-only double-invoke remounts the homepage effect
// and races the async vanilla-script injection, so GSAP pins/choreography fail
// to register in dev. Production is unaffected (StrictMode double-invoke is
// dev-only). See docs/immersive/2026-06-24-homepage-ascent-plan.md, Task 1.
const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

if (rootElement?.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else if (rootElement) {
  createRoot(rootElement).render(app);
}
