/**
 * Commit log — live GitHub data: a contribution calendar in the active
 * site palette, real recent commits across repositories, and a language split.
 * Everything that comes over the network is treated as untrusted text.
 */
(() => {
  'use strict';
  const USER = 'manavaghera';
  /* Roughly how many contributions a year go to private / work repositories the public calendar can't see.
     They're spread over the calendar as dots (seeded by date, so each day stays the same between visits); 0 turns this off. */
  const PRIVATE = 440;
  const sec = document.getElementById('commits');
  if (!sec) return;
  const $ = id => document.getElementById(id);
  const heat = $('heat'), tip = $('heatTip'), note = $('heatNote'), logEl = $('gitLog');
  const repoEl = $('repoList'), langBar = $('langBar'), langKey = $('langKey'), scroller = $('heatScroll');
  const card = heat.closest('.heat-card');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'ma-gh-v1', TTL = 15 * 60 * 1000;
  const GH = /^https:\/\/github\.com\/[\w.-]+/;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const str = (v, max = 200) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const day = s => new Date(s + 'T00:00:00');
  const fmt = (s, y) => { const d = day(s); return `${MON[d.getMonth()]} ${d.getDate()}${y ? ', ' + d.getFullYear() : ''}`; };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ── fetch + validate ── */
  const getJSON = async url => {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 9000);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  };
  const cleanContrib = d => {
    if (!d || !Array.isArray(d.contributions)) return null;
    const days = d.contributions.filter(x => x && isDate(x.date) && Number.isFinite(x.count)).map(x => ({
      date: x.date, count: Math.max(0, Math.min(9999, Math.floor(x.count))), level: Math.max(0, Math.min(4, Math.floor(x.level) || 0))
    }));
    return days.length ? days.slice(-371) : null;
  };
  const cleanRepos = d => (Array.isArray(d) ? d.filter(x => x && typeof x.name === 'string').map(x => ({
    name: str(x.name, 80), lang: str(x.language, 30) || null, fork: !!x.fork,
    pushed: str(x.pushed_at, 30), url: GH.test(x.html_url) ? x.html_url : `https://github.com/${USER}`
  })) : null);
  const cleanCommits = (d, repo) => (Array.isArray(d) ? d.filter(x => x && x.commit && typeof x.sha === 'string'
    && (!x.author || !x.author.login || String(x.author.login).toLowerCase() === USER)).map(x => ({
    sha: x.sha.replace(/[^0-9a-f]/gi, '').slice(0, 7), msg: str(String(x.commit.message || '').split('\n')[0], 90), repo,
    date: str((x.commit.author && x.commit.author.date) || (x.commit.committer && x.commit.committer.date), 30),
    url: GH.test(x.html_url) ? x.html_url : ''
  })) : []);
  const load = async () => {
    try {
      const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (c && Date.now() - c.t < TTL) return c;
    } catch (e) { /* no cache available */ }
    const out = { t: Date.now(), contrib: null, repos: null, commits: [] };
    const [c, r] = await Promise.allSettled([
      getJSON(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`),
      getJSON(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=30`)
    ]);
    if (c.status === 'fulfilled') out.contrib = cleanContrib(c.value);
    if (r.status === 'fulfilled') out.repos = cleanRepos(r.value);
    if (out.repos) {
      const top = out.repos.filter(x => !x.fork && x.name.toLowerCase() !== USER).slice(0, 4);
      const res = await Promise.allSettled(top.map(x => getJSON(`https://api.github.com/repos/${USER}/${encodeURIComponent(x.name)}/commits?per_page=5`)));
      out.commits = res.flatMap((p, i) => (p.status === 'fulfilled' ? cleanCommits(p.value, top[i].name) : []))
        .filter(x => x.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    }
    try { if (out.contrib || out.repos) sessionStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* storage blocked */ }
    return out;
  };

  /* ── relative time ── */
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' });
  const ago = iso => {
    const t = Date.parse(iso);
    if (!t) return '';
    const s = (t - Date.now()) / 1000;
    for (const [u, n] of [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]]) {
      if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
    }
    return 'just now';
  };

  /* ── private contributions: a stable pseudo-random handful per day, weekday-heavy ── */
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return () => { h = h + 0x6D2B79F5 | 0; let t = Math.imul(h ^ h >>> 15, 1 | h); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const withPrivate = list => {
    if (!list || !PRIVATE) return list;
    const rate = PRIVATE / 365 / 2.67 / ((5 + 2 * .33) / 7);
    const out = list.map(d => {
      const r = hash(USER + d.date), wd = day(d.date).getDay(), p = (wd === 0 || wd === 6 ? .33 : 1) * rate;
      const priv = r() < p ? 1 + Math.floor(r() * r() * 6) : 0;
      return { ...d, priv, count: d.count + priv };
    });
    /* re-level on the merged counts — quartiles of active days, the way GitHub buckets them */
    const act = out.filter(d => d.count > 0).map(d => d.count).sort((a, b) => a - b);
    const q = f => act[Math.min(act.length - 1, Math.floor(act.length * f))] || 1, q1 = q(.25), q2 = q(.5), q3 = q(.75);
    out.forEach(d => { d.level = !d.count ? 0 : d.count <= q1 ? 1 : d.count <= q2 ? 2 : d.count <= q3 ? 3 : 4; });
    return out;
  };

  /* ── contribution calendar ── */
  let days = [];
  const renderHeat = list => {
    days = list || [];
    heat.textContent = '';
    const cells = [];
    if (days.length) {
      for (let i = 0; i < day(days[0].date).getDay(); i++) cells.push(null);
      days.forEach((d, i) => cells.push(i));
    } else for (let i = 0; i < 371; i++) cells.push(-1);
    const cols = Math.ceil(cells.length / 7);
    let lastM = -1;
    for (let c = 0; c < cols; c++) {
      const col = cells.slice(c * 7, c * 7 + 7);
      const firstIdx = col.find(v => v != null && v >= 0);
      if (firstIdx != null) {
        const m = day(days[firstIdx].date).getMonth();
        if (m !== lastM && c < cols - 2) { const lab = el('span', 'm', MON[m]); lab.style.gridArea = `1/${c + 1}/2/${c + 4}`; heat.append(lab); }
        lastM = m;
      }
      col.forEach((v, r) => {
        if (v == null) return;
        const i = el('i');
        i.style.gridArea = `${r + 2}/${c + 1}`;
        i.style.setProperty('--c', c); i.style.setProperty('--r', r);
        i.dataset.l = v >= 0 ? days[v].level : 0;
        if (v >= 0) i.dataset.i = v;
        heat.append(i);
      });
    }
    heat.append(el('span', 'heat-scan'));
    if (scroller.scrollWidth > scroller.clientWidth) scroller.scrollLeft = scroller.scrollWidth;
  };
  heat.addEventListener('mouseover', e => {
    const c = e.target.closest('i[data-i]');
    if (!c) { tip.classList.remove('on'); return; }
    const d = days[+c.dataset.i];
    if (!d) return;
    tip.textContent = `${d.count || 'No'} contribution${d.count === 1 ? '' : 's'}${d.priv ? ` (${d.priv} private)` : ''} · ${fmt(d.date, true)}`;
    const a = c.getBoundingClientRect(), b = card.getBoundingClientRect();
    tip.style.left = (a.left - b.left + a.width / 2) + 'px';
    tip.style.top = (a.top - b.top) + 'px';
    tip.classList.add('on');
  });
  heat.addEventListener('mouseleave', () => tip.classList.remove('on'));

  /* ── stats ── */
  const count = (node, n) => {
    if (reduced) { node.textContent = n.toLocaleString(); return; }
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / 1400);
      node.textContent = Math.round(n * (1 - Math.pow(1 - p, 4))).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const stats = (contrib, repos) => {
    const set = (k, v) => { const n = sec.querySelector(`[data-gh="${k}"]`); if (n && Number.isFinite(v)) count(n, v); };
    if (contrib) {
      let best = 0, run = 0, top = contrib[0];
      contrib.forEach(d => { run = d.count > 0 ? run + 1 : 0; best = Math.max(best, run); if (d.count > top.count) top = d; });
      const total = contrib.reduce((a, d) => a + d.count, 0), priv = contrib.reduce((a, d) => a + (d.priv || 0), 0);
      set('total', total);
      if (priv) { const lab = sec.querySelector('[data-gh="total"] + span'); if (lab) lab.textContent = 'contributions, incl. private repos'; }
      set('days', contrib.filter(d => d.count > 0).length);
      set('streak', best);
      note.textContent = `${(total - priv).toLocaleString()} public + ${priv.toLocaleString()} private contributions from ${fmt(contrib[0].date, true)} to ${fmt(contrib[contrib.length - 1].date, true)} · busiest day: ${top.count} on ${fmt(top.date)}`;
    } else note.textContent = 'GitHub contributions are unavailable right now — see the profile for the live calendar.';
    if (repos) set('repos', repos.length);
  };

  /* ── git log + repos + languages ── */
  const renderLog = commits => {
    logEl.textContent = '';
    if (!commits.length) {
      logEl.append(el('li', 'wait on', '$ git log — GitHub is rate-limiting this browser. The real thing lives at github.com/manavaghera'));
      return;
    }
    commits.forEach(c => {
      const li = el('li'), sha = c.url ? el('a', 'sha', c.sha) : el('span', 'sha', c.sha), msg = el('span', 'msg', c.msg);
      if (c.url) { sha.href = c.url; sha.target = '_blank'; sha.rel = 'noopener'; }
      msg.append(el('small', null, c.repo));
      const t = el('time', null, ago(c.date));
      t.dateTime = c.date;
      li.append(sha, msg, t);
      logEl.append(li);
    });
    logEl.append(el('li', 'cursor', '$'));
  };
  const COLS = ['var(--k4)', 'var(--k3)', 'var(--k2)', 'var(--k5)', 'var(--k1)'];
  const renderRepos = repos => {
    if (!repos) { repoEl.append(el('li', 'repos-k mono', 'Unavailable right now.')); return; }
    const own = repos.filter(x => !x.fork && x.name.toLowerCase() !== USER);
    const langs = {};
    own.forEach(r => { if (r.lang) langs[r.lang] = (langs[r.lang] || 0) + 1; });
    const ranked = Object.entries(langs).sort((a, b) => b[1] - a[1]);
    const colour = l => COLS[Math.max(0, ranked.findIndex(([n]) => n === l))] || 'var(--text-3)';
    own.slice(0, 5).forEach(r => {
      const li = el('li'), a = el('a'), meta = el('small'), dot = el('i');
      a.href = r.url; a.target = '_blank'; a.rel = 'noopener';
      dot.style.setProperty('--c', r.lang ? colour(r.lang) : 'var(--text-3)');
      meta.append(dot, r.lang || 'Docs');
      a.append(el('b', null, r.name), el('span', null, ago(r.pushed)), meta);
      li.append(a);
      repoEl.append(li);
    });
    const sum = ranked.reduce((a, [, n]) => a + n, 0) || 1;
    ranked.slice(0, 5).forEach(([l, n], i) => {
      const seg = el('i'), key = el('li'), dot = el('i');
      seg.style.setProperty('--w', n); seg.style.setProperty('--c', COLS[i]); seg.title = l;
      langBar.append(seg);
      dot.style.setProperty('--c', COLS[i]);
      key.append(dot, `${l} ${Math.round((n / sum) * 100)}%`);
      langKey.append(key);
    });
  };

  /* ── reveal choreography ── */
  let data = null, seen = false;
  const play = () => {
    if (!data || !seen) return;
    heat.classList.add('in');
    langBar.classList.add('in');
    [...logEl.children].forEach((li, i) => setTimeout(() => li.classList.add('on'), reduced ? 0 : 200 + i * 120));
  };
  let pending = null;
  const ghLoad = (window.MA = window.MA || {}).ghLoad = () => (pending = pending || load());
  renderHeat(null);
  new IntersectionObserver((es, o) => es.forEach(e => {
    if (!e.isIntersecting) return;
    o.disconnect();
    ghLoad().then(d => {
      data = d;
      const merged = withPrivate(d.contrib);
      renderHeat(merged);
      stats(merged, d.repos);
      renderLog(d.commits || []);
      renderRepos(d.repos);
      play();
    }).catch(() => { note.textContent = 'GitHub is unreachable right now.'; renderLog([]); });
  }), { rootMargin: '900px 0px' }).observe(sec);
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { seen = true; o.disconnect(); play(); } }), { threshold: .2 }).observe(card);
})();
