/**
 * Shared helpers for the site's serverless functions (Vercel, Node runtime).
 * No dependencies — just fetch and crypto:
 *  · Upstash Redis over its REST API (storage)
 *  · input checks and per-IP rate limits (abuse control at the boundary)
 *  · a signed, HttpOnly admin session cookie
 *  · email through Resend's API
 * Files starting with "_" in /api are not deployed as endpoints.
 */
'use strict';
const crypto = require('crypto');

const env = k => String(process.env[k] || '').trim();
const httpError = (status, message) => Object.assign(new Error(message), { status });

/* ── responses ── */
const send = (res, status, data, extra = {}) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', extra.cache || 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (extra.cookie) res.setHeader('Set-Cookie', extra.cookie);
  res.end(JSON.stringify(data));
};
const handle = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    if (!e.status) console.error(e);
    send(res, e.status || 500, { error: e.status ? e.message : 'Something went wrong on our side.' });
  }
};
const readJSON = async req => {
  if (!/application\/json/i.test(req.headers['content-type'] || '')) throw httpError(415, 'Send JSON.');
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) for await (const chunk of req) { raw += chunk; if (raw.length > 16384) throw httpError(413, 'That is too long.'); }
  if (raw.length > 16384) throw httpError(413, 'That is too long.');
  try { const v = raw ? JSON.parse(raw) : {}; if (v && typeof v === 'object' && !Array.isArray(v)) return v; } catch (e) { /* fall through */ }
  throw httpError(400, 'That request could not be read.');
};

/* ── storage: Upstash Redis REST (Vercel's Redis integration sets KV_REST_API_*) ── */
const redisConf = () => ({ url: env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL'), token: env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN') });
const call = async (path, body) => {
  const { url, token } = redisConf();
  if (!url || !token) throw httpError(503, 'Storage is not set up yet.');
  const r = await fetch(url.replace(/\/$/, '') + path, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || j.error) { console.error('redis', r.status, j && j.error); throw httpError(502, 'Storage is unavailable right now.'); }
  return j;
};
const redis = async (...cmd) => (await call('', cmd.map(String))).result;
const pipeline = async cmds => (await call('/pipeline', cmds.map(c => c.map(String)))).map(x => x.result);
const parse = s => { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } };

/* ── input ── */
const clean = (v, max) => (typeof v === 'string' ? v : '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028\u2029\uFEFF]/g, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
const line = (v, max) => clean(v, max).replace(/\s+/g, ' ');
const isEmail = s => s.length <= 120 && /^[^\s@<>()[\]",;:\\]+@[^\s@<>()[\]",;:\\]+\.[a-z]{2,}$/i.test(s);
const newId = () => crypto.randomBytes(9).toString('base64url');
const isId = s => typeof s === 'string' && /^[A-Za-z0-9_-]{8,24}$/.test(s);
/* bots fill hidden fields and submit instantly; people don't */
const looksLikeBot = b => (typeof b.website === 'string' && b.website.trim() !== '') || (Number.isFinite(b.t) && b.t < 2500);

/* ── rate limits (per hashed IP; skipped only if storage isn't set up at all) ── */
const ipOf = req => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';
const ipKey = req => crypto.createHash('sha256').update(env('SESSION_SECRET') + '|' + ipOf(req)).digest('base64url').slice(0, 22);
const limit = async (bucket, req, max, windowSec) => {
  const key = `rl:${bucket}:${ipKey(req)}`;
  let n;
  try { n = await redis('INCR', key); } catch (e) { if (e.status === 503) return; throw e; }
  if (n === 1) await redis('EXPIRE', key, windowSec);
  if (n > max) throw httpError(429, 'Too many tries — please wait a little and try again.');
};

/* ── admin session: "<expiry>.<hmac>" in an HttpOnly cookie ── */
const secret = () => { const s = env('SESSION_SECRET'); if (s.length < 24) throw httpError(503, 'Admin is not set up yet.'); return s; };
const sign = exp => crypto.createHmac('sha256', secret()).update(`ma-admin.${exp}`).digest('base64url');
const sameText = (a, b) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
const isHttps = req => String(req.headers['x-forwarded-proto'] || '').includes('https') || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '');
const sessionCookie = (req, value, maxAge) => `ma_admin=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
const newSession = req => { const exp = Date.now() + 12 * 3600 * 1000; return sessionCookie(req, `${exp}.${sign(exp)}`, 12 * 3600); };
const isAdmin = req => {
  const m = /(?:^|;\s*)ma_admin=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!/^\d{13}$/.test(exp || '') || +exp < Date.now() || !sig) return false;
  const a = Buffer.from(sig), b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

/* ── email: Resend. Without a verified domain, Resend can still deliver to the account's own address ── */
const mail = async ({ subject, text, replyTo }) => {
  const key = env('RESEND_API_KEY'), to = env('CONTACT_TO');
  if (!key || !to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('CONTACT_FROM') || 'Portfolio <onboarding@resend.dev>', to: [to], subject: line(subject, 140), text, reply_to: replyTo || undefined })
    });
    if (!r.ok) console.error('resend', r.status, await r.text().catch(() => ''));
    return r.ok;
  } catch (e) { console.error('resend', e); return false; }
};

const RELATIONS = ['mentor', 'teacher', 'teammate', 'classmate', 'colleague', 'client', 'friend', 'other'];

module.exports = { env, httpError, send, handle, readJSON, redis, pipeline, parse, clean, line, isEmail, newId, isId, looksLikeBot, limit, ipKey, sameText, isHttps, newSession, sessionCookie, isAdmin, mail, RELATIONS };
