/* ============================================================
   ZAKI Story — internal-thoughts self-debate stream
   ============================================================ */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  var body = doc.getElementById('debate-body');
  var stat = doc.getElementById('debate-stat');
  var out = doc.getElementById('debate-out');
  var replay = doc.getElementById('debate-replay');
  if (!body) return;

  // who: a = first voice (for), b = second voice (against), r = resolution
  var SCRIPT = [
    { who: 'a', label: 'Thought A', text: 'They asked me to book the 6:50 flight. Same fare, gets them there. I could just do it.' },
    { who: 'b', label: 'Thought B', text: 'Hold on — last month they said never rebook without checking the hotel first. That\u2019s a memory, not a guess.' },
    { who: 'a', label: 'Thought A', text: 'Fair. I pulled it: check-in is flexible till midnight. The later flight still lands at 21:10. No conflict.' },
    { who: 'b', label: 'Thought B', text: 'And it leaves the building — a real booking, real money. That\u2019s the one line we never cross alone.' },
    { who: 'r', label: 'Resolved', text: 'So: prepare the rebooking, confirm the hotel\u2019s fine, and stop at the edge. Ask before I press book.' }
  ];
  var OUTCOME = 'Outcome: <b>drafted the rebooking, waited for your yes.</b>';

  var timers = [];
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function add(item, show) {
    var row = doc.createElement('div');
    row.className = 'thought ' + item.who;
    row.innerHTML = '<span class="thought-who">' + item.label + '</span>' +
      '<div class="thought-bubble">' + item.text + '</div>';
    body.appendChild(row);
    if (show) requestAnimationFrame(function () { row.classList.add('show'); });
    return row;
  }

  function runInstant() {
    body.innerHTML = '';
    SCRIPT.forEach(function (s) { add(s, true); });
    stat.textContent = 'resolved';
    out.innerHTML = OUTCOME;
    replay.hidden = false;
  }

  function run() {
    clearTimers();
    body.innerHTML = '';
    out.innerHTML = '&nbsp;';
    replay.hidden = true;
    stat.textContent = 'deliberating…';
    var delay = 250;
    SCRIPT.forEach(function (s, i) {
      timers.push(setTimeout(function () {
        var row = add(s, false);
        requestAnimationFrame(function () { row.classList.add('show'); });
        body.scrollTop = body.scrollHeight;
        if (s.who === 'r') stat.textContent = 'resolved';
        if (i === SCRIPT.length - 1) {
          timers.push(setTimeout(function () {
            out.innerHTML = OUTCOME;
            replay.hidden = false;
          }, 600));
        }
      }, delay));
      delay += 1150 + s.text.length * 7;
    });
  }

  replay.addEventListener('click', run);

  // start when scrolled into view
  if (reduce || !('IntersectionObserver' in window)) { runInstant(); return; }
  var started = false;
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      if (e.isIntersecting && !started) { started = true; run(); io.unobserve(e.target); }
    });
  }, { threshold: 0.4 });
  io.observe(doc.getElementById('debate'));

  // failsafe: if never triggered (throttled), fill instantly
  setTimeout(function () { if (!started) { started = true; runInstant(); } }, 2600);
})();
