// FAST app: state in localStorage, optional backup to a Google Sheet.
(function () {
  'use strict';
  const C = window.FAST_CORE;
  const CONTENT = window.FAST_CONTENT;
  const STORE_KEY = 'fast.v1';
  const HOLD_MS = 1500;
  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const viewEl = document.getElementById('view');
  const statusEl = document.getElementById('status');
  let state = load();
  let view = 'timer';
  let flash = '';
  let openLogId = null;
  let renderedHour = -1;
  let syncBusy = false;

  // ---------- state ----------

  function load() {
    const blank = { active: null, log: [], ack: null, sync: { url: '', key: '', last: 0, error: '' }, queue: [] };
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (!s) return blank;
      return {
        active: s.active || null,
        log: Array.isArray(s.log) ? s.log : [],
        ack: s.ack || null,
        sync: Object.assign(blank.sync, s.sync || {}),
        queue: Array.isArray(s.queue) ? s.queue : []
      };
    } catch (e) {
      return blank;
    }
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
  }

  function enqueue(op) {
    if (!state.sync.url) return;
    state.queue.push(op);
  }

  function finish(fast) {
    state.active = null;
    state.log.unshift(fast);
    enqueue({ action: 'upsert', fast: fast });
  }

  // ---------- actions ----------

  function startFast() {
    if (state.active) return;
    const now = Date.now();
    state.active = { id: C.newId(now), start: now, end: null };
    state.ack = null;
    flash = '';
    enqueue({ action: 'upsert', fast: state.active });
    commit();
  }

  function stopFast() {
    if (!state.active) return;
    const fast = { id: state.active.id, start: state.active.start, end: Date.now() };
    finish(fast);
    flash = 'Stopped at ' + C.fmtHM(C.elapsedMs(fast, fast.end)) + '. Logged as incomplete. Regroup and go again.';
    commit();
  }

  function discardFast() {
    if (!state.active) return;
    enqueue({ action: 'delete', id: state.active.id });
    state.active = null;
    flash = 'Fast deleted. Nothing on record.';
    commit();
  }

  function deleteEntry(id) {
    state.log = state.log.filter(function (f) { return f.id !== id; });
    if (state.ack === id) state.ack = null;
    enqueue({ action: 'delete', id: id });
    openLogId = null;
    commit();
  }

  function checkAutoComplete() {
    const done = C.autoComplete(state.active, Date.now());
    if (!done) return false;
    finish(done);
    state.ack = done.id;
    view = 'timer';
    commit();
    return true;
  }

  function commit() {
    save();
    render();
    flush();
  }

  // ---------- sync ----------

  function post(op) {
    return fetch(state.sync.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ key: state.sync.key }, op))
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (data) {
      if (data.error) throw new Error(data.error);
      return data;
    });
  }

  async function flush() {
    if (!state.sync.url || syncBusy) return;
    syncBusy = true;
    try {
      while (state.queue.length) {
        await post(state.queue[0]);
        state.queue.shift();
        save();
      }
      state.sync.last = Date.now();
      state.sync.error = '';
    } catch (e) {
      state.sync.error = String(e.message || e);
    }
    syncBusy = false;
    save();
    renderStatus();
    if (view === 'setup') render();
  }

  async function restore() {
    const data = await post({ action: 'list' });
    const pendingDeletes = {};
    state.queue.forEach(function (op) { if (op.action === 'delete') pendingDeletes[op.id] = true; });
    const added = C.mergeRemote(state, data.fasts || [], pendingDeletes);
    save();
    return added;
  }

  async function connect(url, key) {
    state.sync.url = url.trim();
    state.sync.key = key.trim();
    state.sync.error = '';
    state.queue = [];
    state.log.slice().reverse().forEach(function (f) { state.queue.push({ action: 'upsert', fast: f }); });
    if (state.active) state.queue.push({ action: 'upsert', fast: state.active });
    save();
    await flush();
    if (state.sync.error) { flash = 'Sync failed: ' + state.sync.error; render(); return; }
    try {
      const added = await restore();
      flash = 'Connected. ' + (added ? added + ' fast(s) restored from the Sheet.' : 'Sheet and phone are in line.');
    } catch (e) {
      flash = 'Connected, but restore failed: ' + (e.message || e);
    }
    render();
  }

  // One-time setup link from the Apps Script: #setup=<base64 of {"u":url,"k":key}>
  function importSetupHash() {
    const m = location.hash.match(/^#setup=(.+)$/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    try {
      const cfg = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (cfg.u && cfg.k) { view = 'setup'; connect(cfg.u, cfg.k); }
    } catch (e) {
      flash = 'Setup link not readable.';
    }
  }

  // ---------- rendering ----------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ts) { const d = new Date(ts); return two(d.getHours()) + ':' + two(d.getMinutes()); }
  function fmtDay(ts) { const d = new Date(ts); return DAYS[d.getDay()] + ' ' + two(d.getDate()) + ' ' + MONTHS[d.getMonth()]; }
  function fmtDate(ts) { const d = new Date(ts); return two(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }

  function renderStatus() {
    let s = state.active ? '<span class="on">&#9679; RUNNING</span>' : '&#9675; STANDBY';
    if (state.sync.url) {
      s += state.sync.error ? ' <span class="warn">&middot; SYNC ERR</span>'
        : state.queue.length ? ' &middot; SYNC ' + state.queue.length : '';
    }
    statusEl.innerHTML = s;
  }

  function idleLine(st) {
    if (st.attempts === 0) return 'No fast on record. That changes today. Finish your last meal and press start.';
    if (st.daysSinceLast === null || st.daysSinceLast >= 7) return 'You are overdue. Pick your window and execute.';
    if (st.daysSinceLast >= 5) return 'Next fast is coming up. Choose the day. Clear the calendar.';
    return 'Recovery is part of the plan. Eat well, sleep well, report back within the week.';
  }

  function statRow(label, value) {
    return '<div class="stat"><span>' + label + '</span><b>' + esc(value) + '</b></div>';
  }

  function viewIdle() {
    const st = C.stats(state.log, Date.now());
    const last = st.daysSinceLast === null ? 'none' : st.daysSinceLast === 0 ? 'today' : st.daysSinceLast + ' d ago';
    return (flash ? '<p class="flash">' + esc(flash) + '</p>' : '') +
      '<section class="block"><div class="label">STANDBY</div><p class="lead">' + esc(idleLine(st)) + '</p></section>' +
      '<section class="stats">' + statRow('LAST FAST', last) + statRow('STREAK', st.streak + ' wk') +
      statRow('COMPLETED', st.completed) + '</section>' +
      '<div class="actions"><button class="btn primary" data-act="start">START FAST</button>' +
      '<p class="hint">Tap when your last meal is finished. Target: 36:00:00.</p></div>';
  }

  function viewRunning() {
    const now = Date.now();
    const ms = C.elapsedMs(state.active, now);
    const hours = ms / C.HOUR;
    const phases = CONTENT.PHASES;
    const i = C.phaseIndex(phases, hours);
    const p = phases[i];
    const order = p.orders[Math.floor(hours - p.from) % p.orders.length];
    const endTs = state.active.start + C.GOAL_MS;
    const next = i + 1 < phases.length ? phases[i + 1].name : 'MISSION COMPLETE';
    renderedHour = Math.floor(hours);
    return '<section class="clockwrap"><div class="clock"><span id="clock">' + C.fmtClock(ms) + '</span></div>' +
      '<div class="goal">/ 36:00:00</div>' +
      '<div class="bar"><div id="fill" style="width:' + (ms / C.GOAL_MS * 100).toFixed(2) + '%"></div></div>' +
      '<div class="row"><span id="pct">' + Math.floor(ms / C.GOAL_MS * 100) + '%</span>' +
      '<span>ENDS ' + fmtDay(endTs) + ' ' + fmtTime(endTs) + '</span></div></section>' +
      '<section class="block"><div class="label">PHASE ' + (i + 1) + '/' + phases.length + ' &middot; HOUR ' + p.from + '&ndash;' + p.to + '</div>' +
      '<h2>' + esc(p.name) + '</h2><ul class="facts">' +
      p.facts.map(function (f) {
        return '<li>' + esc(f.t) + (f.thin ? ' <span class="thin">[human evidence thin]</span>' : '') + '</li>';
      }).join('') + '</ul>' +
      '<p class="order">' + esc(order) + '</p></section>' +
      '<section class="next">NEXT &nbsp;' + esc(next) + ' in <span id="eta">' + C.fmtEta(p.to * C.HOUR - ms) + '</span></section>' +
      '<div class="actions"><button class="btn hold" data-hold="stop"><span>HOLD TO STOP</span></button>' +
      '<button class="btn hold quiet" data-hold="discard"><span>HOLD TO DELETE</span></button></div>';
  }

  function viewComplete() {
    const fast = state.log.filter(function (f) { return f.id === state.ack; })[0];
    const st = C.stats(state.log, Date.now());
    return '<section class="clockwrap done"><div class="label">MISSION COMPLETE</div>' +
      '<div class="clock">36:00:00</div><div class="bar"><div id="fill" style="width:100%"></div></div>' +
      (fast ? '<div class="row"><span>' + fmtDay(fast.start) + ' ' + fmtTime(fast.start) + '</span><span>' +
        fmtDay(fast.end) + ' ' + fmtTime(fast.end) + '</span></div>' : '') + '</section>' +
      '<section class="block"><p class="lead">36 hours. No shortcuts. That is how it is done.</p><ul class="facts">' +
      CONTENT.COMPLETE.facts.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<p class="order">' + esc(CONTENT.COMPLETE.order) + '</p></section>' +
      '<section class="stats">' + statRow('FAST NO.', st.completed) + statRow('STREAK', st.streak + ' wk') +
      statRow('TOTAL', st.totalHours + ' h') + '</section>' +
      '<div class="actions"><button class="btn primary" data-act="ack">DISMISSED</button></div>';
  }

  function viewLog() {
    const st = C.stats(state.log, Date.now());
    let html = '<section class="stats four">' + statRow('COMPLETED', st.completed + '/' + st.attempts) +
      statRow('STREAK', st.streak + ' wk') + statRow('TOTAL', st.totalHours + ' h') +
      statRow('LONGEST', C.fmtHM(st.longestMs)) + '</section>';
    if (!state.log.length) return html + '<p class="hint">No entries. The log fills itself when you do the work.</p>';
    html += '<ul class="log">' + state.log.map(function (f) {
      const ok = C.isComplete(f);
      const open = openLogId === f.id;
      return '<li class="' + (ok ? 'ok' : 'no') + '"><button class="entry" data-entry="' + esc(f.id) + '">' +
        '<span>' + fmtDate(f.end) + '</span><span>' + C.fmtHM(C.elapsedMs(f, f.end)) + '</span>' +
        '<span class="tag">' + (ok ? 'COMPLETE' : 'INCOMPLETE') + '</span></button>' +
        (open ? '<div class="detail"><div>START ' + fmtDay(f.start) + ' ' + fmtTime(f.start) + '</div><div>END &nbsp; ' +
          fmtDay(f.end) + ' ' + fmtTime(f.end) + '</div><button class="btn hold quiet" data-hold="delete:' + esc(f.id) +
          '"><span>HOLD TO DELETE</span></button></div>' : '') + '</li>';
    }).join('') + '</ul>';
    return html;
  }

  function viewSetup() {
    const s = state.sync;
    let html = flash ? '<p class="flash">' + esc(flash) + '</p>' : '';
    html += '<section class="block"><div class="label">BACKUP TO GOOGLE SHEET</div>';
    if (s.url) {
      html += '<p>' + (s.error ? '<span class="warn">Last sync failed: ' + esc(s.error) + '</span>'
        : 'Connected. ' + (state.queue.length ? state.queue.length + ' change(s) waiting to sync.'
          : s.last ? 'Last sync ' + fmtDay(s.last) + ' ' + fmtTime(s.last) + '.' : '')) + '</p>' +
        '<div class="actions"><button class="btn" data-act="syncnow">SYNC NOW</button>' +
        '<button class="btn" data-act="restore">RESTORE FROM SHEET</button>' +
        '<button class="btn hold quiet" data-hold="disconnect"><span>HOLD TO DISCONNECT</span></button></div>';
    } else {
      html += '<p>Not connected. Your log lives on this phone only. Open the setup link from the Apps Script on this phone, or paste both values here.</p>' +
        '<label>WEB APP URL<input id="syncUrl" type="url" autocomplete="off" placeholder="https://script.google.com/macros/s/.../exec"></label>' +
        '<label>KEY<input id="syncKey" type="text" autocomplete="off"></label>' +
        '<div class="actions"><button class="btn" data-act="connect">CONNECT</button></div>';
    }
    html += '</section><section class="block"><div class="label">SOURCES</div><ul class="facts small">' +
      CONTENT.SOURCES.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<p class="hint">Timings are typical values from human studies and vary between people.</p></section>';
    return html;
  }

  function render() {
    renderedHour = -1;
    let html;
    if (view === 'log') html = viewLog();
    else if (view === 'setup') html = viewSetup();
    else if (state.active) html = viewRunning();
    else if (state.ack) html = viewComplete();
    else html = viewIdle();
    viewEl.innerHTML = html;
    document.querySelectorAll('nav button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === view);
    });
    renderStatus();
  }

  function tick() {
    if (!state.active) return;
    if (checkAutoComplete()) return;
    if (view !== 'timer') return;
    const ms = C.elapsedMs(state.active, Date.now());
    const hours = ms / C.HOUR;
    if (Math.floor(hours) !== renderedHour && !document.querySelector('.holding')) { render(); return; }
    const clock = document.getElementById('clock');
    if (!clock) return;
    clock.textContent = C.fmtClock(ms);
    document.getElementById('fill').style.width = (ms / C.GOAL_MS * 100).toFixed(2) + '%';
    document.getElementById('pct').textContent = Math.floor(ms / C.GOAL_MS * 100) + '%';
    const p = CONTENT.PHASES[C.phaseIndex(CONTENT.PHASES, hours)];
    document.getElementById('eta').textContent = C.fmtEta(p.to * C.HOUR - ms);
  }

  // ---------- events ----------

  const actions = {
    start: startFast,
    ack: function () { state.ack = null; flash = ''; commit(); },
    syncnow: function () { flash = ''; flush(); },
    restore: function () {
      restore().then(function (n) { flash = n ? n + ' fast(s) restored.' : 'Nothing new in the Sheet.'; render(); })
        .catch(function (e) { flash = 'Restore failed: ' + (e.message || e); render(); });
    },
    connect: function () {
      const url = document.getElementById('syncUrl').value;
      const key = document.getElementById('syncKey').value;
      if (!/^https:\/\/script\.google\.com\//.test(url.trim()) || !key.trim()) {
        flash = 'Need the web app URL and the key.';
        render();
        return;
      }
      flash = 'Connecting...';
      render();
      connect(url, key);
    }
  };

  const holdActions = {
    stop: stopFast,
    discard: discardFast,
    disconnect: function () {
      state.sync = { url: '', key: '', last: 0, error: '' };
      state.queue = [];
      flash = 'Disconnected. The Sheet keeps what it has.';
      commit();
    }
  };

  document.addEventListener('click', function (e) {
    const nav = e.target.closest('nav button');
    if (nav) { view = nav.dataset.view; flash = ''; openLogId = null; render(); return; }
    const act = e.target.closest('[data-act]');
    if (act && actions[act.dataset.act]) { actions[act.dataset.act](); return; }
    const entry = e.target.closest('[data-entry]');
    if (entry) { openLogId = openLogId === entry.dataset.entry ? null : entry.dataset.entry; render(); }
  });

  // Press-and-hold buttons guard the actions that end or remove a fast.
  let holdTimer = null;
  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer = null;
    document.querySelectorAll('.holding').forEach(function (b) { b.classList.remove('holding'); });
  }
  document.addEventListener('pointerdown', function (e) {
    const btn = e.target.closest('[data-hold]');
    if (!btn) return;
    cancelHold();
    btn.classList.add('holding');
    holdTimer = setTimeout(function () {
      const name = btn.dataset.hold;
      cancelHold();
      if (name.indexOf('delete:') === 0) deleteEntry(name.slice(7));
      else if (holdActions[name]) holdActions[name]();
    }, HOLD_MS);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (type) {
    document.addEventListener(type, cancelHold, true);
  });
  document.addEventListener('contextmenu', function (e) {
    if (e.target.closest('[data-hold]')) e.preventDefault();
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { tick(); flush(); }
  });
  window.addEventListener('online', flush);

  // ---------- boot ----------

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  importSetupHash();
  if (!checkAutoComplete()) render();
  flush();
  setInterval(tick, 1000);
})();
