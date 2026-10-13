// FAST core logic: pure functions, no DOM, shared by the app and the tests.
// A fast is { id, start, end } with timestamps in ms; end is null while running.
(function (root) {
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;
  const GOAL_HOURS = 36;
  const GOAL_MS = GOAL_HOURS * HOUR;

  function newId(start) { return 'F' + start.toString(36); }

  function elapsedMs(fast, now) {
    const end = fast.end == null ? now : fast.end;
    return Math.max(0, Math.min(end - fast.start, GOAL_MS));
  }

  function isComplete(fast) { return fast.end != null && fast.end - fast.start >= GOAL_MS; }

  // A running fast finishes on its own at 36:00, also when the app was closed.
  function autoComplete(active, now) {
    if (!active || now - active.start < GOAL_MS) return null;
    return { id: active.id, start: active.start, end: active.start + GOAL_MS };
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function fmtClock(ms) {
    const s = Math.floor(ms / 1000);
    return pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
  }

  function fmtHM(ms) {
    const m = Math.floor(ms / 60000);
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }

  function fmtEta(ms) {
    const m = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(m / 60);
    return h ? h + 'h ' + pad(m % 60) + 'm' : m + 'm';
  }

  function phaseIndex(phases, hours) {
    for (let i = phases.length - 1; i >= 0; i--) if (hours >= phases[i].from) return i;
    return 0;
  }

  // Local calendar week (Monday start) as a running integer, DST-safe.
  function weekIndex(ts) {
    const d = new Date(ts);
    const dow = (d.getDay() + 6) % 7;
    const monday = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() - dow);
    return Math.round((monday - Date.UTC(1970, 0, 5)) / (7 * DAY));
  }

  // Consecutive calendar weeks with a completed fast. The current week does
  // not break the streak while it is still open.
  function streak(log, now) {
    const weeks = {};
    log.forEach(function (f) { if (isComplete(f)) weeks[weekIndex(f.end)] = true; });
    let w = weekIndex(now);
    if (!weeks[w]) w--;
    let n = 0;
    while (weeks[w]) { n++; w--; }
    return n;
  }

  function stats(log, now) {
    const done = log.filter(isComplete);
    let total = 0, longest = 0, last = null;
    log.forEach(function (f) {
      if (f.end == null) return;
      const ms = elapsedMs(f, f.end);
      total += ms;
      if (ms > longest) longest = ms;
      if (last === null || f.end > last) last = f.end;
    });
    return {
      completed: done.length,
      attempts: log.length,
      streak: streak(log, now),
      totalHours: Math.floor(total / HOUR),
      longestMs: longest,
      daysSinceLast: last === null ? null : Math.floor((now - last) / DAY)
    };
  }

  // Merge fasts read back from the Sheet into the local state. Local entries
  // win; a remote running fast is adopted only when nothing runs locally.
  function mergeRemote(state, remote, pendingDeletes) {
    const known = {};
    state.log.forEach(function (f) { known[f.id] = true; });
    if (state.active) known[state.active.id] = true;
    let added = 0;
    remote.forEach(function (f) {
      if (!f || !f.id || !f.start || known[f.id] || pendingDeletes[f.id]) return;
      if (f.end == null) {
        if (!state.active) { state.active = { id: f.id, start: f.start, end: null }; added++; }
      } else {
        state.log.push({ id: f.id, start: f.start, end: f.end });
        added++;
      }
      known[f.id] = true;
    });
    state.log.sort(function (a, b) { return b.start - a.start; });
    return added;
  }

  root.FAST_CORE = {
    HOUR: HOUR, DAY: DAY, GOAL_HOURS: GOAL_HOURS, GOAL_MS: GOAL_MS,
    newId: newId, elapsedMs: elapsedMs, isComplete: isComplete, autoComplete: autoComplete,
    fmtClock: fmtClock, fmtHM: fmtHM, fmtEta: fmtEta, phaseIndex: phaseIndex,
    weekIndex: weekIndex, streak: streak, stats: stats, mergeRemote: mergeRemote
  };
})(typeof window !== 'undefined' ? window : globalThis);
