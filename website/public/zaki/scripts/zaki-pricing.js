/* ============================================================
   ZAKI Pricing — billing toggle + FAQ accordion
   ============================================================ */
(function () {
  'use strict';
  var doc = document;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ---------- BILLING TOGGLE ---------- */
  (function () {
    var bill = doc.getElementById('bill');
    if (!bill) return;
    var mBtn = doc.getElementById('bill-monthly');
    var aBtn = doc.getElementById('bill-annual');
    var amts = [].slice.call(doc.querySelectorAll('.plan-amt'));
    var bills = [].slice.call(doc.querySelectorAll('.plan-bill'));
    var pers = [].slice.call(doc.querySelectorAll('.plan-per'));

    function set(cycle) {
      bill.setAttribute('data-cycle', cycle);
      mBtn.classList.toggle('on', cycle === 'monthly');
      aBtn.classList.toggle('on', cycle === 'annual');
      mBtn.setAttribute('aria-pressed', cycle === 'monthly');
      aBtn.setAttribute('aria-pressed', cycle === 'annual');
      amts.forEach(function (el) {
        var v = el.getAttribute('data-' + cycle);
        if (v != null) el.textContent = v;
      });
      bills.forEach(function (el) {
        var v = el.getAttribute('data-' + cycle);
        el.innerHTML = v || '';
      });
      pers.forEach(function (el) {
        if (el.getAttribute('data-static') === '1') return;
        el.textContent = '/mo';
      });
    }
    mBtn.addEventListener('click', function () { set('monthly'); });
    aBtn.addEventListener('click', function () { set('annual'); });
    set('monthly');
  })();

  /* ---------- FAQ ACCORDION ---------- */
  (function () {
    var items = [].slice.call(doc.querySelectorAll('.faq-item'));
    items.forEach(function (item) {
      var q = item.querySelector('.faq-q');
      if (!q) return;
      q.addEventListener('click', function () {
        var isOpen = item.classList.contains('open');
        items.forEach(function (o) { o.classList.remove('open'); var b = o.querySelector('.faq-q'); if (b) b.setAttribute('aria-expanded', 'false'); });
        if (!isOpen) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
      });
    });
    // open the first by default
    if (items[0]) { items[0].classList.add('open'); var fq = items[0].querySelector('.faq-q'); if (fq) fq.setAttribute('aria-expanded', 'true'); }
  })();
})();
