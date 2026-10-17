/**
 * Achievements — the whole site as a game. Other scripts call
 * MA.achieve('id'); unlocks are kept in localStorage, announced with a small
 * toast, and listed behind a trophy in the dock. Unlock every one and a
 * secret note appears. Also listens for the Konami code and the page's end.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const KEY = 'ma-ach';
  const LIST = [
    ['trainer', 'Backprop', 'Train the neural network until it converges', 'the lab'],
    ['sampler', 'Next token', 'Generate a whole sentence with the sampler', 'the lab'],
    ['vision', 'Feature map', 'Draw something for the convolution', 'the lab'],
    ['reader', 'Legible', 'Get the digit reader to 90% sure', 'the lab'],
    ['analogy', 'King − man + woman', 'Do maths with words', 'the lab'],
    ['jailbreak', 'Jailbreaker', 'Get Warden\'s first password', 'the arcade'],
    ['redteam', 'Red team', 'Beat all five of Warden\'s levels', 'the arcade'],
    ['factcheck', 'Fact-checker', 'Score 8 or more on Hallucination or fact?', 'the arcade'],
    ['racer', 'Human baseline', 'Finish a race against the models', 'the arcade'],
    ['breaker', 'git reset --hard', 'Break 25 commit days in Commit Breaker', 'the commit log'],
    ['worlds', 'Two worlds', 'Switch between Lumora and Field', 'the theme switch'],
    ['hacker', 'sudo', 'Run sudo hire manav in the terminal', 'press ~'],
    ['pilot', 'Paper plane', 'Send a message from the contact form', 'the footer'],
    ['catch', 'Lepidopterist', 'Catch the butterfly', 'it lands on things'],
    ['konami', '↑↑↓↓←→←→BA', 'You know the code', 'old habits'],
    ['explorer', 'Scroll to the end', 'Reach the bottom of the page', 'keep going']
  ];
  const IDS = LIST.map(x => x[0]);
  let got = [];
  try { const s = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(s)) got = s.filter(x => IDS.includes(x)); } catch (e) { /* fresh start */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(got)); } catch (e) { /* this visit only */ } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ── the trophy in the dock, and its list ── */
  const dock = document.getElementById('dock');
  const btn = el('button', 'dock-ach mono');
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v3a5 5 0 0 1-10 0V4Zm10 1h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3m3 4h4m-2-2v4m-4 4h8"/></svg><b></b>';
  if (dock) dock.append(btn);
  const box = el('div', 'ach-box');
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Achievements'); box.hidden = true;
  document.body.append(box);
  const count = () => { btn.querySelector('b').textContent = `${got.length}/${LIST.length}`; btn.setAttribute('aria-label', `Achievements: ${got.length} of ${LIST.length} unlocked`); };
  const render = () => {
    box.textContent = '';
    const head = el('div', 'ach-head');
    head.append(el('b', null, 'Achievements'), el('span', 'mono', `${got.length} of ${LIST.length}`));
    const ul = el('ul', 'ach-list');
    LIST.forEach(([id, name, how, where]) => {
      const on = got.includes(id), li = el('li', on ? 'on' : '');
      li.append(el('i', null, on ? '★' : '·'), el('b', null, on ? name : '???'), el('span', null, on ? how : `Hint: ${where}`));
      ul.append(li);
    });
    box.append(head, ul);
    if (got.length === LIST.length) {
      const sec = el('div', 'ach-secret');
      sec.append(el('b', null, 'You found everything.'), el('p', null, 'Most people never scroll past the hero. You trained a network, broke a bot and caught a butterfly. Write to me with the subject “16 of 16” and your email goes to the top of the pile — and I owe you a coffee.'));
      const a = el('a', 'btn btn-primary', 'Claim it →');
      a.href = 'mailto:manavaghera@yahoo.com?subject=' + encodeURIComponent('16 of 16');
      sec.append(a);
      box.append(sec);
    }
  };
  const open = v => { box.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) render(); };
  btn.addEventListener('click', e => { e.stopPropagation(); open(box.hidden); });
  document.addEventListener('click', e => { if (!box.hidden && !box.contains(e.target)) open(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) open(false); });

  /* ── unlocking ── */
  const toastBox = el('div', 'ach-toast');
  toastBox.setAttribute('role', 'status'); toastBox.setAttribute('aria-live', 'polite');
  document.body.append(toastBox);
  let tt;
  MA.achieve = id => {
    if (!IDS.includes(id) || got.includes(id)) return;
    got.push(id); save(); count();
    const [, name, how] = LIST.find(x => x[0] === id);
    toastBox.textContent = '';
    toastBox.append(el('i', null, '★'), el('span', 'mono', 'achievement unlocked'), el('b', null, name), el('small', null, how));
    toastBox.classList.remove('on'); void toastBox.offsetWidth; toastBox.classList.add('on');
    clearTimeout(tt); tt = setTimeout(() => toastBox.classList.remove('on'), 3600);
    btn.classList.add('pop'); setTimeout(() => btn.classList.remove('pop'), 900);
    if (MA.sfx) MA.sfx('win');
    if (got.length === LIST.length) setTimeout(() => { if (MA.confetti) MA.confetti(); open(true); }, 1200);
    if (!box.hidden) render();
  };
  count();

  /* ── a few that belong to no one else ── */
  const K = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let k = 0;
  addEventListener('keydown', e => {
    k = e.key === K[k] || e.key.toLowerCase() === K[k] ? k + 1 : e.key === K[0] ? 1 : 0;
    if (k === K.length) { k = 0; if (MA.confetti) MA.confetti(); MA.achieve('konami'); }
  });
  const foot = document.querySelector('.foot-meta');
  if (foot) new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { o.disconnect(); MA.achieve('explorer'); } })).observe(foot);
})();
