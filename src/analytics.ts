import type { AwayEvent, Meal, Recipe } from "./data";

export type MealKind = "cooked" | "out" | "figma" | "away";
export const mealKinds: { key: MealKind; label: string; color: string }[] = [
  { key: "cooked", label: "At home", color: "#dce8f5" },
  { key: "out", label: "Ate out", color: "#f4cdd2" },
  { key: "figma", label: "Figma", color: "#ece0fa" },
  { key: "away", label: "Away", color: "#d6e7eb" },
];
const nextDay = (key: string) => {
  const date = new Date(`${key}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export function cookingAnalytics(meals: Meal[], events: AwayEvent[], recipes: Recipe[], start: string, end: string) {
  const days = new Map<string, { home: boolean; away: boolean }>();
  const slots = new Map<string, Map<Meal["type"], Set<NonNullable<Meal["setting"]>>>>();
  const inRange = (date: string) => date >= start && date <= end;
  for (const meal of meals) {
    if (!inRange(meal.date)) continue;
    const day = slots.get(meal.date) || new Map();
    const settings = day.get(meal.type) || new Set();
    settings.add(meal.setting || "home");
    day.set(meal.type, settings);
    slots.set(meal.date, day);
    days.set(meal.date, { home: false, away: false });
  }
  for (const event of events) {
    const last = event.endDate < end ? event.endDate : end;
    for (let date = event.startDate > start ? event.startDate : start; date <= last; date = nextDay(date)) days.set(date, { home: false, away: true });
  }
  const counts = { cooked: 0, out: 0, figma: 0, away: 0 };
  let homeDays = 0;
  for (const [date, day] of days) {
    if (day.away) {
      counts.away += 2;
      continue;
    }
    for (const type of ["Lunch", "Dinner"] as const) {
      const settings = slots.get(date)?.get(type) || new Set(["home"]);
      // Multiple records in the same meal slot still represent one meal.
      for (const setting of settings) {
        counts[setting === "home" ? "cooked" : setting] += 1 / settings.size;
        if (setting === "home") day.home = true;
      }
    }
    if (day.home) homeDays++;
  }
  const total = days.size * 2;
  const vicMeals = new Set<string>();
  const dishCounts = new Map<string, number>();
  const byId = new Map(recipes.map(recipe => [recipe.id, recipe]));
  for (const meal of meals) {
    if (!inRange(meal.date) || (meal.setting && meal.setting !== "home") || days.get(meal.date)?.away) continue;
    if (meal.vicCooked) vicMeals.add(`${meal.date}-${meal.type}`);
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
  let streakStart = "";
  let longestStreakDates: { start: string; end: string } | null = null;
  for (const [date, day] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
    streak = day.home ? (previous && nextDay(previous) === date ? streak : 0) + 1 : 0;
    if (streak === 1) streakStart = date;
    if (streak > longestStreak) {
      longestStreak = streak;
      longestStreakDates = { start: streakStart, end: date };
    }
    previous = date;
  }
  return { days, counts, total, homeDays, vicCooked: vicMeals.size, dishes, cuisines, longestStreak, longestStreakDates };
}
