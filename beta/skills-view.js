import {SKILL_DEFINITIONS,SKILL_UNLOCKS,XP_REWARDS,skillStatus,unlocked} from './skills.js';
const paths={cultivation:'M12 21V11M12 15C4 15 3 10 3 5c6 0 9 3 9 7m0-2c0-5 3-7 9-7 0 6-3 10-9 10',construction:'m5 21 9-11m-4-5 4-3 7 6-3 4-4-2-3-3Z',hospitality:'M5 6h12v8a6 6 0 0 1-12 0Zm12 2h2a3 3 0 0 1 0 6h-2M4 22h14',conservation:'M12 21c-9-3-9-11-9-16l9-3 9 3c0 5 0 13-9 16Zm-4-8 3 3 6-7'};
export function createSkillsView(container){
 const rows=new Map();
 for(const [id,definition]of Object.entries(SKILL_DEFINITIONS)){
  const card=document.createElement('article');card.className='skill-card';card.dataset.skill=id;
  card.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[id]}"/></svg><div class="skill-body"><div class="skill-title"><strong>${definition.name}</strong><span class="skill-level"></span></div><progress max="1" value="0" aria-label="${definition.name} level progress"></progress><p class="skill-xp"></p><p class="skill-source"></p></div>`;
  rows.set(id,card);container.append(card);
 }
 return {update(state){for(const [id,card]of rows){const status=skillStatus(state.xp[id]);card.querySelector('.skill-level').textContent=`Level ${status.level}`;const bar=card.querySelector('progress');bar.value=status.progress;bar.setAttribute('aria-valuetext',status.next===null?'Level cap reached':`${status.remaining} XP to level ${status.level+1}`);card.querySelector('.skill-xp').textContent=`${status.xp.toLocaleString()} XP · ${status.next===null?'Level cap reached':`${status.remaining.toLocaleString()} to level ${status.level+1}`}`;card.querySelector('.skill-source').textContent=id==='cultivation'?`+${XP_REWARDS.treeExpansion} XP per new tree-count record`:id==='construction'?`New building +${XP_REWARDS.buildingCompletion} · upgrade +${XP_REWARDS.buildingUpgrade} XP`:id==='hospitality'?`+${XP_REWARDS.guestHosted} XP per guest · +${XP_REWARDS.customerServed} per customer / payout`:'Habitat activities coming later';}
  return SKILL_UNLOCKS.map(u=>`${unlocked(state,u.id)?'Unlocked':SKILL_DEFINITIONS[u.skill].name+' level '+u.level}: ${u.name}${u.kind==='exterior'?' blueprint finish':''}`).join(' · ');
 }};
}
