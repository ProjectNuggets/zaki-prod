import React from "react";
import { createRoot } from "react-dom/client";
import { LandingApp } from "./components/LandingApp";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LandingApp />
  </React.StrictMode>
);
