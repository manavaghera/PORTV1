/* The visitor's saved theme and palette, applied before the page paints (for pages other than the home page). */
try {
  if (localStorage.getItem('ma-theme') === 'light') document.documentElement.dataset.theme = 'light';
  if (localStorage.getItem('ma-pal') === 'field') document.documentElement.dataset.palette = 'field';
} catch (e) { /* storage blocked: defaults */ }
