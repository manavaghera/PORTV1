/**
 * Command palette — Ctrl/⌘ + K (or "/") to jump anywhere, run actions,
 * switch between dark and light, or find the easter eggs.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const EMAIL = 'manavaghera@yahoo.com';
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const btn = document.getElementById('cmdkBtn');
  if (btn) btn.textContent = mac ? '⌘K' : 'Ctrl K';
  const go = id => { if (MA.goTo) MA.goTo(id); else { const el = document.querySelector(id); if (el) el.scrollIntoView(); } };
  const open = url => window.open(url, '_blank', 'noopener');
  const say = m => MA.toast && MA.toast(m);
  const CMDS = [
    ['Go to', '↗', 'Home', 'top hero start', () => go('#top')],
    ['Go to', '↗', 'Manifesto', 'about attention', () => go('#about')],
    ['Go to', '↗', 'How I build', 'process pipeline', () => go('#build')],
    ['Go to', '↗', 'Selected work', 'projects work chronus', () => go('#work')],
    ['Go to', '↗', 'Right now', 'now current building', () => go('#now')],
    ['Go to', '↗', 'How I can help', 'services hire freelance', () => go('#services')],
    ['Go to', '↗', 'The stack', 'tools skills tech', () => go('#stack')],
    ['Go to', '↗', 'The arcade', 'games play bot jailbreak prompt injection hallucination quiz typing race', () => go('#arcade')],
    ['Fun', '▶', 'Play Break my bot', 'prompt injection jailbreak gandalf game', () => { go('#arcade'); setTimeout(() => { const t = document.getElementById('arcTabBot'); if (t) t.click(); }, 900); }],
    ['Fun', '>_', 'Open terminal', 'shell console terminal command line ~', () => { if (MA.term) setTimeout(MA.term, 60); }],
    ['Fun', '★', 'Achievements', 'trophies badges progress', () => { const b = document.querySelector('.dock-ach'); if (b) setTimeout(() => b.click(), 60); }],
    ['Go to', '↗', 'The lab', 'neural network deep learning generative ai llm sampling computer vision cnn', () => go('#lab')],
    ['Fun', '▶', 'Play Commit Breaker', 'game breakout github play', () => { go('#commits'); setTimeout(() => { const b = document.getElementById('heatPlay'); if (b) b.click(); }, 900); }],
    ['Go to', '↗', 'Commit log', 'github commits contributions', () => go('#commits')],
    ['Go to', '↗', 'Now researching', 'chronus research', () => go('#research')],
    ['Go to', '↗', 'Token burn', 'tokens furnace context', () => go('#tokens')],
    ['Go to', '↗', 'Journey', 'experience education timeline', () => go('#journey')],
    ['Go to', '↗', 'Contact', 'email hire talk', () => go('#contact')],
    ['Actions', '✦', 'Ask me anything', 'chat assistant question', () => { if (MA.chatOpen) MA.chatOpen(); }],
    ['Actions', '⌕', 'Ask my résumé (RAG demo)', 'rag retrieval search demo', () => go('#rag')],
    ['Actions', '@', 'Copy email address', 'mail contact', async () => { try { await navigator.clipboard.writeText(EMAIL); say('Email copied'); } catch (e) { say(EMAIL); } }],
    ['Actions', '✉', 'Write an email', 'mail contact hire', () => { location.href = `mailto:${EMAIL}`; }],
    ['Actions', '↓', 'Download résumé', 'cv resume pdf', () => { const a = document.createElement('a'); a.href = 'Manav_Aghera_Resume.pdf'; a.download = 'Manav_Aghera_Resume.pdf'; a.click(); }],
    ['Actions', '⌥', 'Open GitHub', 'code repos', () => open('https://github.com/manavaghera')],
    ['Actions', 'in', 'Open LinkedIn', 'profile', () => open('https://www.linkedin.com/in/manav-aghera')],
    ['Theme', '◐', 'Dark theme', 'theme dark night mode colour color', () => { if (MA.setTheme) MA.setTheme('dark'); say('Dark theme'); }],
    ['Theme', '◑', 'Light theme', 'theme light day mode colour color', () => { if (MA.setTheme) MA.setTheme('light'); say('Light theme'); }],
    ...['lumora', 'field'].map(p => ['Theme', '●', `Theme: ${p[0].toUpperCase() + p.slice(1)}`, 'palette theme colour color world ' + p, () => { if (MA.switchPalette) MA.switchPalette(p); }]),
    ['Fun', '$', 'sudo hire manav', 'hire job offer', () => {
      if (MA.confetti) MA.confetti();
      say('Permission granted. Opening your mail app…');
      setTimeout(() => { location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('sudo hire manav')}`; }, 1400);
    }],
    ['Fun', '◐', 'flash', 'camera photo exposure hero light', () => { go('#top'); setTimeout(() => dispatchEvent(new Event('leak:flash')), 500); say('Flash fired. Developing…'); }],
    ['Fun', '$', 'rm -rf bugs', 'delete', () => say('rm: bugs: No such file or directory ✓')],
    ['Fun', '$', 'whoami', 'about', () => say('AI/ML engineer · Vadodara, India · open to roles')]
  ];

  const wrap = document.createElement('div');
  wrap.className = 'cmdk';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', 'Command palette');
  wrap.innerHTML = '<div class="cmdk-box"><div class="cmdk-in"><span aria-hidden="true">›</span>'
    + '<input type="text" placeholder="Type a command or search…" aria-label="Command" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="cmdkList">'
    + '<kbd>esc</kbd></div><ul class="cmdk-list" id="cmdkList" role="listbox" data-lenis-prevent></ul>'
    + '<p class="cmdk-foot mono">↑ ↓ to move · ↵ to run · try “sudo hire manav”</p></div>';
  document.body.append(wrap);
  const input = wrap.querySelector('input'), list = wrap.querySelector('ul');
  let shown = [], sel = 0, isOpen = false, lastFocus = null;

  const mark = () => {
    list.querySelectorAll('.it').forEach((li, i) => { li.classList.toggle('sel', i === sel); li.setAttribute('aria-selected', String(i === sel)); });
    input.setAttribute('aria-activedescendant', 'cmdk-i-' + sel);
    const el = list.querySelector('.it.sel');
    if (el) el.scrollIntoView({ block: 'nearest' });
  };
  const render = () => {
    const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    shown = CMDS.filter(c => { const hay = (c[2] + ' ' + c[3] + ' ' + c[0]).toLowerCase(); return words.every(w => hay.includes(w)); });
    list.textContent = '';
    if (!shown.length) {
      const li = document.createElement('li');
      li.className = 'none';
      li.textContent = 'No match — try “work”, “github” or “magma”.';
      list.append(li);
      return;
    }
    let g = '';
    shown.forEach((c, i) => {
      if (c[0] !== g) {
        g = c[0];
        const h = document.createElement('li');
        h.className = 'grp'; h.setAttribute('role', 'presentation'); h.textContent = g;
        list.append(h);
      }
      const li = document.createElement('li'), ic = document.createElement('i'), t = document.createElement('span');
      li.className = 'it'; li.id = 'cmdk-i-' + i; li.setAttribute('role', 'option');
      ic.textContent = c[1]; t.textContent = c[2];
      li.append(ic, t);
      if (c[0] === 'Go to') { const s = document.createElement('small'); s.textContent = 'jump'; li.append(s); }
      li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; mark(); } });
      li.addEventListener('click', () => run(i));
      list.append(li);
    });
    mark();
  };
  const show = MA.cmdk = () => {
    if (isOpen) return;
    isOpen = true;
    lastFocus = document.activeElement;
    input.value = ''; sel = 0;
    render();
    wrap.classList.add('open');
    if (MA.lenis) MA.lenis.stop();
    setTimeout(() => input.focus(), 30);
  };
  const hide = () => {
    if (!isOpen) return;
    isOpen = false;
    wrap.classList.remove('open');
    if (MA.lenis) MA.lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  };
  const run = i => { const c = shown[i]; if (!c) return; hide(); setTimeout(c[4], 60); };

  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); hide(); }
    else if (e.key === 'Tab') e.preventDefault();
  });
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) hide(); });
  addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); isOpen ? hide() : show(); }
    else if (e.key === '/' && !isOpen && !typing) { e.preventDefault(); show(); }
  });
  if (btn) btn.addEventListener('click', show);
})();
