/* English / Chinese switch.
   The page is authored in English. When Chinese is selected, every text node and the common accessibility
   attributes are looked up in REPORT_I18N_ZH (exact match first, then a few patterns for generated strings).
   Originals are remembered, so switching back restores the English text exactly. Content rendered later by
   the other scripts (demo clips, charts) is translated as it appears. */
(() => {
  'use strict';

  const KEY = 'report-lang';
  const root = document.documentElement;
  const ZH = () => window.REPORT_I18N_ZH || {};
  const UNITS = () => window.REPORT_I18N_UNITS || {};
  const ATTRS = ['aria-label', 'title', 'alt'];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'TITLE']);
  const ORIGINAL_TITLE = document.title;
  const FULL_TITLE = 'Xiaomi Auto World Model 2.0: Causal World Models for Real-World Driving and Embodied Intelligence';

  let lang = 'en';
  let busy = false;

  const read = () => { try { return window.localStorage.getItem(KEY); } catch (_) { return null; } };
  const write = (value) => { try { window.localStorage.setItem(KEY, value); } catch (_) { /* storage unavailable */ } };

  /* ---------- lookup ---------- */
  const unit = (u) => UNITS()[u] || u;
  const direction = (word) => (word === 'higher' ? '越高越好' : word === 'lower' ? '越低越好' : null);

  const rules = [
    [/^(Higher|Lower) is better(?: · (.+))?$/, (m) => `${direction(m[1].toLowerCase())}${m[2] ? ` · ${unit(m[2])}` : ''}`],
    [/^Show clip (\d+): (.+)$/, (m) => `显示第 ${m[1]} 个片段:${lookup(m[2]) || m[2]}`],
    [/^Show comparison (\d+): (.+)$/, (m) => `显示第 ${m[1]} 组对比:${lookup(m[2]) || m[2]}`],
    [/^Enlarge (.+)$/, (m) => `放大查看:${lookup(m[1]) || m[1]}`],
    [/^(.+) complete metrics$/, (m) => `${lookup(m[1]) || m[1]}的完整指标`],
    [/^(.+): all metrics; (higher is better\.|lower is better\.|comparison direction follows each metric\.) Color indicates relative performance within each column\.$/,
      (m) => {
        const how = m[2].startsWith('higher') ? '越高越好。' : m[2].startsWith('lower') ? '越低越好。' : '比较方向随各指标而定。';
        return `${lookup(m[1]) || m[1]}:全部指标;${how}颜色表示每列内的相对表现。`;
      }],
    [/^(.+): ([\d.,]+) (score|success rate \(%\)|ms \/ layer|s \/ chunk|latent frames \/ s)$/,
      (m) => `${lookup(m[1]) || m[1]}:${m[2]} ${unit(m[3])}`],
    [/^Zoom (\d+) percent\. Reset to fit\.$/, (m) => `缩放 ${m[1]}%,点击恢复适应窗口`],
  ];

  const lookup = (text) => {
    const dict = ZH();
    if (Object.prototype.hasOwnProperty.call(dict, text)) return dict[text];
    for (const [pattern, build] of rules) {
      const match = pattern.exec(text);
      if (match) {
        const out = build(match);
        if (out) return out;
      }
    }
    return null;
  };

  /* ---------- DOM helpers ---------- */
  const skipped = (node) => {
    for (let el = node.nodeType === 1 ? node : node.parentElement; el; el = el.parentElement) {
      if (SKIP_TAGS.has(el.tagName) || el.hasAttribute('data-no-i18n')) return true;
    }
    return false;
  };

  const translateTextNode = (node) => {
    if (skipped(node)) return;
    const raw = node.data;
    if (node.__zh !== undefined && node.__zh === raw) return;           // already ours
    const core = raw.replace(/\s+/g, ' ').trim();
    if (!core) return;
    const zh = lookup(core);
    if (zh == null) return;
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    node.__orig = raw;
    node.__zh = lead + zh + trail;
    node.data = node.__zh;
  };

  const translateAttrs = (el) => {
    if (el.nodeType !== 1 || skipped(el)) return;
    for (const name of ATTRS) {
      if (!el.hasAttribute(name)) continue;
      const value = el.getAttribute(name);
      const store = el.__zhAttrs || (el.__zhAttrs = {});
      if (store[name] && store[name].zh === value) continue;
      const zh = lookup(value.replace(/\s+/g, ' ').trim());
      if (zh == null) continue;
      store[name] = { orig: value, zh };
      el.setAttribute(name, zh);
      el.setAttribute('data-i18n-has', '');
    }
  };

  const translateTree = (start) => {
    if (start.nodeType === 3) { translateTextNode(start); return; }
    if (start.nodeType !== 1) return;
    translateAttrs(start);
    const walker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === 3) translateTextNode(node);
      else translateAttrs(node);
      node = walker.nextNode();
    }
  };

  const restoreAll = () => {
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.__zh !== undefined) {
        if (node.__zh === node.data) node.data = node.__orig;
        delete node.__zh;
        delete node.__orig;
      }
      node = walker.nextNode();
    }
    document.querySelectorAll('[data-i18n-has]').forEach((el) => {
      const store = el.__zhAttrs || {};
      Object.keys(store).forEach((name) => {
        if (el.getAttribute(name) === store[name].zh) el.setAttribute(name, store[name].orig);
      });
      el.__zhAttrs = {};
      el.removeAttribute('data-i18n-has');
    });
  };

  /* ---------- page-level bits ---------- */
  const description = () => document.querySelector('meta[name="description"]');
  let originalDescription = null;

  const applyChrome = () => {
    root.lang = lang === 'zh' ? 'zh-CN' : 'en';
    root.setAttribute('data-lang', lang);
    document.title = lang === 'zh' ? (lookup(FULL_TITLE) || ORIGINAL_TITLE) : ORIGINAL_TITLE;
    const meta = description();
    if (meta) {
      if (originalDescription === null) originalDescription = meta.getAttribute('content');
      meta.setAttribute('content', lang === 'zh' ? (lookup(originalDescription) || originalDescription) : originalDescription);
    }
    const button = document.getElementById('lang-toggle');
    if (button) {
      button.textContent = lang === 'zh' ? 'EN' : '中文';
      button.setAttribute('aria-label', lang === 'zh' ? '切换到英文' : 'Switch to Chinese');
      button.title = lang === 'zh' ? 'English' : '中文';
      button.setAttribute('aria-pressed', String(lang === 'zh'));
    }
  };

  const setLang = (next) => {
    lang = next === 'zh' ? 'zh' : 'en';
    busy = true;
    try {
      if (lang === 'zh') translateTree(document.documentElement);
      else restoreAll();
      applyChrome();
    } finally {
      busy = false;
    }
    window.dispatchEvent(new CustomEvent('report-language-change', { detail: { lang } }));
  };

  /* ---------- keep up with content rendered by other scripts ---------- */
  const observe = () => {
    if (!('MutationObserver' in window)) return;
    const observer = new MutationObserver((records) => {
      if (lang !== 'zh' || busy) return;
      busy = true;
      try {
        records.forEach((record) => {
          if (record.type === 'childList') record.addedNodes.forEach((node) => translateTree(node));
          else if (record.type === 'characterData') translateTextNode(record.target);
          else if (record.type === 'attributes') translateAttrs(record.target);
        });
      } finally {
        busy = false;
      }
    });
    observer.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  };

  /* ---------- start ---------- */
  const saved = read();
  lang = saved === 'zh' ? 'zh' : 'en';
  root.setAttribute('data-lang', lang);
  if (lang === 'zh') root.lang = 'zh-CN';

  document.addEventListener('DOMContentLoaded', () => {
    observe();
    const button = document.getElementById('lang-toggle');
    if (button) {
      button.addEventListener('click', () => {
        const next = lang === 'zh' ? 'en' : 'zh';
        setLang(next);
        write(next);
      });
    }
    setLang(lang);
  });

  window.ReportI18n = { get lang() { return lang; }, setLang, lookup, translate: (text) => (lang === 'zh' ? (lookup(text) || text) : text) };
})();
