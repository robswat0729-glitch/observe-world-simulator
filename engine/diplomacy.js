import {uid} from './core.js';
const key=(a,b)=>[a,b].sort().join('|');
export function relation(world,a,b){return world.relations?.[key(a,b)]||{value:0,trade:false,alliance:false,embargo:false}}
export function setRelation(world,a,b,patch){if(a===b||!world.countries.has(a)||!world.countries.has(b))throw Error('Invalid diplomatic pair');world.relations||={};world.relations[key(a,b)]={...relation(world,a,b),...patch};world.emit('diplomacy-change',{a,b,...patch})}
export function declareWar(world,a,b){if(a===b||!world.countries.has(a)||!world.countries.has(b))throw Error('Invalid belligerents');if(world.wars.some(w=>w.status==='active'&&((w.a===a&&w.b===b)||(w.a===b&&w.b===a))))throw Error('War already active');const war={id:uid(),a,b,started:world.date,status:'active',fronts:[]};world.wars.push(war);setRelation(world,a,b,{value:-100,alliance:false,trade:false});world.emit('war-declared',{warId:war.id,a,b});return war}
export function makePeace(world,warId,terms={}){const w=world.wars.find(x=>x.id===warId);if(!w||w.status!=='active')throw Error('Active war not found');w.status='peace';w.ended=world.date;w.terms=terms;world.emit('peace-signed',{warId,terms});return w}
export function setAlliance(world,a,b,enabled=true){setRelation(world,a,b,{alliance:!!enabled,trade:enabled?true:relation(world,a,b).trade,value:enabled?Math.max(25,relation(world,a,b).value):relation(world,a,b).value});}
export function setEmbargo(world,a,b,enabled=true){setRelation(world,a,b,{embargo:!!enabled,trade:enabled?false:relation(world,a,b).trade})}
