/* Vercel Analytics — only on the deployed site */
window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  const va = document.createElement('script');
  va.defer = true;
  va.src = '/_vercel/insights/script.js';
  document.head.appendChild(va);
}

(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 4);
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EMAIL = 'manavaghera@yahoo.com';
  const MA = window.MA = window.MA || {};
  let lenis = null;
  const VER = ((document.currentScript && document.currentScript.src.match(/[?&]v=(\d+)/)) || [])[1]; // same cache-buster for the late scripts

  /* ── first visit: a short loading screen per theme (html.booting is set in <head>, once per session).
     It counts up while the page loads, ends after 1.7–4 s (or on any click/key), and everything that
     animates on entry waits for MA.booted so it plays where you can see it. ── */
  MA.booted = new Promise(done => {
    const boot = $('#boot');
    if (!root.classList.contains('booting') || !boot) { if (boot) boot.remove(); return done(); }
    const small = matchMedia('(max-width:720px)').matches; // phones get a shorter intro
    /* phones: the intro counts from the moment the page was opened and doesn't wait for the remaining scripts,
       so it's gone as soon as this script runs and ~0.9 s have passed; wider screens wait for the full load */
    const t0 = small ? 0 : performance.now(), MIN = small ? 900 : 1500, MAX = small ? 1800 : 3500, nums = $$('b', boot);
    let loaded = small || document.readyState === 'complete', over = false;
    if (!small) addEventListener('load', () => { loaded = true; }, { once: true });
    const finish = () => {
      if (over) return;
      over = true;
      nums.forEach(n => { n.textContent = '100'; });
      boot.classList.add('out');
      setTimeout(() => { root.classList.remove('booting'); boot.remove(); if (MA.lenis) MA.lenis.start(); done(); }, small ? 350 : 700);
    };
    const tick = () => {
      if (over) return;
      const el = performance.now() - t0;
      nums.forEach(n => { n.textContent = String(Math.floor(Math.min(loaded ? 100 : 94, el / MIN * 100))); });
      if ((loaded && el >= MIN) || el >= MAX) finish(); else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(finish, MAX + 600); // background tabs pause animation frames
    boot.addEventListener('click', finish);
    addEventListener('keydown', finish, { once: true });
  });

  let toastT;
  const toast = MA.toast = msg => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  };
  const goTo = MA.goTo = id => {
    const target = id === '#top' ? 0 : $(id);
    if (target == null) return;
    if (lenis) lenis.scrollTo(target, { duration: 1.5 });
    else if (target === 0) scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };

  /* ── nav + menu ── */
  const nav = $('#nav'), menu = $('#menu'), menuBtn = $('#menuBtn');
  let menuOpen = false;
  const setMenu = open => {
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-scrolled', open || scrollY > 8);
    scrolled = null; // the scroll listener re-syncs the nav from here
    if (lenis) open ? lenis.stop() : lenis.start();
    else root.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id !== '#top' && !$(id)) return;
    e.preventDefault();
    if (menuOpen) setMenu(false);
    goTo(id);
  }));
  const links = $$('.nav-links a');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section, footer').forEach(s => s.id && spy.observe(s));

  /* ── reveals + counters ── */
  const count = el => {
    const n = Number(el.dataset.count), t0 = performance.now();
    if (reduced) { el.textContent = n; return; }
    const step = now => {
      const p = clamp((now - t0) / 1500);
      el.textContent = Math.round(n * easeOut(p));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => {
    let n = 0;
    es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.style.setProperty('--d', (n++ * .07) + 's');
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(count);
      if (e.target.matches('[data-decode]')) decode(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: matchMedia('(max-width:720px)').matches ? '0px 0px 8% 0px' : '0px 0px -10% 0px' }); // phones: start a touch early so nothing pops in late

  /* ── manifesto: decode, then attention arcs ── */
  const attnBox = $('#attn');
  let toks = [], attnReady = reduced;
  const decode = el => {
    const items = $$('.tok', el), orig = items.map(t => t.textContent);
    const total = orig.reduce((a, s) => a + s.length, 0), glyphs = 'abcdefghijklmnopqrstuvwxyz';
    if (reduced) return;
    const t0 = performance.now(), dur = 1500, win = 12;
    const step = now => {
      const front = clamp((now - t0) / dur) * (total + win);
      let k = 0;
      items.forEach((t, i) => {
        let out = '';
        const start = k;
        for (const ch of orig[i]) { const d = front - k++; out += d >= win || !/[a-z]/i.test(ch) ? ch : glyphs[(Math.random() * 26) | 0]; }
        t.textContent = out;
        t.style.opacity = front > start ? 1 : .12;
      });
      if (front < total + win) requestAnimationFrame(step);
      else { items.forEach((t, i) => { t.textContent = orig[i]; t.style.opacity = ''; }); attnReady = true; }
    };
    requestAnimationFrame(step);
  };

  if (attnBox) {
    const svg = $('.attn-svg', attnBox), text = $('.attn-text', attnBox), NS = 'http://www.w3.org/2000/svg';
    const words = text.textContent.trim().split(/\s+/);
    text.textContent = '';
    words.forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'tok';
      s.textContent = w;
      text.append(s);
      if (i < words.length - 1) text.append(' ');
      toks.push(s);
    });
    const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
    const GROUPS = [
      ['read', 'documents', 'answers', 'before', 'your'],
      ['reason', 'task', 'careful', 'agent', 'through'],
      ['see', 'world', 'phone', 'camera', 'offline', 'even']
    ];
    const group = toks.map(t => GROUPS.findIndex(g => g.includes(norm(t.textContent))));
    const hash = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
    let user = false, cur = -1, visible = false;
    const clear = () => { svg.innerHTML = ''; attnBox.classList.remove('is-on'); toks.forEach(t => t.classList.remove('q', 'k')); cur = -1; };
    const show = i => {
      if (!attnReady || i === cur || i < 0) return;
      clear();
      cur = i;
      const scores = toks.map((t, j) => (j === i || norm(t.textContent).length < 2 ? -1e9
        : (group[i] >= 0 && group[i] === group[j] ? 2.6 : 0) + hash(i, j) * 1.4 + .8 / (1 + Math.abs(i - j))));
      const top = scores.map((s, j) => [s, j]).sort((a, b) => b[0] - a[0]).slice(0, 4);
      const ex = top.map(([s]) => Math.exp(s / .7)), sum = ex.reduce((a, b) => a + b, 0);
      const br = attnBox.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${br.width} ${br.height}`);
      const anchor = el => { const r = el.getBoundingClientRect(); return [r.left - br.left + r.width / 2, r.top - br.top + r.height * .1]; };
      const [ax, ay] = anchor(toks[i]);
      attnBox.classList.add('is-on');
      toks[i].classList.add('q');
      top.forEach(([, j], n) => {
        const w = ex[n] / sum, [bx, by] = anchor(toks[j]);
        toks[j].classList.add('k');
        const lift = Math.min(ay, by) - (26 + Math.abs(bx - ax) * .18 + Math.abs(by - ay) * .3);
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', `M${ax},${ay} C${ax},${lift} ${bx},${lift} ${bx},${by}`);
        p.style.strokeWidth = (1 + w * 4.5).toFixed(2);
        p.style.opacity = (.3 + w * .7).toFixed(2);
        svg.append(p);
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.style.strokeDashoffset = len;
        p.getBoundingClientRect();
        p.style.transition = `stroke-dashoffset .8s cubic-bezier(.22,1,.36,1) ${n * 70}ms`;
        p.style.strokeDashoffset = 0;
        const mid = p.getPointAtLength(len / 2);
        const r = document.createElementNS(NS, 'rect'), t = document.createElementNS(NS, 'text');
        r.setAttribute('x', mid.x - 18); r.setAttribute('y', mid.y - 9); r.setAttribute('width', 36); r.setAttribute('height', 17); r.setAttribute('rx', 8.5);
        t.setAttribute('x', mid.x); t.setAttribute('y', mid.y + 3.5); t.setAttribute('text-anchor', 'middle');
        t.textContent = w.toFixed(2);
        svg.append(r, t);
      });
    };
    attnBox.addEventListener('mouseover', e => { const t = e.target.closest('.tok'); if (t) { user = true; show(toks.indexOf(t)); } });
    attnBox.addEventListener('mouseleave', clear);
    attnBox.addEventListener('click', e => { const t = e.target.closest('.tok'); user = true; t ? show(toks.indexOf(t)) : clear(); });
    addEventListener('resize', clear);
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { threshold: .4 }).observe(attnBox);
    const keys = toks.map((t, i) => (['read', 'reason', 'see'].includes(norm(t.textContent)) ? i : -1)).filter(i => i >= 0);
    let k = 0;
    setInterval(() => {
      if (user || !visible || !attnReady || reduced) return;
      cur = -1;
      show(keys[k++ % keys.length]);
    }, 2400);
  }
  $$('[data-reveal], [data-decode]').forEach(el => io.observe(el));
  MA.observe = el => io.observe(el);

  /* ── contact ── */
  $('#copyMail').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(EMAIL); toast('Email copied'); }
    catch (e) { toast(EMAIL); }
  });
  /* catch "gamil.com"-style slips before a reply goes somewhere nobody reads */
  const DOMAINS = ['gmail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'proton.me', 'protonmail.com', 'rediffmail.com'];
  const lev = (a, b) => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  };
  MA.emailTypo = email => {
    const [user, dom] = String(email).toLowerCase().split('@');
    if (!user || !dom || DOMAINS.includes(dom)) return null;
    const [best, dist] = DOMAINS.map(d => [d, lev(dom, d)]).sort((x, y) => x[1] - y[1])[0];
    return dist <= 2 ? `${user}@${best}` : null;
  };

  /* the message goes straight to my inbox through /api/contact; copy + mail app are only a fallback */
  const form = $('#promptForm'), nameIn = $('#promptName'), mailIn = $('#promptEmail'), textIn = $('#promptText');
  const foot = form.querySelector('.prompt-foot span'), footText = foot.textContent;
  let opened = Date.now(), sending = false, typoOk = '';
  const hint = fix => {
    foot.textContent = `Did you mean ${fix}? `;
    const use = document.createElement('button');
    use.type = 'button'; use.className = 'linkish'; use.textContent = 'use it';
    use.addEventListener('click', () => { mailIn.value = fix; foot.textContent = footText; });
    foot.append(use, ' · or Send again to keep yours');
  };
  MA.prefill = text => { if (!textIn.value.trim()) textIn.value = text; setTimeout(() => (nameIn.value ? textIn : nameIn).focus({ preventScroll: true }), 700); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    const body = { name: nameIn.value.trim(), email: mailIn.value.trim(), message: textIn.value.trim(), website: $('#promptHp').value, t: Date.now() - opened };
    if (body.name.length < 2) { toast('Add your name first'); nameIn.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(body.email)) { toast('Add your email so I can reply'); mailIn.focus(); return; }
    if (body.message.length < 5) { toast('Write a message first'); textIn.focus(); return; }
    const fix = MA.emailTypo(body.email);
    if (fix && typoOk !== body.email) { typoOk = body.email; hint(fix); mailIn.focus(); return; }
    foot.textContent = footText;
    sending = true;
    const flight = MA.flyPlane ? MA.flyPlane(textIn) : Promise.resolve();
    let r = null, j = {};
    try { r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); j = await r.json().catch(() => ({})); } catch (x) { /* offline or no backend */ }
    await flight;
    sending = false;
    if (r && r.ok) {
      textIn.value = ''; opened = Date.now();
      toast(`Sent ✓ — I'll reply to ${body.email}`);
      if (MA.achieve) MA.achieve('pilot');
    } else if (r && (r.status === 400 || r.status === 429)) toast(j.error || 'Please check the form');
    else {
      /* no backend reachable: keep the words safe on the clipboard, then try the mail app */
      let copied = false;
      try { await navigator.clipboard.writeText(`${body.message}\n\n— ${body.name} <${body.email}>`); copied = true; } catch (x) { /* clipboard blocked */ }
      toast(copied ? `Couldn't send directly — your message is copied. Paste it into an email to ${EMAIL}` : `Couldn't send directly — please email ${EMAIL}`);
      setTimeout(() => { location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Hello from ' + body.name)}&body=${encodeURIComponent(body.message)}`; }, 1400);
    }
  });
  const clock = $('#clock');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  const heroClock = $('#heroClock');
  const tick = () => { clock.textContent = fmt.format(new Date()); if (heroClock) heroClock.textContent = clock.textContent; };
  tick();
  setInterval(tick, 15000);
  $('#year').textContent = new Date().getFullYear();

  /* ── smooth wheel scrolling (mouse and trackpad only: phones keep their own native, smoother touch scrolling) ── */
  const wheel = matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (!reduced && wheel) { // fetched only here, after the page, so phones never download it
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/lenis@1.1.13/dist/lenis.min.js';
    s.async = true;
    s.onload = () => {
      if (typeof Lenis === 'undefined') return;
      lenis = MA.lenis = new Lenis({ lerp: .1, smoothWheel: true });
      if (root.classList.contains('booting')) lenis.stop();
      const loop = now => { lenis.raf(now); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    };
    document.head.append(s);
  }
  let scrolled = null;
  const navState = () => { const on = scrollY > 8; if (!menuOpen && on !== scrolled) { scrolled = on; nav.classList.toggle('is-scrolled', on); } };
  addEventListener('scroll', navState, { passive: true });
  navState();
  /* the features further down the page load once the first screen is up, in this order (each waits for the one
     before it), so the intro and hero don't compete with ~75 KB of scripts nobody can see yet */
  const LATER = ['sims', 'net', 'github', 'breaker', 'lab', 'lab-nn', 'lab-gen', 'lab-cv', 'lab-digits', 'lab-words',
    'companion', 'term', 'kind', 'guestbook', 'cases', 'chronus', 'playground', 'rag'];
  const loadLater = () => LATER.forEach(n => {
    const s = document.createElement('script');
    s.src = `js/${n}.js${VER ? '?v=' + VER : ''}`;
    s.async = false;
    document.body.append(s);
  });
  MA.booted.then(() => (window.requestIdleCallback ? requestIdleCallback(loadLater, { timeout: 1200 }) : setTimeout(loadLater, 300)));
  let shown = false;
  const ready = () => { if (shown) return; shown = true; requestAnimationFrame(() => root.classList.add('ready')); };
  MA.booted.then(() => { if (document.fonts) document.fonts.ready.then(ready); setTimeout(ready, 600); });
})();
