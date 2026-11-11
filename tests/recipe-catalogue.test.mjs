import test from 'node:test';
import assert from 'node:assert/strict';
import {fromRecipeRow,resolveMealRecipeIds,recipeColumns} from '../src/recipe-catalogue.ts';

test('database rows retain ordered content, source and recipe-less dishes',()=>{
 const row={id:'menu-a2',name:'Rice',description:'',category:'Rice',cuisine:'Chinese',cuisine_inferred:true,original_source:'https://example.com',image:'',preparation_minutes:0,servings:'',favorite:false,ingredients:[],steps:[],note:''};
 const recipe=fromRecipeRow(row);
 assert.equal(recipe.originalSource,row.original_source);assert.equal(recipe.cuisineInferred,true);
 assert.deepEqual(recipe.ingredients,[]);assert.deepEqual(recipe.steps,[]);
 assert.ok(!recipeColumns.includes('source_provenance'));assert.ok(!recipeColumns.includes('review_notes'));
});
test('old calendar links resolve to real recipes without sample records',()=>{
 const meal={id:'meal',dishes:['lamb-meatballs','menu-f10','custom'],note:'With friends',
   content:[{type:'text',text:'Dinner: '},{type:'recipe',id:'lamb-meatballs'},{type:'recipe',id:'custom'}]};
 const before=JSON.stringify(meal);
 const resolved=resolveMealRecipeIds(meal);
 assert.deepEqual(resolved.dishes,['menu-f10','custom']);
 assert.equal(resolved.content[1].id,'menu-f10');
 assert.equal(resolved.content[2].id,'custom');
 assert.equal(resolved.note,meal.note);
 assert.equal(JSON.stringify(meal),before);
});

test('real lamb recipe appears once and is excluded when an old linked meal is edited', async()=>{
 const { searchRecipes } = await import('../src/recipe-search.ts');
 const recipes=[{id:'menu-f10',name:'lamb meatballs'},{id:'menu-f12',name:'lamb stew (?)'}];
 assert.deepEqual(searchRecipes(recipes,'lamb').map(r=>r.id),['menu-f10','menu-f12']);
 const meal=resolveMealRecipeIds({id:'meal',dishes:['lamb-meatballs'],note:''});
 assert.deepEqual(searchRecipes(recipes,'lamb',meal.dishes).map(r=>r.id),['menu-f12']);
});
