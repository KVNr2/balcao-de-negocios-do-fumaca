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
/* fontes além da lista antiga: builds do AlbionOnlineGrind ("g:id") e builds do ZvZ ("z:arma:n") */
let BC_GB=null, BC_ZV=null;
async function bcLoadSources(){
  if(!BC_GB){ try{ BC_GB=await need("builds-grind"); }catch(e){ BC_GB={builds:[],conteudos:[]}; } }
  if(!BC_ZV){ try{ BC_ZV=await need("zvz"); }catch(e){ BC_ZV={armas:{}}; } }
}
const bcCode = id => String(id||"").replace(/^T\d_/,"").replace(/@\d$/,"");
function bcSlotsFor(value){
  if(/^\d+$/.test(value)){ const b=BUILDS[+value]; return b?{slots:buildSlots(b),title:nm(b.w),src:b.src}:null; }
  const slots={}; const add=(slot,key,label)=>{ (slots[slot]||(slots[slot]=[])); if(key&&!slots[slot].some(x=>x.key===key)) slots[slot].push({key,label}); };
  if(value.startsWith("g:")||value.startsWith("n:")){ const b=(value[0]==="n"?(window.NB_ALL||[]):(BC_GB.builds||[])).find(x=>x.id===value.slice(2)); if(!b) return null;
    add("w",bcCode(b.w),codeName(bcCode(b.w)));
    if(b.w2) add("w",bcCode(b.w2),codeName(bcCode(b.w2)));
    for(const sl of ["h","a","s","c","o"]) for(const id of b[sl]||[]){ const c=bcCode(id); add(sl,c,codeName(c)); }
    for(const sl of ["p","f"]) for(const id of b[sl]||[]){ const k=String(id).replace(/@\d$/,""); add(sl,k,KB_CONS_PT[bcCode(k)]||codeName(bcCode(k))); }
    if(slots.w&&/^2H_/.test(slots.w[0].key)) delete slots.o;
    return {slots,title:b.t||codeName(bcCode(b.w))}; }
  if(value.startsWith("z:")){ const [,w,i]=value.split(":"); const v=((BC_ZV.armas[w]||{}).variantes||[])[+i]; if(!v) return null;
    add("w",w,codeName(w));
    for(const [k,sl] of [["cabeca","h"],["peito","a"],["botas","s"],["capa","c"],["off","o"]]) if(v[k]) add(sl,v[k].c,codeName(v[k].c));
    for(const [k,sl] of [["pocao","p"],["comida","f"]]) if(v[k]) add(sl,`T${v[k].t}_${v[k].c}`,KB_CONS_PT[v[k].c]||codeName(v[k].c));
    if(/^2H_/.test(w)) delete slots.o;
    return {slots,title:`${codeName(w)} (ZvZ, ${v.n} jogadores)`}; }
  return null;
}
/* tier equivalente: T8 = 8.0, 7.1, 6.2, 5.3 e 4.4. Em empate de preço vale a ordem 4.4 primeiro, depois do maior tier para o menor */
function bcEquivs(sum){ const out=[]; const push=(t,e)=>{ if(t>=4&&t<=8&&e>=0&&e<=4) out.push([t,e]); }; push(sum-4,4); for(let e=0;e<=3;e++) push(sum-e,e); return out; }
const priceIn = (id,city) => { const r=BMP[id]&&BMP[id][city]; return r&&r[0]>0?r[0]:null; };
function cheapest(id){ let best=null; for(const c of SHOP_LOCS){ const p=priceIn(id,c); if(p&&(!best||p<best.p)) best={p,c}; } return best; }
function setupBC(){
  const sel=$("bcBuild"); const rk=`${BUILDS.length}|${LANG}|${(window.NB_ALL||[]).length}|${((BC_GB||{}).builds||[]).length}|${Object.keys((BC_ZV||{}).armas||{}).length}`; if(sel.dataset.ready===rk) return; sel.textContent=""; sel.dataset.ready=rk;
  const mine=new Set(LINES.filter(([k])=>wl(k)>=2).map(([k])=>k));
  const own=el("optgroup",{label:"Seu set"}); own.append(el("option",{value:"custom",text:"Montar peça por peça"})); sel.append(own);
  for(const c of ["brumas","corrompidas","barato","pve"]){ const og=el("optgroup",{label:CONTENT_PT[c]});
    BUILDS.map((b,i)=>[b,i]).filter(([b])=>b.c===c&&gearKey(b.w)).sort((x,y)=>(mine.has(y[0].l)-mine.has(x[0].l))||((y[0].pop||0)-(x[0].pop||0))).forEach(([b,i])=>og.append(el("option",{value:String(i),text:`${nm(b.w)}${mine.has(b.l)?" (sua linha)":""}`})));
    if(og.children.length) sel.append(og); }
  if(BC_ZV&&BC_ZV.armas){ const og=el("optgroup",{label:"Builds do ZvZ (lutas recentes)"});
    Object.entries(BC_ZV.armas).filter(([,a])=>(a.variantes||[]).length).sort((x,y)=>(y[1].mortes||0)-(x[1].mortes||0)).forEach(([w,a])=>a.variantes.forEach((v,i)=>og.append(el("option",{value:`z:${w}:${i}`,text:`${codeName(w)} · ${v.n} ${v.n===1?"jogador":"jogadores"}`}))));
    if(og.children.length) sel.append(og); }
  if((window.NB_ALL||[]).length){ const og=el("optgroup",{label:"Nossas builds"}); NB_ALL.forEach(b=>og.append(el("option",{value:`n:${b.id}`,text:b.t}))); sel.append(og); }
  if(BC_GB&&BC_GB.builds){ for(const c of BC_GB.conteudos||[]){ const og=el("optgroup",{label:`Grind · ${c.nome}`});
    BC_GB.builds.filter(b=>b.k===c.k).sort((x,y)=>(y.pop||0)-(x.pop||0)).forEach(b=>og.append(el("option",{value:`g:${b.id}`,text:`${b.t} (${b.pop} votos)`})));
    if(og.children.length) sel.append(og); } }
  const saved=store.get("bcBuild"); if(saved&&sel.querySelector(`option[value="${saved}"]`)) sel.value=saved; else { const first=sel.querySelector('option:not([value="custom"])'); if(first) sel.value=first.value; }
  for(const [id,def,tipo] of [["bcFT","8","t"],["bcFE","0","e"],["bcPT","8","t"],["bcPE","0","e"]]){ const x=$(id); if(!x.options.length){ if(tipo==="t") for(let t=1;t<=8;t++) x.append(el("option",{value:String(t),text:`T${t}`})); else [0,1,2,3].forEach(e=>x.append(el("option",{value:String(e),text:`.${e}`}))); x.value=store.get(id)||def; } }
  if(!$("bcCons").dataset.ok){ $("bcCons").dataset.ok="1"; $("bcCons").value=store.get("bcCons")||"off"; }
  const tier=$("bcTier"), ench=$("bcEnch"); if(!tier.options.length){ [4,5,6,7,8].forEach(t=>tier.append(el("option",{value:String(t),text:`T${t}`}))); tier.value=store.get("bcTier")||"6"; ench.append(el("option",{value:"eq",text:"Equivalente (o mais barato)"})); [0,1,2,3,4].forEach(e=>ench.append(el("option",{value:String(e),text:`.${e}`}))); ench.value=store.get("bcEnch")||"eq"; }
}
async function renderBC(){
  const note=$("bcNote"), tb=$("bcTable");
  if(!GEAR){ note.textContent="Abrindo a lista de peças…"; try{ GEAR=await need("gear"); }catch(e){ note.textContent="Não consegui abrir a lista de peças."; return; } }
  await bcLoadSources(); setupBC(); const sel=$("bcBuild"); if(!sel.value) return;
  const custom=sel.value==="custom", eq=$("bcEnch").value==="eq", t=+$("bcTier").value, e=eq?0:+$("bcEnch").value; store.set("bcBuild",sel.value); store.set("bcTier",String(t)); store.set("bcEnch",eq?"eq":String(e));
  const info=custom?null:bcSlotsFor(sel.value); if(!custom&&!info){ note.textContent="Não achei esta build."; return; }
  const cons=$("bcCons").value; store.set("bcCons",cons); const cv={f:[+$("bcFT").value,+$("bcFE").value],p:[+$("bcPT").value,+$("bcPE").value]}; for(const id of ["bcFT","bcFE","bcPT","bcPE"]) store.set(id,$(id).value);
  document.querySelectorAll(".bcConsX").forEach(x=>x.hidden=cons!=="custom");
  const equivs=eq?bcEquivs(t):[[t,e]];
  let slots; if(custom){ slots={}; for(const s of SLOT_ORDER){ if(s==="o"&&BC_CUSTOM.w&&/^2H_/.test(BC_CUSTOM.w)) continue; slots[s]=BC_CUSTOM[s]?[{key:BC_CUSTOM[s],label:enOf(BC_CUSTOM[s])}]:[]; } } else slots=info.slots;
  const stateKey=()=>[$("bcBuild").value,$("bcTier").value,$("bcEnch").value,$("bcCons").value,$("bcFT").value,$("bcFE").value,$("bcPT").value,$("bcPE").value].join("|"); const key=stateKey();
  $("bcCopy").hidden=custom;
  if(bcLast!==sel.value){ bcSel={}; bcLast=sel.value; }
  const idOfSlot=(slot,k,tt=t,ee=e)=>slot==="f"||slot==="p"?(cons==="custom"?`T${cv[slot][0]}_${bcCode(k)}`+(cv[slot][1]?`@${cv[slot][1]}`:""):k):`T${tt}_${k}`+(ee?`@${ee}`:"");
  const ids=[]; for(const s in slots) if(!((s==="f"||s==="p")&&cons==="off")) for(const c of slots[s]) for(const [tt,ee] of equivs) ids.push(idOfSlot(s,c.key,tt,ee));
  note.textContent="Procurando as peças nas cidades…"; tb.textContent="";
  try{ await bmFetch([...new Set(ids)],SHOP_LOCS); }catch(err){ note.textContent="Não consegui consultar os preços agora."; return; }
  if(stateKey()!==key) return;
  const tl=eq?`T${t} equivalente`:`T${t}.${e}`; $("bcTitle").textContent=custom?`Seu set em ${tl}`:`${info.title} em ${tl}`;
  const hr=tb.createTHead().insertRow(); ["Parte","Peça","Mais barato","Onde",""].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(); let total=0, missing=0, consTot=0; const chosen={};
  for(const s of SLOT_ORDER){ const list=slots[s]; if(!list) continue; if((s==="f"||s==="p")&&cons==="off") continue;
    if(custom){ const tr=body.insertRow(); tr.insertCell().textContent=SLOT_PT[s]; const c1=tr.insertCell(); const opts=slotOptions(s);
      const ss=el("select",{"aria-label":`Escolher ${SLOT_PT[s].toLowerCase()}`}); ss.append(el("option",{value:"",text:"escolha…"})); opts.forEach(o=>ss.append(el("option",{value:o.key,text:o.label}))); ss.value=BC_CUSTOM[s]||"";
      ss.addEventListener("change",()=>{ if(ss.value) BC_CUSTOM[s]=ss.value; else delete BC_CUSTOM[s]; saveCustom(); renderBC(); }); c1.append(ss);
      if(!list.length){ tr.insertCell().textContent="—"; tr.insertCell().textContent=""; tr.insertCell(); continue; } }
    const pick=list.find(c=>c.key===bcSel[s])||list[0]; let escolha=[t,e]; chosen[s]=idOfSlot(s,pick.key);
    if(eq&&s!=="f"&&s!=="p"){ let best=null; for(const [tt,ee] of equivs){ const ch0=cheapest(idOfSlot(s,pick.key,tt,ee)); if(ch0&&(!best||ch0.p<best.p)) best={p:ch0.p,tt,ee}; } if(best){ escolha=[best.tt,best.ee]; chosen[s]=idOfSlot(s,pick.key,best.tt,best.ee); } else escolha=equivs[0]; }
    let tr, c1; if(custom){ tr=body.rows[body.rows.length-1]; } else { tr=body.insertRow(); tr.insertCell().textContent=SLOT_PT[s]; c1=tr.insertCell(); }
    if(custom){} else if(list.length>1){ const ss=el("select",{"aria-label":`Escolher ${SLOT_PT[s].toLowerCase()}`}); list.forEach(c=>ss.append(el("option",{value:c.key,text:nmKey(c.key,c.label)}))); ss.value=pick.key; ss.addEventListener("change",()=>{ bcSel[s]=ss.value; renderBC(); }); c1.append(ss); } else c1.textContent=nmKey(pick.key,pick.label);
    { const pc=tr.cells[1]; if(pc&&chosen[s]){ const w=el("span",{class:"cell-ic"}), tx=el("span",{class:"cell-tx"}); while(pc.firstChild) tx.append(pc.firstChild); const im=iconImg(chosen[s],36); im.classList.add("t"); w.append(im,tx); pc.append(w); } }
    const ch=cheapest(chosen[s]); const c2=tr.insertCell(); c2.className="num"; c2.textContent=ch?fmt(ch.p):"—"; tr.insertCell().textContent=ch?ch.c:"sem anúncio";
    const c4=tr.insertCell(); c4.className="small muted"; c4.textContent=s==="f"||s==="p"?"por unidade":"";
    if(s==="f"||s==="p"){ if(ch) consTot+=ch.p; } else if(ch) total+=ch.p; else missing++; }
  const tr=body.insertRow(); tr.className="total"; tr.insertCell().textContent="Set"; tr.insertCell().textContent=missing?`${missing} peça${missing>1?"s":""} sem anúncio`:"comprando cada peça onde é mais barata";
  const tc=tr.insertCell(); tc.className="num"; tc.textContent=fmt(total); tr.insertCell().textContent=consTot?`+ ${fmt(consTot)} de comida e poção`:""; tr.insertCell();
  // uma cidade só
  const gearSlots=Object.keys(chosen).filter(s=>s!=="f"&&s!=="p"), rows=[];
  for(const c of SHOP_LOCS){ let sum=0, miss=0; for(const s of gearSlots){ const p=priceIn(chosen[s],c); if(p) sum+=p; else miss++; } rows.push({c,sum,miss}); }
  rows.sort((a,b)=>(a.miss-b.miss)||(a.sum-b.sum));
  const box=$("bcWhere"); box.textContent="";
  const semNada=!gearSlots.length||rows.every(r=>r.miss===gearSlots.length);
  if(semNada) box.append(el("p",{class:"muted small",text:!gearSlots.length?"Escolha as peças para ver onde comprar.":"Nenhuma peça tem anúncio agora, então não dá para indicar cidade."}));
  else rows.slice(0,3).forEach((r,i)=>box.append(recItem(`${i===0?"Melhor cidade: ":""}${r.c}`,[r.miss===gearSlots.length?"Nenhuma peça anunciada":`${fmt(r.sum)} pelas ${gearSlots.length-r.miss} peças que tem lá`,r.miss?`Faltam ${r.miss}: compre ${r.miss>1?"essas":"essa"} em outra cidade`:`O set inteiro numa viagem só; ${r.sum>total?`${fmtS(r.sum-total)} a mais que caçar peça por peça`:"o mesmo que caçar peça por peça"}`])));
  const bmIdx=missing===0&&total>0?el("li",{},el("strong",{text:"Quanto dá para perder"}),el("span",{text:`Com 1 milhão de pratas, este set morre ${Math.floor(1e6/total)} vezes antes de acabar o dinheiro.`})):null; if(bmIdx) box.append(bmIdx);
  note.textContent=`Menor preço de venda anunciado nas cidades reais, Caerleon e Brecilien, qualidade normal, anúncios de até 3 dias. Comida e poção estão por unidade. ${cons==="off"?"Comida e poção não entram na conta. ":""}${eq?`No modo equivalente, cada peça usa a versão mais barata entre ${equivs.map(x=>x.join(".")).join(", ")}; se o preço empatar, vale a ordem 4.4 e depois do maior tier para o menor. `:""}${custom?"O seu set fica salvo neste navegador.":info.src==="pesquisa"?"Esta build é de pesquisa, sem conferência.":""}`;
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.03,clearProps:"opacity,transform"});
}

