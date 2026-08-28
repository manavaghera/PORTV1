/**
 * Brutalist Preloader for Manav Aghera Portfolio
 * - Cream background (#F8F3EC), Anton display type, red accent (#DC201E)
 * - Self-assembling letter animation
 * - Eased 0-100% counter & fake token-burn Easter Egg
 * - Vertical split panel reveal
 * - Session-based micro preloader vs full preloader
 * - Reduced motion & emergency kill-switch safeguards
 */
(() => {
  'use strict';

  const CONFIG = {
    MIN_DURATION: 3000,      // Visible progress duration (ms)
    EXIT_DURATION: 600,      // Exit split panel transition time (ms)
    SHOW_TOKEN_EASTER_EGG: true,
    SESSION_FLAG_KEY: 'portfolio_preloader_seen',
    KILL_SWITCH_MS: 4500
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSubsequent = Boolean(sessionStorage.getItem(CONFIG.SESSION_FLAG_KEY));

  // Signal main.js that preloader controls initial hero reveal timing
  window.preloaderActive = true;

  const lockScroll = () => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  };

  const unlockScroll = () => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  };

  lockScroll();

  // Helper to format token loading string: "LOADING TOKENS: ██████░░ 4.2B/5.2B"
  const formatTokens = (pct) => {
    const totalBlocks = 8;
    const filledBlocks = Math.round((pct / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;
    const blocksStr = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
    const currentTokens = (5.2 * (pct / 100)).toFixed(1);
    return `LOADING TOKENS: ${blocksStr} ${currentTokens}B/5.2B`;
  };

  // --- SUBSEQUENT VISIT: MICRO PRELOADER (0.4s 2px red sweep) ---
  if (isSubsequent && !reduced) {
    const runMicro = () => {
      const micro = document.createElement('div');
      micro.className = 'preloader-micro';
      const bar = document.createElement('div');
      bar.className = 'preloader-micro-bar';
      micro.appendChild(bar);
      (document.body || document.documentElement).appendChild(micro);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bar.style.width = '100%';
        });
      });

      setTimeout(() => {
        bar.style.opacity = '0';
        unlockScroll();
        if (window.triggerHeroReveal) window.triggerHeroReveal();
        setTimeout(() => micro.remove(), 180);
      }, 400);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runMicro);
    } else {
      runMicro();
    }
    return;
  }

  // --- PREFERS REDUCED MOTION ---
  if (reduced) {
    sessionStorage.setItem(CONFIG.SESSION_FLAG_KEY, 'true');
    const runReduced = () => {
      unlockScroll();
      if (window.triggerHeroReveal) window.triggerHeroReveal();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runReduced);
    } else {
      setTimeout(runReduced, 600);
    }
    return;
  }

  // --- FULL PRELOADER (FIRST VISIT) ---
  sessionStorage.setItem(CONFIG.SESSION_FLAG_KEY, 'true');

  const buildPanelContent = () => `
    <div class="preloader-inner">
      <div class="preloader-top-row">
        <div class="preloader-tl f-mono">PORTFOLIO — 2025</div>
      </div>
      <div class="preloader-center">
        <h1 class="preloader-title f-anton">
          <span class="word word-black">
            <span class="char-wrap"><span class="char" style="animation-delay:0ms">M</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:40ms">A</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:80ms">N</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:120ms">A</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:160ms">V</span></span>
          </span>
          <span class="word word-red">
            <span class="char-wrap"><span class="char" style="animation-delay:200ms">A</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:240ms">G</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:280ms">H</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:320ms">E</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:360ms">R</span></span>
            <span class="char-wrap"><span class="char" style="animation-delay:400ms">A</span></span>
          </span>
        </h1>
      </div>
      <div class="preloader-bottom-row">
        <div class="preloader-bl f-mono">AI/ML ENGINEER — VADODARA, IN</div>
        <div class="preloader-bc f-mono js-preloader-tokens">LOADING TOKENS: ░░░░░░░░ 0.0B/5.2B</div>
        <div class="preloader-br f-mono js-preloader-counter">00%</div>
      </div>
      <div class="preloader-bar"><div class="preloader-progress js-preloader-progress"></div></div>
    </div>
  `;

  let overlay, counters, progresses, tokens, titles;
  let startTime = null;
  let animationFrameId = null;
  let isDone = false;
  let killSwitchTimer = null;

  const initDOM = () => {
    overlay = document.createElement('div');
    overlay.className = 'preloader-overlay';
    overlay.id = 'preloaderOverlay';

    const topPanel = document.createElement('div');
    topPanel.className = 'preloader-panel preloader-panel-top';
    topPanel.innerHTML = buildPanelContent();

    const bottomPanel = document.createElement('div');
    bottomPanel.className = 'preloader-panel preloader-panel-bottom';
    bottomPanel.innerHTML = buildPanelContent();

    overlay.appendChild(topPanel);
    overlay.appendChild(bottomPanel);

    (document.body || document.documentElement).prepend(overlay);

    counters = overlay.querySelectorAll('.js-preloader-counter');
    progresses = overlay.querySelectorAll('.js-preloader-progress');
    tokens = overlay.querySelectorAll('.js-preloader-tokens');
    titles = overlay.querySelectorAll('.preloader-title');

    // Hard Kill-Switch safeguard
    killSwitchTimer = setTimeout(forceExit, CONFIG.KILL_SWITCH_MS);

    // Start progress counter via rAF
    animationFrameId = requestAnimationFrame(updateProgress);
  };

  const forceExit = () => {
    if (isDone) return;
    isDone = true;
    clearTimeout(killSwitchTimer);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    unlockScroll();
    if (window.triggerHeroReveal) window.triggerHeroReveal();
    if (overlay && overlay.parentNode) overlay.remove();
  };

  const finishPreloader = () => {
    if (isDone) return;
    isDone = true;

    // Ensure 100% display
    counters.forEach(c => c.textContent = '100%');
    progresses.forEach(p => p.style.width = '100%');
    if (CONFIG.SHOW_TOKEN_EASTER_EGG) {
      tokens.forEach(t => t.textContent = formatTokens(100));
    }

    // 1. Quick unified pulse at 100% (150ms)
    titles.forEach(t => t.classList.add('pulse'));

    setTimeout(() => {
      titles.forEach(t => t.classList.remove('pulse'));

      // 2. Start split exit sequence
      overlay.classList.add('exiting');
      unlockScroll();

      // 3. Coordinate timing: trigger hero reveal at ~50% of exit animation (300ms)
      setTimeout(() => {
        if (window.triggerHeroReveal) window.triggerHeroReveal();
      }, 300);

      // 4. Self-remove node from DOM after exit animation completes
      setTimeout(() => {
        clearTimeout(killSwitchTimer);
        if (overlay && overlay.parentNode) overlay.remove();
      }, CONFIG.EXIT_DURATION + 50);

    }, 150);
  };

  const updateProgress = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const rawRatio = Math.min(1, elapsed / CONFIG.MIN_DURATION);
    // Eased progress curve (fast start, slight slow near 100%)
    const easedRatio = 1 - Math.pow(1 - rawRatio, 2.2);
    const pct = Math.min(100, Math.floor(easedRatio * 100));

    if (counters) counters.forEach(c => c.textContent = String(pct).padStart(2, '0') + '%');
    if (progresses) progresses.forEach(p => p.style.width = pct + '%');
    if (CONFIG.SHOW_TOKEN_EASTER_EGG && tokens) {
      const tokenText = formatTokens(pct);
      tokens.forEach(t => t.textContent = tokenText);
    }

    if (elapsed < CONFIG.MIN_DURATION) {
      animationFrameId = requestAnimationFrame(updateProgress);
    } else {
      finishPreloader();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDOM);
  } else {
    initDOM();
  }

})();
