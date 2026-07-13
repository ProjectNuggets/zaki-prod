/* ============================================================
   ZAKI — shared page interactions
   (nav mega-menu, mobile menu, scroll progress, body-stage,
    reveals, scramble kickers, reveal failsafe)
   Used by static pages (Story, Pricing). Product pages keep
   their own richer scripts.
   ============================================================ */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $all = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  root.classList.add('is-ready');

  /* ---------- REVEAL FAILSAFE: force visible end-state if a throttled
     frame freezes CSS transitions at opacity:0 ---------- */
  (function () {
    function forceVisible() {
      root.classList.add('no-anim');
      $all('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
    function check() {
      var el = doc.querySelector('.reveal.in') || doc.querySelector('.reveal');
      if (!el) return;
      if (parseFloat(getComputedStyle(el).opacity) < 0.5) forceVisible();
    }
    setTimeout(check, 1100);
    setTimeout(check, 2400);
  })();

  /* ---------- SCROLL progress + body stage ---------- */
  var prog = $('#scroll-progress');
  function onScroll() {
    if (prog) {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    }
    var secs = $all('[data-stage]'), mid = window.scrollY + window.innerHeight * 0.32, st = 'dark';
    for (var i = 0; i < secs.length; i++) { if (secs[i].offsetTop <= mid) st = secs[i].getAttribute('data-stage'); }
    doc.body.setAttribute('data-stage', st);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- REVEALS ---------- */
  (function () {
    var els = $all('.reveal');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var vh = function () { return window.innerHeight || 800; };
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
    requestAnimationFrame(function () { els.forEach(function (e) { if (e.getBoundingClientRect().top < vh() * 0.95) { e.classList.add('in'); io.unobserve(e); } }); });
    setTimeout(function () { $all('.reveal:not(.in)').forEach(function (e) { if (e.getBoundingClientRect().top < vh()) e.classList.add('in'); }); }, 1200);
  })();

  /* ---------- SCRAMBLE signature (mono kickers) ---------- */
  (function () {
    if (reduce || !('IntersectionObserver' in window)) return;
    var glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/\u00b7\u2014#%';
    function scramble(node) {
      var fin = node._final, len = fin.length, frame = 0;
      var iv = setInterval(function () {
        frame++; var out = '';
        for (var i = 0; i < len; i++) { var ch = fin.charAt(i); if (ch === ' ') out += ' '; else if (i < frame - 3) out += ch; else out += glyphs.charAt((Math.random() * glyphs.length) | 0); }
        node.nodeValue = out;
        if (frame > len + 3) { clearInterval(iv); node.nodeValue = fin; }
      }, 26);
    }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (!e.isIntersecting) return; if (e.target._sn) scramble(e.target._sn); io.unobserve(e.target); });
    }, { threshold: 0.7 });
    $all('.kicker, .fcol-k').forEach(function (k) { var tn = k.lastChild; if (tn && tn.nodeType === 3 && tn.nodeValue && tn.nodeValue.trim().length > 1) { tn._final = tn.nodeValue; k._sn = tn; io.observe(k); } });
  })();

  /* ---------- NAV mega-menu + mobile menu ---------- */
  (function () {
    var prod = $('#nav-products');
    if (prod) {
      var trigger = $('.nav-trigger', prod), closeT;
      var open = function () { clearTimeout(closeT); prod.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); };
      var close = function () { prod.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
      prod.addEventListener('mouseenter', open);
      prod.addEventListener('mouseleave', function () { closeT = setTimeout(close, 120); });
      trigger.addEventListener('click', function (e) { e.stopPropagation(); prod.classList.contains('open') ? close() : open(); });
      doc.addEventListener('click', function (e) { if (!prod.contains(e.target)) close(); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    var burger = $('#burger'), menu = $('#mobile-menu');
    if (burger && menu) {
      var toggle = function (on) { menu.classList.toggle('open', on); doc.body.classList.toggle('menu-open', on); burger.setAttribute('aria-expanded', on ? 'true' : 'false'); menu.setAttribute('aria-hidden', on ? 'false' : 'true'); };
      burger.addEventListener('click', function () { toggle(!menu.classList.contains('open')); });
      $all('a', menu).forEach(function (a) { a.addEventListener('click', function () { toggle(false); }); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    }
  })();

  /* ---------- NAV scrolled state ---------- */
  (function () {
    var nav = $('#nav');
    if (!nav) return;
    var f = function () { nav.classList.toggle('scrolled', window.scrollY > 12); };
    window.addEventListener('scroll', f, { passive: true }); f();
  })();

  onScroll();
})();
