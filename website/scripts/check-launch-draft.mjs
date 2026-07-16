import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(websiteRoot, process.argv[2] || "launch-draft");
const read = (file) => readFileSync(join(root, file), "utf8");

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
  "site/runtime-config.js",
  "site/js/matter.js",
  "site/js/three.js",
  "site/js/organism.js",
  "site/fonts/bricolage-grotesque-latin.woff2",
  "site/fonts/geist-mono-latin.woff2",
  "site/assets/zaki-worker-full.png",
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
  assert.match(html, /<script src="\/env\.js"><\/script>/, `${relative}: environment bootstrap`);
  assert.match(html, /<script defer src="\/site\/runtime-config\.js"><\/script>/, `${relative}: runtime config`);

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
const game = read("game.js");
const product = read("site/product.js");
const runtimeConfig = read("site/runtime-config.js");
const pricing = read("pricing/index.html");
const policies = read("privacy/index.html") + read("terms/index.html") + read("compliance/index.html");
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
assert.match(game, /window\.__csGame|DOT SHOT|cs-game/);
assert.match(mascot, /openGameSoon|Play Dot Shot|data-game/);
assert.match(playHtml, /window\.__csGameOnly = true/);
assert.match(product, /Available now/);
assert.match(product, /Coming next/);
assert.match(html, /Agent and Spaces are available now/);
assert.match(html, /Minutes and Design are coming next/);
assert.match(html, /nova-nuggets-particle-mark\.png/);
assert.match(runtimeConfig, /APP_BASE_URL/);
assert.match(runtimeConfig, /a\[href\^="https:\/\/app\.chatzaki\.com"\]/);
assert.match(runtimeConfig, /MutationObserver/);

for (const plan of ["Free", "Personal", "Pro", "Pro MAX"]) assert.match(pricing, new RegExp(`>${plan}<`));
for (const price of ["$0", "$15", "$45", "$99"]) assert.ok(pricing.includes(price), `pricing includes ${price}`);
assert.match(pricing, /app\.chatzaki\.com\/pricing/);
assert.match(policies, /2026-07-12\.v4/g);
assert.match(read("robots.txt"), /Sitemap: https:\/\/chatzaki\.com\/sitemap\.xml/);
assert.match(read("sitemap.xml"), /https:\/\/chatzaki\.com\/compliance\//);

assert.doesNotMatch(publicHtml, /novanuggets\.com|hello@novanuggets\.com/i);
assert.doesNotMatch(publicHtml + mascot, /\$95|pro-95|Your next hire|24\/7 · no breaks|same (?:ZAKI )?brain|under 2 seconds|1,200 invoices|always with sources/i);
assert.doesNotMatch(pricing, />Power<|Request access/i);
assert.doesNotMatch(html, /site\/assets\/work\/|raw\.githubusercontent/);
assert.doesNotMatch(playHtml, /site\/assets\/work\/|raw\.githubusercontent/);
assert.doesNotMatch(mascot, /site\/assets\/work\//);
assert.doesNotMatch(html + playHtml + mascot + product, /zaki-face-silhouette\.png/);

console.log(`ZAKI Website V5 release check passed: ${root} (${htmlDocuments.length} HTML routes)`);
