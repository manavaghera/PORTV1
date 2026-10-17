/**
 * Ask-me chat — a floating, scripted assistant that answers common recruiter
 * questions from the résumé. Keyword-matched (no network), answers stream in
 * word by word. Visitor input is length-limited and only ever rendered as text.
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
    { k: ['available', 'availability', 'hire', 'hiring', 'open to', 'job', 'role', 'opportunit', 'freelance', 'work with'], a: "Yes — he's open to AI/ML roles. The fastest way to reach him is email.", link: ['Email Manav', 'mailto:' + EMAIL] },
    { k: ['stack', 'skill', 'tech', 'tool', 'language', 'framework', 'know'], a: 'Python, TypeScript and SQL. PyTorch, TensorFlow, Hugging Face, Sentence-BERT, YOLOv8, Whisper and ONNX for ML. LangChain, LangGraph, ChromaDB, Llama 3 and Ollama for LLM work. FastAPI, Docker and MLflow to ship it.', link: ['See the stack', '#stack'] },
    { k: ['project', 'built', 'portfolio', 'best', 'proud', 'made'], a: 'Highlights: CHRONUS (memory-grounded RAG research), AutonomousContent (a four-agent LangGraph pipeline averaging 78.7/100 on automated validation), Fasal AI (offline crop-disease detection with Hindi & Gujarati voice), LLM-NewsHub and DermaLense.AI.', link: ['Selected work', '#work'] },
    { k: ['chronus', 'research', 'memory'], a: 'CHRONUS is his research platform for memory-grounded AI: a deterministic, fully local RAG pipeline (Sentence-BERT + ChromaDB), heading toward encrypted vector search, quantum NLP and neuromorphic memory.', link: ['Now researching', '#research'] },
    { k: ['rag', 'retrieval', 'grounded', 'vector', 'embedding'], a: "Retrieval that stays grounded is his core focus. CHRONUS uses Sentence-BERT embeddings and ChromaDB for deterministic, hallucination-free retrieval. He's Anthropic Academy certified in RAG and MCP." },
    { k: ['agent', 'langgraph', 'multi'], a: 'AutonomousContent is a four-agent LangGraph pipeline — research, write, validate, publish — with failure detection and automatic model fallback. It averaged 78.7/100 on automated validation and published six articles.' },
    { k: ['vision', 'yolo', 'image', 'computer vision', 'fasal', 'crop', 'derma', 'offline'], a: 'Fasal AI does real-time crop-disease detection with YOLOv8, takes Hindi and Gujarati voice via Whisper, and ships as an offline TFLite build for low-RAM phones. DermaLense.AI runs skin-health inference entirely in the browser.' },
    { k: ['experience', 'intern', 'brainy', 'riot', 'worked', 'career'], a: 'Data Science & ML intern at Brainy Beam Technologies (2023): an ML pipeline on 40,000+ banking records, best model at 92% accuracy, ~30% faster preprocessing. Beta tester for Riot Games (2024–25) across 50+ pre-release builds.', link: ['The journey', '#journey'] },
    { k: ['education', 'degree', 'college', 'university', 'study', 'b.tech', 'diploma', 'cgpa', 'graduat'], a: 'B.Tech in Computer Science at Parul University (graduating 2027), after a Diploma in Computer Engineering from NG Patel Polytechnic with a CGPA of 8.4.' },
    { k: ['kaggle', 'award', 'achievement', 'certif', 'anthropic', 'mcp', 'jpmorgan', 'gdsc'], a: 'Twice top 1% on Kaggle (570 and 3,355 teams), Anthropic Academy certified in MCP & RAG, JPMorgan Chase software engineering simulation, and a GDSC open-source contributor.', link: ['Trophy shelf', '#awards'] },
    { k: ['resume', 'résumé', 'cv'], a: "Here's his résumé.", link: ['Download résumé', 'Manav_Aghera_Resume.pdf'] },
    { k: ['contact', 'email', 'reach', 'mail', 'phone', 'number', 'call', 'linkedin'], a: `Email is best: ${EMAIL}. He's also on GitHub (@manavaghera) and LinkedIn.`, link: ['Email Manav', 'mailto:' + EMAIL] },
    { k: ['location', 'where', 'based', 'remote', 'relocat', 'city', 'india'], a: "He's based in Vadodara, Gujarat, India. For remote or relocation questions, email him — he replies quickly." },
    { k: ['github', 'code', 'repo', 'commit'], a: 'github.com/manavaghera — his live commit log is on this page too.', link: ['Commit log', '#commits'] },
    { k: ['token', 'burn'], a: 'Over ten billion tokens and counting — an estimate across coding agents, RAG pipelines and evals. Watch it tick in Token burn.', link: ['Token burn', '#tokens'] },
    { k: ['service', 'help', 'freelance', 'consult', 'offer', 'build for'], a: 'He builds RAG & knowledge assistants, AI agents & automation, computer vision for edge devices, MCP servers & integrations, and frontier R&D on memory and agentic systems.', link: ['How I can help', '#services'] },
    { k: ['demo', 'try', 'test', 'play', 'fun'], a: "Try the mini-RAG demo further down — it runs real TF-IDF retrieval over his résumé in your browser and cites what it found.", link: ['Ask my résumé', '#rag'] },
    { k: ['thank', 'thanks', 'cool', 'nice', 'great', 'awesome', 'love'], a: `Anytime! If you'd like to talk to the real Manav: ${EMAIL}.` }
  ];
  const FALLBACK = { a: "I'm a scripted helper, so I only know the basics. Try asking about projects, stack, experience or availability — or email Manav directly.", link: ['Email Manav', 'mailto:' + EMAIL] };
  const SUGGEST = ['What do you build?', 'Are you available?', "What's your stack?", 'Best project?', 'How do I contact you?'];

  const answer = q => {
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
  panel.className = 'ask'; panel.setAttribute('aria-label', 'Ask Manav — scripted assistant'); panel.hidden = true;
  panel.innerHTML = '<header class="ask-head"><b class="ask-av" aria-hidden="true">MA</b><div><p>Ask Manav</p><span class="mono">scripted · answers from my résumé</span></div>'
    + '<button type="button" class="ask-x" aria-label="Close chat">×</button></header>'
    + '<ol class="ask-log" aria-live="polite" data-lenis-prevent></ol><div class="ask-sug"></div>'
    + '<form class="ask-form"><input type="text" maxlength="200" autocomplete="off" placeholder="Ask about projects, stack, availability…" aria-label="Your question"><button type="submit" aria-label="Send">↑</button></form>';
  document.body.append(fab, panel);
  const log = panel.querySelector('.ask-log'), sug = panel.querySelector('.ask-sug');
  const form = panel.querySelector('form'), input = form.querySelector('input');
  let busy = false, greeted = false;
  const queue = [];

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
  const reply = entry => {
    busy = true;
    const { li, p } = bubble('bot', '');
    li.classList.add('typing');
    const words = entry.a.split(' ');
    setTimeout(() => {
      li.classList.remove('typing');
      let i = 0;
      const tick = () => {
        p.textContent = words.slice(0, ++i).join(' ');
        log.scrollTop = log.scrollHeight;
        if (i < words.length) setTimeout(tick, reduced ? 0 : 22 + Math.random() * 26);
        else {
          if (entry.link) {
            const a = document.createElement('a');
            a.className = 'msg-link mono';
            a.href = entry.link[1];
            a.textContent = entry.link[0] + (entry.link[1].startsWith('#') ? ' ↓' : ' ↗');
            if (entry.link[1].endsWith('.pdf')) a.download = 'Manav_Aghera_Resume.pdf';
            if (entry.link[1].startsWith('#')) a.addEventListener('click', e => { e.preventDefault(); close(); if (MA.goTo) MA.goTo(entry.link[1]); });
            li.append(a);
          }
          busy = false;
          log.scrollTop = log.scrollHeight;
          if (queue.length) reply(queue.shift());
        }
      };
      tick();
    }, reduced ? 0 : 450 + Math.random() * 300);
  };
  const ask = q => {
    q = String(q).trim().slice(0, 200);
    if (!q) return;
    bubble('me', q);
    if (busy) queue.push(answer(q)); else reply(answer(q));
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
    if (!greeted) { greeted = true; reply({ a: "Hi — I'm Manav's assistant. I answer from his résumé, so ask me about his projects, stack or availability." }); }
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
})();
