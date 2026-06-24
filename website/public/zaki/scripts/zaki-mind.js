/* ============================================================
   ZAKI — Mind layer  (Stage 1: smooth scroll + scroll engine)
   Owns: the Lenis instance, GSAP ScrollTrigger registration/wiring,
   and the single shared rAF (via gsap.ticker). It only READS the
   existing zaki-home.js / zaki-chapters.js layer — it never writes
   to the Thread, stage, scroll-progress, or magnetic transforms.
   Stages 2-3 add the WebGL "mind" field + camera choreography here.

   Safety nets (any one keeps the native DOM/CSS site fully working):
     - prefers-reduced-motion : no Lenis, no rAF, native scroll
     - missing gsap/ScrollTrigger/Lenis : bail, site unchanged
     - html.no-anim (zaki-home frozen-frame failsafe) : nothing here
       depends on motion, so the site stands as-is
   ============================================================ */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.__zakiMindInit) return;              // guard double-init on SPA re-entry
  window.__zakiMindInit = true;

  var docEl = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger, Lenis = window.Lenis;

  // Hard requirement: GSAP + ScrollTrigger. Without them, leave the native site untouched.
  if (!gsap || !ST) { window.__zakiMindInit = false; return; }
  gsap.registerPlugin(ST);

  var lenis = null;
  var tickFn = null;
  var menuObs = null;
  var onVis = null;

  // ---- Lenis smooth scroll (skipped entirely under reduced-motion) ----
  if (!reduce && Lenis) {
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      syncTouch: false,          // touch keeps native momentum
      wheelMultiplier: 1,
      lerp: 0.1
    });

    // One clock: Lenis drives ScrollTrigger; gsap.ticker drives Lenis. No separate rAF.
    // Lenis still fires native 'scroll' events, so zaki-home.js (Thread / rail /
    // body[data-stage] / #scroll-progress) keeps working unchanged.
    lenis.on('scroll', ST.update);
    tickFn = function (time) { lenis.raf(time * 1000); };
    gsap.ticker.add(tickFn);
    gsap.ticker.lagSmoothing(0);
    docEl.classList.add('mind-on');   // gates Stage-3 scroll-linked enhancements

    // Mobile-menu lock parity: body.menu-open <-> pause/resume smooth scroll.
    menuObs = new MutationObserver(function () {
      if (document.body.classList.contains('menu-open')) lenis.stop(); else lenis.start();
    });
    menuObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Don't burn cycles in a background tab.
    onVis = function () { if (document.hidden) lenis.stop(); else lenis.start(); };
    document.addEventListener('visibilitychange', onVis);

    // Lenis changes scroll metrics; re-measure the Thread + chapter rail once settled.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (window.ZAKI && window.ZAKI.rebuild) window.ZAKI.rebuild();
        ST.refresh();
      });
    });
  }

  // ---- Teardown the React hook calls on unmount (the SPA-leak fix) ----
  window.__zakiMind = {
    destroy: function () {
      try { ST.getAll().forEach(function (s) { s.kill(); }); } catch (e) {}
      if (lenis) {
        if (tickFn) gsap.ticker.remove(tickFn);
        lenis.destroy();
        lenis = null;
      }
      if (menuObs) { menuObs.disconnect(); menuObs = null; }
      if (onVis) { document.removeEventListener('visibilitychange', onVis); onVis = null; }
      docEl.classList.remove('mind-on');
      window.__zakiMindInit = false;
      // GL teardown (canvas, WEBGL_lose_context, pointer/resize listeners) appended in Stage 2.
    }
  };
})();
