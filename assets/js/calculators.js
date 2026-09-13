/* ============================================================
   MTS Logistics Ltd. — calculators.js
   Shipment Volume (CBM) Calculator + Container Load Estimator
   Inputs always start blank on page load; results show dashes
   until Calculate is pressed. Nothing is persisted.
   ============================================================ */
(function () {
  'use strict';

  var PLACEHOLDER = '\u2014\u2014';

  function num(value) {
    var n = parseFloat(value);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function cbmOf(l, w, h, q) {
    return (num(l) / 100) * (num(w) / 100) * (num(h) / 100) * Math.max(1, num(q));
  }

  // ---------- Tool 1: CBM Calculator ----------
  var cbmForm = document.getElementById('cbm-form');
  if (cbmForm) {
    cbmForm.reset(); // guarantee a blank state on refresh / bfcache restore
    var cbmValue = document.getElementById('cbm-result');
    var cftValue = document.getElementById('cft-result');

    function resetCbmResults() {
      cbmValue.textContent = PLACEHOLDER;
      cftValue.textContent = PLACEHOLDER;
    }

    cbmForm.addEventListener('input', resetCbmResults);
    cbmForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var cbm = cbmOf(cbmForm.l.value, cbmForm.w.value, cbmForm.h.value, cbmForm.q.value);
      cbmValue.textContent = cbm.toFixed(2);
      cftValue.textContent = (cbm * 35.3147).toFixed(1);
    });
    resetCbmResults();
  }

  // ---------- Tool 2: Container Load Estimator ----------
  var estForm = document.getElementById('est-form');
  if (estForm) {
    estForm.reset();
    var estCbm = document.getElementById('est-cbm');
    var estContainer = document.getElementById('est-container');
    var estUtil = document.getElementById('est-util');
    var estBar = document.getElementById('est-bar');

    var CONTAINERS = [
      { name: '20GP Container', cap: 28 },
      { name: '40GP Container', cap: 58 },
      { name: '40HC Container', cap: 68 }
    ];

    function resetEstResults() {
      estCbm.textContent = PLACEHOLDER + ' CBM';
      estContainer.textContent = PLACEHOLDER;
      estUtil.textContent = PLACEHOLDER;
      estBar.style.width = '0%';
    }

    estForm.addEventListener('input', resetEstResults);
    estForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var vol = cbmOf(estForm.l.value, estForm.w.value, estForm.h.value, estForm.q.value);
      var pick = CONTAINERS.filter(function (c) { return vol <= c.cap; })[0] || CONTAINERS[2];
      var utilization = vol > 0 ? Math.min(100, (vol / pick.cap) * 100) : 0;

      estCbm.textContent = vol.toFixed(2) + ' CBM';
      estContainer.textContent = vol > pick.cap ? 'Multiple 40HC' : pick.name;
      estUtil.textContent = utilization.toFixed(0) + '%';
      estBar.style.width = utilization.toFixed(0) + '%';
    });
    resetEstResults();
  }

  // Belt-and-braces: clear both tools when the page is restored from
  // the back/forward cache so no previous values ever persist.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      if (cbmForm) { cbmForm.reset(); cbmForm.dispatchEvent(new Event('input')); }
      if (estForm) { estForm.reset(); estForm.dispatchEvent(new Event('input')); }
    }
  });
})();
