/* ============================================================
   MTS Logistics Ltd. — logo-ribbon.js
   Partner logo ribbons (airlines / shipping lines).

   Uses the SAME single-source-of-truth model as the industry carousel
   (verticals-ribbon.js) so all three ribbons drag identically:

   `pos` (pixels scrolled from the start of group 1) is the ONE source of
   truth per ribbon. A requestAnimationFrame autoplay loop advances it,
   and pointer drag / swipe mutates the same `pos`; every frame renders
   `transform: translate3d(-pos, 0, 0)`. The track holds two identical
   logo groups, so `pos` wraps within [0, half) (one group width) for a
   seamless infinite loop with no jump and no duplicated-looking tile.

   Drag works for mouse, touch and trackpad because the tiles' <img>
   elements are pointer-events:none / non-draggable in CSS (so the native
   image-drag can never hijack the gesture) and text selection is
   disabled on the ribbon. Autoplay pauses on hover / drag and while the
   tab is hidden, resuming on visibilitychange. The CSS keyframe on the
   track is only a no-JS fallback; this script disables it and takes over.
   No CDN / font / network dependency.
   ============================================================ */
(function () {
  'use strict';

  // Respect the OS "reduce motion" setting: the marquee stops scrolling but
  // stays fully visible and draggable. Read live, so a preference change
  // takes effect without a reload.
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function motionOK() { return !(reduceMotion && reduceMotion.matches); }

  function matrixX(el) {
    var t = getComputedStyle(el).transform;
    var m = t && t.match(/matrix3?d?\(([^)]+)\)/);
    if (!m) return 0;
    var p = m[1].split(',');
    return parseFloat(p.length === 16 ? p[12] : p[4]) || 0;
  }

  document.querySelectorAll('.logo-ribbon').forEach(function (ribbon) {
    var track = ribbon.querySelector('.logo-ribbon-track');
    if (!track) return;

    var LOOP_SECONDS = parseFloat(getComputedStyle(track).animationDuration) || 44;
    var sign = ribbon.classList.contains('logo-ribbon--reverse') ? -1 : 1;

    var pos = 0;        // SOURCE OF TRUTH: pixels scrolled
    var half = 0;       // width of one logo group (loop period)
    var speed = 0;      // px/second
    var hovering = false;
    var focused = false;
    var dragging = false;
    var raf = null;
    var lastT = 0;
    var pid = null, startClientX = 0, startPos = 0, moved = 0;

    function measure() { var w = track.scrollWidth; if (w) { half = w / 2; speed = half / LOOP_SECONDS; } }
    function wrap() { if (half) pos = ((pos % half) + half) % half; }
    function render() { track.style.transition = 'none'; track.style.transform = 'translate3d(' + (-pos) + 'px, 0, 0)'; }

    function frame(t) {
      var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
      lastT = t;
      if (half && !hovering && !focused && !dragging && motionOK()) { pos += sign * speed * dt; wrap(); render(); }
      raf = requestAnimationFrame(frame);
    }
    function startLoop() { if (raf == null) { lastT = 0; raf = requestAnimationFrame(frame); } }
    function stopLoop() { if (raf != null) { cancelAnimationFrame(raf); raf = null; } }

    /* ---------- Pointer drag / swipe (mouse, touch, trackpad) ---------- */
    function down(e) {
      if (e.button != null && e.button !== 0) return;
      if (window.getSelection) {
        try { window.getSelection().removeAllRanges(); } catch (err) {}
      }
      pid = e.pointerId; dragging = true; moved = 0;
      startClientX = e.clientX; startPos = pos;
      ribbon.classList.add('is-dragging');
      if (ribbon.setPointerCapture) { try { ribbon.setPointerCapture(pid); } catch (err) {} }
    }
    function moveFn(e) {
      if (!dragging || (pid !== null && e.pointerId !== pid)) return;
      var dx = e.clientX - startClientX;
      moved = Math.max(moved, Math.abs(dx));
      pos = startPos - dx;
      wrap(); render();
    }
    function upFn() {
      if (!dragging) return;
      dragging = false; pid = null;
      ribbon.classList.remove('is-dragging');
      wrap(); render();
    }

    ribbon.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', moveFn);
    window.addEventListener('pointerup', upFn);
    window.addEventListener('pointercancel', upFn);
    window.addEventListener('blur', upFn);

    /* ---------- Card selection / active state (isolated per ribbon) ---------- */
    ribbon.addEventListener('click', function (e) {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      var tile = e.target.closest('.logo-tile');
      if (!tile || !track.contains(tile)) return;

      var isAlreadySelected = tile.classList.contains('is-selected') || tile.classList.contains('active');

      // Clear selection from all tiles in this ribbon only
      track.querySelectorAll('.logo-tile').forEach(function (t) {
        t.classList.remove('is-selected', 'active');
        t.removeAttribute('aria-selected');
      });

      // If not already selected, select this clicked tile
      if (!isAlreadySelected) {
        tile.classList.add('is-selected', 'active');
        tile.setAttribute('aria-selected', 'true');
      }
    });

    ribbon.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        var tile = e.target.closest('.logo-tile');
        if (tile && track.contains(tile)) {
          e.preventDefault();
          tile.click();
        }
      }
    });

    /* Extra guard: cancel any native drag that slips through. */
    ribbon.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* ---------- Hover pause ---------- */
    ribbon.addEventListener('mouseenter', function () { hovering = true; });
    ribbon.addEventListener('mouseleave', function () { hovering = false; });
    /* Keyboard equivalent of the hover pause (WCAG 2.2.2) */
    ribbon.addEventListener('focusin', function () { focused = true; });
    ribbon.addEventListener('focusout', function () { focused = false; });

    /* ---------- Measurement / lifecycle ---------- */
    measure();
    var seed = matrixX(track);                 // adopt CSS-fallback position, then take over
    if (seed) { pos = -seed; wrap(); }
    track.style.animation = 'none';            // JS is now the single source of truth
    render();

    window.addEventListener('load', measure);
    window.addEventListener('resize', function () {
      var ratio = half ? pos / half : 0;
      measure();
      pos = ratio * half;                      // keep relative position across resize
      wrap();
      if (!dragging) render();
    });
    track.querySelectorAll('img').forEach(function (img) {
      if (!img.complete) img.addEventListener('load', measure, { once: true });
    });
    if ('ResizeObserver' in window) { try { new ResizeObserver(measure).observe(track); } catch (e) {} }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stopLoop(); } else { lastT = 0; startLoop(); }
    });

    startLoop();
  });
})();
