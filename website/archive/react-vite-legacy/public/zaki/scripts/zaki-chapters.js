/* ============================================================
   ZAKI — Chapter interactions
   CH.2 morph · CH.3 intention (local, optional, editable)
   Personalization echoes into later chapters via [data-intent-echo].
   ============================================================ */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var doc = document;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $all(s, r) { return [].slice.call((r || doc).querySelectorAll(s)); }

  /* ---------- CH.2 — morphing word, synced to forms list ---------- */
  (function () {
    var word = $('#morph-word'), forms = $all('.reframe-forms .rf');
    if (!word || !forms.length) return;
    var seq = forms.map(function (f) { return { w: f.getAttribute('data-w'), el: f }; });
    var i = 0;
    function show(n) {
      seq.forEach(function (s, k) { s.el.classList.toggle('on', k === n); });
      if (reduce) { word.textContent = seq[n].w; return; }
      word.style.transition = 'opacity .25s ease,transform .25s ease';
      word.style.opacity = '0'; word.style.transform = 'translateY(6px)';
      setTimeout(function () {
        word.textContent = seq[n].w;
        word.style.opacity = '1'; word.style.transform = 'none';
      }, 250);
    }
    show(0);
    if (reduce) return;
    var timer = null, running = false;
    function tick() { i = (i + 1) % seq.length; show(i); }
    function start() { if (running) return; running = true; timer = setInterval(tick, 2400); }
    function stop() { running = false; clearInterval(timer); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? start() : stop(); }); }, { threshold: 0.3 });
      io.observe($('#reframe'));
    } else start();
    // hover a form to focus its word
    forms.forEach(function (f, k) {
      f.addEventListener('mouseenter', function () { stop(); i = k; show(k); });
      f.addEventListener('mouseleave', function () { start(); });
    });
  })();

  /* ---------- CH.3 — INTENTION (local memory) ---------- */
  (function () {
    var KEY = 'zaki_intent_v1';
    var pick = $('#intent-pick'), form = $('#intent-form'), input = $('#intent-input');
    var remembered = $('#intent-remembered'), valueEl = $('#intent-value');
    var editBtn = $('#intent-edit'), forgetBtn = $('#intent-forget');
    if (!pick) return;

    function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
    function write(v) { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {} }

    function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

    function echo(intent) {
      // update personalized spots elsewhere on the page
      $all('[data-intent-echo]').forEach(function (el) {
        var fallback = el.getAttribute('data-eg-fallback') || el.getAttribute('data-intent-echo');
        el.textContent = intent ? cap(intent.text) : fallback;
      });
      doc.body.classList.toggle('has-intent', !!intent);
      // contextual CTA
      var cta = $('#cta-primary');
      if (cta) {
        var span = cta.querySelector('.cta-label');
        if (span) span.textContent = intent ? ('Continue: ' + cap(intent.text)) : "Enter ZAKI's mind";
      }
    }

    function showRemembered(intent) {
      valueEl.textContent = cap(intent.text);
      remembered.hidden = false;
      echo(intent);
    }
    function clearRemembered() {
      remembered.hidden = true;
      $all('.intent-chip').forEach(function (c) { c.classList.remove('sel'); });
      if (input) input.value = '';
      echo(null);
    }

    function set(text, key) {
      if (!text) return;
      var intent = { text: text.trim(), key: key || 'custom' };
      write(intent); showRemembered(intent);
      if (!reduce) remembered.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    pick.addEventListener('click', function (e) {
      var b = e.target.closest('.intent-chip'); if (!b) return;
      $all('.intent-chip').forEach(function (c) { c.classList.toggle('sel', c === b); });
      set(b.getAttribute('data-eg'), b.getAttribute('data-key'));
    });
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); if (input.value.trim()) { $all('.intent-chip').forEach(function (c) { c.classList.remove('sel'); }); set(input.value, 'custom'); } });

    // listening gesture — bot leans toward the visitor's input
    var section = document.getElementById('intention'), stateEl = document.getElementById('intent-state');
    function listen(on) { if (section) section.classList.toggle('listening', on); if (stateEl) stateEl.textContent = on ? 'Listening…' : 'Listening'; }
    if (input) { input.addEventListener('focus', function () { listen(true); }); input.addEventListener('blur', function () { listen(false); }); input.addEventListener('input', function () { listen(true); }); }
    if (pick) pick.addEventListener('mouseover', function () { listen(true); });
    if (pick) pick.addEventListener('mouseleave', function () { listen(false); });
    if (editBtn) editBtn.addEventListener('click', function () {
      input.value = cap(valueEl.textContent); input.focus(); input.classList.add('edit-flash');
      setTimeout(function () { input.classList.remove('edit-flash'); }, 700);
    });
    if (forgetBtn) forgetBtn.addEventListener('click', function () { write(null); clearRemembered(); });

    // restore
    var saved = read();
    if (saved && saved.text) { showRemembered(saved); var chip = pick.querySelector('[data-key="' + saved.key + '"]'); if (chip) chip.classList.add('sel'); }
    else echo(null);
  })();

  /* ---------- CH.4 — AGENT RUN choreography ---------- */
  (function () {
    var run = $('#run'); if (!run) return;
    var phases = $all('#run-phases li'), tools = $all('#run-tools .tool');
    var deliver = $('#run-deliverables'), learn = $('#run-learn');
    function finish() {
      phases.forEach(function (p) { p.classList.remove('active'); p.classList.add('done'); });
      tools.forEach(function (t) { t.classList.add('on'); });
      if (deliver) deliver.classList.add('on');
      if (learn) learn.classList.add('on');
    }
    if (reduce) { finish(); return; }
    setTimeout(function () { if (document.documentElement.classList.contains('no-anim')) finish(); }, 1150);
    var started = false;
    function play() {
      if (started) return; started = true;
      var i = 0;
      function step() {
        if (i > 0) phases[i - 1].classList.remove('active'), phases[i - 1].classList.add('done');
        if (i < phases.length) {
          phases[i].classList.add('active');
          // activate tools as research/creation phases run
          if (i === 2 && tools[0]) tools[0].classList.add('on');
          if (i === 2 && tools[1]) setTimeout(function () { tools[1].classList.add('on'); }, 350);
          if (i === 4 && tools[2]) tools[2].classList.add('on');
          if (i === 4 && tools[3]) setTimeout(function () { tools[3].classList.add('on'); }, 350);
          i++;
          setTimeout(step, i === 1 ? 850 : 780);
        } else {
          if (deliver) deliver.classList.add('on');
          setTimeout(function () { if (learn) learn.classList.add('on'); }, 450);
        }
      }
      step();
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { setTimeout(play, 300); io.disconnect(); } }); }, { threshold: 0.35 });
      io.observe(run);
    } else play();
    // failsafe
    setTimeout(function () { if (!started && run.getBoundingClientRect().top < window.innerHeight) play(); }, 2500);
  })();

  /* ---------- CH.5 — MEMORY inspector (selectable) ---------- */
  (function () {
    var list = $('#mem-list'); if (!list) return;
    list.addEventListener('click', function (e) {
      var li = e.target.closest('.mem-item'); if (!li) return;
      $all('.mem-item', list).forEach(function (x) { x.classList.toggle('sel', x === li); });
      if (!reduce && li.animate) {
        li.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  })();

  /* ---------- CH.11 — TRUST boundary signature ---------- */
  (function () {
    var scene = $('#boundary-scene'); if (!scene) return;
    var presence = $('#boundary-presence'), trail = $('#boundary-trail'), wait = $('#boundary-wait');
    function settle() {
      if (presence) presence.style.left = '58%';
      if (trail) trail.style.width = '54%';
      if (wait) wait.classList.add('on');
      if (presence && !reduce) presence.classList.add('turn');
    }
    if (reduce) { settle(); return; }
    var started = false;
    function play() { if (started) return; started = true; setTimeout(settle, 350); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { play(); io.disconnect(); } }); }, { threshold: 0.4 });
      io.observe(scene);
    } else play();
    setTimeout(function () { if (!started && document.documentElement.classList.contains('no-anim')) settle(); }, 1150);

    // permission decision — only on your approval does ZAKI cross the boundary
    var card = $('.permission-card'), approve = $('.pc-btn.approve'), deny = $('.pc-btn.deny');
    var actions = $('.pc-actions');
    if (approve && card) approve.addEventListener('click', function () {
      card.classList.remove('denied'); card.classList.add('approved');
      if (actions) actions.style.display = 'none';
      if (trail) trail.style.width = '94%';
      if (presence) { presence.classList.remove('turn'); presence.style.left = '90%'; }
      if (wait) wait.textContent = 'Approved · crossing to send';
    });
    if (deny && card) deny.addEventListener('click', function () {
      card.classList.add('denied');
      if (wait) wait.textContent = 'Held · waits for you';
    });
  })();
})();
