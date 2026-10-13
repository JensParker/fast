// Run: node tests/test-core.js   (ends with ALL PASS)
const path = require('path');
require(path.join('..', 'core.js'));
require(path.join('..', 'content.js'));
const C = globalThis.FAST_CORE;
const CONTENT = globalThis.FAST_CONTENT;
const assert = require('assert');
const H = C.HOUR;

let n = 0;
function test(name, fn) { fn(); n++; console.log('PASS ' + name); }
const at = (y, m, d, h) => new Date(y, m - 1, d, h || 0).getTime();
const done = (start) => ({ id: C.newId(start), start: start, end: start + C.GOAL_MS });

test('clock formatting', () => {
  assert.strictEqual(C.fmtClock(0), '00:00:00');
  assert.strictEqual(C.fmtClock(18 * H + 42 * 60000 + 7000), '18:42:07');
  assert.strictEqual(C.fmtClock(C.GOAL_MS), '36:00:00');
  assert.strictEqual(C.fmtHM(21 * H + 40 * 60000), '21:40');
  assert.strictEqual(C.fmtEta(5 * H + 18 * 60000), '5h 18m');
  assert.strictEqual(C.fmtEta(30000), '1m');
});

test('elapsed is capped at 36 hours', () => {
  const f = { id: 'x', start: 1000, end: null };
  assert.strictEqual(C.elapsedMs(f, 1000 + 5 * H), 5 * H);
  assert.strictEqual(C.elapsedMs(f, 1000 + 50 * H), C.GOAL_MS);
});

test('auto-complete at 36:00, also after the app was closed', () => {
  const active = { id: 'x', start: 1000, end: null };
  assert.strictEqual(C.autoComplete(active, 1000 + 35.99 * H), null);
  assert.strictEqual(C.autoComplete(null, 5), null);
  const d = C.autoComplete(active, 1000 + 80 * H);
  assert.strictEqual(d.end, 1000 + C.GOAL_MS);
  assert.ok(C.isComplete(d));
});

test('stopped early is incomplete', () => {
  assert.ok(!C.isComplete({ id: 'x', start: 0, end: 21 * H }));
  assert.ok(!C.isComplete({ id: 'x', start: 0, end: null }));
});

test('phases cover hour 0 to 36 without gaps', () => {
  const P = CONTENT.PHASES;
  assert.strictEqual(P[0].from, 0);
  assert.strictEqual(P[P.length - 1].to, C.GOAL_HOURS);
  for (let i = 1; i < P.length; i++) assert.strictEqual(P[i].from, P[i - 1].to);
  P.forEach((p) => { assert.ok(p.facts.length >= 3); assert.ok(p.orders.length >= 4); });
  assert.strictEqual(C.phaseIndex(P, 0), 0);
  assert.strictEqual(C.phaseIndex(P, 11.99), 2);
  assert.strictEqual(C.phaseIndex(P, 12), 3);
  assert.strictEqual(C.phaseIndex(P, 35.9), P.length - 1);
});

test('week index is Monday based and steps by one', () => {
  const mon = at(2026, 10, 12, 0), sun = at(2026, 10, 18, 23), nextMon = at(2026, 10, 19, 0);
  assert.strictEqual(C.weekIndex(mon), C.weekIndex(sun));
  assert.strictEqual(C.weekIndex(nextMon), C.weekIndex(mon) + 1);
  // across the end of daylight saving time (25 Oct 2026 in Europe)
  assert.strictEqual(C.weekIndex(at(2026, 10, 26, 0)), C.weekIndex(mon) + 2);
});

test('streak counts consecutive weeks and tolerates the open week', () => {
  const log = [done(at(2026, 10, 12, 20)), done(at(2026, 10, 6, 20)), done(at(2026, 9, 29, 8))];
  assert.strictEqual(C.streak(log, at(2026, 10, 15, 12)), 3);
  assert.strictEqual(C.streak(log, at(2026, 10, 21, 12)), 3, 'next week, no fast yet');
  assert.strictEqual(C.streak(log, at(2026, 10, 28, 12)), 0, 'a full week missed');
  assert.strictEqual(C.streak([], at(2026, 10, 15, 12)), 0);
});

test('incomplete fasts do not feed the streak', () => {
  const log = [{ id: 'a', start: at(2026, 10, 12, 20), end: at(2026, 10, 13, 18) }];
  assert.strictEqual(C.streak(log, at(2026, 10, 15, 12)), 0);
});

test('stats', () => {
  const s0 = C.stats([], at(2026, 10, 15, 12));
  assert.deepStrictEqual([s0.completed, s0.attempts, s0.daysSinceLast, s0.totalHours], [0, 0, null, 0]);
  const log = [done(at(2026, 10, 12, 20)), { id: 'b', start: at(2026, 10, 5, 20), end: at(2026, 10, 6, 17) }];
  const s = C.stats(log, at(2026, 10, 16, 9));
  assert.strictEqual(s.completed, 1);
  assert.strictEqual(s.attempts, 2);
  assert.strictEqual(s.totalHours, 57);
  assert.strictEqual(s.longestMs, C.GOAL_MS);
  assert.strictEqual(s.daysSinceLast, 2);
});

test('restore merges by id, respects deletes and a running fast', () => {
  const a = done(at(2026, 10, 5, 20)), b = done(at(2026, 9, 28, 20)), c = done(at(2026, 9, 21, 20));
  const running = { id: 'R1', start: at(2026, 10, 13, 20), end: null };
  const state = { active: null, log: [a] };
  const added = C.mergeRemote(state, [a, b, c, running, { id: '', start: 5 }], { [c.id]: true });
  assert.strictEqual(added, 2);
  assert.deepStrictEqual(state.log.map((f) => f.id), [a.id, b.id]);
  assert.strictEqual(state.active.id, 'R1');
  const state2 = { active: { id: 'L1', start: 9, end: null }, log: [] };
  C.mergeRemote(state2, [running], {});
  assert.strictEqual(state2.active.id, 'L1', 'local running fast wins');
});

console.log('\nALL PASS (' + n + ' tests)');
