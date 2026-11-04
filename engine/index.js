import {createWorld,validateWorld} from './core.js';
import {buildFronts,allocateFront,setStance,resolveFronts} from './fronts.js';
import {economyTick,fundProject,completeProjects} from './economy.js';
import {declareWar,makePeace,setAlliance,setEmbargo,relation} from './diplomacy.js';
import {createRegion,setRegionOwner,connectRegions,paintRegion,createUndoManager} from './editor.js';
export function createObserveEngine(seed={}){
 const world=createWorld(seed),undo=createUndoManager(world);
 const api={world,validate:()=>validateWorld(world),tick(){resolveFronts(world);economyTick(world);completeProjects(world);return world.tick},
 declareWar(a,b){const w=declareWar(world,a,b);buildFronts(world,w);return w},
 makePeace,allocateFront, setStance:(warId,frontId,countryId,stance)=>{const w=world.wars.find(x=>x.id===warId);if(!w)throw Error('War not found');return setStance(w,frontId,countryId,stance)},
 setAlliance:(a,b,v)=>setAlliance(world,a,b,v),setEmbargo:(a,b,v)=>setEmbargo(world,a,b,v),relation:(a,b)=>relation(world,a,b),
 fundProject:(id,type,cost)=>fundProject(world,id,type,cost),
 createRegion:d=>createRegion(world,d),setRegionOwner:(r,c)=>setRegionOwner(world,r,c),connectRegions:(a,b,v)=>connectRegions(world,a,b,v),paintRegion:(r,p)=>paintRegion(world,r,p),
 checkpoint:label=>undo.checkpoint(label),undo:()=>undo.undo(),redo:()=>undo.redo(),
 save(){return JSON.stringify(world.snapshot())},load(raw){const data=typeof raw==='string'?JSON.parse(raw):raw;const next=createWorld(data);Object.assign(world,next);world.emit('world-loaded');return world}
 };return api;
}
if(typeof window!=='undefined')window.ObserveEngine={createObserveEngine};
