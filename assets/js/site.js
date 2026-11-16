/* Checkshot site: theme switch. Dark unless the visitor chose light. The choice is kept in this
   browser's local storage only; nothing is sent anywhere. */
(function () {
  'use strict';
  var btn = document.getElementById('theme-btn'), rootEl = document.documentElement;
  function paint() {
    var light = rootEl.getAttribute('data-theme') === 'light';
    btn.textContent = light ? 'Dark' : 'Light';
    btn.setAttribute('aria-label', 'Switch to the ' + (light ? 'dark' : 'light') + ' theme');
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', light ? '#F6F5F1' : '#0E0E0F');
  }
  if (!btn) return;
  btn.addEventListener('click', function () {
    var next = rootEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    rootEl.setAttribute('data-theme', next);
    try { localStorage.setItem('cs-theme', next); } catch (e) {}
    paint();
  });
  paint();
})();
