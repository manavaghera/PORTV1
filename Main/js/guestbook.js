/**
 * Guestbook — under the kind words, a place for anyone passing through to sign:
 * a name, where they're from, a line or two. Notes post to /api/guestbook and
 * appear once approved on /admin. Everything is rendered as text.
 */
(() => {
  'use strict';
  const host = document.querySelector('#quotes .container');
  if (!host) return;
  const MA = window.MA = window.MA || {};
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ago = t => {
    const d = Math.max(0, (Date.now() - t) / 86400000);
    return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 30 ? `${Math.floor(d)} days ago` : new Date(t).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  const box = el('div', 'gb');
  box.setAttribute('role', 'region');
  box.setAttribute('aria-labelledby', 'gbH');
  box.innerHTML = `
    <div class="gb-side">
      <h3 id="gbH">The <em>guestbook</em></h3>
      <p>Passing through? Sign it. A hello, where you're reading from, what you liked — anything goes. Notes show up once I've read them.</p>
      <form class="gb-form" novalidate>
        <div class="gb-two"><label class="mono"><span>Name</span><input name="name" maxlength="40" autocomplete="nickname" required></label>
        <label class="mono"><span>From <small>· optional</small></span><input name="from" maxlength="40" placeholder="City, country"></label></div>
        <label class="mono"><span>Your note</span><textarea name="message" rows="3" maxlength="280" required></textarea><small class="gb-count">0 / 280</small></label>
        <label class="kind-hp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
        <div class="gb-foot"><button class="btn btn-primary" type="submit">Sign the guestbook</button><p class="gb-msg mono" role="status"></p></div>
      </form>
    </div>
    <div class="gb-wall"><ol class="gb-notes" aria-label="Notes from visitors"></ol></div>`;
  host.append(box);
  const form = box.querySelector('form'), msg = box.querySelector('.gb-msg'), list = box.querySelector('.gb-notes'), count = box.querySelector('.gb-count');
  if (MA.observe) { box.dataset.reveal = ''; MA.observe(box); }

  const note = (n, mine) => {
    const li = el('li', 'gb-note' + (mine ? ' mine' : ''));
    li.append(el('p', null, n.message));
    const by = el('p', 'gb-by mono');
    by.append(el('b', null, n.name), n.from ? ` · ${n.from}` : '', ` · ${mine ? 'waiting for Manav to read it' : ago(n.at)}`);
    li.append(by);
    return li;
  };
  const mine = [];
  const render = items => {
    list.textContent = '';
    mine.forEach(n => list.append(note(n, true)));
    if (!items.length && !mine.length) { list.append(el('li', 'gb-empty mono', 'No notes yet — be the first to sign.')); return; }
    items.slice(0, 12).forEach(n => list.append(note(n)));
    if (items.length > 12) {
      const more = el('button', 'gb-more mono', `Show all ${items.length} notes`);
      more.type = 'button';
      more.addEventListener('click', () => { more.remove(); items.slice(12).forEach(n => list.append(note(n))); });
      list.after(more);
    }
  };
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    fetch('/api/guestbook', { headers: { Accept: 'application/json' } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => render(d && Array.isArray(d.items) ? d.items.filter(n => n && typeof n.message === 'string' && typeof n.name === 'string') : []))
      .catch(() => render([]));
  };
  new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { o.disconnect(); load(); } }, { rootMargin: '400px' }).observe(box);

  const opened = Date.now();
  form.elements.namedItem('message').addEventListener('input', e => { count.textContent = `${e.target.value.length} / 280`; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const v = n => String(form.elements.namedItem(n).value || '').trim();
    const body = { name: v('name'), from: v('from'), message: v('message'), website: v('website'), t: Date.now() - opened };
    msg.classList.remove('bad');
    if (body.name.length < 2) { msg.classList.add('bad'); msg.textContent = 'Sign with a name, please.'; return; }
    if (body.message.length < 3) { msg.classList.add('bad'); msg.textContent = 'Write a little something first.'; return; }
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; msg.textContent = 'Signing…';
    try {
      const r = await fetch('/api/guestbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'The guestbook is closed right now — try again later.');
      form.reset(); count.textContent = '0 / 280';
      msg.textContent = 'Signed — thank you! It appears once Manav has read it.';
      list.querySelector('.gb-empty')?.remove();
      mine.unshift(body);
      list.prepend(note(body, true));
      if (MA.track) MA.track('play', 'guestbook');
      if (MA.sfx) MA.sfx('win');
    } catch (x) {
      msg.classList.add('bad');
      msg.textContent = x instanceof TypeError ? 'The guestbook is closed right now — try again later.' : x.message;
    } finally { btn.disabled = false; }
  });
})();
