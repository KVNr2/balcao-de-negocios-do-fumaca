/* ================= oficina: receitas, custo, venda e lucro de cada item ================= */
const REF5 = [
  {k:"metal",raw:"ORE",ref:"METALBAR",city:"Thetford",rawPT:"Minério",refPT:"Barra de metal"},
  {k:"cloth",raw:"FIBER",ref:"CLOTH",city:"Lymhurst",rawPT:"Fibra",refPT:"Tecido"},
  {k:"leather",raw:"HIDE",ref:"LEATHER",city:"Martlock",rawPT:"Pelego",refPT:"Couro"},
  {k:"wood",raw:"WOOD",ref:"PLANKS",city:"Fort Sterling",rawPT:"Madeira",refPT:"Tábua"},
  {k:"stone",raw:"ROCK",ref:"STONEBLOCK",city:"Bridgewatch",rawPT:"Pedra",refPT:"Bloco de pedra"}];
const MAT_PT = {METALBAR:"Barra de metal",PLANKS:"Tábua",LEATHER:"Couro",CLOTH:"Tecido"};
const OF = {mode:null, sort:"profit", cat:null, tiers:new Set(), enchs:new Set(), q:"", rr:"auto", sellC:new Set(), sellS:"auto", buyS:"auto", city:"", loaded:new Set(), vol:{}};
/* tier e encantamento aceitam vários ao mesmo tempo (OF.tiers, OF.enchs; vazio = todos). OF.tier e OF.ench continuam valendo para o código
   que precisa de um só: devolvem o único marcado (ou 0 / -1 quando há nenhum ou vários) e, ao receber um valor, marcam só ele. */
Object.defineProperty(OF,"tier",{get(){ return OF.tiers.size===1?[...OF.tiers][0]:0; },set(v){ OF.tiers.clear(); if(+v>0) OF.tiers.add(+v); }});
Object.defineProperty(OF,"ench",{get(){ return OF.enchs.size===1?[...OF.enchs][0]:-1; },set(v){ OF.enchs.clear(); if(+v>=0) OF.enchs.add(+v); }});
const ofTierOk=t=>!OF.tiers.size||OF.tiers.has(t), ofEnchOk=e=>!OF.enchs.size||OF.enchs.has(e);
const ofFiltSave=()=>[[...OF.tiers],[...OF.enchs]];
const ofFiltLoad=([t,e])=>{ OF.tiers.clear(); OF.enchs.clear(); (t||[]).forEach(x=>OF.tiers.add(+x)); (e||[]).forEach(x=>OF.enchs.add(+x)); ["ofTier","ofEnch"].forEach(id=>{ const b=$(id); if(b&&b._msel) b._msel.paint(); }); };
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
    for(const gg of ofGroups(cat)) for(const k of bmKeys(gg)){ const r=BM[k]; const lows=[...OF.tiers].filter(x=>x>=2&&x<4); for(let t=(lows.length?Math.min(...lows):4);t<=8;t++) for(let e=0;e<=4;e++){
      if(!ofTierOk(t)||!ofEnchOk(e)) continue;
      if(t<4&&(e>0||r[4])) continue;   // T2 e T3 não têm encantamento nem artefato
      const ing=[]; for(const [,c,n] of r[3].matchAll(/([MPLC])(\d+)/g)) ing.push({id:idLv(t,BM_RES[c],e),n:+n,nm:`${MAT_PT[BM_RES[c]]} T${t}.${e}`});
      if(r[4]) ing.push({id:`T${t}_${r[4][0]}`,n:r[4][1],nm:r[4][0].startsWith("ALCHEMY")?"Ingrediente raro":"Artefato",art:true});
      const cnt=ing.filter(x=>!x.art).reduce((a,x)=>a+x.n,0);
      out.push({id:bmId(k,t,e),key:k,name:nmKey(k,r[0]),t,e,q:1,ing,city:r[2],bonus:0.15,fee:cnt*IV(t,e)*0.1125,focus:r[5]*bmFocT(t,e)/429,fce:bmFCE(k)}); } }
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
async function ensureOfG(cat,note,cancel){
  const tiers=OF.tiers.size?[...OF.tiers].sort():[4,5,6,7,8], enchs=OF.enchs.size?[...OF.enchs].sort():[0,1,2,3,4], bm=sellBM(), groups=ofGroups(cat);
  const jobs=[];
  for(const gg of groups){
    const ids=[], idsBM=[], extra=new Set(), mats=new Set();
    for(const k of bmKeys(gg)) for(const t of tiers){ let usado=false; for(const e of enchs){
      if(t<4&&(e>0||BM[k][4])) continue;
      const kk=`${k}|${t}|${e}`; const idg=bmId(k,t,e);
      if(!OF.loaded.has("p|"+kk)){ ids.push(idg); usado=true; for(const [,c] of BM[k][3].matchAll(/([MPLC])(\d+)/g)) mats.add(apiLv(t,BM_RES[c],e)); }
      if(bm&&!OF.loaded.has("b|"+kk)) idsBM.push(idg); }
      if(usado&&BM[k][4]) extra.add(`T${t}_${BM[k][4][0]}`); }
    if(ids.length||idsBM.length) jobs.push({gg,ids,idsBM,mats,extra}); }
  const total=jobs.length, nomeG=g=>(BM_GROUPS.find(x=>x[0]===g)||[0,g])[1].toLowerCase();
  try{
    for(let i=0;i<total;i++){ const {gg,ids,idsBM,mats,extra}=jobs[i];
      if(i){ await lpSpace(); if(cancel&&cancel()){ lpHide(note); return true; } }
      lpShow(note,i,total,total>1?`Consultando preços: ${nomeG(gg)}`:"Consultando receitas e preços…","grupos");
      if(ids.length){ await fetchIds(ids,DATA.itens,SHOP_LOCS); await fetchIds([...mats,...extra],DATA.itens,SHOP_LOCS); }
      if(idsBM.length) await fetchIds(idsBM,DATA.itens,["Black Market"]);
      for(const id of ids){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id); OF.loaded.add(`p|${m[2]}|${m[1]}|${m[3]||0}`); }
      for(const id of idsBM){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id); OF.loaded.add(`b|${m[2]}|${m[1]}|${m[3]||0}`); }
      lpShow(note,i+1,total,total>1?`Consultando preços: ${nomeG(gg)}`:"Consultando receitas e preços…","grupos"); }
    lpHide(note); return true;
  }catch(e){ lpHide(note); return false; }
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
/* marcador da cidade com bônus de produção de cada item (dados do jogo: craftingmodifiers). Refino +40%, equipamento, comida e poção +15%;
   armas e armaduras também têm o mesmo bônus num dos Rests da zona preta (Arthur's, Merlyn's ou Morgana's Rest). */
let DESC=null; need("descanso").then(d=>{ DESC=d.rest||{}; }).catch(()=>{ DESC={}; });
function ofBonusPill(it){
  const pct=Math.round((it.bonus||0)*100), rest=DESC&&DESC[it.key];
  const p=el("span",{class:"of-bon",text:`+${pct}% em ${it.city}${rest?` ou ${rest}`:""}`});
  p.title=`Fabricar${OF.mode==="refine"?" (refinar)":""} em ${it.city} dá +${pct}% de bônus de produção, que aumenta o retorno de recursos.${rest?` ${rest}, na zona preta, dá o mesmo bônus para este item.`:""} A conta da lista já usa esse bônus.`;
  return p; }
function ofRRbase(it){ const fb=it.bonus===0.40?0.40:0.15; if(OF.mode==="refine") return rrr(fb,true,st.daily);
  if(OF.rr==="none") return rrr(0,false,st.daily); if(OF.rr==="focus") return rrr(fb,true,st.daily); return rrr(fb,false,st.daily); }
function ofRR(it){ return OF.mode!=="refine"&&OF2.rrMan!=null?OF2.rrMan:ofRRbase(it); }
/* quantidade que o jogo devolve: o arredondamento é por jogada, aqui usamos a média */
function ofN(){ return OF2.qty>0?OF2.qty:10; }
/* custo e lucro de N receitas: o retorno é aplicado ao total de cada material e arredondado para cima, como se compra no jogo */
function ofModel(it,rrOv){
  const ovS=OF2.ov["s|"+it.id]; const sale=(ovS&&pickSell(it.id,ovS))||pickSell(it.id); if(!sale) return null;
  const rr=rrOv!=null?rrOv:ofRR(it), ref=OF.mode==="refine", fc1=Math.max(1,Math.round(it.focus*Math.pow(0.5,(it.fce||0)/10000)));
  /* Refino: a conta parte do foco (quantas unidades o foco cobre). Craft: "receitas pagas" compra material para N receitas e o retorno devolve material para fabricar mais peças (N ÷ (1 − retorno)); "peças finais" fabrica exatamente N. */
  const pay=!ref&&OF2.qMode!=="final"; let N, Np;
  if(ref){ N=Math.floor(focBud()/fc1); if(N<1) return null; Np=N; }
  else if(pay){ Np=ofN(); N=Math.max(Np,Math.floor(Np/(1-rr)+1e-9)); }
  else { N=Np=ofN(); }
  let mat=0, buyFee=0, miss=0; const parts=[];
  for(const g of it.ing){ const ovB=OF2.ov["b|"+it.id+"|"+g.id]; const b=(ovB&&pickBuy(g.id,ovB))||(selfRefOn()&&!g.art&&refUnit(g.id))||pickBuy(g.id); if(!b){ miss++; parts.push({...g,b:null}); continue; }
    const unit=b.p, total=g.n*N; let need;
    if(g.art) need=total; else if(pay) need=g.n*Np; else need=Math.ceil(total*(1-rr)-1e-9);
    const ret=total-need, base=need*unit, bf=b.mode==="ordem"?base*0.025:0;
    mat+=base; buyFee+=bf; parts.push({...g,b,unit,total,need,ret,pay:need,sub:base+bf,retVal:ret*unit}); }
  if(miss) return {it,sale,parts,miss};
  const fee=it.fee*feeVal()/100*N, cost=mat+buyFee+fee;
  const tax=OF2.tax?((st.prem?0.04:0.08)+(sale.mode==="ordem"?0.025:0)):0, gross=N*it.q*sale.p, taxV=gross*tax, net=gross-taxV, costReal=cost+taxV, profit=gross-costReal;
  return {it,N,Np,sale,parts,cost,costReal,mat,buyFee,net,gross,taxV,profit,pct:costReal>0?profit/costReal:0,rr,fee,fc:fc1*N,fc1,units:N*it.q};
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
  $("ofFocus").checked=OF2.rrMan==null&&OF.rr==="focus"; { const bx=$("ofFocBox"); if(bx){ bx.hidden=OF.mode==="refine"||!$("ofFocus").checked; FOC_UIS.forEach(u=>u._sync()); } } }
