/* ========================================
   CyprusWay — Language Switcher
   Reads data-i18n attributes, swaps text.
   ======================================== */

(function () {
  'use strict';

  var LANG_KEY = 'cw_lang';
  var langs = ['en', 'pl', 'de', 'el', 'sv'];
  var langNames = {
    en: 'English', pl: 'Polski', de: 'Deutsch',
    el: 'Ελληνικά', sv: 'Svenska'
  };

  /* --- Read preferred language --- */
  function getLang() {
    var stored = localStorage.getItem(LANG_KEY);
    if (stored && langs.indexOf(stored) !== -1) return stored;
    return 'en';
  }

  function setLang(code) {
    if (langs.indexOf(code) === -1) return;
    localStorage.setItem(LANG_KEY, code);
    document.documentElement.lang = code;
    applyTranslations(code);
    updateSwitcherLabel(code);
    updateDropdownActive(code);
    document.dispatchEvent(new CustomEvent('cw:lang', { detail: { lang: code } }));
  }

  /* --- Look up a single key --- */
  function translate(key, code) {
    var t = window.CW && window.CW.t;
    if (!t || !t[key]) return '';
    return t[key][code || getLang()] || t[key]['en'] || '';
  }

  /* --- Apply translations to DOM ---
     root defaults to the document; onboarding.js passes its
     card so injected markup can translate itself. */
  function applyTranslations(code, root) {
    var scope = root || document;
    var els = scope.querySelectorAll('[data-i18n]');
    els.forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = translate(key, code);
      if (!val) return;

      /* Translate into an attribute instead of the text */
      var attr = el.getAttribute('data-i18n-attr');
      if (attr) {
        el.setAttribute(attr, val);
        return;
      }

      /* Handle <input> / <textarea> placeholders */
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
        return;
      }
      /* Check if element contains HTML children (like links or strong tags) */
      var hasHTML = el.querySelector('a, strong, em, span, svg, br');
      if (hasHTML && el.getAttribute('data-i18n-html') === 'true') {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });
  }

  /* --- Update the current language label in the switcher --- */
  function updateSwitcherLabel(code) {
    var label = document.querySelector('.lang-current');
    if (label) label.textContent = code.toUpperCase();
  }

  function updateDropdownActive(code) {
    var items = document.querySelectorAll('.lang-dropdown a');
    items.forEach(function (a) {
      a.classList.remove('active');
      if (a.getAttribute('data-lang') === code) a.classList.add('active');
    });
  }

  /* --- Init --- */
  function init() {
    var code = getLang();
    document.documentElement.lang = code;

    /* Build language dropdown on first init */
    var dropdown = document.querySelector('.lang-dropdown');
    if (dropdown && !dropdown.children.length) {
      langs.forEach(function (l) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#';
        a.setAttribute('data-lang', l);
        a.textContent = langNames[l];
        a.addEventListener('click', function (e) {
          e.preventDefault();
          setLang(l);
        });
        li.appendChild(a);
        dropdown.appendChild(li);
      });
    }

    applyTranslations(code);
    updateSwitcherLabel(code);
    updateDropdownActive(code);
  }

  /* --- Public API ---
     Script-injected UI (the onboarding card) needs to translate
     itself after it is built, and to re-translate on a switch. */
  window.CW = window.CW || {};
  window.CW.i18n = {
    apply: function (root) { applyTranslations(getLang(), root); },
    t: function (key) { return translate(key); },
    lang: getLang
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
