/**
 * /api/contact — POST { name, email, message } from the contact form.
 * Emails it to Manav (Resend, reply-to set to the visitor) and keeps a copy
 * in the /admin inbox for 180 days, so nothing is lost if email hiccups.
 */
'use strict';
const { httpError, send, handle, readJSON, redis, pipeline, clean, line, isEmail, newId, looksLikeBot, limit, mail } = require('./_lib');

const KEEP = 180 * 24 * 3600, MAX_INBOX = 500;

module.exports = handle(async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); throw httpError(405, 'Method not allowed.'); }
  const b = await readJSON(req);
  if (looksLikeBot(b)) return send(res, 200, { ok: true, emailed: true });
  const m = { name: line(b.name, 80), email: line(b.email, 120).toLowerCase(), message: clean(b.message, 2000) };
  if (m.name.length < 2) throw httpError(400, 'Please add your name.');
  if (!isEmail(m.email)) throw httpError(400, 'Please add a valid email so Manav can reply.');
  if (m.message.length < 5) throw httpError(400, 'Please write a message.');
  await limit('contact', req, 5, 3600);
  Object.assign(m, { id: newId(), at: Date.now() });

  let stored = false;
  try {
    await pipeline([['SET', `msg:${m.id}`, JSON.stringify(m), 'EX', KEEP], ['ZADD', 'msg:inbox', m.at, m.id], ['ZREMRANGEBYRANK', 'msg:inbox', 0, -(MAX_INBOX + 1)]]);
    stored = true;
  } catch (e) { if (e.status !== 503) throw e; }
  const emailed = await mail({ subject: `Portfolio message from ${m.name}`, text: `${m.name} <${m.email}>\n\n${m.message}\n\n— sent from the contact form on your portfolio`, replyTo: m.email });
  if (!stored && !emailed) throw httpError(503, 'Direct messages are not set up yet.');
  send(res, 200, { ok: true, emailed, stored });
});
