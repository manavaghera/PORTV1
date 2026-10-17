/**
 * Token burn — a lifetime estimate of tokens burned that keeps climbing in
 * bursts of a few thousand, plus the page as a context window: text you
 * actually read is tokenized and feeds a furnace where words rise and burn
 * out. Visitors can type their own prompt and watch it tokenize.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const MA = window.MA = window.MA || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const numEl = $('burnNum'), dockTok = $('dockTok'), heroTok = $('heroTok'), flame = $('dockFlame');
  const PRICE = 3 / 1e6;

  /* ── an approximate, cl100k-flavoured tokenizer ── */
  const RX = /'(?:s|t|re|ve|m|ll|d)| ?\p{L}+| ?\p{N}{1,3}| ?[^\s\p{L}\p{N}]+|\s+/gu;
  const tokenize = s => {
    const out = [];
    for (const m of String(s).slice(0, 20000).match(RX) || []) {
      const core = m.trim();
      if (core.length > 9 && /^\p{L}+$/u.test(core)) {
        const lead = m.startsWith(' ') ? ' ' : '';
        for (let i = 0; i < core.length; i += 5) out.push((i ? '' : lead) + core.slice(i, i + 5));
      } else out.push(m);
    }
    return out;
  };
  MA.tokenize = tokenize;

  /* ── reading tracker ── */
  let total = 0, shown = 0;
  const pool = [];
  const add = (n, words) => {
    total += n;
    if (words) words.forEach(w => { pool.push(w); if (pool.length > 400) pool.shift(); });
    if (flame) { flame.classList.add('hot'); clearTimeout(add.t); add.t = setTimeout(() => flame.classList.remove('hot'), 900); }
  };
  const blocks = [...document.querySelectorAll('main h1, main h2, main h3, main p, main li, main dt, main dd, footer h2')]
    .filter(e => !e.closest('[aria-hidden="true"], .menu, .cmdk, .feed') && !e.querySelector('p, li, h3') && e.textContent.trim());
  const done = new WeakSet(), timers = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => {
    const el = e.target;
    const enough = e.intersectionRatio >= .6 || e.intersectionRect.height > innerHeight * .4;
    if (e.isIntersecting && enough && !done.has(el)) {
      if (!timers.has(el)) timers.set(el, setTimeout(() => {
        timers.delete(el);
        if (el.getBoundingClientRect().height < 4) return;
        done.add(el); io.unobserve(el);
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        add(tokenize(text).length, text.split(' ').filter(w => w.length > 2).slice(0, 24));
      }, 700));
    } else if (timers.has(el)) { clearTimeout(timers.get(el)); timers.delete(el); }
  }), { threshold: [0, .6, 1] });
  blocks.forEach(b => io.observe(b));
  /* rendered content (GitHub log, project panes) is counted once it appears */
  const late = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 1 && n.matches('li, p') && n.textContent.trim() && !n.closest('[aria-hidden="true"], .cmdk, .feed')) io.observe(n);
  })));
  ['gitLog', 'repoList'].forEach(id => { const n = $(id); if (n) late.observe(n, { childList: true }); });

  /* ── meters ── */
  const fmt = n => Math.round(n).toLocaleString('en-US');
  setInterval(() => {
    shown += (total - shown) * (reduced ? 1 : .35);
    if (total - shown < .5) shown = total;
    if (numEl) numEl.textContent = fmt(shown);
  }, 120);

  /* ── lifetime counter: an estimate that climbs a few thousand tokens at a time ── */
  const LIFE_BASE = 10240000000, LIFE_T0 = Date.UTC(2026, 9, 14, 18, 30), LIFE_RATE = 650; // tokens/s since 15 Oct 2026 IST
  const lifetime = MA.lifetime = () => LIFE_BASE + Math.max(0, Date.now() - LIFE_T0) / 1000 * LIFE_RATE;
  MA.tokRate = LIFE_RATE;
  const lifeEl = $('lifeNum'), tickEl = $('lifeTick'), novelsEl = $('lifeNovels'), ctxEl = $('lifeCtx');
  let life = lifetime();
  const paint = n => {
    const v = fmt(Math.floor(n));
    if (lifeEl) lifeEl.textContent = v;
    if (dockTok) dockTok.textContent = v;
    if (heroTok) heroTok.textContent = v;
    if (novelsEl) novelsEl.textContent = fmt(n / 130000);
    if (ctxEl) ctxEl.textContent = fmt(n / 200000) + '×';
  };
  const tick = () => {
    const from = life, to = lifetime();
    life = to;
    if (tickEl && to - from >= 1) {
      tickEl.textContent = `+${fmt(to - from)} tokens`;
      tickEl.classList.remove('go'); void tickEl.offsetWidth; tickEl.classList.add('go');
    }
    if (flame) { flame.classList.add('hot'); setTimeout(() => flame.classList.remove('hot'), 900); }
    if (reduced || document.hidden) paint(to);
    else {
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
        paint(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    setTimeout(tick, 2200 + Math.random() * 1800);
  };
  paint(life);
  setTimeout(tick, 1600);

  /* ── furnace ── */
  const cv = $('furnace');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const feedEl = cv.parentElement.querySelector('.feed');
  let W = 1, H = 1, base = 1, K = {}, visible = false, sparks = [], chips = [], spawnT = 0;
  const readK = () => {
    const s = getComputedStyle(cv);
    ['k1', 'k2', 'k3', 'k4', 'k5'].forEach(k => {
      const h = s.getPropertyValue('--' + k).trim().replace('#', ''), n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h, 16);
      K[k] = Number.isNaN(n) ? [255, 255, 255] : [n >> 16 & 255, n >> 8 & 255, n & 255];
    });
  };
  const ramp = t => { // 0 fresh (bright) → 1 ash (deep)
    const st = [K.k5, K.k4, K.k3, K.k2, K.k1], x = Math.min(.999, Math.max(0, t)) * (st.length - 1), i = Math.floor(x), f = x - i;
    return st[i].map((v, j) => Math.round(v + (st[i + 1][j] - v) * f)).join(',');
  };
  const resize = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    base = Math.max(H * .45, (feedEl ? feedEl.offsetTop : H) - 6);
  };
  const IDLE = ['attention', 'gradient', 'tokens', 'retrieval', 'agents', 'embedding', 'context', 'softmax', 'latency', 'vector', 'prompt', 'inference', 'weights', 'loss', 'epoch'];
  const chip = (text, burst) => {
    if (chips.length > 90) chips.shift();
    chips.push({ text: String(text).slice(0, 24), x: W * (.14 + Math.random() * .72), y: base - Math.random() * (burst ? 40 : 14),
      vx: (Math.random() - .5) * 16, vy: -(26 + Math.random() * 40), life: 0, max: 4 + Math.random() * 3, size: 13 + Math.random() * 11, ph: Math.random() * 6.3 });
  };
  const draw = dt => {
    ctx.clearRect(0, 0, W, H);
    spawnT += dt;
    if (spawnT > .22) { spawnT = 0; chip(pool.length ? pool[(Math.random() * pool.length) | 0] : IDLE[(Math.random() * IDLE.length) | 0]); }
    ctx.globalCompositeOperation = 'lighter';
    const now = performance.now() / 1000;
    for (let i = 0; i < 7; i++) { // flame tongues licking up from the base
      const x = W * (.1 + i * .133) + Math.sin(now * 1.3 + i * 2.1) * 14;
      const r = 70 + 34 * Math.sin(now * 3.1 + i * 1.7) + Math.random() * 8;
      ctx.save(); ctx.translate(x, base + 30); ctx.scale(1, 1.9);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      g.addColorStop(0, `rgba(${ramp(.2)},.26)`); g.addColorStop(.45, `rgba(${ramp(.5)},.1)`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
    chips = chips.filter(c => c.life < c.max);
    ctx.textAlign = 'center';
    chips.forEach(c => {
      c.life += dt;
      const t = c.life / c.max;
      c.vx += Math.sin(c.life * 2.2 + c.ph) * 12 * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.vy -= 6 * dt;
      const a = t < .08 ? t / .08 : Math.pow(1 - (t - .08) / .92, 1.3);
      ctx.font = `500 ${(c.size * (1 - t * .45)).toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.fillStyle = `rgba(${ramp(t * .8)},${Math.max(0, a).toFixed(3)})`;
      ctx.fillText(c.text, c.x, c.y);
      if (t > .55 && Math.random() < dt * 9) sparks.push({ x: c.x + (Math.random() - .5) * c.text.length * 6, y: c.y, vx: (Math.random() - .5) * 30, vy: -20 - Math.random() * 40, life: 0, max: .6 + Math.random() * .9 });
    });
    sparks = sparks.filter(s => s.life < s.max).slice(-260);
    sparks.forEach(s => {
      s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy -= 10 * dt;
      const t = s.life / s.max;
      ctx.fillStyle = `rgba(${ramp(.1 + t * .6)},${(1 - t).toFixed(3)})`;
      ctx.fillRect(s.x, s.y, 1.8, 1.8);
    });
    ctx.globalCompositeOperation = 'source-over';
  };
  let prev = performance.now();
  const loop = now => {
    const dt = Math.min(.05, (now - prev) / 1000);
    prev = now;
    if (visible && !document.hidden) draw(dt);
    requestAnimationFrame(loop);
  };
  readK(); resize();
  addEventListener('themechange', readK);
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; })).observe(cv);
  if (!reduced) requestAnimationFrame(loop);

  /* ── feed the furnace ── */
  const form = $('feedForm'), input = $('feedText'), chipsEl = $('feedChips');
  const COLS = ['var(--k5)', 'var(--k4)', 'color-mix(in srgb,var(--k3) 80%,white)', 'color-mix(in srgb,var(--k4) 60%,white)'];
  const preview = () => {
    const toks = tokenize(input.value);
    chipsEl.textContent = '';
    toks.slice(0, 80).forEach((t, i) => {
      const s = document.createElement('span');
      s.textContent = t;
      s.style.setProperty('--c', COLS[i % COLS.length]);
      chipsEl.append(s);
    });
    if (toks.length) {
      const n = document.createElement('em');
      n.textContent = `${toks.length} token${toks.length === 1 ? '' : 's'} · ≈ $${(toks.length * PRICE).toFixed(6)}`;
      chipsEl.append(n);
    }
  };
  input.addEventListener('input', preview);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 240);
    if (!text) { if (MA.toast) MA.toast('Type something to burn first'); input.focus(); return; }
    const toks = tokenize(text);
    add(toks.length);
    toks.filter(t => t.trim()).forEach((t, i) => setTimeout(() => chip(t.trim(), true), i * 70));
    if (/ignore (all )?(previous|prior) instructions/i.test(text) && MA.toast) MA.toast('Prompt injection detected — incinerated anyway.');
    else if (MA.toast) MA.toast(`${toks.length} tokens burned`);
    input.value = '';
    preview();
  });
})();
