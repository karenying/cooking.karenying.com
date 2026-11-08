import test from 'node:test';
import assert from 'node:assert/strict';
import { cookingAnalytics } from '../src/analytics.ts';
const meal = (date, setting = 'home', dishes = []) => ({ id: `${date}-${setting}`, date, setting, dishes, type: 'Dinner', note: '' });
const trip = (startDate, endDate) => ({ id: startDate, startDate, endDate, title: 'Trip', note: '' });
const recipe = { id: 'r', name: 'Noodles', cuisine: 'Chinese' };

test('day breakdown splits mixed days equally, excludes Figma-only and future days, and deduplicates trips', () => {
  const stats = cookingAnalytics([
    meal('2026-11-01'), meal('2026-11-01'), meal('2026-11-02', 'out'),
    meal('2026-11-03'), meal('2026-11-03', 'out'), meal('2026-11-04', 'figma'),
    meal('2026-11-05'), meal('2026-11-09'),
  ], [trip('2026-11-05', '2026-11-06'), trip('2026-11-06', '2026-11-09')], [], '2026-11-01', '2026-11-08');
  assert.deepEqual(stats.counts, { cooked: 1, out: 1, mix: 1, away: 4 });
  assert.equal(stats.total, 7);
  assert.deepEqual(stats.actual, { cooked: 1.5, out: 1.5, away: 4 });
  assert.equal(stats.actual.cooked + stats.actual.out + stats.actual.away, stats.total);
});
test('range clips trips at both ends, handles leap dates and returns safe empty totals', () => {
  const stats = cookingAnalytics([], [trip('2028-02-27', '2028-03-04')], [], '2028-02-29', '2028-03-01');
  assert.deepEqual([...stats.days.keys()], ['2028-02-29', '2028-03-01']);
  const empty = cookingAnalytics([], [], [], '2026-11-01', '2026-11-08');
  assert.equal(empty.total, 0);
  assert.equal(empty.longestStreak, 0);
  assert.deepEqual(empty.dishes, []);
});
test('streaks stop at missing and away days; dishes count once per home meal with cuisine totals', () => {
  const stats = cookingAnalytics([
    meal('2026-11-01', undefined, ['r', 'r', 'missing']), meal('2026-11-02', 'home', ['r']),
    meal('2026-11-02', 'out', ['r']), meal('2026-11-03', 'home', ['r']),
    meal('2026-11-05', 'home', ['r']), meal('2026-11-06', 'figma', ['r']),
    meal('2026-11-07', 'home', ['r']), meal('2026-11-08', 'home', ['r']),
  ], [trip('2026-11-03', '2026-11-03')], [recipe], '2026-11-01', '2026-11-08');
  assert.equal(stats.longestStreak, 2);
  assert.equal(stats.dishes[0].count, 5);
  assert.deepEqual(stats.cuisines, [{ name: 'Chinese', count: 5 }]);
});
