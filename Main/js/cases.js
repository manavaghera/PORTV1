/**
 * Case studies — the long version of two projects: the problem, what I built,
 * what it achieved and what comes next. Opens in a dialog from the project list
 * and the research section, or from a link to #case/chronus or #case/fasal.
 * Only facts from the résumé and the project itself; measured numbers go in
 * `numbers` as they come in, and a section without content simply isn't shown.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const CASES = {
    chronus: {
      kicker: 'Case study · research', title: 'CHRONUS', line: 'Giving AI a memory you can trust — and check.',
      tags: ['RAG', 'Sentence-BERT', 'ChromaDB', 'Homomorphic encryption', 'Quantum NLP', 'Neuromorphic'],
      facts: [['100%', 'local — runs on your own machine'], ['Same in, same out', 'deterministic retrieval'], ['4', 'phases on the roadmap']],
      numbers: [], // measured results (e.g. retrieval precision, latency) go here as [value, label]
      problem: [
        'Most AI assistants can\'t show where an answer came from, and the ones that do look things up often give a different answer to the same question twice. That\'s fine for a demo — not for research on memory, where you need to trace every answer back to its source and get the same result every time.',
        'CHRONUS is my research platform for that: memory-grounded AI that is local, repeatable and auditable first, and clever second.'],
      built: [
        ['Embed', 'Documents are turned into Sentence-BERT embeddings — numbers that capture what they mean.'],
        ['Store', 'The embeddings live in ChromaDB, a vector database running on the same machine. Nothing leaves it.'],
        ['Retrieve', 'A question is embedded the same way and matched to the closest passages — deterministically, so the same question always brings back the same evidence.'],
        ['Ground', 'Answers are built only from what was retrieved, which is what keeps retrieval hallucination-free.']],
      results: [
        'Phase 01 is live: a fully local, deterministic RAG pipeline on Sentence-BERT and ChromaDB.',
        'A written research roadmap that takes the same pipeline to a privacy-preserving, cloud-scale platform.',
        'Offline research sandboxes designed for the next phases, so each idea can be benchmarked before it touches the core.'],
      next: [
        ['Phase 02 · Encrypted vector search', 'Additively homomorphic encryption, so similarity search can run on embeddings that stay encrypted — even on someone else\'s server.'],
        ['Phase 03 · Quantum NLP', 'Benchmarks in Qiskit and PennyLane with amplitude encoding, to test whether quantum representations help retrieval.'],
        ['Phase 04 · Neuromorphic memory', 'Spiking neural networks on Intel Loihi 2 as a model for how memories get consolidated over time.']],
      link: ['CHRONUS on GitHub', 'https://github.com/manavaghera/CHRONUS']
    },
    fasal: {
      kicker: 'Case study · computer vision', title: 'Fasal AI', line: 'Crop-disease diagnosis that works in the field — offline, by voice, in Hindi or Gujarati.',
      tags: ['YOLOv8', 'TensorFlow', 'TFLite', 'Whisper', 'ONNX'],
      facts: [['Real-time', 'disease detection from the phone camera'], ['2', 'voice languages — Hindi and Gujarati'], ['Offline', 'TFLite build, no network needed']],
      numbers: [], // measured results (e.g. mAP, model size, on-phone latency, classes) go here as [value, label]
      problem: [
        'A diagnosis tool is only useful where the problem is: in the field, often with no signal, on a low-cost phone, and in the farmer\'s own language. Most AI apps assume the opposite — a fast connection, a powerful device and English.',
        'Fasal AI is built around those constraints.'],
      built: [
        ['See', 'A YOLOv8 detector, trained with TensorFlow, finds and labels crop disease in the camera view in real time.'],
        ['Listen', 'Questions can be asked out loud in Hindi or Gujarati — Whisper turns speech into text.'],
        ['Shrink', 'An offline-first TensorFlow Lite version is built for low-RAM Android phones, so it keeps working with no network at all.']],
      results: [
        'A working real-time crop-disease detection app (YOLOv8 / TensorFlow).',
        'Multilingual voice input in Hindi and Gujarati through Whisper.',
        'An offline-first TFLite build that runs on low-RAM Android devices.'],
      next: [],
      link: null
    }
  };

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const dlg = el('dialog', 'case');
  dlg.setAttribute('aria-labelledby', 'caseH');
  const body = el('div', 'case-in');
  body.setAttribute('data-lenis-prevent', '');
  dlg.append(body);
  document.body.append(dlg);

  const section = (title, ...kids) => { const s = el('section', 'case-sec'); s.append(el('h3', 'mono', title), ...kids); return s; };
  const render = c => {
    body.textContent = '';
    const x = el('button', 'case-x mono', 'esc');
    x.type = 'button'; x.setAttribute('aria-label', 'Close case study');
    x.addEventListener('click', close);
    const h = el('h2', null, c.title);
    h.id = 'caseH';
    const tags = el('p', 'case-tags mono', c.tags.join(' · '));
    const facts = el('ul', 'case-facts');
    [...c.facts, ...c.numbers].forEach(([n, t]) => { const f = el('li'); f.append(el('b', null, n), el('span', null, t)); facts.append(f); });
    body.append(x, el('p', 'case-k mono', c.kicker), h, el('p', 'case-line', c.line), tags, facts);
    body.append(section('The problem', ...c.problem.map(t => el('p', null, t))));
    const steps = el('ol', 'case-steps');
    c.built.forEach(([k, t], i) => { const s = el('li'); s.append(el('span', 'mono', String(i + 1).padStart(2, '0') + ' · ' + k), el('p', null, t)); steps.append(s); });
    body.append(section('What I built', steps));
    const res = el('ul', 'case-list');
    c.results.forEach(t => res.append(el('li', null, t)));
    body.append(section('What it achieved', res));
    if (c.next.length) {
      const nx = el('ol', 'case-steps');
      c.next.forEach(([k, t]) => { const s = el('li'); s.append(el('span', 'mono', k), el('p', null, t)); nx.append(s); });
      body.append(section('What comes next', nx));
    }
    const foot = el('div', 'case-foot');
    const talk = el('button', 'btn btn-primary', 'Talk to me about it →');
    talk.type = 'button';
    talk.addEventListener('click', () => { close(); if (MA.goTo) MA.goTo('#contact'); if (MA.prefill) MA.prefill(`Hi Manav — I read the ${c.title} case study and `); });
    foot.append(talk);
    if (c.link) { const a = el('a', 'btn btn-ghost', c.link[0] + ' ↗'); a.href = c.link[1]; a.target = '_blank'; a.rel = 'noopener'; foot.append(a); }
    body.append(foot);
  };
  let opener = null;
  const open = key => {
    const c = CASES[key];
    if (!c) return;
    opener = document.activeElement;
    render(c);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    body.scrollTop = 0;
    if (MA.lenis) MA.lenis.stop();
    history.replaceState(null, '', '#case/' + key);
    if (MA.track) MA.track('play', 'case');
  };
  function close() { if (dlg.close) dlg.close(); else { dlg.removeAttribute('open'); onClose(); } }
  const onClose = () => {
    if (MA.lenis) MA.lenis.start();
    if (/^#case\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  };
  dlg.addEventListener('close', onClose);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  MA.caseStudy = open;

  /* ── ways in ── */
  const button = (key, cls) => {
    const b = el('button', cls, 'Read the case study →');
    b.type = 'button';
    b.addEventListener('click', () => open(key));
    return b;
  };
  const projects = document.querySelectorAll('.proj-list .proj');
  [['chronus', 0], ['fasal', 5]].forEach(([k, i]) => { if (projects[i]) projects[i].append(button(k, 'proj-case mono')); });
  const research = document.querySelector('#research .research-copy .more-link');
  if (research) research.before(button('chronus', 'case-open mono'));
  const fromHash = () => { const m = /^#case\/(\w+)$/.exec(location.hash); if (m && !dlg.open) open(m[1]); };
  addEventListener('hashchange', fromHash);
  (MA.booted || Promise.resolve()).then(fromHash);
})();
