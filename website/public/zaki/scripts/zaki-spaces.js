/* ============================================================
   ZAKI Spaces — interactions
   ============================================================ */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $all = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  root.classList.add('is-ready');

  /* ---------- ENGINE FAILSAFE: if rAF never ticks (offscreen/throttled frame),
     CSS transitions freeze at opacity:0 — force visible end-state. ---------- */
  (function () {
    function forceVisible() {
      root.classList.add('no-anim');
      $all('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
    // If the entrance transition can't actually run (throttled/offscreen frame),
    // a .reveal.in element stays at opacity 0. Detect that and force the end-state.
    function check() {
      var el = document.querySelector('.reveal.in') || document.querySelector('.reveal');
      if (!el) return;
      if (parseFloat(getComputedStyle(el).opacity) < 0.5) forceVisible();
    }
    setTimeout(check, 1100);
    setTimeout(check, 2400);
  })();

  /* ---------- WORKSPACE SWITCHER ---------- */
  (function () {
    var rail = $all('.ws-space'), views = $all('.ws-view'), bot = $('#ws-bot'), says = $('#ws-says');
    if (!rail.length) return;
    var WORLDS = [
      { mood: 'happy', line: 'Portfolio Launch. Designer brain on \u2014 I\u2019ll keep the work tone in here.' },
      { mood: 'grin', line: 'Apartment Hunt. Whole different world \u2014 your budget and the cat rule are safe with me.' },
      { mood: 'thinking', line: 'Q3 at Work. Professional mode. The \u201Cnot before 9am\u201D thing stays in this room.' },
      { mood: 'heart', line: 'The Wedding. Soft mode on. Lilies are banned \u2014 noted, permanently.' }
    ];
    function select(i) {
      rail.forEach(function (b, j) { b.classList.toggle('active', j === i); b.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
      views.forEach(function (v, j) { v.classList.toggle('active', j === i); });
      var w = WORLDS[i] || WORLDS[0];
      says.textContent = w.line;
      var src = 'web/bot/' + w.mood + '.png';
      if (bot.getAttribute('src') !== src) bot.setAttribute('src', src);
      bot.classList.remove('react'); void bot.offsetWidth; bot.classList.add('react');
    }
    rail.forEach(function (b) { b.addEventListener('click', function () { select(+b.getAttribute('data-space')); }); });
  })();

  /* ---------- SCROLL progress + stage ---------- */
  var prog = $('#scroll-progress');
  function onScroll() {
    if (prog) {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    }
    var secs = $all('[data-stage]'); var mid = window.scrollY + window.innerHeight * 0.32, st = 'dark';
    for (var i = 0; i < secs.length; i++) { if (secs[i].offsetTop <= mid) st = secs[i].getAttribute('data-stage'); }
    doc.body.setAttribute('data-stage', st);
    var nav = $('#nav'); if (nav) nav.classList.toggle('scrolled', window.scrollY > 12);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- HERO dots parallax ---------- */
  (function () {
    var d = $('#shero-dots'); if (!d || reduce) return;
    window.addEventListener('scroll', function () { d.style.transform = 'translateY(' + (window.scrollY * 0.08) + 'px)'; }, { passive: true });
  })();

  /* ---------- REVEALS ---------- */
  (function () {
    var els = $all('.reveal');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var vh = function () { return window.innerHeight || 800; };
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
    // immediate: reveal anything already in view (covers IO initial-callback delay)
    requestAnimationFrame(function () { els.forEach(function (e) { if (e.getBoundingClientRect().top < vh() * 0.95) { e.classList.add('in'); io.unobserve(e); } }); });
    // safety net: reveal any above-fold reveal that IO never fired for
    setTimeout(function () { $all('.reveal:not(.in)').forEach(function (e) { if (e.getBoundingClientRect().top < vh()) e.classList.add('in'); }); }, 1200);
  })();

  /* ---------- SCRAMBLE kickers ---------- */
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

  /* ---------- NAV mega-menu + mobile ---------- */
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

  onScroll();
})();
