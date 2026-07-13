/* ==========================================================================
   DOT SHOT — Nova Nuggets arcade minigame (aa / Knife Hit hybrid)
   Self-contained overlay. Talks to the mascot through window.__csGameBridge
   (dots renderer, sfx, shake) and to the Laravel leaderboard at /api.

   v2 — "the fun update":
   · deterministic, learnable spin patterns per level (seeded by level #)
   · direction flips are telegraphed and never fire while a shot is airborne
   · 3 lives per run; bosses every 5 levels refill one
   · bosses have names, angry eyes and a checkpoint behind them
   · golden dots pay persistent ★ — spend them on projectile skins
   ========================================================================== */
(function () {
  "use strict";

  var API = window.__csGameApi || "/api/leaderboard";
  var TAU = Math.PI * 2;
  var REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  var g = {
    open: false,
    mode: "intro",            // intro | playing | dead | board
    canvas: null,
    ctx: null,
    dpr: 1,
    w: 0,
    h: 0,
    raf: 0,
    last: 0,
    t: 0,
    // wheel
    rot: 0,
    dir: 1,
    level: 1,
    dotsLeft: 0,
    pins: [],                  // angles relative to wheel
    prog: null,                // level program (speed + scripted events)
    levelT: 0,                 // seconds since level start (drives pulse)
    cycleT: 0,                 // event clock — pauses while a shot is airborne
    stallT: 0,
    burstT: 0,
    warn: null,                // upcoming telegraphed event {type, in}
    // shot
    shot: null,                // {y}
    score: 0,
    best: 0,
    lives: 3,
    gold: 0,
    goldRun: 0,
    submitting: false,
    dead: null,                // {angle} where we crashed
    beat: null,                // {score, by} challenge mode
    splats: [],
    particles: [],             // impact sprays
    flyers: [],                // pins bursting off on level-complete
    toasts: [],                // floating "+5" / "-1 ♥" texts
    trail: [],                 // shot trail
    pulse: 0,                  // wheel scale pulse 0..1
    hitstop: 0,                // brief freeze on death
    transition: 0,             // level-burst pause
    bonus: null,               // golden dot angle (risk/reward)
    bonusAt: 0,                // boss levels respawn the golden dot
    check: 1,                  // checkpoint level (1, 6, 11… behind each boss)
    tutDone: false,            // first-run hints until level 3 is reached
  };

  var PIN_GAP = 0.165;         // rad — collision distance between pins
  var PIN_LEN = 26;            // px stub from rim
  var WARN_T = 0.45;           // s of telegraph before a flip / burst
  var MAX_LIVES = 3;
  var SEED = 0xC57D;
  var UI = {};

  var BOSSES = ["THE DEADLINE", "SCOPE CREEP", "THE REBRAND", "IE11", "THE PITCH", "MONDAY", "BURNOUT", "V2.FINAL.FINAL"];
  // one face per boss: color, brow tilt (1 angry / -1 raised / 0 flat),
  // lid droop (0..1) and pupil size — MONDAY can barely open its eyes
  var BOSS_FACES = [
    { c: "#e0245e", brow: 1,  lid: 0,    pupil: 4.6 },
    { c: "#3f9d63", brow: -1, lid: 0,    pupil: 6.2 },
    { c: "#7b5cd6", brow: 1,  lid: 0,    pupil: 3.4 },
    { c: "#2f6fd0", brow: 0,  lid: 0.35, pupil: 4.6 },
    { c: "#b8860b", brow: -1, lid: 0,    pupil: 4 },
    { c: "#6b7280", brow: 0,  lid: 0.6,  pupil: 4.6 },
    { c: "#d9541e", brow: 1,  lid: 0.25, pupil: 3.2 },
    { c: "#0e0e0c", brow: 1,  lid: 0,    pupil: 4.6 },
  ];
  function bossFace(n) { return BOSS_FACES[(Math.floor(n / 5) - 1) % BOSS_FACES.length]; }

  var SKINS = [
    { id: "ink",   name: "INK",   cost: 0 },
    { id: "pixel", name: "PIXEL", cost: 8 },
    { id: "ring",  name: "RING",  cost: 14 },
    { id: "spark", name: "SPARK", cost: 22 },
    { id: "comet", name: "COMET", cost: 32 },
    { id: "bolt",  name: "BOLT",  cost: 44 },
    { id: "spike", name: "SPIKE", cost: 58 },
    { id: "midas", name: "MIDAS", cost: 75 },
  ];
  var skin = "ink";
  var unlocked = ["ink"];
  var chars = [];               // in-game driver roster — bosses unlock the rest

  function bridge() { return window.__csGameBridge || null; }
  function sfx(n) { var b = bridge(); if (b && b.sfx) b.sfx(n); }
  function shake(a, d) { var b = bridge(); if (b && b.shake && !REDUCED) b.shake(a, d); }
  function isBoss(n) { return n % 5 === 0; }
  function bossName(n) { return BOSSES[(Math.floor(n / 5) - 1) % BOSSES.length]; }

  /* Deterministic per-level randomness — level 4 is always the same level 4,
     so patterns can be learned the way aa / Knife Hit levels are. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- persistence ---------------- */

  function loadSaved() {
    try {
      g.best = parseInt(localStorage.getItem("cs-game-best") || "0", 10) || 0;
      g.gold = parseInt(localStorage.getItem("cs-game-gold") || "0", 10) || 0;
      g.check = parseInt(localStorage.getItem("cs-game-check") || "1", 10) || 1;
      var sk = localStorage.getItem("cs-game-skin");
      var un = JSON.parse(localStorage.getItem("cs-game-skins") || '["ink"]');
      if (Array.isArray(un) && un.indexOf("ink") !== -1) unlocked = un;
      if (sk && unlocked.indexOf(sk) !== -1) skin = sk;
      var ch = JSON.parse(localStorage.getItem("cs-game-chars") || "[]");
      if (Array.isArray(ch)) chars = ch;
      g.tutDone = localStorage.getItem("cs-game-tut") === "1";
    } catch (e) {}
    // whoever you picked at the site gate always rides with you
    var b = bridge();
    if (b && b.variant && chars.indexOf(b.variant()) === -1) chars.push(b.variant());
  }

  function saveChars() { try { localStorage.setItem("cs-game-chars", JSON.stringify(chars)); } catch (e) {} }
  function charOrder() {
    var b = bridge();
    return b && b.names ? Object.keys(b.names) : [];
  }

  function saveGold() { try { localStorage.setItem("cs-game-gold", String(g.gold)); } catch (e) {} }
  function saveSkins() {
    try {
      localStorage.setItem("cs-game-skins", JSON.stringify(unlocked));
      localStorage.setItem("cs-game-skin", skin);
    } catch (e) {}
  }

  function addGold(n) {
    g.gold += n;
    g.goldRun += n;
    saveGold();
    if (UI.gold) UI.gold.textContent = "★ " + g.gold;
  }

  function unlockSkin(id) {
    if (unlocked.indexOf(id) !== -1) return false;
    unlocked.push(id);
    saveSkins();
    return true;
  }

  /* ---------------- boot / overlay ---------------- */

  function injectCss() {
    if (document.getElementById("cs-game-css")) return;
    var s = document.createElement("style");
    s.id = "cs-game-css";
    s.textContent = "" +
      ".cs-game{position:fixed;inset:0;z-index:2147483300;display:none;background:rgba(var(--bg-rgb,255,244,141),.97);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}" +
      ".cs-game.is-open{display:block}" +
      ".cs-game [hidden]{display:none!important}" +
      // no double-tap zoom mid-game: taps are ammo, not gestures
      ".cs-game,.cs-game *{touch-action:manipulation;-webkit-tap-highlight-color:transparent}" +
      ".cs-game>canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}" +
      ".cs-game__hud{position:absolute;top:calc(18px + env(safe-area-inset-top));left:0;right:0;display:flex;justify-content:space-between;padding:0 24px;font-family:'Geist Mono',ui-monospace,monospace;font-size:13px;letter-spacing:.16em;color:var(--ink,#0e0e0c);pointer-events:none}" +
      ".cs-game__hud b{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:56px;letter-spacing:-.03em;display:block;line-height:1;margin-top:6px}" +
      ".cs-game__lives{display:block;margin-top:6px;font-size:15px;letter-spacing:.14em;color:#e0245e}" +
      ".cs-game__gold{display:block;margin-top:6px;font-size:13px;letter-spacing:.1em;color:#b8860b}" +
      ".cs-game__logo{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:19px;letter-spacing:-.03em;color:var(--ink,#0e0e0c)}" +
      "@media (max-width:640px){.cs-game__hud b{font-size:42px}.cs-game__logo{font-size:17px}}" +
      "html.cs-gaming #cs-progress,html.cs-gaming #cs-pct,html.cs-gaming #cs-chapters,html.cs-gaming #cs-nav,html.cs-gaming .cs-ai-mascot,html.cs-gaming .cs-sound-chip,html.cs-gaming .cs-play-chip,html.cs-gaming .cs-quote-chip,html.cs-gaming .cs-guide-skip{visibility:hidden!important}" +
      ".cs-game__beat{position:absolute;top:calc(52px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);font-family:'Geist Mono',monospace;font-size:11px;letter-spacing:.1em;background:var(--ink,#0e0e0c);color:var(--accent,#fff48d);padding:7px 14px;border-radius:100px;pointer-events:none}" +
      ".cs-game__boss{position:absolute;top:calc(88px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);font-family:'Geist Mono',monospace;font-size:11px;letter-spacing:.14em;background:#e0245e;color:#fff;padding:7px 14px;border-radius:100px;pointer-events:none;white-space:nowrap}" +
      ".cs-game__card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(400px,calc(100vw - 56px));background:var(--ink,#0e0e0c);color:#faf7ea;border:2px solid var(--accent,#fff48d);border-radius:22px;padding:26px 26px 22px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.4)}" +
      ".cs-game__title{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:44px;letter-spacing:-.03em;line-height:.95;margin:0 0 6px;color:var(--accent,#fff48d)}" +
      ".cs-game__sub{font-family:'Geist Mono',monospace;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#cfcfc4;margin:0 0 18px;line-height:1.7}" +
      ".cs-game__big{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:64px;letter-spacing:-.03em;line-height:1;margin:6px 0 2px;color:var(--accent,#fff48d)}" +
      ".cs-game__btn{display:inline-block;margin:6px 4px 0;background:var(--accent,#fff48d);color:#0e0e0c;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:15px;border:0;border-radius:100px;padding:13px 22px;cursor:pointer;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}" +
      ".cs-game__btn:hover{transform:scale(1.06)}" +
      ".cs-game__btn--ghost{background:transparent;color:#faf7ea;border:1.5px solid rgba(255,255,255,.35)}" +
      ".cs-game__actions{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:10px;margin:16px 0 0}" +
      ".cs-game__actions .cs-game__btn{margin:0}" +
      ".cs-game__actions--sub{margin-top:10px}" +
      ".cs-game__actions--sub .cs-game__btn{font-size:12px;padding:9px 16px}" +
      ".cs-game__site{position:absolute;left:18px;bottom:calc(16px + env(safe-area-inset-bottom));background:var(--ink,#0e0e0c);border:0;color:var(--accent,#fff48d);font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14px;padding:12px 20px;border-radius:100px;cursor:pointer;z-index:3;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}" +
      ".cs-game__site:hover{transform:scale(1.06)}" +
      ".cs-game__menu{position:absolute;right:18px;bottom:calc(16px + env(safe-area-inset-bottom));background:var(--ink,#0e0e0c);border:0;color:var(--accent,#fff48d);font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:14px;padding:12px 20px;border-radius:100px;cursor:pointer;z-index:3;display:none;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}" +
      ".cs-game__menu:hover{transform:scale(1.06)}" +
      ".cs-game__menu.is-on{display:block}" +
      ".cs-game__exit{display:block;margin:10px auto 0;background:none;border:0;color:#8f8f80;font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;text-decoration:underline;text-underline-offset:3px}" +
      ".cs-game__char{display:flex;align-items:center;justify-content:center;gap:20px;margin:6px 0 8px}" +
      ".cs-game__char button{width:38px;height:38px;border-radius:50%;border:1.5px solid rgba(255,255,255,.35);background:transparent;color:var(--accent,#fff48d);font-size:15px;cursor:pointer;flex:none}" +
      ".cs-game__char span{font-family:'Geist Mono',monospace;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#fdfbf2;min-width:88px}" +
      ".cs-game__prevwrap{display:flex;flex-direction:column;align-items:center;gap:10px;min-width:120px}" +
      ".cs-game__btn--sm{font-size:12px;padding:8px 16px;margin-top:12px}" +
      ".cs-game__label{font-family:'Geist Mono',monospace;font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#8f8f80;margin:24px 0 12px}" +
      ".cs-game__skins{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:6px 0 4px}" +
      ".cs-game__skins button{width:54px;height:70px;border-radius:12px;border:1.5px solid rgba(255,255,255,.22);background:rgba(255,255,255,.05);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:5px 2px 4px;transition:transform .15s ease}" +
      ".cs-game__skins button:hover{transform:translateY(-2px)}" +
      ".cs-game__skins button.is-sel{border-color:var(--accent,#fff48d);box-shadow:0 0 0 1.5px var(--accent,#fff48d) inset}" +
      ".cs-game__skins button.is-locked .cs-game__thumb{opacity:.4}" +
      ".cs-game__skins canvas{position:static;flex:none}" +
      ".cs-game__skins small{font-family:'Geist Mono',monospace;font-size:8.5px;letter-spacing:.04em;color:#cfcfc4;text-transform:uppercase;line-height:1.3}" +
      ".cs-game__skins small.cs-game__price{color:#b8860b;font-weight:700}" +
      ".cs-game__roster{font-family:'Geist Mono',monospace;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:#8f8f80;margin:10px 0 0}" +
      ".cs-game__initials{display:flex;justify-content:center;gap:10px;margin:14px 0 4px}" +
      ".cs-game__slot{display:flex;flex-direction:column;align-items:center;gap:2px}" +
      ".cs-game__slot button{border:0;background:transparent;color:var(--accent,#fff48d);font-size:16px;cursor:pointer;padding:2px 10px}" +
      ".cs-game__slot span{font-family:'Geist Mono',monospace;font-weight:700;font-size:34px;color:#fdfbf2;background:rgba(255,255,255,.08);border-radius:10px;padding:4px 12px;min-width:52px}" +
      ".cs-game__slot.is-active span{background:rgba(var(--accent-rgb,255,244,141),.22);color:var(--accent,#fff48d);box-shadow:0 0 0 2px var(--accent,#fff48d) inset}" +
      ".cs-game__board{list-style:none;margin:14px 0 10px;padding:0;font-family:'Geist Mono',monospace;font-size:14px;text-align:left;display:flex;flex-direction:column;gap:6px}" +
      ".cs-game__board li{display:flex;justify-content:space-between;padding:8px 14px;border-radius:10px;color:#e9e6d8;background:rgba(255,255,255,.04)}" +
      ".cs-game__board li.is-you{background:rgba(var(--accent-rgb,255,244,141),.18);color:var(--accent,#fff48d);font-weight:700}" +
      ".cs-game__note{font-family:'Geist Mono',monospace;font-size:10px;letter-spacing:.08em;color:#8f8f80;margin-top:10px}" +
      "@media (max-height:640px){.cs-game__title{font-size:34px}.cs-game__big{font-size:48px}}" +
      "@media (max-width:640px){.cs-game__card{width:min(400px,calc(100vw - 64px));max-height:calc(100dvh - 120px);overflow-y:auto;padding:24px 20px 20px}}";
    document.head.appendChild(s);
  }

  function buildOverlay() {
    if (g.root) return;
    injectCss();
    var root = document.createElement("div");
    root.className = "cs-game";
    root.innerHTML =
      '<canvas></canvas>' +
      '<div class="cs-game__hud">' +
        '<div>LEVEL<b data-lvl>1</b><span class="cs-game__lives" data-lives></span></div>' +
        '<span class="cs-game__logo">ZAKI</span>' +
        '<div style="text-align:right">SCORE<b data-score>0</b><span class="cs-game__gold" data-gold></span></div>' +
      '</div>' +
      '<div class="cs-game__beat" data-beat hidden></div>' +
      '<div class="cs-game__boss" data-boss hidden></div>' +
      '<div class="cs-game__card" data-card></div>' +
      '<button type="button" class="cs-game__site" aria-label="Back to the site">&larr; Back to site</button>' +
      '<button type="button" class="cs-game__menu" aria-label="Quit run, back to menu">MENU</button>';
    document.body.appendChild(root);
    g.root = root;
    g.canvas = root.querySelector("canvas");
    g.ctx = g.canvas.getContext("2d");
    UI.lvl = root.querySelector("[data-lvl]");
    UI.score = root.querySelector("[data-score]");
    UI.lives = root.querySelector("[data-lives]");
    UI.gold = root.querySelector("[data-gold]");
    UI.card = root.querySelector("[data-card]");
    UI.beat = root.querySelector("[data-beat]");
    UI.boss = root.querySelector("[data-boss]");
    UI.menu = root.querySelector(".cs-game__menu");

    root.querySelector(".cs-game__site").addEventListener("click", exitGame);
    UI.menu.addEventListener("click", toMenu);
    g.canvas.addEventListener("pointerdown", onTap);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && g.open && g.mode === "playing") g.last = 0; // re-sync dt on return
    });
  }

  function resize() {
    if (!g.canvas) return;
    g.dpr = Math.min(2, window.devicePixelRatio || 1);
    g.w = window.innerWidth;
    g.h = window.innerHeight;
    g.canvas.width = Math.floor(g.w * g.dpr);
    g.canvas.height = Math.floor(g.h * g.dpr);
    g.ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  }

  function updateHud() {
    UI.lvl.textContent = String(g.level);
    UI.score.textContent = String(g.score);
    UI.gold.textContent = "★ " + g.gold;
    var hearts = "";
    for (var i = 0; i < MAX_LIVES; i += 1) hearts += i < g.lives ? "♥" : "♡";
    UI.lives.textContent = hearts;
  }

  /* ---------------- level programs ----------------
     Each level compiles to a deterministic program: a base speed, an
     optional speed pulse (fixed phase), and scripted events on a repeating
     cycle — reversals, stalls (a gift: the wheel almost stops) and bursts.
     Reversals and bursts are telegraphed WARN_T before firing, and the
     event clock pauses while a shot is airborne: no more dying to a
     coin-flip the frame after you tapped. */

  function buildProgram(n) {
    var r = rng(SEED + n * 7919);
    var boss = isBoss(n);
    var p = {
      vel: (1.5 + Math.min((n - 1) * 0.2, 2.0)) * (boss ? 1.12 : 1),
      dir: r() < 0.5 ? 1 : -1,
      period: 4.2 + r() * 1.4,
      pulse: null,
      events: [],
    };
    if (n >= 6) p.pulse = { amp: Math.min(0.3 + n * 0.008, 0.42), freq: 1.5 + r() * 0.7, phase: r() * TAU };

    var kinds = [];
    var flips = n >= 3 ? ((n >= 7 ? 2 : 1) + (boss ? 1 : 0)) : 0;
    var i;
    for (i = 0; i < flips; i += 1) kinds.push("reverse");
    if (n >= 8 || (boss && n >= 10)) kinds.push("stall");
    if (n >= 11) kinds.push("burst");

    // place events on the cycle, ≥1.1s apart, none in the first second
    var times = [];
    var guard = 0;
    while (times.length < kinds.length && guard < 80) {
      guard += 1;
      var t = 1 + r() * (p.period - 1.4);
      var ok = true;
      for (i = 0; i < times.length; i += 1) if (Math.abs(t - times[i]) < 1.1) { ok = false; break; }
      if (ok) times.push(t);
    }
    times.sort(function (a, b) { return a - b; });
    for (i = 0; i < times.length; i += 1) p.events.push({ t: times[i], type: kinds[i], fired: false, warned: false });
    return p;
  }

  function dotsFor(n) {
    return isBoss(n) ? Math.min(9 + Math.floor(n / 5), 13) : Math.min(6 + Math.floor((n - 1) / 3), 10);
  }

  /* Starting from a checkpoint banks the "par" for the skipped levels:
     the guaranteed points of a clean run (dots + level bonus), without
     the golden-dot upside — full runs still out-score checkpoint runs. */
  function parScore(fromLevel) {
    var s = 0;
    for (var n = 1; n < fromLevel; n += 1) s += dotsFor(n) + 3;
    return s;
  }

  function startLevel(n) {
    g.level = n;
    if (n >= 3 && !g.tutDone) {
      g.tutDone = true;
      try { localStorage.setItem("cs-game-tut", "1"); } catch (e) {}
    }
    g.prog = buildProgram(n);
    g.dotsLeft = dotsFor(n);
    g.pins = [];
    g.dir = g.prog.dir;
    g.levelT = 0;
    g.cycleT = 0;
    g.stallT = 0;
    g.burstT = 0;
    g.warn = null;

    // obstacle pins — seeded, so level n has the same layout every attempt
    var r = rng(SEED + n * 104729);
    var obstacles = isBoss(n) ? Math.min(3 + Math.floor(n / 10), 5) : Math.min(Math.max(n - 1, 0), 4);
    var tries = 0;
    while (g.pins.length < obstacles && tries < 80) {
      tries += 1;
      var a = r() * TAU;
      if (fits(a, PIN_GAP * 2)) g.pins.push(a);
    }

    // golden bonus dot: +5 score and +2★ — bosses always carry one
    g.bonus = (isBoss(n) || (n >= 2 && Math.random() < 0.7)) ? Math.random() * TAU : null;
    g.bonusAt = 0;

    if (isBoss(n)) {
      UI.boss.hidden = false;
      UI.boss.textContent = "BOSS — " + bossName(n);
      UI.boss.style.background = bossFace(n).c;
      toast(g.w / 2, g.h * 0.62, bossName(n), bossFace(n).c);
      sfx("shake");
    } else {
      UI.boss.hidden = true;
    }
    updateHud();
  }

  function fits(angle, gap) {
    for (var i = 0; i < g.pins.length; i += 1) {
      var d = Math.abs(((angle - g.pins[i] + Math.PI) % TAU + TAU) % TAU - Math.PI);
      if (d < gap) return false;
    }
    return true;
  }

  function play(fromLevel) {
    g.mode = "playing";
    g.locker = false;
    g.score = fromLevel > 1 ? parScore(fromLevel) : 0;
    g.goldRun = 0;
    g.lives = MAX_LIVES;
    g.submitting = false;
    g.rot = 0;
    g.shot = null;
    g.dead = null;
    g.splats = [];
    g.toasts = [];
    g.transition = 0;
    UI.card.style.display = "none";
    if (UI.menu) UI.menu.classList.add("is-on");
    startLevel(fromLevel || 1);
    if (g.score > 0) toast(g.w / 2, g.h * 0.62, "LEVELS 1-" + (fromLevel - 1) + " PAR BANKED · +" + g.score, "#0e0e0c");
  }

  function onTap(e) {
    if (!g.open) return;
    if (g.mode === "intro") {
      if (g.locker) return; // the locker's DONE button is the only way out
      play(); sfx("pop"); return;
    }
    if (g.mode === "playing" && !g.shot && g.transition <= 0 && g.hitstop <= 0) {
      g.shot = { y: g.h * 0.78 };
      g.trail = [];
      sfx("flip");
    }
  }

  function onKey(e) {
    if (!g.open) return;
    if (e.key === "Escape") {
      if (g.mode === "playing") toMenu();
      else exitGame();
      return;
    }
    if (g.mode === "dead") {
      if (handleInitialsKey(e)) return;
    }
    if (g.mode === "board") return; // board buttons own their inputs
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      onTap();
    } else {
      e.stopPropagation(); // keep site hotkeys (⌘K etc.) out of the game
    }
  }

  /* ---------------- loop ---------------- */

  function loop(now) {
    if (!g.open) return;
    g.raf = requestAnimationFrame(loop);
    if (!g.last) g.last = now;
    var dt = Math.min(0.05, (now - g.last) / 1000);
    g.last = now;
    g.t += dt;

    if (g.mode === "playing") step(dt);
    draw();
  }

  function stepEvents(dt) {
    var p = g.prog;
    if (!p || !p.events.length) { g.warn = null; return; }
    // the event clock only runs while the player can react:
    // not mid-shot, not during hitstop, not during the level transition
    var clockRuns = !g.shot && g.transition <= 0;
    if (clockRuns) {
      g.cycleT += dt;
      if (g.cycleT >= p.period) {
        g.cycleT -= p.period;
        for (var i = 0; i < p.events.length; i += 1) { p.events[i].fired = false; p.events[i].warned = false; }
      }
      for (var j = 0; j < p.events.length; j += 1) {
        var ev = p.events[j];
        if (ev.fired || g.cycleT < ev.t) continue;
        ev.fired = true;
        if (ev.type === "reverse") { g.dir *= -1; }
        else if (ev.type === "stall") { g.stallT = 0.8; }
        else if (ev.type === "burst") { g.burstT = 0.55; }
      }
    }
    // telegraph the next reversal / burst
    g.warn = null;
    for (var k = 0; k < p.events.length; k += 1) {
      var e2 = p.events[k];
      if (e2.fired || e2.type === "stall") continue;
      var until = e2.t - g.cycleT;
      if (until >= 0 && until <= WARN_T) {
        g.warn = { type: e2.type, in: until };
        if (!e2.warned) { e2.warned = true; sfx("warn"); }
        break;
      }
    }
  }

  function wheelSpeed() {
    var p = g.prog;
    var v = p ? p.vel : 2;
    if (p && p.pulse) v *= (1 - p.pulse.amp) + p.pulse.amp * Math.abs(Math.sin(g.levelT * p.pulse.freq + p.pulse.phase));
    if (g.stallT > 0) {
      var pr = g.stallT / 0.8; // 1 → 0
      v *= 0.15 + 0.85 * Math.abs(1 - 2 * pr); // dips to 15% mid-stall — a shooting window
    }
    if (g.burstT > 0) v *= 2.1;
    return v;
  }

  function step(dt) {
    if (g.hitstop > 0) { g.hitstop -= dt; return; }
    if (g.transition > 0) {
      g.transition -= dt;
      if (g.transition <= 0) startLevel(g.level + 1);
    }

    if (g.pulse > 0) g.pulse = Math.max(0, g.pulse - dt * 3.2);
    if (g.stallT > 0) g.stallT = Math.max(0, g.stallT - dt);
    if (g.burstT > 0) g.burstT = Math.max(0, g.burstT - dt);
    g.levelT += dt;
    stepEvents(dt);
    g.rot += wheelSpeed() * g.dir * dt;

    // bosses respawn their golden dot a beat after it's taken
    if (isBoss(g.level) && g.bonus === null && g.bonusAt > 0 && g.levelT >= g.bonusAt) {
      g.bonus = Math.random() * TAU;
      g.bonusAt = 0;
    }

    if (g.shot) {
      var W = wheel();
      var target = W.y + W.r + PIN_LEN;
      g.shot.y -= 1650 * dt;
      if (g.shot.y <= target) {
        g.shot = null;
        // landing angle: world "down" (PI/2) mapped into wheel space
        var rel = (((Math.PI / 2) - g.rot) % TAU + TAU) % TAU;
        if (fits(rel, PIN_GAP)) {
          landDot(W, rel);
        } else {
          g.hitstop = 0.13; // freeze-frame before the consequence lands
          window.setTimeout(function () { crash(rel); }, 130);
        }
      }
    }
  }

  function landDot(W, rel) {
    g.pins.push(rel);
    g.score += 1;
    g.dotsLeft -= 1;
    // impact juice: kick, pulse, spray, tiny shake
    g.pulse = 1;
    spray(W.x, W.y + W.r + PIN_LEN, 8, "14,14,12");
    shake(0.12, 110);
    // golden bonus: land close to it → +5 score, +2 persistent ★
    if (g.bonus !== null) {
      var bd = Math.abs(((rel - g.bonus + Math.PI) % TAU + TAU) % TAU - Math.PI);
      if (bd < 0.2) {
        g.score += 5;
        addGold(2);
        spray(W.x + Math.cos(g.bonus + g.rot) * W.r, W.y + Math.sin(g.bonus + g.rot) * W.r, 14, "224,164,0");
        toast(W.x, W.y - W.r - 34, "+5 · +2★", "#b8860b");
        g.bonus = null;
        if (isBoss(g.level)) g.bonusAt = g.levelT + 2.4;
        sfx("stamp");
      }
    }
    var b = bridge(); if (b && b.chomp) b.chomp(0.35);
    if (g.dotsLeft <= 0) levelCleared();
    updateHud();
  }

  function levelCleared() {
    var n = g.level;
    g.score += 3; // level bonus
    sfx("stamp");
    flashLevel();
    burstPins();
    if (isBoss(n)) {
      // boss down: refill a heart, pay ★, drop the checkpoint behind it
      var W = wheel();
      addGold(6);
      if (g.lives < MAX_LIVES) {
        g.lives += 1;
        toast(W.x, W.y - W.r - 60, "+1 ♥", "#e0245e");
      }
      toast(W.x, W.y, "BOSS DOWN · +6★", "#b8860b");
      var firstKill = n + 1 > g.check; // re-farming a beaten boss pays ★, not progress
      if (firstKill) {
        g.check = n + 1;
        try { localStorage.setItem("cs-game-check", String(g.check)); } catch (e) {}
        toast(W.x, W.y + 44, "CHECKPOINT — LEVEL " + g.check, "#0e0e0c");
        // a first-time boss kill frees the next driver from the roster
        var b2 = bridge();
        var order = charOrder();
        for (var ci = 0; ci < order.length; ci += 1) {
          if (chars.indexOf(order[ci]) === -1) {
            chars.push(order[ci]);
            saveChars();
            toast(W.x, W.y + 80, "NEW DRIVER — " + (b2 && b2.names ? b2.names[order[ci]] : order[ci]).toUpperCase(), "#0e0e0c");
            sfx("scan");
            break;
          }
        }
      }
      shake(0.5, 300);
      g.transition = 1.1; // let the boss celebration breathe
    } else {
      g.transition = 0.55; // let the burst read before the next level
    }
    UI.boss.hidden = true;
  }

  function crash(rel) {
    if (g.lives > 1) {
      // a heart absorbs the hit: the dot bounces off, the run continues
      g.lives -= 1;
      updateHud();
      sfx("shake");
      shake(0.4, 240);
      var W = wheel();
      var wx = W.x, wy = W.y + W.r + PIN_LEN;
      toast(wx, wy + 40, "-1 ♥", "#e0245e");
      if (!REDUCED) {
        g.flyers.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 320, vy: 240 + Math.random() * 160, life: 0.7 });
        spray(wx, wy, 10, "224,36,94");
      }
      return;
    }
    die(rel);
  }

  function spray(x, y, n, rgb) {
    if (REDUCED) return;
    for (var i = 0; i < n; i += 1) {
      var a = Math.random() * TAU;
      var sp = 120 + Math.random() * 260;
      g.particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, r: 2 + Math.random() * 3.5, life: 0.55, max: 0.55, rgb: rgb || "14,14,12" });
    }
  }

  function toast(x, y, text, color) {
    g.toasts.push({ x: x, y: y, text: text, color: color || "#0e0e0c", life: 1.15, max: 1.15 });
  }

  function burstPins() {
    // level complete: every pin flies off the wheel (Knife Hit log-break)
    var W = wheel();
    g.pins.forEach(function (a) {
      var wa = a + g.rot;
      g.flyers.push({
        x: W.x + Math.cos(wa) * (W.r + PIN_LEN),
        y: W.y + Math.sin(wa) * (W.r + PIN_LEN),
        vx: Math.cos(wa) * (260 + Math.random() * 160),
        vy: Math.sin(wa) * (260 + Math.random() * 160) - 80,
        life: 0.7,
      });
    });
    g.pins = [];
    shake(0.3, 200);
  }

  function flashLevel() {
    if (REDUCED) return;
    var W = wheel();
    g.splats.push({ x: W.x, y: W.y, r: W.r * 1.1, life: 0.4, max: 0.4, ring: true });
  }

  function die(rel) {
    g.mode = "dead";
    g.dead = { angle: rel };
    g.lives = 0;
    updateHud();
    sfx("shake");
    shake(0.7, 380);
    if (!REDUCED) {
      var W = wheel();
      var wx = W.x + Math.cos(rel + g.rot) * (W.r + PIN_LEN);
      var wy = W.y + Math.sin(rel + g.rot) * (W.r + PIN_LEN);
      for (var i = 0; i < 7; i += 1) {
        g.splats.push({
          x: wx + (Math.random() - 0.5) * 50,
          y: wy + (Math.random() - 0.5) * 50,
          r: 6 + Math.random() * 22,
          life: 9,
          max: 9,
        });
      }
    }
    if (g.score > g.best) {
      g.best = g.score;
      try { localStorage.setItem("cs-game-best", String(g.best)); } catch (e) {}
    }
    window.setTimeout(showScoreCard, 750);
  }

  /* ---------------- drawing ---------------- */

  function wheel() {
    var r = Math.max(88, Math.min(138, Math.min(g.w, g.h) * 0.17));
    if ((g.mode === "playing" || g.mode === "dead") && isBoss(g.level)) r *= 1.14;
    return { x: g.w / 2, y: g.h * 0.38, r: r };
  }

  /* Draw a projectile / pin head at (x,y), pointing along `ang`, in the
     active skin. Shared by the shot, the placed pins and the shop thumbs. */
  function drawCap(ctx, x, y, ang, r, id, color) {
    var ink = color || "#0e0e0c";
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (id === "pixel") {
      ctx.fillStyle = ink;
      ctx.fillRect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8);
    } else if (id === "ring") {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.stroke();
    } else if (id === "spark") {
      ctx.fillStyle = ink;
      ctx.beginPath();
      for (var i = 0; i < 8; i += 1) {
        var sa = (i / 8) * TAU;
        var sr = i % 2 === 0 ? r * 1.25 : r * 0.5;
        ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(sa) * sr, Math.sin(sa) * sr);
      }
      ctx.closePath(); ctx.fill();
    } else if (id === "comet") {
      ctx.fillStyle = "rgba(224,100,40,.55)";
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 0.55); ctx.lineTo(-r * 2.4, 0); ctx.lineTo(-r * 0.7, r * 0.55);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill();
    } else if (id === "bolt") {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 3;
      ctx.lineJoin = "miter";
      ctx.beginPath();
      ctx.moveTo(-r, -r * 0.9); ctx.lineTo(r * 0.2, -r * 0.15); ctx.lineTo(-r * 0.2, r * 0.15); ctx.lineTo(r, r * 0.9);
      ctx.stroke();
    } else if (id === "spike") {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(r * 1.5, 0); ctx.lineTo(-r * 0.8, -r * 0.85); ctx.lineTo(-r * 0.8, r * 0.85);
      ctx.closePath(); ctx.fill();
    } else if (id === "midas") {
      ctx.fillStyle = "#e0a400";
      ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(224,164,0,.45)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, TAU); ctx.stroke();
    } else { // ink
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawBossFace(ctx, W) {
    // eyes on the wheel — every boss looks back at you in its own mood
    var f = bossFace(g.level);
    var ex = 16, ey = -8;
    [-1, 1].forEach(function (side) {
      var x = W.x + side * ex, y = W.y + ey;
      ctx.fillStyle = "#fdfbf2";
      ctx.beginPath(); ctx.ellipse(x, y, 11, 12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.arc(x, y + 3, f.pupil, 0, TAU); ctx.fill();
      if (f.lid > 0) {
        // droopy lid: the wheel-colored curtain over the top of the eye
        ctx.fillStyle = "#0e0e0c";
        ctx.beginPath();
        ctx.ellipse(x, y - 12 + f.lid * 14, 11.5, 12, 0, Math.PI, TAU);
        ctx.fill();
      }
      if (f.brow !== 0) {
        ctx.strokeStyle = "#0e0e0c";
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.moveTo(x - side * 10, y - 15);
        ctx.lineTo(x + side * 8, y - 15 + f.brow * 6);
        ctx.stroke();
      }
    });
  }

  /* First-run hints, one at a time: how to shoot, what kills you, and
     what the golden dot is for. Gone forever once level 3 is reached. */
  function drawTutorial(ctx, W) {
    var msg = null;
    if (g.level === 1 && g.score === 0) msg = "TAP OR SPACE TO SHOOT";
    else if (g.level === 1 && g.score < 3) msg = "DON'T HIT YOUR OWN DOTS";
    else if (g.level === 2 && g.bonus !== null) msg = "THE GOLD DOT PAYS +5 · +2★ — LAND NEXT TO IT";
    if (!msg) return;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(g.t * 3);
    ctx.fillStyle = "#0e0e0c";
    ctx.font = "700 13px 'Geist Mono',ui-monospace,monospace";
    ctx.textAlign = "center";
    ctx.fillText(msg, W.x, g.h * 0.62);
    ctx.restore();
  }

  function drawWarn(ctx, W) {
    if (!g.warn || g.mode !== "playing") return;
    var blink = 0.45 + 0.55 * Math.abs(Math.sin(g.t * 14));
    ctx.save();
    ctx.globalAlpha = blink;
    if (g.warn.type === "reverse") {
      // curved arrow above the wheel pointing where the spin will go next
      var nd = -g.dir;
      var a0 = -Math.PI / 2 - nd * 0.55;
      var a1 = -Math.PI / 2 + nd * 0.25;
      var rr = W.r + PIN_LEN + 22;
      ctx.strokeStyle = "#e0245e";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(W.x, W.y, rr, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
      var tx = W.x + Math.cos(a1) * rr;
      var ty = W.y + Math.sin(a1) * rr;
      var tang = a1 + nd * Math.PI / 2;
      ctx.fillStyle = "#e0245e";
      ctx.beginPath();
      ctx.moveTo(tx + Math.cos(tang) * 13, ty + Math.sin(tang) * 13);
      ctx.lineTo(tx + Math.cos(tang + 2.5) * 9, ty + Math.sin(tang + 2.5) * 9);
      ctx.lineTo(tx + Math.cos(tang - 2.5) * 9, ty + Math.sin(tang - 2.5) * 9);
      ctx.closePath(); ctx.fill();
    } else { // burst
      ctx.strokeStyle = "#e0245e";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(W.x, W.y, W.r + PIN_LEN + 14, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(W.x, W.y, W.r + PIN_LEN + 24, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    var ctx = g.ctx;
    ctx.clearRect(0, 0, g.w, g.h);
    var W = wheel();
    if (g.pulse > 0.02 && !REDUCED) {
      W.x += Math.sin(g.t * 91) * 3.4 * g.pulse;
      W.y += Math.cos(g.t * 83) * 3.4 * g.pulse;
    }
    var b = bridge();
    var inkRGB = "14,14,12";
    var boss = g.mode === "playing" && isBoss(g.level);

    // wheel: phyllotaxis dots in the active character's style
    var puls = 1 + g.pulse * 0.055;
    if (b && b.dots) {
      var dots = b.dots(b.variant(), W.x, W.y, W.r * 0.82 * puls, g.rot * 0.6, 0);
      for (var i = 0; i < dots.length; i += 1) {
        var d = dots[i];
        ctx.fillStyle = "rgba(" + inkRGB + "," + (d.alpha * 0.9).toFixed(3) + ")";
        if (d.square) ctx.fillRect(d.gx - d.r, d.gy - d.r, d.r * 2, d.r * 2);
        else { ctx.beginPath(); ctx.arc(d.gx, d.gy, d.r, 0, TAU); ctx.fill(); }
      }
    } else {
      ctx.fillStyle = "rgba(" + inkRGB + ",.9)";
      ctx.beginPath(); ctx.arc(W.x, W.y, W.r * 0.8, 0, TAU); ctx.fill();
    }

    // rim — bosses get a heavier rim in their own color
    if (boss) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = bossFace(g.level).c;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(W.x, W.y, W.r, 0, TAU); ctx.stroke();
      ctx.restore();
      drawBossFace(ctx, W);
    } else {
      ctx.strokeStyle = "rgba(" + inkRGB + ",.25)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(W.x, W.y, W.r, 0, TAU); ctx.stroke();
    }

    // pins
    for (var p = 0; p < g.pins.length; p += 1) {
      var a = g.pins[p] + g.rot;
      var x1 = W.x + Math.cos(a) * W.r;
      var y1 = W.y + Math.sin(a) * W.r;
      var x2 = W.x + Math.cos(a) * (W.r + PIN_LEN);
      var y2 = W.y + Math.sin(a) * (W.r + PIN_LEN);
      var crashed = g.dead && Math.abs(g.pins[p] - g.dead.angle) < 0.001;
      ctx.strokeStyle = "rgba(" + inkRGB + ",.85)";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      drawCap(ctx, x2, y2, a, 8, skin, crashed ? "#e0245e" : null);
    }

    // telegraphed flip / burst + first-run hints
    drawWarn(ctx, W);
    if (g.mode === "playing" && !g.tutDone && g.transition <= 0) drawTutorial(ctx, W);

    // golden bonus dot on the rim
    if (g.bonus !== null && g.mode === "playing") {
      var ba = g.bonus + g.rot;
      var bx = W.x + Math.cos(ba) * W.r;
      var by = W.y + Math.sin(ba) * W.r;
      ctx.fillStyle = "rgba(224,164,0," + (0.75 + 0.25 * Math.sin(g.t * 6)).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(bx, by, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(224,164,0,.4)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, 14 + 2 * Math.sin(g.t * 6), 0, TAU); ctx.stroke();
    }

    // flying shot + trail
    if (g.shot) {
      g.trail.push({ x: W.x, y: g.shot.y });
      if (g.trail.length > 7) g.trail.shift();
      var trailRGB = skin === "comet" ? "224,100,40" : skin === "midas" ? "224,164,0" : inkRGB;
      for (var tr = 0; tr < g.trail.length; tr += 1) {
        ctx.fillStyle = "rgba(" + trailRGB + "," + (0.12 + 0.5 * (tr / g.trail.length)).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(g.trail[tr].x, g.trail[tr].y, 3 + tr * 0.6, 0, TAU); ctx.fill();
      }
      drawCap(ctx, W.x, g.shot.y, -Math.PI / 2, 8, skin);
    }

    // impact particles
    for (var pi = g.particles.length - 1; pi >= 0; pi -= 1) {
      var pt = g.particles[pi];
      pt.life -= 1 / 60;
      if (pt.life <= 0) { g.particles.splice(pi, 1); continue; }
      pt.vy += 520 / 60;
      pt.x += pt.vx / 60;
      pt.y += pt.vy / 60;
      ctx.fillStyle = "rgba(" + pt.rgb + "," + (pt.life / pt.max).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, TAU); ctx.fill();
    }

    // pins bursting off between levels
    for (var fi = g.flyers.length - 1; fi >= 0; fi -= 1) {
      var fl = g.flyers[fi];
      fl.life -= 1 / 60;
      if (fl.life <= 0) { g.flyers.splice(fi, 1); continue; }
      fl.vy += 420 / 60;
      fl.x += fl.vx / 60;
      fl.y += fl.vy / 60;
      ctx.fillStyle = "rgba(" + inkRGB + "," + (fl.life / 0.7).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(fl.x, fl.y, 8, 0, TAU); ctx.fill();
    }

    // shooter: the chosen character, aiming up
    if (b && b.dots) {
      var sy = g.h * 0.84;
      var sdots = b.dots(b.variant(), W.x, sy, 34, g.t, 1.2);
      for (var s = 0; s < sdots.length; s += 1) {
        var sd = sdots[s];
        ctx.fillStyle = "rgba(" + inkRGB + "," + sd.alpha.toFixed(3) + ")";
        if (sd.square) ctx.fillRect(sd.gx - sd.r, sd.gy - sd.r, sd.r * 2, sd.r * 2);
        else { ctx.beginPath(); ctx.arc(sd.gx, sd.gy, sd.r, 0, TAU); ctx.fill(); }
      }
      // eyes looking up (or X-eyes when dead)
      [-1, 1].forEach(function (side) {
        var ex = W.x + side * 12;
        var ey = sy - 6;
        if (g.mode === "dead") {
          ctx.strokeStyle = "#0e0e0c";
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5);
          ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5);
          ctx.stroke();
        } else {
          ctx.fillStyle = "#fdfbf2";
          ctx.beginPath(); ctx.ellipse(ex, ey, 9, 10, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = "#0e0e0c";
          ctx.beginPath(); ctx.arc(ex, ey - 4, 4.2, 0, TAU); ctx.fill();
        }
      });
      // dots-left indicator under the shooter, in the active skin
      if (g.mode === "playing") {
        for (var q = 0; q < g.dotsLeft; q += 1) {
          drawCap(ctx, W.x - ((g.dotsLeft - 1) * 15) / 2 + q * 15, sy + 52, -Math.PI / 2, 4, skin, "rgba(14,14,12,.85)");
        }
      }
    }

    // splats / rings
    for (var k = g.splats.length - 1; k >= 0; k -= 1) {
      var sp = g.splats[k];
      sp.life -= 1 / 60;
      if (sp.life <= 0) { g.splats.splice(k, 1); continue; }
      if (sp.ring) {
        var pr = 1 - sp.life / sp.max;
        ctx.strokeStyle = "rgba(" + inkRGB + "," + (0.5 * (1 - pr)).toFixed(3) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r * (0.6 + pr * 0.9), 0, TAU); ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(14,14,12," + Math.min(0.85, sp.life).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, TAU); ctx.fill();
      }
    }

    // floating toasts
    for (var ti = g.toasts.length - 1; ti >= 0; ti -= 1) {
      var to = g.toasts[ti];
      to.life -= 1 / 60;
      if (to.life <= 0) { g.toasts.splice(ti, 1); continue; }
      var tp = 1 - to.life / to.max;
      ctx.save();
      ctx.globalAlpha = to.life < 0.35 ? to.life / 0.35 : 1;
      ctx.fillStyle = to.color;
      ctx.font = "800 20px 'Bricolage Grotesque',sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(to.text, to.x, to.y - tp * 42);
      ctx.restore();
    }
  }

  /* ---------------- cards ---------------- */

  /* Locker: driver browser. You can LOOK at every character — locked ones
     are dimmed, eyes shut, and say how many bosses away they are. */
  function lockerCharHtml() {
    return '<p class="cs-game__label">DRIVER — YOUR CHARACTER (' + chars.length + "/" + (charOrder().length || 8) + " UNLOCKED)</p>" +
      '<div class="cs-game__char">' +
        '<button type="button" data-prev aria-label="Previous character">‹</button>' +
        '<div class="cs-game__prevwrap">' +
          '<canvas data-charprev width="88" height="88" style="width:88px;height:88px"></canvas>' +
          '<span data-charname></span>' +
        "</div>" +
        '<button type="button" data-next aria-label="Next character">›</button>' +
      "</div>" +
      '<p class="cs-game__roster" data-charstat></p>' +
      '<button type="button" class="cs-game__btn cs-game__btn--ghost cs-game__btn--sm" data-charuse hidden></button>';
  }

  function wireLockerChar() {
    var b = bridge();
    if (!b || !b.dots) return;
    var order = charOrder();
    var nameEl = UI.card.querySelector("[data-charname]");
    var statEl = UI.card.querySelector("[data-charstat]");
    var useBtn = UI.card.querySelector("[data-charuse]");
    var cv = UI.card.querySelector("[data-charprev]");
    var browse = Math.max(0, order.indexOf(b.variant()));

    function render() {
      var v = order[browse];
      var owned = chars.indexOf(v) !== -1;
      var current = b.variant() === v;
      nameEl.textContent = b.names[v] || v;
      nameEl.style.opacity = owned ? 1 : 0.45;
      if (owned) {
        statEl.textContent = current ? "riding with you" : "unlocked";
        useBtn.hidden = current;
        useBtn.textContent = "PLAY AS " + (b.names[v] || v).toUpperCase();
      } else {
        var queue = order.filter(function (x) { return chars.indexOf(x) === -1; });
        var away = queue.indexOf(v) + 1;
        var bossLvl = (Math.floor((g.check - 1) / 5) + away) * 5;
        statEl.textContent = "locked — beat the level " + bossLvl + " boss";
        useBtn.hidden = true;
      }
      var c = cv.getContext("2d");
      c.clearRect(0, 0, 88, 88);
      var ds = b.dots(v, 44, 48, 32, 0, 0);
      for (var i = 0; i < ds.length; i += 1) {
        var d = ds[i];
        c.fillStyle = "rgba(253,251,242," + (d.alpha * (owned ? 0.95 : 0.3)).toFixed(3) + ")";
        if (d.square) c.fillRect(d.gx - d.r, d.gy - d.r, d.r * 2, d.r * 2);
        else { c.beginPath(); c.arc(d.gx, d.gy, d.r, 0, TAU); c.fill(); }
      }
      [-1, 1].forEach(function (side) {
        var ex = 44 + side * 10, ey = 44;
        if (owned) {
          c.fillStyle = "#fdfbf2";
          c.beginPath(); c.ellipse(ex, ey, 7, 8, 0, 0, TAU); c.fill();
          c.fillStyle = "#0e0e0c";
          c.beginPath(); c.arc(ex, ey - 1.5, 3.4, 0, TAU); c.fill();
        } else {
          c.strokeStyle = "rgba(253,251,242,.6)";
          c.lineWidth = 2.4;
          c.lineCap = "round";
          c.beginPath(); c.moveTo(ex - 5, ey); c.lineTo(ex + 5, ey); c.stroke();
        }
      });
    }

    UI.card.querySelector("[data-prev]").addEventListener("click", function () {
      browse = (browse - 1 + order.length) % order.length; render(); sfx("flip");
    });
    UI.card.querySelector("[data-next]").addEventListener("click", function () {
      browse = (browse + 1) % order.length; render(); sfx("flip");
    });
    useBtn.addEventListener("click", function () {
      var target = order[browse];
      if (chars.indexOf(target) === -1) return;
      var guard = 0;
      while (b.variant() !== target && guard < 12) { b.cycle(1); guard += 1; }
      render(); sfx("pop");
    });
    render();
  }

  function showLocker(back) {
    g.mode = "intro";
    g.locker = true; // background taps shouldn't launch a run from here
    g.lockerBack = back || showIntro; // DONE returns wherever you came from
    card(
      '<h2 class="cs-game__title" style="font-size:30px">LOCKER</h2>' +
      '<p class="cs-game__sub" data-goldline>★ ' + g.gold + " to spend · golden dots pay more</p>" +
      lockerCharHtml() +
      skinRowHtml() +
      '<div class="cs-game__actions"><button type="button" class="cs-game__btn" data-back>DONE</button></div>'
    );
    wireLockerChar();
    wireSkinRow();
    UI.card.querySelector("[data-back]").addEventListener("click", function () { g.lockerBack(); sfx("pop"); });
  }

  /* Skin shop: a row of canvas thumbs. Unlocked → tap to equip.
     Locked → tap to buy with ★ earned from golden dots. */
  function skinRowHtml() {
    return '<p class="cs-game__label">DOTS — WHAT YOU SHOOT</p>' +
      '<div class="cs-game__skins" data-skins></div>' +
      '<p class="cs-game__note" data-skinstatus>tap to equip · the orange price buys it with your ★</p>';
  }

  function wireSkinRow() {
    var wrap = UI.card.querySelector("[data-skins]");
    var status = UI.card.querySelector("[data-skinstatus]");
    if (!wrap) return;
    wrap.innerHTML = "";
    SKINS.forEach(function (sk) {
      var owned = unlocked.indexOf(sk.id) !== -1;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = (sk.id === skin ? "is-sel " : "") + (owned ? "" : "is-locked");
      btn.title = owned ? sk.name + " — owned" : sk.name + " — " + sk.cost + "★";
      var cv = document.createElement("canvas");
      cv.className = "cs-game__thumb";
      cv.width = 30; cv.height = 30;
      cv.style.cssText = "width:30px;height:30px";
      drawCap(cv.getContext("2d"), 15, 16, -Math.PI / 2, 8, sk.id, "#fdfbf2");
      btn.appendChild(cv);
      var name = document.createElement("small");
      name.textContent = sk.name;
      btn.appendChild(name);
      var price = document.createElement("small");
      price.className = "cs-game__price";
      price.textContent = owned ? (sk.id === skin ? "ON" : "") : sk.cost + "★";
      btn.appendChild(price);
      btn.setAttribute("aria-label", sk.name);
      btn.addEventListener("click", function () {
        if (unlocked.indexOf(sk.id) !== -1) {
          skin = sk.id;
          saveSkins();
          status.textContent = sk.name + " equipped";
          sfx("pop");
          wireSkinRow();
          return;
        }
        if (g.gold >= sk.cost) {
          g.gold -= sk.cost;
          saveGold();
          unlockSkin(sk.id);
          skin = sk.id;
          saveSkins();
          updateHud();
          var goldLine = UI.card.querySelector("[data-goldline]");
          if (goldLine) goldLine.textContent = "★ " + g.gold + " to spend · golden dots pay more";
          status.textContent = sk.name + " unlocked + equipped";
          sfx("stamp");
          wireSkinRow();
        } else {
          status.textContent = "need " + sk.cost + "★ — you have " + g.gold + "★ · golden dots pay 2★";
          sfx("flip");
        }
      });
      wrap.appendChild(btn);
    });
  }

  function exitGame() {
    if (window.__csGameOnly) { window.location.href = "/"; return; }
    close();
  }

  function wireExit() {
    var x = UI.card.querySelector("[data-exit]");
    if (x) x.addEventListener("click", exitGame);
  }

  function card(html) {
    UI.card.innerHTML = html;
    UI.card.style.display = "block";
    if (UI.menu) UI.menu.classList.remove("is-on");
  }

  /* Quit the current run back to the menu (MENU chip / Escape). The run
     is forfeited — arcade rules — but the locker is one tap away again. */
  function toMenu() {
    if (g.mode !== "playing") return;
    g.shot = null;
    g.transition = 0;
    g.hitstop = 0;
    UI.boss.hidden = true;
    showIntro();
    sfx("pop");
  }

  function showIntro() {
    g.mode = "intro";
    g.locker = false;
    UI.boss.hidden = true;
    var beatLine = g.beat
      ? '<p class="cs-game__sub" style="color:var(--accent,#fff48d)">' + g.beat.by + " scored " + g.beat.score + " — beat that.</p>"
      : "";
    var checkBtn = g.check > 1
      ? '<button type="button" class="cs-game__btn cs-game__btn--ghost" data-start-check>FROM LEVEL ' + g.check + " · +" + parScore(g.check) + "</button>"
      : "";
    var b = bridge();
    var driverName = b && b.names ? (b.names[b.variant()] || b.variant()) : "";
    card(
      '<h2 class="cs-game__title">DOT SHOT</h2>' +
      beatLine +
      '<p class="cs-game__sub">Shoot dots into the spinner.<br>Hit one of your own → lose a heart. You have 3.</p>' +
      '<div class="cs-game__actions">' +
        '<button type="button" class="cs-game__btn" data-start>TAP TO START</button>' +
        checkBtn +
      "</div>" +
      '<div class="cs-game__actions cs-game__actions--sub">' +
        '<button type="button" class="cs-game__btn cs-game__btn--ghost" data-locker>LOCKER — ' + driverName + " · ★ " + g.gold + "</button>" +
      "</div>" +
      '<button type="button" class="cs-game__exit" data-exit>exit game</button>'
    );
    wireExit();
    UI.card.querySelector("[data-start]").addEventListener("click", function () { play(); sfx("pop"); });
    UI.card.querySelector("[data-locker]").addEventListener("click", function () { showLocker(); sfx("pop"); });
    var fc = UI.card.querySelector("[data-start-check]");
    if (fc) fc.addEventListener("click", function () { play(g.check); sfx("pop"); });
  }

  var initials = ["T", "O", "N"];
  var initialsCursor = 0;
  try {
    var saved = localStorage.getItem("cs-game-initials");
    if (saved && /^[A-Z]{3}$/.test(saved)) initials = saved.split("");
  } catch (e) {}

  function focusInitialsInput() {
    var inp = UI.card && UI.card.querySelector("[data-ini-input]");
    if (inp) { inp.value = ""; inp.focus(); }
  }

  function syncInitialsUi() {
    var wrap = UI.card && UI.card.querySelector("[data-ini]");
    if (!wrap) return;
    Array.prototype.forEach.call(wrap.querySelectorAll(".cs-game__slot"), function (slot, idx) {
      var span = slot.querySelector("span");
      slot.classList.toggle("is-active", idx === initialsCursor);
      if (span) span.textContent = initials[idx];
    });
  }

  function setInitialsCursor(idx) {
    initialsCursor = Math.max(0, Math.min(2, idx));
    syncInitialsUi();
  }

  function changeInitial(delta, idx) {
    if (typeof idx === "number") setInitialsCursor(idx);
    var code = initials[initialsCursor].charCodeAt(0) - 65;
    code = (code + delta + 26) % 26;
    initials[initialsCursor] = String.fromCharCode(65 + code);
    syncInitialsUi();
    sfx("pop");
  }

  function typeInitial(ch) {
    initials[initialsCursor] = ch.toUpperCase();
    if (initialsCursor < 2) initialsCursor += 1;
    syncInitialsUi();
    sfx("pop");
  }

  function handleInitialsKey(e) {
    var key = e.key;
    if (/^[a-z]$/i.test(key)) {
      e.preventDefault();
      e.stopPropagation();
      typeInitial(key);
      return true;
    }
    if (key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      setInitialsCursor(initialsCursor - 1);
      return true;
    }
    if (key === "ArrowRight" || key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
      setInitialsCursor(initialsCursor + 1);
      return true;
    }
    if (key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      changeInitial(1);
      return true;
    }
    if (key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      changeInitial(-1);
      return true;
    }
    if (key === "Backspace") {
      e.preventDefault();
      e.stopPropagation();
      setInitialsCursor(initialsCursor - 1);
      return true;
    }
    if (key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      submitScore();
      return true;
    }
    return false;
  }

  function showScoreCard() {
    g.mode = "dead";
    g.submitting = false;
    initialsCursor = 0;
    var beatMsg = "";
    if (g.beat) {
      if (g.score > g.beat.score) {
        beatMsg = '<p class="cs-game__sub" style="color:#46c98b">You beat ' + g.beat.by + '! <svg style="width:1.15em;height:1.15em;vertical-align:-.18em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.2 4.3 h7.8 l-.5 6.2 c-.3 3-2 4.6-3.5 4.6 s-3.1-1.7-3.4-4.7 Z"/><path d="M8 6.2 c-2.4-.4-3.6.6-3.3 2.2 .3 1.5 1.7 2.3 3.6 2.1 M16.2 6.1 c2.4-.5 3.6.5 3.4 2.1 -.3 1.6-1.8 2.4-3.7 2.2"/><path d="M12 15.3 v3 M9 21 c1-1.7 5-1.7 6 0"/></svg></p>';
        g.beat = null; // challenge conquered — stop chasing it
        if (UI.beat) UI.beat.hidden = true;
      } else {
        beatMsg = '<p class="cs-game__sub">' + g.beat.by + " still leads with " + g.beat.score + "</p>";
      }
    }
    var goldMsg = g.goldRun > 0 ? ' · +' + g.goldRun + "★ banked" : "";
    var retryLabel = g.check > 1 ? "RETRY — LVL " + g.check + " · +" + parScore(g.check) : "RETRY";
    card(
      '<p class="cs-game__sub" style="margin-bottom:0">GAME OVER — LEVEL ' + g.level + "</p>" +
      '<div class="cs-game__big">' + g.score + "</div>" +
      '<p class="cs-game__sub">your best: ' + g.best + goldMsg + "</p>" +
      beatMsg +
      '<div class="cs-game__initials" data-ini></div>' +
      '<p class="cs-game__note">type letters · ←/→ move · ↑/↓ edit · enter saves</p>' +
      '<div class="cs-game__actions">' +
        '<button type="button" class="cs-game__btn" data-submit>SAVE SCORE</button>' +
        '<button type="button" class="cs-game__btn cs-game__btn--ghost" data-retry>' + retryLabel + "</button>" +
      "</div>" +
      '<div class="cs-game__actions cs-game__actions--sub">' +
        '<button type="button" class="cs-game__btn cs-game__btn--ghost" data-locker>LOCKER · ★ ' + g.gold + "</button>" +
      "</div>" +
      '<p class="cs-game__note" data-status></p>'
    );
    UI.card.querySelector("[data-locker]").addEventListener("click", function () { showLocker(showScoreCard); sfx("pop"); });
    var wrap = UI.card.querySelector("[data-ini]");
    var hidden = document.createElement("input");
    hidden.setAttribute("data-ini-input", "");
    hidden.type = "text";
    hidden.autocapitalize = "characters";
    hidden.autocomplete = "off";
    hidden.maxLength = 4;
    hidden.style.cssText = "position:absolute;opacity:0;pointer-events:none;width:1px;height:1px";
    hidden.addEventListener("input", function () {
      var ch = (hidden.value || "").replace(/[^a-zA-Z]/g, "").slice(-1);
      hidden.value = "";
      if (ch) typeInitial(ch);
    });
    wrap.appendChild(hidden);
    initials.forEach(function (ch, idx) {
      var slot = document.createElement("div");
      slot.className = "cs-game__slot";
      slot.setAttribute("data-slot", String(idx));
      slot.innerHTML = '<button type="button" aria-label="Letter up">▲</button><span>' + ch + "</span><button type=\"button\" aria-label=\"Letter down\">▼</button>";
      slot.addEventListener("click", function () { setInitialsCursor(idx); focusInitialsInput(); });
      slot.querySelectorAll("button")[0].addEventListener("click", function () { changeInitial(1, idx); });
      slot.querySelectorAll("button")[1].addEventListener("click", function () { changeInitial(-1, idx); });
      wrap.appendChild(slot);
    });
    syncInitialsUi();
    UI.card.querySelector("[data-retry]").addEventListener("click", function () { play(g.check > 1 ? g.check : 1); });
    UI.card.querySelector("[data-submit]").addEventListener("click", submitScore);
  }

  function submitScore() {
    if (g.submitting) return;
    var status = UI.card.querySelector("[data-status]");
    var submit = UI.card.querySelector("[data-submit]");
    var name = initials.join("");
    try { localStorage.setItem("cs-game-initials", name); } catch (e) {}
    if (g.score < 1) { showBoard(null); return; }
    g.submitting = true;
    status.textContent = "SAVING…";
    if (submit) {
      submit.disabled = true;
      submit.textContent = "SAVING…";
    }
    var b = bridge();
    fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ player: name, score: Math.min(g.score, 500), character: b ? b.variant() : null }),
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) { showBoard(j && j.data ? j.data.rank : null); })
      .catch(function () { showBoard(null, true); });
  }

  function showBoard(rank, offline) {
    g.mode = "board";
    g.locker = false;
    var name = initials.join("");
    var backHere = function () { showBoard(rank, offline); };
    card(
      '<h2 class="cs-game__title" style="font-size:30px">HIGH SCORES</h2>' +
      (rank ? '<p class="cs-game__sub" style="color:var(--accent,#fff48d)">you ranked #' + rank + "</p>" : "") +
      (offline ? '<p class="cs-game__sub">board offline — local best only</p>' : "") +
      '<ol class="cs-game__board" data-rows><li>loading…</li></ol>' +
      '<div class="cs-game__actions">' +
        '<button type="button" class="cs-game__btn" data-retry>PLAY AGAIN</button>' +
        (g.check > 1 ? '<button type="button" class="cs-game__btn cs-game__btn--ghost" data-retry-check>FROM LEVEL ' + g.check + " · +" + parScore(g.check) + "</button>" : "") +
      "</div>" +
      '<div class="cs-game__actions cs-game__actions--sub">' +
        '<button type="button" class="cs-game__btn cs-game__btn--ghost" data-share>CHALLENGE →</button>' +
        '<button type="button" class="cs-game__btn cs-game__btn--ghost" data-locker>LOCKER · ★ ' + g.gold + "</button>" +
      "</div>" +
      '<p class="cs-game__note" data-status></p>' +
      '<button type="button" class="cs-game__exit" data-exit>exit game</button>'
    );
    wireExit();
    UI.card.querySelector("[data-locker]").addEventListener("click", function () { showLocker(backHere); sfx("pop"); });
    UI.card.querySelector("[data-retry]").addEventListener("click", function () { play(); });
    var rc = UI.card.querySelector("[data-retry-check]");
    if (rc) rc.addEventListener("click", function () { play(g.check); });
    UI.card.querySelector("[data-share]").addEventListener("click", function () {
      var link = new URL("/play", window.location.href);
      link.searchParams.set("beat", String(g.score));
      link.searchParams.set("by", name);
      var url = link.toString();
      var text = "I scored " + g.score + " in DOT SHOT on chatzaki.com — beat that.";
      var status = UI.card.querySelector("[data-status]");
      if (navigator.share) {
        navigator.share({ title: "DOT SHOT", text: text, url: url }).catch(function () {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text + " " + url).then(function () {
          status.textContent = "CHALLENGE LINK COPIED";
        });
      }
    });
    var rows = UI.card.querySelector("[data-rows]");
    fetch(API + "/top", { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var list = (j && j.data) || [];
        if (!list.length) { rows.innerHTML = "<li>no scores yet — be first</li>"; return; }
        rows.innerHTML = list.map(function (row, i) {
          var you = row.player === name && Number(row.score) === g.score;
          return '<li' + (you ? ' class="is-you"' : "") + "><span>" + (i + 1) + ". " + row.player + "</span><span>" + row.score + "</span></li>";
        }).join("");
      })
      .catch(function () { rows.innerHTML = "<li>board offline</li>"; });
  }

  /* ---------------- open / close ---------------- */

  function open(opts) {
    buildOverlay();
    if (g.open) return;
    g.open = true;
    window.__csGameEverOpened = true;
    document.documentElement.classList.add("cs-gaming");
    g.beat = (opts && opts.beat) || g.beat;
    loadSaved();
    resize();
    updateHud();
    g.root.classList.add("is-open");
    if (g.beat) {
      UI.beat.hidden = false;
      UI.beat.textContent = "BEAT " + g.beat.score + " — " + g.beat.by;
    } else {
      UI.beat.hidden = true;
    }
    if (window.__lenis && window.__lenis.stop) { try { window.__lenis.stop(); } catch (e) {} }
    document.documentElement.style.overflow = "hidden";
    showIntro();
    g.last = 0;
    g.raf = requestAnimationFrame(loop);
  }

  function close() {
    if (!g.open) return;
    g.open = false;
    document.documentElement.classList.remove("cs-gaming");
    cancelAnimationFrame(g.raf);
    g.root.classList.remove("is-open");
    document.documentElement.style.overflow = "";
    if (window.__lenis && window.__lenis.start) { try { window.__lenis.start(); } catch (e) {} }
  }

  window.__csGame = {
    open: open,
    close: close,
    start: function (n) { if (g.open) play(Math.max(1, n | 0 || 1)); },
    state: function () { return { mode: g.mode, level: g.level, score: g.score, lives: g.lives, gold: g.gold, dotsLeft: g.dotsLeft, check: g.check }; },
  };

  // challenge links pre-arm the beat payload (the gate banner + auto-launch
  // are handled by mascot.js after character selection)
  try {
    var q = new URLSearchParams(location.search);
    var beatScore = parseInt(q.get("beat") || "", 10);
    var beatBy = (q.get("by") || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
    if (beatScore > 0 && beatScore <= 500 && beatBy.length === 3) {
      g.beat = { score: beatScore, by: beatBy };
      window.__csGameBeat = g.beat;
    }
  } catch (e) {}
})();
