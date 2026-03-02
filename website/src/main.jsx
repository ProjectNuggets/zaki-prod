import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { LandingApp } from "./components/LandingApp";
import "./styles.css";

const rootElement = document.getElementById("root");
const app = (
  <React.StrictMode>
    <LandingApp />
  </React.StrictMode>
);

if (rootElement?.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else if (rootElement) {
  createRoot(rootElement).render(app);
}
