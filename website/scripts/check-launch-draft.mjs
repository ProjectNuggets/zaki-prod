import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(websiteRoot, process.argv[2] || "launch-draft");
const read = (file) => readFileSync(join(root, file), "utf8");
const cacheVersion = "20260723-v5";

const requiredFiles = [
  "index.html",
  "play/index.html",
  "mascot.css",
  "mascot.js",
  "game.js",
  "env.js",
  "release.json",
  "robots.txt",
  "sitemap.xml",
  "site.webmanifest",
  "llms.txt",
  "site/runtime-config.js",
  "site/js/matter.js",
  "site/js/three.js",
  "site/js/organism.js",
  "site/fonts/bricolage-grotesque-latin.woff2",
  "site/fonts/geist-mono-latin.woff2",
  "site/assets/zaki-worker-full.png",
  "site/assets/zee-agent-sunglasses.png",
  "site/assets/apple-touch-icon.png",
  "site/assets/favicon.svg",
  "site/assets/nova-nuggets-particle-mark.png",
  "products/agent/index.html",
  "products/spaces/index.html",
  "products/minutes/index.html",
  "products/design/index.html",
  "pricing/index.html",
  "privacy/index.html",
  "terms/index.html",
  "compliance/index.html"
];

requiredFiles.forEach((file) => assert.equal(existsSync(join(root, file)), true, `missing ${file}`));

const htmlFiles = [];
function walk(dir) {
  readdirSync(dir).forEach((name) => {
    const absolute = join(dir, name);
    if (statSync(absolute).isDirectory()) walk(absolute);
    else if (name.endsWith(".html")) htmlFiles.push(absolute);
  });
}
walk(root);

const htmlDocuments = htmlFiles.map((absolute) => ({
  absolute,
  relative: absolute.slice(root.length + 1),
  html: readFileSync(absolute, "utf8")
}));
const publicHtml = htmlDocuments.map(({ html }) => html).join("\n");

