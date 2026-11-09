import test from 'node:test';
import assert from 'node:assert/strict';
import { searchRecipes, recipeIndexSearchRank } from '../src/recipe-search.ts';
import { recipes } from '../src/data.ts';
const names = query => searchRecipes(recipes, query).map(recipe => recipe.name);

test('recipe suggestions start at three characters and rank a name prefix first', () => {
  assert.deepEqual(names('ch'), []);
  assert.deepEqual(names('  '), []);
  assert.equal(names('chi')[0], 'Chicken cilantro wontons');
  assert.ok(names('chi').includes('Ginger chicken & rice'));
});
test('recipe suggestions tolerate missing letters and swapped adjacent letters', () => {
  assert.ok(names('chickn').includes('Ginger chicken & rice'));
  assert.ok(names('chikcen').includes('Chicken cilantro wontons'));
  assert.ok(names('cilantor').includes('Chicken cilantro wontons'));
  assert.deepEqual(names('zzzzqqq'), []);
});
test('recipe search supports partial and reordered words, accents and punctuation', () => {
  assert.equal(names('rice ginger')[0], 'Ginger chicken & rice');
  assert.equal(names('RED CUR')[0], 'Thai red curry');
  assert.equal(names('tomato egg')[0], 'Tomato & egg stir-fry');
  assert.equal(names('péstô')[0], 'Weeknight pesto pasta');
});
test('already selected dishes are excluded from suggestions without mutating recipes', () => {
  const before = JSON.stringify(recipes);
  const chicken = recipes.find(recipe => recipe.name === 'Chicken cilantro wontons');
  assert.ok(!searchRecipes(recipes, 'chi', [chicken.id]).some(recipe => recipe.id === chicken.id));
  assert.equal(JSON.stringify(recipes), before);
});

test('inline completion replaces only the recipe phrase, preserving surrounding prose', async () => {
  const { findRecipeCompletion } = await import('../src/meal-content.ts');
  const result = findRecipeCompletion('Dinner with friends: chickn', recipes, []);
  assert.equal(result.text, 'chickn');
  assert.equal('Dinner with friends: chickn'.slice(0, result.start), 'Dinner with friends: ');
  assert.ok(result.matches.some(recipe => recipe.name === 'Chicken cilantro wontons'));
  assert.equal(findRecipeCompletion('Dinner with friends', recipes, []), null);
  assert.equal(findRecipeCompletion('ch', recipes, []), null);
});
test('existing meals become editable chips and prose without changing saved order', async () => {
  const { mealParts } = await import('../src/meal-content.ts');
  const original = { id: 'meal', dishes: ['thai-red-curry'], note: 'With friends' };
  const initial = mealParts(original);
  assert.deepEqual(initial, [{ type: 'recipe', id: 'thai-red-curry' }, { type: 'text', text: ' ' }, { type: 'text', text: 'With friends' }]);
  const content = [{ type: 'text', text: 'With ' }, { type: 'recipe', id: 'thai-red-curry' }, { type: 'text', text: ' tonight' }];
  assert.deepEqual(mealParts({ ...original, content }), content);
  assert.deepEqual(mealParts({ ...original, dishes: [], content }), [content[0], content[2]]);
});

// Index ranking is separate from fuzzy meal-editor suggestions.
test('index title matches rank ahead of category and ingredient matches', () => {
  const dish = (name, category, items = []) => ({ name, category, cuisine: 'International', ingredients: [{name:'Ingredients',items}] });
  assert.equal(recipeIndexSearchRank(dish('Lamb meatballs', 'Beef & lamb'), 'lamb'), 0);
  assert.equal(recipeIndexSearchRank(dish('Braised lamb', 'Beef & lamb'), 'lamb'), 0);
  assert.equal(recipeIndexSearchRank(dish('Beef stew', 'Beef & lamb'), 'lamb'), 1);
  assert.equal(recipeIndexSearchRank(dish('Meatballs', 'Mains', ['Ground lamb']), 'lamb'), 1);
  assert.equal(recipeIndexSearchRank(dish('Tofu', 'Tofu & eggs'), 'lamb'), Infinity);
});
test('index ranking handles empty searches, case, accents and reordered title keywords', () => {
  const recipe = { name:'Lamb & mint meatballs', category:'Beef & lamb', cuisine:'Méditerranean', ingredients:[] };
  assert.equal(recipeIndexSearchRank(recipe, '   '), 0);
  assert.equal(recipeIndexSearchRank(recipe, '  MEATBALLS lamb '), 0);
  assert.equal(recipeIndexSearchRank(recipe, 'Mediterranean'), 1);
  assert.equal(recipeIndexSearchRank(recipe, 'lamb missing'), Infinity);
});