function ofFillCats(){
  const sel=$("ofCat"); sel.textContent="";
  const groups={}; for(const c of ofCats()){ (groups[c.grp]||(groups[c.grp]=el("optgroup",{label:c.grp}))).append(el("option",{value:c.k,text:c.label})); }
  ["Todos","Por recurso","Suas armas","Armaduras","Consumíveis","Outras armas"].forEach(g=>{ if(groups[g]) sel.append(groups[g]); });
  sel.value=store.get(OF.mode==="refine"?"ofCatR":"ofCat")||sel.options[0].value; if(sel.selectedIndex<0) sel.selectedIndex=0;
}
const OF_FOOT_C=null;
function ofApplyMode(mode){
  if(OF.mode===mode) return; const ref=mode==="refine";
  if(OF.mode){ OF2["filt_"+OF.mode]=ofFiltSave(); OF2["qty_"+OF.mode]=OF2.qty; if(OF.mode==="craft") OF2.qualSaved=OF2.qual; }
  OF.mode=mode; $(ref?"ofSlotRef":"ofSlotCraft").append($("ofRoot"));
  const fill=(box,opts)=>{ box.textContent=""; opts.forEach(([v,t])=>box.append(el("option",{value:String(v),text:t}))); };
  const tiers=ref?[4,5,6,7,8]:[1,2,3,4,5,6,7,8];
  mselUI("ofTier",[],OF.tiers,"Todos","tiers",()=>renderOf()); mselUI("ofEnch",[0,1,2,3,4].map(e=>[e,`.${e}`]),OF.enchs,"Todos","encantamentos",()=>renderOf());
  ofFiltLoad(OF2["filt_"+mode]||[[],[]]); $("ofTier")._msel.setOpts(tiers.map(t=>[t,`T${t}`])); OF2.qty=OF2["qty_"+mode]||(ref?100:10);
  $("ofQty").value=String(OF2.qty);
  $("ofQualBox").hidden=ref; if(ref) OF2.qual=0; else { OF2.qual=OF2.qualSaved||0; $("ofQual").value=String(OF2.qual); }
  $("ofTitle").textContent=ref?"Oficina de refino":"Oficina"; $("ofRcT").textContent=ref?"Refino":"Receita";
  $("ofRcT").textContent=ref?"Foco a gastar":"Receita"; $("ofRcS").textContent=ref?"cada item mostra quantas unidades esse foco refina, o lucro, onde comprar e onde vender":"receitas pagas de cada item (o retorno rende peças extras)"; $("ofQty").setAttribute("aria-label",ref?"Foco a gastar no refino":"Quantidade de receitas");
  if(ref){ $("ofQty").value=String(focBud()); $("ofQty").step="500"; } else $("ofQty").step="1";
  { const qm=$("ofQMode"); if(qm) qm.hidden=ref; const rrc=$("ofRRs").closest(".of-card"); if(rrc) rrc.hidden=ref; const fw=$("ofFocus").closest("label"); if(fw) fw.hidden=ref; if(ref){ const bx=$("ofFocBox"); if(bx) bx.hidden=true; } }
  $("ofFind").placeholder=ref?"Nome do recurso":"Nome do item";
  { const sc=$("ofSRCard"); if(sc) sc.hidden=ref; }
  if(OF2.footC==null) OF2.footC=$("ofFoot").textContent;
  $("ofFoot").textContent=ref?"Atalhos de retorno: 15,3% (estação sem bônus), 36,7% (cidade com o bônus de refino daquele recurso) e 53,9% (cidade com bônus e foco). Cada unidade refinada usa a quantidade do tier de matéria-prima (T4 usa 2, T5 usa 3, T6 usa 4, T7 e T8 usam 5) mais 1 unidade refinada do tier anterior, com o mesmo encantamento (T4 usa a de T3). O retorno vale para os dois, e é arredondado para cima na compra. Bônus de refino: Thetford minério, Lymhurst fibra, Martlock pelego, Fort Sterling madeira, Bridgewatch pedra. Taxa da estação = valor do item × 0,1125 × taxa ÷ 100. O custo de foco cai pela metade a cada 10.000 de eficiência, que sai das specs de refino da sua ficha. Premium gera 10.000 de foco por dia. O produto refinado não tem qualidade, então só o preço importa. Os controles de Premium, bônus diário e taxa valem para o site todo.":OF2.footC;
  ofFillCats(); OF2.open.clear();
}
function setupOf(){
  const sel=$("ofCat"); if(OF2.init) return; OF2.init=1;
  const fill=(box,opts)=>opts.forEach(([v,t])=>box.append(el("option",{value:String(v),text:t})));
  fill($("ofQual"),[[0,"Automática"],...[1,2,3,4,5].map(q=>[q,QNAME[q]])]);
  const bind=(id,key,num,store_)=>$(id).addEventListener("change",()=>{ (store_||OF)[key]=num?+$(id).value:$(id).value; renderOf(); });
  bind("ofQual","qual",1,OF2); ofCards();
  $("ofRRp").addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; OF2.rrMan=null; OF.rr=b.dataset.rr; renderOf(); });
  $("ofRRs").addEventListener("input",()=>{ OF2.rrMan=+$("ofRRs").value/100; $("ofRRv").textContent=dec(OF2.rrMan*100)+"%"; renderOf(); });
  { const bx=$("ofFocBox"); if(bx&&!bx.firstChild) bx.append(focBudUI(renderOf,"O foco só aumenta o retorno de recursos. Em cada item aberto aparece quantas unidades o foco do dia cobre.")); }
  $("ofFocus").addEventListener("change",()=>{ OF2.rrMan=null; OF.rr=$("ofFocus").checked?"focus":"auto"; renderOf(); });
  $("ofTax").addEventListener("change",()=>{ OF2.tax=$("ofTax").checked; renderOf(); });
  setupSelfRef();
  $("ofPrem").addEventListener("change",()=>{ document.querySelector(`[data-g="prem"][data-v="${$("ofPrem").checked?1:0}"]`).click(); renderOf(); });
  $("ofDaily").addEventListener("change",()=>{ document.querySelector(`[data-g="daily"][data-v="${$("ofDaily").checked?0.1:0}"]`).click(); renderOf(); });
  $("ofQty").addEventListener("input",()=>{ const v=Math.max(0,Math.floor(+$("ofQty").value)||0); if(OF.mode==="refine"){ focSet(v); FOC_UIS.forEach(u=>u._sync()); } else OF2.qty=v; renderOf(); });
  { OF2.qMode=store.get("ofQMode")==="final"?"final":"pay"; const qm=$("ofQMode"); if(qm){ const sync=()=>qm.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.q===OF2.qMode))); sync(); qm.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; OF2.qMode=b.dataset.q; store.set("ofQMode",OF2.qMode); sync(); renderOf(); }); } }
  $("ofFee").value=$("ofFeeS").value=$("fee").value; const feeSet=v=>{ $("fee").value=v; $("fee").dispatchEvent(new Event("input")); $("ofFee").value=$("ofFeeS").value=v; renderOf(); }; $("ofFee").addEventListener("input",()=>feeSet($("ofFee").value)); $("ofFeeS").addEventListener("input",()=>feeSet($("ofFeeS").value));
  $("ofFeeP").addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; feeSet(b.dataset.f); });
  $("ofPrem").checked=!!st.prem; $("ofDaily").checked=st.daily>0;
  sel.addEventListener("change",()=>{ store.set(OF.mode==="refine"?"ofCatR":"ofCat",sel.value); OF2.open.clear(); renderOf(); });
  { const sv=(store.get("ofSort")||"").split("|"); if(sv[0]){ OF.sort=sv[0]; OF.dir=+sv[1]||1; } document.querySelectorAll(".of-sort button").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.sort===OF.sort))); }
  document.querySelectorAll(".of-sort button").forEach(b=>b.addEventListener("click",()=>ofSetSort(b.dataset.sort)));
  /* filtros por coluna: lucro mínimo, lucro % mínimo e vendas por dia mínimas */
  try{ Object.assign(OF2,JSON.parse(store.get("ofFil")||"{}")); }catch(e){}
  const fil=[["ofFP","fMinP"],["ofFPct","fMinPct"],["ofFV","fMinVol"]];
  for(const [id,k] of fil){ const i=$(id); if(!i) continue; i.value=OF2[k]!=null&&OF2[k]!==""?String(OF2[k]):""; let tm;
    i.addEventListener("input",()=>{ const v=i.value.trim(); OF2[k]=v===""?null:+v.replace(",","."); store.set("ofFil",JSON.stringify({fMinP:OF2.fMinP,fMinPct:OF2.fMinPct,fMinVol:OF2.fMinVol})); clearTimeout(tm); tm=setTimeout(renderOf,350); }); }
  { const c=$("ofFClear"); if(c) c.addEventListener("click",()=>{ for(const [id,k] of fil){ OF2[k]=null; const i=$(id); if(i) i.value=""; } store.set("ofFil","{}"); renderOf(); }); }
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
    const lab=kind==="sale"?({ordem:"ORDEM VENDA",medio:"VALOR MÉDIO",manual:"VALOR MANUAL"}[pr.mode]||"VENDA INST"):({ordem:"ORDEM COMPRA",medio:"VALOR MÉDIO",manual:"VALOR MANUAL",refino:"VOCÊ REFINA"}[pr.mode]||"COMPRA INST");
    r.append(el("span",{class:"of-pill "+kind,text:lab}));
    const it_=el("span",{class:"of-xi"}); it_.append(el("i",{class:"of-dot"+(kind==="buy"?" red":"")}),iconImg(nk(id),34,q||1)); const nm=el("span",{class:"of-xn"}); nm.append(el("b",{text:nmText})); if(sub) nm.append(el("small",{text:sub})); it_.append(nm); r.append(it_);
    r.append(el("b",{class:"of-xv",text:fmt(pr.p)}),el("span",{class:"of-xt"},ageSpan(pr.t)||"—"));
    const cc=el("span",{class:"of-xc"}); cc.append(locs.length>1?ofCitySel(locs,pr.c,onPick):pr.c); r.append(cc,el("span",{class:"of-xq",text:fmt(qty)+"x"})); return r; };
  const sellLocsFor=()=>(OF.sellC.size?[...new Set([...OF.sellC,...sellLocs()])]:sellLocs()).filter(c=>pickSell(m.it.id,c));
  const redo=()=>renderOf();
  left.append(row("sale",m.it.id,m.it.name,m.sale,sellLocsFor(),c=>{ OF2.ov["s|"+m.it.id]=c; redo(); },m.units,"",OF2.qual>1?OF2.qual:1));
  for(const g of m.parts){ const rf=g.b&&g.b.mode==="refino", locs=rf?[]:SHOP_LOCS.filter(c=>pickBuy(g.id,c));
    left.append(row("buy",g.id,g.nm,g.b,locs,c=>{ OF2.ov["b|"+m.it.id+"|"+g.id]=c; redo(); },g.need,g.art?`${fmt(g.total)} · artefato não volta`:`${fmt(g.total)} na receita · volta ${fmt(g.ret)}`));
    if(rf) left.append(refNote(g.b,g.id)); }
  const right=el("div",{class:"of-xs"});
  const card=(cls,title,lines,tot)=>{ const c=el("div",{class:"of-xcard "+cls}); c.append(el("h4",{class:"of-xh",text:title})); for(const [k,v,cc] of lines){ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{class:cc||"",text:v})); c.append(l); } if(tot){ const l=el("div",{class:"of-xline of-xtot"}); l.append(el("span",{text:tot[0]}),el("b",{text:tot[1]})); c.append(l); } return c; };
  right.append(card("cost","Custos detalhados (−)",[["Matérias primas",fmt(m.mat)],["Taxa de nutrição",fmt(m.fee)],["Taxa de compra (pedidos)",fmt(m.buyFee)],["Taxa de venda"+(OF2.tax?(st.prem?" (Premium)":""):" (desligada)"),fmt(m.taxV)]],["Custo total real",fmt(m.costReal)]));
  right.append(card("res","Resultado (+)",[...(m.Np!==m.N?[["Receitas pagas (material comprado)",fmt(m.Np)]]:[]),[OF.mode==="refine"?"Unidades refinadas com o foco":m.Np!==m.N?"Receitas fabricadas (com o retorno)":`Receitas a fabricar`,fmt(m.N)+(m.it.q>1?` (${fmt(m.units)} un.)`:"")],["Retorno de recursos",ofPct(m.rr)],["Valor do que volta",fmt(m.parts.reduce((a,g)=>a+(g.retVal||0),0)),"gain"],["Venda bruta",fmt(m.gross)],[OF.mode==="refine"?"Lucro por unidade":"Lucro por receita fabricada",sgn(m.profit/m.N)],["Foco gasto",fmt(m.fc)],["Lucro total ÷ foco gasto",fmt(m.profit/m.fc)]],["Lucro total",sgn(m.profit)]));
  { ofSpf(m); const fb=ofFB(m.it); const c=el("div",{class:"of-xcard foc"}); c.append(el("h4",{class:"of-xh",text:"Com foco ou sem foco"}));
    const ln=(k,v,cc)=>{ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{class:cc||"",text:v})); c.append(l); };
    if(m.pN&&m.pF){ const pr=x=>`${sgn(x.profit)} (${x.pct>=0?"+":""}${dec(x.pct*100)}%)`;
      ln(`Sem foco, retorno ${ofPct(m.pN.rr)}`,pr(m.pN),m.pN.profit>=0?"gain":"loss"); ln(`Com foco, retorno ${ofPct(m.pF.rr)}`,pr(m.pF),m.pF.profit>=0?"gain":"loss");
      ln("Foco gasto por unidade",fmt(m.pF.fc1)); ln("Foco gasto no total",fmt(m.pF.fc)); ln("Ganho extra por ponto de foco",dec(m.spf));
      const bud=focBud(), day=Math.floor(bud/m.pF.fc1); if(day>0){ const perU=m.pF.profit/m.pF.units; ln(`Com ${fmt(bud)} de foco por dia`,`${fmt(day*m.it.q)} un. · ${sgn(day*m.it.q*perU)}`,perU>=0?"gain":"loss"); }
      else ln(`Com ${fmt(bud)} de foco por dia`,"não dá para 1 unidade"); }
    else c.append(el("p",{class:"tiny muted",text:"Faltam preços para comparar."}));
    c.append(el("p",{class:"tiny muted",text:"O foco entra só no retorno de recursos; o custo de foco usa as specs da sua ficha."}));
    right.append(c); }
  { const bb=el("div",{class:"of-bagrow"}); const mats=m.parts.filter(g=>g.b&&g.need>0);
    const b1=el("button",{type:"button",class:"btn ghost",text:`Pôr na bag: ${fmt(m.units)} ${m.it.name}`}); b1.addEventListener("click",()=>bagAdd([{id:nk(m.it.id),q:m.units,nm:m.it.name,sell:m.sale.p,sellC:m.sale.c,buy:m.costReal/m.units,buyC:m.it.city}]));
    const b2=el("button",{type:"button",class:"btn ghost",text:`Pôr na bag: os materiais (${mats.length})`}); b2.addEventListener("click",()=>bagAdd(mats.map(g=>({id:nk(g.b.mode==="refino"?g.b.rawId:g.id),q:g.b.mode==="refino"?Math.ceil(g.need*g.b.n*(1-g.b.rr)):g.need,nm:g.b.mode==="refino"?`${g.b.R.rawPT} T${g.b.tier}.${g.b.ench}`:g.nm,buy:g.b.mode==="refino"?g.b.raw.p:g.b.p,buyC:g.b.mode==="refino"?g.b.raw.c:g.b.c,sell:0,sellC:m.it.city})),"Materiais na bag"));
    bb.append(b1,b2); left.append(bb); }
  d.append(left,right); return d;
}
const ofFB = it => it.bonus===0.40?0.40:0.15;
/* ganho extra de usar foco, por ponto de foco gasto: (lucro com foco − lucro sem foco) ÷ foco */
function ofSpf(m){ if(m.spf!=null) return m.spf; const fb=ofFB(m.it), a=ofModel(m.it,rrr(fb,true,st.daily)), b=ofModel(m.it,rrr(fb,false,st.daily));
  m.spf=a&&b&&!a.miss&&!b.miss&&a.fc>0?(a.profit-b.profit)/a.fc:-Infinity; m.pF=a&&!a.miss?a:null; m.pN=b&&!b.miss?b:null; return m.spf; }
