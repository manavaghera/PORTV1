/**
 * Stack as a neural network: languages → ML libraries → LLM & infra → capabilities,
 * with residual (skip) connections. Signals pulse forward; hovering a neuron
 * lights everything upstream and downstream of it.
 */
(() => {
  'use strict';
  const box = document.getElementById('netBox');
  const svg = document.getElementById('netSvg');
  if (!box || !svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const L = [
    ['Python', 'TypeScript', 'JavaScript', 'SQL'],
    ['PyTorch', 'TensorFlow', 'TF Lite', 'Scikit-learn', 'Hugging Face', 'Sentence-BERT', 'YOLOv8', 'Whisper', 'ONNX Runtime', 'Pandas', 'NumPy'],
    ['LangChain', 'LangGraph', 'ChromaDB', 'Llama 3', 'Ollama', 'BeautifulSoup4', 'MLflow', 'FastAPI', 'Flask', 'React', 'Docker', 'Git'],
    ['Retrieval', 'Agents', 'Perception', 'Data', 'Products']
  ];
  const EDGES = [
    ...L[1].map(b => ['Python', b]),
    ['Python', 'BeautifulSoup4'], ['TypeScript', 'React'], ['JavaScript', 'React'], ['JavaScript', 'TensorFlow'], ['SQL', 'ChromaDB'], ['SQL', 'FastAPI'], ['SQL', 'Pandas'],
    ['PyTorch', 'LangChain'], ['PyTorch', 'Ollama'], ['PyTorch', 'MLflow'], ['TensorFlow', 'MLflow'], ['TensorFlow', 'FastAPI'],
    ['Scikit-learn', 'MLflow'], ['Scikit-learn', 'Flask'], ['Hugging Face', 'LangChain'], ['Hugging Face', 'LangGraph'], ['Hugging Face', 'Llama 3'],
    ['Sentence-BERT', 'ChromaDB'], ['Sentence-BERT', 'LangChain'], ['YOLOv8', 'FastAPI'], ['Whisper', 'FastAPI'], ['ONNX Runtime', 'FastAPI'],
    ['Pandas', 'MLflow'], ['Pandas', 'Flask'], ['NumPy', 'MLflow'],
    ['TF Lite', 'Perception'], ['YOLOv8', 'Perception'], ['Whisper', 'Perception'], ['ONNX Runtime', 'Perception'],
    ['Scikit-learn', 'Data'], ['Pandas', 'Data'], ['NumPy', 'Data'],
    ['LangChain', 'Retrieval'], ['LangChain', 'Agents'], ['LangGraph', 'Agents'], ['ChromaDB', 'Retrieval'], ['Llama 3', 'Agents'], ['Llama 3', 'Retrieval'],
    ['Ollama', 'Agents'], ['BeautifulSoup4', 'Data'], ['MLflow', 'Data'], ['FastAPI', 'Products'], ['Flask', 'Products'], ['React', 'Products'],
    ['Docker', 'Products'], ['Git', 'Products']
  ];
  const out = {}, inn = {};
  EDGES.forEach(([a, b]) => { (out[a] = out[a] || []).push(b); (inn[b] = inn[b] || []).push(a); });
  const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  let nodes = {}, edges = {}, pulses = [], vertical = false, visible = false, gP = null;

  const layout = () => {
    const W = svg.clientWidth, H = svg.clientHeight;
    if (!W || !H) return;
    vertical = W < 760;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    nodes = {}; edges = {};
    const gE = el('g'), gN = el('g');
    gP = el('g');
    svg.append(gE, gP, gN);
    const tight = vertical && W < 420; // phones: smaller pills (and text, via .tight) so three fit in a row
    svg.classList.toggle('tight', tight);
    const size = (name, l) => (tight ? (l === 3 ? [name.length * 7.2 + 26, 34] : [name.length * 6.4 + 16, 26]) : l === 3 ? [name.length * 8.4 + 36, 40] : [name.length * 7.5 + 26, 30]);
    const rowsV = [[.03, 2], [.17, 3], [.48, 3], [.84, 2]]; // vertical: [top fraction, columns]
    L.forEach((layer, l) => layer.forEach((name, i) => {
      const [w, h] = size(name, l);
      let x, y;
      if (!vertical) {
        x = [.06, .36, .64, .94][l] * W;
        const pad = l === 0 ? H * .22 : l === 3 ? H * .14 : 18;
        y = pad + (H - pad * 2) * (i / (layer.length - 1));
        if (l === 0) x = Math.max(x, w / 2 + 2);
        if (l === 3) x = Math.min(x, W - w / 2 - 2);
      } else {
        const [top, cols] = rowsV[l], gap = l === 1 || l === 2 ? .072 : .065;
        x = W * ((i % cols) + .5) / cols; y = H * (top + Math.floor(i / cols) * gap);
        x = Math.min(Math.max(x, w / 2 + 2), W - w / 2 - 2);
      }
      const g = el('g', { class: `node l${l}`, transform: `translate(${x},${y})` });
      g.append(el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2 }));
      const tx = el('text', { 'text-anchor': 'middle', y: 4 });
      tx.textContent = name;
      g.append(tx);
      gN.append(g);
      nodes[name] = { g, x, y, w, h, l };
    }));
    EDGES.forEach(([a, b]) => {
      const A = nodes[a], B = nodes[b];
      let pts;
      if (!vertical) {
        const x1 = A.x + A.w / 2, x2 = B.x - B.w / 2, dx = (x2 - x1) * .5;
        pts = [x1, A.y, x1 + dx, A.y, x2 - dx, B.y, x2, B.y];
      } else {
        const y1 = A.y + A.h / 2, y2 = B.y - B.h / 2, dy = (y2 - y1) * .5;
        pts = [A.x, y1, A.x, y1 + dy, B.x, y2 - dy, B.x, y2];
      }
      const p = el('path', { class: 'edge', d: `M${pts[0]},${pts[1]} C${pts[2]},${pts[3]} ${pts[4]},${pts[5]} ${pts[6]},${pts[7]}` });
      gE.append(p);
      edges[a + '|' + b] = { p, pts };
    });
    const MA = window.MA = window.MA || {};
    const sr = svg.getBoundingClientRect(), br = box.getBoundingClientRect(), ox = sr.left - br.left, oy = sr.top - br.top;
    MA.netNodes = Object.entries(nodes).map(([name, n]) => ({ name, l: n.l, x: n.x + ox, y: n.y + oy }));
    pulses = Array.from({ length: reduced ? 0 : 22 }, () => spawn(Math.random()));
  };

  const pick = a => a[Math.floor(Math.random() * a.length)];
  const spawn = (u = 0) => {
    let cur = Math.random() < .55 ? 'Python' : pick(L[0]);
    const path = [];
    while (out[cur] && out[cur].length) { const nx = pick(out[cur]); path.push(cur + '|' + nx); cur = nx; }
    const c = el('circle', { class: 'pulse', r: 3 });
    gP.append(c);
    return { c, path, seg: 0, u, v: .5 + Math.random() * .4, end: cur };
  };
  const bez = ([x0, y0, x1, y1, x2, y2, x3, y3], t) => {
    const m = 1 - t;
    return [m * m * m * x0 + 3 * m * m * t * x1 + 3 * m * t * t * x2 + t * t * t * x3, m * m * m * y0 + 3 * m * m * t * y1 + 3 * m * t * t * y2 + t * t * t * y3];
  };

  let prev = performance.now();
  const loop = now => {
    const dt = Math.min(.05, (now - prev) / 1000);
    prev = now;
    if (visible && !document.hidden && !box.classList.contains('gravity')) {
      pulses.forEach((p, i) => {
        p.u += p.v * dt;
        if (p.u >= 1) { p.u -= 1; p.seg++; }
        if (p.seg >= p.path.length) {
          const n = nodes[p.end];
          if (n) { n.g.classList.add('flash'); setTimeout(() => n.g.classList.remove('flash'), 380); }
          p.c.remove();
          pulses[i] = spawn();
          return;
        }
        const e = edges[p.path[p.seg]];
        if (!e) return;
        const [x, y] = bez(e.pts, p.u);
        p.c.setAttribute('cx', x.toFixed(1));
        p.c.setAttribute('cy', y.toFixed(1));
      });
    }
    requestAnimationFrame(loop);
  };

  const walk = (start, map) => { const seen = new Set(), st = [start]; while (st.length) { const n = st.pop(); (map[n] || []).forEach(m => { if (!seen.has(m)) { seen.add(m); st.push(m); } }); } return seen; };
  const lit = name => {
    const down = walk(name, out), up = walk(name, inn), on = new Set([name, ...down, ...up]);
    box.classList.add('is-dim');
    Object.entries(nodes).forEach(([k, n]) => n.g.classList.toggle('on', on.has(k)));
    Object.entries(edges).forEach(([k, e]) => {
      const [a, b] = k.split('|');
      const onPath = (a === name || up.has(a)) && (b === name || up.has(b)) || (a === name || down.has(a)) && (b === name || down.has(b));
      e.p.classList.toggle('on', onPath);
    });
  };
  const unlit = () => { box.classList.remove('is-dim'); svg.querySelectorAll('.on').forEach(e => e.classList.remove('on')); };
  const nameOf = t => { const g = t.closest && t.closest('.node'); return g ? g.querySelector('text').textContent : null; };
  svg.addEventListener('mouseover', e => { const n = nameOf(e.target); if (n) lit(n); });
  svg.addEventListener('mouseleave', unlit);
  svg.addEventListener('click', e => { const n = nameOf(e.target); n ? lit(n) : unlit(); });

  const init = () => {
    layout();
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; })).observe(box);
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
    if (document.fonts) document.fonts.ready.then(layout);
    requestAnimationFrame(loop);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
