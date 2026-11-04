/**
 * How I build — a pinned, scroll-driven pipeline. A packet travels the line;
 * each stage it reaches takes over the stage panel.
 */
(() => {
  'use strict';
  const sec = document.getElementById('build');
  if (!sec) return;
  const $ = id => document.getElementById(id);
  const pin = sec.querySelector('.build-pin'), track = $('track'), fill = $('trackFill'), packet = $('packet'), stage = $('stage');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const STAGES = [
    { t: 'Collect', d: 'Scrape, clean and structure messy real-world data before any model sees it.', tools: ['BeautifulSoup4', 'Pandas', 'NumPy', 'SQL'], proof: '40,000+ banking records cleaned and modelled — automated cleaning cut preprocessing time by ~30% at Brainy Beam.' },
    { t: 'Embed', d: 'Turn text into numbers that capture its meaning, so similar ideas end up close together.', tools: ['Sentence-BERT', 'Hugging Face', 'TF-IDF'], proof: 'Sentence-BERT embeddings power retrieval in CHRONUS.' },
    { t: 'Retrieve', d: 'Find the right facts first, so the AI answers from real sources instead of guessing.', tools: ['ChromaDB', 'Vector databases', 'LangChain'], proof: 'A deterministic, hallucination-free RAG pipeline — fully local — at the core of CHRONUS.' },
    { t: 'Reason', d: 'Let AI agents plan, check their own work, and try another way when something fails.', tools: ['LangGraph', 'Llama 3', 'Ollama', 'Prompt design'], proof: 'Research, writer and validator agents that send weak drafts back; published posts score 82–89/100 (AutonomousContent).' },
    { t: 'Perceive', d: 'Shrink vision and speech models until they run on cheap phones, even offline.', tools: ['YOLOv8', 'TF Lite', 'ONNX Runtime', 'Whisper'], proof: 'Real-time crop-disease detection with Hindi & Gujarati voice, shipped as an offline TFLite build (Fasal AI).' },
    { t: 'Ship & measure', d: 'Evaluate honestly, package cleanly, deploy where people can use it.', tools: ['FastAPI', 'Docker', 'MLflow', 'React'], proof: 'Top 1% on Kaggle twice; NewsSense ships with 211 backend tests and GitHub Actions.' }
  ];
  const N = STAGES.length;
  const nodes = STAGES.map((s, i) => {
    const n = document.createElement('div');
    n.className = 'tnode';
    n.style.left = (i / (N - 1) * 100) + '%';
    n.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i><span>${s.t}</span>`;
    track.append(n);
    return n;
  });
  const numEl = $('stageNum'), kEl = $('stageK'), titleEl = $('stageTitle'), descEl = $('stageDesc'), toolsEl = $('stageTools'), proofEl = $('stageProof');
  let active = -1, lastPos = -1;

  const show = i => {
    if (i === active) return;
    active = i;
    const s = STAGES[i];
    numEl.textContent = String(i + 1).padStart(2, '0');
    kEl.textContent = `Stage ${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
    titleEl.textContent = s.t;
    descEl.textContent = s.d;
    toolsEl.innerHTML = s.tools.map(t => `<span>${t}</span>`).join('');
    proofEl.textContent = s.proof;
    stage.classList.remove('swap'); void stage.offsetWidth; stage.classList.add('swap');
    nodes.forEach((n, k) => { n.classList.toggle('done', k < i); n.classList.toggle('active', k === i); });
  };

  /* only measure while the section is near the screen, and only re-read its height when it changes */
  let near = false, own = 1;
  const size = () => { own = Math.max(1, sec.offsetHeight - pin.offsetHeight); lastPos = -1; };
  size();
  new ResizeObserver(size).observe(sec);
  new IntersectionObserver(es => { near = es[0].isIntersecting; }, { rootMargin: '200px 0px' }).observe(sec);
  const frame = () => {
    if (!near) { requestAnimationFrame(frame); return; }
    const p = clamp(-sec.getBoundingClientRect().top / own);
    const pos = clamp((p - .04) / .9) * (N - 1);
    if (Math.abs(pos - lastPos) > .0005) {
      lastPos = pos;
      fill.style.transform = `scaleX(${(pos / (N - 1)).toFixed(4)})`;
      packet.style.left = (pos / (N - 1) * 100).toFixed(3) + '%';
      show(Math.min(N - 1, Math.round(pos)));
    }
    requestAnimationFrame(frame);
  };
  show(0);
  requestAnimationFrame(frame);
})();
