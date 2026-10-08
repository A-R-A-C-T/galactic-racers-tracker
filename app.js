/* Offline-first CSV racing archive. No build step or server required. */
'use strict';
const COLS=['race_id','date','tour','category','planet','track','pilot','position','time_ms','vehicle','status','subcategory'];
const VEHICLES=['Land speeder','Speeder bike','Skim speeder','Podracer'];
const PLANETS=['Jakku','Lantaana','Ando Prime','Sentinel One','Crait','Tatooine','Derven Akos'];
const POINTS=[12,11,10,9,8,7,6,5,4,3,2,1],KEY='galactic-racing-v2';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isDQ=r=>String(r.position).toUpperCase()==='DQ'||r.status==='DQ';
const points=p=>p==='DQ'?0:POINTS[p-1]||0;
const resultPoints=r=>isDQ(r)?0:points(r.position);
const resultOrder=(a,b)=>(Number.isInteger(a.position)?a.position:Infinity)-(Number.isInteger(b.position)?b.position:Infinity)||a.pilot.localeCompare(b.pilot);
const positionLabel=r=>isDQ(r)?(Number.isInteger(r.position)?'P'+r.position+' · DQ':'DQ'):'P'+r.position;
const finishBadge=r=>'<span class="finish '+(isDQ(r)?'dq':r.position<=3?'podium medal-'+r.position:'')+'">'+positionLabel(r)+'</span>';
const averageValue=p=>(p.finishes??p.races)?p.total/(p.finishes??p.races):Infinity;
const averageFinish=p=>Number.isFinite(averageValue(p))?averageValue(p).toFixed(2):'—';
const newPilotStats=pilot=>({pilot,races:0,finishes:0,dqs:0,wins:0,podiums:0,total:0,points:0});
function addResult(p,r){p.races++;p.points+=resultPoints(r);if(isDQ(r)){p.dqs++;return;}p.finishes++;p.wins+=r.position===1;p.podiums+=r.position<=3;p.total+=r.position;}
const compareStandings=(a,b)=>b.points-a.points||b.wins-a.wins||(averageValue(a)===averageValue(b)?0:averageValue(a)-averageValue(b))||a.pilot.localeCompare(b.pilot);
// Archive convention: Gregorian year - 2016, plus actual UTC day of year.
function galacticDate(date){const d=new Date(date+'T00:00:00Z');const year=d.getUTCFullYear();const day=Math.floor((d-Date.UTC(year,0,1))/86400000)+1;const era=year-2016;return Math.abs(era)+' '+(era>=0?'ABY':'BBY')+' · '+String(day).padStart(3,'0');}
const time=ms=>{if(ms===null||ms===undefined||ms==='')return '—';const n=Math.round(ms);return `${Math.floor(n/60000)}:${String(Math.floor(n/1000)%60).padStart(2,'0')}.${String(n%1000).padStart(3,'0')}`;};
let selectedPilot='Shade';
let rows=window.DEMO_RESULTS.map(r=>({...r})),page=0,ascending=false;
function validate(data){
 if(!data.length)throw Error('The CSV contains no results.');
 const events=new Map();
 data.forEach((r,i)=>{
  for(const c of COLS.filter(c=>!['vehicle','track','time_ms','status','subcategory'].includes(c)))if(r[c]===undefined||String(r[c]).trim()==='')throw Error(`Row ${i+2}: missing ${c}.`);
  for(const c of COLS)r[c]=String(r[c]??'').trim();
  if(r.category==='Sprint')r.category='Race';else if(r.category==='Circuit race')r.category='Eliminator';
  if(r.vehicle&&r.pilot!=='Shade')throw Error(`Row ${i+2}: vehicle is recorded only for Shade.`);
  if(r.vehicle&&!VEHICLES.includes(r.vehicle))throw Error(`Row ${i+2}: unknown vehicle type.`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date+'T00:00:00Z'))||new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)!==r.date)throw Error(`Row ${i+2}: use a valid YYYY-MM-DD date.`);
  r.status=r.status.toUpperCase();
  if(r.status&&!['DQ'].includes(r.status))throw Error(`Row ${i+2}: status must be blank or DQ.`);
  if(r.status==='DQ'&&r.category!=='Eliminator'&&r.position.toUpperCase()!=='DQ')throw Error(`Row ${i+2}: ranked DQ is supported only for Eliminator events.`);
  if(r.position.toUpperCase()==='DQ')r.position='DQ';
  else {if(!/^\d+$/.test(r.position)||!Number.isSafeInteger(Number(r.position))||Number(r.position)<1)throw Error(`Row ${i+2}: position must be a positive integer or DQ.`);r.position=Number(r.position);}
  if(r.time_ms===''&&isDQ(r))r.time_ms='';
  else {if(!/^\d+$/.test(r.time_ms)||!Number.isSafeInteger(Number(r.time_ms))||Number(r.time_ms)<1)throw Error(`Row ${i+2}: time_ms must be a positive integer, or blank for DQ.`);r.time_ms=Number(r.time_ms);}
  const meta=JSON.stringify([r.date,r.tour,r.category,r.planet,r.track,r.subcategory]);
  if(!events.has(r.race_id))events.set(r.race_id,{meta,pilots:new Set(),positions:new Set()});
  const e=events.get(r.race_id);
  if(e.meta!==meta)throw Error(`Row ${i+2}: inconsistent details for race ${r.race_id}.`);
  if(e.pilots.has(r.pilot)||(Number.isInteger(r.position)&&e.positions.has(r.position)))throw Error(`Row ${i+2}: duplicate pilot or finish position in ${r.race_id}.`);
  e.pilots.add(r.pilot);if(Number.isInteger(r.position))e.positions.add(r.position);
 });return data;
}
function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');let result=[],row=[],field='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;}
  else if(c==='"'){if(field||closed)throw Error('Malformed CSV quote.');quoted=true;}
  else if(c===','){row.push(field);field='';closed=false;}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))result.push(row);row=[];field='';closed=false;}
  else {if(closed)throw Error('Unexpected text after a quoted field.');field+=c;}
 }
 if(quoted)throw Error('Unclosed quoted field.');row.push(field);if(row.some(v=>v.trim()))result.push(row);
 const headers=(result.shift()||[]).map(v=>v.trim());
 if(new Set(headers).size!==headers.length||COLS.filter(c=>!['vehicle','track','status','subcategory'].includes(c)).some(c=>!headers.includes(c)))throw Error('Required headers: '+COLS.join(', '));
 return validate(result.map((cells,i)=>{if(cells.length!==headers.length)throw Error(`Row ${i+2}: incorrect number of columns.`);return Object.fromEntries(COLS.map(c=>[c,headers.includes(c)?cells[headers.indexOf(c)]:'']));}));
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(rows));return true;}catch{$('message').textContent='Loaded for this session. Browser storage unavailable; export CSV to keep your data.';return false;}}
try{const saved=localStorage.getItem(KEY);if(saved)rows=validate(JSON.parse(saved));}catch{$('message').textContent='Saved data unavailable. Opening the initial archive.';}
function options(){
 $('vehicle').innerHTML='<option value="">All vehicles</option>'+VEHICLES.map(v=>`<option value="${v}">${v}</option>`).join('');
 for(const key of ['tour','planet','track','category','subcategory']){
  const old=$(key).value;
  const values=key==='planet'?[...PLANETS.slice(0,-1),...new Set(rows.map(r=>r.planet).filter(p=>!PLANETS.includes(p))),PLANETS.at(-1)]:[...new Set((key==='category'?['Race','Eliminator',...rows.map(r=>r.category)]:rows.map(r=>r[key])).filter(Boolean))].sort();
  $(key).innerHTML=`<option value="">All ${key==='category'?'categories':key==='subcategory'?'subcategories':key+'s'}</option>`+(key==='subcategory'?'<option value="__unspecified__">Unspecified</option>':'')+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  $(key).value=[...$(key).options].some(o=>o.value===old)?old:'';
 }
}
function filtered(){const vehicle=$('vehicle').value;const races=new Set(rows.filter(r=>r.pilot==='Shade'&&r.vehicle===vehicle).map(r=>r.race_id));return rows.filter(r=>(!vehicle||races.has(r.race_id))&&['tour','planet','track','category','subcategory'].every(k=>!$(k).value||($(k).value==='__unspecified__'&&k==='subcategory'?!r[k]:r[k]===$(k).value)));}
function renderFilterSummaries(){
 const labels={tour:'Tour',planet:'Planet',track:'Track',vehicle:'Vehicle',category:'Category',subcategory:'Subcategory'};
 const summary=Object.keys(labels).filter(k=>$(k).value).map(k=>labels[k]+': '+($(k).value==='__unspecified__'?'Unspecified':$(k).value)).join(' · ');
 for(const section of ['standings','telemetry','records','archive','dialog']){const node=$(section+'-filters');node.textContent=summary;node.hidden=!summary;}
}
function render(){
 renderFilterSummaries();
 const latestRace=groupRaceResults(rows).at(-1);
 $('dossier-tour').textContent=latestRace?'LATEST TOUR: '+latestRace.tour.replace(/^Tour\s*/i,''):'AWAITING TOUR RECORDS';
 const data=filtered(),groups=new Map();
 data.forEach(r=>{if(!groups.has(r.pilot))groups.set(r.pilot,newPilotStats(r.pilot));addResult(groups.get(r.pilot),r);});
 const leaders=[...groups.values()].sort(compareStandings);
 const own=groups.get(selectedPilot);
 $('race-count').textContent=new Set(data.map(r=>r.race_id)).size;
 $('result-count').textContent=`${data.length} results · ${groups.size} pilots`;
 const hasRecordedFinish=data.some(r=>!isDQ(r));
 $('leader').textContent=hasRecordedFinish?(leaders[0]?.pilot||'—'):'—';$('leader-points').textContent=hasRecordedFinish&&leaders.length?`${leaders[0].points} pts · ${leaders[0].wins} wins`:data.length?'No completed results recorded':'No results in this selection';
 $('average').textContent=own?averageFinish(own):'—';$('podium').textContent=own?`${Math.round(own.podiums/own.races*100)}%`:'—';$('podium-detail').textContent=own?`${own.podiums} podiums from ${own.races} races`:`No races for ${selectedPilot}`;
 $('average-label').textContent=selectedPilot.toUpperCase()+' / AVG. FINISH';$('podium-label').textContent=selectedPilot.toUpperCase()+' / PODIUM RATE';
 $('average-caption').textContent='Completed finishes only · lower is better';
 $('dq-count-label').textContent=selectedPilot.toUpperCase()+' / TOTAL DQ';$('dq-rate-label').textContent=selectedPilot.toUpperCase()+' / DQ RATE';
 $('dq-count').textContent=own?own.dqs:0;$('dq-rate').textContent=own?Math.round(own.dqs/own.races*100)+'%':'—';
 $('dq-detail').textContent=own?own.dqs+' DQs from '+own.races+' starts':'No recorded starts';
 const vehicleUsage=new Map();
 if(selectedPilot==='Shade')for(const r of data.filter(r=>r.pilot==='Shade'&&r.vehicle))vehicleUsage.set(r.vehicle,(vehicleUsage.get(r.vehicle)||0)+1);
 for(const kind of ['least','most']){
  $('vehicle-'+kind+'-label').textContent=selectedPilot.toUpperCase()+' / '+(kind==='least'?'LEAST':'MOST')+' COMMON VEHICLE';
  const counts=[...vehicleUsage.values()],count=counts.length?(kind==='least'?Math.min(...counts):Math.max(...counts)):0;
  const vehicles=[...vehicleUsage].filter(([,n])=>n===count).map(([v])=>v).sort();
  $('vehicle-'+kind).textContent=vehicles.length?vehicles.join(' / '):'No telemetry';
  $('vehicle-'+kind+'-count').textContent=vehicles.length?count+' recorded start'+(count===1?'':'s')+(vehicles.length>1?' each · tied':''):selectedPilot==='Shade'?'No vehicle records in this selection':'Vehicle data unavailable';
 }
 if(typeof syncPlanetDisplay==='function')syncPlanetDisplay();
 $('leaders').innerHTML=leaders.map((p,i)=>`<tr data-pilot="${esc(p.pilot)}" class="${p.pilot==='Shade'?'self':''} ${p.pilot===selectedPilot?'pilot-selected':''}"><td><span class="rank ${i===0?'first':''}">${String(i+1).padStart(2,'0')}</span></td><td><button class="pilot-select" data-pilot="${esc(p.pilot)}" aria-pressed="${p.pilot===selectedPilot}"><span class="pilot-badge">${esc(p.pilot.split(' ').map(s=>s[0]).join(''))}</span>${esc(p.pilot)}${p.pilot==='Shade'?'<span class="you">TRACKED PILOT</span>':''}</button></td><td>${p.races}</td><td>${p.wins}</td><td>${averageFinish(p)}</td><td>${p.points}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No results match these filters.</td></tr>';
 renderTelemetry(data);
 renderSectors();
 const records=new Map();data.filter(r=>r.track&&!isDQ(r)&&r.time_ms).forEach(r=>{const key=JSON.stringify([r.planet,r.track,r.category,r.subcategory||'']);if(!records.has(key)||r.time_ms<records.get(key).time_ms)records.set(key,r);});
 $('records').innerHTML=[...records.values()].sort((a,b)=>a.planet.localeCompare(b.planet)||a.track.localeCompare(b.track)||a.category.localeCompare(b.category)).map(r=>`<article class="record"><div class="eyebrow">${esc(r.planet)} / ${esc(r.category)}${r.subcategory?' · '+esc(r.subcategory):''}</div><h3>${esc(r.track)}</h3><strong>${time(r.time_ms)}</strong><small>${esc(r.pilot)} · ${esc(galacticDate(r.date))}</small></article>`).join('')||'<div class="empty">Awaiting circuit identification. Track records will appear when circuit names are entered in the ledger.</div>';
 renderArchive(data);
}
function groupRaceResults(data){
 const events=new Map();for(const r of data){if(!events.has(r.race_id))events.set(r.race_id,{...r,results:[]});events.get(r.race_id).results.push(r);}
 return [...events.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.race_id.localeCompare(b.race_id));
}
function computeLeagueChanges(data){
 const standings=new Map(),changes=new Map();
 const rankSnapshot=standings=>new Map([...standings.values()].sort(compareStandings).map((p,i)=>[p.pilot,i+1]));
 for(const race of groupRaceResults(data)){
  const beforeRanks=rankSnapshot(standings);
  const incomplete=race.results.every(r=>isDQ(r)&&!Number.isInteger(r.position));
  for(const r of race.results){if(!standings.has(r.pilot))standings.set(r.pilot,newPilotStats(r.pilot));addResult(standings.get(r.pilot),r);}
  const afterRanks=rankSnapshot(standings),pilots=new Map();
  for(const [pilot,after] of afterRanks){const before=beforeRanks.get(pilot)??null;pilots.set(pilot,{before,after,delta:before!==null?before-after:null,incomplete});}
  changes.set(race.race_id,{...(pilots.get('Shade')||{before:null,after:null,delta:null}),pilots});
 }
 return changes;
}
function leagueChangeMarkup(change){
 if(change?.incomplete)return '<span class="league-move neutral">Incomplete results</span>'; 
 if(!change||change.after===null)return '<span class="league-move neutral">Not ranked</span>';
 if(change.before===null)return `<span class="league-move neutral">Initial ranking</span><span class="subline">League P${change.after}</span>`;
 const delta=change.delta,kind=delta>0?'gained':delta<0?'lost':'unchanged',label=delta?`${Math.abs(delta)} league position${Math.abs(delta)===1?'':'s'} ${kind}`:'League position unchanged';
 return `<span class="league-move ${kind}" aria-label="${label}"><span aria-hidden="true">${delta>0?'↗':delta<0?'↘':'—'}${delta?' '+Math.abs(delta):''}</span></span><span class="subline">P${change.before} → P${change.after}</span>`;
}
function renderArchive(data=filtered()){
 const q=$('search').value.trim().toLowerCase(),changes=computeLeagueChanges(filtered());
 const list=groupRaceResults(data).filter(r=>r.results.some(result=>COLS.some(c=>String(result[c]).toLowerCase().includes(q)))||galacticDate(r.date).toLowerCase().includes(q)).sort((a,b)=>(ascending?1:-1)*(a.date.localeCompare(b.date)||a.race_id.localeCompare(b.race_id)));
 const pages=Math.max(1,Math.ceil(list.length/10));page=Math.min(page,pages-1);
 $('archive-count').textContent=`/ ${list.length} RACES`;
 $('archive').innerHTML=list.slice(page*10,page*10+10).map((r,i)=>{const winner=r.results.find(result=>result.position===1&&!isDQ(result)),shade=r.results.find(result=>result.pilot==='Shade');return `<tr${i>0&&list[page*10+i-1].tour!==r.tour?' class="tour-boundary"':''} data-race-id="${esc(r.race_id)}"><td><button class="race-open" aria-haspopup="dialog" aria-label="View results for ${esc(r.race_id)}">${esc(r.race_id)} ↗<span class="subline">${r.results.length} recorded racers</span></button></td><td>${esc(galacticDate(r.date))}</td><td>${esc(r.tour)}<span class="subline">${esc(r.category)}${r.subcategory?' · '+esc(r.subcategory):''}</span></td><td>${esc(r.planet)}<span class="subline">${esc(r.track||'Circuit uncharted')}</span></td><td>${winner?esc(winner.pilot):'Not recorded'}<span class="subline">${winner?time(winner.time_ms):'Winner unavailable'}</span></td><td>${leagueChangeMarkup(changes.get(r.race_id))}</td></tr>`;}).join('')||'<tr><td colspan="6" class="empty">No races found. Try a different search or clear the filters.</td></tr>';
 $('page-info').textContent=list.length?`${page*10+1}–${Math.min(page*10+10,list.length)} of ${list.length} races`:'0 races';$('prev').disabled=page===0;$('next').disabled=page>=pages-1;
}
for(const key of ['tour','planet','track','category','subcategory','vehicle'])$(key).addEventListener('change',()=>{page=0;render();});
$('clear').onclick=()=>{for(const k of ['tour','planet','track','category','subcategory','vehicle'])$(k).value='';$('search').value='';page=0;render();};
$('search').oninput=()=>{page=0;renderArchive();};$('prev').onclick=()=>{page--;renderArchive();};$('next').onclick=()=>{page++;renderArchive();};
$('sort-date').onclick=()=>{ascending=!ascending;page=0;$('sort-date').textContent='LOGGED '+(ascending?'↑':'↓');renderArchive();};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10000000)throw Error('CSV is too large. Please use a file below 10 MB.');const imported=parseCSV(await file.text());rows=imported;page=0;options();render();if(persist())$('message').textContent=`Imported ${rows.length} results from ${file.name}. Saved in this browser.`;}catch(err){$('message').textContent='Import failed: '+err.message;}finally{e.target.value='';}};
$('export').onclick=()=>{const data=filtered();const cell=v=>{const s=String(v);return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};const csv=[COLS.join(','),...data.map(r=>COLS.map(k=>cell(r[k])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='galactic-racing-results.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('message').textContent=`Exported ${data.length} filtered results. Archive search does not affect export.`;};
$('reset').onclick=()=>{if(!confirm('Restore the initial archive? Export your CSV first if you want to keep it.'))return;rows=window.DEMO_RESULTS.map(r=>({...r}));page=0;for(const k of ['tour','planet','track','category','subcategory','vehicle'])$(k).value='';$('search').value='';options();render();if(persist())$('message').textContent='Initial archive restored.';};
let telemetry=[],selectedRace='';
$('import-trigger').onclick=()=>$('import').click();
function renderSectors(){
 $('sectors').innerHTML=PLANETS.map((planet,i)=>{const results=rows.filter(r=>r.planet===planet&&r.pilot==='Shade');const wins=results.filter(r=>r.position===1&&!isDQ(r)).length;return `<button class="sector sector-${i} ${$('planet').value===planet?'selected':''}" data-planet="${esc(planet)}" aria-pressed="${$('planet').value===planet}"><span class="sector-orb" aria-hidden="true"></span><span><small>SECTOR 0${i+1}</small><strong>${esc(planet)}</strong><em>${results.length} starts · ${wins} wins</em></span><span class="sector-arrow">↗</span></button>`;}).join('');
}
function renderTelemetry(data){
 const events=[...new Map(data.map(r=>[r.race_id,r])).values()].sort((a,b)=>a.date.localeCompare(b.date)||a.race_id.localeCompare(b.race_id)).slice(-12);
 const order=new Map(events.map((r,i)=>[r.race_id,i]));
 const recent=data.filter(r=>order.has(r.race_id)),pilots=[...new Set(data.map(r=>r.pilot))].sort((a,b)=>a==='Shade'?-1:b==='Shade'?1:a.localeCompare(b));
 telemetry=recent.filter(r=>r.pilot===selectedPilot).sort((a,b)=>order.get(a.race_id)-order.get(b.race_id));
 $('telemetry-pilot').textContent=selectedPilot.toUpperCase();
 $('chart-legend').innerHTML=pilots.map(p=>`<button class="legend-pilot ${p===selectedPilot?'selected':''}" data-pilot="${esc(p)}" aria-pressed="${p===selectedPilot}">${esc(p)}</button>`).join('');
 const gap=$('chart-mode').value==='gap',fastest=new Map();
 for(const r of recent.filter(r=>!isDQ(r)&&r.time_ms))fastest.set(r.race_id,Math.min(fastest.get(r.race_id)??Infinity,r.time_ms));
 const val=r=>isDQ(r)?null:gap?(r.time_ms/fastest.get(r.race_id)-1)*100:r.position;
 const max=gap?Math.max(1,Math.ceil(Math.max(0,...recent.filter(r=>!isDQ(r)).map(val)))):Math.max(8,...recent.filter(r=>!isDQ(r)).map(r=>r.position));
 const x=r=>48+order.get(r.race_id)*420/Math.max(events.length-1,1),y=v=>v===null?195:gap?30+v/max*140:30+(v-1)/(max-1)*140;
 const ticks=gap?[0,max/2,max]:[1,Math.ceil(max/2),max];
 function path(results){let previous=-2;return results.map(r=>{const i=order.get(r.race_id);if(isDQ(r)){previous=-2;return '';}const command=i===previous+1?'L':'M';previous=i;return `${command}${x(r)},${y(val(r))}`;}).join(' ');}
 const rivals=$('compare-grid').checked?pilots.filter(p=>p!==selectedPilot).map(p=>{const results=recent.filter(r=>r.pilot===p).sort((a,b)=>order.get(a.race_id)-order.get(b.race_id));return `<g class="rival-line" data-pilot="${esc(p)}"><path d="${path(results)}" fill="none" stroke="#99b7b0" stroke-opacity=".35" stroke-width="1.5"/>${results.map(r=>`<circle cx="${x(r)}" cy="${y(val(r))}" r="2" fill="${isDQ(r)?'#eb8f86':'#99b7b0'}" opacity=".5"/>`).join('')}</g>`;}).join(''):'';
 $('trend').innerHTML=events.length?`<svg viewBox="0 0 510 240" aria-label="Race telemetry for ${esc(selectedPilot)}; ${gap?'time gap':'finish positions'} across the last ${events.length} races">${ticks.map(p=>`<line x1="40" y1="${y(p)}" x2="485" y2="${y(p)}" stroke="#778a8740" stroke-dasharray="3 5"/><text x="2" y="${y(p)+5}" fill="#b8cbc7" font-size="13">${gap?p.toFixed(1)+'%':'P'+p}</text>`).join('')}<line x1="40" y1="183" x2="485" y2="183" stroke="#778a8740"/><text x="2" y="200" fill="#eb8f86" font-size="12">DQ</text>${rivals}<path class="chart-line" d="${path(telemetry)}" fill="none" stroke="#efbd70" stroke-width="3"/>${telemetry.map((r,i)=>`<g class="chart-point ${isDQ(r)?'dq':''} ${r.race_id===selectedRace?'selected':''}" tabindex="0" role="button" aria-label="Inspect ${esc(selectedPilot)}, ${esc(r.race_id)}, ${esc(r.planet)}, ${positionLabel(r)}" data-index="${i}"><circle class="hit" cx="${x(r)}" cy="${y(val(r))}" r="15" fill="transparent"/><circle class="dot" cx="${x(r)}" cy="${y(val(r))}" r="5" fill="${isDQ(r)?'#eb8f86':'#efbd70'}" stroke="#153e43" stroke-width="2"/></g>`).join('')}${events.map(r=>`<text x="${x(r)}" y="230" text-anchor="middle" font-size="12" fill="#b8cbc7">${esc(r.race_id.slice(-3))}</text>`).join('')}</svg>`:'<div class="empty">No signals in this sector.</div>';
 const selected=telemetry.findIndex(r=>r.race_id===selectedRace);showSignal(selected>=0?selected:telemetry.length-1);
 if(events.length&&!telemetry.length)$('race-detail').innerHTML=`No recorded finishes for ${esc(selectedPilot)} in these races. Select another racer or clear your filters.`;
}

function showSignal(index){
 const r=telemetry[index];if(!r){$('race-detail').innerHTML='Awaiting race telemetry.';return;}
 selectedRace=r.race_id;
 $('race-detail').innerHTML=`<div><span class="eyebrow">${esc(r.race_id)} / ${esc(galacticDate(r.date))}</span><strong>${esc(selectedPilot)} / ${esc(r.planet)}</strong><small>${esc(r.track||'Circuit uncharted')}${r.subcategory?' · '+esc(r.subcategory):''}${r.vehicle?' · '+esc(r.vehicle):''}</small></div><div class="signal-finish ${isDQ(r)?'signal-dq':''}">${positionLabel(r)}<small>${time(r.time_ms)}</small></div>`;
 for(const node of $('trend').querySelectorAll?.('.chart-point')||[])node.classList.toggle('selected',Number(node.dataset.index)===index);
}
$('chart-mode').onchange=()=>renderTelemetry(filtered());
$('compare-grid').onchange=()=>renderTelemetry(filtered());
function selectRacer(e){const node=e.target.closest?.('[data-pilot]');if(!node)return;selectedPilot=node.dataset.pilot;render();}
$('leaders').onclick=selectRacer;$('chart-legend').onclick=selectRacer;
function inspectSignal(e){const node=e.target.closest?.('[data-index]');if(node)showSignal(Number(node.dataset.index));}
$('trend').onmouseover=inspectSignal;$('trend').onfocusin=inspectSignal;$('trend').onclick=inspectSignal;
$('trend').onkeydown=e=>{const node=e.target.closest?.('[data-index]');if(!node)return;let index=Number(node.dataset.index);if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();index=Math.max(0,Math.min(telemetry.length-1,index+(e.key==='ArrowRight'?1:-1)));$('trend').querySelector(`[data-index="${index}"]`).focus();showSignal(index);}else if(e.key==='Enter'||e.key===' '){e.preventDefault();showSignal(index);}};
$('sectors').onclick=e=>{const node=e.target.closest?.('[data-planet]');if(!node)return;$('planet').value=$('planet').value===node.dataset.planet?'':node.dataset.planet;page=0;render();};
options();render();
