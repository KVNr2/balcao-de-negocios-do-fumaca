/* ================= oficina: receitas, custo, venda e lucro de cada item ================= */
const REF5 = [
  {k:"metal",raw:"ORE",ref:"METALBAR",city:"Thetford",rawPT:"Minério",refPT:"Barra de metal"},
  {k:"cloth",raw:"FIBER",ref:"CLOTH",city:"Lymhurst",rawPT:"Fibra",refPT:"Tecido"},
  {k:"leather",raw:"HIDE",ref:"LEATHER",city:"Martlock",rawPT:"Pelego",refPT:"Couro"},
  {k:"wood",raw:"WOOD",ref:"PLANKS",city:"Fort Sterling",rawPT:"Madeira",refPT:"Tábua"},
  {k:"stone",raw:"ROCK",ref:"STONEBLOCK",city:"Bridgewatch",rawPT:"Pedra",refPT:"Bloco de pedra"}];
const MAT_PT = {METALBAR:"Barra de metal",PLANKS:"Tábua",LEATHER:"Couro",CLOTH:"Tecido"};
const OF = {mode:null, sort:"profit", cat:null, tier:0, ench:-1, q:"", rr:"auto", sellC:new Set(), sellS:"auto", buyS:"auto", city:"", loaded:new Set(), vol:{}};
function ofCats(){
  const c=[];
  if(OF.mode==="refine"){ c.push({k:"refine",label:"Todos os recursos (minério, fibra, pelego, madeira e pedra)",grp:"Todos"});
    for(const R of REF5) c.push({k:"refine:"+R.ref,label:`${R.refPT}: ${R.rawPT.toLowerCase()} refinado em ${R.city}`,grp:"Por recurso"}); return c; } const mine=new Set(LINES.filter(([k])=>wl(k)>=2).map(([k])=>k));
  c.push({k:"g:*armas",label:"Todas as armas",grp:"Todos"},{k:"g:*armaduras",label:"Todas as armaduras (placa, couro e pano)",grp:"Todos"},{k:"g:*tudo",label:"Todas as armas, armaduras e mão secundária",grp:"Todos"});
  for(const [k,n] of LINES) c.push({k:"g:"+k,label:`Armas: ${n}`,grp:mine.has(k)?"Suas armas":"Outras armas"});
  c.push({k:"g:a_placa",label:"Armaduras de placa",grp:"Armaduras"},{k:"g:a_couro",label:"Armaduras de couro",grp:"Armaduras"},{k:"g:a_pano",label:"Armaduras de pano",grp:"Armaduras"},{k:"g:mao",label:"Mão secundária",grp:"Armaduras"});
  c.push({k:"meal",label:"Comidas",grp:"Consumíveis"},{k:"potion",label:"Poções",grp:"Consumíveis"});
  return c;
}
const idLv = (t,base,e) => `T${t}_${base}`+(e?`_LEVEL${e}`:"");
const apiLv = (t,base,e) => `T${t}_${base}`+(e?`_LEVEL${e}@${e}`:"");
/* grupos de receita de cada categoria: "g:*armas" junta todas as linhas de armas, "g:*armaduras" placa, couro e pano */
function ofGroups(cat){ const g=cat.slice(2);
  if(g==="*armas") return LINES.map(([k])=>k);
  if(g==="*armaduras") return ["a_placa","a_couro","a_pano"];
  if(g==="*tudo") return [...LINES.map(([k])=>k),"a_placa","a_couro","a_pano","mao"];
  return [g]; }
function ofItems(cat){
  const out=[];
  if(cat.startsWith("g:")){ const g=cat.slice(2);
    for(const gg of ofGroups(cat)) for(const k of bmKeys(gg)){ const r=BM[k]; for(let t=4;t<=8;t++) for(let e=0;e<=4;e++){
      if((OF.tier&&t!==OF.tier)||(OF.ench>=0&&e!==OF.ench)) continue;
      const ing=[]; for(const [,c,n] of r[3].matchAll(/([MPLC])(\d+)/g)) ing.push({id:idLv(t,BM_RES[c],e),n:+n,nm:`${MAT_PT[BM_RES[c]]} T${t}.${e}`});
      if(r[4]) ing.push({id:`T${t}_${r[4][0]}`,n:r[4][1],nm:r[4][0].startsWith("ALCHEMY")?"Ingrediente raro":"Artefato",art:true});
      const cnt=ing.filter(x=>!x.art).reduce((a,x)=>a+x.n,0);
      out.push({id:bmId(k,t,e),key:k,name:nmKey(k,r[0]),t,e,q:1,ing,city:r[2],bonus:0.15,fee:cnt*IV(t,e)*0.1125,focus:r[5]*FOCUS_CRAFT[t-4][e]/429,fce:bmFCE(k)}); } }
  } else if(cat==="meal"||cat==="potion"){ const kind=cat==="meal"?"f":"p";
    for(const id in COOK.r){ const r=COOK.r[id]; if(r[1]!==kind||!r[3]) continue; const [name,,q,fo,nut,ing]=r;
      out.push({id,key:id,name,t:+id[1],e:0,q,ing:ing.map(([iid,n])=>({id:iid,n,nm:COOK.n[iid]||iid})),city:COOK_CITY[kind],bonus:0.15,fee:q*nut*0.1125,focus:fo,fce:cookFCE(kind,id)}); }
  } else if(cat.startsWith("refine")){ const only=cat.split(":")[1];
    for(const R of REF5) for(let t=4;t<=8;t++) for(let e=0;e<=4;e++){ if(only&&R.ref!==only) continue;
      const prev=t===4?`T3_${R.ref}`:idLv(t-1,R.ref,e);
      out.push({id:idLv(t,R.ref,e),key:R.ref,name:`${R.refPT} T${t}.${e}`,t,e,q:1,ing:[{id:idLv(t,R.raw,e),n:N[t],nm:`${R.rawPT} T${t}.${e}`},{id:prev,n:1,nm:`${R.refPT} ${t===4?"T3":`T${t-1}.${e}`}`}],city:R.city,bonus:0.40,fee:IV(t,e)*0.1125,focus:FOCUS_REF[t-4][e],fce:refFCEt(R.k,t)}); }
  }
  return out;
}
/* receitas por grupo: busca só os tiers e encantamentos do filtro; com "Mercado Negro" como destino, busca também as ordens de compra de lá */
async function ensureOfG(cat,note){
  const tiers=OF.tier?[OF.tier]:[4,5,6,7,8], enchs=OF.ench>=0?[OF.ench]:[0,1,2,3,4], bm=sellBM(), groups=ofGroups(cat);
  let feitos=0; const total=groups.length;
  try{
    for(const gg of groups){
      const ids=[], idsBM=[], extra=new Set(), mats=new Set();
      for(const k of bmKeys(gg)) for(const t of tiers){ let usado=false; for(const e of enchs){
        const kk=`${k}|${t}|${e}`; const idg=bmId(k,t,e);
        if(!OF.loaded.has("p|"+kk)){ ids.push(idg); usado=true; for(const [,c] of BM[k][3].matchAll(/([MPLC])(\d+)/g)) mats.add(apiLv(t,BM_RES[c],e)); }
        if(bm&&!OF.loaded.has("b|"+kk)) idsBM.push(idg); }
        if(usado&&BM[k][4]) extra.add(`T${t}_${BM[k][4][0]}`); }
      if(ids.length||idsBM.length){ if(note) note.textContent=`Consultando preços (${feitos+1} de ${total} grupos)…`;
        if(ids.length){ await fetchIds(ids,DATA.itens,SHOP_LOCS); await fetchIds([...mats,...extra],DATA.itens,SHOP_LOCS); }
        if(idsBM.length) await fetchIds(idsBM,DATA.itens,["Black Market"]);
        for(const id of ids){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id); OF.loaded.add(`p|${m[2]}|${m[1]}|${m[3]||0}`); }
        for(const id of idsBM){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id); OF.loaded.add(`b|${m[2]}|${m[1]}|${m[3]||0}`); } }
      feitos++; }
    return true;
  }catch(e){ return false; }
}
async function ensureOf(cat){
  if(cat.startsWith("refine")) cat="refine";
  if(OF.loaded.has(cat)) return true;
  try{
    if(cat.startsWith("g:")){ const g=cat.slice(2); const ids=[], extra=new Set(), mats=new Set();
      for(const k of bmKeys(g)) for(let t=4;t<=8;t++){ for(let e=0;e<=4;e++){ ids.push(bmId(k,t,e)); for(const [,c] of BM[k][3].matchAll(/([MPLC])(\d+)/g)) mats.add(apiLv(t,BM_RES[c],e)); } if(BM[k][4]) extra.add(`T${t}_${BM[k][4][0]}`); }
      await fetchIds(ids,DATA.itens,SHOP_LOCS); await fetchIds([...mats,...extra],DATA.itens,SHOP_LOCS);
    } else if(cat==="meal"||cat==="potion"){ const ok=await ensureCook(); if(!ok) return false; }
    else { const ids=new Set(); for(const R of REF5){ ids.add(`T3_${R.ref}`); for(let t=4;t<=8;t++) for(let e=0;e<=4;e++){ ids.add(apiLv(t,R.raw,e)); ids.add(apiLv(t,R.ref,e)); } } await fetchIds([...ids],DATA.itens,SHOP_LOCS); }
    OF.loaded.add(cat); return true;
  }catch(e){ return false; }
}
const OF2 = {ov:{}, manS:0, manB:0, qty:10, hs:{}, qual:0, tax:true, rrMan:null, open:new Set()};
function bestIn(tbl,id,field,want,only){ const r=tbl[id.includes("_LEVEL")?id.split("@")[0]:id]; if(!r) return null; let b=null; for(const [c,v] of Object.entries(r)){ if(only&&c!==only) continue; const p=v[field]; if(!(p>0)) continue; if(!b||(want==="min"?p<b.p:p>b.p)) b={p,c,t:v[field+2]||snapTime()}; } return b; }
const sellBM = () => OF.sellC.has("Black Market");
const sellLocs = () => { const l=[]; if(!OF.sellC.size||[...OF.sellC].some(c=>c!=="Black Market")) l.push(...SHOP_LOCS); if(sellBM()) l.push("Black Market"); return l; };
const ofSig = () => [...OF.sellC].sort().join(",")+"|"+OF.sellS+"|"+OF.buyS+"|"+OF.city;
const avgOf = (id,c) => { const h=OF2.hs[nk(id)+"|"+c]; return h&&h.avg>0?h.avg:0; };
function pickBuy(id,ov){
  if(OF.buyS==="manual"&&OF2.manB>0) return {p:OF2.manB,c:OF.city||"Manual",t:0,mode:"manual"};
  const r=DATA.itens[id.includes("_LEVEL")?id.split("@")[0]:id]||{}; let best=null;
  for(const c of (ov?[ov]:OF.city?[OF.city]:SHOP_LOCS)){ const v=r[c]; let p=0,t=0,mode="inst";
    if(OF.buyS==="medio"){ p=avgOf(id,c); mode="medio"; } else if(OF.buyS==="ordem"){ p=v?v[1]:0; t=v?v[3]:0; mode="ordem"; } else { p=v?v[0]:0; t=v?v[2]:0; }
    if(p>0&&(!best||p<best.p)) best={p,c,t:t||snapTime(),mode}; }
  return best; }
