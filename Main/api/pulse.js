/**
 * /api/pulse — anonymous visitor stats and the live "people here now" count.
 *  POST { sid, ev: [[type, key], …], bye? } → { here }   (bye: the tab is closing — stop counting it)
 *    sid  a random id per browser tab (sessionStorage), re-sent every ~30 s while the tab is visible
 *    ev   'visit' once per session; 'sec' (a section was read), 'play' (a game or tool was used),
 *         'ach' (an achievement unlocked) — keys are checked against the lists below
 *  GET  → { here }
 * No cookies, no stored IPs: daily uniques are a HyperLogLog of salted IP hashes.
 */
'use strict';
const { httpError, send, handle, readJSON, pipeline, isId, limit, ipKey } = require('./_lib');

const HERE_MS = 70 * 1000; // a tab counts as "here" for 70 s after its last pulse
const SECTIONS = ['top', 'about', 'now', 'build', 'work', 'services', 'stack', 'rag', 'lab', 'commits', 'research', 'awards', 'quotes', 'journey', 'contact'];
const PLAYS = ['nn', 'gen', 'cv', 'digits', 'words', 'breaker', 'chat', 'voice', 'terminal', 'recruiter', 'guestbook', 'case'];
const ACH = ['trainer', 'sampler', 'vision', 'reader', 'analogy', 'breaker', 'worlds', 'hacker', 'pilot', 'catch', 'konami', 'explorer'];
const KINDS = { sec: ['st:sec', SECTIONS], play: ['st:play', PLAYS], ach: ['st:ach', ACH] };
const istDay = (t = Date.now()) => new Date(t + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const hereNow = now => [['ZREMRANGEBYSCORE', 'pr:now', '-inf', now - HERE_MS], ['ZCARD', 'pr:now']];

module.exports = handle(async (req, res) => {
  const now = Date.now();
  if (req.method === 'GET') {
    const [, here] = await pipeline(hereNow(now));
    return send(res, 200, { here });
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); throw httpError(405, 'Method not allowed.'); }
  const b = await readJSON(req);
  if (!isId(b.sid)) throw httpError(400, 'Unknown session.');
  /* generous per IP: phone carriers put many visitors behind one shared address (one tab ≈ 120 pulses an hour) */
  await limit('pulse', req, 2400, 3600);

  const cmds = [b.bye === true ? ['ZREM', 'pr:now', b.sid] : ['ZADD', 'pr:now', now, b.sid], ...hereNow(now)];
  const seen = new Set();
  (Array.isArray(b.ev) ? b.ev.slice(0, 24) : []).forEach(e => {
    if (!Array.isArray(e)) return;
    const t = String(e[0] || ''), k = String(e[1] || '');
    if (seen.has(t + k)) return;
    seen.add(t + k);
    if (t === 'visit') {
      const day = istDay(now);
      cmds.push(['HINCRBY', 'st:visits', day, 1], ['PFADD', `st:uv:${day}`, ipKey(req)], ['EXPIRE', `st:uv:${day}`, 120 * 86400]);
    } else if (KINDS[t] && KINDS[t][1].includes(k)) cmds.push(['HINCRBY', KINDS[t][0], k, 1]);
  });
  const out = await pipeline(cmds);
  send(res, 200, { here: out[2] });
});

/* the numbers behind the Stats tab on /admin */
module.exports.stats = async () => {
  const now = Date.now(), days = [];
  for (let i = 29; i >= 0; i--) days.push(istDay(now - i * 86400 * 1000));
  const res = await pipeline([['HGETALL', 'st:visits'], ['HGETALL', 'st:sec'], ['HGETALL', 'st:play'], ['HGETALL', 'st:ach'], ['ZCOUNT', 'pr:now', now - HERE_MS, '+inf'], ...days.map(d => ['PFCOUNT', `st:uv:${d}`])]);
  const obj = flat => { const o = {}; for (let i = 0; i + 1 < (flat || []).length; i += 2) o[flat[i]] = +flat[i + 1]; return o; };
  const visits = obj(res[0]);
  return {
    here: res[4],
    total: Object.values(visits).reduce((a, n) => a + n, 0),
    days: days.map((d, i) => ({ day: d, visits: visits[d] || 0, people: res[5 + i] || 0 })),
    sections: obj(res[1]), plays: obj(res[2]), achievements: obj(res[3])
  };
};
