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
 // In-world market commentary: venues are fictional businesses on established worlds.
 const WIRE_LINES={
  "routine": [
    "Winning tickets collect across the Outer Rim.",
    "Canto Bight’s private pools begin settling winning tickets.",
    "The Velvet Moon on Nar Shaddaa closes its wagers on this heat.",
    "Coruscant’s private stakes settle in the winner’s favor.",
    "Cantina credits and syndicate fortunes collect on the same winner.",
    "The Dust Crown pays out the winning tickets; rival stakes stay with the house."
  ],
  "survival": [
    "Survival desks reassessing exposure after the cutoff.",
    "The cutoff eats backing like a sarlacc. Surviving tickets stay in play.",
    "Survivor backing pays off. The eliminated pilots’ patrons absorb the loss.",
    "Canto Bight’s survival pools pay the successful stakes; rival backing takes the hit.",
    "The White Lantern on Ando Prime counts the cost of backing the eliminated field.",
    "Hutt-backed pools count the token losses. Their credits carry no extra lives."
  ],
  "upset": [
    "Big-name confidence, outsider payout. Rival backing gets an expensive correction.",
    "The league’s leading names carried the confidence. The outsider takes the payout.",
    "Nar Shaddaa’s private pools pay the outsider while rival stakes expire.",
    "Deep pockets, wrong pilot. The outsider takes the credits.",
    "Canto Bight’s high-stakes patrons absorb an unwelcome surprise.",
    "Outer Rim tickets on the outsider collect against the prevailing form."
  ],
  "surprise": [
    "A lower-ranked pilot reaches the podium and earns a second look from backers.",
    "Smart credits may look twice.",
    "A podium finish puts another name in contention for Coruscant’s private backing.",
    "The Three Engines has another podium contender to consider for the next market.",
    "An overlooked pilot delivers. The big-name backing gets no monopoly on the podium.",
    "Nar Shaddaa’s larger stakes have another contender to consider."
  ],
  "dominant": [
    "A decisive margin rewards the winning backing. Rival stakes bought little competition.",
    "Canto Bight’s rival pools pay for backing a challenge that never reached the winner.",
    "Large stakes, clear separation. The winning tickets needed no narrow escape.",
    "The gap gives repeat backing a case. Reputation alone will not close it.",
    "Outer Rim credits on the winner collect with room to spare.",
    "Serious backing, decisive pace. Rival money needs a stronger challenger."
  ],
  "close": [
    "The decimals decide the payout. Expensive confidence came within a fraction of failing.",
    "Winning wagers in Canto Bight clear on the narrowest of margins.",
    "The Velvet Moon settles a finish with little room between rival tickets.",
    "Large stakes turn on a small margin at the line.",
    "Outer Rim clients backing the runner-up miss collection by a fraction.",
    "A narrow win pays in full. The runner-up’s backers get no consolation return."
  ],
  "loss": [
    "A falling league position leaves continued backing harder to justify.",
    "Premium backing, bantha-grade returns. Rival pools note the slide.",
    "The slide weakens the case for another large stake on the same form.",
    "The slide gives rival backers in Canto Bight more to work with.",
    "The reputation drew backing. The latest result gives rivals grounds to challenge it.",
    "Longer-term backing at the Three Engines on Corellia rests on a weaker league position."
  ],
  "gain": [
    "The climb strengthens the case for backing the pilot over the remaining tour.",
    "Improving form gives Outer Rim backers a stronger case for the next stake.",
    "The climb puts another contender within reach of Coruscant’s high-stakes pools.",
    "Early backing gains ground. Rival credits have a bigger target to beat.",
    "The result puts a rising contender within reach of larger private stakes.",
    "Canto Bight’s private stakes have a rising contender to account for."
  ],
  "record": [
    "A record time, not a cantina boast. Backers have something measurable.",
    "The White Lantern on Ando Prime weighs the record against its next circuit price.",
    "Record pace gives the next wager a firmer basis than the pilot’s reputation.",
    "Corellian clients now have a faster benchmark to judge the field against.",
    "Private pools on Nar Shaddaa review the record before the next running.",
    "The circuit record gives rival backing a faster target—and less room for excuses."
  ],
  "streak": [
    "Repeat winning tickets collect again across the Outer Rim.",
    "Canto Bight’s private pools face another payout on the same pilot.",
    "More winning tickets. Another costly wait for backers financing the upset.",
    "Another win pays the loyal backers. Those financing the challenge lose again.",
    "The Dust Crown settles another victory for patrons who stayed with the pilot.",
    "The winning run keeps paying. Rival stakes keep finding the wrong challenger."
  ],
  "opening": [
    "The opening result gives fresh tour backing an immediate return.",
    "Canto Bight’s first-heat tickets settle in the winner’s favor.",
    "Opening stakes collect across the Outer Rim; the longer tour wagers remain in play.",
    "New tour, fresh stakes. Even old Imperial fortunes need current form.",
    "The first victory gives Coruscant’s larger pools an early contender to back.",
    "First-heat tickets collect at the Three Engines. Tour backing still has a long way to run."
  ],
  "earlyEnd": [
    "Longer-term tour wagers lose a contender before the final test.",
    "Canto Bight’s private pools absorb an early exit from the remaining tour.",
    "The campaign ends here. Its backers lose the chance to recover in later heats.",
    "Outer Rim credits following this campaign lose their contender for the remaining heats.",
    "At the Velvet Moon, backing for the departing pilot reaches an expensive conclusion.",
    "Earlier race payouts stand; wagers requiring a continued run take the loss."
  ],
  "setback": [
    "Yesterday’s credentials, today’s loss. Returning backers pay for the difference.",
    "Canto Bight’s returning backers pay for trusting last tour’s reputation.",
    "Last tour’s reputation buys no protection. Not even for Hutt money.",
    "Coruscant’s private stakes meet a weaker opening than last tour’s standing promised.",
    "Returning backing at the Dust Crown in Mos Espa gets a costly opening lesson.",
    "Earlier standing offers little protection for wagers on the new tour’s first heat."
  ],
  "leadership": [
    "The old advantage is gone. Rival backing has its opening.",
    "Canto Bight’s private clients reassess which contender deserves the larger stake.",
    "Coruscant’s private pools have a new leader—and credits still committed to the former leader.",
    "The new leader gives Outer Rim backing another claim on the remaining campaign.",
    "The change tests wagers built around the previous leader’s advantage.",
    "Nar Shaddaa’s rival pools weigh the new lead against credits committed to the old one."
  ],
  "visit": [
    "Planetary wagers settle; backing for the wider tour stays in play.",
    "Backers carry the planetary results into their assessment of the next venue.",
    "Another world behind the grid. Syndicate stakes follow the accumulated form.",
    "Outer Rim tour wagers continue; local stakes settle before the next jump.",
    "Off-world backing now has the full visit’s form to judge the next stake.",
    "Coruscant’s tour pools weigh the completed visit before committing to the next planet."
  ],
  "gauntlet": [
    "Final-clearance backing settles separately from the points already earned.",
    "At the White Lantern, progression tickets and final-clearance stakes face different returns.",
    "Confidence does not clear the Gauntlet. Progression and final-win stakes settle differently.",
    "Canto Bight’s Gauntlet patrons settle progression and clearance wagers.",
    "Nar Shaddaa’s private pools settle the round against each patron’s chosen target.",
    "Outer Rim progression wagers settle on the round reached; clearance tickets require the final win."
  ]
};
 Object.assign(WIRE_LINES,{"vehicleRare":["The less-used vehicle draws cautious opening stakes. Backers want proof before committing larger credits.","Canto Bight prices the unfamiliar choice carefully. Familiar winning form does not guarantee familiar handling.","A change of vehicle gives the private pools reason to hold some credits back.","Outer Rim backing tests the new choice with smaller stakes. The opening pace will do the selling."],"vehicleReturn":["The familiar vehicle returns. Backers have a longer record to put their credits behind.","Canto Bight’s repeat backing has its preferred machinery again.","A return to the established vehicle draws fresh stakes from patrons who backed the earlier runs.","Familiar machinery brings familiar money back to the pools."],"vehicleRareEnd":["The less-used vehicle leaves its cautious backers with little reason to raise their next stake.","An early exit gives the wary pools an expensive answer to the vehicle change.","The unfamiliar choice ends its run early. Credits held in reserve stay out of trouble.","Canto Bight’s cautious stakes fare better than the confidence behind this vehicle change."],"vehicleFavoredEnd":["Even the favored vehicle cannot protect a tour wager. Repeat backers absorb an unexpected early exit.","Familiar machinery, costly confidence. The private pools lose a campaign they had reason to trust.","An early exit catches the established vehicle’s repeat backing on the wrong side of settlement.","Outer Rim credits followed the familiar choice. Its record offers no refund today."]});
 Object.assign(WIRE_LINES,{sweep:[
 'Repeat stakes collect across the entire visit. Rival backing never finds its winning heat.',
 'Canto Bight’s opposition pools pay for every attempt to break the run.',
 'Outer Rim credits riding the same winner collect at every stop in this visit.',
 'One pilot takes the whole planetary run. Spreading stakes across rivals offers no winning ticket.',
 'The private pools settle a clean sweep. Every challenge leaves its backers on the losing side.',
 'Unbroken winning form rewards the loyal backing. Rival money pays for another failed challenge.'
 ]});
 Object.assign(WIRE_LINES,{streakEnd:[
 'Repeat backing finally takes a loss. The winning run offers no protection for this ticket.',
 'Canto Bight’s momentum stakes meet their first losing settlement of the run.',
 'Outer Rim credits chasing another victory stop collecting here.',
 'The streak ends; rival backing finally has a result to collect on.',
 'Loyal stakes rode the winning run. Today’s settlement belongs to the opposition.',
 'The private pools put a price on expecting one more win. This time, confidence pays nothing.'
 ]});
 const wireChoices=new Map();let wireHistory=new Map(),wireChanges=new Map(),wireEvents=new Map();
 function reaction(kind,heat){const key=heat.race_id+':'+kind;if(!wireChoices.has(key))wireChoices.set(key,Math.floor(Math.random()*WIRE_LINES[kind].length));return WIRE_LINES[kind][wireChoices.get(key)];}
 // Require a substantial absolute AND relative margin; no invented gap for partial grids.
 function dominantMargin(winner,runnerUp){
  if(!winner||!runnerUp||isDQ(winner)||isDQ(runnerUp)||winner.category!=='Race')return false;
  if(!Number.isFinite(winner.time_ms)||!Number.isFinite(runnerUp.time_ms)||winner.time_ms<=0)return false;
  const gap=runnerUp.time_ms-winner.time_ms;
  return gap>=5000&&gap/winner.time_ms>=.04;
 }
 function heatReport(heat){
  const ordered=[...heat.results].sort(resultOrder),winner=ordered.find(r=>r.position===1&&!isDQ(r)),shade=ordered.find(r=>r.pilot==='Shade'),eliminated=ordered.filter(isEliminated).length,prior=wireHistory.get(heat.race_id)||[],movement=wireChanges.get(heat.race_id)?.pilots;
  if(heat.category==='Galactic Gauntlet'){
   if(shade&&isEliminated(shade)){
    const standings=new Map();
    for(const event of [...prior,heat].filter(h=>h.tour===heat.tour))for(const result of event.results){if(!standings.has(result.pilot))standings.set(result.pilot,newPilotStats(result.pilot));addResult(standings.get(result.pilot),result);}
    const leaders=[...standings.values()].filter(isLeaguePilot).sort(compareStandings),rank=leaders.findIndex(p=>p.pilot==='Shade')+1;
    return `Shade knocked out in Gauntlet round ${shade.phase} at ${heat.track||heat.planet}. ${heat.tour} ends: P${rank}, ${standings.get('Shade').points} points. ${reaction('gauntlet',heat)}`;
   }
   return `${heat.planet}: ${shade?'Shade reached phase '+shade.phase+' · '+resultStatus(shade):'Galactic Gauntlet settlement pending official confirmation'}. ${reaction('gauntlet',heat)}`;
  }
  if(!winner)return shade?`${shade.pilot}: ${positionLabel(shade)} at ${heat.track||heat.planet}. ${isEliminated(shade)?reaction('survival',heat):'House of Nix holds winner settlement pending official confirmation.'}`:`${heat.track||heat.planet}: winner settlement pending official confirmation.`;
  const runnerUp=ordered.find(r=>r.position===2&&!isDQ(r)),margin=runnerUp&&Number.isFinite(winner.time_ms)&&Number.isFinite(runnerUp.time_ms)?Math.abs(runnerUp.time_ms-winner.time_ms)/1000:null;
  let report=`${winner.pilot} wins at ${heat.track||heat.planet}`;
  if(heat.category==='Eliminator')report+=` · ${eliminated} eliminated. ${reaction('survival',heat)}`;
  else report+=margin!==null?` · ${margin.toFixed(2)}s ahead of ${runnerUp.pilot}.`:'.';
  const winnerMove=movement?.get(winner.pilot),drop=[...(movement||[])].filter(([,m])=>!m.incomplete&&m.delta<=-2).sort((a,b)=>(a[0]==='Shade'?-1:b[0]==='Shade'?1:a[1].delta-b[1].delta))[0];
  const oldTimes=prior.filter(h=>trackKey(h)===trackKey(heat)).flatMap(h=>h.results).filter(r=>!isDQ(r)&&Number.isFinite(r.time_ms)&&r.time_ms>0);
  let kind='routine';
  if(winnerMove?.before>=7)kind='upset';else if(margin!==null&&margin<=.5)kind='close';
  const dominant=dominantMargin(winner,runnerUp);
  if(dominant&&kind==='routine')kind='dominant';
  if(shade&&winner.pilot!=='Shade')report+=' Shade: '+positionLabel(shade)+'.';
  if(heat.category!=='Eliminator'||kind!=='routine')report+=' '+reaction(kind,heat);
  if(dominant&&kind!=='dominant')report+=`\u001e${winner.pilot} wins decisively at ${heat.track||heat.planet}, ${(100*(runnerUp.time_ms-winner.time_ms)/winner.time_ms).toFixed(1)}% clear of P2. ${reaction('dominant',heat)}`;
  const recordEligible=heat.track&&heat.direction&&(heat.category==='Eliminator'||heat.subcategory);
  const fastest=recordEligible?ordered.filter(r=>!isDQ(r)&&Number.isFinite(r.time_ms)&&r.time_ms>0).sort((a,b)=>a.time_ms-b.time_ms)[0]:null;
  const previousRecord=oldTimes.length?oldTimes.reduce((best,r)=>r.time_ms<best.time_ms?r:best):null;
  if(fastest&&previousRecord&&fastest.time_ms<previousRecord.time_ms){
   const configuration=[directionLabel(heat),heat.category,heat.subcategory,heat.laps?heat.laps+' laps':''].filter(Boolean).join(' · ');
   report+=`\u001e${heat.track} (${configuration}): ${fastest.pilot} sets ${time(fastest.time_ms)}, ${((previousRecord.time_ms-fastest.time_ms)/1000).toFixed(3)}s faster than ${previousRecord.pilot}’s record. ${reaction('record',heat)}`;
  }
  const surprise=ordered.find(r=>[2,3].includes(r.position)&&!isDQ(r)&&movement?.get(r.pilot)?.before>=7);
  if(surprise){const before=movement.get(surprise.pilot).before;report+=`\u001e${surprise.pilot}: surprise P${surprise.position}, from overall league P${before}. ${reaction('surprise',heat)}`;}
  if(drop){const [pilot,m]=drop;report+=`\u001e${pilot} loses ${-m.delta} league places: P${m.before} → P${m.after}. ${reaction('loss',heat)}`;}
  else if(winnerMove?.delta>=2)report+=`\u001e${winner.pilot} climbs ${winnerMove.delta} league places to P${winnerMove.after}. ${reaction('gain',heat)}`;

  return report;
 }
 function vehicleProfile(heat,pilot,prior){
  const current=heat.results.find(r=>r.pilot===pilot)?.vehicle;
  if(!current)return null;
  const starts=new Map();
  for(const h of prior){const r=h.results.find(r=>r.pilot===pilot&&r.vehicle);if(r&&!starts.has(h.tour))starts.set(h.tour,r.vehicle);}
  const counts=new Map(VEHICLES.map(v=>[v,0]));for(const v of starts.values())counts.set(v,(counts.get(v)||0)+1);
  if(!starts.size)return null;
  const values=[...counts.values()],count=counts.get(current),max=Math.max(...values),min=Math.min(...values);
  const favored=count===max&&[...counts.values()].filter(n=>n===max).length===1;
  const rare=count===min&&count<max;
  return {current,previous:[...starts.values()].at(-1),rare,favored};
 }
 function occasionalVehicle(kind,heat){const key=heat.race_id+':'+kind+':include';if(!wireChoices.has(key))wireChoices.set(key,Math.random()<.5);return wireChoices.get(key);}
 function buildWireEvents(heats){
  const events=new Map(),overall=new Map(),tours=new Map(),priorHeats=[],streaks=new Map();let visit=null;
  const add=(stats,results)=>{for(const r of results){if(!stats.has(r.pilot))stats.set(r.pilot,newPilotStats(r.pilot));addResult(stats.get(r.pilot),r);}};
  const leader=stats=>[...stats.values()].filter(isLeaguePilot).sort(compareStandings)[0];
  const closeVisit=reports=>{
   const best=leader(visit.stats);
   if(best&&best.points>0)reports.push({kind:'visit',text:visit.planet+' visit closed · '+visit.tour+': '+best.pilot+' led the visit with '+best.points+' points from '+visit.heats+' heat'+(visit.heats===1?'':'s')+'.'});
   if(visit.heats>=2&&visit.winners.every(p=>p&&p===visit.winners[0]))reports.push({kind:'sweep',text:visit.winners[0]+' sweeps '+visit.planet+' in '+visit.tour+' · '+visit.heats+' wins from '+visit.heats+' heats.'});
  };
  for(const heat of heats){
   const reports=[];
   // A visit is a consecutive run on one planet within one tour, not every
   // appearance of that planet merged across the archive.
   if(visit&&(visit.planet!==heat.planet||visit.tour!==heat.tour)){
    closeVisit(reports);
    visit=null;
   }
   if(!visit)visit={planet:heat.planet,tour:heat.tour,stats:new Map(),heats:0,winners:[]};
   const opening=!tours.has(heat.tour),previousTour=[...tours.values()].at(-1);
   if(opening)tours.set(heat.tour,new Map());
   const tour=tours.get(heat.tour),beforeOverall=leader(overall),beforeTour=leader(tour);
   // Copy names before updating the accumulated statistics.
   const oldOverall=beforeOverall?.pilot,oldTour=beforeTour?.pilot;
   add(overall,heat.results);add(tour,heat.results);add(visit.stats,heat.results);visit.heats++;visit.winners.push(heat.results.find(r=>r.position===1&&!isDQ(r))?.pilot||null);
   const afterOverall=leader(overall),afterTour=leader(tour);
   const incomplete=heat.results.every(r=>r.category!=='Galactic Gauntlet'&&isDQ(r)&&!Number.isInteger(r.position));
   if(!incomplete){
    if(opening&&heat.category!=='Galactic Gauntlet'){
     const winner=heat.results.find(r=>r.position===1&&!isDQ(r));
     if(winner)reports.push({kind:'opening',text:winner.pilot+' makes a strong start to '+heat.tour+' with an opening victory at '+(heat.track||heat.planet)+'.'});
     const previousLeaders=previousTour?[...previousTour.values()].filter(isLeaguePilot).sort(compareStandings):[];
     const contenders=new Map(previousLeaders.slice(0,4).map((p,i)=>[p.pilot,i+1]));
     const disappointing=heat.results.filter(r=>contenders.has(r.pilot)&&(isDQ(r)||(Number.isInteger(r.position)&&r.position>=8))).sort((a,b)=>contenders.get(a.pilot)-contenders.get(b.pilot))[0];
     if(disappointing)reports.push({kind:'setback',text:disappointing.pilot+' opens '+heat.tour+' below the previous campaign’s form: '+positionLabel(disappointing)+' at '+(heat.track||heat.planet)+', after finishing P'+contenders.get(disappointing.pilot)+' in the previous tour.'});
    }
    if(oldTour&&afterTour?.pilot!==oldTour)reports.push({kind:'leadership',text:heat.tour+' lead changes hands: '+afterTour.pilot+' takes P1 from '+oldTour+' · '+afterTour.points+' points.'});
    if(oldOverall&&afterOverall?.pilot!==oldOverall)reports.push({kind:'leadership',text:'Overall league lead changes hands: '+afterOverall.pilot+' takes P1 from '+oldOverall+' · '+afterOverall.points+' points across all tours.'});
   }
   if(opening)for(const r of heat.results.filter(r=>r.vehicle)){
    const profile=vehicleProfile(heat,r.pilot,priorHeats);
    if(profile&&profile.current!==profile.previous){const kind=profile.rare?'vehicleRare':profile.favored?'vehicleReturn':null;if(kind&&occasionalVehicle(kind,heat))reports.push({kind,text:r.pilot+' starts '+heat.tour+' in the '+profile.current+'.'});}
   }
   for(const r of heat.results){
    const count=streaks.get(r.pilot)||0;
    const won=r.category!=='Galactic Gauntlet'&&r.position===1&&!isDQ(r);
    if(won){const next=count+1;streaks.set(r.pilot,next);if(next>=4)reports.push({kind:'streak',text:r.pilot+' extends the winning streak to '+next+' consecutive victories at '+(heat.track||heat.planet)+'.'});}
    else if(Number.isInteger(r.position)||isDQ(r)||r.category==='Galactic Gauntlet'){
     if(count>=4)reports.push({kind:'streakEnd',text:r.pilot+'’s '+count+'-win streak ends at '+(heat.track||heat.planet)+' · '+positionLabel(r)+'.'});
     streaks.set(r.pilot,0);
    }
   }
   const ended=(window.TOUR_EVENTS||[]).some(e=>e.outcome==='EARLY_END'&&e.race_id===heat.race_id&&e.tour===heat.tour&&e.planet===heat.planet&&e.track===heat.track&&e.category===heat.category&&e.direction===heat.direction&&heat.results.some(r=>r.pilot===e.pilot&&r.position===e.position&&(isEliminated(r)||isDNF(r))));
   if(ended){closeVisit(reports);visit=null;}
   events.set(heat.race_id,reports);priorHeats.push(heat);
  }
  return events;
 }
 function wireItems(heat){
  const events=wireEvents.get(heat.race_id)||[];
  const ending=(window.TOUR_EVENTS||[]).find(event=>event.outcome==='EARLY_END'&&event.race_id===heat.race_id&&event.tour===heat.tour&&event.planet===heat.planet&&event.track===heat.track&&event.category===heat.category&&event.direction===heat.direction&&heat.results.some(r=>r.pilot===event.pilot&&r.position===event.position&&(isEliminated(r)||isDNF(r))));
  const priorTour=(wireHistory.get(heat.race_id)||[]).filter(h=>h.tour===heat.tour),priorStats=new Map();
  if(ending)for(const event of priorTour)for(const r of event.results){if(!priorStats.has(r.pilot))priorStats.set(r.pilot,newPilotStats(r.pilot));addResult(priorStats.get(r.pilot),r);}
  const priorLeader=[...priorStats.values()].filter(isLeaguePilot).sort(compareStandings)[0];
  const momentum=ending&&priorLeader?.pilot===ending.pilot&&priorTour.some(h=>h.results.some(r=>r.pilot===ending.pilot&&r.position===1&&!isDQ(r)))?' Backers riding the tour leader’s winning form take a costly hit.':'';
  const report=ending?`${ending.pilot} ${ending.position==='DNF'?'does not finish':'eliminated at P'+ending.position} at ${heat.track} · ${heat.planet}. ${heat.tour} ends early.${momentum} ${reaction('earlyEnd',heat)}`:heatReport(heat);
  const profile=ending?vehicleProfile(heat,ending.pilot,(wireHistory.get(heat.race_id)||[]).filter(h=>h.tour!==heat.tour)):null;
  const vehicleKind=profile?.rare?'vehicleRareEnd':profile?.favored?'vehicleFavoredEnd':null;
  const vehicleReport=vehicleKind&&occasionalVehicle(vehicleKind,heat)?[ending.pilot+' exits '+heat.tour+' in the '+profile.current+'. '+reaction(vehicleKind,heat)]:[];
  return [...vehicleReport,...report.split('\u001e').map(text=>text.trim()).filter(Boolean),...events.map(event=>event.text+' '+reaction(event.kind,heat))];
 }
 function wire(heat){return wireItems(heat).join(' ');}
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
  const allHeats=groupRaceResults(rows);wireEvents=buildWireEvents(allHeats);wireChanges=computeLeagueChanges(rows);wireHistory=new Map(allHeats.map((h,i)=>[h.race_id,allHeats.slice(0,i)]));
  const previous=markets[index]?trackKey(markets[index]):null;
  const recent=groupRaceResults(rows).slice(-4).reverse(),configurations=new Map();
  for(const heat of groupRaceResults($('track').value?filtered():rows).reverse()){
   if(!heat.track)continue;
   const key=trackKey(heat);if(!configurations.has(key))configurations.set(key,heat);
  }
  markets=[...configurations.values()];
  index=Math.max(0,markets.findIndex(heat=>trackKey(heat)===previous));
  $('exchange-page').title=$('track').value?'Track filter active · automatic market rotation paused':'Automatic market rotation';
  const chatter=recent.flatMap(heat=>wireItems(heat).map(report=>`<div class="wire-item"><span>${esc(heat.race_id)} · ${esc(heat.tour)}</span><p>${esc(report)}</p></div>`)).join('')||'<div class="wire-item"><p>Awaiting the first recorded heat.</p></div>';
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