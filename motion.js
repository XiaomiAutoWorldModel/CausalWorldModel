/* Progressive motion for the local report. No network or playback side effects. */
(() => {
  'use strict';

  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const effects = new Map();
  const indicators = new Map();
  const ease = 'cubic-bezier(.22, 1, .36, 1)';
  let revealObserver = null;

  const cancel = (element) => {
    const animation = effects.get(element);
    if (animation) {
      animation.cancel();
      effects.delete(element);
    }
  };

  const enter = (element, options = {}) => {
    if (!element) return;
    cancel(element);
    if (preference.matches || document.visibilityState === 'hidden' ||
        typeof element.animate !== 'function' || element.closest('[hidden]')) return;
    const { distance = 12, duration = 340, delay = 0, opacity = 0, scale = 1 } = options;
    const animation = element.animate([
      { opacity, transform: `translateY(${distance}px) scale(${scale})` },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { duration, delay, easing: ease, fill: 'backwards' });
    effects.set(element, animation);
    const release = () => {
      if (effects.get(element) === animation) effects.delete(element);
    };
    animation.onfinish = release;
    animation.oncancel = release;
    revealObserver?.unobserve(element);
    return animation;
  };

  const moveIndicator = (list, immediate = false) => {
    const state = indicators.get(list);
    if (!state) return;
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const active = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true');
    if (!active || !active.offsetWidth) return;
    const index = tabs.indexOf(active);
    if (list.matches('.training-tabs')) {
      const module = list.closest('.training-module');
      if (module) module.dataset.activeStage = String(index);
    }
    if (immediate) state.marker.classList.remove('is-positioned');
    state.marker.style.width = `${active.offsetWidth}px`;
    state.marker.style.height = `${active.offsetHeight}px`;
    state.marker.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    if (!state.marker.classList.contains('is-positioned')) {
      window.requestAnimationFrame(() => state.marker.classList.add('is-positioned'));
    }
  };

  const finishMotion = () => {
    Array.from(effects.keys()).forEach(cancel);
  };
  preference.addEventListener?.('change', () => {
    if (preference.matches) finishMotion();
  });
  window.addEventListener('beforeprint', finishMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') finishMotion();
  });
  document.addEventListener('focusin', (event) => {
    Array.from(effects.keys()).forEach((element) => {
      if (element === event.target || element.contains(event.target)) cancel(element);
    });
  });

  window.ReportMotion = { enter, moveIndicator };

  const init = () => {
    // No CSS hides content before JavaScript is ready.
    document.querySelectorAll('[role="tablist"]').forEach((list) => {
      const marker = document.createElement('span');
      marker.className = 'tab-indicator';
      marker.setAttribute('aria-hidden', 'true');
      list.append(marker);
      list.classList.add('has-tab-indicator');
      indicators.set(list, { marker });
      moveIndicator(list, true);
    });
    let resizeFrame = 0;
    const queueIndicatorLayout = () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        indicators.forEach((_, list) => moveIndicator(list, true));
      });
    };
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(queueIndicatorLayout);
      indicators.forEach((_, list) => observer.observe(list));
    }
    window.addEventListener('resize', queueIndicatorLayout, { passive: true });

    // The opening scene owns its scroll transition; only the summary enters here.
    const heroItems = document.querySelectorAll('.hero .hero-meta');
    heroItems.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        enter(element, { distance: index === 0 ? 8 : 18, duration: 680, delay: index * 65 });
      }
    });

    if ('IntersectionObserver' in window) {
      const stagger = new WeakMap();
      const revealed = new WeakSet();
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const element = entry.target;
          if (!entry.isIntersecting || revealed.has(element)) return;
          revealed.add(element);
          revealObserver.unobserve(element);
          // A tall chart or table stays readable as the viewport moves through it.
          if (element.getBoundingClientRect().height > window.innerHeight ||
              element.contains(document.activeElement)) return;
          enter(element, {
            distance: element.matches('.demo-browser') ? 18 : 14,
            duration: element.matches('.demo-browser') ? 580 : 520,
            delay: stagger.get(element) || 0,
          });
        });
      }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });
      const selectors = [
        '.section-heading', '.features-heading', '.feature-list > li',
        '.demo-browser', '.comparison-meta',
        '.capability-table-wrap', '.approach-grid > .figure-card', '.principle',
        '.training-module > .module-heading', '.training-stages > .stage-panel',
        '.evidence-index', '.evidence-group-title', '.evidence-panel > .metric-grid',
        '.evidence-panel > .evidence-note', '.benchmark-card',
        '.research-block', '.research-block > .research-block-title',
        '.research-block > .research-body > *', '.research-block .detail-columns > div',
        '.figure-grid > .figure-card', '.data-total', '.data-source',
        '.data-layout > .figure-card', '.closing',
      ];
      const candidates = new Set(Array.from(document.querySelectorAll(selectors.join(',')))
        .filter((element) => {
          const source = element.closest('.data-source');
          return !element.closest('dialog') && (!source || source === element);
        }));
      // Keep the smallest useful blocks, never both a long section and its content.
      const containers = new Set();
      candidates.forEach((element) => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          if (candidates.has(parent)) containers.add(parent);
        }
      });
      candidates.forEach((element) => {
        if (containers.has(element)) return;
        const parent = element.parentElement;
        if (element.matches('.principle') || parent?.matches('.feature-list') ||
            parent?.matches('.training-stages') || parent?.matches('.figure-grid')) {
          const siblings = Array.from(element.parentElement.children);
          stagger.set(element, Math.min(siblings.indexOf(element), 2) * 60);
        }
        revealObserver.observe(element);
      });
    }

    // Observe native open/close state; Esc and focus restoration stay native.
    document.querySelectorAll('dialog').forEach((dialog) => {
      const observer = new MutationObserver(() => {
        if (dialog.open) enter(dialog, { distance: 10, duration: 220, scale: 0.985 });
        else cancel(dialog);
      });
      observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    });

    const nav = document.querySelector('.site-nav');
    let scrollFrame = 0;
    const updateNav = () => {
      scrollFrame = 0;
      nav?.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    window.addEventListener('scroll', () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateNav);
    }, { passive: true });
    updateNav();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
