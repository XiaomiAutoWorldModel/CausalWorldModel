/* Offline comparison charts: grouped bars, complete metric heatmaps and legacy bars. */
(() => {
  'use strict';

  // Bars normally start at 0. A metric may declare `min` to start its axis higher so small gaps stay visible.
  const axisMin = metric => (Number.isFinite(metric.min) ? metric.min : 0);
  const scaledValue = (value, metric) => (value - axisMin(metric)) / (metric.max - axisMin(metric)) * 100;

  const initialize = () => {
    const tables = Array.from(document.querySelectorAll('details.result-data'));
    let printState = null;
    window.addEventListener('beforeprint', () => {
      if (!printState) printState = new Map(tables.map(details => [details, details.open]));
      tables.forEach(details => { details.open = true; });
    });
    window.addEventListener('afterprint', () => {
      if (!printState) return;
      printState.forEach((open, details) => { details.open = open; });
      printState = null;
    });

    const dataElement = document.getElementById('result-chart-data');
    if (!dataElement) return;
    let data;
    try {
      data = JSON.parse(dataElement.textContent);
    } catch (_) {
      return;
    }
    if (!data || !Array.isArray(data.charts)) return;

    // Observe the plot itself: card headings can appear well before the bars.
    const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motionStates = new Map();
    const presentationOf = chart => chart.presentation || 'bar';
    const motionEase = 'cubic-bezier(.22, 1, .36, 1)';
    let chartObserver = null;
    let printing = false;

    const stopAnimations = state => {
      state.animations.forEach(animation => animation.cancel());
      state.animations.clear();
    };
    const runAnimation = (state, element, frames, options) => {
      const animation = element.animate(frames, { easing: motionEase, fill: 'backwards', ...options });
      state.animations.add(animation);
      const release = () => state.animations.delete(animation);
      animation.onfinish = release;
      animation.oncancel = release;
    };
    const captureProgress = state => {
      const vertical = state.chart.orientation === 'vertical';
      const bars = state.plot.querySelectorAll(vertical ? '.chart-column-fill' : '.chart-fill');
      return Array.from(bars, (bar, index) => {
        const total = bar.parentElement?.[vertical ? 'clientHeight' : 'clientWidth'];
        const current = parseFloat(window.getComputedStyle?.(bar)[vertical ? 'height' : 'width']);
        return total > 0 && Number.isFinite(current)
          ? Math.max(0, Math.min(100, current / total * 100))
          : scaledValue(state.metric.values[index].value, state.metric);
      });
    };
    const animatePlot = (state, previous = null) => {
      stopAnimations(state);
      if (motionPreference?.matches || printing || document.visibilityState === 'hidden') return;
      const presentation = presentationOf(state.chart);
      if (presentation === 'heatmap') {
        try {
          state.plot.querySelectorAll('.chart-heatmap-row').forEach((row, index) => {
            runAnimation(state, row, [
              { opacity: 0, transform: 'translateY(8px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ], { duration: 350, delay: index * 60 });
          });
        } catch (_) {
          stopAnimations(state);
        }
        return;
      }
      const grouped = presentation === 'grouped';
      const vertical = !grouped && state.chart.orientation === 'vertical';
      const dimension = vertical ? 'height' : 'width';
      const bars = state.plot.querySelectorAll(vertical ? '.chart-column-fill' : '.chart-fill');
      const labels = state.plot.querySelectorAll(vertical ? '.chart-column-value' : '.chart-value');
      try {
        bars.forEach((bar, index) => {
          const from = previous ? previous[index] : 0;
          const metric = grouped ? state.chart.metrics[index % state.chart.metrics.length] : state.metric;
          const modelIndex = grouped ? Math.floor(index / state.chart.metrics.length) : index;
          const to = scaledValue(metric.values[modelIndex].value, metric);
          const delay = previous ? 0 : grouped
            ? modelIndex * 75 + (index % state.chart.metrics.length) * 35
            : index * 75;
          runAnimation(state, bar, [
            { [dimension]: `${from}%` },
            { [dimension]: `${to}%` },
          ], { duration: previous ? 520 : 850, delay });
          if (labels[index]) {
            runAnimation(state, labels[index], [{ opacity: 0 }, { opacity: 1 }],
              { duration: 300, delay: delay + (previous ? 80 : 200) });
          }
        });
        if (!previous) {
          runAnimation(state, state.plot, [
            { opacity: .45, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], { duration: 520 });
        }
      } catch (_) {
        // The final data stays in the DOM even if an animation API fails.
        stopAnimations(state);
      }
    };
    const revealPlot = (state, animate) => {
      state.shown = true;
      state.plot.classList.remove('chart-motion-pending');
      chartObserver?.unobserve(state.plot);
      if (animate) animatePlot(state);
      else stopAnimations(state);
    };
    const finishChartMotion = () => {
      motionStates.forEach(state => revealPlot(state, false));
    };
    if (typeof window.IntersectionObserver === 'function' &&
        typeof document.createElement('div').animate === 'function' && !motionPreference?.matches) {
      try {
        chartObserver = new window.IntersectionObserver(entries => {
          entries.forEach(entry => {
            const state = motionStates.get(entry.target);
            const tallerThanViewport = entry.boundingClientRect?.height >
              (entry.rootBounds?.height || window.innerHeight);
            if (!state || state.shown || !entry.isIntersecting ||
                (entry.intersectionRatio < .25 && !tallerThanViewport)) return;
            revealPlot(state, true);
          });
        }, { threshold: .25, rootMargin: '0px 0px -32px 0px' });
      } catch (_) {
        // Without viewport observation, retain the complete static plots.
      }
    }
    const prepareChartMotion = (plot, chart, metric) => {
      if (!chartObserver) return;
      const state = { plot, chart, metric, shown: false, animations: new Set() };
      motionStates.set(plot, state);
      try {
        chartObserver.observe(plot);
        plot.classList.add('chart-motion-pending');
      } catch (_) {
        revealPlot(state, false);
      }
    };
    motionPreference?.addEventListener?.('change', () => {
      if (motionPreference.matches) finishChartMotion();
    });
    window.addEventListener('beforeprint', () => {
      printing = true;
      finishChartMotion();
    });
    window.addEventListener('afterprint', () => { printing = false; });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') motionStates.forEach(stopAnimations);
    });

    const text = value => typeof value === 'string';
    const nonempty = value => text(value) && value.trim().length > 0;
    const validChart = chart => {
      if (!chart || !nonempty(chart.id) || !nonempty(chart.title) || !text(chart.benchmark) ||
          !['horizontal', 'vertical'].includes(chart.orientation) ||
          !['bar', 'grouped', 'heatmap'].includes(presentationOf(chart)) ||
          !Array.isArray(chart.models) || !chart.models.length ||
          !Array.isArray(chart.metrics) || !chart.metrics.length) return false;
      if (!chart.models.every(model => model && nonempty(model.label) &&
          typeof model.ours === 'boolean' && (model.meta === undefined || text(model.meta)))) return false;
      const metricIds = new Set();
      for (const metric of chart.metrics) {
        if (!metric || !nonempty(metric.id) || metricIds.has(metric.id) ||
            !nonempty(metric.label) || !text(metric.unit) ||
            (metric.shortLabel !== undefined && !nonempty(metric.shortLabel)) ||
            !['higher', 'lower'].includes(metric.better) ||
            !Number.isFinite(metric.max) || metric.max <= 0 ||
            (metric.min !== undefined && !(Number.isFinite(metric.min) && metric.min >= 0 && metric.min < metric.max)) ||
            !Array.isArray(metric.ticks) || !metric.ticks.length ||
            !metric.ticks.every(tick => Number.isFinite(tick) && tick >= axisMin(metric) && tick <= metric.max) ||
            new Set(metric.ticks).size !== metric.ticks.length ||
            !Array.isArray(metric.values) || metric.values.length !== chart.models.length ||
            !metric.values.every(item => item && Number.isFinite(item.value) &&
              item.value >= axisMin(metric) && item.value <= metric.max && nonempty(item.display)) ||
            !metric.headline || !nonempty(metric.headline.value) ||
            !nonempty(metric.headline.label) || !text(metric.headline.note)) return false;
        metricIds.add(metric.id);
      }
      if (presentationOf(chart) === 'grouped') {
        // A shared axis is meaningful only for two comparable metric scales.
        if (chart.metrics.length !== 2) return false;
        const first = chart.metrics[0];
        const second = chart.metrics[1];
        if (first.max !== second.max || first.unit !== second.unit || first.better !== second.better ||
            first.ticks.length !== second.ticks.length ||
            first.ticks.some(tick => !second.ticks.includes(tick))) return false;
      }
      return metricIds.has(chart.defaultMetric);
    };

    const create = (tag, className, content) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (content !== undefined) element.textContent = content;
      return element;
    };
    const hideFromAT = element => {
      element.setAttribute('aria-hidden', 'true');
      return element;
    };
    const percentage = (value, metric) => `${scaledValue(value, metric)}%`;
    const tickLabels = (axis, metric, reverse = false) => {
      const ticks = [...metric.ticks].sort((a, b) => a - b);
      if (reverse) ticks.reverse();
      ticks.forEach(tick => axis.append(create('span', '', String(tick))));
    };
    const buildPlot = (chart, metric) => {
      const fragment = document.createDocumentFragment();
      const presentation = presentationOf(chart);
      if (presentation === 'grouped') {
        const axis = hideFromAT(create('div', 'chart-group-axis chart-axis'));
        tickLabels(axis, chart.metrics[0]);
        const groups = create('ol', 'chart-groups');
        chart.models.forEach((model, modelIndex) => {
          const group = create('li', `chart-group${model.ours ? ' is-ours' : ''}`);
          const label = create('div', 'chart-group-label', model.label);
          if (model.meta) label.append(create('small', 'chart-method-meta', model.meta));
          const pair = create('div', 'chart-group-pair');
          chart.metrics.forEach((seriesMetric, seriesIndex) => {
            const item = seriesMetric.values[modelIndex];
            const series = create('div', `chart-series series-${seriesIndex}`);
            const name = create('span', 'chart-series-name', seriesMetric.shortLabel || seriesMetric.label);
            name.setAttribute('title', seriesMetric.label);
            const track = hideFromAT(create('div', 'chart-track'));
            const fill = create('span', 'chart-fill');
            fill.style.setProperty('--bar-size', percentage(item.value, seriesMetric));
            track.append(fill);
            series.append(name, track, create('span', 'chart-value', item.display));
            pair.append(series);
          });
          group.append(label, pair);
          groups.append(group);
        });
        fragment.append(axis, groups);
      } else if (presentation === 'heatmap') {
        const scroll = create('div', 'chart-heatmap-scroll');
        scroll.setAttribute('tabindex', '0');
        scroll.setAttribute('role', 'region');
        scroll.setAttribute('aria-label', `${chart.title} complete metrics`);
        const table = create('table', 'chart-heatmap');
        const directions = new Set(chart.metrics.map(column => column.better));
        const comparison = directions.size === 1
          ? `${chart.metrics[0].better} is better.`
          : 'Comparison direction follows each metric.';
        table.append(create('caption', 'sr-only',
          `${chart.title}: all metrics; ${comparison} Color indicates relative performance within each column.`));
        const head = create('thead');
        const headers = create('tr');
        const methodHeader = create('th', '', 'Method');
        methodHeader.setAttribute('scope', 'col');
        headers.append(methodHeader);
        chart.metrics.forEach(column => {
          const heading = create('th', '', column.shortLabel || column.label);
          heading.setAttribute('scope', 'col');
          heading.setAttribute('title', column.label);
          headers.append(heading);
        });
        head.append(headers);
        const body = create('tbody');
        const ranges = chart.metrics.map(column => {
          const numbers = column.values.map(item => item.value);
          return { min: Math.min(...numbers), max: Math.max(...numbers) };
        });
        chart.models.forEach((model, modelIndex) => {
          const row = create('tr', `chart-heatmap-row${model.ours ? ' is-ours' : ''}`);
          const method = create('th', '', model.label);
          method.setAttribute('scope', 'row');
          if (model.meta) method.append(create('small', 'chart-method-meta', model.meta));
          row.append(method);
          chart.metrics.forEach((column, columnIndex) => {
            const item = column.values[modelIndex];
            const { min, max } = ranges[columnIndex];
            const normalized = max === min ? 0.5 : (column.better === 'lower'
              ? (max - item.value) / (max - min) : (item.value - min) / (max - min));
            const best = item.value === (column.better === 'lower' ? min : max);
            const cell = create('td', best ? 'is-best' : '');
            cell.style.setProperty('--heat', String(normalized));
            cell.setAttribute('title', `${column.label}: ${item.display}${column.unit ? ` ${column.unit}` : ''}`);
            cell.append(create('span', 'chart-heatmap-value', item.display));
            row.append(cell);
          });
          body.append(row);
        });
        table.append(head, body);
        scroll.append(table);
        fragment.append(scroll);
      } else if (chart.orientation === 'horizontal') {
        const axis = hideFromAT(create('div', 'chart-axis'));
        tickLabels(axis, metric);
        const bars = create('ol', 'chart-bars');
        chart.models.forEach((model, index) => {
          const item = metric.values[index];
          const bar = create('li', `chart-bar${model.ours ? ' is-ours' : ''}`);
          const label = create('div', 'chart-bar-label');
          const method = create('span', 'chart-method', model.label);
          if (model.meta) method.append(create('small', 'chart-method-meta', model.meta));
          label.append(method, create('span', 'chart-value', item.display));
          const track = hideFromAT(create('div', 'chart-track'));
          const fill = create('span', 'chart-fill');
          fill.style.setProperty('--bar-size', percentage(item.value, metric));
          track.append(fill);
          bar.append(label, track);
          bars.append(bar);
        });
        fragment.append(axis, bars);
      } else {
        const vertical = create('div', 'chart-vertical');
        const axis = hideFromAT(create('div', 'chart-y-axis'));
        tickLabels(axis, metric, true);
        const columns = create('ol', 'chart-columns');
        chart.models.forEach((model, index) => {
          const item = metric.values[index];
          const column = create('li', `chart-column${model.ours ? ' is-ours' : ''}`);
          column.style.setProperty('--bar-size', percentage(item.value, metric));
          const space = hideFromAT(create('div', 'chart-column-space'));
          const fill = create('div', 'chart-column-fill');
          fill.append(create('span', 'chart-column-value', item.display));
          space.append(fill);
          const label = hideFromAT(create('span', 'chart-column-label', model.label));
          column.append(space, label, create('span', 'sr-only',
            `${model.label}: ${item.display}${metric.unit ? ` ${metric.unit}` : ''}`));
          columns.append(column);
        });
        vertical.append(axis, columns);
        fragment.append(vertical);
      }
      return fragment;
    };

    const chartCounts = new Map();
    data.charts.forEach(chart => {
      if (chart && text(chart.id)) chartCounts.set(chart.id, (chartCounts.get(chart.id) || 0) + 1);
    });
    const elements = Array.from(document.querySelectorAll('.result-chart[data-result-chart]'));
    const initialized = new Set();
    const panels = new Set();

    elements.forEach(element => {
      const panel = element.closest('.evidence-panel');
      if (panel) panels.add(panel);
      const id = element.getAttribute('data-result-chart');
      const chart = data.charts.find(candidate => candidate && candidate.id === id);
      if (chartCounts.get(id) !== 1 || !validChart(chart)) return;
      const plot = element.querySelector('[data-chart-plot]');
      const headlineValue = element.querySelector('[data-chart-headline-value]');
      const headlineLabel = element.querySelector('[data-chart-headline-label]');
      const context = element.querySelector('[data-chart-context]');
      const direction = element.querySelector('[data-chart-direction]');
      const selector = element.querySelector('[data-chart-metric]');
      const status = element.querySelector('[data-chart-status]');
      const singleMetricView = presentationOf(chart) === 'bar';
      if (!plot || !headlineValue || !headlineLabel || !context || !direction ||
          (singleMetricView && (!status || (chart.metrics.length > 1 && !selector)))) return;

      const render = (metric, announce) => {
        // Build off-DOM first so the static plot survives invalid data or construction failure.
        const content = buildPlot(chart, metric);
        const motion = motionStates.get(plot);
        const previous = motion?.shown && singleMetricView ? captureProgress(motion) : null;
        if (motion) stopAnimations(motion);
        plot.replaceChildren(content);
        plot.classList.add(`chart-presentation-${presentationOf(chart)}`);
        headlineValue.textContent = metric.headline.value;
        headlineLabel.textContent = metric.headline.label;
        // The context line already says what the number is; "Our ..." labels only repeat it.
        headlineLabel.hidden = /^Our\b/.test(metric.headline.label);
        context.textContent = metric.headline.note;
        const mixedDirections = presentationOf(chart) === 'heatmap' &&
          new Set(chart.metrics.map(column => column.better)).size > 1;
        direction.textContent = mixedDirections ? 'Arrows show the better direction' :
          `${metric.better === 'higher' ? 'Higher' : 'Lower'} is better` +
          (metric.unit ? ` · ${metric.unit}` : '');
        // "Higher is better" is the default reading; only call out the exceptions.
        direction.hidden = !mixedDirections && metric.better === 'higher';
        if (announce && status) {
          const ours = chart.models.map((model, index) => model.ours
            ? `${model.label}: ${metric.values[index].display}${metric.unit ? ` ${metric.unit}` : ''}`
            : null).filter(Boolean);
          status.textContent = `${metric.label} selected${ours.length ? `. ${ours.join('; ')}` : ''}.`;
        }
        if (motion) {
          motion.metric = metric;
          if (announce && motion.shown) animatePlot(motion, previous);
        }
      };

      try {
        render(chart.metrics.find(metric => metric.id === chart.defaultMetric), false);
        if (selector && singleMetricView) {
          const options = document.createDocumentFragment();
          chart.metrics.forEach(metric => {
            const option = create('option', '', metric.label);
            option.value = metric.id;
            options.append(option);
          });
          selector.replaceChildren(options);
          selector.value = chart.defaultMetric;
          selector.disabled = chart.metrics.length < 2;
          if (!selector.hasAttribute('aria-label') && !selector.hasAttribute('aria-labelledby')) {
            selector.setAttribute('aria-label', `${chart.title} metric`);
          }
          selector.addEventListener('change', () => {
            const metric = chart.metrics.find(candidate => candidate.id === selector.value);
            if (metric) render(metric, true);
          });
        }
        initialized.add(element);
        prepareChartMotion(plot, chart, chart.metrics.find(metric => metric.id === chart.defaultMetric));
      } catch (_) {
        // Keep the pre-rendered report readable if enhancement is unavailable.
        if (selector) selector.disabled = true;
      }
    });

    panels.forEach(panel => {
      const charts = elements.filter(element => element.closest('.evidence-panel') === panel);
      if (!charts.length || !charts.every(element => initialized.has(element))) return;
      tables.filter(details => details.closest('.evidence-panel') === panel)
        .forEach(details => { details.open = false; });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
