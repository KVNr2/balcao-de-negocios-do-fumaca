/* ================= custo da build ================= */
let GEAR = null;                    // data/gear.json: n: nome em inglês → chave, s: chave → h|a|s|c|o|w, e: chave → runas por encantamento
const SHOP_LOCS = [...CITIES,"Caerleon","Brecilien"];
const GEAR_ALIAS = {"1H Dagger":"Dagger","1H Spear":"Spear","Great Axe":"Greataxe"};
const SLOT_PT = {w:"Arma",o:"Mão secundária",h:"Cabeça",a:"Peito",s:"Pés",c:"Capa",f:"Comida",p:"Poção"};
const SLOT_ORDER = ["w","o","h","a","s","c","f","p"];
const FOOD_MAP = [[/eel stew/i,"T8_MEAL_STEW_FISH"],[/puremist|snapper/i,"T7_MEAL_ROAST_FISH"],[/beef sandwich/i,"T8_MEAL_SANDWICH"],[/beef stew/i,"T8_MEAL_STEW"],[/omelet/i,"T7_MEAL_OMELETTE"],[/pork/i,"T7_MEAL_ROAST"],[/\bstew\b/i,"T8_MEAL_STEW"]];
const POT_MAP = [[/cura/i,"T6_POTION_HEAL"],[/gigantify/i,"T7_POTION_REVIVE"],[/veneno/i,"T8_POTION_COOLDOWN"],[/invisib/i,"T8_POTION_CLEANSE"],[/resist/i,"T7_POTION_STONESKIN"]];
const CONS_PT = {T8_MEAL_STEW_FISH:"Deadwater Eel Stew",T7_MEAL_ROAST_FISH:"Roasted Puremist Snapper",T8_MEAL_SANDWICH:"Beef Sandwich",T8_MEAL_STEW:"Beef Stew",T7_MEAL_OMELETTE:"Pork Omelette",T7_MEAL_ROAST:"Roast Pork",T6_POTION_HEAL:"Poção de cura maior",T7_POTION_REVIVE:"Poção de Gigantify maior",T8_POTION_COOLDOWN:"Poção de veneno maior",T8_POTION_CLEANSE:"Poção de invisibilidade",T7_POTION_STONESKIN:"Poção de resistência maior"};
const CONTENT_PT = {brumas:"Brumas",corrompidas:"Corrompidas",barato:"Abadias, set barato",pve:"PvE"};
let bcSel = {}, bcLast = "";
let BC_CUSTOM = {}; try{ BC_CUSTOM=JSON.parse(store.get("bcCustom")||"{}"); }catch(e){}
const CONS_KEYS = {f:["T8_MEAL_STEW_FISH","T7_MEAL_ROAST_FISH","T8_MEAL_STEW","T8_MEAL_SANDWICH","T7_MEAL_OMELETTE","T7_MEAL_ROAST"],p:["T6_POTION_HEAL","T7_POTION_REVIVE","T8_POTION_COOLDOWN","T7_POTION_STONESKIN","T8_POTION_CLEANSE"]};
let GEAR_EN = null; const enOf = k => { if(!GEAR_EN){ GEAR_EN={}; for(const [nm_,k_] of Object.entries(GEAR.n)) GEAR_EN[k_]=GEAR_EN[k_]||nm_; } return GEAR_EN[k]||CONS_PT[k]||k; };
function slotOptions(s){ if(s==="f"||s==="p") return CONS_KEYS[s].map(k=>({key:k,label:nmKey(k,CONS_PT[k])}));
  return Object.keys(GEAR.s).filter(k=>GEAR.s[k]===s).map(k=>({key:k,label:nmKey(k,enOf(k))})).sort((a,b)=>a.label.localeCompare(b.label,"pt-BR")); }
