/**
 * Small delights. Sound: generated with WebAudio (no files) — soft clicks,
 * key ticks, a chime for achievements and a quiet garden ambience; off by
 * default, toggled from the nav and remembered. Paper plane: MA.flyPlane()
 * folds the contact message into a plane that flies off while it sends.
 */
(() => {
  'use strict';
  const MA = window.MA = window.MA || {};
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'ma-sound';

  /* ── sound ── */
  let ac = null, on = false, amb = null, birds = 0;
  const audio = () => ac || (ac = new (window.AudioContext || window.webkitAudioContext)());
  const tone = (f0, f1, dur, type = 'sine', vol = .04, delay = 0) => {
    const a = audio(), t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .03);
  };
  const noise = (dur, f0, f1, vol, q = 1) => {
    const a = audio(), t = a.currentTime, n = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  };
  const SFX = {
    click: () => tone(880, 560, .07, 'sine', .03),
    key: () => noise(.025, 3200, 2400, .03, 2),
    hit: () => tone(420, 240, .07, 'triangle', .035),
    win: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, f * 1.003, .28, 'triangle', .045, i * .085)),
    whoosh: () => noise(.9, 400, 2600, .06, .8)
  };
  MA.sfx = name => { if (on && SFX[name]) { try { SFX[name](); } catch (e) { /* audio unavailable */ } } };

  /* ambience: wind (looping filtered noise with a slow swell) plus the odd bird — or crickets in Field */
  const startAmb = () => {
    if (amb) return;
    const a = audio(), n = a.sampleRate * 3, buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
    s.buffer = buf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 700;
    g.gain.value = .05; lfo.frequency.value = .08; lg.gain.value = .03;
    lfo.connect(lg).connect(g.gain); s.connect(f).connect(g).connect(a.destination);
    s.start(); lfo.start();
    amb = { s, lfo, g };
    const chirp = () => {
      if (!amb || document.hidden) return;
      if (root.dataset.palette === 'field') { for (let i = 0; i < 6; i++) tone(4600, 4400, .03, 'sine', .006, i * .06); }
      else { const f = 2600 + Math.random() * 1400; tone(f, f * 1.35, .09, 'sine', .01); tone(f * 1.2, f * .9, .12, 'sine', .008, .14); }
    };
    birds = setInterval(chirp, 3800);
  };
  const stopAmb = () => { if (!amb) return; try { amb.s.stop(); amb.lfo.stop(); } catch (e) { /* already stopped */ } amb = null; clearInterval(birds); };
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'nav-sound';
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h3l5-4v14l-5-4H4z"/><path class="w1" d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path class="w2" d="M18 7a7 7 0 0 1 0 10"/><path class="x" d="m16 9 5 6m0-6-5 6"/></svg>';
  const themeBtn = document.getElementById('themeBtn');
  if (themeBtn) themeBtn.before(btn);
  const set = (v, save = true) => {
    on = v;
    btn.setAttribute('aria-pressed', String(v)); btn.setAttribute('aria-label', v ? 'Turn sound off' : 'Turn sound on');
    if (save) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* not remembered */ } }
    if (v) { try { audio().resume(); startAmb(); } catch (e) { on = false; } } else stopAmb();
  };
  btn.addEventListener('click', () => { set(!on); if (on) MA.sfx('click'); if (MA.toast) MA.toast(on ? 'Sound on' : 'Sound off'); });
  let wanted = false;
  try { wanted = localStorage.getItem(KEY) === '1'; } catch (e) { /* default off */ }
  btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', 'Turn sound on');
  /* browsers only allow audio after a gesture, so a remembered "on" waits for the first one */
  if (wanted) addEventListener('pointerdown', () => { if (!on) set(true, false); }, { once: true });
  document.addEventListener('click', e => { if (e.target.closest('button, a, [role="tab"]') && !e.target.closest('.nav-sound')) MA.sfx('click'); });
  document.addEventListener('visibilitychange', () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (on) ac.resume(); });

  /* ── paper plane: the message folds up and flies off while it sends ── */
  MA.flyPlane = text => new Promise(done => {
    if (reduced || !text || !Element.prototype.animate) return done();
    setTimeout(done, 2400); // animations pause in background tabs; never hold the send hostage
    const r = text.getBoundingClientRect(), sheet = document.createElement('div');
    sheet.className = 'plane-sheet';
    sheet.textContent = text.value.slice(0, 400);
    Object.assign(sheet.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    document.body.append(sheet);
    MA.sfx('whoosh');
    const fold = sheet.animate([{ transform: 'none', borderRadius: '14px' }, { transform: 'scale(.5,.3) rotate(-4deg)', borderRadius: '8px', color: 'transparent' }, { transform: 'scale(.12,.1) rotate(-20deg)', borderRadius: '2px', color: 'transparent' }], { duration: 520, easing: 'cubic-bezier(.6,0,.4,1)', fill: 'forwards' });
    fold.onfinish = () => {
      sheet.remove();
      const plane = document.createElement('div');
      plane.className = 'plane';
      plane.innerHTML = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M3 22 45 4 33 44 23 28Z"/><path d="M45 4 23 28l-3 13 8-10"/></svg>';
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = innerWidth - cx + 120, dy = -cy - 140;
      Object.assign(plane.style, { left: cx + 'px', top: cy + 'px' });
      document.body.append(plane);
      plane.animate([
        { transform: 'translate(-50%,-50%) rotate(10deg) scale(.6)' },
        { transform: `translate(calc(-50% + ${dx * .18}px),calc(-50% + 40px)) rotate(-4deg) scale(1)`, offset: .25 },
        { transform: `translate(calc(-50% + ${dx * .55}px),calc(-50% + ${dy * .35}px)) rotate(-18deg) scale(.9)`, offset: .6 },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(-28deg) scale(.5)` }
      ], { duration: 1300, easing: 'cubic-bezier(.45,0,.6,1)', fill: 'forwards' }).onfinish = () => { plane.remove(); done(); };
    };
  });
})();
