import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const websiteRoot = resolve(__dirname, "..");
const distDir = resolve(websiteRoot, "dist");
const distSsrDir = resolve(websiteRoot, "dist-ssr");
const ssrEntryFile = readdirSync(distSsrDir).find((file) => /^entry-server\.(m?js|cjs)$/.test(file));

if (!ssrEntryFile) {
  throw new Error("Could not find SSR entry output in nova-website/dist-ssr.");
}

const { renderRoute, routes } = await import(pathToFileURL(resolve(distSsrDir, ssrEntryFile)).href);
const templatePath = resolve(distDir, "index.html");
const templateHtml = readFileSync(templatePath, "utf8");

const seoStart = "<!-- SEO:START -->";
const seoEnd = "<!-- SEO:END -->";
const siteUrl = "https://novanuggets.com";
const defaultOgImage = `${siteUrl}/assets/social/nova-nuggets-og.png`;
const logoImage = `${siteUrl}/assets/nova-nuggets-logo.png`;

const routeSeoTopics = {
  home: [
    "owned AI workforce",
    "AI workforce operating partner",
    "private AI infrastructure",
    "ZAKI managed agents",
    "NooX AI inferencing computer",
  ],
  "nova-orbit": [
    "NovaOrbit AI maturity assessment",
    "last mile between AI and humans",
    "AI infrastructure and access assessment",
    "AI applications and agents assessment",
    "AI operations and impact framework",
  ],
  "nova-orbit-sample-report": [
    "NovaOrbit sample report",
    "AI maturity assessment example",
    "AI assessment deliverables",
    "AI workflow assessment readout",
    "first workflow AI roadmap",
  ],
  "what-we-do": [
    "full-stack AI service provider",
    "AI transformation consulting",
    "RAG",
    "fine-tuning",
    "process automation",
  ],
  deploy: [
    "AI infrastructure deployment",
    "private AI deployment",
    "on-prem AI inference",
    "customer cloud AI",
    "NNGTs cloud",
  ],
  proof: [
    "AI workforce proof",
    "enterprise AI case study",
    "German mid-market AI pilot",
    "AI productivity evidence",
  ],
  pricing: [
    "NovaOrbit assessment",
    "NovaOrbit Standard",
    "NovaOrbit In-Depth",
    "managed AI agents pricing",
    "first workflow implementation",
    "AI transformation pricing",
  ],
  team: [
    "AI workforce team",
    "AI operators",
    "Nova Nuggets advisors",
    "sovereign AI expertise",
  ],
  advisory: [
    "executive AI advisory",
    "board AI session",
    "NovaOrbit alignment session",
    "AI maturity sprint",
  ],
  approach: [
    "AI assess build deploy run",
    "AI operating model",
    "AI workflow implementation",
    "NovaOrbit",
  ],
  "ai-workforce": [
    "AI workforce",
    "managed AI agents",
    "employee AI agents",
    "department AI agents",
    "ZAKI agents",
  ],
  architecture: [
    "AI reference architecture",
    "private RAG architecture",
    "agent memory",
    "model routing",
    "AI governance",
  ],
  "nova-orbit-snapshot": [
    "NovaOrbit Snapshot",
    "private AI deployment brief generator",
    "AI workforce evaluation",
    "CTO AI planning tool",
    "NovaOrbit diagnostic",
    "private AI project scoping",
  ],
  "field-notes": [
    "AI workforce field notes",
    "private AI infrastructure essays",
    "sovereign AI",
    "NooX",
    "RAG automation",
  ],
  "field-note-ai-workforce": [
    "AI workforce",
    "managed AI agents",
    "ZAKI agents",
    "employee AI agents",
    "department AI agents",
  ],
  "field-note-private-ai-infrastructure": [
    "private AI infrastructure",
    "AI deployment",
    "on-prem AI inference",
    "customer cloud AI",
    "model serving",
  ],
  "field-note-sovereign-ai": [
    "sovereign AI",
    "German mid-market AI",
    "private AI Germany",
    "enterprise AI governance",
    "data residency",
  ],
  "field-note-rag-automation": [
    "RAG",
    "retrieval augmented generation",
    "AI automation",
    "enterprise memory",
    "workflow automation",
  ],
  "field-note-noox": [
    "NooX",
    "AI inferencing computer",
    "local AI inference",
    "on-prem AI server",
    "private model serving",
  ],
  contact: ["NovaOrbit scoping", "AI workforce consultation", "AI transformation partner"],
  investors: [
    "AI workforce startup",
    "private AI infrastructure company",
    "ZAKI product line",
    "AI infrastructure investment",
  ],
  impressum: ["Nova Nuggets legal notice", "Nova Nuggets Hamburg", "Nova Nuggets Dubai"],
  privacy: ["Nova Nuggets privacy", "AI website privacy", "cookie notice"],
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteUrl(pathname) {
  return pathname === "/" ? `${siteUrl}/` : `${siteUrl}${pathname}`;
}

function buildSeoBlock(route) {
  const canonical = absoluteUrl(route.path);
  const topics = routeSeoTopics[route.slug] ?? routeSeoTopics.home;
  const breadcrumbItems =
    route.path === "/"
      ? []
      : [
          { "@type": "ListItem", position: 1, name: "Nova Nuggets", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: route.label, item: canonical },
        ];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Nova Nuggets",
      alternateName: ["NNGTs", "Nova Nuggets AI"],
      legalName: "NOVA NUGGETS INNOVATION & ARTIFICIAL INTELLIGENCE RESEARCH & CONSULTANCIES L.L.C",
      url: `${siteUrl}/`,
      logo: logoImage,
      email: "hello@novanuggets.com",
      telephone: ["+49 162 94 11131", "+971 527878055"],
      address: {
        "@type": "PostalAddress",
        streetAddress: "Biedermannplatz 8",
        postalCode: "22083",
        addressLocality: "Hamburg",
        addressCountry: "DE",
      },
      areaServed: ["DACH", "GCC"],
      description:
        "Nova Nuggets is a full-stack AI service provider for owned AI workforces, private AI infrastructure, NooX inference systems, ZAKI managed agents, AI applications, automation, RAG, fine-tuning, and transformation consulting.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Nova Nuggets",
      alternateName: "NNGTs",
      url: `${siteUrl}/`,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      name: route.title,
      url: canonical,
      description: route.description,
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: topics.map((name) => ({ "@type": "Thing", name })),
      inLanguage: "en",
    },
    {
      "@type": "Service",
      "@id": `${canonical}#service`,
      name: route.title.replace(" | Nova Nuggets", ""),
      serviceType: topics.join(", "),
      provider: { "@id": `${siteUrl}/#organization` },
      areaServed: ["Germany", "United Arab Emirates", "DACH", "GCC"],
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Mid-market and enterprise organizations adopting private AI workforces",
      },
      description: route.description,
    },
    ...(route.path.startsWith("/field-notes/") && route.path !== "/field-notes/"
      ? [
          {
            "@type": "TechArticle",
            "@id": `${canonical}#article`,
            headline: route.title,
            description: route.description,
            url: canonical,
            author: { "@id": `${siteUrl}/#organization` },
            publisher: { "@id": `${siteUrl}/#organization` },
            datePublished: new Date().toISOString().slice(0, 10),
            dateModified: new Date().toISOString().slice(0, 10),
            about: topics.map((name) => ({ "@type": "Thing", name })),
            inLanguage: "en",
          },
        ]
      : []),
    ...(breadcrumbItems.length
      ? [
          {
            "@type": "BreadcrumbList",
            "@id": `${canonical}#breadcrumb`,
            itemListElement: breadcrumbItems,
          },
        ]
      : []),
    ],
  };

  return `${seoStart}
    <title>${escapeHtml(route.title)}</title>
    <meta name="description" content="${escapeHtml(route.description)}" />
    <meta name="author" content="Nova Nuggets" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="theme-color" content="#1a1612" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Nova Nuggets" />
    <meta property="og:title" content="${escapeHtml(route.title)}" />
    <meta property="og:description" content="${escapeHtml(route.description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:image" content="${defaultOgImage}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Nova Nuggets — full-stack AI systems that ship" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(route.title)}" />
    <meta name="twitter:description" content="${escapeHtml(route.description)}" />
    <meta name="twitter:image" content="${defaultOgImage}" />
    <meta name="twitter:image:alt" content="Nova Nuggets — full-stack AI systems that ship" />
    <script type="application/ld+json">${JSON.stringify(schema)}</script>
    ${seoEnd}`;
}

function injectPage(template, routePath) {
  const rendered = renderRoute(routePath);
  let html = template.replace(new RegExp(`${seoStart}[\\s\\S]*?${seoEnd}`), buildSeoBlock(rendered.route));
  html = html.replace(/<html[^>]*lang="[^"]*"[^>]*>/i, `<html lang="${rendered.lang}">`);
  html = html.replace(/<div id="root"><\/div>/, `<div id="root">${rendered.appHtml}</div>`);
  return html;
}

function buildSitemapXml() {
  const today = new Date().toISOString().slice(0, 10);
  const body = routes
    .map(
      (route) =>
        `  <url>\n    <loc>${absoluteUrl(route.path)}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

for (const route of routes) {
  const html = injectPage(templateHtml, route.path);
  const routeDir = route.path === "/" ? distDir : resolve(distDir, route.path.slice(1));
  mkdirSync(routeDir, { recursive: true });
  writeFileSync(resolve(routeDir, "index.html"), html);
}

writeFileSync(resolve(distDir, "sitemap.xml"), buildSitemapXml());