function saveCustom(){ store.set("bcCustom",JSON.stringify(BC_CUSTOM)); }
function gearKey(name){ let n=(name||"").trim().replace(/^Elder's /,""); n=GEAR_ALIAS[n]||n; return GEAR.n[n]||null; }
function buildSlots(b){
  const slots={}; const add=(slot,key,label)=>{ (slots[slot]||(slots[slot]=[])); if(!slots[slot].some(x=>x.key===key)) slots[slot].push({key,label}); };
  const wk=gearKey(b.w); if(wk) add(GEAR.s[wk]||"w",wk,b.w);
  for(const g of b.g||[]){ const alts=g.split(/\s+ou\s+/); const last=alts[alts.length-1].trim().split(" ").pop();
    for(let a of alts){ a=a.trim(); if(!/\s/.test(a)&&alts.length>1) a=`${a} ${last}`; const k=gearKey(a); if(k) add(GEAR.s[k],k,a.replace(/^Elder's /,"")); } }
  const fm=FOOD_MAP.find(([rx])=>rx.test(b.f||"")); if(fm) add("f",fm[1],CONS_PT[fm[1]]);
  const pm=POT_MAP.find(([rx])=>rx.test(b.f||"")); if(pm) add("p",pm[1],CONS_PT[pm[1]]);
  if(slots.w&&/^2H_/.test(slots.w[0].key)) delete slots.o;
  return slots;
}
const priceIn = (id,city) => { const r=BMP[id]&&BMP[id][city]; return r&&r[0]>0?r[0]:null; };
function cheapest(id){ let best=null; for(const c of SHOP_LOCS){ const p=priceIn(id,c); if(p&&(!best||p<best.p)) best={p,c}; } return best; }
function setupBC(){
  const sel=$("bcBuild"); if(sel.dataset.ready===BUILDS.length+LANG) return; sel.textContent=""; sel.dataset.ready=BUILDS.length+LANG;
  const mine=new Set(LINES.filter(([k])=>wl(k)>=2).map(([k])=>k));
  const own=el("optgroup",{label:"Seu set"}); own.append(el("option",{value:"custom",text:"Montar peça por peça"})); sel.append(own);
  for(const c of ["brumas","corrompidas","barato","pve"]){ const og=el("optgroup",{label:CONTENT_PT[c]});
    BUILDS.map((b,i)=>[b,i]).filter(([b])=>b.c===c&&gearKey(b.w)).sort((x,y)=>(mine.has(y[0].l)-mine.has(x[0].l))||((y[0].pop||0)-(x[0].pop||0))).forEach(([b,i])=>og.append(el("option",{value:String(i),text:`${nm(b.w)}${mine.has(b.l)?" (sua linha)":""}`})));
    if(og.children.length) sel.append(og); }
  const saved=store.get("bcBuild"); if(saved&&sel.querySelector(`option[value="${saved}"]`)) sel.value=saved; else { const first=sel.querySelector('option:not([value="custom"])'); if(first) sel.value=first.value; }
  const tier=$("bcTier"), ench=$("bcEnch"); if(!tier.options.length){ [4,5,6,7,8].forEach(t=>tier.append(el("option",{value:String(t),text:`T${t}`}))); tier.value=store.get("bcTier")||"6"; [0,1,2,3].forEach(e=>ench.append(el("option",{value:String(e),text:`.${e}`}))); ench.value=store.get("bcEnch")||"1"; }
}
async function renderBC(){
  const note=$("bcNote"), tb=$("bcTable");
  if(!GEAR){ note.textContent="Abrindo a lista de peças…"; try{ GEAR=await need("gear"); }catch(e){ note.textContent="Não consegui abrir a lista de peças."; return; } }
  setupBC(); const sel=$("bcBuild"); if(!sel.value) return;
  const custom=sel.value==="custom", b=custom?null:BUILDS[+sel.value], t=+$("bcTier").value, e=+$("bcEnch").value; store.set("bcBuild",sel.value); store.set("bcTier",String(t)); store.set("bcEnch",String(e));
  let slots; if(custom){ slots={}; for(const s of SLOT_ORDER){ if(s==="o"&&BC_CUSTOM.w&&/^2H_/.test(BC_CUSTOM.w)) continue; slots[s]=BC_CUSTOM[s]?[{key:BC_CUSTOM[s],label:enOf(BC_CUSTOM[s])}]:[]; } } else slots=buildSlots(b);
  const key=`${sel.value}|${t}|${e}`;
  $("bcCopy").hidden=custom;
  if(bcLast!==sel.value){ bcSel={}; bcLast=sel.value; }
  const idOfSlot=(slot,k)=>slot==="f"||slot==="p"?k:`T${t}_${k}`+(e?`@${e}`:"");
  const ids=[]; for(const s in slots) for(const c of slots[s]) ids.push(idOfSlot(s,c.key));
  note.textContent="Procurando as peças nas cidades…"; tb.textContent="";
  try{ await bmFetch([...new Set(ids)],SHOP_LOCS); }catch(err){ note.textContent="Não consegui consultar os preços agora."; return; }
  if(`${$("bcBuild").value}|${$("bcTier").value}|${$("bcEnch").value}`!==key) return;
  $("bcTitle").textContent=custom?`Seu set em T${t}.${e}`:`${nm(b.w)} em T${t}.${e}`;
  const hr=tb.createTHead().insertRow(); ["Parte","Peça","Mais barato","Onde",""].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(); let total=0, missing=0, cons=0; const chosen={};
  for(const s of SLOT_ORDER){ const list=slots[s]; if(!list) continue;
    if(custom){ const tr=body.insertRow(); tr.insertCell().textContent=SLOT_PT[s]; const c1=tr.insertCell(); const opts=slotOptions(s);
      const ss=el("select",{"aria-label":`Escolher ${SLOT_PT[s].toLowerCase()}`}); ss.append(el("option",{value:"",text:"escolha…"})); opts.forEach(o=>ss.append(el("option",{value:o.key,text:o.label}))); ss.value=BC_CUSTOM[s]||"";
      ss.addEventListener("change",()=>{ if(ss.value) BC_CUSTOM[s]=ss.value; else delete BC_CUSTOM[s]; saveCustom(); renderBC(); }); c1.append(ss);
      if(!list.length){ tr.insertCell().textContent="—"; tr.insertCell().textContent=""; tr.insertCell(); continue; } }
    const pick=list.find(c=>c.key===bcSel[s])||list[0]; chosen[s]=idOfSlot(s,pick.key);
    let tr, c1; if(custom){ tr=body.rows[body.rows.length-1]; } else { tr=body.insertRow(); tr.insertCell().textContent=SLOT_PT[s]; c1=tr.insertCell(); }
    if(custom){} else if(list.length>1){ const ss=el("select",{"aria-label":`Escolher ${SLOT_PT[s].toLowerCase()}`}); list.forEach(c=>ss.append(el("option",{value:c.key,text:nmKey(c.key,c.label)}))); ss.value=pick.key; ss.addEventListener("change",()=>{ bcSel[s]=ss.value; renderBC(); }); c1.append(ss); } else c1.textContent=nmKey(pick.key,pick.label);
    const ch=cheapest(chosen[s]); const c2=tr.insertCell(); c2.className="num"; c2.textContent=ch?fmt(ch.p):"—"; tr.insertCell().textContent=ch?ch.c:"sem anúncio";
    const c4=tr.insertCell(); c4.className="small muted"; c4.textContent=s==="f"||s==="p"?"por unidade":"";
    if(s==="f"||s==="p"){ if(ch) cons+=ch.p; } else if(ch) total+=ch.p; else missing++; }
  const tr=body.insertRow(); tr.className="total"; tr.insertCell().textContent="Set"; tr.insertCell().textContent=missing?`${missing} peça${missing>1?"s":""} sem anúncio`:"comprando cada peça onde é mais barata";
  const tc=tr.insertCell(); tc.className="num"; tc.textContent=fmt(total); tr.insertCell().textContent=cons?`+ ${fmt(cons)} de comida e poção`:""; tr.insertCell();
  // uma cidade só
  const gearSlots=Object.keys(chosen).filter(s=>s!=="f"&&s!=="p"), rows=[];
  for(const c of SHOP_LOCS){ let sum=0, miss=0; for(const s of gearSlots){ const p=priceIn(chosen[s],c); if(p) sum+=p; else miss++; } rows.push({c,sum,miss}); }
  rows.sort((a,b)=>(a.miss-b.miss)||(a.sum-b.sum));
  const box=$("bcWhere"); box.textContent="";
  rows.slice(0,3).forEach((r,i)=>box.append(recItem(`${i===0?"Melhor cidade: ":""}${r.c}`,[r.miss===gearSlots.length?"Nenhuma peça anunciada":`${fmt(r.sum)} pelas ${gearSlots.length-r.miss} peças que tem lá`,r.miss?`Faltam ${r.miss}: compre ${r.miss>1?"essas":"essa"} em outra cidade`:`O set inteiro numa viagem só; ${r.sum>total?`${fmtS(r.sum-total)} a mais que caçar peça por peça`:"o mesmo que caçar peça por peça"}`])));
  const bmIdx=missing===0&&total>0?el("li",{},el("strong",{text:"Quanto dá para perder"}),el("span",{text:`Com 1 milhão de pratas, este set morre ${Math.floor(1e6/total)} vezes antes de acabar o dinheiro.`})):null; if(bmIdx) box.append(bmIdx);
  note.textContent=`Menor preço de venda anunciado nas cidades reais, Caerleon e Brecilien, qualidade normal, anúncios de até 3 dias. Comida e poção estão por unidade. ${custom?"O seu set fica salvo neste navegador.":b.src==="pesquisa"?"Esta build é de pesquisa, sem conferência.":""}`;
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.03,clearProps:"opacity,transform"});
}

/* ================= encantar ================= */
const EN_MAT = {1:["RUNE","Runa"],2:["SOUL","Alma"],3:["RELIC","Relíquia"]};
const EN_LOADED = new Set(); let enTierSel=6;
async function ensureEnch(g){
  if(EN_LOADED.has(g)) return true;
  const ok=await ensureBM(g); if(!ok) return false;
  const ids=[]; for(const k of bmKeys(g)) for(let t=4;t<=8;t++) for(let e=0;e<=3;e++) ids.push(bmId(k,t,e));
  const mats=[]; for(let t=4;t<=8;t++) for(const e of [1,2,3]) mats.push(`T${t}_${EN_MAT[e][0]}`);
  try{ await bmFetch(ids,SHOP_LOCS); await fetchIds(mats,DATA.itens,SHOP_LOCS); EN_LOADED.add(g); return true; }catch(e){ return false; }
}
function cheapestCity(id){ const c=cheapest(id); return c; }
function enModel(key,t,e){
  const n=GEAR.e[key]; if(!n) return null;
  const mat=typical(`T${t}_${EN_MAT[e][0]}`,0); const lower=cheapestCity(bmId(key,t,e-1)), ready=cheapestCity(bmId(key,t,e));
  const crLow=bmModel(key,t,e-1,false), crReady=bmModel(key,t,e,false);
  const base=[lower&&{p:lower.p,how:`comprando em ${lower.c}`},crLow.cost!=null&&{p:crLow.cost,how:`fabricando em ${crLow.city}`}].filter(Boolean).sort((a,b)=>a.p-b.p)[0];
  if(!mat||!base) return {key,t,e,name:BM[key][0],miss:!mat?EN_MAT[e][1].toLowerCase():"peça de base"};
  const cost=base.p+n*mat.p;
  const alt=[ready&&{p:ready.p,how:`comprar em ${ready.c}`},crReady.cost!=null&&{p:crReady.cost,how:`fabricar em ${crReady.city}`}].filter(Boolean).sort((a,b)=>a.p-b.p)[0];
  return {key,t,e,name:BM[key][0],n,mat,base,cost,alt,save:alt?alt.p-cost:null,bm:crReady.bm};
}
function setupEN(){
  const sel=$("enGroup"); if(sel.options.length) return;
  const src=$("bmGroup"); if(!src.options.length) setupBM();
  for(const og of src.children) sel.append(og.cloneNode(true)); sel.value=store.get("enGroup")||src.value;
  const ts=$("enTier"); [4,5,6,7,8].forEach(t=>ts.append(el("button",{type:"button","data-t":String(t),"aria-pressed":String(t===enTierSel),text:`T${t}`})));
  ts.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ts.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); enTierSel=+b.dataset.t; renderEN(); });
  sel.addEventListener("change",()=>{ store.set("enGroup",sel.value); renderEN(); });
}
async function renderEN(){
  const note=$("enNote"), tb=$("enTable");
  if(!BM||!GEAR){ note.textContent="Abrindo os dados das peças…"; try{ [BM,GEAR]=await Promise.all([BM||need("bm"),GEAR||need("gear")]); }catch(e){ note.textContent="Não consegui abrir os dados das peças."; return; } }
  setupEN(); const g=$("enGroup").value, t=enTierSel;
  if(!EN_LOADED.has(g)){ tb.textContent=""; note.textContent="Consultando peças, runas, almas e relíquias…"; const ok=await ensureEnch(g); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } if($("enGroup").value!==g) return; }
  const rows=[]; for(const k of bmKeys(g)) for(const e of [1,2,3]){ const m=enModel(k,t,e); if(m&&!m.miss) rows.push(m); }
  rows.sort((a,b)=>((b.save??-1e15)-(a.save??-1e15)));
  tb.textContent=""; const hr=tb.createTHead().insertRow(); ["Peça","Passo","Peça de base","Material","Custo encantando","Sem encantar","Economia"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody();
  for(const m of rows.slice(0,40)){ const tr=body.insertRow(); tr.insertCell().textContent=nmKey(m.key,m.name); tr.insertCell().textContent=`.${m.e-1} → .${m.e}`;
    const c1=tr.insertCell(); c1.className="num"; c1.append(fmt(m.base.p)," ",el("span",{class:"age",text:m.base.how}));
    const c2=tr.insertCell(); c2.className="num"; c2.textContent=`${m.n} × ${fmt(m.mat.p)}`;
    const c3=tr.insertCell(); c3.className="num"; c3.textContent=fmt(m.cost);
    const c4=tr.insertCell(); c4.className="num"; if(m.alt){ c4.append(fmt(m.alt.p)," ",el("span",{class:"age",text:m.alt.how})); } else c4.textContent="—";
    const c5=tr.insertCell(); c5.className="num "+(m.save==null?"":m.save>=0?"gain":"loss"); c5.textContent=m.save==null?"—":sgn(m.save); }
  const pos=rows.filter(m=>m.save>0).length;
  note.textContent=rows.length?`${pos} de ${rows.length} passos saem mais baratos encantando em T${t}. Peça de base pela opção mais barata entre comprar e fabricar sem foco; o material pela mediana das cidades.`:`Sem preços suficientes em T${t} para comparar.`;
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.015,clearProps:"opacity,transform"});
}

