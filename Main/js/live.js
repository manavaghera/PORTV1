(() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  //  CONFIG  — edit these values, nothing else needs changing
  // ═══════════════════════════════════════════════════════════════
  const CFG = {
    BUILD_NUMBER      : 42,
    PORTFOLIO_EPOCH   : '2025-11-15T00:00:00+05:30', // first deploy date
    GITHUB_USER       : 'manavaghera',
    GH_CACHE_KEY      : 'gh_stats_v1',
    GH_CACHE_TTL_MS   : 60 * 60 * 1000,              // 1 hour
    TOKENS_BURNED_BASE: 5_214_397_102,
    // Fallback values if GitHub API unavailable and no cache
    FALLBACK: {
      lastCommit : 'RECENTLY',
      commits    : '847',
      repos      : '24',
      streak     : '12D',
    },
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt     = n => Number(n).toLocaleString('en-US');

  // ═══════════════════════════════════════════════════════════════
  //  FEATURE 1 — UPTIME SPEEDRUN TIMER
  // ═══════════════════════════════════════════════════════════════
  const initUptime = () => {
    const el = document.getElementById('uptimeClock');
    const meter = document.getElementById('buildMeter');
    const buildLabel = document.getElementById('buildLabel');
    if (!el) return;

    // Set build number from config
    if (buildLabel) buildLabel.textContent = `BUILD ${String(CFG.BUILD_NUMBER).padStart(3, '0')}`;

    const epoch = new Date(CFG.PORTFOLIO_EPOCH).getTime();
    const pad = n => String(n).padStart(2, '0');

    const render = () => {
      if (document.hidden) return;
      const diff = Math.max(0, Date.now() - epoch);
      const totalSec = Math.floor(diff / 1000);
      const s = totalSec % 60;
      const m = Math.floor(totalSec / 60) % 60;
      const h = Math.floor(totalSec / 3600) % 24;
      const d = Math.floor(totalSec / 86400);
      el.textContent = `${pad(d)}D ${pad(h)}H ${pad(m)}M ${pad(s)}S`;
    };

    if (reduced) {
      render();
    } else {
      render();
      setInterval(render, 1000);
    }

    // Progress bar — animate to 100% on first render
    if (meter) {
      meter.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        meter.style.width = '100%';
      }));
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  FEATURE 3 — TOKEN BURN COUNTER (runs before GitHub strip)
  // ═══════════════════════════════════════════════════════════════
  const initTokenBurn = () => {
    const el = document.getElementById('ghTokenNum');
    // Also the card's token count (in the timer card)
    const cardEl = document.getElementById('tokenCount');

    const getInitialTokenCount = () => {
      const base = CFG.TOKENS_BURNED_BASE;
      try {
        const stored = localStorage.getItem('tokens_burned_count');
        let val = stored ? parseInt(stored, 10) : base;
        if (isNaN(val) || val < base) val = base;
        const refreshBump = Math.floor(150_000 + Math.random() * 750_000);
        val += refreshBump;
        localStorage.setItem('tokens_burned_count', val.toString());
        return val;
      } catch {
        return base + Math.floor(150_000 + Math.random() * 750_000);
      }
    };

    let current = getInitialTokenCount();
    let revealed = false;

    const setAll = val => {
      const s = fmt(val);
      if (el)     el.textContent = s;
      if (cardEl) cardEl.textContent = s;
    };

    // Count-up animation on first reveal
    const countUp = (target, duration = 1600) => {
      if (reduced) { setAll(target); return; }
      const start = target - 2_000_000;
      const t0 = performance.now();
      const step = now => {
        const p = Math.min((now - t0) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
        setAll(Math.round(start + (target - start) * ease));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    // Observe token strip entry
    const target = document.getElementById('ghStrip') || document.getElementById('tokenBurnLine');
    if (target && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && !revealed) {
            revealed = true;
            countUp(current);
            io.disconnect();
          }
        });
      }, { threshold: 0.1 });
      io.observe(target);
    } else {
      setAll(current);
      revealed = true;
    }

    // Ongoing slow increment: every 6-14s add 50k-400k
    const drift = () => {
      const delay = 6000 + Math.random() * 8000;
      setTimeout(() => {
        const bump = Math.floor(50_000 + Math.random() * 350_000);
        current += bump;
        try { localStorage.setItem('tokens_burned_count', current.toString()); } catch {}
        if (revealed) {
          // Quick 300ms roll
          if (reduced) {
            setAll(current);
          } else {
            const prev = current - bump;
            const t0 = performance.now();
            const roll = now => {
              const p = Math.min((now - t0) / 300, 1);
              const ease = 1 - Math.pow(1 - p, 2);
              setAll(Math.round(prev + bump * ease));
              if (p < 1) requestAnimationFrame(roll);
            };
            requestAnimationFrame(roll);
          }
        }
        drift();
      }, delay);
    };
    drift();
  };

  // ═══════════════════════════════════════════════════════════════
  //  FEATURE 2 — LIVE GITHUB ACTIVITY STRIP
  // ═══════════════════════════════════════════════════════════════

  // Time-ago helper (returns e.g. "2H AGO" or "3D AGO")
  const timeAgo = isoStr => {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const mins  = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    const days  = Math.floor(diffMs / 86_400_000);
    if (mins  < 60)  return `${mins}M AGO`;
    if (hours < 24)  return `${hours}H AGO`;
    return `${days}D AGO`;
  };

  // Animated count-up for the strip numbers (on viewport entry)
  const animateNum = (el, target, duration = 800) => {
    if (reduced || isNaN(Number(target))) { el.textContent = target; return; }
    const n = Number(target);
    const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(n * ease));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const applyGhData = (data, animate) => {
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (animate && !isNaN(Number(val))) {
        animateNum(el, val);
      } else {
        el.textContent = val;
      }
    };

    // last commit doesn't animate (it's a string like "2H AGO")
    const lcEl = document.getElementById('ghLastCommit');
    if (lcEl) lcEl.setAttribute('aria-hidden', 'true');

    setEl('ghLastCommit', data.lastCommit);
    setEl('ghCommits',    data.commits);
    setEl('ghRepos',      data.repos);
  };

  const loadCache = () => {
    try {
      const raw = localStorage.getItem(CFG.GH_CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (Date.now() - obj.ts > CFG.GH_CACHE_TTL_MS) return null;
      return obj.data;
    } catch { return null; }
  };

  const saveCache = data => {
    try { localStorage.setItem(CFG.GH_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch {}
  };

  const fetchGhData = async () => {
    const base = `https://api.github.com/users/${CFG.GITHUB_USER}`;
    const headers = { Accept: 'application/vnd.github+json' };

    // Profile
    const profile = await fetch(base, { headers }).then(r => r.json());
    const repos = profile.public_repos ?? CFG.FALLBACK.repos;

    // Events (up to 3 pages, 100 per page)
    let lastCommit = CFG.FALLBACK.lastCommit;
    let commits = 0;
    const thisYear = new Date().getFullYear();

    for (let page = 1; page <= 3; page++) {
      const evts = await fetch(
        `${base}/events/public?per_page=100&page=${page}`, { headers }
      ).then(r => r.json());
      if (!Array.isArray(evts) || !evts.length) break;

      evts.forEach(e => {
        if (e.type !== 'PushEvent') return;
        const yr = new Date(e.created_at).getFullYear();
        if (yr === thisYear) commits += (e.payload?.commits?.length ?? 0);
        if (lastCommit === CFG.FALLBACK.lastCommit) {
          lastCommit = timeAgo(e.created_at);
        }
      });
    }

    // Never let cached commit count decrease
    const cached = loadCache();
    if (cached && Number(cached.commits) > commits) commits = Number(cached.commits);

    return { lastCommit, commits: String(commits || CFG.FALLBACK.commits), repos: String(repos) };
  };

  const initGhStrip = () => {
    // Render cached / fallback instantly
    const cached = loadCache();
    applyGhData(cached ?? CFG.FALLBACK, false);

    // Revalidate in background
    const strip = document.getElementById('ghStrip');
    let animDone = false;

    const doAnimate = data => {
      if (!animDone) { animDone = true; applyGhData(data, true); }
    };

    // Animate when strip enters viewport
    if (strip && 'IntersectionObserver' in window) {
      let fresh = null;
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting && fresh) { doAnimate(fresh); io.disconnect(); }
        });
      }, { threshold: 0.05 });
      io.observe(strip);

      fetchGhData().then(data => {
        saveCache(data);
        fresh = data;
        // If already in view, animate now
        const rect = strip.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          doAnimate(data);
        }
      }).catch(() => {});
    } else {
      // No IO support — just fetch and update silently
      fetchGhData().then(data => { saveCache(data); applyGhData(data, false); }).catch(() => {});
    }
  };

  // ═══════════════════════════════════════════════════════════════
  //  BOOT
  // ═══════════════════════════════════════════════════════════════
  const boot = () => {
    initUptime();
    initTokenBurn();
    initGhStrip();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
