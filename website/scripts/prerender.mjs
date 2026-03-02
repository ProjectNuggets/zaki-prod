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

const { renderLanding } = await import(pathToFileURL(resolve(distSsrDir, ssrEntryFile)).href);

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
  const jsonLdScripts = Object.entries(structuredData)
    .map(
      ([key, value]) =>
        `<script type="application/ld+json" id="zaki-${key}-jsonld">${JSON.stringify(value)}</script>`
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
    <link rel="alternate" hreflang="en" href="https://chatzaki.com/" />
    <link rel="alternate" hreflang="ar" href="https://chatzaki.com/ar/" />
    <link rel="alternate" hreflang="x-default" href="https://chatzaki.com/" />

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
    <meta property="og:locale:alternate" content="${escapeHtml(seo.altLocaleTag)}" />
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

function injectPage(template, locale) {
  const rendered = renderLanding(locale);
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

writeFileSync(resolve(distDir, "index.html"), injectPage(templateHtml, "en"));
mkdirSync(resolve(distDir, "ar"), { recursive: true });
writeFileSync(resolve(distDir, "ar", "index.html"), injectPage(templateHtml, "ar"));

rmSync(distSsrDir, { recursive: true, force: true });