htmlDocuments.forEach(({ relative, html }) => {
  assert.match(html, /<html[^>]+data-website-version="5\.0\.0"/, `${relative}: V5 marker`);
  assert.match(html, /<title>[^<]+<\/title>/, `${relative}: title`);
  assert.match(html, /<meta name="description" content="[^"]+">/, `${relative}: description`);
  assert.match(html, /<link rel="canonical" href="https:\/\/chatzaki\.com\//, `${relative}: canonical`);
  assert.match(html, /<meta name="theme-color" content="#[0-9A-Fa-f]{6}">/, `${relative}: theme color`);
  assert.match(html, new RegExp(`<link rel="icon" type="image/svg\\+xml" href="/site/assets/favicon\\.svg\\?v=${cacheVersion}">`), `${relative}: versioned V4 favicon`);
  assert.match(html, new RegExp(`<link rel="apple-touch-icon" href="/site/assets/apple-touch-icon\\.png\\?v=${cacheVersion}">`), `${relative}: versioned Apple touch icon`);
  assert.match(html, new RegExp(`<link rel="manifest" href="/site\\.webmanifest\\?v=${cacheVersion}">`), `${relative}: versioned web manifest`);
  assert.match(html, /<meta property="og:title" content="[^"]+">/, `${relative}: Open Graph title`);
  assert.match(html, /<meta property="og:description" content="[^"]+">/, `${relative}: Open Graph description`);
  assert.match(html, /<meta property="og:image" content="https:\/\/chatzaki\.com\/site\/assets\/og\.png">/, `${relative}: Open Graph image`);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, `${relative}: Twitter card`);
  assert.match(html, /<script type="application\/ld\+json">/, `${relative}: structured data`);
  assert.match(html, /<script src="\/env\.js"><\/script>/, `${relative}: environment bootstrap`);
  assert.match(html, /<script defer src="\/site\/runtime-config\.js\?v=5\.0\.0"><\/script>/, `${relative}: runtime config`);
  if (relative === "index.html" || relative === "play/index.html") {
    assert.match(html, new RegExp(`href="/mascot\\.css\\?v=${cacheVersion}"`), `${relative}: versioned mascot stylesheet`);
    assert.match(html, new RegExp(`src="/mascot\\.js\\?v=${cacheVersion}"`), `${relative}: versioned mascot script`);
    assert.match(html, new RegExp(`src="/zee-run\\.js\\?v=${cacheVersion}"`), `${relative}: versioned ZEE Run script`);
  }
  if (/^(?:pricing|privacy|terms|compliance|products\/)/.test(relative)) {
    assert.match(html, new RegExp(`href="/site/product\\.css\\?v=${cacheVersion}"`), `${relative}: versioned product stylesheet`);
  }
  if (relative.startsWith("products/")) {
    assert.match(html, new RegExp(`src="/site/product\\.js\\?v=${cacheVersion}"`), `${relative}: versioned product script`);
  }
  if (relative === "play/index.html") assert.match(html, /<meta name="robots" content="noindex,nofollow">/, `${relative}: game noindex`);
  else assert.match(html, /<meta name="robots" content="index,follow">/, `${relative}: production index directive`);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|#)/.test(reference)) continue;
    const path = reference.split(/[?#]/, 1)[0];
    if (!path.startsWith("/")) continue;
    const local = path === "/" ? "index.html" : path.endsWith("/") ? `${path.slice(1)}index.html` : path.slice(1);
    assert.equal(existsSync(join(root, local)), true, `${relative}: broken internal reference ${reference}`);
  }
});

const html = read("index.html");
const playHtml = read("play/index.html");
const mascot = read("mascot.js");
const zeeRun = read("zee-run.js");
const product = read("site/product.js");
const organism = read("site/js/organism.js");
const runtimeConfig = read("site/runtime-config.js");
const nginx = readFileSync(join(websiteRoot, "nginx.conf"), "utf8");
const pricing = read("pricing/index.html");
const policies = read("privacy/index.html") + read("terms/index.html") + read("compliance/index.html");
const llms = read("llms.txt");
const favicon = read("site/assets/favicon.svg");
const manifest = read("site.webmanifest");
const release = JSON.parse(read("release.json"));

assert.deepEqual(release, {
  name: "ZAKI Website",
  version: "5.0.0",
  release: "V5",
  promotion: "staging-first"
});
assert.match(html, /<meta name="robots" content="index,follow">/);
assert.match(playHtml, /<meta name="robots" content="noindex,nofollow">/);
assert.match(html, /cs-guide-gate|This site is awake|AI that actually ships/);
assert.match(mascot, /function startGuide|cs-ai-mascot|cs-guide-gate/);
assert.match(zeeRun, /window\.__csGame|ZEE RUN|zee-run/);
assert.match(zeeRun, /metaKey \|\| event\.ctrlKey[\s\S]{0,180}event\.stopPropagation\(\)/, "ZEE Run consumes global chat shortcut");
assert.match(mascot, /openGameSoon|Play ZEE Run|data-game/);
assert.match(mascot, /function hasBlockingModal\(\)[\s\S]{0,300}cs-game\.is-open, \.zee-run\.is-open/, "chat refuses to stack above another modal");
assert.match(playHtml, /window\.__csGameOnly = true/);
assert.match(playHtml, /ZAKI Play — ZEE Run/);
assert.equal([...product.matchAll(/status: "Available now"/g)].length, 2, "Agent and Spaces are publicly available");
assert.equal([...product.matchAll(/status: "Staged access"/g)].length, 2, "Minutes and Design are staged-access products");
assert.doesNotMatch(product, /coming next|waitlist/i);
assert.match(html, /Agent and Spaces are available now/);
assert.match(html, /Minutes and Design are rolling out through staged access/);
assert.match(html, /nova-nuggets-particle-mark\.png/);
assert.match(html, /id="hero-organism"[^>]*data-org-count="6000"[^>]*data-org-mobile-count="3000"/, "hero keeps the launch-safe particle budget");
assert.match(html, /data-org-variant="glow"[^>]*data-org-count="5000"[^>]*data-org-mobile-count="2500"/, "statement keeps the lazy particle budget");
assert.match(html, /waitForGateThenInitOrganism\(\)[\s\S]{0,1300}cs:gate-unlocked/, "organisms wait for the gate unlock signal");
assert.match(html, /boot-failsafe[\s\S]{0,220}cs:gate-unlocked/, "the gate fail-open publishes the same release contract");
assert.match(html, /window\.__csGateUnlocked \|\| \(!html\.classList\.contains\('cs-guide-locked'\) && !document\.querySelector\('\.cs-guide-gate'\)\)/, "initial mount cannot bypass a visible gate exit");
assert.match(html, /!html\.classList\.contains\('cs-guide-locked'\) && !document\.querySelector\('\.cs-guide-gate'\)/, "the fallback cannot start hero work during the normal gate exit");
assert.match(html, /_gateRemovalObserver\.observe\(document\.body, \{ childList: true \}\)/, "old gate exits still release the hero after the gate node disappears");
assert.match(html, /new IntersectionObserver\([\s\S]{0,500}rootMargin: '180px 0px'/, "offscreen organisms are instantiated on proximity");
assert.match(html, /this\._activeOrganism && this\._activeOrganism !== c\) unmount\(this\._activeOrganism\)/, "only one organism renderer can stay live");
assert.match(mascot, /function emitGateUnlocked\([\s\S]{0,1600}cs:gate-unlocked/, "gate publishes a durable unlock event");
assert.match(mascot, /function initGateFace\(gate\)[\s\S]{0,1600}PREFERS_REDUCED\) return;[\s\S]{0,1000}count: window\.innerWidth < 760 \? 1400 : 2800/, "welcome gate restores a bounded animated mark with a reduced-motion fallback");
assert.match(mascot, /function destroyGateFace\(gate\)[\s\S]{0,900}__csFaceOrganism\.destroy\(\)/, "welcome gate releases its renderer");
assert.match(mascot, /initGateFace\(gate\);/, "welcome gate starts its bounded animation after mounting");
assert.match(mascot, /function emitGateUnlocked\(mode, source\) \{\s*\/\/ The hero listens for this boundary\.[\s\S]{0,240}destroyGateFace\(state\.gate\);\s*if \(window\.__csGateUnlocked\) return;/, "welcome renderer is released before the unlock signal starts the hero");
assert.match(mascot, /count: window\.innerWidth < 760 \? 1400 : 2800/, "footer renderer has a constrained budget");
assert.match(mascot, /function unmountFooterFace\([\s\S]{0,900}__csFooterFaceOrganism\.destroy\(\)/, "footer releases its renderer after it leaves view");
assert.match(organism, /powerPreference: "default"/, "organisms leave GPU lane selection to the browser");
assert.match(organism, /renderer\.forceContextLoss\) renderer\.forceContextLoss\(\)/, "organism teardown releases the browser WebGL context");
assert.match(runtimeConfig, /APP_BASE_URL/);
assert.match(runtimeConfig, /a\[href\^="https:\/\/app\.chatzaki\.com"\]/);
assert.match(runtimeConfig, /MutationObserver/);
assert.match(runtimeConfig, /attributeFilter:\s*\["href"\]/);
assert.match(runtimeConfig, /if \(link\.getAttribute\("href"\) !== rewrittenHref\) \{\s*link\.setAttribute\("href", rewrittenHref\);\s*\}/, "same-origin CTA rewrites do not feed the href observer forever");

function runRuntimeConfig(appBase) {
  let href = "https://app.chatzaki.com/agent?source=website#start";
  let writes = 0;
  let observerCallback;
  const selector = 'a[href^="https://app.chatzaki.com"]';
  const link = {
    getAttribute(name) { return name === "href" ? href : null; },
    setAttribute(name, value) {
      assert.equal(name, "href");
      writes += 1;
      href = value;
    },
    matches(value) { return value === selector && href.startsWith("https://app.chatzaki.com"); }
  };
  function RuntimeMutationObserver(callback) {
    observerCallback = callback;
  }
  RuntimeMutationObserver.prototype.observe = function () {};

  runInNewContext(runtimeConfig, {
    URL,
    Node: { ELEMENT_NODE: 1 },
    MutationObserver: RuntimeMutationObserver,
    window: { __ZAKI_WEBSITE_ENV__: { APP_BASE_URL: appBase } },
    document: {
      documentElement: { dataset: {} },
      querySelectorAll(value) { return value === selector ? [link] : []; }
    }
  });
  return {
    get href() { return href; },
    get writes() { return writes; },
    triggerHrefMutation() { observerCallback([{ type: "attributes", target: link, addedNodes: [] }]); }
  };
}

const localRuntime = runRuntimeConfig("https://app.chatzaki.com");
assert.equal(localRuntime.writes, 0, "same-origin initial CTA rewrite is a no-op");
localRuntime.triggerHrefMutation();
assert.equal(localRuntime.writes, 0, "same-origin href mutation does not feed the observer loop");
const stagingRuntime = runRuntimeConfig("https://app-staging.chatzaki.ai");
assert.equal(stagingRuntime.writes, 1, "staging runtime config still rewrites the CTA origin");
assert.equal(stagingRuntime.href, "https://app-staging.chatzaki.ai/agent?source=website#start");
assert.match(nginx, /location = \/site\/runtime-config\.js \{\s*add_header Cache-Control "no-store" always;/);
assert.match(nginx, /map \$host \$zaki_robots_tag \{\s*default "";\s*staging\.chatzaki\.com "noindex, nofollow, noarchive";/, "nginx.conf: staging noindex map");
assert.match(nginx, /add_header X-Robots-Tag \$zaki_robots_tag always;/, "nginx.conf: staging robots header");
assert.match(favicon, /viewBox="0 0 32 32"/, "V4 favicon viewbox");
assert.equal([...favicon.matchAll(/<path\b/g)].length, 3, "V4 favicon uses the three-part mark");
assert.match(favicon, /fill="#D24430"/, "V4 favicon brand red");
assert.match(manifest, new RegExp(`/site/assets/favicon\\.svg\\?v=${cacheVersion}`), "manifest uses the versioned V4 favicon");
assert.match(llms, /ZAKI Agent/);
assert.match(llms, /ZAKI Spaces/);
assert.match(llms, /ZAKI Minutes/);
assert.match(llms, /ZAKI Design/);
assert.match(llms, /Do not state or imply that Learn or Hire is a public website product\./);

// Legacy V4 URL coverage: every URL the live site's sitemap indexed must stay
// reachable on V5 — either served directly by the payload or 301-redirected to
// a V5 route. The inventory fixture is the contract; deleting the redirect map
// from nginx.conf must fail this check.
const legacyInventory = JSON.parse(
  readFileSync(join(websiteRoot, "scripts", "legacy-url-inventory.json"), "utf8")
);
const redirects = new Map();
for (const match of nginx.matchAll(/location = (\S+) \{ return 301 "?([^";\s]+)"?; \}/g)) {
  redirects.set(match[1], match[2]);
}
const servedByV5 = (path) => {
  const clean = path.split(/[?#]/, 1)[0];
  const local = clean === "/" ? "index.html" : clean.endsWith("/") ? `${clean.slice(1)}index.html` : clean.slice(1);
  return existsSync(join(root, local));
};
assert.ok(
  redirects.size >= 30,
  `nginx.conf: legacy 301 redirect map missing or gutted (found ${redirects.size} exact redirects)`
);
assert.match(nginx, /location \^~ \/ar\/ \{ return 301 \/; \}/, "nginx.conf: /ar/ fallback redirect missing");
assert.match(nginx, /location \^~ \/how-to\/ \{ return 301 \/; \}/, "nginx.conf: /how-to/ fallback redirect missing");
for (const legacyPath of [...legacyInventory.sitemapPaths, ...legacyInventory.legacyRouterExtras]) {
  if (servedByV5(legacyPath)) continue;
  const target = redirects.get(legacyPath);
  assert.ok(target, `legacy URL ${legacyPath} is neither served by V5 nor 301-redirected in nginx.conf`);
  assert.ok(servedByV5(target), `nginx.conf: redirect target ${target} for ${legacyPath} is not a V5 route`);
  if (legacyPath.length > 1 && legacyPath.endsWith("/")) {
    assert.equal(
      redirects.get(legacyPath.slice(0, -1)),
      target,
      `nginx.conf: missing or mismatched slashless twin redirect for ${legacyPath}`
    );
  }
}

for (const plan of ["Free", "Personal", "Pro", "Pro MAX"]) assert.match(pricing, new RegExp(`>${plan}<`));
for (const price of ["$0", "$15", "$45", "$95"]) assert.ok(pricing.includes(price), `pricing includes ${price}`);
assert.match(pricing, /app\.chatzaki\.com\/pricing/);
assert.match(policies, /2026-07-12\.v4/g);
assert.match(read("robots.txt"), /Sitemap: https:\/\/chatzaki\.com\/sitemap\.xml/);
assert.match(read("sitemap.xml"), /https:\/\/chatzaki\.com\/compliance\//);

for (const [slug, appPath, status] of [["agent", "agent", "Available now"], ["spaces", "spaces", "Available now"], ["minutes", "minutes", "Staged access"], ["design", "design", "Staged access"]]) {
  const page = read(`products/${slug}/index.html`);
  assert.match(page, /<h1(?:\s[^>]*)?>\s*[^<]{12,}/, `${slug}: static crawlable H1`);
  assert.match(page, /<p class="z-hero__summary"[^>]*>\s*[^<]{20,}/, `${slug}: static crawlable summary`);
  assert.match(page, new RegExp(status), `${slug}: accurate public status`);
  assert.match(page, new RegExp(`https://app\\.chatzaki\\.com/${appPath}`), `${slug}: app handoff`);
}

assert.doesNotMatch(publicHtml, /novanuggets\.com|hello@novanuggets\.com/i);
assert.doesNotMatch(publicHtml + mascot + product, /coming next|waitlist|\$99|pro-95|Your next hire|24\/7 · no breaks|same (?:ZAKI )?brain|under 2 seconds|1,200 invoices|always with sources/i);
assert.doesNotMatch(publicHtml, />\s*(?:Learn|Hire|Career)\s*</i, "hidden future products must not reappear in public navigation");
assert.doesNotMatch(pricing, />Power<|Request access/i);
assert.doesNotMatch(html, /site\/assets\/work\/|raw\.githubusercontent/);
assert.doesNotMatch(playHtml, /site\/assets\/work\/|raw\.githubusercontent/);
assert.doesNotMatch(mascot, /site\/assets\/work\//);
assert.doesNotMatch(html + playHtml + mascot + product, /zaki-face-silhouette\.png/);

console.log(`ZAKI Website V5 release check passed: ${root} (${htmlDocuments.length} HTML routes)`);
