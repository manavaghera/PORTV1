/**
 * Kind words — testimonials people leave themselves. The wall loads the
 * published ones from /api/kind-words; "Leave a few words" opens a form that
 * posts there, and each post waits for approval on /admin. Until the first real
 * words are approved, the wall is just an invitation — no placeholder quotes.
 * Without the backend the form offers email instead.
 */
(() => {
  'use strict';
  const wall = document.getElementById('quoteWall');
  if (!wall) return;
  const MA = window.MA = window.MA || {};
  const EMAIL = 'manavaghera@yahoo.com';
  const REL = { mentor: 'Mentor', teacher: 'Teacher', teammate: 'Teammate', classmate: 'Classmate', colleague: 'Colleague', client: 'Client', friend: 'Friend', other: 'Other' };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const reveal = (node, i) => { node.dataset.reveal = ''; node.style.setProperty('--d', (i * .06) + 's'); if (MA.observe) MA.observe(node); else node.classList.add('in'); };

  /* ── the wall ── */
  const card = (q, name, role, rel, cls) => {
    const f = el('figure', 'quote' + (cls ? ' ' + cls : ''));
    if (rel && REL[rel]) f.append(el('span', 'qrel mono', REL[rel]));
    const cap = el('figcaption');
    if (name) cap.append(el('b', null, name));
    if (role) cap.append(role);
    f.append(el('blockquote', null, q), cap);
    return f;
  };
  const askCard = few => {
    const c = card(few ? 'Worked with me? I\'d love to hear from you too.' : 'Worked with me? I\'m collecting a few honest words from mentors, teachers and teammates.', null, 'They appear here once I\'ve read them.', null, 'ask-q');
    const btn = el('button', 'btn', 'Leave a few words →');
    btn.type = 'button';
    btn.addEventListener('click', open);
    c.insertBefore(btn, c.querySelector('figcaption'));
    return c;
  };
  const render = items => {
    wall.textContent = '';
    wall.classList.toggle('empty', !items.length);
    const intro = document.querySelector('#quotes .sec-head > p');
    if (!items.length && intro) intro.textContent = document.documentElement.dataset.palette === 'field'
      ? 'Worked with me and lived to tell? This wall is waiting for its first words.'
      : 'Worked with me — as a mentor, teacher or teammate? This wall is waiting for its first words.';
    const cards = items.map(k => card(k.message, k.name, k.role, k.relation));
    cards.push(askCard(items.length > 0));
    cards.forEach((c, i) => { wall.append(c); reveal(c, i); });
  };
  fetch('/api/kind-words', { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : null))
    .then(d => render(d && Array.isArray(d.items) ? d.items.filter(k => k && typeof k.message === 'string' && typeof k.name === 'string') : []))
    .catch(() => render([]));

  /* ── the form, in a native dialog ── */
  const dlg = el('dialog', 'kind-dlg');
  dlg.setAttribute('aria-labelledby', 'kindH');
  dlg.innerHTML = `
    <form class="kind-form" novalidate>
      <button type="button" class="kind-x mono" data-k="close" aria-label="Close">esc</button>
      <h3 id="kindH">Leave a few <em>words</em></h3>
      <p class="kind-sub">They go to Manav first and appear on the site once he's read them.</p>
      <div class="kind-two">
        <label class="mono">Your name<input name="name" maxlength="60" autocomplete="name" required></label>
        <label class="mono">Email <small>only Manav sees it</small><input name="email" type="email" maxlength="120" autocomplete="email" required></label>
      </div>
      <fieldset class="kind-rel"><legend class="mono">How do you know him?</legend>
        ${Object.entries(REL).map(([v, t]) => `<label><input type="radio" name="relation" value="${v}" required><span>${t}</span></label>`).join('')}
      </fieldset>
      <label class="mono">Your role <small>optional — e.g. “Professor, Parul University”</small><input name="role" maxlength="80" autocomplete="organization-title"></label>
      <label class="mono">Your words<textarea name="message" rows="4" maxlength="600" required></textarea><small class="kind-count">0 / 600</small></label>
      <label class="kind-hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
      <p class="kind-err mono" role="alert"></p>
      <button class="btn btn-primary" type="submit">Send to Manav →</button>
    </form>
    <div class="kind-done" hidden><h3>Thank <em>you</em></h3><p>Your words are with Manav now — they'll appear here once he's read them.</p><button type="button" class="btn btn-ghost" data-k="close">Close</button></div>`;
  document.body.append(dlg);
  const form = dlg.querySelector('form'), done = dlg.querySelector('.kind-done'), errEl = dlg.querySelector('.kind-err'), count = dlg.querySelector('.kind-count');
  let opened = 0;
  function open() {
    form.hidden = false; done.hidden = true; errEl.textContent = '';
    opened = Date.now();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(() => form.elements.namedItem('name').focus(), 50);
  }
  const close = () => { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
  dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-k="close"]')) close(); });
  form.elements.namedItem('message').addEventListener('input', e => { count.textContent = `${e.target.value.length} / 600`; });
  let typoOk = '';
  const fail = (msg, fallback) => {
    errEl.textContent = msg + ' ';
    if (fallback) {
      const a = el('a', null, 'Email it →'), copy = el('button', null, 'or copy it');
      a.href = `mailto:${EMAIL}?subject=${encodeURIComponent('A few words for your portfolio')}&body=${encodeURIComponent(fallback)}`;
      copy.type = 'button';
      copy.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(fallback); copy.textContent = `copied — paste it into an email to ${EMAIL}`; }
        catch (e) { copy.textContent = EMAIL; }
      });
      errEl.append(a, copy);
    }
  };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const v = n => String(form.elements.namedItem(n).value || '').trim();
    const rel = form.querySelector('input[name="relation"]:checked');
    const body = { name: v('name'), email: v('email'), relation: rel ? rel.value : '', role: v('role'), message: v('message'), website: v('website'), t: Date.now() - opened };
    if (body.name.length < 2) return fail('Please add your name.');
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(body.email)) return fail('Please add a valid email — only Manav sees it.');
    if (!body.relation) return fail('Please pick how you know Manav.');
    if (body.message.length < 20) return fail('A few more words, please (20 characters at least).');
    const fix = MA.emailTypo && MA.emailTypo(body.email);
    if (fix && typoOk !== body.email) {
      typoOk = body.email;
      errEl.textContent = `Did you mean ${fix}? `;
      const use = el('button', null, 'use it');
      use.type = 'button';
      use.addEventListener('click', () => { form.elements.namedItem('email').value = fix; errEl.textContent = ''; });
      errEl.append(use, ' · or press Send again to keep yours');
      return;
    }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; errEl.textContent = '';
    const letter = `${body.message}\n\n— ${body.name}${body.role ? ', ' + body.role : ''} (${REL[body.relation]})`;
    try {
      const r = await fetch('/api/kind-words', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { form.reset(); count.textContent = '0 / 600'; form.hidden = true; done.hidden = false; if (MA.confetti) MA.confetti(); return; }
      if (r.status === 400 || r.status === 429) fail(j.error || 'Please check the form.');
      else fail('This can\'t be sent from here right now.', letter);
    } catch (x) { fail('This can\'t be sent from here right now.', letter); }
    finally { btn.disabled = false; }
  });
})();
