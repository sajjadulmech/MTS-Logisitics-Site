/* ============================================================
   MTS Logistics Ltd. — main.js
   Sticky header shadow, scroll reveal, back-to-top, contact form
   anti-spam (honeypot support + minimum submission time).
   Runs on every page.
   ============================================================ */
(function () {
  'use strict';

  // Mark that JS is available (enables scroll-reveal hidden states)
  document.documentElement.classList.add('js');

  // ---------- Sticky header shadow ----------
  var header = document.querySelector('.site-header');
  var backToTop = document.querySelector('.back-to-top');

  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Scroll reveal ----------
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('revealed'); });
  }

  // Contact forms submit natively to Formspree (no JS interception).
})();


/* ============================================================
   Contact form anti-spam — minimum submission time
   ------------------------------------------------------------
   Second layer behind the `_gotcha` honeypot in the markup.
   Bots typically post within milliseconds of parsing a page, so a
   submission that arrives sooner than MIN_SECONDS is rejected and
   the visitor is asked to try again a moment later.

   Design notes:
   - Progressive enhancement: the form still POSTs natively to
     Formspree. This only ever cancels a submit inside the window.
   - Runs AFTER native constraint validation (browsers fire `submit`
     only once required fields and the email type pass), so existing
     validation is untouched.
   - The notice is created on demand and inherits the form's flex
     `gap`, so nothing shifts unless the guard actually fires.
   ============================================================ */
(function () {
  'use strict';

  var MIN_SECONDS = 3;
  var MIN_MS = MIN_SECONDS * 1000;
  var MESSAGE = 'Please wait a few seconds before submitting the form.';

  var forms = document.querySelectorAll('form[action*="formspree.io"]');
  if (!forms.length) return;

  // Milliseconds since this page started loading. performance.now() is
  // measured from navigation start; Date.now() covers older browsers.
  var loadedAt = Date.now();
  function elapsed() {
    return (window.performance && typeof performance.now === 'function')
      ? performance.now()
      : Date.now() - loadedAt;
  }

  function notice(form) {
    var el = form.querySelector('.form-wait-notice');
    if (el) return el;

    el = document.createElement('p');
    el.className = 'form-wait-notice';
    el.setAttribute('role', 'status');      // announced politely, not assertively
    el.setAttribute('aria-live', 'polite');
    // Inline styles keep this out of the stylesheets: the element does not
    // exist until the guard fires, so the design is untouched either way.
    el.style.cssText = 'margin:0;padding:12px 16px;border-radius:12px;' +
      'background:rgba(255,140,0,0.10);color:#003366;' +
      'font-size:14px;line-height:1.5;';
    form.insertBefore(el, form.querySelector('[type="submit"]'));
    return el;
  }

  Array.prototype.forEach.call(forms, function (form) {
    var timer = null;

    form.addEventListener('submit', function (event) {
      var remaining = MIN_MS - elapsed();
      if (remaining <= 0) return;           // past the window — submit normally

      event.preventDefault();
      notice(form).textContent = MESSAGE;

      // Clear the notice as soon as the window closes, so the next
      // attempt is a clean one.
      clearTimeout(timer);
      timer = setTimeout(function () {
        var el = form.querySelector('.form-wait-notice');
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, remaining + 50);
    });
  });
})();


// Auto-update footer copyright year
(function(){var y=document.getElementById('current-year');if(y){y.textContent=new Date().getFullYear();}})();


/* ============================================================
   Mobile navigation — hamburger menu (< 900px)
   ------------------------------------------------------------
   Progressive enhancement: with JS off the panel simply never
   opens, and at >= 900px this module forces itself closed so the
   approved desktop header behaves exactly as before.
   ============================================================ */
(function () {
  'use strict';

  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var panel = document.getElementById('primary-nav');
  if (!header || !toggle || !panel) return;

  var mq = window.matchMedia('(max-width: 899.98px)');
  var isOpen = false;

  function setOpen(next) {
    if (next && !mq.matches) return; // never opens on the approved desktop header
    if (next === isOpen) return;
    isOpen = next;
    header.classList.toggle('nav-open', isOpen);
    document.documentElement.classList.toggle('nav-menu-open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
  }

  function close(returnFocus) {
    if (!isOpen) return;
    setOpen(false);
    if (returnFocus) toggle.focus();
  }

  toggle.addEventListener('click', function () {
    setOpen(!isOpen);
    if (isOpen) {
      var first = panel.querySelector('a[href]');
      if (first) first.focus();
    }
  });

  // Tap / click a link -> close (the navigation or hash jump continues)
  panel.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('a[href]') : null;
    if (link) close(false);
  });

  // Tap outside the header (including the scrim, whose hit target is
  // the header element itself) -> close
  document.addEventListener('click', function (event) {
    if (!isOpen) return;
    if (event.target !== header && header.contains(event.target)) return;
    close(false);
  });

  // Escape -> close and return focus to the toggle
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') close(true);
  });

  // Keep Tab inside the open menu
  panel.addEventListener('keydown', function (event) {
    if (!isOpen || event.key !== 'Tab') return;
    var items = panel.querySelectorAll('a[href]');
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      toggle.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      toggle.focus();
    }
  });
  toggle.addEventListener('keydown', function (event) {
    if (!isOpen || event.key !== 'Tab' || !event.shiftKey) return;
    var items = panel.querySelectorAll('a[href]');
    if (!items.length) return;
    event.preventDefault();
    items[items.length - 1].focus();
  });

  // Crossing into desktop always resets to the approved desktop header
  function onBreakpoint() { if (!mq.matches) setOpen(false); }
  if (mq.addEventListener) mq.addEventListener('change', onBreakpoint);
  else if (mq.addListener) mq.addListener(onBreakpoint);
  onBreakpoint();

  // Restoring from bfcache should never show a stuck-open menu
  window.addEventListener('pageshow', function () { setOpen(false); });
})();
