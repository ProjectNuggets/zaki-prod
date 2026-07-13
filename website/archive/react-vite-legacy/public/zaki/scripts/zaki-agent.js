/* ============================================================
   ZAKI Agent — interactions
   ============================================================ */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $all = function (s, c) { return [].slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  root.classList.add('is-ready');
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, reduce ? Math.min(ms, 120) : ms); }); };

  /* ---------- ENGINE FAILSAFE: if rAF never ticks (offscreen/throttled frame),
     CSS transitions freeze at opacity:0 — force visible end-state. ---------- */
  (function () {
    function forceVisible() {
      root.classList.add('no-anim');
      $all('.reveal').forEach(function (el) { el.classList.add('in'); });
    }
    function check() {
      var el = document.querySelector('.reveal.in') || document.querySelector('.reveal');
      if (!el) return;
      if (parseFloat(getComputedStyle(el).opacity) < 0.5) forceVisible();
    }
    setTimeout(check, 1100);
    setTimeout(check, 2400);
  })();

  /* ---------- NAME (bonding, persisted) ---------- */
  var NAME_KEY = 'zaki_agent_name';
  function getName() { try { return (localStorage.getItem(NAME_KEY) || '').trim(); } catch (e) { return ''; } }
  function nameOr(d) { return getName() || d; }
  function setName(n) {
    n = (n || '').trim().slice(0, 18); if (!n) return;
    try { localStorage.setItem(NAME_KEY, n); } catch (e) {}
    applyName();
  }
  function applyName() {
    var n = nameOr('Zee');
    $all('#cb-name,#hero-tag-name').forEach(function (e) { e.textContent = n; });
    var cta = $('#cta-name'); if (cta) cta.textContent = n;
    var inp = $('#namer-input'); if (inp && getName()) inp.value = getName();
  }

  /* ---------- BOT MOOD ---------- */
  function bot(el, mood) {
    if (!el) return;
    var src = '/zaki/bot/' + mood + '.png';
    if (el.getAttribute('src') === src) return;
    el.setAttribute('src', src);
    el.classList.remove('react'); void el.offsetWidth; el.classList.add('react');
  }

  /* ---------- HERO namer ---------- */
  (function () {
    var form = $('#namer-form'), inp = $('#namer-input'), greet = $('#namer-greet'), hb = $('#hero-bot');
    applyName();
    if (getName()) { showGreet(getName(), true); }
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = inp.value.trim() || 'Zee';
      setName(n);
      bot(hb, 'heart');
      showGreet(n, false);
    });
    function showGreet(n, quiet) {
      var lines = [
        'Hi, I\u2019m <em>' + esc(n) + '</em>. I already read the room. Let\u2019s get you some time back.',
        '<em>' + esc(n) + '</em> here. Point me at the worst thing on your list \u2014 I\u2019ll start there.',
        'Locked in. I\u2019m <em>' + esc(n) + '</em>, and I don\u2019t do \u201Cmaybe later.\u201D'
      ];
      greet.innerHTML = quiet ? 'Welcome back. <em>' + esc(n) + '</em> is online and slightly impatient.' : lines[(Math.random() * lines.length) | 0];
      greet.hidden = false; requestAnimationFrame(function () { greet.classList.add('in'); });
      if (!quiet) bot(hb, 'grin');
    }
  })();
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- MISSIONS ---------- */
  var ICON = { check: '\u2726', act: '\u2315', draft: '\u270E', done: '\u2713' };
  function step(t, k, text, dur, mood) { return { t: t, k: k, text: text, dur: dur, mood: mood }; }
  function gate(title, body, mood) { return { t: 'gate', title: title, body: body, mood: mood || 'thinking' }; }

  var MISSIONS = [
    { goal: 'Plan Maya\u2019s surprise party', steps: [
      step('check', 'remembering', 'Pulled what I know \u2014 Maya\u2019s in your contacts, birthday\u2019s the 14th, you flagged it last month.', 1100, 'thinking'),
      step('act', 'researching', 'Scanned 23 venues within 4km. Killed the 20 that were booked, beige, or both.', 1500, 'grin'),
      step('check', 'using memory', 'You once said Maya hates a <b>big</b> fuss. Capping the list at 12, keeping it cozy.', 1200, 'heart'),
      step('draft', 'drafting', 'Wrote the invite \u2014 warm, short, zero cringe. Cake: ordered (pending your yes).', 1300, 'happy'),
      gate('Text 12 people the invite', 'Drafts are ready and the venue is holding 7pm Saturday. Send the texts and confirm the booking?'),
      step('done', 'done', 'Sent. Venue confirmed. 3 RSVPs already. We\u2019re good. \uD83C\uDF82', 900, 'hop')
    ]},
    { goal: 'Find a dentist open Saturday', steps: [
      step('check', 'remembering', 'Grabbed your insurance from the vault \u2014 Delta PPO. Noted.', 1000, 'thinking'),
      step('act', 'researching', 'Checked 6 clinics near you. Two open Saturday, one\u2019s in-network.', 1400, 'grin'),
      step('check', 'comparing', 'In-network one has a 10:30 slot. The other wants $$$ and a deposit. Easy call.', 1200, 'surprised'),
      step('draft', 'prepping', 'Pre-filled the new-patient form with your details. Just the booking left.', 1200, 'happy'),
      gate('Confirm Saturday 10:30am', 'Dr. Okafor, in-network, 10:30 Saturday. Want me to lock it in?'),
      step('done', 'done', 'Booked. Added to your calendar with a \u201Cleave by 10:05\u201D nudge. Floss, maybe? \uD83E\uDDB7', 900, 'hop')
    ]},
    { goal: 'Untangle my inbox', steps: [
      step('act', 'triaging', '147 unread. Don\u2019t panic \u2014 I did the panicking for you.', 1100, 'thinking'),
      step('act', 'clearing', 'Archived 121 newsletters you haven\u2019t opened since March. Bold, I know.', 1400, 'grin'),
      step('check', 'flagging', 'Four actually need a human: your landlord, two from work, and grandma.', 1200, 'heart'),
      step('draft', 'drafting', 'Drafted replies to all four. Short, kind, in your voice.', 1300, 'happy'),
      gate('Send 4 replies', 'Four drafts ready \u2014 landlord, 2\u00D7 work, grandma. Send as-is, or peek first?'),
      step('done', 'done', 'Sent. Inbox: zero. Savour it \u2014 it won\u2019t last. \u2728', 900, 'hop')
    ]},
    { goal: 'Replan the trip \u2014 flight got cancelled', steps: [
      step('check', 'noticing', 'Saw the cancellation land. Already on it before you finished reading it.', 1000, 'surprised'),
      step('act', 'researching', 'Found 3 rebooking options. One gets you in only 40 min later, same price.', 1500, 'grin'),
      step('check', 'cross-checking', 'Your hotel check-in is flexible till midnight \u2014 no change needed there. Phew.', 1200, 'heart'),
      step('draft', 'drafting', 'Drafted the \u201Cflight changed, new time below\u201D note for the group chat.', 1200, 'happy'),
      gate('Rebook + tell the group', 'Rebook the 6:50pm (same fare) and post to \u201CLisbon crew\u201D? Nothing\u2019s booked yet.'),
      step('done', 'done', 'Rebooked. Group\u2019s notified. Two people already called you a legend. Accurate. \u2708\uFE0F', 900, 'hop')
    ]}
  ];

  function customMission(goal) {
    var g = esc(goal);
    return { goal: goal, steps: [
      step('check', 'thinking', 'On it. Let me work out what \u201C' + g + '\u201D actually needs.', 1100, 'thinking'),
      step('act', 'researching', 'Looked into it \u2014 gathered the real options and ruled out the junk.', 1500, 'grin'),
      step('check', 'using memory', 'Cross-checked against what I know about you and adjusted accordingly.', 1200, 'heart'),
      step('draft', 'drafting', 'Put together everything that\u2019s ready to go.', 1200, 'happy'),
      gate('Finish \u201C' + g + '\u201D', 'Everything\u2019s prepped. There\u2019s one step that leaves the building \u2014 want me to go ahead?'),
      step('done', 'done', '\u201C' + g + '\u201D \u2014 handled. Told you. \uD83D\uDE0E', 900, 'sunglasses')
    ]};
  }

  /* ---------- RUNNER ---------- */
  var running = false;
  var els = {
    log: $('#run-log'), empty: $('#console-empty'), state: $('#cb-state'), clock: $('#cb-clock'),
    cbBot: $('#cb-bot'), input: $('#goal-input'), send: $('#goal-send'), presets: $all('.preset')
  };
  var clockTimer = null;

  function setState(s) { if (els.state) els.state.textContent = s; }
  function startClock() {
    var t0 = Date.now();
    clearInterval(clockTimer);
    clockTimer = setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      els.clock.textContent = ('0' + ((s / 60) | 0)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
    }, 1000);
    els.clock.textContent = '00:00';
  }
  function stopClock() { clearInterval(clockTimer); }

  function rowEl(s) {
    var row = doc.createElement('div');
    row.className = 'log-row pending'; row.setAttribute('data-t', s.t);
    row.innerHTML = '<span class="log-ic"><span class="log-spin"></span></span>' +
      '<div><div class="log-k">' + s.k + '</div><div class="log-text">' + s.text + '</div></div>';
    return row;
  }
  function resolveRow(row, s) {
    row.classList.remove('pending');
    $('.log-ic', row).innerHTML = ICON[s.t] || ICON.act;
  }

  function gateEl(g) {
    var wrap = doc.createElement('div'); wrap.className = 'log-row'; wrap.setAttribute('data-t', 'gate');
    wrap.innerHTML =
      '<span class="log-ic">\uD83D\uDD12</span>' +
      '<div class="log-gate"><div class="log-gate-h"><span class="status live">Needs your OK</span><span class="log-gate-t">' + g.title + '</span></div>' +
      '<div class="log-gate-b">' + g.body + '</div>' +
      '<div class="log-gate-actions"><button class="btn btn-ghost btn-sm g-no">Not yet</button><button class="btn btn-primary btn-sm g-yes">Approve &amp; go</button></div>' +
      '<div class="log-gate-ok"><img src="/zaki/bot/heart.png" alt="">Approved \u2014 finishing up.</div></div>';
    return wrap;
  }

  function scrollLog() { var b = $('#console-body'); if (b) b.scrollTop = b.scrollHeight; }

  async function run(mission) {
    if (running) return;
    running = true;
    els.empty && els.empty.classList.add('gone');
    els.log.innerHTML = '';
    els.input.value = ''; els.send.disabled = true;
    els.presets.forEach(function (p) { p.classList.add('busy'); });
    startClock();

    for (var i = 0; i < mission.steps.length; i++) {
      var s = mission.steps[i];
      if (s.t === 'gate') {
        setState('waiting on you'); bot(els.cbBot, s.mood);
        var card = gateEl(s); els.log.appendChild(card); scrollLog();
        var ok = await waitGate(card);
        if (!ok) {
          setState('holding \u2014 your call');
          var hold = doc.createElement('div'); hold.className = 'log-row'; hold.setAttribute('data-t', 'check');
          hold.innerHTML = '<span class="log-ic">\u2726</span><div><div class="log-k">standing by</div><div class="log-text">No rush. I\u2019ll hold it right here \u2014 hit approve whenever you\u2019re ready.</div></div>';
          els.log.appendChild(hold); scrollLog();
          bot(els.cbBot, 'wink');
          finish(false); return;
        }
        $('.log-gate', card).classList.add('resolved');
        continue;
      }
      setState(s.k + '\u2026'); bot(els.cbBot, s.mood);
      var row = rowEl(s); els.log.appendChild(row); scrollLog();
      await sleep(s.dur);
      resolveRow(row, s); scrollLog();
      if (s.t === 'done') { setState('done \u2014 we make a good team'); }
    }
    stopClock();
    finish(true);
  }

  function waitGate(card) {
    return new Promise(function (resolve) {
      $('.g-yes', card).addEventListener('click', function () { resolve(true); });
      $('.g-no', card).addEventListener('click', function () { resolve(false); });
    });
  }
  function finish(done) {
    running = false;
    els.send.disabled = false;
    els.presets.forEach(function (p) { p.classList.remove('busy'); });
    if (done) stopClock();
  }

  // wire presets + input
  els.presets.forEach(function (p) {
    p.addEventListener('click', function () { if (running) return; run(MISSIONS[+p.getAttribute('data-mission')]); });
  });
  function sendCustom() {
    if (running) return;
    var g = els.input.value.trim();
    if (!g) { els.input.focus(); return; }
    run(customMission(g));
  }
  els.send.addEventListener('click', sendCustom);
  els.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendCustom(); } });

  /* ---------- BOUNDARY demo ---------- */
  (function () {
    var yes = $('#permit-yes'), no = $('#permit-no'), done = $('#permit-done'), actions = $('.permit-actions'), bd = $('.bd-bot');
    if (!yes) return;
    yes.addEventListener('click', function () { actions.style.display = 'none'; done.hidden = false; bot(bd, 'heart'); });
    no.addEventListener('click', function () { bot(bd, 'wink'); no.textContent = 'Holding\u2026'; setTimeout(function () { no.textContent = 'Not yet'; }, 1400); });
  })();

  /* ---------- SCROLL cue ---------- */
  var cue = $('#scroll-cue'); if (cue) cue.addEventListener('click', function () { var t = $('#run'); if (t) window.scrollTo({ top: t.offsetTop - 70, behavior: reduce ? 'auto' : 'smooth' }); });

  /* ---------- SCROLL progress ---------- */
  var prog = $('#scroll-progress');
  function onScroll() {
    if (prog) {
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
    }
    // body stage follows nearest section for nav contrast
    var secs = $all('[data-stage]'); var mid = window.scrollY + window.innerHeight * 0.32, st = 'dark';
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

  /* ---------- HERO dots parallax (subtle) ---------- */
  (function () {
    var d = $('#ahero-dots'); if (!d || reduce) return;
    window.addEventListener('scroll', function () { d.style.transform = 'translateY(' + (window.scrollY * 0.08) + 'px)'; }, { passive: true });
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

  /* nav scrolled state */
  (function () {
    var nav = $('#nav');
    var f = function () { nav.classList.toggle('scrolled', window.scrollY > 12); };
    window.addEventListener('scroll', f, { passive: true }); f();
  })();

  onScroll();
})();
