/**
 * Arcade — three games about how AI behaves. This file builds the tabs and
 * panels, and runs two of the games: "Hallucination or fact?" (swipe cards
 * left or right) and "Race a model" (out-type an LLM, good luck). The third,
 * "Break my bot", lives in bot.js.
 */
(() => {
  'use strict';
  const host = document.getElementById('arcadeMount');
  if (!host) return;
  const MA = window.MA = window.MA || {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  host.outerHTML = `
    <div class="lab-tabs arc-tabs" role="tablist" aria-label="Games">
      <button type="button" role="tab" id="arcTabBot" aria-controls="arc-bot" aria-selected="true"><i class="mono">01</i><b>Break my bot</b><small class="mono">trick a guarded AI</small></button>
      <button type="button" role="tab" id="arcTabQuiz" aria-controls="arc-quiz" aria-selected="false" tabindex="-1"><i class="mono">02</i><b>Hallucination or fact?</b><small class="mono">spot what's made up</small></button>
      <button type="button" role="tab" id="arcTabRace" aria-controls="arc-race" aria-selected="false" tabindex="-1"><i class="mono">03</i><b>Race a model</b><small class="mono">out-type an LLM</small></button>
    </div>
    <div class="lab-panel arc-panel" id="arc-bot" role="tabpanel" aria-labelledby="arcTabBot"></div>
    <div class="lab-panel arc-panel" id="arc-quiz" role="tabpanel" aria-labelledby="arcTabQuiz" hidden>
      <div class="lab-stage quiz-stage"><div class="quiz-deck" id="quizDeck"></div>
        <p class="lab-hud mono"><span>card <b id="quizN">1</b> / 10</span><span>score <b id="quizScore">0</b></span><span class="fine-only">drag ← hallucination · fact →</span></p></div>
      <div class="lab-side">
        <div class="quiz-btns"><button type="button" class="quiz-b no" data-q="0">✕ Hallucination</button><button type="button" class="quiz-b yes" data-q="1">✓ Fact</button></div>
        <div class="quiz-verdict" id="quizVerdict" aria-live="polite"><p>Ten statements. Some about AI, some about me. Some true — and some delivered with the confidence of a model that's making it up.</p></div>
        <p class="lab-note">Every true card is checkable, and every made-up one contradicts something real. Use ← and → on a keyboard.</p>
      </div>
    </div>
    <div class="lab-panel arc-panel" id="arc-race" role="tabpanel" aria-labelledby="arcTabRace" hidden>
      <div class="lab-stage race-stage">
        <p class="race-text mono" id="raceText" aria-hidden="true"></p>
        <input class="race-in mono" id="raceIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Start typing — the clock starts on your first key" aria-label="Type the sentence shown above">
        <div class="race-lanes" id="raceLanes"></div>
        <p class="lab-hud mono"><span>1 token ≈ 4 characters</span><span>time <b id="raceT">0.0</b> s</span></p>
      </div>
      <div class="lab-side">
        <div class="race-result" id="raceResult"><p>Type the sentence as fast as you can. Two models race you, at speeds typical of a chat model and of dedicated inference hardware.</p></div>
        <div class="lab-row mono"><button type="button" data-race="new">↺ new sentence</button></div>
        <p class="lab-note">Model speeds are ballpark: roughly 60 tokens a second for a typical chat model, around 600 on specialised inference chips. Your speed is measured exactly.</p>
      </div>
    </div>`;
  const tabs = document.querySelector('.arc-tabs');
  if (tabs && MA.bindTabs) MA.bindTabs(tabs);

  /* ── Hallucination or fact? ── */
  const CARDS = [
    ['AI', 'The Transformer was introduced in the 2017 paper “Attention Is All You Need”.', 1, 'Vaswani et al., NeurIPS 2017.'],
    ['AI', 'YOLO, the object detector, stands for “You Only Look Once”.', 1, 'Redmon et al., 2016 — one pass over the image.'],
    ['AI', 'LSTM networks were introduced by Hochreiter and Schmidhuber in 1997.', 1, 'Long Short-Term Memory, Neural Computation, 1997.'],
    ['AI', 'RAG stands for Retrieval-Augmented Generation.', 1, 'Lewis et al., 2020 — retrieve first, then generate.'],
    ['AI', 'The Adam optimiser\'s name comes from “adaptive moment estimation”.', 1, 'Kingma & Ba, 2014.'],
    ['AI', 'Dropout randomly switches off neurons during training to reduce overfitting.', 1, 'Srivastava et al., 2014.'],
    ['AI', 'AlphaGo beat Lee Sedol 4–1 in 2016.', 1, 'Seoul, March 2016.'],
    ['AI', 'MCP — the Model Context Protocol — was introduced by Anthropic in 2024.', 1, 'Open-sourced in November 2024.'],
    ['AI', 'GPT stands for “General Purpose Transformer”.', 0, 'It\'s Generative Pre-trained Transformer.'],
    ['AI', 'Setting an LLM\'s temperature to 0 makes its output more random.', 0, 'The opposite — temperature 0 always picks the likeliest token.'],
    ['AI', 'BERT reads text strictly left to right, one word at a time.', 0, 'The B is for Bidirectional — it sees both sides at once.'],
    ['AI', 'A token is always exactly one English word.', 0, 'Tokens are often pieces of words; about four characters on average.'],
    ['AI', 'Convolutional neural networks were invented in 2015.', 0, 'LeCun\'s LeNet read handwritten digits in the late 1980s.'],
    ['AI', 'ReLU stands for “Recurrent Linear Unit”.', 0, 'Rectified Linear Unit: max(0, x).'],
    ['AI', 'ImageNet contains about fourteen thousand images.', 0, 'About fourteen million.'],
    ['Me', 'Manav has finished in the top 1% of a Kaggle competition — twice.', 1, 'Autonomous Agent Prediction and Student Health Risk.'],
    ['Me', 'Manav is certified by Anthropic Academy in both MCP and RAG.', 1, 'Both courses, hands-on — see the trophy shelf.'],
    ['Me', 'DermaLense.AI runs its vision model in the browser — photos never leave the device.', 1, 'Inference runs entirely in the tab.'],
    ['Me', 'Fasal AI accepts voice input in Hindi and Gujarati.', 1, 'Through Whisper, for farmers in the field.'],
    ['Me', 'CHRONUS sends every memory to a cloud server for processing.', 0, 'The opposite — its core is local and deterministic, heading toward encrypted search.'],
    ['Me', 'Fasal AI only works on flagship phones with a constant internet connection.', 0, 'It ships an offline TensorFlow Lite build for low-RAM phones.'],
    ['Me', 'Manav has never built a multi-agent system.', 0, 'AutonomousContent is a four-agent LangGraph pipeline.']
  ];
  const deck = document.getElementById('quizDeck'), verdict = document.getElementById('quizVerdict');
  const nEl = document.getElementById('quizN'), scoreEl = document.getElementById('quizScore');
  let round = [], qi = 0, score = 0, card = null, locked = false;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const deal = () => {
    deck.textContent = '';
    if (qi >= round.length) return finish();
    nEl.textContent = qi + 1;
    [2, 1].forEach(k => { if (qi + k < round.length) deck.append(el('div', `qcard back b${k}`)); });
    const [tag, text] = round[qi];
    card = el('div', 'qcard');
    card.append(el('span', 'qtag mono', tag === 'Me' ? 'about Manav' : 'about AI'), el('p', null, text));
    card.append(el('i', 'qstamp no mono', 'hallucination'), el('i', 'qstamp yes mono', 'fact'));
    deck.append(card);
    locked = false;
  };
  const answer = guess => {
    if (locked || !card) return;
    locked = true;
    const [, , truth, why] = round[qi], right = guess === truth;
    if (right) score++;
    scoreEl.textContent = score;
    card.classList.add(guess ? 'go-r' : 'go-l');
    verdict.textContent = '';
    verdict.append(el('b', right ? 'ok' : 'bad', right ? '✓ Right.' : '✕ Not quite.'), el('p', null, `${truth ? 'Fact' : 'Hallucination'} — ${why}`));
    qi++;
    setTimeout(deal, reduced ? 150 : 520);
  };
  const finish = () => {
    card = null;
    const n = round.length, msg = score === n ? 'Perfect. You\'d make a great eval harness.' : score >= 8 ? 'Sharp. Hard to fool you.' : score >= 5 ? 'Not bad — confident nonsense is convincing.' : 'The hallucinations got you. They get models too.';
    const end = el('div', 'qcard end');
    const again = el('button', 'btn btn-primary', 'Play again');
    again.type = 'button'; again.addEventListener('click', newRound);
    end.append(el('span', 'qtag mono', 'final score'), el('b', 'qscore', `${score} / ${n}`), el('p', null, msg), again);
    deck.append(end);
    if (score >= 8 && MA.achieve) MA.achieve('factcheck');
  };
  const newRound = () => { round = shuffle(CARDS.slice()).slice(0, 10); qi = 0; score = 0; scoreEl.textContent = 0; deal(); };
  document.getElementById('arc-quiz').addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) answer(+b.dataset.q); });
  /* drag the card: past 90px it counts as an answer */
  let drag = null;
  deck.addEventListener('pointerdown', e => { if (!card || locked || !e.target.closest('.qcard:not(.back):not(.end)')) return; drag = { x: e.clientX }; card.setPointerCapture(e.pointerId); card.classList.add('dragging'); });
  deck.addEventListener('pointermove', e => {
    if (!drag || !card) return;
    const dx = e.clientX - drag.x;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
    card.style.setProperty('--yes', Math.max(0, Math.min(1, dx / 90)).toFixed(2));
    card.style.setProperty('--no', Math.max(0, Math.min(1, -dx / 90)).toFixed(2));
    drag.dx = dx;
  });
  const drop = () => {
    if (!drag || !card) return;
    const dx = drag.dx || 0;
    drag = null; card.classList.remove('dragging');
    if (Math.abs(dx) > 90) { card.style.transform = ''; answer(dx > 0 ? 1 : 0); }
    else { card.style.transform = ''; card.style.setProperty('--yes', 0); card.style.setProperty('--no', 0); }
  };
  deck.addEventListener('pointerup', drop); deck.addEventListener('pointercancel', drop);
  addEventListener('keydown', e => {
    const p = document.getElementById('arc-quiz');
    if (!p || p.hidden || /input|textarea/i.test((document.activeElement || {}).tagName || '')) return;
    const r = p.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    if (e.key === 'ArrowRight') answer(1);
    if (e.key === 'ArrowLeft') answer(0);
  });
  newRound();

  /* ── Race a model ── */
  const SENTENCES = [
    'Retrieval should find the right chunk before the model says a word.',
    'A small model on the edge beats a large model that never ships.',
    'Good AI says what it knows and shows where it learned it.',
    'The agent plans, calls a tool, checks the result and tries again.',
    'Every answer needs a source and every agent needs a fallback.',
    'Attention is all you need, but evaluation is what you ship.'
  ];
  const RACERS = [['You', 0], ['Typical chat model · ≈60 tok/s', 60], ['Inference chip · ≈600 tok/s', 600]];
  const textEl = document.getElementById('raceText'), inp = document.getElementById('raceIn'), lanesEl = document.getElementById('raceLanes');
  const tEl = document.getElementById('raceT'), result = document.getElementById('raceResult');
  let target = '', t0 = 0, done = false, errors = 0, prevLen = 0, si = 0, timer = 0;
  const lanes = RACERS.map(([name]) => { const l = el('div', 'race-lane'), bar = el('i'), info = el('em', 'mono', '—'); l.append(el('b', 'mono', name), bar, info); lanesEl.append(l); return { bar, info }; });
  const paintText = () => {
    const v = inp.value;
    textEl.textContent = '';
    [...target].forEach((c, i) => textEl.append(el('span', i < v.length ? (v[i] === c ? 'ok' : 'bad') : i === v.length ? 'cur' : '', c)));
  };
  const tick = () => {
    const s = (performance.now() - t0) / 1000, toks = target.length / 4;
    tEl.textContent = s.toFixed(1);
    RACERS.forEach(([, rate], i) => {
      if (!rate) return;
      const p = Math.min(1, s * rate / toks);
      lanes[i].bar.style.setProperty('--p', p.toFixed(3));
      lanes[i].info.textContent = p >= 1 ? `done in ${(toks / rate).toFixed(2)} s` : '…';
    });
    if (!done) timer = requestAnimationFrame(tick);
  };
  const reset = () => {
    cancelAnimationFrame(timer);
    target = SENTENCES[si++ % SENTENCES.length];
    inp.value = ''; t0 = 0; done = false; errors = 0; prevLen = 0;
    inp.disabled = false;
    lanes.forEach(l => { l.bar.style.setProperty('--p', 0); l.info.textContent = '—'; });
    tEl.textContent = '0.0';
    paintText();
  };
  inp.addEventListener('input', () => {
    if (done) return;
    const v = inp.value;
    if (!t0 && v) { t0 = performance.now(); timer = requestAnimationFrame(tick); }
    if (v.length > prevLen && v[v.length - 1] !== target[v.length - 1]) errors++;
    prevLen = v.length;
    paintText();
    let ok = 0;
    while (ok < v.length && v[ok] === target[ok]) ok++;
    lanes[0].bar.style.setProperty('--p', (ok / target.length).toFixed(3));
    lanes[0].info.textContent = `${ok} / ${target.length}`;
    if (MA.sfx) MA.sfx('key');
    if (v === target) {
      done = true; inp.disabled = true; cancelAnimationFrame(timer); tick();
      const s = (performance.now() - t0) / 1000, tps = target.length / 4 / s, wpm = target.length / 5 / (s / 60);
      const acc = Math.max(0, 1 - errors / target.length);
      lanes[0].info.textContent = `${s.toFixed(1)} s`;
      result.textContent = '';
      result.append(el('b', null, `${tps.toFixed(1)} tokens/s`),
        el('p', null, `${Math.round(wpm)} words a minute, ${Math.round(acc * 100)}% accurate. The chat model was ${(60 / tps).toFixed(0)}× faster and the inference chip ${(600 / tps).toFixed(0)}× faster.`),
        el('p', null, wpm > 80 ? 'Seriously quick. Still, in fairness to you: you understood the sentence.' : 'In fairness to you: you understood the sentence. They predicted it.'));
      if (MA.achieve) MA.achieve('racer');
    }
  });
  document.getElementById('arc-race').addEventListener('click', e => { if (e.target.closest('[data-race="new"]')) { reset(); inp.focus(); } else if (e.target.closest('.race-text')) inp.focus(); });
  reset();
})();
