import type { AwayEvent, Meal } from "./data";

// ISO local dates compare chronologically without UTC conversion or DST arithmetic.
export function awayOnDate(events: AwayEvent[], date: string) {
  return events.filter((event) => event.startDate <= date && date <= event.endDate);
}
export function mealSettingLabel(meal: Meal) {
  return meal.setting === "out" ? "Eating out" : meal.setting === "figma" ? "Figma" : "At home";
}
export function mealSettingClass(meal: Meal) {
  return meal.setting === "out" ? "eating-out" : meal.setting === "figma" ? "figma" : "at-home";
}
export function validDateRange(start: string, end: string) {
  const valid = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` === value;
  };
  return valid(start) && valid(end) && start <= end;
}
