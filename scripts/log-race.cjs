// Optional local CLI. No dependencies beyond Node.js.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),file=name=>path.join(root,name);
const incomingPath=process.argv[2]?path.resolve(process.argv[2]):file('data/pending-race.json');
const incoming=JSON.parse(fs.readFileSync(incomingPath,'utf8'));
assert.ok(Array.isArray(incoming.results)&&incoming.results.length,'A nonempty results array is required.');
assert.ok(incoming.category,'Category is required.');
const nodes=new Map();function el(id){if(!nodes.has(id))nodes.set(id,{value:'',checked:true,options:[],addEventListener(){},querySelectorAll(){return [];}});return nodes.get(id);}
const context={window:{},document:{getElementById:el},localStorage:{getItem(){return null;}}};vm.createContext(context);
vm.runInContext(fs.readFileSync(file('data/races.js'),'utf8'),context);vm.runInContext(fs.readFileSync(file('app.js'),'utf8'),context);
context.csv=fs.readFileSync(file('data/races.csv'),'utf8');const existing=vm.runInContext('parseCSV(csv)',context);
const next=1+Math.max(0,...existing.map(r=>Number(r.race_id.match(/^GR-(\d+)$/)?.[1]||0))),id='GR-'+String(next).padStart(3,'0');
context.added=incoming.results.map(r=>({race_id:id,date:incoming.date,tour:incoming.tour,category:incoming.category,subcategory:incoming.subcategory??'',laps:incoming.laps??'',direction:incoming.direction??'',planet:incoming.planet,track:incoming.track??'',...r,vehicle:r.pilot==='Shade'?incoming.vehicle??'':''}));
const added=vm.runInContext('validate(added)',context);
assert.ok(!existing.some(r=>r.tour===incoming.tour&&r.planet===incoming.planet&&r.track===(incoming.track??'')&&r.category===incoming.category&&(r.direction||'')===(incoming.direction||'')&&added.every(v=>existing.some(other=>other.race_id===r.race_id&&other.pilot===v.pilot&&other.position===v.position&&other.time_ms===v.time_ms&&other.status===v.status))),'This race is already logged.');
context.combined=[...existing,...added];const combined=vm.runInContext('validate(combined)',context),cols=vm.runInContext('COLS',context);
const cell=v=>/[",\r\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v);
const csv=[cols.join(','),...combined.map(r=>cols.map(c=>cell(r[c])).join(','))].join('\n')+'\n';
context.output=csv;assert.equal(vm.runInContext('parseCSV(output).length',context),combined.length);
fs.writeFileSync(file('data/races.csv'),csv);fs.writeFileSync(file('data/races.js'),'window.DEMO_RESULTS = '+JSON.stringify(combined)+';\n');
fs.writeFileSync(file('data/last-logged-race.json'),JSON.stringify({race_id:id,...incoming},null,2)+'\n');
const shade=added.find(r=>r.pilot==='Shade');console.log('Logged '+id+': '+added.length+' racers'+(shade?', Shade '+vm.runInContext('positionLabel(added.find(r=>r.pilot==="Shade"))',context):'')+'.');
