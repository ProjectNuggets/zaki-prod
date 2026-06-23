/* ============================================================
   ZAKI — Homepage interactions
   "Whatever comes next, ZAKI is on your side."
   Plain ES5-ish, no deps. Motion is meaning, not decoration.
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var doc = document;
  doc.documentElement.classList.add('is-ready');

  /* ---------- ENGINE FAILSAFE ----------
     If rAF never ticks (offscreen capture / throttled frame), CSS
     transitions freeze at opacity:0. Detect a live frame; if none,
     force animated content to its visible end-state. */
  (function () {
    function forceVisible() {
      doc.documentElement.classList.add('no-anim');
      $all('.reveal').forEach(function (el) { el.classList.add('in'); });
      var h1 = $('#hero-h1'); if (h1) h1.classList.add('split-ready', 'lit');
      var pr = $('#presence-reply'); if (pr && !pr.textContent) pr.textContent = 'I have the deadlines, your focus hours, and what slipped last week. The plan is made, your study block is protected, and the investor outline is ready.';
      var pm = $('#presence-mem'); if (pm) pm.style.opacity = 1;
    }
    function check() {
      var el = doc.querySelector('.reveal.in') || doc.querySelector('.reveal');
      if (!el) return;
      if (parseFloat(getComputedStyle(el).opacity) < 0.5) forceVisible();
    }
    setTimeout(check, 1100);
    setTimeout(check, 2400);
  })();

  function $(s, r) { return (r || doc).querySelector(s); }
  function $all(s, r) { return [].slice.call((r || doc).querySelectorAll(s)); }
  function raf(fn) { return window.requestAnimationFrame(fn); }

  /* ---------- REVEAL on scroll ---------- */
  function tagDelays() {
    $all('.reveal').forEach(function (el) {
      var d = parseFloat(el.getAttribute('data-d') || 0);
      el.style.transitionDelay = (d * 80) + 'ms';
    });
  }
  tagDelays();
  if (reduce) {
    $all('.reveal').forEach(function (el) { el.classList.add('in'); });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    $all('.reveal').forEach(function (el) { io.observe(el); });
    setTimeout(function () {
      $all('.reveal:not(.in)').forEach(function (el) {
        if (el.getBoundingClientRect().top < (window.innerHeight || 800)) el.classList.add('in');
      });
    }, 1500);
  } else { $all('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  /* ---------- HEADLINE line-mask reveal ---------- */
  function splitHeadline(animate) {
    var el = $('#hero-h1');
    if (!el) return;
    if (reduce) { el.classList.add('lit'); return; }
    var units = [];
    [].slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) { n.textContent.split(/\s+/).forEach(function (w) { if (w) units.push({ e: false, t: w }); }); }
      else if (n.nodeType === 1) { units.push({ e: true, html: n.outerHTML }); }
    });
    el.innerHTML = '';
    var spans = units.map(function (u) { var s = doc.createElement('span'); s.style.display = 'inline'; if (u.e) s.innerHTML = u.html; else s.textContent = u.t; return s; });
    spans.forEach(function (s, i) { el.appendChild(s); if (i < spans.length - 1) el.appendChild(doc.createTextNode(' ')); });
    var lines = [], cur = null, top = null;
    spans.forEach(function (s) { var t = s.offsetTop; if (top === null || Math.abs(t - top) > 4) { cur = []; lines.push(cur); top = t; } cur.push(s); });
    el.innerHTML = '';
    lines.forEach(function (line) {
      var ln = doc.createElement('span'); ln.className = 'hl-line';
      var inner = doc.createElement('span'); inner.className = 'hl-inner';
      line.forEach(function (s, i) { inner.appendChild(s); if (i < line.length - 1) inner.appendChild(doc.createTextNode(' ')); });
      ln.appendChild(inner); el.appendChild(ln);
    });
    $all('.hl-inner', el).forEach(function (inner, i) { inner.style.setProperty('--i', i); });
    el.classList.add('split-ready');
    if (animate) setTimeout(function () { el.classList.add('lit'); }, 60); else el.classList.add('lit');
  }
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(function () { splitHeadline(true); });
    setTimeout(function () { var el = $('#hero-h1'); if (el && !el.classList.contains('split-ready')) splitHeadline(true); }, 1000);
  } else { setTimeout(function () { splitHeadline(true); }, 80); }

  /* ---------- NAV solid + scroll progress + stage tracking ---------- */
  var nav = $('#nav'), progress = $('#scroll-progress');
  var stageEls = $all('[data-stage]');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle('solid', y > 12);
    if (progress) { var h = doc.documentElement.scrollHeight - window.innerHeight; progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')'; }
    // body stage = whichever data-stage section crosses the middle
    var mid = y + window.innerHeight * 0.4, stage = 'dark';
    for (var i = 0; i < stageEls.length; i++) {
      var el = stageEls[i]; if (el.id === '' && !el.hasAttribute('data-screen-label')) {}
      var rb = el.getBoundingClientRect(); var topAbs = rb.top + y;
      if (topAbs <= mid) stage = el.getAttribute('data-stage');
    }
    if (doc.body.getAttribute('data-stage') !== stage) doc.body.setAttribute('data-stage', stage);
    updateThread(y);
    updateChapRail(y);
  }
  function onTick() { if (!ticking) { ticking = true; raf(onScroll); } }
  window.addEventListener('scroll', onTick, { passive: true });
  window.addEventListener('resize', function () { buildThread(); onTick(); }, { passive: true });

  /* ---------- HERO pointer glow ---------- */
  (function () {
    var hero = $('#hero'), glow = $('#hero-glow');
    if (reduce || !hero || !glow) return;
    var mx = 74, my = 30, pend = false;
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 100;
      my = ((e.clientY - r.top) / r.height) * 100;
      if (!pend) { pend = true; raf(function () { pend = false; glow.style.background = 'radial-gradient(620px 520px at ' + mx + '% ' + my + '%,rgba(241,2,2,.16),transparent 68%)'; }); }
    });
  })();

  /* ---------- PRESENCE: typed reply ---------- */
  (function () {
    var reply = $('#presence-reply'), mem = $('#presence-mem');
    if (!reply) return;
    var text = 'I have the deadlines, your focus hours, and what slipped last week. The plan is made, your study block is protected, and the investor outline is ready.';
    if (reduce) { reply.textContent = text; if (mem) mem.style.opacity = 1; return; }
    var started = false;
    function type() {
      if (started) return; started = true;
      var i = 0; reply.innerHTML = '<span class="caret"></span>';
      var t = setInterval(function () {
        i++;
        reply.innerHTML = text.slice(0, i) + '<span class="caret"></span>';
        if (i >= text.length) { clearInterval(t); reply.innerHTML = text; if (mem) { mem.style.transition = 'opacity .6s ease'; mem.style.opacity = 1; } }
      }, 16);
    }
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { setTimeout(type, 600); io2.disconnect(); } }); }, { threshold: 0.4 });
      io2.observe(reply);
    } else { setTimeout(type, 800); }
  })();

  /* ---------- LIVING THREAD: one line from Presence through every chapter ---------- */
  var thSvg = $('#thread-svg'), thBg = $('#thread-bg'), thFg = $('#thread-fg'), thComet = $('#thread-comet');
  var thHalo = $('#thread-halo'), thTail = $('#thread-tail'), thTailGrad = $('#thread-tail-grad');
  var thForks = $('#thread-forks'), thRipplesG = $('#thread-ripples');
  var thNodesG = $('#thread-nodes'), thTicksG = $('#thread-ticks');
  var pathLen = 0, chapters = [], nodeData = [], spaceY = null;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function setThreadGradient(H) {
    var grad = doc.getElementById('thread-grad'); if (!grad || !H) return;
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x1', 0); grad.setAttribute('y1', 0); grad.setAttribute('x2', 0); grad.setAttribute('y2', H);
    var memY = null, spY = null;
    nodeData.forEach(function (o) { if (o.el) { if (o.el.id === 'memory') memY = o.y; if (o.el.id === 'spaces') spY = o.y; } });
    var RED = '#FA2E2E', RED2 = '#f10202', TEAL = '#1FA07B';
    var stops;
    if (memY != null && spY != null) {
      var mf = memY / H, sf = spY / H, a = Math.max(0.001, mf - 0.05), b = Math.min(0.999, sf + 0.07);
      stops = [[0, RED], [a, RED2], [mf, TEAL], [sf, TEAL], [b, RED2], [1, RED]];
    } else { stops = [[0, RED], [1, RED2]]; }
    while (grad.firstChild) grad.removeChild(grad.firstChild);
    stops.forEach(function (st) { var s = doc.createElementNS(SVGNS, 'stop'); s.setAttribute('offset', st[0]); s.setAttribute('stop-color', st[1]); grad.appendChild(s); });
  }
  function spawnRipple(x, y, zone) {
    if (reduce || !thRipplesG) return;
    var r = doc.createElementNS(SVGNS, 'circle');
    r.setAttribute('class', 'thread-ripple'); r.setAttribute('cx', x); r.setAttribute('cy', y); r.setAttribute('r', 3);
    if (zone === 'mem') r.style.stroke = 'var(--teal)';
    thRipplesG.appendChild(r);
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 1250);
  }
  var ySamples = [], threadTarget = 0, threadCur = 0, threadRAF = null, threadRetries = 0;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function collectChapters() {
    chapters = $all('[data-screen-label]').map(function (el) { return { el: el, label: el.getAttribute('data-screen-label') }; });
  }
  function docCenter(el) { var r = el.getBoundingClientRect(); return [r.left + window.scrollX + r.width / 2, r.top + window.scrollY + r.height / 2]; }
  function smooth(pts) {
    if (pts.length < 2) return '';
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function buildThread() {
    if (!thSvg) return;
    thSvg.style.height = '0px';   // don't let the absolute full-height SVG inflate the measurement
    var W = doc.documentElement.clientWidth;
    var ft = $('.footer');
    var H = ft ? (ft.offsetTop + ft.offsetHeight) : doc.documentElement.scrollHeight;
    thSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    thSvg.style.height = H + 'px';
    var contentLeft = Math.max(0, (W - 1240) / 2), gx = Math.max(48, contentLeft - 30);
    collectChapters();
    var pts = []; nodeData = [];
    // origin: the thread is born at the brand mark and descends the gutter
    // (no diagonal across the hero — the wordmark IS ZAKI's presence)
    var mark = $('.nav .mark');
    if (mark) { var m = docCenter(mark); pts.push([m[0], m[1] + 4]); pts.push([gx, m[1] + 92]); }   // ease from the mark into the gutter descent
    else pts.push([gx, 64]);
    // thread down through each chapter's heading
    var idx = 0;
    chapters.forEach(function (c) {
      var id = c.el.id;
      if (id === 'hero') return;                 // origin already at the mascot
      if (id === 'cta') {                        // converge into the resolution mark
        var mk = $('.resolve-mark');
        if (mk) { var mm = docCenter(mk); pts.push([(gx + mm[0]) / 2, mm[1] - 150]); pts.push([mm[0], mm[1]]); nodeData.push({ x: mm[0], y: mm[1], r: 5, el: c.el }); }
        return;
      }
      var k = c.el.querySelector('.kicker') || c.el.querySelector('.display') || c.el.querySelector('.display-xl') || c.el;
      var kr = k.getBoundingClientRect(); var ny = kr.top + window.scrollY + kr.height / 2;   // align node to the section's label
      var nx = gx + Math.sin(idx * 0.85) * 12; idx++;   // gentle organic weave so the spine breathes
      var zone = (id === 'memory' || id === 'spaces') ? 'mem' : '';   // continuity zone — turns teal
      pts.push([nx, ny]);
      nodeData.push({ x: nx, y: ny, r: 3.4, tick: Math.max(0, Math.min(28, contentLeft - nx - 8)), el: c.el, zone: zone });
    });
    pts.push([gx, H - 24]);
    var d = smooth(pts);
    thBg.setAttribute('d', d); thFg.setAttribute('d', d); thHalo.setAttribute('d', d);
    pathLen = thFg.getTotalLength();
    thFg.style.strokeDasharray = pathLen; thFg.style.strokeDashoffset = reduce ? 0 : pathLen;
    thHalo.style.strokeDasharray = pathLen; thHalo.style.strokeDashoffset = reduce ? 0 : pathLen;
    setThreadGradient(H);   // recolor the spine: red → teal (continuity zone) → red
    // SPACES BEAT: four worlds fan out from the spine and rejoin into one
    thForks.innerHTML = ''; thForks.classList.remove('on'); spaceY = null;
    var spi = -1; for (var si = 0; si < nodeData.length; si++) { if (nodeData[si].el && nodeData[si].el.id === 'spaces') spi = si; }
    if (spi >= 0) {
      var spN = nodeData[spi]; spaceY = spN.y;
      var fy0 = spN.y - 64, nextY = nodeData[spi + 1] ? nodeData[spi + 1].y : spN.y + 320, fy1 = Math.min(spN.y + 260, nextY - 26), fspan = fy1 - fy0;
      [-30, -11, 11, 30].forEach(function (off) {
        var fp = doc.createElementNS(SVGNS, 'path'); fp.setAttribute('class', 'thread-fork');
        fp.setAttribute('d', 'M' + spN.x + ' ' + fy0.toFixed(1) + ' C' + (spN.x + off) + ' ' + (fy0 + fspan * 0.28).toFixed(1) + ' ' + (spN.x + off) + ' ' + (fy1 - fspan * 0.28).toFixed(1) + ' ' + spN.x + ' ' + fy1.toFixed(1));
        thForks.appendChild(fp);
      });
      if (reduce) thForks.classList.add('on');
    }
    if (thRipplesG) thRipplesG.innerHTML = '';
    // sample a Y→length table so the comet tracks the actual reading position (smooth)
    ySamples = [];
    if (!reduce) { var S = 480; for (var s = 0; s <= S; s++) { var ll = pathLen * s / S; try { var pp = thFg.getPointAtLength(ll); ySamples.push([ll, pp.y]); } catch (e) {} } }
    threadCur = 0; threadTarget = 0;
    // nodes + ticks
    thNodesG.innerHTML = ''; thTicksG.innerHTML = '';
    nodeData.forEach(function (o) {
      var c = doc.createElementNS(SVGNS, 'circle');
      c.setAttribute('class', 'thread-node'); c.setAttribute('cx', o.x); c.setAttribute('cy', o.y); c.setAttribute('r', o.r);
      if (o.zone === 'mem') c.classList.add('zone-mem');
      thNodesG.appendChild(c); o.c = c;
      if (o.el) {
        var hit = doc.createElementNS(SVGNS, 'circle');
        hit.setAttribute('class', 'thread-hit'); hit.setAttribute('cx', o.x); hit.setAttribute('cy', o.y); hit.setAttribute('r', 13); hit.setAttribute('fill', 'transparent');
        (function (el, cir) { hit.addEventListener('click', function () { el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }); hit.addEventListener('mouseenter', function () { cir.setAttribute('r', o.r + 1.6); }); hit.addEventListener('mouseleave', function () { cir.setAttribute('r', o.r); }); })(o.el, c);
        thNodesG.appendChild(hit);
      }
      if (o.tick && o.tick > 6) {
        var l = doc.createElementNS(SVGNS, 'line'); l.setAttribute('class', 'thread-tick');
        l.setAttribute('x1', o.x + 5); l.setAttribute('y1', o.y); l.setAttribute('x2', o.x + 5 + o.tick); l.setAttribute('y2', o.y);
        thTicksG.appendChild(l); o.t = l;
      }
      if (reduce) { o.c.classList.add('on'); if (o.t) o.t.classList.add('on'); }
    });
    // self-validate: if the read happened during a collapsed layout, nodes bunch near the top — retry until settled
    var lastNode = nodeData[nodeData.length - 1];
    if (!reduce && lastNode && lastNode.y < H * 0.5 && threadRetries < 12) { threadRetries++; raf(function () { setTimeout(buildThread, 60); }); }
    else if (lastNode && lastNode.y >= H * 0.5) { threadRetries = 0; }
  }
  function lenForY(readY) {
    if (!ySamples.length) return 0;
    var best = 0;
    for (var i = 0; i < ySamples.length; i++) { if (ySamples[i][1] <= readY) best = ySamples[i][0]; }
    return best;
  }
  function threadStep() {
    var d = threadTarget - threadCur;
    threadCur += d * 0.14;
    if (Math.abs(d) < 0.5) { threadCur = threadTarget; threadRAF = null; } else { threadRAF = raf(threadStep); }
    var off = Math.max(0, pathLen - threadCur);
    thFg.style.strokeDashoffset = off; thHalo.style.strokeDashoffset = off;
    try {
      var p = thFg.getPointAtLength(threadCur);
      thComet.setAttribute('cx', p.x); thComet.setAttribute('cy', p.y);
      thComet.style.opacity = (threadCur > 6 && threadCur < pathLen - 6) ? 1 : 0;
      // comet tail: ZAKI's attention trailing the head, fading to nothing
      var tlen = Math.min(120, threadCur);
      if (tlen > 8) {
        var n = 10, sp0 = thFg.getPointAtLength(threadCur - tlen), dd = 'M' + sp0.x.toFixed(1) + ' ' + sp0.y.toFixed(1);
        for (var ti = 1; ti <= n; ti++) { var pp = thFg.getPointAtLength(threadCur - tlen + tlen * ti / n); dd += ' L' + pp.x.toFixed(1) + ' ' + pp.y.toFixed(1); }
        thTail.setAttribute('d', dd);
        thTailGrad.setAttribute('x1', sp0.x); thTailGrad.setAttribute('y1', sp0.y);
        thTailGrad.setAttribute('x2', p.x); thTailGrad.setAttribute('y2', p.y);
        thTail.style.opacity = (threadCur < pathLen - 6) ? 1 : 0;
      } else { thTail.style.opacity = 0; }
    } catch (e) {}
  }
  function updateThread(y) {
    if (!pathLen || reduce) return;
    var read = y + window.innerHeight * 0.5;
    threadTarget = lenForY(read);
    if (!threadRAF) threadRAF = raf(threadStep);
    nodeData.forEach(function (o) {
      var on = read >= o.y - 4;
      if (o.c) o.c.classList.toggle('on', on);
      if (o.t) o.t.classList.toggle('on', on);
      if (on && !o.seen) { o.seen = true; spawnRipple(o.x, o.y); }   // a memory forms
    });
    if (spaceY != null) thForks.classList.toggle('on', read >= spaceY - 40);
  }

  /* ---------- CHAPTER RAIL ---------- */
  var railEl = $('#chap-rail'), railBtns = [];
  function buildChapRail() {
    if (!railEl) return;
    collectChapters();
    railEl.innerHTML = '';
    railBtns = chapters.map(function (c, i) {
      var b = doc.createElement('button');
      var short = c.label.replace(/^\d+\s*/, '');
      b.innerHTML = '<span class="lbl">' + short + '</span><span class="pip"></span>';
      b.addEventListener('click', function () { c.el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
      railEl.appendChild(b);
      return b;
    });
    updateChapRail(window.scrollY || window.pageYOffset || 0);
  }
  function updateChapRail(y) {
    if (!railBtns.length) return;
    var vh = window.innerHeight, active = 0;
    if (y > 4) {
      var probe = y + vh * 0.45, tops = chapters.map(function (c) { return c.el.getBoundingClientRect().top + y; });
      for (var i = 0; i < tops.length; i++) {
        var next = (i + 1 < tops.length) ? tops[i + 1] : Infinity;
        if (probe >= tops[i] && probe < next) { active = i; break; }
        if (probe >= tops[i]) active = i;       // fallback: last passed
      }
    }
    railBtns.forEach(function (b, i) { b.classList.toggle('active', i === active); });   // always exactly one active, never -1
  }

  /* ---------- PRODUCTS MEGA-MENU + MOBILE MENU ---------- */
  (function () {
    var prod = $('#nav-products');
    if (prod) {
      var trigger = $('.nav-trigger', prod), closeT;
      function open() { clearTimeout(closeT); prod.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); }
      function close() { prod.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
      prod.addEventListener('mouseenter', open);
      prod.addEventListener('mouseleave', function () { closeT = setTimeout(close, 120); });
      trigger.addEventListener('click', function (e) { e.stopPropagation(); prod.classList.contains('open') ? close() : open(); });
      $all('.mega-card', prod).forEach(function (a) { a.addEventListener('click', close); });
      doc.addEventListener('click', function (e) { if (!prod.contains(e.target)) close(); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    var burger = $('#burger'), menu = $('#mobile-menu');
    if (burger && menu) {
      function toggleMenu(on) {
        menu.classList.toggle('open', on); doc.body.classList.toggle('menu-open', on);
        burger.setAttribute('aria-expanded', on ? 'true' : 'false'); menu.setAttribute('aria-hidden', on ? 'false' : 'true');
      }
      burger.addEventListener('click', function () { toggleMenu(!menu.classList.contains('open')); });
      $all('a', menu).forEach(function (a) { a.addEventListener('click', function () { toggleMenu(false); }); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggleMenu(false); });
    }
  })();

  /* boot — rebuild reliably across the collapsed→settled layout transition */
  function boot() { buildThread(); buildChapRail(); onScroll(); }
  function bootRAF() { raf(function () { raf(boot); }); }
  if (doc.readyState === 'complete') boot(); else window.addEventListener('load', boot);
  window.addEventListener('load', bootRAF);
  [250, 700, 1400, 2400].forEach(function (ms) { setTimeout(boot, ms); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { bootRAF(); setTimeout(boot, 150); });
  if ('ResizeObserver' in window) {
    var rebTO;
    var ro = new ResizeObserver(function () { clearTimeout(rebTO); rebTO = setTimeout(boot, 90); });
    ro.observe(doc.documentElement);
    ro.observe(doc.body);
  }

  /* ---------- SCRAMBLE signature (mono labels glitch in on reveal) ---------- */
  (function () {
    if (reduce || !('IntersectionObserver' in window)) return;
    var glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/\u00b7\u2014#%';
    function scramble(node) {
      var fin = node._final, len = fin.length, frame = 0;
      var iv = setInterval(function () {
        frame++; var out = '';
        for (var i = 0; i < len; i++) { var ch = fin.charAt(i); if (ch === ' ') { out += ' '; } else if (i < frame - 3) { out += ch; } else { out += glyphs.charAt((Math.random() * glyphs.length) | 0); } }
        node.nodeValue = out;
        if (frame > len + 3) { clearInterval(iv); node.nodeValue = fin; }
      }, 26);
    }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; if (e.target._sn) scramble(e.target._sn); io.unobserve(e.target); }); }, { threshold: 0.7 });
    $all('.kicker, .fcol-k').forEach(function (k) { var tn = k.lastChild; if (tn && tn.nodeType === 3 && tn.nodeValue && tn.nodeValue.trim().length > 1) { tn._final = tn.nodeValue; k._sn = tn; io.observe(k); } });
  })();

  /* ---------- MAGNETIC primary CTAs (subtle pull toward the cursor) ---------- */
  (function () {
    if (reduce) return;
    $all('.btn-primary.btn-lg').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = 'translate(' + (dx * 6).toFixed(1) + 'px,' + (dy * 5 - 1).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  })();

  // expose for later chapter scripts
  window.ZAKI = { rebuild: function () { buildThread(); buildChapRail(); }, reduce: reduce };
})();