const ofDayProfit=m=>{ const h=OF2.hs[nk(m.it.id)+"|"+m.sale.c], v=h&&h.vol>0?h.vol:0; return m.units>0?m.profit/m.units*Math.min(m.units,v):m.profit; };   // lucro que dá para realizar em 1 dia de venda
/* ordenação: qualquer coluna, nos dois sentidos (OF.dir 1 = maior primeiro, −1 = menor primeiro; no nome, 1 = A a Z) */
const ofVol=m=>{ const h=OF2.hs[nk(m.it.id)+"|"+m.sale.c]; return h&&h.vol>0?h.vol:0; };
const OF_KEY={profit:m=>m.profit,pct:m=>m.pct,day:m=>ofDayProfit(m),focus:m=>ofSpf(m),cost:m=>m.costReal,sale:m=>m.gross,vol:m=>ofVol(m)};
const OF_SORT_NM={profit:"lucro",pct:"lucro %",day:"lucro por dia",focus:"ganho por foco",cost:"custo",sale:"venda",vol:"vendas por dia",name:"nome"};
function ofSorter(){ const d=OF.dir||1;
  if(OF.sort==="name") return (a,b)=>d*a.it.name.localeCompare(b.it.name,"pt-BR",{numeric:true});
  const f=OF_KEY[OF.sort]||OF_KEY.profit; return (a,b)=>d*((f(b)||0)-(f(a)||0))||(b.profit-a.profit); }
function ofSetSort(k){ if(OF.sort===k) OF.dir=-(OF.dir||1); else { OF.sort=k; OF.dir=k==="name"||k==="cost"?(k==="name"?1:-1):1; }
  store.set("ofSort",OF.sort+"|"+OF.dir); document.querySelectorAll(".of-sort button").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.sort===OF.sort))); renderOf(); }
