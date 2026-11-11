import type { Meal, Recipe } from "./data";

export const recipeColumns = "id,name,description,category,cuisine,cuisine_inferred,original_source,image,preparation_minutes,servings,favorite,ingredients,steps,note";
export type RecipeRow = {
  id: string; name: string; description: string; category: string; cuisine: string;
  cuisine_inferred: boolean; original_source: string | null; image: string;
  preparation_minutes: number; servings: string; favorite: boolean;
  ingredients: Recipe["ingredients"]; steps: Recipe["steps"]; note: string;
};
export function fromRecipeRow(row: RecipeRow): Recipe {
  return { id: row.id, name: row.name, description: row.description, category: row.category,
    cuisine: row.cuisine, cuisineInferred: row.cuisine_inferred, originalSource: row.original_source || "",
    image: row.image, time: row.preparation_minutes, servings: row.servings, favorite: row.favorite,
    ingredients: row.ingredients, steps: row.steps, note: row.note };
}

// Keep existing local calendar links usable; no meal IDs or browser records are rewritten.
export const legacyRecipeIds: Record<string, string> = {
  "ginger-chicken-rice": "menu-g14", "thai-red-curry": "menu-i14", "lamb-meatballs": "menu-f10",
  "pesto-pasta": "menu-b3", "cilantro-wontons": "menu-j5", "tomato-eggs": "menu-c7",
};
// Resolve old links directly, without adding sample recipes or duplicate aliases.
export function resolveMealRecipeIds(meal: Meal): Meal {
  const resolve = (id: string) => legacyRecipeIds[id] || id;
  return { ...meal, dishes: [...new Set(meal.dishes.map(resolve))],
    content: meal.content?.map(part => part.type === "recipe" ? { ...part, id: resolve(part.id) } : part) };
}

export function toRecipeRow(recipe: Recipe): Omit<RecipeRow, never> {
  return { id: recipe.id, name: recipe.name, description: recipe.description, category: recipe.category,
    cuisine: recipe.cuisine, cuisine_inferred: recipe.cuisineInferred || false, original_source: recipe.originalSource || null,
    image: recipe.image, preparation_minutes: recipe.time, servings: recipe.servings, favorite: recipe.favorite,
    ingredients: recipe.ingredients, steps: recipe.steps, note: recipe.note };
}
