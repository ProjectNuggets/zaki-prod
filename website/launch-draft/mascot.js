(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   *  Nova Nuggets mascot — living guide
   *
   *  Architecture notes (learned from the bundle):
   *  - The site sets [data-shown]{opacity:1!important;transform:none!important}
   *    on revealed elements, which kills any CSS/WAAPI transform/opacity
   *    animation on them. All motion therefore happens on OUR overlay
   *    elements, or via inline style.setProperty(..., "important"),
   *    or via additive WAAPI where the site does not fight the property.
   *  - window.__lenis is the Lenis instance → cinematic scroll with
   *    onComplete instead of scrollIntoView + fixed waits.
   *  - The toolkit pills are Matter.js bodies with a MouseConstraint on
   *    #cs-physics-box → we drag/throw REAL bodies with synthetic mouse
   *    events (non-bubbling so the site cursor never sees them).
   *  - The marquee is JS-driven (off -= speed each frame). We "overclock"
   *    it with an additive WAAPI translateX whose total distance is an
   *    exact multiple of the loop width → seamless handback, no clones.
   * ------------------------------------------------------------------ */

  var __tokStyle = window.getComputedStyle(document.documentElement);
  var __tok = function (n, fb) { var v = (__tokStyle.getPropertyValue(n) || "").trim(); return v || fb; };
  var INK_DARK = __tok("--ink", "#0D0B09");
  var INK_LIGHT = __tok("--accent", "#D24430");
  var INK_LIGHT_RGB = __tok("--accent-rgb", "210,68,48");
  var PREFERS_REDUCED = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var HOME_AGENT_BOT = new Image();
  HOME_AGENT_BOT.decoding = "async";
  HOME_AGENT_BOT.src = "/site/assets/zaki-worker-full.png";

  // One dial for the whole tour: every guided wait, scroll, drag and
  // scan is multiplied by this. 0.7 = 30% faster than authored timings.
  // Reading waits are exempt (gwait `exact`) — the dial paces movement,
  // never how long a bubble stays readable.
  var TOUR_TEMPO = 0.7;

  function tempo(ms) {
    return guide.running ? ms * TOUR_TEMPO : ms;
  }

  /* ------------------------------------------------------------------ *
   *  Sound — synthesized with WebAudio, strictly opt-in. No assets.
   * ------------------------------------------------------------------ */

  var sound = {
    enabled: (function () {
      try { return window.localStorage.getItem("cs-sound") === "1"; } catch (e) { return false; }
    })(),
    ctx: null,
  };

  function soundCtx() {
    if (!sound.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      sound.ctx = new AC();
    }
    if (sound.ctx.state === "suspended") sound.ctx.resume();
    return sound.ctx;
  }

  function sfx(name) {
    if (!sound.enabled) return;
    var ctx = soundCtx();
    if (!ctx) return;
    var t = ctx.currentTime;
    var out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);

    function tone(type, f0, f1, dur, gain, delay) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + (delay || 0));
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + (delay || 0) + dur);
      g.gain.setValueAtTime(gain, t + (delay || 0));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (delay || 0) + dur);
      o.connect(g); g.connect(out);
      o.start(t + (delay || 0));
      o.stop(t + (delay || 0) + dur + 0.02);
    }
    function noise(dur, gain, freq, delay) {
      var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      var srcN = ctx.createBufferSource();
      srcN.buffer = buf;
      var f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = freq || 900;
      f.Q.value = 0.8;
      var g = ctx.createGain();
      g.gain.setValueAtTime(gain, t + (delay || 0));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (delay || 0) + dur);
      srcN.connect(f); f.connect(g); g.connect(out);
      srcN.start(t + (delay || 0));
    }

    if (name === "pop") { tone("sine", 520, 780, 0.07, 0.13); }
    else if (name === "chomp") { noise(0.08, 0.11, 1400); tone("triangle", 300, 90, 0.12, 0.1); }
    else if (name === "stamp") { tone("sine", 160, 55, 0.16, 0.34); noise(0.05, 0.16, 2400); }
    else if (name === "flip") { noise(0.05, 0.09, 2600); tone("triangle", 900, 500, 0.05, 0.04); }
    else if (name === "whoosh") { noise(0.35, 0.17, 500); }
    else if (name === "scan") { tone("sine", 220, 880, 1.6, 0.16); tone("sine", 223, 886, 1.6, 0.09); }
    else if (name === "shake") { noise(0.3, 0.2, 180); tone("sine", 70, 40, 0.3, 0.24); }
    else if (name === "warn") { tone("square", 1320, 1320, 0.045, 0.07); tone("square", 990, 990, 0.05, 0.07, 0.09); }
  }

  /* Cheerful chiptune bed — generative, upbeat, quiet. A bouncy square
     bass + bright arpeggio + airy hats on a 4-chord loop (~112 BPM).
     Runs under the SFX; ties to the same sound toggle. */
  var music = { on: false, timer: 0, nextNote: 0, step: 0, master: null };
  var MUSIC_BPM = 112;
  var MUSIC_CHORDS = [
    [48, 52, 55, 60], // C
    [43, 47, 50, 55], // G
    [45, 48, 52, 57], // Am
    [41, 45, 48, 53], // F
  ];

  function midiHz(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function musicNote(when, midi, dur, type, gain, cutoff) {
    var ctx = sound.ctx;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.value = midiHz(midi);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    var target = music.master;
    if (cutoff) {
      var f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = cutoff;
      o.connect(g); g.connect(f); f.connect(target);
    } else {
      o.connect(g); g.connect(target);
    }
    o.start(when);
    o.stop(when + dur + 0.03);
  }

  function musicHat(when) {
    var ctx = sound.ctx;
    var len = Math.floor(ctx.sampleRate * 0.03);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var srcN = ctx.createBufferSource();
    srcN.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6500;
    var g = ctx.createGain();
    g.gain.value = 0.016;
    srcN.connect(f); f.connect(g); g.connect(music.master);
    srcN.start(when);
  }

  // 16-bar form: A (arp up) → A' (arp down) → B (sparse, breathing) → A''
  // (octave up) with fills at the section turns — the loop reads as a
  // little composition instead of a 4-bar tattoo.
  var ARP_UP = [0, 1, 2, 3, 2, 1];
  var ARP_DOWN = [3, 2, 1, 0, 1, 2];

  function musicSchedule() {
    var ctx = sound.ctx;
    if (!ctx || !music.on) return;
    var stepDur = 60 / MUSIC_BPM / 4; // 16ths
    while (music.nextNote < ctx.currentTime + 0.25) {
      var s = music.step % 256;                // 16 bars of 16 steps
      var bar = Math.floor(s / 16);
      var beat = s % 16;
      var section = Math.floor(bar / 4);       // 0:A 1:A' 2:B 3:A''
      var chord = MUSIC_CHORDS[bar % 4];
      var t = music.nextNote;
      var jit = function (g) { return g * (0.88 + Math.random() * 0.24); };

      if (section === 2) {
        // B: softer but always present — quarters on the bass, a warm
        // sustained third, gentle melody every other bar, steady hats
        if (beat % 4 === 0) musicNote(t, chord[0] - 12, stepDur * 3.2, "square", jit(0.042), 380);
        if (beat === 0) musicNote(t, chord[1] + 12, stepDur * 14, "triangle", jit(0.016));
        if (bar % 2 === 1 && beat % 4 === 2) {
          musicNote(t, chord[[2, 3, 2, 1][Math.floor(beat / 4)]] + 24, stepDur * 1.6, "triangle", jit(0.024));
        }
        if (beat % 4 === 2) musicHat(t);
      } else {
        // A sections: bouncy bass
        if (beat === 0 || beat === 6 || beat === 8) musicNote(t, chord[0] - 12, stepDur * 1.7, "square", jit(0.05), 420);
        if (beat === 11 || beat === 14) musicNote(t, chord[2] - 12, stepDur * 1.2, "square", jit(0.038), 420);
        // melody: pattern by section, octave lift on the last pass
        if (beat % 2 === 0 && beat !== 6 && beat !== 14 && Math.random() > 0.07) {
          var pat = section === 1 ? ARP_DOWN : ARP_UP;
          var lift = section === 3 ? 36 : 24;
          musicNote(t, chord[pat[Math.floor(beat / 2) % 6]] + lift, stepDur * 0.9, "triangle", jit(0.032));
        }
        if (beat === 12) musicNote(t, chord[3] + 24, stepDur * 1.4, "square", jit(0.014));
        if (beat % 4 === 2) musicHat(t);
      }

      // fill: quick ascending run closing each section (bars 3/7/11/15)
      if (bar % 4 === 3 && beat >= 12) {
        musicNote(t, chord[beat - 12] + 24, stepDur * 0.8, "triangle", jit(0.028));
        musicHat(t);
      }

      music.nextNote += stepDur;
      music.step += 1;
    }
  }

  function startMusic() {
    if (music.on) return;
    var ctx = soundCtx();
    if (!ctx) return;
    music.on = true;
    music.master = ctx.createGain();
    music.master.gain.value = 0;
    music.master.connect(ctx.destination);
    music.master.gain.setTargetAtTime(0.55, ctx.currentTime, 1.6);
    music.nextNote = ctx.currentTime + 0.06;
    music.step = 0;
    music.timer = window.setInterval(musicSchedule, 90);
  }

  function stopMusic() {
    if (!music.on) return;
    music.on = false;
    window.clearInterval(music.timer);
    if (sound.ctx && music.master) {
      music.master.gain.setTargetAtTime(0.0001, sound.ctx.currentTime, 0.5);
      var m = music.master;
      window.setTimeout(function () { try { m.disconnect(); } catch (e) {} }, 1800);
    }
    music.master = null;
  }

  function setSound(on) {
    sound.enabled = !!on;
    try { window.localStorage.setItem("cs-sound", on ? "1" : "0"); } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll("[data-sound-toggle]"), function (b) {
      var label = b.querySelector("[data-sound-label]");
      if (label) label.textContent = "sound: " + (on ? "on" : "off");
      else b.textContent = "sound: " + (on ? "on" : "off");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (on) { sfx("pop"); startMusic(); }
    else stopMusic();
  }

  /* ------------------------------------------------------------------ *
   *  Matter.js trap — runs before the bundle boots its physics.
   *  Captures the engine + mouse constraint so the mascot can move REAL
   *  bodies. Also fixes the site's retina drag: Mouse.create on a <div>
   *  must keep pixelRatio 1 (Matter's formula only needs dpr for canvas).
   * ------------------------------------------------------------------ */
  (function trapMatter() {
    var current = window.Matter || null;

    function wrap(M) {
      if (!M || !M.MouseConstraint || M.__csTrapped) return;
      M.__csTrapped = true;
      var origCreate = M.MouseConstraint.create;
      M.MouseConstraint.create = function (engine) {
        var mc = origCreate.apply(this, arguments);
        window.__csPhysics = { engine: engine, mc: mc, Matter: M };
        window.setTimeout(function () {
          var mouse = mc.mouse;
          if (mouse && mouse.element && mouse.element.tagName !== "CANVAS") {
            mouse.pixelRatio = 1;
          }
        }, 0);
        return mc;
      };
    }

    wrap(current);
    try {
      Object.defineProperty(window, "Matter", {
        configurable: true,
        get: function () { return current; },
        set: function (value) { current = value; wrap(value); },
      });
    } catch (e) { /* property locked — fallback path will handle it */ }
  })();

  var MODES = {
    hero: { x: 0.76, y: 0.27 },
    work: { x: 0.18, y: 0.42 },
    cases: { x: 0.5, y: 0.18 },
    method: { x: 0.82, y: 0.44 },
    toolkit: { x: 0.62, y: 0.52 },
    faq: { x: 0.78, y: 0.58 },
    contact: { x: 0.72, y: 0.45 },
  };

  var state = {
    mode: "hero",
    guideMode: "unset",
    guideDone: false,
    anchor: null,              // function returning live {x,y} viewport point
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    gazeTarget: null,          // function or {x,y}; null → pointer
    pointer: { x: 0, y: 0 },
    eyesOpen: false,
    blink: 0,                  // 0 open → 1 closed
    blinkAt: 0,
    tick: 0,
    lastFrame: 0,
    blocks: [],
    gate: null,
    sayTimer: 0,
    moodTimer: 0,
    lightInk: false,
    toneAt: 0,
    trailAt: 0,
    quipAt: 0,
    userScrollLocked: false,
    shipPrepared: false,
    organismConsumed: false,
    heroBites: [],
    squash: 0,
    squashVel: 0,
    restScale: 1,
    mascotVariant: (function () {
      try { return window.localStorage.getItem("cs-mascot-variant") || "original"; } catch (e) { return "original"; }
    })(),
    chatOpen: false,
    chatBusy: false,
    chatGreeted: false,
    chatAbort: null,
    chatAnchored: false,
    readingQuiet: false,
    wreckedFaqs: [],
  };

  var guide = {
    running: false,
    aborted: false,
    waiters: new Set(),
    cleanups: [],
  };

  var ABORT = { guideAbort: true };

  var scrollBlockOptions = { passive: false, capture: true };

  /* ------------------------------------------------------------------ *
   *  Small utils
   * ------------------------------------------------------------------ */

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  // Small-viewport check — used sparingly to keep the tour readable on
  // phones (anchors authored for desktop put the mascot on top of text).
  // Portrait tablets (iPad 768/834/1024) share the phone-safe anchors: the
  // desktop coordinates land the mascot on top of text there too.
  function isMobile() {
    if (window.innerWidth < 640) return true;
    return window.innerWidth <= 1024 && window.innerHeight > window.innerWidth;
  }

  function idleWait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  // Abort-aware wait: rejects immediately when the tour is skipped.
  // `exact` skips the tempo dial — for waits that track an animation
  // whose duration was already tempo-scaled.
  function gwait(ms, exact) {
    if (!exact) ms = tempo(ms);
    if (guide.aborted) return Promise.reject(ABORT);
    return new Promise(function (resolve, reject) {
      var waiter = { reject: reject, id: 0 };
      waiter.id = window.setTimeout(function () {
        guide.waiters.delete(waiter);
        if (guide.aborted) reject(ABORT);
        else resolve();
      }, ms);
      guide.waiters.add(waiter);
    });
  }

  function abortGuide() {
    if (!guide.running || guide.aborted) return;
    guide.aborted = true;
    guide.waiters.forEach(function (waiter) {
      window.clearTimeout(waiter.id);
      waiter.reject(ABORT);
    });
    guide.waiters.clear();
  }

  function onCleanup(fn) {
    guide.cleanups.push(fn);
  }

  function runCleanups() {
    guide.cleanups.splice(0).forEach(function (fn) {
      try { fn(); } catch (e) { /* ignore */ }
    });
  }

  function setImportant(node, prop, value) {
    node.style.setProperty(prop, value, "important");
  }

  function ensureStyleLink() {
    if (document.querySelector('link[rel="stylesheet"][href*="/mascot.css"]')) return;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/mascot.css?v=20260711-evidence-premium-3";
    document.head.appendChild(link);
  }

  /* ------------------------------------------------------------------ *
   *  Mascot node, speech
   * ------------------------------------------------------------------ */

  function createMascot() {
    var node = document.createElement("div");
    node.className = "cs-ai-mascot";
    node.dataset.mode = "hero";
    node.innerHTML =
      '<canvas aria-hidden="true"></canvas>' +
      '<span class="cs-ai-mascot__bubble" aria-live="polite"></span>';
    document.body.appendChild(node);
    return node;
  }

  function mascotEl() {
    return document.querySelector(".cs-ai-mascot");
  }

  function mascotCenter() {
    // state.pos IS the mascot center (frame() positions the element from
    // it) — reading the DOM here forced a reflow on every caller, every
    // frame (eyes, nav pet, ropes). Rect only during the first frames.
    if (state.tick > 3) return { x: state.pos.x, y: state.pos.y };
    var mascot = mascotEl();
    if (!mascot) return { x: state.pos.x, y: state.pos.y };
    var rect = mascot.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  // Reading rhythm: ~250ms per word, never a flash, never a lecture.
  // Driving or idle, the cadence is the same — and every reading wait
  // passes `exact` to gwait so the tour tempo dial can't compress it:
  // scrolls can rush, text can't.
  function sayMs(text) {
    var words = String(text).trim().split(/\s+/).length;
    return clamp(760 + words * 250, 1400, 4600);
  }

  function say(text, duration) {
    var mascot = mascotEl();
    var bubble = mascot && mascot.querySelector(".cs-ai-mascot__bubble");
    if (!mascot || !bubble) return 0;
    var ms = duration === undefined ? sayMs(text) : duration;
    if (state.sayTimer) window.clearTimeout(state.sayTimer);
    state.bubbleHalf = 0;
    state.lastBShift = null;
    bubble.textContent = "";
    String(text)
      .split(/(\s+)/)
      .forEach(function (part) {
        if (!part.trim()) {
          bubble.appendChild(document.createTextNode(part));
          return;
        }
        var word = document.createElement("span");
        word.textContent = part;
        word.style.setProperty("--i", bubble.querySelectorAll("span").length);
        bubble.appendChild(word);
      });
    mascot.classList.remove("has-bubble");
    void mascot.offsetWidth;
    mascot.classList.add("has-bubble");
    if (ms > 0) {
      state.sayTimer = window.setTimeout(function () {
        mascot.classList.remove("has-bubble");
        state.sayTimer = 0;
      }, ms);
    }
    return ms;
  }

  function stopTalking() {
    var mascot = mascotEl();
    if (state.sayTimer) window.clearTimeout(state.sayTimer);
    state.sayTimer = 0;
    if (!mascot) return;
    var b = mascot.querySelector(".cs-ai-mascot__bubble");
    if (b && mascot.classList.contains("has-bubble")) {
      // symmetric exit: despop, then drop the bubble class
      b.classList.add("is-leaving");
      window.setTimeout(function () {
        b.classList.remove("is-leaving");
        mascot.classList.remove("has-bubble");
      }, 175);
      return;
    }
    mascot.classList.remove("has-bubble");
  }

  // Each entry: string, or { text, hold (extra ms after reading) }
  async function saySequence(lines) {
    for (var i = 0; i < lines.length; i += 1) {
      var item = typeof lines[i] === "string" ? { text: lines[i] } : lines[i];
      var ms = say(item.text);
      await gwait(ms + (item.hold || 260), true);
    }
  }

  function setMood(mood, duration) {
    var mascot = mascotEl();
    if (!mascot) return;
    if (state.moodTimer) window.clearTimeout(state.moodTimer);
    mascot.dataset.mood = mood || "idle";
    if (duration) {
      state.moodTimer = window.setTimeout(function () {
        mascot.dataset.mood = "idle";
        state.moodTimer = 0;
      }, duration);
    }
  }

  /* ------------------------------------------------------------------ *
   *  Anchors — live positions, recomputed every frame
   * ------------------------------------------------------------------ */

  function pointOn(node, xRatio, yRatio) {
    if (!node) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var rect = node.getBoundingClientRect();
    return {
      x: rect.left + rect.width * xRatio,
      y: rect.top + rect.height * yRatio,
    };
  }

  function clampToViewport(point, margin) {
    var m = margin || 76;
    return {
      x: clamp(point.x, m, window.innerWidth - m),
      y: clamp(point.y, m, window.innerHeight - m),
    };
  }

  // anchor to a live node point (+ optional pixel offset)
  function anchorNode(node, xRatio, yRatio, dx, dy) {
    state.anchor = function () {
      var p = pointOn(node, xRatio, yRatio);
      return clampToViewport({ x: p.x + (dx || 0), y: p.y + (dy || 0) });
    };
  }

  function anchorPoint(x, y) {
    state.anchor = function () {
      return clampToViewport({ x: x, y: y });
    };
  }

  function releaseAnchor() {
    state.anchor = null;
  }

  function lookAt(target) {
    state.gazeTarget = target; // fn | {x,y} | null (pointer)
  }

  /* ------------------------------------------------------------------ *
   *  Section blocks (idle follow)
   * ------------------------------------------------------------------ */

  function sectionFrom(node) {
    if (!node) return null;
    return node.closest("section, article, main > div, [data-section]") || node;
  }

  function findByText(words) {
    var nodes = Array.prototype.slice.call(document.querySelectorAll("section, article, [id]"));
    var best = null;
    for (var i = 0; i < nodes.length; i += 1) {
      var text = (nodes[i].innerText || "").toLowerCase();
      var hit = words.some(function (word) { return text.indexOf(word) !== -1; });
      if (!hit) continue;
      var rect = nodes[i].getBoundingClientRect();
      if (rect.height < 180 || rect.width < 180) continue;
      if (!best || rect.height < best.getBoundingClientRect().height) best = nodes[i];
    }
    return best;
  }

  function uniqueBlocks(items) {
    var seen = [];
    return items.filter(function (item) {
      if (!item.el || seen.indexOf(item.el) !== -1) return false;
      seen.push(item.el);
      return true;
    });
  }

  function collectBlocks() {
    var hero = document.getElementById("top") || document.querySelector("header");
    var workforce = document.getElementById("cs-workforce");
    var physics = document.getElementById("cs-physics-box");
    var faqItem = document.querySelector("[data-faq]");
    var mail = document.querySelector('a[href^="mailto:"]');
    var show = document.querySelector("[data-show]");
    var phases = document.getElementById("cs-phases");
    var growth = document.getElementById("how");
    var sections = Array.prototype.slice.call(document.querySelectorAll("header[data-screen-label], section[data-screen-label], section[data-dark]"));
    var root = document.getElementById("cs-root") || document.querySelector("main") || document.body;

    var labeled = sections.map(function (section, idx) {
      var label = ((section.getAttribute("data-screen-label") || "") + " " + (section.id || "")).toLowerCase();
      var key = idx % 2 ? "method" : "work";
      if (section === hero || label.indexOf("hero") !== -1 || section.id === "top") key = "hero";
      else if (label.indexOf("what we do") !== -1 || label.indexOf("workforce") !== -1 || label.indexOf("selected work") !== -1) key = "work";
      else if (label.indexOf("build") !== -1 || label.indexOf("phase") !== -1 || label.indexOf("how we work") !== -1 || section.id === "cs-phases") key = "method";
      else if (label.indexOf("toolkit") !== -1 || (physics && section.contains(physics))) key = "toolkit";
      else if (label.indexOf("faq") !== -1 || (faqItem && section.contains(faqItem))) key = "faq";
      else if (label.indexOf("contact") !== -1 || (mail && section.contains(mail))) key = "contact";
      else if (section.hasAttribute("data-dark")) key = idx % 2 ? "toolkit" : "method";
      return { key: key, el: section };
    });

    state.blocks = uniqueBlocks([
      { key: "hero", el: hero || root },
      { key: "work", el: workforce },
      { key: "cases", el: sectionFrom(show) || findByText(["selected work"]) },
      { key: "method", el: phases || findByText(["blueprint", "prototype"]) },
      { key: "growth", el: growth },
      { key: "toolkit", el: sectionFrom(physics) || findByText(["toolkit"]) },
      { key: "faq", el: sectionFrom(faqItem) || findByText(["faq", "questions"]) },
      { key: "contact", el: sectionFrom(mail) || findByText(["hello@"]) },
    ].concat(labeled));
  }

  function activeBlock() {
    var anchorY = window.innerHeight * 0.48;
    var winner = state.blocks[0];
    var score = Infinity;
    state.blocks.forEach(function (block) {
      var rect = block.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      var center = rect.top + rect.height * 0.42;
      var next = Math.abs(center - anchorY);
      if (next < score) { score = next; winner = block; }
    });
    return winner || state.blocks[0];
  }

  function idleFollowPoint(block) {
    var base = MODES[block.key] || MODES.hero;
    if (block.key === "hero" && isMobile()) base = { x: 0.94, y: 0.115 };
    // The workforce statement needs its left column clear. On desktop the
    // worker lives in the intentional gap between that copy and the deck.
    if (block.el && block.el.id === "cs-workforce" && !isMobile()) base = { x: 0.56, y: 0.24 };
    // mobile contact: rest in the gap below the CTA, not on top of it
    if (block.key === "contact" && isMobile()) base = { x: 0.85, y: 0.5 };
    // narrow viewports, rest of sections: top-right corner — the stacked
    // copy owns the full width, so the desktop ratios land on text
    else if (isMobile() && block.key !== "hero") base = { x: 0.94, y: 0.1 };
    var x = window.innerWidth * base.x;
    var y = window.innerHeight * base.y;
    if (block.el && block.key !== "hero") {
      var rect = block.el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        // phones: let it hug the right edge — 140px of margin eats half the screen
        var mx = isMobile() ? 90 : 140;
        x = clamp(rect.left + rect.width * base.x, 120, window.innerWidth - mx);
        y = clamp(rect.top + rect.height * base.y, 130, window.innerHeight - 140);
      }
    }
    if (block.key === "contact") {
      // resting spot: drift lazily in the open space by the big email
      var tt = performance.now();
      x += Math.sin(tt * 0.00052) * 26;
      y += Math.cos(tt * 0.00041) * 18;
    }
    return { x: x, y: y };
  }

  /* ------------------------------------------------------------------ *
   *  Scroll — Lenis-aware, closed loop
   * ------------------------------------------------------------------ */

  function lenis() {
    return window.__lenis || null;
  }

  function targetScrollFor(node, align) {
    var rect = node.getBoundingClientRect();
    var vh = window.innerHeight;
    var top = rect.top + window.scrollY;
    var y;
    if (typeof align === "number") y = top - vh * align;
    else if (align === "start") y = top - vh * 0.12;
    else if (align === "end") y = top + rect.height - vh * 0.9;
    else y = top - Math.max(60, (vh - Math.min(rect.height, vh * 0.86)) / 2);
    return clamp(y, 0, document.documentElement.scrollHeight - vh);
  }

  function scrollToNode(node, align) {
    if (!node) return Promise.resolve();
    var target = targetScrollFor(node, align);
    var distance = Math.abs(target - window.scrollY);
    if (distance < 8) return Promise.resolve();
    var duration = clamp(0.62 + distance / 2400, 0.8, 1.7); // seconds
    if (guide.running) duration *= TOUR_TEMPO;
    var api = lenis();

    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      if (api && typeof api.scrollTo === "function") {
        try {
          api.scrollTo(target, {
            duration: duration,
            easing: function (t) { return 1 - Math.pow(1 - t, 3.4); },
            lock: true,
            force: true,
            onComplete: finish,
          });
          // Safety net in case onComplete never fires.
          window.setTimeout(finish, duration * 1000 + 700);
          return;
        } catch (e) { /* fall through */ }
      }
      var startY = window.scrollY;
      var start = performance.now();
      var ms = duration * 1000;
      (function step(now) {
        var t = clamp((now - start) / ms, 0, 1);
        var eased = 1 - Math.pow(1 - t, 3.4);
        window.scrollTo(0, startY + (target - startY) * eased);
        if (t < 1) window.requestAnimationFrame(step);
        else finish();
      })(start);
    }).then(function () {
      return guide.running ? gwait(140) : idleWait(140);
    });
  }

  // rAF scroll segment with easing; abort-aware.
  function animScroll(fromY, toY, ms, easing) {
    ms = tempo(ms);
    return new Promise(function (resolve, reject) {
      var start = performance.now();
      (function step(now) {
        if (guide.aborted) { reject(ABORT); return; }
        var t = clamp((now - start) / ms, 0, 1);
        window.scrollTo(0, fromY + (toY - fromY) * easing(t));
        if (t < 1) window.requestAnimationFrame(step);
        else resolve();
      })(start);
    });
  }

  // The mascot DRAGS the page itself: pulls, stalls halfway, strains,
  // then yanks it home with a little overshoot.
  async function draggedScrollTo(node, align, struggle) {
    if (!node) return;
    var target = targetScrollFor(node, align);
    var from = window.scrollY;
    var dist = target - from;
    if (Math.abs(dist) < 8) return;

    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
    setMood("grab", struggle ? 2600 : 1400);
    var stopTether = tetherTo(function () { return pointOn(node, 0.5, 0.06); }, struggle ? 2500 : 1300);

    if (struggle) {
      // pull… stall… strain… yank
      await animScroll(from, from + dist * 0.46, 500, easeOut);
      setMood("smash", 760);
      var strainStart = performance.now();
      while (performance.now() - strainStart < 260) {
        if (guide.aborted) { stopTether(); throw ABORT; }
        window.scrollTo(0, from + dist * 0.46 + Math.sin((performance.now() - strainStart) * 0.055) * 5);
        await new Promise(function (r) { window.requestAnimationFrame(r); });
      }
      setMood("grab", 1000);
      await animScroll(window.scrollY, target + Math.sign(dist) * 14, 540, easeOut);
      await animScroll(target + Math.sign(dist) * 14, target, 260, easeOut);
    } else {
      await animScroll(from, target, clamp(620 + Math.abs(dist) / 3, 700, 1300), easeOut);
    }
    stopTether();
    await gwait(120);
  }

  /* ------------------------------------------------------------------ *
   *  Scroll / interaction lock
   * ------------------------------------------------------------------ */

  function touchFightProbe(event) {
    if (!state.userScrollLocked) return;
    // taps on allowed UI (skip chip, sound, play…) aren't a fight
    if (event.target && event.target.closest && event.target.closest(".cs-guide-skip, .cs-guide-gate, .cs-nav-pet, [data-sound-toggle], .cs-play-chip, .cs-guide-confirm")) return;
    noteScrollFight();
  }

  function preventUserScroll(event) {
    if (!state.userScrollLocked) return;
    event.preventDefault();
    event.stopPropagation();
    noteScrollFight();
  }

  /* The visitor fights the wheel: first burst of scrolling gets a bubble,
     the next one gets the stop-the-tour modal. Bursts are wheel/touch
     events separated by a quiet gap, so one flick counts once. */
  function noteScrollFight() {
    if (!guide.running || guide.aborted) return;
    var now = performance.now();
    if (now - (state.scrollFightAt || 0) > 400) {
      state.scrollFightBursts = (state.scrollFightBursts || 0) + 1;
      state.scrollFightStart = now;
    }
    state.scrollFightAt = now;
    // trackpad momentum never leaves a quiet gap — a single SUSTAINED
    // scroll (1.5s of fighting) escalates to the modal too
    var sustained = state.scrollFightBursts === 1 && now - (state.scrollFightStart || now) > 1500;
    if (state.scrollFightBursts === 1 && !sustained) {
      if (now - (state.scrollNagAt || 0) > 6000) {
        state.scrollNagAt = now;
        say("Tour mode — I'm driving. ESC hands you the wheel.", 2600);
      }
    } else if ((state.scrollFightBursts >= 2 || sustained) && !document.querySelector(".cs-guide-confirm")) {
      state.scrollFightBursts = 0;
      guideConfirmModal({
        body: "Want to scroll on your own? That ends the tour and hands you the wheel.",
        stopLabel: "Stop the tour — I'll scroll",
      });
    }
  }

  function preventScrollKeys(event) {
    if (!state.userScrollLocked) return;
    var keys = [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"];
    if (keys.indexOf(event.key) !== -1) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function preventGuideClicks(event) {
    if (!state.userScrollLocked) return;
    if (event.target.closest(".cs-guide-skip, .cs-guide-gate, .cs-nav-pet, [data-sound-toggle], .cs-play-chip, .cs-guide-confirm")) return;
    var target = event.target.closest("[data-show], a[href], button");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    // nav links don't just die — offer to stop the tour and go
    var navLink = event.target.closest('#cs-nav a[href^="#"], .cs-quote-chip');
    if (navLink && guide.running) guideNavModal(navLink);
  }

  /* Stopping the tour is a choice, not an accident — one confirm modal,
     reused by nav clicks and scroll fights. */
  function guideConfirmModal(opts) {
    if (document.querySelector(".cs-guide-confirm")) return;
    var name = "ZEE";
    var wrap = document.createElement("div");
    wrap.className = "cs-guide-confirm";
    wrap.innerHTML =
      '<div class="cs-guide-confirm__card" role="dialog" aria-modal="true" aria-label="Stop the tour?">' +
      "<h3>" + name + " is mid-tour.</h3>" +
      "<p>" + opts.body + "</p>" +
      '<div class="cs-guide-confirm__actions">' +
      '<button type="button" data-confirm-stop>' + opts.stopLabel + "</button>" +
      '<button type="button" data-confirm-stay>Keep riding</button>' +
      "</div></div>";
    document.body.appendChild(wrap);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { wrap.classList.add("is-in"); });
    });
    function close() {
      wrap.classList.remove("is-in");
      window.setTimeout(function () { wrap.remove(); }, 260);
    }
    onCleanup(function () { if (wrap.isConnected) close(); });
    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-confirm-stop]")) {
        close();
        abortGuide();
        if (opts.onStop) window.setTimeout(opts.onStop, 380);
      } else if (e.target.closest("[data-confirm-stay]") || e.target === wrap) {
        close();
      }
    });
  }

  /* Clicking a nav destination mid-tour: confirm before taking the wheel. */
  function guideNavModal(link) {
    var label = (link.textContent || "").replace(/[→↗]/g, "").trim() || "that section";
    var href = link.getAttribute("href");
    var isQuote = href === "#contact";
    guideConfirmModal({
      body: "Jumping to “" + label + "” hands you the wheel and ends the tour.",
      stopLabel: "Stop the tour → " + label,
      onStop: function () {
        if (isQuote) { openLeadModal(); return; }
        var node = href && href.charAt(0) === "#" ? document.querySelector(href) : null;
        if (!node) { if (href) window.location.href = href; return; }
        var api = lenis();
        if (api && api.scrollTo) { try { api.scrollTo(node, { offset: -70 }); return; } catch (err) {} }
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    });
  }

  function lockUserScroll() {
    if (state.userScrollLocked) return;
    state.userScrollLocked = true;
    document.documentElement.classList.add("cs-ai-guiding");
    var api = lenis();
    if (api && api.stop) { try { api.stop(); } catch (e) {} }
    window.addEventListener("wheel", preventUserScroll, scrollBlockOptions);
    window.addEventListener("touchmove", preventUserScroll, scrollBlockOptions);
    window.addEventListener("touchstart", touchFightProbe, { passive: true, capture: true });
    window.addEventListener("keydown", preventScrollKeys, true);
    window.addEventListener("click", preventGuideClicks, true);
  }

  function unlockUserScroll() {
    if (!state.userScrollLocked) return;
    state.userScrollLocked = false;
    document.documentElement.classList.remove("cs-ai-guiding");
    var api = lenis();
    if (api && api.start) { try { api.start(); } catch (e) {} }
    window.removeEventListener("wheel", preventUserScroll, scrollBlockOptions);
    window.removeEventListener("touchstart", touchFightProbe, { passive: true, capture: true });
    window.removeEventListener("touchmove", preventUserScroll, scrollBlockOptions);
    window.removeEventListener("keydown", preventScrollKeys, true);
    window.removeEventListener("click", preventGuideClicks, true);
  }

  /* ------------------------------------------------------------------ *
   *  Skip control
   * ------------------------------------------------------------------ */

  // Rough full-tour length at the current tempo — drives the countdown.
  // Measured end-to-end at TOUR_TEMPO 0.7 on the current guided layout (1:56),
  // padded a touch so the clock never hits 0:00 mid-tour.
  var TOUR_ESTIMATE_MS = 118000;

  function tourClock(ms) {
    var s = Math.ceil(ms / 1000);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function showSkip() {
    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "cs-guide-skip";
    // phones have no ESC key — the chip itself is the skip button there
    chip.innerHTML = "<span>" + (isMobile() ? "SKIP" : "ESC") + "</span> <b>" + tourClock(TOUR_ESTIMATE_MS) + "</b>";
    chip.addEventListener("click", abortGuide);
    chip.classList.add("is-entering");
    document.body.appendChild(chip);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { chip.classList.remove("is-entering"); });
    });

    var endsAt = performance.now() + TOUR_ESTIMATE_MS;
    var counter = chip.querySelector("b");
    // the mobile action bar's play chip doubles as the skip control — feed it
    // the same countdown so the time replaces the play glyph while driving
    var playTime = document.querySelector(".cs-play-chip .cs-chip-time");
    if (playTime) playTime.textContent = tourClock(TOUR_ESTIMATE_MS);
    var timer = window.setInterval(function () {
      var left = Math.max(0, endsAt - performance.now());
      var label = tourClock(left);
      counter.textContent = label;
      if (playTime) playTime.textContent = label;
    }, 500);

    function onKey(event) {
      if (event.key === "Escape") abortGuide();
    }
    window.addEventListener("keydown", onKey, true);

    onCleanup(function () {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey, true);
      if (playTime) playTime.textContent = "";
      chip.classList.add("is-hidden");
      window.setTimeout(function () { chip.remove(); }, 500);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Overlay FX
   * ------------------------------------------------------------------ */

  // Effects that mark CONTENT live in document coordinates, so they stay
  // glued to what they mark when the page scrolls (fixed ones drift).
  function docLayer() {
    var layer = document.getElementById("cs-doc-fx");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "cs-doc-fx";
      document.body.appendChild(layer);
    }
    return layer;
  }

  function placeInDoc(node, viewportX, viewportY) {
    node.style.left = (viewportX + window.scrollX).toFixed(1) + "px";
    node.style.top = (viewportY + window.scrollY).toFixed(1) + "px";
    docLayer().appendChild(node);
  }

  function createImpact(x, y, label) {
    var impact = document.createElement("span");
    impact.className = "cs-impact-ring";
    if (label) impact.dataset.label = label;
    placeInDoc(impact, x, y);
    window.setTimeout(function () { impact.remove(); }, 1100);
  }

  // Tether with rope physics: a light verlet chain (gravity + slack) drawn
  // as dots on a fixed canvas. Tracks BOTH endpoints live and sways as the
  // mascot or the target move. Same API as before.
  function tetherTo(pointFn, duration) {
    if (PREFERS_REDUCED) return function () {};
    var canvas = document.createElement("canvas");
    canvas.className = "cs-mascot-rope";
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000";
    document.body.appendChild(canvas);
    var ctx2 = canvas.getContext("2d");
    var dpr = Math.min(2, window.devicePixelRatio || 1);

    var N = 14;               // segments
    var SLACK = 1.12;         // rope longer than the span → it hangs
    var GRAV = 1500;          // px/s^2
    var DAMP = 0.985;
    var start = performance.now();
    var pts = null;
    var stopped = false;

    function resize() {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
    }
    resize();

    function initPoints(a, b) {
      pts = [];
      for (var i = 0; i <= N; i += 1) {
        var t = i / N;
        pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, px: a.x + (b.x - a.x) * t, py: a.y + (b.y - a.y) * t });
      }
    }

    (function draw(now) {
      if (stopped || !canvas.isConnected) return;
      now = now || performance.now();
      var elapsed = now - start;
      var from = mascotCenter();
      var target = typeof pointFn === "function" ? pointFn() : pointFn;
      // throw-out: the far end flies from the mascot to the target first
      var throwT = Math.min(1, elapsed / 180);
      throwT = 1 - Math.pow(1 - throwT, 3);
      var point = { x: from.x + (target.x - from.x) * throwT, y: from.y + (target.y - from.y) * throwT };
      if (!pts) initPoints(from, point);

      // verlet integration (fixed dt keeps it stable on janky frames)
      var dt = 1 / 60;
      for (var i = 1; i < N; i += 1) {
        var p0 = pts[i];
        var vx = (p0.x - p0.px) * DAMP;
        var vy = (p0.y - p0.py) * DAMP;
        p0.px = p0.x; p0.py = p0.y;
        p0.x += vx;
        p0.y += vy + GRAV * dt * dt;
      }
      // pin ends
      pts[0].x = from.x; pts[0].y = from.y;
      pts[N].x = point.x; pts[N].y = point.y;
      // constraints
      var dx0 = point.x - from.x, dy0 = point.y - from.y;
      var rest = (Math.sqrt(dx0 * dx0 + dy0 * dy0) * SLACK) / N;
      for (var iter = 0; iter < 3; iter += 1) {
        for (var j = 0; j < N; j += 1) {
          var a = pts[j], b = pts[j + 1];
          var dx = b.x - a.x, dy = b.y - a.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
          var diff = (dist - rest) / dist * 0.5;
          var ox = dx * diff, oy = dy * diff;
          if (j !== 0) { a.x += ox; a.y += oy; }
          if (j + 1 !== N) { b.x -= ox; b.y -= oy; }
        }
        pts[0].x = from.x; pts[0].y = from.y;
        pts[N].x = point.x; pts[N].y = point.y;
      }

      // render: dots along the chain (and midpoints), fading out at the end
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var fade = Math.min(1, elapsed / 140);
      var left = duration - elapsed;
      if (left < 220) fade *= Math.max(0, left / 220);
      var ink = state.lightInk ? INK_LIGHT_RGB : "14,14,12";
      ctx2.fillStyle = "rgba(" + ink + "," + (0.78 * fade).toFixed(3) + ")";
      for (var k = 0; k <= N; k += 1) {
        ctx2.beginPath();
        ctx2.arc(pts[k].x, pts[k].y, 2.4, 0, Math.PI * 2);
        ctx2.fill();
        if (k < N) {
          ctx2.beginPath();
          ctx2.arc((pts[k].x + pts[k + 1].x) / 2, (pts[k].y + pts[k + 1].y) / 2, 1.5, 0, Math.PI * 2);
          ctx2.fill();
        }
      }

      if (elapsed < duration) window.requestAnimationFrame(draw);
      else canvas.remove();
    })();

    return function stop() { stopped = true; canvas.remove(); };
  }

  function dotStream(fromPoint, toPoint, count, opts) {
    if (PREFERS_REDUCED) return;
    opts = opts || {};
    var stream = document.createElement("div");
    stream.className = "cs-dot-stream" + (opts.light ? " is-spit" : "");
    for (var i = 0; i < count; i += 1) {
      var dot = document.createElement("i");
      var sx = fromPoint.x + (Math.random() - 0.5) * (opts.fromSpread || 30);
      var sy = fromPoint.y + (Math.random() - 0.5) * (opts.fromSpread || 30);
      var tx = toPoint.x + (Math.random() - 0.5) * (opts.toSpread || 30);
      var ty = toPoint.y + (Math.random() - 0.5) * (opts.toSpread || 30);
      dot.style.setProperty("--sx", sx.toFixed(1) + "px");
      dot.style.setProperty("--sy", sy.toFixed(1) + "px");
      dot.style.setProperty("--tx", tx.toFixed(1) + "px");
      dot.style.setProperty("--ty", ty.toFixed(1) + "px");
      dot.style.setProperty("--size", (2 + Math.random() * 4.5).toFixed(1) + "px");
      dot.style.setProperty("--delay", (Math.random() * (opts.delaySpread || 420)).toFixed(0) + "ms");
      dot.style.setProperty("--duration", (680 + Math.random() * 560).toFixed(0) + "ms");
      stream.appendChild(dot);
    }
    document.body.appendChild(stream);
    window.setTimeout(function () { stream.remove(); }, 2100);
  }

  /* ------------------------------------------------------------------ *
   *  Gate exits — one per character (all devices).
   *  Every exit tells the same story in that character's dialect, in
   *  three acts: CAPTURE (how the card's pieces leave), TAKEOVER (how the
   *  character claims the screen), UNVEIL (how the home appears under it).
   *  Each fx returns { hide, guide }: when the gate may fade and when the
   *  tour may start. All overlays sit just under the mascot's z-index.
   * ------------------------------------------------------------------ */

  function fxPieces(card, target) {
    return Array.prototype.slice.call(card.children).map(function (el) {
      var kr = el.getBoundingClientRect();
      var cx = kr.left + kr.width / 2;
      var cy = kr.top + kr.height / 2;
      return { el: el, cx: cx, cy: cy, w: kr.width, dx: target.x - cx, dy: target.y - cy, dist: Math.hypot(target.x - cx, target.y - cy) };
    });
  }

  function fxVeil(c, mod) {
    var R = Math.ceil(Math.max(
      Math.hypot(c.x, c.y),
      Math.hypot(window.innerWidth - c.x, c.y),
      Math.hypot(c.x, window.innerHeight - c.y),
      Math.hypot(window.innerWidth - c.x, window.innerHeight - c.y)
    ));
    var veil = document.createElement("div");
    veil.className = "cs-swallow-veil" + (mod ? " cs-veil--" + mod : "");
    veil.style.width = veil.style.height = R * 2 + "px";
    veil.style.left = c.x - R + "px";
    veil.style.top = c.y - R + "px";
    document.body.appendChild(veil);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { veil.classList.add("is-full"); });
    });
    return veil;
  }

  /* Dot — the canonical swallow: inhale, lunge, curtain. */
  function fxDot(gate, card, r, target) {
    var pieces = fxPieces(card, target).sort(function (a, b) { return b.dist - a.dist; });
    pieces.forEach(function (p, i) {
      var delay = i * 42;
      p.el.style.transition =
        "transform .46s cubic-bezier(.55,.06,.68,.19) " + delay + "ms," +
        "opacity .16s ease " + (delay + 300) + "ms";
      p.el.style.transform = "translate(" + p.dx + "px," + p.dy + "px) scale(.1)";
      p.el.style.opacity = "0";
    });
    dotStream({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, target, 72, {
      fromSpread: Math.max(r.width, r.height) * 0.8,
      toSpread: 18,
      delaySpread: 420,
    });
    state.swallowing = 2.9;
    setMood("eat", 1200);
    lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    window.setTimeout(function () { chomp(1.3); }, 430);
    window.setTimeout(function () {
      sfx("whoosh");
      var veil = fxVeil(target);
      window.setTimeout(function () {
        state.swallowing = 0;
        lookAt(null);
        setMood("idle");
        veil.classList.add("is-leaving");
        window.setTimeout(function () { veil.remove(); }, 800);
      }, 780);
    }, 640);
    return { hide: 1250, guide: 2150 };
  }

  /* Fuzz — pieces crumble to static; the screen fills with noise that
     then drops away like sand. */
  function fxFuzz(gate, card, r, target) {
    var pieces = fxPieces(card, target);
    state.swallowing = 2.4;
    setMood("eat", 1300);
    lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    pieces.forEach(function (p, i) {
      dotStream({ x: p.cx, y: p.cy }, target, 10, { fromSpread: Math.max(40, p.w * 0.6), toSpread: 24, delaySpread: 300 });
      p.el.style.transition =
        "transform .5s cubic-bezier(.4,.1,.7,.5) " + i * 45 + "ms," +
        "opacity .34s ease " + (i * 45 + 120) + "ms," +
        "filter .4s ease " + i * 45 + "ms";
      p.el.style.transform = "translate(" + p.dx * 0.25 + "px," + p.dy * 0.25 + "px) scale(.8)";
      p.el.style.filter = "blur(6px)";
      p.el.style.opacity = "0";
    });
    window.setTimeout(function () { chomp(1.2); }, 420);
    window.setTimeout(fxNoise, 560);
    window.setTimeout(function () { state.swallowing = 0; lookAt(null); setMood("idle"); }, 1600);
    return { hide: 1300, guide: 2350 };
  }

  function fxNoise() {
    var cv = document.createElement("canvas");
    cv.className = "cs-noise-veil";
    // cap the backing store on big desktop windows — noise doesn't need 4K
    var dpr = Math.min(2, window.devicePixelRatio || 1, 2200 / Math.max(window.innerWidth, window.innerHeight));
    cv.width = Math.ceil(window.innerWidth * dpr);
    cv.height = Math.ceil(window.innerHeight * dpr);
    document.body.appendChild(cv);
    var ctx = cv.getContext("2d");
    var t0 = performance.now();
    var GROW = 600;
    sfx("whoosh");
    function grow(now) {
      var p = Math.min(1, (now - t0) / GROW);
      ctx.fillStyle = "#0e0e0c";
      var k = 60 + p * p * 950;
      for (var i = 0; i < k; i += 1) {
        var s = (1 + Math.random() * 3) * dpr;
        ctx.fillRect(Math.random() * cv.width, Math.random() * cv.height, s, s);
      }
      if (p < 1) { window.requestAnimationFrame(grow); return; }
      ctx.fillRect(0, 0, cv.width, cv.height);
      // ragged top edge so the fall reads as sand, not a shutter
      ctx.globalCompositeOperation = "destination-out";
      for (var j = 0; j < 90; j += 1) {
        ctx.fillRect(Math.random() * cv.width, 0, (2 + Math.random() * 5) * dpr, Math.random() * 34 * dpr);
      }
      ctx.globalCompositeOperation = "source-over";
      window.setTimeout(function () { cv.classList.add("is-leaving"); }, 300);
      window.setTimeout(function () { cv.remove(); }, 1250);
    }
    window.requestAnimationFrame(grow);
  }

  /* Echo — sonar: each ring that passes wipes a piece; the last pulse
     floods the screen, then contracts back into the avatar. */
  function fxEcho(gate, card, r, target) {
    var pieces = fxPieces(card, target);
    var maxDist = pieces.reduce(function (m, p) { return Math.max(m, p.dist); }, 1);
    state.swallowing = 1.6;
    setMood("boost", 900);
    window.setTimeout(function () { state.swallowing = 0; }, 1350);
    for (var w = 0; w < 3; w += 1) {
      (function (w) {
        window.setTimeout(function () {
          var ring = document.createElement("div");
          ring.className = "cs-echo-ring";
          ring.style.left = target.x + "px";
          ring.style.top = target.y + "px";
          document.body.appendChild(ring);
          chomp(0.5);
          sfx("pop");
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () { ring.classList.add("is-out"); });
          });
          window.setTimeout(function () { ring.remove(); }, 950);
        }, w * 190);
      })(w);
    }
    pieces.forEach(function (p) {
      var delay = 120 + (p.dist / maxDist) * 460;
      p.el.style.transition = "opacity .26s ease " + delay + "ms, transform .3s cubic-bezier(.3,.6,.4,1) " + delay + "ms";
      p.el.style.transform = "scale(.85)";
      p.el.style.opacity = "0";
    });
    window.setTimeout(function () {
      sfx("whoosh");
      var veil = fxVeil(target);
      window.setTimeout(function () {
        veil.classList.add("is-iris");
        window.setTimeout(function () { veil.remove(); }, 800);
      }, 880);
    }, 640);
    return { hide: 1280, guide: 2250 };
  }

  /* Vortex — a real whirlpool: radius decays smoothly while angular speed
     climbs (angular-momentum feel), pieces spin faster as they near the
     drain, and the whole card is dragged around the drain point. The
     screen is taken by a multi-arm spinning disc that unwinds off. */
  function fxVortex(gate, card, r, target) {
    var pieces = fxPieces(card, target).sort(function (a, b) { return b.dist - a.dist; });
    state.swallowing = 1.9;
    setMood("eat", 1300);
    lookAt({ x: target.x, y: target.y + 40 });
    // drag the card itself around the drain — origin at the drain point so
    // the piece end-positions stay true
    var cr = card.getBoundingClientRect();
    card.style.transformOrigin = (target.x - cr.left) + "px " + (target.y - cr.top) + "px";
    card.style.transition = "transform 1.05s cubic-bezier(.4,.1,.65,.5)";
    card.style.transform = "rotate(-14deg) scale(.96)";
    var SWIRL = 8.5; // total radians each piece sweeps
    pieces.forEach(function (p, i) {
      if (!p.el.animate) { p.el.style.opacity = "0"; return; }
      var a0 = Math.atan2(p.cy - target.y, p.cx - target.x);
      var frames = [];
      var STEPS = 12;
      for (var s = 0; s <= STEPS; s += 1) {
        var q = s / STEPS;
        // angle accelerates, radius eases out — momentum conservation feel
        var ang = a0 + SWIRL * Math.pow(q, 1.7);
        var rad = p.dist * Math.pow(1 - q, 1.5);
        frames.push({
          transform: "translate(" + (target.x + Math.cos(ang) * rad - p.cx).toFixed(1) + "px," +
            (target.y + Math.sin(ang) * rad - p.cy).toFixed(1) + "px) rotate(" + (-SWIRL * 57 * Math.pow(q, 1.7)).toFixed(0) + "deg) scale(" + (1 - 0.95 * Math.pow(q, 1.3)).toFixed(3) + ")",
          opacity: q > 0.86 ? 0 : 1,
        });
      }
      p.el.animate(frames, { duration: 950, delay: i * 36, easing: "linear", fill: "forwards" });
    });
    window.setTimeout(function () { chomp(1.1); }, 600);
    window.setTimeout(function () {
      sfx("whoosh");
      var veil = fxVeil(target, "spin");
      window.setTimeout(function () {
        veil.classList.add("is-unwind");
        window.setTimeout(function () { veil.remove(); }, 950);
      }, 960);
    }, 780);
    window.setTimeout(function () { state.swallowing = 0; lookAt(null); setMood("idle"); }, 1650);
    return { hide: 1440, guide: 2550 };
  }

  /* Bit — everything moves in steps(): jerky 8-bit capture, then a pixel
     grid powers on and scanlines off, top to bottom. */
  function fxBit(gate, card, r, target) {
    var pieces = fxPieces(card, target).sort(function (a, b) { return b.dist - a.dist; });
    state.swallowing = 1.7;
    setMood("smash", 700);
    window.setTimeout(function () { state.swallowing = 0; }, 1450);
    pieces.forEach(function (p, i) {
      var d = i * 55;
      p.el.style.transition = "transform .48s steps(6, end) " + d + "ms, opacity .48s steps(6, end) " + d + "ms";
      p.el.style.transform = "translate(" + p.dx + "px," + p.dy + "px) scale(.15)";
      p.el.style.opacity = "0";
    });
    window.setTimeout(function () { chomp(0.9); }, 480);
    window.setTimeout(fxPixelGrid, 560);
    return { hide: 1300, guide: 2400 };
  }

  function fxPixelGrid() {
    var grid = document.createElement("div");
    grid.className = "cs-pix-veil";
    // scale the cell so the grid stays ~≤900 nodes on any screen size
    var cell = Math.max(44, Math.ceil(Math.sqrt((window.innerWidth * window.innerHeight) / 900)));
    var cols = Math.ceil(window.innerWidth / cell);
    var rows = Math.ceil(window.innerHeight / cell);
    grid.style.gridTemplateColumns = "repeat(" + cols + ",1fr)";
    for (var i = 0; i < cols * rows; i += 1) {
      var c = document.createElement("i");
      c.style.transitionDelay = Math.round(Math.random() * 400) + "ms";
      c.dataset.row = Math.floor(i / cols);
      grid.appendChild(c);
    }
    document.body.appendChild(grid);
    sfx("pop");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { grid.classList.add("is-on"); });
    });
    window.setTimeout(function () {
      Array.prototype.forEach.call(grid.children, function (c) {
        c.style.transitionDelay = Math.round(c.dataset.row * 34 + Math.random() * 70) + "ms";
      });
      grid.classList.add("is-off");
      window.setTimeout(function () { grid.remove(); }, rows * 34 + 800);
    }, 1000);
  }

  /* Puff — vapor: pieces float up then drift in, a fog rolls over
     everything and sinks away. The gentle one. */
  function fxPuff(gate, card, r, target) {
    var pieces = fxPieces(card, target);
    state.swallowing = 2.2;
    setMood("eat", 1400);
    lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    pieces.forEach(function (p, i) {
      if (!p.el.animate) { p.el.style.opacity = "0"; return; }
      p.el.animate([
        { transform: "translate(0,0) scale(1)", opacity: 1, filter: "blur(0px)" },
        { transform: "translate(" + (p.dx * 0.12).toFixed(1) + "px," + (p.dy * 0.1 - 26).toFixed(1) + "px) scale(.96)", opacity: 0.9, filter: "blur(2px)", offset: 0.35 },
        { transform: "translate(" + p.dx + "px," + p.dy + "px) scale(.3)", opacity: 0, filter: "blur(7px)" },
      ], { duration: 900, delay: i * 70, easing: "cubic-bezier(.3,.5,.35,1)", fill: "forwards" });
    });
    window.setTimeout(function () {
      var veil = fxVeil(target, "fog");
      window.setTimeout(function () {
        state.swallowing = 0;
        lookAt(null);
        setMood("idle");
        veil.classList.add("is-sink");
        window.setTimeout(function () { veil.remove(); }, 1000);
      }, 1000);
    }, 780);
    return { hide: 1500, guide: 2650 };
  }

  /* Halo — gravity: pieces get caught in flattening orbits and fall in;
     a tilted ring closes over the screen, then sweeps off like an
     eclipse shadow. */
  function fxHalo(gate, card, r, target) {
    var pieces = fxPieces(card, target).sort(function (a, b) { return a.dist - b.dist; });
    state.swallowing = 1.8;
    setMood("boost", 1000);
    window.setTimeout(function () { state.swallowing = 0; }, 1600);
    pieces.forEach(function (p, i) {
      if (!p.el.animate) { p.el.style.opacity = "0"; return; }
      var a0 = Math.atan2(p.cy - target.y, p.cx - target.x);
      var frames = [];
      for (var s = 0; s <= 6; s += 1) {
        var q = s / 6;
        var ang = a0 + q * 10;
        var rad = p.dist * (1 - q * 0.9);
        frames.push({
          transform: "translate(" + (target.x + Math.cos(ang) * rad - p.cx).toFixed(1) + "px," +
            (target.y + Math.sin(ang) * rad * 0.4 - p.cy).toFixed(1) + "px) scale(" + (1 - q * 0.92).toFixed(3) + ")",
          opacity: q > 0.85 ? 0 : 1,
        });
      }
      p.el.animate(frames, { duration: 880, delay: i * 45, easing: "cubic-bezier(.5,.2,.6,.6)", fill: "forwards" });
    });
    window.setTimeout(function () { chomp(0.9); }, 640);
    window.setTimeout(function () {
      sfx("whoosh");
      var veil = fxVeil(target, "halo");
      window.setTimeout(function () {
        veil.classList.add("is-sweep");
        window.setTimeout(function () { veil.remove(); }, 950);
      }, 960);
    }, 760);
    return { hide: 1420, guide: 2550 };
  }

  /* Spike — the only one that doesn't swallow: it SHOOTS. Pieces pop
     where they stand, then shutter blades slam in and reopen. */
  function fxSpike(gate, card, r, target) {
    var pieces = fxPieces(card, target).sort(function () { return Math.random() - 0.5; });
    state.swallowing = 1.8;
    setMood("smash", 900);
    screenShake(0.5);
    window.setTimeout(function () { state.swallowing = 0; }, 1500);
    pieces.forEach(function (p, i) {
      var d = 90 + i * 85;
      window.setTimeout(function () {
        dotStream({ x: p.cx, y: p.cy }, { x: p.cx, y: p.cy }, 12, { fromSpread: 10, toSpread: Math.max(90, p.w), delaySpread: 60, light: true });
        sfx("pop");
      }, d);
      if (p.el.animate) {
        p.el.animate([
          { transform: "scale(1)", opacity: 1 },
          { transform: "scale(1.12)", opacity: 1, offset: 0.55 },
          { transform: "scale(0)", opacity: 0 },
        ], { duration: 300, delay: d, easing: "cubic-bezier(.5,-.3,.8,.5)", fill: "forwards" });
      } else p.el.style.opacity = "0";
    });
    window.setTimeout(fxBlades, 820);
    return { hide: 1450, guide: 2500 };
  }

  function fxBlades() {
    var wrap = document.createElement("div");
    wrap.className = "cs-blade-veil";
    var n = 7;
    for (var i = 0; i < n; i += 1) {
      var b = document.createElement("i");
      b.style.left = (i * 100 / n - 8) + "%";
      b.style.width = (100 / n + 16) + "%";
      b.style.transitionDelay = i * 45 + "ms";
      b.style.transform = "translateY(" + (i % 2 ? "-108%" : "108%") + ") skewX(-14deg)";
      wrap.appendChild(b);
    }
    document.body.appendChild(wrap);
    sfx("whoosh");
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        Array.prototype.forEach.call(wrap.children, function (b) {
          b.style.transform = "translateY(0) skewX(-14deg)";
        });
      });
    });
    window.setTimeout(function () {
      Array.prototype.forEach.call(wrap.children, function (b, i) {
        b.style.transitionDelay = (n - 1 - i) * 45 + "ms";
        b.style.transform = "translateY(" + (i % 2 ? "108%" : "-108%") + ") skewX(-14deg)";
      });
      window.setTimeout(function () { wrap.remove(); }, 1100);
    }, 880);
  }

  var GATE_FX = {
    original: fxDot,
    denso: fxFuzz,
    anillos: fxEcho,
    espiral: fxVortex,
    pixel: fxBit,
    nube: fxPuff,
    orbital: fxHalo,
    erizo: fxSpike,
  };

  function stamp(x, y, text, tone) {
    var node = document.createElement("span");
    node.className = "cs-guide-stamp" + (tone === "light" ? " is-light" : "");
    node.textContent = text;
    node.style.setProperty("--rot", ((Math.random() - 0.5) * 10).toFixed(1) + "deg");
    placeInDoc(node, x, y);
    createImpact(x, y);
    sfx("stamp");
    onCleanup(function () { node.remove(); });
    return node;
  }

  function fadeOutNode(node, delay) {
    window.setTimeout(function () {
      if (!node.isConnected) return;
      node.classList.add("is-leaving");
      window.setTimeout(function () { node.remove(); }, 600);
    }, delay || 0);
  }

  function scanBeam(node, duration) {
    var rect = node.getBoundingClientRect();
    var beam = document.createElement("span");
    beam.className = "cs-scan-beam";
    beam.style.height = rect.height.toFixed(1) + "px";
    placeInDoc(beam, rect.left, rect.top);
    beam.animate(
      [
        { transform: "translateX(0)", opacity: 0 },
        { opacity: 1, offset: 0.14 },
        { opacity: 1, offset: 0.86 },
        { transform: "translateX(" + (rect.width - 42) + "px)", opacity: 0 },
      ],
      { duration: duration || 1200, easing: "cubic-bezier(.76,0,.24,1)" }
    ).onfinish = function () { beam.remove(); };
  }

  // Deep scan — photocopier sweep with a residual grid, a live readout
  // and pinned ticks. The subtle scanBeam stays for quick passes; this
  // is the theatrical one.
  function deepScan(node, opts) {
    opts = opts || {};
    var rect = node.getBoundingClientRect();
    var wrap = document.createElement("div");
    wrap.className = "cs-deepscan";
    wrap.style.width = rect.width.toFixed(1) + "px";
    wrap.style.height = rect.height.toFixed(1) + "px";
    var grid = document.createElement("div");
    grid.className = "cs-deepscan__grid";
    wrap.appendChild(grid);
    var beam = document.createElement("div");
    beam.className = "cs-deepscan__beam";
    wrap.appendChild(beam);
    var readout = document.createElement("div");
    readout.className = "cs-deepscan__readout";
    readout.textContent = "SCANNING · 0%";
    wrap.appendChild(readout);
    placeInDoc(wrap, rect.left, rect.top);
    onCleanup(function () { wrap.remove(); });
    sfx("scan");

    var dur = tempo(opts.duration || 1800);
    var t0 = performance.now();
    var ticks = 0;
    (function step(now) {
      if (!wrap.isConnected) return;
      var t = clamp((now - t0) / dur, 0, 1);
      var y = t * rect.height;
      beam.style.transform = "translateY(" + y.toFixed(1) + "px)";
      readout.style.transform = "translateY(" + Math.min(y, rect.height - 30).toFixed(1) + "px)";
      grid.style.clipPath = "inset(0 0 " + (100 - t * 100).toFixed(1) + "% 0)";
      if (t < 1) {
        readout.textContent = "SCANNING · " + Math.round(t * 100) + "%";
        if (t > (ticks + 1) * 0.28) {
          ticks += 1;
          var tick = document.createElement("i");
          tick.className = "cs-deepscan__tick";
          tick.style.left = (12 + Math.random() * 72).toFixed(1) + "%";
          tick.style.top = y.toFixed(1) + "px";
          wrap.appendChild(tick);
          window.setTimeout(function () { tick.remove(); }, 1200);
        }
        window.requestAnimationFrame(step);
      } else {
        readout.textContent = opts.label || "SCAN COMPLETE";
        readout.classList.add("is-done");
        grid.style.transition = "opacity .8s ease";
        grid.style.opacity = "0";
        beam.style.opacity = "0";
        window.setTimeout(function () {
          if (wrap.isConnected) {
            wrap.style.transition = "opacity .5s ease";
            wrap.style.opacity = "0";
            window.setTimeout(function () { wrap.remove(); }, 520);
          }
        }, 1500);
      }
    })(t0);
  }

  /* ------------------------------------------------------------------ *
   *  Tone sampling — never black-on-black again
   * ------------------------------------------------------------------ */

  function parseRgb(color) {
    var match = String(color || "").match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    var parts = match[1].split(",").map(function (v) { return Number(v.trim()); });
    if (parts.length < 3 || parts.some(Number.isNaN)) {
      parts = match[1].split(/[\s/]+/).filter(Boolean).map(Number);
    }
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  }

  function luminance(rgb) {
    function channel(value) {
      value /= 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function sampleTone() {
    var m = mascotEl();
    var prevPE = m ? m.style.pointerEvents : "";
    if (m) m.style.pointerEvents = "none";
    var center = mascotCenter();
    var el = document.elementFromPoint(
      clamp(center.x, 4, window.innerWidth - 4),
      clamp(center.y, 4, window.innerHeight - 4)
    );
    if (m) m.style.pointerEvents = prevPE;
    var current = el;
    while (current && current !== document.documentElement) {
      var rgb = parseRgb(window.getComputedStyle(current).backgroundColor);
      if (rgb && rgb.a > 0.35) {
        state.lightInk = luminance(rgb) < 0.36;
        return;
      }
      current = current.parentElement;
    }
    state.lightInk = false;
  }

  /* Lead form — every “Start with ZAKI” CTA opens this instead of jumping to
     #contact. This static prototype hands the completed request to the user's
     email client; the hidden `website` input remains a basic spam honeypot. */
  function openLeadModal() {
    if (document.querySelector(".cs-lead-modal")) return;
    var opener = document.activeElement;
    var wrap = document.createElement("div");
    wrap.className = "cs-guide-confirm cs-lead-modal";
    wrap.innerHTML =
      '<div class="cs-guide-confirm__card cs-lead-modal__card" role="dialog" aria-modal="true" aria-label="Start with ZAKI">' +
      '<button type="button" class="cs-lead-modal__close" aria-label="Close">×</button>' +
      "<h3>Start with ZAKI</h3>" +
      "<p>Tell us where ZAKI should start. We will open a ready-to-send email with the details you share.</p>" +
      '<form class="cs-lead-modal__form" novalidate>' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="cs-lead-modal__hp">' +
      '<div class="cs-lead-modal__row">' +
      '<label>Name<input type="text" name="name" required maxlength="255" autocomplete="name" placeholder="Ada Lovelace"></label>' +
      '<label>Email<input type="email" name="email" required maxlength="255" autocomplete="email" placeholder="ada@company.com"></label>' +
      "</div>" +
      '<div class="cs-lead-modal__row">' +
      '<label>Project<select name="project_type">' +
      '<option value="">Pick one…</option>' +
      '<option value="zaki-agent">ZAKI Agent</option>' +
      '<option value="zaki-spaces">Spaces / context</option>' +
      '<option value="zaki-minutes">Minutes</option>' +
      '<option value="zaki-design">Design</option>' +
      '<option value="pricing">Pricing / plan help</option>' +
      '<option value="partnership">Partnership</option>' +
      '<option value="strategy-advisory">Strategy / advisory</option>' +
      '<option value="other">Other</option>' +
      "</select></label>" +
      '<label>Plan<select name="budget">' +
      '<option value="">Pick one…</option>' +
      '<option value="free">Free</option>' +
      '<option value="pro-15">$15 / month</option>' +
      '<option value="pro-45">$45 / month</option>' +
      '<option value="pro-max">$99 / month</option>' +
      '<option value="discuss">Help me choose</option>' +
      "</select></label>" +
      "</div>" +
      '<label>What should ZAKI help with?<textarea name="description" rows="4" maxlength="5000" placeholder="Your day, research, meetings, projects, design work — anything helps."></textarea></label>' +
      '<p class="cs-lead-modal__error" hidden></p>' +
      '<button type="submit" data-lead-submit>Open email request →</button>' +
      "</form></div>";
    document.body.appendChild(wrap);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { wrap.classList.add("is-in"); });
    });
    function close() {
      window.removeEventListener("keydown", onKey, true);
      wrap.classList.remove("is-in");
      window.setTimeout(function () {
        wrap.remove();
        if (opener && typeof opener.focus === "function") opener.focus();
      }, 260);
    }
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
    }
    window.addEventListener("keydown", onKey, true);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap || e.target.closest(".cs-lead-modal__close")) close();
    });
    var form = wrap.querySelector("form");
    var firstField = form.querySelector('input[name="name"]');
    if (firstField) window.setTimeout(function () { firstField.focus(); }, 40);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var btn = form.querySelector("[data-lead-submit]");
      btn.disabled = true;
      btn.textContent = "Opening email…";
      var data = {};
      new FormData(form).forEach(function (v, k) { if (v) data[k] = v; });
      var project = data.project_type || "ZAKI";
      var body = [
        "Name: " + (data.name || ""),
        "Email: " + (data.email || ""),
        "Product: " + project,
        "Plan: " + (data.budget || ""),
        "",
        data.description || ""
      ].join("\n");
      window.location.href = "mailto:support@chatzaki.com?subject=" + encodeURIComponent("ZAKI access - " + project) + "&body=" + encodeURIComponent(body);
      var card = wrap.querySelector(".cs-lead-modal__card");
      card.innerHTML =
        '<button type="button" class="cs-lead-modal__close" aria-label="Close">×</button>' +
        '<h3>Email request ready.</h3>' +
        "<p>Your email app should now have a draft addressed to the ZAKI team.</p>" +
        '<div class="cs-guide-confirm__actions"><button type="button" data-confirm-stay>Back to the site</button></div>';
      card.addEventListener("click", function (e2) {
        if (e2.target.closest(".cs-lead-modal__close") || e2.target.closest("[data-confirm-stay]")) close();
      });
      sfx("pop");
      chomp(1);
    });
  }

  /* Outside the tour, every lead CTA opens the lead form. Mid-tour the
     capture blocker routes it through the confirm modal first. */
  function initLeadCapture() {
    window.addEventListener("click", function (e) {
      // explicit opt-in: only elements marked data-lead open the form.
      // No copy matching, no href heuristics — i18n/rename proof.
      var link = e.target.closest("[data-lead]");
      if (!link) return;
      if (guide.running) return;
      e.preventDefault();
      e.stopPropagation();
      openLeadModal();
    }, true);
  }

  /* Fixed chips flip contrast over dark sections — same trick as the
     mascot: sample the section behind each one and toggle a class.
     Overlays with pointer-events:none (veils, streams) are skipped by
     elementFromPoint, so this reads the REAL section underneath. */
  function sampleChipTones() {
    var chips = document.querySelectorAll(".cs-sound-chip, .cs-quote-chip, .cs-guide-skip");
    Array.prototype.forEach.call(chips, function (chip) {
      var r = chip.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var prev = chip.style.pointerEvents;
      chip.style.pointerEvents = "none";
      var el = document.elementFromPoint(
        clamp(r.left + r.width / 2, 4, window.innerWidth - 4),
        clamp(r.top + r.height / 2, 4, window.innerHeight - 4)
      );
      chip.style.pointerEvents = prev;
      var dark = false;
      var cur = el;
      while (cur && cur !== document.documentElement) {
        var rgb = parseRgb(window.getComputedStyle(cur).backgroundColor);
        if (rgb && rgb.a > 0.35) { dark = luminance(rgb) < 0.36; break; }
        cur = cur.parentElement;
      }
      chip.classList.toggle("is-tone-flip", dark);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Canvas — dot sphere with eyes, squash & moods
   * ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ *
   *  Product drivers — four ZAKI doors at the gate (buttons or ← → keys);
   *  persisted in localStorage "cs-mascot-variant".
   * ------------------------------------------------------------------ */

  var MASCOT_VARIANTS = ["original", "anillos", "orbital", "espiral"];

  // On-screen product driver names (site speaks English)
  var MASCOT_NAMES = {
    original: "Agent",
    denso: "Fuzz",
    anillos: "Spaces",
    espiral: "Design",
    pixel: "Bit",
    nube: "Puff",
    orbital: "Minutes",
    erizo: "Spike",
  };

  if (MASCOT_VARIANTS.indexOf(state.mascotVariant) === -1) {
    state.mascotVariant = "original";
    try { window.localStorage.setItem("cs-mascot-variant", "original"); } catch (e) {}
  }

  // Driving style, shown under the name at the gate.
  var MASCOT_TAGS = {
    original: "goals · memory · action",
    denso: "the caffeinated sprint",
    anillos: "projects · files · context",
    espiral: "briefs · systems · assets",
    pixel: "the pixel-perfect demo",
    nube: "the gentle stroll",
    orbital: "meetings · decisions · follow-up",
    erizo: "the paranoid inspection",
  };

  function applyMascotTheme(variant) {
    var rootEl = document.documentElement;
    try {
      rootEl.removeAttribute("data-theme");
      window.localStorage.removeItem("cs-theme");
      window.localStorage.setItem("cs-theme-version", window.__CS_THEME_VERSION || "2026-07-10.1");
    } catch (e) {}
    // recompute the colors that JS captured at boot
    __tokStyle = window.getComputedStyle(rootEl);
    INK_DARK = __tok("--ink", "#0D0B09");
    INK_LIGHT = __tok("--accent", "#D24430");
    INK_LIGHT_RGB = __tok("--accent-rgb", "210,68,48");
    // keep the browser chrome tint in sync with the active world.
    // iOS Safari ignores setAttribute on an existing theme-color meta,
    // so we replace the node outright; html background covers the
    // bar-sampling mode and the overscroll areas.
    var bgNow = __tok("--bg", "#F8F2E9");
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.remove();
    metaTheme = document.createElement("meta");
    metaTheme.setAttribute("name", "theme-color");
    metaTheme.setAttribute("content", bgNow);
    document.head.appendChild(metaTheme);
    document.documentElement.style.backgroundColor = bgNow;
    document.body.style.backgroundColor = bgNow;
    // the favicon is the driver's portrait — retint and reshape it too
    // (mascot-svg.js; node replaced outright so browsers notice the swap)
    if (window.CSMascotSVG) {
      var favLink = document.querySelector('link[rel="icon"]');
      if (favLink) favLink.remove();
      favLink = document.createElement("link");
      favLink.rel = "icon";
      favLink.type = "image/svg+xml";
      favLink.href = window.CSMascotSVG.dataURI(variant, { bg: bgNow, eyeScale: 1.25 });
      document.head.appendChild(favLink);
    }
    if (typeof window.__csRefreshTokens === "function") window.__csRefreshTokens();
    if (typeof window.__csRecolorOrganisms === "function") window.__csRecolorOrganisms();
    refreshGateFacePalette();
    // Keep the nav synchronized with the stable brand surface after a worker swap.
    var nav = document.getElementById("cs-nav");
    if (nav) {
      var navTransition = nav.style.transition;
      nav.style.transition = "none";
      if (nav.style.background && nav.style.background !== "transparent") {
        nav.style.background = "rgba(var(--bg-rgb), .9)";
      }
      void nav.offsetWidth;
      window.requestAnimationFrame(function () { nav.style.transition = navTransition; });
    }
  }

  function cycleMascotVariant(dir) {
    var idx = MASCOT_VARIANTS.indexOf(state.mascotVariant);
    idx = (idx + dir + MASCOT_VARIANTS.length) % MASCOT_VARIANTS.length;
    setMascotVariant(MASCOT_VARIANTS[idx], dir);
  }

  function setMascotVariant(variant, dir) {
    if (MASCOT_VARIANTS.indexOf(variant) === -1 || variant === state.mascotVariant) return;
    if (!dir) dir = MASCOT_VARIANTS.indexOf(variant) > MASCOT_VARIANTS.indexOf(state.mascotVariant) ? 1 : -1;
    state.mascotVariant = variant;
    try { window.localStorage.setItem("cs-mascot-variant", variant); } catch (e) {}
    var guideName = document.querySelector("[data-guide-name]");
    if (guideName) guideName.textContent = MASCOT_NAMES[variant] || variant;
    applyMascotTheme(variant);
    themeWaveFrom(mascotCenter());
    refreshGateChoice();
    animateGateSwap(dir);
    chomp(0.7);
  }

  function themeWaveFrom(c) {
    if (!state.gate || PREFERS_REDUCED) return;
    var signal = (getComputedStyle(document.documentElement).getPropertyValue("--accent") || "").trim();
    if (!signal) return;
    var old = state.gate.querySelector(".cs-theme-wave");
    if (old) old.remove();
    var wave = document.createElement("div");
    wave.className = "cs-theme-wave";
    wave.style.background = signal;
    var R = Math.ceil(Math.hypot(
      Math.max(c.x, window.innerWidth - c.x),
      Math.max(c.y, window.innerHeight - c.y)
    )) + 40;
    wave.style.clipPath = "circle(0px at " + c.x + "px " + c.y + "px)";
    state.gate.insertBefore(wave, state.gate.firstChild);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        wave.style.clipPath = "circle(" + R + "px at " + c.x + "px " + c.y + "px)";
      });
    });
    window.setTimeout(function () {
      wave.classList.add("is-done");
      window.setTimeout(function () { wave.remove(); }, 320);
    }, 760);
  }



  /* Mobile: the dock thumbs ride a 3D wheel. The chosen one holds the
     center up front; neighbors recede to the sides, smaller and dimmer,
     and the rest wait behind. Changing drivers spins the wheel. */
  function layoutThumbWheel(gate) {
    var slots = gate.querySelectorAll(".cs-guide-slot");
    if (!slots.length) return;
    if (!window.matchMedia("(max-width: 640px)").matches) {
      Array.prototype.forEach.call(slots, function (slot) {
        slot.style.transform = "";
        slot.style.opacity = "";
        slot.style.zIndex = "";
        slot.style.pointerEvents = "";
      });
      return;
    }
    var n = slots.length;
    if (n <= 4) {
      Array.prototype.forEach.call(slots, function (slot) {
        slot.style.transform = "";
        slot.style.opacity = "";
        slot.style.zIndex = "";
        slot.style.pointerEvents = "";
      });
      return;
    }
    var sel = MASCOT_VARIANTS.indexOf(state.mascotVariant);
    Array.prototype.forEach.call(slots, function (slot, i) {
      var d = i - sel;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      var ang = d * 0.55;
      var x = Math.sin(ang) * 118;
      var depth = Math.cos(ang);
      var scale = d === 0 ? 1.22 : Math.max(0.4, 0.44 + 0.5 * depth);
      var visible = Math.abs(d) <= 2;
      slot.style.transform = "translate(-50%, -50%) translateX(" + x.toFixed(1) + "px) scale(" + scale.toFixed(3) + ")";
      slot.style.opacity = visible ? (d === 0 ? "1" : Math.pow(Math.max(0, depth), 1.6).toFixed(2)) : "0";
      slot.style.zIndex = String(100 + Math.round(depth * 50));
      slot.style.pointerEvents = visible ? "auto" : "none";
    });
  }

    /* The character swap is a little ceremony: identity slides in from the
     travel direction, the candidate's eyes whirl while its scale dips and
     springs back, dots rush IN from the travel side and burst back out,
     and the dock thumbs ripple. All organic springs — no hard cuts. */
  function animateGateSwap(dir) {
    var gate = state.gate;
    if (!gate) return;
    var nameEl = gate.querySelector(".cs-guide-stage__name");
    var tagEl = gate.querySelector(".cs-guide-choice__tag");
    [nameEl, tagEl].forEach(function (el, n) {
      if (el && el.animate) {
        var settle = parseFloat(getComputedStyle(el).opacity) || 1;
        el.animate([
          { transform: "translateX(" + dir * 34 + "px)", opacity: 0 },
          { transform: "translateX(0)", opacity: settle },
        ], { duration: 560, delay: n * 70, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" });
      }
    });
    // springy scale dip (the frame loop's spring overshoots back)
    state.restVel = (state.restVel || 0) - 7;
    // dots rush in from the direction of travel, then a small burst settles
    var c = mascotCenter();
    dotStream({ x: c.x + dir * 190, y: c.y - 30 }, c, 18, { fromSpread: 130, toSpread: 18, delaySpread: 70, light: true });
    window.setTimeout(function () {
      dotStream(c, c, 12, { fromSpread: 26, toSpread: 150, delaySpread: 80, light: true });
    }, 200);
    // the dock thumbs ripple in travel order
    var slots = Array.prototype.slice.call(gate.querySelectorAll(".cs-guide-slot"));
    if (dir < 0) slots.reverse();
    slots.forEach(function (slot, i) {
      if (!slot.animate) return;
      slot.animate([
        { transform: "translateY(0)" },
        { transform: "translateY(-6px)" },
        { transform: "translateY(0)" },
      ], { duration: 340, delay: i * 26, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)", composite: "add" });
    });
  }

  /* Redraw the gate: one ZAKI face above a strip of spawned agents. */
  function refreshGateChoice() {
    var gate = state.gate;
    if (!gate) return;
    Array.prototype.forEach.call(gate.querySelectorAll(".cs-guide-slot"), function (slot) {
      var v = slot.dataset.slot;
      var active = v === state.mascotVariant;
      slot.classList.toggle("is-active", active);
    });
    layoutThumbWheel(gate);
    var nameEl = gate.querySelector(".cs-guide-stage__name");
    if (nameEl) nameEl.textContent = MASCOT_NAMES[state.mascotVariant] || state.mascotVariant;
    var guideName = gate.querySelector("[data-guide-name]");
    if (guideName) guideName.textContent = MASCOT_NAMES[state.mascotVariant] || state.mascotVariant;
    var tagEl = gate.querySelector(".cs-guide-choice__tag");
    if (tagEl) tagEl.textContent = MASCOT_TAGS[state.mascotVariant] || "";
  }

  function refreshGateFacePalette() {
    var host = state.gate && state.gate.querySelector(".cs-guide-face");
    var organism = host && host.__csFaceOrganism;
    if (!organism || !organism.setPalette) return;
    organism.setPalette(__tok("--org-a", "#3a3a22"), __tok("--org-b", "#131309"));
  }

  function initGateFace(gate) {
    var host = gate && gate.querySelector(".cs-guide-face");
    if (!host || host.__csFaceStarted) return;
    if (!window.createOrganism) {
      host.__csFaceRetry = window.setTimeout(function () { initGateFace(gate); }, 70);
      return;
    }
    host.__csFaceStarted = true;
    try {
      var organism = window.createOrganism(host, {
        count: window.innerWidth < 760 ? 5000 : 9000,
        blending: "normal",
        colorA: __tok("--org-a", "#3a3a22"),
        colorB: __tok("--org-b", "#131309"),
        alpha: 2.2,
        freq: 1.6,
        amp: 0.28,
        speed: 0.82,
        rotation: 0.02,
        dprMax: 1.5,
      });
      organism.setShape("img:/site/assets/nova-nuggets-particle-mark.png");
      host.__csFaceOrganism = organism;
      host.classList.add("is-live");
    } catch (e) {
      // The static mark stays visible on low-power or WebGL-blocked browsers.
    }
  }

  function destroyGateFace(gate) {
    var host = gate && gate.querySelector(".cs-guide-face");
    if (!host) return;
    if (host.__csFaceRetry) window.clearTimeout(host.__csFaceRetry);
    if (host.__csFaceOrganism && host.__csFaceOrganism.destroy) host.__csFaceOrganism.destroy();
    host.__csFaceOrganism = null;
  }

  function mountFooterFace(host) {
    if (!host || host.__csFooterFaceStarted) return;
    if (!window.createOrganism) {
      host.__csFooterFaceRetry = window.setTimeout(function () { mountFooterFace(host); }, 100);
      return;
    }
    host.__csFooterFaceStarted = true;
    try {
      var organism = window.createOrganism(host, {
        count: window.innerWidth < 760 ? 3600 : 6500,
        blending: "normal",
        colorA: __tok("--org-glow-a", "#FCBDAC"),
        colorB: __tok("--accent", "#D24430"),
        alpha: 1.55,
        freq: 1.3,
        amp: 0.22,
        speed: 0.56,
        rotation: -0.015,
        dprMax: 1.5,
      });
      organism.setShape("img:/site/assets/nova-nuggets-particle-mark.png");
      host.__csFooterFaceOrganism = organism;
      host.classList.add("is-live");
    } catch (e) {
      // The static mark remains visible where WebGL is unavailable.
    }
  }

  function initFooterFace() {
    var host = document.querySelector(".cs-footer-face");
    if (!host || host.__csFooterFaceObserved) return;
    host.__csFooterFaceObserved = true;
    if (!window.IntersectionObserver) {
      mountFooterFace(host);
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      observer.disconnect();
      mountFooterFace(host);
    }, { rootMargin: "280px 0px" });
    observer.observe(host);
  }

  var ZEE_RGB = {
    // ZEE uses the V2 ember signal, not a toy-red palette. The darker tones
    // make the character read as a small precision device against the warm
    // welcome stage rather than a cartoon body made of separate parts.
    red: "210,68,48",
    redHot: "232,88,65",
    redLight: "255,137,112",
    redDark: "91,25,20",
    ink: "28,26,24",
    gold: "255,205,62",
    white: "253,251,242",
    blue: "64,173,207",
    green: "94,179,96",
  };

  function dotRgb(name) {
    if (name === "body") return state.lightInk ? ZEE_RGB.redHot : ZEE_RGB.red;
    if (name === "bodyLight") return state.lightInk ? ZEE_RGB.redLight : ZEE_RGB.redHot;
    if (name === "bodyDark") return state.lightInk ? ZEE_RGB.red : ZEE_RGB.redDark;
    return ZEE_RGB[name] || ZEE_RGB.red;
  }

  function pushDot(dots, gx, gy, r, alpha, color, square) {
    dots.push({ gx: gx, gy: gy, r: r, alpha: alpha, color: color, square: !!square });
  }

  function roundedRectHit(x, y, w, h, radius) {
    var qx = Math.abs(x) - w / 2 + radius;
    var qy = Math.abs(y) - h / 2 + radius;
    if (qx <= 0 && qy <= 0) return true;
    return Math.pow(Math.max(qx, 0), 2) + Math.pow(Math.max(qy, 0), 2) <= radius * radius;
  }

  function addZeePart(dots, cx, cy, w, h, corner, step, seed, t, opts) {
    opts = opts || {};
    var ix = 0;
    for (var y = -h / 2; y <= h / 2; y += step) {
      var iy = 0;
      for (var x = -w / 2; x <= w / 2; x += step) {
        if (!roundedRectHit(x, y, w, h, corner)) { iy += 1; continue; }
        var n = seed + ix * 3.17 + iy * 5.91;
        var shimmer = pseudo(n + 2.1);
        var jitter = step * 0.12;
        var breath = 1 + Math.sin(t * 1.2 + n * 0.12) * (opts.breath || 0.018);
        var gx = cx + (x + (pseudo(n) - 0.5) * jitter) * breath;
        var gy = cy + (y + (pseudo(n + 1.37) - 0.5) * jitter) * breath;
        var color = opts.color || dotRgb("body");
        if (!opts.color) {
          if (x < -w * 0.38 || y > h * 0.34) color = dotRgb("bodyDark");
          else if (x > w * 0.22 && y < -h * 0.18) color = dotRgb("bodyLight");
          else if (shimmer > 0.86) color = dotRgb("bodyLight");
        }
        pushDot(dots, gx, gy, step * (0.22 + pseudo(n + 3.7) * 0.12), opts.alpha || (0.72 + pseudo(n + 4.2) * 0.24), color, true);
        iy += 1;
      }
      ix += 1;
    }
  }

  function addOrbitDots(dots, cx, cy, rx, ry, count, phase, color, alpha, size) {
    for (var i = 0; i < count; i += 1) {
      var a = (i / count) * Math.PI * 2 + phase;
      var depth = 0.45 + 0.55 * (Math.sin(a) * 0.5 + 0.5);
      pushDot(
        dots,
        cx + Math.cos(a) * rx,
        cy + Math.sin(a) * ry,
        (size || 1.45) * (0.76 + depth * 0.38),
        (alpha || 0.48) + depth * 0.28,
        color,
        false
      );
    }
  }

  function addChatBubbleDots(dots, cx, cy, w, h, t, color, seed) {
    var count = 26;
    for (var i = 0; i < count; i += 1) {
      var p = i / count;
      var side = Math.floor(p * 4);
      var local = (p * 4) % 1;
      var x = side === 0 ? -w / 2 + local * w : side === 2 ? w / 2 - local * w : (side === 1 ? w / 2 : -w / 2);
      var y = side === 1 ? -h / 2 + local * h : side === 3 ? h / 2 - local * h : (side === 0 ? -h / 2 : h / 2);
      pushDot(dots, cx + x, cy + y + Math.sin(t * 1.3 + seed + i) * 0.7, 1.25, 0.72, color, false);
    }
    pushDot(dots, cx - w * 0.18, cy + h * 0.5 + 4, 1.35, 0.74, color, false);
    pushDot(dots, cx - w * 0.05, cy + h * 0.5 + 7, 1.1, 0.62, color, false);
  }

  function addZeeRoleDots(dots, variant, cx, cy, radius, t) {
    // The particles are information traces, never the character's body.
    // Each trace answers what the selected ZAKI product does in one glance.
    var gold = dotRgb("gold");
    var ink = state.lightInk ? ZEE_RGB.white : ZEE_RGB.ink;
    var accent = variant === "anillos" ? dotRgb("blue")
      : variant === "orbital" ? dotRgb("gold")
      : variant === "espiral" ? dotRgb("green")
      : dotRgb("gold");
    var i, row, p, x, y;

    if (variant === "original") {
      // Agent: a directed route from goal to action, with three live steps.
      for (i = 0; i < 34; i += 1) {
        p = i / 33;
        x = cx - radius * 1.05 + p * radius * 2.1;
        y = cy + radius * 0.52 - Math.sin(p * Math.PI) * radius * 0.84;
        pushDot(dots, x, y, 0.85 + p * 0.85, 0.18 + p * 0.58, i % 8 === 0 ? gold : ink, i % 3 === 0);
      }
      for (i = 0; i < 3; i += 1) {
        x = cx - radius * 0.52 + i * radius * 0.52;
        y = cy - radius * (0.18 + Math.sin((i + 1) * Math.PI / 4) * 0.44);
        pushDot(dots, x, y, 2.1, 0.95, gold, true);
        pushDot(dots, x + 4, y, 0.9, 0.85, ZEE_RGB.white, true);
      }
    } else if (variant === "anillos") {
      // Spaces: two distinct contexts exchange a compact cluster of facts.
      addChatBubbleDots(dots, cx - radius * 0.93, cy - radius * 0.22, radius * 0.46, radius * 0.29, t, accent, 2.1);
      addChatBubbleDots(dots, cx + radius * 0.93, cy - radius * 0.38, radius * 0.48, radius * 0.3, t + 0.9, accent, 5.6);
      for (i = 0; i < 10; i += 1) {
        p = i / 9;
        pushDot(dots, cx - radius * 0.53 + p * radius * 1.06, cy - radius * 0.29 - Math.sin(p * Math.PI) * radius * 0.08, 1.05, 0.34 + p * 0.35, accent, false);
      }
    } else if (variant === "orbital") {
      // Minutes: a speaking waveform is translated into an ordered note.
      for (i = 0; i < 23; i += 1) {
        p = i / 22;
        x = cx - radius * 1.12 + p * radius * 0.68;
        y = cy - radius * 0.12 + Math.sin((p * 3.6 + t * 0.55)) * radius * (0.14 + p * 0.18);
        pushDot(dots, x, y, 0.9 + p * 0.8, 0.24 + p * 0.56, accent, false);
      }
      for (row = 0; row < 4; row += 1) {
        y = cy - radius * 0.48 + row * radius * 0.22;
        pushDot(dots, cx + radius * 0.78, y, 1.75, 0.94, accent, true);
        for (i = 0; i < 5 - (row % 2); i += 1) {
          pushDot(dots, cx + radius * (0.88 + i * 0.052), y, 0.9, 0.6, ink, true);
        }
      }
    } else if (variant === "espiral") {
      // Design: one live stroke resolving into a vector point and spark.
      for (i = 0; i < 40; i += 1) {
        p = i / 39;
        x = cx - radius * 0.98 + p * radius * 1.92;
        y = cy + radius * 0.47 - Math.sin(p * Math.PI) * radius * (0.58 + Math.sin(t * 0.45) * 0.06);
        pushDot(dots, x, y, 0.8 + (1 - p) * 0.8, 0.2 + p * 0.62, accent, false);
      }
      pushDot(dots, cx + radius * 0.56, cy - radius * 0.02, 2.2, 0.94, gold, true);
      pushDot(dots, cx + radius * 0.76, cy - radius * 0.24, 1.42, 0.78, gold, true);
      pushDot(dots, cx + radius * 0.76, cy + radius * 0.2, 1.42, 0.78, gold, true);
    }
  }

  function fitSmallDots(dots, radius) {
    if (radius >= 85) return dots;
    var rk = 0.45 + 0.55 * (radius / 85);
    var keep = radius < 45 ? Math.max(0.3, radius / 45) : 1;
    var kept = [];
    for (var di = 0; di < dots.length; di += 1) {
      if (keep < 1) {
        var h = (di ^ (di >> 16)) | 0;
        h = Math.imul(h, 0x45d9f3b);
        h = ((h >>> 16) ^ h) >>> 0;
        if (h / 4294967296 >= keep) continue;
      }
      dots[di].r = Math.max(0.55, dots[di].r * rk);
      if (keep < 1) dots[di].alpha = Math.max(dots[di].alpha, 0.54);
      kept.push(dots[di]);
    }
    return kept;
  }

  function zeeDots(variant, cx, cy, radius, t, breathSpeed) {
    var dots = [];
    for (var i = 0; i < 12; i += 1) {
      var a = pseudo(i * 4.9) * Math.PI * 2 + t * 0.16;
      var d = radius * (0.62 + pseudo(i * 2.7) * 0.42);
      pushDot(
        dots,
        cx + Math.cos(a) * d,
        cy + Math.sin(a) * d * 0.72,
        0.95 + pseudo(i * 6.2) * 0.9,
        0.18 + pseudo(i * 8.1) * 0.22,
        i % 3 === 0 ? dotRgb("gold") : dotRgb("bodyLight"),
        i % 2 === 0
      );
    }
    addZeeRoleDots(dots, variant, cx, cy, radius, t);
    return fitSmallDots(dots, radius);
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function fillRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth) {
    roundRectPath(ctx, x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke && lineWidth) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  }

  function drawHomeAgentBot(ctx, cx, cy, radius, t) {
    if (!HOME_AGENT_BOT.complete || !HOME_AGENT_BOT.naturalWidth) return false;
    var h = radius * 1.56;
    var w = h * (HOME_AGENT_BOT.naturalWidth / HOME_AGENT_BOT.naturalHeight);
    var bob = Math.sin(t * 1.15) * radius * 0.012;

    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(Math.sin(t * 0.76) * 0.006);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = "rgba(" + ZEE_RGB.redDark + ",0.07)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.43, w * 0.25, h * 0.024, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(HOME_AGENT_BOT, cx - w / 2, cy - h * 0.55, w, h);
    ctx.restore();
    return true;
  }

  function drawZeeShell(ctx, cx, cy, radius, t, opts) {
    opts = opts || {};
    var bob = Math.sin(t * 1.05) * radius * 0.024;
    var outline = "rgb(" + ZEE_RGB.redDark + ")";
    var red = "rgb(" + ZEE_RGB.red + ")";
    var hot = "rgb(" + ZEE_RGB.redHot + ")";
    var light = "rgb(" + ZEE_RGB.redLight + ")";
    var line = Math.max(1.35, radius * (opts.compact ? 0.043 : 0.034));
    var headW = radius * 1.12;
    var headH = radius * 0.91;
    var headX = cx - headW / 2;
    var headY = cy - radius * 0.71 + bob;
    var podW = radius * 0.54;
    var podH = radius * 0.44;
    var podX = cx - podW / 2;
    var podY = cy + radius * 0.31 + bob * 0.42;

    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // The shadow is deliberately slight: ZEE floats, it does not stand.
    ctx.fillStyle = "rgba(" + ZEE_RGB.redDark + ",0.16)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + radius * 0.89, radius * 0.42, radius * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();

    // The spine is a signal link, not a neck. It makes the lower core read
    // as part of ZEE's cognition rather than a detached cartoon body.
    fillRoundRect(
      ctx,
      cx - radius * 0.055,
      cy + radius * 0.17 + bob * 0.7,
      radius * 0.11,
      radius * 0.22,
      radius * 0.04,
      "rgb(" + ZEE_RGB.redDark + ")"
    );
    ctx.fillStyle = "rgba(" + ZEE_RGB.gold + ",0.72)";
    ctx.fillRect(cx - radius * 0.012, cy + radius * 0.27 + bob * 0.7, radius * 0.024, radius * 0.045);

    // A small lower core turns the head into a self-contained device.
    var podGrad = ctx.createLinearGradient(podX, podY, podX + podW, podY + podH);
    podGrad.addColorStop(0, outline);
    podGrad.addColorStop(0.38, red);
    podGrad.addColorStop(1, hot);
    fillRoundRect(ctx, podX, podY, podW, podH, radius * 0.12, podGrad, outline, line);
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    fillRoundRect(ctx, podX + podW * 0.16, podY + podH * 0.15, podW * 0.31, podH * 0.12, radius * 0.03, "rgba(255,255,255,0.13)");

    // Side stabilizers are slabs, not arms; this preserves a technical silhouette.
    var finW = radius * 0.11;
    var finH = radius * 0.27;
    fillRoundRect(ctx, headX - finW * 0.58, headY + headH * 0.33, finW, finH, radius * 0.04, red, outline, line * 0.72);
    fillRoundRect(ctx, headX + headW - finW * 0.42, headY + headH * 0.33, finW, finH, radius * 0.04, red, outline, line * 0.72);

    var headGrad = ctx.createLinearGradient(headX, headY, headX + headW, headY + headH);
    headGrad.addColorStop(0, outline);
    headGrad.addColorStop(0.23, red);
    headGrad.addColorStop(0.73, hot);
    headGrad.addColorStop(1, light);
    fillRoundRect(ctx, headX, headY, headW, headH, radius * 0.18, headGrad, outline, line);
    ctx.save();
    roundRectPath(ctx, headX, headY, headW, headH, radius * 0.18);
    ctx.clip();
    ctx.fillStyle = "rgba(" + ZEE_RGB.redDark + ",0.28)";
    ctx.fillRect(headX, headY, headW * 0.16, headH);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(headX + headW * 0.62, headY + headH * 0.1, headW * 0.22, headH * 0.12);
    ctx.restore();

    // A recessed visor gives the face its adult, instrument-like presence.
    var visorX = headX + headW * 0.12;
    var visorY = headY + headH * 0.22;
    var visorW = headW * 0.76;
    var visorH = headH * 0.48;
    var visorGrad = ctx.createLinearGradient(visorX, visorY, visorX, visorY + visorH);
    visorGrad.addColorStop(0, "rgb(18,17,16)");
    visorGrad.addColorStop(1, "rgb(47,35,31)");
    fillRoundRect(ctx, visorX, visorY, visorW, visorH, radius * 0.115, visorGrad, "rgba(" + ZEE_RGB.redDark + ",0.82)", line * 0.72);
    ctx.fillStyle = "rgba(255,255,255,0.075)";
    fillRoundRect(ctx, visorX + visorW * 0.09, visorY + visorH * 0.12, visorW * 0.5, visorH * 0.11, radius * 0.025, "rgba(255,255,255,0.075)");

    // One status lamp and a single topology mark are enough character.
    ctx.fillStyle = "rgb(" + ZEE_RGB.gold + ")";
    ctx.fillRect(headX + headW * 0.76, headY + headH * 0.1, Math.max(1.5, radius * 0.035), Math.max(1.5, radius * 0.035));
    ctx.restore();
  }

  function drawZeeStaticFace(ctx, cx, cy, radius, inkRgb, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    var lensR = radius * 0.092;
    [-1, 1].forEach(function (side) {
      var ex = cx + side * radius * 0.255;
      var ey = cy - radius * 0.27;
      ctx.fillStyle = "rgb(8,8,8)";
      ctx.beginPath();
      ctx.arc(ex, ey, lensR * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(" + ZEE_RGB.white + ",0.42)";
      ctx.lineWidth = Math.max(0.8, radius * 0.014);
      ctx.beginPath();
      ctx.arc(ex, ey, lensR * 1.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgb(" + ZEE_RGB.white + ")";
      ctx.beginPath();
      ctx.arc(ex + lensR * 0.18, ey - lensR * 0.16, lensR * 0.48, 0, Math.PI * 2);
      ctx.fill();
    });
    drawZeeCore(ctx, cx, cy, radius, 0.4);
    ctx.restore();
  }

  function sphereDots(dots, cx, cy, radius, t, breathSpeed, count, sizeMul, radiusMul) {
    for (var i = 0; i < count; i += 1) {
      var z = 1 - (2 * i) / (count - 1);
      var slice = Math.sqrt(1 - z * z);
      var phase = i * 2.399963 + t;
      var x3 = Math.cos(phase) * slice;
      var y3 = Math.sin(phase) * slice;
      var rotY = t * 0.9;
      var rotX = Math.sin(t * 0.42) * 0.34;
      var px = x3 * Math.cos(rotY) + z * Math.sin(rotY);
      var pz = -x3 * Math.sin(rotY) + z * Math.cos(rotY);
      var py = y3 * Math.cos(rotX) - pz * Math.sin(rotX);
      var depth = (pz + 1) / 2;
      var perspective = 0.68 + depth * 0.38;
      var breath = 1 + Math.sin(t * breathSpeed + i * 0.07) * (state.eyesOpen ? 0.035 : 0.05);
      dots.push({
        gx: cx + px * radius * radiusMul * perspective * breath,
        gy: cy + py * radius * radiusMul * perspective * breath,
        r: (1 + depth * 2.25) * sizeMul,
        alpha: 0.24 + depth * 0.68,
      });
    }
  }

  function mascotDots(variant, cx, cy, radius, t, breathSpeed) {
    if (MASCOT_VARIANTS.indexOf(variant) !== -1) {
      return zeeDots(variant, cx, cy, radius, t, breathSpeed);
    }

    var dots = [];
    var TAU = Math.PI * 2;
    var breathAmp = state.eyesOpen ? 0.035 : 0.05;
    var i, k, a, r;

    if (variant === "denso") {
      sphereDots(dots, cx, cy, radius, t, breathSpeed, 420, 0.62, 1);
    } else if (variant === "anillos") {
      for (k = 1; k <= 6; k += 1) {
        r = (k / 6) * radius * 1.06;
        var count = 6 + k * 7;
        var dir = k % 2 ? 1 : -1;
        var ringBreath = 1 + Math.sin(t * breathSpeed + k) * breathAmp;
        for (i = 0; i < count; i += 1) {
          a = (i / count) * TAU + t * 0.3 * dir;
          dots.push({
            gx: cx + Math.cos(a) * r * ringBreath,
            gy: cy + Math.sin(a) * r * ringBreath,
            r: 2.3 - k * 0.16,
            alpha: 0.9 - k * 0.09,
          });
        }
      }
    } else if (variant === "espiral") {
      for (var arm = 0; arm < 3; arm += 1) {
        for (i = 0; i < 30; i += 1) {
          var tt = i / 29;
          r = 3 + tt * radius * 1.1;
          a = arm * (TAU / 3) + tt * 3.1 + t * 0.55;
          var spBreath = 1 + Math.sin(t * breathSpeed + i * 0.2) * breathAmp;
          dots.push({
            gx: cx + Math.cos(a) * r * spBreath,
            gy: cy + Math.sin(a) * r * spBreath,
            r: 2.5 * (1 - tt * 0.55) + 0.5,
            alpha: 0.35 + 0.6 * (1 - tt),
          });
        }
      }
    } else if (variant === "pixel") {
      var step = radius * 0.21;
      var R = radius * 1.05;
      var pxBreath = 1 + Math.sin(t * breathSpeed) * breathAmp;
      for (var y = -R; y <= R; y += step) {
        for (var x = -R; x <= R; x += step) {
          var dist = Math.sqrt(x * x + y * y);
          if (dist > R) continue;
          dots.push({
            gx: cx + x * pxBreath,
            gy: cy + y * pxBreath,
            r: step * 0.33,
            alpha: 0.45 + 0.5 * (1 - dist / R),
            square: true,
          });
        }
      }
    } else if (variant === "nube") {
      for (i = 0; i < 200; i += 1) {
        r = radius * 1.12 * Math.pow(pseudo(i * 1.7), 0.6);
        a = pseudo(i * 3.1) * TAU;
        var drift = pseudo(i * 5.3) * TAU;
        dots.push({
          gx: cx + Math.cos(a) * r + Math.sin(t * 0.9 + drift) * 3,
          gy: cy + Math.sin(a) * r + Math.cos(t * 1.1 + drift) * 3,
          r: 0.8 + pseudo(i * 7.9) * 2.2,
          alpha: 0.3 + 0.6 * (1 - r / (radius * 1.15)),
        });
      }
    } else if (variant === "orbital") {
      sphereDots(dots, cx, cy, radius, t, breathSpeed, 130, 1, 0.68);
      for (i = 0; i < 22; i += 1) {
        a = (i / 22) * TAU + t * 0.8;
        var depth = 0.55 + 0.45 * (Math.sin(a) * 0.5 + 0.5);
        dots.push({
          gx: cx + Math.cos(a) * radius * 1.28,
          gy: cy + Math.sin(a) * radius * 0.42 - radius * 0.06,
          r: 1.1 + depth * 1.6,
          alpha: 0.25 + depth * 0.6,
        });
      }
    } else if (variant === "erizo") {
      sphereDots(dots, cx, cy, radius, t, breathSpeed, 140, 1, 0.78);
      for (i = 0; i < 24; i += 1) {
        a = (i / 24) * TAU + Math.sin(t * 0.7) * 0.06;
        for (k = 0; k < 3; k += 1) {
          r = radius * (0.88 + 0.14 * k) * (1 + Math.sin(t * breathSpeed + i) * breathAmp);
          dots.push({
            gx: cx + Math.cos(a) * r,
            gy: cy + Math.sin(a) * r,
            r: 1.7 - k * 0.45,
            alpha: 0.75 - k * 0.2,
          });
        }
      }
    } else {
      sphereDots(dots, cx, cy, radius, t, breathSpeed, 170, 1, 1);
    }
    // dot sizes were tuned at desktop radius (~85px). Below that the
    // positions shrink but the ink doesn't, and the field fuses solid —
    // scale the ink down AND thin the field continuously (golden-ratio
    // drop order: stable per-index, no density pops while animating).
    if (radius < 85) {
      var rk = 0.45 + 0.55 * (radius / 85);
      var keep = radius < 45 ? Math.max(0.3, radius / 45) : 1;
      var kept = [];
      for (var di = 0; di < dots.length; di += 1) {
        // NOT φ-based keys here — phyllotaxis IS golden-angle, and any
        // φ-multiplicative key (Knuth's constant included: 2654435761/2^32
        // = φ-1) aligns with it and erases an angular wedge. Integer
        // avalanche hash → drop genuinely scattered across the body.
        if (keep < 1) {
          var h = (di ^ (di >> 16)) | 0;
          h = Math.imul(h, 0x45d9f3b);
          h = ((h >>> 16) ^ h) >>> 0;
          if (h / 4294967296 >= keep) continue;
        }
        dots[di].r = Math.max(0.6, dots[di].r * rk);
        // with fewer dots the alpha shimmer reads as holes — lift the floor
        if (keep < 1) dots[di].alpha = Math.max(dots[di].alpha, 0.55);
        kept.push(dots[di]);
      }
      return kept;
    }
    return dots;
  }

  function drawMascot(canvas, ctx) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    // rect only when the size can have changed — not every frame
    if (!state.cvW || state.tick % 15 === 0 || Math.abs(state.restScale - (state.cvScaleAt || 1)) > 0.02) {
      var rect = canvas.getBoundingClientRect();
      state.cvW = rect.width;
      state.cvH = rect.height;
      state.cvScaleAt = state.restScale;
    }
    if (canvas.width !== Math.floor(state.cvW * dpr) || canvas.height !== Math.floor(state.cvH * dpr)) {
      canvas.width = Math.floor(state.cvW * dpr);
      canvas.height = Math.floor(state.cvH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    var width = state.cvW;
    var height = state.cvH;
    var cx = width / 2;
    var cy = height / 2;
    var t = state.tick * 0.018;
    var isZee = MASCOT_VARIANTS.indexOf(state.mascotVariant) !== -1;
    // The homepage worker is deliberately a little larger than legacy guides.
    var radius = Math.min(width, height) * (isZee ? 0.42 : 0.33);
    var ink = state.lightInk ? INK_LIGHT_RGB : "14,14,12";
    var solidInk = state.lightInk ? INK_LIGHT : INK_DARK;
    var mood = (mascotEl() || {}).dataset ? mascotEl().dataset.mood : "idle";

    ctx.clearRect(0, 0, width, height);

    // --- squash & stretch along velocity ---
    var speed = Math.sqrt(state.vel.x * state.vel.x + state.vel.y * state.vel.y);
    var squash = clamp(speed / 2400, 0, 1) * 0.2;
    var angle = Math.atan2(state.vel.y, state.vel.x);

    ctx.save();
    ctx.translate(cx, cy);
    if (squash > 0.015) {
      ctx.rotate(angle);
      ctx.scale(1 + squash, 1 - squash * 0.72);
      ctx.rotate(-angle);
    }
    if (mood === "smash") {
      ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    }
    ctx.translate(-cx, -cy);

    // --- dot field (variant-pluggable; see /mascotas.html casting page) ---
    var breathSpeed = state.eyesOpen ? 1.6 : 0.9;
    var dots = mascotDots(state.mascotVariant, cx, cy, radius, t, breathSpeed);
    var hasHomeWorker = isZee && HOME_AGENT_BOT.complete && HOME_AGENT_BOT.naturalWidth;
    if (hasHomeWorker) {
      // The follower is a spawned worker, so its orbit stays a quiet signal
      // rather than competing with the character's readable silhouette.
      dots = dots.filter(function (dot, index) {
        if (index % 4 !== 0) return false;
        dot.r = Math.min(dot.r, 0.9);
        dot.alpha *= 0.35;
        return true;
      });
    }
    var gazeAngle = mood === "eat" ? gazeAngleFrom(cx, cy) : 0;
    var chomp = mood === "eat" ? (Math.sin(state.tick * 0.25) + 1) / 2 : 0;
    for (var i = 0; i < dots.length; i += 1) {
      var d = dots[i];
      if (mood === "eat") {
        var dotAngle = Math.atan2(d.gy - cy, d.gx - cx);
        var diff = Math.abs(normalizeAngle(dotAngle - gazeAngle));
        if (diff < 0.55 * chomp) continue; // open mouth: skip dots in the wedge
      }
      ctx.fillStyle = "rgba(" + (d.color || ink) + "," + d.alpha.toFixed(3) + ")";
      if (d.square) {
        ctx.fillRect(d.gx - d.r, d.gy - d.r, d.r * 2, d.r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(d.gx, d.gy, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (isZee) {
      // The supplied canonical bot is the worker users see on the homepage.
      // The previous vector shell remains as a no-network/no-image fallback.
      if (!hasHomeWorker || !drawHomeAgentBot(ctx, cx, cy, radius, t)) {
        drawZeeShell(ctx, cx, cy, radius, t);
        drawEyes(ctx, cx, cy, radius, solidInk);
        drawZeeCore(ctx, cx, cy, radius, t);
      }
    } else {
      // legacy fallback for the old abstract guide variants.
      ctx.fillStyle = solidInk;
      var coreR = Math.max(8, radius * 0.16 + Math.sin(t * 2) * 1.1);
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      drawEyes(ctx, cx, cy, radius, solidInk);
    }

    // --- scan mood: radar sweep ---
    if (mood === "scan") {
      var sweep = (state.tick * 0.06) % (Math.PI * 2);
      var grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(sweep) * radius * 1.5, cy + Math.sin(sweep) * radius * 1.5);
      grad.addColorStop(0, "rgba(" + ink + ",0.55)");
      grad.addColorStop(1, "rgba(" + ink + ",0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweep) * radius * 1.5, cy + Math.sin(sweep) * radius * 1.5);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawZeeMouth(ctx, cx, cy, radius) {
    var y = cy - radius * 0.17;
    ctx.strokeStyle = "rgb(" + ZEE_RGB.redDark + ")";
    ctx.lineWidth = Math.max(1.3, radius * 0.035);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.08, y);
    ctx.lineTo(cx + radius * 0.08, y);
    ctx.stroke();
  }

  function drawZeeCore(ctx, cx, cy, radius, t) {
    var coreX = cx;
    var coreY = cy + radius * 0.38;
    var coreR = Math.max(4.5, radius * 0.095 + Math.sin(t * 2) * 0.7);
    ctx.fillStyle = "rgb(" + ZEE_RGB.gold + ")";
    ctx.beginPath();
    ctx.moveTo(coreX, coreY - coreR);
    ctx.lineTo(coreX + coreR * 0.72, coreY);
    ctx.lineTo(coreX, coreY + coreR);
    ctx.lineTo(coreX - coreR * 0.72, coreY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(" + ZEE_RGB.white + ",0.78)";
    ctx.fillRect(coreX - coreR * 0.16, coreY - coreR * 0.58, coreR * 0.28, coreR * 0.28);
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function gazeAngleFrom(cx, cy) {
    var center = mascotCenter();
    var target = currentGazePoint();
    return Math.atan2(target.y - center.y, target.x - center.x);
  }

  function currentGazePoint() {
    var target = state.gazeTarget;
    if (typeof target === "function") {
      try { return target(); } catch (e) { return state.pointer; }
    }
    if (target && typeof target.x === "number") return target;
    return state.pointer;
  }

  function drawEyes(ctx, cx, cy, radius, solidInk) {
    // ZEE's eyes are lenses inside the visor. They still track the visitor
    // and blink, but no longer become oversized cartoon eyes.
    var now = performance.now();
    var openness = 0;
    if (state.eyesOpen) {
      var untilBlink = state.blinkAt - now;
      if (untilBlink < 130 && untilBlink > -130) openness = Math.abs(untilBlink) / 130;
      else openness = 1;
      if (untilBlink <= -130) state.blinkAt = now + 2600 + Math.random() * 3600;
    }

    var center = mascotCenter();
    var target = currentGazePoint();
    var dx = target.x - center.x;
    var dy = target.y - center.y;
    var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var lookX = (dx / dist) * Math.min(1, dist / 240) * radius * 0.042;
    var lookY = (dy / dist) * Math.min(1, dist / 240) * radius * 0.038;
    if (state.guideMode === "unset") {
      lookX = Math.sin(now * 0.0011) * radius * 0.022;
      lookY = Math.cos(now * 0.0009) * radius * 0.015;
    }
    if (state.eyeSpinUntil && now < state.eyeSpinUntil) {
      // Selection swaps briefly energize the lenses, not the whole face.
      var spin = now * 0.012;
      lookX = Math.cos(spin) * radius * 0.05;
      lookY = Math.sin(spin) * radius * 0.05;
    }

    var eyeOffsetX = radius * 0.255;
    var eyeOffsetY = -radius * 0.27;
    var eyeR = radius * 0.088;

    for (var side = -1; side <= 1; side += 2) {
      var ex = cx + side * eyeOffsetX;
      var ey = cy + eyeOffsetY;
      if (openness < 0.12) {
        ctx.strokeStyle = "rgba(" + ZEE_RGB.white + ",0.7)";
        ctx.lineWidth = Math.max(1, radius * 0.018);
        ctx.beginPath();
        ctx.moveTo(ex - eyeR * 0.72, ey);
        ctx.lineTo(ex + eyeR * 0.72, ey);
        ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(1, Math.max(0.12, openness));
      ctx.fillStyle = "rgb(7,7,7)";
      ctx.beginPath();
      ctx.arc(0, 0, eyeR * 1.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(" + ZEE_RGB.white + ",0.46)";
      ctx.lineWidth = Math.max(0.75, radius * 0.012);
      ctx.beginPath();
      ctx.arc(0, 0, eyeR * 1.03, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgb(" + ZEE_RGB.white + ")";
      ctx.beginPath();
      ctx.arc(lookX, lookY / Math.max(0.2, openness), eyeR * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(" + ZEE_RGB.gold + ",0.9)";
      ctx.fillRect(lookX - eyeR * 0.08, lookY - eyeR * 0.12, eyeR * 0.16, eyeR * 0.16);
      ctx.restore();
    }
  }

  /* ------------------------------------------------------------------ *
   *  Motion trail
   * ------------------------------------------------------------------ */

  function maybeTrail() {
    if (PREFERS_REDUCED) return;
    var speed = Math.sqrt(state.vel.x * state.vel.x + state.vel.y * state.vel.y);
    var now = performance.now();
    if (speed < 620 || now - state.trailAt < 46) return;
    state.trailAt = now;
    var center = mascotCenter();
    var dot = document.createElement("i");
    dot.className = "cs-mascot-trail" + (state.lightInk ? " is-light" : "");
    dot.style.left = (center.x + (Math.random() - 0.5) * 14).toFixed(1) + "px";
    dot.style.top = (center.y + (Math.random() - 0.5) * 14).toFixed(1) + "px";
    document.body.appendChild(dot);
    window.setTimeout(function () { dot.remove(); }, 620);
  }

  /* ------------------------------------------------------------------ *
   *  Impact FX — chomp squash (composed into the frame-loop transform
   *  via --cs-msqx/y) and screen shake applied per-element to the
   *  on-screen cs-root children (transforming cs-root itself would
   *  re-anchor the site's fixed/sticky descendants).
   * ------------------------------------------------------------------ */

  function chomp(strength) {
    state.squash = Math.min(1.4, Math.max(state.squash, strength || 1));
    sfx("chomp");
  }

  function shakeTargets() {
    var targets = [];
    var root = document.getElementById("cs-root");
    if (root) {
      var vh = window.innerHeight;
      Array.prototype.forEach.call(root.children, function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom > -vh && r.top < vh * 2 && r.height > 0) targets.push(el);
      });
    }
    var nav = document.getElementById("cs-nav");
    if (nav) targets.push(nav);
    return targets;
  }

  function screenShake(intensity, duration) {
    if (PREFERS_REDUCED) return;
    sfx("shake");
    var targets = shakeTargets();
    if (!targets.length) return;
    var saved = targets.map(function (el) { return el.style.transform || ""; });
    var t0 = performance.now();
    var dur = duration || 360;
    var amp = 9 * (intensity || 1);
    function step(now) {
      var t = (now - t0) / dur;
      if (t >= 1) {
        targets.forEach(function (el, i) { el.style.transform = saved[i]; });
        return;
      }
      var decay = Math.pow(1 - t, 1.7);
      var dx = Math.sin(t * 47) * amp * decay;
      var dy = Math.cos(t * 36) * amp * 0.55 * decay;
      var rot = Math.sin(t * 23) * 0.3 * (intensity || 1) * decay;
      targets.forEach(function (el, i) {
        el.style.transform = (saved[i] ? saved[i] + " " : "") +
          "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0) rotate(" + rot.toFixed(2) + "deg)";
      });
      window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  // Sustained low rumble that ramps with `ramp(t)` (0..1) — used while the
  // mascot overclocks the marquee. Returns a stop() that eases out cleanly.
  function screenRumble(duration, maxAmp) {
    if (PREFERS_REDUCED) return function () {};
    var targets = shakeTargets();
    if (!targets.length) return function () {};
    var saved = targets.map(function (el) { return el.style.transform || ""; });
    var t0 = performance.now();
    var stopped = false;
    function restore() {
      targets.forEach(function (el, i) { el.style.transform = saved[i]; });
    }
    function step(now) {
      if (stopped) return;
      var t = (now - t0) / duration;
      if (t >= 1) { restore(); return; }
      var ramp = Math.min(1, t * 2.2);
      var amp = (maxAmp || 2.6) * ramp;
      var dx = Math.sin(now * 0.09) * amp;
      var dy = Math.cos(now * 0.11) * amp * 0.6;
      targets.forEach(function (el, i) {
        el.style.transform = (saved[i] ? saved[i] + " " : "") +
          "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0)";
      });
      window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
    return function () {
      if (stopped) return;
      stopped = true;
      restore();
    };
  }

  /* ------------------------------------------------------------------ *
   *  Hero organism — bites via mask-composite. Each bite is a scooped
   *  cluster: one main circle + a scalloped rim of dot-scale circles
   *  (every circle is its own mask layer; intersect = union of holes),
   *  so the edge crumbles like dots instead of cutting a clean curve.
   * ------------------------------------------------------------------ */

  function heroOrganism() {
    return document.getElementById("hero-organism");
  }

  var MASK_OK = (window.CSS && CSS.supports && (CSS.supports("mask-composite", "intersect") || CSS.supports("-webkit-mask-composite", "source-in")));

  function pseudo(n) {
    var x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  function biteLayers(bite) {
    var g = bite.grow;
    if (g <= 0) return [];
    var layers = [];
    var all = [{ dx: 0, dy: 0, r: bite.r }].concat(bite.scallops);
    for (var i = 0; i < all.length; i += 1) {
      var c = all[i];
      var x = bite.xPct + (c.dx * g / bite.w) * 100;
      var y = bite.yPct + (c.dy * g / bite.h) * 100;
      layers.push("radial-gradient(circle " + (c.r * g).toFixed(1) + "px at " + x.toFixed(2) + "% " + y.toFixed(2) + "%, transparent 96%, #000 100%)");
    }
    return layers;
  }

  function applyBiteMask(organism) {
    if (!MASK_OK || !state.heroBites.length) return;
    var layers = [];
    state.heroBites.forEach(function (bite) {
      layers = layers.concat(biteLayers(bite));
    });
    if (!layers.length) return;
    var value = layers.join(",");
    organism.style.setProperty("-webkit-mask-image", value);
    organism.style.setProperty("mask-image", value);
    organism.style.setProperty("-webkit-mask-composite", "source-in");
    organism.style.setProperty("mask-composite", "intersect");
  }

  function addBite(organism, xRatio, yRatio, sizeRatio) {
    var rect = organism.getBoundingClientRect();
    var R = Math.min(rect.width, rect.height) * sizeRatio * 0.5;
    var seed = state.heroBites.length * 7.31 + 2.17;
    var scallops = [];
    var n = 8;
    for (var i = 0; i < n; i += 1) {
      var a = (i / n) * Math.PI * 2 + pseudo(seed + i) * 0.9;
      var rr = R * (0.24 + 0.22 * pseudo(seed + i * 3.7));
      var d = R * (0.84 + 0.24 * pseudo(seed + i * 9.13));
      scallops.push({ dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: rr });
    }
    var bite = {
      xPct: xRatio * 100,
      yPct: yRatio * 100,
      r: R,
      w: rect.width || 1,
      h: rect.height || 1,
      scallops: scallops,
      grow: PREFERS_REDUCED ? 1 : 0,
    };
    state.heroBites.push(bite);
    if (bite.grow < 1) bite.grow = 0.55;
    applyBiteMask(organism);
    if (bite.grow >= 1) return;
    var t0 = performance.now();
    var dur = 130;
    function grow(now) {
      var t = Math.min(1, (now - t0) / dur);
      bite.grow = 0.55 + 0.45 * (1 - Math.pow(1 - t, 2.4));
      applyBiteMask(organism);
      if (t < 1) window.requestAnimationFrame(grow);
    }
    window.requestAnimationFrame(grow);
  }

  function clearOrganism(restoreDelay) {
    var organism = heroOrganism();
    if (!organism) return;
    window.setTimeout(function () {
      state.heroBites = [];
      organism.style.removeProperty("-webkit-mask-image");
      organism.style.removeProperty("mask-image");
      organism.style.removeProperty("-webkit-mask-composite");
      organism.style.removeProperty("mask-composite");
      organism.style.transition = "opacity 1.6s ease, filter 1.6s ease";
      organism.style.removeProperty("visibility");
      organism.style.opacity = "1";
      organism.style.filter = "none";
      state.organismConsumed = false;
      window.setTimeout(function () {
        organism.style.removeProperty("transition");
        organism.style.removeProperty("opacity");
        organism.style.removeProperty("filter");
      }, 1700);
    }, restoreDelay || 0);
  }

  async function eatHeroDots() {
    var organism = heroOrganism();
    if (!organism) return;
    state.organismConsumed = true;

    // Bites scoop the SILHOUETTE (cookie-bite from the rim reads as eaten;
    // interior holes read as a mask). The projected shape is small relative
    // to its canvas box — effective radius ≈ 0.10 of the box — so bite
    // centers sit on that circle and bite radii stay at dot-cluster scale.
    var bites = [
      { x: 0.550, y: 0.413, s: 0.09, line: "First bite." },
      { x: 0.590, y: 0.520, s: 0.105, line: "Crunchy." },
      { x: 0.487, y: 0.583, s: 0.12, line: "Nom." },
    ];

    setMood("eat");
    for (var i = 0; i < bites.length; i += 1) {
      var bite = bites[i];
      anchorNode(organism, bite.x, bite.y);
      lookAt(pointOn.bind(null, organism, bite.x, bite.y)());
      say(bite.line, 1150);
      await gwait(430);
      addBite(organism, bite.x, bite.y, bite.s);
      chomp(1);
      dotStream(pointOn(organism, bite.x, bite.y), mascotCenter(), 42 + i * 12, {
        fromSpread: Math.min(organism.getBoundingClientRect().width, organism.getBoundingClientRect().height) * bite.s * 0.7,
        delaySpread: 380,
      });
      await gwait(700);
    }

    // Final bite: vacuum waves.
    anchorNode(organism, 0.5, 0.5, 0, -30);
    say("Final bite. Slow vacuum mode.");
    await gwait(700);

    var waves = [
      { x: 0.44, y: 0.44, s: 0.17 }, { x: 0.57, y: 0.44, s: 0.18 },
      { x: 0.5, y: 0.58, s: 0.2 }, { x: 0.5, y: 0.42, s: 0.24 },
      { x: 0.5, y: 0.5, s: 0.55 },
    ];
    for (var w = 0; w < waves.length; w += 1) {
      var wave = waves[w];
      addBite(organism, wave.x, wave.y, wave.s);
      chomp(0.55);
      dotStream(pointOn(organism, wave.x, wave.y), mascotCenter(), 30 + w * 8, {
        fromSpread: 60, delaySpread: 420,
      });
      organism.style.opacity = Math.max(0.06, 1 - (w + 1) / waves.length).toFixed(2);
      organism.style.filter = "blur(" + (0.4 + w * 0.3).toFixed(2) + "px) saturate(" + Math.max(0.2, 1 - w * 0.12).toFixed(2) + ")";
      await gwait(w < waves.length - 1 ? 260 : 520);
    }

    stopTalking();
    organism.style.opacity = "0";
    chomp(1.3);
    screenShake(0.6, 300);
    await gwait(420);
    organism.style.visibility = "hidden";
    setMood("idle");
  }

  /* ------------------------------------------------------------------ *
   *  Marquee — overclock the REAL bar (additive, seamless)
   * ------------------------------------------------------------------ */

  function findMarqueeTrack() {
    return document.querySelector("[data-marq]");
  }

  // The site's rAF writes `track.style.transform = translate3d(off px,…)`
  // every frame, wrapping `off` within one loop width. Our own rAF was
  // registered later, so it runs AFTER theirs each frame: we re-read the
  // fresh value and re-write it with an eased extra offset, wrapped modulo
  // the loop width. The real bar just spins faster, then glides back into
  // phase — no clones, no gaps, no snap.
  function overclockMarquee(track, duration) {
    var half = track.scrollWidth / 2;
    if (!half) return Promise.resolve();

    var totalExtra = half * 2; // whole loops → ends exactly in phase
    var start = performance.now();

    function easeInOut(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    return new Promise(function (resolve) {
      (function warp(now) {
        var t = clamp((now - start) / duration, 0, 1);
        var extra = totalExtra * easeInOut(t);
        var value = track.style.transform || "";
        var match = /translate3d\((-?[\d.]+)px/.exec(value);
        if (match) {
          var base = parseFloat(match[1]);
          var vis = -(((-base) + extra) % half);
          track.style.transform = value.replace(match[1] + "px", vis.toFixed(2) + "px");
        }
        if (t < 1 && !guide.aborted) window.requestAnimationFrame(warp);
        else resolve();
      })(start);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Toolkit — real physics via synthetic mouse on the MouseConstraint
   * ------------------------------------------------------------------ */

  function physicsBox() {
    return document.getElementById("cs-physics-box");
  }

  function pillCenter(pill) {
    var rect = pill.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  // Map a pill element to its Matter body (positions are box-local).
  function bodyForPill(pill) {
    var phys = window.__csPhysics;
    var box = physicsBox();
    if (!phys || !box) return null;
    var M = phys.Matter;
    var boxRect = box.getBoundingClientRect();
    var center = pillCenter(pill);
    var local = { x: center.x - boxRect.left, y: center.y - boxRect.top };
    var bodies = M.Composite.allBodies(phys.engine.world).filter(function (body) {
      return !body.isStatic;
    });
    var best = null;
    var bestDist = 64; // must be close — otherwise it's another pill
    bodies.forEach(function (body) {
      var dx = body.position.x - local.x;
      var dy = body.position.y - local.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = body; }
    });
    return best;
  }

  // Carry a REAL body along an eased arc to a box-local target.
  function carryBody(pill, targetLocal, ms) {
    var phys = window.__csPhysics;
    var body = bodyForPill(pill);
    if (!phys || !body) return Promise.resolve(false);
    var M = phys.Matter;
    var start = { x: body.position.x, y: body.position.y };
    var startTime = performance.now();
    if (M.Sleeping) M.Sleeping.set(body, false);

    return new Promise(function (resolve) {
      (function step(now) {
        var t = clamp((now - startTime) / ms, 0, 1);
        var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        var arc = Math.sin(t * Math.PI) * 40; // lift while carried
        M.Body.setVelocity(body, { x: 0, y: 0 });
        M.Body.setAngularVelocity(body, 0);
        M.Body.setPosition(body, {
          x: start.x + (targetLocal.x - start.x) * eased,
          y: start.y + (targetLocal.y - start.y) * eased - arc,
        });
        M.Body.setAngle(body, body.angle * (1 - t * 0.2));
        if (t < 1) window.requestAnimationFrame(step);
        else {
          M.Body.setVelocity(body, { x: 0, y: 1.5 }); // gentle drop into place
          resolve(true);
        }
      })(startTime);
    });
  }

  function flingBody(pill, velocity) {
    var phys = window.__csPhysics;
    var body = bodyForPill(pill);
    if (!phys || !body) return false;
    var M = phys.Matter;
    if (M.Sleeping) M.Sleeping.set(body, false);
    M.Body.setVelocity(body, velocity);
    M.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    return true;
  }

  function pillByText(patterns) {
    var pills = Array.prototype.slice.call(document.querySelectorAll("[data-pill]"));
    for (var i = 0; i < patterns.length; i += 1) {
      for (var j = 0; j < pills.length; j += 1) {
        if (patterns[i].test(pills[j].textContent || "")) return pills[j];
      }
    }
    return null;
  }

  function glowPill(pill) {
    pill.classList.add("cs-pill-core");
  }

  /* ------------------------------------------------------------------ *
   *  FAQ — visible wreck + recycled answer
   * ------------------------------------------------------------------ */

  function faqItems() {
    return Array.prototype.slice.call(document.querySelectorAll("[data-faq]"));
  }

  // Measure the REAL words of the question (exact position + typography)
  // so the visible sentence itself appears to break apart.
  function questionWordPieces(item) {
    var q = item.querySelector("[data-faq-q]") || item;
    var pieces = [];
    var walker = document.createTreeWalker(q, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      var node = walker.currentNode;
      var re = /\S+/g;
      var m;
      while ((m = re.exec(node.textContent))) {
        var range = document.createRange();
        try {
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
        } catch (e) { continue; }
        var rect = range.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        var parentStyle = window.getComputedStyle(node.parentElement || q);
        pieces.push({
          word: m[0],
          rect: rect,
          font: parentStyle.font,
          letterSpacing: parentStyle.letterSpacing,
          color: parentStyle.color,
        });
      }
    }
    return pieces;
  }

  // The question's own words drop with gravity, bounce on the section
  // floor and lie there as debris.
  function wreckFaq(item) {
    if (PREFERS_REDUCED) return;
    var rect = item.getBoundingClientRect();
    var pieces = questionWordPieces(item);
    createImpact(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5, "boring");

    // Hide the original with inline !important — the only thing that
    // reliably beats the site's [data-shown] rules.
    setImportant(item, "visibility", "hidden");
    state.wreckedFaqs.push(item);

    var layer = document.createElement("div");
    layer.className = "cs-faq-shard-layer";
    document.body.appendChild(layer);

    var faqSection = document.getElementById("faq");
    var floorY = Math.min(
      window.innerHeight - 34,
      (faqSection ? faqSection.getBoundingClientRect().bottom : rect.bottom + 260) - 10
    );

    var sims = pieces.map(function (piece) {
      var node = document.createElement("span");
      node.className = "cs-faq-piece";
      node.textContent = piece.word;
      node.style.font = piece.font;
      node.style.letterSpacing = piece.letterSpacing;
      node.style.color = piece.color;
      node.style.left = piece.rect.left.toFixed(1) + "px";
      node.style.top = piece.rect.top.toFixed(1) + "px";
      layer.appendChild(node);
      return {
        node: node,
        x: 0, y: 0, r: 0,
        vx: (Math.random() - 0.5) * 170,
        vy: -50 - Math.random() * 170,
        vr: (Math.random() - 0.5) * 240,
        top: piece.rect.top,
        resting: false,
      };
    });

    var last = performance.now();
    (function fall(now) {
      if (!layer.isConnected || layer.dataset.stop) return;
      var dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      var allRest = true;
      sims.forEach(function (s) {
        if (s.resting) return;
        s.vy += 2400 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.r += s.vr * dt;
        if (s.top + s.y >= floorY) {
          s.y = floorY - s.top;
          if (Math.abs(s.vy) < 110) {
            s.resting = true;
          } else {
            s.vy = -s.vy * 0.32;
            s.vx *= 0.6;
            s.vr *= 0.55;
          }
        }
        if (!s.resting) allRest = false;
        s.node.style.transform =
          "translate3d(" + s.x.toFixed(1) + "px," + s.y.toFixed(1) + "px,0) rotate(" + s.r.toFixed(1) + "deg)";
      });
      if (!allRest) window.requestAnimationFrame(fall);
    })(last);

    return layer;
  }

  // A few useful words fly back into the gap the broken FAQ left behind
  // and become the straight answer; the rest of the debris fades out.
  function recycleFaq(layer, gapRect, betterLine) {
    layer.dataset.stop = "1";
    var target = {
      x: gapRect.left + gapRect.width * 0.5,
      y: gapRect.top + gapRect.height * 0.5,
    };
    var nodes = Array.prototype.slice.call(layer.querySelectorAll(".cs-faq-piece"));
    var step = Math.max(1, Math.ceil(nodes.length / 3));
    nodes.forEach(function (node, i) {
      var rect = node.getBoundingClientRect();
      // freeze at the current visual spot, then animate cleanly from there
      node.style.left = rect.left.toFixed(1) + "px";
      node.style.top = rect.top.toFixed(1) + "px";
      node.style.transform = "none";
      if (!node.animate) { node.remove(); return; }
      if (i % step === 0) {
        node.animate(
          [
            { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
            {
              transform: "translate3d(" + (target.x - rect.left).toFixed(1) + "px," + (target.y - rect.top).toFixed(1) + "px,0) scale(0.4)",
              opacity: 0,
            },
          ],
          { duration: 640, delay: i * 26, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" }
        );
      } else {
        node.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          { duration: 520, delay: 260 + i * 22, fill: "forwards" }
        );
      }
    });

    window.setTimeout(function () {
      layer.remove();
      if (guide.aborted) return;
      var chip = document.createElement("span");
      chip.className = "cs-recycle-chip";
      chip.textContent = betterLine;
      placeInDoc(chip, target.x, target.y);
      createImpact(target.x, target.y, "recycled");
      onCleanup(function () { chip.remove(); });
      fadeOutNode(chip, 3600);
    }, 900);
  }

  function restoreFaq() {
    state.wreckedFaqs.forEach(function (item) {
      item.style.removeProperty("visibility");
    });
    state.wreckedFaqs = [];
    Array.prototype.forEach.call(document.querySelectorAll(".cs-faq-shard-layer"), function (layer) {
      layer.dataset.stop = "1";
      layer.remove();
    });
  }

  /* ------------------------------------------------------------------ *
   *  Ship particles
   * ------------------------------------------------------------------ */

  function findShipBlock() {
    var canvas = document.querySelector("canvas[data-particles]");
    return sectionFrom(canvas) || canvas || findByText(["we ship", "production"]);
  }

  function shipParticleNodes() {
    var ship = findShipBlock();
    var scope = ship || document;
    return Array.prototype.slice.call(
      scope.querySelectorAll('canvas[data-particles], [data-organism][data-org-variant="glow"]')
    );
  }

  function prepareShipParticles() {
    if (state.shipPrepared) return;
    state.shipPrepared = true;
    shipParticleNodes().forEach(function (node) {
      setImportant(node, "opacity", "0");
    });
  }

  function revealShipParticles() {
    shipParticleNodes().forEach(function (node) {
      node.style.setProperty("transition", "opacity 1.3s ease");
      node.style.removeProperty("opacity");
      window.setTimeout(function () { node.style.removeProperty("transition"); }, 1500);
    });
  }

  function restoreShipParticles() {
    if (!state.shipPrepared) return;
    state.shipPrepared = false;
    shipParticleNodes().forEach(function (node) {
      node.style.removeProperty("opacity");
      node.style.removeProperty("transition");
    });
  }

  /* ------------------------------------------------------------------ *
   *  Contact helpers
   * ------------------------------------------------------------------ */

  function findContactButton() {
    var contact = document.getElementById("contact");
    if (contact) {
      return (
        contact.querySelector('a[href*="/contact"]') ||
        contact.querySelector('a[href^="mailto:"]') ||
        contact.querySelector("a")
      );
    }
    return document.querySelector('a[href*="/contact"], a[href^="mailto:"]');
  }

  async function armContactButton(button) {
    var rect = button.getBoundingClientRect();
    var start = mascotCenter();
    var pill = document.createElement("span");
    pill.className = "cs-quote-chip";
    pill.textContent = "first loop";
    pill.style.left = (start.x - 58).toFixed(1) + "px";
    pill.style.top = (start.y - 18).toFixed(1) + "px";
    document.body.appendChild(pill);
    var target = { x: rect.left + rect.width * 0.5, y: rect.top + rect.height * 0.5 };
    tetherTo(function () { return target; }, 1050);
    setMood("grab", 1200);
    if (pill.animate) {
      pill.animate(
        [
          { opacity: 0, transform: "translate3d(0,0,0) scale(0.8) rotate(-4deg)" },
          { opacity: 1, transform: "translate3d(0,-20px,0) scale(1.04) rotate(2deg)", offset: 0.22 },
          {
            opacity: 1,
            transform: "translate3d(" + (target.x - start.x + 58).toFixed(1) + "px," + (target.y - start.y + 18).toFixed(1) + "px,0) scale(0.6) rotate(0deg)",
          },
        ],
        { duration: 1050, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" }
      );
    }
    await gwait(1000);
    createImpact(target.x, target.y, "armed");
    button.classList.add("cs-cta-armed");
    window.setTimeout(function () { pill.remove(); }, 700);
    window.setTimeout(function () { button.classList.remove("cs-cta-armed"); }, 4200);
  }

  /* ------------------------------------------------------------------ *
   *  GUIDE — the storyboard, beat by beat
   * ------------------------------------------------------------------ */

  function setOrganismMouse(on) {
    var list = window.__csOrganisms || [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].setMouse) list[i].setMouse(on);
    }
  }

  async function runGuide() {
    guide.running = true;
    guide.aborted = false;
    lockUserScroll();
    // while the site drives, the visitor's cursor must not deform the dots
    setOrganismMouse(false);
    prepareShipParticles();
    showSkip();

    try {
      // Beats follow the page top-to-bottom. The [data-marq] speed bar
      // sits directly under the hero (y≈1241) — it is beat #2, measured,
      // not assumed (a previous reorder got this wrong).
      await beatHero();
      await beatMarquee();
      await beatStatement();
      await beatMethod();
      await beatWorkforce();
      await beatShip();
      await beatProjects();
      await beatToolkit();
      await beatFaq();
      await beatContact();
      finishGuide(false);
    } catch (err) {
      if (err === ABORT) finishGuide(true);
      else {
        // Never leave the page locked because of a bug.
        finishGuide(true);
        if (window.console && console.error) console.error("[mascot]", err);
      }
    }
  }

  function finishGuide(aborted) {
    if (window.__csPlayChipToGame) window.__csPlayChipToGame(); // the transport becomes the game launcher
    guide.running = false;
    guide.aborted = true;
    runCleanups();
    unlockUserScroll();
    setOrganismMouse(true);
    stopTalking();
    setMood("idle");
    releaseAnchor();
    lookAt(null);
    restoreFaq();
    if (aborted) {
      restoreShipParticles();
      clearOrganism(300);
      say("You have the controls.", 2200);
    } else {
      // Regrow the hero quietly so the page is whole when they scroll back.
      clearOrganism(4200);
    }
    state.guideDone = true;
  }

  /* --- 2 · Hero ------------------------------------------------------ */

  async function beatHero() {
    state.mode = "hero";
    var organism = heroOrganism();
    var headline = document.querySelector("h1") || document.body;

    // Arrive from the gate, look around, let them read.
    // Up-left of the organism — never wake up inside the dots.
    // On phones the headline fills the width: park top-right instead so
    // the mascot + bubble never sit on the copy.
    if (isMobile()) anchorPoint(window.innerWidth * 0.94, window.innerHeight * 0.115);
    else anchorPoint(window.innerWidth * 0.42, window.innerHeight * 0.16);
    await gwait(360);

    lookAt(function () { return pointOn(headline, 0.4, 0.4); });
    await saySequence([
      { text: "That headline isn't a metaphor.", hold: 380 },
      { text: "I'm the office demo — built to prove it.", hold: 480 },
    ]);

    if (organism) {
      lookAt(function () { return pointOn(organism, 0.5, 0.5); });
      anchorNode(organism, -0.06, 0.3);
      await saySequence([
        { text: "Those dots look expensive. Mine now.", hold: 240 },
      ]);
      await eatHeroDots();
    }
    releaseAnchor();
    lookAt(null);
  }

  /* --- 3 · Marquee ---------------------------------------------------- */

  async function beatMarquee() {
    var track = findMarqueeTrack();
    if (!track) return;
    var band = track.closest("section") || track.parentElement || track;

    await scrollToNode(band, 0.34);
    state.mode = "work";
    anchorNode(band, 0.6, 0, 0, -74);
    lookAt(function () { return pointOn(band, 0.5, 0.5); });

    await saySequence([
      { text: "That bar is the menu: agents, RAG, MCP…", hold: 200 },
    ]);
    // Kick the spin UNDER the second line — no dead air before the drag.
    say("Too slow to read. Overclocking.");

    // Already tempo-scaled: the waits below use `exact` so the lunges and
    // the impact stamp stay in phase with the spin.
    var duration = tempo(2600);
    setMood("boost", duration + 800);
    tetherTo(function () { return pointOn(band, 0.5, 0.42); }, duration + 200);
    sfx("whoosh");
    overclockMarquee(track, duration);
    state.eyeSpinUntil = performance.now() + duration + 500;
    // the whole page vibrates while the bar spins up, ramping with it
    var stopRumble = screenRumble(duration, 2.8);
    // little push lunges while it spins up
    anchorNode(band, 0.64, 0, 0, -74);
    await gwait(duration * 0.55, true);
    anchorNode(band, 0.56, 0, 0, -74);
    await gwait(duration * 0.45 + 150, true);
    stopRumble();

    var impactPoint = pointOn(band, 0.72, 0.5);
    createImpact(impactPoint.x, impactPoint.y, "overclocked");
    screenShake(1, 420);
    chomp(0.8);
    say("Now it has cardio.");
    await gwait(sayMs("Now it has cardio.") + 260, true);
    releaseAnchor();
    lookAt(null);
  }

  /* --- 3b · Statement ("We don't just call …") -------------------------- */

  async function beatStatement() {
    var block = document.getElementById("work");
    if (!block) return;
    var heading = block.querySelector("h1, h2, h3") || block;
    await scrollToNode(block, "center");
    state.mode = "work";

    anchorNode(heading, 0.96, -0.28, 0, -26);
    lookAt(function () { return pointOn(heading, 0.4, 0.5); });
    await saySequence([
      { text: "Our manifesto. Most 'AI products' are a wrapper around one API call.", hold: 500 },
      { text: "Ours aren't. Scanning for lies…", hold: 200 },
    ]);

    setMood("scan", 2100);
    deepScan(heading, { label: "0 LIES FOUND", duration: 1900 });
    state.eyeSpinUntil = performance.now() + tempo(1900);
    await gwait(2100);

    say("Zero found. Certified.");
    await gwait(sayMs("Zero found. Certified.") + 200, true);
    releaseAnchor();
    lookAt(null);
  }

  /* --- 3d · Workforce deck ------------------------------------------------ */

  function deckCards() {
    return Array.prototype.slice.call(document.querySelectorAll("#cs-worker-deck .cs-worker-card"));
  }

  function layoutDeck() {
    var cards = deckCards();
    var n = cards.length;
    cards.forEach(function (card, i) {
      var depth = n - 1 - i; // last DOM child sits on top
      card.style.zIndex = String(10 + i);
      card.style.transition = "transform .3s cubic-bezier(.16,1,.3,1), opacity .3s ease";
      card.__base = "translate(" + (-depth * 7) + "px," + (depth * 7) + "px) rotate(" + (-depth * 1.7) + "deg)";
      card.style.transform = card.__base;
      card.style.opacity = depth > 4 ? "0" : "1";
      card.style.pointerEvents = depth === 0 ? "auto" : "none";
    });
  }

  var deckBusyUntil = 0;

  function cycleDeck() {
    var deck = document.getElementById("cs-worker-deck");
    var cards = deckCards();
    if (!deck || cards.length < 2) return;
    var now = performance.now();
    if (now < deckBusyUntil) return;
    deckBusyUntil = now + 240;
    sfx("flip");
    var top = cards[cards.length - 1];
    top.style.transition = "transform .2s cubic-bezier(.76,0,.24,1), opacity .2s ease";
    top.style.transform = "translate(150px,-36px) rotate(10deg)";
    top.style.opacity = "0";
    window.setTimeout(function () {
      deck.insertBefore(top, deck.firstChild);
      layoutDeck();
    }, 195);
  }

  var WORKFORCE_PROFILES = {
    original: {
      title: "AGENT-01", type: "Personal agent",
      role: "Goals, research & follow-up", memory: "Context that compounds", control: "You approve actions",
      output: "Plans the next useful step. You stay in control.",
    },
    denso: {
      title: "SUPPORT-02", type: "Response desk",
      role: "Support & triage", memory: "Learns your standards", control: "You approve sends",
      output: "Drafts the next helpful reply for you to review.",
    },
    anillos: {
      title: "SPACES-03", type: "Context room",
      role: "Projects, files & decisions", memory: "Shared context stays connected", control: "You choose access",
      output: "Keeps every project thread in one place.",
    },
    espiral: {
      title: "DESIGN-04", type: "Creative partner",
      role: "Briefs, systems & assets", memory: "References stay in view", control: "You approve final work",
      output: "Turns an unfinished brief into a direction to iterate.",
    },
    orbital: {
      title: "MINUTES-05", type: "Decision recorder",
      role: "Meetings & follow-up", memory: "Decisions stay linked", control: "You approve the recap",
      output: "Turns meeting notes into owners and next steps.",
    },
    nube: {
      title: "RESEARCH-06", type: "Signal finder",
      role: "Research & synthesis", memory: "Sources stay traceable", control: "You choose what matters",
      output: "Finds the signal and keeps the sources attached.",
    },
    pixel: {
      title: "QA-07", type: "Quality check",
      role: "QA & verification", memory: "Criteria stay remembered", control: "You approve fixes",
      output: "Checks the work against the standard you set.",
    },
    erizo: {
      title: "GUARD-08", type: "Safety check",
      role: "Control & security", memory: "Permissions stay in context", control: "You approve access",
      output: "Flags risky actions before anything leaves your space.",
    },
  };

  var WORKER_ACCESSORIES = {
    original:
      '<svg class="cs-worker-card__accessory" viewBox="0 0 64 72" aria-hidden="true"><path d="M9 22h46v7H9z" fill="currentColor"/><path d="M14 24h10v2H14m16-2h10v2H30" stroke="var(--paper)" stroke-width="2" stroke-linecap="round"/></svg>',
    denso:
      '<svg class="cs-worker-card__accessory" viewBox="0 0 64 72" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 34v-5a18 18 0 0 1 36 0v5"/><path d="M12 33v9h6v-9m28 0v9h6v-9" fill="var(--paper)"/><path d="M52 42h5l-3 5"/></svg>',
    anillos:
      '<svg class="cs-worker-card__accessory" viewBox="0 0 64 72" aria-hidden="true"><path d="M43 5h15v11H49l-4 4v-4h-2z" fill="var(--paper)" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="48" cy="10.5" r="1.2" fill="var(--accent)"/><circle cx="52" cy="10.5" r="1.2" fill="var(--accent)"/><circle cx="56" cy="10.5" r="1.2" fill="var(--accent)"/></svg>',
    espiral:
      '<svg class="cs-worker-card__accessory" viewBox="0 0 64 72" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m42 58 15-18"/><path d="m54 37 4 4-3 4-4-4z" fill="var(--accent)"/><path d="m40 61 5-5"/></svg>',
    orbital:
      '<svg class="cs-worker-card__accessory" viewBox="0 0 64 72" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M43 38h14v18H43z" fill="var(--paper)"/><path d="M47 44h7m-7 4h7m-7 4h5"/><path d="m39 56 15-15" stroke="var(--accent)" stroke-width="3"/></svg>',
    nube:
      '<svg class="cs-worker-card__accessory" viewBox="0 0 64 72" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="14" cy="48" r="8" fill="var(--paper)"/><path d="m20 54 7 7"/><path d="m11 48 2 2 4-4" stroke="var(--accent)"/></svg>',
    pixel:
      '<svg class="cs-worker-card__accessory" viewBox="0 0 64 72" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M44 7h13v15H44z" fill="var(--paper)"/><path d="m47 14 3 3 5-6" stroke="var(--accent)" stroke-width="3"/></svg>',
    erizo:
      '<svg class="cs-worker-card__accessory" viewBox="0 0 64 72" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" aria-hidden="true"><path d="M7 41 16 37l9 4v8c0 6-4 10-9 12-5-2-9-6-9-12z" fill="var(--paper)"/><path d="m11 49 3 3 6-7" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>',
  };

  function decorateWorkerCards(deck) {
    if (!deck) return;
    Array.prototype.forEach.call(deck.querySelectorAll(".cs-worker-card"), function (card) {
      if (card.querySelector(".cs-worker-card__portrait")) return;
      var avatar = card.querySelector("svg");
      if (!avatar) return;
      var portrait = document.createElement("div");
      portrait.className = "cs-worker-card__portrait";
      portrait.innerHTML = '<img src="/site/assets/zaki-worker-full.png" alt="" aria-hidden="true">' + (WORKER_ACCESSORIES[card.dataset.worker] || "");
      avatar.replaceWith(portrait);
    });

    var setRow = function (row, label, value) {
      if (!row) return;
      var fields = row.querySelectorAll("span");
      if (fields[0]) fields[0].textContent = label;
      if (fields[1]) fields[1].textContent = value;
    };
    Array.prototype.forEach.call(deck.querySelectorAll(".cs-worker-card"), function (card) {
      var profile = WORKFORCE_PROFILES[card.dataset.worker];
      if (!profile) return;
      var portrait = card.querySelector(".cs-worker-card__portrait");
      var identity = portrait && portrait.parentElement && portrait.parentElement.lastElementChild;
      if (identity) {
        if (identity.firstElementChild) identity.firstElementChild.textContent = profile.title;
        if (identity.lastElementChild) identity.lastElementChild.textContent = profile.type;
      }
      var rows = Array.prototype.slice.call(card.children);
      setRow(rows[2], "role", profile.role);
      setRow(rows[3], "memory", profile.memory);
      setRow(rows[4], "control", profile.control);
      if (rows[5]) rows[5].textContent = profile.output;
    });
  }

  /* ------------------------------------------------------------------ *
   *  Toolkit playtime — free-roam only. If the visitor flings a pill,
   *  the mascot chases it, ropes it mid-air and tosses it back.
   * ------------------------------------------------------------------ */

  var PLAY_CATCH_LINES = ["Captured.", "Kept in motion.", "Locked.", "Moved."];
  var PLAY_TOSS_LINES = ["Send it.", "Back to the loop.", "Keep moving.", "Your move."];

  function playWait(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  }

  function fastestPill() {
    var phys = window.__csPhysics;
    if (!phys) return null;
    var pills = document.querySelectorAll("[data-pill]");
    var best = null;
    var bestSpeed = 0;
    for (var i = 0; i < pills.length; i += 1) {
      var body = bodyForPill(pills[i]);
      if (!body) continue;
      var v = body.velocity;
      var speed = Math.sqrt(v.x * v.x + v.y * v.y);
      if (speed > bestSpeed) { bestSpeed = speed; best = pills[i]; }
    }
    return bestSpeed > 13 ? best : null;
  }

  async function playCatch(pill) {
    state.playCatching = true;
    state.playAt = performance.now();
    try {
      setMood("boost", 3000);
      sfx("whoosh");
      say(PLAY_CATCH_LINES[Math.floor(Math.random() * PLAY_CATCH_LINES.length)], 1100);
      var center = pillCenter(pill);
      anchorPoint(clamp(center.x - 150, 90, window.innerWidth - 90), clamp(center.y - 90, 90, window.innerHeight - 90));
      lookAt(pillCenter.bind(null, pill));
      var stopRope = tetherTo(pillCenter.bind(null, pill), 1500);
      await playWait(620);
      // snatch: freeze it a beat, then hurl it back into the box
      var phys = window.__csPhysics;
      var body = bodyForPill(pill);
      if (phys && body) {
        phys.Matter.Body.setVelocity(body, { x: 0, y: 0 });
        chomp(0.7);
        await playWait(320);
        flingBody(pill, { x: (Math.random() - 0.5) * 18, y: -(9 + Math.random() * 7) });
        sfx("flip");
      }
      await playWait(300);
      stopRope();
      say(PLAY_TOSS_LINES[Math.floor(Math.random() * PLAY_TOSS_LINES.length)], 1400);
      await playWait(500);
    } finally {
      releaseAnchor();
      lookAt(null);
      setMood("idle");
      state.playCatching = false;
      state.playAt = performance.now();
    }
  }

  function initToolkitPlay() {
    window.setInterval(function () {
      if (guide.running || state.chatOpen || state.playCatching || state.anchor) return;
      if (!(state.guideMode === "manual" || state.guideDone)) return;
      if (performance.now() - (state.playAt || 0) < 4200) return;
      var box = physicsBox();
      if (!box) return;
      var r = box.getBoundingClientRect();
      if (r.bottom < 60 || r.top > window.innerHeight - 60) return;
      var pill = fastestPill();
      if (pill) playCatch(pill);
    }, 260);
  }

  /* ------------------------------------------------------------------ *
   *  Nav agent — a tiny spawned worker in the header. Click it to cycle
   *  the active ZAKI agent type and paired palette.
   * ------------------------------------------------------------------ */

  var NAV_PET_QUIPS = ["New skin!", "Ooh. Fancy.", "Recolor!", "I contain multitudes."];

  function initNavPet() {
    var nav = document.getElementById("cs-nav");
    if (!nav || document.querySelector(".cs-nav-pet")) return;
    var links = nav.querySelector("div");
    if (!links) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs-nav-pet is-born";
    window.setTimeout(function () { btn.classList.remove("is-born"); }, 700);
    btn.setAttribute("aria-label", "Change ZAKI agent mode and palette");
    btn.title = "Click me";
    var cv = document.createElement("canvas");
    cv.width = 88;
    cv.height = 88;
    btn.appendChild(cv);
    links.insertBefore(btn, links.firstChild);
    cv.__blinkAt = performance.now() + 2200 + Math.random() * 2600;
    cv.__blink = 0;

    btn.addEventListener("click", function () {
      btn.classList.remove("is-spin");
      void btn.offsetWidth; // restart the animation
      btn.classList.add("is-spin");
      sfx("flip");
      cycleMascotVariant(1);
      // mid-tour the script owns the bubble — recolor silently
      if (!guide.running && !state.chatOpen && Math.random() < 0.7) {
        say(NAV_PET_QUIPS[Math.floor(Math.random() * NAV_PET_QUIPS.length)], 1400);
      }
    });
  }

  function drawNavPet(t) {
    var cv = document.querySelector(".cs-nav-pet canvas");
    if (!cv) return;
    var ctx2 = cv.getContext("2d");
    ctx2.setTransform(2, 0, 0, 2, 0, 0);
    ctx2.clearRect(0, 0, 44, 44);
    var cx = 22, cy = 23, radius = 13.5;
    // the nav sits on the theme background — always dark ink, never the
    // light-ink mode the big mascot uses over dark sections
    var ink = "14,14,12";
    var dots = mascotDots(state.mascotVariant, cx, cy, radius, t, 1.4);
    for (var i = 0; i < dots.length; i += 1) {
      var d = dots[i];
      ctx2.fillStyle = "rgba(" + (d.color || ink) + "," + d.alpha.toFixed(3) + ")";
      if (d.square) ctx2.fillRect(d.gx - d.r, d.gy - d.r, d.r * 2, d.r * 2);
      else { ctx2.beginPath(); ctx2.arc(d.gx, d.gy, d.r, 0, Math.PI * 2); ctx2.fill(); }
    }
    drawZeeShell(ctx2, cx, cy, radius, t, { compact: true });
    // tiny eyes: follow the big mascot, blink on their own clock
    var now = performance.now();
    if (now > cv.__blinkAt) { cv.__blink = 1; cv.__blinkAt = now + 2400 + Math.random() * 3200; }
    if (cv.__blink > 0) cv.__blink = Math.max(0, cv.__blink - 0.14);
    var big = mascotCenter();
    if (!cv.__cx || state.tick % 120 === 0) {
      var rect = cv.getBoundingClientRect();
      cv.__cx = rect.left + 22;
      cv.__cy = rect.top + 22;
    }
    var dx = big.x - cv.__cx, dy = big.y - cv.__cy;
    var dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var lx = (dx / dist) * 1.6, ly = (dy / dist) * 1.6;
    var eyeR = 2.3;
    var eyeH = Math.max(0.6, eyeR * (1 - cv.__blink * 0.9));
    [-1, 1].forEach(function (side) {
      var ex = cx + side * 3.8 + lx * 0.35;
      var ey = cy - 4.8 + ly * 0.35;
      ctx2.fillStyle = "#fdfbf2";
      ctx2.beginPath(); ctx2.ellipse(ex, ey, eyeR * 1.08, eyeH, 0, 0, Math.PI * 2); ctx2.fill();
      if (eyeH > eyeR * 0.3) {
        ctx2.fillStyle = INK_DARK;
        ctx2.beginPath(); ctx2.arc(ex + lx * 0.5, ey + ly * 0.5, 1.05, 0, Math.PI * 2); ctx2.fill();
      }
    });
    drawZeeMouth(ctx2, cx, cy, radius);
    drawZeeCore(ctx2, cx, cy, radius, t);
  }

  function initDeckPlay(deck) {
    // top card leans toward the cursor; deck slowly self-browses when idle
    deck.style.perspective = "700px";
    deck.addEventListener("pointermove", function (e) {
      if (guide.running || e.pointerType !== "mouse") return;
      var top = deck.lastElementChild;
      if (!top || !top.__base) return;
      var r = deck.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      top.style.transition = "transform .18s cubic-bezier(.16,1,.3,1)";
      top.style.transform = top.__base + " translateY(-5px) rotateX(" + (-ny * 7).toFixed(2) + "deg) rotateY(" + (nx * 7).toFixed(2) + "deg)";
      state.deckHover = true;
      state.deckUserAt = performance.now();
    });
    deck.addEventListener("pointerleave", function () {
      state.deckHover = false;
      var top = deck.lastElementChild;
      if (top && top.__base) {
        top.style.transition = "transform .45s cubic-bezier(.34,1.56,.64,1)";
        top.style.transform = top.__base;
      }
    });
    window.setInterval(function () {
      if (guide.running || state.deckHover || document.hidden) return;
      if (performance.now() - (state.deckUserAt || 0) < 6000) return;
      var r = deck.getBoundingClientRect();
      if (r.top > window.innerHeight - 120 || r.bottom < 120) return;
      cycleDeck();
    }, 3800);
  }

  function initStatementScan() {
    var stmt = document.querySelector('[data-screen-label="Statement"]');
    if (!stmt || PREFERS_REDUCED) return;
    var done = false;
    new IntersectionObserver(function (entries, io) {
      entries.forEach(function (en) {
        if (!en.isIntersecting || done || guide.running) return;
        done = true;
        io.disconnect();
        var heading = stmt.querySelector("p") || stmt;
        window.setTimeout(function () { deepScan(heading, { duration: 1200 }); }, 350);
      });
    }, { threshold: 0.55 }).observe(stmt);
  }

  function initWorkforceDeck() {
    var deck = document.getElementById("cs-worker-deck");
    if (!deck) return;
    decorateWorkerCards(deck);
    layoutDeck();
    deck.addEventListener("click", function () {
      state.deckUserAt = performance.now();
      if (!guide.running) cycleDeck();
    });
    initDeckPlay(deck);
  }

  var WORKER_LINES = {
    original: "Agent plans goals, remembers context, and moves the next action.",
    denso: "Agent can answer tickets, but that is not the headline here.",
    anillos: "Spaces keep project rooms, files, people and decisions together.",
    espiral: "Design turns briefs into visual direction, systems and assets.",
    pixel: "I run every test. EVERY test.",
    nube: "I read everything. I judge fairly. Mostly.",
    orbital: "Minutes turns meetings into decisions, tasks and follow-up.",
    erizo: "I'm the guardrails. Professionally paranoid.",
  };

  async function beatWorkforce() {
    var sec = document.getElementById("cs-workforce");
    var deck = document.getElementById("cs-worker-deck");
    if (!sec) return;
    await scrollToNode(sec, "center");
    state.mode = "work";
    var target = deck || sec;
    if (isMobile()) anchorNode(target, 0.5, 0, 0, -60);
    else anchorNode(target, -0.45, 0.35);
    lookAt(function () { return pointOn(target, 0.5, 0.4); });

    await saySequence([
      { text: "And this is the team. Real roles, no salaries.", hold: 340 },
      { text: "Let me find someone…", hold: 200 },
    ]);

    if (deck) {
      var cards = deckCards();
      var mine = null;
      for (var i = 0; i < cards.length; i += 1) {
        if (cards[i].dataset.worker === state.mascotVariant) mine = cards[i];
      }
      if (mine) {
        // park my card 6th from the top so five flips tour the team
        deck.insertBefore(mine, deck.children[Math.max(0, deck.children.length - 6)]);
        layoutDeck();
        await gwait(380);
        var flips = ["No…", "Nope…", "Too corporate…", "Too fluffy…", "Close… no."];
        for (var f = 0; f < 5; f += 1) {
          say(flips[f], 640);
          cycleDeck();
          chomp(0.4);
          await gwait(620);
        }
        await gwait(350);
        var r = mine.getBoundingClientRect();
        say("THERE. That's me.", 1500);
        chomp(1);
        fadeOutNode(stamp(r.left + r.width * 0.72, r.top + r.height * 0.24, "hired", "light"), 3000);
        await gwait(1550);
        var line = WORKER_LINES[state.mascotVariant] || WORKER_LINES.original;
        say(line);
        await gwait(sayMs(line) + 260, true);
      }
    }
    releaseAnchor();
    lookAt(null);
  }

  /* --- 4 · Method / phases -------------------------------------------- */

  async function beatMethod() {
    var panels = Array.prototype.slice.call(document.querySelectorAll("[data-stack]"));
    if (!panels.length) return;

    var lines = [
      { say: "Run your day without losing the thread.", stamp: "guided" },
      { say: "Spaces keep context alive between people and projects.", stamp: "context" },
      { say: "Meetings and ideas turn into next actions.", stamp: "output" },
    ];

    say("Three ways ZAKI powers a digital life. I'll show you.");
    await gwait(1200);

    for (var i = 0; i < panels.length; i += 1) {
      var panel = panels[i];
      // the mascot hauls the page up by hand — stalls, strains, yanks
      if (isMobile()) anchorPoint(window.innerWidth * 0.8, window.innerHeight * 0.18);
      else anchorPoint(window.innerWidth * 0.68, window.innerHeight * 0.32);
      lookAt(function () { return pointOn(panel, 0.5, 0.1); });
      if (i === 0) say("Hup.", 900);
      await draggedScrollTo(panel, "center", true);
      state.mode = "method";

      var rect = panel.getBoundingClientRect();
      if (isMobile()) anchorNode(panel, 0.82, 0.08);
      else anchorNode(panel, 0.56, 0.14);
      lookAt(function () { return pointOn(panel, 0.7, 0.4); });
      setMood(i === 1 ? "scan" : "build", 1400);

      var item = lines[Math.min(i, lines.length - 1)];
      say(item.say);
      if (i % 2 === 0) scanBeam(panel, 1000);
      await gwait(sayMs(item.say) * 0.62, true);

      var stampPoint = clampToViewport({ x: rect.left + rect.width * 0.86, y: rect.top + rect.height * 0.3 }, 60);
      var node = stamp(stampPoint.x, stampPoint.y, item.stamp, "light");
      fadeOutNode(node, 2400);
      await gwait(420);
    }

    await saySequence([
      { text: "One brain. Several doors.", hold: 180 },
      { text: "Agent first. Spaces, Minutes and Design around it.", hold: 180 },
    ]);
    releaseAnchor();
    lookAt(null);
  }

  /* --- 5 · One brain, many jobs ---------------------------------------- */

  async function beatShip() {
    var ship = findShipBlock();
    if (!ship) return;
    await scrollToNode(ship, "center");
    state.mode = "method";
    // Stand on the left, spit RIGHT into the constellation zone — a
    // horizontal stream reads as "handing the dots over", not drooling.
    // (phones: the copy fills the left — stand above it instead)
    if (isMobile()) anchorNode(ship, 0.8, 0.06);
    else anchorNode(ship, 0.1, 0.32);
    lookAt(function () { return pointOn(ship, 0.72, 0.38); });

    await saySequence([
      { text: "Remember the dots I borrowed?", hold: 420 },
      { text: "They graduated.", hold: 260 },
    ]);

    setMood("eat", 2200);
    var target = pointOn(ship, 0.72, 0.38);
    dotStream(mascotCenter(), target, 130, { toSpread: Math.min(420, ship.getBoundingClientRect().width * 0.5), light: true, delaySpread: 620 });
    await gwait(650);
    revealShipParticles();
    await gwait(1500);

    say("ZAKI belongs in daily loops, not pitch decks.");
    await gwait(sayMs("ZAKI belongs in daily loops, not pitch decks.") + 240, true);
    releaseAnchor();
    lookAt(null);
  }

  /* --- 6 · Current work ------------------------------------------------- */

  function triggerHover(row, on) {
    row.dispatchEvent(new Event(on ? "mouseenter" : "mouseleave"));
    row.dispatchEvent(new MouseEvent(on ? "mouseover" : "mouseout", { bubbles: true }));
  }

  async function beatProjects() {
    var rows = Array.prototype.slice.call(document.querySelectorAll("[data-show]"));
    if (!rows.length) return;
    await scrollToNode(rows[0].closest("section") || rows[0], "start");
    state.mode = "work";
    say("Current work. Four products with clear context boundaries.");
    await gwait(1100);

    var quips = [
      "Agent: goals, memory, action.",
      "Spaces: context that stays put.",
      "Minutes: meetings become follow-up.",
      "Design: ideas become direction.",
    ];

    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      anchorNode(row, 0.88, 0, 0, -52);
      lookAt(function () { return pointOn(row, 0.3, 0.5); });
      setMood("scan", 2100);
      triggerHover(row, true);
      scanBeam(row, 1500);
      var quip = quips[i] || "Next.";
      say(quip);
      await gwait(Math.max(1650, sayMs(quip) + 280));
      triggerHover(row, false);
    }
    say("Same ZAKI. Different jobs.");
    await gwait(sayMs("Same ZAKI. Different jobs.") + 160, true);
    releaseAnchor();
    lookAt(null);
  }

  /* --- 7 · Toolkit (star scene) ----------------------------------------- */

  async function beatToolkit() {
    var box = physicsBox();
    if (!box) return;
    await scrollToNode(box, "center");
    state.mode = "toolkit";

    anchorNode(box, 0.16, 0.2);
    lookAt(function () { return pointOn(box, 0.5, 0.6); });
    await saySequence([
      { text: "The toolkit — all of it runs in production. Watch.", hold: 260 },
    ]);

    var stack = [
      { patterns: [/ai agents/i, /agent/i], line: "Core agent." },
      { patterns: [/rag/i, /memory/i], line: "Memory layer." },
      { patterns: [/guardrail/i, /eval/i], line: "Guardrails on top." },
    ];

    var slotXs = [0.35, 0.5, 0.65];
    var used = [];

    for (var i = 0; i < stack.length; i += 1) {
      var pill = pillByText(stack[i].patterns);
      if (!pill || used.indexOf(pill) !== -1) continue;
      used.push(pill);

      var boxRect = box.getBoundingClientRect();
      var pillRect = pill.getBoundingClientRect();
      var slot = {
        x: boxRect.width * slotXs[i],
        y: boxRect.height - pillRect.height / 2 - 12,
      };

      // mascot rides along with the pill it is carrying
      anchorNode(pill, 0.5, 0.5, 0, -70);
      lookAt(pillCenter.bind(null, pill));
      setMood("grab", 1700);
      say(stack[i].line);
      var stopTether = tetherTo(pillCenter.bind(null, pill), 1600);

      var carried = await carryBody(pill, slot, 1050);
      if (!carried) await gwait(550); // keep the beat's rhythm without physics
      stopTether();
      glowPill(pill);
      var settled = pillCenter(pill);
      createImpact(settled.x, settled.y, "locked");
      await gwait(420);
    }

    // Clear the shelf: anything crowding the stack row gets launched.
    // Real bodies — they bounce off the walls and keep living in the box.
    setMood("smash", 1600);
    var latestRect = box.getBoundingClientRect();
    var rest = Array.prototype.slice.call(box.querySelectorAll("[data-pill]")).filter(function (pill) {
      return used.indexOf(pill) === -1;
    });
    // pills sitting on the stack row first, then a couple extra for the show
    rest.sort(function (a, b) {
      return pillCenter(b).y - pillCenter(a).y;
    });
    var flingCount = Math.min(4, rest.length);
    for (var f = 0; f < flingCount; f += 1) {
      var flung = rest[f];
      var center = pillCenter(flung);
      var direction = center.x < latestRect.left + latestRect.width / 2 ? -1 : 1;
      lookAt(pillCenter.bind(null, flung));
      if (flingBody(flung, { x: direction * (8 + Math.random() * 6), y: -(12 + Math.random() * 5) })) {
        if (f === 0) createImpact(center.x, center.y, "yeet");
      }
      await gwait(220);
    }
    await gwait(700);

    anchorNode(box, 0.5, 0.24);
    lookAt(function () { return pointOn(box, 0.5, 0.8); });
    say("Now it looks like a system.");
    await gwait(sayMs("Now it looks like a system.") + 300, true);
    releaseAnchor();
    lookAt(null);
  }

  /* --- 8 · FAQ ------------------------------------------------------------ */

  async function beatFaq() {
    var faq = document.getElementById("faq") || sectionFrom(document.querySelector("[data-faq]"));
    var items = faqItems();
    if (!faq || !items.length) return;
    await scrollToNode(faq, "center");
    state.mode = "faq";

    var first = items[0];
    anchorNode(first, 0.94, 0, 0, -50);
    lookAt(function () { return pointOn(first, 0.3, 0.5); });
    await saySequence([
      { text: "FAQ detected.", hold: 300 },
      { text: "Objections. My favorite snack.", hold: 280 },
    ]);

    // Smash the whole stack, one by one, fast and loud.
    setMood("smash", items.length * 700 + 800);
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      anchorNode(item, 0.92, 0, 0, -48);
      lookAt(pointOn.bind(null, item, 0.4, 0.5)());
      wreckFaq(item);
      chomp(0.9);
      screenShake(0.35, 240);
      await gwait(440);
    }

    await gwait(500);
    say("All answered. Start free, grow when ready.");
    await gwait(sayMs("All answered. Start free, grow when ready.") + 300, true);
    // sweep the debris before moving on — the layers are fixed-position
    // and would ride the viewport into the next section
    Array.prototype.forEach.call(document.querySelectorAll(".cs-faq-shard-layer"), function (layer) {
      layer.dataset.stop = "1";
      layer.style.transition = "opacity .6s ease";
      layer.style.opacity = "0";
      window.setTimeout(function () { layer.remove(); }, 650);
    });
    await gwait(650);
    releaseAnchor();
    lookAt(null);
  }

  /* --- 9 · Contact ---------------------------------------------------------- */

  async function beatContact() {
    var contact = document.getElementById("contact");
    var button = findContactButton();
    await scrollToNode(contact || button, "center");
    state.mode = "contact";

    if (button) anchorNode(button, 1, 0.5, 92, -34);
    else if (contact) anchorNode(contact, 0.3, 0.6);
    lookAt(button ? function () { return pointOn(button, 0.5, 0.5); } : null);

    await saySequence([
      { text: "Enough theatre.", hold: 420 },
      { text: "Tell us one loop you want ZAKI to help run.", hold: 420 },
      { text: "Agent, Spaces, Minutes or Design.", hold: 300 },
      { text: "Start free. Upgrade when you need more capacity.", hold: 340 },
    ]);

    if (button) {
      await armContactButton(button);
      var rect = button.getBoundingClientRect();
      dotStream(mascotCenter(), { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, 46, {
        toSpread: rect.width * 1.3,
        light: false,
      });
      await gwait(900);
    }

    // Finale: the borrowed dots go out with a bang.
    var head = (contact && contact.querySelector("h2, h1")) || contact || button;
    if (head) {
      var hr = head.getBoundingClientRect();
      say("And one more thing.");
      await gwait(600);
      // radial finale: five bursts fan in an arc over the headline
      var fc = mascotCenter();
      for (var f = 0; f < 5; f += 1) {
        var ang = (-0.82 + (f / 4) * 1.64); // radians around straight-up
        var dist2 = 260 + Math.random() * 140;
        dotStream(fc, {
          x: clamp(fc.x + Math.sin(ang) * dist2, 40, window.innerWidth - 40),
          y: Math.max(70, fc.y - Math.cos(ang) * dist2),
        }, 20, { toSpread: 120, light: true, delaySpread: 130 });
        chomp(0.35 + f * 0.08);
        await gwait(150);
      }
      createImpact(fc.x, fc.y, "");
      sfx("stamp");
      screenShake(0.55, 320);
      await gwait(650);
    }
    // final line is said by finishGuide → "Your move."
  }

  /* ------------------------------------------------------------------ *
   *  Idle personality (post-tour & manual mode)
   * ------------------------------------------------------------------ */

  var IDLE_QUIPS = [
    "Here when you need me.",
    "One loop at a time.",
    "Keep moving.",
    "Your context stays with you.",
  ];

  function onIdleClick(event) {
    if (guide.running) return;
    if (!state.eyesOpen) return;
    // chat owns clicks on the mascot itself and inside the panel
    if (state.chatOpen) return;
    if (event.target && event.target.closest && (event.target.closest(".cs-ai-mascot") || event.target.closest(".cs-chat"))) return;
    var center = mascotCenter();
    var dx = event.clientX - center.x;
    var dy = event.clientY - center.y;
    if (Math.sqrt(dx * dx + dy * dy) > 210) return;
    var now = performance.now();
    if (now - state.quipAt < 9000) return;
    state.quipAt = now;
    setMood("smash", 420);
    if (chatAllowed() && !state.chatGreeted && Math.random() < 0.5) {
      say("Closer. Click ME — I talk.", 2400);
      return;
    }
    say(IDLE_QUIPS[Math.floor(Math.random() * IDLE_QUIPS.length)], 2100);
  }

  /* ------------------------------------------------------------------ *
   *  Gate
   * ------------------------------------------------------------------ */

  function removeOriginalStamp() {
    // Never select by data-dc-tpl index — template edits shift indexes and
    // this was deleting innocent hero nodes. The badge's circle path id is
    // stable.
    var stampPath = document.getElementById("cs-c33");
    var stampNode = stampPath && stampPath.closest("div[data-plx]");
    if (stampNode) stampNode.remove();
  }

  function openGameSoon() {
    if (window.__csGame && window.__csGame.open) {
      window.__csGame.open({ beat: window.__csGameBeat || null });
      return;
    }
    window.setTimeout(openGameSoon, 50);
  }

  function createChoice() {
    var gate = document.createElement("div");
    gate.className = "cs-guide-gate cs-guide-gate--four";
    var slotsHtml = MASCOT_VARIANTS.map(function (v) {
      var active = v === state.mascotVariant;
      return '<button type="button" class="cs-guide-slot' + (active ? " is-active" : "") + '" data-slot="' + v + '" aria-label="ZAKI ' + (MASCOT_NAMES[v] || v) + ' agent">' +
        '<img class="cs-guide-slot__bot" src="/site/assets/zaki-worker-full.png" alt="" aria-hidden="true">' +
        '<span class="cs-guide-slot__role" aria-hidden="true"></span>' +
        "</button>";
    }).join("");
    gate.innerHTML =
      '<div class="cs-guide-gate__bar">' +
      '<span class="cs-guide-gate__logo">ZAKI</span>' +
      '<span class="cs-guide-gate__live"><button type="button" class="cs-sound-toggle" data-sound-toggle aria-pressed="false">sound: off</button><i></i><em>Live session</em></span>' +
      "</div>" +
      '<div class="cs-guide-choice">' +
      '<p class="cs-guide-choice__eyebrow">( Choose a ZAKI agent )</p>' +
      '<h2 class="cs-guide-choice__title">ZAKI is Awake.</h2>' +
      '<p class="cs-guide-choice__sub">Pick the first agent ZAKI should put to work.</p>' +
      '<div class="cs-guide-stage">' +
      '<div class="cs-guide-face" aria-hidden="true"><img class="cs-guide-face__fallback" src="/site/assets/nova-nuggets-particle-mark.png" alt=""></div>' +
      "</div>" +
      '<p class="cs-guide-stage__name">' + (MASCOT_NAMES[state.mascotVariant] || "") + "</p>" +
      '<p class="cs-guide-choice__tag">' + (MASCOT_TAGS[state.mascotVariant] || "") + "</p>" +
      (window.__csGameBeat ? '<p class="cs-guide-choice__beat"><svg style="width:1.15em;height:1.15em;vertical-align:-.18em;margin-right:.3em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.2 4.3 h7.8 l-.5 6.2 c-.3 3-2 4.6-3.5 4.6 s-3.1-1.7-3.4-4.7 Z"/><path d="M8 6.2 c-2.4-.4-3.6.6-3.3 2.2 .3 1.5 1.7 2.3 3.6 2.1 M16.2 6.1 c2.4-.5 3.6.5 3.4 2.1 -.3 1.6-1.8 2.4-3.7 2.2"/><path d="M12 15.3 v3 M9 21 c1-1.7 5-1.7 6 0"/></svg>' + window.__csGameBeat.by + " scored " + window.__csGameBeat.score + " — beat that</p>" : "") +
      '<div class="cs-guide-dock">' +
      '<button type="button" class="cs-guide-arrow" data-dir="-1" aria-label="Previous agent"><svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M11.5 3.5 6 9l5.5 5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<div class="cs-guide-dock__thumbs">' + slotsHtml + "</div>" +
      '<button type="button" class="cs-guide-arrow" data-dir="1" aria-label="Next agent"><svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6.5 3.5 12 9l-5.5 5.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      '<span class="cs-guide-dock__rule"></span>' +
      '<button type="button" class="cs-guide-dock__go" data-mode="guided"><span>Let <b data-guide-name>' + (MASCOT_NAMES[state.mascotVariant] || "Agent") + '</b> drive</span> <span aria-hidden="true">→</span></button>' +
      "</div>" +
      '<button type="button" class="cs-guide-choice__manual" data-mode="manual">Skip · explore yourself →</button>' +
      '<span class="cs-guide-choice__hint"><span class="cs-copy-full">← / → to switch</span><span class="cs-copy-brief">swipe to switch</span></span>' +
      "</div>";
    state.gate = gate;
    document.documentElement.classList.add("cs-guide-locked");
    document.body.appendChild(gate);
    initGateFace(gate);
    // Each choice is a subagent type; ZAKI remains the primary presence.
    Array.prototype.forEach.call(gate.querySelectorAll(".cs-guide-slot"), function (slot) {
      slot.addEventListener("click", function () {
        setMood("boost", 260);
        setMascotVariant(slot.dataset.slot);
      });
    });
    // mobile: swiping anywhere on the stage switches drivers
    var swipeX = null;
    gate.addEventListener("touchstart", function (e) {
      if (state.guideMode === "unset") swipeX = e.touches[0].clientX;
    }, { passive: true });
    gate.addEventListener("touchend", function (e) {
      if (swipeX == null || state.guideMode !== "unset") { swipeX = null; return; }
      var dx = e.changedTouches[0].clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 42) {
        setMood("boost", 260);
        cycleMascotVariant(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
    refreshGateChoice();
    // staggered entrance (label → picker → title → buttons → hint)
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { gate.classList.add("is-in"); });
    });
    // fresh session always starts at the top — the browser (or a previous
    // AI drive) may have parked the scroll mid-page
    window.scrollTo(0, 0);
    var lx = lenis();
    if (lx && lx.scrollTo) { try { lx.scrollTo(0, { immediate: true, force: true }); } catch (e) {} }
    // the candidates audition with their eyes open
    state.eyesOpen = true;
    state.blinkAt = performance.now() + 2200;
    // gate is up → drop the boot veil that hides the pre-gate flash
    window.setTimeout(function () {
      var veil = document.getElementById("cs-boot-veil");
      if (veil) veil.remove();
    }, 90);

    // sound consent toggle (gate + persists)
    Array.prototype.forEach.call(gate.querySelectorAll("[data-sound-toggle]"), function (b) {
      b.textContent = "sound: " + (sound.enabled ? "on" : "off");
      b.setAttribute("aria-pressed", sound.enabled ? "true" : "false");
      b.addEventListener("click", function () { setSound(!sound.enabled); });
    });

    // character select: side arrows or ← → keys cycle the style live
    Array.prototype.forEach.call(gate.querySelectorAll(".cs-guide-arrow"), function (arrow) {
      arrow.addEventListener("click", function () {
        setMood("boost", 260);
        cycleMascotVariant(parseInt(arrow.dataset.dir, 10));
      });
      // the candidate watches the hand that browses it
      arrow.addEventListener("mouseenter", function () {
        var r = arrow.getBoundingClientRect();
        lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      });
      arrow.addEventListener("mouseleave", function () { lookAt(null); });
    });
    window.addEventListener("keydown", function (e) {
      if (state.guideMode !== "unset" || !state.gate) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        cycleMascotVariant(e.key === "ArrowLeft" ? -1 : 1);
      }
    });

    gate.addEventListener("click", function (event) {
      var gameButton = event.target.closest("button[data-game]");
      if (!gameButton || state.guideMode !== "unset") return;
      state.guideMode = "manual";
      state.guideDone = true;
      state.anchor = null;
      gameButton.classList.add("is-chosen");
      sfx("pop");
      document.documentElement.classList.remove("cs-guide-locked");
      gate.classList.add("is-hidden");
      var veil = document.getElementById("cs-boot-veil");
      if (veil) veil.remove();
      if (window.__csApp && window.__csApp.applyScroll) {
        try { window.__csApp.applyScroll(); } catch (e) {}
      }
      window.setTimeout(function () {
        destroyGateFace(gate);
        gate.remove();
        state.gate = null;
      }, 260);
      openGameSoon();
    });

    function dissolveGate() {
      if (PREFERS_REDUCED) return 0;
      var card = gate.querySelector(".cs-guide-choice");
      var r = (card || gate).getBoundingClientRect();
      var target = mascotCenter();
      if (card) {
        // Every character exits in its own dialect — see the GATE_FX table.
        var fx = GATE_FX[state.mascotVariant] || fxDot;
        return fx(gate, card, r, target);
      }
      dotStream({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, target, 64, {
        fromSpread: Math.max(r.width, r.height) * 0.95,
        toSpread: 26,
        delaySpread: 460,
      });
      window.setTimeout(function () { chomp(1); }, 340);
      return 0;
    }

    gate.addEventListener("click", async function (event) {
      var button = event.target.closest("button[data-mode]");
      if (!button || state.guideMode !== "unset") return;
      state.guideMode = button.dataset.mode;
      // pin SYNCHRONOUSLY — the idle frame must never steal the mascot
      // during the button-arm beat (this await opened a 150ms gap that
      // yanked it toward its idle perch)
      state.anchor = (function (px, py) { return function () { return { x: px, y: py }; }; })(state.pos.x, state.pos.y);
      button.classList.add("is-chosen");
      sfx(state.guideMode === "guided" ? "whoosh" : "pop");
      await idleWait(150);

      if (state.guideMode === "guided") {
        // Wake up ON the orb: open eyes, glance, claim the wheel — fast.
        // (The full ceremony felt heavy; trimmed per user feedback.)
        state.eyesOpen = true;
        state.blinkAt = performance.now() + 4000;
        lookAt({ x: window.innerWidth * 0.2, y: window.innerHeight * 0.3 });
        await idleWait(260);
        lookAt({ x: window.innerWidth * 0.85, y: window.innerHeight * 0.4 });
        await idleWait(280);
        lookAt(null);
        say("I'll drive. I work here, by the way.", 1700);
        await idleWait(900);
      } else {
        state.eyesOpen = true;
      }

      var dissolve = dissolveGate() || 0;
      // Choreography: the backdrop stays solid while the card is inhaled; the
      // page is born only while the ink veil covers everything (hide marks
      // it), and the tour waits for the curtain (guide).
      var hideAt = typeof dissolve === "object" ? dissolve.hide : dissolve;
      var guideAt = typeof dissolve === "object" ? dissolve.guide : hideAt;
      var swallowAt = hideAt ? Math.max(0, hideAt - 190) : 0;
      window.setTimeout(function () { gate.classList.add("is-hidden"); }, hideAt);
      window.setTimeout(function () {
        document.documentElement.classList.remove("cs-guide-locked");
        // the reveal engine only runs on scroll — kick the birth cascade now
        if (window.__csApp && window.__csApp.applyScroll) {
          try { window.__csApp.applyScroll(); } catch (e) {}
        }
        // the hero organism is born with the cascade (desktop; mobile pins
        // its own opacity via !important)
        var heroOrg = document.getElementById("hero-organism");
        if (heroOrg) heroOrg.style.opacity = "1";
      }, swallowAt);
      if (state.guideMode === "manual") state.anchor = null; // idle takes it home
      // challenge links go straight into the arena
      if (window.__csGameBeat && window.__csGame) {
        window.setTimeout(function () { window.__csGame.open({ beat: window.__csGameBeat }); }, 900 + guideAt);
      }
      window.setTimeout(function () {
        destroyGateFace(gate);
        gate.remove();
        state.gate = null;
      }, 640 + hideAt);

      if (state.guideMode === "guided") {
        window.scrollTo(0, 0);
        var api = lenis();
        if (api && api.scrollTo) { try { api.scrollTo(0, { immediate: true, force: true }); } catch (e) {} }
        // let the curtain finish before the tour takes the wheel — but ESC
        // during the exit must still cancel it (runGuide hasn't started, so
        // abortGuide alone would be a no-op)
        var escaped = false;
        var onExitEsc = function (e) { if (e.key === "Escape") escaped = true; };
        window.addEventListener("keydown", onExitEsc, true);
        window.setTimeout(function () {
          window.removeEventListener("keydown", onExitEsc, true);
          if (!escaped) runGuide();
        }, guideAt);
      }
    });

    return gate;
  }

  function gatePoint() {
    var anchor = state.gate && state.gate.querySelector(".cs-guide-choice__orb");
    if (!anchor) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var rect = anchor.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  /* ------------------------------------------------------------------ *
   *  Frame loop
   * ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------ *
   *  Live chat — talk to the site. ⌘K / Ctrl+K or click the mascot.
   *  Static prototype answers; the panel is plain DOM so it works while
   *  rAF-driven things are busy.
   * ------------------------------------------------------------------ */

  var CHAT_PILLS = [
    { id: "services", label: "What is ZAKI?" },
    { id: "projects", label: "Show products" },
    { id: "workforce", label: "What can it do?" },
    { id: "pricing", label: "Pricing" },
    { id: "human", label: "Who builds it?" },
    { id: "quote", label: "Start with ZAKI" },
  ];

  /* Local chat brain — deterministic answers computed in the page.
     No backend: the whole front deploys as static files. */
  var CHAT_PHASES = [
    { name: "Bring context", weeks: "step 1", span: 1 },
    { name: "Build memory", weeks: "step 2", span: 1 },
    { name: "Run loops", weeks: "step 3", span: 1.5 },
    { name: "Grow capacity", weeks: "ongoing", span: 1 },
  ];

  var CHAT_BRAIN = {
    services: {
      related: ["projects", "workforce", "quote"],
      variants: [
        "ZAKI is the product family for your digital life. **Agent** and **Spaces** are available now; **Minutes** and **Design** are coming next. Agent runs goals with your personal Brain, while Spaces keeps project context in a separate scoped store. [[go:process]]",
        "Think of ZAKI as a family with clear boundaries: Agent for visible action and personal memory, Spaces for scoped project context, with Minutes and Design coming next. [[go:process]]",
      ],
    },
    pricing: {
      related: ["quote", "human"],
      variants: [
        "The public plans are **Free**, **Personal at $15**, **Pro at $45**, and **Pro MAX at $99 USD per month**. Paid plans increase the shared allowance; the app confirms live checkout availability and exact limits.",
        "Start free. Upgrade when you need a larger shared weekly and burst allowance. The app shows the current terms before payment.",
      ],
    },
    speed: {
      related: ["services", "projects"],
      visual: function () {
        return { kind: "timeline", payload: {
          title: "Context → memory → action",
          note: "ZAKI gets more useful as it learns your patterns",
          rows: CHAT_PHASES,
        } };
      },
      variants: [
        "ZAKI starts useful and gets more personal as it learns: first context, then memory, then repeatable loops it can help run.",
        "The growth path is simple: bring context, let the brain remember what matters, then hand off more loops when trust is earned.",
      ],
    },
    projects: {
      related: ["services", "quote"],
      visual: function () {
        return { kind: "projects", payload: { items: [
          { name: "Agent", metric: "goals · memory · action", kind: "agent", url: "/products/agent" },
          { name: "Spaces", metric: "projects · files · context", kind: "spaces", url: "/products/spaces" },
          { name: "Minutes", metric: "meetings · decisions · tasks", kind: "minutes", url: "/products/minutes" },
          { name: "Design", metric: "briefs · systems · assets", kind: "design", url: "/products/design" },
        ] } };
      },
      variants: [
        "The current family is **Agent**, **Spaces**, **Minutes** and **Design**. Agent and Spaces are available now; Minutes and Design are coming next. Agent uses the personal Brain, while Spaces has a separate project-scoped store. [[go:cases]]",
        "Four products, clear availability: Agent and Spaces now, Minutes and Design next. Click Current work to inspect each product page. [[go:cases]]",
      ],
    },
    workforce: {
      related: ["projects", "quote"],
      visual: function () {
        return { kind: "roi", payload: {
          title: "A role ZAKI can take on",
          bars: [
            { label: "Manual follow-up", value: 100, display: "scattered" },
            { label: "ZAKI loop", value: 22, display: "tracked" },
          ],
          badge: "less drift",
          note: "Illustrative shape: the real value is continuity across repeated digital work.",
        } };
      },
      variants: [
        "The 'next hire' idea stays because it is useful: ZAKI can take on roles in your digital life — research, follow-up, meeting capture, support, documents, QA and the quiet work between decisions.",
        "A digital worker is not a person replacement. It is a loop ZAKI can run: remember the context, do the next useful step, and bring you back when judgment is needed.",
      ],
    },
    human: {
      related: ["quote"],
      variants: [
        "ZAKI is built by **Nova Nuggets**. Public product name: ZAKI. Company behind it: Nova Nuggets.",
        "Nova Nuggets builds the ZAKI product family: Agent, Spaces, Minutes and Design.",
      ],
    },
  };

  // Legacy chat visual support kept for the prototype; public pricing is USD subscriptions.
  var ESTIMATE_TABLE = {
    free: { name: "Free", min: 0, max: 0, weeks: "start now" },
    starter: { name: "$15 plan", min: 15, max: 15, weeks: "monthly" },
    pro: { name: "$45 plan", min: 45, max: 45, weeks: "monthly" },
    max: { name: "$99 plan", min: 99, max: 99, weeks: "monthly" },
    notsure: { name: "Help me choose", min: 0, max: 99, weeks: "guided" },
  };
  var SIZE_FACTOR = {
    light: { f: 1, label: "light daily use" },
    standard: { f: 1, label: "regular digital work" },
    heavy: { f: 1, label: "deep automation and memory" },
  };
  var WHEN_COPY = {
    now: { label: "now", line: "Start free and let ZAKI learn one useful loop." },
    soon: { label: "soon", line: "Pick a paid tier when capacity or memory depth matters." },
    exploring: { label: "exploring", line: "No pressure — the free plan is the right starting point." },
  };

  function chatAnswer(payload) {
    if (payload.pill === "estimate") {
      var base = ESTIMATE_TABLE[payload.svc];
      var sizeF = SIZE_FACTOR[payload.size];
      var whenC = WHEN_COPY[payload.when];
      if (!base || !sizeF || !whenC) return null;
      var min = Math.round(base.min * sizeF.f);
      var max = Math.round(base.max * sizeF.f);
      var fmt = function (n) { return n === 0 ? "Free" : "$" + n + "/mo"; };
      var brief = "Plan interest: " + base.name + "\nUse: " + sizeF.label + "\nTimeline: " + whenC.label +
        "\nSuggested range: " + fmt(min) + "–" + fmt(max) + ", " + base.weeks;
      return {
        text: "There it is — a starting point, not a maze. " + whenC.line +
          " Send the brief and ZAKI support can point you to the cleanest first loop.",
        related: ["human"],
        visual: { kind: "estimate", payload: {
          service: base.name,
          range: fmt(min) + "–" + fmt(max),
          weeks: base.weeks,
          scope: sizeF.label,
          when: whenC.label,
          phases: CHAT_PHASES.slice(0, 4),
          disclaimer: "Public tiers are Free, $15, $45 and $99 USD. The app confirms live availability and exact limits.",
          mailto: "mailto:support@chatzaki.com?subject=" +
            encodeURIComponent("ZAKI plan help — " + base.name) +
            "&body=" + encodeURIComponent(brief + "\n\nMy ZAKI loop:\n"),
        } },
      };
    }
    var def = CHAT_BRAIN[payload.pill];
    if (!def) return null;
    return {
      text: def.variants[Math.floor(Math.random() * def.variants.length)],
      related: def.related,
      visual: def.visual ? def.visual() : null,
    };
  }

  var QUOTE_STEPS = [
    { key: "svc", prompt: "Good. Where should ZAKI start?", options: [
      { v: "free", label: "Free" },
      { v: "starter", label: "$15 plan" },
      { v: "pro", label: "$45 plan" },
      { v: "max", label: "$99 plan" },
      { v: "notsure", label: "Not sure yet" },
    ] },
    { key: "size", prompt: "How will you use it?", options: [
      { v: "light", label: "Light daily use" },
      { v: "standard", label: "Regular digital work" },
      { v: "heavy", label: "Deep automation" },
    ] },
    { key: "when", prompt: "When do you want to begin?", options: [
      { v: "now", label: "Now" },
      { v: "soon", label: "Soon" },
      { v: "exploring", label: "Just exploring" },
    ] },
  ];

  function chatAllowed() {
    return state.guideMode === "manual" || state.guideDone;
  }

  function chatPanel() {
    return document.querySelector(".cs-chat");
  }

  function buildChatPanel() {
    var panel = chatPanel();
    if (panel) return panel;
    var veil = document.createElement("div");
    veil.className = "cs-chat-veil";
    veil.addEventListener("click", closeChat);
    document.body.appendChild(veil);
    panel = document.createElement("div");
    panel.className = "cs-chat";
    panel.innerHTML =
      '<div class="cs-chat__head">' +
      '<span class="cs-chat__dot"></span>' +
      '<span class="cs-chat__title">ZAKI — live session</span>' +
      '<button type="button" class="cs-chat__close" aria-label="Close chat">×</button>' +
      "</div>" +
      '<div class="cs-chat__log" role="log" aria-live="polite" data-lenis-prevent></div>' +
      '<div class="cs-chat__pills" role="group" aria-label="Quick questions"></div>';
    document.body.appendChild(panel);

    renderBasePills();

    panel.querySelector(".cs-chat__close").addEventListener("click", closeChat);
    // keep the site's global key handlers away from the input
    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeChat(); return; }
      e.stopPropagation();
    });
    return panel;
  }

  // Minimal safe markdown: escape HTML, then **bold**, bullet lines, breaks.
  function chatMd(text) {
    var safe = String(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    safe = safe.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/^[-•]\s+(.*)$/gm, '<span class="cs-chat__li">$1</span>');
    safe = safe.replace(/(?:https:\/\/)?((?:github|kidpofy|vidix|phopet)\.[a-z]+(?:\.[a-z]+)?\/?[\w\-./]*)/gi, function (m0, host) {
      return '<a href="https://' + host + '" target="_blank" rel="noreferrer">' + m0 + "</a>";
    });
    return safe.replace(/\n/g, "<br>");
  }

  function chatBubble(role, text) {
    var log = chatPanel().querySelector(".cs-chat__log");
    var b = document.createElement("div");
    b.className = "cs-chat__msg cs-chat__msg--" + role;
    if (role === "site") b.innerHTML = chatMd(text);
    else b.textContent = text;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function openChat() {
    if (state.chatOpen || !chatAllowed()) return;
    var panel = buildChatPanel();
    state.chatOpen = true;
    sfx("pop");
    panel.classList.add("is-open");
    var veil = document.querySelector(".cs-chat-veil");
    if (veil) veil.classList.add("is-open");
    if (!state.chatGreeted) {
      state.chatGreeted = true;
      chatBubble("site", "Oh — you found the talk button. I'm the site. Pick a question below; I answer fast.");
    }
    window.setTimeout(function () {
      var first = panel.querySelector(".cs-chat__pill");
      if (first) first.focus();
    }, 60);
    say("Finally. Someone talks to ME.", 1600);
    if (!state.anchor) {
      state.chatAnchored = true;
      state.anchor = function () {
        var rect = panel.getBoundingClientRect();
        return { x: rect.left + 10, y: Math.max(70, rect.top - 40) };
      };
    }
  }

  function closeChat() {
    if (!state.chatOpen) return;
    state.chatOpen = false;
    sfx("flip");
    var panel = chatPanel();
    if (panel) panel.classList.remove("is-open");
    var veil = document.querySelector(".cs-chat-veil");
    if (veil) veil.classList.remove("is-open");
    if (state.chatAbort) { state.chatAbort.abort(); state.chatAbort = null; }
    state.chatBusy = false;
    if (state.chatAnchored) { state.chatAnchored = false; state.anchor = null; }
  }

  function renderPills(items) {
    var wrap = chatPanel() && chatPanel().querySelector(".cs-chat__pills");
    if (!wrap) return;
    wrap.innerHTML = "";
    items.forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cs-chat__pill" + (item.ghost ? " cs-chat__pill--ghost" : "");
      b.textContent = item.label;
      b.addEventListener("click", function () {
        if (state.chatBusy) return;
        item.pick();
      });
      wrap.appendChild(b);
    });
  }

  function renderBasePills() {
    renderPills(CHAT_PILLS.map(function (item) {
      return { label: item.label, pick: function () {
        if (item.id === "quote") startQuoteFlow();
        else sendChat({ pill: item.id }, item.label);
      } };
    }));
  }

  function renderRelatedPills(ids) {
    var items = [];
    (ids || []).forEach(function (id) {
      for (var i = 0; i < CHAT_PILLS.length; i += 1) {
        if (CHAT_PILLS[i].id === id) {
          (function (item) {
            items.push({ label: item.label, pick: function () {
              if (item.id === "quote") startQuoteFlow();
              else sendChat({ pill: item.id }, item.label);
            } });
          })(CHAT_PILLS[i]);
          break;
        }
      }
    });
    items.push({ label: "← All questions", ghost: true, pick: renderBasePills });
    renderPills(items);
  }

  /* Plan helper — pure client-side tree; only the final step hits the API,
     and it sends three whitelisted enums. */
  function startQuoteFlow() {
    if (state.chatBusy) return;
    chatBubble("user", "Start with ZAKI");
    sfx("pop");
    chatBubble("site", "Start free, or tell ZAKI support where you want to begin: Agent, Spaces, Minutes or Design. The cleanest first step is one real loop from your digital life. [[email]]");
    renderRelatedPills(["services", "projects", "pricing"]);
  }

  function wizardStep() {
    var flow = state.chatFlow;
    if (!flow) return;
    var step = QUOTE_STEPS[flow.step];
    chatBubble("site", step.prompt);
    renderPills(step.options.map(function (opt) {
      return { label: opt.label, pick: function () {
        chatBubble("user", opt.label);
        flow.answers[step.key] = opt.v;
        flow.step += 1;
        if (flow.step < QUOTE_STEPS.length) {
          wizardStep();
        } else {
          var a = flow.answers;
          state.chatFlow = null;
          sendChat({ pill: "estimate", svc: a.svc, size: a.size, when: a.when }, null);
        }
      } };
    }));
  }

  /* Visual cards — payloads computed server-side, rendered natively. */
  function cardShell(kind) {
    var d = document.createElement("div");
    d.className = "cs-chat__card cs-chat__card--" + kind;
    return d;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function renderCard(kind, data) {
    var card = cardShell(kind);
    if (kind === "timeline") {
      var maxSpan = 0;
      data.rows.forEach(function (r) { maxSpan = Math.max(maxSpan, r.span); });
      card.innerHTML = '<div class="cs-chat__card-title">' + esc(data.title) + "</div>" +
        data.rows.map(function (r, i) {
          return '<div class="cs-chat__tl-row"><span class="cs-chat__tl-name">' + esc(r.name) +
            '</span><span class="cs-chat__tl-bar"><i style="transition-delay:' + (120 + i * 110) + 'ms;--w:' +
            Math.round((r.span / maxSpan) * 100) + '%"></i></span><span class="cs-chat__tl-wk">' + esc(r.weeks) + "</span></div>";
        }).join("") +
        '<div class="cs-chat__card-note">' + esc(data.note) + "</div>";
    } else if (kind === "roi") {
      var maxV = 0;
      data.bars.forEach(function (b) { maxV = Math.max(maxV, b.value); });
      card.innerHTML = '<div class="cs-chat__card-title">' + esc(data.title) +
        ' <span class="cs-chat__card-badge">' + esc(data.badge) + "</span></div>" +
        data.bars.map(function (b, i) {
          return '<div class="cs-chat__roi-row"><span class="cs-chat__roi-label">' + esc(b.label) +
            '</span><span class="cs-chat__roi-bar' + (i === data.bars.length - 1 ? " is-good" : "") +
            '"><i style="transition-delay:' + (150 + i * 200) + "ms;--w:" +
            Math.max(6, Math.round((b.value / maxV) * 100)) + '%"></i></span><span class="cs-chat__roi-val">' + esc(b.display) + "</span></div>";
        }).join("") +
        '<div class="cs-chat__card-note">' + esc(data.note) + "</div>";
    } else if (kind === "projects") {
      card.innerHTML = '<div class="cs-chat__proj-grid">' +
        data.items.map(function (it) {
          return '<a class="cs-chat__proj" href="' + esc(it.url) + '" target="_blank" rel="noreferrer">' +
            '<span class="cs-chat__proj-visual cs-chat__proj-visual--' + esc(it.kind || "agent") + '">' + esc(it.name) + '</span>' +
            '<span class="cs-chat__proj-name">' + esc(it.name) + '</span>' +
            '<span class="cs-chat__proj-metric">' + esc(it.metric) + "</span></a>";
        }).join("") + "</div>";
    } else if (kind === "estimate") {
      card.innerHTML = '<div class="cs-chat__card-title">' + esc(data.service) + "</div>" +
        '<div class="cs-chat__est-range">' + esc(data.range) + "</div>" +
        '<div class="cs-chat__est-meta"><span>' + esc(data.weeks) + "</span><span>" + esc(data.scope) + "</span><span>" + esc(data.when) + "</span></div>" +
        '<div class="cs-chat__est-phases">' +
        data.phases.map(function (ph, i) {
          return '<i style="flex:' + ph.span + ";transition-delay:" + (150 + i * 120) + 'ms" title="' + esc(ph.name) + '"></i>';
        }).join("") + "</div>" +
        '<div class="cs-chat__card-note">' + esc(data.disclaimer) + "</div>" +
        '<a class="cs-chat__est-cta" href="' + esc(data.mailto) + '">Send this brief →</a>';
    }
    return card;
  }

  function typeOut(el, fullText, log, done) {
    // local typewriter — rAF-paced (~110 chars/s of real time)
    var clean = stripChatActions(fullText);
    var t0 = performance.now();
    (function tick(now) {
      var i = Math.min(clean.length, Math.round(((now || performance.now()) - t0) * 0.11));
      el.innerHTML = chatMd(clean.slice(0, i));
      log.scrollTop = log.scrollHeight;
      if (i < clean.length && el.isConnected) window.requestAnimationFrame(tick);
      else if (done) done();
    })(t0);
  }

  async function sendChat(payload, displayLabel) {
    var panel = chatPanel();
    if (displayLabel) chatBubble("user", displayLabel);
    state.chatBusy = true;
    panel.classList.add("is-busy");
    setMood("boost", 6000);
    var live = chatBubble("site", "");
    live.innerHTML = '<span class="cs-chat__typing"><i></i><i></i><i></i></span>';
    var log = panel.querySelector(".cs-chat__log");
    try {
      // local, deterministic — a beat of "thinking" keeps the rhythm
      await new Promise(function (r) { window.setTimeout(r, 350 + Math.random() * 350); });
      var data = chatAnswer(payload);
      if (!data) {
        live.textContent = "I don't know that one. Try a pill below.";
        return;
      }
      if (data.visual && data.visual.kind) {
        var card = renderCard(data.visual.kind, data.visual.payload);
        log.insertBefore(card, live);
        window.setTimeout(function () { card.classList.add("is-in"); }, 40);
        chomp(0.5);
        log.scrollTop = log.scrollHeight;
      }
      var text = data.text || "Done.";
      typeOut(live, text, log, function () {
        runChatAction(text);
      });
      if (data.related) renderRelatedPills(data.related);
    } catch (err) {
      live.textContent = "Hiccup on my side. Try another question — or support@chatzaki.com";
    } finally {
      state.chatBusy = false;
      if (panel) panel.classList.remove("is-busy");
      setMood("idle");
    }
  }

  // The agent can drive the page: replies may end with one [[action]] tag.
  var CHAT_GO_TARGETS = {
    work: function () { return document.getElementById("work"); },
    process: function () { return document.getElementById("cs-phases"); },
    promise: function () { return document.querySelector('[data-screen-label="Statement"]'); },
    cases: function () { return document.querySelector('[data-screen-label="Current work"]'); },
    toolkit: function () { return document.querySelector('[data-screen-label="Toolkit"]'); },
    faq: function () { return document.getElementById("faq"); },
    contact: function () { return document.getElementById("contact"); },
  };

  function stripChatActions(text) {
    // hide complete tags and any partial tag still streaming at the tail
    return text.replace(/\[\[[a-z:]*\]?\]?\s*$/i, "").replace(/\[\[(?:go:[a-z]+|email)\]\]/gi, "").trimEnd();
  }

  function runChatAction(text) {
    var m = /\[\[(go:([a-z]+)|email)\]\]/i.exec(text);
    if (!m) return;
    if (m[2]) {
      var getNode = CHAT_GO_TARGETS[m[2].toLowerCase()];
      var node = getNode && getNode();
      if (!node) return;
      setMood("boost", 1400);
      window.setTimeout(function () {
        scrollToNode(node, "center").then(function () { say("There.", 1400); });
      }, 350);
    } else {
      window.setTimeout(function () {
        window.location.href = "mailto:support@chatzaki.com?subject=" +
          encodeURIComponent("Project inquiry — sent by your living website");
      }, 500);
    }
  }

  function initChat() {
    window.addEventListener("keydown", function (e) {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === "k") {
        if (!chatAllowed()) return;
        e.preventDefault();
        if (state.chatOpen) closeChat();
        else openChat();
      } else if (e.key === "Escape" && state.chatOpen) {
        closeChat();
      }
    });
    var mascot = mascotEl();
    if (mascot) {
      mascot.addEventListener("click", function () {
        if (chatAllowed() && !state.chatOpen) openChat();
      });
    }

    // "Start with ZAKI" CTAs start a plan conversation with the agent
  }

  function start() {
    ensureStyleLink();
    removeOriginalStamp();
    window.setTimeout(removeOriginalStamp, 800);
    if (window.__csGameOnly) {
      // /play — standalone arena: theme + bridge + game, nothing else
      applyMascotTheme(state.mascotVariant);
      window.__csGameBridge = {
        dots: mascotDots,
        sfx: sfx,
        chomp: function () {},
        shake: screenShake,
        variant: function () { return state.mascotVariant; },
        cycle: cycleMascotVariant,
        names: MASCOT_NAMES,
      };
      (function waitGame() {
        if (window.__csGame) window.__csGame.open({ beat: window.__csGameBeat || null });
        else window.setTimeout(waitGame, 50);
      })();
      return;
    }

    var mascot = createMascot();
    if (window.__csGameBeat) {
      // challenge links skip the gate: straight into the arena
      state.guideMode = "manual";
      state.guideDone = true;
      state.eyesOpen = true;
      state.blinkAt = performance.now() + 2400;
      document.documentElement.classList.remove("cs-guide-locked");
      if (window.__csApp && window.__csApp.applyScroll) {
        try { window.__csApp.applyScroll(); } catch (e) {}
      }
      window.setTimeout(function () {
        var veil = document.getElementById("cs-boot-veil");
        if (veil) veil.remove();
      }, 90);
      window.setTimeout(function () {
        if (window.__csGame) window.__csGame.open({ beat: window.__csGameBeat });
      }, 450);
    } else {
      createChoice();
    }
    window.requestAnimationFrame(function () {
      document.documentElement.classList.add("cs-theme-ready");
    });
    window.__csGameBridge = {
      dots: mascotDots,
      sfx: sfx,
      chomp: chomp,
      shake: screenShake,
      variant: function () { return state.mascotVariant; },
      cycle: cycleMascotVariant,
      names: MASCOT_NAMES,
    };
    initChat();
    initStatementScan();
    initLeadCapture();
    initWorkforceDeck();
    initFooterFace();
    initToolkitPlay();
    window.addEventListener("touchend", function () {
      if (sound.ctx && sound.ctx.state === "suspended") { try { sound.ctx.resume(); } catch (e) {} }
    }, { passive: true });
    // sound already enabled from a previous visit: music starts on first gesture
    if (sound.enabled) {
      var onceMusic = function () {
        startMusic();
        window.removeEventListener("pointerdown", onceMusic);
        window.removeEventListener("keydown", onceMusic);
        window.removeEventListener("touchend", onceMusic);
      };
      window.addEventListener("pointerdown", onceMusic);
      window.addEventListener("keydown", onceMusic);
      window.addEventListener("touchend", onceMusic);
    }
    // persistent tiny sound chip (bottom-left, appears once the gate closes)
    var soundChip = document.createElement("button");
    soundChip.type = "button";
    var playChip = document.createElement("button");
    playChip.type = "button";
    playChip.className = "cs-sound-chip cs-play-chip";
    playChip.innerHTML =
      '<svg class="cs-chip-ico cs-ico-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>' +
      '<svg class="cs-chip-ico cs-ico-skip" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5v13l9-6.5z" fill="currentColor"/><rect x="16.5" y="5.5" width="2.6" height="13" rx="1.3" fill="currentColor"/></svg>' +
      '<svg class="cs-chip-ico cs-ico-game" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>' +
      '<b class="cs-chip-time"></b>' +
      '<span class="cs-chip-label">play</span>';
    playChip.setAttribute("aria-label", "Play ZEE Run");
    playChip.addEventListener("click", function () {
      // Mobile action bar: this slot is the tour transport — play starts
      // the drive, skip stops it — and AFTER the tour it becomes the Dot
      // Shot launcher. Desktop is always the game link.
      if (window.matchMedia("(max-width: 640px)").matches) {
        if (state.gate) return; // the gate owns the first start
        if (guide.running) { abortGuide(); return; }
        if (playChip.classList.contains("is-game")) {
          openGameSoon();
          return;
        }
        window.scrollTo(0, 0);
        var api = lenis();
        if (api && api.scrollTo) { try { api.scrollTo(0, { immediate: true, force: true }); } catch (e) {} }
        runGuide();
        return;
      }
      openGameSoon();
    });
    // desktop reads "game ↗" from the start; mobile switches when the tour ends
    if (!window.matchMedia("(max-width: 640px)").matches) {
      playChip.classList.add("is-game");
      var lbl0 = playChip.querySelector(".cs-chip-label");
      if (lbl0) lbl0.textContent = "game";
    }
    window.__csPlayChipToGame = function () {
      playChip.classList.add("is-game");
      var lbl = playChip.querySelector(".cs-chip-label");
      if (lbl) lbl.textContent = "game";
    };
    document.body.appendChild(playChip);

    soundChip.className = "cs-sound-chip";
    soundChip.setAttribute("data-sound-toggle", "");
    soundChip.setAttribute("aria-label", "Toggle sound");
    soundChip.innerHTML =
      '<svg class="cs-chip-ico" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>' +
      '<g class="cs-ico-on" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16.5 8.5a5 5 0 0 1 0 7"/><path d="M19 6a8.5 8.5 0 0 1 0 12"/></g>' +
      '<path class="cs-ico-off" d="M16 9.5 21 14.5M21 9.5 16 14.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      "</svg>" +
      '<span class="cs-chip-label" data-sound-label>sound: ' + (sound.enabled ? "on" : "off") + "</span>";
    soundChip.setAttribute("aria-pressed", sound.enabled ? "true" : "false");
    soundChip.addEventListener("click", function () { setSound(!sound.enabled); });
    document.body.appendChild(soundChip);
    // sync the page tone to the stored driver — unless the URL forces a theme
    if (!/[?&]theme=/.test(window.location.search)) applyMascotTheme(state.mascotVariant);
    var canvas = mascot.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var bubbleNode = mascot.querySelector(".cs-ai-mascot__bubble");

    // --- debug hook: ?mobtest=manual|guided (+ &mobscroll=<id-or-selector>)
    // Lets headless screenshots get past the gate and land on a section.
    // Inert without the query param.
    (function mobTestHook() {
      var q = String(window.location.search || "");
      var mode = q.match(/[?&]mobtest=(manual|guided)/);
      if (!mode) return;
      window.setTimeout(function () {
        var btn = document.querySelector('.cs-guide-gate button[data-mode="' + mode[1] + '"]');
        if (btn) btn.click();
        if (/[?&]mobchat=1/.test(q)) window.setTimeout(function () { try { openChat(); } catch (e) {} }, 1200);
        var target = q.match(/[?&]mobscroll=([^&]+)/);
        if (!target) return;
        window.setTimeout(function () {
          var sel = decodeURIComponent(target[1]);
          var node = document.getElementById(sel) || document.querySelector(sel);
          if (!node) return;
          var shift = q.match(/[?&]mobshift=(-?\d+)/);
          var y = node.getBoundingClientRect().top + window.scrollY - 70 + (shift ? parseInt(shift[1], 10) : 0);
          var api = lenis();
          if (api && api.scrollTo) { try { api.scrollTo(y, { immediate: true, force: true }); } catch (e) { window.scrollTo(0, y); } }
          else window.scrollTo(0, y);
        }, 700);
      }, 800);
    })();

    collectBlocks();
    window.setTimeout(collectBlocks, 1200);
    window.addEventListener("resize", collectBlocks);
    window.addEventListener("mousemove", function (event) {
      state.pointer.x = event.clientX;
      state.pointer.y = event.clientY;
    }, { passive: true });
    window.addEventListener("click", onIdleClick, true);

    var startPoint = gatePoint();
    state.pos.x = startPoint.x;
    state.pos.y = startPoint.y;
    state.lastFrame = performance.now();

    function frame(now) {
      state.tick += 1;
      var dt = clamp((now - state.lastFrame) / 1000, 0.001, 0.05);
      state.lastFrame = now;

      // target
      var target;
      var suppressForEvidence = false;
      if (state.guideMode === "unset") {
        target = gatePoint();
      } else if (state.anchor) {
        target = state.anchor();
      } else if (guide.running) {
        // between beats the driver hovers where it is — no idle dives
        target = { x: state.pos.x, y: state.pos.y };
      } else {
        var block = activeBlock();
        state.mode = block.key;
        suppressForEvidence = block.key === "cases" || block.key === "growth" || (block.el && block.el.id === "cs-phases");
        target = idleFollowPoint(block);
        // idle lean toward the cursor (small, friendly)
        if ((state.guideDone || state.guideMode === "manual") && !(block.key === "hero" && isMobile())) {
          var dx = state.pointer.x - target.x;
          var dy = state.pointer.y - target.y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d > 1 && d < 420) {
            target = { x: target.x + (dx / d) * 16, y: target.y + (dy / d) * 12 };
          }
        }
      }

      // While the gate is up the mascot sits ON the orb (no spring): before
      // our CSS loads the gate is not fixed-positioned yet, and a spring
      // would fly the mascot across the page from a bogus start point.
      if (state.tick <= 3 || state.guideMode === "unset") {
        state.pos.x = target.x;
        state.pos.y = target.y;
        state.vel.x = 0;
        state.vel.y = 0;
      }

      // critically-ish damped spring — frame-rate independent, tiny overshoot
      // while idle; overdamped during the tour so long jumps between beats
      // never dive past the anchor and climb back (user-reported)
      var k = 52, c = guide.running ? 15.6 : 12.6;
      state.vel.x += (k * (target.x - state.pos.x) - c * state.vel.x) * dt;
      state.vel.y += (k * (target.y - state.pos.y) - c * state.vel.y) * dt;
      var vmax = 2800;
      var vlen = Math.sqrt(state.vel.x * state.vel.x + state.vel.y * state.vel.y);
      if (vlen > vmax) {
        state.vel.x *= vmax / vlen;
        state.vel.y *= vmax / vlen;
      }
      state.pos.x += state.vel.x * dt;
      state.pos.y += state.vel.y * dt;

      mascot.dataset.mode = state.mode;
      mascot.dataset.tone = state.lightInk ? "light" : "dark";
      mascot.classList.toggle("is-chattable", chatAllowed() && !state.chatOpen);
      var evidenceQuiet = suppressForEvidence && !guide.running && !state.anchor;
      // The worker is a visual cue, not a persistent UI control. It belongs
      // in the opening and the workforce moment; product proof and reading
      // sections need an unobstructed field of view.
      var isWorkforceMoment = block && block.el && block.el.id === "cs-workforce";
      var showWorkforceCompanion = isWorkforceMoment && !isMobile();
      var presentationQuiet = !guide.running && !state.anchor && state.mode !== "hero" && !showWorkforceCompanion;
      var visualQuiet = evidenceQuiet || presentationQuiet;
      mascot.classList.toggle("is-product-evidence", evidenceQuiet);
      mascot.classList.toggle("is-presentation-quiet", presentationQuiet);
      if (visualQuiet && !state.readingQuiet) {
        state.readingQuiet = true;
        stopTalking();
      } else if (!visualQuiet) {
        state.readingQuiet = false;
      }

      // contact = the mascot's resting spot: it grows and floats there
      // (2.9× swallows a 390px viewport — phones get a calmer 1.7×)
      // gate exits set swallowing to their own inhale scale (0 = off);
      // while choosing a driver the candidate poses BIG on the stage
      var restTarget = state.swallowing ? state.swallowing
        : (state.gate && state.guideMode === "unset") ? (isMobile() ? 3.0 : 3.4)
        : (state.mode === "contact" && !state.anchor && !guide.running && !state.chatOpen) ? (isMobile() ? 1.7 : 2.9) : 1;
      // spring, not lerp: the giant rest settles like a living thing
      state.restVel = (state.restVel || 0) + (90 * (restTarget - state.restScale) - 13 * (state.restVel || 0)) * dt;
      state.restScale += state.restVel * dt;
      if (Math.abs(state.restScale - 1) > 0.004) {
        mascot.style.setProperty("--cs-mscale", state.restScale.toFixed(3));
      } else if (mascot.style.getPropertyValue("--cs-mscale")) {
        mascot.style.removeProperty("--cs-mscale");
      }
      if (!state.halfW || state.tick % 120 === 0) {
        state.halfW = mascot.offsetWidth / 2;
        state.halfH = mascot.offsetHeight / 2;
      }
      mascot.style.setProperty("--cs-mx", (state.pos.x - state.halfW).toFixed(1) + "px");
      mascot.style.setProperty("--cs-my", (state.pos.y - state.halfH).toFixed(1) + "px");

      // Small viewports: slide the speech bubble sideways (--cs-bx) so it
      // never clips off-screen when the mascot hugs an edge. The tail
      // compensates in CSS and keeps pointing at the mascot.
      if (isMobile() && mascot.classList.contains("has-bubble") && bubbleNode) {
        if (!state.bubbleHalf) state.bubbleHalf = bubbleNode.offsetWidth / 2;
        var bHalf = state.bubbleHalf;
        var bPad = 10;
        var bShift = 0;
        if (state.pos.x - bHalf < bPad) bShift = bPad - (state.pos.x - bHalf);
        else if (state.pos.x + bHalf > window.innerWidth - bPad) bShift = window.innerWidth - bPad - (state.pos.x + bHalf);
        if (Math.abs(bShift - (state.lastBShift || 0)) > 0.5) {
          state.lastBShift = bShift;
          // translate happens inside the mascot's scaled space — undo it
          mascot.style.setProperty("--cs-bx", (bShift / Math.max(0.2, state.restScale)).toFixed(1) + "px");
        }
      } else if (mascot.style.getPropertyValue("--cs-bx")) {
        mascot.style.removeProperty("--cs-bx");
      }

      // chomp squash — underdamped spring back to 0 so release overshoots
      // into a small stretch. Squash flattens (x wide, y short).
      if (state.squash !== 0 || Math.abs(state.squashVel) > 0.001) {
        var sk = 210, sc = 16;
        state.squashVel += (sk * (0 - state.squash) - sc * state.squashVel) * dt;
        state.squash += state.squashVel * dt;
        if (Math.abs(state.squash) < 0.004 && Math.abs(state.squashVel) < 0.02) {
          state.squash = 0;
          state.squashVel = 0;
        }
        mascot.style.setProperty("--cs-msqx", (1 + state.squash * 0.22).toFixed(3));
        mascot.style.setProperty("--cs-msqy", (1 - state.squash * 0.3).toFixed(3));
      }
      mascot.classList.toggle("bubble-low", state.pos.y < 190);
      mascot.classList.add("is-ready");

      if (now - state.toneAt > 160) {
        state.toneAt = now;
        sampleTone();
        sampleChipTones();
      }

      maybeTrail();
      drawNavPet(state.tick * 0.018);
      drawMascot(canvas, ctx);
      window.requestAnimationFrame(frame);
    }

    window.requestAnimationFrame(frame);
  }

  function waitForRenderedApp() {
    ensureStyleLink();
    if (document.getElementById("cs-root") || document.getElementById("cs-physics-box") || window.__csGameOnly) {
      start();
      return;
    }
    window.setTimeout(waitForRenderedApp, 120);
  }

  waitForRenderedApp();
})();
