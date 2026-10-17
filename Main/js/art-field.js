/**
 * Hero art, Field palette — a field at dusk. Robed figures stand in the grass
 * and the cursor is the sun: move it and the glow and the long shadows swing
 * with it. Wind loops through the grass, the cursor stirs it and a click sends
 * a gust. Scrolling sets the sun and lets night fall, which becomes the dark
 * stage for the statement. (Lumora's hero lives in art.js.)
 */
(() => {
  'use strict';
  if (document.documentElement.dataset.palette !== 'field') return;
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
  const layer = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr)); const g = c.getContext('2d'); g.scale(dpr, dpr); return [c, g]; };

  let lite = false, since = 0;
  let W = 1, H = 1, FH = 1, hz = 1, dpr = 1, narrow = false, pinned = true, C = {}, L = {}, grain = null;
  let figures = [], blades = [], motes = [];
  const sun = { x: 0, y: 0 };

  /* figures: [x, how far down the ground (0 horizon → 1 frame bottom), height as a share of the frame] */
  const FIG_WIDE = [[.705, .42, .37], [.585, .22, .2], [.865, .3, .25], [.94, .12, .12], [.51, .1, .1], [.79, .05, .07], [.655, .03, .05]];
  const FIG_NARROW = [[.72, .45, .44], [.42, .24, .24], [.92, .3, .28], [.16, .1, .12], [.6, .06, .08]];

  const readColours = () => {
    const s = getComputedStyle(cv);
    const ink = hex(s.getPropertyValue('--c0')), paper = hex(s.getPropertyValue('--art-paper')), hue = hex(s.getPropertyValue('--art-hue'));
    const brown = hex(s.getPropertyValue('--k2')), ember = hex(s.getPropertyValue('--art-sun'));
    C = { ink, paper, hue, brown, ember, top: mix(ink, brown, .28), mid: mix(brown, hue, .2), haze: mix(mix(hue, ember, .35), paper, .12), far: mix(brown, hue, .35), soil: mix(ink, brown, .4) };
  };

  /* ── static layers ── */
  const makeClouds = () => {
    const [c, g] = layer(W * 2, hz), r = rng(21);
    for (let i = 0; i < 150; i++) {
      const low = Math.pow(r(), .7), y = hz * (.04 + low * .9), x = r() * W * 2, rx = W * (.04 + r() * .17), ry = hz * (.006 + r() * .022);
      const col = mix(C.mid, C.haze, low * low), a = .05 + low * .2;
      [x, x - W * 2, x + W * 2].forEach(cx => {
        if (cx + rx < 0 || cx - rx > W * 2) return;
        g.save(); g.translate(cx, y); g.scale(1, ry / rx);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
      });
    }
    L.clouds = c;
  };
  const makeHills = () => {
    const [c, g] = layer(W + 40, hz + 4), r = rng(9);
    [[.035, C.far, 3], [.018, mix(C.soil, C.far, .4), 7]].forEach(([amp, col, seed]) => {
      g.fillStyle = rgba(col);
      g.beginPath(); g.moveTo(0, hz + 4);
      for (let x = 0; x <= W + 40; x += 14) {
        const y = hz - FH * amp * (.5 + .5 * Math.sin(x * .004 + seed) * Math.sin(x * .011 + seed * 2) + r() * .08);
        g.lineTo(x, y);
      }
      g.lineTo(W + 40, hz + 4); g.closePath(); g.fill();
    });
    L.hills = c;
  };
  const makeGround = () => {
    const gh = H - hz + 30, [c, g] = layer(W + 40, gh), r = rng(13);
    const gr = g.createLinearGradient(0, 0, 0, Math.min(gh, FH - hz + 60));
    gr.addColorStop(0, rgba(mix(C.far, C.hue, .2))); gr.addColorStop(.25, rgba(C.brown)); gr.addColorStop(1, rgba(C.soil));
    g.fillStyle = gr; g.fillRect(0, 0, W + 40, gh);
    /* thousands of short strokes: the static body of the field */
    const n = narrow ? 5000 : 9000;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const d = Math.pow(r(), 1.6), y = d * Math.min(gh, FH - hz + 60), x = r() * (W + 40), h = 2 + d * 26, lean = (r() - .5) * .7;
      g.strokeStyle = rgba(r() < .3 ? mix(C.hue, C.brown, d) : mix(C.brown, C.ink, .2 + d * .6), .5 + r() * .4);
      g.lineWidth = .6 + d * 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + lean * h, y - h); g.stroke();
    }
    L.ground = c;
  };
  const makeNumeral = () => {
    const [c, g] = layer(W, hz + 8), r = rng(17), size = narrow ? FH * .5 : FH * .64;
    g.font = `400 ${size}px "DM Serif Display", Georgia, serif`;
    g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.fillStyle = rgba(C.paper, .9);
    g.fillText('01', W * .99, hz + size * .1);
    g.fillStyle = rgba(C.ember, .95);
    if (!narrow) g.fillRect(W * .6, FH * .06, W * .008, FH * .15);
    g.fillRect(W * (narrow ? .84 : .87), hz * .3, W * (narrow ? .06 : .04), hz * .14);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < W * hz / 9; i++) { g.fillStyle = `rgba(0,0,0,${.3 + r() * .6})`; const z = r() < .7 ? 1 : 2; g.fillRect(r() * W, r() * hz, z, z); }
    L.numeral = c;
  };
  const makeGrain = () => {
    const s = 220, c = document.createElement('canvas'), r = rng(3);
    c.width = c.height = s;
    const g = c.getContext('2d');
    g.fillStyle = rgba(C.ink, .45);
    for (let i = 0; i < 2000; i++) { const z = r() < .8 ? 1 : 2; g.fillRect(r() * s, r() * s, z, z); }
    g.fillStyle = rgba(C.paper, .18);
    for (let i = 0; i < 900; i++) g.fillRect(r() * s, r() * s, 1, 1);
    grain = ctx.createPattern(c, 'repeat');
  };

  /* a hooded, robed figure: base at (0,0), height 1 */
  const robe = (g, x, y, h, w, lean) => {
    g.save(); g.translate(x, y); g.rotate(lean); g.scale(h, h);
    g.beginPath();
    g.moveTo(-w * .55, 0);
    g.quadraticCurveTo(-w * .5, -.3, -w * .44, -.56);
    g.quadraticCurveTo(-w * .5, -.74, -w * .32, -.8);
    g.quadraticCurveTo(-w * .32, -.98, 0, -1);
    g.quadraticCurveTo(w * .32, -.98, w * .32, -.8);
    g.quadraticCurveTo(w * .5, -.74, w * .44, -.56);
    g.quadraticCurveTo(w * .5, -.3, w * .6, 0);
    g.closePath(); g.restore();
  };

  /* ── sizing ── */
  const resize = () => {
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H) return;
    lite = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    narrow = innerWidth <= 960;
    pinned = getComputedStyle(pin).position === 'sticky';
    FH = narrow ? Math.min(H, innerHeight * .56) : H;
    hz = FH * (narrow ? .64 : .62);
    const r = rng(5);
    figures = (narrow ? FIG_NARROW : FIG_WIDE).map(([x, d, s]) => ({ x: x * W, base: hz + d * (FH - hz), h: s * FH, w: .27 + r() * .07, lean: (r() - .5) * .04, seed: r() * TAU }));
    figures.sort((a, b) => a.base - b.base);
    blades = Array.from({ length: narrow ? 170 : 340 }, () => {
      const d = .3 + r() * .75, y = hz + d * (FH - hz) + 10;
      return { x: r() * W, y, h: 12 + d * d * 58, d, w: .8 + d * 1.6, ph: r() * TAU, bend: 0 };
    }).sort((a, b) => a.y - b.y);
    motes = Array.from({ length: narrow ? 40 : 80 }, () => ({ x: r() * W, y: hz - r() * FH * .35 + FH * .1, s: .6 + r() * 1.8, ph: r() * TAU, v: 6 + r() * 14 }));
    sun.x = W * (narrow ? .7 : .76); sun.y = hz - FH * .08;
    readColours(); makeClouds(); makeHills(); makeGround(); makeNumeral(); makeGrain();
    if (reduced) draw(0, 0);
  };

  /* ── input: the cursor is the sun (and a breeze); a click is a gust ── */
  let mx = 0, my = 0, lastMove = -1e5, wind = 0, gust = 0, t = 0, zoom = 0, par = [0, 0], boil = [0, 0], boilT = 0;
  const local = (cx, cy) => { const r = pin.getBoundingClientRect(); return [(cx - r.left) * W / r.width, (cy - r.top) * H / r.height]; };
  hero.addEventListener('pointermove', e => { const [x, y] = local(e.clientX, e.clientY); wind += clamp((x - mx) / 40, -1, 1) * .15; mx = x; my = y; lastMove = performance.now(); });
  hero.addEventListener('pointerdown', () => { gust = 1; });

  const update = (dt, now) => {
    const live = now - lastMove < 2400;
    const lo = W * (narrow ? .08 : .42), hi = W * .97;
    let tx, ty;
    if (live) { tx = clamp(mx, lo, hi); ty = hz - FH * .07 - clamp((hz - my) * .22, -FH * .02, FH * .16); }
    else { tx = W * (narrow ? .7 : .76) + Math.sin(t * .08) * W * .1; ty = hz - FH * .08 + Math.sin(t * .13) * FH * .02; }
    ty += zoom * FH * .3;
    sun.x += (tx - sun.x) * Math.min(1, dt * 2.2); sun.y += (ty - sun.y) * Math.min(1, dt * 2.2);
    wind *= 1 - Math.min(1, dt * 1.5); gust = Math.max(0, gust - dt * .8);
    const px = live ? (mx / W - .5) * 2 : 0, py = live ? (my / H - .5) * 2 : 0;
    par[0] += (px - par[0]) * Math.min(1, dt * 2); par[1] += (py - par[1]) * Math.min(1, dt * 2);
    blades.forEach(b => {
      let target = Math.sin(t * 1.3 + b.x * .012 + b.ph * .3) * .16 + Math.sin(t * .37 + b.x * .004) * .12 + wind * .6 + gust * Math.sin(t * 9 + b.ph) * .5 + gust * .5;
      if (live) { const dx = b.x - mx, dy = (b.y - b.h * .5) - my, d = Math.hypot(dx, dy); if (d < 150) target += Math.sign(dx || 1) * (1 - d / 150) * .9; }
      b.bend += (target - b.bend) * Math.min(1, dt * 6);
    });
    motes.forEach(m => {
      m.x += (m.v * (.4 + wind * 2 + gust * 6)) * dt; m.y += Math.sin(t * .8 + m.ph) * 4 * dt;
      if (m.x > W + 10) m.x = -10; if (m.x < -10) m.x = W + 10;
    });
  };

  const draw = (time, dt) => {
    const k = 1 - smooth(0, .3, zoom), sunR = Math.min(W, FH) * .034;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* sky + the glow around the sun */
    let gr = ctx.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, rgba(C.top)); gr.addColorStop(.55, rgba(C.mid)); gr.addColorStop(1, rgba(mix(C.haze, C.mid, zoom)));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 2);
    gr = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, W * .5);
    gr.addColorStop(0, rgba(C.ember, .55 * k)); gr.addColorStop(.3, rgba(C.hue, .2 * k)); gr.addColorStop(1, rgba(C.hue, 0));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 2);
    const cx = -((time * 7) % (W * 2)) - par[0] * 6;
    ctx.drawImage(L.clouds, cx, 0, W * 2, hz); ctx.drawImage(L.clouds, cx + W * 2, 0, W * 2, hz);
    ctx.drawImage(L.numeral, -par[0] * 4, 0, W, hz + 8);
    /* the sun sinks behind the hills as you scroll */
    ctx.fillStyle = rgba(mix(C.ember, C.paper, .25)); ctx.beginPath(); ctx.arc(sun.x, sun.y, sunR, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(C.ember, .25 * k); ctx.beginPath(); ctx.arc(sun.x, sun.y, sunR * 2.2, 0, TAU); ctx.fill();
    const gx = -20 - par[0] * 10, fx = -par[0] * 16, fy = -par[1] * 6;
    ctx.drawImage(L.hills, gx, 0, W + 40, hz + 4);
    ctx.drawImage(L.ground, -20 + fx, hz - 2 + fy * .5, W + 40, H - hz + 30);
    /* long shadows, cast toward you and away from the sun */
    const elev = clamp((hz - sun.y) / (FH * .2));
    figures.forEach(f => {
      const x = f.x + fx, base = f.base + fy, w = f.h * f.w, dir = (x - sun.x) / W;
      const len = f.h * (.5 + 1.1 * (1 - elev)), tx = x + dir * f.h * 2.8, ty = base + len * .4;
      const sg = ctx.createLinearGradient(x, base, tx, ty);
      sg.addColorStop(0, rgba(C.ink, .7 * k)); sg.addColorStop(1, rgba(C.ink, 0));
      ctx.fillStyle = sg; ctx.beginPath();
      ctx.moveTo(x - w * .55, base); ctx.lineTo(x + w * .55, base); ctx.lineTo(tx + w * .2, ty); ctx.lineTo(tx - w * .2, ty); ctx.closePath(); ctx.fill();
    });
    /* figures, rim-lit on the side that faces the sun */
    figures.forEach(f => {
      const x = f.x + fx, base = f.base + fy, side = Math.sign(sun.x - x) || 1, lean = f.lean + Math.sin(time * .7 + f.seed) * .004;
      robe(ctx, x + side * Math.max(1.2, f.h * .008), base, f.h, f.w, lean);
      ctx.fillStyle = rgba(mix(C.ember, C.hue, .4), .75 * k); ctx.fill();
      robe(ctx, x, base, f.h, f.w, lean);
      ctx.fillStyle = rgba(mix(C.ink, C.brown, .12)); ctx.fill();
    });
    /* the foreground grass, swaying */
    ctx.lineCap = 'round';
    [[.3, .62, mix(C.brown, C.hue, .25)], [.62, .85, mix(C.brown, C.ink, .35)], [.85, 2, mix(C.ink, C.brown, .3)]].forEach(([a, b, col]) => {
      ctx.strokeStyle = rgba(col); ctx.beginPath();
      blades.forEach(bl => {
        if (bl.d < a || bl.d >= b) return;
        const x = bl.x + fx, y = bl.y + fy, s = Math.sin(bl.bend), c = Math.cos(bl.bend);
        ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * bl.h * .35, y - bl.h * .6, x + s * bl.h, y - c * bl.h);
      });
      ctx.lineWidth = a < .6 ? 1 : a < .8 ? 1.6 : 2.4; ctx.stroke();
    });
    /* dust in the low light */
    motes.forEach(m => {
      const d = Math.hypot(m.x - sun.x, m.y - sun.y), a = (.12 + .75 * clamp(1 - d / (W * .35))) * k;
      ctx.fillStyle = rgba(C.paper, a); ctx.fillRect(m.x, m.y, m.s, m.s);
    });
    /* vignette, then night falls with the scroll */
    gr = ctx.createRadialGradient(W * .6, FH * .5, Math.min(W, FH) * .3, W * .6, FH * .5, Math.max(W, FH) * .85);
    gr.addColorStop(0, rgba(C.ink, 0)); gr.addColorStop(1, rgba(C.ink, .45));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const night = smooth(.05, .85, zoom);
    if (night > 0) { ctx.fillStyle = rgba(C.ink, night * .985); ctx.fillRect(0, 0, W, H); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(boil[0], boil[1]);
    ctx.fillStyle = grain; ctx.globalAlpha = .45;
    ctx.fillRect(-boil[0], -boil[1], cv.width, cv.height);
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  /* where the sun is on screen — garden.js sends the butterfly to it on scroll */
  MA.heroFocus = () => { const r = pin.getBoundingClientRect(); return [r.left + sun.x * r.width / W, r.top + sun.y * r.height / H]; };

  let prev = performance.now(), visible = true;
  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - prev) / 1000);
    prev = now;
    if (!visible || document.hidden || !L.ground) return;
    t += dt;
    const p = MA.heroP || 0;
    zoom = pinned ? smooth(.03, .42, p) : 0;
    if (zoom > 0) { cv.style.transformOrigin = `${(sun.x / W * 100).toFixed(2)}% ${(hz / H * 100).toFixed(2)}%`; cv.style.transform = `scale(${(1 + zoom * .35).toFixed(4)})`; }
    else if (cv.style.transform) cv.style.transform = '';
    pin.style.setProperty('--veil', (1 - smooth(.02, .2, p)).toFixed(3));
    cv.style.opacity = pinned ? '' : (1 - smooth(0, .45, p)).toFixed(3);
    if (zoom > .995) return;
    /* phones and low-power machines draw at 30 fps — same motion, half the work */
    if (lite && (since += dt) < 1 / 30) return;
    const step = lite ? since : dt;
    since = 0;
    if ((boilT += step) > .12) { boilT = 0; boil = [Math.random() * 220 | 0, Math.random() * 220 | 0]; }
    update(step, now);
    draw(t, step);
  };

  const init = () => {
    resize();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    addEventListener('themechange', () => { readColours(); makeClouds(); makeHills(); makeGround(); makeNumeral(); makeGrain(); if (reduced) draw(0, 0); });
    new IntersectionObserver(es => es.forEach(en => { visible = en.isIntersecting; })).observe(hero);
    if (!reduced) requestAnimationFrame(frame);
  };
  /* the big numeral is set in the display serif, so wait for it */
  (document.fonts ? document.fonts.load('400 100px "DM Serif Display"').catch(() => {}) : Promise.resolve()).then(init);
})();
