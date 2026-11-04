/**
 * Lab · handwriting — a real digit reader. A 64-64-10 network trained offline on
 * scikit-learn's handwritten digits (data/digits.json) reads what you draw. The
 * drawing is cropped, fitted into 32×32 and pooled to 8×8 — the same way its
 * training data was made — then run through the network in your browser.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const panel = $('lab-dg'), cv = $('dgIn'), seen = $('dgSeen'), bars = $('dgBars'), guessEl = $('dgGuess'), confEl = $('dgConf');
  if (!panel || !cv || !seen || !bars) return;
  const MA = window.MA = window.MA || {};
  const S = 280, ctx = cv.getContext('2d');
  const ink = document.createElement('canvas'), small = document.createElement('canvas');
  ink.width = ink.height = S; small.width = small.height = 32;
  const ictx = ink.getContext('2d', { willReadFrequently: true }), sctx = small.getContext('2d', { willReadFrequently: true });
  let net = null, loading = null, C = {}, down = false, last = null, queued = false, drawn = false;

  /* ── model: fetched once, shape-checked before use ── */
  const nums = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
  const load = () => loading = loading || fetch('data/digits.json?v=2').then(r => (r.ok ? r.json() : null)).then(d => {
    if (!d || !nums(d.w1, 4096) || !nums(d.b1, 64) || !nums(d.w2, 640) || !nums(d.b2, 10)) throw new Error('bad model');
    net = { w1: Float32Array.from(d.w1), b1: Float32Array.from(d.b1), w2: Float32Array.from(d.w2), b2: Float32Array.from(d.b2) };
  }).catch(() => { confEl.textContent = 'the model could not load'; });
  const predict = x => {
    const h = new Float32Array(64), z = new Float32Array(10);
    for (let j = 0; j < 64; j++) { let s = net.b1[j]; for (let i = 0; i < 64; i++) s += x[i] * net.w1[i * 64 + j]; h[j] = s > 0 ? s : 0; }
    for (let k = 0; k < 10; k++) { let s = net.b2[k]; for (let j = 0; j < 64; j++) s += h[j] * net.w2[j * 10 + k]; z[k] = s; }
    const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), sum = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / sum);
  };

  /* ── preprocessing: bounding box → fit into 28×28, centred in 32×32 → count ink in 4×4 blocks (0..16).
     The training data went through exactly this (see the note in data/digits.json). ── */
  const features = () => {
    const d = ictx.getImageData(0, 0, S, S).data;
    let x0 = S, y0 = S, x1 = -1, y1 = -1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, k = 28 / Math.max(w, h), dw = Math.max(1, Math.round(w * k)), dh = Math.max(1, Math.round(h * k));
    sctx.fillStyle = '#000'; sctx.fillRect(0, 0, 32, 32);
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(ink, x0, y0, w, h, (32 - dw) >> 1, (32 - dh) >> 1, dw, dh);
    const p = sctx.getImageData(0, 0, 32, 32).data, v = new Float32Array(64);
    for (let by = 0; by < 8; by++) for (let bx = 0; bx < 8; bx++) {
      let n = 0;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (p[((by * 4 + y) * 32 + bx * 4 + x) * 4] > 90) n++;
      v[by * 8 + bx] = n / 16;
    }
    return v;
  };

  /* ── view ── */
  const hex = h => { h = (h || '').trim().replace('#', ''); const n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h, 16); return Number.isNaN(n) ? [128, 128, 128] : [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const readColours = () => { const s = getComputedStyle(panel); C = { ink: hex(s.getPropertyValue('--c0')), paper: hex(s.getPropertyValue('--art-paper')), hue: hex(s.getPropertyValue('--art-hue')) }; };
  const rows = Array.from({ length: 10 }, (_, k) => {
    const row = document.createElement('div'), lab = document.createElement('b'), bar = document.createElement('i'), pct = document.createElement('em');
    row.className = 'dg-row mono'; lab.textContent = k; pct.textContent = '—';
    row.append(lab, bar, pct); bars.append(row);
    return { row, bar, pct };
  });
  const clear = () => {
    ctx.fillStyle = `rgb(${C.ink})`; ctx.fillRect(0, 0, S, S);
    ictx.fillStyle = '#000'; ictx.fillRect(0, 0, S, S);
    seen.getContext('2d').clearRect(0, 0, 8, 8);
    guessEl.textContent = '?'; confEl.textContent = 'waiting for ink'; drawn = false;
    rows.forEach(r => { r.bar.style.setProperty('--p', 0); r.pct.textContent = '—'; r.row.classList.remove('top'); });
  };
  const run = () => {
    const x = features();
    if (!x) return;
    const sg = seen.getContext('2d'), img = sg.createImageData(8, 8);
    for (let i = 0; i < 64; i++) { const c = x[i] < .5 ? C.ink.map((v, j) => Math.round(v + (C.hue[j] - v) * x[i] * 2)) : C.hue.map((v, j) => Math.round(v + (C.paper[j] - v) * (x[i] - .5) * 2)); img.data.set([...c, 255], i * 4); }
    sg.putImageData(img, 0, 0);
    if (!net) { load().then(() => net && run()); return; }
    const p = predict(x), best = p.indexOf(Math.max(...p));
    guessEl.textContent = best;
    confEl.textContent = `${Math.round(p[best] * 100)}% sure`;
    rows.forEach((r, k) => { r.bar.style.setProperty('--p', p[k].toFixed(3)); r.pct.textContent = Math.round(p[k] * 100) + '%'; r.row.classList.toggle('top', k === best); });
    if (drawn && p[best] >= .9 && MA.achieve) MA.achieve('reader');
  };

  /* ── drawing: the visible canvas in theme colours, a hidden copy in white-on-black for the model ── */
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * S, (e.clientY - r.top) / r.height * S]; };
  const line = (g, col, a, b) => { g.strokeStyle = col; g.lineWidth = 24; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  const stroke = p => {
    const a = last || p;
    line(ctx, `rgb(${C.paper})`, a, p); line(ictx, '#fff', a, p);
    last = p; drawn = true;
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; run(); }); }
  };
  cv.addEventListener('pointerdown', e => { down = true; last = null; cv.setPointerCapture(e.pointerId); load(); stroke(at(e)); });
  cv.addEventListener('pointermove', e => { if (down) stroke(at(e)); });
  ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => { down = false; last = null; }));
  /* no pointer? a typed digit, drawn into both canvases, gets read the same way */
  const sample = () => {
    clear(); load();
    const d = String(Math.floor(Math.random() * 10)), font = `600 ${S * .72}px "Space Grotesk", system-ui, sans-serif`;
    [[ctx, `rgb(${C.paper})`], [ictx, '#fff']].forEach(([g, col]) => { g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d, S / 2, S * .54); });
    run();
  };
  panel.addEventListener('click', e => { if (e.target.closest('[data-dg="clear"]')) clear(); else if (e.target.closest('[data-dg="sample"]')) sample(); });
  addEventListener('labtab', e => { if (e.detail === 'lab-dg') load(); });
  addEventListener('themechange', () => { readColours(); clear(); });
  readColours(); clear();
})();
