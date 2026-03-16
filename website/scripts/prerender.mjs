import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");
const distDir = resolve(websiteRoot, "dist");
const distSsrDir = resolve(websiteRoot, "dist-ssr");
const ssrEntryFile = readdirSync(distSsrDir).find((file) => /^entry-server\.(m?js|cjs)$/.test(file));

if (!ssrEntryFile) {
  throw new Error("Could not find SSR entry output in website/dist-ssr.");
}

const { renderRoute, getPrerenderRoutes, routeRegistry } = await import(pathToFileURL(resolve(distSsrDir, ssrEntryFile)).href);

const templatePath = resolve(distDir, "index.html");
const templateHtml = readFileSync(templatePath, "utf8");

const seoStart = "<!-- SEO:START -->";
const seoEnd = "<!-- SEO:END -->";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function buildSeoBlock({ seo, structuredData }) {
  const jsonLdScripts = structuredData
    .map(
      (value, index) =>
        `<script type="application/ld+json" id="zaki-jsonld-${index}">${JSON.stringify(value)}</script>`
    )
    .join("\n    ");

  return `${seoStart}
    <title>${escapeHtml(seo.title)}</title>
    <meta
      name="description"
      content="${escapeHtml(seo.description)}"
    />
    <meta
      name="keywords"
      content="${escapeHtml(seo.keywords)}"
    />
    <meta name="author" content="Nova Nuggets" />
    <meta name="application-name" content="ZAKI AI" />
    <meta name="apple-mobile-web-app-title" content="ZAKI AI" />
    <meta
      name="robots"
      content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    />
    <meta name="theme-color" content="#fcfcfd" />
    <link rel="canonical" href="${escapeHtml(seo.canonical)}" />
    ${Object.entries(seo.alternates)
      .map(([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
      .join("\n    ")}

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="ZAKI AI" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta
      property="og:description"
      content="${escapeHtml(seo.description)}"
    />
    <meta property="og:url" content="${escapeHtml(seo.canonical)}" />
    <meta property="og:image" content="https://chatzaki.com/slides/1.png" />
    <meta property="og:image:secure_url" content="https://chatzaki.com/slides/1.png" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(seo.imageAlt)}" />
    <meta property="og:locale" content="${escapeHtml(seo.localeTag)}" />
    ${seo.altLocaleTag && seo.altLocaleTag !== seo.localeTag ? `<meta property="og:locale:alternate" content="${escapeHtml(seo.altLocaleTag)}" />` : ""}
    <meta property="og:updated_time" content="${escapeHtml(seo.updatedAt)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta
      name="twitter:description"
      content="${escapeHtml(seo.description)}"
    />
    <meta name="twitter:image" content="https://chatzaki.com/slides/1.png" />
    <meta name="twitter:image:alt" content="${escapeHtml(seo.imageAlt)}" />
    ${jsonLdScripts}
    ${seoEnd}`;
}

function injectPage(template, pathname) {
  const rendered = renderRoute(pathname);
  const seoBlock = buildSeoBlock(rendered);

  let html = template.replace(
    new RegExp(`${seoStart}[\\s\\S]*?${seoEnd}`),
    seoBlock
  );

  html = html.replace(/<html[^>]*lang="[^"]*"[^>]*>/i, `<html lang="${rendered.lang}" dir="${rendered.dir}">`);
  html = html.replace(/<div id="root"><\/div>/, `<div id="root">${rendered.appHtml}</div>`);
  if (!/<html[^>]*dir=/i.test(html)) {
    html = html.replace(/<html[^>]*lang="[^"]*"/i, `<html lang="${rendered.lang}" dir="${rendered.dir}"`);
  }
  return html;
}

function buildSitemapXml(routes) {
  const today = "2026-03-15";
  const byPath = new Map(routeRegistry.map((route) => [route.pathname, route]));
  const absoluteUrl = (pathname) =>
    pathname === "/" ? "https://chatzaki.com/" : `https://chatzaki.com${pathname}`;

  const body = routes
    .map((routePath) => {
      const route = byPath.get(routePath);
      const alternates = Object.entries(renderRoute(routePath).seo.alternates)
        .map(
          ([hreflang, href]) =>
            `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`
        )
        .join("\n");

      return `  <url>\n    <loc>${absoluteUrl(routePath)}</loc>\n    <lastmod>${today}</lastmod>${
        alternates ? `\n${alternates}` : ""
      }\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset\n  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n  xmlns:xhtml="http://www.w3.org/1999/xhtml"\n>\n${body}\n</urlset>\n`;
}

const routes = getPrerenderRoutes();

for (const route of routes) {
  const html = injectPage(templateHtml, route);
  const routeDir = route === "/" ? distDir : resolve(distDir, route.slice(1));
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(resolve(routeDir, "index.html"), html);
}

writeFileSync(resolve(distDir, "sitemap.xml"), buildSitemapXml(routes));
