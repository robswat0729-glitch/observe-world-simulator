import {clamp} from './core.js';
export function economyTick(world){
 for(const c of world.countries.values()){const owned=world.countryRegions(c.id),pop=owned.reduce((n,r)=>n+r.population,0)||c.population||0;const industry=c.industry||0,productivity=(c.technology||1)*(c.stability/100)*clamp(c.food/100,.2,1);
 const output=(c.gdp||pop*8000)/365*(.7+industry/1000)*productivity;const tax=clamp(c.taxRate??.18,.02,.6);const income=output*tax;const upkeep=(c.army||0)*1.8+(c.navy||0)*950+(c.air||0)*420+(c.buildingUpkeep||0);
 const foodProduction=(c.farms||0)*1200+pop*.00035;const demand=pop*.0003+(c.army||0)*.001;
 c.food=clamp((c.food??100)+(foodProduction-demand)/Math.max(1,pop)*100,0,150);c.treasury=(c.treasury||0)+income-upkeep;c.gdp=Math.max(0,(c.gdp||0)*.9995+output*365*.0005);
 if(c.food<35){c.stability=clamp(c.stability-(35-c.food)*.025,0,100);c.army=Math.max(0,c.army*.997)}
 if(c.treasury<0)c.debt=(c.debt||0)+Math.abs(c.treasury)*.01;
 }
 world.emit('economy-tick',{countries:world.countries.size});
}
export function fundProject(world,countryId,type,cost){const c=world.countries.get(countryId);if(!c)throw Error('Country not found');cost=Math.max(0,Number(cost)||0);if(c.treasury<cost)throw Error('Insufficient treasury');c.treasury-=cost;c.projects||=[];c.projects.push({type,cost,progress:0});world.emit('project-funded',{countryId,type,cost});}
export function completeProjects(world){for(const c of world.countries.values())for(const p of c.projects||[]){p.progress=clamp(p.progress+1,0,100);if(p.progress===100&&!p.complete){p.complete=true;if(p.type==='industry')c.industry=(c.industry||0)+10;if(p.type==='farm')c.farms=(c.farms||0)+1;if(p.type==='port')c.navy=(c.navy||0)+1;world.emit('project-complete',{countryId:c.id,type:p.type})}}}
