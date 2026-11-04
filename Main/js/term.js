/**
 * Terminal mode — press ~ (or ` ) anywhere outside a text field, or run
 * "Open terminal" from Ctrl+K. A small fake shell: ls, cat, open, goto, theme,
 * neofetch, git log, sudo hire manav… with history (↑ ↓) and Tab completion.
 * Everything printed is plain text; links come from a fixed list.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const EMAIL = 'manavaghera@yahoo.com';
  const LINKS = {
    github: 'https://github.com/manavaghera', linkedin: 'https://www.linkedin.com/in/manavaghera', x: 'https://x.com/aghera_manav',
    chronus: 'https://github.com/manavaghera/CHRONUS', autonomouscontent: 'https://github.com/manavaghera/Multi-agent-blog',
    newssense: 'https://github.com/manavaghera/LLM-NEWS-', 'health-risk': 'https://github.com/manavaghera/Predicting-Student-Health-Risk', 'clip-studio': 'https://github.com/manavaghera/Twitch-Bulk-Downloader', dermalense: 'https://github.com/manavaghera/DERMALENSE.AI', 'mcp-playground': 'https://github.com/manavaghera/mcp-demo'
  };
  const PROJECTS = [['chronus', 'memory-grounded RAG research — local, deterministic'], ['autonomouscontent', 'research, writer + validator agents, posts score 82–89/100'], ['health-risk', 'gradient-boosting ensemble, 0.952 balanced accuracy, Kaggle top 1%'], ['newssense', 'AI news platform that fact-checks itself, 211 tests'], ['clip-studio', 'Twitch clips → captioned Shorts, Whisper + ffmpeg'], ['fasal-ai', 'offline crop-disease detection, Hindi + Gujarati voice'], ['dermalense', 'skin-health vision, inference in the tab'], ['mcp-playground', 'Model Context Protocol servers and tools']];
  const SECTIONS = ['top', 'about', 'now', 'build', 'work', 'services', 'stack', 'rag', 'lab', 'commits', 'research', 'awards', 'quotes', 'journey', 'contact'];
  const FILES = {
    'about.txt': 'Manav Aghera — AI/ML engineer from Vadodara, India.\nFinal-year B.Tech CS at Parul University. Builds RAG that stays grounded,\nagents that recover on their own, and vision small enough to run offline.',
    'skills.txt': 'languages   Python · TypeScript · JavaScript · SQL\nml          PyTorch · TensorFlow · TF Lite · scikit-learn · Hugging Face · YOLOv8 · Whisper · ONNX Runtime\nllm         LangChain · LangGraph · Llama 3 · Ollama · MCP\nretrieval   Sentence-BERT · ChromaDB\nship        FastAPI · Flask · React · Docker · MLflow · Git',
    'contact.txt': `email     ${EMAIL}\ngithub    github.com/manavaghera\nlinkedin  linkedin.com/in/manavaghera`,
    'resume.pdf': null
  };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const box = el('div', 'term-x');
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Terminal'); box.hidden = true;
  box.innerHTML = '<div class="term-x-bar mono"><i></i><i></i><i></i><span>manav@portfolio: ~</span><button type="button" aria-label="Close terminal">esc</button></div><div class="term-x-out mono" aria-live="polite"></div><form class="term-x-in mono"><label>manav@portfolio:~$</label><input autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Command"></form>';
  document.body.append(box);
  const out = box.querySelector('.term-x-out'), form = box.querySelector('form'), inp = box.querySelector('input');
  const print = (text, cls) => { out.append(el('pre', cls, text)); out.scrollTop = out.scrollHeight; };
  const link = (label, href) => { const p = el('pre'), a = el('a', null, label); a.href = href; if (/^https:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; } p.append(a); out.append(p); out.scrollTop = out.scrollHeight; };
  const go = id => { const t = document.getElementById(id); if (!t) return false; close(); if (MA.goTo) MA.goTo('#' + id); else t.scrollIntoView({ behavior: 'smooth' }); return true; };

  const CMDS = {
    help: () => print('commands\n  whoami · ls · cat <file> · projects · open <name> · goto <section>\n  skills · neofetch · git log · theme <lumora|field|light|dark>\n  achievements · play breaker · history · clear · exit\n  …and a few you\'ll have to guess.'),
    whoami: () => print('a visitor with good taste in portfolios'),
    ls: a => (a[0] === 'projects' ? CMDS.projects() : print('about.txt  skills.txt  contact.txt  resume.pdf  projects/')),
    cat: a => {
      const f = (a[0] || '').toLowerCase();
      if (!f) return print('usage: cat <file>');
      if (f === 'resume.pdf') { print('binary file — opening it instead'); link('↓ Manav_Aghera_Resume.pdf', 'Manav_Aghera_Resume.pdf'); return; }
      if (f in FILES) return print(FILES[f]);
      print(`cat: ${f.slice(0, 40)}: no such file`);
    },
    projects: () => print(PROJECTS.map(([n, d]) => `${n.padEnd(18)} ${d}`).join('\n') + '\n\nopen <name> to visit one'),
    open: a => { const n = (a[0] || '').toLowerCase(); if (LINKS[n]) { link(`→ ${LINKS[n]}`, LINKS[n]); window.open(LINKS[n], '_blank', 'noopener'); } else print(`open: try one of ${Object.keys(LINKS).join(', ')}`); },
    goto: a => { const s = (a[0] || '').toLowerCase().replace(/^#/, ''); if (!SECTIONS.includes(s) || !go(s)) print(`goto: sections are ${SECTIONS.join(', ')}`); },
    cd: a => CMDS.goto(a),
    skills: () => CMDS.cat(['skills.txt']),
    neofetch: () => print(`   __  __    _       manav@portfolio\n  |  \\/  |  / \\      ---------------\n  | |\\/| | / _ \\     role     AI/ML engineer\n  | |  | |/ ___ \\    based    Vadodara, India (IST)\n  |_|  |_/_/   \\_\\   kaggle   top 1%, twice\n                     certs    Anthropic · MCP + RAG\n                     theme    ${document.documentElement.dataset.palette || 'lumora'}\n                     tokens   ${MA.lifetime ? Math.round(MA.lifetime()).toLocaleString('en-US') : '10B+'} burned`),
    git: a => {
      if (a[0] !== 'log') return print('git: only "git log" works here');
      if (!MA.ghLoad) return print('git: offline');
      print('fetching…', 'dim');
      MA.ghLoad().then(d => { const c = (d && d.commits) || []; print(c.length ? c.slice(0, 6).map(x => `${x.sha}  ${x.msg}  (${x.repo})`).join('\n') : 'GitHub is rate-limiting this browser right now.'); }).catch(() => print('git: GitHub unreachable'));
    },
    theme: a => {
      const t = (a[0] || '').toLowerCase();
      if ((t === 'light' || t === 'dark') && MA.setTheme) { MA.setTheme(t); return print(`theme → ${t}`); }
      if ((t === 'lumora' || t === 'field') && MA.switchPalette) { print(`switching worlds → ${t}`); setTimeout(() => MA.switchPalette(t), 400); return; }
      print('usage: theme <lumora|field|light|dark>');
    },
    achievements: () => { const b = document.querySelector('.dock-ach'); print(b ? `${b.textContent.trim()} unlocked — opening the list` : 'no trophies here'); if (b) { close(); setTimeout(() => b.click(), 50); } },
    play: a => {
      const g = (a[0] || 'breaker').toLowerCase();
      if (g === 'breaker') { go('commits'); setTimeout(() => { const b = document.getElementById('heatPlay'); if (b) b.click(); }, 900); return; }
      print('usage: play breaker');
    },
    sudo: a => {
      if (a.join(' ').toLowerCase() === 'hire manav') {
        print('[sudo] password for visitor: ********\naccess granted. opening your mail app…', 'ok');
        if (MA.confetti) MA.confetti();
        if (MA.achieve) MA.achieve('hacker');
        setTimeout(() => { location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('sudo hire manav')}`; }, 1200);
      } else print('visitor is not in the sudoers file. This incident will be reported.', 'err');
    },
    rm: a => print(a.join(' ').includes('-rf') ? 'rm: refusing. this portfolio has backups — and feelings.' : 'rm: permission denied', 'err'),
    echo: a => print(a.join(' ').slice(0, 200)),
    date: () => print(new Date().toString()),
    coffee: () => print('418 I\'m a teapot. Try tea.'),
    history: () => print(hist.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join('\n') || '(empty)'),
    clear: () => { out.textContent = ''; },
    exit: () => close()
  };
  const hist = [];
  let hi = 0, opener = null;
  const run = line => {
    const parts = line.trim().split(/\s+/), cmd = (parts.shift() || '').toLowerCase();
    if (!cmd) return;
    print(`$ ${line}`, 'cmd');
    if (Object.prototype.hasOwnProperty.call(CMDS, cmd)) CMDS[cmd](parts);
    else print(`${cmd.slice(0, 30)}: command not found — try "help"`, 'err');
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const line = inp.value.slice(0, 200);
    inp.value = '';
    if (line.trim()) { hist.push(line); hi = hist.length; }
    run(line);
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hi > 0) { e.preventDefault(); inp.value = hist[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const [c, ...rest] = inp.value.split(' '), pool = rest.length ? [...Object.keys(FILES), ...Object.keys(LINKS), ...SECTIONS, 'log', 'lumora', 'field', 'light', 'dark', 'bot', 'quiz', 'race', 'breaker', 'hire', 'manav'] : Object.keys(CMDS);
      const w = rest.length ? rest[rest.length - 1] : c, hit = pool.filter(p => p.startsWith(w.toLowerCase()));
      if (hit.length === 1) inp.value = rest.length ? [c, ...rest.slice(0, -1), hit[0]].join(' ') + ' ' : hit[0] + ' ';
      else if (hit.length > 1) print(hit.join('  '), 'dim');
    } else if (e.key === 'Escape') close();
    else if (e.key.length === 1 && MA.sfx) MA.sfx('key');
  });
  box.querySelector('.term-x-bar button').addEventListener('click', () => close());
  const open = () => {
    if (MA.track) MA.track('play', 'terminal');
    if (!box.hidden) return;
    opener = document.activeElement;
    box.hidden = false;
    requestAnimationFrame(() => box.classList.add('on'));
    if (!out.childElementCount) print('Welcome to manav@portfolio. Type "help" to look around.', 'dim');
    setTimeout(() => inp.focus(), 60);
  };
  const close = () => {
    box.classList.remove('on');
    setTimeout(() => { box.hidden = true; }, 220);
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  };
  MA.term = open;
  addEventListener('keydown', e => {
    if ((e.key !== '~' && e.key !== '`') || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = document.activeElement;
    if (t && (/input|textarea|select/i.test(t.tagName) || t.isContentEditable)) return;
    e.preventDefault();
    if (box.hidden) open(); else close();
  });
})();
