import type { Meal, AwayEvent } from "./data";
export type Overlay<T> = { upserts: Record<string, T>; deleted: string[] };
export function applyOverlay<T extends { id: string }>(remote: T[], overlay: Overlay<T>): T[] {
  const removed = new Set(overlay.deleted);
  const items = new Map(remote.filter(r => !removed.has(r.id)).map(r => [r.id, r]));
  for (const item of Object.values(overlay.upserts)) if (!removed.has(item.id)) items.set(item.id, item);
  return [...items.values()];
}
export function makeOverlay<T extends { id: string }>(remote: T[], next: T[]): Overlay<T> {
  const ids = new Set(next.map(r => r.id));
  const original = new Map(remote.map(r => [r.id, r]));
  return { deleted: remote.filter(r => !ids.has(r.id)).map(r => r.id),
    upserts: Object.fromEntries(next.filter(r => JSON.stringify(r) !== JSON.stringify(original.get(r.id))).map(r => [r.id, r])) };
}
export type CalendarMealRow = Omit<Meal, "content" | "vicCooked"> & { content: Meal["content"] | null; vic_cooked?: boolean };
export function fromCalendarMeal(row: CalendarMealRow): Meal {
  const { vic_cooked, ...meal } = row;
  return { ...meal, content: row.content || undefined, vicCooked: vic_cooked ?? false };
}
export function toCalendarMeal(meal: Meal) {
  return { date: meal.date, type: meal.type, setting: meal.setting || "home", dishes: meal.dishes,
    note: meal.note, content: meal.content || null, vic_cooked: meal.vicCooked ?? false };
}
export function fromAwayEvent(row: {id:string;title:string;start_date:string;end_date:string;note:string}): AwayEvent {
  return { id: row.id, title: row.title, startDate: row.start_date, endDate: row.end_date, note: row.note };
}
