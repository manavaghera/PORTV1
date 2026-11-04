/**
 * Local dev server: serves Main/ and runs Main/api/*.js the way Vercel does.
 *   node scripts/dev.js                 → uses the Redis/Resend settings in .env.local
 *   node scripts/dev.js --mock-redis    → in-memory stand-in for Upstash (data resets on restart)
 * Reads KEY=value lines from .env.local (git-ignored). Port: --port N, PORT, or 5518.
 * Lives outside Main/, so it is never deployed.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'Main');
const argPort = process.argv.indexOf('--port');
const PORT = +(argPort > -1 && process.argv[argPort + 1]) || +process.env.PORT || 5518;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };

const envFile = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(l => {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  });
}

/* ── a tiny Upstash-REST stand-in: just the commands the API uses ── */
const mock = process.argv.includes('--mock-redis');
const kv = new Map(), zs = new Map(), ttl = new Map(), hs = new Map(), hll = new Map();
const alive = k => { if (ttl.has(k) && ttl.get(k) < Date.now()) { kv.delete(k); ttl.delete(k); } return kv.has(k); };
const zset = k => zs.get(k) || zs.set(k, new Map()).get(k);
const sorted = k => [...zset(k)].sort((a, b) => a[1] - b[1]).map(e => e[0]);
const range = (arr, a, b) => { const n = arr.length; a = +a < 0 ? n + +a : +a; b = +b < 0 ? n + +b : +b; return arr.slice(Math.max(0, a), b + 1); };
const run = ([cmd, ...a]) => {
  switch (String(cmd).toUpperCase()) {
    case 'SET': kv.set(a[0], a[1]); if (String(a[2]).toUpperCase() === 'EX') ttl.set(a[0], Date.now() + a[3] * 1000); else ttl.delete(a[0]); return 'OK';
    case 'GET': return alive(a[0]) ? kv.get(a[0]) : null;
    case 'MGET': return a.map(k => (alive(k) ? kv.get(k) : null));
    case 'DEL': return a.reduce((n, k) => n + (kv.delete(k) ? 1 : 0), 0);
    case 'INCR': { const v = (alive(a[0]) ? +kv.get(a[0]) : 0) + 1; kv.set(a[0], String(v)); return v; }
    case 'EXPIRE': ttl.set(a[0], Date.now() + a[1] * 1000); return 1;
    case 'ZADD': zset(a[0]).set(a[2], +a[1]); return 1;
    case 'ZREM': return a.slice(1).reduce((n, m) => n + (zset(a[0]).delete(m) ? 1 : 0), 0);
    case 'ZCARD': return zset(a[0]).size;
    case 'ZREVRANGE': return range(sorted(a[0]).reverse(), a[1], a[2]);
    case 'ZREMRANGEBYRANK': { const gone = range(sorted(a[0]), a[1], a[2]); gone.forEach(m => zset(a[0]).delete(m)); return gone.length; }
    case 'ZREMRANGEBYSCORE': case 'ZCOUNT': {
      const lo = a[1] === '-inf' ? -Infinity : +a[1], hi = a[2] === '+inf' ? Infinity : +a[2];
      const hit = [...zset(a[0])].filter(([, s]) => s >= lo && s <= hi).map(e => e[0]);
      if (String(cmd).toUpperCase() === 'ZREMRANGEBYSCORE') hit.forEach(m => zset(a[0]).delete(m));
      return hit.length;
    }
    case 'HINCRBY': { const h = hs.get(a[0]) || hs.set(a[0], new Map()).get(a[0]); const v = (h.get(a[1]) || 0) + +a[2]; h.set(a[1], v); return v; }
    case 'HGETALL': return [...(hs.get(a[0]) || [])].flatMap(([f, v]) => [f, String(v)]);
    case 'PFADD': { const s = hll.get(a[0]) || hll.set(a[0], new Set()).get(a[0]); const n = s.size; a.slice(1).forEach(x => s.add(x)); return s.size > n ? 1 : 0; }
    case 'PFCOUNT': return (hll.get(a[0]) || new Set()).size;
    default: throw new Error('mock redis: unsupported ' + cmd);
  }
};
if (mock) { process.env.KV_REST_API_URL = `http://127.0.0.1:${PORT}/__redis`; process.env.KV_REST_API_TOKEN = 'dev'; }

/* the same headers Vercel adds (vercel.json), so the security policy is tested locally too */
let RULES = [];
try { RULES = (JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8')).headers || []).map(r => ({ re: new RegExp('^' + r.source + '$'), headers: r.headers })); } catch (e) { console.warn('vercel.json headers not loaded:', e.message); }
const applyHeaders = (res, pathname) => RULES.forEach(r => { if (r.re.test(pathname)) r.headers.forEach(h => res.setHeader(h.key, h.value)); });

const body = req => new Promise((ok, no) => { let s = ''; req.on('data', c => { s += c; }); req.on('end', () => ok(s)); req.on('error', no); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (mock && url.pathname.startsWith('/__redis')) {
      const cmds = JSON.parse(await body(req));
      const out = url.pathname.endsWith('/pipeline') ? cmds.map(c => ({ result: run(c) })) : { result: run(cmds) };
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(out));
    }
    applyHeaders(res, url.pathname);
    const api = /^\/api\/([a-z0-9-]+)\/?$/.exec(url.pathname);
    if (api) {
      const file = path.join(ROOT, 'api', api[1] + '.js');
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('{"error":"Not found"}'); }
      delete require.cache[require.resolve(file)];
      return require(file)(req, res);
    }
    let p = decodeURIComponent(url.pathname);
    if (p.endsWith('/')) p += 'index.html';
    if (!path.extname(p) && fs.existsSync(path.join(ROOT, p + '.html'))) p += '.html'; // cleanUrls
    const file = path.resolve(ROOT, '.' + p), parts = path.relative(ROOT, file).split(path.sep);
    const hidden = !file.startsWith(ROOT + path.sep) || parts[0] === 'api' || parts[0] === 'node_modules' || parts.some(s => s.startsWith('.'));
    if (hidden || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
    }
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache'); // locally, always fresh (Vercel caches /js, /css, /data for a year)
    /* compress text like Vercel does, so local speed tests are realistic */
    if (/^(text\/|application\/json|image\/svg)/.test(res.getHeader('Content-Type')) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      return fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    }
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.statusCode = 500; res.end('{"error":"dev server error"}'); }
  }
}).listen(PORT, () => console.log(`portfolio dev server → http://localhost:${PORT}${mock ? '  (mock redis)' : ''}`));
