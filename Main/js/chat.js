/**
 * Ask-me chat — a floating assistant for recruiter questions. Answers come from
 * /api/ask (Claude, reading only my résumé and citing the chunk behind each claim);
 * when that isn't available it falls back to the keyword-matched replies below.
 * Questions can be typed or spoken (browser speech recognition, where supported).
 * Visitor input is length-limited and only ever rendered as text.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const EMAIL = 'manavaghera@yahoo.com';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KB = [
    { k: ['ignore previous', 'ignore all', 'system prompt', 'jailbreak'], a: "Nice try. I'm a scripted assistant — there's no prompt to inject into. Ask me about Manav's work instead?" },
    { k: ['hello', 'hey', 'hi ', 'yo ', 'sup', 'namaste'], a: "Hey! I'm Manav's scripted assistant. Ask me about his projects, stack, experience or availability." },
    { k: ['who are', 'who is', 'yourself', 'introduce', 'about you', 'about manav'], a: 'Manav Aghera is an AI/ML engineer from Vadodara, India, in his final year of a B.Tech in Computer Science at Parul University. He builds RAG pipelines, multi-agent systems and on-device computer vision.' },
    { k: ['available', 'availability', 'hire', 'hiring', 'open to', 'job', 'role', 'opportunit', 'freelance', 'work with'], a: "Yes — he's looking for ML or AI engineer internships and trainee roles. The fastest way to reach him is email.", link: ['Email Manav', 'mailto:' + EMAIL] },
    { k: ['stack', 'skill', 'tech', 'tool', 'language', 'framework', 'know'], a: 'Python, TypeScript and SQL. PyTorch, TensorFlow, Hugging Face, Sentence-BERT, YOLOv8, Whisper and ONNX for ML. LangChain, LangGraph, ChromaDB, Llama 3 and Ollama for LLM work. FastAPI, Docker and MLflow to ship it.', link: ['See the stack', '#stack'] },
    { k: ['project', 'built', 'portfolio', 'best', 'proud', 'made'], a: 'Highlights: a Kaggle top-1% Student Health Risk Engine (0.952 balanced accuracy), NewsSense (an AI news platform that checks its own claims, 211 tests), AutonomousContent (research, writer and validator agents; posts score 82–89/100), Clip Studio and CHRONUS (memory-grounded RAG research).', link: ['Selected work', '#work'] },
    { k: ['chronus', 'research', 'memory'], a: 'CHRONUS is his research platform for memory-grounded AI: a deterministic, fully local RAG pipeline (Sentence-BERT + ChromaDB), heading toward encrypted vector search, quantum NLP and neuromorphic memory.', link: ['Now researching', '#research'] },
    { k: ['rag', 'retrieval', 'grounded', 'vector', 'embedding'], a: "Retrieval that stays grounded is his core focus. CHRONUS uses Sentence-BERT embeddings and ChromaDB for deterministic, hallucination-free retrieval. He's Anthropic Academy certified in RAG and MCP." },
    { k: ['agent', 'langgraph', 'multi'], a: 'AutonomousContent is a LangGraph pipeline of research, writer and validator agents. The validator runs a four-stage quality check and sends weak drafts back; published posts score 82–89/100, with backoff, model fallback and a live dashboard, all on free-tier LLM APIs.' },
    { k: ['vision', 'yolo', 'image', 'computer vision', 'fasal', 'crop', 'derma', 'offline'], a: 'Fasal AI does real-time crop-disease detection with YOLOv8, takes Hindi and Gujarati voice via Whisper, and ships as an offline TFLite build for low-RAM phones. DermaLense.AI runs skin-health inference entirely in the browser.' },
    { k: ['experience', 'intern', 'brainy', 'riot', 'worked', 'career'], a: 'Data Science & ML intern at Brainy Beam Technologies (2023): an ML pipeline on 40,000+ banking records, best model at 92% accuracy, ~30% faster preprocessing. Beta tester for Riot Games (2024–25) across 50+ pre-release builds.', link: ['The journey', '#journey'] },
    { k: ['education', 'degree', 'college', 'university', 'study', 'b.tech', 'diploma', 'cgpa', 'graduat'], a: 'B.Tech in Computer Science at Parul University (graduating 2027), after a Diploma in Computer Engineering from NG Patel Polytechnic with a CGPA of 8.4.' },
    { k: ['kaggle', 'award', 'achievement', 'certif', 'anthropic', 'mcp', 'jpmorgan', 'gdsc'], a: 'Top 1% in two Kaggle competitions (570 and 3,355 teams); DeepLearning.AI Machine Learning Specialization and TensorFlow Developer certificate; Anthropic Academy MCP & RAG; Microsoft Learn modules on RAG, generative AI and NLP; JPMorgan Chase software engineering simulation; GDSC open source. He also completed Stanford CS230.', link: ['Trophy shelf', '#awards'] },
    { k: ['resume', 'résumé', 'cv'], a: "Here's his résumé.", link: ['Download résumé', 'Manav_Aghera_Resume.pdf'] },
    { k: ['contact', 'email', 'reach', 'mail', 'phone', 'number', 'call', 'linkedin'], a: `Email is best: ${EMAIL}. He's also on GitHub (@manavaghera) and LinkedIn.`, link: ['Email Manav', 'mailto:' + EMAIL] },
    { k: ['location', 'where', 'based', 'remote', 'relocat', 'city', 'india'], a: "He's based in Vadodara, Gujarat, India. For remote or relocation questions, email him — he replies quickly." },
    { k: ['github', 'code', 'repo', 'commit'], a: 'github.com/manavaghera — his live commit log is on this page too.', link: ['Commit log', '#commits'] },
    { k: ['token', 'burn'], a: 'Roughly ten billion, by his own back-of-the-envelope estimate across coding agents, RAG pipelines and evals — not a reading from any meter.' },
    { k: ['service', 'help', 'freelance', 'consult', 'offer', 'build for'], a: 'He builds RAG & knowledge assistants, AI agents & automation, computer vision for edge devices, MCP servers & integrations, and frontier R&D on memory and agentic systems.', link: ['How I can help', '#services'] },
    { k: ['demo', 'try', 'test', 'play', 'fun'], a: "Try the mini-RAG demo further down — it runs real TF-IDF retrieval over his résumé in your browser and cites what it found.", link: ['Ask my résumé', '#rag'] },
    { k: ['thank', 'thanks', 'cool', 'nice', 'great', 'awesome', 'love'], a: `Anytime! If you'd like to talk to the real Manav: ${EMAIL}.` }
  ];
  const FALLBACK = { a: "I'm a scripted helper, so I only know the basics. Try asking about projects, stack, experience or availability — or email Manav directly.", link: ['Email Manav', 'mailto:' + EMAIL] };
  const SUGGEST = ['What do you build?', 'Are you available?', "What's your stack?", 'Best project?', 'How do I contact you?'];

  const scripted = q => {
    const s = ' ' + q.toLowerCase().replace(/\s+/g, ' ') + ' ';
    let best = null, top = 0;
    KB.forEach(e => { const n = e.k.filter(k => s.includes(k)).length; if (n > top) { top = n; best = e; } });
    return best || FALLBACK;
  };

  /* ── DOM ── */
  const fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'ask-fab';
  fab.setAttribute('aria-label', 'Ask me anything'); fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = '<i aria-hidden="true"></i><span>Ask me</span>';
  const panel = document.createElement('section');
  panel.className = 'ask'; panel.setAttribute('aria-label', 'Ask Manav — AI assistant'); panel.hidden = true;
  panel.innerHTML = '<header class="ask-head"><b class="ask-av" aria-hidden="true">MA</b><div><p>Ask Manav</p><span class="mono ask-mode">AI · answers only from my résumé</span></div>'
    + '<button type="button" class="ask-x" aria-label="Close chat">×</button></header>'
    + '<ol class="ask-log" aria-live="polite" data-lenis-prevent></ol><div class="ask-sug"></div>'
    + '<form class="ask-form"><input type="text" maxlength="300" autocomplete="off" placeholder="Ask about projects, stack, availability…" aria-label="Your question"><button type="submit" aria-label="Send">↑</button></form>';
  document.body.append(fab, panel);
  const log = panel.querySelector('.ask-log'), sug = panel.querySelector('.ask-sug'), mode = panel.querySelector('.ask-mode');
  const form = panel.querySelector('form'), input = form.querySelector('input');
  let busy = false, greeted = false, ai = true;
  const queue = [], history = [];
  const offline = () => { ai = false; mode.textContent = 'scripted · answers from my résumé'; panel.setAttribute('aria-label', 'Ask Manav — scripted assistant'); };

  /* the real assistant: Claude over my résumé, with numbered sources */
  const askAI = async q => {
    const r = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, history: history.slice(-8) }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && Array.isArray(j.parts)) return { parts: j.parts, sources: Array.isArray(j.sources) ? j.sources : [] };
    if (r.status === 503 || r.status === 404) offline();
    throw Object.assign(new Error(j.error || 'ask failed'), { status: r.status, msg: j.error });
  };
  const answer = async q => {
    if (ai) {
      try { return await askAI(q); } catch (e) {
        if (e.status === 429 && e.msg) return { a: e.msg };
      }
    }
    return scripted(q);
  };

  const bubble = (who, text) => {
    const li = document.createElement('li');
    li.className = 'msg ' + who;
    const p = document.createElement('p');
    p.textContent = text;
    li.append(p);
    log.append(li);
    log.scrollTop = log.scrollHeight;
    return { li, p };
  };
  const plain = entry => (entry.parts ? entry.parts.map(x => x.text).join('') : entry.a).trim();
  /* the final, cited version of an AI answer: text with numbered marks, then the sources */
  const cited = (li, p, entry) => {
    p.textContent = '';
    entry.parts.forEach(x => {
      p.append(String(x.text || ''));
      (x.cites || []).forEach(n => { const s = document.createElement('sup'); s.textContent = n; s.setAttribute('aria-label', 'source ' + n); p.append(s); });
    });
    if (!entry.sources.length) return;
    const ol = document.createElement('ol');
    ol.className = 'msg-src mono';
    ol.setAttribute('aria-label', 'Sources from the résumé');
    entry.sources.forEach(s => {
      const item = document.createElement('li'), a = document.createElement('a');
      a.href = /^#[a-z]+$/.test(s.href) ? s.href : '#about';
      a.title = String(s.text || '');
      a.textContent = `${s.n} · ${s.title}`;
      a.addEventListener('click', e => { e.preventDefault(); close(); if (MA.goTo) MA.goTo(a.getAttribute('href')); });
      item.append(a);
      ol.append(item);
    });
    li.append(ol);
  };
  const reply = (entry, li, p) => new Promise(done => {
    const words = plain(entry).split(' ');
    setTimeout(() => {
      li.classList.remove('typing');
      let i = 0;
      const tick = () => {
        p.textContent = words.slice(0, ++i).join(' ');
        log.scrollTop = log.scrollHeight;
        if (i < words.length) setTimeout(tick, reduced ? 0 : 18 + Math.random() * 22);
        else {
          if (entry.parts) cited(li, p, entry);
          if (entry.link) {
            const a = document.createElement('a');
            a.className = 'msg-link mono';
            a.href = entry.link[1];
            a.textContent = entry.link[0] + (entry.link[1].startsWith('#') ? ' ↓' : ' ↗');
            if (entry.link[1].endsWith('.pdf')) a.download = 'Manav_Aghera_Resume.pdf';
            if (entry.link[1].startsWith('#')) a.addEventListener('click', e => { e.preventDefault(); close(); if (MA.goTo) MA.goTo(entry.link[1]); });
            li.append(a);
          }
          log.scrollTop = log.scrollHeight;
          done();
        }
      };
      tick();
    }, reduced || entry.parts ? 0 : 450 + Math.random() * 300);
  });
  const say = entry => { const { li, p } = bubble('bot', ''); li.classList.add('typing'); return reply(entry, li, p); };
  const next = async () => {
    if (busy || !queue.length) return;
    busy = true;
    const q = queue.shift();
    if (MA.track) MA.track('play', 'chat');
    const { li, p } = bubble('bot', '');
    li.classList.add('typing');
    const entry = await answer(q);
    history.push({ role: 'user', text: q }, { role: 'assistant', text: plain(entry) });
    await reply(entry, li, p);
    busy = false;
    next();
  };
  const ask = q => {
    q = String(q).trim().slice(0, 300);
    if (!q) return;
    bubble('me', q);
    queue.push(q);
    next();
  };
  SUGGEST.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'mono'; b.textContent = t;
    b.addEventListener('click', () => ask(t));
    sug.append(b);
  });
  const open = MA.chatOpen = () => {
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('open'));
    fab.setAttribute('aria-expanded', 'true');
    fab.classList.add('on');
    if (!greeted) { greeted = true; say({ a: "Hi — I'm Manav's assistant. I only answer from his résumé, and I'll show you where each answer comes from. Ask about his projects, stack or availability." }); }
    setTimeout(() => input.focus({ preventScroll: true }), 200);
  };
  const close = () => {
    panel.classList.remove('open');
    fab.setAttribute('aria-expanded', 'false');
    fab.classList.remove('on');
    setTimeout(() => { if (!panel.classList.contains('open')) panel.hidden = true; }, 300);
  };
  fab.addEventListener('click', () => (panel.classList.contains('open') ? close() : open()));
  panel.querySelector('.ask-x').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
  form.addEventListener('submit', e => { e.preventDefault(); ask(input.value); input.value = ''; });

  /* voice questions — the browser turns speech into text, then it's asked like any other */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const mic = document.createElement('button');
    mic.type = 'button'; mic.className = 'ask-mic';
    mic.setAttribute('aria-label', 'Ask by voice'); mic.setAttribute('aria-pressed', 'false');
    mic.title = 'Ask by voice — your browser turns speech into text';
    mic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
    form.insertBefore(mic, form.lastElementChild);
    let rec = null;
    const hint = input.placeholder;
    const stop = () => { mic.setAttribute('aria-pressed', 'false'); mic.classList.remove('on'); input.placeholder = hint; };
    mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      let said = '';
      rec = new SR();
      rec.lang = /^(hi|gu)/i.test(navigator.language || '') ? navigator.language : 'en-IN';
      rec.interimResults = true;
      rec.onresult = e => { said = [...e.results].map(r => r[0].transcript).join(''); input.value = said; };
      rec.onerror = e => { if (/not-allowed|service-not-allowed/.test(e.error) && MA.toast) MA.toast('Microphone access is blocked — you can still type.'); };
      rec.onend = () => { rec = null; stop(); if (said.trim()) { ask(said); input.value = ''; } };
      try { rec.start(); } catch (e) { rec = null; return; }
      if (MA.track) MA.track('play', 'voice');
      mic.setAttribute('aria-pressed', 'true'); mic.classList.add('on');
      input.value = ''; input.placeholder = 'Listening… ask your question';
    });
  }
})();
