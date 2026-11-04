/**
 * Two content blocks rendered from data:
 *  · Right now — a bento board; the last commit, today's tokens and local time are live.
 *  · How I can help — service rows that flood with the accent and open to show details.
 * (Kind words — the testimonials — live in kind.js.)
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const MA = window.MA = window.MA || {};
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const reveal = (node, i) => { node.dataset.reveal = ''; node.style.setProperty('--d', (i * .06) + 's'); if (MA.observe) MA.observe(node); else node.classList.add('in'); };

  /* ── right now ── */
  const nowGrid = $('nowGrid');
  if (nowGrid) {
    const NOW = [
      { k: 'Building', t: 'CHRONUS', d: 'Phase 2: encrypted search, built on a document-search core that runs fully on your own machine.', cls: 'wide lead', href: '#research' },
      { k: 'Researching', t: 'Memory & agents', d: 'How AI can remember things over time, and where AI agents are heading next.' },
      { k: 'Local time', live: 'time' },
      { k: 'Last commit', live: 'commit', cls: 'wide', href: '#commits' },
      { k: 'Just finished', t: 'Stanford CS230', d: "Deep learning, plus DeepLearning.AI's course on fine-tuning LLMs with GRPO.", href: '#awards' },
      { k: 'Open to', t: 'ML & AI internships', d: "Engineer internships or trainee roles: applied ML, RAG, agents. Let's talk.", href: '#contact' },
      { k: 'Studying', t: 'B.Tech CS · final year', d: 'Parul University, Vadodara — graduating 2027.', cls: 'wide' },
      { k: 'Certified', t: 'MCP & RAG', d: 'Anthropic Academy — both courses, hands-on.', cls: 'wide', href: '#awards' }
    ];
    const live = {};
    NOW.forEach((n, i) => {
      const card = el('article', 'now-card' + (n.cls ? ' ' + n.cls : '') + (n.live ? ' live' : ''));
      const k = el('p', 'now-k');
      k.append(el('i'), n.k);
      card.append(k);
      if (n.live) {
        const big = el('p', 'now-big', '—'), sub = el('p', 'now-d', '');
        card.append(big, sub);
        live[n.live] = { big, sub };
      } else card.append(el('p', 'now-t', n.t), el('p', 'now-d', n.d));
      if (n.href) {
        const a = el('a', 'now-go');
        a.href = n.href;
        a.setAttribute('aria-label', `${n.k}: open section`);
        card.append(a);
      }
      nowGrid.append(card);
      reveal(card, i);
    });
    const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const hourIST = () => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date())) % 24;
    const mood = h => (h < 7 ? 'probably asleep — or training a model' : h < 10 ? 'coffee and the inbox' : h < 19 ? 'deep work hours' : 'building side projects');
    const tickNow = () => {
      if (live.time) { live.time.big.textContent = time.format(new Date()); live.time.sub.textContent = `Vadodara, IST · ${mood(hourIST())}`; }
    };
    tickNow();
    setInterval(tickNow, 1000);
    if (live.commit) {
      live.commit.sub.textContent = 'fetching from GitHub…';
      const once = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting || !MA.ghLoad) return;
        once.disconnect();
        MA.ghLoad().then(d => {
          const c = d && d.commits && d.commits[0];
          if (!c) { live.commit.big.textContent = 'github'; live.commit.sub.textContent = 'see the live commit log below'; return; }
          live.commit.big.textContent = c.sha;
          live.commit.big.style.color = 'var(--k4)';
          const ago = Date.now() - Date.parse(c.date), h = Math.round(ago / 36e5);
          live.commit.sub.textContent = `${c.msg} — ${c.repo}, ${h < 1 ? 'just now' : h < 48 ? h + 'h ago' : Math.round(h / 24) + 'd ago'}`;
        }).catch(() => { live.commit.sub.textContent = 'GitHub is unreachable right now'; });
      }));
      once.observe(nowGrid);
    }
  }

  /* ── how I can help ── */
  const svcList = $('svcList');
  if (svcList) {
    const SVC = [
      { t: 'RAG & knowledge assistants', d: "A chat assistant that knows your documents inside out — and shows its sources. When it doesn't know, it says so instead of making things up.", get: ['Your documents prepared and indexed', 'Search tuned until answers are right', 'Accuracy tested before launch'], stack: 'LangChain · Sentence-BERT · ChromaDB · FastAPI', proof: 'Proof: CHRONUS' },
      { t: 'AI agents & automation', d: 'AI agents that take a multi-step job off your plate — research, write, check, publish — and recover on their own when a step fails.', get: ['Agent workflows mapped to your process', 'Safe tool use with guardrails', 'Fallbacks and monitoring built in'], stack: 'LangGraph · Llama 3 · Ollama', proof: 'Proof: AutonomousContent — 78.7/100 avg.' },
      { t: 'Computer vision & edge AI', d: 'Models that spot what matters in an image or video, shrunk to run offline on budget phones or straight in a browser.', get: ['Data collection and training', 'Compressed for phones and browsers', 'Runs on-device — no cloud bill'], stack: 'YOLOv8 · TensorFlow Lite · ONNX Runtime', proof: 'Proof: Fasal AI · DermaLense.AI' },
      { t: 'MCP servers & integrations', d: 'Give your AI assistant real hands: connect it to your tools, files and data through MCP servers.', get: ['Custom servers for your tools', 'Safe, permissioned actions', 'Plugged into the assistant you use'], stack: 'MCP · Python · TypeScript', proof: 'Anthropic Academy certified' },
      { t: 'Frontier R&D', d: 'Research-grade work on AI memory, neural networks and smarter agents — the open questions on the way to more general AI.', get: ['Prototypes backed by the papers', 'Benchmarks you can trust', 'Write-ups you can build on'], stack: 'PyTorch · Qiskit · PennyLane', proof: 'See: the CHRONUS roadmap' }
    ];
    const rows = SVC.map((s, i) => {
      const li = el('li', 'svc');
      const head = el('button', 'svc-head');
      head.type = 'button';
      head.setAttribute('aria-expanded', 'false');
      head.append(el('span', 'svc-n', String(i + 1).padStart(2, '0')), el('span', 'svc-t', s.t), el('span', 'svc-x', '+'));
      const body = el('div', 'svc-body'), inner = el('div', 'svc-in'), get = el('ul', 'svc-get'), meta = el('p', 'svc-meta');
      s.get.forEach(g => get.append(el('li', null, g)));
      const cta = el('a', 'svc-cta', 'Start a project →');
      cta.href = '#contact';
      cta.addEventListener('click', () => { if (MA.prefill) MA.prefill(`Hi Manav — I'd like to talk about ${s.t.toLowerCase()}. `); });
      meta.append(el('span', null, s.stack), el('span', null, s.proof), cta);
      inner.append(el('p', 'svc-d', s.d), get, meta);
      body.append(inner);
      li.append(head, body);
      svcList.append(li);
      reveal(li, i);
      return { li, head };
    });
    const open = i => rows.forEach((r, k) => { const on = k === i && !r.li.classList.contains('open'); r.li.classList.toggle('open', on); r.head.setAttribute('aria-expanded', String(on)); });
    rows.forEach((r, i) => r.head.addEventListener('click', () => open(i)));
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) rows.forEach((r, i) => r.li.addEventListener('mouseenter', () => { if (!r.li.classList.contains('open')) open(i); }));
    open(0);
  }
})();
