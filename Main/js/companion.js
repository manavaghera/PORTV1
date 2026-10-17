/**
 * Companion — once you scroll past the hero, its butterfly comes along for
 * the rest of the page. It perches on the heading of the section you're
 * reading, drifts over to whatever you hover for a moment, rides along as
 * things scroll, and startles if you click near it (that counts as catching
 * it). It borrows its drawing from garden.js; off for reduced motion.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const hero = document.getElementById('top');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const HOVER = '.btn, .now-card, .svc-head, .award, .lab-tabs [role="tab"], .soc, .repo-list a, .gh-stats > div, .lab-stage, .heat-card, .qcard, .nav-cta';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  let bf = null, wl = null, wr = null, active = false, T = 0, prev = performance.now();
  const B = { x: 0, y: -60, vx: 0, vy: 0, h: 0, panic: 0, flap: 0, restH: 0 };
  let spot = null, hover = null, hoverAt = 0, scanAt = 0;

  const make = () => {
    if (bf) return true;
    if (!MA.bflyHTML) return false;
    bf = document.createElement('div');
    bf.className = 'bfly page';
    bf.setAttribute('aria-hidden', 'true');
    bf.innerHTML = MA.bflyHTML;
    document.body.append(bf);
    wl = bf.querySelector('.wl'); wr = bf.querySelector('.wr');
    return true;
  };

  /* a place to land: an element and a fixed spot along its top edge */
  const perchOn = (node, fx) => ({ node, fx, at: () => {
    const r = node.getBoundingClientRect();
    if (!r.width || r.bottom < 40 || r.top > innerHeight - 20) return null;
    return [r.left + r.width * fx, r.top + 2];
  } });
  const headingSpot = () => {
    let best = null, bd = 1e9;
    document.querySelectorAll('.sec-head h2, .contact-title').forEach(h => {
      const r = h.getBoundingClientRect();
      if (r.bottom < 70 || r.top > innerHeight * .75) return;
      const d = Math.abs(r.top - innerHeight * .25);
      if (d < bd) { bd = d; best = h; }
    });
    if (!best) return null;
    return { node: best, at: () => {
      const rg = document.createRange();
      rg.selectNodeContents(best);
      const rs = rg.getClientRects(), last = rs[rs.length - 1];
      if (!last || last.bottom < 40 || last.top > innerHeight) return null;
      return [last.right - 8, last.top + last.height * .12];
    } };
  };
  addEventListener('pointerover', e => {
    const n = e.target.closest && e.target.closest(HOVER);
    if (n && n !== (hover && hover.node)) { hover = perchOn(n, .2 + Math.random() * .6); hoverAt = performance.now(); }
    if (!n) hover = null;
  }, { passive: true });
  addEventListener('pointerdown', e => {
    if (!active) return;
    const dx = B.x - e.clientX, dy = B.y - e.clientY, d = Math.hypot(dx, dy) || 1;
    if (d > 44) return;
    B.panic = 1.2; spot = null;
    B.vx += dx / d * 800; B.vy += dy / d * 800 - 240;
    if (MA.achieve) MA.achieve('catch');
  }, { passive: true });

  const render = wing => {
    bf.style.transform = `translate3d(${B.x.toFixed(1)}px,${B.y.toFixed(1)}px,0) rotate(${B.h.toFixed(3)}rad)`;
    const t = `scale(${wing.toFixed(3)} 1)`;
    wl.setAttribute('transform', t); wr.setAttribute('transform', t);
  };
  const tick = now => {
    requestAnimationFrame(tick);
    const dt = Math.min(.05, (now - prev) / 1000);
    prev = now;
    if (!active || document.hidden) return;
    T += dt;
    B.panic = Math.max(0, B.panic - dt);
    /* what to land on: something you've hovered for a beat, else the heading you're reading */
    if (hover && now - hoverAt > 650 && hover.at()) spot = hover;
    else if (now - scanAt > 300) { scanAt = now; if (!spot || spot === hover || !spot.at()) spot = headingSpot(); }
    const p = spot && !B.panic ? spot.at() : null;
    const tx = p ? p[0] : innerWidth - 70 + Math.sin(T * .6) * 30, ty = p ? p[1] : 90 + Math.sin(T * .9) * 26;
    const dx = tx - B.x, dy = ty - B.y, d = Math.hypot(dx, dy) || 1;
    if (p && d < 10) {
      /* perched: ride along with the element, wings opening and closing slowly */
      B.x = tx; B.y = ty; B.vx = B.vy = 0;
      B.h += angDiff(B.restH, B.h) * Math.min(1, dt * 4);
      render(.3 + .6 * Math.pow(.5 + .5 * Math.cos(T * 1.3), 2));
      return;
    }
    if (!B.panic) {
      const sp = Math.min(520, d * 3 + 40), wob = Math.sin(T * 7.3) * 60 + Math.sin(T * 3.1) * 30, k = Math.min(1, dt * 3.4);
      B.vx += (dx / d * sp - dy / d * wob * .5 - B.vx) * k;
      B.vy += (dy / d * sp + dx / d * wob * .5 + Math.sin(T * 11) * 30 - B.vy) * k;
    } else { B.vx *= 1 - dt * 1.6; B.vy *= 1 - dt * 1.6; }
    B.x = clamp(B.x + B.vx * dt, -60, innerWidth + 60); B.y = clamp(B.y + B.vy * dt, -60, innerHeight + 60);
    if (Math.hypot(B.vx, B.vy) > 20) B.h += angDiff(Math.atan2(B.vy, B.vx) + Math.PI / 2, B.h) * Math.min(1, dt * 7);
    B.restH = (Math.random() - .5) * .6 * .02 + B.restH * .98;
    B.flap += dt * 24;
    render(.14 + .86 * Math.abs(Math.cos(B.flap)));
  };

  /* on duty only while the hero (and its own butterfly) is out of view */
  new IntersectionObserver(es => es.forEach(e => {
    if (!make()) return;
    active = !e.isIntersecting;
    bf.classList.toggle('on', active);
    if (active) { B.x = innerWidth + 30; B.y = 60; B.vx = -260; B.vy = 60; spot = null; }
  }), { threshold: 0 }).observe(hero);
  requestAnimationFrame(tick);
})();
