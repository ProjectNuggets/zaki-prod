
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>
);
  