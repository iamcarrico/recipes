/**
 * Light and dark themes, after iamcarrico.com.
 *
 * Loaded as a classic script in <head>, not a module, so the first part runs
 * before the page is painted and a saved dark theme never flashes light. The
 * toggle is wired up once the DOM is ready.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'theme';
  // Matches the header background, so the phone's status bar blends in.
  var BAR_COLORS = { light: '#ffffff', dark: '#24201c' };
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function stored() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (error) {
      return null; // private mode or storage blocked: follow the system
    }
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.setAttribute('content', BAR_COLORS[theme]);
    var toggle = document.querySelector('[data-theme-toggle]');
    if (toggle) {
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    }
  }

  apply(stored() || (systemDark.matches ? 'dark' : 'light'));

  // Follow the system setting until someone picks a theme themselves.
  systemDark.addEventListener('change', function (event) {
    if (!stored()) apply(event.matches ? 'dark' : 'light');
  });

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;

    toggle.hidden = false;
    apply(document.documentElement.getAttribute('data-theme'));

    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (error) {
        // Not saved, but the switch still works for this page.
      }
    });
  });
})();
