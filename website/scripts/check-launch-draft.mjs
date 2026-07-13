import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(websiteRoot, process.argv[2] || "launch-draft");
const read = (file) => readFileSync(join(root, file), "utf8");

const html = read("index.html");
const playHtml = read("play/index.html");
const mascot = read("mascot.js");
const game = read("game.js");
const product = read("site/product.js");

[
  "mascot.css",
  "mascot.js",
  "game.js",
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
  "terms/index.html"
].forEach((file) => assert.equal(existsSync(join(root, file)), true, file));

assert.match(html, /cs-guide-gate|This site is awake|AI that actually ships/);
assert.match(mascot, /function startGuide|cs-ai-mascot|cs-guide-gate/);
assert.match(game, /window\.__csGame|DOT SHOT|cs-game/);
assert.match(mascot, /openGameSoon|Play Dot Shot|data-game/);
assert.doesNotMatch(html, /site\/assets\/work\//);
assert.doesNotMatch(playHtml, /site\/assets\/work\//);
assert.doesNotMatch(mascot, /site\/assets\/work\//);
assert.doesNotMatch(html, /raw\.githubusercontent/);
assert.doesNotMatch(playHtml, /raw\.githubusercontent/);
assert.match(playHtml, /window\.__csGameOnly = true/);
assert.match(product, /Available now/);
assert.match(product, /Coming next/);
assert.match(html, /nova-nuggets-particle-mark\.png/);
assert.doesNotMatch(html + playHtml + mascot + product, /zaki-face-silhouette\.png/);

console.log(`Launch draft smoke check passed: ${root}`);
