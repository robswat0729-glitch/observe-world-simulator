export const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
export const uid=()=>crypto.randomUUID?.()||'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function createWorld(seed={}) {
 const regions=new Map((seed.regions||[]).map(r=>[String(r.id),{id:String(r.id),name:r.name||String(r.id),owner:r.owner||null,population:Math.max(0,r.population||0),terrain:r.terrain||'plains',fort:r.fort||0,occupation:r.occupation||null,neighbors:[...(r.neighbors||[])],...r}]));
 const countries=new Map((seed.countries||[]).map(c=>[String(c.id),{id:String(c.id),name:c.name||String(c.id),color:c.color||'#73899a',population:c.population||0,treasury:c.treasury||0,gdp:c.gdp||0,army:c.army||0,reserves:c.reserves||0,stability:c.stability??70,technology:c.technology||1,food:c.food??100,industry:c.industry||0,navy:c.navy||0,air:c.air||0,relations:{},...c}]));
 const world={id:seed.id||uid(),date:seed.date||{year:2026,month:1,day:1},tick:seed.tick||0,regions,countries,wars:[],alliances:[],events:[],history:[],rules:{casualtyRate:.012,terrainWeight:.25,fortWeight:.2,uncertainty:.08,foodPenalty:.45,stabilityWeight:.15},selectedCountry:null,revision:1};
 world.emit=(type,data={})=>{world.events.unshift({id:uid(),tick:world.tick,type,data});world.events.length=Math.min(500,world.events.length);world.revision++;};
 world.countryRegions=id=>[...regions.values()].filter(r=>r.owner===id);
 world.countryPopulation=id=>world.countryRegions(id).reduce((n,r)=>n+r.population,0);
 world.snapshot=()=>JSON.parse(JSON.stringify({id:world.id,date:world.date,tick:world.tick,regions:[...regions.values()],countries:[...countries.values()],wars:world.wars,alliances:world.alliances,events:world.events,history:world.history,rules:world.rules}));
 return world;
}
export function validateWorld(w){
 const errors=[];for(const r of w.regions.values()){if(!r.id)errors.push('Region without id');if(r.owner&&!w.countries.has(r.owner))errors.push('Unknown owner on region '+r.id);for(const n of r.neighbors)if(!w.regions.has(String(n)))errors.push('Unknown neighbor '+n+' from '+r.id)}
 for(const war of w.wars){if(!w.countries.has(war.a)||!w.countries.has(war.b)||war.a===war.b)errors.push('Invalid war '+war.id)}
 return errors;
}