/* favoritos: contexto para achar o item de novo (categoria que o carrega) e lista dos favoritos ignorando tier, encantamento, busca e categoria */
const ofFavCtx=it=>JSON.stringify({cat:OF.mode==="refine"?"refine":(BM&&BM[it.key]?"g:"+BM[it.key][1]:(COOK&&COOK.r&&COOK.r[it.id]?(COOK.r[it.id][1]==="f"?"meal":"potion"):""))});
async function ofFavItems(){
  const tab=OF.mode==="refine"?"refine":"craft", favs=FAV.list(tab), keep=new Set(favs.map(f=>f.k)), cats=[...new Set(favs.map(f=>f.c&&f.c.cat).filter(Boolean))];
  const sv=ofFiltSave(), out=[], seen=new Set();
  try{ for(const c of cats){ if(!OF.loaded.has(c.startsWith("refine")?"refine":c)){ if(!await ensureOf(c)) return null; }
      OF.tier=0; OF.ench=-1; for(const it of ofItems(c)) if(keep.has(it.id)&&!seen.has(it.id)){ seen.add(it.id); out.push(it); } } }
  finally{ ofFiltLoad(sv); }
  return out;
}
async function renderOf(){
  const note=$("ofNote"), tb=$("ofTable");
  if(!BM){ try{ BM=await need("bm"); }catch(e){ note.textContent="Não consegui abrir as receitas."; return; } }
  ofApplyMode(!$("p-refino").hidden?"refine":!$("p-craft").hidden?"craft":(OF.mode||"craft")); setupOf(); const cat=$("ofCat").value;
  const FAVON=!!(window.FAV&&FAV.on(OF.mode==="refine"?"refine":"craft"));
  const isG=!FAVON&&cat.startsWith("g:"), agg=!FAVON&&cat.startsWith("g:*");
  $("ofPrem").checked=!!st.prem; $("ofDaily").checked=st.daily>0;
  if(agg&&!OF.tiers.size){ tb.textContent=""; $("ofCount").textContent="—"; note.textContent="Para comparar todos os itens do grupo, escolha pelo menos um tier (de T2 a T8) no campo Tier, no painel à esquerda; pode marcar mais de um. O encantamento pode ficar em Todos."; return; }
  const fk=()=>ofFiltSave().map(a=>a.slice().sort().join(",")).join("|"), sellKey=ofSig(), filtKey=fk(), qKey=OF2.qual;
  const stale=()=>$("ofCat").value!==cat||ofSig()!==sellKey||fk()!==filtKey||OF2.qual!==qKey;
  let items;
  if(FAVON){ tb.textContent=""; note.textContent="Consultando os favoritos…"; items=await ofFavItems(); if(items===null){ note.textContent="Não consegui consultar os preços agora."; return; } if(stale()) return; }
  else if(isG){ tb.textContent=""; note.textContent="Consultando receitas e preços…"; const ok=await ensureOfG(cat,note,stale); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } if(stale()) return; }
  else if(!OF.loaded.has(cat.startsWith("refine")?"refine":cat)){ tb.textContent=""; note.textContent="Consultando receitas e preços…"; lpShow(note,0,0,"Consultando receitas e preços…"); const ok=await ensureOf(cat); lpHide(note); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } if($("ofCat").value!==cat) return; }
  if(!FAVON) items=ofItems(cat).filter(it=>ofTierOk(it.t)&&ofEnchOk(it.e)&&(!OF.q||it.name.toLowerCase().includes(OF.q)));
  $("ofCount").textContent=fmt(items.length);
  if(OF2.qual>1&&isG){ note.textContent=`Consultando preços de venda em qualidade ${QNAME[OF2.qual].toLowerCase()}…`; if(!await ensureOfQ(items)){ note.textContent="Não consegui consultar a qualidade agora."; return; } if(stale()) return; }
  if(OF.sellS==='medio'||OF.buyS==='medio'){ note.textContent='Consultando valores médios…'; await ofPrefetchAvg(items); if(stale()) return; }
  if(selfRefOn()){ note.textContent="Consultando a matéria-prima e os refinados do tier anterior para o refino…"; if(!await ensureRefMats(items)){ note.textContent="Não consegui consultar a matéria-prima agora."; return; } if(stale()) return; }
  OF2.sample=items[0];
  const rows=items.map(it=>ofModel(it)).filter(Boolean); let ok0=rows.filter(m=>!m.miss);
  const nAll=ok0.length;
  if(OF2.fMinP!=null&&isFinite(OF2.fMinP)) ok0=ok0.filter(m=>m.profit>=OF2.fMinP);
  if(OF2.fMinPct!=null&&isFinite(OF2.fMinPct)) ok0=ok0.filter(m=>m.pct*100>=OF2.fMinPct);
  const needVol=OF.sort==="day"||OF.sort==="vol"||(OF2.fMinVol>0);
  if(needVol){ note.textContent="Consultando as vendas por dia…"; ok0=ok0.slice().sort((a,b)=>b.profit-a.profit).slice(0,250); await histFetch(ok0.map(m=>nk(m.it.id)+"|"+m.sale.c)); if(stale()) return; }
  if(OF2.fMinVol>0) ok0=ok0.filter(m=>ofVol(m)>=OF2.fMinVol);
  const nFil=nAll-ok0.length; { const fc=$("ofFCount"); if(fc) fc.textContent=nFil>0?`${fmt(nFil)} fora pelos filtros`:""; const cb=$("ofFClear"); if(cb) cb.hidden=!(OF2.fMinP!=null||OF2.fMinPct!=null||OF2.fMinVol>0); }
  const ok=ok0.sort(ofSorter()), LIM=FAVON?400:agg?120:60, shown=ok.slice(0,LIM);
  ofSyncRR();
  tb.textContent=""; const hr=el("div",{class:"of-lh"}); [["Item","name","Ordenar pelo nome"],["Custo","cost","Custo total real: materiais, taxa da estação, taxas de compra e de venda. Clique para ordenar"],["Venda","sale","Venda bruta, antes das taxas. Clique para ordenar"],["Lucro","profit","Lucro total das receitas. Clique de novo para Lucro %"],["Venda e compra","vol","Ordena pelas unidades vendidas por dia na cidade de venda (média de 7 dias). O número no ícone é a quantidade a vender e a comprar"]].forEach(([h,k,t])=>{
    const on=OF.sort===k||(k==="profit"&&OF.sort==="pct"), b=el("button",{type:"button",class:"of-hs"+(on?" on":""),title:t,"aria-sort":on?((OF.dir||1)>0===(k!=="name")?"descending":"ascending"):"none"});
    const lab=k==="profit"&&OF.sort==="pct"?"Lucro %":k==="vol"&&on?"Vendas por dia":h; b.append(lab,el("i",{class:"of-ar","aria-hidden":"true",text:on?((OF.dir||1)>0?(k==="name"?"▲":"▼"):(k==="name"?"▼":"▲")):"↕"}));
    b.addEventListener("click",()=>{ if(k==="profit"&&OF.sort==="profit"&&(OF.dir||1)>0){ OF.sort="pct"; OF.dir=1; store.set("ofSort","pct|1"); document.querySelectorAll(".of-sort button").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.sort==="pct"))); renderOf(); return; } if(k==="profit"&&OF.sort==="pct"){ OF.sort="profit"; OF.dir=-1; ofSetSort("profit"); return; } ofSetSort(k); });
    hr.append(b); }); tb.append(hr);
  const fitW=()=>{ const w=tb.parentNode; if(w) w.style.setProperty("--tblw",(w.clientWidth-8)+"px"); }; fitW(); if(!OF2.rs){ OF2.rs=1; addEventListener("resize",()=>{ const w=$("ofTable").parentNode; w.style.setProperty("--tblw",(w.clientWidth-8)+"px"); }); }
  const body=tb; let oldest=Infinity, newest=0;
  const stamp=t=>{ if(t>0){ oldest=Math.min(oldest,t); newest=Math.max(newest,t); } };
  const qIc=OF2.qual>1&&isG?OF2.qual:1; OF2.rows=[];
  for(const m of shown){ const key=m.it.id; const item=el("div",{class:"of-item"}); body.append(item); const tr=el("div",{class:"of-row"}); item.append(tr); tr.dataset.id=m.it.id; tr.dataset.fav=m.it.id; tr.dataset.fctx=ofFavCtx(m.it); tr.dataset.city=m.sale.c; tr.className="clickrow of-row "+(m.profit>=0?"is-gain":"is-loss"); tr.tabIndex=0; tr.setAttribute("aria-expanded","false");
    stamp(m.sale.t); m.parts.forEach(g=>stamp(g.b&&g.b.t));
    const c0=el("div",{class:"itemcell"}); tr.append(c0); const head=el("div",{class:"ihead"}); const chev=el("span",{class:"of-chev","aria-hidden":"true",text:"▾"});
    const nmb=el("span",{class:"inm"}); nmb.append(el("strong",{text:m.it.name}),el("span",{class:"of-rec",text:OF.mode==="refine"?`${fmt(m.N)} ${m.N>1?"unidades":"unidade"} com ${fmt(m.fc)} de foco`:m.Np!==m.N?`${fmt(m.Np)} pagas → ${fmt(m.N)} ${m.N>1?"receitas":"receita"} com o retorno`:`${fmt(m.N)} ${m.N>1?"receitas":"receita"}`}),el("small",{text:`${m.it.q>1?`fornada de ${m.it.q} · `:""}${OF.mode!=="refine"&&m.fc>0?`${OF.rr==="focus"?"foco para tudo":"com foco gastaria"} ${fmt(m.fc)} de foco`:""}`,title:OF.mode==="refine"?"":`Cada receita gasta ${fmt(m.fc1)} de foco (com as specs da sua ficha); ${fmt(m.N)} receitas gastam ${fmt(m.fc)}`})); if(OF.mode!=="refine"&&OF.rr==="focus"&&OF2.rrMan==null){ try{ ofSpf(m); }catch(e){} if(m.pF&&m.pF.fc1>0){ const cov=Math.min(m.N,Math.floor(focBud()/m.pF.fc1)), full=cov>=m.N, pc=m.N?Math.round(cov/m.N*100):0, un=OF.mode==="refine"?"unidades":"receitas"; const fm=el("span",{class:"wk-fm"+(full?" full":cov?"":" none"),title:`Cada ${OF.mode==="refine"?"unidade":"receita"} gasta ${fmt(m.pF.fc1)} de foco; com ${fmt(focBud())} por dia o foco cobre ${fmt(cov)} de ${fmt(m.N)}`}); fm.append(el("span",{class:"wk-fl",text:"Foco"}),el("span",{class:"wk-fbar"},el("i",{style:`width:${pc}%`})),el("b",{text:`cobre ${fmt(cov)} de ${fmt(m.N)} ${un}`})); nmb.append(fm); } }
    nmb.append(ofBonusPill(m.it)); head.append(iconImg(m.it.id,52,qIc),nmb,bagBtn(()=>[{id:nk(m.it.id),q:m.units,nm:m.it.name,sell:m.sale.p,sellC:m.sale.c,buy:m.costReal/m.units,buyC:m.it.city}],"Pôr na bag os itens prontos desta linha"),chev); c0.append(head); c0.querySelector("img").classList.add("of-itic");
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
  note.textContent=ok.length?`${OF.mode==="refine"?`Gastando ${fmt(focBud())} de foco em cada item (retorno ${dec(rrs*100)}% com foco). `:""}${ok.length} itens com preço; ${pos} dão lucro. ${OF.mode==="refine"?"":`Retorno de recursos: ${dec(rrs*100)}%${OF2.rrMan==null&&OF.rr==="auto"?" (cidade com bônus, sem foco)":""}.`}${ok.length>LIM?` Mostrando os ${LIM} primeiros de ${fmt(ok.length)} registros, ordenados por ${OF_SORT_NM[OF.sort]||"lucro"}${(OF.dir||1)<0?" (do menor para o maior)":""}: não são todos.`:` Mostrando todos os ${fmt(ok.length)} registros, ordenados por ${OF_SORT_NM[OF.sort]||"lucro"}${(OF.dir||1)<0?" (do menor para o maior)":""}.`}${sellBM()?" Mercado Negro: vale a melhor ordem de compra de lá, só com a taxa de venda.":""}${faltam?` ${faltam} sem preço de algum material.`:""}${selfRefOn()?` Barras, tecido, couro e tábuas entram pelo custo de refinar você mesmo (retorno do refino ${dec(rrr(0.40,OF2.selfRefFoc,st.daily)*100)}%).`:""}${OF.mode==="refine"?" Em cada linha aparece o craft que mais rende com esse material.":""} Clique numa linha para ver os materiais e o retorno.`:"Nenhum item com preço suficiente nesse filtro.";
  if(window.gsap&&!RM) gsap.from(body.querySelectorAll(".of-row"),{opacity:0,x:-8,duration:.22,stagger:.01,clearProps:"opacity,transform"});
  hbar(tb.parentNode); fillVolumes(shown);
  if(OF.mode==="refine") fillBestCrafts(shown,stale);
}
const nk = id => id.replace(/_LEVEL(\d)$/,"_LEVEL$1@$1");
const ofVolN_unused = m => { const h=OF2.hs[nk(m.it.id)+"|"+m.sale.c]; return OF2.qty>0?OF2.qty:Math.max(1,Math.round(h&&h.vol>0?h.vol:1)); };
/* bloco visual: ícone com a quantidade, cidade, tipo de preço, preço, idade e média/volume */
function ofBlock(id,q,pr,kind,qty,m,g){
  const w=el("div",{class:"of-blk"}); const tile=el("span",{class:"of-tile"}); tile.append(iconImg(nk(id),48,q)); const bd=el("span",{class:"of-badge",text:fmt(qty)}); tile.append(bd);
  const inf=el("div",{class:"of-bi"}); const red=RED_CITIES.has(pr.c);
  inf.append(el("div",{class:"of-city"},el("i",{class:"of-dot"+(red?" red":"")}),pr.c));
  const lab=kind==="sale"?({ordem:"ORDEM VENDA",medio:"VALOR MÉDIO",manual:"VALOR MANUAL"}[pr.mode]||"VENDA INST"):({ordem:"ORDEM COMPRA",medio:"VALOR MÉDIO",manual:"VALOR MANUAL",refino:"VOCÊ REFINA"}[pr.mode]||"COMPRA INST");
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
  /* venda diária: o mercado só absorve algumas unidades por dia; o lucro de 100 unidades não é "de verdade" se vendem 5 por dia */
  for(const r of (OF2.rows||[])){ const m=r.m, tr=r.tr; if(!tr||!tr.isConnected) continue; const h=OF2.hs[nk(m.it.id)+"|"+m.sale.c], nm=tr.querySelector(".inm"); if(!nm) continue; nm.querySelectorAll(".of-vd").forEach(x=>x.remove()); if(!h||!(h.vol>=0)||!(m.units>0)) continue;
    const v=h.vol, perU=m.profit/m.units, dayU=Math.min(m.units,v), days=v>0?Math.ceil(m.units/v):Infinity, over=m.units>v*1.0001;
    const c=el("span",{class:"of-vd"+(over?" warn":""),title:`Média de ${fmtU(v)} unidades vendidas por dia nos últimos 7 dias em ${m.sale.c} (todas as qualidades). ${over?`Para vender ${fmt(m.units)} unidades levaria ${v>0?fmt(days)+" dias":"muito tempo"}; o lucro total mostrado só vale se você vender tudo. `:""}Lucro vendendo o que o mercado absorve em 1 dia: ${sgn(Math.round(dayU*perU))}.`});
    c.append(el("span",{class:"wk-fl",text:"Venda/dia"}),el("b",{text:`~${fmtU(v)}`}),over?el("small",{text:v>0?` · ${fmt(m.units)} un. levam ${fmt(days)} ${days===1?"dia":"dias"} · lucro/dia ${sgn(Math.round(dayU*perU))}`:" · sem vendas recentes"}):el("small",{text:" · cabe em 1 dia"})); nm.append(c); }
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
const MK = {limit:180, cat:"", sub:"", city:"", tiers:new Set(), enchs:new Set(), qual:1, q:"", only:true, consultou:false, busy:false, ord:{k:"dif",d:-1}};   // qual: qualidade dos preços e dos ícones (1 a 5); q é o texto da busca
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
  const fillSel=(id,opts,val,key)=>{ const x=$(id); opts.forEach(([v,t])=>x.append(el("option",{value:String(v),text:t}))); x.value=String(val); x.addEventListener("change",()=>{ MK[key]=id==="mkCity"?x.value:+x.value; mkGatilho(); }); };
  mselUI("mkTier",[4,5,6,7,8].map(t=>[t,`T${t}`]),MK.tiers,"Todos","tiers",()=>mkGatilho());
  mselUI("mkEnch",[0,1,2,3,4].map(e=>[e,`.${e}`]),MK.enchs,"Todos","encantamentos",()=>mkGatilho());
  fillSel("mkQual",[1,2,3,4,5].map(q=>[q,QNAME[q]]),MK.qual,"qual");
  fillSel("mkCity",[["","Todas as cidades"],...SHOP_LOCS.map(c=>[c,c])],"","city");
  sel.addEventListener("change",()=>{ MK.cat=sel.value; MK.sub=""; store.set("mkCat2",sel.value); fillSubs(); mkGatilho(); });
  $("mkSub").addEventListener("change",()=>{ MK.sub=$("mkSub").value; mkGatilho(); });
  let tmr=null; $("mkFind").addEventListener("input",()=>{ clearTimeout(tmr); tmr=setTimeout(()=>{ MK.q=$("mkFind").value.trim().toLowerCase(); mkGatilho(); },250); });
  $("mkOnly").addEventListener("change",()=>{ MK.only=$("mkOnly").checked; mkGatilho(); });
  $("mkGo").addEventListener("click",()=>{ MK_TOK++; renderMk(); });
  $("mkRef").addEventListener("click",()=>{ MK_TOK++; renderMk(false,true); });
  fillSubs();
}
function fillSubs(){ const ss=$("mkSub"); ss.textContent=""; ss.append(el("option",{value:"",text:"Todas"}));
  const subs=(MK.cat?[...new Set(CATALOG.i.filter(r=>r[1]===MK.cat).map(r=>r[2]))]:[]).sort((a,b)=>subName(a).localeCompare(subName(b),"pt-BR")); subs.forEach(s=>ss.append(el("option",{value:s,text:subName(s)}))); ss.value=MK.sub; }
