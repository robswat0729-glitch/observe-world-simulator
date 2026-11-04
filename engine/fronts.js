import {clamp,uid} from './core.js';
export function buildFronts(world,war){
 const byPair=new Map();for(const r of world.regions.values())if(r.owner===war.a||r.owner===war.b)for(const n of r.neighbors){const other=world.regions.get(String(n));if(!other||!((r.owner===war.a&&other.owner===war.b)||(r.owner===war.b&&other.owner===war.a)))continue;const key=[r.id,other.id].sort().join('|');byPair.set(key,{a:r.id,b:other.id})}
 const edges=[...byPair.values()],adj=new Map();for(const e of edges){for(const id of [e.a,e.b]){if(!adj.has(id))adj.set(id,[]);adj.get(id).push(e)}}const seen=new Set(),fronts=[];
 for(const e of edges){const k=[e.a,e.b].sort().join('|');if(seen.has(k))continue;const stack=[e.a,e.b],component=[],edgeSet=new Set();while(stack.length){const id=stack.pop();if(seen.has(id))continue;seen.add(id);component.push(id);for(const x of adj.get(id)||[]){edgeSet.add([x.a,x.b].sort().join('|'));const next=x.a===id?x.b:x.a;if(!seen.has(next))stack.push(next)}}fronts.push({id:uid(),regions:component,edges:[...edgeSet],allocation:{[war.a]:0,[war.b]:0},losses:{[war.a]:0,[war.b]:0},progress:0,stance:{[war.a]:'balanced',[war.b]:'balanced'}})}
 war.fronts=fronts;return fronts;
}
export function allocateFront(world,warId,frontId,countryId,troops){
 const war=world.wars.find(x=>x.id===warId),front=war?.fronts?.find(x=>x.id===frontId);if(!front||![war.a,war.b].includes(countryId))throw Error('Front or country not found');
 const country=world.countries.get(countryId),other=war.a===countryId?war.b:war.a;const total=war.fronts.reduce((n,f)=>n+(f.allocation[countryId]||0),0),available=Math.max(0,(country.army||0)-total+(front.allocation[countryId]||0));
 front.allocation[countryId]=Math.floor(clamp(troops,0,available));world.emit('front-allocation',{warId,frontId,countryId,troops:front.allocation[countryId]});return front.allocation[countryId];
}
export function setStance(war,frontId,countryId,stance){const f=war.fronts.find(x=>x.id===frontId);if(!f||!['push','hold','balanced','withdraw'].includes(stance))throw Error('Invalid stance');f.stance[countryId]=stance}
export function resolveFronts(world){
 for(const war of world.wars){if(war.status!=='active')continue;if(!war.fronts?.length)buildFronts(world,war);for(const f of war.fronts){
 const a=world.countries.get(war.a),b=world.countries.get(war.b);if(!a||!b)continue;
 const troopsA=f.allocation[war.a]||0,troopsB=f.allocation[war.b]||0;if(!troopsA&&!troopsB)continue;
 const terrain=f.regions.reduce((n,id)=>n+(world.regions.get(id)?.terrain==='mountain'?1.25:world.regions.get(id)?.terrain==='urban'?1.15:1),0)/Math.max(1,f.regions.length);
 const powerA=Math.max(1,troopsA)*(a.technology||1)*(a.stability/100)*clamp(a.food/100,.35,1)*terrain*(f.stance[war.a]==='push'?1.12:f.stance[war.a]==='hold'?.92:1);
 const powerB=Math.max(1,troopsB)*(b.technology||1)*(b.stability/100)*clamp(b.food/100,.35,1)*terrain*(f.stance[war.b]==='push'?1.12:f.stance[war.b]==='hold'?.92:1);
 const ratio=powerA/powerB,uncertainty=1+(Math.random()-.5)*world.rules.uncertainty;const winner=ratio*uncertainty>=1?war.a:war.b,loser=winner===war.a?war.b:war.a;
 const lossA=Math.min(troopsA,Math.ceil(troopsA*world.rules.casualtyRate*(powerB/Math.max(1,powerA))**.25)),lossB=Math.min(troopsB,Math.ceil(troopsB*world.rules.casualtyRate*(powerA/Math.max(1,powerB))**.25));
 f.losses[war.a]=(f.losses[war.a]||0)+lossA;f.losses[war.b]=(f.losses[war.b]||0)+lossB;f.allocation[war.a]=Math.max(0,troopsA-lossA);f.allocation[war.b]=Math.max(0,troopsB-lossB);
 a.army=Math.max(0,a.army-lossA);b.army=Math.max(0,b.army-lossB);a.reserves=(a.reserves||0)+Math.floor(lossA*.2);b.reserves=(b.reserves||0)+Math.floor(lossB*.2);
 const advance=clamp(Math.abs(Math.log(Math.max(.05,ratio)))*.7,0,3);f.progress+=winner===war.a?advance:-advance;
 if(Math.abs(f.progress)>=1){const candidates=f.regions.map(id=>world.regions.get(id)).filter(r=>r&&r.owner===loser);const target=candidates.sort((x,y)=>(x.fort||0)-(y.fort||0))[0];if(target){target.owner=winner;target.occupation=winner;f.progress=0;world.emit('region-captured',{warId,frontId,regionId:target.id,from:loser,to:winner})}}
 }}world.tick++;world.date.day++;if(world.date.day>30){world.date.day=1;world.date.month++;if(world.date.month>12){world.date.month=1;world.date.year++}}}
