/* Citation panel: reveal the BibTeX entry and copy it to the clipboard. */
(() => {
  'use strict';

  const onReady = (callback) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  };

  onReady(() => {
    const toggle = document.getElementById('citation-toggle');
    const panel = document.getElementById('citation-panel');
    const copy = document.getElementById('citation-copy');
    const source = document.getElementById('citation-bibtex');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      const mark = toggle.querySelector('.citation-mark');
      if (mark) mark.textContent = open ? '−' : '+';
      if (open) panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    if (!copy || !source) return;
    const fallbackCopy = (text) => {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      area.remove();
      return ok;
    };
    let timer = 0;
    const flash = (label) => {
      copy.textContent = label;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { copy.textContent = 'Copy'; }, 1600);
    };
    copy.addEventListener('click', async () => {
      const text = source.textContent;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          flash('Copied');
          return;
        }
      } catch (_) { /* fall through to the legacy path */ }
      flash(fallbackCopy(text) ? 'Copied' : 'Select and copy');
    });
  });
})();
