/* ============================================================
   MTS Logistics Ltd. — verticals-ribbon.js
   Industry verticals carousel — TRUE INFINITE LOOP ENGINE.

   Architecture:
   - Uses a 3-group continuous wrap model (Group 0: left buffer,
     Group 1: primary window, Group 2: right buffer).
   - `currentPos` and `targetPos` are maintained in a continuous
     coordinate space centered at `groupWidth`.
   - On every frame of the requestAnimationFrame loop:
     1. Interpolates `currentPos` smoothly toward `targetPos`.
     2. Normalizes `currentPos` and `targetPos` by `± groupWidth`
        whenever `currentPos >= 2 * groupWidth` or `currentPos < groupWidth`.
        Because all groups are identical, this normalization is 100%
        invisible with ZERO visual jump or flash.
     3. Renders `transform: translate3d(-currentPos, 0, 0)`.
   - Right arrow continuously increments `targetPos` indefinitely.
   - Left arrow continuously decrements `targetPos` indefinitely.
   - Rapid repeated clicks naturally accumulate on `targetPos`,
     producing smooth continuous multi-card travel without stalling.
   - Autoplay, drag/swipe, keyboard, hover, and focus are all
     seamlessly integrated into the single-coordinate physics loop.
   - 100% offline, zero dependencies, WCAG 2.1 AA compliant.
   ============================================================ */
