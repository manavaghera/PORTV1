/**
 * Pulse — the live "here now" count in the dock, and anonymous numbers for /admin:
 * one visit per session, which sections get read, which games and tools get used,
 * which achievements unlock. A random id per tab, no cookies; the stats part stays
 * off when the browser sends Do Not Track or Global Privacy Control. Without the
 * backend the counter just never appears.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const quiet = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1';
  const rand = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), b => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'[b & 63]).join('');
  const store = (k, make) => { try { let v = sessionStorage.getItem(k); if (!v) { v = make(); sessionStorage.setItem(k, v); return [v, true]; } return [v, false]; } catch (e) { return [make(), true]; } };
  const [sid] = store('ma-sid', rand);
  const queue = [], sent = new Set();

  /* other scripts call MA.track('play', 'chat') etc.; each thing counts once per page view */
  MA.track = (type, key) => {
    if (quiet || sent.has(type + key)) return;
    sent.add(type + key);
    queue.push([type, key || '']);
  };
  if (store('ma-visit', () => '1')[1]) MA.track('visit', '');

  /* ── the counter ── */
  const dock = document.getElementById('dock');
  const pill = document.createElement('span');
  pill.className = 'dock-here mono';
  pill.hidden = true;
  pill.title = 'People on this site right now';
  if (dock) dock.prepend(pill);
  const show = n => {
    if (!Number.isFinite(n) || n < 1) return;
    pill.hidden = false;
    pill.textContent = '';
    const dot = document.createElement('i');
    dot.setAttribute('aria-hidden', 'true');
    const long = document.createElement('span');
    long.className = 'dock-l';
    long.textContent = n === 1 ? ' here' : ' people';
    pill.append(dot, n === 1 ? 'just you' : String(n), long, n === 1 ? '' : ' here now'); // phones drop the long part
    pill.setAttribute('aria-label', n === 1 ? 'Just you on the site right now' : `${n} people on the site right now`);
  };

  let dead = false, timer = 0, last = 0, pauseUntil = 0;
  const beat = async () => {
    const now = Date.now();
    if (dead || document.hidden || now - last < 15000 || now < pauseUntil) return; // at most one pulse per 15 s
    last = now;
    const ev = queue.splice(0, 24);
    try {
      const r = await fetch('/api/pulse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid, ev }) });
      if (r.status === 404 || r.status === 503) { dead = true; return; }
      if (r.status === 429) { pauseUntil = now + 5 * 60 * 1000; queue.unshift(...ev); return; } // busy: back off, keep the events
      if (r.ok) show((await r.json()).here);
    } catch (e) { /* offline for a moment — try again next beat */ }
  };
  const start = () => { beat(); clearInterval(timer); timer = setInterval(beat, 30000); };
  (MA.booted || Promise.resolve()).then(() => setTimeout(start, 1500));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !dead) start(); });
  addEventListener('pagehide', () => {
    if (dead || !navigator.sendBeacon) return;
    navigator.sendBeacon('/api/pulse', new Blob([JSON.stringify({ sid, ev: queue.splice(0, 24), bye: true })], { type: 'application/json' }));
  });
  addEventListener('pageshow', e => { if (e.persisted && !dead) start(); });

  /* ── what gets read: a section that stays on screen for a moment ── */
  const timers = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => {
    const id = e.target.id;
    if (e.isIntersecting) { if (!timers.has(id)) timers.set(id, setTimeout(() => MA.track('sec', id), 1500)); }
    else { clearTimeout(timers.get(id)); timers.delete(id); }
  }), { threshold: .35 });
  document.querySelectorAll('main > section[id], footer#contact').forEach(s => io.observe(s));

  /* ── what gets played: the first touch inside each game or experiment ── */
  const PLAY = { 'lab-nn': 'nn', 'lab-gen': 'gen', 'lab-cv': 'cv', 'lab-dg': 'digits', 'lab-wd': 'words' };
  const touched = e => {
    const t = e.target.closest ? e.target : e.target.parentElement;
    if (!t) return;
    const panel = t.closest('[id^="arc-"], [id^="lab-"]');
    if (panel && PLAY[panel.id]) MA.track('play', PLAY[panel.id]);
    if (t.closest('#heatPlay')) MA.track('play', 'breaker');
  };
  document.addEventListener('pointerdown', touched, true);
  document.addEventListener('keydown', touched, true);
})();
