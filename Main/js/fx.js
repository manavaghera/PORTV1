/**
 * Small pleasures: a dark/light theme switch, scroll
 * progress, a velocity-reactive marquee, magnetic buttons, spotlight cards,
 * confetti and a couple of easter eggs.
 */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const MA = window.MA = window.MA || {};
  const toast = msg => MA.toast && MA.toast(msg);

  /* ── theme: premium dark (default) or light ── */
  const meta = $('meta[name="theme-color"]'), themeBtn = $('#themeBtn');
  const setTheme = MA.setTheme = (name, save = true) => {
    if (name !== 'dark' && name !== 'light') return;
    if (name === 'light') root.dataset.theme = 'light'; else delete root.dataset.theme;
    if (themeBtn) themeBtn.setAttribute('aria-label', `Switch to ${name === 'light' ? 'dark' : 'light'} theme`);
    if (save) { try { localStorage.setItem('ma-theme', name); } catch (e) { /* storage blocked — theme still applies */ } }
    if (meta) meta.content = getComputedStyle(root).getPropertyValue('--c0').trim() || '#031211';
    dispatchEvent(new CustomEvent('themechange', { detail: name }));
  };
  /* ── palette: Lumora (default) or Field ── */
  const PALS = ['lumora', 'field'];
  const setPalette = MA.setPalette = (name, save = true) => {
    if (!PALS.includes(name)) return;
    if (name === 'lumora') delete root.dataset.palette; else root.dataset.palette = name;
    if (save) { try { localStorage.setItem('ma-pal', name); } catch (e) { /* storage blocked — palette still applies */ } }
    $$('.pal [data-pal]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pal === name)));
    if (meta) meta.content = getComputedStyle(root).getPropertyValue('--c0').trim() || '#031211';
    dispatchEvent(new CustomEvent('themechange', { detail: root.dataset.theme === 'light' ? 'light' : 'dark' }));
  };
  /* each palette has its own hero, so switching plays a curtain and reloads into the other one */
  MA.switchPalette = (name, x = innerWidth / 2, y = innerHeight / 2) => {
    if (!PALS.includes(name) || name === (root.dataset.palette || 'lumora')) return;
    if (MA.achieve) MA.achieve('worlds');
    try { localStorage.setItem('ma-pal', name); sessionStorage.setItem('ma-pal-in', '1'); } catch (e) { setPalette(name, false); return; }
    const c = document.createElement('div'), label = document.createElement('span');
    c.className = 'curtain'; c.dataset.to = name;
    c.style.setProperty('--x', `${Math.round(x)}px`); c.style.setProperty('--y', `${Math.round(y)}px`);
    label.textContent = name === 'field' ? 'Field' : 'Lumora';
    c.append(label); document.body.append(c);
    void c.offsetWidth; // commit the closed circle so the opening transitions
    c.classList.add('go');
    setTimeout(() => location.reload(), reduced ? 0 : 800);
  };
  /* on phones the floating picker would sit on top of the text, so the menu carries a copy */
  const pal = document.querySelector('.pal'), menu = document.getElementById('menu');
  if (pal && menu) { const copy = pal.cloneNode(true); copy.classList.add('pal-menu'); menu.insertBefore(copy, menu.querySelector('.btn')); }
  $$('.pal [data-pal]').forEach(b => b.addEventListener('click', e => MA.switchPalette(b.dataset.pal, e.clientX, e.clientY)));
  setPalette(root.dataset.palette || 'lumora', false);
  setTimeout(() => root.classList.remove('pal-in'), 1600);
  if (themeBtn) themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    toast(next === 'light' ? 'Light theme' : 'Dark theme');
  });
  setTheme(root.dataset.theme === 'light' ? 'light' : 'dark', false);
  const dock = $('#dock');

  /* ── scroll progress + velocity marquee ── */
  const bar = document.createElement('i');
  bar.className = 'progress';
  document.body.append(bar);
  const rows = $$('.band-row').map(row => {
    const track = $('.band-track', row);
    const w = track.offsetWidth || 1;
    for (let i = 0; i < Math.ceil((innerWidth * 2) / w) + 1; i++) row.append(track.cloneNode(true));
    return { row, track, v: parseFloat(row.dataset.v) || 1, x: 0, w };
  });
  const band = $('.band');
  let bandOn = false, lastY = scrollY, acc = 0, dir = 1, boost = 0, prev = 0, running = false;
  /* sizes are read when they change, never inside a frame loop (reading layout there forces a reflow every frame) */
  let max = 1, vh = innerHeight, dockOn = null;
  const measure = () => { vh = innerHeight; max = Math.max(1, document.documentElement.scrollHeight - vh); rows.forEach(r => { r.w = r.track.offsetWidth || 1; }); };
  measure();
  new ResizeObserver(measure).observe(document.body);
  addEventListener('resize', measure);
  /* progress bar and dock follow the scroll event itself; no frame loop needed for them */
  const onScroll = () => {
    const y = scrollY;
    bar.style.transform = `scaleX(${(Math.min(1, y / max)).toFixed(4)})`;
    const on = y > vh * .6;
    if (dock && on !== dockOn) { dockOn = on; dock.classList.toggle('on', on); }
    acc += y - lastY;
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  /* the marquee only animates while the band is on screen */
  const loop = now => {
    if (!bandOn || reduced) { running = false; return; }
    const dt = Math.min(.05, (now - (prev || now)) / 1000);
    prev = now;
    const dy = acc;
    acc = 0;
    if (dy) dir = dy > 0 ? 1 : -1;
    boost += (Math.min(60, Math.abs(dy)) - boost) * .08;
    rows.forEach(r => {
      const w = r.w;
      r.x -= (55 + boost * 26) * dir * r.v * dt;
      if (r.x <= -w) r.x += w;
      if (r.x > 0) r.x -= w;
      r.row.style.transform = `translate3d(${r.x.toFixed(1)}px,0,0) skewX(${(-boost * .25 * dir * Math.sign(r.v)).toFixed(2)}deg)`;
    });
    requestAnimationFrame(loop);
  };
  if (band) new IntersectionObserver(es => es.forEach(e => {
    bandOn = e.isIntersecting;
    if (bandOn && !running && !reduced) { running = true; prev = 0; acc = 0; requestAnimationFrame(loop); }
  })).observe(band);

  /* CSS animations inside sections that are off screen are paused: each one would otherwise cost style work every frame */
  const sleepy = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('asleep', !e.isIntersecting)), { rootMargin: '150px 0px' });
  $$('main > section, main > .band, footer').forEach(s => sleepy.observe(s));

  /* ── magnetic buttons + spotlight cards ── */
  if (fine && !reduced) {
    $$('.btn, .icon-link, .nav-cta, .nav-k').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = Math.max(-10, Math.min(10, (e.clientX - r.left - r.width / 2) * .22));
        const y = Math.max(-8, Math.min(8, (e.clientY - r.top - r.height / 2) * .3));
        el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
  if (fine) {
    $$('.stop, .term, .repos, .heat-card, .prompt, .badge, .gh-stats > div, .viewer-frame, .net-box').forEach(el => {
      el.classList.add('spot');
      const f = document.createElement('i'), r = document.createElement('i');
      f.className = 'spot-fill'; r.className = 'spot-ring';
      el.append(f, r);
      el.addEventListener('pointermove', e => {
        const b = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - b.left).toFixed(0) + 'px');
        el.style.setProperty('--my', (e.clientY - b.top).toFixed(0) + 'px');
      });
    });
  }

  /* ── confetti in the site palette ── */
  MA.confetti = () => {
    if (reduced) return;
    const c = document.createElement('canvas'), x = c.getContext('2d'), d = Math.min(devicePixelRatio || 1, 2);
    c.className = 'confetti';
    c.width = innerWidth * d; c.height = innerHeight * d;
    x.scale(d, d);
    document.body.append(c);
    const s = getComputedStyle(root), cols = ['k2', 'k3', 'k4', 'k5'].map(k => s.getPropertyValue('--' + k).trim());
    const bits = Array.from({ length: 170 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .62, vx: (Math.random() - .5) * 19, vy: -9 - Math.random() * 13,
      r: Math.random() * 6.3, vr: (Math.random() - .5) * .4, w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0]
    }));
    const t0 = performance.now();
    const draw = now => {
      x.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach(b => {
        b.vy += .38; b.vx *= .985; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        x.save(); x.translate(b.x, b.y); x.rotate(b.r); x.fillStyle = b.c; x.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 2))); x.restore();
      });
      if (now - t0 < 3600) requestAnimationFrame(draw); else c.remove();
    };
    requestAnimationFrame(draw);
  };

  /* ── easter eggs ── */
  const title = document.title;
  document.addEventListener('visibilitychange', () => { document.title = document.hidden ? '◐ come back — the gradient missed you' : title; });
  console.log('%cManav Aghera', 'font:600 22px "Clash Display",system-ui,sans-serif;color:#00AEBB');
  console.log('%cReading the source? Good sign. Press Ctrl/⌘ + K for the command palette — or just say hi: manavaghera@yahoo.com', 'font:12px ui-monospace,monospace;color:#c9bfc4');
})();
