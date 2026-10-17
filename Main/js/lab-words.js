/**
 * Lab · embeddings — word maths on a map. Real token embeddings from
 * all-MiniLM-L6-v2 (data/words.json: 125 words, 64 dims, int8) do the maths;
 * a t-SNE layout of the same vectors draws the map. Drag words into
 * A − B + C, or click one to fill the next slot; hover a word to see its
 * nearest neighbours.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const panel = $('lab-wd'), map = $('wdMap'), out = $('wdOut'), res = $('wdRes'), hud = $('wdHud');
  if (!panel || !map || !out || !res) return;
  const MA = window.MA = window.MA || {};
  const NS = 'http://www.w3.org/2000/svg', P = 600, PAD = 36;
  const slots = [...panel.querySelectorAll('.wd-slot')];
  const svg = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
  let W = [], V = [], XY = [], idx = new Map(), loading = null, nodes = [], links = null, arrows = null, next = 0;
  const eq = ['king', 'man', 'woman'];

  /* ── data: fetched once, every field checked ── */
  const load = () => loading = loading || fetch('data/words.json?v=2').then(r => (r.ok ? r.json() : null)).then(d => {
    const n = d && Array.isArray(d.words) ? d.words.length : 0, k = d && d.dims;
    if (!n || n > 400 || !Number.isInteger(k) || k < 8 || k > 512 || !d.words.every(w => typeof w === 'string' && /^[a-z]{1,24}$/.test(w))
      || !Array.isArray(d.vec) || d.vec.length !== n * k || !Array.isArray(d.xy) || d.xy.length !== n * 2
      || !d.vec.every(Number.isFinite) || !d.xy.every(Number.isFinite)) throw new Error('bad data');
    W = d.words;
    V = W.map((_, i) => { const v = Float32Array.from(d.vec.slice(i * k, i * k + k)); const m = Math.hypot(...v) || 1; return v.map(x => x / m); });
    XY = W.map((_, i) => [PAD + d.xy[i * 2] * (P - PAD * 2), PAD + d.xy[i * 2 + 1] * (P - PAD * 2)]);
    W.forEach((w, i) => idx.set(w, i));
    draw(); solve();
  }).catch(() => { hud.textContent = 'the embeddings could not load'; });

  const cos = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
  const nearest = (q, skip, n) => W.map((w, i) => [w, cos(q, V[i])]).filter(([w]) => !skip.includes(w)).sort((a, b) => b[1] - a[1]).slice(0, n);

  /* ── the map ── */
  const draw = () => {
    map.textContent = '';
    const defs = svg('defs', {}, map), mk = svg('marker', { id: 'wdArrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    svg('path', { d: 'M0 0L10 5L0 10Z', class: 'wd-head' }, mk);
    links = svg('g', { class: 'wd-links' }, map);
    arrows = svg('g', { class: 'wd-arrows' }, map);
    const g = svg('g', { class: 'wd-words' }, map);
    nodes = W.map((w, i) => {
      const n = svg('g', { class: 'wd-w', transform: `translate(${XY[i][0].toFixed(1)} ${XY[i][1].toFixed(1)})`, tabindex: 0, role: 'button', 'aria-label': `Use “${w}”` }, g);
      svg('circle', { r: 3.2 }, n);
      const t = svg('text', { x: 6, y: 4 }, n);
      t.textContent = w;
      n.dataset.w = w;
      return n;
    });
  };
  const neighbours = w => {
    links.textContent = '';
    nodes.forEach(n => n.classList.remove('near', 'hot'));
    if (!w || !idx.has(w)) return;
    const i = idx.get(w);
    nodes[i].classList.add('hot');
    nearest(V[i], [w], 5).forEach(([u]) => {
      const j = idx.get(u);
      nodes[j].classList.add('near');
      svg('line', { x1: XY[i][0], y1: XY[i][1], x2: XY[j][0], y2: XY[j][1] }, links);
    });
  };

  /* ── the equation ── */
  const solve = () => {
    slots.forEach((s, k) => { s.textContent = eq[k] || '?'; s.classList.toggle('empty', !eq[k]); });
    nodes.forEach(n => n.classList.toggle('in', eq.includes(n.dataset.w)));
    if (!V.length || eq.some(w => !idx.has(w))) { out.textContent = '?'; res.textContent = ''; return; }
    const [a, b, c] = eq.map(w => V[idx.get(w)]), q = a.map((v, i) => v - b[i] + c[i]), m = Math.hypot(...q) || 1;
    const top = nearest(q.map(v => v / m), eq, 4);
    out.textContent = top[0][0];
    res.textContent = '';
    top.forEach(([w, s], k) => {
      const row = document.createElement('div'), bar = document.createElement('i'), lab = document.createElement('b'), val = document.createElement('em');
      row.className = 'wd-row mono' + (k ? '' : ' top');
      lab.textContent = w; val.textContent = s.toFixed(2);
      bar.style.setProperty('--p', Math.max(0, s).toFixed(3));
      row.append(lab, bar, val); res.append(row);
    });
    /* parallel offsets: b → a and c → answer */
    arrows.textContent = '';
    const r = idx.get(top[0][0]);
    [[eq[1], eq[0]], [eq[2], W[r]]].forEach(([from, to], k) => {
      const p = XY[idx.get(from)], q2 = XY[idx.get(to)];
      svg('line', { x1: p[0], y1: p[1], x2: q2[0], y2: q2[1], class: k ? 'ans' : 'ref', 'marker-end': 'url(#wdArrow)' }, arrows);
    });
    nodes[r].classList.add('ans');
    nodes.forEach((n, i) => { if (i !== r) n.classList.remove('ans'); });
    hud.textContent = `${eq[0]} − ${eq[1]} + ${eq[2]} ≈ ${top[0][0]}   ·   cosine ${top[0][1].toFixed(2)}`;
    if (MA.achieve) MA.achieve('analogy');
  };
  const put = (w, k) => { eq[k] = w; next = (k + 1) % 3; solve(); };

  /* ── drag a word onto a slot (or click it to fill the next one) ── */
  let drag = null;
  map.addEventListener('pointerdown', e => {
    const n = e.target.closest('.wd-w');
    if (!n) return;
    e.preventDefault();
    drag = { w: n.dataset.w, x: e.clientX, y: e.clientY, ghost: null };
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
      drag.ghost = document.createElement('span');
      drag.ghost.className = 'wd-ghost mono'; drag.ghost.textContent = drag.w;
      document.body.append(drag.ghost);
    }
    if (drag.ghost) {
      drag.ghost.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      const over = document.elementFromPoint(e.clientX, e.clientY);
      slots.forEach(s => s.classList.toggle('over', !!over && over.closest('.wd-slot') === s));
    }
  });
  addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag;
    drag = null;
    slots.forEach(s => s.classList.remove('over'));
    if (d.ghost) {
      d.ghost.remove();
      const s = (document.elementFromPoint(e.clientX, e.clientY) || document.body).closest('.wd-slot');
      if (s) put(d.w, +s.dataset.slot);
    } else put(d.w, next);
  });
  map.addEventListener('keydown', e => { const n = e.target.closest('.wd-w'); if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); put(n.dataset.w, next); } });
  map.addEventListener('pointerover', e => { const n = e.target.closest('.wd-w'); if (n && !drag) neighbours(n.dataset.w); });
  map.addEventListener('pointerleave', () => neighbours(null));
  slots.forEach((s, k) => s.addEventListener('click', () => { next = k; s.classList.add('pick'); setTimeout(() => s.classList.remove('pick'), 500); }));
  panel.addEventListener('click', e => { const b = e.target.closest('[data-wd]'); if (b) { b.dataset.wd.split(' ').forEach((w, k) => { eq[k] = w; }); next = 0; solve(); } });
  addEventListener('labtab', e => { if (e.detail === 'lab-wd') load(); });
  new IntersectionObserver((es, o) => es.forEach(en => { if (en.isIntersecting && !panel.hidden) { o.disconnect(); load(); } }), { rootMargin: '300px' }).observe(panel.closest('section') || panel);
})();
