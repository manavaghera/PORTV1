/**
 * Commit Breaker — Breakout, played on the contribution calendar. Every square
 * with commits becomes a brick (busier days take more hits), the paddle follows
 * the pointer or the arrow keys, space or a click launches the ball, Esc quits.
 */
(() => {
  'use strict';
  const card = document.querySelector('#commits .heat-card'), btn = document.getElementById('heatPlay');
  const scroller = document.getElementById('heatScroll'), heat = document.getElementById('heat');
  if (!card || !btn || !scroller || !heat) return;
  const MA = window.MA = window.MA || {};
  const TAU = Math.PI * 2;
  let cv = null, ctx = null, hud = null, msg = null, raf = 0, W = 0, H = 0, dpr = 1;
  let bricks = [], ghosts = [], bits = [], paddle = null, ball = null, score = 0, lives = 3, state = 'off', keys = 0, prev = 0, total = 0;

  const colours = () => {
    const legend = [...card.querySelectorAll('.heat-legend i')].map(i => getComputedStyle(i).backgroundColor);
    const s = getComputedStyle(card);
    return { lv: legend, text: s.getPropertyValue('--text').trim() || '#fff', accent: s.getPropertyValue('--accent').trim() || '#fff' };
  };
  let C = null;

  const setup = () => {
    const cr = card.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
    const top = sr.top - cr.top;
    W = card.clientWidth; H = card.clientHeight - top;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.style.top = top + 'px';
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    bricks = []; ghosts = [];
    heat.querySelectorAll('i').forEach(i => {
      const r = i.getBoundingClientRect();
      if (r.right < sr.left || r.left > sr.right || !r.width) return;
      const b = { x: r.left - cr.left, y: r.top - cr.top - top, w: r.width, h: r.height, hp: +i.dataset.l || 0 };
      (b.hp ? bricks : ghosts).push(b);
    });
    total = bricks.length;
    const pw = Math.max(70, Math.min(120, W * .14));
    paddle = { x: W / 2, w: pw, y: H - 26 };
    resetBall();
  };
  const resetBall = () => { ball = { x: paddle.x, y: paddle.y - 10, vx: 0, vy: 0, r: 5, stuck: true, speed: Math.max(300, W * .45) }; };
  const launch = () => {
    if (state === 'over' || state === 'won') { start(); return; }
    if (!ball.stuck) return;
    const a = -Math.PI / 2 + (Math.random() - .5) * .9;
    ball.vx = Math.cos(a) * ball.speed; ball.vy = Math.sin(a) * ball.speed; ball.stuck = false;
    say('');
  };
  const say = t => { msg.textContent = t; msg.classList.toggle('on', !!t); };
  const updateHud = () => { hud.textContent = `score ${score} · ${'●'.repeat(lives)}${'○'.repeat(3 - lives)} · ${bricks.length} of ${total} commit days left · esc to quit`; };

  const burst = b => {
    for (let k = 0; k < 10; k++) bits.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: (Math.random() - .5) * 260, vy: (Math.random() - .8) * 240, life: 1, c: C.lv[Math.min(4, b.max || 1)] });
  };
  const step = dt => {
    if (keys) paddle.x += keys * 520 * dt;
    paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));
    if (ball.stuck) { ball.x = paddle.x; ball.y = paddle.y - 10; return; }
    const n = 4;
    for (let s = 0; s < n; s++) {
      ball.x += ball.vx * dt / n; ball.y += ball.vy * dt / n;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
      /* paddle: where it hits sets the angle */
      if (ball.vy > 0 && ball.y + ball.r > paddle.y - 4 && ball.y < paddle.y + 6 && Math.abs(ball.x - paddle.x) < paddle.w / 2 + ball.r) {
        const off = (ball.x - paddle.x) / (paddle.w / 2), a = -Math.PI / 2 + off * 1.05;
        ball.vx = Math.cos(a) * ball.speed; ball.vy = Math.sin(a) * ball.speed; ball.y = paddle.y - 4 - ball.r;
      }
      for (let i = 0; i < bricks.length; i++) {
        const b = bricks[i], nx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), ny = Math.max(b.y, Math.min(ball.y, b.y + b.h));
        if ((ball.x - nx) ** 2 + (ball.y - ny) ** 2 > ball.r * ball.r) continue;
        const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r)), oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
        if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
        b.max = b.max || b.hp;
        if (--b.hp <= 0) { burst(b); bricks.splice(i, 1); score += 10 * b.max; if (total - bricks.length >= 25 && MA.achieve) MA.achieve('breaker'); } else score += 5;
        if (MA.sfx) MA.sfx('hit');
        ball.speed = Math.min(W * .9, ball.speed * 1.006);
        const sp = Math.hypot(ball.vx, ball.vy) || 1; ball.vx *= ball.speed / sp; ball.vy *= ball.speed / sp;
        updateHud();
        break;
      }
    }
    if (ball.y > H + 20) {
      lives--; updateHud();
      if (lives <= 0) { state = 'over'; say(`Game over — ${score} points. git reset --hard? Click to play again.`); }
      else { resetBall(); say('Missed. Click or press space to launch.'); }
    }
    if (!bricks.length && state === 'play') { state = 'won'; say(`You broke a whole year of commits — ${score} points. git reflog will save me.`); if (MA.confetti) MA.confetti(); }
  };
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.lv[0];
    ghosts.forEach(b => { ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 3); ctx.fill(); });
    bricks.forEach(b => { ctx.fillStyle = C.lv[Math.min(4, b.hp)]; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 3); ctx.fill(); });
    bits = bits.filter(p => (p.life -= .025) > 0);
    bits.forEach(p => { p.vy += 9; p.x += p.vx / 60; p.y += p.vy / 60; ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); });
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.roundRect(paddle.x - paddle.w / 2, paddle.y - 4, paddle.w, 8, 4); ctx.fill();
    ctx.fillStyle = C.text; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, TAU); ctx.fill();
  };
  const loop = now => {
    if (!ctx) return; // quit since this frame was queued
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.033, (now - prev) / 1000);
    prev = now;
    if (document.hidden) return;
    if (state === 'play') step(dt);
    draw();
  };

  const onKey = e => {
    if (state === 'off') return;
    if (e.key === 'Escape') { quit(); return; }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); keys = e.type === 'keydown' ? (e.key === 'ArrowLeft' ? -1 : 1) : 0; }
    if (e.key === ' ' && e.type === 'keydown') { e.preventDefault(); launch(); }
  };
  const onMove = e => { if (!cv) return; const r = cv.getBoundingClientRect(); paddle.x = e.clientX - r.left; };
  const start = () => {
    C = colours(); score = 0; lives = 3; bits = []; state = 'play';
    setup(); updateHud(); say('Click or press space to launch. Move with the mouse or arrow keys.');
  };
  const open = () => {
    if (!heat.querySelector('i[data-l="1"],i[data-l="2"],i[data-l="3"],i[data-l="4"]')) { if (MA.toast) MA.toast('Commits are still loading — try again in a second'); return; }
    if (cv) return;
    card.classList.add('playing');
    btn.textContent = '✕ quit game';
    cv = document.createElement('canvas'); cv.className = 'breaker';
    hud = document.createElement('p'); hud.className = 'breaker-hud mono';
    msg = document.createElement('p'); msg.className = 'breaker-msg mono';
    card.append(cv, hud, msg);
    ctx = cv.getContext('2d');
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerdown', e => { onMove(e); launch(); });
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);
    /* the card grows a little to make room for the paddle; measure once that has settled */
    requestAnimationFrame(() => { start(); prev = performance.now(); raf = requestAnimationFrame(loop); });
  };
  const quit = () => {
    cancelAnimationFrame(raf);
    removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
    [cv, hud, msg].forEach(n => n && n.remove());
    cv = ctx = hud = msg = null; state = 'off'; keys = 0;
    card.classList.remove('playing');
    btn.textContent = '▶ play commit breaker';
  };
  btn.addEventListener('click', () => (cv ? quit() : open()));
  addEventListener('resize', () => { if (cv) quit(); });
})();