/* ================= encantar ================= */
const EN_MAT = {1:["RUNE","Runa"],2:["SOUL","Alma"],3:["RELIC","Relíquia"]};
const EN_LOADED = new Set(); let enTierSel=0;
async function ensureEnch(g){
  if(EN_LOADED.has(g)) return true;
  const ok=await ensureBM(g); if(!ok) return false;
  const ids=[]; for(const k of bmKeys(g)) for(let t=4;t<=8;t++) for(let e=0;e<=4;e++) ids.push(bmId(k,t,e));
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
  return {key,t,e,name:BM[key][0],n,mat,base,cost,alt,save:alt?alt.p-cost:null,bm:crReady.bm,crLow,crReady};
}

/* detalhe do passo de encantamento, no padrão do Mercado Negro: custos em vermelho, economia em verde */
function enPanel(m){
  const d=el("div",{class:"of-xp"}), left=el("div",{class:"of-xl"}), right=el("div",{class:"of-xs"});
  const idLow=bmId(m.key,m.t,m.e-1), idUp=bmId(m.key,m.t,m.e), matId=`T${m.t}_${EN_MAT[m.e][0]}`, crafted=m.base.how.startsWith("fabricando"), cr=m.crLow;
  left.append(el("h4",{class:"of-xh",text:`${nmKey(m.key,m.name)} T${m.t}: .${m.e-1} → .${m.e}`}));
  const hd=el("div",{class:"of-xr of-xhd"}); ["Stats","Item","Valor","Tempo","Cidade","Qtd"].forEach(x=>hd.append(el("span",{text:x}))); left.append(hd);
  const row=(kind,lab,id,nm,sub,val,qty,where)=>{ const r=el("div",{class:"of-xr "+kind}); r.append(el("span",{class:"of-pill "+kind,text:lab}));
    const it=el("span",{class:"of-xi"}); it.append(el("i",{class:"of-dot"+(kind==="buy"?" red":"")}),iconImg(id,34)); const n=el("span",{class:"of-xn"}); n.append(el("b",{text:nm})); if(sub) n.append(el("small",{text:sub})); it.append(n); r.append(it);
    r.append(el("b",{class:"of-xv",text:fmt(val)}),el("span",{class:"of-xt",text:"—"}),el("span",{class:"of-xc",text:where}),el("span",{class:"of-xq",text:qty})); return r; };
  const nm=nmKey(m.key,m.name);
  if(m.alt) left.append(row("sale","SEM ENCANTAR",idUp,`${nm} .${m.e}`,"o que custaria já encantado",m.alt.p,"1x",m.alt.how.replace(/^(comprar|fabricar) em /,"")));
  if(!crafted){ const city=m.base.how.replace("comprando em ",""); left.append(row("buy","COMPRA INST",idLow,`${nm} .${m.e-1}`,"peça de base mais barata",m.base.p,"1x",city)); }
  else for(const p of cr.parts) left.append(row("buy","COMPRA INST",(p.id||idLow).replace(/_LEVEL(\d)$/,"_LEVEL$1@$1"),p.nm,p.art?"artefato não volta":"para fabricar a peça de base",p.p,`${fmt(p.q)}x`,cr.city));
  left.append(row("buy","COMPRA INST",matId,`${EN_MAT[m.e][1]} T${m.t}`,"mediana das cidades",m.mat.p,`${m.n}x`,"cidades"));
  const card=(cls,title,lines,tot)=>{ const c=el("div",{class:"of-xcard "+cls}); c.append(el("h4",{class:"of-xh",text:title})); for(const [k,v,cc] of lines){ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{class:cc||"",text:v})); c.append(l); } if(tot){ const l=el("div",{class:"of-xline of-xtot"}); l.append(el("span",{text:tot[0]}),el("b",{text:tot[1]})); c.append(l); } return c; };
  const cl=[]; if(crafted){ cl.push([`Matérias da peça (${cr.city})`,fmt(cr.res)],[`Retorno de recursos (${Math.round(cr.rr*100)}%)`,"−"+fmt(cr.res*cr.rr)]); if(cr.art>0) cl.push(["Artefato",fmt(cr.art)]); cl.push(["Taxa da estação",fmt(cr.fee)]); cl.push([`Peça de base .${m.e-1}`,fmt(m.base.p)]); } else cl.push([`Peça de base .${m.e-1} (${m.base.how})`,fmt(m.base.p)]);
  cl.push([`${EN_MAT[m.e][1]} (${m.n} × ${fmt(m.mat.p)})`,fmt(m.n*m.mat.p)]);
  right.append(card("cost","Custos detalhados (−)",cl,["Custo encantando",fmt(m.cost)]));
  const rl=[]; if(m.alt) rl.push([`Sem encantar (${m.alt.how})`,fmt(m.alt.p)]); rl.push(["Custo encantando","−"+fmt(m.cost),"loss"]);
  right.append(card(m.save!=null&&m.save<0?"res neg":"res",m.save!=null&&m.save<0?"Resultado (−)":"Resultado (+)",rl,["Economia",m.save==null?"—":sgn(m.save)]));
  d.append(left,right); return d;
}
function setupEN(){
  const sel=$("enGroup"); if(sel.options.length) return;
  const src=$("bmGroup"); if(!src.options.length) setupBM();
  for(const og of src.children) sel.append(og.cloneNode(true)); sel.value=store.get("enGroup")||src.value;
  const ts=$("enTier"); ["Todos",4,5,6,7,8].forEach((t,i)=>ts.append(el("button",{type:"button","data-t":String(i?t:0),"aria-pressed":String((i?t:0)===enTierSel),text:i?`T${t}`:t})));
  ts.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ts.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); enTierSel=+b.dataset.t; renderEN(); });
  sel.addEventListener("change",()=>{ store.set("enGroup",sel.value); renderEN(); });
}
async function renderEN(){
  const note=$("enNote"), tb=$("enTable");
  if(!BM||!GEAR){ note.textContent="Abrindo os dados das peças…"; try{ [BM,GEAR]=await Promise.all([BM||need("bm"),GEAR||need("gear")]); }catch(e){ note.textContent="Não consegui abrir os dados das peças."; return; } }
  setupEN(); const g=$("enGroup").value, t=enTierSel;
  if(!EN_LOADED.has(g)){ tb.textContent=""; note.textContent="Consultando peças, runas, almas e relíquias…"; const ok=await ensureEnch(g); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } if($("enGroup").value!==g) return; }
  const rows=[]; for(const k of bmKeys(g)) for(const tt of (t?[t]:[4,5,6,7,8])) for(const e of [1,2,3]){ const m=enModel(k,tt,e); if(m&&!m.miss) rows.push(m); }
  rows.sort((a,b)=>((b.save??-1e15)-(a.save??-1e15)));
  tb.textContent=""; const hr=tb.createTHead().insertRow(); ["Peça","Passo","Custo final","Economia"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody();
  for(const m of rows.slice(0,t?40:80)){ const tr=body.insertRow(); tr.tabIndex=0; tr.className="clickrow"; tr.insertCell().append(withIcon(bmId(m.key,m.t,m.e),`${nmKey(m.key,m.name)} T${m.t}`)); { const sc=tr.insertCell(); sc.append(withIcon(bmId(m.key,m.t,m.e-1),`.${m.e-1} → .${m.e}`)); }
    const c3=tr.insertCell(); c3.className="num cost"; c3.textContent=fmt(m.cost);
    const c5=tr.insertCell(); c5.className="num bm-profit "+(m.save==null?"":m.save>=0?"gain":"loss"); c5.textContent=m.save==null?"—":sgn(m.save);
    const dr=document.createElement("tr"); dr.className="of-drow"; dr.hidden=true; const dc=document.createElement("td"); dc.colSpan=4; dr.append(dc); tr.after(dr);
    const toggle=()=>{ const open=dr.hidden; dr.hidden=!open; tr.classList.toggle("open",open); tr.setAttribute("aria-expanded",String(open));
      if(open){ dc.textContent=""; try{ dc.append(enPanel(m)); }catch(e){ dc.append(el("p",{class:"small loss",text:"Não consegui montar os detalhes: "+(e&&e.message||e)})); } setTimeout(()=>{ try{ const r=dr.getBoundingClientRect(); if(r.bottom>innerHeight-8) dr.scrollIntoView({block:"nearest",behavior:RM?"auto":"smooth"}); }catch(e){} },60); } };
    tr.setAttribute("aria-expanded","false"); tr.addEventListener("click",toggle); tr.addEventListener("keydown",ev=>{ if(ev.target===tr&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); toggle(); } }); }
  { const w=tb.parentNode; if(w) w.style.setProperty("--tblw",(w.clientWidth-8)+"px"); }
  const pos=rows.filter(m=>m.save>0).length;
  note.textContent=rows.length?`${pos} de ${rows.length} passos saem mais baratos encantando${t?` em T${t}`:" (todos os tiers)"}. ${rows.length>(t?40:80)?` Mostrando as ${t?40:80} de maior economia de ${fmt(rows.length)} registros: não são todos.`:""} Peça de base pela opção mais barata entre comprar e fabricar sem foco; o material pela mediana das cidades. Clique numa linha para ver a conta.`:`Sem preços suficientes${t?` em T${t}`:""} para comparar.`;
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
      cell(tr,withIcon(m.crop,`${fzName(m.crop)} T${m.t}`)); cell(tr,withIcon(m.seed,`${fmt(m.sp)}${m.seedMkt?"":" (NPC)"}`),"num"); cell(tr,`${dec(m.yieldN)} × ${fmt(m.cp)}`,"num");
      cell(tr,`${Math.round((focus?m.back1:m.back0)*100)}%`,"num"); cell(tr,sgn(p),gl(p)); cell(tr,sgn(p*9*plots),gl(p));
      cell(tr,focusInput(m.seed,m.fc),"num"); cell(tr,dec(m.spf),"num"); }
    note.textContent=`Lote de 9 sementes, colhido a cada 22 horas. Colheita média de ${st.prem?"9 por semente (Premium dobra)":"4,5 por semente (sem Premium)"}, pela tabela do jogo, com a chance de 10% de minhoca. Regar gasta foco por semente e aumenta a chance de a semente voltar; ${focus?"a tabela já está com rega.":"marque a caixa para ver com rega."} Prata por foco é quanto cada ponto de foco devolve em sementes. Semente sem anúncio entra pelo preço do NPC.`;
  } else if(fzKind==="prod"){
    ["Animal","Produz por dia","Ração por dia","Lucro por animal por dia",`Com ${plots} ${plots>1?"animais":"animal"}`].forEach(h=>hr.append(el("th",{text:h})));
    const list=FARM.pr.map(producerModel).filter(Boolean).sort((a,b)=>b.profit-a.profit);
    for(const m of list){ const tr=body.insertRow(); cell(tr,withIcon(m.grown,`${fzName(m.grown)} T${m.t}`)); cell(tr,withIcon(m.item,`${dec(m.avg)} × ${fzName(m.item)} a ${fmt(m.ip)}`),"num"); cell(tr,withIcon(m.food.id,`${m.food.n} × ${fzName(m.food.id)} a ${fmt(m.food.p)}`),"num"); cell(tr,sgn(m.profit),gl(m.profit)); cell(tr,sgn(m.profit*plots),gl(m.profit)); }
    note.textContent="Animal adulto alimentado com a planta favorita (vale o dobro de nutrição), coletado uma vez por dia. Média de 9 produtos (7 a 11) pela tabela do jogo. O adulto não gasta foco.";
  } else {
    ["Animal","Filhote","Ração até crescer","Adulto vende por","Filhote de volta","Lucro por animal","Por dia","Foco por alimentação","Prata por foco"].forEach(h=>hr.append(el("th",{text:h})));
    const list=FARM.b.map(animalRaise).filter(Boolean).sort((a,b)=>(focus?b.p1/b.days-a.p1/a.days:b.p0/b.days-a.p0/a.days));
    for(const m of list){ const tr=body.insertRow(), p=focus?m.p1:m.p0;
      cell(tr,withIcon(m.grown,`${fzName(m.grown)} T${m.t}`)); cell(tr,withIcon(m.baby,fmt(m.bp)),"num"); cell(tr,withIcon(m.food.id,`${m.food.n} × ${fzName(m.food.id)}`),"num"); cell(tr,fmt(m.gp),"num");
      cell(tr,`${Math.round((focus?m.o1:m.o0)*100)}%`,"num"); cell(tr,sgn(p),gl(p)); cell(tr,`${sgn(p/m.days)} em ${dec(m.days)} dia${m.days>=2?"s":""}`,gl(p));
      const fcell=cell(tr,focusInput(m.baby,m.fc1),"num"); if(m.n>1) fcell.append(el("span",{class:"age",text:` × ${m.n} vezes`})); cell(tr,dec(m.spf),"num"); }
    note.textContent=`Do filhote ao adulto, alimentado com a planta favorita ou a mais barata. ${st.prem?"Com Premium o crescimento leva metade do tempo.":"Sem Premium o crescimento leva o dobro do tempo."} Alimentar com foco gasta foco a cada vez (montarias aceitam várias vezes durante o crescimento) e aumenta a chance de vir um filhote novo ao pegar o adulto${focus?"; a tabela já está com foco":""}. Lucro vendendo o adulto no mercado.`;
  }
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.02,clearProps:"opacity,transform"});
}
document.querySelectorAll("[data-fz]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-fz]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); fzKind=b.dataset.fz; renderFZ(); }));
$("fzFocus").addEventListener("change",renderFZ);
$("fzPlots").addEventListener("input",()=>{ if(FARM&&FZ_LOADED) renderFZ(); });
["bcBuild","bcTier","bcEnch","bcCons","bcFT","bcFE","bcPT","bcPE"].forEach(id=>$(id).addEventListener("change",renderBC));
$("bcCopy").addEventListener("click",()=>{ const sel=$("bcBuild"); if(sel.value==="custom") return; const r=bcSlotsFor(sel.value); if(!r) return; const slots=r.slots; BC_CUSTOM={}; for(const s in slots){ const pick=slots[s].find(c=>c.key===bcSel[s])||slots[s][0]; if(pick) BC_CUSTOM[s]=pick.key; } saveCustom(); sel.value="custom"; renderBC(); });

/* ir para o Custo da build já com a build e o tier escolhidos (usado pelos botões das abas Builds e Build ZvZ) */
function bcIr(value,tier){
  store.set("bcBuild",value); store.set("bcTier",String(tier)); store.set("bcEnch","eq");
  const sel=$("bcBuild"); sel.dataset.ready=""; if($("bcTier").options.length){ $("bcTier").value=String(tier); $("bcEnch").value="eq"; }
  bcLast=""; showTab("t-custo");
}
