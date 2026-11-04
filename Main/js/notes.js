/**
 * Notes — a tiny Markdown blog. /notes/index.json lists the posts; each one is a
 * plain .md file in /notes, rendered here by a small, strict Markdown reader
 * (everything is escaped first; links may only point to http(s), / or #).
 * To publish: add notes/<slug>.md and an entry in notes/index.json.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const list = $('notesList'), index = $('notesIndex'), view = $('note');
  const baseTitle = document.title;
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ── Markdown, the safe subset ── */
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const okUrl = u => /^(https?:\/\/|\/(?!\/)|#)/.test(u);
  const inline = s => s.split(/(`[^`]+`)/).map(part => {
    if (/^`[^`]+`$/.test(part)) return `<code>${esc(part.slice(1, -1))}</code>`;
    return esc(part)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
        const raw = u.replace(/&amp;/g, '&');
        if (!okUrl(raw)) return t;
        return `<a href="${u}"${/^https?:/.test(raw) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  }).join('');
  const markdown = src => {
    const lines = src.replace(/\r\n?/g, '\n').split('\n'), out = [];
    let para = [], listType = '', items = [], quote = [];
    const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`); para = []; };
    const flushList = () => { if (items.length) out.push(`<${listType}>${items.map(i => `<li>${inline(i)}</li>`).join('')}</${listType}>`); items = []; listType = ''; };
    const flushQuote = () => { if (quote.length) out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`); quote = []; };
    const flush = () => { flushPara(); flushList(); flushQuote(); };
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let m;
      if (/^```/.test(l)) {
        flush();
        const code = [];
        while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
        out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      } else if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) { flush(); const h = Math.max(2, m[1].length); out.push(`<h${h}>${inline(m[2])}</h${h}>`); }
      else if (/^(-{3,}|\*{3,})\s*$/.test(l)) { flush(); out.push('<hr>'); }
      else if ((m = /^>\s?(.*)$/.exec(l))) { flushPara(); flushList(); quote.push(m[1]); }
      else if ((m = /^\s*[-*]\s+(.*)$/.exec(l)) || (m = /^\s*\d+[.)]\s+(.*)$/.exec(l))) {
        const t = /^\s*\d/.test(l) ? 'ol' : 'ul';
        flushPara(); flushQuote();
        if (listType && listType !== t) flushList();
        listType = t; items.push(m[1]);
      } else if (!l.trim()) flush();
      else { flushList(); flushQuote(); para.push(l.trim()); }
    }
    flush();
    return out.join('\n');
  };

  /* ── the index and the reader ── */
  let notes = [];
  const meta = n => `${fmt(n.date)}${n.minutes ? ` · ${n.minutes} min read` : ''}${n.tags && n.tags.length ? ' · ' + n.tags.join(', ') : ''}`;
  const renderIndex = () => {
    list.textContent = '';
    if (!notes.length) { list.append(el('li', 'adm-empty mono', 'No notes yet — the first one is on its way.')); return; }
    notes.forEach(n => {
      const li = el('li', 'notes-item'), a = el('a');
      a.href = '#' + n.slug;
      a.append(el('span', 'mono', meta(n)), el('h2', null, n.title), el('p', null, n.summary || ''));
      li.append(a);
      list.append(li);
    });
  };
  const show = async slug => {
    const i = notes.findIndex(n => n.slug === slug);
    if (i < 0) { view.hidden = true; index.hidden = false; document.title = baseTitle; return; }
    const n = notes[i];
    index.hidden = true; view.hidden = false;
    view.textContent = '';
    view.append(el('p', 'note-k mono', meta(n)), el('h1', null, n.title), el('p', 'mono', 'loading…'));
    document.title = `${n.title} · Notes · Manav Aghera`;
    try {
      const r = await fetch(`/notes/${encodeURIComponent(n.slug)}.md`);
      if (!r.ok) throw new Error(r.status);
      const md = await r.text();
      const words = md.split(/\s+/).length;
      view.textContent = '';
      view.append(el('p', 'note-k mono', meta({ ...n, minutes: n.minutes || Math.max(1, Math.round(words / 220)) })), el('h1', null, n.title));
      const bodyEl = el('div', 'note-body');
      bodyEl.innerHTML = markdown(md);
      view.append(bodyEl);
    } catch (e) {
      view.lastChild.textContent = 'This note could not be loaded — try again in a moment.';
    }
    const nav = el('nav', 'note-nav mono');
    nav.setAttribute('aria-label', 'More notes');
    const back = el('a', null, '← All notes'); back.href = '#';
    nav.append(back);
    if (notes[i + 1]) { const a = el('a', null, `Older: ${notes[i + 1].title} →`); a.href = '#' + notes[i + 1].slug; nav.append(a); }
    view.append(nav);
    scrollTo(0, 0);
    view.querySelector('h1').setAttribute('tabindex', '-1');
    view.querySelector('h1').focus({ preventScroll: true });
  };
  const route = () => show(decodeURIComponent(location.hash.slice(1)));
  fetch('/notes/index.json', { headers: { Accept: 'application/json' } })
    .then(r => (r.ok ? r.json() : []))
    .then(d => {
      notes = (Array.isArray(d) ? d : []).filter(n => n && /^[a-z0-9-]{1,80}$/.test(n.slug) && n.title && /^\d{4}-\d{2}-\d{2}$/.test(n.date)).sort((a, b) => b.date.localeCompare(a.date));
      renderIndex(); route();
    })
    .catch(() => { notes = []; renderIndex(); });
  addEventListener('hashchange', route);
})();
