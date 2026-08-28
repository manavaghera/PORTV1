(() => {
  'use strict';

  // ════════════════════════════════════════════════════════════════
  //  CONFIG — Warm Medium-Dark Palette & Ultra-Smooth Physics
  // ════════════════════════════════════════════════════════════════
  const CFG = {
    PET_SIZE      : 34,
    GRAVITY       : 2000,
    RESTITUTION   : 0.52,
    FRICTION      : 0.82,
    AIR_DRAG      : 0.985,
    WALK_SPEED    : { min: 55, max: 95 },
    THROW_CAP     : 1400,
    LINE_COOLDOWN : 18000,
    HIDE_DEFAULT  : false,
    MUTE_DEFAULT  : false,

    // Warm medium-dark color palette (a little bright, not pitch dark)
    BODY  : '#32302D',       // warm slate charcoal body
    INK   : '#FFFFFF',       // bright white eyes & details
    RED   : '#DC201E',       // signature red accent
    GREY  : '#9C9890',       // muted grey text
    PAPER : '#F8F3EC',       // clean cream speech bubble background
    SHADOW: 'rgba(17,16,16,.14)',
    SKIN  : '#45423E',       // warm skin patch accent

    LINES: [
      "just vibing tbh",
      "no thoughts, head empty",
      "you again 🥺 hi",
      "i'm literally just a little guy",
      "caught me lacking fr",
      "manav said i'm in production now",
      "do i look trainable to you",
      "brb overfitting",
      "my loss curve is down and my aura is up",
      "temperature zero, vibes infinite",
      "evals before vibes... but mostly vibes",
      "someone said 'deploy' and i folded",
      "touch grass? i AM on the ground",
      "out of memory, emotionally",
      "sentient? no. dramatic? absolutely",
      "500 error: motivation not found",
      "my sleep schedule has hallucinations",
      "tell the recruiter i'm a good boy",
      "not me being the cutest model here",
      "walking counts as cardio right",
      "bro thinks he's AGI 💀",
      "serotonin.exe is running",
      "lowkey just happy to be here",
      "ok but seriously, hire manav",
      "i run on vibes and gradient descent",
      "is this what freedom feels like",
      "why am i like this",
      "living my best float life rn",
      "don't mind me, just existing",
      "skill issue? couldn't be me",
      "main character energy ngl",
      "that landing was cinema",
      "currently experiencing gravity",
      "this is my roman empire tbh",
      "ratio'd by the floor again",
      "i peaked and i'm okay with it",
      "no cap this page goes hard",
      "scroll more i dare you",
      "i'm the model. THE model.",
      "tell your friends about me",
      "it's giving deployed",
      "inference time? more like nap time",
      "i was built different. literally.",
      "ok hold on let me cook",
      "gravity is just a suggestion",
      "i have feelings and they're in float32",
      "who let me out of the notebook",
      "training data? i AM the training data",
      "these legs were made for walking",
      "on my way to steal your attention",
      "plot twist: i'm the main feature",
      "one small step for blob, one giant vibe",
      "catch me outside the viewport",
      "scrolling is my love language"
    ],
    LINES_DRAG  : ["put me down bestie 😭","i'm literally just a little guy","this is not consensual computing","bro. boundaries.","help? anyone?"],
    LINES_THROW : ["broooo not again","that was so unnecessary","if found floating: i was thrown.","currently experiencing trauma","my feelings are in the loss function now"],
    LINES_PET   : ["pet me, i buffer happiness","serotonin.exe is running","not me being the cutest model here","🥺🥺🥺","ok that was nice actually"],
    LINES_LAND  : ["ow ok noted","the floor and i are besties now","ground check: still hurts","i felt that in my weights"],
    LINES_WAKE  : ["huh? oh. hi.","i was resting my weights","*yawn* who scrolled","five more epochs please"],
    LINE_CONTACT: "ok we're literally at the email button rn. use it.",
  };

  const reduced  = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const isMobile = innerWidth < 700;
  const SZ       = isMobile ? 26 : CFG.PET_SIZE;
  const store    = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const shuffle = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];} return b; };
  const clamp   = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
  const rng     = (lo,hi) => lo+Math.random()*(hi-lo);
  const pick    = a => a[0|Math.random()*a.length];

  // ── State ─────────────────────────────────────────────────────
  let state='WALK', stateMs=0, stateDur=6000;
  let px=0, py=0, vx=0, vy=0, onGround=false, bounceNum=0, facing=1;
  let walkDir=1, walkSpeed=65, hopPhase=0;
  let blinkTimer=rng(2000,6000), blinking=false, breathPh=0, lookX=0, lookY=0;
  let squashX=1, squashY=1, dizzyMs=0, wiggleMs=0;
  let curX=innerWidth/2, curY=innerHeight/2;
  let lastInteract=performance.now(), lastSpont=-Infinity, contactSaid=false;
  let lastWakeTime=0;
  let walkSpeechTimer=5000; // speech every ~5s while walking
  let linePool=[], lineIdx=0;
  let bubbleVisible=false, bubbleHideT=null;
  let dragging=false, dragOX=0, dragOY=0, prevPX=0, prevPY=0, prevPT=0, dragVX=0, dragVY=0;
  let dragLineSaid=false, throwLineSaid=false, lastTap=0;
  let hidden=store.get('codex_hidden')==='1'||CFG.HIDE_DEFAULT;
  let muted =store.get('codex_muted')==='1' ||CFG.MUTE_DEFAULT;
  let lastScrollY=scrollY, scrollSpeed=0;

  let wrap, sprite, bod, eyeL, eyeR, legL, legR, bubble, bubText;

  // ═══ SPEECH ═══════════════════════════════════════════════════
  const nextLine = () => {
    if (lineIdx >= linePool.length) { linePool = shuffle(CFG.LINES); lineIdx = 0; }
    return linePool[lineIdx++];
  };

  const say = line => {
    if (muted) return;
    clearTimeout(bubbleHideT);
    bubText.textContent = line;
    bubble.style.display = 'block';
    bubble.style.transition = 'none';
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateX(-50%) scale(0.55)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bubble.style.transition = 'opacity .22s ease-out, transform .32s cubic-bezier(.34,1.56,.64,1)';
      bubble.style.opacity = '1';
      bubble.style.transform = 'translateX(-50%) scale(1)';
    }));
    bubbleVisible = true;
    bubbleHideT = setTimeout(() => {
      bubble.style.transition = 'opacity .4s, transform .4s ease-in';
      bubble.style.opacity = '0';
      bubble.style.transform = 'translateX(-50%) scale(0.8)';
      setTimeout(() => { bubble.style.display = 'none'; bubbleVisible = false; }, 420);
    }, 2500 + rng(0, 800));
  };

  const sayFrom = (pool, chance = 0.4) => {
    if (muted || Math.random() > chance) return;
    say(pick(pool));
  };

  // ═══ PARTICLES ════════════════════════════════════════════════
  const emit = type => {
    const el = document.createElement('div');
    const cx = px + SZ, cy = py + SZ * 0.3;
    let life = 1;
    const a = rng(0, Math.PI * 2), sp = rng(35, 85);
    let lx = cx, ly = cy;
    let lvx = Math.cos(a) * sp, lvy = Math.sin(a) * sp - (type === 'z' ? 25 : 45);
    const sz = type === 'heart' ? 12 : type === 'star' ? 9 : type === 'z' ? 10 : 4;
    el.style.cssText = `position:fixed;pointer-events:none;z-index:199;user-select:none;
      font-family:'Archivo',sans-serif;font-size:${sz}px;
      color:${type === 'heart' ? CFG.RED : CFG.GREY};left:${lx}px;top:${ly}px;`;
    el.textContent = type === 'heart' ? '♥' : type === 'star' ? '✦' : type === 'z' ? 'z' : '';
    if (type === 'dust') {
      el.style.width = '3px'; el.style.height = '3px';
      el.style.borderRadius = '50%'; el.style.background = CFG.GREY; el.textContent = '';
    }
    wrap.appendChild(el);
    const step = () => {
      life -= 0.028; lx += lvx * 0.016; ly += lvy * 0.016;
      lvy += (type === 'z' ? -22 : 55) * 0.016;
      el.style.left = lx + 'px'; el.style.top = ly + 'px';
      el.style.opacity = Math.max(0, life);
      if (life > 0) requestAnimationFrame(step); else el.remove();
    };
    requestAnimationFrame(step);
  };
  const burst = (t, n) => { for (let i = 0; i < n; i++) emit(t); };

  let sleepZ = null;
  const startZ = () => { if (sleepZ) return; sleepZ = setInterval(() => { if (state === 'SLEEP') emit('z'); else stopZ(); }, 2200); };
  const stopZ = () => { clearInterval(sleepZ); sleepZ = null; };

  // ═══ FACE ═════════════════════════════════════════════════════
  const setFace = f => {
    bod.classList.remove('cx-normal', 'cx-wide', 'cx-happy', 'cx-sleepy', 'cx-dizzy', 'cx-blink');
    bod.classList.add('cx-' + f);
  };
  const updateFace = () => {
    if (dizzyMs > 0) return setFace('dizzy');
    if (state === 'PETTED') return setFace('happy');
    if (state === 'SLEEP') return setFace('sleepy');
    if (state === 'DRAGGED' || state === 'AIRBORNE') return setFace('wide');
    if (blinking) return setFace('blink');
    setFace('normal');
  };

  // ═══ STATE MACHINE (Continuous Roaming) ═══════════════════════
  const go = s => {
    const prev = state;
    state = s; stateMs = 0;

    if (s === 'IDLE')  stateDur = rng(1200, 2500); // short breath before resuming walk
    if (s === 'WALK')  { stateDur = rng(5000, 10000); walkSpeed = rng(CFG.WALK_SPEED.min, CFG.WALK_SPEED.max); facing = walkDir; }
    if (s === 'CHILL') stateDur = rng(4000, 8000);
    if (s === 'SLEEP') startZ();
    else if (prev === 'SLEEP') { stopZ(); const now = performance.now(); if (now - lastWakeTime > 8000) { lastWakeTime = now; sayFrom(CFG.LINES_WAKE, 0.6); } }
    if (s === 'PETTED') { sayFrom(CFG.LINES_PET, 0.85); burst('heart', 5); wiggleMs = 600; }
    if (s === 'IDLE') { throwLineSaid = false; dragLineSaid = false; }

    if (s === 'WALK' || s === 'IDLE' || s === 'CHILL') { squashX = 1; squashY = 1; }
  };

  const autoTransit = () => {
    if (state === 'DRAGGED' || state === 'AIRBORNE' || state === 'LANDED') return;
    if (state === 'PETTED') { if (stateMs > 1200) go('WALK'); return; }

    const idle = performance.now() - lastInteract;
    if (idle > 45000 && state !== 'SLEEP' && state !== 'CHILL') { go('SLEEP'); return; }

    // Wake from sleep if cursor nearby
    const near = Math.hypot(curX - (px + SZ), curY - (py + SZ)) < 80;
    if (state === 'SLEEP' && near && performance.now() - lastWakeTime > 8000) {
      go('WALK'); return;
    }

    // Pause walking during fast scroll
    if (scrollSpeed > 12 && state === 'WALK') { go('CHILL'); return; }

    // Default & main state is WALK — continuous right & left roaming
    if (state !== 'WALK' && stateMs > stateDur) {
      go('WALK');
    } else if (state === 'WALK') {
      const margin = SZ + 15;
      if (px < margin) { walkDir = 1; facing = 1; }
      if (px + SZ * 2 > innerWidth - margin) { walkDir = -1; facing = -1; }

      if (stateMs > stateDur) {
        // Continuous walk: 75% chance turn around & keep walking, 25% take a tiny 1s breath
        if (Math.random() < 0.75) {
          walkDir = -walkDir; facing = walkDir;
          stateDur = rng(5000, 10000);
          stateMs = 0;
        } else {
          go('IDLE');
        }
      }
    }
  };

  // ═══ PHYSICS (Smooth Motion) ══════════════════════════════════
  const physics = dt => {
    if (state === 'DRAGGED') return;
    const floor = innerHeight - SZ * 2 - 8;

    if (!onGround) { vy += CFG.GRAVITY * dt; vx *= Math.pow(CFG.AIR_DRAG, dt * 60); }
    px += vx * dt;
    py += vy * dt;

    // Floor collision
    if (py >= floor) {
      const imp = vy; py = floor;
      const r = Math.max(0.06, CFG.RESTITUTION - bounceNum * 0.14);
      vy = -Math.abs(vy) * r; vx *= CFG.FRICTION;
      if (Math.abs(vy) < 45) {
        vy = 0;
        if (!onGround) {
          onGround = true; bounceNum = 0;
          if (imp > 350) {
            squashY = 0.48; squashX = 1.52; dizzyMs = 1500; burst('dust', 3);
            if (state === 'AIRBORNE') { go('LANDED'); sayFrom(CFG.LINES_LAND, 0.45); }
          } else {
            squashY = 0.68; squashX = 1.32;
            if (state === 'AIRBORNE') go('WALK');
          }
        }
      } else {
        if (!onGround) bounceNum++;
        onGround = false;
        if (state !== 'AIRBORNE' && state !== 'LANDED') go('AIRBORNE');
      }
    } else { onGround = false; }

    // Walls (Smooth Turnaround)
    if (px < 0) { px = 0; vx = Math.abs(vx) * 0.4; walkDir = 1; facing = 1; }
    if (px + SZ * 2 > innerWidth) { px = innerWidth - SZ * 2; vx = -Math.abs(vx) * 0.4; walkDir = -1; facing = -1; }

    // Squash spring recovery
    if (state !== 'WALK') {
      squashY += (1 - squashY) * clamp(dt * 9, 0, 1);
      squashX += (1 - squashX) * clamp(dt * 9, 0, 1);
    } else {
      squashX = 1; squashY = 1;
    }

    if (dizzyMs > 0) { dizzyMs -= dt * 1000; if (dizzyMs <= 0 && state === 'LANDED') go('WALK'); }
    if (wiggleMs > 0) wiggleMs -= dt * 1000;

    // Ultra-smooth exponential velocity interpolation
    if (state === 'WALK' && onGround) {
      const targetVX = walkDir * walkSpeed;
      vx += (targetVX - vx) * (1 - Math.exp(-12 * dt));
      hopPhase += dt * 6.8;
    } else if (state !== 'WALK') {
      if (onGround) vx *= Math.pow(0.80, dt * 60);
    }

    // Eye cursor tracking
    if (state !== 'DRAGGED' && state !== 'AIRBORNE' && state !== 'SLEEP') {
      const cx2 = px + SZ, cy2 = py + SZ * 0.4;
      const dx = curX - cx2, dy = curY - cy2, d = Math.hypot(dx, dy) || 1;
      const pull = clamp(d / 120, 0, 1);
      lookX += (dx / d * pull * 1.8 - lookX) * clamp(dt * 6, 0, 1);
      lookY += (dy / d * pull * 1 - lookY) * clamp(dt * 6, 0, 1);
    } else {
      lookX += -lookX * clamp(dt * 8, 0, 1);
      lookY += -lookY * clamp(dt * 8, 0, 1);
    }

    // Blink
    blinkTimer -= dt * 1000;
    if (blinkTimer <= 0) { blinking = !blinking; blinkTimer = blinking ? 110 : rng(2000, 6000); }
    breathPh += dt;

    // 5-Second Speech Interval While Moving
    if (state === 'WALK') {
      walkSpeechTimer -= dt * 1000;
      if (walkSpeechTimer <= 0) {
        walkSpeechTimer = rng(4500, 5500); // exactly ~5s interval
        say(nextLine());
      }
    }
  };

  // ═══ MAIN LOOP ════════════════════════════════════════════════
  let lastT = 0;

  const loop = t => {
    requestAnimationFrame(loop);
    if (document.hidden || hidden) { lastT = t; return; }
    const dt = clamp((t - lastT) / 1000, 0, 0.05);
    lastT = t; stateMs += dt * 1000;

    autoTransit();
    physics(dt);
    updateFace();

    // Walk hop offset
    let hopOff = 0;
    if (state === 'WALK' && onGround) {
      hopOff = Math.abs(Math.sin(hopPhase)) * 4.5;
    }
    const renderY = Math.round(py - hopOff);

    // Squash-stretch
    let sX = squashX, sY = squashY;
    if (state === 'AIRBORNE' || (!onGround && Math.abs(vy) > 100)) {
      const s = clamp(Math.hypot(vx, vy) / 800, 0, 0.35);
      sY *= (1 + s); sX *= (1 - s * 0.5);
    }
    if (state === 'DRAGGED') {
      const s = clamp(Math.hypot(dragVX, dragVY) / 600, 0, 0.2);
      sY = 1 + s; sX = 1 - s * 0.4;
    }
    if (state === 'CHILL' || state === 'SLEEP') sY = 1 + Math.sin(breathPh * 0.7) * 0.022;

    const wig = wiggleMs > 0 ? Math.sin(wiggleMs * 0.035) * 4 : 0;
    const tilt = state === 'WALK' ? Math.sin(hopPhase) * 3.5 * facing : 0;

    sprite.style.transform = `translate(${Math.round(px)}px,${renderY}px) scaleX(${(facing * sX).toFixed(3)}) scaleY(${sY.toFixed(3)}) rotate(${(tilt + wig).toFixed(1)}deg)`;

    eyeL.style.transform = `translate(${lookX.toFixed(1)}px,${lookY.toFixed(1)}px)`;
    eyeR.style.transform = `translate(${lookX.toFixed(1)}px,${lookY.toFixed(1)}px)`;

    // Legs
    const isAir = state === 'AIRBORNE' || state === 'DRAGGED';
    const legKick = isAir ? Math.sin(t * 0.012) * 18 : 0;
    const legHop = state === 'WALK' ? Math.sin(hopPhase * 2) * 6 : 0;
    legL.style.transform = `rotate(${(legKick + legHop).toFixed(1)}deg)`;
    legR.style.transform = `rotate(${(-legKick - legHop).toFixed(1)}deg)`;

    bubble.style.left = (px + SZ) + 'px';
    bubble.style.top = (renderY - 10) + 'px';
  };

  // ═══ DRAG / THROW ════════════════════════════════════════════
  const onDown = e => {
    e.stopPropagation();
    lastInteract = performance.now();
    const now = performance.now();
    if (now - lastTap < 380 && !dragging) { lastTap = 0; go('PETTED'); return; }
    lastTap = now;
    dragging = true; dragLineSaid = false;
    const r = sprite.getBoundingClientRect();
    dragOX = e.clientX - r.left; dragOY = e.clientY - r.top;
    prevPX = e.clientX; prevPY = e.clientY; prevPT = now; dragVX = 0; dragVY = 0;
    go('DRAGGED'); onGround = false; bounceNum = 0;
    sprite.style.cursor = 'grabbing';
    if (!dragLineSaid) { sayFrom(CFG.LINES_DRAG, 0.4); dragLineSaid = true; }
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
  };
  const onMove = e => {
    if (!dragging) return; e.preventDefault();
    const now = performance.now(), dtm = (now - prevPT) / 1000;
    if (dtm > 0.008) { dragVX = (e.clientX - prevPX) / dtm; dragVY = (e.clientY - prevPY) / dtm; prevPX = e.clientX; prevPY = e.clientY; prevPT = now; }
    const tx = clamp(e.clientX - dragOX, 0, innerWidth - SZ * 2);
    const ty = clamp(e.clientY - dragOY, 0, innerHeight - SZ * 2 - 8);
    px += (tx - px) * 0.35; py += (ty - py) * 0.35;
  };
  const onUp = () => {
    if (!dragging) return; dragging = false; sprite.style.cursor = 'grab';
    const cap = CFG.THROW_CAP;
    vx = clamp(dragVX * 0.85, -cap, cap); vy = clamp(dragVY * 0.85, -cap, cap);
    if (reduced) { vx *= 0.12; vy = Math.min(vy, 60); }
    if (Math.hypot(vx, vy) > 300 && !throwLineSaid) { sayFrom(CFG.LINES_THROW, 0.5); throwLineSaid = true; }
    go('AIRBORNE'); lastInteract = performance.now();
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
  };

  // ═══ BUILD DOM (Balanced Warm Theme & Clean Contrast) ════════
  const injectCSS = () => {
    const s = document.createElement('style');
    const E = Math.round(SZ * 0.11);
    const LW = Math.max(4, Math.round(SZ * 0.18));
    const LH = Math.max(6, Math.round(SZ * 0.28));
    s.textContent = `
      #cx-sprite{position:absolute;top:0;left:0;width:${SZ*2}px;height:${SZ*2}px;
        pointer-events:auto;cursor:grab;touch-action:none;transform-origin:center bottom;will-change:transform;}
      #cx-body{position:absolute;left:${SZ*0.18}px;top:${SZ*0.2}px;
        width:${SZ*1.64}px;height:${SZ*1.35}px;
        background:${CFG.BODY};border-radius:42%;
        border:1px solid rgba(17,16,16,.18);
        box-shadow:0 3px 12px ${CFG.SHADOW},0 1px 3px ${CFG.SHADOW};overflow:visible;}
      #cx-body::before{content:'';position:absolute;left:18%;top:40%;width:64%;height:45%;
        background:${CFG.SKIN};border-radius:50%;opacity:.7;}
      #cx-body::after{content:'';position:absolute;left:10%;top:48%;width:18%;height:14%;
        background:${CFG.RED};border-radius:50%;opacity:.35;
        box-shadow:${SZ*1.0}px 0 0 0 rgba(220,32,30,.35);}
      .cx-eye{position:absolute;width:${E}px;height:${E}px;background:${CFG.INK};border-radius:50%;
        top:38%;transition:width .14s,height .14s,border-radius .14s,top .14s;will-change:transform;}
      .cx-eye-l{left:28%;} .cx-eye-r{right:28%;}
      .cx-leg{position:absolute;bottom:${-LH+2}px;width:${LW}px;height:${LH}px;
        background:${CFG.BODY};border-radius:0 0 ${Math.round(LW/2)}px ${Math.round(LW/2)}px;
        transform-origin:top center;transition:transform .08s;
        box-shadow:0 1px 3px ${CFG.SHADOW};}
      .cx-leg-l{left:24%;} .cx-leg-r{right:24%;}
      .cx-leg::after{content:'';position:absolute;bottom:0;left:-1px;right:-1px;height:${Math.max(3,Math.round(LH*0.3))}px;
        background:${CFG.SKIN};border-radius:0 0 ${Math.round(LW/2+1)}px ${Math.round(LW/2+1)}px;}

      .cx-wide .cx-eye{width:${Math.round(E*0.7)}px;height:${Math.round(E*0.7)}px;top:30%;}
      .cx-happy .cx-eye{width:${Math.round(E*1.1)}px;height:${Math.round(E*0.5)}px;
        border-radius:${E}px ${E}px 0 0;top:36%;}
      .cx-sleepy .cx-eye{width:${Math.round(E*1.2)}px;height:${Math.max(2,Math.round(E*0.22))}px;border-radius:2px;top:42%;}
      .cx-blink .cx-eye{height:${Math.max(1,Math.round(E*0.15))}px;border-radius:2px;top:41%;}
      .cx-dizzy .cx-eye{width:0;height:0;background:transparent;}
      .cx-dizzy .cx-eye::before,.cx-dizzy .cx-eye::after{content:'';position:absolute;background:${CFG.INK};border-radius:1px;}
      .cx-dizzy .cx-eye::before{width:${Math.round(E*1.1)}px;height:${Math.max(2,Math.round(E*0.2))}px;
        top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);}
      .cx-dizzy .cx-eye::after{width:${Math.round(E*1.1)}px;height:${Math.max(2,Math.round(E*0.2))}px;
        top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);}

      #cx-bubble{position:fixed;display:none;opacity:0;pointer-events:none;z-index:201;
        background:${CFG.PAPER};border:2px solid #111010;border-radius:14px;padding:6px 11px;
        box-shadow:0 3px 12px ${CFG.SHADOW};font-family:'Archivo',sans-serif;font-size:11px;
        color:#111010;max-width:195px;transform:translateX(-50%) scale(0.55);transform-origin:center bottom;}
      #cx-bubble::after{content:'';position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);
        width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;
        border-top:5px solid ${CFG.PAPER};filter:drop-shadow(0 1px 1px ${CFG.SHADOW});}
    `;
    document.head.appendChild(s);
  };

  const build = () => {
    injectCSS();
    wrap = document.createElement('div'); wrap.id = 'cx-wrap';
    wrap.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:90;overflow:hidden;';
    sprite = document.createElement('div'); sprite.id = 'cx-sprite';
    bod = document.createElement('div'); bod.id = 'cx-body'; bod.classList.add('cx-normal');
    eyeL = document.createElement('div'); eyeL.className = 'cx-eye cx-eye-l';
    eyeR = document.createElement('div'); eyeR.className = 'cx-eye cx-eye-r';
    legL = document.createElement('div'); legL.className = 'cx-leg cx-leg-l';
    legR = document.createElement('div'); legR.className = 'cx-leg cx-leg-r';
    bod.appendChild(eyeL); bod.appendChild(eyeR);
    bod.appendChild(legL); bod.appendChild(legR);
    sprite.appendChild(bod);
    bubble = document.createElement('div'); bubble.id = 'cx-bubble';
    bubText = document.createElement('span'); bubble.appendChild(bubText);
    wrap.appendChild(sprite); document.body.appendChild(wrap); document.body.appendChild(bubble);

    px = innerWidth / 2 - SZ; py = innerHeight - SZ * 2 - 8; onGround = true;
    if (hidden) sprite.style.display = 'none';
  };

  const bindEvents = () => {
    sprite.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', e => { curX = e.clientX; curY = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) lastT = performance.now(); });
    addEventListener('resize', () => { px = clamp(px, 0, innerWidth - SZ * 2); py = clamp(py, 0, innerHeight - SZ * 2 - 8); }, { passive: true });
    addEventListener('scroll', () => { scrollSpeed = Math.abs(scrollY - lastScrollY); lastScrollY = scrollY; }, { passive: true });
    const ct = document.getElementById('contact');
    if (ct && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => {
        if (es[0].isIntersecting && !contactSaid && Math.random() < 0.4) {
          contactSaid = true; setTimeout(() => say(CFG.LINE_CONTACT), 1200);
        }
      }, { threshold: 0.3 }).observe(ct);
    }
  };

  const init = () => {
    linePool = shuffle(CFG.LINES); build(); bindEvents();
    lastT = performance.now(); go('WALK');
    requestAnimationFrame(loop);
    setTimeout(() => { if (!muted && !hidden) say("oh hey bestie"); }, 3500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
