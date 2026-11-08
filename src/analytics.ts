import type { AwayEvent, Meal, Recipe } from "./data";

export type DayKind = "cooked" | "out" | "mix" | "away";
export const dayKinds: { key: DayKind; label: string; color: string }[] = [
  { key: "cooked", label: "Cooked", color: "#fce5cd" },
  { key: "out", label: "Ate out", color: "#f4cccc" },
  { key: "mix", label: "Mix", color: "#f8d9cd" },
  { key: "away", label: "Away", color: "#d0e0e3" },
];
const nextDay = (key: string) => {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export function cookingAnalytics(meals: Meal[], events: AwayEvent[], recipes: Recipe[], start: string, end: string) {
  const days = new Map<string, DayKind>();
  const settings = new Map<string, Set<string>>();
  const inRange = (date: string) => date >= start && date <= end;
  for (const meal of meals) {
    if (!inRange(meal.date) || meal.setting === "figma") continue;
    const day = settings.get(meal.date) || new Set<string>();
    day.add(meal.setting || "home");
    settings.set(meal.date, day);
  }
  for (const [date, values] of settings) days.set(date, values.size > 1 ? "mix" : values.has("out") ? "out" : "cooked");
  for (const event of events) {
    const last = event.endDate < end ? event.endDate : end;
    for (let date = event.startDate > start ? event.startDate : start; date <= last; date = nextDay(date)) days.set(date, "away");
  }
  const counts = { cooked: 0, out: 0, mix: 0, away: 0 };
  for (const kind of days.values()) counts[kind]++;
  const total = days.size;
  const actual = { cooked: counts.cooked + counts.mix / 2, out: counts.out + counts.mix / 2, away: counts.away };
  const dishCounts = new Map<string, number>();
  const byId = new Map(recipes.map(recipe => [recipe.id, recipe]));
  for (const meal of meals) {
    if (!inRange(meal.date) || (meal.setting && meal.setting !== "home") || days.get(meal.date) === "away") continue;
    for (const id of new Set(meal.dishes)) if (byId.has(id)) dishCounts.set(id, (dishCounts.get(id) || 0) + 1);
  }
  const dishes = [...dishCounts].map(([id, count]) => ({ recipe: byId.get(id)!, count })).sort((a, b) => b.count - a.count || a.recipe.name.localeCompare(b.recipe.name));
  const cuisineCounts = new Map<string, number>();
  for (const { recipe, count } of dishes) {
    const cuisine = recipe.cuisine.trim() || "Unspecified";
    cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) || 0) + count);
  }
  const cuisines = [...cuisineCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  let longestStreak = 0, streak = 0, previous = "";
  for (const [date, kind] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
    streak = kind === "cooked" || kind === "mix" ? (previous && nextDay(previous) === date ? streak : 0) + 1 : 0;
    longestStreak = Math.max(streak, longestStreak);
    previous = date;
  }
  return { days, counts, total, actual, dishes, cuisines, longestStreak };
}
