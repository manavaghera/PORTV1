/**
 * Lab · generative AI — next-token sampling, the way an LLM does it, on a tiny
 * trigram model trained (in your browser) on sentences about my work. Every
 * step shows the candidate tokens: scores become logits, temperature reshapes
 * them, top-p cuts the tail, and one token is drawn. Smaller brain, same maths.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const panel = $('lab-gen'), out = $('genText'), dist = $('genDist');
  if (!panel || !out || !dist) return;
  const tIn = $('genT'), pIn = $('genP'), tOut = $('genTv'), pOut = $('genPv'), entEl = $('genH');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CORPUS = `Manav builds AI that holds up in the real world.
Manav builds retrieval systems that stay grounded and cite their sources.
Manav builds agents that recover on their own when a tool fails.
Manav builds vision models small enough to run offline on a phone.
Manav ships with LangGraph, PyTorch, FastAPI and a lot of evaluation.
Manav ranked in the top one percent on Kaggle, twice.
Manav is open to roles in applied AI, retrieval and agents.
The agent plans, calls a tool, checks the result and tries again.
The agent writes, the critic scores and the agent rewrites until the score holds.
The agent never guesses when the retrieval comes back empty.
The agent asks for help when the plan stops making sense.
Retrieval should find the right chunk before the model says a word.
Retrieval should cite the source or say it does not know.
Retrieval should be measured, not assumed.
A small model on the edge beats a large model that never ships.
A small model can read a leaf and name the disease without a network.
A small model needs good data more than it needs more layers.
CHRONUS is a memory for agents that is local, deterministic and encrypted.
CHRONUS is the research Manav is building now.
CHRONUS is how an agent remembers what it learned last week.
On the edge, every megabyte and every millisecond counts.
On the edge, the model has to work when the network does not.
Good AI is boring in production and surprising in the demo.
Good AI says what it knows and shows where it learned it.
Good AI needs a source for every answer and a fallback for every agent.
The model reads the documents, the agent decides and the user gets an answer with sources.
The vision model finds the leaf, the classifier names the disease and the farmer gets advice in Gujarati.
Fasal AI runs a detector on low end phones in the field.
DermaLense runs in the browser and never uploads a photo.
AutonomousContent is a team of agents that research, write and grade their own work.`;
  const PROMPTS = ['Manav builds', 'The agent', 'Retrieval should', 'A small model', 'CHRONUS is', 'On the edge ,', 'Good AI'];

  /* ── a word-level trigram model with stupid backoff ── */
  const toks = CORPUS.replace(/([.,])/g, ' $1').split(/\s+/).filter(Boolean);
  const tri = new Map(), bi = new Map(), uni = new Map();
  const bump = (m, k, w) => { let e = m.get(k); if (!e) m.set(k, e = new Map()); e.set(w, (e.get(w) || 0) + 1); };
  toks.forEach((w, i) => {
    uni.set(w, (uni.get(w) || 0) + 1);
    if (i > 0) bump(bi, toks[i - 1], w);
    if (i > 1) bump(tri, toks[i - 2] + ' ' + toks[i - 1], w);
  });
  const N = toks.length, UNI = [...uni].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const scores = ctx => {
    const a = ctx[ctx.length - 2], b = ctx[ctx.length - 1], s = new Map();
    const add = (m, k) => { const e = m && m.get(k); if (!e) return 0; let t = 0; e.forEach(c => { t += c; }); return [e, t]; };
    const t3 = add(tri, a + ' ' + b), t2 = add(bi, b);
    if (t3) t3[0].forEach((c, w) => s.set(w, c / t3[1]));
    if (t2) t2[0].forEach((c, w) => { if (!s.has(w)) s.set(w, .4 * c / t2[1]); });
    UNI.forEach(([w, c]) => { if (!s.has(w)) s.set(w, .16 * c / N); });
    return s;
  };
  /* logits → softmax(z / T) → keep the smallest set with mass ≥ top-p */
  const distribution = ctx => {
    const T = +tIn.value, P = +pIn.value;
    const list = [...scores(ctx)].map(([w, s]) => ({ w, z: Math.log(s) }));
    const m = Math.max(...list.map(x => x.z / T));
    let sum = 0;
    list.forEach(x => { x.p = Math.exp(x.z / T - m); sum += x.p; });
    list.forEach(x => { x.p /= sum; });
    list.sort((a, b) => b.p - a.p);
    let cum = 0;
    list.forEach(x => { x.keep = cum < P; cum += x.p; });
    const H = -list.reduce((h, x) => h + (x.p > 0 ? x.p * Math.log2(x.p) : 0), 0);
    return { list, H };
  };
  const sample = list => {
    const kept = list.filter(x => x.keep), tot = kept.reduce((a, x) => a + x.p, 0);
    let r = Math.random() * tot;
    for (const x of kept) { r -= x.p; if (r <= 0) return x; }
    return kept[kept.length - 1];
  };

  /* ── view ── */
  let ctx = [], pi = 0, auto = null, chosen = null;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const renderText = () => {
    out.textContent = '';
    ctx.forEach((w, i) => {
      if (i && !/^[.,]$/.test(w)) out.append(' ');
      out.append(el('span', i >= ctx.promptLen ? (i === ctx.length - 1 && chosen ? 'tk new' : 'tk gen') : 'tk', w));
    });
    out.append(el('i', 'gen-caret'));
  };
  const renderDist = () => {
    const { list, H } = distribution(ctx);
    dist.textContent = '';
    list.slice(0, 8).forEach(x => {
      const row = el('div', 'gd' + (x.keep ? '' : ' cut') + (chosen && chosen.w === x.w ? ' pick' : ''));
      const bar = el('i');
      bar.style.setProperty('--p', Math.max(.01, x.p).toFixed(3));
      row.append(el('span', 'gd-w', x.w === '.' ? '·  (end)' : x.w), bar, el('b', null, (x.p * 100).toFixed(x.p < .1 ? 1 : 0) + '%'));
      dist.append(row);
    });
    if (entEl) entEl.textContent = H.toFixed(2);
    return list;
  };
  const next = () => {
    const list = distribution(ctx).list, x = sample(list);
    chosen = x;
    ctx.push(x.w);
    renderText(); renderDist();
    if (x.w === '.' && ctx.length - ctx.promptLen > 3 && window.MA && MA.achieve) MA.achieve('sampler');
    return x.w;
  };
  const stop = () => { clearInterval(auto); auto = null; const b = panel.querySelector('[data-gen="auto"]'); if (b) b.textContent = '▶ generate'; };
  const start = () => {
    stop();
    const b = panel.querySelector('[data-gen="auto"]');
    if (b) b.textContent = '❚❚ stop';
    auto = setInterval(() => { const w = next(); if (w === '.' || ctx.length - ctx.promptLen > 28) stop(); }, reduced ? 120 : 420);
  };
  const prompt = i => {
    stop();
    ctx = PROMPTS[i % PROMPTS.length].split(' ');
    ctx.promptLen = ctx.length;
    chosen = null;
    renderText(); renderDist();
  };
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-gen]');
    if (!b) return;
    const a = b.dataset.gen;
    if (a === 'step') { stop(); if (ctx[ctx.length - 1] === '.') prompt(++pi); else next(); }
    if (a === 'auto') { if (auto) stop(); else { if (ctx[ctx.length - 1] === '.') prompt(++pi); start(); } }
    if (a === 'new') prompt(++pi);
  });
  const sync = () => { tOut.textContent = (+tIn.value).toFixed(2); pOut.textContent = (+pIn.value).toFixed(2); chosen = null; renderDist(); };
  tIn.addEventListener('input', sync); pIn.addEventListener('input', sync);
  prompt(0); sync();
})();
