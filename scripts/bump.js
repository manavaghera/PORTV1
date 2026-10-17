/**
 * Cache-busting: JS, CSS and data are served with a one-year cache (Main/vercel.json),
 * so every release needs fresh ?v= numbers. Run `npm run bump` before you commit changes
 * to any file in Main/js, Main/css or Main/data — it sets every ?v= in Main/*.html to one
 * number higher than the highest it finds.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const MAIN = path.resolve(__dirname, '..', 'Main');
const pages = fs.readdirSync(MAIN).filter(f => f.endsWith('.html')).map(f => path.join(MAIN, f));
const texts = pages.map(p => fs.readFileSync(p, 'utf8'));
const max = Math.max(0, ...texts.flatMap(t => [...t.matchAll(/\?v=(\d+)/g)].map(m => +m[1])));
const next = max + 1;
pages.forEach((p, i) => {
  const out = texts[i].replace(/\?v=\d+/g, `?v=${next}`);
  if (out !== texts[i]) { fs.writeFileSync(p, out); console.log(`${path.basename(p)} → v=${next}`); }
});
