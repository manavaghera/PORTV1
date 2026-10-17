/**
 * Stack · gravity mode — the neural-net graph can fall apart. Every neuron
 * becomes a physical chip (Matter.js) dropped from exactly where it sat in
 * the graph; grab and throw chips, shake the box, toggle zero-G, drop again,
 * or switch back to the graph. Matter.js loads on the first switch; with
 * reduced motion the Gravity button stays hidden.
 */
(() => {
  'use strict';
  const netBox = document.getElementById('netBox'), box = document.getElementById('playBox');
  const sec = document.getElementById('stack');
  if (!netBox || !box || !sec) return;
  const MA = window.MA = window.MA || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const modeBtns = [...sec.querySelectorAll('[data-mode]')], actBtns = [...sec.querySelectorAll('[data-act]')];
  const rnd = (a, b) => a + Math.random() * (b - a);
  let chips = [], engine = null, walls = [], W = 0, H = 0, active = false, visible = false, zeroG = false, grab = null;

  const buildWalls = () => {
    const { Bodies, Composite } = Matter;
    if (walls.length) Composite.remove(engine.world, walls);
    W = box.clientWidth; H = box.clientHeight;
    const T = 400, o = { isStatic: true, friction: .3, restitution: .3 };
    walls = [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, o),
      Bodies.rectangle(-T / 2, H / 2, T, H * 3, o),
      Bodies.rectangle(W + T / 2, H / 2, T, H * 3, o),
      Bodies.rectangle(W / 2, -T / 2 - H * .5, W + T * 2, T, o)
    ];
    Composite.add(engine.world, walls);
  };
  const paint = () => chips.forEach(c => {
    const { x, y } = c.body.position;
    c.el.style.transform = `translate3d(${(x - c.w / 2).toFixed(1)}px,${(y - c.h / 2).toFixed(1)}px,0) rotate(${c.body.angle.toFixed(3)}rad)`;
  });

  /* every node of the graph becomes a chip, starting where the node was */
  const drop = () => {
    const { Engine, Bodies, Body, Composite } = Matter;
    const nodes = MA.netNodes || [];
    if (!nodes.length) return false;
    if (!engine) engine = Engine.create();
    Composite.clear(engine.world, false);
    walls = []; grab = null;
    buildWalls();
    box.textContent = '';
    chips = nodes.map(n => {
      const el = document.createElement('span');
      el.className = 'chip l' + n.l;
      el.textContent = n.name;
      box.append(el);
      return { el, n };
    });
    chips.forEach(c => {
      c.w = c.el.offsetWidth; c.h = c.el.offsetHeight;
      c.body = Bodies.rectangle(c.n.x, c.n.y, c.w, c.h, { chamfer: { radius: c.h / 2 - 1 }, restitution: .4, friction: .1, frictionAir: .012, density: .0018 });
      Body.setVelocity(c.body, { x: rnd(-1.5, 1.5), y: rnd(-3, 0) });
      Body.setAngularVelocity(c.body, rnd(-.03, .03));
      Composite.add(engine.world, c.body);
    });
    engine.gravity.y = zeroG ? 0 : 1;
    paint();
    return true;
  };

  /* Matter.js (~80 KB) is only fetched the first time someone switches gravity on */
  let loading = null;
  const loadMatter = () => loading = loading || (typeof Matter !== 'undefined' ? Promise.resolve() : new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
    s.async = true; s.onload = ok; s.onerror = no;
    document.head.append(s);
  }));
  const setMode = async m => {
    const g = m === 'gravity';
    if (g) {
      try { await loadMatter(); }
      catch (e) { loading = null; if (MA.toast) MA.toast('The physics engine could not load — try again'); return; }
    }
    if (g && !drop()) return;
    active = g;
    netBox.classList.toggle('gravity', g);
    modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    actBtns.forEach(b => { b.hidden = !g; });
  };
  modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  /* drag & throw: a spring between the pointer and the grabbed chip */
  const at = e => { const r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  box.addEventListener('pointerdown', e => {
    const c = chips.find(k => k.el === e.target.closest('.chip'));
    if (!c || !active) return;
    e.preventDefault();
    box.setPointerCapture(e.pointerId);
    const p = at(e), b = c.body;
    grab = Matter.Constraint.create({ pointA: p, bodyB: b, pointB: { x: p.x - b.position.x, y: p.y - b.position.y }, stiffness: .18, damping: .08, length: 0 });
    Matter.Composite.add(engine.world, grab);
    c.el.classList.add('held');
  });
  box.addEventListener('pointermove', e => { if (grab) grab.pointA = at(e); });
  const release = () => {
    if (!grab) return;
    Matter.Composite.remove(engine.world, grab);
    chips.forEach(c => c.el.classList.remove('held'));
    grab = null;
  };
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', release);

  actBtns.forEach(btn => btn.addEventListener('click', () => {
    const { Body } = Matter, act = btn.dataset.act;
    if (act === 'shake') chips.forEach(c => Body.setVelocity(c.body, { x: rnd(-14, 14), y: rnd(-22, -10) }));
    if (act === 'zero') {
      zeroG = !zeroG;
      engine.gravity.y = zeroG ? 0 : 1;
      btn.setAttribute('aria-pressed', String(zeroG));
      btn.textContent = zeroG ? 'Gravity on' : 'Zero-G';
      if (zeroG) chips.forEach(c => Body.setVelocity(c.body, { x: rnd(-4, 4), y: rnd(-7, -2) }));
    }
    if (act === 'reset') drop();
  }));

  const init = () => {
    if (reduced) { modeBtns.forEach(b => { if (b.dataset.mode === 'gravity') b.hidden = true; }); return; }
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; })).observe(netBox);
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (active) drop(); }, 200); });
    let prev = performance.now();
    const loop = now => {
      requestAnimationFrame(loop);
      const dt = Math.min(32, now - prev);
      prev = now;
      if (!active || !visible || document.hidden) return;
      Matter.Engine.update(engine, dt);
      paint();
    };
    requestAnimationFrame(loop);
  };
  if (document.readyState === 'complete') init(); else addEventListener('load', init);
})();
