/* ========================================
   CyprusWay — Scroll & Interaction Animations
   No dependencies.
   ======================================== */

(function () {
  'use strict';

  /* --- Scroll Reveal (Intersection Observer) --- */
  var observerOptions = { threshold: 0.12, rootMargin: '0px 0px -40px 0px' };

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  /* --- Staggered children reveal --- */
  var staggerObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var children = entry.target.querySelectorAll(':scope > *');
        children.forEach(function (child, i) {
          child.style.transitionDelay = (i * 120) + 'ms';
          child.classList.add('revealed');
        });
        staggerObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  function wireReveals() {
    var reveals = document.querySelectorAll('.reveal');
    reveals.forEach(function (el) { revealObserver.observe(el); });

    var staggers = document.querySelectorAll('.reveal-stagger');
    staggers.forEach(function (el) { staggerObserver.observe(el); });
  }

  /* --- Button pulse on first load --- */
  function pulsePrimaryBtn() {
    var btn = document.querySelector('.btn-primary');
    if (btn) {
      btn.classList.add('btn-pulse');
      setTimeout(function () { btn.classList.remove('btn-pulse'); }, 1200);
    }
  }

  /* --- Smooth scroll for anchor links --- */
  function wireSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* --- Init --- */
  function init() {
    wireReveals();
    wireSmoothScroll();
    pulsePrimaryBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
