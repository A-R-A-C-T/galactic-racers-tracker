'use strict';
const sectorMotion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
let sectorStart=0,sectorList=[],sectorSignature='',sectorShown='';
function setSectorPlanet(planet){
 if(planet===sectorShown)return;sectorShown=planet;
 $('planet-display').dataset.planet=planet;$('planet-display').setAttribute('aria-label',planet+' / Galactic League sector');$('planet-name').textContent=planet.toUpperCase();
 if(!sectorMotion?.matches)$('planet-core').animate?.([{opacity:.15,transform:'rotate(-15deg) scale(.92)'},{opacity:1,transform:'rotate(-15deg) scale(1)'}],{duration:500,easing:'ease-out'});
}
function syncPlanetDisplay(){
 const latest=rows.reduce((a,r)=>!a||r.date>a.date||(r.date===a.date&&r.race_id>a.race_id)?r:a,null);
 const planets=[...new Set([...PLANETS,...rows.map(r=>r.planet)])];
 const signature=JSON.stringify([latest?.race_id,latest?.date,latest?.planet,planets]);if(signature===sectorSignature)return;
 sectorSignature=signature;const first=latest?.planet||planets[0],index=planets.indexOf(first);sectorList=[...planets.slice(index),...planets.slice(0,index)];
 sectorStart=performance.now();setSectorPlanet($('planet').value||first);
}
function advanceSectorScan(now){
 const elapsed=Math.max(0,now-sectorStart);
 const filteredPlanet=$('planet').value;
 if(filteredPlanet){setSectorPlanet(filteredPlanet);$('planet-orbit').style.transform=sectorMotion?.matches?'rotate(0deg)':`rotate(${elapsed/45000*360%360}deg)`;return;}
 if(sectorMotion?.matches){setSectorPlanet(sectorList[0]);$('planet-orbit').style.transform='rotate(0deg)';return;}
 $('planet-orbit').style.transform=`rotate(${elapsed/45000*360%360}deg)`;
 setSectorPlanet(sectorList[Math.floor(elapsed/11250)%sectorList.length]);
}
function sectorFrame(now){advanceSectorScan(now);requestAnimationFrame(sectorFrame);}
$('planet-orbit').style.animation='none';syncPlanetDisplay();
if(typeof requestAnimationFrame==='function')requestAnimationFrame(sectorFrame);
$('planet').addEventListener('change',()=>advanceSectorScan(performance.now()));
$('sectors').addEventListener('click',()=>advanceSectorScan(performance.now()));
$('clear').addEventListener('click',()=>advanceSectorScan(performance.now()));
