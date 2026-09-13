/* ============================================================
   MTS Logistics Ltd. — slider.js
   Homepage hero slider: autoplay, arrows, dots, keyboard, touch
   ============================================================ */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero) return;

  var slides = hero.querySelectorAll('.hero-slide');
  var dots = hero.querySelectorAll('.hero-dot');
  var prevBtn = hero.querySelector('.hero-arrow--prev');
  var nextBtn = hero.querySelector('.hero-arrow--next');
  var AUTOPLAY_MS = 5500;
  var current = 0;
  var paused = false;
  var touchX = null;

  // Respect the OS "reduce motion" setting: the slider stops auto-advancing,
  // but arrows, dots, swipe and keyboard still work. Re-read live so a
  // preference change mid-session takes effect without a reload.
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function motionOK() { return !(reduceMotion && reduceMotion.matches); }

  function show(index) {
    current = (index + slides.length) % slides.length;
    slides.forEach(function (slide, i) {
      var active = i === current;
      slide.classList.toggle('active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      // An aria-hidden subtree must never contain focusable elements, or
      // keyboard users tab into invisible buttons. `inert` covers modern
      // browsers; the tabindex sweep covers the rest.
      if (active) { slide.removeAttribute('inert'); } else { slide.setAttribute('inert', ''); }
      slide.querySelectorAll('a[href], button').forEach(function (el) {
        if (active) { el.removeAttribute('tabindex'); } else { el.setAttribute('tabindex', '-1'); }
      });
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === current);
    });
  }

  function step(dir) { show(current + dir); }

  if (prevBtn) prevBtn.addEventListener('click', function () { step(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { step(1); });

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { show(i); });
  });

  // Keyboard navigation
  window.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;                                // already handled (e.g. the industry carousel)
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;   // don't hijack form fields
    if (t && t.isContentEditable) return;
    if (t && t.closest && t.closest('.vertical-ribbon, .logo-ribbon')) return;
    var box = hero.getBoundingClientRect();                         // don't change slides the user cannot see
    if (box.bottom <= 0 || box.top >= (window.innerHeight || 0)) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  // Pause autoplay while hovering, and while focus is inside the hero so a
  // keyboard user is never interrupted mid-interaction (WCAG 2.2.2).
  hero.addEventListener('mouseenter', function () { paused = true; });
  hero.addEventListener('mouseleave', function () { paused = false; });
  hero.addEventListener('focusin', function () { paused = true; });
  hero.addEventListener('focusout', function () { paused = false; });

  // Touch swipe
  hero.addEventListener('touchstart', function (e) {
    touchX = e.touches[0].clientX;
  }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    touchX = null;
  });

  // Autoplay
  setInterval(function () {
    if (!paused && motionOK() && !document.hidden) step(1);
  }, AUTOPLAY_MS);

  show(0);
})();