function pickSell(id,ov){
  const cands=ov?[ov]:OF.sellC.size?[...OF.sellC]:SHOP_LOCS;
  if(OF.sellS==="manual"&&OF2.manS>0) return {p:OF2.manS,c:cands[0]||"Manual",t:0,mode:"manual"};
  const tbl=OF2.qual>1?PQ[OF2.qual]:DATA.itens, r=tbl[id.includes("_LEVEL")?id.split("@")[0]:id]||{}; let best=null;
  for(const c of cands){ const v=r[c]; let p=0,t=0,mode="ordem";
    if(c==="Black Market"){ p=v?v[1]:0; t=v?v[3]:0; mode="inst"; }
    else if(OF.sellS==="medio"){ p=avgOf(id,c); mode="medio"; }
    else if(OF.sellS==="inst"){ p=v?v[1]:0; t=v?v[3]:0; mode="inst"; }
    else { p=v?v[0]:0; t=v?v[2]:0; }
    if(p>0&&(!best||p>best.p)) best={p,c,t:t||snapTime(),mode}; }
  return best; }
function ofRRbase(it){ const fb=it.bonus===0.40?0.40:0.15;
  if(OF.rr==="none") return rrr(0,false,st.daily); if(OF.rr==="focus") return rrr(fb,true,st.daily); return rrr(fb,false,st.daily); }
function ofRR(it){ return OF2.rrMan!=null?OF2.rrMan:ofRRbase(it); }
/* quantidade que o jogo devolve: o arredondamento é por jogada, aqui usamos a média */
function ofN(){ return OF2.qty>0?OF2.qty:10; }
/* custo e lucro de N receitas: o retorno é aplicado ao total de cada material e arredondado para cima, como se compra no jogo */
function ofModel(it,rrOv){
  const ovS=OF2.ov["s|"+it.id]; const sale=(ovS&&pickSell(it.id,ovS))||pickSell(it.id); if(!sale) return null;
  const N=ofN(); let mat=0, buyFee=0, miss=0; const rr=rrOv!=null?rrOv:ofRR(it), parts=[];
  for(const g of it.ing){ const ovB=OF2.ov["b|"+it.id+"|"+g.id]; const b=(ovB&&pickBuy(g.id,ovB))||pickBuy(g.id); if(!b){ miss++; parts.push({...g,b:null}); continue; }
    const unit=b.p, total=g.n*N, need=g.art?total:Math.ceil(total*(1-rr)-1e-9), ret=total-need, base=need*unit, bf=b.mode==="ordem"?base*0.025:0;
    mat+=base; buyFee+=bf; parts.push({...g,b,unit,total,need,ret,pay:need,sub:base+bf,retVal:ret*unit}); }
  if(miss) return {it,sale,parts,miss};
  const fee=it.fee*feeVal()/100*N, cost=mat+buyFee+fee;
  const tax=OF2.tax?((st.prem?0.04:0.08)+(sale.mode==="ordem"?0.025:0)):0, gross=N*it.q*sale.p, taxV=gross*tax, net=gross-taxV, costReal=cost+taxV, profit=gross-costReal;
  const fc1=Math.max(1,Math.round(it.focus*Math.pow(0.5,(it.fce||0)/10000)));
  return {it,N,sale,parts,cost,costReal,mat,buyFee,net,gross,taxV,profit,pct:costReal>0?profit/costReal:0,rr,fee,fc:fc1*N,fc1,units:N*it.q};
}
/* preços na qualidade escolhida para o item fabricado */
async function ensureOfQ(items){
  const q=OF2.qual; if(q<2) return true; const locs=sellLocs(), sg=locs.join();
  const ids=[...new Set(items.map(i=>i.id))].filter(id=>!OF.loaded.has(`q${q}|${sg}|${id}`));
  if(!ids.length) return true;
  try{ await fetchIds(ids,PQ[q],locs,q); ids.forEach(id=>OF.loaded.add(`q${q}|${sg}|${id}`)); return true; }catch(e){ return false; }
}
const ofPct = v => dec(v*100)+"%";
function ofSyncRR(){ const r=$("ofRRs"); if(!r) return; const it=OF2.sample||{bonus:0.15}; const v=OF2.rrMan!=null?OF2.rrMan:ofRRbase(it); r.value=Math.round(v*1000)/10; $("ofRRv").textContent=dec(v*100)+"%";
  const fb=it.bonus===0.40?0.40:0.15, base={none:rrr(0,false,st.daily),auto:rrr(fb,false,st.daily),focus:rrr(fb,true,st.daily)};
  document.querySelectorAll("#ofRRp button").forEach(b=>{ const k=b.dataset.rr; b.textContent=dec(base[k]*100); b.setAttribute("aria-pressed",String(OF2.rrMan==null&&OF.rr===k)); });
  $("ofFocus").checked=OF2.rrMan==null&&OF.rr==="focus"; { const bx=$("ofFocBox"); if(bx){ bx.hidden=!$("ofFocus").checked; FOC_UIS.forEach(u=>u._sync()); } } }
