import test from 'node:test';
import assert from 'node:assert/strict';
import {fromRecipeRow,calendarRecipeCatalogue,recipeColumns} from '../src/recipe-catalogue.ts';

test('database rows retain ordered content, source and recipe-less dishes',()=>{
 const row={id:'menu-a2',name:'Rice',description:'',category:'Rice',cuisine:'Chinese',cuisine_inferred:true,original_source:'https://example.com',image:'',preparation_minutes:0,servings:'',favorite:false,ingredients:[],steps:[],note:''};
 const recipe=fromRecipeRow(row);
 assert.equal(recipe.originalSource,row.original_source);assert.equal(recipe.cuisineInferred,true);
 assert.deepEqual(recipe.ingredients,[]);assert.deepEqual(recipe.steps,[]);
 assert.ok(!recipeColumns.includes('source_provenance'));assert.ok(!recipeColumns.includes('review_notes'));
});
test('calendar aliases use current recipes while retaining legacy IDs and custom local dishes',()=>{
 const imported={id:'menu-g14',name:'Current chicken rice',ingredients:[],steps:[]};
 const legacy=[{id:'ginger-chicken-rice',name:'Old example'},{id:'local-custom',name:'My dish'}];
 const before=JSON.stringify(legacy);
 const combined=calendarRecipeCatalogue([imported],legacy);
 assert.equal(combined.find(r=>r.id==='ginger-chicken-rice').name,'Current chicken rice');
 assert.ok(combined.some(r=>r.id==='local-custom'));assert.equal(JSON.stringify(legacy),before);
 assert.equal(combined.filter(r=>r.id==='menu-g14').length,1);
});
