/**
 * /api/kind-words
 *  GET  → published testimonials (public fields only — never the email)
 *  POST → { name, email, relation, role, message } from the form on the site.
 *         New posts wait in a moderation queue until approved on /admin
 *         (set KIND_AUTO_PUBLISH=1 to publish straight away instead).
 */
'use strict';
const { env, httpError, send, handle, readJSON, redis, pipeline, parse, clean, line, isEmail, newId, looksLikeBot, limit, mail, RELATIONS } = require('./_lib');

const MAX_PENDING = 200;
const pub = k => ({ id: k.id, name: k.name, relation: k.relation, role: k.role, message: k.message, at: k.at });

module.exports = handle(async (req, res) => {
  if (req.method === 'GET') {
    const ids = await redis('ZREVRANGE', 'kw:published', 0, 59).catch(e => { if (e.status === 503) return null; throw e; });
    if (!ids) return send(res, 200, { items: [], ready: false });
    const items = ids.length ? (await redis('MGET', ...ids.map(i => `kw:${i}`))).map(parse).filter(Boolean).map(pub) : [];
    return send(res, 200, { items, ready: true }, { cache: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw httpError(405, 'Method not allowed.'); }

  const b = await readJSON(req);
  if (looksLikeBot(b)) return send(res, 201, { ok: true, status: 'pending' });
  const k = {
    name: line(b.name, 60), email: line(b.email, 120).toLowerCase(), relation: line(b.relation, 20).toLowerCase(),
    role: line(b.role, 80), message: clean(b.message, 600)
  };
  if (k.name.length < 2) throw httpError(400, 'Please add your name.');
  if (!isEmail(k.email)) throw httpError(400, 'Please add a valid email — only Manav sees it.');
  if (!RELATIONS.includes(k.relation)) throw httpError(400, 'Please pick how you know Manav.');
  if (k.message.length < 20) throw httpError(400, 'A few more words, please (20 characters at least).');
  if (/https?:\/\/|www\./i.test(k.message)) throw httpError(400, 'Please leave links out of the message.');
  await limit('kw', req, 3, 3600);
  if ((await redis('ZCARD', 'kw:pending')) >= MAX_PENDING) throw httpError(503, 'The queue is full right now — please try again in a few days.');

  const auto = env('KIND_AUTO_PUBLISH') === '1';
  Object.assign(k, { id: newId(), at: Date.now(), status: auto ? 'published' : 'pending' });
  await pipeline([['SET', `kw:${k.id}`, JSON.stringify(k)], ['ZADD', auto ? 'kw:published' : 'kw:pending', k.at, k.id]]);
  await mail({
    subject: `Kind words from ${k.name} (${k.relation})`,
    text: `${k.name}${k.role ? ', ' + k.role : ''} — ${k.relation}\n${k.email}\n\n${k.message}\n\n${auto ? 'It is live on the site.' : 'Approve or delete it on /admin.'}`,
    replyTo: k.email
  });
  send(res, 201, { ok: true, status: k.status });
});
