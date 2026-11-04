/**
 * Lab · deep learning — a small neural network (2-16-16-1, tanh, Adam, full
 * batch) trains live on a 2D dataset. The plot shows its decision boundary as
 * it learns; the diagram shows every neuron as what it responds to across the
 * plane, with links coloured by sign and sized by weight. Click the plot to
 * add points of the selected class.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const plot = $('nnPlot'), diag = $('nnNet'), panel = $('lab-nn');
  if (!plot || !diag || !panel) return;
  const pctx = plot.getContext('2d'), nctx = diag.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2, SIZES = [2, 16, 16, 1], G = 56, T = 12;
  const hex = h => { h = (h || '').trim().replace('#', ''); const n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h, 16); return Number.isNaN(n) ? [128, 128, 128] : [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };

  /* ── datasets in [-1, 1]² as [x, y, class] ── */
  const SETS = {
    spiral: n => Array.from({ length: n }, (_, i) => { const c = i % 2, t = (i >> 1) / (n / 2), a = t * 4 * Math.PI + c * Math.PI, r = .06 + t * .88; return [r * Math.cos(a) + gauss() * .028, r * Math.sin(a) + gauss() * .028, c]; }),
    circles: n => Array.from({ length: n }, (_, i) => { const c = i % 2, r = c ? .1 + Math.random() * .3 : .58 + Math.random() * .32, a = Math.random() * TAU; return [r * Math.cos(a), r * Math.sin(a), c]; }),
    xor: n => Array.from({ length: n }, () => { let x, y; do { x = Math.random() * 1.8 - .9; y = Math.random() * 1.8 - .9; } while (Math.abs(x) < .07 || Math.abs(y) < .07); return [x, y, x * y > 0 ? 1 : 0]; }),
    moons: n => Array.from({ length: n }, (_, i) => { const c = i % 2, t = Math.random() * Math.PI, x = c ? 1 - Math.cos(t) : Math.cos(t), y = c ? .5 - Math.sin(t) : Math.sin(t); return [(x - .5) * .62 + gauss() * .04, (y - .25) * .9 + gauss() * .04, c]; })
  };
  let setName = 'spiral', data = SETS.spiral(240), lr = .01, playing = !reduced, visible = false, converged = false;

  /* ── the network ── */
  let W, B, mW, vW, mB, vB, gW, gB, step = 0, loss = NaN, acc = NaN;
  const acts = SIZES.map(n => new Float64Array(n)), deltas = SIZES.map(n => new Float64Array(n));
  const zeros = arr => arr.map(a => new Float64Array(a.length));
  const reset = () => {
    W = []; B = [];
    for (let l = 0; l < SIZES.length - 1; l++) {
      const a = SIZES[l], b = SIZES[l + 1], s = Math.sqrt(1 / a);
      W.push(Float64Array.from({ length: a * b }, () => gauss() * s));
      B.push(new Float64Array(b));
    }
    mW = zeros(W); vW = zeros(W); mB = zeros(B); vB = zeros(B); gW = zeros(W); gB = zeros(B);
    step = 0; loss = acc = NaN; converged = false;
  };
  const forward = (x, y) => {
    acts[0][0] = x; acts[0][1] = y;
    for (let l = 0; l < W.length; l++) {
      const a = acts[l], o = acts[l + 1], w = W[l], b = B[l], n = SIZES[l], m = SIZES[l + 1], last = l === W.length - 1;
      for (let j = 0; j < m; j++) {
        let s = b[j];
        for (let i = 0; i < n; i++) s += a[i] * w[i * m + j];
        o[j] = last ? 1 / (1 + Math.exp(-s)) : Math.tanh(s);
      }
    }
    return acts[W.length][0];
  };
  /* one full-batch step: binary cross-entropy, backprop, Adam */
  const train = () => {
    gW.forEach(g => g.fill(0)); gB.forEach(g => g.fill(0));
    let ls = 0, ok = 0;
    const L = W.length;
    for (const [x, y, c] of data) {
      const p = forward(x, y);
      ls -= c ? Math.log(p + 1e-9) : Math.log(1 - p + 1e-9);
      if ((p > .5) === (c === 1)) ok++;
      deltas[L][0] = p - c;
      for (let l = L - 1; l >= 0; l--) {
        const n = SIZES[l], m = SIZES[l + 1], a = acts[l], d = deltas[l + 1], w = W[l], g = gW[l], gb = gB[l];
        for (let j = 0; j < m; j++) { gb[j] += d[j]; for (let i = 0; i < n; i++) g[i * m + j] += a[i] * d[j]; }
        if (l) for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < m; j++) s += w[i * m + j] * d[j]; deltas[l][i] = s * (1 - a[i] * a[i]); }
      }
    }
    step++;
    const N = data.length, c1 = 1 - Math.pow(.9, step), c2 = 1 - Math.pow(.999, step);
    const adam = (P, Gr, M, V) => { for (let k = 0; k < P.length; k++) { const g = Gr[k] / N; M[k] = .9 * M[k] + .1 * g; V[k] = .999 * V[k] + .001 * g * g; P[k] -= lr * (M[k] / c1) / (Math.sqrt(V[k] / c2) + 1e-8); } };
    W.forEach((w, l) => adam(w, gW[l], mW[l], vW[l]));
    B.forEach((b, l) => adam(b, gB[l], mB[l], vB[l]));
    loss = ls / N; acc = ok / N;
  };

  /* ── drawing ── */
  let C = {}, S = 1, dpr = 1, field = null, thumbs = null;
  const readColours = () => {
    const s = getComputedStyle(panel);
    C = { ink: hex(s.getPropertyValue('--c0')), a: hex(s.getPropertyValue('--art-hue')), b: hex(s.getPropertyValue('--art-paper')), text: hex(s.getPropertyValue('--k5')) };
  };
  const shade = (p, k = 1) => { const t = Math.abs(p - .5) * 2 * k; return mix(C.ink, p > .5 ? C.a : C.b, .12 + t * .5); };
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    S = plot.clientWidth;
    plot.width = plot.height = Math.round(S * dpr);
    diag.width = Math.round(diag.clientWidth * dpr); diag.height = Math.round(diag.clientHeight * dpr);
    field = document.createElement('canvas'); field.width = field.height = G;
    thumbs = document.createElement('canvas'); thumbs.width = thumbs.height = T;
  };
  const drawPlot = () => {
    const f = field.getContext('2d'), img = f.createImageData(G, G);
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const c = shade(forward(gx / (G - 1) * 2 - 1, gy / (G - 1) * 2 - 1)), k = (gy * G + gx) * 4;
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
    f.putImageData(img, 0, 0);
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.imageSmoothingEnabled = true;
    pctx.drawImage(field, 0, 0, plot.width, plot.height);
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.strokeStyle = rgba(C.text, .08); pctx.lineWidth = 1;
    pctx.beginPath(); pctx.moveTo(S / 2, 0); pctx.lineTo(S / 2, S); pctx.moveTo(0, S / 2); pctx.lineTo(S, S / 2); pctx.stroke();
    const r = Math.max(3, S / 110);
    data.forEach(([x, y, c]) => {
      pctx.beginPath(); pctx.arc((x + 1) / 2 * S, (y + 1) / 2 * S, r, 0, TAU);
      pctx.fillStyle = rgba(c ? C.a : C.b); pctx.fill();
      pctx.lineWidth = 1.4; pctx.strokeStyle = rgba(C.ink); pctx.stroke();
    });
  };
  /* every neuron, drawn as its activation over the plane */
  const drawNet = () => {
    const w = diag.width / dpr, h = diag.height / dpr, cols = SIZES.length, pad = 18;
    const node = Math.min(22, (h - pad * 2) / 16 - 4), xs = SIZES.map((_, l) => pad + node / 2 + l * (w - pad * 2 - node) / (cols - 1));
    const ys = SIZES.map(n => Array.from({ length: n }, (_, i) => h / 2 + (i - (n - 1) / 2) * (node + 4)));
    const grid = SIZES.map(n => Array.from({ length: n }, () => new Float32Array(T * T)));
    for (let gy = 0; gy < T; gy++) for (let gx = 0; gx < T; gx++) {
      forward(gx / (T - 1) * 2 - 1, gy / (T - 1) * 2 - 1);
      SIZES.forEach((n, l) => { for (let i = 0; i < n; i++) grid[l][i][gy * T + gx] = l === SIZES.length - 1 ? acts[l][i] * 2 - 1 : acts[l][i]; });
    }
    nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nctx.clearRect(0, 0, w, h);
    for (let l = 0; l < W.length; l++) {
      const n = SIZES[l], m = SIZES[l + 1];
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        const v = W[l][i * m + j], a = Math.min(1, Math.abs(v) / 2.2);
        if (a < .04) continue;
        nctx.strokeStyle = rgba(v > 0 ? C.a : C.b, .12 + a * .6); nctx.lineWidth = .4 + a * 2.6;
        nctx.beginPath(); nctx.moveTo(xs[l] + node / 2, ys[l][i]); nctx.lineTo(xs[l + 1] - node / 2, ys[l + 1][j]); nctx.stroke();
      }
    }
    const tc = thumbs.getContext('2d'), img = tc.createImageData(T, T);
    nctx.imageSmoothingEnabled = false;
    SIZES.forEach((n, l) => {
      for (let i = 0; i < n; i++) {
        const g = grid[l][i];
        for (let k = 0; k < T * T; k++) { const c = shade((g[k] + 1) / 2, 1.4); img.data[k * 4] = c[0]; img.data[k * 4 + 1] = c[1]; img.data[k * 4 + 2] = c[2]; img.data[k * 4 + 3] = 255; }
        tc.putImageData(img, 0, 0);
        nctx.drawImage(thumbs, xs[l] - node / 2, ys[l][i] - node / 2, node, node);
        nctx.strokeStyle = rgba(C.text, .25); nctx.lineWidth = 1; nctx.strokeRect(xs[l] - node / 2 + .5, ys[l][i] - node / 2 + .5, node - 1, node - 1);
      }
    });
    nctx.fillStyle = rgba(C.text, .45); nctx.font = '500 10px "JetBrains Mono", monospace'; nctx.textAlign = 'center';
    ['x, y', 'tanh ×16', 'tanh ×16', 'σ'].forEach((t, l) => nctx.fillText(t, xs[l], h - 4));
  };

  /* ── hud + controls ── */
  const hud = { step: $('nnStep'), loss: $('nnLoss'), acc: $('nnAcc') }, playBtn = panel.querySelector('[data-nn="play"]');
  const paint = (net = true) => {
    drawPlot(); if (net) drawNet();
    if (hud.step) hud.step.textContent = step.toLocaleString('en-US');
    if (hud.loss) hud.loss.textContent = Number.isFinite(loss) ? loss.toFixed(3) : '—';
    if (hud.acc) hud.acc.textContent = Number.isFinite(acc) ? Math.round(acc * 100) + '%' : '—';
    if (playBtn) playBtn.textContent = converged ? 'converged ✓' : playing ? '❚❚ pause' : '▶ train';
  };
  const press = (sel, val) => panel.querySelectorAll(sel).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(val))));
  panel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.set) { setName = b.dataset.set; data = SETS[setName](240); reset(); playing = true; press('[data-set]', setName); }
    else if (b.dataset.lr) { lr = +b.dataset.lr; converged = false; press('[data-lr]', b.dataset.lr); }
    else if (b.dataset.nn === 'play') { if (converged) { converged = false; playing = true; } else playing = !playing; }
    else if (b.dataset.nn === 'reset') { reset(); playing = true; }
    else if (b.dataset.cls) { press('[data-cls]', b.dataset.cls); }
    else return;
    paint();
  });
  panel.querySelectorAll('[data-set]').forEach(b => { b.dataset.v = b.dataset.set; });
  panel.querySelectorAll('[data-lr]').forEach(b => { b.dataset.v = b.dataset.lr; });
  panel.querySelectorAll('[data-cls]').forEach(b => { b.dataset.v = b.dataset.cls; });
  const brush = () => { const b = panel.querySelector('[data-cls][aria-pressed="true"]'); return b ? +b.dataset.cls : 1; };
  const addPoint = (e, cls) => {
    const r = plot.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 2 - 1, y = (e.clientY - r.top) / r.height * 2 - 1;
    if (Math.abs(x) > 1 || Math.abs(y) > 1) return;
    data.push([x, y, cls]); converged = false; playing = true; paint();
  };
  plot.addEventListener('click', e => addPoint(e, e.shiftKey ? 1 - brush() : brush()));
  plot.addEventListener('contextmenu', e => { e.preventDefault(); addPoint(e, 1 - brush()); });

  /* ── loop: train while visible, stop once it has clearly converged ── */
  let frame = 0;
  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible || document.hidden || !playing || converged) return;
    for (let k = 0; k < 2; k++) train();
    if (acc === 1 && loss < .03) { converged = true; playing = false; if (window.MA && MA.achieve) MA.achieve('trainer'); }
    if (++frame % 2 === 0 || converged) paint(converged || frame % 8 === 0);
  };
  const init = () => {
    readColours(); size(); reset(); paint();
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; })).observe(plot);
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { size(); paint(); }, 150); });
    addEventListener('themechange', () => { readColours(); paint(); });
    addEventListener('labtab', () => { size(); paint(); });
    requestAnimationFrame(tick);
  };
  init();
})();
