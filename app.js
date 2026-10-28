/* Local, dependency-free interactions for the Causal World Model report. */
(() => {
  'use strict';

  const onReady = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  onReady(() => {
    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let videos = $$('video:not([data-background])');
    const expandedVideo = $('#expanded-video');
    const heroVideo = $('#hero-video');
    let activeVideoSession = null;
    let heroScene = null;
    let mediaObserver = null;
    const bindVideoPlayback = (video) => {
      if (!video || video.dataset.boundPlayback === 'true') return;
      video.dataset.boundPlayback = 'true';
      video.addEventListener('play', () => {
        if (activeVideoSession && video !== expandedVideo) {
          pauseVideo(video);
          return;
        }
        if (video === heroVideo && heroScene && !heroScene.acceptPlayback()) {
          pauseVideo(video);
          return;
        }
        pauseOtherVideos(video);
      });
      video.addEventListener('loadedmetadata', () => updateRatio(video, video.videoWidth, video.videoHeight));
      if (!videos.includes(video)) videos.push(video);
      mediaObserver?.observe(video);
    };
    const pauseVideo = (video) => {
      if (video === heroVideo && heroScene) heroScene.suspend();
      else video.pause();
    };

    const isPlaying = (video) => Boolean(video && !video.paused && !video.ended);
    const isVisible = (element) => {
      if (document.visibilityState === 'hidden') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 &&
        rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    };
    const safePlay = (video) => {
      if (!video) return;
      const playback = video.play();
      if (playback && typeof playback.catch === 'function') playback.catch(() => {});
    };
    const setText = (selector, value) => {
      const target = $(selector);
      if (target) target.textContent = value || '';
    };
    const pauseOtherVideos = (current) => {
      videos.forEach((video) => {
        if (video === current) return;
        // Videos in the same comparison pair play together.
        if (current.dataset.pair && video.dataset.pair === current.dataset.pair) return;
        pauseVideo(video);
      });
    };

    const updateRatio = (video, width, height) => {
      const stage = video.closest('.video-stage, .hero-media');
      if (!stage || !(Number(width) > 0 && Number(height) > 0)) return;
      const next = `${width} / ${height}`;
      const previous = stage.style.getPropertyValue('--video-ratio').trim();
      // Clips in one category can have very different proportions. Glide between the two heights
      // instead of snapping, so the content below the video does not jump.
      if (!stage.classList.contains('video-stage') || !previous || previous === next || reducedMotion.matches) {
        stage.style.setProperty('--video-ratio', next);
        return;
      }
      const before = stage.getBoundingClientRect().height;
      stage.style.setProperty('--video-ratio', next);
      const after = stage.getBoundingClientRect().height;
      if (before < 1 || Math.abs(before - after) < 2) return;
      window.clearTimeout(stage._ratioTimer);
      stage.style.transition = 'none';
      stage.style.height = `${before}px`;
      void stage.offsetHeight;
      stage.style.transition = 'height 360ms cubic-bezier(.2, .7, .2, 1)';
      stage.style.height = `${after}px`;
      stage._ratioTimer = window.setTimeout(() => {
        stage.style.transition = '';
        stage.style.height = '';
      }, 400);
    };

    const setMedia = (video, clip, continuePlaying = false) => {
      pauseVideo(video);
      if (clip.poster) video.setAttribute('poster', clip.poster);
      else video.removeAttribute('poster');
      video.setAttribute('src', clip.src);
      video.dataset.title = clip.title || 'Model output';
      video.setAttribute('aria-label', clip.title || 'Model output video');
      updateRatio(video, clip.width, clip.height);
      video.load();
      window.ReportMotion?.enter(video, { distance: 0, duration: 220, opacity: 0.4 });
      if (continuePlaying) {
        if (video === heroVideo && heroScene) heroScene.resumeFromDialog(true);
        else safePlay(video);
      }
    };

    // One consistent keyboard model for every horizontal tab list.
    const bindTabKeyboard = (tablist, getTabs, activate) => {
      tablist.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const tabs = getTabs();
        const focused = event.target.closest('[role="tab"]');
        const current = tabs.indexOf(focused);
        if (current < 0 || !tabs.length) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 :
          (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        activate(tabs[next], next);
        tabs[next].focus({ preventScroll: true });
        tabs[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      });
    };

    const selectTab = (tabs, active) => {
      tabs.forEach((tab) => {
        const selected = tab === active;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        tab.classList.toggle('is-active', selected);
      });
      window.ReportMotion?.moveIndicator(active.closest('[role="tablist"]'));
    };

    // Curated category and clip browsing uses only bundled media and metadata.
    const demos = Array.isArray(window.REPORT_DEMOS) ? window.REPORT_DEMOS : [];
    const demoTabs = $('#demo-tabs');
    const demoPanel = $('#demo-panel');
    const demoVideo = $('#demo-video');
    const demoPlayer = $('#demo-player');
    const demoGrid = $('#demo-grid');
    const clipList = $('#clip-list');
    const demoStatus = $('#demo-status');
    if (demos.length && demoTabs && demoPanel && demoVideo && clipList) {
      let categoryIndex = 0;
      let clipIndex = 0;
      let clipButtons = [];
      const categoryButtons = [];

      const renderClip = (index, continuePlaying = false) => {
        const category = demos[categoryIndex];
        if (!category.clips || !category.clips.length || category.layout === 'grid' || category.layout === 'pairs' || category.layout === 'row') return;
        clipIndex = (index + category.clips.length) % category.clips.length;
        const clip = category.clips[clipIndex];
        if (demoStatus) demoStatus.hidden = true;
        setMedia(demoVideo, clip, continuePlaying);
        setText('#demo-caption', clip.caption || clip.title);
        window.ReportMotion?.enter($('#demo-caption'), { distance: 4, duration: 220 });
        setText('#clip-counter', `${clipIndex + 1} / ${category.clips.length}`);
        clipButtons.forEach((button, buttonIndex) => {
          const selected = buttonIndex === clipIndex;
          button.classList.toggle('is-active', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
        const currentButton = clipButtons[clipIndex];
        if (currentButton) {
          // Scroll only the filmstrip, without moving the document away from the video.
          const left = currentButton.getBoundingClientRect().left - clipList.getBoundingClientRect().left + clipList.scrollLeft;
          const right = left + currentButton.offsetWidth;
          if (left < clipList.scrollLeft) clipList.scrollLeft = left;
          else if (right > clipList.scrollLeft + clipList.clientWidth) {
            clipList.scrollLeft = right - clipList.clientWidth;
          }
        }
        ['#prev-clip', '#next-clip'].forEach((selector) => {
          const button = $(selector);
          if (button) button.disabled = category.clips.length < 2;
        });
      };

      // Two clips that are compared directly are stacked and kept in sync.
      const syncPair = (first, second) => {
        let busy = false;
        const mirror = (source, target, action) => {
          if (busy) return;
          busy = true;
          try { action(source, target); } finally { busy = false; }
        };
        [[first, second], [second, first]].forEach(([source, target]) => {
          source.addEventListener('play', () => mirror(source, target, () => {
            if (Math.abs(target.currentTime - source.currentTime) > 0.15) target.currentTime = source.currentTime;
            if (target.paused) safePlay(target);
          }));
          source.addEventListener('pause', () => mirror(source, target, () => {
            if (!target.paused) target.pause();
          }));
          source.addEventListener('seeked', () => mirror(source, target, () => {
            if (Math.abs(target.currentTime - source.currentTime) > 0.15) target.currentTime = source.currentTime;
          }));
        });
      };

      const renderPairs = (category) => {
        demoGrid.className = 'demo-grid demo-pairs';
        const pairs = category.pairs || [];
        const cards = [];
        const pairButtons = [];
        let counter = null;
        let currentPair = 0;
        const showPair = (index) => {
          currentPair = (index + pairs.length) % pairs.length;
          cards.forEach((card, cardIndex) => {
            if (cardIndex !== currentPair) $$('video', card).forEach(pauseVideo);
            card.hidden = cardIndex !== currentPair;
          });
          pairButtons.forEach((button, buttonIndex) => {
            const selected = buttonIndex === currentPair;
            button.classList.toggle('is-active', selected);
            button.setAttribute('aria-pressed', String(selected));
          });
          if (counter) counter.textContent = `${String(currentPair + 1).padStart(2, '0')} / ${String(pairs.length).padStart(2, '0')}`;
          window.ReportMotion?.enter(cards[currentPair], { distance: 6, duration: 220 });
        };
        pairs.forEach((pair, pairIndex) => {
          const card = document.createElement('section');
          card.className = 'pair-card';
          const heading = document.createElement('h4');
          heading.textContent = pair.title || `Comparison ${pairIndex + 1}`;
          const stack = document.createElement('div');
          stack.className = 'pair-videos';
          const pairVideos = (pair.clips || []).map((clip) => {
            const cell = document.createElement('figure');
            cell.className = 'pair-clip';
            const label = document.createElement('figcaption');
            label.textContent = clip.title || '';
            const video = document.createElement('video');
            video.controls = true;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'none';
            video.dataset.pair = `${category.id || 'pair'}-${pairIndex}`;
            if (clip.poster) video.poster = clip.poster;
            video.src = clip.src;
            video.setAttribute('aria-label', clip.title || 'Comparison clip');
            if (clip.width && clip.height) {
              video.width = clip.width;
              video.height = clip.height;
              video.style.aspectRatio = `${clip.width} / ${clip.height}`;
            }
            cell.append(label, video);
            stack.append(cell);
            bindVideoPlayback(video);
            lazyLoad(video);
            return video;
          });
          if (pairVideos.length === 2) syncPair(pairVideos[0], pairVideos[1]);
          card.append(heading, stack);
          cards.push(card);
          demoGrid.append(card);
        });
        if (pairs.length > 1) {
          // Same controls as the single-video categories: counter, arrows and a clip strip.
          const toolbar = document.createElement('div');
          toolbar.className = 'demo-toolbar';
          counter = document.createElement('span');
          counter.className = 'clip-counter';
          const nav = document.createElement('div');
          nav.className = 'clip-navigation';
          [['←', 'Previous comparison', -1], ['→', 'Next comparison', 1]].forEach(([symbol, label, step]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'icon-button';
            button.setAttribute('aria-label', label);
            button.textContent = symbol;
            button.addEventListener('click', () => showPair(currentPair + step));
            nav.append(button);
          });
          toolbar.append(counter, nav);
          const strip = document.createElement('div');
          strip.className = 'clip-list';
          strip.setAttribute('aria-label', 'Choose a comparison');
          pairs.forEach((pair, pairIndex) => {
            const first = (pair.clips || [])[0] || {};
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'clip-card';
            button.setAttribute('aria-pressed', 'false');
            button.setAttribute('aria-label', `Show comparison ${pairIndex + 1}: ${pair.title}`);
            const thumbnail = document.createElement('img');
            if (first.poster) thumbnail.src = first.poster;
            thumbnail.alt = '';
            thumbnail.loading = 'lazy';
            thumbnail.decoding = 'async';
            const label = document.createElement('span');
            label.textContent = pair.title || `Comparison ${pairIndex + 1}`;
            button.append(thumbnail, label);
            button.addEventListener('click', () => showPair(pairIndex));
            pairButtons.push(button);
            strip.append(button);
          });
          demoGrid.append(toolbar, strip);
        }
        if (cards.length) showPair(0);
      };

      // Independent clips shown side by side in one row (they can play at the same time).
      const renderRow = (category) => {
        demoGrid.className = 'demo-grid demo-pairs';
        const card = document.createElement('section');
        card.className = 'pair-card';
        const row = document.createElement('div');
        row.className = 'pair-videos is-row';
        (category.clips || []).forEach((clip) => {
          const cell = document.createElement('figure');
          cell.className = 'pair-clip';
          const label = document.createElement('figcaption');
          label.textContent = clip.title || '';
          const video = document.createElement('video');
          video.controls = true;
          video.muted = true;
          video.playsInline = true;
          video.preload = 'none';
          video.dataset.pair = `${category.id || 'row'}-row`;
          if (clip.poster) video.poster = clip.poster;
          video.src = clip.src;
          video.setAttribute('aria-label', clip.title || 'Demonstration');
          if (clip.width && clip.height) {
            video.width = clip.width;
            video.height = clip.height;
            video.style.aspectRatio = `${clip.width} / ${clip.height}`;
          }
          cell.append(label, video);
          row.append(cell);
          bindVideoPlayback(video);
          lazyLoad(video);
        });
        card.append(row);
        demoGrid.append(card);
      };

      const renderGridCategory = (category) => {
        if (demoPlayer) demoPlayer.hidden = true;
        {
          // Categories without clip navigation still show "1 / 1" so the heading rows line up.
          const nav = $('.demo-heading > .demo-toolbar');
          if (nav) {
            nav.hidden = false;
            setText('#clip-counter', '1 / 1');
            ['#prev-clip', '#next-clip'].forEach((selector) => { const button = $(selector); if (button) button.disabled = true; });
          }
        }
        if (demoGrid) {
          demoGrid.hidden = false;
          demoGrid.replaceChildren();
          demoGrid.className = 'demo-grid';
        }
        if (demoGrid && category.layout === 'row') {
          renderRow(category);
          pauseVideo(demoVideo);
          window.ReportMotion?.enter(demoGrid, { distance: 8, duration: 280 });
          return;
        }
        if (demoGrid && category.layout === 'pairs') {
          renderPairs(category);
          pauseVideo(demoVideo);
          window.ReportMotion?.enter(demoGrid, { distance: 8, duration: 280 });
          return;
        }
        if (demoGrid) {
          (category.clips || []).forEach((clip) => {
            const cell = document.createElement('figure');
            cell.className = 'demo-grid-cell';
            const video = document.createElement('video');
            video.controls = true;
            video.muted = true;
            video.playsInline = true;
            video.preload = 'none';
            if (clip.poster) video.poster = clip.poster;
            video.src = clip.src;
            video.setAttribute('aria-label', clip.title || 'Physical interaction demonstration');
            if (clip.width && clip.height) {
              video.width = clip.width;
              video.height = clip.height;
              updateRatio(video, clip.width, clip.height);
            }
            const caption = document.createElement('figcaption');
            caption.textContent = clip.title || '';
            cell.append(video, caption);
            demoGrid.append(cell);
            bindVideoPlayback(video);
            lazyLoad(video);
          });
        }
        pauseVideo(demoVideo);
        window.ReportMotion?.enter(demoGrid, { distance: 8, duration: 280 });
      };

      const renderCategory = (index, continuePlaying = false) => {
        categoryIndex = index;
        const category = demos[index];
        selectTab(categoryButtons, categoryButtons[index]);
        demoPanel.setAttribute('aria-labelledby', categoryButtons[index].id);
        setText('#demo-title', category.title || category.label);
        setText('#demo-description', category.description);
        setText('#demo-control', category.control);
        setText('#demo-watch', category.watch);

        if (category.layout === 'grid' || category.layout === 'pairs' || category.layout === 'row') {
          clipList.replaceChildren();
          clipButtons = [];
          renderGridCategory(category);
          [$('.demo-heading'), $('.demo-facts')].forEach((element, index) => {
            window.ReportMotion?.enter(element, { distance: 8, duration: 280, delay: index * 35 });
          });
          return;
        }

        if (demoPlayer) {
          demoPlayer.hidden = false;
          // A single clip needs no counter, arrows or filmstrip.
          demoPlayer.classList.toggle('is-single', (category.clips || []).length < 2);
          { const nav = $('.demo-heading > .demo-toolbar'); if (nav) nav.hidden = false; }
        }
        if (demoGrid) {
          $$('video', demoGrid).forEach(pauseVideo);
          demoGrid.hidden = true;
          demoGrid.replaceChildren();
        }
        clipList.replaceChildren();
        clipButtons = (category.clips || []).map((clip, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'clip-card';
          button.dataset.clipIndex = String(index);
          button.setAttribute('aria-pressed', 'false');
          button.setAttribute('aria-label', `Show clip ${index + 1}: ${clip.title}`);
          const thumbnail = document.createElement('img');
          if (clip.poster) thumbnail.src = clip.poster;
          thumbnail.alt = '';
          thumbnail.loading = 'lazy';
          thumbnail.decoding = 'async';
          if (clip.posterFit === 'contain') thumbnail.style.objectFit = 'contain';
          if (clip.width && clip.height) {
            thumbnail.width = clip.width;
            thumbnail.height = clip.height;
          }
          const label = document.createElement('span');
          label.textContent = clip.title || `Clip ${index + 1}`;
          button.append(thumbnail, label);
          button.addEventListener('click', () => renderClip(index, isPlaying(demoVideo)));
          clipList.append(button);
          return button;
        });
        renderClip(0, continuePlaying);
        [$('.demo-heading'), $('.demo-facts'), clipList].forEach((element, index) => {
          window.ReportMotion?.enter(element, { distance: 8, duration: 280, delay: index * 35 });
        });
      };

      demos.forEach((category, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.id = `demo-tab-${index}`;
        button.className = 'tab-button';
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-controls', 'demo-panel');
        button.textContent = category.label || category.title;
        button.addEventListener('click', () => {
          if (categoryIndex !== index) renderCategory(index, isPlaying(demoVideo));
        });
        categoryButtons.push(button);
        demoTabs.append(button);
      });
      bindTabKeyboard(demoTabs, () => categoryButtons, (_, index) => {
        if (categoryIndex !== index) renderCategory(index, isPlaying(demoVideo));
      });
      $('#prev-clip')?.addEventListener('click', () => renderClip(clipIndex - 1, isPlaying(demoVideo)));
      $('#next-clip')?.addEventListener('click', () => renderClip(clipIndex + 1, isPlaying(demoVideo)));
      renderCategory(0);

      if (demoStatus) {
        demoStatus.setAttribute('role', 'status');
        demoStatus.setAttribute('aria-live', 'polite');
        demoVideo.addEventListener('error', () => {
          const message = document.createElement('span');
          message.textContent = 'This clip could not be loaded. Try another clip, or ';
          const link = document.createElement('a');
          link.href = demoVideo.currentSrc || demoVideo.src;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = 'open the video file';
          demoStatus.replaceChildren(message, link, document.createTextNode('.'));
          demoStatus.hidden = false;
        });
        ['loadstart', 'loadeddata', 'canplay', 'playing'].forEach((eventName) => {
          demoVideo.addEventListener(eventName, () => { demoStatus.hidden = true; });
        });
      }
    }

    if (heroVideo) {
      heroVideo.dataset.title = 'Seven-view driving';
      heroVideo.setAttribute('aria-label', 'Seven-view driving demonstration');
      updateRatio(heroVideo, 2786, 1452);
    }

    $$('[data-tabs]').forEach((tablist) => {
      const group = tablist.dataset.tabs;
      const tabs = $$('[role="tab"]', tablist);
      const panels = $$('[data-tab-panel]').filter((panel) => panel.dataset.tabPanel === group);
      const activate = (tab) => {
        const changed = tab.getAttribute('aria-selected') !== 'true';
        selectTab(tabs, tab);
        panels.forEach((panel) => {
          const selected = panel.id === tab.getAttribute('aria-controls');
          panel.hidden = !selected;
          if (changed && selected) window.ReportMotion?.enter(panel, { distance: 10, duration: 300 });
        });
      };
      tabs.forEach((tab) => tab.addEventListener('click', () => activate(tab)));
      const first = tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || tabs[0];
      if (first) activate(first);
      bindTabKeyboard(tablist, () => tabs, activate);
    });

    // The modal player borrows the source's playback state, then returns it.
    const videoDialog = $('#video-dialog');
    const openVideoDialog = (source, trigger, { autoplay = false } = {}) => {
      if (!videoDialog || !expandedVideo || !source || source.tagName !== 'VIDEO' ||
          activeVideoSession || $('dialog[open]')) return false;
      const wasPlaying = isPlaying(source);
      const continuePlaying = autoplay || wasPlaying;
      const startTime = Number.isFinite(source.currentTime) ? source.currentTime : 0;
      const session = { source, trigger, onMetadata: null, positionReady: false };
      activeVideoSession = session;
      try {
        pauseOtherVideos(expandedVideo);
        expandedVideo.pause();
        if (source === heroVideo) source.muted = true;
        expandedVideo.muted = source.muted;
        expandedVideo.volume = source.volume;
        expandedVideo.playbackRate = source.playbackRate;
        expandedVideo.loop = source.loop;
        if (source.poster) expandedVideo.poster = source.poster;
        else expandedVideo.removeAttribute('poster');
        expandedVideo.src = source.currentSrc || source.src;
        const title = source.dataset.title || source.getAttribute('aria-label') || 'Model output';
        setText('#video-title', title);
        expandedVideo.setAttribute('aria-label', title);
        const restoreStart = () => {
          if (activeVideoSession !== session) return;
          try {
            expandedVideo.currentTime = startTime;
            session.positionReady = true;
          } catch (_) { /* Media may not be seekable yet. */ }
          if (continuePlaying && videoDialog.open) safePlay(expandedVideo);
        };
        session.onMetadata = restoreStart;
        expandedVideo.addEventListener('loadedmetadata', restoreStart, { once: true });
        videoDialog.showModal();
        expandedVideo.load();
        $('[data-close-dialog]', videoDialog)?.focus({ preventScroll: true });
        return true;
      } catch (_) {
        activeVideoSession = null;
        if (session.onMetadata) expandedVideo.removeEventListener('loadedmetadata', session.onMetadata);
        if (videoDialog.open) videoDialog.close();
        expandedVideo.pause();
        expandedVideo.removeAttribute('src');
        expandedVideo.load();
        if (source === heroVideo && heroScene) heroScene.resumeFromDialog(wasPlaying);
        else if (wasPlaying && isVisible(source)) safePlay(source);
        return false;
      }
    };
    if (videoDialog && expandedVideo) {
      $$('[data-expand-video]').forEach((button) => {
        button.addEventListener('click', () => {
          const source = document.getElementById(button.dataset.expandVideo);
          openVideoDialog(source, button);
        });
      });

      videoDialog.addEventListener('close', () => {
        const session = activeVideoSession;
        if (!session) return;
        activeVideoSession = null;
        expandedVideo.removeEventListener('loadedmetadata', session.onMetadata);
        const continuePlaying = isPlaying(expandedVideo);
        const endTime = expandedVideo.currentTime;
        expandedVideo.pause();
        session.source.muted = session.source === heroVideo ? true : expandedVideo.muted;
        session.source.volume = expandedVideo.volume;
        session.source.playbackRate = expandedVideo.playbackRate;
        if (session.positionReady && Number.isFinite(endTime)) {
          try { session.source.currentTime = endTime; } catch (_) { /* Keep the original position if unavailable. */ }
        }
        expandedVideo.removeAttribute('src');
        expandedVideo.load();
        if (session.source === heroVideo && heroScene) {
          heroScene.resumeFromDialog(continuePlaying);
        } else if (continuePlaying && isVisible(session.source)) safePlay(session.source);
        session.trigger?.focus({ preventScroll: true });
      });
    }

    const imageDialog = $('#image-dialog');
    const zoomImage = $('#zoom-image');
    if (imageDialog && zoomImage) {
      const viewport = $('.image-viewport', imageDialog);
      const original = $('#image-original');
      let zoom = 1;
      let imageTrigger = null;
      const applyZoom = (value) => {
        zoom = Math.min(4, Math.max(1, value));
        zoomImage.style.width = `${zoom * 100}%`;
        zoomImage.style.maxWidth = 'none';
        zoomImage.style.height = 'auto';
        const reset = $('#zoom-reset');
        if (reset) {
          reset.textContent = zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`;
          reset.setAttribute('aria-label', `Zoom ${Math.round(zoom * 100)} percent. Reset to fit.`);
        }
        const minus = $('#zoom-out');
        const plus = $('#zoom-in');
        if (minus) minus.disabled = zoom <= 1;
        if (plus) plus.disabled = zoom >= 4;
        if (zoom === 1 && viewport) {
          viewport.scrollTop = 0;
          viewport.scrollLeft = 0;
        }
      };
      $$('[data-zoom-image]').forEach((button) => {
        button.addEventListener('click', () => {
          const preview = $('img', button);
          const source = button.dataset.zoomImage || preview?.currentSrc || preview?.src;
          if (!source) return;
          imageTrigger = button;
          const title = button.dataset.imageTitle || preview?.alt || 'Report figure';
          zoomImage.src = source;
          zoomImage.alt = title;
          setText('#image-title', title);
          if (original) {
            original.href = source;
            original.rel = 'noopener';
          }
          applyZoom(1);
          imageDialog.showModal();
          $('[data-close-dialog]', imageDialog)?.focus({ preventScroll: true });
        });
      });
      $('#zoom-out')?.addEventListener('click', () => applyZoom(zoom - 0.5));
      $('#zoom-in')?.addEventListener('click', () => applyZoom(zoom + 0.5));
      $('#zoom-reset')?.addEventListener('click', () => applyZoom(1));
      imageDialog.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault();
          applyZoom(event.key === '0' ? 1 : zoom + (event.key === '-' ? -0.5 : 0.5));
        }
      });
      imageDialog.addEventListener('close', () => {
        imageTrigger?.focus({ preventScroll: true });
        imageTrigger = null;
      });
    }

    $$('dialog').forEach((dialog) => {
      $$('[data-close-dialog]', dialog).forEach((button) => {
        button.addEventListener('click', () => dialog.close());
      });
      let pointerStartedOutside = false;
      const outside = (event) => {
        const rect = dialog.getBoundingClientRect();
        return event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom;
      };
      dialog.addEventListener('pointerdown', (event) => {
        pointerStartedOutside = event.target === dialog && outside(event);
      });
      dialog.addEventListener('click', (event) => {
        if (pointerStartedOutside && event.target === dialog && outside(event)) dialog.close();
        pointerStartedOutside = false;
      });
    });

    // Only the muted opening scene may auto-play. All demos remain user initiated.
    const lazyLoad = (video) => {
      let changed = false;
      if (video.dataset.src) {
        video.src = video.dataset.src;
        delete video.dataset.src;
        changed = true;
      }
      $$('source[data-src]', video).forEach((source) => {
        source.src = source.dataset.src;
        delete source.dataset.src;
        changed = true;
      });
      if (changed) video.load();
    };
    videos.forEach(bindVideoPlayback);
    heroScene = window.createHeroScene?.({
      hero: $('.hero'),
      video: heroVideo,
      reducedMotion,
      canPlay: () => !activeVideoSession && !videos.some((video) => video !== heroVideo && isPlaying(video)),
      isDialogOpen: () => Boolean($('dialog[open]')),
    }) || null;
    if ('IntersectionObserver' in window) {
      mediaObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting) lazyLoad(video);
          if (video === heroVideo && heroScene) heroScene.setVisible(entry.isIntersecting);
          else if (!entry.isIntersecting) pauseVideo(video);
        });
      }, { threshold: 0 });
      videos.filter((video) => video !== expandedVideo).forEach((video) => mediaObserver.observe(video));
    } else {
      videos.forEach(lazyLoad);
      if (heroVideo) heroScene?.setVisible(isVisible(heroVideo));
      window.addEventListener('scroll', () => {
        videos.forEach((video) => {
          if (video === heroVideo && heroScene) heroScene.setVisible(isVisible(video));
          else if (video !== expandedVideo && !isVisible(video)) pauseVideo(video);
        });
      }, { passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') videos.forEach(pauseVideo);
    });

    const navToggle = $('.nav-toggle');
    const navLinks = $('#nav-links');
    const setMenuOpen = (open) => {
      if (!navToggle || !navLinks) return;
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      navLinks.classList.toggle('is-open', open);
    };
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true'));
      $$('a', navLinks).forEach((link) => link.addEventListener('click', () => setMenuOpen(false)));
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
          setMenuOpen(false);
          navToggle.focus({ preventScroll: true });
        }
      });
      document.addEventListener('click', (event) => {
        if (!event.target.closest('.site-nav')) setMenuOpen(false);
      });
      window.addEventListener('resize', () => {
        if (window.getComputedStyle(navToggle).display === 'none') setMenuOpen(false);
      }, { passive: true });
    }

    const progress = $('#reading-progress');
    const backToTop = $('#back-to-top');
    const sectionLinks = navLinks ? $$('a[href^="#"]', navLinks).map((link) => ({
      link,
      section: document.getElementById(link.getAttribute('href').slice(1)),
    })).filter((entry) => entry.section) : [];
    let scrollQueued = false;
    const updateScroll = () => {
      scrollQueued = false;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = range > 0 ? Math.max(0, Math.min(1, scrollTop / range)) : 0;
      if (progress) progress.style.transform = `scaleX(${fraction})`;
      if (backToTop) {
        const visible = scrollTop > 600;
        backToTop.classList.toggle('is-visible', visible);
        backToTop.hidden = !visible;
      }
      let active = null;
      const threshold = Math.min(180, window.innerHeight * 0.3);
      sectionLinks.forEach((entry) => {
        if (entry.section.getBoundingClientRect().top <= threshold) active = entry;
      });
      sectionLinks.forEach((entry) => {
        const selected = entry === active;
        entry.link.classList.toggle('is-active', selected);
        if (selected) entry.link.setAttribute('aria-current', 'location');
        else entry.link.removeAttribute('aria-current');
      });
    };
    const queueScrollUpdate = () => {
      if (!scrollQueued) {
        scrollQueued = true;
        window.requestAnimationFrame(updateScroll);
      }
    };
    window.addEventListener('scroll', queueScrollUpdate, { passive: true });
    window.addEventListener('resize', queueScrollUpdate, { passive: true });
    document.addEventListener('toggle', queueScrollUpdate, true);
    window.addEventListener('load', queueScrollUpdate);
    if ('ResizeObserver' in window) new ResizeObserver(queueScrollUpdate).observe(document.body);
    backToTop?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
      const target = $('.brand') || $('.skip-link');
      target?.focus({ preventScroll: true });
    });
    updateScroll();
  });
})();
