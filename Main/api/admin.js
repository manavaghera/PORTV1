/**
 * /api/admin — the back office behind /admin.
 *  POST { action: 'login', id, password }  → session cookie (12 h); ADMIN_ID / ADMIN_PASSWORD env vars
 *  POST { action: 'logout' }
 *  GET                                     → kind words (with emails), guestbook notes, the message inbox and visitor stats
 *  POST { action: 'approve' | 'unpublish' | 'delete', id, wall? }   wall: 'kw' (kind words, default) or 'gb' (guestbook)
 *  POST { action: 'relation', id, relation }
 *  POST { action: 'deleteMessage', id }
 * Everything except login needs the session; changes also need the X-MA-Admin header (CSRF guard).
 */
'use strict';
const { env, httpError, send, handle, readJSON, redis, pipeline, parse, line, isId, limit, sameText, isHttps, newSession, sessionCookie, isAdmin, RELATIONS } = require('./_lib');
const { stats } = require('./pulse');

const load = async (zset, prefix, n = 200) => {
  const ids = await redis('ZREVRANGE', zset, 0, n - 1);
  if (!ids.length) return [];
  const rows = (await redis('MGET', ...ids.map(i => `${prefix}:${i}`))).map(parse);
  const gone = ids.filter((_, i) => !rows[i]);
  if (gone.length) await redis('ZREM', zset, ...gone);
  return rows.filter(Boolean);
};
const item = async (id, wall = 'kw') => {
  if (!isId(id)) throw httpError(400, 'Unknown item.');
  const k = parse(await redis('GET', `${wall}:${id}`));
  if (!k) throw httpError(404, 'That item no longer exists.');
  return k;
};

module.exports = handle(async (req, res) => {
  if (req.method === 'GET') {
    if (!isAdmin(req)) throw httpError(401, 'Please sign in.');
    const [pending, published, messages, guestWaiting, guestLive, numbers] = await Promise.all([
      load('kw:pending', 'kw'), load('kw:published', 'kw'), load('msg:inbox', 'msg'), load('gb:pending', 'gb'), load('gb:published', 'gb'), stats()
    ]);
    return send(res, 200, { pending, published, messages, guestbook: [...guestWaiting, ...guestLive], stats: numbers, relations: RELATIONS });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw httpError(405, 'Method not allowed.'); }
  const b = await readJSON(req);
  const action = line(b.action, 20);

  if (action === 'login') {
    await limit('login', req, 8, 900);
    const id = env('ADMIN_ID'), pw = env('ADMIN_PASSWORD');
    if (!id || !pw) throw httpError(503, 'Admin is not set up yet.');
    /* short passwords are fine for local testing, never on the live site */
    if (pw.length < 10 && isHttps(req)) throw httpError(503, 'The admin password on the server is too short — use 10+ characters.');
    const ok = sameText(line(b.id, 100), id) & sameText(typeof b.password === 'string' ? b.password.slice(0, 200) : '', pw);
    if (!ok) { await new Promise(r => setTimeout(r, 600)); throw httpError(401, 'Wrong ID or password.'); }
    return send(res, 200, { ok: true }, { cookie: newSession(req) });
  }
  if (action === 'logout') return send(res, 200, { ok: true }, { cookie: sessionCookie(req, '', 0) });

  if (!isAdmin(req)) throw httpError(401, 'Please sign in.');
  if (req.headers['x-ma-admin'] !== '1') throw httpError(403, 'Missing admin header.');

  const wall = b.wall === 'gb' ? 'gb' : 'kw';
  if (action === 'approve' || action === 'unpublish') {
    const k = await item(b.id, wall), on = action === 'approve';
    k.status = on ? 'published' : 'pending';
    await pipeline([['SET', `${wall}:${k.id}`, JSON.stringify(k)], ['ZREM', `${wall}:${on ? 'pending' : 'published'}`, k.id], ['ZADD', `${wall}:${on ? 'published' : 'pending'}`, k.at, k.id]]);
    return send(res, 200, { ok: true });
  }
  if (action === 'relation') {
    const k = await item(b.id), rel = line(b.relation, 20).toLowerCase();
    if (!RELATIONS.includes(rel)) throw httpError(400, 'Unknown category.');
    k.relation = rel;
    await redis('SET', `kw:${k.id}`, JSON.stringify(k));
    return send(res, 200, { ok: true });
  }
  if (action === 'delete') {
    if (!isId(b.id)) throw httpError(400, 'Unknown item.');
    await pipeline([['DEL', `${wall}:${b.id}`], ['ZREM', `${wall}:pending`, b.id], ['ZREM', `${wall}:published`, b.id]]);
    return send(res, 200, { ok: true });
  }
  if (action === 'deleteMessage') {
    if (!isId(b.id)) throw httpError(400, 'Unknown message.');
    await pipeline([['DEL', `msg:${b.id}`], ['ZREM', 'msg:inbox', b.id]]);
    return send(res, 200, { ok: true });
  }
  throw httpError(400, 'Unknown action.');
});
