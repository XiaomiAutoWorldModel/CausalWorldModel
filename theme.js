/* Light / dark theme switch. Dark is the default; the choice is remembered when storage is available. */
(() => {
  'use strict';

  const KEY = 'report-theme';
  const root = document.documentElement;
  const meta = () => document.querySelector('meta[name="theme-color"]');

  const read = () => {
    try { return window.localStorage.getItem(KEY); } catch (_) { return null; }
  };
  const write = (value) => {
    try { window.localStorage.setItem(KEY, value); } catch (_) { /* storage unavailable */ }
  };
  const apply = (theme) => {
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    const color = meta();
    if (color) color.setAttribute('content', theme === 'dark' ? '#0b0b0d' : '#f5f5f7');
    const button = document.getElementById('theme-toggle');
    if (button) {
      const dark = theme === 'dark';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      button.title = dark ? 'Light theme' : 'Dark theme';
    }
  };

  // Apply immediately (script runs in <head>) to avoid a flash of the wrong theme.
  apply(read() === 'light' ? 'light' : 'dark');

  document.addEventListener('DOMContentLoaded', () => {
    apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
    const button = document.getElementById('theme-toggle');
    if (!button) return;
    button.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      write(next);
    });
  });
})();
