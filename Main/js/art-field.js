/**
 * Hero art, Field palette — the dark world. A field at night under a blood
 * moon: hooded figures stand in dead grass and their red eyes follow you; fog
 * drifts, crows cross, ash and embers float. The cursor is the moon — move it
 * and the glow and the long moonlight shadows swing with it. Lightning strikes
 * now and then (and when you click). Scrolling sets the moon and lets full
 * dark fall, which becomes the stage for the statement. (Lumora's hero lives
 * in art.js.)
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
  let pw = 1, ph = 1, W = 1, H = 1, FH = 1, hz = 1, dpr = 1, narrow = false, pinned = true, C = {}, L = {}, grain = null;
  let figures = [], blades = [], motes = [], crows = [];
  const moon = { x: 0, y: 0 };

  /* figures: [x, how far down the ground (0 horizon → 1 frame bottom), height as a share of the frame] */
  const FIG_WIDE = [[.705, .42, .37], [.585, .22, .2], [.865, .3, .25], [.94, .12, .12], [.51, .1, .1], [.79, .05, .07], [.655, .03, .05]];
  const FIG_NARROW = [[.72, .45, .44], [.42, .24, .24], [.92, .3, .28], [.16, .1, .12], [.6, .06, .08]];

  const readColours = () => {
    const s = getComputedStyle(cv);
    const ink = hex(s.getPropertyValue('--c0')), paper = hex(s.getPropertyValue('--art-paper')), hue = hex(s.getPropertyValue('--art-hue'));
    const brown = hex(s.getPropertyValue('--k2')), ember = hex(s.getPropertyValue('--art-sun'));
    C = { ink, paper, hue, brown, ember, top: mix(ink, hue, .05), mid: mix(ink, hue, .2), haze: mix(hue, ember, .55), far: mix(ink, brown, .45), soil: mix(ink, brown, .22), fog: mix(paper, ink, .25), eye: [255, 62, 44] };
  };

  /* ── static layers ── */
  const makeStars = () => {
    const [c, g] = layer(W, hz), r = rng(31);
    for (let i = 0; i < (narrow ? 70 : 160); i++) {
      const y = Math.pow(r(), 1.6) * hz * .8;
      g.fillStyle = rgba(C.paper, .12 + r() * .45 * (1 - y / hz));
      g.fillRect(r() * W, y, r() < .9 ? 1 : 1.6, r() < .9 ? 1 : 1.6);
    }
    L.stars = c;
  };
  const makeClouds = () => {
    const [c, g] = layer(W * 2, hz), r = rng(21);
    for (let i = 0; i < 130; i++) {
      const low = Math.pow(r(), .7), y = hz * (.04 + low * .9), x = r() * W * 2, rx = W * (.04 + r() * .17), ry = hz * (.006 + r() * .022);
      const col = mix(C.ink, C.hue, low * .55), a = .1 + low * .28;
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
  /* a dead tree: a trunk that keeps splitting into thinner, crooked branches */
  const branch = (g, x, y, len, ang, w, depth, r) => {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - .5) * len * .4, y + (y2 - y) * .5, x2, y2); g.stroke();
    if (depth <= 0 || len < 3) return;
    const n = 2 + (r() < .35 ? 1 : 0);
    for (let i = 0; i < n; i++) branch(g, x2, y2, len * (.62 + r() * .2), ang + (r() - .5) * 1.25, w * .64, depth - 1, r);
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
    g.strokeStyle = rgba(mix(C.ink, C.far, .25)); g.lineCap = 'round';
    const tx = W * (narrow ? .3 : .56) + 20, th = FH * (narrow ? .16 : .22);
    branch(g, tx, hz - FH * .012, th * .42, -Math.PI / 2 + .06, Math.max(2.5, th * .05), 6, rng(44));
    L.hills = c;
  };
  const makeGround = () => {
    const gh = H - hz + 30, [c, g] = layer(W + 40, gh), r = rng(13);
    const gr = g.createLinearGradient(0, 0, 0, Math.min(gh, FH - hz + 60));
    gr.addColorStop(0, rgba(mix(C.far, C.hue, .14))); gr.addColorStop(.25, rgba(mix(C.brown, C.ink, .35))); gr.addColorStop(1, rgba(C.soil));
    g.fillStyle = gr; g.fillRect(0, 0, W + 40, gh);
    /* thousands of short strokes: dead grass */
    const n = narrow ? 5000 : 9000;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const d = Math.pow(r(), 1.6), y = d * Math.min(gh, FH - hz + 60), x = r() * (W + 40), h = 2 + d * 26, lean = (r() - .5) * .9;
      g.strokeStyle = rgba(r() < .2 ? mix(C.hue, C.ink, .3 + d * .4) : mix(C.brown, C.ink, .35 + d * .5), .45 + r() * .4);
      g.lineWidth = .6 + d * 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + lean * h, y - h); g.stroke();
    }
    L.ground = c;
  };
  /* low fog: soft bone-grey banks, drawn twice (behind and in front of the figures) */
  const makeFog = () => {
    const fh = FH - hz + FH * .16, [c, g] = layer(W * 2, fh), r = rng(57);
    for (let i = 0; i < (narrow ? 50 : 90); i++) {
      const x = r() * W * 2, y = fh * (.1 + r() * .85), rx = W * (.08 + r() * .22), ry = fh * (.04 + r() * .1);
      [x, x - W * 2, x + W * 2].forEach(cx => {
        if (cx + rx < 0 || cx - rx > W * 2) return;
        g.save(); g.translate(cx, y); g.scale(1, ry / rx);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
        gr.addColorStop(0, rgba(C.fog, .05 + r() * .06)); gr.addColorStop(1, rgba(C.fog, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
      });
    }
    L.fog = c; L.fogH = fh;
  };
  const makeNumeral = () => {
    const [c, g] = layer(W, hz + 8), r = rng(17), size = narrow ? FH * .5 : FH * .64;
    g.font = `400 ${size}px "DM Serif Display", Georgia, serif`;
    g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.fillStyle = rgba(C.paper, .62);
    g.fillText('01', W * .99, hz + size * .1);
    g.fillStyle = rgba(C.hue, .95);
    if (!narrow) g.fillRect(W * .6, FH * .06, W * .008, FH * .15);
    g.fillRect(W * (narrow ? .84 : .87), hz * .3, W * (narrow ? .06 : .04), hz * .14);
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < W * hz / 7; i++) { g.fillStyle = `rgba(0,0,0,${.3 + r() * .6})`; const z = r() < .7 ? 1 : 2; g.fillRect(r() * W, r() * hz, z, z); }
    L.numeral = c;
  };
  const makeGrain = () => {
    const s = 220, c = document.createElement('canvas'), r = rng(3);
    c.width = c.height = s;
    const g = c.getContext('2d');
    g.fillStyle = rgba(C.ink, .55);
    for (let i = 0; i < 2600; i++) { const z = r() < .8 ? 1 : 2; g.fillRect(r() * s, r() * s, z, z); }
    g.fillStyle = rgba(C.paper, .14);
    for (let i = 0; i < 700; i++) g.fillRect(r() * s, r() * s, 1, 1);
    grain = ctx.createPattern(c, 'repeat');
  };
  const build = () => { readColours(); makeStars(); makeClouds(); makeHills(); makeGround(); makeFog(); makeNumeral(); makeGrain(); };

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
    pw = pin.clientWidth || W; ph = pin.clientHeight || H;
    if (!W || !H) return;
    lite = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
    dpr = Math.min(devicePixelRatio || 1, lite ? 1 : 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    narrow = innerWidth <= 960;
    pinned = getComputedStyle(pin).position === 'sticky';
    FH = narrow ? Math.min(H, innerHeight * .56) : H;
    hz = FH * (narrow ? .64 : .62);
    const r = rng(5);
    figures = (narrow ? FIG_NARROW : FIG_WIDE).map(([x, d, s]) => ({ x: x * W, base: hz + d * (FH - hz), h: s * FH, w: .27 + r() * .07, lean: (r() - .5) * .04, seed: r() * TAU, blink: 1 + r() * 5, look: 0 }));
    figures.sort((a, b) => a.base - b.base);
    blades = Array.from({ length: narrow ? 170 : 340 }, () => {
      const d = .3 + r() * .75, y = hz + d * (FH - hz) + 10;
      return { x: r() * W, y, h: 12 + d * d * 58, d, w: .8 + d * 1.6, ph: r() * TAU, bend: 0 };
    }).sort((a, b) => a.y - b.y);
    motes = Array.from({ length: narrow ? 40 : 80 }, (_, i) => ({ x: r() * W, y: hz - r() * FH * .3 + FH * .15, s: .6 + r() * 1.6, ph: r() * TAU, v: 4 + r() * 10, ember: i % 6 === 0 }));
    moon.x = W * (narrow ? .7 : .76); moon.y = hz - FH * .16;
    build();
    if (reduced) draw(0);
  };

  /* ── input: the cursor is the moon (and a breeze); a click calls the lightning ── */
  let mx = 0, my = 0, lastMove = -1e5, wind = 0, gust = 0, t = 0, zoom = 0, par = [0, 0], boil = [0, 0], boilT = 0;
  let flashT = 9, nextBolt = 6, nextCrow = 3;
  const local = (cx, cy) => { const r = pin.getBoundingClientRect(); return [(cx - r.left) * W / r.width, (cy - r.top) * H / r.height]; };
  const strike = () => { flashT = 0; nextBolt = 9 + Math.random() * 10; if (MA.sfx) setTimeout(() => MA.sfx('thunder'), 350 + Math.random() * 700); };
  hero.addEventListener('pointermove', e => { const [x, y] = local(e.clientX, e.clientY); wind += clamp((x - mx) / 40, -1, 1) * .15; mx = x; my = y; lastMove = performance.now(); });
  hero.addEventListener('pointerdown', () => { gust = 1; strike(); });
  /* two quick flickers, then a fade — the way real lightning looks */
  const flash = () => (flashT < .07 ? 1 : flashT < .15 ? .15 : flashT < .22 ? .75 : Math.max(0, .75 - (flashT - .22) * 2.6));

  const update = (dt, now) => {
    const live = now - lastMove < 2400;
    const lo = W * (narrow ? .08 : .42), hi = W * .97;
    let tx, ty;
    if (live) { tx = clamp(mx, lo, hi); ty = hz - FH * .14 - clamp((hz - my) * .22, -FH * .02, FH * .16); }
    else { tx = W * (narrow ? .7 : .76) + Math.sin(t * .08) * W * .1; ty = hz - FH * .16 + Math.sin(t * .13) * FH * .02; }
    ty += zoom * FH * .4;
    moon.x += (tx - moon.x) * Math.min(1, dt * 2.2); moon.y += (ty - moon.y) * Math.min(1, dt * 2.2);
    wind *= 1 - Math.min(1, dt * 1.5); gust = Math.max(0, gust - dt * .8);
    flashT += dt;
    if (zoom < .05 && (nextBolt -= dt) <= 0) strike();
    if ((nextCrow -= dt) <= 0) {
      nextCrow = 7 + Math.random() * 12;
      const n = 1 + (Math.random() * 3 | 0), y = hz * (.15 + Math.random() * .4);
      for (let i = 0; i < n; i++) crows.push({ x: W + 30 + i * 26, y: y + (Math.random() - .5) * 30, v: 70 + Math.random() * 40, ph: Math.random() * TAU, s: 6 + Math.random() * 5 });
    }
    crows = crows.filter(c => (c.x -= c.v * dt) > -40);
    const px = live ? (mx / W - .5) * 2 : 0, py = live ? (my / H - .5) * 2 : 0;
    par[0] += (px - par[0]) * Math.min(1, dt * 2); par[1] += (py - par[1]) * Math.min(1, dt * 2);
    blades.forEach(b => {
      let target = Math.sin(t * 1.3 + b.x * .012 + b.ph * .3) * .14 + Math.sin(t * .37 + b.x * .004) * .1 + wind * .6 + gust * Math.sin(t * 9 + b.ph) * .5 + gust * .5;
      if (live) { const dx = b.x - mx, dy = (b.y - b.h * .5) - my, d = Math.hypot(dx, dy); if (d < 150) target += Math.sign(dx || 1) * (1 - d / 150) * .9; }
      b.bend += (target - b.bend) * Math.min(1, dt * 6);
    });
    figures.forEach(f => {
      f.look += ((live ? clamp((mx - f.x) / (W * .4), -1, 1) : Math.sin(t * .3 + f.seed)) - f.look) * Math.min(1, dt * 3);
      if ((f.blink -= dt) < -.14) f.blink = 2 + Math.random() * 6;
    });
    motes.forEach(m => {
      m.x += (m.v * (.3 + wind * 2 + gust * 6)) * dt;
      m.y += (m.ember ? -9 : 4) * dt + Math.sin(t * .8 + m.ph) * 4 * dt;
      if (m.x > W + 10) m.x = -10; if (m.x < -10) m.x = W + 10;
      if (m.y < hz - FH * .35) m.y = FH; if (m.y > FH + 10) m.y = hz - FH * .3;
    });
  };

  const draw = time => {
    const k = 1 - smooth(0, .3, zoom), R = Math.min(W, FH) * .06, fl = reduced ? 0 : flash() * k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* sky, stars, and the red haze around the moon */
    let gr = ctx.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, rgba(C.top)); gr.addColorStop(.6, rgba(C.mid)); gr.addColorStop(1, rgba(mix(mix(C.mid, C.hue, .35), C.ink, zoom)));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 2);
    ctx.globalAlpha = k; ctx.drawImage(L.stars, -par[0] * 3, 0, W, hz); ctx.globalAlpha = 1;
    gr = ctx.createRadialGradient(moon.x, moon.y, R * .8, moon.x, moon.y, W * .55);
    gr.addColorStop(0, rgba(C.haze, .45 * k)); gr.addColorStop(.35, rgba(C.hue, .16 * k)); gr.addColorStop(1, rgba(C.hue, 0));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz + 2);
    /* the blood moon, with a few darker seas */
    gr = ctx.createRadialGradient(moon.x - R * .3, moon.y - R * .3, R * .1, moon.x, moon.y, R);
    gr.addColorStop(0, rgba(mix(C.ember, C.paper, .3))); gr.addColorStop(1, rgba(mix(C.ember, C.hue, .45)));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(moon.x, moon.y, R, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(C.hue, .32);
    [[-.32, -.18, .26], [.22, .12, .2], [-.05, .38, .14], [.36, -.34, .11]].forEach(([a, b, s]) => { ctx.beginPath(); ctx.arc(moon.x + a * R, moon.y + b * R, s * R, 0, TAU); ctx.fill(); });
    const cx = -((time * 9) % (W * 2)) - par[0] * 6;
    ctx.drawImage(L.clouds, cx, 0, W * 2, hz); ctx.drawImage(L.clouds, cx + W * 2, 0, W * 2, hz);
    ctx.drawImage(L.numeral, -par[0] * 4, 0, W, hz + 8);
    /* crows */
    ctx.strokeStyle = rgba(C.ink); ctx.lineWidth = 1.7; ctx.lineCap = 'round';
    crows.forEach(c => {
      const a = Math.sin(time * 11 + c.ph), s = c.s;
      ctx.beginPath(); ctx.moveTo(c.x - s, c.y - a * s * .5);
      ctx.quadraticCurveTo(c.x - s * .5, c.y - s * .2 + a * s * .2, c.x, c.y);
      ctx.quadraticCurveTo(c.x + s * .5, c.y - s * .2 + a * s * .2, c.x + s, c.y - a * s * .5);
      ctx.stroke();
    });
    const gx = -20 - par[0] * 10, fx = -par[0] * 16, fy = -par[1] * 6;
    ctx.drawImage(L.hills, gx, 0, W + 40, hz + 4);
    ctx.drawImage(L.ground, -20 + fx, hz - 2 + fy * .5, W + 40, H - hz + 30);
    const fogX = -((time * 6) % (W * 2)) + fx * .5, fogY = hz - FH * .12;
    ctx.globalAlpha = .8; ctx.drawImage(L.fog, fogX, fogY, W * 2, L.fogH); ctx.drawImage(L.fog, fogX + W * 2, fogY, W * 2, L.fogH); ctx.globalAlpha = 1;
    /* long moonlight shadows, cast toward you and away from the moon */
    const elev = clamp((hz - moon.y) / (FH * .25));
    figures.forEach(f => {
      const x = f.x + fx, base = f.base + fy, w = f.h * f.w, dir = (x - moon.x) / W;
      const len = f.h * (.5 + 1.1 * (1 - elev)), tx = x + dir * f.h * 2.8, ty = base + len * .4;
      const sg = ctx.createLinearGradient(x, base, tx, ty);
      sg.addColorStop(0, rgba(C.ink, .6 * k)); sg.addColorStop(1, rgba(C.ink, 0));
      ctx.fillStyle = sg; ctx.beginPath();
      ctx.moveTo(x - w * .55, base); ctx.lineTo(x + w * .55, base); ctx.lineTo(tx + w * .2, ty); ctx.lineTo(tx - w * .2, ty); ctx.closePath(); ctx.fill();
    });
    /* figures — a red rim on the moon side, and eyes that follow you */
    figures.forEach(f => {
      const x = f.x + fx, base = f.base + fy, side = Math.sign(moon.x - x) || 1, lean = f.lean + Math.sin(time * .7 + f.seed) * .004;
      robe(ctx, x + side * Math.max(1.2, f.h * .008), base, f.h, f.w, lean);
      ctx.fillStyle = rgba(mix(C.ember, C.paper, .15), (.35 + fl * .5) * k); ctx.fill();
      robe(ctx, x, base, f.h, f.w, lean);
      ctx.fillStyle = rgba(mix(C.ink, C.brown, .08)); ctx.fill();
      if (f.h > FH * .06 && f.blink > 0 && k > .05) {
        const ex = x + f.look * f.h * .045, ey = base - f.h * .86, gap = f.h * .032, r = Math.max(.9, f.h * .011);
        ctx.save(); ctx.shadowColor = rgba(C.eye, .9); ctx.shadowBlur = Math.max(4, r * 5); ctx.fillStyle = rgba(C.eye, .95 * k);
        ctx.beginPath(); ctx.arc(ex - gap, ey, r, 0, TAU); ctx.arc(ex + gap, ey, r, 0, TAU); ctx.fill(); ctx.restore();
      }
    });
    /* the foreground grass, swaying */
    [[.3, .62, mix(C.brown, C.ink, .25)], [.62, .85, mix(C.brown, C.ink, .5)], [.85, 2, mix(C.ink, C.brown, .15)]].forEach(([a, b, col]) => {
      ctx.strokeStyle = rgba(col); ctx.beginPath();
      blades.forEach(bl => {
        if (bl.d < a || bl.d >= b) return;
        const x = bl.x + fx, y = bl.y + fy, s = Math.sin(bl.bend), c = Math.cos(bl.bend);
        ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * bl.h * .35, y - bl.h * .6, x + s * bl.h, y - c * bl.h);
      });
      ctx.lineWidth = a < .6 ? 1 : a < .8 ? 1.6 : 2.4; ctx.stroke();
    });
    ctx.globalAlpha = .55; ctx.drawImage(L.fog, fogX * 1.6 % (W * 2), fogY + L.fogH * .25, W * 2, L.fogH); ctx.drawImage(L.fog, fogX * 1.6 % (W * 2) + W * 2, fogY + L.fogH * .25, W * 2, L.fogH); ctx.globalAlpha = 1;
    /* ash drifting down, embers rising */
    motes.forEach(m => {
      ctx.fillStyle = m.ember ? rgba(C.eye, (.35 + .4 * Math.sin(time * 3 + m.ph) ** 2) * k) : rgba(C.paper, .18 * k);
      ctx.fillRect(m.x, m.y, m.s, m.s);
    });
    /* lightning, then the vignette, an old-film flicker, and full dark as you scroll */
    if (fl > .01) { ctx.fillStyle = rgba(C.paper, fl * .3); ctx.fillRect(0, 0, W, H); }
    gr = ctx.createRadialGradient(W * .6, FH * .5, Math.min(W, FH) * .25, W * .6, FH * .5, Math.max(W, FH) * .8);
    gr.addColorStop(0, rgba(C.ink, 0)); gr.addColorStop(1, rgba(C.ink, .7));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    if (!reduced) { ctx.fillStyle = rgba(C.ink, .03 + Math.random() * .05); ctx.fillRect(0, 0, W, H); }
    const night = smooth(.05, .85, zoom);
    if (night > 0) { ctx.fillStyle = rgba(C.ink, night * .99); ctx.fillRect(0, 0, W, H); }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(boil[0], boil[1]);
    ctx.fillStyle = grain; ctx.globalAlpha = .55;
    ctx.fillRect(-boil[0], -boil[1], cv.width, cv.height);
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  /* where the moon is on screen — garden.js sends the bat to it on scroll */
  MA.heroFocus = () => { const r = pin.getBoundingClientRect(); return [r.left + moon.x * r.width / W, r.top + moon.y * r.height / H]; };
  MA.heroFocusLocal = () => [moon.x * pw / W, moon.y * ph / H]; // hero-relative, no layout read

  let prev = performance.now(), visible = true;
  const frame = now => {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - prev) / 1000);
    prev = now;
    if (!visible || document.hidden || !L.ground) return;
    t += dt;
    const p = MA.heroP || 0;
    zoom = pinned ? smooth(.03, .42, p) : 0;
    if (zoom > 0) { cv.style.transformOrigin = `${(moon.x / W * 100).toFixed(2)}% ${(hz / H * 100).toFixed(2)}%`; cv.style.transform = `scale(${(1 + zoom * .35).toFixed(4)})`; }
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
    draw(t);
  };

  const init = () => {
    resize();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    addEventListener('themechange', () => { build(); if (reduced) draw(0); });
    new IntersectionObserver(es => es.forEach(en => { visible = en.isIntersecting; })).observe(hero);
    if (!reduced) requestAnimationFrame(frame);
  };
  /* the big numeral is set in the display serif, so wait for it */
  (document.fonts ? document.fonts.load('400 100px "DM Serif Display"').catch(() => {}) : Promise.resolve()).then(init);
})();
