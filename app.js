function countryCode(f){const p=f?.properties||{};for(const v of [p['ISO3166-1-Alpha-3'],p.ISO_A3,p.ISO_A3_EH,p.ADM0_A3,p.SOV_A3,p.GU_A3,p.WB_A3,p.iso_a3,f?.id]){const s=String(v??'').trim().toUpperCase();if(/^[A-Z]{3}$/.test(s)&&s!=='-99')return s}return ''}
(()=>{'use strict';
const $=id=>document.getElementById(id),cv=$('map'),ctx=cv.getContext('2d');
let d3,features=[],regions=[],regionById=new Map(),proj,path,countries=new Map(),wars=[],events=[],selected=null,month=1,year=1,speed=1,paused=false,last=0,acc=0,zoom=1,pan={x:0,y:0},drag=null,layer='political',relations={},ruleset='standard',history=[],fronts=[],custom=[],worldId=1,selectionMode='inspect';
const colors=['#2878d0','#e34f58','#18a875','#e6a323','#9364d8','#08a6b5','#e87532','#4b91a2','#d84e9a','#8ea821','#6258d8','#b69a25','#1d9a68','#d45b28','#347ac0','#bc456e'];
const names={'840':'United States','156':'China','643':'Russia','356':'India','276':'Germany','250':'France','392':'Japan','76':'Brazil','36':'Australia','124':'Canada','826':'United Kingdom','380':'Italy','724':'Spain','484':'Mexico','410':'South Korea','792':'Türkiye','682':'Saudi Arabia','566':'Nigeria','710':'South Africa','32':'Argentina','752':'Sweden','578':'Norway','616':'Poland','360':'Indonesia','704':'Vietnam','764':'Thailand','608':'Philippines','364':'Iran','818':'Egypt'};
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),fmt=n=>n>=1e12?'$'+(n/1e12).toFixed(2)+'T':n>=1e9?'$'+(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'K':Math.round(n).toLocaleString();
function date(){return ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][month-1]+' · YEAR '+year}
function log(t){events.unshift({d:date(),t});events=events.slice(0,250);$('events').innerHTML=events.slice(0,40).map(e=>'<div class="event"><time>'+e.d+'</time>'+e.t+'</div>').join('');$('archive').innerHTML=events.map(e=>'<div class="event"><time>'+e.d+'</time>'+e.t+'</div>').join('')}
function make(f,i,n){let p=f?.properties||{},id=String(f?.id??p.ISO_A3??p.iso_a3??i),name=n||names[id]||p.ADMIN||p.name||p.NAME||'Country '+id;return{id,name,color:colors[i%colors.length],population:rand(1,1450)*1e6,gdp:rand(15,28000)*1e9,treasury:rand(5,600)*1e9,stability:rand(62,88),technology:rand(.7,1.9),army:rand(8,950)*1000,manpower:rand(100,12000)*1000,casualties:0,navy:rand(0,180),air:rand(0,500),industry:rand(20,100),food:rand(60,100),alive:true,owner:id,exhaustion:0,ideology:['Democracy','Socialism','Communism','Monarchy','Nationalism'][Math.floor(rand(0,5))],relations:{},fort:0,puppet:false,projects:[],research:[],income:0,expenses:0,warSupport:50,government:'Republic',unrest:rand(3,18),debt:rand(0,90),literacy:rand(55,99),unemployment:rand(2,18),energy:rand(45,100),infrastructure:rand(20,95),logistics:rand(25,95),corruption:rand(2,45),morale:rand(45,95),readiness:rand(35,95),equipment:rand(35,100),birthRate:rand(8,32),lifeExpectancy:rand(55,84),urbanization:rand(15,95)}}

function normalizeWorld(){const pop={CHN:1410000000,IND:1430000000,USA:342000000,IDN:283000000,PAK:250000000,NGA:235000000,BRA:212000000,BGD:175000000,RUS:144000000,ETH:132000000,MEX:130000000,JPN:123000000,EGY:116000000,PHL:116000000,COD:109000000,VNM:101000000,IRN:91000000,TUR:87000000,DEU:84000000,THA:72000000,GBR:69000000,FRA:66000000,ZAF:63000000,ITA:59000000,KEN:56000000,MMR:55000000,COL:53000000,KOR:52000000,ESP:49000000,ARG:46000000,CAN:41000000,POL:38000000,SAU:35000000,UKR:37000000,AUS:27000000};let all=active(),known=0,other=[];for(let x of all){if(pop[x.id]){x.population=pop[x.id];known+=pop[x.id]}else other.push(x)}let rest=Math.max(0,8000000000-known),weight=other.reduce((a,x)=>a+Math.max(1,x.population),0);for(let x of other)x.population=rest*Math.max(1,x.population)/weight;const pc={USA:85000,CHN:13500,IND:2800,DEU:55000,JPN:34000,GBR:52000,FRA:46000,ITA:39000,CAN:55000,AUS:65000,KOR:36000,RUS:15000,BRA:11000,MEX:14000,IDN:5000,PHL:4000,SAU:30000,TUR:15000,ESP:33000,NLD:65000,CHE:100000,NOR:90000,SWE:60000,SGP:90000,IRL:105000,POL:23000,THA:8000,VNM:4500,PAK:1600,NGA:2500,EGY:3500,ZAF:6500,ARG:14000};let total=0;for(let x of all){x.gdp=x.population*(pc[x.id]||clamp(2200+Math.sqrt(x.population/1e6)*430,2500,26000));total+=x.gdp}let scale=110000000000000/Math.max(1,total);for(let x of all){x.gdp*=scale;x.treasury=x.gdp*.08;x.manpower=Math.max(x.population*.008,x.army*2.5);x.army=Math.min(x.population*.025,Math.max(x.population*.0012,x.army))}log('World baseline calibrated: approximately 8.0 billion people and $110 trillion GDP.')}
function active(){return [...countries.values()].filter(c=>c.alive&&c.owner===c.id)}
function pair(a,b){return [a,b].sort().join('|')}function rel(a,b){return relations[pair(a,b)]||{value:0,alliance:false,trade:false,embargo:false}}
function flag(id){let s=String(id||'').toUpperCase();const m={USA:'US',CHN:'CN',RUS:'RU',IND:'IN',DEU:'DE',FRA:'FR',JPN:'JP',BRA:'BR',AUS:'AU',CAN:'CA',GBR:'GB',ITA:'IT',ESP:'ES',MEX:'MX',KOR:'KR',TUR:'TR',SAU:'SA',NGA:'NG',ZAF:'ZA',ARG:'AR',SWE:'SE',NOR:'NO',POL:'PL',IDN:'ID',VNM:'VN',THA:'TH',PHL:'PH',IRN:'IR',EGY:'EG'};s=m[s]||s.slice(0,2);return /^[A-Z]{2}$/.test(s)?String.fromCodePoint(...[...s].map(x=>127397+x.charCodeAt(0))):'🏳️'} 
function selectMapCountry(id){if(!countries.has(id))return;if(selectionMode==='selected'){selected={id};selectionMode='target';$('selectCountryBtn').textContent='ATTACKER: '+countries.get(id).name;$('selectCountryBtn').classList.add('active');$('selectTargetBtn').classList.remove('active');$('mapHint').textContent='Now tap SELECT TARGET, then tap the enemy country.';log('Attacker selected: '+countries.get(id).name);return}if(selectionMode==='target'){if(selected?.id===id)return log('Choose a different target.');$('editorTarget').value=id;$('targetCountry').value=id;selectionMode='inspect';$('selectTargetBtn').classList.remove('active');$('mapHint').textContent='Target selected: '+countries.get(id).name+'. Press FORCE WAR.';log('Force-war target selected: '+countries.get(id).name);return}inspect(id)}function armMapSelection(mode){selectionMode=mode;$('selectCountryBtn').classList.toggle('active',mode==='selected');$('selectTargetBtn').classList.toggle('active',mode==='target');$('mapHint').textContent=mode==='selected'?'Tap the attacker country on the map.':'Tap the target country on the map.'}function selectedCountry(){return selected?countries.get(selected.id):null}
function target(){return countries.get($('targetCountry').value)}
function fillSelect(id){let s=$(id),v=s.value;s.innerHTML='';active().sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{let o=document.createElement('option');o.value=c.id;o.textContent=c.name;s.append(o)});if([...s.options].some(o=>o.value===v))s.value=v}
function populate(){['targetCountry','editorTarget'].forEach(fillSelect)}
function stats(c){return [['POPULATION',fmt(c.population)],['GDP',fmt(c.gdp)],['GDP PER CAPITA',fmt(c.gdp/c.population)],['ARMY',fmt(c.army)],['MANPOWER',fmt(c.manpower)],['STABILITY',c.stability.toFixed(1)+'%'],['TECHNOLOGY',c.technology.toFixed(2)],['CASUALTIES',fmt(c.casualties)],['NAVY',fmt(c.navy)],['AIR FORCE',fmt(c.air)],['TREASURY',fmt(c.treasury)],['WAR EXHAUSTION',c.exhaustion.toFixed(1)+'%'],['INDUSTRY',c.industry.toFixed(1)],['FOOD',c.food.toFixed(1)],['IDEOLOGY',c.ideology],['GOVERNMENT',c.government],['PUBLIC DEBT',fmt(c.debt/100*c.gdp)],['LITERACY',c.literacy.toFixed(1)+'%'],['UNEMPLOYMENT',c.unemployment.toFixed(1)+'%'],['ENERGY SECURITY',c.energy.toFixed(1)+'%'],['INFRASTRUCTURE',c.infrastructure.toFixed(1)+'/100'],['LOGISTICS',c.logistics.toFixed(1)+'/100'],['CORRUPTION',c.corruption.toFixed(1)+'/100'],['MILITARY MORALE',c.morale.toFixed(1)+'/100'],['READINESS',c.readiness.toFixed(1)+'/100'],['EQUIPMENT QUALITY',c.equipment.toFixed(1)+'/100'],['BIRTH RATE',c.birthRate.toFixed(1)+'‰'],['LIFE EXPECTANCY',c.lifeExpectancy.toFixed(1)+' years'],['URBANIZATION',c.urbanization.toFixed(1)+'%']]}
function inspect(id){let c=countries.get(id);if(!c)return;selected={id};$('selectedName').textContent=c.name;$('selectedSub').textContent=c.government+' · '+c.ideology+' · Country code '+id;$('selectedStats').innerHTML=stats(c).map(x=>'<div><small>'+x[0]+'</small><b>'+x[1]+'</b></div>').join('');$('inspectBtn').disabled=false;renderPanels();draw()}
function dashboard(){let a=active();$('nationCount').textContent=a.length;$('warCount').textContent=wars.length;$('worldPop').textContent=fmt(a.reduce((s,c)=>s+c.population,0));$('worldGdp').textContent=fmt(a.reduce((s,c)=>s+c.gdp,0));$('dateLabel').textContent=date();$('warList').innerHTML=wars.map(w=>{let a=countries.get(w.a),b=countries.get(w.b);return a&&b?'<div class="waritem"><b>'+a.name+' vs '+b.name+'</b><small>'+w.months+' months · '+w.progress.toFixed(0)+'% advance · '+w.type+' · losses '+fmt(a.casualties)+' / '+fmt(b.casualties)+'</small><div class="bar"><i style="width:'+w.progress+'%"></i></div></div>':''}).join('')||'<p class="muted">No active wars.</p>';let rank=[...a].sort((x,y)=>y.gdp-x.gdp).slice(0,10);$('rankings').innerHTML=rank.map((c,i)=>'<div class="rank"><b>'+(i+1)+'. '+c.name+'</b><span>'+fmt(c.gdp)+'</span></div>').join('');$('diplomacyList').innerHTML=Object.entries(relations).filter(([k,v])=>v.alliance||v.trade||v.embargo||v.value).map(([k,v])=>'<div class="event"><b>'+k.replace('|',' ↔ ')+'</b><small>Relation '+Math.round(v.value)+' · '+(v.alliance?'Alliance ':'')+(v.trade?'Trade ':'')+(v.embargo?'Embargo':'')+'</small></div>').join('')||'<p class="muted">No formal diplomatic agreements.</p>';populate();renderPanels()}
function renderPanels(){let c=selectedCountry();if(!c)return;$('relationInfo').textContent='Relations with '+(target()?.name||'target')+': '+Math.round(rel(c.id,target()?.id||'').value)+' · '+(rel(c.id,target()?.id||'').alliance?'Allied':'No alliance');$('militaryInfo').textContent=c.name+' commands '+fmt(c.army)+' active troops, '+fmt(c.manpower)+' reserves, '+fmt(c.navy)+' naval strength and '+fmt(c.air)+' air strength. Fortification level '+c.fort+'.';$('economyInfo').innerHTML=[['Treasury',fmt(c.treasury)],['Monthly GDP',fmt(c.gdp/12)],['Industry',c.industry.toFixed(1)],['Food reserve',c.food.toFixed(1)+'%'],['Projects',c.projects.length],['Research',c.research.join(', ')||'None']].map(x=>'<div class="rank"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join('');$('politicsInfo').textContent='Government: '+c.government+'. Unrest: '+c.unrest.toFixed(1)+'%. War support: '+c.warSupport.toFixed(1)+'%.';$('ideologyInfo').innerHTML='<div class="rank"><b>Ideology</b><span>'+c.ideology+'</span></div><div class="rank"><b>Stability</b><span>'+c.stability.toFixed(1)+'%</span></div><div class="rank"><b>Unrest</b><span>'+c.unrest.toFixed(1)+'%</span></div><div class="rank"><b>War support</b><span>'+c.warSupport.toFixed(1)+'%</span></div>';$('frontList').innerHTML=wars.map(w=>{let a=countries.get(w.a),b=countries.get(w.b),at=w.committedA??(w.divisions?.a?.reduce((s,d)=>s+d.troops,0)||0),bt=w.committedB??(w.divisions?.b?.reduce((s,d)=>s+d.troops,0)||0);return '<div class="front-entry"><b>'+flag(w.a)+' '+(a?.name||'?')+' vs '+(b?.name||'?')+' '+flag(w.b)+'</b><div class="front-troops"><span>'+fmt(at)+' committed</span><strong>⚔</strong><span>'+fmt(bt)+' committed</span></div><div class="front-track"><i style="left:'+clamp(w.progress||50,0,100)+'%"></i></div><small>'+(w.frontPosition>=0?(a?.name||'Attacker')+' advancing':(b?.name||'Defender')+' advancing')+' · '+Math.abs(Math.round(w.frontPosition||0))+'% · losses '+fmt(w.totalLossA||0)+' / '+fmt(w.totalLossB||0)+'</small></div>'}).join('')||'<p class="muted">No active fronts.</p>';$('historyStats').innerHTML='<div class="rank"><b>World population</b><span>'+fmt(active().reduce((s,x)=>s+x.population,0))+'</span></div><div class="rank"><b>World GDP</b><span>'+fmt(active().reduce((s,x)=>s+x.gdp,0))+'</span></div><div class="rank"><b>Total casualties</b><span>'+fmt(active().reduce((s,x)=>s+x.casualties,0))+'</span></div><div class="rank"><b>Recorded events</b><span>'+events.length+'</span></div>';drawHistory()}
function blendHex(a,b,t){const p=x=>[parseInt(x.slice(1,3),16),parseInt(x.slice(3,5),16),parseInt(x.slice(5,7),16)],x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*clamp(t,0,1)).toString(16).padStart(2,'0')).join('')}
function regionStyle(f){
 const p=f.properties||{},rid=String(p.iso_3166_2||p.gid||p.name||'');
 const r=regionById.get(rid),owner=countries.get(r?.owner||p.adm0_a3||p.ADM0_A3);
 let fill=owner?.color||'#59616c';
 if(layer==='stability')fill='hsl('+((owner?.stability||50)*1.15)+',48%,43%)';
 else if(layer==='population')fill='hsl('+Math.max(0,130-Math.log10((owner?.population||1)/1e6+1)*18)+',48%,43%)';
 else if(layer==='military')fill='hsl('+Math.max(0,130-Math.log10((owner?.army||1)/1000+1)*16)+',52%,43%)';
 else if(layer==='economy')fill='hsl('+Math.max(0,130-Math.log10((owner?.gdp||1)/1e9+1)*12)+',48%,43%)';
 else if(layer==='ideology')fill=({Democracy:'#347cae',Socialism:'#bb5c55',Communism:'#b23b36',Monarchy:'#b99643',Nationalism:'#8b70b5'})[owner?.ideology]||'#59616c';
 return{color:'#dbe4eb',weight:window.worldMap?.getZoom()>4?.55:.28,opacity:.9,fillColor:fill,fillOpacity:.9};
}
function draw(){if(window.regionLayer&&window.L){window.regionLayer.setStyle(regionStyle);if(window.countryOutline)window.countryOutline.bringToBack();window.regionLayer.bringToFront();renderWarVisuals()}}
function initDivisions(w,a,b){
 const na=Math.max(1,wars.filter(x=>x.a===a.id||x.b===a.id).length+1),nb=Math.max(1,wars.filter(x=>x.a===b.id||x.b===b.id).length+1),ta=Math.max(0,Math.floor(a.army*.42/na)),tb=Math.max(0,Math.floor(b.army*.42/nb)),raw=window.countryAdjacency?.get(pair(a.id,b.id))||[],parse=e=>e.split('|').map(p=>p.split(',').map(Number)),edges=raw.map(parse).filter(p=>p.length===2&&p.flat().every(Number.isFinite)),unused=new Set(edges.map((_,i)=>i)),components=[];
 while(unused.size){let stack=[unused.values().next().value],ids=[];unused.delete(stack[0]);while(stack.length){let i=stack.pop();ids.push(i);for(let j of [...unused])if(edges[j].some(p=>edges[i].some(q=>Math.abs(p[0]-q[0])<1e-5&&Math.abs(p[1]-q[1])<1e-5))){unused.delete(j);stack.push(j)}}components.push(ids)}
 let fronts=components.map((ids,i)=>{let seg=ids.map(k=>edges[k]),pts=seg.flat(),length=seg.reduce((v,p)=>v+Math.hypot((p[1][0]-p[0][0])*Math.cos((p[1][1]+p[0][1])*Math.PI/360),p[1][1]-p[0][1]),0);return{id:'F'+i,segments:seg,length:Math.max(.01,length),center:pts.length?[pts.reduce((v,p)=>v+p[1],0)/pts.length,pts.reduce((v,p)=>v+p[0],0)/pts.length]:null,progress:0,battles:0,lossA:0,lossB:0,strategicPriority:1,threat:1}});
 if(!fronts.length){const A=window.countryCenters?.[a.id],B=window.countryCenters?.[b.id];fronts=[{id:'NAVAL',segments:[],length:1,center:A&&B?[(A[0]+B[0])/2,(A[1]+B[1])/2]:null,progress:0,battles:0,lossA:0,lossB:0,naval:true,strategicPriority:1,threat:1}]}
 const split=(n,name)=>{let rem=n;return [0,1,2,3].map(i=>{let v=i===3?rem:Math.floor(n/4);rem-=v;return{name:name+' Army Group '+(i+1),troops:v,initial:v,losses:0,experience:0,order:i===0?'assault':i===3?'reserve':'line'}})};
 const longest=Math.max(...fronts.map(f=>f.length));fronts.forEach(f=>{f.strategicPriority=clamp(.9+.3*f.length/longest,.9,1.2);f.threat=1});
 const allocate=(total,side)=>{const weights=fronts.map(f=>Math.sqrt(f.length)*f.strategicPriority*clamp(1+(side==='a'?-f.progress:f.progress)/180,.65,1.45)),sum=weights.reduce((v,n)=>v+n,0)||1;let remaining=total;return fronts.map((f,i)=>{const n=i===fronts.length-1?remaining:Math.floor(total*weights[i]/sum);remaining-=n;return n})};
 const allocA=allocate(ta,'a'),allocB=allocate(tb,'b');
 w.fronts=fronts.map((f,i)=>{let x=allocA[i],y=allocB[i];f.committedA=x;f.committedB=y;f.divisions={a:split(x,a.name),b:split(y,b.name)};return f});
 w.committedA=ta;w.committedB=tb;w.divisions={a:split(ta,a.name),b:split(tb,b.name)};w.reserves={a:Math.floor(a.army*.25/na),b:Math.floor(b.army*.25/nb)};w.initialCommitted={a:ta,b:tb};w.frontPosition=0;w.progress=50;w.battles=0;w.totalLossA=0;w.totalLossB=0
}
function declare(){let a=selectedCountry(),b=target();if(!a||!b||a.id===b.id)return log('Select a country and a different target.');if(wars.some(w=>pair(w.a,w.b)===pair(a.id,b.id)))return log('These countries are already at war.');if(rel(a.id,b.id).alliance)return log('War declaration blocked: these countries are allied.');let w={a:a.id,b:b.id,months:0,progress:0,type:'Land war',blockade:false};initDivisions(w,a,b);wars.push(w);a.warSupport=clamp(a.warSupport+10,0,100);log(a.name+' declared war on '+b.name+'.');dashboard();draw();inspect(a.id)}
function peace(){wars=[];log('Global ceasefire enforced by sandbox controls.');dashboard()}
function diplomacy(kind){let a=selectedCountry(),b=target();if(!a||!b||a.id===b.id)return log('Select two different countries.');let r=rel(a.id,b.id);if(kind==='alliance'){if(wars.some(w=>pair(w.a,w.b)===pair(a.id,b.id)))return log('Cannot ally while at war.');r.alliance=true;r.value=clamp(r.value+35,-100,100);log(a.name+' and '+b.name+' formed an alliance.')}if(kind==='improve'){r.value=clamp(r.value+20,-100,100);log(a.name+' improved diplomatic relations with '+b.name+'.')}if(kind==='trade'){r.trade=true;r.value=clamp(r.value+10,-100,100);log('Trade agreement signed: '+a.name+' ↔ '+b.name+'.')}if(kind==='break'){r.alliance=false;r.trade=false;r.embargo=true;r.value=clamp(r.value-40,-100,100);log(a.name+' severed diplomatic ties with '+b.name+'.')}relations[pair(a.id,b.id)]=r;dashboard()}
function military(){let c=selectedCountry(),b=target();if(!c)return log('Select a country first.');let op=$('operation').value;if(op==='mobilize'){let n=Math.min(c.manpower,c.population*.025);c.army+=n;c.manpower-=n;c.treasury-=n*1200;log(c.name+' mobilized '+fmt(n)+' reservists.')}if(op==='demobilize'){let n=c.army*.2;c.army-=n;c.manpower+=n;log(c.name+' demobilized '+fmt(n)+' troops.')}if(op==='fortify'){let cost=c.gdp*.012;if(c.treasury<cost)return log('Insufficient treasury for fortifications.');c.treasury-=cost;c.fort++;log(c.name+' upgraded border fortifications to level '+c.fort+'.')}if(op==='navy'){let cost=c.gdp*.008;if(c.treasury<cost)return log('Insufficient treasury.');c.treasury-=cost;c.navy+=Math.max(5,c.industry*.4);log(c.name+' expanded its navy.')}if(op==='air'){let cost=c.gdp*.01;if(c.treasury<cost)return log('Insufficient treasury.');c.treasury-=cost;c.air+=Math.max(10,c.industry*.7);log(c.name+' expanded its air force.')}if(op==='invade'){if(!b||b.id===c.id)return log('Choose an enemy target.');if(!wars.some(w=>pair(w.a,w.b)===pair(c.id,b.id)))return log('Declare war before launching an invasion.');let w=wars.find(w=>pair(w.a,w.b)===pair(c.id,b.id));w.type='Invasion';w.frontPosition=clamp((w.frontPosition||0)+12,-100,100);w.progress=50+w.frontPosition/2;log(c.name+' launched an amphibious/land invasion against '+b.name+'.')}if(op==='blockade'){if(!b||b.id===c.id)return log('Choose a target.');if(c.navy<b.navy*.5)return log('Insufficient naval strength to blockade.');let w=wars.find(w=>pair(w.a,w.b)===pair(c.id,b.id));if(!w)return log('A blockade requires an active war.');w.blockade=true;w.type='Naval blockade';log(c.name+' established a naval blockade against '+b.name+'.')}dashboard();inspect(c.id)}
function build(){let c=selectedCountry();if(!c)return log('Select a country.');let p=$('project').value,cost={industry: c.gdp*.025,infrastructure:c.gdp*.018,agriculture:c.gdp*.012,university:c.gdp*.02,port:c.gdp*.015,airbase:c.gdp*.017}[p];if(c.treasury<cost)return log('Insufficient treasury to fund this project.');c.treasury-=cost;c.projects.push(p);if(p==='industry')c.industry+=rand(3,8);if(p==='infrastructure')c.gdp*=1.025;if(p==='agriculture')c.food=clamp(c.food+18,0,100);if(p==='university')c.technology+=.08;if(p==='port')c.navy+=12;if(p==='airbase')c.air+=20;log(c.name+' completed a '+p+' development project.');inspect(c.id)}
function research(){let c=selectedCountry();if(!c)return log('Select a country.');let r=$('research').value;if(c.research.includes(r))return log('This research is already completed.');let cost=c.gdp*.01;if(c.treasury<cost)return log('Insufficient research funding.');c.treasury-=cost;c.research.push(r);c.technology+=.06;if(r==='military')c.army*=1.06;if(r==='industry')c.industry+=5;if(r==='medicine')c.population*=1.003;if(r==='agriculture')c.food=clamp(c.food+12,0,100);if(r==='electronics')c.air*=1.05;log(c.name+' completed research: '+r+'.');inspect(c.id)}
function policy(){let c=selectedCountry();if(!c)return log('Select a country.');let p=$('policy').value;if(p==='welfare'){c.treasury-=c.gdp*.02;c.stability=clamp(c.stability+8,0,100);c.unrest=Math.max(0,c.unrest-8)}if(p==='tax'){c.treasury+=c.gdp*.025;c.stability-=4;c.unrest+=4}if(p==='taxcut'){c.treasury-=c.gdp*.02;c.stability+=3;c.unrest-=2}if(p==='conscription'){let n=Math.min(c.manpower,c.population*.015);c.army+=n;c.manpower-=n;c.stability-=5;c.unrest+=6}if(p==='reform'){c.government='Constitutional Republic';c.stability+=4;c.ideology='Democracy';c.unrest=Math.max(0,c.unrest-5)}if(p==='propaganda'){c.warSupport=clamp(c.warSupport+18,0,100);c.stability+=2;c.unrest+=2}if(p==='emergency'){c.government='Emergency Administration';c.stability+=8;c.unrest+=10}if(p==='election'){c.government='Elected Government';c.stability+=5;c.unrest=Math.max(0,c.unrest-4)}c.stability=clamp(c.stability,0,100);c.unrest=clamp(c.unrest,0,100);log(c.name+' enacted domestic policy: '+p+'.');inspect(c.id)}
function editor(){let c=selectedCountry(),b=countries.get($('editorTarget').value),op=$('editorAction').value;if(!c)return log('Select the country exercising God Mode.');if(!b)return log('Select a target country.');if(op==='annex'||op==='puppet'){if(c.id===b.id)return log('Choose a different target.');b.owner=c.id;b.puppet=op==='puppet';b.alive=false;if(op==='annex'){c.population+=b.population;c.gdp+=b.gdp;c.army+=b.army}else{c.population+=b.population*.15;c.gdp+=b.gdp*.1}log(c.name+(op==='annex'?' annexed ':' established a puppet over ')+b.name+'.')}if(op==='release'||op==='independence'){b.alive=true;b.owner=b.id;b.puppet=false;log(b.name+' restored its independence.')}if(op==='changeColor'){b.color=colors[Math.floor(rand(0,colors.length))];log(b.name+' received a new map color.')}if(op==='boost'){b.alive=true;b.owner=b.id;b.army*=2;b.gdp*=1.5;b.treasury+=b.gdp*.2;b.stability=90;log('God Mode boosted '+b.name+'.')}if(op==='weaken'){b.army*=.25;b.gdp*=.6;b.stability=20;b.unrest=80;log('God Mode weakened '+b.name+'.')}if(op==='collapse'){b.alive=false;b.stability=0;log(b.name+' collapsed and ceased to function as a state.')}wars=wars.filter(w=>countries.get(w.a)?.alive&&countries.get(w.b)?.alive);dashboard();draw();inspect(c.id)}
function forceWarSelected(){let a=selectedCountry(),b=countries.get($('editorTarget').value);if(!a)return log('Select an attacker on the map first.');if(!b||a.id===b.id)return log('Select a different target on the map first.');if(wars.some(w=>pair(w.a,w.b)===pair(a.id,b.id)))return log('These countries are already at war.');let r=rel(a.id,b.id);r.alliance=false;r.trade=false;r.embargo=false;r.value=-100;relations[pair(a.id,b.id)]=r;let w={a:a.id,b:b.id,months:0,progress:0,type:'Land war',blockade:false,forced:true};initDivisions(w,a,b);wars.push(w);a.warSupport=100;b.warSupport=100;log('GOD MODE WAR: '+a.name+' vs '+b.name+'. Both armies deployed to the front.');dashboard();draw();inspect(a.id)}
function createCountry(){let n=$('newName').value.trim();if(!n)return log('Enter a country name.');let id='CUSTOM-'+(++worldId);let c=make({id,properties:{}},countries.size,n);c.id=id;c.owner=id;countries.set(id,c);custom.push(id);$('newName').value='';log('Custom country created: '+n+'. It is available in the country ledger.');dashboard();inspect(id)}
function startCivilWar(g){if(wars.some(w=>w.isCivil&&w.parentId===g.id))return;const id='REB-'+g.id+'-'+year+'-'+month+'-'+(++worldId),share=clamp(.2+(g.unrest-70)*.006+(48-g.stability)*.004,.2,.48),pop=g.population*share,gdp=g.gdp*share,army=Math.max(1000,g.army*share*.72),manpower=g.manpower*share*.65;g.population-=pop;g.gdp-=gdp;g.army=Math.max(0,g.army-army);g.manpower=Math.max(0,g.manpower-manpower);g.stability=clamp(g.stability+5,0,100);g.unrest=clamp(g.unrest-13,0,100);const r={...g,id,name:g.name+' Revolutionary Front',color:'#b94c4c',population:pop,gdp,treasury:g.treasury*.12,army,manpower,casualties:0,alive:true,owner:id,exhaustion:8,stability:48,unrest:38,warSupport:85,morale:68,readiness:58,logistics:Math.max(20,g.logistics*.65),fort:0,projects:[],research:[],puppet:false,government:'Revolutionary Council'};countries.set(id,r);const w={a:id,b:g.id,months:0,progress:0,type:'Civil war',isCivil:true,parentId:g.id};initDivisions(w,r,g);wars.push(w);log('CIVIL WAR: '+r.name+' rises with '+fmt(army)+' troops.');dashboard();draw()}
function trigger(){let e=$('worldEvent').value;for(let c of active()){if(e==='boom'){c.gdp*=1.08;c.treasury+=c.gdp*.02}if(e==='recession'){c.gdp*=.88;c.stability-=5}if(e==='plague'){c.population*=.985;c.stability-=7;c.food-=5}if(e==='revolution'){c.unrest=clamp(c.unrest+38,0,100);c.stability=clamp(c.stability-28,0,100);if(!wars.some(w=>w.isCivil&&w.parentId===c.id))startCivilWar(c)}if(e==='peace'){wars=[];c.stability+=2}}log('Global event: '+e+'.');dashboard();draw()}
function applyRules(){ruleset=$('ruleset').value;log('World ruleset changed to '+ruleset+'.');}
function simulateWar(w,a,b){
 if(!w.fronts?.length)initDivisions(w,a,b);
 const totalArmyA=Math.max(0,a.army||0),totalArmyB=Math.max(0,b.army||0);
 let laTotal=0,lbTotal=0,weighted=0,weight=0,frontReports=[];
 const sidePower=(country,troops,enemy,front,side)=>{
  const tech=clamp((country.technology||1),.35,3.5);
  const readiness=clamp((country.readiness||50)/100,.2,1.2);
  const morale=clamp((country.morale||50)/100,.2,1.2);
  const logistics=clamp((country.logistics||50)/100,.12,1.15);
  const equipment=clamp((country.equipment||50)/100,.2,1.25);
  const food=clamp((country.food||50)/100,.25,1.1);
  const air=clamp(1+((country.air||0)-(enemy.air||0))*.00035,.72,1.35);
  const fort=side==='b'?1+clamp(country.fort||0,0,20)*.045:1;
  const stance=front.stance?.[side]||'balanced';
  const stanceMod=stance==='push'?1.16:stance==='hold'?.94:1;
  const width=clamp(Math.sqrt(Math.max(.1,front.length||1)),.65,2.1);
  const fatigue=clamp(1-(country.exhaustion||0)*.004,.55,1);
  return Math.max(0,troops)*tech*readiness*morale*logistics*equipment*food*air*fort*stanceMod*width*fatigue;
 };
 for(const f of w.fronts){
  f.stance=f.stance||{a:'balanced',b:'balanced'};
  f.reserve=f.reserve||{a:0,b:0};
  f.supplyDays=f.supplyDays||{a:30,b:30};
  const sum=k=>(f.divisions?.[k]||[]).reduce((v,d)=>v+Math.max(0,d.troops||0),0);
  const at=sum('a'),bt=sum('b');
  if(at<=0||bt<=0){weighted+=clamp(f.progress||0,-100,100)*Math.max(.1,f.length||1);weight+=Math.max(.1,f.length||1);continue}
  const pa=sidePower(a,at,b,f,'a'),pb=sidePower(b,bt,a,f,'b');
  const adv=pa/Math.max(1,pa+pb);
  const supplyA=clamp((a.logistics||50)/85,.25,1.15),supplyB=clamp((b.logistics||50)/85,.25,1.15);
  f.supplyDays.a=clamp(f.supplyDays.a+(supplyA>.8?1.2:-2.4),0,60);
  f.supplyDays.b=clamp(f.supplyDays.b+(supplyB>.8?1.2:-2.4),0,60);
  const shortageA=f.supplyDays.a<7?.55:f.supplyDays.a<14?.78:1;
  const shortageB=f.supplyDays.b<7?.55:f.supplyDays.b<14?.78:1;
  const pressure=clamp(Math.abs(adv-.5)*2,0,1);
  const tempo=clamp((f.stance.a==='push'||f.stance.b==='push')?1.18:1,.8,1.25);
  const baseLoss=.00065+pressure*.00135;
  const la=Math.min(at,Math.max(0,at*baseLoss*(.72+adv)*shortageA*rand(.78,1.22)));
  const lb=Math.min(bt,Math.max(0,bt*baseLoss*(1.28-adv)*shortageB*rand(.78,1.22)));
  for(const [side,n] of [['a',la],['b',lb]]){
   const ds=f.divisions[side],tot=ds.reduce((v,d)=>v+Math.max(0,d.troops||0),0)||1;
   let remaining=n;
   ds.forEach((d,i)=>{const share=i===ds.length-1?remaining:n*d.troops/tot;const loss=Math.min(d.troops,share);d.troops-=loss;d.losses=(d.losses||0)+loss;remaining-=loss;d.experience=clamp((d.experience||0)+loss/Math.max(1,d.initial||d.troops+loss)*5,0,100)});
  }
  const fortDrag=f.stance.b==='hold'?.78:1;
  const momentum=(adv-.5)*10*tempo*fortDrag;
  f.progress=clamp((f.progress||0)+momentum+rand(-.55,.55),-100,100);
  f.lastAdvantage=adv;f.lastPowerA=pa;f.lastPowerB=pb;f.lastLossA=la;f.lastLossB=lb;
  f.lossA=(f.lossA||0)+la;f.lossB=(f.lossB||0)+lb;f.battles=(f.battles||0)+1;
  laTotal+=la;lbTotal+=lb;const fw=Math.max(.1,f.length||1);weighted+=f.progress*fw;weight+=fw;
  frontReports.push({id:f.id,a:at,b:bt,adv,la,lb,progress:f.progress});
  // Region-level occupation: a sustained breakthrough takes a real administrative
  // subdivision from the defender instead of tinting the whole country.
  if(Math.abs(f.progress)>=14&&regions.length){
   const attacker=f.progress>0?a:b,defender=f.progress>0?b:a;
   const candidates=regions.filter(r=>r.owner===defender.id&&r.countryId===defender.id);
   if(candidates.length){
    const origin=f.center||window.countryCenters?.[defender.id]||[0,0];
    candidates.sort((x,y)=>{
     const dx=Math.hypot((x.center[0]-origin[0])*Math.cos(origin[0]*Math.PI/180),x.center[1]-origin[1]);
     const dy=Math.hypot((y.center[0]-origin[0])*Math.cos(origin[0]*Math.PI/180),y.center[1]-origin[1]);
     return dx-dy;
    });
    const region=candidates[0];
    region.owner=attacker.id;region.occupiedBy=attacker.id;region.capturedAt={month,year};
    f.capturedRegions=(f.capturedRegions||0)+1;f.progress*=.42;
    log('TERRITORY CAPTURED · '+attacker.name+' occupied '+region.name+' in '+defender.name+'.');
    if(window.regionLayer)window.regionLayer.setStyle(regionStyle);
   }
  }
 }
 if(laTotal+lbTotal>0){
  a.army=Math.max(0,totalArmyA-laTotal);b.army=Math.max(0,totalArmyB-lbTotal);
  a.casualties=(a.casualties||0)+laTotal;b.casualties=(b.casualties||0)+lbTotal;
  a.manpower=Math.max(0,a.manpower-laTotal*.38);b.manpower=Math.max(0,b.manpower-lbTotal*.38);
  a.exhaustion=clamp((a.exhaustion||0)+.035+laTotal/Math.max(1,totalArmyA)*2.1,0,100);
  b.exhaustion=clamp((b.exhaustion||0)+.035+lbTotal/Math.max(1,totalArmyB)*2.1,0,100);
  a.morale=clamp((a.morale||50)-laTotal/Math.max(1,totalArmyA)*7,5,100);
  b.morale=clamp((b.morale||50)-lbTotal/Math.max(1,totalArmyB)*7,5,100);
 }
 w.totalLossA=(w.totalLossA||0)+laTotal;w.totalLossB=(w.totalLossB||0)+lbTotal;
 w.frontPosition=weight?weighted/weight:0;w.progress=50+w.frontPosition/2;
 // Reinforce threatened fronts from the war's uncommitted reserve pool.
 for(const side of ['a','b']){
  let pool=Math.max(0,w.reserves?.[side]||0);
  if(pool<1)continue;
  const candidates=w.fronts.filter(f=>(f.divisions?.[side]||[]).length).sort((x,y)=>{
   const sx=(x.divisions[side].reduce((v,d)=>v+d.troops,0))/Math.max(1,x.length);
   const sy=(y.divisions[side].reduce((v,d)=>v+d.troops,0))/Math.max(1,y.length);
   return sx-sy;
  });
  for(const f of candidates){
   if(pool<1)break;
   const current=f.divisions[side].reduce((v,d)=>v+d.troops,0);
   const target=Math.max(0,(w.initialCommitted?.[side]||current)*1.12);
   const need=Math.max(0,target-current);
   const amount=Math.min(pool,Math.max(0,Math.ceil(need*.12)));
   if(amount>0){f.divisions[side].push({name:'Reserve reinforcement',troops:amount,initial:amount,losses:0,experience:0,order:'reinforcement'});pool-=amount;}
  }
  w.reserves[side]=pool;
 }
 w.committedA=w.fronts.reduce((v,f)=>v+(f.divisions?.a||[]).reduce((z,d)=>z+Math.max(0,d.troops||0),0),0);
 w.committedB=w.fronts.reduce((v,f)=>v+(f.divisions?.b||[]).reduce((z,d)=>z+Math.max(0,d.troops||0),0),0);
 w.months++;w.lastReport={date:date(),fronts:frontReports,lossA:laTotal,lossB:lbTotal};
 if(laTotal+lbTotal>0)log('FRONT REPORT · '+a.name+' / '+b.name+' · '+w.fronts.length+' fronts · '+fmt(laTotal)+' vs '+fmt(lbTotal)+' casualties.');
 const capturedFront=w.frontPosition>=100?a:w.frontPosition<=-100?b:null;
 const exhaustedA=a.exhaustion>=100||a.army<=Math.max(100,a.population*.000025),exhaustedB=b.exhaustion>=100||b.army<=Math.max(100,b.population*.000025);
 if(capturedFront||exhaustedA||exhaustedB){
  const loser=capturedFront?(capturedFront===a?b:a):(exhaustedA?a:b),winner=capturedFront||(exhaustedA?b:a);
  loser.alive=false;loser.owner=winner.id;winner.population+=loser.population*.2;winner.gdp+=loser.gdp*.2;winner.army+=Math.min(loser.army*.15,loser.population*.002);
  log('CAPITULATION · '+loser.name+' surrenders to '+winner.name+'.');wars=wars.filter(x=>x!==w);
 }else if(w.months>180&&Math.random()<.018){log('ARMISTICE · '+a.name+' and '+b.name+'.');wars=wars.filter(x=>x!==w)}
}
function simulate(){month++;if(month>12){month=1;year++}for(let c of active()){let growth=rand(-.0005,.0012)+(c.food<20?-.001:0);c.population=Math.max(10000,c.population*(1+growth));let economic=rand(-.003,.004)+(c.technology*.000025)+(c.industry/100000)+(ruleset==='economic'?.001:0);c.gdp=Math.max(1e8,c.gdp*(1+economic));c.income=c.gdp*.012;c.expenses=c.gdp*.009;c.treasury+=c.income-c.expenses;let target=clamp(82-c.unrest*.36-c.exhaustion*.2+(c.food-50)*.1+(c.treasury<0?-8:2),25,94);c.stability=clamp(c.stability+(target-c.stability)*.06+rand(-.25,.25),0,100);c.unrest=clamp(c.unrest+rand(-.15,.28)+(c.stability<45?.5:-.05)+(c.food<20?.35:0),0,100);c.technology+=rand(.00005,.00025);c.food=clamp(c.food+rand(-.8,.8),0,100);c.morale=clamp(c.morale+rand(-.3,.2),0,100);c.readiness=clamp(c.readiness+rand(-.35,.25),0,100);if(c.unrest>72&&c.stability<48&&!wars.some(w=>w.isCivil&&w.parentId===c.id)&&Math.random()<(ruleset==='chaos'?.28:.12))startCivilWar(c)}const warLimit=Math.max(3,Math.floor(active().length*(ruleset==='chaos'?.16:.10)));if(ruleset!=='peaceful'&&wars.length<warLimit){for(const c of active()){if(wars.length>=warLimit)break;if(Math.random()<(ruleset==='chaos'?.14:.09)&&!wars.some(w=>w.a===c.id||w.b===c.id)){let available=active().filter(x=>x.id!==c.id&&!wars.some(w=>w.a===x.id||w.b===x.id)&&!rel(c.id,x.id).alliance);let neighbors=available.filter(x=>countriesShareLandBorder(c.id,x.id));let pool=neighbors.length?neighbors:available.filter(x=>c.navy>=x.navy*.35&&x.navy>0);if(!neighbors.length&&Math.random()>.25)pool=[];if(pool.length){let weights=pool.map(x=>Math.max(.15,1+(-rel(c.id,x.id).value/100)*.8)*(neighbors.length?1:0.025));let roll=Math.random()*weights.reduce((v,n)=>v+n,0),idx=0;while(roll>weights[idx]&&idx<weights.length-1)roll-=weights[idx++];let b=pool[idx],land=countriesShareLandBorder(c.id,b.id),w={a:c.id,b:b.id,months:0,progress:50,frontPosition:0,type:land?'Land war':'Naval invasion',generated:true};initDivisions(w,c,b);wars.push(w);log('WAR BREAKS OUT: '+c.name+(land?' attacks neighboring ':' launches an overseas war against ')+b.name+'.')}}}}for(const w of [...wars]){let a=countries.get(w.a),b=countries.get(w.b);if(!a||!b||!a.alive||!b.alive){wars=wars.filter(x=>x!==w);continue}simulateWar(w,a,b)}history.push({date:date(),pop:active().reduce((s,c)=>s+c.population,0),gdp:active().reduce((s,c)=>s+c.gdp,0)});history=history.slice(-120);dashboard();draw();if(selected)inspect(selected.id)}
function saveData(){return {version:7,month,year,countries:[...countries],regions:regions.map(r=>({id:r.id,owner:r.owner,occupiedBy:r.occupiedBy,capturedAt:r.capturedAt||null})),wars,events,relations,history,ruleset,custom,worldId}}
function save(){localStorage.setItem('observe_save_v7',JSON.stringify(saveData()));log('World saved on this device.')}
function loadData(d){for(const [,c] of (d.countries||[])){if(c.stability<1)c.stability=58;if(c.unrest>85)c.unrest=35}month=d.month||1;year=d.year||1;countries=new Map(d.countries||[]);if(Array.isArray(d.regions)){const owners=new Map(d.regions.map(r=>[r.id,r]));for(const r of regions){const saved=owners.get(r.id);if(saved){r.owner=saved.owner||r.countryId;r.occupiedBy=saved.occupiedBy||null;r.capturedAt=saved.capturedAt||null;}}}wars=d.wars||[];events=d.events||[];relations=d.relations||{};history=d.history||[];ruleset=d.ruleset||'standard';custom=d.custom||[];worldId=d.worldId||1;dashboard();draw();if(selected&&countries.has(selected.id))inspect(selected.id);else selected=null;log('World save loaded.')}
function load(){try{let raw=localStorage.getItem('observe_save_v7')||localStorage.getItem('observe_save_v6')||localStorage.getItem('observe_save_v5')||localStorage.getItem('observe_save_v4');if(!raw)throw Error();loadData(JSON.parse(raw));localStorage.setItem('observe_save_v7',JSON.stringify(saveData()))}catch{log('No valid local save found.')}}
function reset(){month=1;year=1;wars=[];events=[];relations={};history=[];countries.clear();features.forEach((f,i)=>countries.set(String(f.id),make(f,i)));for(const r of regions){r.owner=r.countryId;r.occupiedBy=null;r.capturedAt=null;}normalizeWorld();selected=null;log('World reset. New simulation initialized.');$('selectedName').textContent='Select a country';$('selectedStats').innerHTML='';dashboard();draw()}
function exportSave(){let blob=new Blob([JSON.stringify(saveData(),null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='observe-world-save.json';a.click();URL.revokeObjectURL(a.href)}
function drawHistory(){let c=$('historyChart');if(!c)return;let x=c.getContext('2d'),w=c.width=c.clientWidth*2,h=c.height=360;x.clearRect(0,0,w,h);if(history.length<2)return;let vals=history.map(v=>v.gdp),lo=Math.min(...vals),hi=Math.max(...vals);x.strokeStyle='#6bc5d8';x.lineWidth=3;x.beginPath();history.forEach((v,i)=>{let px=i/(history.length-1)*w,py=h-20-(v.gdp-lo)/(hi-lo||1)*(h-40);i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke()}
async function mapInit(){
  if(!window.L){$('mapStatus').textContent='MAP LIBRARY FAILED TO LOAD';log('Map startup failed: Leaflet library unavailable.');return}
  try{
    window.worldMap=L.map('realMap',{zoomControl:false,worldCopyJump:true}).setView([20,0],2);
    L.control.zoom({position:'bottomright'}).addTo(window.worldMap);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:7,attribution:'© OpenStreetMap contributors'}).addTo(window.worldMap);
    window.countryCenters={};
    const response=await fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson');
    if(!response.ok)throw Error('World map data request failed ('+response.status+')');
    const data=await response.json();features=data.features||[];
    countries.clear();
    features.forEach((f,i)=>{
      const p=f.properties||{},id=countryCode(f);
      if(!id||id==='-99'||countries.has(id))return;
      const c=make({id,properties:p},i,p.ADMIN||p.name||p.NAME||id);c.id=id;c.owner=id;
      countries.set(id,c);
    });
    normalizeWorld();
    buildCountryAdjacency();
    window.countryOutline=L.geoJSON(data,{style:{color:'#d7e0e7',weight:.75,fillOpacity:0.02,opacity:.8},
      onEachFeature:(f,ly)=>{const id=countryCode(f);if(!countries.has(id))return;const center=ly.getBounds().getCenter();window.countryCenters[id]=[center.lat,center.lng];}
    }).addTo(window.worldMap);
    // First-order administrative divisions are independently owned map units.
    $('mapStatus').textContent='LOADING PROVINCES · COUNTRY MAP READY';
    const rr=await fetch('https://datahub.io/core/geo-ne-admin1/_r/-/data/admin1.geojson');
    if(!rr.ok)throw Error('Province dataset request failed ('+rr.status+')');
    const rd=await rr.json();regions=(rd.features||[]).map((feature,i)=>{
      const p=feature.properties||{},countryId=String(p.adm0_a3||p.ADM0_A3||'').toUpperCase();
      const name=p.name||p.name_en||('Region '+(i+1)),id=String(p.iso_3166_2||p.gid||countryId+'-'+i);
      const center=L.geoJSON(feature).getBounds().getCenter();
      return{id,name,countryId,owner:countryId,center:[center.lat,center.lng],feature,occupiedBy:null};
    }).filter(x=>countries.has(x.countryId));
    regionById=new Map(regions.map(x=>[x.id,x]));
    window.regionLayer=L.geoJSON({type:'FeatureCollection',features:regions.map(x=>x.feature)},{
      style:regionStyle,
      onEachFeature:(feature,ly)=>{const p=feature.properties||{},id=String(p.iso_3166_2||p.gid||p.name||''),r=regionById.get(id);if(!r)return;ly.bindTooltip(r.name+' · '+(countries.get(r.owner)?.name||r.countryId));ly.on('click',()=>selectMapCountry(r.owner));}
    }).addTo(window.worldMap);
    window.countryOutline.bringToBack();window.regionLayer.bringToFront();
    $('mapStatus').textContent='WORLD MAP READY · '+countries.size+' COUNTRIES · '+regions.length+' REGIONS';
    log('World initialized with '+countries.size+' countries and '+regions.length+' independently owned administrative regions.');
    dashboard();draw();window.worldMap.invalidateSize();
  }catch(err){$('mapStatus').textContent='MAP LOAD ERROR · '+err.message;log('Map initialization failed: '+err.message)}
}
function countriesShareLandBorder(a,b){return !!(window.countryAdjacency?.get(pair(a,b))||[]).length}
function buildCountryAdjacency(){const edgeOwners=new Map(),pairs=new Map();const point=p=>Math.round(p[0]*1e5)+','+Math.round(p[1]*1e5);const ring=(r,id)=>{for(let i=1;i<r.length;i++){let a=point(r[i-1]),b=point(r[i]);if(a===b)continue;let k=a<b?a+'|'+b:b+'|'+a;if(!edgeOwners.has(k))edgeOwners.set(k,new Set());edgeOwners.get(k).add(id)}};for(const f of features){const p=f.properties||{},id=countryCode(f);if(!countries.has(id)||!f.geometry)continue;const g=f.geometry;if(g.type==='Polygon')g.coordinates.forEach(r=>ring(r,id));else if(g.type==='MultiPolygon')g.coordinates.forEach(poly=>poly.forEach(r=>ring(r,id)))}for(const [edge,owners] of edgeOwners){const ids=[...owners];if(ids.length!==2)continue;const k=ids.sort().join('|');if(!pairs.has(k))pairs.set(k,[]);pairs.get(k).push(edge)}window.countryAdjacency=pairs;return pairs}
function renderWarVisuals(){
 if(!window.worldMap||!window.L)return;
 if(window.warVisuals)window.warVisuals.clearLayers();else window.warVisuals=L.layerGroup().addTo(window.worldMap);
 const map=window.worldMap,fmtExact=n=>Math.max(0,Math.round(n||0)).toLocaleString('en-US');
 const addNumber=(latlng,value,enemy)=>{if(value<=0)return;const icon=L.divIcon({className:enemy?'front-number enemy':'front-number',html:'<span>'+fmtExact(value)+'</span>',iconSize:[90,18],iconAnchor:[45,9]});window.warVisuals.addLayer(L.marker(latlng,{icon,interactive:false,zIndexOffset:900}))};
 for(const w of wars)for(const f of w.fronts||[]){
  const segments=f.segments||[],projected=[];
  for(const seg of segments){if(!seg||seg.length!==2)continue;const ll=[[seg[0][1],seg[0][0]],[seg[1][1],seg[1][0]]],p=map.latLngToContainerPoint(ll[0]),q=map.latLngToContainerPoint(ll[1]),dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);if(len<1)continue;window.warVisuals.addLayer(L.polyline(ll,{color:'#111923',weight:5,opacity:.95,interactive:false}));window.warVisuals.addLayer(L.polyline(ll,{color:'#d9e2e8',weight:1.6,opacity:.95,interactive:false}));projected.push({p,q,dx,dy,len})}
  const total=projected.reduce((n,x)=>n+x.len,0);
  const at=(f.divisions?.a||[]).reduce((n,d)=>n+Math.max(0,d.troops||0),0),bt=(f.divisions?.b||[]).reduce((n,d)=>n+Math.max(0,d.troops||0),0);
  let center=f.center;
  if(!center&&window.countryCenters?.[w.a]&&window.countryCenters?.[w.b]){const A=window.countryCenters[w.a],B=window.countryCenters[w.b];center=[(A[0]+B[0])/2,(A[1]+B[1])/2]}
  if(!center)continue;
  const A=window.countryCenters?.[w.a],B=window.countryCenters?.[w.b],progress=clamp(f.progress||0,-100,100),destination=progress>=0?B:A;
  let current=[center[0],center[1]];
  if(destination){const t=Math.abs(progress)/100;current=[center[0]+(destination[0]-center[0])*t,center[1]+(destination[1]-center[1])*t]}
  if(Math.abs(progress)>.5){window.warVisuals.addLayer(L.polyline([center,current],{color:progress>0?'#58b7ff':'#ff746c',weight:3+Math.abs(progress)/35,opacity:.9,dashArray:'7 5',interactive:false}));const arrow=L.divIcon({className:'advance-arrow '+(progress>0?'blue':'red'),html:progress>0?'➤':'➤',iconSize:[24,24],iconAnchor:[12,12]});window.warVisuals.addLayer(L.marker(current,{icon:arrow,interactive:false,zIndexOffset:1000}))}
  const cp=map.latLngToContainerPoint(current),offset=total>0?Math.min(13,Math.max(7,total*.025)):9,base=map.containerPointToLatLng([cp.x,cp.y-offset]),enemy=map.containerPointToLatLng([cp.x,cp.y+offset]);
  addNumber(base,at,false);addNumber(enemy,bt,true);
 }
}function geoHit(){return null}
document.querySelectorAll('.speed').forEach(b=>b.onclick=()=>{speed=+b.dataset.speed;document.querySelectorAll('.speed').forEach(x=>x.classList.toggle('active',x===b))});
$('pauseBtn').onclick=()=>{paused=!paused;$('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE'};
$('saveBtn').onclick=save;$('loadBtn').onclick=load;$('resetBtn').onclick=reset;$('inspectBtn').onclick=()=>selected&&inspect(selected.id);
$('declareBtn').onclick=declare;$('peaceBtn').onclick=peace;$('allianceBtn').onclick=()=>diplomacy('alliance');$('improveBtn').onclick=()=>diplomacy('improve');$('tradeBtn').onclick=()=>diplomacy('trade');$('breakBtn').onclick=()=>diplomacy('break');
$('militaryAction').onclick=military;$('buildBtn').onclick=build;$('researchBtn').onclick=research;$('policyBtn').onclick=policy;$('editorApply').onclick=editor;$('forceWarBtn').onclick=forceWarSelected;$('selectCountryBtn').onclick=()=>armMapSelection('selected');$('selectTargetBtn').onclick=()=>{if(!selected)return log('Select attacker first.');armMapSelection('target')};$('createCountry').onclick=createCountry;$('triggerEvent').onclick=trigger;$('applyRules').onclick=applyRules;$('exportBtn').onclick=exportSave;
$('importFile').onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{loadData(JSON.parse(r.result))}catch{log('Invalid world save file.')}};r.readAsText(f)};
$('layerSelect').onchange=e=>{layer=e.target.value;draw()};// Leaflet zoom handlers are installed in mapInit; do not overwrite them here.
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.tabpage').forEach(x=>x.classList.toggle('active',x.id==='page-'+b.dataset.tab));renderPanels()});
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y,moved:false}});cv.addEventListener('pointermove',e=>{if(!drag)return;let dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;pan={x:drag.px+dx,y:drag.py+dy};draw()});cv.addEventListener('pointerup',e=>{if(drag&&!drag.moved&&proj){let id=geoHit(e.offsetX,e.offsetY);if(id)inspect(id)}drag=null});cv.addEventListener('wheel',e=>{e.preventDefault();zoom=clamp(zoom*(e.deltaY<0?1.1:.9),.7,8);draw()},{passive:false});
function resize(){if(window.worldMap)window.worldMap.invalidateSize();draw()}window.addEventListener('resize',resize);
function tick(t){if(!last)last=t;acc+=(t-last)/1000*speed;last=t;if(!paused&&acc>=0.75){acc=0;simulate()}requestAnimationFrame(tick)}
resize();log('World simulation engine online.');mapInit();requestAnimationFrame(tick);
})();