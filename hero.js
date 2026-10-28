/* Native downward reveal plus a progressive upward reveal of the same inline video. */
(() => {
  'use strict';

  window.createHeroScene = ({
    hero, video, canPlay = () => true, reducedMotion,
    isDialogOpen = () => false,
  } = {}) => {
    const track = hero?.querySelector('.hero-scroll');
    const scene = hero?.querySelector('.hero-scene');
    const watch = hero?.querySelector('#hero-watch');
    const playback = hero?.querySelector('#hero-playback');
    const media = hero?.querySelector('.hero-media');
    const caption = hero?.querySelector('.hero-caption');
    if (!hero || !video || !track || !scene) {
      return {
        setVisible() {}, suspend() { video?.pause(); },
        acceptPlayback() { return true; }, resumeFromDialog() {},
      };
    }

    const preference = reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)');
    const tallScreen = window.matchMedia('(min-height: 680px)');
    const properties = ['--hero-progress', '--hero-title-opacity', '--hero-veil-opacity'];
    let visible = false;
    let enhanced = false;
    let pinned = false;
    let layoutDirty = true;
    let userPaused = false;
    let autoplayBlocked = false;
    let ignoredPauses = 0;
    let pending = false;
    let request = 0;
    let intent = 'idle';
    let nativeIntentUntil = 0;
    let frame = 0;
    let revealFrame = 0;
    let displayedProgress = 0;
    let upwardDistance = 0;
    let upwardTarget = 0;
    let expanded = false;
    let expandedAtScroll = 0;
    let waitingForNewGesture = false;
    let lastWheelAt = 0;
    const clamp = value => Math.max(0, Math.min(1, value));
    const foreground = () => document.visibilityState !== 'hidden';
    const autoAllowed = () => enhanced && !preference.matches && visible && foreground() &&
      !userPaused && !autoplayBlocked && canPlay();
    const updateButton = () => {
      if (!playback) return;
      const playing = !video.paused && !video.ended;
      playback.textContent = playing ? 'Pause video' : 'Play video';
      playback.setAttribute('aria-label', playing ? 'Pause background video' : 'Play background video');
    };
    const suspend = () => {
      request += 1;
      pending = false;
      intent = 'suspended';
      nativeIntentUntil = 0;
      if (!video.paused) {
        ignoredPauses += 1;
        video.pause();
      }
      updateButton();
    };
    const start = (explicit = false) => {
      if (!foreground() || (!explicit && (pending || !autoAllowed()))) return;
      if (explicit) {
        userPaused = false;
        autoplayBlocked = false;
        const rect = scene.getBoundingClientRect();
        visible = rect.bottom > 0 && rect.top < window.innerHeight;
      }
      if (!visible || (!video.paused && !pending)) return;
      const current = ++request;
      intent = explicit ? 'explicit' : 'auto';
      pending = true;
      video.muted = true;
      try {
        Promise.resolve(video.play()).then(() => {
          if (request !== current) return;
          pending = false;
          updateButton();
        }).catch(error => {
          if (request !== current) return;
          pending = false;
          intent = 'idle';
          if (error?.name !== 'AbortError') autoplayBlocked = true;
          updateButton();
        });
      } catch (_) {
        pending = false;
        intent = 'idle';
        autoplayBlocked = true;
        updateButton();
      }
    };
    const acceptPlayback = () => {
      const explicit = intent === 'explicit' || Date.now() < nativeIntentUntil;
      if (!foreground() || !visible ||
          (!explicit && (intent === 'suspended' || !autoAllowed()))) {
        suspend();
        return false;
      }
      if (explicit) {
        userPaused = false;
        autoplayBlocked = false;
      }
      nativeIntentUntil = 0;
      intent = explicit ? 'explicit' : 'auto';
      pending = false;
      video.muted = true;
      updateButton();
      return true;
    };
    const scrollOffset = () => parseFloat(window.getComputedStyle(scene).scrollMarginTop) || 0;
    const measureLayout = () => {
      layoutDirty = false;
      const fits = enhanced && scene.offsetHeight <= window.innerHeight - scrollOffset() - 16;
      if (fits !== pinned) {
        pinned = fits;
        hero.classList.toggle('is-pinned', pinned);
      }
    };
    const geometry = () => {
      if (layoutDirty) measureLayout();
      const configured = parseFloat(window.getComputedStyle(hero).getPropertyValue('--hero-travel'));
      const travel = pinned ? track.offsetHeight - scene.offsetHeight :
        (Number.isFinite(configured) ? configured : 360);
      return { travel: Math.max(0, travel), top: scrollOffset(), rect: track.getBoundingClientRect() };
    };
    const paintProgress = progress => {
      displayedProgress = clamp(progress);
      const values = [displayedProgress, 1 - clamp(displayedProgress / .65), 1 - displayedProgress];
      properties.forEach((property, index) => hero.style.setProperty(property, values[index].toFixed(4)));
      hero.classList.toggle('is-video-revealed', displayedProgress >= .99);
    };
    const cancelReveal = () => {
      if (revealFrame) window.cancelAnimationFrame(revealFrame);
      revealFrame = 0;
    };
    const upwardTravel = () => {
      const configured = parseFloat(window.getComputedStyle(hero).getPropertyValue('--hero-reveal-travel'));
      return Number.isFinite(configured) && configured > 0 ? configured : 640;
    };
    const measureInlineVideo = () => {
      if (!media) return;
      const rect = media.getBoundingClientRect();
      const gutter = parseFloat(window.getComputedStyle(hero).getPropertyValue('--gutter')) || 24;
      const ratio = video.videoWidth > 0 && video.videoHeight > 0
        ? video.videoWidth / video.videoHeight : 2786 / 1452;
      const availableWidth = Math.max(1, rect.width - gutter * 2);
      const availableHeight = Math.max(120,
        window.innerHeight - Math.max(scrollOffset(), rect.top) - (caption?.offsetHeight || 56) - 32);
      const height = Math.min(media.offsetHeight, availableWidth / ratio, availableHeight);
      const inset = Math.max(gutter, (rect.width - height * ratio) / 2);
      hero.style.setProperty('--hero-inline-height', `${height.toFixed(2)}px`);
      hero.style.setProperty('--hero-inline-inset', `${inset.toFixed(2)}px`);
      hero.style.setProperty('--hero-inline-controls-offset', `${(height + 8 - media.offsetHeight).toFixed(2)}px`);
    };
    const setExpanded = value => {
      expanded = value;
      hero.classList.toggle('is-inline-playing', expanded);
      watch?.setAttribute('aria-expanded', String(expanded));
      if (watch) watch.textContent = expanded ? 'Exit video view' : 'Watch video';
    };
    const openInlineVideo = () => {
      if (expanded || isDialogOpen()) return;
      cancelReveal();
      measureInlineVideo();
      expandedAtScroll = window.scrollY;
      setExpanded(true);
      paintProgress(1);
      // Keep this media element and its current playback position throughout.
      start(true);
    };
    const finishUpwardReveal = () => {
      if (upwardTarget === 1 && upwardDistance >= upwardTravel()) openInlineVideo();
    };
    const animateProgress = target => {
      // Each wheel event chooses an intermediate target, not an automatic full reveal.
      if (revealFrame && target === upwardTarget) return;
      cancelReveal();
      upwardTarget = target;
      if (preference.matches || Math.abs(target - displayedProgress) < .001) {
        paintProgress(target);
        finishUpwardReveal();
        return;
      }
      const from = displayedProgress;
      let began = null;
      const step = now => {
        if (began === null) began = now;
        const fraction = clamp((now - began) / 140);
        paintProgress(from + (target - from) * (1 - Math.pow(1 - fraction, 3)));
        revealFrame = fraction < 1 ? window.requestAnimationFrame(step) : 0;
        if (fraction === 1) finishUpwardReveal();
      };
      revealFrame = window.requestAnimationFrame(step);
    };
    const updateScroll = () => {
      frame = 0;
      if (!enhanced) return;
      const { travel, top, rect } = geometry();
      if (expanded) {
        if (Math.abs(window.scrollY - expandedAtScroll) <= 2) return;
        // Keyboard, touch and scrollbar navigation also leave the inline view.
        setExpanded(false);
        upwardDistance = 0;
        upwardTarget = 0;
      }
      // Upward progress lives above the page's native scroll origin. Preserve a
      // partial reveal while the wheel is still, including across layout updates.
      if (window.scrollY <= 2 && (upwardDistance > 0 || revealFrame)) return;
      cancelReveal();
      upwardDistance = 0;
      upwardTarget = 0;
      const progress = travel > 0 ? clamp((top - rect.top) / travel) : 0;
      paintProgress(progress);
    };
    const queueScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };
    const queueLayout = () => {
      layoutDirty = true;
      if (expanded) measureInlineVideo();
      queueScroll();
    };
    const updateMode = () => {
      const next = tallScreen.matches;
      if (next !== enhanced) {
        cancelReveal();
        displayedProgress = 0;
        upwardDistance = 0;
        upwardTarget = 0;
        setExpanded(false);
        enhanced = next;
        hero.classList.toggle('is-enhanced', enhanced);
        if (!enhanced) {
          pinned = false;
          hero.classList.toggle('is-pinned', false);
          suspend();
          properties.forEach(property => hero.style.removeProperty(property));
          hero.style.removeProperty('--hero-scale');
          hero.classList.remove('is-video-revealed');
        } else {
          start();
        }
      }
      if (preference.matches) {
        cancelReveal();
        if (enhanced && upwardDistance > 0) {
          paintProgress(clamp(upwardDistance / upwardTravel()));
          finishUpwardReveal();
        }
        suspend();
      }
      queueLayout();
    };
    const resetUpwardReveal = () => {
      cancelReveal();
      upwardDistance = 0;
      upwardTarget = 0;
      setExpanded(false);
      waitingForNewGesture = true;
      lastWheelAt = performance.now();
      updateScroll();
    };
    const exitInlineVideo = () => {
      cancelReveal();
      setExpanded(false);
      upwardDistance = 0;
      upwardTarget = 0;
      waitingForNewGesture = true;
      lastWheelAt = performance.now();
      const { travel, top, rect } = geometry();
      animateProgress(travel > 0 ? clamp((top - rect.top) / travel) : 0);
    };

    video.addEventListener('pause', () => {
      if (ignoredPauses) ignoredPauses -= 1;
      else {
        userPaused = true;
        pending = false;
        request += 1;
        intent = 'idle';
        nativeIntentUntil = 0;
      }
      updateButton();
    });
    const nativeIntent = () => { nativeIntentUntil = Date.now() + 1200; };
    video.addEventListener('pointerdown', nativeIntent);
    video.addEventListener('keydown', event => {
      if ([' ', 'Enter', 'k', 'K'].includes(event.key)) nativeIntent();
    });
    playback?.addEventListener('click', () => {
      if (!video.paused || pending) {
        userPaused = true;
        suspend();
      } else start(true);
    });
    watch?.addEventListener('click', () => {
      if (isDialogOpen()) return;
      if (expanded) exitInlineVideo();
      else if (!enhanced) {
        start(true);
        video.scrollIntoView({ block: 'center', behavior: preference.matches ? 'instant' : 'smooth' });
      } else {
        // The button can be reached after scrolling past the scene's top.
        // Align that same scene before fitting the complete inline frame.
        const { top, rect } = geometry();
        const origin = Math.max(0, window.scrollY + rect.top - top);
        if (Math.abs(window.scrollY - origin) > 2) {
          window.scrollTo({ top: origin, behavior: 'instant' });
        }
        upwardDistance = upwardTravel();
        animateProgress(1);
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !isDialogOpen() && (expanded || upwardDistance > 0)) {
        exitInlineVideo();
      }
    });
    // Consume only the virtual space above the page. At its origin the original
    // downward scroll scene is untouched; zoom and horizontal gestures stay native.
    scene.addEventListener('wheel', event => {
      if (!enhanced || isDialogOpen() || window.scrollY > 2 ||
          event.ctrlKey || event.metaKey || event.deltaY === 0 ||
          Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const now = performance.now();
      const quiet = now - lastWheelAt >= 300;
      lastWheelAt = now;
      if (waitingForNewGesture) {
        if (!quiet && event.deltaY < 0) return;
        waitingForNewGesture = false;
      }
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = event.deltaY * unit;
      if (expanded) {
        if (delta < 0) {
          if (event.cancelable) event.preventDefault();
          return;
        }
        setExpanded(false);
      }
      if (delta > 0 && upwardDistance === 0) return;
      // Cancelable input is needed only while unwinding a partial upward gesture,
      // so the same delta cannot drive both the title and the document.
      if (delta > 0 && !event.cancelable) {
        cancelReveal();
        upwardDistance = 0;
        upwardTarget = 0;
        queueScroll();
        return;
      }
      if (event.cancelable) event.preventDefault();
      const travel = upwardTravel();
      upwardDistance = Math.min(travel, Math.max(0, upwardDistance - delta));
      animateProgress(upwardDistance / travel);
    }, { passive: false });
    document.addEventListener('visibilitychange', () => {
      if (!foreground()) suspend();
      else start();
    });
    window.addEventListener('scroll', queueScroll, { passive: true });
    window.addEventListener('resize', queueLayout, { passive: true });
    window.addEventListener('pageshow', queueLayout);
    window.addEventListener('load', queueLayout);
    video.addEventListener('loadedmetadata', queueLayout);
    preference.addEventListener?.('change', updateMode);
    tallScreen.addEventListener?.('change', updateMode);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(queueLayout);
      observer.observe(scene);
      const media = hero.querySelector('.hero-media');
      if (media) observer.observe(media);
    }
    hero.classList.add('has-scene');
    hero.style.removeProperty('--hero-scale');
    if (watch) watch.hidden = false;
    if (playback) playback.hidden = false;
    updateMode();
    updateScroll();
    updateButton();
    return {
      setVisible(value) {
        const entered = Boolean(value) && !visible;
        visible = Boolean(value);
        if (!visible) suspend();
        else if (entered) start();
      },
      suspend,
      acceptPlayback,
      resumeFromDialog(continuePlaying) {
        resetUpwardReveal();
        video.muted = true;
        if (!continuePlaying) {
          userPaused = true;
          suspend();
        } else {
          userPaused = false;
          autoplayBlocked = false;
          if (visible && foreground() && canPlay()) start(true);
        }
      },
    };
  };
})();
