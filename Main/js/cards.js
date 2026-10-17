/**
 * Trophy shelf — awards and certifications as foil cards that tilt toward the
 * cursor with a moving glare, and flip over to show the details.
 */
(() => {
  'use strict';
  const grid = document.getElementById('awardGrid');
  if (!grid) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GH = 'https://github.com/manavaghera/';
  const AWARDS = [
    { tag: 'Kaggle', big: '1%', title: 'Autonomous Agent Prediction', meta: 'Top 1% · 570 teams', back: 'Finished in the top 1% of 570 teams in a Kaggle competition on predicting autonomous-agent outcomes.', link: ['Notebook & code', GH + 'Autonomous-Agent-Kaggle'] },
    { tag: 'Kaggle', big: '1%', title: 'Student Health Risk · S6E7', meta: 'Top 1% · 3,355 teams', back: 'Top 1% of 3,355 teams in Kaggle Playground Series S6E7, predicting student health risk.', link: ['Notebook & code', GH + 'Predicting-Student-Health-Risk'] },
    { tag: 'Anthropic Academy', big: 'MCP', title: 'MCP & RAG', meta: 'Certified · two courses', back: 'Certified in the Model Context Protocol and retrieval-augmented generation — the same grounding ideas that power CHRONUS.', link: ['MCP playground', GH + 'mcp-demo'] },
    { tag: 'JPMorgan Chase', big: 'JPM', title: 'Software Engineering', meta: 'Forage job simulation', back: "Completed JPMorgan Chase's software engineering job simulation on Forage." },
    { tag: 'GDSC', big: 'OSS', title: 'Open-source contributor', meta: 'Google Developer Student Clubs', back: 'Contributed to open-source projects through Google Developer Student Clubs.' },
    { tag: 'Your company', big: '?', title: 'The next card', meta: 'Open to AI/ML roles', back: "This slot is open. If you're building something that has to hold up in production, let's talk.", link: ['Get in touch', '#contact'], cta: true }
  ];

  AWARDS.forEach((a, i) => {
    const card = document.createElement('div');
    card.className = 'award' + (a.cta ? ' cta' : '');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', `${a.tag}: ${a.title}, ${a.meta}. Press to flip.`);
    const no = String(i + 1).padStart(2, '0');
    card.innerHTML = `<div class="award-in"><div class="face front"><i class="foil" aria-hidden="true"></i><p class="a-top mono"><span></span><span>№ ${no}</span></p><b class="a-big"></b><p class="a-title"></p><p class="a-meta mono"></p></div>`
      + `<div class="face back"><p class="a-top mono"><span></span><span>№ ${no}</span></p><p class="a-back"></p></div></div>`;
    const [tagF, tagB] = card.querySelectorAll('.a-top span:first-child');
    tagF.textContent = tagB.textContent = a.tag;
    card.querySelector('.a-big').textContent = a.big;
    card.querySelector('.a-title').textContent = a.title;
    card.querySelector('.a-meta').textContent = a.meta;
    card.querySelector('.a-back').textContent = a.back;
    if (a.link) {
      const l = document.createElement('a');
      l.className = 'a-link mono';
      l.href = a.link[1];
      l.textContent = a.link[0] + (a.link[1].startsWith('#') ? ' ↓' : ' ↗');
      if (!a.link[1].startsWith('#')) { l.target = '_blank'; l.rel = 'noopener'; }
      l.addEventListener('click', e => e.stopPropagation());
      card.querySelector('.back').append(l);
    }
    const flip = () => {
      const on = !card.classList.contains('flipped');
      card.classList.toggle('flipped', on);
      card.setAttribute('aria-pressed', String(on));
    };
    card.addEventListener('click', flip);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    if (!reduced) {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--rx', ((.5 - y) * 16).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((x - .5) * 20).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    }
    card.dataset.reveal = '';
    card.style.setProperty('--d', (i * .07) + 's');
    grid.append(card);
    if (window.MA && MA.observe) MA.observe(card); else card.classList.add('in');
  });
})();
