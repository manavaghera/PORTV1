/**
 * Specimens — each project gets a tiny live simulation of what it does.
 */
(() => {
  'use strict';
  const viewer = document.getElementById('viewer');
  const canvas = document.getElementById('simCanvas');
  if (!viewer || !canvas) return;
  const ctx = canvas.getContext('2d');
  const nameEl = document.getElementById('simName'), capEl = document.getElementById('simCap');
  const items = [...document.querySelectorAll('.proj')];
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  /* colours come from the theme and update when it changes */
  const C = {};
  let GOLD, EMBER, LAPIS, BG, INK;
  const readPal = () => {
    const s = getComputedStyle(canvas);
    ['c0', 'c1', 'k1', 'k2', 'k3', 'k4', 'k5'].forEach(k => {
      const h = s.getPropertyValue('--' + k).trim().replace('#', ''), n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h, 16);
      C[k] = Number.isNaN(n) ? '236,237,239' : `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`;
    });
    GOLD = `rgb(${C.k4})`; EMBER = `rgb(${C.k3})`; LAPIS = `rgb(${C.k5})`; BG = `rgb(${C.c0})`; INK = BG;
  };
  readPal();
  addEventListener('themechange', readPal);
  const PAPER = a => `rgba(${C.k5},${a})`, G = a => `rgba(${C.k4},${a})`, E = a => `rgba(${C.k3},${a})`;
  const MONO = '500 10.5px "JetBrains Mono", monospace';

  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
  const label = (txt, x, y, c = GOLD, bg) => {
    ctx.font = MONO;
    if (bg) { const w = ctx.measureText(txt).width + 10; ctx.fillStyle = bg; ctx.fillRect(x - 5, y - 11, w, 16); }
    ctx.fillStyle = c; ctx.fillText(txt, x, y);
  };
  const box = (x, y, w, h, c) => {
    const k = Math.min(10, w / 3, h / 3);
    ctx.strokeStyle = c; ctx.lineWidth = 1.5;
    [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([a, b, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(a + sx * k, b); ctx.lineTo(a, b); ctx.lineTo(a, b + sy * k); ctx.stroke();
    });
    ctx.lineWidth = 1; ctx.strokeStyle = G(.22); ctx.strokeRect(x, y, w, h);
  };

  const SIMS = [
    { // 01 CHRONUS — retrieval over memories
      name: 'Chronus', cap: 'query → top-k memories · cosine',
      init(s) { const r = rng(11); s.m = Array.from({ length: 84 }, () => [.08 + r() * .84, .16 + r() * .7, r() * 6.28]); },
      draw(w, h, t, s) {
        const qx = (.5 + .3 * Math.cos(t * .42)) * w, qy = (.52 + .24 * Math.sin(t * .61)) * h;
        const pts = s.m.map(([x, y, ph]) => { const X = (x + Math.sin(t * .3 + ph) * .008) * w, Y = (y + Math.cos(t * .27 + ph) * .008) * h; return [X, Y, Math.hypot(X - qx, Y - qy)]; });
        pts.forEach(([x, y]) => dot(x, y, 1.8, PAPER(.32)));
        [...pts].sort((a, b) => a[2] - b[2]).slice(0, 6).forEach(([x, y, d], i) => {
          ctx.strokeStyle = G((1 - i / 7) * .9); ctx.lineWidth = 1 + (5 - i) * .3;
          line(qx, qy, x, y);
          dot(x, y, 3.4, GOLD);
          label((.97 - i * .04 - d / w * .15).toFixed(2), x + 8, y - 6);
        });
        const rp = (t % 1.8) / 1.8;
        ctx.strokeStyle = E(1 - rp); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(qx, qy, 8 + rp * 64, 0, 7); ctx.stroke();
        dot(qx, qy, 5, EMBER);
        label('QUERY', qx + 10, qy + 18, EMBER);
      }
    },
    { // 02 Health Risk Engine — three boosters stacked into one answer
      name: 'Health Risk Engine', cap: '3 boosters → stack → 0.952',
      init(s) { const r = rng(7); s.d = Array.from({ length: 44 }, () => [r(), r(), r() < .14 ? (r() < .5 ? 1 : 2) : 0]); },
      draw(w, h, t, s) {
        const M = [['LIGHTGBM', .24], ['XGBOOST', .43], ['CATBOOST', .62]].map(([n, y]) => [n, w * .48, y * h]), S = [w * .76, h * .43];
        const cols = [PAPER(.32), GOLD, EMBER];
        s.d.forEach(([o, y, c]) => { const p = (t * .2 + o) % 1; dot(lerp(w * .05, w * .24, p), (.18 + y * .5) * h, c ? 2.8 : 2, cols[c]); });
        label('690K ROWS · 86% ONE CLASS', w * .05, h * .1, PAPER(.6));
        ctx.lineWidth = 1; ctx.font = MONO;
        M.forEach(([n, x, y], i) => {
          const lx = x - 24 - ctx.measureText(n).width;
          ctx.strokeStyle = PAPER(.14); if (lx - 6 > w * .26) line(w * .26, y, lx - 6, y); line(x + 18, y, S[0] - 22, S[1]);
          const u = (t * .6 + i * .33) % 1;
          dot(lerp(x + 18, S[0] - 22, u), lerp(y, S[1], u), 3, G(1 - u * .6));
          ctx.strokeStyle = PAPER(.3); ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke();
          dot(x, y, 3.5, GOLD);
          label(n, lx, y + 4, PAPER(.7));
        });
        ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(S[0], S[1], 22, 0, 7); ctx.stroke();
        dot(S[0], S[1], 5 + (Math.sin(t * 3) * .5 + .5) * 2, GOLD);
        label('STACK', S[0] - 17, S[1] + 40, PAPER(.7));
        const by = h * .86, x0 = w * .05, x1 = w * .95, X = v => lerp(x0, x1, (v - .85) / .11);
        const v = lerp(.876, .952, ease(clamp((t % 6) / 4)));
        ctx.fillStyle = PAPER(.08); ctx.fillRect(x0, by - 3, x1 - x0, 6);
        ctx.fillStyle = GOLD; ctx.fillRect(x0, by - 3, X(v) - x0, 6);
        ctx.strokeStyle = EMBER; ctx.lineWidth = 1.5; line(X(.876), by - 8, X(.876), by + 8);
        label(`BALANCED ACCURACY ${v.toFixed(3)}`, x0, by - 14, GOLD);
        label('BASELINE 0.876', X(.876) - 4, by + 21, EMBER);
      }
    },
    { // 03 Autonomous Content — self-healing agent loop
      name: 'AutonomousContent', cap: 'research → write → validate → publish',
      init() {},
      draw(w, h, t) {
        const N = [['RESEARCH', .17, .52], ['WRITER', .5, .26], ['VALIDATOR', .83, .52], ['PUBLISH', .5, .8]].map(([n, x, y]) => [n, x * w, y * h]);
        const hops = [[0, 1], [1, 2], [2, 3], [0, 1], [1, 2], [2, 1, 1], [1, 2], [2, 3]];
        const step = Math.floor(t % 8), u = ease(t % 1), [a, b, fail] = hops[step];
        ctx.lineWidth = 1;
        [[0, 1], [1, 2], [2, 3]].forEach(([i, j]) => { ctx.strokeStyle = PAPER(.16); line(N[i][1], N[i][2], N[j][1], N[j][2]); });
        ctx.setLineDash([3, 5]); ctx.strokeStyle = E(.35);
        const cx = w * .62, cy = h * .5;
        ctx.beginPath(); ctx.moveTo(N[2][1], N[2][2]); ctx.quadraticCurveTo(cx, cy, N[1][1], N[1][2]); ctx.stroke();
        ctx.setLineDash([]);
        const pos = v => (fail
          ? [(1 - v) ** 2 * N[a][1] + 2 * (1 - v) * v * cx + v * v * N[b][1], (1 - v) ** 2 * N[a][2] + 2 * (1 - v) * v * cy + v * v * N[b][2]]
          : [lerp(N[a][1], N[b][1], v), lerp(N[a][2], N[b][2], v)]);
        N.forEach(([n, x, y], i) => {
          const hot = i === b && u > .9 || i === a && u < .15;
          ctx.strokeStyle = hot ? GOLD : PAPER(.3); ctx.lineWidth = hot ? 2 : 1;
          ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.stroke();
          dot(x, y, 4, hot ? GOLD : PAPER(.5));
          ctx.font = MONO; ctx.fillStyle = PAPER(.7); ctx.fillText(n, x - ctx.measureText(n).width / 2, y + 42);
        });
        for (let k = 6; k >= 0; k--) { const [x, y] = pos(clamp(u - k * .035)); dot(x, y, 5 - k * .6, fail ? E(1 - k / 7) : G(1 - k / 7)); }
        if (fail) label('✕ WEAK DRAFT → BACK TO WRITER', w * .55, h * .42, EMBER);
        if (step === 7 && u > .85 || step === 0 && u < .3) label('✓ PUBLISHED · 82–89/100', N[3][1] + 32, N[3][2] + 4, GOLD);
      }
    },
    { // 04 NewsSense — similar stories pulled together before anything is published
      name: 'NewsSense', cap: 'sources → dedupe → claim check → publish',
      init(s, w, h) {
        const r = rng(5), C = [[.24, .3], [.74, .3], [.28, .74], [.74, .72]];
        const g = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * r()); };
        s.p = []; C.forEach(([x, y]) => { for (let i = 0; i < 32; i++) s.p.push([clamp(x + g() * .075, .05, .95) * w, clamp(y + g() * .08, .1, .9) * h]); });
        s.cyc = -1;
      },
      draw(w, h, t, s) {
        const T = 7.2, cyc = Math.floor(t / T), st = Math.min(5, Math.floor((t % T) / 1.1)), u = ease(clamp(((t % T) % 1.1) / .6));
        if (cyc !== s.cyc) { const r = rng(cyc * 31 + 3); s.init = [0, 1, 2, 3].map(() => [(.15 + r() * .7) * w, (.15 + r() * .7) * h]); s.cyc = cyc; s.st = -1; }
        if (st !== s.st) {
          let c = s.init.map(v => v.slice()), asg = [];
          for (let k = 0; k <= st; k++) {
            asg = s.p.map(([x, y]) => { let bi = 0, bd = 1e9; c.forEach(([a, b], i) => { const d = (x - a) ** 2 + (y - b) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; });
            if (k === st) break;
            c = c.map((v, i) => { const m = s.p.filter((_, j) => asg[j] === i); return m.length ? [m.reduce((a, q) => a + q[0], 0) / m.length, m.reduce((a, q) => a + q[1], 0) / m.length] : v; });
          }
          s.prev = s.cent || c; s.cent = c; s.asg = asg; s.st = st;
        }
        const cols = [GOLD, LAPIS, EMBER, `rgb(${C.k2})`];
        const cent = s.cent.map((v, i) => [lerp(s.prev[i][0], v[0], u), lerp(s.prev[i][1], v[1], u)]);
        ctx.lineWidth = 1;
        s.p.forEach(([x, y], j) => { const [a, b] = cent[s.asg[j]]; ctx.strokeStyle = PAPER(.06); line(x, y, a, b); });
        s.p.forEach(([x, y], j) => dot(x, y, 2.6, cols[s.asg[j]]));
        cent.forEach(([x, y], i) => {
          ctx.strokeStyle = cols[i]; ctx.lineWidth = 2; line(x - 9, y, x + 9, y); line(x, y - 9, x, y + 9);
          ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.stroke();
        });
        label(`K = 4 · ITER ${st}`, 20, h - 18, PAPER(.6));
      }
    },
    { // 05 Clip Studio — rank the clips, cut the best one into a captioned Short
      name: 'Clip Studio', cap: 'views/hr → captions → 9:16 Short',
      init(s) { s.cyc = -1; },
      draw(w, h, t, s) {
        const T = 6, cyc = Math.floor(t / T), p = (t % T) / T;
        if (cyc !== s.cyc) {
          const r = rng(cyc * 17 + 5);
          s.prev = s.pos || [0, 1, 2, 3, 4];
          s.v = s.prev.map(() => .25 + r() * .75);
          s.pos = [];
          [0, 1, 2, 3, 4].sort((i, j) => s.v[j] - s.v[i]).forEach((k, rank) => { s.pos[k] = rank; });
          s.cyc = cyc;
        }
        const u = ease(clamp(p * 2.5)), x0 = w * .05, bx = x0 + 62, bw = w * .33, rh = Math.min(30, h * .11), y0 = h * .22;
        label('RANKED BY VIEWS / HOUR', x0, y0 - 24, PAPER(.6));
        for (let k = 0; k < 5; k++) {
          const y = y0 + lerp(s.prev[k], s.pos[k], u) * rh, top = s.pos[k] === 0 && u > .95;
          label(`CLIP ${String(k + 1).padStart(2, '0')}`, x0, y + 4, top ? GOLD : PAPER(.5));
          ctx.fillStyle = top ? GOLD : PAPER(.2); ctx.fillRect(bx, y - 4, bw * s.v[k] * u, 8);
        }
        const fh = h * .72, fw = fh * 9 / 16, fx = Math.min(w * .66, w - fw - 16), fy = h * .12;
        if (u > .95) { ctx.setLineDash([3, 5]); ctx.strokeStyle = G(.5); ctx.lineWidth = 1; line(bx + bw * Math.max(...s.v) + 8, y0, fx - 8, fy + fh * .4); ctx.setLineDash([]); }
        ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
        ctx.fillStyle = PAPER(.05); ctx.fillRect(fx, fy, fw, fh);
        for (let i = 0; i < 6; i++) { ctx.fillStyle = PAPER(i % 2 ? .07 : .03); ctx.fillRect(fx, fy + ((i / 6 + t * .07) % 1) * fh - fh / 12, fw, fh / 6); }
        const words = ['WAIT FOR IT', 'NO WAY', 'CLUTCH!'], wi = Math.floor(clamp((p - .42) / .5, 0, .999) * 3);
        if (p > .42) { ctx.font = MONO; const tw = ctx.measureText(words[wi]).width; label(words[wi], fx + (fw - tw) / 2, fy + fh * .74, INK, GOLD); }
        ctx.fillStyle = GOLD; ctx.fillRect(fx, fy + fh - 3, fw * p, 3);
        ctx.restore();
        box(fx, fy, fw, fh, PAPER(.6));
        label('9:16', fx + 8, fy + 18, PAPER(.6));
        const wy = h * .84, n = 40, ww = (bx + bw - x0) / n;
        for (let i = 0; i < n; i++) {
          const a = (Math.sin(t * 5 + i * .6) * .5 + .5) * (Math.sin(t * 1.3 + i * .23) * .5 + .5);
          ctx.fillStyle = PAPER(.2 + a * .5); ctx.fillRect(x0 + i * ww, wy - a * 12, ww * .55, a * 24 + 1);
        }
        label('WHISPER → CAPTIONS', x0, wy + 28, PAPER(.55));
      }
    },
    { // 06 Fasal AI — scan a leaf, box the disease
      name: 'Fasal AI', cap: 'YOLOv8 → TFLite · on-device · offline',
      init() {},
      draw(w, h, t) {
        const cx = w * .5, cy = h * .42, L = Math.min(w * .3, h * .36), rot = -.35;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, L);
        g.addColorStop(0, 'rgba(126,160,72,.55)'); g.addColorStop(1, 'rgba(40,62,30,.45)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo(0, -L * 1.05, L, 0); ctx.quadraticCurveTo(0, L * 1.05, -L, 0); ctx.fill();
        ctx.strokeStyle = 'rgba(200,220,140,.35)'; ctx.lineWidth = 1.2; line(-L * 1.15, 0, L * .95, 0);
        for (let i = -3; i <= 3; i++) { if (!i) continue; const x = i * L * .24; line(x, 0, x + L * .16, -Math.sign(i) * 0 - L * .34 * (1 - Math.abs(i) / 4.2)); line(x, 0, x + L * .16, L * .34 * (1 - Math.abs(i) / 4.2)); }
        ctx.restore();
        const spots = [[-.38, -.1, .1, 'blight', .93], [.1, .16, .08, 'rust', .88], [.44, -.06, .07, 'blight', .91], [-.05, -.22, .06, 'mildew', .79]].map(([x, y, r, n, c]) => {
          const X = cx + (x * Math.cos(rot) - y * Math.sin(rot)) * L, Y = cy + (x * Math.sin(rot) + y * Math.cos(rot)) * L;
          return [X, Y, r * L, n, c];
        });
        spots.forEach(([x, y, r]) => { dot(x, y, r, 'rgba(120,70,30,.85)'); dot(x + r * .4, y - r * .3, r * .6, 'rgba(160,96,40,.75)'); });
        const cyc = t % 5, sxp = lerp(cx - L * 1.15, cx + L * 1.15, clamp(cyc / 3));
        if (cyc < 3.2) {
          const gg = ctx.createLinearGradient(sxp - 60, 0, sxp, 0);
          gg.addColorStop(0, G(0)); gg.addColorStop(1, G(.22));
          ctx.fillStyle = gg; ctx.fillRect(sxp - 60, cy - L, 60, L * 2);
          ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; line(sxp, cy - L, sxp, cy + L);
        }
        spots.forEach(([x, y, r, n, c]) => { if (x < sxp) { box(x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2, GOLD); label(`${n.toUpperCase()} ${c.toFixed(2)}`, x - r * 1.6 + 5, y - r * 1.6 - 5, INK, GOLD); } });
        const by = h * .82, n = 44, bw = (w * .5) / n;
        for (let i = 0; i < n; i++) {
          const a = (Math.sin(t * 6 + i * .55) * .5 + .5) * (Math.sin(t * 1.7 + i * .2) * .5 + .5);
          ctx.fillStyle = PAPER(.25 + a * .5); ctx.fillRect(w * .25 + i * bw, by - a * 16, bw * .55, a * 32 + 1);
        }
        label('VOICE · HI-IN / GU-IN', w * .25 + w * .5 + 14, by + 4, PAPER(.5));
      }
    },
    { // 07 DermaLense — in-browser inference
      name: 'DermaLense.AI', cap: 'in-tab inference · no servers',
      init(s, w, h) {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const x = c.getContext('2d'), r = rng(9);
        x.fillStyle = '#5a3c31'; x.fillRect(0, 0, w, h);
        for (let i = 0; i < 1600; i++) { x.fillStyle = r() > .5 ? 'rgba(255,214,190,.06)' : 'rgba(40,20,14,.08)'; x.beginPath(); x.ellipse(r() * w, r() * h, 2 + r() * 12, 1 + r() * 6, r() * 3, 0, 7); x.fill(); }
        const g = x.createRadialGradient(w * .6, h * .46, 2, w * .6, h * .46, h * .1);
        g.addColorStop(0, 'rgba(38,20,14,.95)'); g.addColorStop(.7, 'rgba(60,32,22,.8)'); g.addColorStop(1, 'rgba(60,32,22,0)');
        x.fillStyle = g; x.beginPath(); x.ellipse(w * .6, h * .46, h * .11, h * .085, .4, 0, 7); x.fill();
        s.tex = c;
      },
      draw(w, h, t, s) {
        ctx.globalAlpha = .75; ctx.drawImage(s.tex, 0, 0, w, h); ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(7,6,9,.35)'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = G(.08); ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 28) line(x, 0, x, h);
        for (let y = 0; y < h; y += 28) line(0, y, w, y);
        const cyc = t % 6, mx = w * .6, my = h * .46;
        if (cyc < 3.4) {
          const cell = Math.floor(cyc / 3.4 * 12), cx = (cell % 4) * w / 4, cy = Math.floor(cell / 4) * h / 3;
          box(cx + 8, cy + 8, w / 4 - 16, h / 3 - 16, GOLD);
          label(`SCAN ${String(cell + 1).padStart(2, '0')}/12`, cx + 14, cy + 26, GOLD);
        } else {
          const pulse = .6 + Math.sin(t * 5) * .25, g = ctx.createRadialGradient(mx, my, 0, mx, my, h * .24);
          g.addColorStop(0, E(.55 * pulse)); g.addColorStop(.5, G(.18)); g.addColorStop(1, G(0));
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          box(mx - h * .16, my - h * .14, h * .32, h * .28, GOLD);
          label('REGION OF INTEREST 0.91', mx - h * .16, my - h * .14 - 8, INK, GOLD);
        }
        label('IN-BROWSER · 0 UPLOADS', 20, h - 18, PAPER(.7));
      }
    },
    { // 08 MCP — client/server tool calls
      name: 'MCP Playground', cap: 'initialize → tools/list → tools/call',
      init() {},
      draw(w, h, t) {
        const C = [w * .07, h * .26, w * .3, h * .5], S = [w * .62, h * .2, w * .31, h * .62];
        [[C, 'CLIENT'], [S, 'MCP SERVER']].forEach(([[x, y, bw, bh], n]) => { box(x, y, bw, bh, PAPER(.6)); label(n, x + 10, y + 20, PAPER(.8)); });
        const tools = ['search_docs', 'fetch_url', 'run_sql'];
        const msgs = [['initialize', 1], ['capabilities', -1], ['tools/list', 1], ['3 tools', -1], ['tools/call search_docs', 1], ['result · 4 hits', -1]];
        const T = 7, k = Math.floor(t % T), u = ease(t % 1);
        tools.forEach((n, i) => {
          const y = S[1] + 52 + i * 34, hot = (k === 4 || k === 5) && i === 0;
          ctx.fillStyle = hot ? G(.16) : PAPER(.04); ctx.fillRect(S[0] + 10, y - 16, S[2] - 20, 26);
          label('ƒ ' + n, S[0] + 18, y + 1, hot ? GOLD : PAPER(.55));
        });
        const log = msgs.slice(0, Math.min(k + 1, 6)).slice(-4);
        log.forEach(([m, d], i) => label(`${d > 0 ? '→' : '←'} ${m}`, C[0] + 10, C[1] + 48 + i * 22, d > 0 ? GOLD : PAPER(.6)));
        if (k < 6) {
          const [m, d] = msgs[k], y = h * (d > 0 ? .42 : .58);
          const x0 = d > 0 ? C[0] + C[2] : S[0], x1 = d > 0 ? S[0] : C[0] + C[2];
          ctx.strokeStyle = PAPER(.12); line(C[0] + C[2], y, S[0], y);
          const x = lerp(x0, x1, u);
          dot(x, y, 5, d > 0 ? GOLD : EMBER);
          label(m, x - 30, y - 12, d > 0 ? GOLD : EMBER);
        }
      }
    }
  ];

  /* ── showcase controller: tabs, architecture, impact, autoplay, scan transition ── */
  const PROJ = [
    { rows: [{ n: [['Documents', 'corpus'], ['Sentence-BERT', 'embed'], ['ChromaDB', 'index'], ['Top-k search', 'retrieve', 1], ['Grounded answer', 'generate']] }],
      note: 'Next → encrypted vector search with additively homomorphic encryption',
      tiles: [['Local', 'runs fully on-device, no cloud'], ['Top-k', 'deterministic, grounded retrieval'], ['3', 'research tracks: AHE · quantum NLP · neuromorphic']], tags: ['RAG', 'Sentence-BERT', 'ChromaDB', 'Research'] },
    { rows: [{ n: [['690K rows', '86% one class'], ['Target encoding', 'per fold'], ['3 boosters', 'Optuna-tuned', 1]] }, { n: [['Stacking', 'one blend'], ['Thresholds', 'per class'], ['Pseudo-labels', 'last step']] }],
      note: 'Each technique stayed only if 5-fold cross-validation improved',
      tiles: [['0.952', 'balanced accuracy in 5-fold CV, up from a 0.876 baseline'], ['Top 1%', 'of 3,355 teams · Kaggle Playground S6E7'], ['690K', 'rows, 86% of them in one class']], tags: ['Python', 'LightGBM', 'XGBoost', 'CatBoost', 'Optuna'] },
    { rows: [{ n: [['Research', 'agent 1'], ['Writer', 'agent 2'], ['Validator', '4-stage check', 1], ['Publish', 'live post']] }],
      note: '↺ weak draft → back to the writer · errors → backoff and model fallback',
      tiles: [['82–89', 'validation scores of published posts (/100)'], ['3', 'LangGraph agents: research, writer, validator'], ['$0', 'runs entirely on free-tier LLM APIs']], tags: ['LangGraph', 'Python', 'OpenRouter'] },
    { rows: [{ n: [['Sources', 'RSS + official'], ['Dedupe', 'merge repeats'], ['Claim check', 'LLM vs evidence', 1]] }, { n: [['Editorial hold', 'failed claims'], ['Publish', 'atomic'], ['FastAPI + React', 'serve']] }],
      note: 'Signed storage manifests, plus a database lease so two runs never collide',
      tiles: [['211', 'backend tests (pytest), plus Playwright end-to-end'], ['Hourly', 'ingest → dedupe → claim check → publish'], ['Free tier', 'Cloudflare Pages · Render · Supabase']], tags: ['FastAPI', 'React 19', 'TypeScript', 'PostgreSQL', 'Docker'] },
    { rows: [{ n: [['Twitch clips', 'fetch'], ['Rank', 'views / hour', 1], ['Download', 'the best']] }, { n: [['faster-whisper', 'transcribe'], ['Ollama', 'rate moments · optional'], ['ffmpeg', '9:16 + captions']] }],
      note: 'GPU encoding (NVENC) with a CPU fallback · runs daily on its own',
      tiles: [['127', 'automated tests'], ['9:16', 'vertical Shorts with burned-in captions'], ['Daily', 'automation pipeline']], tags: ['Python', 'Streamlit', 'Whisper', 'Ollama', 'ffmpeg'] },
    { rows: [{ n: [['Camera', 'leaf photo'], ['YOLOv8', 'detect', 1], ['Diagnosis', 'disease + advice']] }, { n: [['Voice', 'Hindi · Gujarati'], ['Whisper', 'transcribe'], ['Query', 'farmer intent']] }],
      note: 'Offline-first TFLite build for low-RAM Android phones',
      tiles: [['2', 'languages by voice — Hindi & Gujarati'], ['Offline', 'TFLite build, no network needed'], ['Real-time', 'on-device disease detection']], tags: ['YOLOv8', 'TensorFlow', 'Whisper', 'ONNX', 'TFLite'] },
    { rows: [{ n: [['Image', 'camera / upload'], ['In-browser model', 'inference', 1], ['Result', 'on screen']] }],
      note: 'No server round-trip — nothing leaves the tab',
      tiles: [['0', 'uploads'], ['0', 'servers'], ['100%', 'inference inside the browser tab']], tags: ['JavaScript', 'Computer vision'] },
    { rows: [{ n: [['Client', 'host app'], ['MCP server', 'JSON-RPC', 1]] }, { n: [['Tools', 'call'], ['Resources', 'read'], ['Prompts', 'template']], plain: true }],
      note: 'Built hands-on from the Anthropic Academy curriculum',
      tiles: [['3', 'MCP primitives — tools, resources, prompts'], ['MCP', 'certified — Anthropic Academy'], ['Hands-on', 'servers built from scratch']], tags: ['MCP', 'Anthropic Academy'] }
  ];
  const archView = document.getElementById('archView'), impactView = document.getElementById('impactView');
  const autoBar = document.getElementById('autoBar'), grid = document.getElementById('workGrid');
  const AUTO = 7000;
  let W = 1, H = 1, active = 0, want = 0, visible = false, paused = false, tab = 'live';
  let states = SIMS.map(() => ({})), t0 = performance.now(), swapT, autoT;

  const renderPane = () => {
    const p = PROJ[active];
    if (tab === 'arch') {
      let k = 0;
      archView.innerHTML = p.rows.map(row => `<div class="flow">${row.n.map((nd, i) =>
        `${i && !row.plain ? `<i class="aa" style="animation-delay:${k * 70}ms"></i>` : ''}<div class="an${nd[2] ? ' hot' : ''}" style="animation-delay:${(k++) * 70}ms;${row.plain && i ? 'margin-left:10px' : ''}"><b>${nd[0]}</b><span>${nd[1]}</span></div>`).join('')}</div>`).join('')
        + `<p class="arch-note">${p.note}</p>`;
    } else if (tab === 'impact') {
      impactView.innerHTML = `<div class="tiles">${p.tiles.map((t, i) => `<div class="tile" style="animation-delay:${i * 90}ms"><b>${t[0]}</b><span>${t[1]}</span></div>`).join('')}</div>`
        + `<div class="impact-tags">${p.tags.map(t => `<span>${t}</span>`).join('')}</div>`;
    }
  };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    states = SIMS.map(() => ({}));
    SIMS.forEach((s, i) => s.init(states[i], W, H));
  };
  const schedule = () => {
    clearTimeout(autoT);
    autoBar.classList.remove('run');
    if (!fine || paused || !visible) return;
    void autoBar.offsetWidth;
    autoBar.style.setProperty('--dur', AUTO + 'ms');
    autoBar.classList.add('run');
    autoT = setTimeout(() => setActive((want + 1) % SIMS.length), AUTO);
  };
  const setActive = i => {
    if (!SIMS[i]) return;
    if (i !== want) {
      want = i;
      items.forEach((el, k) => el.classList.toggle('is-active', k === i));
      viewer.classList.remove('is-wiping'); void viewer.offsetWidth; viewer.classList.add('is-wiping');
      clearTimeout(swapT);
      swapT = setTimeout(() => {
        active = want;
        nameEl.textContent = `${String(active + 1).padStart(2, '0')} · ${SIMS[active].name}`;
        capEl.textContent = SIMS[active].cap;
        renderPane();
      }, 260);
    }
    schedule();
  };
  viewer.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    viewer.dataset.tab = tab;
    viewer.querySelectorAll('[data-tab]').forEach(o => o.setAttribute('aria-selected', String(o === b)));
    renderPane();
  }));

  const loop = now => {
    if (visible && !document.hidden && tab === 'live') {
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = PAPER(.045); ctx.lineWidth = 1;
      for (let x = 24; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); }
      for (let y = 24; y < H; y += 24) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); }
      ctx.save();
      ctx.translate(0, 6);
      SIMS[active].draw(W, H - 12, (now - t0) / 1000, states[active]);
      ctx.restore();
    }
    requestAnimationFrame(loop);
  };

  const init = () => {
    viewer.dataset.tab = 'live';
    resize();
    new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; schedule(); })).observe(viewer);
    if (fine) {
      items.forEach((el, i) => el.addEventListener('mouseenter', () => setActive(i)));
      grid.addEventListener('mouseenter', () => { paused = true; schedule(); });
      grid.addEventListener('mouseleave', () => { paused = false; schedule(); });
    } else {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setActive(items.indexOf(e.target)); }), { rootMargin: '-58% 0px -30% 0px' });
      items.forEach(el => io.observe(el));
    }
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    requestAnimationFrame(loop);
  };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();

