/**
 * Recruiter mode — the whole site as one calm, printable page. Pick a track
 * (general, ML, backend, research) and the summary, project order and skills
 * re-sort for that role; "Save as PDF" prints exactly that page, so each track
 * doubles as a tailored résumé. Open it from the nav, ⌘K, or a link to #recruiter.
 * Every line here comes from the résumé — nothing is added for effect.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const EMAIL = 'manavaghera@yahoo.com';
  /* from the résumé of 27 Oct 2026; two lines per project so each track still prints on one page */
  const P = {
    health: ['Student Health Risk Engine', 'gradient-boosting ensemble · Kaggle top 1%', 'Python · LightGBM · XGBoost · CatBoost · Optuna', [
      'Built a three-model gradient-boosting ensemble for multi-class classification on 690K rows with a heavily imbalanced target (86% majority class).',
      'Reached 0.952 balanced accuracy in 5-fold cross-validation (0.950 on the public leaderboard), up from a 0.876 baseline, using per-fold target encoding, stacking, threshold optimisation and pseudo-labelling.']],
    news: ['NewsSense', 'AI news platform', 'FastAPI · React 19 · TypeScript · PostgreSQL · Docker', [
      'Full-stack news platform: a FastAPI REST API and an hourly pipeline that ingests RSS and official sources, deduplicates them, checks LLM-generated claims against evidence and publishes atomically.',
      'Failure safeguards (editorial hold, signed storage manifests, a database lease against duplicate runs); deployed on free-tier infrastructure with GitHub Actions, 211 backend tests and Playwright end-to-end tests.']],
    agents: ['AutonomousContent', 'multi-agent blog system', 'LangGraph · Python · OpenRouter', [
      'LangGraph pipeline of research, writer and validator agents; the validator runs a 4-stage quality check and sends weak drafts back for revision.',
      'Published posts scored 82–89/100 on automated validation; self-healing with exponential backoff, model fallback and a live pipeline dashboard, on free-tier LLM APIs at zero cost.']],
    clip: ['Clip Studio', 'Twitch analytics & short-form video tool', 'Python · Streamlit · Whisper · Ollama · ffmpeg', [
      'Streamlit app that ranks Twitch clips by views-per-hour and generates vertical Shorts with burned-in captions.',
      'faster-whisper transcription and an optional local LLM (Ollama) to rate highlight moments; GPU-accelerated encoding with CPU fallback, a daily automation pipeline and 127 automated tests.']],
    chronus: ['CHRONUS', 'memory-grounded AI research platform · in progress', 'Sentence-BERT · ChromaDB · homomorphic encryption', [
      'Designing a privacy-preserving evolution of a local RAG pipeline (Sentence-BERT and ChromaDB) toward encrypted vector similarity search with additively homomorphic encryption.',
      'Designed offline research sandboxes for benchmarking quantum NLP and spiking neural network approaches as possible future retrieval architectures.']]
  };
  const S = {
    ml: ['ML & deep learning', 'Python, PyTorch, TensorFlow, scikit-learn, LightGBM, XGBoost, CatBoost, Optuna, feature engineering, model evaluation, cross-validation, computer vision (YOLOv8)'],
    llm: ['NLP, LLMs & GenAI', 'NLP, large language models, retrieval-augmented generation (RAG), LangGraph, LangChain, prompt engineering, agentic systems, Hugging Face, ChromaDB, Ollama'],
    web: ['Software engineering', 'FastAPI, REST APIs, React, TypeScript, Docker, GitHub Actions, PostgreSQL, SQL, Git, pytest, model deployment'],
    ops: ['Data', 'Pandas, NumPy, MLflow, data preprocessing']
  };
  const TRACKS = {
    all: ['General', 'AI/ML engineer', 'AI/ML engineering student (B.Tech CSE, expected May 2027) seeking machine learning engineer and AI engineer internship or trainee roles. Builds end-to-end machine learning and LLM systems: ensemble learning, multi-agent LLM pipelines, retrieval-augmented generation (RAG) and deployed full-stack applications. Top 1% in two Kaggle competitions; Anthropic Academy-certified in MCP and RAG.', ['health', 'news', 'agents', 'clip'], ['ml', 'llm', 'web', 'ops']],
    ml: ['ML engineer', 'Machine learning engineer', 'Machine learning engineering student who builds and validates models end to end: feature engineering, gradient-boosting ensembles and cross-validation discipline, taking a 0.876 baseline to 0.952 balanced accuracy. Top 1% in two Kaggle competitions; seeking ML engineer internship or trainee roles.', ['health', 'clip', 'agents', 'chronus'], ['ml', 'ops', 'llm', 'web']],
    backend: ['Backend', 'AI engineer · backend', 'Engineering student who ships AI as tested software: FastAPI, PostgreSQL, Docker and GitHub Actions, with 211 backend tests on NewsSense and 127 on Clip Studio, and LLM pipelines that check their own output and recover from failures. Seeking AI engineer internship or trainee roles.', ['news', 'clip', 'agents', 'health'], ['web', 'ops', 'llm', 'ml']],
    research: ['Research', 'AI research engineer', 'Research-minded engineering student working on memory-grounded AI: a local RAG pipeline today, moving toward encrypted vector search with homomorphic encryption, with sandboxes for quantum NLP and spiking-network retrieval. Top 1% in two Kaggle competitions; Anthropic-certified in MCP and RAG.', ['chronus', 'health', 'agents', 'news'], ['llm', 'ml', 'ops', 'web']]
  };
  const XP = [
    ['Brainy Beam Technologies', 'Data Science & ML Intern · Ahmedabad', 'Jul – Aug 2023', ['Built an end-to-end ML pipeline on a 40,000+ record banking dataset; the best of logistic regression, decision tree and random forest models reached 92% accuracy (evaluated with F1 and AUC-ROC).', 'Cut data preprocessing time by ~30% with automated cleaning scripts; findings informed campaign targeting.']],
    ['Riot Games', 'Beta Tester · Remote', 'Mar 2024 – Mar 2025', ['Play-tested 50+ pre-release builds and wrote reproducible bug reports used for pre-launch fixes.']]
  ];
  const EDU = [['B.Tech, Computer Science Engineering — Parul University, Vadodara', 'expected May 2027'], ['Diploma, Computer Engineering — NG Patel Polytechnic, Bardoli · CGPA 8.4', 'Apr 2025']];
  const WINS = ['Top 1% — Kaggle "Playground Series S6E7" (3,355 teams) and "Autonomous Agent Prediction (Beta)" (570 teams)', 'DeepLearning.AI — Machine Learning Specialization (with Stanford Online)', 'DeepLearning.AI — TensorFlow Developer Professional Certificate', 'Anthropic Academy — Model Context Protocol (MCP) & RAG certification', 'Microsoft Learn — RAG Fundamentals; Introduction to Generative AI and Agents; Introduction to NLP Concepts', 'JPMorgan Chase & Co. — Software Engineering Virtual Experience (Forage)', 'Google Developer Student Clubs member; open-source contributions', 'Completed courses: Stanford CS230 (Deep Learning); DeepLearning.AI, Reinforcement Fine-Tuning of LLMs with GRPO'];
  const PROOF = [['Top 1%', 'in two Kaggle competitions'], ['0.952', 'balanced accuracy, up from 0.876'], ['211', 'backend tests on NewsSense']];

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const link = (href, text) => { const a = el('a', null, text); a.href = href; if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; } return a; };
  const li = (href => (href ? href.getAttribute('href') : 'https://www.linkedin.com/in/manavaghera'))(document.querySelector('.foot-links a[href*="linkedin"]'));

  /* ── the overlay ── */
  const box = el('div', 'rec');
  box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Recruiter mode — one-page summary');
  const bar = el('div', 'rec-bar');
  const picks = el('div', 'rec-tracks mono');
  picks.setAttribute('role', 'radiogroup'); picks.setAttribute('aria-label', 'Tailor for a role');
  Object.entries(TRACKS).forEach(([k, t]) => {
    const b = el('button', null, t[0]);
    b.type = 'button'; b.dataset.track = k; b.setAttribute('role', 'radio');
    picks.append(b);
  });
  const acts = el('div', 'rec-acts');
  const printBtn = el('button', 'btn btn-primary', 'Save as PDF');
  printBtn.type = 'button';
  const pdf = link('Manav_Aghera_Resume.pdf', 'Full résumé ↓'); pdf.className = 'btn btn-ghost'; pdf.download = 'Manav_Aghera_Resume.pdf';
  const share = el('button', 'btn btn-ghost', 'Copy link');
  share.type = 'button';
  const x = el('button', 'rec-x', '×');
  x.type = 'button'; x.setAttribute('aria-label', 'Close recruiter mode');
  acts.append(printBtn, pdf, share, x);
  bar.append(el('p', 'rec-k mono', 'Recruiter mode · tailor it:'), picks, acts);
  const paper = el('article', 'rec-paper');
  const scroller = el('div', 'rec-scroll');
  scroller.setAttribute('data-lenis-prevent', '');
  scroller.append(paper);
  box.append(bar, scroller);
  document.body.append(box);

  let track = 'all', opener = null;
  const render = () => {
    const [, role, summary, projects, skills] = TRACKS[track];
    picks.querySelectorAll('button').forEach(b => { const on = b.dataset.track === track; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    paper.textContent = '';
    const head = el('header', 'rec-head');
    head.append(el('h1', null, 'Manav Aghera'), el('p', 'rec-role', role + ' · seeking internship or trainee roles · B.Tech, May 2027'));
    const contact = el('p', 'rec-contact mono');
    contact.append('Vadodara, India · ', link('mailto:' + EMAIL, EMAIL), ' · ', link('https://github.com/manavaghera', 'github.com/manavaghera'), ' · ', link(li, 'LinkedIn'), ' · ', link(location.origin, location.host));
    head.append(contact);
    const proof = el('ul', 'rec-proof');
    PROOF.forEach(([n, t]) => { const p = el('li'); p.append(el('b', null, n), el('span', null, t)); proof.append(p); });
    const sec = (title, ...kids) => { const s = el('section', 'rec-sec'); s.append(el('h2', 'mono', title), ...kids); return s; };
    const entry = (name, sub, when, bullets) => {
      const d = el('div', 'rec-entry'), h = el('p', 'rec-entry-h');
      h.append(el('b', null, name), el('span', null, sub));
      if (when) h.append(el('time', 'mono', when));
      const ul = el('ul');
      bullets.forEach(t => ul.append(el('li', null, t)));
      d.append(h, ul);
      return d;
    };
    const skillList = el('dl', 'rec-skills');
    skills.forEach(k => { skillList.append(el('dt', 'mono', S[k][0]), el('dd', null, S[k][1])); });
    const edu = el('ul', 'rec-edu');
    EDU.forEach(([t, w]) => { const e = el('li'); e.append(el('span', null, t), el('time', 'mono', w)); edu.append(e); });
    const wins = el('ul', 'rec-wins');
    WINS.forEach(t => wins.append(el('li', null, t)));
    paper.append(head, el('p', 'rec-sum', summary), proof,
      sec('Selected projects', ...projects.map(k => entry(P[k][0], '— ' + P[k][1], '', P[k][3]))),
      sec('Experience', ...XP.map(e => entry(e[0], '— ' + e[1], e[2], e[3]))),
      sec('Skills', skillList),
      sec('Certifications & recognition', wins),
      sec('Education', edu));
  };
  const setTrack = k => {
    if (!TRACKS[k]) return;
    track = k; render();
    history.replaceState(null, '', '#recruiter' + (k === 'all' ? '' : '/' + k));
  };
  const open = (k = 'all') => {
    opener = document.activeElement;
    track = TRACKS[k] ? k : 'all';
    render();
    box.hidden = false;
    document.documentElement.classList.add('rec-on');
    if (MA.lenis) MA.lenis.stop();
    requestAnimationFrame(() => box.classList.add('on'));
    history.replaceState(null, '', '#recruiter' + (track === 'all' ? '' : '/' + track));
    setTimeout(() => (picks.querySelector('[aria-checked="true"]') || x).focus({ preventScroll: true }), 60);
    if (MA.track) MA.track('play', 'recruiter');
  };
  const close = () => {
    box.classList.remove('on');
    document.documentElement.classList.remove('rec-on');
    if (MA.lenis) MA.lenis.start();
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => { box.hidden = true; }, 250);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  };
  MA.recruiter = open;

  picks.addEventListener('click', e => { const b = e.target.closest('[data-track]'); if (b) setTrack(b.dataset.track); });
  picks.addEventListener('keydown', e => {
    if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key)) return;
    e.preventDefault();
    const keys = Object.keys(TRACKS), i = keys.indexOf(track), n = keys[(i + (/Right|Down/.test(e.key) ? 1 : keys.length - 1)) % keys.length];
    setTrack(n);
    picks.querySelector(`[data-track="${n}"]`).focus();
  });
  printBtn.addEventListener('click', () => {
    const t = document.title;
    document.title = `Manav Aghera — ${TRACKS[track][1]} résumé`;
    window.print();
    setTimeout(() => { document.title = t; }, 500);
  });
  share.addEventListener('click', async () => {
    const url = location.origin + location.pathname + '#recruiter' + (track === 'all' ? '' : '/' + track);
    try { await navigator.clipboard.writeText(url); share.textContent = 'Link copied ✓'; } catch (e) { share.textContent = url; }
    setTimeout(() => { share.textContent = 'Copy link'; }, 2200);
  });
  x.addEventListener('click', close);
  addEventListener('keydown', e => {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll('a[href], button:not([tabindex="-1"])')].filter(n => n.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  /* ── ways in: a nav button, the mobile menu, and #recruiter links ── */
  const navBtn = el('button', 'nav-rec mono', 'Recruiter mode');
  navBtn.type = 'button';
  navBtn.title = 'The whole site on one printable page';
  navBtn.addEventListener('click', () => open());
  const cta = document.querySelector('.nav-cta');
  if (cta) cta.before(navBtn);
  const menuNav = document.querySelector('#menu nav');
  if (menuNav) {
    const m = el('a', null, 'Recruiter mode');
    m.href = '#recruiter';
    menuNav.append(m);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#recruiter"]');
    if (!a || box.contains(a)) return;
    e.preventDefault();
    e.stopPropagation();
    const mb = document.getElementById('menuBtn');
    if (mb && mb.getAttribute('aria-expanded') === 'true') mb.click();
    open(a.getAttribute('href').split('/')[1]);
  }, true);
  const fromHash = () => { const m = /^#recruiter(?:\/(\w+))?$/.exec(location.hash); if (m && box.hidden) open(m[1]); };
  addEventListener('hashchange', fromHash);
  (MA.booted || Promise.resolve()).then(fromHash);
})();
