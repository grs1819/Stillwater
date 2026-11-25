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
