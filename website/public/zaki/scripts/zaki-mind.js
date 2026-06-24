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
    // the single scramble engine binds opt-in targets, every mono eyebrow
    // (.kicker / .fcol-k), AND every section headline (.chapter h2 — the hero
    // h1 is excluded; it's handled by splitHeadline). Supersedes the old IIFE.
    [].forEach.call(document.querySelectorAll('[data-scramble], .kicker, .fcol-k, .chapter h2'), function (el) {
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
  var lenis = null, tickFn = null, fieldTickFn = null, menuObs = null, onVis = null;

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

  // Ambient field renders on the SAME clock (no separate rAF).
  field = buildField();
  if (field) { fieldTickFn = function () { field.render(); }; gsap.ticker.add(fieldTickFn); }

  /* ====================================================================
     Teardown the React hook calls on unmount (SPA-leak fix)
     ==================================================================== */
  window.__zakiMind = {
    destroy: function () {
      try { ST.getAll().forEach(function (s) { s.kill(); }); } catch (e) {}
      if (fieldTickFn) gsap.ticker.remove(fieldTickFn);
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
