/**
 * Journey — the line draws itself as you scroll; the big year rolls to
 * whichever entry is crossing the middle of the screen.
 */
(() => {
  'use strict';
  const list = document.getElementById('tlList');
  if (!list) return;
  const body = list.parentElement, fill = document.getElementById('tlFill');
  const yearEl = document.getElementById('tlYear'), tagEl = document.getElementById('tlTag');
  const items = [...list.querySelectorAll('.tl-item')];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  let current = -1, lastP = -1, visible = false, flipT;

  const setYear = i => {
    if (i === current) return;
    current = i;
    const { year, tag } = items[i].dataset;
    clearTimeout(flipT);
    yearEl.classList.add('out');
    flipT = setTimeout(() => {
      yearEl.textContent = year;
      tagEl.textContent = tag;
      yearEl.classList.remove('out');
      yearEl.classList.add('in');
      void yearEl.offsetWidth;
      yearEl.classList.remove('in');
    }, 220);
  };

  const frame = () => {
    if (visible) {
      const mid = innerHeight * .55, r = body.getBoundingClientRect();
      const p = clamp((mid - r.top) / r.height);
      if (Math.abs(p - lastP) > .0005) {
        lastP = p;
        fill.style.transform = `scaleY(${p.toFixed(4)})`;
        let idx = 0;
        items.forEach((it, i) => {
          const passed = it.getBoundingClientRect().top < mid;
          it.classList.toggle('passed', passed);
          if (passed) idx = i;
        });
        setYear(idx);
      }
    }
    requestAnimationFrame(frame);
  };
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { rootMargin: '200px' }).observe(body);
  setYear(0);
  requestAnimationFrame(frame);
})();