function ofFillCats(){
  const sel=$("ofCat"); sel.textContent="";
  const groups={}; for(const c of ofCats()){ (groups[c.grp]||(groups[c.grp]=el("optgroup",{label:c.grp}))).append(el("option",{value:c.k,text:c.label})); }
  ["Todos","Por recurso","Suas armas","Armaduras","Consumíveis","Outras armas"].forEach(g=>{ if(groups[g]) sel.append(groups[g]); });
  sel.value=store.get(OF.mode==="refine"?"ofCatR":"ofCat")||sel.options[0].value; if(sel.selectedIndex<0) sel.selectedIndex=0;
}
const OF_FOOT_C=null;
function ofApplyMode(mode){
  if(OF.mode===mode) return; const ref=mode==="refine";
  if(OF.mode){ OF2["tier_"+OF.mode]=OF.tier; OF2["ench_"+OF.mode]=OF.ench; OF2["qty_"+OF.mode]=OF2.qty; if(OF.mode==="craft") OF2.qualSaved=OF2.qual; }
  OF.mode=mode; $(ref?"ofSlotRef":"ofSlotCraft").append($("ofRoot"));
  const fill=(box,opts)=>{ box.textContent=""; opts.forEach(([v,t])=>box.append(el("option",{value:String(v),text:t}))); };
  const tiers=ref?[4,5,6,7,8]:[1,2,3,4,5,6,7,8];
  fill($("ofTier"),[[0,"Todos"],...tiers.map(t=>[t,`T${t}`])]); fill($("ofEnch"),[[-1,"Todos"],...[0,1,2,3,4].map(e=>[e,`.${e}`])]);
  OF.tier=OF2["tier_"+mode]||0; OF.ench=OF2["ench_"+mode]??-1; OF2.qty=OF2["qty_"+mode]||(ref?100:10);
  $("ofTier").value=String(OF.tier); $("ofEnch").value=String(OF.ench); $("ofQty").value=String(OF2.qty);
  $("ofQualBox").hidden=ref; if(ref) OF2.qual=0; else { OF2.qual=OF2.qualSaved||0; $("ofQual").value=String(OF2.qual); }
  $("ofTitle").textContent=ref?"Oficina de refino":"Oficina"; $("ofRcT").textContent=ref?"Refino":"Receita";
  $("ofRcS").textContent=ref?"unidades a refinar de cada item":"receitas a fabricar de cada item"; $("ofQty").setAttribute("aria-label",ref?"Quantidade de unidades a refinar":"Quantidade de receitas a fabricar");
  $("ofFind").placeholder=ref?"Nome do recurso":"Nome do item";
  if(OF2.footC==null) OF2.footC=$("ofFoot").textContent;
  $("ofFoot").textContent=ref?"Atalhos de retorno: 15,3% (estação sem bônus), 36,7% (cidade com o bônus de refino daquele recurso) e 53,9% (cidade com bônus e foco). Cada unidade refinada usa a quantidade do tier de matéria-prima (T4 usa 2, T5 usa 3, T6 usa 4, T7 e T8 usam 5) mais 1 unidade refinada do tier anterior, com o mesmo encantamento (T4 usa a de T3). O retorno vale para os dois, e é arredondado para cima na compra. Bônus de refino: Thetford minério, Lymhurst fibra, Martlock pelego, Fort Sterling madeira, Bridgewatch pedra. Taxa da estação = valor do item × 0,1125 × taxa ÷ 100. O custo de foco cai pela metade a cada 10.000 de eficiência, que sai das specs de refino da sua ficha. Premium gera 10.000 de foco por dia. O produto refinado não tem qualidade, então só o preço importa. Os controles de Premium, bônus diário e taxa valem para o site todo.":OF2.footC;
  ofFillCats(); OF2.open.clear();
}
function setupOf(){
  const sel=$("ofCat"); if(OF2.init) return; OF2.init=1;
  const fill=(box,opts)=>opts.forEach(([v,t])=>box.append(el("option",{value:String(v),text:t})));
  fill($("ofQual"),[[0,"Automática"],...[1,2,3,4,5].map(q=>[q,QNAME[q]])]);
  const bind=(id,key,num,store_)=>$(id).addEventListener("change",()=>{ (store_||OF)[key]=num?+$(id).value:$(id).value; renderOf(); });
  bind("ofTier","tier",1); bind("ofEnch","ench",1); bind("ofQual","qual",1,OF2); ofCards();
  $("ofRRp").addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; OF2.rrMan=null; OF.rr=b.dataset.rr; renderOf(); });
  $("ofRRs").addEventListener("input",()=>{ OF2.rrMan=+$("ofRRs").value/100; $("ofRRv").textContent=dec(OF2.rrMan*100)+"%"; renderOf(); });
  { const bx=$("ofFocBox"); if(bx&&!bx.firstChild) bx.append(focBudUI(renderOf,"O foco só aumenta o retorno de recursos. Em cada item aberto aparece quantas unidades o foco do dia cobre.")); }
  $("ofFocus").addEventListener("change",()=>{ OF2.rrMan=null; OF.rr=$("ofFocus").checked?"focus":"auto"; renderOf(); });
  $("ofTax").addEventListener("change",()=>{ OF2.tax=$("ofTax").checked; renderOf(); });
  $("ofPrem").addEventListener("change",()=>{ document.querySelector(`[data-g="prem"][data-v="${$("ofPrem").checked?1:0}"]`).click(); renderOf(); });
  $("ofDaily").addEventListener("change",()=>{ document.querySelector(`[data-g="daily"][data-v="${$("ofDaily").checked?0.1:0}"]`).click(); renderOf(); });
  $("ofQty").addEventListener("input",()=>{ OF2.qty=Math.max(0,Math.floor(+$("ofQty").value)||0); renderOf(); });
  $("ofFee").value=$("ofFeeS").value=$("fee").value; const feeSet=v=>{ $("fee").value=v; $("fee").dispatchEvent(new Event("input")); $("ofFee").value=$("ofFeeS").value=v; renderOf(); }; $("ofFee").addEventListener("input",()=>feeSet($("ofFee").value)); $("ofFeeS").addEventListener("input",()=>feeSet($("ofFeeS").value));
  $("ofFeeP").addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; feeSet(b.dataset.f); });
  $("ofPrem").checked=!!st.prem; $("ofDaily").checked=st.daily>0;
  sel.addEventListener("change",()=>{ store.set(OF.mode==="refine"?"ofCatR":"ofCat",sel.value); OF2.open.clear(); renderOf(); });
  document.querySelectorAll(".of-sort button").forEach(b=>b.addEventListener("click",()=>{ OF.sort=b.dataset.sort; document.querySelectorAll(".of-sort button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); renderOf(); }));
  $("ofFind").addEventListener("input",()=>{ OF.q=$("ofFind").value.trim().toLowerCase(); renderOf(); });
  $("ofPrices").addEventListener("click",async()=>{ const b=$("ofPrices"); b.disabled=true; b.textContent="Atualizando…"; try{ await loadLive(true); }catch(e){} b.disabled=false; b.textContent="Atualizar preços"; });
}
function chip(g){
  const d=el("span",{class:"chip",title:`${g.nm}${g.b?`: ${fmt(g.b.p)} em ${g.b.c}`:": sem preço"}`});
  d.append(iconImg(g.id.replace(/_LEVEL(\d)$/,"_LEVEL$1@$1"),28),el("span",{class:"q",text:`${g.n}×`}));
  const t=el("span",{class:"cp"}); if(g.b){ t.append(el("b",{text:fmtS(g.b.p)}),el("small",{text:g.b.c}),ageSpan(g.b.t)||""); } else t.append(el("small",{class:"loss",text:"sem preço"}));
  d.append(t); return d;
}
const ofQN = q => (q>1?QNAME[q]:"Normal").toUpperCase();
function ofCitySel(opts,cur,onPick){
  const sel=el("select",{class:"of-csel","aria-label":"Cidade"}); opts.forEach(c=>sel.append(el("option",{value:c,text:c}))); sel.value=cur;
  sel.addEventListener("click",ev=>ev.stopPropagation()); sel.addEventListener("change",()=>onPick(sel.value)); return sel; }
function ofDetail(m){
  const d=el("div",{class:"of-xp"}); const left=el("div",{class:"of-xl"});
  left.append(el("h4",{class:"of-xh",text:"Preços & quantidades"}));
  const hd=el("div",{class:"of-xr of-xhd"}); ["Stats","Item","Valor","Tempo","Cidade","Qtd"].forEach(x=>hd.append(el("span",{text:x}))); left.append(hd);
  const row=(kind,id,nmText,pr,locs,onPick,qty,sub,q)=>{
    const r=el("div",{class:"of-xr "+kind});
    const lab=kind==="sale"?({ordem:"ORDEM VENDA",medio:"VALOR MÉDIO",manual:"VALOR MANUAL"}[pr.mode]||"VENDA INST"):({ordem:"ORDEM COMPRA",medio:"VALOR MÉDIO",manual:"VALOR MANUAL"}[pr.mode]||"COMPRA INST");
    r.append(el("span",{class:"of-pill "+kind,text:lab}));
    const it_=el("span",{class:"of-xi"}); it_.append(el("i",{class:"of-dot"+(kind==="buy"?" red":"")}),iconImg(nk(id),34,q||1)); const nm=el("span",{class:"of-xn"}); nm.append(el("b",{text:nmText})); if(sub) nm.append(el("small",{text:sub})); it_.append(nm); r.append(it_);
    r.append(el("b",{class:"of-xv",text:fmt(pr.p)}),el("span",{class:"of-xt"},ageSpan(pr.t)||"—"));
    const cc=el("span",{class:"of-xc"}); cc.append(locs.length>1?ofCitySel(locs,pr.c,onPick):pr.c); r.append(cc,el("span",{class:"of-xq",text:fmt(qty)+"x"})); return r; };
  const sellLocsFor=()=>(OF.sellC.size?[...new Set([...OF.sellC,...sellLocs()])]:sellLocs()).filter(c=>pickSell(m.it.id,c));
  const redo=()=>renderOf();
  left.append(row("sale",m.it.id,m.it.name,m.sale,sellLocsFor(),c=>{ OF2.ov["s|"+m.it.id]=c; redo(); },m.units,"",OF2.qual>1?OF2.qual:1));
  for(const g of m.parts){ const locs=SHOP_LOCS.filter(c=>pickBuy(g.id,c));
    left.append(row("buy",g.id,g.nm,g.b,locs,c=>{ OF2.ov["b|"+m.it.id+"|"+g.id]=c; redo(); },g.need,g.art?`${fmt(g.total)} · artefato não volta`:`${fmt(g.total)} na receita · volta ${fmt(g.ret)}`)); }
  const right=el("div",{class:"of-xs"});
  const card=(cls,title,lines,tot)=>{ const c=el("div",{class:"of-xcard "+cls}); c.append(el("h4",{class:"of-xh",text:title})); for(const [k,v,cc] of lines){ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{class:cc||"",text:v})); c.append(l); } if(tot){ const l=el("div",{class:"of-xline of-xtot"}); l.append(el("span",{text:tot[0]}),el("b",{text:tot[1]})); c.append(l); } return c; };
  right.append(card("cost","Custos detalhados (−)",[["Matérias primas",fmt(m.mat)],["Taxa de nutrição",fmt(m.fee)],["Taxa de compra (pedidos)",fmt(m.buyFee)],["Taxa de venda"+(OF2.tax?(st.prem?" (Premium)":""):" (desligada)"),fmt(m.taxV)]],["Custo total real",fmt(m.costReal)]));
  right.append(card("res","Resultado (+)",[[OF.mode==="refine"?"Unidades a refinar":`Receitas a fabricar`,fmt(m.N)+(m.it.q>1?` (${fmt(m.units)} un.)`:"")],["Retorno de recursos",ofPct(m.rr)],["Valor do que volta",fmt(m.parts.reduce((a,g)=>a+(g.retVal||0),0)),"gain"],["Venda bruta",fmt(m.gross)],[OF.mode==="refine"?"Lucro por unidade":"Lucro por receita",sgn(m.profit/m.N)],["Foco gasto",fmt(m.fc)],["Lucro total ÷ foco gasto",fmt(m.profit/m.fc)]],["Lucro total",sgn(m.profit)]));
  { ofSpf(m); const fb=ofFB(m.it); const c=el("div",{class:"of-xcard foc"}); c.append(el("h4",{class:"of-xh",text:"Com foco ou sem foco"}));
    const ln=(k,v,cc)=>{ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{class:cc||"",text:v})); c.append(l); };
    if(m.pN&&m.pF){ const pr=x=>`${sgn(x.profit)} (${x.pct>=0?"+":""}${dec(x.pct*100)}%)`;
      ln(`Sem foco, retorno ${ofPct(m.pN.rr)}`,pr(m.pN),m.pN.profit>=0?"gain":"loss"); ln(`Com foco, retorno ${ofPct(m.pF.rr)}`,pr(m.pF),m.pF.profit>=0?"gain":"loss");
      ln("Foco gasto por unidade",fmt(m.pF.fc1)); ln("Foco gasto no total",fmt(m.pF.fc)); ln("Ganho extra por ponto de foco",dec(m.spf));
      const bud=focBud(), day=Math.floor(bud/m.pF.fc1); if(day>0){ const perU=m.pF.profit/m.pF.units; ln(`Com ${fmt(bud)} de foco por dia`,`${fmt(day*m.it.q)} un. · ${sgn(day*m.it.q*perU)}`,perU>=0?"gain":"loss"); }
      else ln(`Com ${fmt(bud)} de foco por dia`,st.prem?"não dá para 1 unidade":"sem Premium não há foco"); }
    else c.append(el("p",{class:"tiny muted",text:"Faltam preços para comparar."}));
    c.append(el("p",{class:"tiny muted",text:"O foco entra só no retorno de recursos; o custo de foco usa as specs da sua ficha."}));
    right.append(c); }
  d.append(left,right); return d;
}
const ofFB = it => it.bonus===0.40?0.40:0.15;
/* ganho extra de usar foco, por ponto de foco gasto: (lucro com foco − lucro sem foco) ÷ foco */
function ofSpf(m){ if(m.spf!=null) return m.spf; const fb=ofFB(m.it), a=ofModel(m.it,rrr(fb,true,st.daily)), b=ofModel(m.it,rrr(fb,false,st.daily));
  m.spf=a&&b&&!a.miss&&!b.miss&&a.fc>0?(a.profit-b.profit)/a.fc:-Infinity; m.pF=a&&!a.miss?a:null; m.pN=b&&!b.miss?b:null; return m.spf; }
