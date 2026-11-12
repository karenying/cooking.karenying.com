import test from 'node:test';
import assert from 'node:assert/strict';
import { cookingAnalytics, mealKinds } from '../src/analytics.ts';
const meal = (date, setting = 'home', dishes = [], type = 'Dinner') => ({ id: `${date}-${setting}-${type}`, date, setting, dishes, type, note: '' });
const trip = (startDate, endDate) => ({ id: startDate, startDate, endDate, title: 'Trip', note: '' });
const recipe = { id: 'r', name: 'Noodles', cuisine: 'Chinese' };

test('breakdown counts lunch and dinner, fills leftovers, includes Figma and deduplicates slots and trips', () => {
  const stats = cookingAnalytics([
    meal('2026-11-01'), meal('2026-11-01'),
    meal('2026-11-02', 'out'),
    meal('2026-11-03'), meal('2026-11-03', 'out', [], 'Lunch'),
    meal('2026-11-04', 'figma', [], 'Lunch'),
    meal('2026-11-05'), meal('2026-11-09'),
  ], [trip('2026-11-05', '2026-11-06'), trip('2026-11-06', '2026-11-09')], [], '2026-11-01', '2026-11-08');
  assert.deepEqual(stats.counts, { cooked: 5, out: 2, figma: 1, away: 8 });
  assert.equal(stats.total, 16);
  assert.equal(stats.homeDays, 4);
  assert.equal(Object.values(stats.counts).reduce((a, b) => a + b, 0), stats.total);
  assert.deepEqual(mealKinds.map(({ key }) => key), ['cooked', 'out', 'figma', 'away']);
});
test('multiple settings in one slot share one meal; fully eating out has no inferred home meal', () => {
  const stats = cookingAnalytics([
    meal('2026-11-01'), meal('2026-11-01', 'out'),
    meal('2026-11-02', 'out', [], 'Lunch'), meal('2026-11-02', 'out'),
  ], [], [], '2026-11-01', '2026-11-02');
  assert.deepEqual(stats.counts, { cooked: 1.5, out: 2.5, figma: 0, away: 0 });
  assert.equal(stats.total, 4);
  assert.equal(stats.homeDays, 1);
});
test('range clips trips at both ends, handles leap dates and returns safe empty totals', () => {
  const stats = cookingAnalytics([], [trip('2028-02-27', '2028-03-04')], [], '2028-02-29', '2028-03-01');
  assert.deepEqual([...stats.days.keys()], ['2028-02-29', '2028-03-01']);
  assert.equal(stats.counts.away, 4);
  assert.equal(stats.total, 4);
  const empty = cookingAnalytics([], [], [], '2026-11-01', '2026-11-08');
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.counts, { cooked: 0, out: 0, figma: 0, away: 0 });
  assert.equal(empty.homeDays, 0);
  assert.equal(empty.longestStreak, 0);
  assert.equal(empty.longestStreakDates, null);
  assert.deepEqual(empty.dishes, []);
});
test('home streaks include leftover slots; dishes count recorded home meals and exclude away and Figma', () => {
  const stats = cookingAnalytics([
    meal('2026-11-01', undefined, ['r', 'r', 'missing']), meal('2026-11-02', 'home', ['r']),
    meal('2026-11-02', 'out', ['r'], 'Lunch'), meal('2026-11-03', 'home', ['r']),
    meal('2026-11-05', 'home', ['r']), meal('2026-11-06', 'figma', ['r'], 'Lunch'),
    meal('2026-11-07', 'home', ['r']), meal('2026-11-08', 'home', ['r']),
  ], [trip('2026-11-03', '2026-11-03')], [recipe], '2026-11-01', '2026-11-08');
  assert.equal(stats.longestStreak, 4);
  assert.deepEqual(stats.longestStreakDates, { start: "2026-11-05", end: "2026-11-08" });
  assert.equal(stats.homeDays, 6);
  assert.equal(stats.dishes[0].count, 5);
  assert.deepEqual(stats.cuisines, [{ name: 'Chinese', count: 5 }]);
});

test('Vic cooked counts flagged home meal slots once, respects dates and excludes away, out and Figma', () => {
  const vic = (date, setting = 'home', type = 'Dinner') => ({ ...meal(date, setting, [], type), vicCooked: true });
  const meals = [
    vic('2026-10-31'), vic('2026-11-01'), vic('2026-11-01'),
    vic('2026-11-01', 'home', 'Lunch'), meal('2026-11-02'),
    vic('2026-11-03', 'out'), vic('2026-11-04', 'figma'),
    vic('2026-11-05'), vic('2026-11-09'),
  ];
  const events = [trip('2026-11-05', '2026-11-05')];
  assert.equal(cookingAnalytics(meals, events, [], '2026-11-01', '2026-11-08').vicCooked, 2);
  assert.equal(cookingAnalytics(meals, events, [], '2026-10-01', '2026-11-08').vicCooked, 3);
  assert.equal(cookingAnalytics(meals, events, [], '2026-11-02', '2026-11-08').vicCooked, 0);
  assert.equal(cookingAnalytics([], [], [], '2026-11-01', '2026-11-08').vicCooked, 0);
});

test('streak dates stay within the range and select the earliest streak when tied', () => {
  const meals = ['2025-12-30','2025-12-31','2026-01-01','2026-01-02','2026-01-04','2026-01-05'].map(date => meal(date));
  const stats = cookingAnalytics(meals, [], [], '2026-01-01', '2026-01-05');
  assert.equal(stats.longestStreak, 2);
  assert.deepEqual(stats.longestStreakDates, { start: '2026-01-01', end: '2026-01-02' });
  assert.deepEqual(cookingAnalytics(meals, [], [], '2026-01-05', '2026-01-05').longestStreakDates, { start: '2026-01-05', end: '2026-01-05' });
  assert.deepEqual(cookingAnalytics(meals, [], [], '2025-12-01', '2026-01-05').longestStreakDates, { start: '2025-12-30', end: '2026-01-02' });
});
