/* Ablation-study carousel with looping playback for the visible sample. */
(() => {
  'use strict';

  const root = document.querySelector('[data-ablation-carousel]');
  if (!root) return;

  const track = root.querySelector('[data-ablation-track]');
  const cards = Array.from(root.querySelectorAll('[data-ablation-card]'));
  const controls = root.querySelector('[data-ablation-controls]');
  const buttons = Array.from(root.querySelectorAll('[data-ablation-direction]'));
  if (!track || !cards.length) return;

  let activeIndex = 0;
  let scrollFrame = null;

  if (controls) controls.hidden = false;

  function updatePlayback() {
    cards.forEach((card, index) => {
      card.querySelectorAll('video').forEach(video => {
        video.muted = true;
        if (index === activeIndex && !document.hidden) video.play().catch(() => {});
        else video.pause();
      });
    });
  }

  function updateActive(nextIndex) {
    activeIndex = Math.max(0, Math.min(cards.length - 1, nextIndex));
    cards.forEach((card, index) => card.toggleAttribute('data-active', index === activeIndex));
    if (buttons[0]) buttons[0].disabled = activeIndex === 0;
    if (buttons[1]) buttons[1].disabled = activeIndex === cards.length - 1;
    updatePlayback();
  }

  function cardLeft(card) {
    return card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
  }

  function goTo(index, behavior = 'smooth') {
    const next = Math.max(0, Math.min(cards.length - 1, index));
    updateActive(next);
    track.scrollTo({ left: cardLeft(cards[next]), behavior });
  }

  function nearestCardIndex() {
    const trackLeft = track.getBoundingClientRect().left;
    return cards.reduce((best, card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
  }

  buttons.forEach(button => button.addEventListener('click', () => {
    const direction = Number(button.dataset.ablationDirection) || 1;
    goTo(activeIndex + direction);
  }));

  track.addEventListener('scroll', () => {
    if (scrollFrame !== null) cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      updateActive(nearestCardIndex());
    });
  }, { passive: true });

  track.addEventListener('keydown', event => {
    const moves = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: cards.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    goTo(moves[event.key]);
  });

  window.addEventListener('resize', () => goTo(activeIndex, 'auto'));
  document.addEventListener('visibilitychange', updatePlayback);

  updateActive(0);
})();