function extremes(id,q=1){ const r=(q>1?(PQ[q]||{}):DATA.itens)[mkKey(id)]||{}; const out={smax:null,smin:null,bmax:null,bmin:null};
  for(const [c,v] of Object.entries(r)){ if(v[0]>0){ if(!out.smax||v[0]>out.smax.p) out.smax={p:v[0],c,t:v[2]}; if(!out.smin||v[0]<out.smin.p) out.smin={p:v[0],c,t:v[2]}; }
    if(v[1]>0){ if(!out.bmax||v[1]>out.bmax.p) out.bmax={p:v[1],c,t:v[3]}; if(!out.bmin||v[1]<out.bmin.p) out.bmin={p:v[1],c,t:v[3]}; } } return out; }
const MK_SEEN = new Set(); let MK_TOK=0;
/* Primeira consulta: automática. Depois dela, trocar filtro ou ordem só redesenha com o que já foi consultado (sem tocar na API);
   o botão Pesquisar consulta os preços que ainda faltam para o filtro atual. */
function mkGatilho(){ if(MK.consultou){ MK_TOK++; MK.busy=false; lpHide($("mkNote")); renderMk(true); } else renderMk(); }
/* ordenação local (clique no cabeçalho): nome, preço de uma cidade, mediana, diferença ou atualização; sem preço vai sempre para o fim */
const MK_ORD_ROT={nome:"nome",med:"preço médio",dif:"diferença entre cidades",upd:"atualização"};
function mkValOrd(x,k){ const rec=x.rec||{};
  if(k==="nome") return mkName(x.r).toLowerCase();
  if(k==="dif") return x.x.smax&&x.x.smin?x.x.smax.p-x.x.smin.p:null;
  if(k==="med"){ const pts=Object.values(rec).map(v=>v[0]).filter(v=>v>0); return pts.length?median(pts):null; }
  if(k==="upd"){ const ts=Object.values(rec).map(v=>Math.max(v[2]||0,v[3]||0)).filter(Boolean); return ts.length?Math.max(...ts):null; }
  if(k.startsWith("c:")){ const v=rec[k.slice(2)]; return v&&v[0]>0?v[0]:null; }
  return null; }
