import type { Recipe } from "../data";

export type Source = { id: string; label: string; url?: string; image?: string; text?: string };
export type ReviewItem = {
  id: string;
  recipe: Recipe;
  sources: Source[];
  questions: { id: string; text: string; resolution: string }[];
  status: "pending" | "approved" | "later";
  sourceChecked: boolean;
  /** Approved as-is by Karen in chat; does not claim an individual source check. */
  chatApproved?: boolean;
};
export type Batch = {
  version: 1;
  id: string;
  title: string;
  demo: boolean;
  items: ReviewItem[];
};
export const storageKey = "at-home-migration-review-v1";

export function safeUrl(value: string): boolean {
  try { return ["https:", "http:"].includes(new URL(value).protocol); }
  catch { return false; }
}
export function safeImage(value: string): boolean {
  return /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
}
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: Record<string, unknown>, keys: string[]) => keys.every(key => typeof v[key] === "string");
function recipeValid(v: unknown): v is Recipe {
  return object(v) && strings(v, ["id", "name", "description", "category", "cuisine", "image", "servings", "note"])
    && (v.cuisineInferred === undefined || typeof v.cuisineInferred === "boolean")
    && (v.originalSource === undefined || typeof v.originalSource === "string")
    && typeof v.time === "number" && Number.isFinite(v.time) && v.time >= 0 && typeof v.favorite === "boolean"
    && Array.isArray(v.ingredients) && v.ingredients.every(g => object(g) && typeof g.name === "string" && Array.isArray(g.items) && g.items.every(i => typeof i === "string"))
    && Array.isArray(v.steps) && v.steps.every(s => object(s) && strings(s, ["title", "text"]));
}
const unique = (items: { id: string }[]) => items.every(i => i.id.trim()) && new Set(items.map(i => i.id)).size === items.length;
export function parseBatch(input: unknown): Batch {
  if (!object(input) || input.version !== 1 || !strings(input, ["id", "title"]) || !String(input.id).trim()
    || typeof input.demo !== "boolean" || !Array.isArray(input.items) || input.items.length > 1000) {
    throw new Error("This isn’t a version 1 recipe review batch. See the format in migration-review.md.");
  }
  for (const item of input.items) {
    if (!object(item) || typeof item.id !== "string" || !recipeValid(item.recipe)
      || !["pending", "approved", "later"].includes(String(item.status)) || typeof item.sourceChecked !== "boolean"
      || (item.chatApproved !== undefined && typeof item.chatApproved !== "boolean")
      || !Array.isArray(item.sources) || !Array.isArray(item.questions)) throw new Error("A review item has missing or invalid fields.");
    if (!item.sources.every(s => object(s) && strings(s, ["id", "label"])
      && (s.url === undefined || (typeof s.url === "string" && safeUrl(s.url)))
      && (s.image === undefined || (typeof s.image === "string" && safeImage(s.image)))
      && (s.text === undefined || typeof s.text === "string"))) throw new Error("Sources need valid web links, text, or embedded PNG/JPEG/WebP/GIF images.");
    if (!item.questions.every(q => object(q) && strings(q, ["id", "text", "resolution"]))) throw new Error("Invalid review questions.");
    if (!unique(item.sources as Source[]) || !unique(item.questions as ReviewItem["questions"])) throw new Error("Source and question IDs must be unique within a recipe.");
    const typed = item as unknown as ReviewItem;
    // Upgrade older review backups from their retained source provenance.
    if (typed.recipe.originalSource === undefined) {
      typed.recipe.originalSource = typed.sources.find(s => s.id !== "menu-origin" && s.url)?.url || "";
    }
    if (typed.status === "approved" && !canApprove(typed)) throw new Error("An approved recipe has unresolved questions or an unchecked source.");
  }
  const batch = input as unknown as Batch;
  if (!unique(batch.items) || !unique(batch.items.map(i => i.recipe))) throw new Error("Recipe and review IDs must be nonempty and unique.");
  return batch;
}
export function canApprove(item: ReviewItem): boolean {
  return !!item.recipe.name.trim() && (!item.recipe.originalSource || safeUrl(item.recipe.originalSource)) && item.sources.some(s => s.url || s.image || s.text?.trim())
    && (item.chatApproved === true || (item.sourceChecked && item.questions.every(q => !!q.resolution.trim())));
}
export function exampleBatch(): Batch {
  return {
    version: 1, id: "demo-review", title: "Try the review workflow", demo: true,
    items: [{
      id: "demo-soup", status: "pending", sourceChecked: false,
      recipe: { id: "demo-soup", name: "Example tomato soup", description: "Illustrative draft for trying the review tool.",
        category: "Soups & stews", cuisine: "", image: "", time: 0, servings: "2", favorite: false,
        ingredients: [{ name: "Soup", items: ["2 tomatoes", "½ tsp salt"] }], steps: [], note: "" },
      sources: [{ id: "demo-source", label: "Illustrative source · not from your spreadsheet",
        text: "EXAMPLE ONLY\nTomato soup · serves 2\n2 tomatoes\n½ tsp salt\n\nThis mock source has no cooking instructions. Leave the method empty." }],
      questions: [{ id: "salt", text: "Example question: confirm the salt quantity against the source.", resolution: "" }],
    }],
  };
}

/** Merge the browser's current review copy without discarding edits or explicit deferrals. */
export function fullMigrationExport(batches: Batch[], current: Batch | null): Batch {
  const items = new Map(batches.flatMap(batch => batch.items.map(item => [item.id, item] as const)));
  for (const review of current?.demo ? [] : current?.items || []) {
    const prepared = items.get(review.id);
    if (!prepared) continue;
    const recoveredPepper = review.id === "menu-b9" && !review.recipe.ingredients.length && !review.recipe.steps.length;
    const recipe = recoveredPepper ? prepared.recipe : {
      ...review.recipe,
      originalSource: review.recipe.originalSource || prepared.recipe.originalSource,
      cuisine: review.recipe.cuisine || prepared.recipe.cuisine,
      cuisineInferred: review.recipe.cuisine ? review.recipe.cuisineInferred ?? false : prepared.recipe.cuisineInferred,
    };
    const sources = [...review.sources];
    for (const source of prepared.sources) if (!sources.some(s => s.id === source.id)) sources.push(source);
    items.set(review.id, { ...review, recipe, sources, questions: recoveredPepper ? prepared.questions : review.questions });
  }
  const approved = [...items.values()].filter(item => item.status !== "later").map(item => ({
    ...item, status: "approved" as const, chatApproved: true,
  }));
  return parseBatch({ version: 1, id: "menu-approved-all", title: "Approved Menu migration", demo: false, items: approved });
}
