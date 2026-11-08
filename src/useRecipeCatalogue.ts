import type { Recipe } from "./data";
import { fromRecipeRow, toRecipeRow, legacyRecipeIds, recipeColumns } from "./recipe-catalogue";
import { useCloudItems } from "./useCloudItems";
function initial() {
  try {
    const saved: Recipe[] = JSON.parse(localStorage.getItem("at-home-recipe-drafts-v1") || "null")
      || (JSON.parse(localStorage.getItem("at-home-recipes-v1") || "[]") as Recipe[]).filter(r => !legacyRecipeIds[r.id]);
    return { upserts: Object.fromEntries(saved.map(r => [r.id,r])), deleted: [] };
  } catch { return { upserts: {}, deleted: [] }; }
}
const config = { table: "recipes", columns: recipeColumns, decode: fromRecipeRow, encode: toRecipeRow, key: "at-home-recipe-cloud-drafts-v1", initial };
export function useRecipeCatalogue() {
  const state = useCloudItems<Recipe>(config);
  return { ...state, recipes: state.items, setRecipes: state.setItems };
}
