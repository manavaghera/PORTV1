/**
 * Voice — the dark Field theme says the same things, darker. Swaps the intro
 * line under a few section titles; Lumora keeps the text in index.html.
 * (The hero's dark lines live in garden.js.)
 */
(() => {
  'use strict';
  if (document.documentElement.dataset.palette !== 'field') return;
  const DARK = {
    now: "What I'm working on after dark — some of it updates live.",
    work: "Things I've built that refused to die. Each comes with an animated walkthrough — what it does, how it's built, what it achieved.",
    services: "Need one of these? I build them end to end — and they keep working long after everyone's gone home.",
    rag: 'Interrogate my résumé. It only answers from what it finds — no lies, no hallucinations.',
    lab: 'Five experiments in a quiet lab. Watch a network learn, see how chatbots choose their words, let a machine read your handwriting.',
    quotes: 'Words from the people who survived working with me.',
    journey: 'Where I\'ve been, and what followed me home.'
  };
  Object.entries(DARK).forEach(([id, text]) => {
    const p = document.querySelector(`#${id} .sec-head > p`);
    if (p) p.textContent = text;
  });
})();
