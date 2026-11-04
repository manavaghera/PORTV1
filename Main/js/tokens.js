/**
 * The token estimate: my rough lifetime count of AI tokens used, shown in the hero's footer
 * line and in the dock. It climbs at about my average rate. It's an estimate, not a meter.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const MA = window.MA = window.MA || {};
  const dockTok = $('dockTok'), heroTok = $('heroTok'), flame = $('dockFlame');
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const narrow = matchMedia('(max-width:600px)'); // the dock shows a short number on phones

  const LIFE_BASE = 10240000000, LIFE_T0 = Date.UTC(2026, 9, 14, 18, 30), LIFE_RATE = 650; // tokens/s since 15 Oct 2026 IST
  const lifetime = MA.lifetime = () => LIFE_BASE + Math.max(0, Date.now() - LIFE_T0) / 1000 * LIFE_RATE;
  MA.tokRate = LIFE_RATE;

  const paint = () => {
    const n = lifetime(), v = fmt(Math.floor(n));
    if (dockTok) dockTok.textContent = '≈' + (narrow.matches ? (n / 1e9).toFixed(2) + 'B' : v);
    if (heroTok) heroTok.textContent = '≈' + v;
  };
  /* every few seconds the number moves on and the dock's flame flickers once */
  const tick = () => {
    paint();
    if (flame) { flame.classList.add('hot'); setTimeout(() => flame.classList.remove('hot'), 900); }
    setTimeout(tick, 2200 + Math.random() * 1800);
  };
  paint();
  setTimeout(tick, 1600);
  narrow.addEventListener('change', paint);
})();
