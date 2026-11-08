import type { Recipe } from "./data";

const normalize = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "")
  .toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Edit distance includes adjacent transpositions (e.g. “chikcen”).
function distance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

export function searchRecipes(recipes: Recipe[], query: string, selectedIds: string[] = []) {
  const term = normalize(query.slice(0, 100));
  if (term.replace(/\s/g, "").length < 3) return [];
  const tokens = term.split(/\s+/);
  const selected = new Set(selectedIds);
  return recipes.filter((recipe) => !selected.has(recipe.id)).map((recipe) => {
    const name = normalize(recipe.name);
    let score: number;
    if (name === term) score = 0;
    else if (name.startsWith(term)) score = 1;
    else if (name.includes(term)) score = 2;
    else {
      const words = name.split(/\s+/);
      score = 3;
      for (const token of tokens) {
        const best = Math.min(...words.map((word) => {
          if (word.startsWith(token)) return 0;
          // Short tokens must match exactly; longer tokens tolerate small typos.
          const edits = distance(token, word);
          return token.length >= 3 && edits <= (token.length >= 6 ? 2 : 1) ? edits + 1 : Infinity;
        }));
        score += best;
      }
    }
    return { recipe, score };
  }).filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => a.score - b.score || a.recipe.name.localeCompare(b.recipe.name))
    .slice(0, 6).map(({ recipe }) => recipe);
}
