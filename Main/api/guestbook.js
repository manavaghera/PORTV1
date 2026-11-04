/**
 * /api/guestbook — short notes from anyone who stops by (kind words are for people who
 * have worked with me; this is for everyone else).
 *  GET  → published notes (name, where from, message, date)
 *  POST → { name, from, message } — waits for approval on /admin, like kind words
 *         (GUESTBOOK_AUTO_PUBLISH=1 publishes straight away instead).
 */
'use strict';
const { env, httpError, send, handle, readJSON, redis, pipeline, parse, clean, line, newId, looksLikeBot, limit, mail } = require('./_lib');

const MAX_PENDING = 300;
const pub = g => ({ id: g.id, name: g.name, from: g.from, message: g.message, at: g.at });

module.exports = handle(async (req, res) => {
  if (req.method === 'GET') {
    const ids = await redis('ZREVRANGE', 'gb:published', 0, 79).catch(e => { if (e.status === 503) return null; throw e; });
    if (!ids) return send(res, 200, { items: [], ready: false });
    const items = ids.length ? (await redis('MGET', ...ids.map(i => `gb:${i}`))).map(parse).filter(Boolean).map(pub) : [];
    return send(res, 200, { items, ready: true }, { cache: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw httpError(405, 'Method not allowed.'); }

  const b = await readJSON(req);
  if (looksLikeBot(b)) return send(res, 201, { ok: true, status: 'pending' });
  const g = { name: line(b.name, 40), from: line(b.from, 40), message: clean(b.message, 280) };
  if (g.name.length < 2) throw httpError(400, 'Please sign with a name.');
  if (g.message.length < 3) throw httpError(400, 'Write a little something first.');
  if (/https?:\/\/|www\.|\.[a-z]{2,}\//i.test(g.message + g.from)) throw httpError(400, 'Please leave links out.');
  await limit('gb', req, 3, 3600);
  if ((await redis('ZCARD', 'gb:pending')) >= MAX_PENDING) throw httpError(503, 'The guestbook is full for now — please try again in a few days.');

  const auto = env('GUESTBOOK_AUTO_PUBLISH') === '1';
  Object.assign(g, { id: newId(), at: Date.now(), status: auto ? 'published' : 'pending' });
  await pipeline([['SET', `gb:${g.id}`, JSON.stringify(g)], ['ZADD', auto ? 'gb:published' : 'gb:pending', g.at, g.id]]);
  await mail({ subject: `Guestbook: ${g.name}${g.from ? ' from ' + g.from : ''}`, text: `${g.name}${g.from ? ' (' + g.from + ')' : ''} wrote:\n\n${g.message}\n\n${auto ? 'It is live on the site.' : 'Approve or delete it on /admin.'}` });
  send(res, 201, { ok: true, status: g.status });
});
