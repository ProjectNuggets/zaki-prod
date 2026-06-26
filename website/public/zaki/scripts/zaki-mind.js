/* ============================================================
   ZAKI — Mind layer
   Stage 1: Lenis smooth scroll + GSAP ScrollTrigger engine (one rAF).
   Stage 2: the SCRAMBLE signature —
     A) ZakiScramble: a first-class text decode/resolve engine
        (auto-applies to [data-scramble] on enter).
     B) Ambient scramble field: a faint scatter of mono glyphs that
        continuously decode behind the hero — "Enter ZAKI's mind" —
        reactive to cursor + scroll velocity, stage-tinted.

   Reads the existing zaki-home.js / zaki-chapters.js layer; never
   writes the Thread, stage, scroll-progress, or magnetic transforms.

   Safety nets (any one keeps the native DOM/CSS site fully working):
     - prefers-reduced-motion : no Lenis, no field; scramble shows
       final text instantly.
     - missing gsap/ScrollTrigger : bail, site unchanged.
     - html.no-anim : nothing here depends on motion.
   ============================================================ */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__zakiMindInit) return;
  window.__zakiMindInit = true;

  var docEl = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger, Lenis = window.Lenis;
  if (!gsap || !ST) { window.__zakiMindInit = false; return; }
  gsap.registerPlugin(ST);

  var GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%/·—<>{}*+=:';
  function rg() { return GLYPHS.charAt((Math.random() * GLYPHS.length) | 0); }

  /* ====================================================================
     A) ZakiScramble — text decode/resolve engine
     ==================================================================== */
  // collect every DIRECT child text node with real content — animating these
  // leaves element children intact: .kicker's <span class="ix"> index, a
  // headline's <em class="hl"> accent (stays solid while the rest decodes), and
  // <br/>-separated lines each decode together.
  function textNodes(el) {
    var out = [];
    for (var i = 0; i < el.childNodes.length; i++) {
      var c = el.childNodes[i];
      if (c.nodeType === 3 && c.nodeValue.replace(/\s/g, '').length > 0) out.push(c);
    }
    return out;
  }
  function scrambleEl(el, opts) {
    opts = opts || {};
    if (el.__scrambling) return;
    var nodes = textNodes(el).map(function (node) {
      var f = node.__final != null ? node.__final : node.nodeValue;
      node.__final = f;
      return { node: node, chars: f.split('') };
    });
    if (!nodes.length) return;
    if (reduce) { nodes.forEach(function (it) { it.node.nodeValue = it.node.__final; }); return; }
    el.__scrambling = true;
    el.classList.add('is-scrambling');
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = now - start, allDone = true;
      for (var k = 0; k < nodes.length; k++) {
        var it = nodes[k], chars = it.chars, n = chars.length;
        var dur = opts.duration || Math.min(1300, 360 + n * 42);
        var stagger = dur / Math.max(1, n);                  // resolve front advances L->R
        var outStr = '', done = true;
        for (var i = 0; i < n; i++) {
          var c = chars[i];
          if (c === ' ' || c === '\n') { outStr += c; continue; }
          if (t >= i * stagger + stagger) { outStr += c; }
          else { outStr += rg(); done = false; }
        }
        it.node.nodeValue = outStr;
        if (!done) allDone = false;
      }
      if (!allDone) { el.__raf = requestAnimationFrame(frame); }
      else {
        for (var m = 0; m < nodes.length; m++) nodes[m].node.nodeValue = nodes[m].node.__final;
        el.__scrambling = false; el.classList.remove('is-scrambling');
      }
    }
    el.__raf = requestAnimationFrame(frame);
  }
  // public API
  window.ZakiScramble = function (target, opts) {
    var els = typeof target === 'string' ? document.querySelectorAll(target) : (target.length ? target : [target]);
    [].forEach.call(els, function (el) { scrambleEl(el, opts); });
  };

  // auto-apply to [data-scramble] when it enters view (once)
  var scrambleIO = null;
  if ('IntersectionObserver' in window) {
    scrambleIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        scrambleEl(e.target, { duration: +e.target.getAttribute('data-scramble-dur') || 0 });
        scrambleIO.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    // SCALPEL, not blanket: scramble fires only on the accent word(s) per scene
    // (.hl / .hlt) plus anything explicitly opted-in with [data-scramble].
    // Eyebrows and full headlines no longer decode — that was the over-use.
    [].forEach.call(document.querySelectorAll('.hl, .hlt, [data-scramble]'), function (el) {
      scrambleIO.observe(el);
    });
  }

  /* ====================================================================
     B) Ambient scramble field — the "enter ZAKI's mind" backdrop
     ==================================================================== */
  var field = null;
  function buildField() {
    var host = document.getElementById('mind-field');
    if (!host || reduce) return null;
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return null; }

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var coarse = matchMedia('(pointer:coarse)').matches;
    var tier = coarse ? 'low' : (window.innerWidth >= 1280 ? 'high' : 'mid');
    var COUNT = tier === 'high' ? 340 : tier === 'mid' ? 190 : 84;
    var W = 0, H = 0, cells = [], lastT = 0, visible = true;
    var pointer = { x: -1e4, y: -1e4 };

    function seed() {
      cells = [];
      var aspect = W / Math.max(1, H);
      var cols = Math.max(1, Math.round(Math.sqrt(COUNT * aspect)));
      var rows = Math.max(1, Math.ceil(COUNT / cols));
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        if (cells.length >= COUNT) break;
        cells.push({
          x: (c + 0.5) / cols * W + (Math.random() - 0.5) * (W / cols) * 0.8,
          y: (r + 0.5) / rows * H + (Math.random() - 0.5) * (H / rows) * 0.8,
          ch: rg(),
          a: 0.10 + Math.random() * 0.18,   // resting faintness (present, still behind text)
          scr: 0,                            // ms of scramble remaining
          nxt: Math.random() * 4200          // ms until next spontaneous scramble
        });
      }
    }
    function resize() {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function tintRGB() {
      // warm-white on dark stages, ink on light stages — always sits behind text legibly
      return document.body.getAttribute('data-stage') === 'light' ? '26,22,18' : '240,234,222';
    }
    function render() {
      if (!visible || !W || document.hidden) { lastT = 0; return; }
      var now = performance.now();
      var dt = lastT ? Math.min(50, now - lastT) : 16; lastT = now;
      ctx.clearRect(0, 0, W, H);
      ctx.font = (tier === 'low' ? '12px' : '14px') + ' "DM Mono","SF Mono",ui-monospace,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var rgb = tintRGB();
      var vel = lenis ? Math.min(1, Math.abs(lenis.velocity || 0) / 35) : 0;
      // Scroll-position turbulence: the mind is busiest at the top and settles
      // toward stillness as you descend — one continuous "resolving" readout.
      var de = document.documentElement;
      var maxS = de.scrollHeight - de.clientHeight;
      var prog = maxS > 0 ? Math.min(1, (window.scrollY || de.scrollTop) / maxS) : 0;
      var turb = 1 - 0.78 * prog;                  // 1 (turbulent) -> ~0.22 (near still)
      for (var i = 0; i < cells.length; i++) {
        var p = cells[i];
        p.nxt -= dt;
        if (p.scr <= 0 && (p.nxt <= 0 || Math.random() < vel * 0.06)) {
          if (Math.random() < 0.30 + 0.70 * turb) p.scr = 280 + Math.random() * 560;
          p.nxt = (1700 + Math.random() * 4600) / (0.4 + 0.6 * turb);
        }
        var alpha = p.a * (0.5 + 0.5 * turb);
        if (p.scr > 0) { p.scr -= dt; if (Math.random() < 0.55) p.ch = rg(); alpha = p.a + 0.30; }
        var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 30625) {                                  // 175px focus radius
          var f = 1 - Math.sqrt(d2) / 175;
          alpha += f * 0.42;
          if (Math.random() < f * 0.4) p.ch = rg();
        }
        ctx.fillStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')';
        ctx.fillText(p.ch, p.x, p.y);
      }
    }

    function onMove(e) {
      var r = host.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    }
    window.addEventListener('pointermove', onMove, { passive: true });
    var ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', resize, { passive: true });
    // pause when the hero scrolls out of view (perf)
    var vis = ('IntersectionObserver' in window)
      ? new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0 })
      : null;
    if (vis) vis.observe(host);

    resize();
    requestAnimationFrame(function () { host.classList.add('is-live'); });

    return {
      render: render,
      destroy: function () {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('resize', resize);
        if (ro) ro.disconnect();
        if (vis) vis.disconnect();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  /* ====================================================================
     Lenis smooth scroll + the one shared clock (gsap.ticker)
     ==================================================================== */
  var lenis = null, tickFn = null, fieldTickFn = null, altTickFn = null, goalMO = null, zeeIO = null, menuObs = null, onVis = null, heroIntro = null, emberTickFn = null, curAlt = 0;

  if (!reduce && Lenis) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true, syncTouch: false, wheelMultiplier: 1, lerp: 0.1
    });
    lenis.on('scroll', ST.update);
    tickFn = function (time) { lenis.raf(time * 1000); };
    gsap.ticker.add(tickFn);
    gsap.ticker.lagSmoothing(0);
    docEl.classList.add('mind-on');

    menuObs = new MutationObserver(function () {
      if (document.body.classList.contains('menu-open')) lenis.stop(); else lenis.start();
    });
    menuObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    onVis = function () { if (document.hidden) lenis.stop(); else lenis.start(); };
    document.addEventListener('visibilitychange', onVis);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (window.ZAKI && window.ZAKI.rebuild) window.ZAKI.rebuild();
        ST.refresh();
      });
    });
  }

  // Ambient scramble field is OFF — it over-used the signature and fought the
  // clean sui.io editorial direction. buildField() is retained (unused) in case
  // a far subtler version is wanted later. Scramble now lives only on accents.
  void buildField;
  field = null;

  /* ---- Altitude driver: one scroll value (0 top -> 1 bottom) -> rising palette ---- */
  (function () {
    var root = document.documentElement;
    function altitude() {
      if (document.hidden) return;
      var de = document.documentElement;
      var max = de.scrollHeight - de.clientHeight;
      var p = max > 0 ? (window.scrollY || de.scrollTop) / max : 0;
      if (p < 0) p = 0; else if (p > 1) p = 1;
      curAlt = p;
      root.style.setProperty('--altitude', p.toFixed(4));
    }
    altitude();                       // initial paint (also correct under reduce/no-anim)
    if (!reduce) { altTickFn = altitude; gsap.ticker.add(altTickFn); }
  })();

  /* ---- Carried-goal token: mirror the stored goal (shown via body.has-intent,
     toggled by the existing intent writer in zaki-chapters.js) ---- */
  (function () {
    var t = document.getElementById('goal-token'); if (!t) return;
    var txt = t.querySelector('.gt-text');
    function sync() {
      try { var v = JSON.parse(localStorage.getItem('zaki_intent_v1') || 'null');
        if (v && v.text) txt.textContent = v.text; } catch (e) {}
    }
    sync();
    goalMO = new MutationObserver(sync);
    goalMO.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  })();

  /* ---- Rising embers: faint warm sparks drifting up behind the whole climb, unifying
     every section in one ambient layer. Sparser/cooler at the valley, warmer climbing,
     faded to nothing at the dawn summit. Additive glow, one shared clock, paused when
     hidden, off under reduced-motion. ---- */
  (function () {
    var host = document.getElementById('ember-field');
    if (!host || reduce) return;
    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) { host.removeChild(canvas); return; }

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var coarse = matchMedia('(pointer:coarse)').matches;
    var COUNT = coarse ? 38 : (window.innerWidth >= 1280 ? 95 : 60);
    var W = 0, H = 0, parts = [], lastT = 0;

    // pre-rendered soft warm ember sprite (drawImage is cheaper than per-frame gradients)
    var spr = document.createElement('canvas'); spr.width = spr.height = 32;
    var sx = spr.getContext('2d');
    var sg = sx.createRadialGradient(16, 16, 0, 16, 16, 16);
    sg.addColorStop(0, 'rgba(255,228,186,1)');
    sg.addColorStop(0.45, 'rgba(255,176,108,0.55)');
    sg.addColorStop(1, 'rgba(250,120,70,0)');
    sx.fillStyle = sg; sx.fillRect(0, 0, 32, 32);

    function rnd(a, b) { return a + Math.random() * (b - a); }
    function spawn(p, fromBottom) {
      p.x = Math.random() * (W || 1);
      p.y = fromBottom ? (H + rnd(0, H * 0.4)) : Math.random() * (H || 1);
      p.r = rnd(0.7, 2.6);
      p.vy = rnd(7, 24);
      p.swayAmp = rnd(4, 16);
      p.swaySpd = rnd(0.3, 1.0);
      p.phase = Math.random() * 6.28;
      p.a = rnd(0.16, 0.62);
    }
    function seed() { parts = []; for (var i = 0; i < COUNT; i++) { var p = {}; spawn(p, false); parts.push(p); } }
    function resize() {
      W = host.clientWidth; H = host.clientHeight; if (!W || !H) return;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function render() {
      if (!W || document.hidden) { lastT = 0; return; }
      var now = performance.now();
      var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016; lastT = now;
      ctx.clearRect(0, 0, W, H);
      var a = curAlt;
      var dawnFade = a < 0.84 ? 1 : Math.max(0, 1 - (a - 0.84) / 0.10);   // gone by the dawn
      if (dawnFade <= 0) { return; }
      var warmth = 0.6 + 0.4 * a;
      var density = (0.58 + 0.42 * a) * dawnFade;
      var vel = lenis ? Math.min(1, Math.abs(lenis.velocity || 0) / 40) : 0;
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= (p.vy * (1 + vel * 1.4)) * dt;
        p.phase += p.swaySpd * dt;
        if (p.y < -12) spawn(p, true);
        if ((i / parts.length) > density) continue;
        var x = p.x + Math.sin(p.phase) * p.swayAmp;
        var sz = p.r * (3.4 + warmth * 1.9);
        ctx.globalAlpha = p.a * dawnFade;
        ctx.drawImage(spr, x - sz, p.y - sz, sz * 2, sz * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    var ro = ('ResizeObserver' in window) ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(host); else window.addEventListener('resize', resize, { passive: true });
    resize();
    emberTickFn = render; gsap.ticker.add(emberTickFn);
  })();

  /* ====================================================================
     Hybrid scroll choreography — sui.io-style
       - hero: clean editorial intro on load, then PIN + transform out
         as scene 2 arrives (the section-to-section hand-off)
       - free-scroll scenes [data-reveal]: bold staggered reveal on enter
     ==================================================================== */
  if (!reduce && document.querySelector('#hero .scene-inner')) {
    var EASE = 'expo.out';   // ONE signature easing language across the whole climb

    // hero intro — built PAUSED so it plays exactly as the intro veil lifts (the hero
    // rises into the space the curtain just vacated). immediateRender pre-hides the hero
    // behind the veil. If there's no veil, the controller below plays it on load.
    heroIntro = gsap.timeline({ defaults: { ease: EASE }, paused: true });
    heroIntro
      .from('#hero .scene-eyebrow', { y: 20, opacity: 0, duration: 0.9 })
      .from('#hero .scene-h1',      { y: 42, opacity: 0, duration: 1.15 }, '-=0.58')
      .from('#hero .scene-lede',    { y: 24, opacity: 0, duration: 0.9 },  '-=0.78')
      .from('#hero .scene-cta',     { y: 18, opacity: 0, duration: 0.8 },  '-=0.66')
      .from('#hero .scene-cue',     { opacity: 0, duration: 0.9, ease: 'sine.out' }, '-=0.3');

    // pin the hero and lift/fade it out as scene 2 arrives (tight hand-off).
    // Desktop only — pinning fights touch scrollers, so coarse pointers free-scroll.
    if (!matchMedia('(pointer:coarse)').matches) {
      gsap.timeline({ scrollTrigger: { trigger: '#hero', start: 'top top', end: '+=60%', pin: true, scrub: 0.6 } })
        .to('#hero .scene-cue',   { opacity: 0, ease: 'none' }, 0)
        .to('#hero .scene-inner', { yPercent: -12, opacity: 0, ease: 'power2.in' }, 0);
    }

    // scene reveals — copy staggers in on the signature ease, then the visual panel
    // rises a beat later (overlapping). Every non-hero scene gets the same signature.
    [].forEach.call(document.querySelectorAll('.scene[data-reveal]'), function (sc) {
      var copy = sc.querySelectorAll('.scene-eyebrow, .scene-h1, .scene-lede, .scene-facets, .scene-cta, .summit-origin');
      var tl = gsap.timeline({ scrollTrigger: { trigger: sc, start: 'top 74%' } });
      if (copy.length) tl.from(copy, { y: 46, opacity: 0, duration: 1.1, ease: EASE, stagger: 0.085 });
      var panel = sc.querySelector('.run, .mem-graph, .spaces-vis, .boundary');
      if (panel) tl.from(panel, { y: 40, opacity: 0, duration: 1.15, ease: EASE }, '-=0.85');
    });

    requestAnimationFrame(function () { ST.refresh(); });
  }

  /* ---- Crafted intro: the dark valley floor holds for a beat (ZAKI decoding), then
     lifts like a curtain — the hero rises into the space it vacated. The veil is
     prerendered & visible (no hero flash); here JS owns the lift + scroll lock. CSS
     auto-lifts as a no-JS fallback and skips the veil entirely under reduced-motion. ---- */
  (function () {
    var veil = document.getElementById('intro-veil'); if (!veil) return;
    function playHero() { if (heroIntro) heroIntro.play(); }
    if (reduce) { docEl.classList.add('intro-done'); if (veil.parentNode) veil.parentNode.removeChild(veil); playHero(); return; }
    docEl.classList.add('intro-on');
    if (lenis) lenis.stop();
    window.scrollTo(0, 0);
    var word = veil.querySelector('.iv-word');
    if (word && window.ZakiScramble) setTimeout(function () { window.ZakiScramble(word, { duration: 950 }); }, 260);
    var lifted = false, t;
    function lift() {
      if (lifted) return; lifted = true;
      clearTimeout(t);
      veil.classList.add('is-lifting');
      docEl.classList.remove('intro-on');
      docEl.classList.add('intro-done');
      if (lenis) lenis.start();
      playHero();
      setTimeout(function () { if (veil.parentNode) veil.parentNode.removeChild(veil); }, 950);
    }
    t = setTimeout(lift, 1950);
    veil.addEventListener('click', lift);
  })();

  /* ---- Zee climber: ONE companion that ascends the right gutter WITH you.
     Its vertical position rides --altitude (CSS); here we swap its pose as each
     scene takes over, and at the summit it turns to face you (.at-summit). The
     "never alone" promise, made literal and persistent. Desktop only (CSS gates
     the display); pose-swap is cheap and runs under reduce too. ---- */
  (function () {
    var zee = document.getElementById('zee-climber'); if (!zee) return;
    var scenes = [].slice.call(document.querySelectorAll('.scene[data-zee]'));
    if (!scenes.length || !('IntersectionObserver' in window)) return;
    // Drive the pose from whichever scene is MOST visible — self-correcting under
    // any scroll speed or direction (onEnter/onEnterBack lagged by one on fast jumps,
    // and fired the summit turn a scene early). The dominant scene owns Zee.
    var ratios = new Map(), cur = '';
    function pick() {
      var best = null, bestR = -1;
      scenes.forEach(function (s) { var r = ratios.get(s) || 0; if (r > bestR) { bestR = r; best = s; } });
      if (!best || bestR <= 0) return;
      var src = best.getAttribute('data-zee');
      if (src && src !== cur) {
        cur = src;
        zee.classList.add('zee-swap');
        setTimeout(function () { zee.src = src; zee.classList.remove('zee-swap'); }, 150);
      }
      zee.classList.toggle('at-summit', best.id === 'cta');
    }
    zeeIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { ratios.set(e.target, e.intersectionRatio); });
      pick();
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    scenes.forEach(function (s) { zeeIO.observe(s); });
    // join a beat after the hero intro settles
    requestAnimationFrame(function () { setTimeout(function () { zee.classList.add('is-in'); }, 650); });
  })();

  /* ---- Summit arrival bloom: the dawn opens with a beat as you crest the top.
     The glow blooms from nothing; the goal resolving in the CTA gets its payoff. ---- */
  (function () {
    var cta = document.getElementById('cta'); if (!cta || reduce) return;
    ST.create({ trigger: cta, start: 'top 68%', once: true,
      onEnter: function () { cta.classList.add('summit-bloomed'); } });
  })();

  /* ---- Dawn dissolve: the dark valley PIXELATES into the dawn across the top of the
     summit. A dither of PURE warm colours (dark -> ember -> amber -> gold -> cream) — no
     pixel is ever an interpolated midtone, so there is no muddy/cold gradient band. The
     dawn blooms upward from the bottom as the summit enters; static under reduced-motion. ---- */
  (function () {
    var cv = document.getElementById('dawn-pixels'); if (!cv) return;
    var sec = document.getElementById('cta'); if (!sec) return;
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var GAP = window.innerWidth < 720 ? 9 : 12;
    var PAL = ['#18120D', '#34200F', '#5E3A1B', '#8C5A2C', '#B8823F', '#DBB069', '#EED7AE', '#F4EAD8'];
    var cells = [], W = 0, H = 0, raf = null, started = false, bloom = 0;

    function build() {
      W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cells = [];
      var cx = W * 0.5, maxd = Math.sqrt(cx * cx + H * H), n = PAL.length;
      for (var y = 0; y < H; y += GAP) {
        for (var x = 0; x < W; x += GAP) {
          var t = (y / H) / 0.62; if (t > 1) t = 1;         // dissolve completes in the top ~62%
          var thr = t + (Math.random() - 0.5) * 0.6;        // ...leaving clean cream below for the headline
          if (t >= 1) thr = 1.5;                            // force solid cream in the buffer zone
          var idx = Math.round(thr * (n - 1)); idx = idx < 0 ? 0 : idx > n - 1 ? n - 1 : idx;
          var dx = x - cx, dy = H - y, d = Math.sqrt(dx * dx + dy * dy);
          cells.push({ x: x, y: y, c: PAL[idx], delay: d / maxd, full: Math.random() < 0.86 ? GAP + 1 : GAP * 0.55 });
        }
      }
    }
    function paint(p) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i], local = (p - c.delay) / 0.3;
        if (local <= 0) continue;
        var g = local >= 1 ? 1 : local, s = c.full * g, o = (c.full - s) / 2;
        ctx.fillStyle = c.c; ctx.fillRect(c.x + o, c.y + o, s, s);
      }
    }
    function tick() { bloom += 0.022; paint(bloom); if (bloom < 1.32) raf = requestAnimationFrame(tick); else { paint(2); raf = null; } }
    function start() { if (started) return; started = true; if (reduce) { paint(2); return; } bloom = 0; if (raf) cancelAnimationFrame(raf); tick(); }

    build();
    if (reduce) paint(2);
    ST.create({ trigger: sec, start: 'top bottom', onEnter: start });   // bloom as the summit first peeks in
    var ro = ('ResizeObserver' in window) ? new ResizeObserver(function () { build(); paint(started ? 2 : 0); }) : null;
    if (ro) ro.observe(cv);
  })();

  /* ---- Scene 3 (Agent): pin the scene; the run executes as you scroll ----
     #run-phases is the sole driver here (the markup id is #agent-run, not #run,
     so the zaki-chapters.js auto-play stays dormant and can't fight the scrub). */
  (function () {
    var sec = document.getElementById('agent');
    if (!sec || reduce || matchMedia('(pointer:coarse)').matches) return;
    var phases = [].slice.call(sec.querySelectorAll('#run-phases li'));
    if (!phases.length) return;
    gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=120%', pin: true, scrub: 0.5,
      onUpdate: function (self) {
        var k = Math.round(self.progress * phases.length);
        phases.forEach(function (li, i) { li.classList.toggle('done', i < k); li.classList.toggle('active', i === k); });
      } } });
    requestAnimationFrame(function () { ST.refresh(); });
  })();

  /* ====================================================================
     Teardown the React hook calls on unmount (SPA-leak fix)
     ==================================================================== */
  window.__zakiMind = {
    destroy: function () {
      try { ST.getAll().forEach(function (s) { s.kill(); }); } catch (e) {}
      if (fieldTickFn) gsap.ticker.remove(fieldTickFn);
      if (altTickFn) { gsap.ticker.remove(altTickFn); altTickFn = null; }
      if (goalMO) { goalMO.disconnect(); goalMO = null; }
      if (zeeIO) { zeeIO.disconnect(); zeeIO = null; }
      if (emberTickFn) { gsap.ticker.remove(emberTickFn); emberTickFn = null; }
      if (field) { field.destroy(); field = null; }
      if (lenis) { if (tickFn) gsap.ticker.remove(tickFn); lenis.destroy(); lenis = null; }
      if (menuObs) { menuObs.disconnect(); menuObs = null; }
      if (scrambleIO) { scrambleIO.disconnect(); scrambleIO = null; }
      if (onVis) { document.removeEventListener('visibilitychange', onVis); onVis = null; }
      docEl.classList.remove('mind-on');
      window.__zakiMindInit = false;
    }
  };
})();
