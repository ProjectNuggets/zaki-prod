// Stable Tailwind 3 + PostCSS build
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function setDownloadAssetHeaders(req, res, next) {
  const pathname = (req.url || "").split("?")[0];

  if (pathname.endsWith(".xlsx")) {
    res.setHeader("Content-Type", XLSX_MIME);
    res.setHeader("X-Content-Type-Options", "nosniff");
  }

  if (pathname.endsWith(".pdf")) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Content-Type-Options", "nosniff");
  }

  next();
}

function downloadAssetHeaders() {
  return {
    name: "nova-download-asset-headers",
    configureServer(server) {
      server.middlewares.use(setDownloadAssetHeaders);
    },
    configurePreviewServer(server) {
      server.middlewares.use(setDownloadAssetHeaders);
    },
  };
}

export default defineConfig({
  plugins: [downloadAssetHeaders(), react()],
  server: {
    host: "0.0.0.0",
  },
});