function ofSorter(){ if(OF.sort==="pct") return (a,b)=>b.pct-a.pct; if(OF.sort==="focus") return (a,b)=>ofSpf(b)-ofSpf(a); return (a,b)=>b.profit-a.profit; }
async function renderOf(){
  const note=$("ofNote"), tb=$("ofTable");
  if(!BM){ try{ BM=await need("bm"); }catch(e){ note.textContent="Não consegui abrir as receitas."; return; } }
  ofApplyMode(!$("p-refino").hidden?"refine":!$("p-craft").hidden?"craft":(OF.mode||"craft")); setupOf(); const cat=$("ofCat").value;
  const isG=cat.startsWith("g:"), agg=cat.startsWith("g:*");
  $("ofPrem").checked=!!st.prem; $("ofDaily").checked=st.daily>0;
  if(agg&&!OF.tier){ tb.textContent=""; $("ofCount").textContent="—"; note.textContent="Para comparar todos os itens do grupo, escolha um tier (T4 a T8) no painel à esquerda. O encantamento pode ficar em Todos."; return; }
  const sellKey=ofSig(), tierKey=OF.tier, enchKey=OF.ench, qKey=OF2.qual;
  const stale=()=>$("ofCat").value!==cat||ofSig()!==sellKey||OF.tier!==tierKey||OF.ench!==enchKey||OF2.qual!==qKey;
  if(isG){ tb.textContent=""; note.textContent="Consultando receitas e preços…"; const ok=await ensureOfG(cat,note); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } if(stale()) return; }
  else if(!OF.loaded.has(cat.startsWith("refine")?"refine":cat)){ tb.textContent=""; note.textContent="Consultando receitas e preços…"; const ok=await ensureOf(cat); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } if($("ofCat").value!==cat) return; }
  let items=ofItems(cat).filter(it=>(!OF.tier||it.t===OF.tier)&&(OF.ench<0||it.e===OF.ench)&&(!OF.q||it.name.toLowerCase().includes(OF.q)));
  $("ofCount").textContent=fmt(items.length);
  if(OF2.qual>1&&isG){ note.textContent=`Consultando preços de venda em qualidade ${QNAME[OF2.qual].toLowerCase()}…`; if(!await ensureOfQ(items)){ note.textContent="Não consegui consultar a qualidade agora."; return; } if(stale()) return; }
  if(OF.sellS==='medio'||OF.buyS==='medio'){ note.textContent='Consultando valores médios…'; await ofPrefetchAvg(items); if(stale()) return; }
  OF2.sample=items[0];
  const rows=items.map(it=>ofModel(it)).filter(Boolean), ok=rows.filter(m=>!m.miss).sort(ofSorter()), LIM=agg?120:60, shown=ok.slice(0,LIM);
  ofSyncRR();
  tb.textContent=""; const hr=el("div",{class:"of-lh"}); [["Item",""],["Custo","Custo total real: materiais, taxa da estação, taxas de compra e de venda"],["Venda","Venda bruta, antes das taxas"],["Lucro","Lucro total das receitas"],["Venda e compra","O número no ícone é a quantidade: unidades a vender e materiais a comprar"]].forEach(([h,t])=>hr.append(el("span",{text:h,title:t}))); tb.append(hr);
  const fitW=()=>{ const w=tb.parentNode; if(w) w.style.setProperty("--tblw",(w.clientWidth-8)+"px"); }; fitW(); if(!OF2.rs){ OF2.rs=1; addEventListener("resize",()=>{ const w=$("ofTable").parentNode; w.style.setProperty("--tblw",(w.clientWidth-8)+"px"); }); }
  const body=tb; let oldest=Infinity, newest=0;
  const stamp=t=>{ if(t>0){ oldest=Math.min(oldest,t); newest=Math.max(newest,t); } };
  const qIc=OF2.qual>1&&isG?OF2.qual:1; OF2.rows=[];
  for(const m of shown){ const key=m.it.id; const item=el("div",{class:"of-item"}); body.append(item); const tr=el("div",{class:"of-row"}); item.append(tr); tr.dataset.id=m.it.id; tr.dataset.city=m.sale.c; tr.className="clickrow of-row "+(m.profit>=0?"is-gain":"is-loss"); tr.tabIndex=0; tr.setAttribute("aria-expanded","false");
    stamp(m.sale.t); m.parts.forEach(g=>stamp(g.b&&g.b.t));
    const c0=el("div",{class:"itemcell"}); tr.append(c0); const head=el("div",{class:"ihead"}); const chev=el("span",{class:"of-chev","aria-hidden":"true",text:"▾"});
    const nmb=el("span",{class:"inm"}); nmb.append(el("strong",{text:m.it.name}),el("span",{class:"of-rec",text:OF.mode==="refine"?`${fmt(m.N)} ${m.N>1?"unidades":"unidade"}`:`${fmt(m.N)} ${m.N>1?"receitas":"receita"}`}),el("small",{text:`${m.it.q>1?`fornada de ${m.it.q} · `:""}${OF.mode==="refine"?"refina":"faz"} em ${m.it.city}`})); if(OF.rr==="focus"&&OF2.rrMan==null){ try{ ofSpf(m); }catch(e){} if(m.pF&&m.pF.fc1>0){ const cov=Math.min(m.N,Math.floor(focBud()/m.pF.fc1)), full=cov>=m.N, pc=m.N?Math.round(cov/m.N*100):0, un=OF.mode==="refine"?"unidades":"receitas"; const fm=el("span",{class:"wk-fm"+(full?" full":cov?"":" none"),title:`Cada ${OF.mode==="refine"?"unidade":"receita"} gasta ${fmt(m.pF.fc1)} de foco; com ${fmt(focBud())} por dia o foco cobre ${fmt(cov)} de ${fmt(m.N)}`}); fm.append(el("span",{class:"wk-fl",text:"Foco"}),el("span",{class:"wk-fbar"},el("i",{style:`width:${pc}%`})),el("b",{text:`cobre ${fmt(cov)} de ${fmt(m.N)} ${un}`})); nmb.append(fm); } }
    head.append(iconImg(m.it.id,52,qIc),nmb,chev); c0.append(head); c0.querySelector("img").classList.add("of-itic");
    const stat=(cls,v,lab)=>{ const c=el("div",{class:"of-stat "+cls}); tr.append(c); c.append(el("b",{text:v}),el("small",{text:lab})); return c; };
    stat("loss",fmtS(m.costReal),"CUSTO"); stat("sale",fmtS(m.gross),"VENDA");
    const c3=el("div",{class:"of-stat "+(m.profit>=0?"gain":"loss")}); tr.append(c3); c3.append(el("b",{text:(m.profit>=0?"+":"−")+fmtS(Math.abs(m.profit))}),el("span",{class:"of-pct",text:`${m.pct>=0?"+":""}${dec(m.pct*100)}%`}));
    const c5=el("div",{class:"of-fl"}); tr.append(c5); const flow=el("div",{class:"of-flow"}); flow.append(ofBlock(m.it.id,qIc,m.sale,"sale",m.units,m));
    m.parts.forEach(g=>flow.append(ofBlock(g.id,1,g.b,"buy",g.need,m,g))); c5.append(flow);
    OF2.rows.push({m,tr});
    const dr=el("div",{class:"of-drow"}); dr.hidden=true; item.append(dr); const dc=dr;
    const toggle=()=>{ const open=dr.hidden; dr.hidden=!open; chev.textContent=open?"▴":"▾"; tr.classList.toggle("open",open); tr.setAttribute("aria-expanded",String(open)); if(open){ setTimeout(()=>{ try{ const r=dr.getBoundingClientRect(); if(r.bottom>innerHeight-8||r.top<60) dr.scrollIntoView({block:"nearest",behavior:"smooth"}); }catch(e){} },60); if(!dc.firstChild){ try{ dc.append(ofDetail(m)); }catch(e){ dc.append(el("p",{class:"small loss",text:"Não consegui montar os detalhes deste item: "+(e&&e.message||e)})); } } OF2.open.add(key); } else OF2.open.delete(key); };
    tr.addEventListener("click",ev=>{ if(ev.target.closest("a")) return; toggle(); });
    tr.addEventListener("keydown",ev=>{ if(ev.target===tr&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); toggle(); } });
    if(OF2.open.has(key)) toggle();
  }
  const pos=ok.filter(m=>m.profit>0).length, faltam=rows.length-ok.length, rrs=ok[0]?ok[0].rr:0;
  $("ofAge").textContent=isFinite(oldest)?`Preços coletados há ${fmtAge(newest)}${oldest!==newest?` (mais antigo: ${fmtAge(oldest)})`:""}`:"";
  note.textContent=ok.length?`${ok.length} itens com preço; ${pos} dão lucro. Retorno de recursos: ${dec(rrs*100)}%${OF2.rrMan==null&&OF.rr==="auto"?" (cidade com bônus, sem foco)":""}.${ok.length>LIM?` Mostrando os ${LIM} primeiros de ${fmt(ok.length)} registros, ordenados por ${({profit:"lucro",pct:"lucro %",focus:"lucro por ponto de foco"})[OF.sort]}: não são todos.`:` Mostrando todos os ${fmt(ok.length)} registros, ordenados por ${({profit:"lucro",pct:"lucro %",focus:"lucro por ponto de foco"})[OF.sort]}.`}${sellBM()?" Mercado Negro: vale a melhor ordem de compra de lá, só com a taxa de venda.":""}${faltam?` ${faltam} sem preço de algum material.`:""} Clique numa linha para ver os materiais e o retorno.`:"Nenhum item com preço suficiente nesse filtro.";
  if(window.gsap&&!RM) gsap.from(body.querySelectorAll(".of-row"),{opacity:0,x:-8,duration:.22,stagger:.01,clearProps:"opacity,transform"});
  hbar(tb.parentNode); fillVolumes(shown);
}
const nk = id => id.replace(/_LEVEL(\d)$/,"_LEVEL$1@$1");
const ofVolN_unused = m => { const h=OF2.hs[nk(m.it.id)+"|"+m.sale.c]; return OF2.qty>0?OF2.qty:Math.max(1,Math.round(h&&h.vol>0?h.vol:1)); };
/* bloco visual: ícone com a quantidade, cidade, tipo de preço, preço, idade e média/volume */
function ofBlock(id,q,pr,kind,qty,m,g){
  const w=el("div",{class:"of-blk"}); const tile=el("span",{class:"of-tile"}); tile.append(iconImg(nk(id),48,q)); const bd=el("span",{class:"of-badge",text:fmt(qty)}); tile.append(bd);
  const inf=el("div",{class:"of-bi"}); const red=RED_CITIES.has(pr.c);
  inf.append(el("div",{class:"of-city"},el("i",{class:"of-dot"+(red?" red":"")}),pr.c));
  const lab=kind==="sale"?({ordem:"ORDEM VENDA",medio:"VALOR MÉDIO",manual:"VALOR MANUAL"}[pr.mode]||"VENDA INST"):({ordem:"ORDEM COMPRA",medio:"VALOR MÉDIO",manual:"VALOR MANUAL"}[pr.mode]||"COMPRA INST");
  inf.append(el("div",{class:"of-pr"},el("span",{class:"of-pill "+kind,text:lab}),el("b",{text:fmt(pr.p)}),ageSpan(pr.t)||""));
  const hs=el("div",{class:"of-hs"},"VALOR MÉDIO: ",el("b",{class:"hs-avg",text:"…"})," | UND: ",el("b",{class:"hs-vol",text:"…"}));
  w.dataset.hk=nk(id)+"|"+pr.c; inf.append(hs); w.append(tile,inf);
  if(g&&g.art) tile.title="Artefato: não volta no retorno"; return w; }
