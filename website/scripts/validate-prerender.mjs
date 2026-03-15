import { readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const distDir = resolve(process.cwd(), "dist");
const distSsrDir = resolve(process.cwd(), "dist-ssr");
const __dirname = dirname(fileURLToPath(import.meta.url));
const ssrEntryFile = readdirSync(distSsrDir).find((file) => /^entry-server\.(m?js|cjs)$/.test(file));

if (!ssrEntryFile) {
  throw new Error("Could not find SSR entry output in website/dist-ssr for validation.");
}

const { routeRegistry } = await import(pathToFileURL(resolve(distSsrDir, ssrEntryFile)).href);
const routes = routeRegistry.map((route) => route.pathname);

function routeToFile(route) {
  if (route === "/") return resolve(distDir, "index.html");
  return resolve(distDir, route.slice(1), "index.html");
}

for (const route of routeRegistry) {
  const target = routeToFile(route.pathname);
  if (!existsSync(target)) {
    throw new Error(`Missing prerendered HTML for ${route.pathname}: ${target}`);
  }
  const html = readFileSync(target, "utf8");
  if (!/<title>.+<\/title>/i.test(html)) {
    throw new Error(`Missing title tag for ${route.pathname}`);
  }
  if (!/meta\s+name="description"/i.test(html)) {
    throw new Error(`Missing meta description for ${route.pathname}`);
  }
  if (!/link\s+rel="canonical"/i.test(html)) {
    throw new Error(`Missing canonical for ${route.pathname}`);
  }
  if (route.requiresAlternates) {
    const alternates = html.match(/link\s+rel="alternate"\s+hreflang="[^"]+"/gi) ?? [];
    if (alternates.length < 3) {
      throw new Error(`Missing complete hreflang chain for ${route.pathname}`);
    }
  }
  if (route.requiresSchema && !/application\/ld\+json/i.test(html)) {
    throw new Error(`Missing JSON-LD schema for ${route.pathname}`);
  }
}

console.log(`Validated ${routes.length} prerendered routes.`);
rmSync(distSsrDir, { recursive: true, force: true });