function mkCmp(mq){ const {k,d}=MK.ord, src=mq>1?(PQ[mq]||{}):DATA.itens;
  return (a,b)=>{ a.rec=src[mkKey(a.id)]; b.rec=src[mkKey(b.id)]; const va=mkValOrd(a,k), vb=mkValOrd(b,k); if(va==null&&vb==null) return 0; if(va==null) return 1; if(vb==null) return -1;
    return (typeof va==="string"?va.localeCompare(vb,"pt-BR"):va-vb)*d; }; }
function mkOrdenar(k){ if(MK.ord.k===k) MK.ord.d*=-1; else MK.ord={k,d:(k==="nome"||k==="med"||k.startsWith("c:"))?1:-1}; mkGatilho(); }
/* Atualização de preço novo: troca só os valores das linhas cujo preço mudou de verdade (cidades, média, diferença e hora), sem redesenhar a tabela nem reordenar */
function mkAtualizaLinhas(set){
  const tb=$("mkTable"), m=tb&&tb._mk; if(!m||!tb.tBodies[0]) return; const src=m.mq>1?(PQ[m.mq]||{}):DATA.itens;
  const flash=td=>{ td.classList.remove("mk-flash"); void td.offsetWidth; td.classList.add("mk-flash"); setTimeout(()=>td.classList.remove("mk-flash"),1800); };
  for(const tr of tb.tBodies[0].rows){ const id=tr.dataset.fav; if(!id||!set.has(m.mq+"|"+mkKey(id))) continue;
    const rec=src[mkKey(id)]||{}, ex=extremes(id,m.mq), cs=m.cities, sp=ex.smax&&ex.smin?ex.smax.p-ex.smin.p:0, spp=ex.smin?sp/ex.smin.p:0, tone=!(ex.smax&&ex.smin)?"is-flat":sp>0?"is-gain":"is-warn";
    cs.forEach((c,i)=>{ const td=tr.cells[1+i]; if(!td) return; const v=rec[c];
      if(!v||!(v[0]>0)){ if(!td.classList.contains("none")){ td.textContent="—"; td.classList.add("none"); flash(td); } return; }
      td.classList.remove("none"); let b=td.querySelector("b.mk-pr"); if(!b){ td.textContent=""; b=el("b",{class:"mk-pr"}); td.append(b); }
      const txt=m.fmtC(v[0]); if(b.textContent!==txt){ b.textContent=txt; b.title=fmt(v[0]); flash(td); }
      b.className="mk-pr"+(ex.smin&&v[0]===ex.smin.p?" low":ex.smax&&v[0]===ex.smax.p&&sp>0?" high":""); });
    const k=1+cs.length, pts=cs.map(c=>rec[c]&&rec[c][0]).filter(v=>v>0), pm=tr.cells[k];
    if(pm){ pm.textContent=pts.length?m.fmtC(Math.round(median(pts))):"—"; pm.classList.toggle("none",!pts.length); pm.title="Mediana dos preços de venda nas cidades desta linha"+(pts.length?` (${pts.length} ${pts.length===1?"cidade":"cidades"})`:""); }
    const d=tr.cells[k+1]; if(d){ d.className="num bm-profit "+(sp>0?"gain":tone==="is-warn"?"warn":""); d.textContent=ex.smax&&ex.smin?fmt(sp):"—"; if(ex.smax&&ex.smin) d.append(el("small",{text:`${sp>=0?"+":""}${dec(spp*100)}%`})); }
    const ts=Object.values(rec).map(v=>Math.max(v[2]||0,v[3]||0)).filter(Boolean), u=tr.cells[k+2]; if(u){ u.textContent=""; u.append(ts.length?(ageSpan(Math.max(...ts))||"—"):"—"); }
    tr.classList.remove("is-flat","is-gain","is-warn"); tr.classList.add(tone); }
}
async function renderMk(partial=false,forcar=false){
  const note=$("mkNote"), tb=$("mkTable");
  if(!CATALOG){ note.textContent="Abrindo o catálogo de itens do jogo…"; try{ CATALOG=await need("catalog"); }catch(e){ note.textContent="Não consegui abrir o catálogo."; return; } }
  setupMk();
  const q=MK.q, search=q.length>=2;
  const FAVON=!!(window.FAV&&FAV.on("mk"));
  let base=CATALOG.i.filter(r=> FAVON ? true : search ? ((r[5]||"").toLowerCase().includes(q)||(r[6]||"").toLowerCase().includes(q)||r[0].toLowerCase().includes(q)) : ((!MK.cat||r[1]===MK.cat)&&(!MK.sub||r[2]===MK.sub)));
  base=base.filter(r=>FAVON||(r[3]>=4&&(!MK.tiers.size||MK.tiers.has(r[3]))));
  if(search&&!FAVON){ const rank={weapons:0,armors:1,head:1,shoes:1,offhands:2,capes:2,crafting:3,consumables:3,farming:4,mounts:4,bags:4,gathering:5,artefacts:6,other:7,furniture:8,vanity:9};
    const nm_=r=>(mkName(r)||"").toLowerCase(); base.sort((a,b)=>((nm_(b).startsWith(q))-(nm_(a).startsWith(q)))||((rank[a[1]]??9)-(rank[b[1]]??9))||(a[3]-b[3])); }
  else if(!MK.cat){ const rank={weapons:0,armors:1,head:1,shoes:1,offhands:2,capes:2,crafting:3,consumables:3,farming:4,mounts:4,bags:4,gathering:5,artefacts:6,other:7,furniture:8,vanity:9}; base.sort((a,b)=>((rank[a[1]]??9)-(rank[b[1]]??9))||mkName(a).localeCompare(mkName(b),"pt-BR")||(a[3]-b[3])); }
  else base.sort((a,b)=>subName(a[2]).localeCompare(subName(b[2]),"pt-BR")||mkName(a).localeCompare(mkName(b),"pt-BR")||(a[3]-b[3]));
  const list=[]; for(const r of base){ const all=r[4]||isLevelRes(r)?[0,1,2,3,4]:[0], es = (FAVON||!MK.enchs.size) ? all : all.filter(e=>MK.enchs.has(e)); for(const e of es) list.push({r,e,id:mkId(r,e)}); }
  if(FAVON){ const keep=new Set(FAV.list("mk").map(f=>f.k)); const kept=list.filter(x=>keep.has(x.id)); list.length=0; list.push(...kept); }
  const total=list.length, slice=list.slice(), SHOWN=300;
  const mq=MK.qual, seen=id=>mq>1?`${mq}|${id}`:id;
  if(forcar) for(const x of slice) MK_SEEN.delete(seen(x.id));   /* atualização manual: esquece o que já foi consultado destes itens e busca de novo, sem cache */
  const want=slice.filter(x=>!MK_SEEN.has(seen(x.id))).sort((a,b)=>a.e-b.e).map(x=>x.id);   /* o encantamento .0 de tudo vem primeiro: a tabela já fica útil nos primeiros lotes */
  const tok=partial?MK_TOK:++MK_TOK;
  if(!partial) MK.consultou=true;
  if(want.length&&!partial){ MK.busy=true; const ff=FORCE; if(forcar) FORCE=true; tb.textContent="";
    /* varredura da nuvem fresca: os itens cobertos vêm só da nuvem, em lotes grandes e em paralelo, sem a pausa que protege a API pública;
       o resto (e tudo, se a nuvem falhar) segue pela API pública em lotes espaçados */
    let cob=[], resto=want.slice(); try{ if(!FORCE&&await varrFresca()){ const set=await varrIds(); cob=want.filter(id=>set.has(id)); resto=want.filter(id=>!set.has(id)); } }catch(e){ cob=[]; resto=want.slice(); }
    const txt=`Consultando ${fmt(want.length)} itens em todas as cidades${mq>1?`, qualidade ${QNAME[mq].toLowerCase()}`:""}${cob.length?" (na nuvem)":""}`;
    const alvo=mq>1?PQ[mq]:DATA.itens; let ult=Date.now(), feitos=0;
    const parcial=async()=>{ if(Date.now()-ult>2500){ await renderMk(true); ult=Date.now(); } };   /* redesenho parcial no máximo a cada 2,5 s */
    try{
      const lc=[]; for(let i=0;i<cob.length;i+=300) lc.push(cob.slice(i,i+300));
      for(let i=0;i<lc.length;){ const g=lc.slice(i,i+3); lpShow(note,feitos,want.length,txt,"itens");
        try{ await Promise.all(g.map(l=>fetchIdsNuvem(l,alvo,SHOP_LOCS,mq))); g.forEach(l=>{ l.forEach(id=>MK_SEEN.add(seen(id))); feitos+=l.length; }); i+=g.length; await parcial(); if(tok!==MK_TOK) return; }
        catch(e){ resto=resto.concat(lc.slice(i).flat()); break; } }   /* a nuvem falhou: o que faltou segue pela API pública */
      const lotes=[]; for(let i=0;i<resto.length;i+=200) lotes.push(resto.slice(i,i+200));
      for(let i=0;i<lotes.length;i++){
        if(i||feitos){ await lpSpace(); if(tok!==MK_TOK) return; }
        lpShow(note,feitos,want.length,txt,"itens");
        await fetchIds(lotes[i],alvo,SHOP_LOCS,mq,45); lotes[i].forEach(id=>MK_SEEN.add(seen(id))); feitos+=lotes[i].length;
        lpShow(note,feitos,want.length,txt,"itens");
        if(i<lotes.length-1){ await parcial(); if(tok!==MK_TOK) return; } }
      lpHide(note); MK.busy=false; }catch(e){ lpHide(note); MK.busy=false; if(tok===MK_TOK) note.textContent="Não consegui consultar os preços agora."; return; } finally{ FORCE=ff; }
    if(tok!==MK_TOK||MK.qual!==mq) return; }
  const spr=x=>x.x.smax&&x.x.smin?x.x.smax.p-x.x.smin.p:0; let rows=slice.filter(x=>MK_SEEN.has(seen(x.id))||FAVON).map(x=>({...x,x:extremes(x.id,mq)})).filter(x=>FAVON||!MK.only||x.x.smin||x.x.bmax).sort(mkCmp(mq)); const achados=rows.length; if(!FAVON&&rows.length>SHOWN) rows=rows.slice(0,SHOWN);
  const cities=MK.city?[MK.city]:SHOP_LOCS;
  /* tela estreita: preço das cidades encurtado (7,98M, 187,2 mil); o valor inteiro fica no título */
  const NARROW=matchMedia("(max-width:1600px)").matches&&cities.length>3, fmtC=v=>!NARROW?fmt(v):v>=1e6?(v/1e6).toLocaleString("pt-BR",{maximumFractionDigits:2})+"M":v>=1e4?(v/1e3).toLocaleString("pt-BR",{maximumFractionDigits:1})+" mil":fmt(v);
  tb.classList.toggle("mk-narrow",NARROW);
  tb._mk={cities,fmtC,mq}; tb.textContent=""; const hr=tb.createTHead().insertRow();
  const hsort=(th,k)=>{ th.className="bm-sort"; th.tabIndex=0; th.setAttribute("role","button"); const on=MK.ord.k===k; th.setAttribute("aria-sort",on?(MK.ord.d>0?"ascending":"descending"):"none"); th.title="Ordenar por esta coluna (não refaz a consulta)"; if(on) th.append(" "+(MK.ord.d>0?"▲":"▼")); th.addEventListener("click",()=>mkOrdenar(k)); th.addEventListener("keydown",ev=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); mkOrdenar(k); } }); return th; };
  hr.append(hsort(el("th",{text:"Item"}),"nome"));
  cities.forEach(c=>{ const th=el("th",{}); th.append(el("span",{class:"dot",style:`background:${CITY_COLOR[c]||"#999"}`}),c); hr.append(hsort(th,"c:"+c)); });
  [["Preço médio","med"],["Diferença","dif"],["Atualizado","upd"]].forEach(([h,k])=>hr.append(hsort(el("th",{text:h}),k))); hr.append(el("th",{text:""}));
  const body=tb.createTBody(), src=mq>1?(PQ[mq]||{}):DATA.itens;
  for(const x of rows){ const rec=src[mkKey(x.id)]||{}; const sp=x.x.smax&&x.x.smin?x.x.smax.p-x.x.smin.p:0, spp=x.x.smin?sp/x.x.smin.p:0, hot=sp>0, tone=!(x.x.smax&&x.x.smin)?"is-flat":sp>0?"is-gain":"is-warn";
    const tr=body.insertRow(); tr.dataset.fav=x.id; tr.className="clickrow bm-row mk-row "+tone; tr.tabIndex=0; const nm_=mkName(x.r);
    const c0=tr.insertCell(); c0.className="itemcell"; const hd=el("div",{class:"ihead"}); const ii=iconImg(x.id,76,mq); ii.classList.add("ic-row"); if(x.r[3]) hd.append(el("span",{class:"tbadge",text:`T${x.r[3]}`})); hd.append(ii);
    const nb=el("span",{class:"inm"}); const tn=el("strong",{}); tn.append(nm_); if(mq>1) tn.append(el("span",{class:"qtag q"+mq,text:QNAME[mq]})); nb.append(tn,el("small",{text:`${x.r[3]?`T${x.r[3]}.${x.e}`:"sem tier"} · ${CATALOG.c[x.r[1]]||""}${x.r[2]&&subName(x.r[2])!==CATALOG.c[x.r[1]]?` › ${subName(x.r[2])}`:""}`})); hd.append(nb); c0.append(hd);
    for(const c of cities){ const v=rec[c], td=tr.insertCell(); td.className="num mk-city"; if(!v||!(v[0]>0)){ td.textContent="—"; td.classList.add("none"); continue; }
      const b=el("b",{class:"mk-pr"+(x.x.smin&&v[0]===x.x.smin.p?" low":x.x.smax&&v[0]===x.x.smax.p&&sp>0?" high":""),text:fmtC(v[0]),title:fmt(v[0])}); td.append(b); }
    { const pts=cities.map(c=>rec[c]&&rec[c][0]).filter(v=>v>0), pm=tr.insertCell(); pm.className="num mk-avg"; pm.textContent=pts.length?fmtC(Math.round(median(pts))):"—"; pm.title="Mediana dos preços de venda nas cidades desta linha"+(pts.length?` (${pts.length} ${pts.length===1?"cidade":"cidades"})`:""); if(!pts.length) pm.classList.add("none"); }
    const d=tr.insertCell(); d.className="num bm-profit "+(hot?"gain":tone==="is-warn"?"warn":""); d.textContent=x.x.smax&&x.x.smin?fmt(sp):"—"; if(x.x.smax&&x.x.smin) d.append(el("small",{text:`${sp>=0?"+":""}${dec(spp*100)}%`})); d.title="Maior venda menos menor venda: o espaço para comprar numa cidade e vender em outra";
    const ts=Object.values(rec).map(v=>Math.max(v[2]||0,v[3]||0)).filter(Boolean); const tu=tr.insertCell(); tu.className="num"; tu.append(ts.length?(ageSpan(Math.max(...ts))||"—"):"—");
    const ac=tr.insertCell(); const bt=el("button",{type:"button",class:"btn mn-craft",text:NARROW?"Ver":"Detalhe",title:"Ver detalhe"}); ac.append(bt,bagBtn(()=>[{id:x.id,q:1,nm:`${nm_}${x.r[3]?` T${x.r[3]}.${x.e}`:""}`,buy:x.x.smin?x.x.smin.p:0,buyC:x.x.smin?x.x.smin.c:"",sell:x.x.smax?x.x.smax.p:0,sellC:x.x.smax?x.x.smax.c:""}],"Pôr na bag: compra na cidade mais barata, vende na mais cara"));
    const op=()=>openItem(x.id,`${nm_} ${x.r[3]?`T${x.r[3]}.${x.e}`:""}`,mq); tr.addEventListener("click",op); tr.addEventListener("keydown",ev=>{ if(ev.key==="Enter"&&ev.target===tr) op(); }); }
  const shownN=rows.length, cortado=achados>shownN, naoVistos=slice.filter(x=>!MK_SEEN.has(seen(x.id))).length;
  const mm=$("mkMore"); if(mm) mm.hidden=true;
  { const g=$("mkGo"); if(g){ g.hidden=!MK.consultou; g.disabled=!naoVistos||MK.busy; g.textContent=naoVistos?`Pesquisar (${fmt(naoVistos)} sem preço)`:"Pesquisar"; g.title=naoVistos?"Consulta os preços dos itens deste filtro que ainda não foram consultados":"Todos os itens deste filtro já foram consultados"; g.classList.toggle("hot",!!naoVistos&&!MK.busy); }
    const rf=$("mkRef"); if(rf){ rf.hidden=!MK.consultou; rf.disabled=MK.busy||!total; rf.title=`Consulta de novo, na API, os preços dos ${fmt(total)} itens deste filtro (ignora o que estava guardado)`; } }
  note.textContent = !total ? "Nenhum item com esse filtro." : `${fmt(shownN)} ${shownN===1?"registro exibido":"registros exibidos"} de ${fmt(total)} ${search?`com "${q}"`:MK.cat?`em ${CATALOG.c[MK.cat]}${MK.sub?` · ${subName(MK.sub)}`:""}`:"em todas as categorias"}, ordenados por ${MK_ORD_ROT[MK.ord.k]||"preço em "+MK.ord.k.slice(2)}${MK.ord.d>0?" (crescente)":" (decrescente)"}${cortado?` (as ${fmt(shownN)} maiores de ${fmt(achados)} com anúncio)`:""}. ${MK.busy&&naoVistos?`Ainda consultando: faltam ${fmt(naoVistos)} itens. `:!MK.busy&&naoVistos&&MK.consultou?`Faltam ${fmt(naoVistos)} itens deste filtro sem preço consultado: clique em Pesquisar. `:achados<slice.length&&!FAVON?`${fmt(slice.length-achados)} sem anúncio nos últimos 3 dias ficaram de fora. `:""}${mq>1?`Qualidade ${QNAME[mq].toLowerCase()}: só entram itens com anúncio nessa qualidade (recursos e comida só existem na Normal). `:""}Linha verde: tem diferença para lucrar; amarela: diferença zero. Na linha, o menor preço fica em verde e o maior em âmbar. Clique num item para ver as ofertas e o histórico.`;
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