function ofUpdateQty(){}
const fmtU = v => v==null?"…":v<0?"—":v<1?"<1":v<10?dec(v):fmt(Math.round(v));
async function histFetch(keys){
  const todo=[...new Set(keys)].filter(k=>OF2.hs[k]==null); const ids=[...new Set(todo.map(k=>k.split("|")[0]))];
  for(let i=0;i<ids.length;i+=20){ const part=ids.slice(i,i+20), mine=todo.filter(k=>part.includes(k.split("|")[0])), locs=[...new Set(mine.map(k=>k.split("|")[1]))];
    try{ const j=await apiJSON(`${HOST}/api/v2/stats/history/${part.join(",")}.json?locations=${locs.join(",").replace(/ /g,"%20")}&time-scale=24`,360);
      const since=Date.now()-7*86400e3, acc={};
      for(const x of j){ const k=nk(x.item_id)+"|"+x.location, a=acc[k]||(acc[k]={n:0,v:0}); for(const d of (x.data||[])) if(Date.parse(d.timestamp+"Z")>=since){ a.n+=d.item_count; a.v+=d.avg_price*d.item_count; } }
      for(const k of mine){ const a=acc[k]; OF2.hs[k]={vol:a?a.n/7:0,avg:a&&a.n?a.v/a.n:0}; }
    }catch(e){ for(const k of mine) OF2.hs[k]={vol:-1,avg:0}; } }
}
async function ofPrefetchAvg(items){
  const keys=[];
  if(OF.sellS==="medio"){ const l=OF.sellC.size?[...OF.sellC]:SHOP_LOCS; for(const it of items) for(const c of l) keys.push(nk(it.id)+"|"+c); }
  if(OF.buyS==="medio"){ const l=OF.city?[OF.city]:SHOP_LOCS; for(const it of items) for(const g of it.ing) if(!g.art) for(const c of l) keys.push(nk(g.id)+"|"+c); }
  await histFetch(keys);
}
async function fillVolumes(shown){
  const keys=[]; for(const m of shown){ keys.push(nk(m.it.id)+"|"+m.sale.c); for(const g of m.parts) if(g.b) keys.push(nk(g.id)+"|"+g.b.c); }
  await histFetch(keys);
  document.querySelectorAll("#ofTable .of-blk").forEach(w=>{ const h=OF2.hs[w.dataset.hk]; if(!h) return; w.querySelector(".hs-avg").textContent=h.avg>0?fmt(h.avg):"—"; const u=w.querySelector(".hs-vol"); u.textContent=fmtU(h.vol); w.title="Média e unidades por dia nos últimos 7 dias nessa cidade, todas as qualidades"; });
  ofUpdateQty();
}
/* cartões de cidade e estratégia, como no albionvip */
const OF_SS=[["auto","Automático"],["ordem","Ordem de Venda"],["medio","Valor Médio"],["inst","Venda Inst."],["manual","Valor Manual"]];
const OF_BS=[["auto","Automático"],["inst","Compra Inst."],["medio","Valor Médio"],["ordem","Ordem de Compra"],["manual","Valor Manual"]];
function ofOpt(text,on,cls,fn){ const b=el("button",{type:"button",class:"of-opt "+cls+(on?" on":"")}); b.append(text); if(on) b.append(el("span",{class:"of-ck",text:"✓"})); b.addEventListener("click",fn); return b; }
function ofCards(){
  const sl=$("ofSellList"); if(!sl) return;
  const redo=()=>{ OF2.ov={}; ofCards(); renderOf(); };
  sl.textContent=""; ["Black Market",...SHOP_LOCS].forEach(c=>sl.append(ofOpt(c,OF.sellC.has(c),"v",()=>{ OF.sellC.has(c)?OF.sellC.delete(c):OF.sellC.add(c); redo(); })));
  const bl=$("ofBuyList"); bl.textContent=""; [["","Automático"],...SHOP_LOCS.map(c=>[c,c])].forEach(([v,t])=>bl.append(ofOpt(t,OF.city===v,"c",()=>{ OF.city=v; redo(); })));
  const ss=$("ofSellS"); ss.textContent=""; OF_SS.forEach(([v,t])=>ss.append(ofOpt(t,OF.sellS===v,"v",()=>{ OF.sellS=v; redo(); })));
  const bs=$("ofBuyS"); bs.textContent=""; OF_BS.forEach(([v,t])=>bs.append(ofOpt(t,OF.buyS===v,"c",()=>{ OF.buyS=v; redo(); })));
  $("ofManS").hidden=OF.sellS!=="manual"; $("ofManB").hidden=OF.buyS!=="manual";
  const n=OF.sellC.size, vs=n?[...OF.sellC].join(", "):"Automático";
  $("ofCityV").textContent=vs; $("ofCityC").textContent=OF.city||"Automático"; $("ofCityS").textContent=`${n||"Auto"} Venda / ${OF.city||"Auto"}`;
  const lab=(L,v)=>L.find(x=>x[0]===v)[1]; $("ofStratV").textContent=lab(OF_SS,OF.sellS); $("ofStratC").textContent=lab(OF_BS,OF.buyS); $("ofStratS").textContent=`${lab(OF_SS,OF.sellS)} / ${lab(OF_BS,OF.buyS)}`;
}
document.addEventListener("click",ev=>{ const h=ev.target.closest(".of-chead"); if(!h) return; const pop=h.parentNode.querySelector(".of-pop"); const open=pop.hidden; pop.hidden=!open; h.setAttribute("aria-expanded",String(open)); h.parentNode.classList.toggle("open",open); });
document.addEventListener("input",ev=>{ if(ev.target.id==="ofManS"){ OF2.manS=+ev.target.value||0; renderOf(); } else if(ev.target.id==="ofManB"){ OF2.manB=+ev.target.value||0; renderOf(); } });

