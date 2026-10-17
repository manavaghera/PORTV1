/**
 * Hero art — a living print. Ribbons in the accent hue drift in a slow loop
 * over a field of ink cells, and the eyes follow you: the cursor while it
 * moves, the butterfly (MA.bfly, from garden.js) while it rests. They blink
 * on their own, all at once when you click, and scrolling dives into the big
 * eye — its pupil becomes the dark stage for the statement. (Field's hero
 * lives in art-field.js.)
 */
(() => {
  'use strict';
  if (document.documentElement.dataset.palette === 'field') return;
  const $ = id => document.getElementById(id);
  const hero = $('top'), pin = $('heroPin'), cv = $('heroArt');
  if (!hero || !pin || !cv) return;
  const ctx = cv.getContext('2d');
  const MA = window.MA = window.MA || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hex = h => { h = (h || '').trim().replace('#', ''); const n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h, 16); return Number.isNaN(n) ? [0, 0, 0] : [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  let lite = false, since = 0;
  let W = 1, H = 1, dpr = 1, M = 28, pinned = true, C = {}, print = null, grain = null;
  let eyes = [], ribbons = [];

  /* ── layout: where the ribbons run and the eyes sit (fractions of the stage) ── */
  const WIDE = {
    ribbons: [
      { p: [[-.1, .2], [.2, .06], [.45, .16], [.63, .1], [.82, .02], [1.1, .14]], w: .13, d: .9 },
      { p: [[.36, 1.12], [.42, .8], [.56, .76], [.72, .82], [.86, .68], [.9, .44], [.98, .3], [1.14, .34]], w: .15, d: 1.2 },
      { p: [[.42, .7], [.45, .4], [.56, .24], [.74, .2], [.86, .3]], w: .085, d: 1 },
      { p: [[.68, 1.12], [.8, .95], [.98, .9], [1.12, .98]], w: .1, d: 1.4 }
    ],
    eyes: [[.66, .47, 1], [.91, .8, .36], [.5, .97, .3], [.81, .13, .13], [.97, .55, .16], [.57, .19, .1]],
    size: (w, h) => Math.min(w * .155, h * .26)
  };
  const NARROW = {
    ribbons: [
      { p: [[-.1, .1], [.3, .03], [.6, .1], [1.1, .04]], w: .16, d: .9 },
      { p: [[-.1, .44], [.25, .4], [.4, .48], [.7, .45], [1.12, .52]], w: .17, d: 1.2 },
      { p: [[.86, -.1], [.95, .2], [1.12, .3]], w: .12, d: 1 }
    ],
    eyes: [[.62, .24, 1], [.9, .42, .38], [.14, .3, .2], [.3, .07, .14]],
    size: (w, h) => Math.min(w * .24, h * .14)
  };

  const readColours = () => {
    const s = getComputedStyle(cv);
    const ink = hex(s.getPropertyValue('--c0')), paper = hex(s.getPropertyValue('--art-paper')), hue = hex(s.getPropertyValue('--art-hue'));
    C = { ink, paper, hue, deep: mix(hue, ink, .6), dark: mix(hue, ink, .82), lid: mix(paper, hue, .12), shade: mix(paper, ink, .3), lit: mix(hue, paper, .4) };
  };

  /* ── the static print: ivory paper packed with ink cells, then stippled ── */
  const blob = (g, cx, cy, rx, ry, rot, r) => {
    const k = 22, ph = r() * TAU, wob = .07 + r() * .07, cs = Math.cos(rot), sn = Math.sin(rot);
    g.beginPath();
    for (let i = 0; i <= k; i++) {
      const a = i / k * TAU, m = 1 + Math.sin(a * 3 + ph) * wob + Math.sin(a * 5 - ph) * wob * .5;
      const x = Math.cos(a) * rx * m, y = Math.sin(a) * ry * m;
      if (i) g.lineTo(cx + x * cs - y * sn, cy + x * sn + y * cs); else g.moveTo(cx + x * cs - y * sn, cy + x * sn + y * cs);
    }
    g.closePath();
  };
  const makePrint = () => {
    const w = W + M * 2, h = H + M * 2, c = document.createElement('canvas');
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const g = c.getContext('2d'), r = rng(7);
    g.scale(dpr, dpr);
    g.fillStyle = rgba(C.paper); g.fillRect(0, 0, w, h);
    const s = Math.max(40, Math.min(W, H) * .082);
    g.fillStyle = rgba(C.ink);
    for (let y = -s, row = 0; y < h + s; y += s * .84, row++) {
      for (let x = -s + (row % 2) * s * .5; x < w + s; x += s) {
        blob(g, x + (r() - .5) * s * .34, y + (r() - .5) * s * .28, s * (.36 + r() * .1), s * (.29 + r() * .09), r() * TAU, r);
        g.fill();
      }
    }
    const n = w * h / 22 | 0;
    g.fillStyle = rgba(C.ink, .55);
    for (let i = 0; i < n; i++) { const z = r() < .8 ? 1 : 1.8; g.fillRect(r() * w, r() * h, z, z); }
    g.fillStyle = rgba(C.paper, .4);
    for (let i = 0; i < n * .35; i++) g.fillRect(r() * w, r() * h, 1.2, 1.2);
    print = c;
  };
  /* a small speckle tile, re-offset a few times a second so the print "boils" like risograph ink */
  const makeGrain = () => {
    const s = 220, c = document.createElement('canvas'), r = rng(3);
    c.width = c.height = s;
    const g = c.getContext('2d');
    g.fillStyle = rgba(C.ink, .5);
    for (let i = 0; i < 2200; i++) { const z = r() < .8 ? 1 : 2; g.fillRect(r() * s, r() * s, z, z); }
    g.fillStyle = rgba(C.paper, .2);
    for (let i = 0; i < 900; i++) g.fillRect(r() * s, r() * s, 1, 1);
    grain = ctx.createPattern(c, 'repeat');
  };

  /* ── ribbons: one path, stroked from wide to narrow, gives the striped band ── */
  const drawRibbon = (rb, t, ox, oy) => {
    const pts = rb.p.map(([x, y], i) => [x * W + ox * rb.d + Math.sin(t * .33 + i * 1.7 + rb.ph) * W * .018, y * H + oy * rb.d + Math.cos(t * .27 + i * 2.1 + rb.ph) * H * .028]);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    const w = rb.w * Math.min(W, H) * (W < 960 ? 1.5 : 1);
    [[1, C.ink], [.9, C.paper], [.8, C.hue], [.62, C.deep], [.5, C.hue], [.32, C.dark], [.2, C.hue], [.07, C.lit]].forEach(([f, c]) => {
      ctx.lineWidth = w * f; ctx.strokeStyle = rgba(c); ctx.stroke();
    });
  };

  /* ── eyes ── */
  const almond = (x, y, R, o) => {
    const up = R * 1.12 * o, lo = R * .98 * o;
    ctx.beginPath();
    ctx.moveTo(x - R, y);
    ctx.bezierCurveTo(x - R * .52, y - up, x + R * .52, y - up, x + R, y);
    ctx.bezierCurveTo(x + R * .52, y + lo, x - R * .52, y + lo, x - R, y);
    ctx.closePath();
  };
  const drawEye = (e, ox, oy, k) => {
    const x = e.x + ox, y = e.y + oy, R = e.R, o = Math.max(.015, e.open);
    almond(x, y, R * 1.3, 1); ctx.fillStyle = rgba(C.ink); ctx.fill();
    almond(x, y, R * 1.17, 1); ctx.fillStyle = rgba(C.paper); ctx.fill();
    almond(x, y, R * 1.06, 1); ctx.fillStyle = rgba(C.ink); ctx.fill();
    almond(x, y, R, 1); ctx.fillStyle = rgba(C.lid); ctx.fill();
    ctx.save();
    almond(x, y, R, o); ctx.clip();
    const sg = ctx.createRadialGradient(x - R * .2, y - R * .3, R * .1, x, y, R * 1.1);
    sg.addColorStop(0, rgba(C.paper)); sg.addColorStop(1, rgba(C.shade));
    ctx.fillStyle = sg; ctx.fillRect(x - R, y - R, R * 2, R * 2);
    const ix = x + e.lx, iy = y + e.ly, ir = R * .52;
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fillStyle = rgba(C.ink); ctx.fill();
    const ig = ctx.createRadialGradient(ix, iy, ir * .1, ix, iy, ir * .92);
    ig.addColorStop(0, rgba(C.lit)); ig.addColorStop(.55, rgba(C.hue)); ig.addColorStop(1, rgba(C.deep));
    ctx.beginPath(); ctx.arc(ix, iy, ir * .9, 0, TAU); ctx.fillStyle = ig; ctx.fill();
    if (R > 26) {
      ctx.strokeStyle = rgba(C.ink, .4); ctx.lineWidth = Math.max(1, R * .012);
      ctx.beginPath();
      for (let i = 0; i < 46; i++) {
        const a = i / 46 * TAU + e.seed, r0 = ir * (.44 + (i % 3) * .05), r1 = ir * (.86 - (i % 2) * .1);
        ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0); ctx.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1);
      }
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(ix, iy, ir * e.pd, 0, TAU); ctx.fillStyle = rgba(C.ink); ctx.fill();
    if (k > .01) {
      ctx.fillStyle = rgba(C.paper, .95 * k);
      ctx.beginPath(); ctx.arc(ix + ir * .3, iy - ir * .32, ir * .15, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(ix - ir * .26, iy + ir * .3, ir * .055, 0, TAU); ctx.fill();
    }
    ctx.restore();
    /* the upper lid's edge, which becomes the lash line as the eye shuts */
    ctx.strokeStyle = rgba(C.ink); ctx.lineWidth = Math.max(1.2, R * .05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - R, y); ctx.bezierCurveTo(x - R * .52, y - R * 1.12 * o, x + R * .52, y - R * 1.12 * o, x + R, y); ctx.stroke();
    if (o < .3 && R > 20) {
      ctx.lineWidth = Math.max(1, R * .03); ctx.beginPath();
      for (let i = 1; i < 6; i++) { const t = i / 6, lx = x - R + t * R * 2, ly = y + R * .25 * o * Math.sin(t * Math.PI); ctx.moveTo(lx, ly); ctx.lineTo(lx + (t - .5) * R * .3, ly + R * .2); }
      ctx.stroke();
    }
  };

  /* ── sizing ── */
  const resize = () => {
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H) return;
    lite = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    pinned = getComputedStyle(pin).position === 'sticky';
    const L = innerWidth <= 960 ? NARROW : WIDE, R0 = L.size(W, H), r = rng(5);
    ribbons = L.ribbons.map((rb, i) => ({ ...rb, ph: i * 1.9 }));
    eyes = L.eyes.map(([x, y, s], i) => ({ x: x * W, y: y * H, R: R0 * s, lx: 0, ly: 0, pd: .38, open: 1, blink: 0, bt: 1.5 + r() * 4, dbl: false, shock: 0, seed: r() * TAU, big: i === 0 }));
    readColours(); makePrint(); makeGrain();
    if (reduced) draw(0);
  };

  /* ── attention: cursor first, then the butterfly, then an idle gaze loop ── */
  let mx = 0, my = 0, lastMove = -1e5, par = [0, 0], zoom = 0, t = 0, boil = [0, 0], boilT = 0;
  const local = (cx, cy) => { const r = pin.getBoundingClientRect(); return [(cx - r.left) * W / r.width, (cy - r.top) * H / r.height]; };
  hero.addEventListener('pointermove', e => { [mx, my] = local(e.clientX, e.clientY); lastMove = performance.now(); });
  hero.addEventListener('pointerdown', () => eyes.forEach((e, i) => { setTimeout(() => { if (!e.blink) e.blink = .0001; }, i * 40); e.shock = 1; }));
  const target = now => {
    if (now - lastMove < 2200) return [mx, my, true];
    const b = MA.bfly;
    if (b && b.on) return [...local(b.x, b.y), false];
    return [W * .5 + Math.cos(t * .45) * W * .3, H * .5 + Math.sin(t * .7) * H * .28, false];
  };
  const update = (dt, now) => {
    const [tx, ty, live] = target(now);
    const nx = live ? (tx / W - .5) * 2 : 0, ny = live ? (ty / H - .5) * 2 : 0;
    par[0] += (nx - par[0]) * Math.min(1, dt * 2.5); par[1] += (ny - par[1]) * Math.min(1, dt * 2.5);
    eyes.forEach(e => {
      const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, reach = e.R * .34 * (d / (d + e.R * 1.4)) * (1 - zoom);
      e.lx += (dx / d * reach - e.lx) * Math.min(1, dt * (e.big ? 6 : 9));
      e.ly += (dy / d * reach * .72 - e.ly) * Math.min(1, dt * (e.big ? 6 : 9));
      const near = clamp(1 - d / (e.R * 4));
      e.pd += (.36 + near * .14 - e.shock * .16 + zoom * .2 - e.pd) * Math.min(1, dt * 5);
      e.shock = Math.max(0, e.shock - dt * 1.4);
      if (zoom < .05 && (e.bt -= dt) <= 0) { e.blink = e.blink || .0001; e.bt = 2.5 + Math.random() * 5; e.dbl = Math.random() < .2; }
      if (e.blink > 0) { e.blink += dt / .24; if (e.blink >= 1) { e.blink = e.dbl ? .0001 : 0; e.dbl = false; } }
      e.open = 1 - (e.blink > 0 ? Math.sin(e.blink * Math.PI) : 0) * .985;
    });
  };
  const draw = time => {
    const ox = -par[0] * 10 + Math.sin(time * .2) * 5, oy = -par[1] * 8 + Math.cos(time * .17) * 4, k = 1 - smooth(0, .25, zoom);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(print, -M + ox, -M + oy, W + M * 2, H + M * 2);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ribbons.forEach(rb => drawRibbon(rb, time, -par[0] * 18, -par[1] * 14));
    eyes.forEach(e => drawEye(e, -par[0] * 24, -par[1] * 18, k));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(boil[0], boil[1]);
    ctx.fillStyle = grain; ctx.globalAlpha = .5;
    ctx.fillRect(-boil[0], -boil[1], cv.width, cv.height);
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  /* where the big pupil is on screen — garden.js sends the butterfly there on scroll */
  MA.heroFocus = () => {
    const e = eyes[0], r = pin.getBoundingClientRect();
    return e ? [r.left + (e.x + e.lx) * r.width / W, r.top + (e.y + e.ly) * r.height / H] : null;
  };

  let prev = performance.now(), visible = true;
  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - prev) / 1000);
    prev = now;
    if (!visible || document.hidden || !print) return;
    t += dt;
    const p = MA.heroP || 0;
    zoom = pinned ? smooth(.03, .42, p) : 0;
    const e = eyes[0];
    if (zoom > 0 && e) {
      cv.style.transformOrigin = `${((e.x + e.lx) / W * 100).toFixed(2)}% ${((e.y + e.ly) / H * 100).toFixed(2)}%`;
      cv.style.transform = `scale(${(1 + zoom * zoom * 34).toFixed(3)})`;
    } else if (cv.style.transform) cv.style.transform = '';
    pin.style.setProperty('--veil', (1 - smooth(.02, .2, p)).toFixed(3));
    cv.style.opacity = pinned ? '' : (1 - smooth(0, .45, p)).toFixed(3);
    if (zoom > .995) return;
    /* phones and low-power machines draw at 30 fps — same motion, half the work */
    if (lite && (since += dt) < 1 / 30) return;
    const step = lite ? since : dt;
    since = 0;
    if ((boilT += step) > .12) { boilT = 0; boil = [Math.random() * 220 | 0, Math.random() * 220 | 0]; }
    update(step, now);
    draw(t);
  };

  const init = () => {
    resize();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    addEventListener('themechange', () => { readColours(); makePrint(); makeGrain(); if (reduced) draw(0); });
    new IntersectionObserver(es => es.forEach(en => { visible = en.isIntersecting; })).observe(hero);
    if (!reduced) requestAnimationFrame(frame);
  };
  init();
})();
