/**
 * Ask my résumé — a real (tiny) retrieval pipeline in the browser.
 * Query → tokens → TF-IDF vector → cosine similarity over résumé chunks →
 * top-k with scores → an extractive answer that cites its sources, or an
 * honest "not in my documents" when nothing scores high enough.
 */
(() => {
  'use strict';
  const box = document.getElementById('ragBox');
  if (!box) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DOCS = [
    ['profile', 'Manav Aghera is an AI/ML engineer from Vadodara, India, in the final year of a B.Tech in Computer Science at Parul University, graduating in 2027.'],
    ['profile', 'He builds retrieval-augmented generation pipelines, multi-agent systems and on-device computer vision, and is open to AI/ML engineering roles.'],
    ['chronus', 'CHRONUS is his memory-grounded AI research platform: a deterministic, fully local RAG pipeline built on Sentence-BERT embeddings and ChromaDB.'],
    ['chronus', 'The CHRONUS roadmap moves from deterministic retrieval to encrypted vector search with additively homomorphic encryption, quantum NLP benchmarks in Qiskit and PennyLane, and neuromorphic memory on Intel Loihi 2.'],
    ['autonomouscontent', 'AutonomousContent is a LangGraph pipeline of research, writer and validator agents; the validator runs a four-stage quality check and sends weak drafts back for revision.'],
    ['autonomouscontent', 'AutonomousContent posts scored 82 to 89 out of 100 on automated validation, with backoff, model fallback and a live dashboard, on free-tier LLM APIs.'],
    ['health-risk', 'His Student Health Risk Engine is a three-model gradient-boosting ensemble (LightGBM, XGBoost, CatBoost) on 690K rows that reached 0.952 balanced accuracy, up from a 0.876 baseline, and finished top 1% on Kaggle.'],
    ['clip-studio', 'Clip Studio ranks Twitch clips by views per hour and turns them into vertical Shorts with captions, using faster-whisper, Ollama and ffmpeg, with 127 automated tests.'],
    ['fasal-ai', 'Fasal AI performs real-time crop-disease detection with YOLOv8 and accepts Hindi and Gujarati voice input through Whisper.'],
    ['fasal-ai', 'Fasal AI ships an offline-first TensorFlow Lite build designed for low-RAM Android phones, so farmers can use it without a network.'],
    ['newssense', 'NewsSense is an AI news platform: an hourly pipeline ingests RSS and official sources, deduplicates them, checks LLM-written claims against evidence and publishes atomically, with 211 backend tests.'],
    ['dermalense', 'DermaLense.AI is a browser-first skin-health computer vision experiment where inference runs entirely in the tab, with no servers and no uploads.'],
    ['mcp', 'His MCP Playground contains Model Context Protocol servers, tools and resources built hands-on from the Anthropic Academy curriculum.'],
    ['brainy-beam', 'In 2023 he was a Data Science and Machine Learning intern at Brainy Beam Technologies in Ahmedabad, building an end-to-end ML pipeline on more than 40,000 banking records.'],
    ['brainy-beam', 'At Brainy Beam he benchmarked logistic regression, decision trees and random forests; the best model reached 92% accuracy, and automated cleaning scripts cut preprocessing time by about 30%.'],
    ['riot-games', 'From March 2024 to March 2025 he was a beta tester for Riot Games, play-testing more than 50 pre-release builds and writing reproducible bug reports that sped up triage.'],
    ['education', 'He earned a Diploma in Computer Engineering from NG Patel Polytechnic in 2025 with a CGPA of 8.4, and is now studying for a B.Tech at Parul University.'],
    ['awards', 'He finished in the top 1% on Kaggle twice: Autonomous Agent Prediction among 570 teams, and Student Health Risk (Playground S6E7) among 3,355 teams.'],
    ['awards', 'He is certified by Anthropic Academy in MCP and RAG, completed the JPMorgan Chase software engineering job simulation, and contributed to open source with GDSC.'],
    ['skills', 'His languages are Python, TypeScript, JavaScript and SQL; for machine learning he uses PyTorch, TensorFlow, TF Lite, Scikit-learn, Hugging Face, Sentence-BERT, YOLOv8, Whisper, ONNX Runtime, Pandas and NumPy.'],
    ['skills', 'For LLM and infrastructure work he uses LangChain, LangGraph, ChromaDB, Llama 3, Ollama, FastAPI, Flask, React, Docker, MLflow, BeautifulSoup4 and Git.'],
    ['contact', 'The best way to contact him is email at manavaghera@yahoo.com; his code is on GitHub as manavaghera.']
  ];
  const STOP = new Set('a an the and or of to in on at for with by from is are was were be been his he him it its as that this these those what which who whom how where when why do does did has have had can could would should will i you me my your about any some there their they them also so if into than then up out over not no yes tell'.split(' '));
  const SYN = { cv: 'vision', image: 'vision', llm: 'rag', chatbot: 'rag', retrieval: 'rag', job: 'roles', hire: 'roles', hiring: 'roles', work: 'intern', experience: 'intern', internship: 'intern',
    school: 'education', college: 'university', degree: 'b.tech', study: 'education', contact: 'email', reach: 'email', skill: 'uses', skills: 'uses', stack: 'uses', tools: 'uses', tech: 'uses',
    kaggle: 'kaggle', award: 'awards', achievements: 'awards', certification: 'certified', certificate: 'certified', agent: 'agents', agentic: 'agents', memory: 'chronus', research: 'chronus', farmer: 'fasal', crop: 'fasal' };
  const stem = w => (w.length > 4 ? w.replace(/(ings?|edly|ed|es|s)$/, '') : w);
  const terms = text => (text.toLowerCase().match(/[a-z0-9][a-z0-9.+#]*/g) || []).map(w => w.replace(/\.+$/, '')).filter(w => w && !STOP.has(w));
  const norm = w => stem(SYN[w] || w); // queries get synonyms; documents are only stemmed

  /* ── index: TF-IDF with sublinear tf, L2-normalised ── */
  const docTerms = DOCS.map(([src, t]) => terms(src.replace(/-/g, ' ') + ' ' + t).map(stem));
  const df = {};
  docTerms.forEach(ts => new Set(ts).forEach(t => { df[t] = (df[t] || 0) + 1; }));
  const idf = t => Math.log((DOCS.length + 1) / ((df[t] || 0) + 1)) + 1;
  const vec = ts => {
    const tf = {};
    ts.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
    const v = {};
    let n = 0;
    Object.keys(tf).forEach(t => { v[t] = (1 + Math.log(tf[t])) * idf(t); n += v[t] * v[t]; });
    n = Math.sqrt(n) || 1;
    Object.keys(v).forEach(t => { v[t] /= n; });
    return v;
  };
  const DV = docTerms.map(vec);
  const cos = (a, b) => Object.keys(a).reduce((s, t) => s + a[t] * (b[t] || 0), 0);

  /* ── UI ── */
  box.innerHTML = `<div class="rag-l"><form class="rag-form"><input type="text" maxlength="160" autocomplete="off" spellcheck="false" aria-label="Ask a question about Manav" placeholder="e.g. What did he build with LangGraph?"><button type="submit">Retrieve</button></form>
    <div class="rag-sug"></div>
    <div class="rag-step" data-s="1"><p class="rag-k"><span>01 · tokenize</span><b class="n1"></b></p><div class="rag-toks"></div></div>
    <div class="rag-step" data-s="2"><p class="rag-k"><span>02 · embed (tf-idf)</span><b class="n2"></b></p><div class="rag-vec"></div></div></div>
    <div class="rag-r"><div class="rag-step" data-s="3"><p class="rag-k"><span>03 · retrieve (cosine, top-3)</span><b class="n3"></b></p><ol class="rag-hits"></ol></div>
    <div class="rag-step" data-s="4"><p class="rag-k"><span>04 · answer (grounded)</span><b>${DOCS.length} chunks indexed</b></p><p class="rag-ans empty">Ask anything about my work — the answer comes only from retrieved chunks.</p><p class="rag-meta"></p></div></div>`;
  const q = s => box.querySelector(s);
  const input = q('input'), toksEl = q('.rag-toks'), vecEl = q('.rag-vec'), hitsEl = q('.rag-hits'), ansEl = q('.rag-ans'), metaEl = q('.rag-meta');
  const steps = [...box.querySelectorAll('.rag-step')];
  ['What did he build with LangGraph?', 'Kaggle results?', 'Can it run offline?', 'Internship experience', 'How do I contact him?'].forEach(t => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = t;
    b.addEventListener('click', () => { input.value = t; run(t); });
    q('.rag-sug').append(b);
  });

  const mark = (text, hits) => {
    const p = document.createElement('p');
    text.split(/(\s+)/).forEach(w => {
      const k = stem(w.toLowerCase().replace(/[^a-z0-9.+#]/g, '').replace(/\.+$/, ''));
      if (k && hits.has(k)) { const m = document.createElement('mark'); m.textContent = w; p.append(m); } else p.append(w);
    });
    return p;
  };
  const later = (fn, ms) => (reduced ? fn() : setTimeout(fn, ms));
  let runId = 0;
  const run = text => {
    const id = ++runId;
    text = String(text).trim().slice(0, 160);
    if (!text) return;
    const t0 = performance.now();
    const raw = (text.toLowerCase().match(/[a-z0-9][a-z0-9.+#]*/g) || []);
    const qt = terms(text).map(norm), qv = vec(qt);
    const scored = DV.map((v, i) => [cos(qv, v), i]).sort((a, b) => b[0] - a[0]);
    const top = scored.slice(0, 3).filter(([s]) => s > 0);
    const ms = (performance.now() - t0).toFixed(2);
    const hitTerms = new Set(qt.filter(t => df[t]));
    steps.forEach(s => s.classList.remove('on'));
    toksEl.textContent = ''; vecEl.textContent = ''; hitsEl.textContent = '';
    ansEl.className = 'rag-ans empty'; ansEl.textContent = 'retrieving…'; metaEl.textContent = '';

    later(() => {
      if (id !== runId) return;
      steps[0].classList.add('on');
      raw.forEach(w => { const s = document.createElement('span'); s.textContent = w; if (hitTerms.has(norm(w.replace(/\.+$/, '')))) s.className = 'hit'; toksEl.append(s); });
      q('.n1').textContent = `${raw.length} tokens`;
    }, 0);
    later(() => {
      if (id !== runId) return;
      steps[1].classList.add('on');
      const ws = Object.entries(qv).sort((a, b) => b[1] - a[1]).slice(0, 6);
      ws.forEach(([t, w]) => {
        const row = document.createElement('div'), bar = document.createElement('i');
        row.append(t.slice(0, 12), bar, w.toFixed(2));
        vecEl.append(row);
        requestAnimationFrame(() => bar.style.setProperty('--w', w.toFixed(3)));
      });
      q('.n2').textContent = `${Object.keys(qv).length} dims of ${Object.keys(df).length}`;
    }, 220);
    later(() => {
      if (id !== runId) return;
      steps[2].classList.add('on');
      q('.n3').textContent = top.length ? `best ${top[0][0].toFixed(3)}` : 'no match';
      top.forEach(([s, i], r) => {
        const li = document.createElement('li'), head = document.createElement('header'), src = document.createElement('span'), sc = document.createElement('b'), bar = document.createElement('i');
        li.className = 'rag-hit' + (r === 0 ? ' top' : '');
        src.textContent = `[${r + 1}] ${DOCS[i][0]}.md`;
        sc.textContent = `cos ${s.toFixed(3)}`;
        head.append(src, sc);
        li.append(head, mark(DOCS[i][1], hitTerms), bar);
        hitsEl.append(li);
        later(() => { li.classList.add('on'); bar.style.setProperty('--w', Math.min(1, s / Math.max(top[0][0], .001)).toFixed(3)); }, r * 120);
      });
    }, 460);
    later(() => {
      if (id !== runId) return;
      steps[3].classList.add('on');
      ansEl.textContent = '';
      if (!top.length || top[0][0] < .12) {
        ansEl.textContent = "I couldn't find that in my documents, so I won't guess. Try asking about projects, skills, experience or awards.";
        metaEl.textContent = `grounding check failed (best cosine ${top.length ? top[0][0].toFixed(3) : '0.000'} < 0.120) · ${ms} ms`;
        return;
      }
      ansEl.className = 'rag-ans';
      const use = top.filter(([s], r) => r === 0 || s >= top[0][0] * .6).slice(0, 2);
      use.forEach(([, i], r) => {
        ansEl.append(DOCS[i][1] + ' ');
        const sup = document.createElement('sup');
        sup.textContent = `[${top.findIndex(([, j]) => j === i) + 1}]`;
        ansEl.append(sup, ' ');
        if (r === 0 && use.length > 1) ansEl.append(' ');
      });
      metaEl.textContent = `retrieved ${top.length} of ${DOCS.length} chunks in ${ms} ms · extractive answer, no LLM, nothing leaves your browser`;
    }, 760);
  };
  q('form').addEventListener('submit', e => { e.preventDefault(); run(input.value); });
  let primed = false;
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !primed) { primed = true; input.value = 'What did he build with LangGraph?'; run(input.value); }
  }), { threshold: .3 }).observe(box);
})();
