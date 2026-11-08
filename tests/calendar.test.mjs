import test from 'node:test';
import assert from 'node:assert/strict';
import { awayOnDate, mealSettingLabel, validDateRange } from '../src/calendar.ts';
import { initialMeals, initialAwayEvents, upgradeSampleCalendar } from '../src/data.ts';

const event = { id: 'trip', title: 'Trip', startDate: '2026-12-30', endDate: '2027-01-02', note: '' };
test('away events cover both endpoints across months and years', () => {
  for (const date of ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']) {
    assert.equal(awayOnDate([event], date).length, 1);
  }
  assert.equal(awayOnDate([event], '2026-12-29').length, 0);
  assert.equal(awayOnDate([event], '2027-01-03').length, 0);
  assert.equal(awayOnDate([event, { ...event, id: 'second' }], '2027-01-01').length, 2);
});
test('date ranges validate leap dates, single days, reversed dates and DST boundaries', () => {
  assert.equal(validDateRange('2028-02-29', '2028-03-01'), true);
  assert.equal(validDateRange('2026-02-29', '2026-03-01'), false);
  assert.equal(validDateRange('2026-03-08', '2026-03-09'), true);
  assert.equal(validDateRange('2026-11-01', '2026-11-01'), true);
  assert.equal(validDateRange('2027-01-01', '2026-12-31'), false);
  assert.equal(validDateRange('', '2026-11-01'), false);
});
test('meals default to At home while Eating out and Figma stay distinct', () => {
  assert.equal(mealSettingLabel({ note: 'Vacation restaurant', dishes: [] }), 'At home');
  assert.equal(mealSettingLabel({ setting: 'out' }), 'Eating out');
  assert.equal(mealSettingLabel({ setting: 'figma' }), 'Figma');
});
test('seed examples distinguish meals out from all-day trips', () => {
  assert.equal(initialMeals.find(meal => meal.id === 'm5').setting, 'out');
  assert.equal(initialMeals.find(meal => meal.id === 'm16').setting, 'out');
  assert.equal(initialMeals.some(meal => meal.id === 'm19'), false);
  assert.equal(awayOnDate(initialAwayEvents, '2026-11-22').length, 1);
});
test('sample upgrades preserve edited data, custom entries and existing trip edits', () => {
  const oldOut = { id: 'm5', date: '2026-11-04', type: 'Dinner', dishes: [], note: 'Dinner out with friends' };
  const oldAway = { id: 'm19', date: '2026-11-21', type: 'Dinner', dishes: [], note: 'Away for the weekend 🌲' };
  const custom = { ...oldOut, id: 'custom', note: 'My own entry' };
  const edited = { ...oldOut, note: 'Changed my plans' };
  const classified = { ...oldOut, setting: 'home' };
  const upgraded = upgradeSampleCalendar([oldOut, oldAway, custom], []);
  assert.equal(upgraded.meals.find(meal => meal.id === 'm5').setting, 'out');
  assert.ok(!upgraded.meals.some(meal => meal.id === 'm19'));
  assert.deepEqual(upgraded.awayEvents, initialAwayEvents);
  assert.deepEqual(upgraded.meals.find(meal => meal.id === 'custom'), custom);
  assert.deepEqual(upgradeSampleCalendar([edited], []).meals, [edited]);
  assert.deepEqual(upgradeSampleCalendar([classified], []).meals, [classified]);
  assert.deepEqual(upgradeSampleCalendar([], []), { meals: [], awayEvents: [] });
  const changedTrip = { ...initialAwayEvents[0], title: 'My new title', endDate: '2026-11-24' };
  assert.deepEqual(upgradeSampleCalendar([oldAway], [changedTrip]).awayEvents, [changedTrip]);
  assert.deepEqual(upgradeSampleCalendar(upgraded.meals, upgraded.awayEvents), upgraded);
});