/* ================= Craft: refinar os materiais em vez de comprar ================= */
/* Com "Refinar eu mesmo", cada barra, tecido, couro ou tábua da receita custa o que sai refinar:
   (matéria-prima do tier × quantidade + 1 refinado do tier anterior) × (1 − retorno do refino) + taxa da estação.
   O refinado do tier anterior entra pelo mais barato entre comprar pronto e refinar também (em cadeia até o T4; o T3 é comprado). */
OF2.selfRef=store.get("ofSelfRef")==="1"; OF2.selfRefFoc=store.get("ofSelfRefF")==="1";
const REF_BY=Object.fromEntries(REF5.map(R=>[R.ref,R]));
const selfRefOn=()=>OF.mode==="craft"&&OF2.selfRef;
function refParse(id){ const m=/^T(\d)_([A-Z]+)(?:_LEVEL(\d))?$/.exec(String(id).split("@")[0]); if(!m) return null; const R=REF_BY[m[2]]; return R?{R,t:+m[1],e:+(m[3]||0)}:null; }
const buyEff=b=>b?b.p*(b.mode==="ordem"?1.025:1):Infinity;
function refUnit(id){
  const P=refParse(id); if(!P||P.t<4) return null; const {R,t,e}=P;
  const raw=pickBuy(idLv(t,R.raw,e)); if(!raw) return null;
  const prevId=t===4?`T3_${R.ref}`:idLv(t-1,R.ref,e), pb=pickBuy(prevId), pr=t>4?refUnit(prevId):null;
  const usePr=pr&&pr.p<buyEff(pb), prevP=usePr?pr.p:buyEff(pb); if(!isFinite(prevP)) return null;
  const rr=rrr(0.40,OF2.selfRefFoc,st.daily), fee=IV(t,e)*0.1125*feeVal()/100;
  const p=(N[t]*buyEff(raw)+prevP)*(1-rr)+fee;
  return {p,c:R.city,t:raw.t,mode:"refino",raw,rawId:idLv(t,R.raw,e),n:N[t],prevId,prevP,prevSrc:usePr?"refinado":"comprado",prevC:usePr?R.city:pb.c,rr,fee,R,tier:t,ench:e};
}
function refNote(b,id){
  const R=b.R, rawNm=`${R.rawPT} T${b.tier}.${b.ench}`, prevNm=`${R.refPT} ${b.tier===4?"T3":`T${b.tier-1}.${b.ench}`}`, pronto=pickBuy(id);
  const p=el("p",{class:"tiny muted of-refn"});
  p.append(`Refino em ${R.city}: ${b.n}× ${rawNm} a ${fmt(b.raw.p)} (${b.raw.c}) + 1× ${prevNm} a ${fmt(Math.round(b.prevP))} (${b.prevSrc==="refinado"?"você refina também":"compra em "+b.prevC}), retorno ${dec(b.rr*100)}%, taxa da estação ${fmt(Math.round(b.fee))}. Sai ${fmt(Math.round(b.p))} cada.`);
  if(pronto){ const d=pronto.p-b.p; p.append(` Comprar pronto: ${fmt(pronto.p)} em ${pronto.c} (${d>=0?"refinar economiza "+fmt(Math.round(d)):"comprar sai "+fmt(Math.round(-d))+" mais barato"} por unidade).`); }
  return p; }
