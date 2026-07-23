import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(websiteRoot, "launch-draft");
const host = process.env.HOST || "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "4173", 10);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"]
]);

async function existingFile(candidate) {
  try {
    const details = await stat(candidate);
    if (details.isFile()) return candidate;
    if (details.isDirectory()) return existingFile(resolve(candidate, "index.html"));
  } catch {
    return null;
  }
  return null;
}

async function resolveRequest(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  } catch {
    return null;
  }

  const candidate = resolve(sourceRoot, `.${pathname}`);
  if (candidate !== sourceRoot && !candidate.startsWith(`${sourceRoot}${sep}`)) return null;

  const direct = await existingFile(candidate);
  if (direct) return direct;
  if (!extname(candidate)) return existingFile(`${candidate}.html`);
  return null;
}

const server = createServer(async (request, response) => {
  const file = await resolveRequest(request.url || "/");
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes.get(extname(file)) || "application/octet-stream"
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`ZAKI launch draft: http://${host}:${port}/`);
});