/* ================= ilha e fazenda ================= */
let FARM = null;                    // data/farm.json: p: plantas, b: filhotes, pr: produtores, n: nomes
let FZ_LOADED=false, FZ_LOADING=null, fzKind="crop";
const HERBS = /AGARIC|COMFREY|BURDOCK|TEASEL|FOXGLOVE|MULLEIN|YARROW/;
function ensureFZ(){
  if(FZ_LOADED) return Promise.resolve(true); if(FZ_LOADING) return FZ_LOADING;
  const ids=new Set(["T1_WORM"]); FARM.p.forEach(r=>{ ids.add(r[0]); ids.add(r[1]); }); FARM.b.forEach(r=>{ ids.add(r[0]); ids.add(r[1]); if(r[7]) ids.add(r[7]); }); FARM.pr.forEach(r=>{ ids.add(r[1]); if(r[5]) ids.add(r[5]); });
  FZ_LOADING=fetchIds([...ids],DATA.itens,SHOP_LOCS).then(()=>{FZ_LOADED=true; return true;}).catch(()=>false).finally(()=>{FZ_LOADING=null;});
  return FZ_LOADING;
}
const fzName = id => (FARM.n[id]||id).replace(/^Sementes de /,"");
function cheapestCrop(){ let best=null; for(const r of FARM.p){ if(HERBS.test(r[0])) continue; const p=typical(r[1],0); if(p&&(!best||p.p<best.p)) best={id:r[1],p:p.p}; } return best; }
/* foco: 1.000 por semente regada ou por vez que alimenta o filhote, sem spec; a spec de cada planta e animal reduz.
   o valor que o jogo mostra pode ser digitado na linha e fica guardado */
