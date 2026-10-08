'use strict';
const raceDialog=$('race-dialog');let raceCloseTimer;
function openRaceDialog(raceId){
 const results=rows.filter(r=>r.race_id===raceId).sort((a,b)=>Number(isDQ(a))-Number(isDQ(b))||(isDQ(a)?a.pilot.localeCompare(b.pilot):a.position-b.position));
 if(!results.length)return;
 clearTimeout(raceCloseTimer);raceDialog.classList.remove('closing');
 const race=results[0],shade=results.find(r=>r.pilot==='Shade'),movement=computeLeagueChanges(rows).get(raceId)?.pilots,winner=results.find(r=>r.position===1);
 $('race-dialog-code').textContent=raceId+' / '+galacticDate(race.date);
 $('race-dialog-title').textContent=race.planet+' / '+(race.track||'Circuit uncharted');
 $('race-dialog-meta').textContent=race.tour+' · '+race.category;
 $('race-dialog-stats').innerHTML=`<div><span>RECORDED RACERS</span><strong>${results.length}</strong></div><div><span>WINNER</span><strong>${winner?esc(winner.pilot):'Not recorded'}</strong></div><div><span>TRACKED PILOT / SHADE</span><strong>${shade?positionLabel(shade):'Not recorded'}</strong></div>`;
 $('race-dialog-results').innerHTML=results.map(r=>`<tr class="${r.pilot==='Shade'?'self':''}"><td>${finishBadge(r)}</td><td>${esc(r.pilot)}${r.pilot==='Shade'?'<span class="you">TRACKED PILOT</span>':''}</td><td>${time(r.time_ms)}</td><td class="race-points">+${points(r.position)}</td><td class="race-league-change">${leagueChangeMarkup(movement?.get(r.pilot))}</td></tr>`).join('');
 if(!raceDialog.open)raceDialog.showModal();
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
