import test from 'node:test';
import assert from 'node:assert/strict';
import {applyOverlay,makeOverlay,fromCalendarMeal,fromAwayEvent} from '../src/calendar-catalogue.ts';
test('local overlays retain edits, additions and removals across a fresh server read',()=>{
 const remote=[{id:'a',note:'Server'},{id:'b',note:'Other'}];
 const next=[{id:'a',note:'Local edit'},{id:'new',note:'New'}];
 const changes=makeOverlay(remote,next);
 assert.deepEqual(applyOverlay(remote,changes),next);
 assert.deepEqual(applyOverlay([...remote,{id:'c',note:'New server meal'}],changes),[...next.slice(0,1),{id:'c',note:'New server meal'},next[1]]);
 assert.deepEqual(applyOverlay(remote,makeOverlay(remote,remote)),remote);
});
test('database calendar dates and ordered content retain their local-date shape',()=>{
 const row={id:'meal',date:'2025-03-09',type:'Lunch',setting:'out',dishes:[],note:'Restaurant',content:null};
 assert.equal(fromCalendarMeal(row).date,'2025-03-09');assert.equal(fromCalendarMeal(row).content,undefined);
 assert.deepEqual(fromAwayEvent({id:'away',title:'NYC',start_date:'2025-03-09',end_date:'2025-03-22',note:''}),{id:'away',title:'NYC',startDate:'2025-03-09',endDate:'2025-03-22',note:''});
});