let FZ_OBS={}; try{ FZ_OBS=JSON.parse(store.get("fzObs")||"{}"); }catch(e){}
// a spec de cada planta, erva e animal vem da Minha ficha (seção Fazenda)
const fzFCE = id => itemFCE(id.replace(/^T\d_/,""));
const fzFocus = id => FZ_OBS[id]>0 ? FZ_OBS[id] : Math.max(1,Math.round(1000*Math.pow(0.5,fzFCE(id)/10000)));
const fzHasSpec = () => ["z:plantas","z:ervas","z:animais"].some(k=>spMax((PF.sp||{})[k])>0);
function plantModel(r){
  const [seed,crop,t,chance,bonus,,npc,avg]=r; const ps=typical(seed,0), pc=typical(crop,0), pw=typical("T1_WORM",0);
  if(!pc) return null; const sp=ps?ps.p:npc;
  const yieldN=avg*(st.prem?2:1), back0=Math.min(chance,2), back1=Math.min(chance+bonus,2);
  const base=yieldN*pc.p*(1-taxOf())+(pw?0.1*pw.p:0)-sp;
  const fc=fzFocus(seed), gain=(back1-back0)*sp;
  return {seed,crop,t,sp,seedMkt:!!ps,yieldN,back0,back1,cp:pc.p,p0:base+back0*sp,p1:base+back1*sp,fc,spf:gain/fc,thin:pc.n<2};
}
function animalRaise(r){
  const [baby,grown,t,hours,off,bonus,nut,fav,cat,npc,cycles]=r; if(cat!=="plants") return null;
  const pb=typical(baby,0), pg=typical(grown,0); if(!pg) return null; const bp=pb?pb.p:npc; if(!bp) return null;
  let food=null; if(fav){ const f=typical(fav,0); if(f) food={id:fav,n:Math.ceil(nut/96),p:f.p}; }
  if(!food){ const c=cheapestCrop(); if(c) food={id:c.id,n:Math.ceil(nut/48),p:c.p}; }
  if(!food) return null; const n=cycles||1, o0=Math.min(off,1), o1=Math.min(off+bonus*n,1);
  const base=pg.p*(1-taxOf())-bp-food.n*food.p, h=st.prem?hours/2:hours, days=Math.max(1,h/24);
  const fc1=fzFocus(baby), fc=fc1*n;
  return {baby,grown,t,hours:h,bp,gp:pg.p,food,o0,o1,n,fc1,fc,p0:base+o0*bp,p1:base+o1*bp,days,spf:(o1-o0)*bp/fc,thin:pg.n<2};
}
function producerModel(r){
  const [grown,item,t,avg,nut,fav]=r; const pi=typical(item,0); if(!pi) return null;
  let food=null; if(fav){ const f=typical(fav,0); if(f) food={id:fav,n:Math.ceil(nut/96),p:f.p}; }
  if(!food) return null; return {grown,item,t,avg,ip:pi.p,food,profit:avg*pi.p*(1-taxOf())-food.n*food.p,thin:pi.n<2};
}
function focusInput(id,val){
  const inp=el("input",{type:"number",min:"1",value:FZ_OBS[id]>0?String(FZ_OBS[id]):"",placeholder:String(val),"aria-label":"Foco que o jogo mostra"}); inp.className="fzobs";
  inp.addEventListener("change",()=>{ const v=+inp.value; if(v>0) FZ_OBS[id]=v; else delete FZ_OBS[id]; store.set("fzObs",JSON.stringify(FZ_OBS)); renderFZ(); });
  return inp;
}
async function renderFZ(){
  const tb=$("fzTable"), note=$("fzNote");
  if(!FARM){ note.textContent="Abrindo os dados da fazenda…"; try{ FARM=await need("farm"); }catch(e){ note.textContent="Não consegui abrir os dados da fazenda."; return; } }
  if(!FZ_LOADED){ tb.textContent=""; note.textContent="Consultando sementes, colheitas e animais…"; const ok=await ensureFZ(); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } }
  const focus=$("fzFocus").checked, plots=Math.max(1,Math.min(60,+$("fzPlots").value||1));
  $("fzSpecTxt").textContent = fzHasSpec() ? "O foco usa as specs de fazenda da sua ficha." : "Sem spec de fazenda na ficha: a conta usa o foco cheio. Preencha em Minha ficha, seção Fazenda.";
  tb.textContent=""; const hr=tb.createTHead().insertRow(); const body=tb.createTBody();
  const cell=(tr,v,cls)=>{ const c=tr.insertCell(); if(cls) c.className=cls; if(v instanceof Node) c.append(v); else c.textContent=v; return c; };
  const gl=v=>"num "+(v>=0?"gain":"loss");
  if(fzKind==="crop"||fzKind==="herb"){
    ["Planta","Semente","Colheita","Sementes de volta","Lucro por semente",`Por dia em ${plots} lote${plots>1?"s":""}`,"Foco por semente","Prata por foco"].forEach(h=>hr.append(el("th",{text:h})));
    const list=FARM.p.filter(r=>(fzKind==="herb")===HERBS.test(r[0])).map(plantModel).filter(Boolean).sort((a,b)=>(focus?b.p1-a.p1:b.p0-a.p0));
    for(const m of list){ const tr=body.insertRow(), p=focus?m.p1:m.p0;
      cell(tr,`${fzName(m.crop)} T${m.t}`); cell(tr,`${fmt(m.sp)}${m.seedMkt?"":" (NPC)"}`,"num"); cell(tr,`${dec(m.yieldN)} × ${fmt(m.cp)}`,"num");
      cell(tr,`${Math.round((focus?m.back1:m.back0)*100)}%`,"num"); cell(tr,sgn(p),gl(p)); cell(tr,sgn(p*9*plots),gl(p));
      cell(tr,focusInput(m.seed,m.fc),"num"); cell(tr,dec(m.spf),"num"); }
    note.textContent=`Lote de 9 sementes, colhido a cada 22 horas. Colheita média de ${st.prem?"9 por semente (Premium dobra)":"4,5 por semente (sem Premium)"}, pela tabela do jogo, com a chance de 10% de minhoca. Regar gasta foco por semente e aumenta a chance de a semente voltar; ${focus?"a tabela já está com rega.":"marque a caixa para ver com rega."} Prata por foco é quanto cada ponto de foco devolve em sementes. Semente sem anúncio entra pelo preço do NPC.`;
  } else if(fzKind==="prod"){
    ["Animal","Produz por dia","Ração por dia","Lucro por animal por dia",`Com ${plots} ${plots>1?"animais":"animal"}`].forEach(h=>hr.append(el("th",{text:h})));
    const list=FARM.pr.map(producerModel).filter(Boolean).sort((a,b)=>b.profit-a.profit);
    for(const m of list){ const tr=body.insertRow(); cell(tr,`${fzName(m.grown)} T${m.t}`); cell(tr,`${dec(m.avg)} × ${fzName(m.item)} a ${fmt(m.ip)}`,"num"); cell(tr,`${m.food.n} × ${fzName(m.food.id)} a ${fmt(m.food.p)}`,"num"); cell(tr,sgn(m.profit),gl(m.profit)); cell(tr,sgn(m.profit*plots),gl(m.profit)); }
    note.textContent="Animal adulto alimentado com a planta favorita (vale o dobro de nutrição), coletado uma vez por dia. Média de 9 produtos (7 a 11) pela tabela do jogo. O adulto não gasta foco.";
  } else {
    ["Animal","Filhote","Ração até crescer","Adulto vende por","Filhote de volta","Lucro por animal","Por dia","Foco por alimentação","Prata por foco"].forEach(h=>hr.append(el("th",{text:h})));
    const list=FARM.b.map(animalRaise).filter(Boolean).sort((a,b)=>(focus?b.p1/b.days-a.p1/a.days:b.p0/b.days-a.p0/a.days));
    for(const m of list){ const tr=body.insertRow(), p=focus?m.p1:m.p0;
      cell(tr,`${fzName(m.grown)} T${m.t}`); cell(tr,fmt(m.bp),"num"); cell(tr,`${m.food.n} × ${fzName(m.food.id)}`,"num"); cell(tr,fmt(m.gp),"num");
      cell(tr,`${Math.round((focus?m.o1:m.o0)*100)}%`,"num"); cell(tr,sgn(p),gl(p)); cell(tr,`${sgn(p/m.days)} em ${dec(m.days)} dia${m.days>=2?"s":""}`,gl(p));
      const fcell=cell(tr,focusInput(m.baby,m.fc1),"num"); if(m.n>1) fcell.append(el("span",{class:"age",text:` × ${m.n} vezes`})); cell(tr,dec(m.spf),"num"); }
    note.textContent=`Do filhote ao adulto, alimentado com a planta favorita ou a mais barata. ${st.prem?"Com Premium o crescimento leva metade do tempo.":"Sem Premium o crescimento leva o dobro do tempo."} Alimentar com foco gasta foco a cada vez (montarias aceitam várias vezes durante o crescimento) e aumenta a chance de vir um filhote novo ao pegar o adulto${focus?"; a tabela já está com foco":""}. Lucro vendendo o adulto no mercado.`;
  }
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.02,clearProps:"opacity,transform"});
}
document.querySelectorAll("[data-fz]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-fz]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); fzKind=b.dataset.fz; renderFZ(); }));
$("fzFocus").addEventListener("change",renderFZ);
$("fzPlots").addEventListener("input",()=>{ if(FARM&&FZ_LOADED) renderFZ(); });
["bcBuild","bcTier","bcEnch"].forEach(id=>$(id).addEventListener("change",renderBC));
$("bcCopy").addEventListener("click",()=>{ const sel=$("bcBuild"); if(sel.value==="custom") return; const slots=buildSlots(BUILDS[+sel.value]); BC_CUSTOM={}; for(const s in slots){ const pick=slots[s].find(c=>c.key===bcSel[s])||slots[s][0]; if(pick) BC_CUSTOM[s]=pick.key; } saveCustom(); sel.value="custom"; renderBC(); });