/* ================= mercado: todos os itens do jogo ================= */
let CATALOG = null;                 // data/catalog.json: c: categorias, i: [id, categoria, subcategoria, tier, encantável, nome PT, nome EN]
const MK = {limit:180, cat:"", sub:"", city:"", tier:0, ench:-1, qual:1, q:"", only:true};   // qual: qualidade dos preços e dos ícones (1 a 5); q é o texto da busca
const SUB_PT = {resources:"Recursos brutos",refinedresources:"Recursos refinados",fish:"Peixes",alchemy:"Ingredientes de alquimia",cityresources:"Recursos de cidade",tokens:"Fichas",food:"Comidas",potions:"Poções",tomes:"Tomos",silverbag:"Sacos de prata",
  plate_armor:"Placa",leather_armor:"Couro",cloth_armor:"Pano",plate_helmet:"Placa",leather_helmet:"Couro",cloth_helmet:"Pano",plate_shoes:"Placa",leather_shoes:"Couro",cloth_shoes:"Pano",shieldtype:"Escudos",booktype:"Livros",torchtype:"Tochas",
  bags:"Bolsas",satchels:"Bolsas de lado",labourers:"Trabalhadores e diários",luxurygoods:"Artigos de luxo",maps:"Mapas",trash:"Sucata",killtrophy:"Troféus",lootitem:"Saque",farm:"Sementes e colheitas",pasture:"Animais",kennel:"Montarias da fazenda",herbgarden:"Ervas",farmingproducts:"Produtos",
  ore:"Minério",fiber:"Fibra",hide:"Pelego",wood:"Madeira",rock:"Pedra",tracking:"Rastreio",
  weapons:"Armas",armors:"Peito",head:"Cabeça",shoes:"Pés",offhands:"Mão secundária",capes:"Capas",fragments:"Fragmentos",favor:"Fichas de favor",
  avatar:"Avatares",avatarring:"Molduras de avatar",mounts:"Montarias",killemotes:"Emotes",world:"Mundo",island:"Ilha",house:"Casa",chest:"Baús",repairkit:"Kits de reparo",
  basemounts:"Montarias comuns",battle_mount:"Montarias de batalha",raremounts:"Montarias raras",questitems:"Missões",guilds:"Guilda",other:"Outros",
  accessoires_capes_capes:"Capas comuns",accessoires_capes_bridgewatch:"Capas de Bridgewatch",accessoires_capes_fortsterling:"Capas de Fort Sterling",accessoires_capes_lymhurst:"Capas de Lymhurst",accessoires_capes_martlock:"Capas de Martlock",accessoires_capes_thetford:"Capas de Thetford",accessoires_capes_caerleon:"Capas de Caerleon",accessoires_capes_brecilien:"Capas de Brecilien",accessoires_capes_avalon:"Capas de Avalon",accessoires_capes_smuggler:"Capas de contrabandista",accessoires_capes_heretic:"Capas de herege",accessoires_capes_undead:"Capas mortas-vivas",accessoires_capes_keeper:"Capas de guardião",accessoires_capes_morgana:"Capas de Morgana",accessoires_capes_demon:"Capas demoníacas"};
const LINE_SUB = {sword:"espada",axe:"machado",mace:"maca",hammer:"martelo",spear:"lanca",quarterstaff:"bordao",dagger:"adaga",knuckles:"luvas",bow:"arco",crossbow:"besta",shapeshifterstaff:"metamorfo",firestaff:"fogo",froststaff:"gelo",arcanestaff:"arcano",holystaff:"sagrado",naturestaff:"natureza",cursestaff:"maldito"};
const subName = s => SUB_PT[s] || (LINE_SUB[s]&&LINE_NAME[LINE_SUB[s]]) || (s||"Outros").replace(/_/g," ").replace(/^\w/,c=>c.toUpperCase());
const isLevelRes = r => r[2]==="resources"||r[2]==="refinedresources";
function mkId(r,e){ if(!e) return r[0]; return isLevelRes(r) ? `${r[0]}_LEVEL${e}@${e}` : `${r[0]}@${e}`; }
const mkKey = id => id.includes("_LEVEL") ? id.split("@")[0] : id;
const mkName = r => (LANG==="en" ? r[6] : r[5]) || r[6] || r[0];
function setupMk(){
  const sel=$("mkCat"); if(sel.options.length) return;
  const order=["crafting","weapons","armors","head","shoes","offhands","capes","consumables","farming","gathering","mounts","bags","artefacts","furniture","other","vanity"];
  sel.append(el("option",{value:"",text:"Todas"})); for(const c of order) if(CATALOG.c[c]) sel.append(el("option",{value:c,text:CATALOG.c[c]}));
  { const sv=store.get("mkCat2"); sel.value=sv==null?"":sv; if(sel.value!==(sv==null?"":sv)) sel.value=""; } MK.cat=sel.value; MK.sub="";
  const fillSel=(id,opts,val,key)=>{ const x=$(id); opts.forEach(([v,t])=>x.append(el("option",{value:String(v),text:t}))); x.value=String(val); x.addEventListener("change",()=>{ MK[key]=id==="mkCity"?x.value:+x.value; MK.limit=180; renderMk(); }); };
  fillSel("mkTier",[[0,"Todos"],...[1,2,3,4,5,6,7,8].map(t=>[t,`T${t}`])],MK.tier,"tier");
  fillSel("mkEnch",[[-1,"Todos"],...[0,1,2,3,4].map(e=>[e,`.${e}`])],MK.ench,"ench");
  fillSel("mkQual",[1,2,3,4,5].map(q=>[q,QNAME[q]]),MK.qual,"qual");
  fillSel("mkCity",[["","Todas as cidades"],...SHOP_LOCS.map(c=>[c,c])],"","city");
  sel.addEventListener("change",()=>{ MK.limit=180; MK.cat=sel.value; MK.sub=""; store.set("mkCat2",sel.value); fillSubs(); renderMk(); });
  $("mkSub").addEventListener("change",()=>{ MK.limit=180; MK.sub=$("mkSub").value; renderMk(); });
  let tmr=null; $("mkFind").addEventListener("input",()=>{ clearTimeout(tmr); tmr=setTimeout(()=>{ MK.limit=180; MK.q=$("mkFind").value.trim().toLowerCase(); renderMk(); },250); });
  $("mkOnly").addEventListener("change",()=>{ MK.only=$("mkOnly").checked; renderMk(); });
  fillSubs();
}
function fillSubs(){ const ss=$("mkSub"); ss.textContent=""; ss.append(el("option",{value:"",text:"Todas"}));
  const subs=(MK.cat?[...new Set(CATALOG.i.filter(r=>r[1]===MK.cat).map(r=>r[2]))]:[]).sort((a,b)=>subName(a).localeCompare(subName(b),"pt-BR")); subs.forEach(s=>ss.append(el("option",{value:s,text:subName(s)}))); ss.value=MK.sub; }
function extremes(id,q=1){ const r=(q>1?(PQ[q]||{}):DATA.itens)[mkKey(id)]||{}; const out={smax:null,smin:null,bmax:null,bmin:null};
  for(const [c,v] of Object.entries(r)){ if(v[0]>0){ if(!out.smax||v[0]>out.smax.p) out.smax={p:v[0],c,t:v[2]}; if(!out.smin||v[0]<out.smin.p) out.smin={p:v[0],c,t:v[2]}; }
    if(v[1]>0){ if(!out.bmax||v[1]>out.bmax.p) out.bmax={p:v[1],c,t:v[3]}; if(!out.bmin||v[1]<out.bmin.p) out.bmin={p:v[1],c,t:v[3]}; } } return out; }
