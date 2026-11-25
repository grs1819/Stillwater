import test from 'node:test';import assert from 'node:assert/strict';
import {cabinAt,emptyWorld,withCabinAddition as add,additionQuote,footprint,validateWorld,placementError} from '../blueprints.js';
import {businessTier,upgradeBusiness,upgradeQuote,businessSummary} from '../businesses.js';
import {initialSkills,developmentXP} from '../skills.js';
const skills={...initialSkills(),xp:{...initialSkills().xp,hospitality:1000}};
test('second story absorbs loft purchase and preserves two extra beds beyond loft',()=>{
 const b=cabinAt(0,0),loft=add(b,'loft'),story=add(b,'secondStory');assert.equal(additionQuote(b,'secondStory').cost,650);assert.equal(additionQuote(loft,'secondStory').cost,400);assert.equal(story.gameplay.loft,true);assert.equal(businessTier(story).capacity,businessTier(loft).capacity+2);assert.equal(additionQuote(story,'loft').installed,true);
 let tier=upgradeBusiness(upgradeBusiness(b,skills),skills);assert.equal(additionQuote(tier,'secondStory').cost,400);assert.equal(businessTier(add(tier,'secondStory')).capacity,8);
});
test('premium suite requires upper accommodation and credits premium tier without double rate or XP',()=>{
 const b=cabinAt(0,0);assert.throws(()=>add(b,'premiumSuite'));let premium=add(add(b,'loft'),'premiumSuite');assert.equal(businessTier(premium).rate,1.5);
 premium=upgradeBusiness(upgradeBusiness(premium,skills),skills);assert.equal(upgradeQuote(premium).cost,0);const final=upgradeBusiness(premium,skills);assert.equal(businessTier(final).rate,1.5);assert.equal(additionQuote(final,'premiumSuite').installed,true);
 const w=b=>({...emptyWorld(),buildings:[b]});const xp=developmentXP(initialSkills(w(premium)),w(premium),w(final));assert.equal(xp.xp.construction,0);
});
test('terrace relocates behind guest wing, rejects obstruction, and saves all rotations',()=>{
 for(let rotation=0;rotation<4;rotation++){
 const base=cabinAt(0,0,rotation),terrace=add(base,'rearTerrace'),wing=add(terrace,'guestWing');assert.equal(footprint(terrace).length,8);assert.equal(footprint(wing).length,10);const [x,z]=footprint(wing).at(-1);
 assert.match(placementError(wing,{...emptyWorld(),blocks:{[`${x},0,${z}`]:{type:'tree'}}}),/Clear/);
 const full=add(add(add(wing,'secondStory'),'premiumSuite'),'frontPorch');assert.equal(full.id,base.id);assert.deepEqual(validateWorld({...emptyWorld(),buildings:[full]}).buildings,[full]);assert.equal(footprint(full).length,12);
 assert.equal(businessSummary({...emptyWorld(),buildings:[full]}).rows.length,1);
 }
});
test('new flags validate and rear terrace improves lodging appeal without an extra business',()=>{
 const b=cabinAt(0,0),w=b=>({...emptyWorld(),buildings:[b]});assert.equal(businessSummary(w(add(b,'rearTerrace'))).rows[0].quality,1);
 for(const key of ['secondStory','premiumSuite','rearTerrace'])assert.throws(()=>validateWorld(w({...b,gameplay:{[key]:'yes'}})));
 assert.throws(()=>validateWorld(w({...b,gameplay:{secondStory:true}})));
});
