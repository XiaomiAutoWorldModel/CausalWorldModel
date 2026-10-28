/* Background video: plays muted and looped while visible; stays on the poster for reduced motion. */
(() => {
  'use strict';

  const start = () => {
    const video = document.getElementById('hero-bg-video');
    if (!video) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;

    const sync = () => {
      if (reduce.matches || !visible || document.visibilityState === 'hidden') {
        video.pause();
        return;
      }
      video.muted = true;
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        sync();
      }, { threshold: 0 }).observe(video);
    }
    document.addEventListener('visibilitychange', sync);
    if (typeof reduce.addEventListener === 'function') reduce.addEventListener('change', sync);
    sync();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