const MK_SEEN = new Set();
async function renderMk(){
  const note=$("mkNote"), tb=$("mkTable");
  if(!CATALOG){ note.textContent="Abrindo o catálogo de itens do jogo…"; try{ CATALOG=await need("catalog"); }catch(e){ note.textContent="Não consegui abrir o catálogo."; return; } }
  setupMk();
  const q=MK.q, search=q.length>=2;
  let base=CATALOG.i.filter(r=> search ? ((r[5]||"").toLowerCase().includes(q)||(r[6]||"").toLowerCase().includes(q)||r[0].toLowerCase().includes(q)) : ((!MK.cat||r[1]===MK.cat)&&(!MK.sub||r[2]===MK.sub)));
  base=base.filter(r=>!MK.tier||r[3]===MK.tier);
  if(search){ const rank={weapons:0,armors:1,head:1,shoes:1,offhands:2,capes:2,crafting:3,consumables:3,farming:4,mounts:4,bags:4,gathering:5,artefacts:6,other:7,furniture:8,vanity:9};
    const nm_=r=>(mkName(r)||"").toLowerCase(); base.sort((a,b)=>((nm_(b).startsWith(q))-(nm_(a).startsWith(q)))||((rank[a[1]]??9)-(rank[b[1]]??9))||(a[3]-b[3])); }
  else if(!MK.cat){ const rank={weapons:0,armors:1,head:1,shoes:1,offhands:2,capes:2,crafting:3,consumables:3,farming:4,mounts:4,bags:4,gathering:5,artefacts:6,other:7,furniture:8,vanity:9}; base.sort((a,b)=>((rank[a[1]]??9)-(rank[b[1]]??9))||mkName(a).localeCompare(mkName(b),"pt-BR")||(a[3]-b[3])); }
  else base.sort((a,b)=>subName(a[2]).localeCompare(subName(b[2]),"pt-BR")||mkName(a).localeCompare(mkName(b),"pt-BR")||(a[3]-b[3]));
  const list=[]; for(const r of base){ const es = MK.ench<0 ? (r[4]||isLevelRes(r)?[0,1,2,3,4]:[0]) : (MK.ench===0||r[4]||isLevelRes(r)?[MK.ench]:[]); for(const e of es) list.push({r,e,id:mkId(r,e)}); }
  const total=list.length, slice=list.slice(0,MK.limit);
  const mq=MK.qual, seen=id=>mq>1?`${mq}|${id}`:id;
  const want=slice.map(x=>x.id).filter(id=>!MK_SEEN.has(seen(id)));
  if(want.length){ note.textContent=`Consultando ${want.length} itens em todas as cidades${mq>1?`, qualidade ${QNAME[mq].toLowerCase()}`:""}…`; tb.textContent="";
    try{ await fetchIds(want,mq>1?PQ[mq]:DATA.itens,SHOP_LOCS,mq); want.forEach(id=>MK_SEEN.add(seen(id))); }catch(e){ note.textContent="Não consegui consultar os preços agora."; return; }
    if(MK.qual!==mq) return; }
  const spr=x=>x.x.smax&&x.x.smin?x.x.smax.p-x.x.smin.p:0; const rows=slice.map(x=>({...x,x:extremes(x.id,mq)})).filter(x=>!MK.only||x.x.smin||x.x.bmax).sort((a,b)=>spr(b)-spr(a));
  const cities=MK.city?[MK.city]:SHOP_LOCS;
  tb.textContent=""; const hr=tb.createTHead().insertRow(); hr.append(el("th",{text:"Item"}));
  cities.forEach(c=>{ const th=el("th",{}); th.append(el("span",{class:"dot",style:`background:${CITY_COLOR[c]||"#999"}`}),c); hr.append(th); });
  ["Preço médio","Diferença","Atualizado",""].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(), src=mq>1?(PQ[mq]||{}):DATA.itens;
  for(const x of rows){ const rec=src[mkKey(x.id)]||{}; const sp=x.x.smax&&x.x.smin?x.x.smax.p-x.x.smin.p:0, spp=x.x.smin?sp/x.x.smin.p:0, hot=sp>0, tone=!(x.x.smax&&x.x.smin)?"is-flat":sp>0?"is-gain":"is-warn";
    const tr=body.insertRow(); tr.className="clickrow bm-row mk-row "+tone; tr.tabIndex=0; const nm_=mkName(x.r);
    const c0=tr.insertCell(); c0.className="itemcell"; const hd=el("div",{class:"ihead"}); const ii=iconImg(x.id,76,mq); ii.classList.add("ic-row"); if(x.r[3]) hd.append(el("span",{class:"tbadge",text:`T${x.r[3]}`})); hd.append(ii);
    const nb=el("span",{class:"inm"}); const tn=el("strong",{}); tn.append(nm_); if(mq>1) tn.append(el("span",{class:"qtag q"+mq,text:QNAME[mq]})); nb.append(tn,el("small",{text:`${x.r[3]?`T${x.r[3]}.${x.e}`:"sem tier"} · ${CATALOG.c[x.r[1]]||""}${x.r[2]&&subName(x.r[2])!==CATALOG.c[x.r[1]]?` › ${subName(x.r[2])}`:""}`})); hd.append(nb); c0.append(hd);
    for(const c of cities){ const v=rec[c], td=tr.insertCell(); td.className="num mk-city"; if(!v||!(v[0]>0)){ td.textContent="—"; td.classList.add("none"); continue; }
      const b=el("b",{class:"mk-pr"+(x.x.smin&&v[0]===x.x.smin.p?" low":x.x.smax&&v[0]===x.x.smax.p&&sp>0?" high":""),text:fmt(v[0])}); td.append(b); }
    { const pts=cities.map(c=>rec[c]&&rec[c][0]).filter(v=>v>0), pm=tr.insertCell(); pm.className="num mk-avg"; pm.textContent=pts.length?fmt(Math.round(median(pts))):"—"; pm.title="Mediana dos preços de venda nas cidades desta linha"+(pts.length?` (${pts.length} ${pts.length===1?"cidade":"cidades"})`:""); if(!pts.length) pm.classList.add("none"); }
    const d=tr.insertCell(); d.className="num bm-profit "+(hot?"gain":tone==="is-warn"?"warn":""); d.textContent=x.x.smax&&x.x.smin?fmt(sp):"—"; if(x.x.smax&&x.x.smin) d.append(el("small",{text:`${sp>=0?"+":""}${dec(spp*100)}%`})); d.title="Maior venda menos menor venda: o espaço para comprar numa cidade e vender em outra";
    const ts=Object.values(rec).map(v=>Math.max(v[2]||0,v[3]||0)).filter(Boolean); const tu=tr.insertCell(); tu.className="num"; tu.append(ts.length?(ageSpan(Math.max(...ts))||"—"):"—");
    const ac=tr.insertCell(); const bt=el("button",{type:"button",class:"btn mn-craft",text:"Detalhe"}); ac.append(bt);
    const op=()=>openItem(x.id,`${nm_} ${x.r[3]?`T${x.r[3]}.${x.e}`:""}`,mq); tr.addEventListener("click",op); tr.addEventListener("keydown",ev=>{ if(ev.key==="Enter"&&ev.target===tr) op(); }); }
  const shownN=rows.length, more=total>slice.length;
  note.textContent = !total ? "Nenhum item com esse filtro." : `${fmt(shownN)} ${shownN===1?"registro exibido":"registros exibidos"} de ${fmt(total)} ${search?`com "${q}"`:MK.cat?`em ${CATALOG.c[MK.cat]}${MK.sub?` · ${subName(MK.sub)}`:""}`:"em todas as categorias"}${more?`: não são todos. Foram consultados os ${fmt(slice.length)} primeiros do catálogo e a lista está ordenada pela maior diferença entre cidades, então pode haver diferenças maiores nos que não foram consultados`:", ordenados pela maior diferença entre cidades"}. ${rows.length<slice.length?`${slice.length-rows.length} sem anúncio nos últimos 3 dias ficaram de fora. `:""}${mq>1?`Qualidade ${QNAME[mq].toLowerCase()}: só entram itens com anúncio nessa qualidade (recursos e comida só existem na Normal). `:""}Linha verde: tem diferença para lucrar; amarela: diferença zero. Na linha, o menor preço fica em verde e o maior em âmbar. Clique num item para ver as ofertas e o histórico.`;
  { let mb=$("mkMore"); if(!mb){ mb=el("button",{type:"button",id:"mkMore",class:"btn mn-craft"}); tb.parentNode.after(mb); mb.addEventListener("click",()=>{ MK.limit+=180; renderMk(); }); } mb.hidden=!more; mb.textContent=`Consultar mais 180 (${fmt(slice.length)} de ${fmt(total)})`; }
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.2,stagger:.006,clearProps:"opacity,transform"});
  const wr=tb.parentNode; wr.id="mkWrap"; hbar(wr);
}