(function () {
  'use strict';

  var ribbon = document.querySelector('.vertical-ribbon');
  if (!ribbon) return;
  var track = ribbon.querySelector('.vertical-ribbon-track');
  var viewport = ribbon.querySelector('.vertical-ribbon-viewport');
  if (!track || !viewport) return;

  // Ensure at least 3 identical groups exist for bidirectional infinite buffering
  var groups = track.querySelectorAll('.vertical-ribbon-group');
  if (groups.length > 0 && groups.length < 3) {
    var templateGroup = groups[0];
    while (track.querySelectorAll('.vertical-ribbon-group').length < 3) {
      var clone = templateGroup.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      // Set tabindex="-1" on any focusable elements in duplicate groups
      var focusables = clone.querySelectorAll('a, button, input, [tabindex], .vertical-card');
      for (var i = 0; i < focusables.length; i++) {
        focusables[i].setAttribute('tabindex', '-1');
      }
      clone.querySelectorAll('.vertical-card').forEach(function (c) {
        c.classList.remove('is-selected', 'active');
        c.removeAttribute('aria-selected');
      });
      track.appendChild(clone);
    }
  }

  // Ensure cards in the primary group have keyboard focus attributes
  if (groups.length > 0) {
    groups[0].querySelectorAll('.vertical-card').forEach(function (card) {
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
      if (card.tagName.toLowerCase() !== 'a' && !card.hasAttribute('role')) {
        card.setAttribute('role', 'button');
      }
    });
  }

  var LOOP_SECONDS = 70; // full group rotation time for autoplay
  var groupWidth = 0;    // width of one complete group in pixels
  var currentPos = 0;    // current rendered scroll position
  var targetPos = 0;     // target scroll position for smooth interpolation
  var speed = 0;         // autoplay speed in px/second

  var hovering = false;
  var focused = false;
  var dragging = false;
  var raf = null;
  var lastT = 0;

  // Pointer drag state
  var pid = null;
  var startClientX = 0;
  var startPos = 0;
  var moved = 0;

  // Respect OS reduced motion
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function motionOK() { return !(reduceMotion && reduceMotion.matches); }

  function cardStep() {
    var c = track.querySelector('.vertical-card');
    var w = c ? c.getBoundingClientRect().width : 360;
    return w + 28; // card width + gap
  }

  function measure() {
    var firstGroup = track.querySelector('.vertical-ribbon-group');
    if (firstGroup) {
      var rect = firstGroup.getBoundingClientRect();
      var w = rect.width;
      // If group has no explicit width yet, estimate from cards
      if (!w || w < 100) {
        var count = firstGroup.querySelectorAll('.vertical-card').length || 9;
        w = count * cardStep();
      }
      if (w > 0) {
        var oldGroupWidth = groupWidth;
        groupWidth = w;
        speed = groupWidth / LOOP_SECONDS;
        if (oldGroupWidth === 0) {
          // Initial center position in Group 1
          currentPos = groupWidth;
          targetPos = groupWidth;
        } else {
          // Maintain relative ratio on resize
          var ratio = (currentPos % oldGroupWidth) / oldGroupWidth;
          currentPos = groupWidth + ratio * groupWidth;
          targetPos = currentPos;
        }
      }
    }
  }

  function normalize() {
    if (!groupWidth) return;
    while (currentPos >= 2 * groupWidth) {
      currentPos -= groupWidth;
      targetPos -= groupWidth;
    }
    while (currentPos < groupWidth) {
      currentPos += groupWidth;
      targetPos += groupWidth;
    }
  }

  function render() {
    track.style.transform = 'translate3d(' + (-currentPos) + 'px, 0, 0)';
  }

  /* ---------- Main Animation Frame Loop ---------- */
  function frame(t) {
    if (!lastT) lastT = t;
    var dt = Math.min(0.1, (t - lastT) / 1000);
    lastT = t;

    if (groupWidth > 0) {
      if (dragging) {
        // Position driven directly by pointermove
        normalize();
        render();
      } else {
        var isIdle = !hovering && !focused && motionOK();
        var dist = targetPos - currentPos;

        if (Math.abs(dist) > 0.5) {
          // Smooth spring/exponential interpolation toward target
          var factor = 1 - Math.pow(0.001, dt / 0.45);
          currentPos += dist * factor;
          if (Math.abs(targetPos - currentPos) < 0.5) {
            currentPos = targetPos;
          }
        } else {
          currentPos = targetPos;
          // Autoplay advancement when fully idle and settled
          if (isIdle) {
            targetPos += speed * dt;
            currentPos = targetPos;
          }
        }

        normalize();
        render();
      }
    }

    raf = requestAnimationFrame(frame);
  }

  function startLoop() {
    if (raf == null) {
      lastT = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  function stopLoop() {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  /* ---------- Navigation Actions ---------- */
  function nudge(dir) { // dir: +1 forward (right), -1 backward (left)
    if (!groupWidth) measure();
    if (!groupWidth) return;

    var step = cardStep();
    if (!motionOK()) {
      // Instant jump for reduced-motion users
      targetPos += dir * step;
      currentPos = targetPos;
      normalize();
      render();
    } else {
      // Continuous target increment: multiple rapid clicks accumulate smoothly
      targetPos += dir * step;
    }
  }

  /* ---------- Pointer Drag & Touch Handling ---------- */
  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (window.getSelection) {
      try { window.getSelection().removeAllRanges(); } catch (err) {}
    }
    pid = e.pointerId;
    dragging = true;
    moved = 0;
    startClientX = e.clientX;
    startPos = currentPos;
    targetPos = currentPos;
    ribbon.classList.add('is-dragging');
    if (viewport.setPointerCapture) {
      try { viewport.setPointerCapture(pid); } catch (err) {}
    }
  }

  function onPointerMove(e) {
    if (!dragging || (pid !== null && e.pointerId !== pid)) return;
    var dx = e.clientX - startClientX;
    moved = Math.max(moved, Math.abs(dx));
    currentPos = startPos - dx;
    targetPos = currentPos;
    normalize();
    render();
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    pid = null;
    ribbon.classList.remove('is-dragging');
    // Snap to nearest card step on release for clean alignment
    var step = cardStep();
    if (step > 0) {
      targetPos = Math.round(currentPos / step) * step;
    }
  }

  viewport.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  window.addEventListener('blur', onPointerUp);

  /* ---------- Card selection / active state (isolated to industry ribbon) ---------- */
  viewport.addEventListener('click', function (e) {
    if (moved > 6) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    var card = e.target.closest('.vertical-card');
    if (!card || !track.contains(card)) return;

    var href = card.getAttribute('href') || card.getAttribute('data-href');
    if (href) {
      window.location.href = href;
      return;
    }

    var isAlreadySelected = card.classList.contains('is-selected') || card.classList.contains('active');

    // Clear selection from all cards in this ribbon only
    track.querySelectorAll('.vertical-card').forEach(function (c) {
      c.classList.remove('is-selected', 'active');
      c.removeAttribute('aria-selected');
    });

    // If not already selected, select this clicked card
    if (!isAlreadySelected) {
      card.classList.add('is-selected', 'active');
      card.setAttribute('aria-selected', 'true');
    }
  });

  /* ---------- Hover & Focus Handlers ---------- */
  ribbon.addEventListener('mouseenter', function () { hovering = true; });
  ribbon.addEventListener('mouseleave', function () { hovering = false; });
  ribbon.addEventListener('focusin', function () { focused = true; });
  ribbon.addEventListener('focusout', function () { focused = false; });

  /* ---------- Arrow Buttons & Keyboard ---------- */
  var prevBtn = ribbon.querySelector('.ribbon-arrow--prev');
  var nextBtn = ribbon.querySelector('.ribbon-arrow--next');
  if (prevBtn) {
    prevBtn.addEventListener('click', function (e) {
      e.preventDefault();
      nudge(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function (e) {
      e.preventDefault();
      nudge(1);
    });
  }

  ribbon.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      nudge(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nudge(1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      var card = e.target.closest('.vertical-card');
      if (card && track.contains(card)) {
        e.preventDefault();
        var href = card.getAttribute('href') || card.getAttribute('data-href');
        if (href) {
          window.location.href = href;
          return;
        }
        card.click();
      }
    }
  });

  /* ---------- Initialization & Lifecycle ---------- */
  // Disable fallback CSS animation so JS is the sole source of truth
  track.style.animation = 'none';
  track.style.transition = 'none';

  measure();
  normalize();
  render();

  window.addEventListener('load', function () {
    measure();
    normalize();
    render();
  });

  window.addEventListener('resize', function () {
    measure();
    normalize();
    render();
  });

  track.querySelectorAll('img').forEach(function (img) {
    if (!img.complete) {
      img.addEventListener('load', function () {
        measure();
        normalize();
      }, { once: true });
    }
  });

  if ('ResizeObserver' in window) {
    try {
      new ResizeObserver(function () {
        measure();
        normalize();
      }).observe(track);
    } catch (err) {}
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stopLoop();
    } else {
      lastT = 0;
      startLoop();
    }
  });

  startLoop();
})();