async function ensureRefMats(items){
  const ids=new Set();
  for(const it of items) for(const g of it.ing){ if(g.art) continue; const P=refParse(g.id); if(!P||P.t<4) continue;
    for(let t=P.t;t>=4;t--){ ids.add(apiLv(t,P.R.raw,P.e)); ids.add(apiLv(t,P.R.ref,P.e)); } ids.add(`T3_${P.R.ref}`); }
  const need=[...ids].filter(id=>!OF.loaded.has("rm|"+id)); if(!need.length) return true;
  try{ const g=LIVE_GEN; await fetchIds(need,DATA.itens,SHOP_LOCS); if(g===LIVE_GEN) need.forEach(id=>OF.loaded.add("rm|"+id)); else await fetchIds(need,DATA.itens,SHOP_LOCS); return true; }catch(e){ return false; }
}
function setupSelfRef(){
  const sr=$("ofSR"), sf=$("ofSRF"); if(!sr||sr._ok) return; sr._ok=1;
  const sync=()=>{ sr.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.sr==="1")===OF2.selfRef)));
    sf.hidden=!OF2.selfRef; sf.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String((b.dataset.f==="1")===OF2.selfRefFoc)));
    $("ofSRtxt").textContent=OF2.selfRef?`Barras, tecido, couro e tábuas pelo custo de refinar na cidade com bônus (retorno ${dec(rrr(0.40,OF2.selfRefFoc,st.daily)*100)}%). A matéria-prima segue a estratégia de compra.`:"Barras, tecido, couro e tábuas comprados prontos no mercado."; };
  sr.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; OF2.selfRef=b.dataset.sr==="1"; store.set("ofSelfRef",OF2.selfRef?"1":"0"); sync(); renderOf(); });
  sf.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; OF2.selfRefFoc=b.dataset.f==="1"; store.set("ofSelfRefF",OF2.selfRefFoc?"1":"0"); sync(); renderOf(); });
  sync(); }

/* ================= Refino: o craft que mais rende com cada material ================= */
/* Para cada barra, tecido, couro ou tábua da lista, procura entre as armas, armaduras e mãos secundárias do mesmo tier e encantamento
   a que dá mais lucro por unidade do material, usando o custo de refino da própria linha para esse material e o mercado para o resto.
   Craft na cidade com bônus, sem foco; venda pela estratégia de venda escolhida. */
const REF_LETTER={METALBAR:"M",PLANKS:"P",LEATHER:"L",CLOTH:"C"};
const BC={loaded:new Set(), res:{}};
async function ensureCraftTE(t,e){
  const key=t+"|"+e; if(BC.loaded.has(key)) return true;
  const ids=[], mats=new Set(), extra=new Set();
  for(const k in BM){ const r=BM[k]; ids.push(bmId(k,t,e)); for(const [,c] of r[3].matchAll(/([MPLC])(\d+)/g)) mats.add(apiLv(t,BM_RES[c],e)); if(r[4]) extra.add(`T${t}_${r[4][0]}`); }
  try{ const g=LIVE_GEN; await fetchIds(ids,DATA.itens,SHOP_LOCS); await fetchIds([...mats,...extra],DATA.itens,SHOP_LOCS); if(g===LIVE_GEN) BC.loaded.add(key); return true; }catch(e){ return false; }
}
function bestCraftsFor(ref,t,e,unitCost){
  const L=REF_LETTER[ref]; if(!L) return [];
  const rr=rrr(0.15,false,st.daily), out=[];
  for(const k in BM){ const r=BM[k]; if(!r[3].includes(L)) continue; const id=bmId(k,t,e); const sale=pickSell(id); if(!sale) continue;
    let mat=0, cnt=0, used=0, ok=true;
    for(const [,c,n] of r[3].matchAll(/([MPLC])(\d+)/g)){ const nn=+n; cnt+=nn; let u;
      if(BM_RES[c]===ref){ u=unitCost; used+=nn*(1-rr); } else { const b=pickBuy(idLv(t,BM_RES[c],e)); if(!b){ ok=false; break; } u=buyEff(b); }
      mat+=nn*u*(1-rr); }
    if(!ok) continue;
    if(r[4]){ const b=pickBuy(`T${t}_${r[4][0]}`); if(!b) continue; mat+=r[4][1]*buyEff(b); }
    const fee=cnt*IV(t,e)*0.1125*feeVal()/100, tax=OF2.tax?((st.prem?0.04:0.08)+(sale.mode==="ordem"?0.025:0)):0;
    const profit=sale.p*(1-tax)-mat-fee; if(!(used>0)) continue;
    out.push({k,id,g:r[1],name:nmKey(k,r[0]),t,e,profit,perMat:profit/used,used,sale}); }
  return out.sort((a,b)=>b.perMat-a.perMat); }
async function fillBestCrafts(shown,stale){
  if(!BM) return; const tok=(BC.tok=(BC.tok||0)+1);
  const rows=(OF2.rows||[]).filter(r=>REF_LETTER[r.m.it.key]);
  const groups=[]; for(const r of rows){ const k=r.m.it.t+"|"+r.m.it.e; if(!groups.includes(k)) groups.push(k); }
  for(const r of rows){ const nm=r.tr.querySelector(".inm"); if(nm&&!nm.querySelector(".of-bc")) nm.append(el("span",{class:"of-bc wait",text:"Melhor craft: calculando…"})); }
  for(const gk of groups){ const [t,e]=gk.split("|").map(Number);
    if(!await ensureCraftTE(t,e)){ break; } if(BC.tok!==tok||(stale&&stale())) return;
    for(const r of rows){ if(r.m.it.t!==t||r.m.it.e!==e||!r.tr.isConnected) continue; const m=r.m, unit=m.cost/m.units;
      const best=bestCraftsFor(m.it.key,t,e,unit); const nm=r.tr.querySelector(".inm"); if(!nm) continue; nm.querySelectorAll(".of-bc").forEach(x=>x.remove());
      const box=el("span",{class:"of-bc"}); nm.append(box);
      if(!best.length){ box.append(el("span",{class:"wk-fl",text:"Melhor craft"}),el("small",{text:"sem preço de venda das peças deste tier"})); continue; }
      const b=best[0], top=best.slice(0,3).map((x,i)=>`${i+1}. ${x.name} T${t}.${e}: ${sgn(Math.round(x.profit))} por peça, ${sgn(Math.round(x.perMat))} por unidade de ${m.it.name.replace(/ T\d\.\d$/,"").toLowerCase()} (vende em ${x.sale.c})`).join("\n");
      box.title=`Craft na cidade com bônus, sem foco, com o material pelo custo deste refino (${fmt(Math.round(unit))} cada).\n${top}`;
      const go=el("button",{type:"button",class:"linkbtn of-bcgo",text:`${b.name} T${t}.${e}`}); go.addEventListener("click",ev=>{ ev.stopPropagation(); ofFromRef(b); });
      box.append(el("span",{class:"wk-fl",text:"Melhor craft"}),go,el("b",{class:b.profit>=0?"gain":"loss",text:` ${sgn(Math.round(b.profit))} por peça`}),el("small",{text:` · ${sgn(Math.round(b.perMat))} por unidade do material`})); } }
}
/* abre o item no Craft, com o material refinado por você */
async function ofFromRef(b){
  setupOf(); ofApplyMode("craft");
  const sel=$("ofCat"); sel.value="g:"+b.g; store.set("ofCat",sel.value);
  OF.tier=b.t; OF.ench=b.e; $("ofTier").value=String(b.t); $("ofEnch").value=String(b.e);
  OF.q=b.name.toLowerCase(); $("ofFind").value=b.name; OF2.ov={}; OF2.open.clear(); OF2.open.add(b.id);
  OF2.selfRef=true; store.set("ofSelfRef","1"); { const sr=$("ofSR"); if(sr) sr.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.sr==="1"))); const sf=$("ofSRF"); if(sf) sf.hidden=false; }
  document.getElementById("t-craft").click(); try{ ofCards(); }catch(e){} renderOf(); }
