/* All examples are displayed vertically. Muted videos loop on screen. */
(() => {
  'use strict';
  const data = window.SUPPLEMENT_DATA;
  if (!data) return;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = '<svg class="icon" aria-hidden="true"><use href="#i-expand"/></svg>';
  const descriptions = {
    physicsiq: 'Image-to-video · shared initial observation',
    phygenbench: 'Text-to-video · independently generated initial scenes',
    robotwin: 'Held-out randomized manipulation · paired video comparison'
  };
  const gallery = $('#comparison-examples');
  const dialog = $('#media-dialog');
  let benchmark = 'physicsiq';
  let videos = [];
  let observer = null;
  let previouslyFocused = null;

  $('#interactive-gallery').hidden = false;
  $('#results-nav').hidden = false;

  // Retain the template's segmented controls and slider geometry.
  function updateTabs(selector, selected) {
    $$(selector).forEach(button => {
      const active = button === selected;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    if (!selected) return;
    const nav = selected.closest('.tabs-nav');
    const slider = nav.querySelector('.tabs-slider');
    slider.style.width = `${selected.offsetWidth}px`;
    slider.style.height = `${selected.offsetHeight}px`;
    slider.style.transform = `translate(${selected.offsetLeft - nav.clientLeft}px, ${selected.offsetTop - nav.clientTop}px)`;
  }
  function refreshTabs() {
    updateTabs('[data-benchmark]', $('[data-benchmark][aria-selected="true"]'));
    updateTabs('[data-results]', $('[data-results][aria-selected="true"]'));
  }
  window.addEventListener('resize', refreshTabs);
  if (document.fonts) document.fonts.ready.then(refreshTabs);

  function updatePlayback() {
    videos.forEach(video => {
      if (video.dataset.visible === 'true' && !document.hidden && !dialog.open) {
        video.muted = true;
        if (!video.getAttribute('src')) video.src = video.dataset.src;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }
  function releaseVideos() {
    if (observer) observer.disconnect();
    videos.forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
    videos = [];
  }
  function observeExamples() {
    videos = Array.from(gallery.querySelectorAll('video'));
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.target.querySelectorAll('video').forEach(video => {
            video.dataset.visible = String(entry.isIntersecting);
          });
        });
        updatePlayback();
      }, { threshold: 0 });
      gallery.querySelectorAll('.comparison-videos').forEach(row => observer.observe(row));
    } else {
      videos.forEach(video => { video.dataset.visible = 'true'; });
      updatePlayback();
    }
  }

  function selectBenchmark(key, number = null, updateHash = true) {
    const examples = data.benchmarks[key];
    if (!examples) return;
    releaseVideos();
    benchmark = key;
    updateTabs('[data-benchmark]', $(`[data-benchmark="${key}"]`));
    $('#gallery-panel').setAttribute('aria-labelledby', `tab-${key}`);
    $('#benchmark-setting').textContent = descriptions[key];
    gallery.innerHTML = examples.map(example => `
      <article class="comparison-example" id="example-${key}-${example.number}" data-example="${example.number}" aria-labelledby="title-${key}-${example.number}">
        <div class="case-description">
          ${example.input ? `<button class="input-thumb" type="button" data-input="${example.number}" aria-label="Enlarge the initial image for ${esc(example.title)}"><img src="${esc(example.input)}" alt="${esc(example.inputLabel || 'Input image')}: ${esc(example.title)}" loading="lazy" decoding="async"><span>${esc(example.inputLabel || 'Input image')}</span></button>` : ''}
          <div class="case-description-copy"><h3 id="title-${key}-${example.number}">${esc(example.title)}</h3><p>${esc(example.prompt)}</p></div>
        </div>
        <div class="comparison-videos" style="--columns: ${example.videos.length}">
          ${example.videos.map((clip, index) => `<div class="threeup-cell">
            <div class="video-heading"><div><span class="video-name">${esc(clip.name)}</span><span class="video-detail">${esc(clip.detail)}</span></div><button class="btn expand-video" type="button" data-video-index="${index}" aria-label="Expand ${esc(clip.name)} video for ${esc(example.title)}">${icon}</button></div>
            <div class="media-frame"><video autoplay muted loop playsinline preload="none" poster="${esc(clip.poster)}" data-src="${esc(clip.src)}" aria-label="${esc(clip.name)}: ${esc(example.title)}"></video></div>
          </div>`).join('')}
        </div>
      </article>`).join('');
    observeExamples();
    if (number !== null) {
      const target = document.getElementById(`example-${key}-${number}`);
      if (target) target.scrollIntoView();
    }
    if (updateHash) {
      try { history.replaceState(null, '', `#compare/${key}${number === null ? '' : `/${number}`}`); } catch (_) { /* file:// still supports the gallery. */ }
    }
  }
  $$('[data-benchmark]').forEach(button => button.addEventListener('click', () => selectBenchmark(button.dataset.benchmark)));

  function renderResults(key) {
    if (!data.tables[key]) return;
    $$('.results-panel').forEach(panel => { panel.hidden = panel.id !== `results-${key}`; });
    updateTabs('[data-results]', $(`[data-results="${key}"]`));
  }
  $$('[data-results]').forEach(button => button.addEventListener('click', () => renderResults(button.dataset.results)));

  function openDialog(title, content, caption) {
    previouslyFocused = document.activeElement;
    $('#dialog-title').textContent = title;
    $('#dialog-content').replaceChildren(content);
    $('#dialog-caption').textContent = caption;
    dialog.showModal();
    $('#dialog-close').focus();
    updatePlayback();
  }
  gallery.addEventListener('click', event => {
    const button = event.target.closest('[data-video-index], [data-input]');
    if (!button) return;
    const number = Number(button.closest('[data-example]').dataset.example);
    const example = data.benchmarks[benchmark].find(item => item.number === number);
    if (button.hasAttribute('data-video-index')) {
      const clip = example.videos[Number(button.dataset.videoIndex)];
      const video = document.createElement('video');
      video.src = clip.src; video.poster = clip.poster;
      video.autoplay = true; video.muted = true; video.loop = true; video.playsInline = true;
      video.className = 'dialog-video';
      openDialog(`${clip.name} · ${example.title}`, video, clip.detail);
      video.play().catch(() => {});
    } else {
      const image = document.createElement('img');
      image.src = example.input; image.alt = example.inputLabel || 'Input image'; image.className = 'dialog-image';
      openDialog(image.alt, image, example.title);
    }
  });
  $('#dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    $$('dialog video').forEach(video => { video.pause(); video.removeAttribute('src'); video.load(); });
    $('#dialog-content').replaceChildren();
    if (previouslyFocused && previouslyFocused.isConnected) previouslyFocused.focus();
    updatePlayback();
  });
  document.addEventListener('visibilitychange', () => {
    const expanded = dialog.querySelector('video');
    if (expanded) {
      if (document.hidden) expanded.pause();
      else expanded.play().catch(() => {});
    }
    updatePlayback();
  });

  function setupKeyboardTabs(selector) {
    const tabs = $$(selector);
    tabs.forEach((button, index) => button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click(); tabs[next].focus();
    }));
  }
  setupKeyboardTabs('[data-benchmark]'); setupKeyboardTabs('[data-results]');
  function readHash(scroll = false) {
    const match = location.hash.match(/^#compare\/(physicsiq|phygenbench|robotwin)(?:\/(\d+))?$/);
    if (!match) return false;
    const number = match[2] ? Number(match[2]) : null;
    selectBenchmark(match[1], number, false);
    if (scroll && number === null) $('#comparisons').scrollIntoView();
    return true;
  }
  window.addEventListener('hashchange', () => readHash(true));
  if (!readHash(true)) selectBenchmark('physicsiq', null, false);
  renderResults('physicsiq');
  window.supplementaryApp = { selectBenchmark, renderResults, get benchmark() { return benchmark; } };
})();
