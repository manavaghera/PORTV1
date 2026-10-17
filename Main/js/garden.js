/**
 * Hero name — it types itself out, then a garden grows through it: a vine
 * draws across each line, leaves unfurl, roses bloom (wheat and seed heads in
 * the Field palette). Then a butterfly drops by. It trails the cursor, lands
 * on a flower when you stop, startles when you click and, when you scroll,
 * flies into the hero's focus — Lumora's big eye, or Field's sun. Its position is shared as
 * MA.bfly so the eyes in the art (art.js) can watch it.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const pin = $('heroPin'), name = $('heroName'), typeEl = $('heroType');
  if (!pin || !name) return;
  const MA = window.MA = window.MA || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const field = document.documentElement.dataset.palette === 'field';
  const NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const rng = seed => () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const f = n => n.toFixed(1);
  const svg = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };

  /* ── split the name into letters (intro.js flies them apart on scroll) ── */
  const chars = [];
  name.querySelectorAll('.n1, .n2').forEach(part => {
    const text = part.textContent;
    part.textContent = '';
    [...text].forEach(c => {
      const s = document.createElement('span');
      s.className = 'ch'; s.textContent = c; s.setAttribute('aria-hidden', 'true');
      part.append(s); chars.push(s);
    });
  });

  /* ── typed role line ── */
  const ROLES = ['AI/ML engineer', 'building RAG that stays grounded', 'shipping multi-agent systems', 'running vision offline', 'Kaggle top 1%, twice'];
  if (typeEl && !reduced) {
    let r = 0, n = typeEl.textContent.length, dir = -1;
    const step = () => {
      const word = ROLES[r];
      n += dir;
      typeEl.textContent = word.slice(0, Math.max(0, n));
      if (dir > 0 && n >= word.length) { dir = -1; return setTimeout(step, 1800); }
      if (dir < 0 && n <= 0) { dir = 1; r = (r + 1) % ROLES.length; }
      setTimeout(step, dir > 0 ? 55 + Math.random() * 40 : 28);
    };
    setTimeout(step, 4200);
  }

  /* ── the name types itself; a zero-width caret rides along without shifting letters ── */
  const typeName = () => new Promise(done => {
    if (reduced) { chars.forEach(c => c.classList.add('on')); return done(); }
    const caret = document.createElement('i');
    caret.className = 'tcaret'; caret.setAttribute('aria-hidden', 'true');
    chars[0].before(caret);
    let i = 0;
    const step = () => {
      const c = chars[i++];
      c.classList.add('on'); c.after(caret);
      if (i < chars.length) return setTimeout(step, c.parentNode !== chars[i].parentNode ? 300 : 60 + Math.random() * 80);
      setTimeout(() => caret.classList.add('gone'), 500);
      done();
    };
    setTimeout(step, 500);
  });

  /* ── a rose: scalloped petals and a spiral heart, drawn on a radius of 50 ── */
  const rosePaths = r => {
    const ph = r() * TAU, k = 5 + (r() * 3 | 0);
    let petal = '', curl = '';
    for (let i = 0; i <= 64; i++) {
      const a = i / 64 * TAU, m = 1 - .14 * Math.pow(Math.abs(Math.sin(a * k / 2 + ph)), .55);
      petal += (i ? 'L' : 'M') + f(Math.cos(a) * 50 * m) + ' ' + f(Math.sin(a) * 44 * m);
    }
    const turns = 2.1 + r() * .7;
    for (let i = 0; i <= 44; i++) {
      const t = i / 44, a = ph + t * turns * TAU, rad = 3 + t * 31;
      curl += (i ? 'L' : 'M') + f(Math.cos(a) * rad) + ' ' + f(Math.sin(a) * rad * .84 - 2);
    }
    [ph + 1, ph + 3.5].forEach(a0 => {
      const a1 = a0 + .95, am = (a0 + a1) / 2;
      curl += `M${f(Math.cos(a0) * 37)} ${f(Math.sin(a0) * 32)}Q${f(Math.cos(am) * 49)} ${f(Math.sin(am) * 43)} ${f(Math.cos(a1) * 37)} ${f(Math.sin(a1) * 32)}`;
    });
    return { petal: petal + 'Z', curl };
  };
  /* ── Field flora: an ear of wheat (100 tall, base at 0,0) and a dandelion clock (radius 50) ── */
  const WHEAT = (() => {
    let kern = '', awn = '';
    for (let i = 0; i < 7; i++) {
      const y = f(-60 - i * 6.2), ya = f(-63 - i * 6.2), yb = f(-77 - i * 6.2);
      kern += `<ellipse class="kern" cx="-3.2" cy="${y}" rx="2.7" ry="5" transform="rotate(-24 -3.2 ${y})"/><ellipse class="kern" cx="3.2" cy="${y}" rx="2.7" ry="5" transform="rotate(24 3.2 ${y})"/>`;
      awn += `M-5 ${ya}L-11 ${yb}M5 ${ya}L11 ${yb}`;
    }
    return { kern: kern + '<ellipse class="kern" cx="0" cy="-104" rx="2.5" ry="5"/>', awn: awn + 'M0 -108L0 -124' };
  })();
  const PUFF = (() => {
    let rays = '', tips = '';
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * TAU + .1, x = f(Math.cos(a) * 44), y = f(Math.sin(a) * 44);
      rays += `M0 0L${x} ${y}`; tips += `<circle class="tip" cx="${x}" cy="${y}" r="3.2"/>`;
    }
    return `<path class="puff" d="${rays}"/>${tips}<circle class="core" cx="0" cy="0" r="7"/>`;
  })();
  /* Catmull-Rom through the points, as cubic Béziers */
  const spline = pts => {
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
    }
    return d;
  };
  /* offsets relative to the heading (each line has perspective, which makes it an offsetParent) */
  const at = el => { let x = 0, y = 0; for (let n = el; n && n !== name; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return [x, y]; };
  const curlPts = (cx, cy, rad, from, dir) => Array.from({ length: 9 }, (_, k) => {
    const a = from + dir * k * .62, q = rad * (1 - k / 11);
    return [cx + Math.cos(a) * q, cy + Math.sin(a) * q];
  });

  /* ── the garden: vines + leaves behind the letters, roses in front ── */
  let back = null, front = null, roses = [];
  const build = animate => {
    if (back) { back.remove(); front.remove(); }
    const w = name.offsetWidth, h0 = name.offsetHeight, r = rng(11);
    const mk = cls => { const s = svg('svg', { class: 'garden ' + cls + (animate ? '' : ' still'), width: w, height: h0, viewBox: `0 0 ${w} ${h0}`, 'aria-hidden': 'true' }); return s; };
    back = mk('back'); front = mk('front');
    name.prepend(back); name.append(front);
    roses = [];
    const VINE = 1.5, lines = [...name.querySelectorAll('.n1, .n2')];
    lines.forEach((line, li) => {
      const ls = [...line.querySelectorAll('.ch')];
      if (!ls.length) return;
      const a = ls[0], z = ls[ls.length - 1], h = a.offsetHeight, [x0, top] = at(a), x1 = at(z)[0] + z.offsetWidth;
      const y = top + h * .6, amp = h * .07, ext = h * .3;
      const xs = x0 - ext, xe = x1 + ext, n = Math.max(4, Math.round((xe - xs) / (h * .42)));
      const mid = Array.from({ length: n + 1 }, (_, i) => [xs + (xe - xs) * i / n, y + (i % 2 ? -1 : 1) * amp * (.5 + r() * .7)]);
      /* tendril curls at both ends: the vine leaves the left curl and winds into the right one */
      const pts = [...curlPts(xs, y - h * .13, h * .13, Math.PI / 2, 1).slice(1).reverse(), ...mid, ...curlPts(xe, y - h * .13, h * .13, Math.PI / 2, -1).slice(1)];
      const t0 = li * .35;
      const vine = svg('path', { class: 'vine', d: spline(pts) }, back);
      const L = vine.getTotalLength();
      vine.style.cssText = `stroke-dasharray:${f(L)};--len:${f(L)};--d:${t0}s;--dur:${VINE}s`;
      /* leaves, alternating sides, unfurling as the vine reaches them */
      for (let s = L * .05, side = 1; s < L * .95; s += h * (.22 + r() * .12), side = -side) {
        const p = vine.getPointAtLength(s), q = vine.getPointAtLength(Math.min(L, s + 2));
        const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI + side * (38 + r() * 30), len = h * (field ? .16 + r() * .1 : .12 + r() * .08), wd = field ? .1 : .34;
        const g = svg('g', { transform: `translate(${f(p.x)} ${f(p.y)}) rotate(${f(ang)})` }, back);
        const u = svg('g', { class: 'unfurl', style: `--d:${(t0 + s / L * VINE).toFixed(2)}s` }, g);
        svg('path', { class: 'leaf', d: `M0 0Q${f(len * .45)} ${f(-len * wd)} ${f(len)} 0Q${f(len * .45)} ${f(len * wd)} 0 0Z` }, u);
        svg('path', { class: 'vein', d: `M0 0L${f(len * .78)} 0` }, u);
      }
      if (field) {
        /* wheat rising behind the letters, and a few seed heads in front */
        const count = Math.max(5, Math.round((x1 - x0) / (h * .26)));
        for (let i = 0; i < count; i++) {
          const x = x0 - h * .12 + (i + .2 + r() * .6) / count * (x1 - x0 + h * .24), tall = h * (li === 0 ? .42 + r() * .2 : .55 + r() * .3);
          const g = svg('g', { transform: `translate(${f(x)} ${f(y + (r() - .5) * h * .1)}) rotate(${f((r() - .5) * 26)}) scale(${(tall / 100).toFixed(3)})` }, back);
          const s = svg('g', { class: 'sprout', style: `--d:${(t0 + VINE * .2 + (x - xs) / (xe - xs) * VINE).toFixed(2)}s` }, g);
          svg('path', { class: 'stem', d: `M0 0Q${f((r() - .5) * 10)} -30 0 -58` }, s);
          const ear = svg('g', { class: 'ear' }, s);
          ear.innerHTML = WHEAT.kern;
          svg('path', { class: 'awn', d: WHEAT.awn }, s);
          roses.push({ el: ear, rad: tall * .1 });
        }
        for (let i = 0, n2 = 2 + (r() * 2 | 0); i < n2; i++) {
          const x = x0 + r() * (x1 - x0), rad = h * (.1 + r() * .05), yy = li === 0 ? top + h * (.02 + r() * .15) : top + h * (.9 + r() * .1);
          const g = svg('g', { transform: `translate(${f(x)} ${f(yy)}) scale(${(rad / 50).toFixed(3)})` }, front);
          const b = svg('g', { class: 'bloom', style: `--d:${(t0 + VINE * .6 + r() * .8).toFixed(2)}s` }, g);
          b.innerHTML = PUFF;
          roses.push({ el: g, rad });
        }
        return;
      }
      /* roses: above the caps on the first line, under the baseline on the last, some riding the vine */
      const count = Math.max(4, Math.round((x1 - x0) / (h * .4))), placed = [];
      for (let tries = 0; placed.length < count && tries < count * 30; tries++) {
        const x = x0 - h * .1 + r() * (x1 - x0 + h * .2), rad = h * (.085 + r() * .075), zone = r();
        const yy = zone < .45 ? (li === 0 ? top + h * (.02 + r() * .2) : top + h * (.86 + r() * .14)) : y + (r() - .5) * h * .22;
        if (placed.some(([px, py, pr]) => Math.hypot(px - x, py - yy) < (pr + rad) * .9)) continue;
        placed.push([x, yy, rad]);
      }
      placed.sort((p, q) => p[0] - q[0]).forEach(([x, yy, rad]) => {
        const pp = rosePaths(r), tint = r() < .28;
        const g = svg('g', { class: 'rose' + (tint ? ' t' : ''), transform: `translate(${f(x)} ${f(yy)}) rotate(${f(r() * 360)}) scale(${(rad / 50).toFixed(3)})` }, front);
        const b = svg('g', { class: 'bloom', style: `--d:${(t0 + VINE * .25 + (x - xs) / (xe - xs) * VINE).toFixed(2)}s` }, g);
        svg('path', { class: 'petal', d: pp.petal }, b);
        svg('path', { class: 'curl', d: pp.curl }, b);
        roses.push({ el: g, rad });
      });
    });
  };

  /* ── the butterfly ── */
  const WING = '<path class="fw" d="M-1-3C-6-16-20-23-22-13C-23-6-14-2-1-1Z"/><path class="hw" d="M-1 0C-12 1-19 8-15 15C-11 20-4 11-1 3Z"/>'
    + '<path class="vn" d="M-2-2L-17-14M-2-2L-19-7M-2 1L-13 11"/><circle class="sp" cx="-16" cy="-13" r="2.3"/><circle class="sp" cx="-19.4" cy="-8.6" r="1.3"/><circle class="sp" cx="-12" cy="10.5" r="1.6"/>';
  const bf = document.createElement('div');
  bf.className = 'bfly';
  bf.setAttribute('aria-hidden', 'true');
  bf.innerHTML = `<svg viewBox="-24 -24 48 48"><g class="wl">${WING}</g><g class="wr"><g transform="scale(-1 1)">${WING}</g></g>`
    + '<path class="ant" d="M-.6-9Q-3-16-5.5-19.5M.6-9Q3-16 5.5-19.5"/><ellipse class="bd" cx="0" cy="0" rx="1.7" ry="8.5"/><circle class="bd" cx="0" cy="-9" r="2"/></svg>';
  pin.append(bf);
  MA.bflyHTML = bf.innerHTML; // companion.js flies the same butterfly down the rest of the page
  const wl = bf.querySelector('.wl'), wr = bf.querySelector('.wr');

  const B = { x: -60, y: 120, vx: 0, vy: 0, h: 0, st: 'off', spot: null, rose: null, rest: 0, flap: 0, s: 1, panic: 0 };
  let px = 0, py = 0, lastMove = -1e5, T = 0;
  const roseAt = rs => {
    const a = rs.el.getBoundingClientRect(), b = pin.getBoundingClientRect();
    return [a.left + a.width / 2 - b.left, a.top + a.height * .38 - b.top];
  };
  const pickRose = not => { const pool = roses.filter(x => x !== not); return pool[Math.random() * pool.length | 0] || null; };
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  pin.addEventListener('pointermove', e => { const b = pin.getBoundingClientRect(); px = e.clientX - b.left; py = e.clientY - b.top; lastMove = performance.now(); });
  pin.addEventListener('pointerleave', () => { lastMove = -1e5; });
  pin.addEventListener('pointerdown', e => {
    if (B.st === 'off' || reduced) return;
    const b = pin.getBoundingClientRect(), dx = B.x - (e.clientX - b.left), dy = B.y - (e.clientY - b.top), d = Math.hypot(dx, dy) || 1;
    if (d < 40 && MA.achieve) MA.achieve('catch');
    B.st = 'fly'; B.rose = null; B.panic = 1.1;
    B.vx += dx / d * 700; B.vy += dy / d * 700 - 200;
  });

  const render = wing => {
    bf.style.transform = `translate3d(${f(B.x)}px,${f(B.y)}px,0) rotate(${B.h.toFixed(3)}rad) scale(${B.s.toFixed(3)})`;
    const t = `scale(${wing.toFixed(3)} 1)`;
    wl.setAttribute('transform', t); wr.setAttribute('transform', t);
    const b = pin.getBoundingClientRect();
    MA.bfly = { x: b.left + B.x, y: b.top + B.y, on: B.st !== 'off' && B.s > .3 };
  };
  const land = rs => { B.st = 'perch'; B.rose = rs; B.spot = roseAt(rs); B.rest = 3 + Math.random() * 5; B.restH = (Math.random() - .5) * .9; };

  let prev = performance.now(), visible = true;
  const tick = now => {
    requestAnimationFrame(tick);
    const dt = Math.min(.05, (now - prev) / 1000);
    prev = now;
    if (B.st === 'off' || !visible || document.hidden) return;
    T += dt;
    const q = MA.heroP || 0, moving = now - lastMove < 1400;
    let tx = B.x, ty = B.y, speed = 280;
    B.panic = Math.max(0, B.panic - dt);
    if (q > .012) {
      /* scrolling: off into the big eye — or, in Field, into the setting sun */
      const e = MA.heroFocus && MA.heroFocus(), b = pin.getBoundingClientRect();
      [tx, ty] = e ? [e[0] - b.left, e[1] - b.top] : [B.x, -80];
      if (B.st !== 'away') { B.st = 'away'; B.rose = null; }
      speed = 620;
      B.s += (Math.max(.05, 1 - smooth(.012, .12, q)) - B.s) * Math.min(1, dt * 6);
    } else {
      B.s += (1 - B.s) * Math.min(1, dt * 4);
      if (B.st === 'away') { B.st = 'fly'; B.rose = null; }
    }
    if (B.st === 'perch') {
      B.rest -= dt;
      const near = moving && Math.hypot(px - B.x, py - B.y) < 120;
      if (near || B.rest <= 0 || (moving && B.rest < 2)) { B.st = 'fly'; B.vy -= 160; B.rose = moving ? null : pickRose(B.rose); }
      else {
        [tx, ty] = B.spot;
        B.x += (tx - B.x) * Math.min(1, dt * 8); B.y += (ty - B.y) * Math.min(1, dt * 8);
        B.h += angDiff(B.restH, B.h) * Math.min(1, dt * 4);
        render(.3 + .6 * Math.pow(.5 + .5 * Math.cos(T * 1.3), 2));
        return;
      }
    }
    if (B.st === 'fly') {
      if (moving && !B.panic) { const a = T * 1.7; tx = px + Math.cos(a) * 58; ty = py + Math.sin(a * 1.3) * 40 - 24; }
      else if (!B.panic) {
        if (!B.rose) B.rose = pickRose(null);
        if (B.rose) { [tx, ty] = roseAt(B.rose); if (Math.hypot(tx - B.x, ty - B.y) < 9) land(B.rose); }
      }
    }
    if (!B.panic || B.st === 'away') {
      const dx = tx - B.x, dy = ty - B.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(speed, d * 2.6 + 26);
      const wob = Math.sin(T * 7.3) * 70 + Math.sin(T * 3.1) * 40;
      const k = Math.min(1, dt * 3.2);
      B.vx += (dx / d * sp - dy / d * wob * .6 - B.vx) * k;
      B.vy += (dy / d * sp + dx / d * wob * .6 + Math.sin(T * 11) * 36 - B.vy) * k;
    } else { B.vx *= 1 - dt * 1.5; B.vy *= 1 - dt * 1.5; }
    B.x += B.vx * dt; B.y += B.vy * dt;
    const pw = pin.clientWidth, ph = pin.clientHeight;
    if (B.st !== 'away') { B.x = clamp(B.x, -40, pw + 40); B.y = clamp(B.y, -40, ph + 40); }
    if (Math.hypot(B.vx, B.vy) > 20) B.h += angDiff(Math.atan2(B.vy, B.vx) + Math.PI / 2, B.h) * Math.min(1, dt * 7);
    B.flap += dt * 24;
    render(.14 + .86 * Math.abs(Math.cos(B.flap)));
  };

  /* ── sequence: type → grow → butterfly arrives ── */
  const start = () => typeName().then(() => {
    build(!reduced);
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(false); if (B.rose) B.rose = null; if (B.st === 'perch') B.st = 'fly'; }, 160); });
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; })).observe(pin);
    if (!roses.length) return;
    if (reduced) { B.st = 'perch'; const rs = roses[roses.length - 1]; [B.x, B.y] = roseAt(rs); B.st = 'still'; render(.6); bf.classList.add('on'); return; }
    setTimeout(() => {
      B.st = 'fly'; B.x = -40; B.y = pin.clientHeight * .22; B.vx = 260; B.vy = 40;
      B.rose = roses[roses.length - 2] || roses[0];
      bf.classList.add('on');
      requestAnimationFrame(tick);
    }, 2600);
  });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
})();
