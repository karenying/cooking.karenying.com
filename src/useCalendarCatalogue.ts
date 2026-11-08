import type { Meal, AwayEvent } from "./data";
import { fromCalendarMeal, fromAwayEvent } from "./calendar-catalogue";
import { useCloudItems } from "./useCloudItems";
function previous(key: "meals" | "events") {
  try { return JSON.parse(localStorage.getItem("at-home-calendar-overrides-v1") || "null")?.[key] || { upserts: {}, deleted: [] }; }
  catch { return { upserts: {}, deleted: [] }; }
}
const mealsConfig = {
  table: "calendar_meals", columns: "id,date,type,setting,dishes,note,content",
  decode: (row: any) => fromCalendarMeal({ id: row.id, date: row.date, type: row.type, setting: row.setting, dishes: row.dishes, note: row.note, content: row.content }),
  encode: (meal: Meal) => ({ date: meal.date, type: meal.type, setting: meal.setting || "home", dishes: meal.dishes, note: meal.note, content: meal.content || null }),
  key: "at-home-calendar-cloud-meals-v1", initial: () => previous("meals"),
};
const eventsConfig = {
  table: "away_events", columns: "id,title,start_date,end_date,note", decode: fromAwayEvent,
  encode: (event: AwayEvent) => ({ title: event.title, start_date: event.startDate, end_date: event.endDate, note: event.note }),
  key: "at-home-calendar-cloud-events-v1", initial: () => previous("events"),
};
export function useCalendarCatalogue() {
  const meals = useCloudItems<Meal>(mealsConfig); const events = useCloudItems<AwayEvent>(eventsConfig);
  return { meals: meals.items, setMeals: meals.setItems, awayEvents: events.items, setAwayEvents: events.setItems,
    loading: meals.loading || events.loading, error: meals.error || events.error, pending: meals.pending || events.pending,
    saveError: meals.saveError || events.saveError, storageFailed: meals.storageFailed || events.storageFailed,
    retry: () => { meals.retry(); events.retry(); }, retrySave: () => { if (meals.saveError) void meals.retrySave(); if (events.saveError) void events.retrySave(); },
    discardFailed: () => { if (meals.saveError) meals.discardFailed(); if (events.saveError) events.discardFailed(); },
    unsyncedCount: meals.unsyncedCount + events.unsyncedCount, syncDrafts: () => { void meals.syncDrafts(); void events.syncDrafts(); },
  };
}
