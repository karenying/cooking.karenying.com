import type { Meal, MealPart, Recipe } from "./data";
import { searchRecipes } from "./recipe-search.ts";

export function mealParts(meal: Meal): MealPart[] {
  const parts: MealPart[] = meal.content ? meal.content.filter((part) => part.type === "text" || meal.dishes.includes(part.id))
    : meal.dishes.flatMap((id): MealPart[] => [{ type: "recipe", id }, { type: "text", text: " " }]);
  if (!meal.content && meal.note) parts.push({ type: "text", text: meal.note });
  for (const id of meal.dishes) {
    if (!parts.some((part) => part.type === "recipe" && part.id === id)) parts.push({ type: "recipe", id });
  }
  return parts;
}

// Match the longest recipe-like phrase immediately before the caret. Unmatched
// prose stays a normal meal note and never produces an error or a forced chip.
export function findRecipeCompletion(text: string, recipes: Recipe[], selectedIds: string[]) {
  if (!text || /\s$/.test(text)) return null;
  const phrase = text.split(/[\n,;+:/]/).at(-1) || "";
  const offset = text.length - phrase.length;
  const words = [...phrase.matchAll(/\S+/g)].slice(-8);
  for (const word of words) {
    const query = phrase.slice(word.index);
    const matches = searchRecipes(recipes, query, selectedIds);
    if (matches.length) return { start: offset + word.index, text: query, matches };
  }
  return null;
}
