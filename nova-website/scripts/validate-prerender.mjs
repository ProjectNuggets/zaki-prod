import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const distDir = resolve(process.cwd(), "dist");
const distSsrDir = resolve(process.cwd(), "dist-ssr");
const ssrEntryFile = readdirSync(distSsrDir).find((file) => /^entry-server\.(m?js|cjs)$/.test(file));

if (!ssrEntryFile) {
  throw new Error("Could not find SSR entry output in dist-ssr.");
}

const { routes } = await import(pathToFileURL(resolve(distSsrDir, ssrEntryFile)).href);

for (const route of routes) {
  const htmlPath = route.path === "/" ? resolve(distDir, "index.html") : resolve(distDir, route.path.slice(1), "index.html");
  if (!existsSync(htmlPath)) {
    throw new Error(`Missing prerendered route: ${route.path}`);
  }

  const html = readFileSync(htmlPath, "utf8");
  if (!html.includes("Nova Nuggets") || !html.includes("<title>")) {
    throw new Error(`Invalid prerendered HTML for route: ${route.path}`);
  }

  if (!html.includes(`href="https://novanuggets.com${route.path === "/" ? "/" : route.path}"`)) {
    throw new Error(`Missing canonical URL for route: ${route.path}`);
  }
}

if (!existsSync(resolve(distDir, "sitemap.xml"))) {
  throw new Error("Missing sitemap.xml");
}

console.log(`Validated ${routes.length} Nova Nuggets prerendered routes.`);
