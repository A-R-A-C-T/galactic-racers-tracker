'use strict';
const raceDialog=$('race-dialog');let raceCloseTimer;
function openRaceDialog(raceId){
 const results=rows.filter(r=>r.race_id===raceId).sort(resultOrder);
 if(!results.length)return;
 renderFilterSummaries();
 clearTimeout(raceCloseTimer);raceDialog.classList.remove('closing');
 const race=results[0],shade=results.find(r=>r.pilot==='Shade'),movement=computeLeagueChanges(filtered()).get(raceId)?.pilots,winner=results.find(r=>r.position===1&&!isDQ(r));
 raceDialog.classList.toggle('gauntlet',race.category==='Galactic Gauntlet');
 $('race-dialog-code').textContent=raceId+' / '+galacticDate(race.date);
 $('race-dialog-title').textContent=race.planet+' / '+(race.track||'Circuit uncharted')+(directionLabel(race)?' · '+directionLabel(race):'');
 $('race-dialog-meta').textContent=race.tour+' · '+race.category+(race.subcategory?' · '+race.subcategory:'')+(race.laps?' · '+race.laps+' lap'+(race.laps===1?'':'s'):'');
 $('race-dialog-stats').innerHTML=`<div><span>RECORDED RACERS</span><strong>${results.length}</strong></div><div><span>WINNER</span><strong>${winner?esc(winner.pilot):'Not recorded'}</strong></div><div><span>BACKED PILOT / SHADE</span><strong>${shade?positionLabel(shade):'Not recorded'}</strong></div>`;
 $('race-dialog-results').innerHTML=results.map(r=>`<tr class="${r.pilot==='Shade'?'self':''}"><td>${finishBadge(r)}</td><td>${esc(r.pilot)}${r.pilot==='Shade'?'<span class="you">BACKED PILOT</span>':''}${r.pilot==='Shade'&&r.vehicle?'<span class="race-pilot-vehicle">'+esc(r.vehicle)+'</span>':''}</td><td>${isDQ(r)?(isEliminated(r)?'Eliminated':resultStatus(r)):time(r.time_ms)}</td><td class="race-points">+${resultPoints(r)}</td><td class="race-league-change">${leagueChangeMarkup(movement?.get(r.pilot))}</td></tr>`).join('');
 if(!raceDialog.open){
  const root=document.documentElement;
  if(root?.style)root.style.setProperty('--dialog-scrollbar-width',Math.max(0,window.innerWidth-root.clientWidth)+'px');
  raceDialog.showModal();
 }
}
function closeRaceDialog(){
 if(!raceDialog.open||raceDialog.classList.contains('closing'))return;
 raceDialog.classList.add('closing');
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 raceCloseTimer=setTimeout(()=>{raceDialog.close();raceDialog.classList.remove('closing');},reduced?0:180);
}
$('archive').addEventListener('click',e=>{const row=e.target.closest?.('[data-race-id]');if(row)openRaceDialog(row.dataset.raceId);});
$('race-dialog-close').onclick=closeRaceDialog;
raceDialog.addEventListener('cancel',e=>{e.preventDefault();closeRaceDialog();});
raceDialog.addEventListener('click',e=>{
 if(e.target!==raceDialog)return;
 const box=raceDialog.getBoundingClientRect();
 if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)closeRaceDialog();
});

raceDialog.addEventListener('close',()=>document.documentElement?.style.removeProperty('--dialog-scrollbar-width'));
