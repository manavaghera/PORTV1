/**
 * Now researching — CHRONUS as an orbital roadmap. Each phase is an orbit
 * around a memory core; memories spiral inward; hovering a phase lights its orbit.
 */
(() => {
  'use strict';
  const wrap = document.getElementById('orbit');
  /* the rings only turn while they're on screen (SVG rotation can't run on the GPU, so it costs every frame) */
  if (wrap) new IntersectionObserver(es => wrap.classList.toggle('on', es[0].isIntersecting), { rootMargin: '100px 0px' }).observe(wrap);
  const list = document.getElementById('phases');
  if (!wrap || !list) return;
  const svg = wrap.querySelector('svg'), NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  const C = 300, RINGS = [100, 152, 204, 258], SPEEDS = [18, 28, 40, 56];
  const items = [...list.children];

  const defs = el('defs');
  const grad = el('radialGradient', { id: 'coreG' });
  grad.append(el('stop', { offset: '0%', class: 'cg0' }), el('stop', { offset: '65%', class: 'cg1' }), el('stop', { offset: '100%', class: 'cg2' }));
  const glow = el('radialGradient', { id: 'glowG' });
  glow.append(el('stop', { offset: '0%', class: 'gg0' }), el('stop', { offset: '100%', class: 'gg1' }));
  defs.append(grad, glow);
  svg.append(defs, el('circle', { cx: C, cy: C, r: 150, fill: 'url(#glowG)' }));

  const rings = [], planets = [];
  RINGS.forEach((r, i) => {
    const ring = el('circle', { class: 'ring' + (i ? ' future' : ''), cx: C, cy: C, r });
    const g = el('g', { class: 'spin' });
    g.style.setProperty('--t', SPEEDS[i] + 's');
    g.style.animationDelay = (-i * 7) + 's';
    const pl = el('circle', { class: 'planet' + (i ? '' : ' live'), cx: C + r, cy: C, r: i ? 6 : 8 });
    const tag = el('text', { x: C + r + 14, y: C + 4, class: 'tag' });
    tag.textContent = '0' + (i + 1);
    g.append(pl, tag);
    svg.append(ring, g);
    rings.push(ring); planets.push(pl);
  });
  const mems = el('g');
  svg.append(mems);
  const core = el('g');
  core.append(el('circle', { cx: C, cy: C, r: 58, fill: 'url(#coreG)' }));
  const t1 = el('text', { x: C, y: C + 5, 'text-anchor': 'middle', class: 'core-txt' });
  t1.textContent = 'CHRONUS';
  core.append(t1);
  svg.append(core);

  /* memories spiral into the core */
  const M = reduced ? 0 : 54;
  const dots = Array.from({ length: M }, () => {
    const c = el('circle', { class: 'mem', r: 1.8 });
    mems.append(c);
    return { c, a: Math.random() * 6.283, r: 70 + Math.random() * 220, v: .25 + Math.random() * .5 };
  });

  let on = 0, user = false, visible = false;
  const light = i => {
    on = i;
    rings.forEach((r, k) => r.classList.toggle('on', k === i));
    planets.forEach((p, k) => { p.classList.toggle('on', k === i); p.setAttribute('r', k === i ? 10 : (k ? 6 : 8)); });
    items.forEach((li, k) => li.classList.toggle('is-on', k === i));
  };
  items.forEach((li, i) => {
    li.addEventListener('mouseenter', () => { user = true; light(i); });
    li.addEventListener('click', () => { user = true; light(i); });
  });
  list.addEventListener('mouseleave', () => { user = false; });
  setInterval(() => { if (!user && visible) light((on + 1) % RINGS.length); }, 2600);
  light(0);

  let prev = performance.now();
  const loop = now => {
    const dt = Math.min(.05, (now - prev) / 1000);
    prev = now;
    if (visible && !document.hidden) {
      const rect = wrap.getBoundingClientRect(), p = Math.min(1, Math.max(0, 1 - rect.top / innerHeight));
      svg.style.transform = `scale(${(.82 + .18 * p).toFixed(3)}) rotate(${((1 - p) * -24).toFixed(2)}deg)`;
      dots.forEach(d => {
        d.r -= d.v * 26 * dt * (1 + 40 / d.r);
        d.a += dt * (1.6 + 60 / d.r) * .35;
        if (d.r < 60) { d.r = 250 + Math.random() * 40; d.a = Math.random() * 6.283; }
        d.c.setAttribute('cx', (C + Math.cos(d.a) * d.r).toFixed(1));
        d.c.setAttribute('cy', (C + Math.sin(d.a) * d.r).toFixed(1));
        d.c.setAttribute('opacity', Math.min(1, (260 - d.r) / 80).toFixed(2));
      });
    }
    requestAnimationFrame(loop);
  };
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { rootMargin: '100px' }).observe(wrap);
  requestAnimationFrame(loop);
})();
