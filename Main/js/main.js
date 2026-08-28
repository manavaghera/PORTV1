(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  let ltOut = [], ltIn = [], wmC = [], ltCur = [], mx = -9999, my = -9999, pinHero, heroP = 0, wmDone = false;
  let allSections = [], pageCounter = null;

  const initWordmark = () => {
    const h1 = $('.wordmark');
    if (!h1) return;
    pinHero = $('.pin-hero');
    $$('.wordmark span').forEach(col => {
      const t = col.textContent;
      col.textContent = '';
      [...t].forEach(ch => {
        const o = document.createElement('span');
        o.className = 'ltw';
        const i = document.createElement('span');
        i.className = 'lt';
        i.textContent = ch;
        i.style.transitionDelay = (ltOut.length * 45) + 'ms';
        o.appendChild(i);
        col.appendChild(o);
        ltOut.push(o);
        ltIn.push(i);
      });
      col.appendChild(document.createTextNode(' '));
    });
    ltCur = ltOut.map(() => 0);
    if (reduced) { pinHero.classList.add('wm-go', 'wm-done'); wmDone = true; return; }
    requestAnimationFrame(() => requestAnimationFrame(() => pinHero.classList.add('wm-go')));
    setTimeout(() => {
      pinHero.classList.add('wm-done');
      ltIn.forEach(l => { l.style.transitionDelay = '0ms'; });
      wmDone = true;
    }, ltIn.length * 45 + 850);
    cacheWm();
    if (document.fonts) document.fonts.ready.then(cacheWm);
  };

  const cacheWm = () => {
    if (!ltOut.length) return;
    wmC = ltOut.map(o => {
      const r = o.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
  };

  const heroFrame = () => {
    if (!fine || reduced || !wmDone || heroP > 1.2) return;
    const p = heroP;
    for (let i = 0; i < ltIn.length; i++) {
      const c = wmC[i];
      const s = i * 0.055;
      const w = clamp((p - s) / 0.14, 0, 1);
      const inn = ltIn[i];
      inn.style.clipPath = w > 0 ? `inset(-0.08em 0 -0.08em ${(w * 100).toFixed(1)}%)` : '';
      let f = 0;
      if (c) {
        const d = Math.hypot(mx - c[0], my - c[1]);
        if (d < 160) f = 1 - d / 160;
      }
      ltCur[i] += (f * 14 - ltCur[i]) * 0.18;
      inn.style.transform = `translateY(${(-w * 26 - ltCur[i]).toFixed(2)}px)`;
      if (f > 0.4) inn.classList.add('hot');
      else inn.classList.remove('hot');
    }
  };

  const initHeroPointer = () => {
    if (!fine) return;
    addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });
  };

  let toastT;
  const toast = msg => {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  };

  const splitEl = el => {
    [...el.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(tok => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.append(' '); return; }
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = tok;
          s.style.setProperty('--d', (splitEl.i++ * 36) + 'ms');
          frag.append(s);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1 && node.tagName !== 'BR') {
        splitEl(node);
      }
    });
  };

  const initSplits = () => {
    $$('.split').forEach(el => {
      splitEl.i = 0;
      splitEl(el);
    });
  };

  const initObserver = () => {
    const isMobile = window.innerWidth <= 768;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    }), {
      threshold: isMobile ? 0.05 : 0.08,
      rootMargin: isMobile ? '0px 0px -5% 0px' : '0px 0px -10% 0px'
    });
    $$('[data-rev], .split').forEach(el => io.observe(el));
  };

  const MARKS = [0, 8, 19, 29.5, 40];
  const STATUS = ['SPARK', 'FLOW', 'BOSS', 'CLUTCH', 'WIN'];
  const TOTAL_MIN = 40;
  const EVALS = 214;
  let tlRows = [], tlClock, tlDist, tlStatus, lastLit = -1;

  const initTl = () => {
    tlRows = $$('.tl-row');
    tlClock  = document.getElementById('tlClock')  || { textContent: '' };
    tlDist   = document.getElementById('tlDist')   || { textContent: '' };
    tlStatus = document.getElementById('tlStatus');
  };

  const tlUpdate = p => {
    const x = p * (MARKS.length - 1);
    const i = Math.min(MARKS.length - 2, Math.floor(x));
    const t = clamp(lerp(MARKS[i], MARKS[i + 1], x - i), 0, TOTAL_MIN);
    const sec = Math.round(t * 60);
    if (tlClock.textContent !== undefined) tlClock.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    if (tlDist.textContent !== undefined) tlDist.textContent = String(Math.round(t / TOTAL_MIN * EVALS)).padStart(3, '0');
    const lit = Math.min(4, Math.floor(p * 5));
    if (lit !== lastLit) {
      tlRows.forEach((r, idx) => {
        r.classList.toggle('lit', idx <= lit);
        r.classList.toggle('active', idx === lit);
      });
      if (tlStatus) tlStatus.textContent = STATUS[lit];
      lastLit = lit;
    }
  };

  let canvas, ctx, W = 0, H = 0, nodes = [], edges = [], route = [0, 3, 7, 12, 18, 25], segLens = [], routeTotal = 0, mapP = 0, mapOn = false;

  const buildMap = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes = [];
    const cx = W * 0.5, cy = H * 0.44, R = Math.min(W, H) * 0.38;
    for (let i = 0; i < 26; i++) {
      const r = Math.sqrt(i / 26), a = i * 2.399;
      nodes.push([cx + Math.cos(a) * r * R, cy + Math.sin(a) * r * R * 0.92]);
    }
    edges = [];
    const th = R * 0.27;
    for (let a = 0; a < 26; a++) {
      for (let b = a + 1; b < 26; b++) {
        const dx = nodes[a][0] - nodes[b][0], dy = nodes[a][1] - nodes[b][1];
        if (Math.hypot(dx, dy) < th) edges.push([a, b]);
      }
    }
    segLens = [];
    routeTotal = 0;
    for (let i = 0; i < route.length - 1; i++) {
      const d = Math.hypot(nodes[route[i + 1]][0] - nodes[route[i]][0], nodes[route[i + 1]][1] - nodes[route[i]][1]);
      segLens.push(d);
      routeTotal += d;
    }
  };

  const drawMap = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(17,16,16,.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    edges.forEach(([a, b]) => {
      ctx.moveTo(nodes[a][0], nodes[a][1]);
      ctx.lineTo(nodes[b][0], nodes[b][1]);
    });
    ctx.stroke();
    ctx.fillStyle = 'rgba(17,16,16,.8)';
    nodes.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, 7);
      ctx.fill();
    });
    if (mapP <= 0) return;
    let budget = mapP * routeTotal;
    ctx.strokeStyle = '#DC201E';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(nodes[route[0]][0], nodes[route[0]][1]);
    let head = nodes[route[0]];
    for (let i = 0; i < route.length - 1 && budget > 0; i++) {
      const a = nodes[route[i]], b = nodes[route[i + 1]];
      const seg = Math.min(budget, segLens[i]);
      const t = seg / segLens[i];
      head = [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
      ctx.lineTo(head[0], head[1]);
      budget -= seg;
    }
    ctx.stroke();
    const pulse = 3.6 + Math.sin(performance.now() / 240) * 1.4;
    ctx.fillStyle = 'rgba(220,32,30,.16)';
    ctx.beginPath();
    ctx.arc(head[0], head[1], pulse * 3.4, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#DC201E';
    ctx.beginPath();
    ctx.arc(head[0], head[1], pulse, 0, 7);
    ctx.fill();
  };

  const stages = [];
  const initStages = () => {
    [['#stHero', null], ['#stWipe', null], ['#stTl', tlUpdate], ['#stMap', null]].forEach(([sel, fn]) => {
      const el = $(sel);
      if (el) stages.push({ el, fn });
    });
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vh = innerHeight;
      stages.forEach(s => {
        const rect = s.el.getBoundingClientRect();
        const total = s.el.offsetHeight - vh;
        const p = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
        if (s.el.id === 'stHero') heroP = p;
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        s.el.style.setProperty('--p', p.toFixed(4));
        if (s.fn) s.fn(p);
        if (s.el.id === 'stMap') mapP = p;
      });
      const dh = document.documentElement.scrollHeight - vh;
      document.documentElement.style.setProperty('--sp', dh > 0 ? (scrollY / dh).toFixed(4) : '0');
      if (pageCounter && allSections.length) {
        let curr = 0;
        allSections.forEach((sec, i) => {
          if (sec.getBoundingClientRect().top < vh * 0.55) curr = i;
        });
        pageCounter.textContent = String(curr + 1).padStart(2, '0') + ' / ' + String(allSections.length).padStart(2, '0');
      }
    });
  };

  const initScroll = () => {
    allSections = $$('section');
    pageCounter = $('#pageCounter');
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', () => { buildMap(); drawMap(); cacheWm(); onScroll(); });
    new IntersectionObserver(es => es.forEach(e => { mapOn = e.isIntersecting; }), { rootMargin: '120px' })
      .observe($('#stMap'));
    const loop = () => {
      if (!document.hidden) {
        heroFrame();
        if (mapOn && !reduced) drawMap();
      }
      requestAnimationFrame(loop);
    };
    loop();
    onScroll();
  };

  const clock = () => {
    const el = $('#clock');
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const upd = () => { el.textContent = fmt.format(new Date()); };
    setInterval(upd, 1000);
    upd();
  };

  const forms = () => {
    const main = $('#mainForm');
    if (main) main.addEventListener('submit', e => {
      e.preventDefault();
      const [name, mail] = $$('input', main).map(i => i.value.trim());
      const msg = $('textarea', main).value.trim();
      location.href = `mailto:manavaghera@yahoo.com?subject=${encodeURIComponent('RUN REQUEST — ' + name)}&body=${encodeURIComponent(msg + '\n\n— ' + name + ' (' + mail + ')')}`;
      toast('OPENING MAIL CLIENT — TRANSMITTING');
    });
    const copy = $('#copyMail');
    if (copy) copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('manavaghera@yahoo.com'); toast('EMAIL COPIED — MANAVAGHERA@YAHOO.COM'); }
      catch { toast('MANAVAGHERA@YAHOO.COM'); }
    });
  };

  addEventListener('DOMContentLoaded', () => {
    initSplits();
    initObserver();
    initWordmark();
    initHeroPointer();
    initTl();
    canvas = $('#routeCanvas');
    ctx = canvas.getContext('2d');
    buildMap();
    initStages();
    initScroll();
    drawMap();
    clock();
    forms();
    // $('#year').textContent = new Date().getFullYear();
  });
})();
