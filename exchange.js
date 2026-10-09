/* Fictional backer-market flavor; recorded heats supply the paddock wire. */
'use strict';
(()=>{
 const panel=document.getElementById('wager-exchange');if(!panel)return;
 let index=0,tick=0,paused=false,timer=null,markets=[];
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const venues=[
  {name:'The Gilded Fathier',location:'Canto Bight · Cantonica'},
  {name:'Meridian Exchange House',location:'Coruscant'},
  {name:'The Velvet Moon',location:'Nar Shaddaa'},
  {name:'The Dust Crown',location:'Mos Espa · Tatooine'},
  {name:'Tibanna Club',location:'Cloud City · Bespin'},
  {name:'The Three Engines',location:'Corellia'},
  {name:'The White Lantern',location:'Ando Prime'},
  {name:'The Wreckers’ Rest',location:'Jakku'},
  {name:'Chandrilan Exchange House',location:'Chandrila'}
 ];
 let venueOffset=0;
 const quotes=venues.map((venue,i)=>({venue,value:45000+Math.random()*190000,change:(i===1?-1:1)*(1+Math.random()*8),history:Array.from({length:20},()=>.15+Math.random()*.7)}));
 let cycle=0,form=new Map(),trackForm=new Map();
 const trackKey=r=>JSON.stringify([r.planet,r.track,r.direction||'',r.category,r.subcategory||'',r.laps||'']);
 const OPEN_KEY='galactic-wagering-open-v1';
 let completedHeats=[];
 function buildForm(){completedHeats=groupRaceResults(rows).filter(h=>h.category!=='Galactic Gauntlet'&&h.results.some(r=>r.position===1&&!isDQ(r)));}
 function marketOdds(heat){
  if(heat.category==='Galactic Gauntlet')return [];
  const pilots=[...new Set(heat.results.map(r=>r.pilot))],latestTour=groupRaceResults(rows).at(-1)?.tour,uniform=1/pilots.length;
  const circuitHeats=completedHeats.filter(h=>trackKey(h)===trackKey(heat));
  const timed=circuitHeats.flatMap(h=>h.results).filter(r=>pilots.includes(r.pilot)&&!isDQ(r)&&Number.isFinite(r.time_ms)&&r.time_ms>0);
  const record=timed.length?Math.min(...timed.map(r=>r.time_ms)):null;
  const rates=pilots.map(pilot=>{
   const starts=completedHeats.filter(h=>h.results.some(r=>r.pilot===pilot));
   const win=h=>h.results.some(r=>r.pilot===pilot&&r.position===1&&!isDQ(r))?1:0;
   const overall=(starts.reduce((sum,h)=>sum+win(h),0)+uniform)/(starts.length+1);
   const tour=starts.filter(h=>h.tour===latestTour);let wins=0,weight=0;
   tour.forEach((h,i)=>{const w=Math.pow(.5,(tour.length-1-i)/6);wins+=win(h)*w;weight+=w;});
   const current=(wins+overall)/(weight+1);
   const circuit=starts.filter(h=>trackKey(h)===trackKey(heat));
   const track=(circuit.reduce((sum,h)=>sum+win(h),0)+3*current)/(circuit.length+3);
   const history=timed.filter(r=>r.pilot===pilot),oldest=history[0]?.time_ms,latest=history.at(-1)?.time_ms,best=history.length?Math.min(...history.map(r=>r.time_ms)):null;
   // Exact circuit pace and progression adjust the empirical win estimate.
   // Sparse timing history is tempered rather than treated as certainty.
   const confidence=history.length/(history.length+3);
   const pace=record&&latest?Math.exp(-10*((.65*latest+.35*best)/record-1)):1;
   const improvement=oldest&&latest?Math.max(.7,Math.min(1.4,Math.pow(oldest/latest,4))):1;
   const base=.25*overall+.55*current+.20*track;
   const timingFactor=1+confidence*(pace*improvement-1);
   return {pilot,strength:base*timingFactor,trackStarts:history.length,oldest,latest,best};
  });
  const total=rates.reduce((sum,p)=>sum+p.strength,0);
  // Five percentage points of overround spread across the entire book.
  return rates.map(p=>{const probability=p.strength/total;return {...p,probability,odds:1/(probability+.05/pilots.length)};}).sort((a,b)=>a.odds-b.odds||a.pilot.localeCompare(b.pilot));
 }
 const WIRE_LINES={
  routine:['Settlement desks balancing the books.','Outer Rim money follows the chequered flag.','Late tickets closed; the house settles.','Private booths reviewing the next grid.','Credit runners carrying the result across the lanes.','The house watches the next entry list.'],
  survival:['Survival desks reassessing exposure.','Token losses ripple through the private booths.','Survivors collect; eliminated tickets expire.','The cutoff leaves the betting floor divided.','Risk desks tightening their survival books.','Three places at the table; no mercy behind them.'],
  upset:['An outsider breaks the book.','Favorite tickets take a hit across the lanes.','Private desks caught on the wrong side of the finish.','The long shot sends the floor scrambling.','An unexpected winner forces a market rethink.','Quiet booths; expensive surprises.'],
  close:['Photo-finish nerves on the betting floor.','A narrow margin keeps both camps watching.','The book was settled by a heartbeat.','Little separates the contenders; plenty separates the payouts.','A tight finish sharpens interest in the rematch.','Private desks split over the next running.'],
  loss:['Backer confidence takes a hit.','Private desks cutting exposure after the slide.','A costly heat sends the standings south.','The floor reassesses a slipping contender.','Bad classification; worse news for the backers.','A league slide puts the next start under scrutiny.'],
  gain:['Fresh backing follows the climb.','A standings surge draws the private money.','The floor takes notice of a rising contender.','Credit desks warming to the upward move.','A good heat buys breathing room in the league.','New momentum reaches the betting lanes.'],
  record:['A new circuit mark turns heads on the floor.','Timing desks flag a fresh record.','The circuit benchmark moves; the book follows.','A faster reference time sharpens the next market.','Record pace brings fresh attention from the private booths.','The timing board gives the backers something to talk about.'],
  streak:['Repeat wins keep the favorite desks busy.','Another victory strengthens the winner’s hold.','The winning run keeps drawing short-price money.','The field still has a champion to catch.','A familiar name collects again.','The house watches a winning streak take shape.'],
  gauntlet:['Phase desks reviewing survivor exposure.','Progress counts; final clearance remains the prize.','The gauntlet keeps the private booths watching.','Phase tickets settle as the field thins.','Elimination signals travel fast across the lanes.','A staged survival test leaves the floor watching the next phase.']
 };
 const wireChoices=new Map();let wireHistory=new Map(),wireChanges=new Map();
 function reaction(kind,heat){const key=heat.race_id+':'+kind;if(!wireChoices.has(key))wireChoices.set(key,Math.floor(Math.random()*WIRE_LINES[kind].length));return WIRE_LINES[kind][wireChoices.get(key)];}
 function wire(heat){
  const ordered=[...heat.results].sort(resultOrder),winner=ordered.find(r=>r.position===1&&!isDQ(r)),shade=ordered.find(r=>r.pilot==='Shade'),eliminated=ordered.filter(isEliminated).length,prior=wireHistory.get(heat.race_id)||[],movement=wireChanges.get(heat.race_id)?.pilots;
  if(heat.category==='Galactic Gauntlet')return `${heat.planet}: ${shade?'Shade reached phase '+shade.phase+' · '+(isEliminated(shade)?'eliminated':resultStatus(shade)):'Gauntlet signal received'}. ${reaction('gauntlet',heat)}`;
  if(!winner)return `${heat.track||heat.planet}: partial classification received. Settlement desk awaiting complete telemetry.`;
  const runnerUp=ordered.find(r=>r.position===2&&!isDQ(r)),margin=runnerUp&&Number.isFinite(winner.time_ms)&&Number.isFinite(runnerUp.time_ms)?Math.abs(runnerUp.time_ms-winner.time_ms)/1000:null;
  let report=`${winner.pilot} wins at ${heat.track||heat.planet}`;
  if(heat.category==='Eliminator')report+=` · ${eliminated} eliminated. ${reaction('survival',heat)}`;
  else report+=margin!==null?` · ${margin.toFixed(2)}s ahead of ${runnerUp.pilot}.`:'.';
  const winnerMove=movement?.get(winner.pilot),drop=[...(movement||[])].filter(([,m])=>!m.incomplete&&m.delta<=-2).sort((a,b)=>(a[0]==='Shade'?-1:b[0]==='Shade'?1:a[1].delta-b[1].delta))[0];
  const oldTimes=prior.filter(h=>trackKey(h)===trackKey(heat)).flatMap(h=>h.results).filter(r=>!isDQ(r)&&Number.isFinite(r.time_ms)&&r.time_ms>0);
  const wins=prior.slice(-3).filter(h=>h.results.some(r=>r.pilot===winner.pilot&&r.position===1&&!isDQ(r))).length;
  let kind='routine';
  if(winnerMove?.before>=7)kind='upset';else if(oldTimes.length&&winner.time_ms>0&&winner.time_ms<Math.min(...oldTimes.map(r=>r.time_ms)))kind='record';else if(margin!==null&&margin<=.5)kind='close';else if(wins===3)kind='streak';
  if(heat.category!=='Eliminator'||kind!=='routine')report+=' '+reaction(kind,heat);
  if(drop){const [pilot,m]=drop;report+=` ${pilot} loses ${-m.delta} league places: P${m.before} → P${m.after}. ${reaction('loss',heat)}`;}
  else if(winnerMove?.delta>=2)report+=` ${winner.pilot} climbs ${winnerMove.delta} league places to P${winnerMove.after}. ${reaction('gain',heat)}`;
  else if(shade&&winner.pilot!=='Shade')report+=' Shade: '+positionLabel(shade)+'.';
  return report;
 }
 function quoteMarkup(){return Array.from({length:3},(_,i)=>quotes[(venueOffset+i)%quotes.length]).map(q=>{const up=q.change>=0,points=q.history.map((v,j)=>`${j*6},${45-v*40}`).join(' ');return `<div class="exchange-quote ${up?'quote-up':'quote-down'}"><div><strong>${esc(q.venue.name)}</strong><small class="quote-location">${esc(q.venue.location)}</small><span>${Math.round(q.value).toLocaleString('en-US')} <small>CR</small></span></div><svg viewBox="0 0 114 50" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"/></svg><b class="${up?'up':'down'}">${up?'▲':'▼'} ${up?'+':''}${q.change.toFixed(2)}%</b><small class="quote-caption">POOL VOLUME / SESSION MOVE</small></div>`;}).join('');}
 function updateQuotes(){venueOffset=(venueOffset+3)%quotes.length;for(const q of quotes){const move=(Math.random()-.5)*1.8;q.value=Math.max(1000,q.value*(1+move/100));q.change+=move;q.history.shift();q.history.push(Math.max(.08,Math.min(.92,q.history.at(-1)+move*.1)));}$('exchange-quotes').innerHTML=quoteMarkup();}
 function showMarket(){
  if($('pilot-portrait-preview')?.classList.contains('pilot-preview-market'))hidePilotPreview();
  const heat=markets[index];if(!heat){$('exchange-heat').textContent='Awaiting grid signals';$('exchange-format').textContent=$('track').value?'No recorded market matches the active filters.':'Record a heat to open the market feed.';$('exchange-odds').innerHTML='';$('exchange-page').textContent='0 / 0';return;}
  $('exchange-heat').textContent=heat.track||heat.planet;
  $('exchange-format').textContent=[heat.planet,directionLabel(heat)||'Direction unspecified',heat.category,heat.subcategory,heat.laps?heat.laps+' lap'+(heat.laps===1?'':'s'):''].filter(Boolean).join(' · ');
  const prices=marketOdds(heat),tracked=prices.find(r=>r.pilot===selectedPilot),candidates=prices.slice(0,3);
  if(tracked&&!candidates.includes(tracked))candidates.splice(2,1,tracked);
  candidates.sort((a,b)=>a.odds-b.odds);
  $('exchange-odds').innerHTML=candidates.map(r=>`<div class="exchange-odd"><span><button type="button" class="market-pilot-name" data-pilot="${esc(r.pilot)}">${esc(r.pilot)}</button>${r.pilot===selectedPilot?'<small>SELECTED</small>':r.pilot==='Shade'?'<small>BACKED</small>':''}<small class="market-rank">#${prices.indexOf(r)+1}</small></span><strong title="${(r.probability*100).toFixed(1)}% model win chance · 105% book${r.trackStarts?' · Track best '+time(r.best)+' · Oldest '+time(r.oldest)+' · Latest '+time(r.latest):' · No exact-track time history'}">${r.odds.toFixed(2)}<small>${(r.probability*100).toFixed(1)}% win chance</small></strong></div>`).join('')||'<p>Phase market · outright prices withheld</p>';
  $('exchange-page').textContent=`${index+1} / ${markets.length}`;
  $('exchange-odds').classList.remove('exchange-refresh');void $('exchange-odds').offsetWidth;$('exchange-odds').classList.add('exchange-refresh');
 }
 function refresh(){
  buildForm();
  const allHeats=groupRaceResults(rows);wireChanges=computeLeagueChanges(rows);wireHistory=new Map(allHeats.map((h,i)=>[h.race_id,allHeats.slice(0,i)]));
  const previous=markets[index]?trackKey(markets[index]):null;
  const recent=groupRaceResults(rows).slice(-4).reverse(),configurations=new Map();
  for(const heat of groupRaceResults($('track').value?filtered():rows).reverse()){
   if(!heat.track)continue;
   const key=trackKey(heat);if(!configurations.has(key))configurations.set(key,heat);
  }
  markets=[...configurations.values()];
  index=Math.max(0,markets.findIndex(heat=>trackKey(heat)===previous));
  $('exchange-page').title=$('track').value?'Track filter active · automatic market rotation paused':'Automatic market rotation';
  const chatter=recent.map(heat=>`<div class="wire-item"><span>${esc(heat.race_id)} · ${esc(heat.tour)}</span><p>${esc(wire(heat))}</p></div>`).join('')||'<div class="wire-item"><p>Awaiting the first recorded heat.</p></div>';
  $('exchange-chatter').innerHTML='<div class="wire-track"><div class="wire-copy">'+chatter+'</div><div class="wire-copy" aria-hidden="true">'+chatter+'</div></div>';
  $('exchange-quotes').innerHTML=quoteMarkup();showMarket();
 }
 function move(step){if(markets.length){index=(index+step+markets.length)%markets.length;showMarket();}}
 function schedule(){clearTimeout(timer);timer=null;if(panel.open&&!document.hidden&&!reduced.matches)timer=setTimeout(()=>{if(!paused){tick++;cycle++;if(cycle%2===0&&!$('track').value)move(1);updateQuotes();}schedule();},5000+Math.random()*2000);}
 const oddsPanel=$('exchange-odds');
 oddsPanel.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;const name=e.target.closest?.('.market-pilot-name');if(!name||name.contains(e.relatedTarget))return;hidePilotPreview();pilotPreviewTimer=setTimeout(()=>showPilotPreview(name),180);});
 oddsPanel.addEventListener('pointerout',e=>{const name=e.target.closest?.('.market-pilot-name');if(name&&!name.contains(e.relatedTarget))hidePilotPreview();});
 oddsPanel.addEventListener('focusin',e=>{const name=e.target.closest?.('.market-pilot-name');if(name){hidePilotPreview();showPilotPreview(name);}});
 oddsPanel.addEventListener('focusout',hidePilotPreview);
 $('exchange-prev').onclick=()=>move(-1);$('exchange-next').onclick=()=>move(1);
 $('exchange-pause').onclick=()=>{paused=!paused;panel.classList.toggle('market-paused',paused);$('exchange-pause').textContent=paused?'▷':'Ⅱ';$('exchange-pause').setAttribute('aria-label',paused?'Resume market rotation':'Pause market rotation');$('exchange-pause').setAttribute('aria-pressed',String(paused));};
 panel.addEventListener('toggle',()=>{try{localStorage.setItem(OPEN_KEY,String(panel.open));}catch{}if(panel.open)refresh();schedule();});document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',schedule);
 window.GalacticExchange={refresh};
 try{panel.open=localStorage.getItem(OPEN_KEY)==='true';}catch{}
 refresh();schedule();
})();