/* quadro de detalhe de um item */
const CITY_COLOR = {"Thetford":"#a46ad8","Fort Sterling":"#e9e4d8","Martlock":"#4aa3df","Bridgewatch":"#e8963f","Lymhurst":"#6cc06a","Caerleon":"#d0463f","Brecilien":"#3ec3b0","Black Market":"#8d8d99"};
let DLG={days:30,series:null,q:1};
async function openItem(apiId,name,q=1,soMN=false){
  const dlg=$("itemDlg"); const key=apiId.includes("_LEVEL")?apiId.split("@")[0]:apiId;
  $("dlgTitle").textContent=name||nmKey(apiId.replace(/^T\d_/,"").replace(/@\d$/,""),apiId); iconSrc($("dlgIcon"),apiId,()=>{},q); $("dlgSub").textContent=apiId+(q>1?` · ${QNAME[q]}`:"");
  const tm=/^T(\d)_/.exec(apiId); $("dlgTier").textContent=tm?`T${tm[1]}`:""; $("dlgTier").hidden=!tm;
  const S=$("dlgSum"), SE=$("dlgSell"), BU=$("dlgBuy"); [S,SE,BU].forEach(b=>b.textContent=""); S.textContent="Consultando…"; $("dlgChart").textContent=""; $("dlgNote").textContent="";
  if(dlg.showModal&&!dlg.open) dlg.showModal(); else dlg.setAttribute("open","");
  const locs=soMN?["Black Market"]:[...SHOP_LOCS,"Black Market"];
  SE.parentNode.hidden=soMN; BU.parentNode.firstChild.textContent=soMN?"Pedido de compra do Mercado Negro":"Ofertas de compra";
  const tgt={}; try{ await fetchIds([apiId],tgt,locs,q); }catch(e){}
  const r=tgt[key]||{}, dot=c=>el("span",{class:"dot",style:`background:${CITY_COLOR[c]||"#999"}`});
  const list=(box,idx,tidx,asc)=>{ const rows=Object.entries(r).filter(([c,v])=>v[idx]>0&&(idx===1||c!=="Black Market")).sort((a,b)=>asc?a[1][idx]-b[1][idx]:b[1][idx]-a[1][idx]);
    if(!rows.length){ box.append(el("p",{class:"small muted",text:"Sem ofertas recentes."})); return null; }
    rows.forEach(([c,v],i)=>{ const row=el("div",{class:"dlg-of"+(i===0?" best":"")}); row.append(el("b",{class:"pr",text:fmt(v[idx])})); const cc=el("span",{class:"cc"}); const nm1=el("span",{}); nm1.append(dot(c),c); cc.append(nm1,el("small",{},ageSpan(v[tidx])||"")); row.append(cc); box.append(row); }); return rows[0]; };
  const lo=soMN?null:list(SE,0,2,true), hi=list(BU,1,3,false);
  S.textContent=""; const line=(k,v,sub,cls)=>{ const l=el("div",{class:"dlg-sum"}); l.append(el("span",{text:k}),el("b",{class:cls||"",text:v})); if(sub) l.append(el("small",{text:sub})); S.append(l); };
  if(soMN){ if(hi) line("Pedido de compra",fmt(hi[1][1]),"Mercado Negro"); else line("Pedido de compra","—"); }
  else { if(lo) line("Menor venda",fmt(lo[1][0]),lo[0]); else line("Menor venda","—");
  if(hi) line("Melhor compra",fmt(hi[1][1]),hi[0]); else line("Melhor compra","—"); }
  if(lo&&hi) line("Diferença bruta",(hi[1][1]-lo[1][0]>=0?"+":"")+fmt(hi[1][1]-lo[1][0]),"melhor compra menos menor venda",hi[1][1]-lo[1][0]>=0?"gain":"loss");
  const ts=Object.values(r).map(v=>Math.max(v[2]||0,v[3]||0)).filter(Boolean); if(ts.length){ const l=el("div",{class:"dlg-sum"}); l.append(el("span",{text:"Atualizado"}),el("b",{},ageSpan(Math.max(...ts))||"—")); S.append(l); }
  if(!lo&&!hi) S.textContent="Nenhum anúncio recente desse item.";
  if(soMN){ const av=typeof bmAvgOf==="function"?bmAvgOf(apiId,q):null; if(av){ const l=el("div",{class:"dlg-sum"}); l.append(el("span",{text:"Média paga (7 dias)"}),el("b",{text:fmt(Math.round(av))})); S.append(l); } }
  DLG.series=null; DLG.q=q; DLG.id=apiId;
  try{ const j=await apiJSON(`${HOST}/api/v2/stats/history/${apiId}.json?locations=${locs.join(",").replace(/ /g,"%20")}&time-scale=24`,360); DLG.series=q>1?j.filter(s=>+s.quality===q):j; drawStack($("dlgChart"),DLG.series,DLG.days); }catch(e){ $("dlgNote").textContent="Sem histórico agora."; }
}
$("dlgRange").addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; $("dlgRange").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); DLG.days=+b.dataset.d; if(DLG.series){ $("dlgChart").textContent=""; drawStack($("dlgChart"),DLG.series,DLG.days); } });
function drawStack(svg,series,N=30){
  const ns="http://www.w3.org/2000/svg", mk=(t,a)=>{ const e=document.createElementNS(ns,t); for(const k in a) e.setAttribute(k,a[k]); return e; };
  const days={}; for(const s of series) for(const d of (s.data||[]).slice(-N)){ const k=d.timestamp.slice(0,10); (days[k]||(days[k]={}))[s.location]=(days[k][s.location]||0)+d.item_count; }
  const keys=Object.keys(days).sort().slice(-N); if(keys.length<2){ $("dlgNote").textContent="Pouco histórico para esse item."; return; }
  const W=720,H=220,PL=46,PB=24,PT=8, tot=keys.map(k=>Object.values(days[k]).reduce((a,b)=>a+b,0)), max=Math.max(...tot)||1, bw=(W-PL-8)/keys.length;
  for(const f of [0.5,1]){ const y=PT+(1-f)*(H-PT-PB); svg.append(mk("line",{x1:PL,x2:W-8,y1:y,y2:y,stroke:"var(--line-soft)"})); const tx=mk("text",{x:PL-6,y:y+4,"text-anchor":"end","font-size":11,fill:"var(--smoke)"}); tx.textContent=fmtS(max*f); svg.append(tx); }
  const cities=[...new Set(series.map(s=>s.location))];
  keys.forEach((k,i)=>{ let y=H-PB; for(const c of cities){ const v=days[k][c]||0; if(!v) continue; const hh=v/max*(H-PT-PB); y-=hh; const r=mk("rect",{x:PL+i*bw+1,y,width:Math.max(1,bw-2),height:hh,fill:CITY_COLOR[c]||"#999",opacity:.9}); r.append(mk("title",{})); r.lastChild.textContent=`${k.slice(8,10)}/${k.slice(5,7)} ${c}: ${fmt(v)} vendidos`; svg.append(r); } });
  [[0,"start"],[keys.length-1,"end"]].forEach(([i,a])=>{ const tx=mk("text",{x:PL+i*bw+(a==="end"?bw:0),y:H-6,"text-anchor":a,"font-size":11,fill:"var(--smoke)"}); tx.textContent=`${keys[i].slice(8,10)}/${keys[i].slice(5,7)}`; svg.append(tx); });
  const leg=$("dlgNote"); leg.textContent=""; leg.append("Vendidos por dia, por cidade: "); cities.forEach(c=>leg.append(el("span",{class:"leg"},el("span",{class:"dot",style:`background:${CITY_COLOR[c]||"#999"}`}),c)));
  if(window.gsap&&!RM) gsap.from(svg.querySelectorAll("rect"),{scaleY:0,transformOrigin:"50% 100%",duration:.4,stagger:.004,ease:"power2.out"});
}
$("dlgClose").addEventListener("click",()=>{ const d=$("itemDlg"); if(d.close) d.close(); else d.removeAttribute("open"); });
$("itemDlg").addEventListener("click",ev=>{ if(ev.target===$("itemDlg")) $("dlgClose").click(); });
/* botão do Mercado Negro: abre o Craft já com o item, o tier, o encantamento e a qualidade daquela ordem, vendendo para o MN */
async function ofFromBM(g,m){
  if(!BM) BM=await need("bm");
  setupOf(); ofApplyMode("craft");   // sem isso a aba Craft, ao abrir, refazia os filtros (tier, categoria) e a lista ficava vazia
  const sel=$("ofCat"); sel.value="g:"+g; store.set("ofCat",sel.value);
  OF.tier=m.t; OF.ench=m.e; $("ofTier").value=String(m.t); $("ofEnch").value=String(m.e);
  OF2.qual=m.q>1?m.q:0; $("ofQual").value=String(OF2.qual);
  OF.sellC=new Set(["Black Market"]); OF.sellS="auto"; OF2.ov={}; OF2.rrMan=null;
  OF.q=nmKey(m.key,m.name).toLowerCase(); $("ofFind").value=nmKey(m.key,m.name);
  OF2.open.clear(); OF2.open.add(m.id);
  const t=document.getElementById("t-craft"); t.click();
  try{ ofCards(); }catch(e){}
  renderOf();
}
/* barra de rolagem lateral sempre visível (grudada no pé da tela), sincronizada com a lista */
function hbar(wrap){
  if(!wrap) return; let bar=wrap._hbar;
  if(!bar){ bar=el("div",{class:"hbar","aria-hidden":"true"}); bar.append(el("div")); wrap.after(bar); wrap._hbar=bar; let lock=0;
    bar.addEventListener("scroll",()=>{ if(lock){ lock=0; return; } lock=1; wrap.scrollLeft=bar.scrollLeft; });
    wrap.addEventListener("scroll",()=>{ if(lock){ lock=0; return; } lock=1; bar.scrollLeft=wrap.scrollLeft; });
    addEventListener("resize",()=>hbar(wrap)); }
  const upd=()=>{ bar.firstChild.style.width=wrap.scrollWidth+"px"; bar.style.width=wrap.clientWidth+"px"; bar.hidden=wrap.scrollWidth<=wrap.clientWidth+2; };
  upd(); setTimeout(upd,300); setTimeout(upd,1200);
}
