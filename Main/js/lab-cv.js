/**
 * Lab · computer vision — what the first layer of a CNN sees. Draw on the
 * 96×96 input (or load a sample); four 3×3 kernels slide over it, ReLU keeps
 * the positive responses, 2×2 max-pooling shrinks each map, and global
 * average pooling turns each into a single "how much of this is here" score.
 * Hover the input to see one convolution worked out by hand.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const panel = $('lab-cv'), inCv = $('cvIn'), maps = $('cvMaps'), eq = $('cvEq'), lens = $('cvLens');
  if (!panel || !inCv || !maps) return;
  const S = 96, M = S - 2, P = M >> 1;
  const KERNELS = [
    { name: 'vertical edges', k: [-1, 0, 1, -2, 0, 2, -1, 0, 1] },
    { name: 'horizontal edges', k: [-1, -2, -1, 0, 0, 0, 1, 2, 1] },
    { name: 'diagonals', k: [0, 1, 2, -1, 0, 1, -2, -1, 0] },
    { name: 'spots & texture', k: [-1, -1, -1, -1, 8, -1, -1, -1, -1] }
  ];
  const img = new Float32Array(S * S);
  const feat = KERNELS.map(() => new Float32Array(M * M)), pooled = KERNELS.map(() => new Float32Array(P * P));
  const hex = h => { h = (h || '').trim().replace('#', ''); const n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h, 16); return Number.isNaN(n) ? [128, 128, 128] : [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let C = {}, active = 0;

  /* ── map cards: kernel numbers, feature map, pooled map, score ── */
  const cards = KERNELS.map((K, i) => {
    const card = el('button', 'cv-map'), head = el('span', 'cv-k'), grid = el('span', 'cv-kgrid');
    card.type = 'button';
    card.setAttribute('aria-pressed', String(i === 0));
    K.k.forEach(v => grid.append(el('i', v > 0 ? 'p' : v < 0 ? 'n' : '', String(v))));
    head.append(grid, el('b', null, K.name));
    const f = el('canvas'), p = el('canvas'), dot = el('i', 'cv-dot');
    f.width = f.height = M; p.width = p.height = P;
    const pics = el('span', 'cv-pics'), fw = el('span', 'cv-fw');
    fw.append(f, dot);
    pics.append(fw, p);
    const bar = el('span', 'cv-bar'), fill = el('i'), pct = el('em', null, '0%');
    bar.append(fill, pct);
    card.append(head, pics, bar);
    card.addEventListener('click', () => { active = i; cards.forEach((c, j) => c.card.setAttribute('aria-pressed', String(j === i))); });
    maps.append(card);
    return { card, f, p, dot, fill, pct };
  });

  /* ── convolution → ReLU → max-pool → global average ── */
  const convAt = (k, x, y) => { let s = 0; for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) s += img[(y + j) * S + x + i] * k[j * 3 + i]; return s; };
  const run = () => {
    const gap = KERNELS.map((K, n) => {
      const F = feat[n];
      let sum = 0;
      for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) { const v = Math.max(0, convAt(K.k, x, y)); F[y * M + x] = v; sum += v; }
      const Pp = pooled[n];
      for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
        const a = y * 2 * M + x * 2;
        Pp[y * P + x] = Math.max(F[a], F[a + 1], F[a + M], F[a + M + 1]);
      }
      return sum / (M * M);
    });
    const tot = gap.reduce((a, b) => a + b, 0) || 1;
    cards.forEach((c, n) => {
      paintMap(c.f, feat[n], M); paintMap(c.p, pooled[n], P);
      const share = gap[n] / tot;
      c.fill.style.setProperty('--w', share.toFixed(3));
      c.pct.textContent = Math.round(share * 100) + '%';
    });
    paintInput();
  };
  const paintMap = (cv, F, n) => {
    const g = cv.getContext('2d'), d = g.createImageData(n, n);
    let max = 1e-6;
    for (let i = 0; i < F.length; i++) if (F[i] > max) max = F[i];
    const scale = Math.max(max, 1.5);
    for (let i = 0; i < F.length; i++) {
      const t = Math.min(1, F[i] / scale), c = t < .5 ? mix(C.ink, C.hue, t * 2) : mix(C.hue, C.paper, (t - .5) * 2);
      d.data[i * 4] = c[0]; d.data[i * 4 + 1] = c[1]; d.data[i * 4 + 2] = c[2]; d.data[i * 4 + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  };
  const paintInput = () => {
    const g = inCv.getContext('2d'), d = g.createImageData(S, S);
    for (let i = 0; i < S * S; i++) { const c = mix(C.ink, C.paper, img[i]); d.data[i * 4] = c[0]; d.data[i * 4 + 1] = c[1]; d.data[i * 4 + 2] = c[2]; d.data[i * 4 + 3] = 255; }
    g.putImageData(d, 0, 0);
  };

  /* ── samples, drawn white-on-black then read back as intensity ── */
  const SAMPLES = {
    eye: g => {
      g.lineWidth = 5; g.strokeStyle = '#fff';
      g.beginPath(); g.moveTo(10, 48); g.bezierCurveTo(30, 18, 66, 18, 86, 48); g.bezierCurveTo(66, 78, 30, 78, 10, 48); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(48, 48, 15, 0, 7); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(48, 48, 7, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(52, 44, 2.5, 0, 7); g.fill();
    },
    leaf: g => {
      g.save(); g.translate(48, 50); g.rotate(-.6);
      g.fillStyle = '#ddd'; g.beginPath(); g.ellipse(0, 0, 38, 18, 0, 0, 7); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(-40, 0); g.lineTo(38, 0); g.stroke();
      g.lineWidth = 1.2;
      for (let x = -26; x < 30; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 9, -14); g.moveTo(x, 0); g.lineTo(x + 9, 14); g.stroke(); }
      g.fillStyle = '#333'; [[-12, 6, 4], [8, -7, 5], [20, 5, 3]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
      g.restore();
    },
    seven: g => { g.fillStyle = '#fff'; g.font = '400 92px "DM Serif Display", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('7', 48, 54); },
    grid: g => { g.fillStyle = '#fff'; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2 === 0) g.fillRect(8 + x * 20, 8 + y * 20, 20, 20); }
  };
  const load = name => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    if (SAMPLES[name]) SAMPLES[name](g);
    const d = g.getImageData(0, 0, S, S).data;
    for (let i = 0; i < S * S; i++) img[i] = d[i * 4] / 255;
    run();
  };

  /* ── drawing and the hover lens ── */
  const at = e => { const r = inCv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * S, (e.clientY - r.top) / r.height * S]; };
  let down = false, last = null, queued = false;
  const dab = (x, y) => {
    const R = 3.4;
    for (let j = Math.floor(y - R - 1); j <= y + R + 1; j++) for (let i = Math.floor(x - R - 1); i <= x + R + 1; i++) {
      if (i < 0 || j < 0 || i >= S || j >= S) continue;
      const d = Math.hypot(i + .5 - x, j + .5 - y), a = Math.max(0, Math.min(1, R + .5 - d));
      img[j * S + i] = Math.max(img[j * S + i], a);
    }
  };
  const stroke = (x, y) => {
    if (last) { const n = Math.ceil(Math.hypot(x - last[0], y - last[1]) / 1.2); for (let k = 1; k <= n; k++) dab(last[0] + (x - last[0]) * k / n, last[1] + (y - last[1]) * k / n); }
    else dab(x, y);
    last = [x, y];
    if (window.MA && MA.achieve) MA.achieve('vision');
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; run(); }); }
  };
  inCv.addEventListener('pointerdown', e => { down = true; last = null; inCv.setPointerCapture(e.pointerId); stroke(...at(e)); });
  inCv.addEventListener('pointerup', () => { down = false; last = null; });
  inCv.addEventListener('pointercancel', () => { down = false; last = null; });
  inCv.addEventListener('pointermove', e => {
    const [x, y] = at(e);
    if (down) stroke(x, y);
    const cx = Math.max(0, Math.min(M - 1, Math.floor(x) - 1)), cy = Math.max(0, Math.min(M - 1, Math.floor(y) - 1));
    if (lens) { lens.style.left = (cx / S * 100) + '%'; lens.style.top = (cy / S * 100) + '%'; lens.classList.add('on'); }
    cards.forEach(c => { c.dot.style.left = ((cx + .5) / M * 100) + '%'; c.dot.style.top = ((cy + .5) / M * 100) + '%'; c.dot.classList.add('on'); });
    const K = KERNELS[active].k, v = convAt(K, cx, cy);
    const patch = Array.from({ length: 9 }, (_, i) => img[(cy + (i / 3 | 0)) * S + cx + i % 3].toFixed(1).replace(/^0/, '')).join(' ');
    eq.textContent = `patch [${patch}] ⊙ ${KERNELS[active].name} = ${v.toFixed(2)} → ReLU ${Math.max(0, v).toFixed(2)}`;
  });
  inCv.addEventListener('pointerleave', () => {
    if (lens) lens.classList.remove('on');
    cards.forEach(c => c.dot.classList.remove('on'));
    eq.textContent = 'hover the input to see one convolution worked out';
  });
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-cv]');
    if (!b) return;
    if (b.dataset.cv === 'clear') { img.fill(0); run(); } else load(b.dataset.cv);
  });

  const readColours = () => {
    const s = getComputedStyle(panel);
    C = { ink: hex(s.getPropertyValue('--c0')), hue: hex(s.getPropertyValue('--art-hue')), paper: hex(s.getPropertyValue('--art-paper')) };
  };
  readColours();
  addEventListener('themechange', () => { readColours(); run(); });
  (document.fonts ? document.fonts.load('400 92px "DM Serif Display"').catch(() => {}) : Promise.resolve()).then(() => load('eye'));
})();
