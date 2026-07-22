/* ============================================================
   ZAKI — Living Memory Constellation
   The signature visual. A graph of memory nodes that drift,
   connect, recall (pulse), and grow (new memories light up).
   One node carries the visitor's own intention — so the brand
   motif is literally personalised. This is ZAKI remembering you.

   Usage:  <div data-constellation [data-dense] [data-quiet]></div>
   Themed via CSS custom properties on the container:
     --con-core, --con-node, --con-line, --con-line-live,
     --con-label, --con-glow
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;

  function readIntent() {
    try {
      var v = JSON.parse(localStorage.getItem('zaki_intent_v1') || 'null');
      if (v && v.text) return v.text.trim();
    } catch (e) {}
    return null;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function truncate(s, n) { return s && s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // Memory labels that read like a life, not a database.
  var POOL = [
    'the deadline', 'Maya', 'the trip', 'your portfolio', 'last Tuesday',
    'the budget', 'mornings', 'the investor call', 'that idea', 'the rewrite',
    'her birthday', 'the pitch', 'chapter 4', 'the apartment', 'your thesis'
  ];

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0; var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function Constellation(host) {
    this.host = host;
    this.dense = host.hasAttribute('data-dense');
    this.quiet = host.hasAttribute('data-quiet'); // fewer recall pulses
    this.noLabels = host.hasAttribute('data-no-labels'); // ambient background mode
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.css = getComputedStyle(host);
    this.t = 0;
    this.nodes = [];
    this.edges = [];
    this.ripples = [];
    this.pointer = { x: 0.5, y: 0.5, active: false };
    this.build();
    this.resize();
    this.bind();
    this.draw(); // always paint a first frame (rAF is paused while the tab is hidden)
    if (!reduce) { this.last = performance.now(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop); }
  }

  Constellation.prototype.color = function (name, fallback) {
    var v = this.css.getPropertyValue(name);
    return (v && v.trim()) || fallback;
  };

  Constellation.prototype.build = function () {
    var intent = readIntent();
    var labels = shuffle(POOL);
    var count = this.dense ? 9 : 7;
    var picked = labels.slice(0, count - 1);
    // The visitor's own intention becomes a node — front and centre of the ring.
    picked.unshift(intent ? truncate(cap(intent), 22) : 'your goal');
    this.youIndex = 0; // index of the intention node (gets the brand colour)

    // Core node — ZAKI itself
    this.nodes.push({ core: true, bx: 0.5, by: 0.5, x: 0.5, y: 0.5, r: 22, label: 'ZAKI', phase: 0, amp: 0 });

    // Ring of memory nodes
    var n = picked.length;
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 - Math.PI / 2 + (Math.random() - 0.5) * 0.25;
      var rad = (this.dense ? 0.34 : 0.36) + (Math.random() - 0.5) * 0.10;
      var bx = 0.5 + Math.cos(ang) * rad * 0.92;
      var by = 0.5 + Math.sin(ang) * rad;
      this.nodes.push({
        core: false, you: i === this.youIndex,
        bx: bx, by: by, x: bx, y: by,
        r: i === this.youIndex ? 9 : 5 + Math.random() * 3,
        label: picked[i],
        phase: Math.random() * Math.PI * 2,
        speed: 0.18 + Math.random() * 0.22,
        driftA: 0.010 + Math.random() * 0.014,
        born: 0, lit: 1
      });
    }

    // Edges: core → every memory, plus a few memory↔memory threads
    for (var k = 1; k < this.nodes.length; k++) this.edges.push({ a: 0, b: k, live: this.nodes[k].you });
    var ring = this.nodes.length - 1;
    var links = this.dense ? 5 : 3;
    for (var l = 0; l < links; l++) {
      var a = 1 + ((Math.random() * ring) | 0);
      var b = 1 + ((Math.random() * ring) | 0);
      if (a !== b) this.edges.push({ a: a, b: b, live: false });
    }

    // schedule recall pulses + new-memory births
    this.nextPulse = (this.quiet ? 4200 : 2600) + Math.random() * 1800;
    this.nextBirth = 5200 + Math.random() * 2600;
  };

  Constellation.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = this.host.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reduce) this.draw();
  };

  Constellation.prototype.bind = function () {
    var self = this;
    this._onResize = function () { self.resize(); };
    window.addEventListener('resize', this._onResize, { passive: true });
    if ('ResizeObserver' in window) { this._ro = new ResizeObserver(this._onResize); this._ro.observe(this.host); }
    if (!reduce) {
      this.host.addEventListener('pointermove', function (e) {
        var r = self.host.getBoundingClientRect();
        self.pointer.x = (e.clientX - r.left) / r.width;
        self.pointer.y = (e.clientY - r.top) / r.height;
        self.pointer.active = true;
      });
      this.host.addEventListener('pointerleave', function () { self.pointer.active = false; });
      self.offscreen = false;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { self.offscreen = !es[0].isIntersecting; }, { threshold: 0 }).observe(this.host);
      }
    }
  };

  Constellation.prototype.px = function (nx) { return nx * this.w; };
  Constellation.prototype.py = function (ny) { return ny * this.h; };

  Constellation.prototype.loop = function (now) {
    requestAnimationFrame(this.loop);
    // pause the simulation when the tab is hidden or the graph is scrolled off-screen
    // (it's scene 4 of 7) — no point burning battery/CPU on an invisible canvas.
    if (document.hidden || this.offscreen) { this.last = now; return; }
    var dt = Math.min(48, now - this.last); this.last = now; this.t += dt;
    this.update(dt);
    this.draw();
  };

  Constellation.prototype.update = function (dt) {
    var ts = this.t / 1000;
    for (var i = 1; i < this.nodes.length; i++) {
      var nd = this.nodes[i];
      // gentle orbital drift around base position
      nd.x = nd.bx + Math.cos(ts * nd.speed + nd.phase) * nd.driftA;
      nd.y = nd.by + Math.sin(ts * nd.speed * 0.9 + nd.phase) * nd.driftA;
      // subtle pointer parallax
      if (this.pointer.active) {
        var dx = nd.bx - this.pointer.x, dy = nd.by - this.pointer.y;
        var d = Math.sqrt(dx * dx + dy * dy) + 0.001;
        var pull = Math.max(0, 0.16 - d) * 0.5;
        nd.x += (dx / d) * pull; nd.y += (dy / d) * pull;
      }
      if (nd.born < 1) nd.born = Math.min(1, nd.born + dt / 700);
    }
    // core breathing
    this.nodes[0].amp = 1 + Math.sin(ts * 1.1) * 0.05;

    // recall pulses
    this.nextPulse -= dt;
    if (this.nextPulse <= 0) {
      this.nextPulse = (this.quiet ? 4200 : 2600) + Math.random() * 2000;
      var idx = 1 + ((Math.random() * (this.nodes.length - 1)) | 0);
      this.ripples.push({ node: idx, r: this.nodes[idx].r, life: 0 });
      // briefly light the edge from core to that node
      for (var e = 0; e < this.edges.length; e++) {
        if (this.edges[e].a === 0 && this.edges[e].b === idx) this.edges[e].flash = 1;
      }
    }
    // advance ripples
    for (var rp = this.ripples.length - 1; rp >= 0; rp--) {
      this.ripples[rp].life += dt / 1100;
      if (this.ripples[rp].life >= 1) this.ripples.splice(rp, 1);
    }
    // decay edge flashes
    for (var f = 0; f < this.edges.length; f++) if (this.edges[f].flash) this.edges[f].flash = Math.max(0, this.edges[f].flash - dt / 900);

    // new-memory births: relight a dim node
    this.nextBirth -= dt;
    if (this.nextBirth <= 0) {
      this.nextBirth = 6000 + Math.random() * 3000;
      var bi = 1 + ((Math.random() * (this.nodes.length - 1)) | 0);
      this.nodes[bi].born = 0;
      this.nodes[bi].label = this.nodes[bi].you ? this.nodes[bi].label : POOL[(Math.random() * POOL.length) | 0];
    }
  };

  Constellation.prototype.draw = function () {
    var ctx = this.ctx, ts = this.t / 1000;
    ctx.clearRect(0, 0, this.w, this.h);
    var line = this.color('--con-line', 'rgba(136,131,120,0.30)');
    var lineLive = this.color('--con-line-live', 'rgba(33,145,113,0.7)');
    var core = this.color('--con-core', '#29C39A');
    var nodeCol = this.color('--con-node', 'rgba(136,131,120,0.9)');
    var youCol = this.color('--con-you', '#FA2E2E');
    var labelCol = this.color('--con-label', 'rgba(136,131,120,0.85)');

    // edges
    for (var e = 0; e < this.edges.length; e++) {
      var ed = this.edges[e], A = this.nodes[ed.a], B = this.nodes[ed.b];
      var ax = this.px(A.x), ay = this.py(A.y), bx = this.px(B.x), by = this.py(B.y);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      var flash = ed.flash || 0;
      if (ed.live || flash > 0.01) {
        ctx.strokeStyle = lineLive; ctx.globalAlpha = 0.35 + flash * 0.5 + (ed.live ? 0.15 : 0);
        ctx.lineWidth = 1.3; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -(ts * 22 % 1000);
      } else {
        ctx.strokeStyle = line; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.setLineDash([]);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // a travelling spark along live edges (signature "recall in motion")
    for (var le = 0; le < this.edges.length; le++) {
      var L = this.edges[le]; if (!(L.live || (L.flash || 0) > 0.2)) continue;
      var na = this.nodes[L.a], nb = this.nodes[L.b];
      var p = (ts * 0.35 + le * 0.27) % 1;
      var sx = this.px(na.x + (nb.x - na.x) * p), sy = this.py(na.y + (nb.y - na.y) * p);
      ctx.beginPath(); ctx.arc(sx, sy, 2.1, 0, Math.PI * 2);
      ctx.fillStyle = core; ctx.globalAlpha = 0.9 * (L.live ? 1 : (L.flash || 0)); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ripples (recall)
    for (var r = 0; r < this.ripples.length; r++) {
      var rp = this.ripples[r], nd0 = this.nodes[rp.node];
      var rad = nd0.r + rp.life * 26;
      ctx.beginPath(); ctx.arc(this.px(nd0.x), this.py(nd0.y), rad, 0, Math.PI * 2);
      ctx.strokeStyle = nd0.you ? youCol : core; ctx.globalAlpha = (1 - rp.life) * 0.5; ctx.lineWidth = 1.4; ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // nodes
    for (var i = this.nodes.length - 1; i >= 0; i--) {
      var nd = this.nodes[i];
      var x = this.px(nd.x), y = this.py(nd.y);
      if (nd.core) {
        var R = nd.r * (nd.amp || 1);
        var g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
        g.addColorStop(0, this.color('--con-glow', 'rgba(41,195,154,0.32)'));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fillStyle = core; ctx.globalAlpha = 0.16; ctx.fill();
        ctx.globalAlpha = 1; ctx.lineWidth = 1.6; ctx.strokeStyle = core; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, R * 0.32, 0, Math.PI * 2); ctx.fillStyle = core; ctx.fill();
        continue;
      }
      var b = nd.born; var alpha = 0.35 + b * 0.65;
      // node disc
      ctx.beginPath(); ctx.arc(x, y, nd.r, 0, Math.PI * 2);
      ctx.fillStyle = nd.you ? youCol : nodeCol; ctx.globalAlpha = alpha; ctx.fill();
      if (nd.you) {
        ctx.globalAlpha = 0.9; ctx.lineWidth = 1.4; ctx.strokeStyle = youCol;
        ctx.beginPath(); ctx.arc(x, y, nd.r + 4, 0, Math.PI * 2); ctx.stroke();
      }
      // label
      if (this.noLabels) { ctx.globalAlpha = 1; continue; }
      ctx.globalAlpha = alpha * 0.92;
      ctx.font = (nd.you ? '600 ' : '') + '11px "DM Mono","SF Mono",ui-monospace,monospace';
      ctx.textBaseline = 'middle';
      var below = nd.y > 0.52;
      ctx.textAlign = 'center';
      ctx.fillStyle = nd.you ? youCol : labelCol;
      ctx.fillText(nd.label, x, y + (below ? nd.r + 12 : -nd.r - 12));
      ctx.globalAlpha = 1;
    }
  };

  Constellation.prototype.destroy = function () {
    window.removeEventListener('resize', this._onResize);
    if (this._ro) this._ro.disconnect();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  function initAll() {
    var hosts = document.querySelectorAll('[data-constellation]');
    for (var i = 0; i < hosts.length; i++) {
      if (!hosts[i].__con) hosts[i].__con = new Constellation(hosts[i]);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAll);
  else initAll();

  window.ZakiConstellation = Constellation;
})();
