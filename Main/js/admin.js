/**
 * /admin — sign in with the admin ID and password (checked on the server),
 * then review kind words: approve, unpublish, delete, or change the category,
 * and read or delete contact messages. Everything shown is set as text.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const login = $('admLogin'), dash = $('admDash'), list = $('admList'), note = $('admNote'), err = $('admErr'), out = $('admOut');
  const LABEL = { mentor: 'Mentor', teacher: 'Teacher', teammate: 'Teammate', classmate: 'Classmate', colleague: 'Colleague', client: 'Client', friend: 'Friend', other: 'Other' };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const when = t => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  let data = null, tab = 'pending';

  const api = async (method, body) => {
    const r = await fetch('/api/admin', { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-MA-Admin': '1' }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || `Request failed (${r.status})`), { status: r.status });
    return j;
  };
  const show = view => { login.hidden = view !== 'login'; dash.hidden = view !== 'dash'; out.hidden = view !== 'dash'; };
  const say = (msg, bad) => { note.textContent = msg; note.hidden = !msg; note.classList.toggle('bad', !!bad); if (msg && !bad) setTimeout(() => { if (note.textContent === msg) note.hidden = true; }, 2600); };

  const load = async () => {
    try {
      data = await api('GET');
      show('dash'); render();
    } catch (e) {
      if (e.status === 401) { show('login'); return; }
      show('login');
      say(e.status === 503 ? 'The backend is not set up yet — add the environment variables on Vercel (see .env.example).' : e.message, true);
    }
  };
  const act = async (body, done) => {
    try { await api('POST', body); if (done) say(done); await load(); }
    catch (e) { if (e.status === 401) { show('login'); return; } say(e.message, true); }
  };

  /* ── one card per item ── */
  const kindCard = k => {
    const li = el('li', 'adm-item');
    const head = el('div', 'adm-head');
    head.append(el('b', null, k.name));
    const sel = el('select', 'mono');
    sel.setAttribute('aria-label', `Category for ${k.name}`);
    Object.entries(LABEL).forEach(([v, t]) => { const o = el('option', null, t); o.value = v; o.selected = v === k.relation; sel.append(o); });
    sel.addEventListener('change', () => act({ action: 'relation', id: k.id, relation: sel.value }, 'Category updated.'));
    head.append(sel);
    const meta = el('p', 'adm-meta mono');
    if (k.role) meta.append(el('span', null, k.role));
    const mail = el('a', null, k.email);
    mail.href = 'mailto:' + encodeURIComponent(k.email).replace(/%40/g, '@');
    meta.append(mail, el('span', null, when(k.at)));
    const btns = el('div', 'adm-btns');
    const toggle = el('button', 'btn ' + (k.status === 'published' ? 'btn-ghost' : 'btn-primary'), k.status === 'published' ? 'Unpublish' : 'Approve & publish');
    toggle.type = 'button';
    toggle.addEventListener('click', () => act({ action: k.status === 'published' ? 'unpublish' : 'approve', id: k.id }, k.status === 'published' ? 'Moved back to waiting.' : 'Published — it is live on the site.'));
    const del = el('button', 'btn btn-ghost adm-del', 'Delete');
    del.type = 'button';
    del.addEventListener('click', () => { if (confirm(`Delete the kind words from ${k.name}? This can't be undone.`)) act({ action: 'delete', id: k.id }, 'Deleted.'); });
    btns.append(toggle, del);
    li.append(head, meta, el('blockquote', null, k.message), btns);
    return li;
  };
  const msgCard = m => {
    const li = el('li', 'adm-item');
    const head = el('div', 'adm-head');
    head.append(el('b', null, m.name));
    const meta = el('p', 'adm-meta mono');
    const mail = el('a', null, m.email);
    mail.href = 'mailto:' + encodeURIComponent(m.email).replace(/%40/g, '@');
    meta.append(mail, el('span', null, when(m.at)));
    const btns = el('div', 'adm-btns');
    const reply = el('a', 'btn btn-primary', 'Reply ↗');
    reply.href = `mailto:${encodeURIComponent(m.email).replace(/%40/g, '@')}?subject=${encodeURIComponent('Re: your message on my portfolio')}`;
    const del = el('button', 'btn btn-ghost adm-del', 'Delete');
    del.type = 'button';
    del.addEventListener('click', () => { if (confirm(`Delete the message from ${m.name}?`)) act({ action: 'deleteMessage', id: m.id }, 'Message deleted.'); });
    btns.append(reply, del);
    li.append(head, meta, el('blockquote', 'adm-msg', m.message), btns);
    return li;
  };
  const render = () => {
    document.querySelectorAll('.adm-tabs [data-tab]').forEach(b => {
      b.setAttribute('aria-selected', String(b.dataset.tab === tab));
      b.querySelector('b').textContent = (data[b.dataset.tab] || []).length;
    });
    list.textContent = '';
    const rows = data[tab] || [];
    if (!rows.length) { list.append(el('li', 'adm-empty mono', tab === 'pending' ? 'Nothing waiting for review.' : tab === 'published' ? 'Nothing published yet.' : 'No messages yet.')); return; }
    rows.forEach(r => list.append(tab === 'messages' ? msgCard(r) : kindCard(r)));
  };

  document.querySelectorAll('.adm-tabs [data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  $('admRefresh').addEventListener('click', () => load().then(() => say('Up to date.')));
  out.addEventListener('click', async () => { try { await api('POST', { action: 'logout' }); } catch (e) { /* signed out anyway */ } data = null; show('login'); });
  $('admForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button');
    err.textContent = ''; btn.disabled = true;
    const idIn = f.elements.namedItem('id'), pwIn = f.elements.namedItem('password');
    try { await api('POST', { action: 'login', id: idIn.value.trim(), password: pwIn.value }); pwIn.value = ''; await load(); }
    catch (x) { err.textContent = x.message; }
    finally { btn.disabled = false; }
  });
  load();
})();
