/**
 * Hero scroll — while the hero stage is pinned, scrolling sends the name's
 * letters flying toward you in 3D, warps keywords past the camera, then
 * sharpens a statement word by word before the page continues. On narrow
 * screens the stage isn't pinned, so only the name effect runs.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const hero = $('top'), pin = $('heroPin');
  if (!hero || !pin) return;
  const MA = window.MA = window.MA || {};
  const name = $('heroName'), warp = $('warp'), statement = $('statement');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const fades = [...pin.querySelectorAll('.hero-k, .hero-role, .hero-lead, .hero-actions, .hero-social, .hero-foot')];

  /* once the entrance has played, scroll owns these elements (no CSS transitions in the way) */
  (MA.booted || Promise.resolve()).then(() => setTimeout(() => pin.querySelectorAll('[data-in]').forEach(el => el.removeAttribute('data-in')), 2600));

  /* ── statement words ── */
  const words = statement ? [...statement.childNodes].flatMap(n => (n.textContent.trim() ? n.textContent.trim().split(/\s+/) : []).map(w => {
    const s = document.createElement('span');
    s.className = n.nodeType === 1 ? 'w em' : 'w';
    s.textContent = w;
    return s;
  })) : [];
  if (statement) {
    statement.textContent = '';
    words.forEach((w, i) => { statement.append(w); if (i < words.length - 1) statement.append(' '); });
  }

  /* ── keywords that rush past the camera ── */
  const WARP = ['RAG', 'Agents', 'PyTorch', 'LangGraph', 'Vision', 'MCP', 'Embeddings', 'YOLOv8', 'Whisper', 'ChromaDB', 'FastAPI', 'Llama 3',
    'Transformers', 'Evals', 'ONNX', 'Sentence-BERT', 'Attention', 'Retrieval', 'Docker', 'Kaggle top 1%', 'Fine-tuning', 'Vector search'];
  const COLS = ['var(--text)', 'var(--k4)', 'var(--text-2)', 'var(--k3)'];
  const flyers = reduced || !warp ? [] : WARP.map((w, i) => {
    const el = document.createElement('span');
    el.textContent = w;
    if (i % 3 === 2) el.className = 'm';
    el.style.setProperty('--fs', (30 + (i * 7) % 26) + 'px');
    el.style.setProperty('--c', COLS[i % COLS.length]);
    warp.append(el);
    return { el, a: i * 2.39996 + .4, r: .34 + (i % 5) * .085, d: (i * 7 % WARP.length) / WARP.length };
  });

  /* ── letters of the name (split by garden.js) ── */
  let letters = [], ncx = 0, ncy = 0;
  const measure = () => {
    isPinned = getComputedStyle(pin).position === 'sticky'; // read once per layout, not every frame
    letters = [...name.querySelectorAll('.ch')].map(el => ({ el }));
    /* layout offsets ignore transforms, so this works mid-animation too */
    const at = el => { let x = 0, y = 0; for (let n = el; n && n !== name; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y]; };
    const cs = letters.map(l => { const [x, y] = at(l.el); return [x + l.el.offsetWidth / 2, y + l.el.offsetHeight / 2]; });
    ncx = cs.reduce((a, c) => a + c[0], 0) / Math.max(1, cs.length);
    ncy = cs.reduce((a, c) => a + c[1], 0) / Math.max(1, cs.length);
    letters.forEach((l, i) => { l.ox = cs[i][0] - ncx; l.oy = cs[i][1] - ncy; });
    lastP = -1;
  };

  let lastP = -1, isPinned = true, flat = false;
  let heroNear = true; // no layout reads at all once the hero is off screen
  new IntersectionObserver(es => { heroNear = es[0].isIntersecting; }, { rootMargin: '100px 0px' }).observe(hero);
  const frame = () => {
    requestAnimationFrame(frame);
    if (!heroNear) return;
    const r = hero.getBoundingClientRect();
    const pinned = isPinned;
    const p = clamp(-r.top / Math.max(1, hero.offsetHeight - innerHeight));
    MA.heroP = pinned ? p : clamp(-r.top / Math.max(1, hero.offsetHeight)) * .5;
    if (Math.abs(p - lastP) < .0003 || r.bottom < 0) return;
    lastP = p;
    if (!pinned) { // phones: the hero scrolls normally and its text stays put; clear any leftover styles once
      if (!flat) {
        flat = true;
        letters.forEach(l => { if (l.set) { l.el.style.transform = l.el.style.filter = l.el.style.opacity = ''; l.set = false; } });
        fades.forEach(el => { el.style.opacity = el.style.transform = el.style.visibility = ''; });
        name.querySelectorAll('.garden').forEach(g => { g.style.opacity = ''; });
      }
      return;
    }
    flat = false;
    const q = p;

    /* name flies apart */
    const W = innerWidth;
    letters.forEach((l, i) => {
      const s = reduced ? 0 : smooth(i * .008, .2 + i * .008, q);
      if (s <= 0) { if (l.set) { l.el.style.transform = ''; l.el.style.filter = ''; l.el.style.opacity = ''; l.set = false; } return; }
      l.set = true;
      l.el.style.transform = `translate3d(${(l.ox * s * .9).toFixed(1)}px,${(l.oy * s * .6 - s * 50).toFixed(1)}px,${(s * 520).toFixed(1)}px) rotateX(${(-s * 40).toFixed(1)}deg) rotateY(${(l.ox / W * s * 90).toFixed(1)}deg)`;
      l.el.style.filter = `blur(${(s * 8).toFixed(1)}px)`;
      l.el.style.opacity = (1 - s * s).toFixed(3);
    });
    const out = smooth(0, .12, q);
    name.querySelectorAll('.garden').forEach(g => { g.style.opacity = (1 - smooth(0, .07, q)).toFixed(3); });
    fades.forEach(el => { el.style.opacity = (1 - out).toFixed(3); el.style.transform = out ? `translate3d(0,${(-out * 24).toFixed(1)}px,0)` : ''; el.style.visibility = out > .99 ? 'hidden' : ''; });
    if (!pinned) return;

    /* warp, then the statement */
    const wp = (p - .1) / .45;
    if (warp) warp.style.visibility = wp > 0 && wp < 1.05 ? 'visible' : 'hidden';
    if (wp > 0 && wp < 1.05) {
      const R = Math.min(innerWidth, innerHeight);
      flyers.forEach(f => {
        const z = clamp(wp * 1.7 - f.d * .7) * 3000 - 2400;
        f.el.style.opacity = (smooth(-2400, -1900, z) * (1 - smooth(150, 520, z))).toFixed(3);
        f.el.style.filter = z > 0 ? `blur(${(z / 70).toFixed(1)}px)` : '';
        f.el.style.transform = `translate(-50%,-50%) translate3d(${(Math.cos(f.a) * f.r * R * 1.25).toFixed(1)}px,${(Math.sin(f.a) * f.r * R).toFixed(1)}px,${z.toFixed(0)}px)`;
      });
    }
    pin.style.setProperty('--glow', (smooth(.35, .6, p) * (1 - smooth(.9, 1, p))).toFixed(3));
    if (!statement) return;
    const show = smooth(.42, .5, p) * (1 - smooth(.9, .98, p));
    statement.style.opacity = show.toFixed(3);
    statement.style.visibility = show < .01 ? 'hidden' : 'visible';
    statement.style.transform = `translate(-50%,-50%) scale(${(.96 + smooth(.42, .9, p) * .06).toFixed(4)})`;
    words.forEach((w, j) => {
      const a = .46 + j * (.34 / words.length), k = reduced ? 1 : smooth(a, a + .07, p);
      w.style.opacity = (.12 + k * .88).toFixed(3);
      w.style.filter = k < .99 ? `blur(${((1 - k) * 10).toFixed(1)}px)` : '';
      w.style.transform = `translate3d(0,${((1 - k) * 14).toFixed(1)}px,0)`;
    });
  };

  const init = () => {
    measure();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 150); });
    requestAnimationFrame(frame);
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(init, 50));
})();
