/* The report PDF is large and gets replaced often. Browsers (and their built-in PDF viewers) like to keep
   an old copy, so every page load gives the local PDF links a fresh query string. */
(() => {
  'use strict';
  const stamp = Date.now();
  const refresh = () => {
    document.querySelectorAll('a[href^="causal_world_model.pdf"]').forEach((link) => {
      const raw = link.getAttribute('href');
      const [path, hash] = raw.split('#');
      const base = path.split('?')[0];
      link.setAttribute('href', `${base}?t=${stamp}${hash ? `#${hash}` : ''}`);
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();
})();
