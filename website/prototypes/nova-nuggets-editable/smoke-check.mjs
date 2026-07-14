import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const read = (file) => readFileSync(join(root, file), "utf8");

const html = read("index.html");
const playHtml = read("play/index.html");
const mascot = read("mascot.js");
const game = read("game.js");

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
  "site/assets/nova-nuggets-particle-mark.png"
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

console.log("editable smoke check passed");
