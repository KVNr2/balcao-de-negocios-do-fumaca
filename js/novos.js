/* ================= dados das peças (lista de equipamentos e cidades de compra) ================= */
let GEAR = null;                    // data/gear.json: n: nome em inglês → chave, s: chave → h|a|s|c|o|w, e: chave → runas por encantamento
const SHOP_LOCS = [...CITIES,"Caerleon","Brecilien"];
const GEAR_ALIAS = {"1H Dagger":"Dagger","1H Spear":"Spear","Great Axe":"Greataxe"};
function gearKey(name){ let n=(name||"").trim().replace(/^Elder's /,""); n=GEAR_ALIAS[n]||n; return GEAR.n[n]||null; }
const priceIn = (id,city) => { const r=BMP[id]&&BMP[id][city]; return r&&r[0]>0?r[0]:null; };
function cheapest(id){ let best=null; for(const c of SHOP_LOCS){ const p=priceIn(id,c); if(p&&(!best||p<best.p)) best={p,c}; } return best; }
/* tier equivalente: T8 = 8.0, 7.1, 6.2, 5.3 e 4.4. Em empate de preço vale a ordem 4.4 primeiro, depois do maior tier para o menor */
function bcEquivs(sum){ const out=[]; const push=(t,e)=>{ if(t>=4&&t<=8&&e>=0&&e<=4) out.push([t,e]); }; push(sum-4,4); for(let e=0;e<=3;e++) push(sum-e,e); return out; }

/* ================= encantar ================= */
const EN_MAT = {1:["RUNE","Runa"],2:["SOUL","Alma"],3:["RELIC","Relíquia"]};
const EN_LOADED = new Set(); let enTierSel=0;
/* only: um tier só (obrigatório em "Todas as mercadorias", senão seriam milhares de peças); 0 = os tiers 4 a 8 do grupo */
const enLoaded=(g,only)=>EN_LOADED.has(g)||(only>0&&EN_LOADED.has(`${g}#${only}`));
async function ensureEnch(g,only=0,cancel=null,quiet=false,step=null){
  if(enLoaded(g,only)) return true;
  const note=$("enNote");
  if(g==="*"){   // todas as mercadorias: um tipo por vez, com pausa e barra (senão seriam milhares de peças de uma vez)
    const gs=bmSelGroups(bmKeys("*")), nomeG=x=>(BM_GROUPS.find(y=>y[0]===x)||[0,x])[1].toLowerCase();
    try{
      for(let i=0;i<gs.length;i++){
        if(i){ await lpSpace(); if(cancel&&cancel()){ lpHide(note); return true; } }
        lpShow(note,i,gs.length,`Consultando peças e materiais: ${nomeG(gs[i])}`);
        if(!await ensureEnch(gs[i],only,null,true)){ lpHide(note); return false; }
        lpShow(note,i+1,gs.length,`Consultando peças e materiais: ${nomeG(gs[i])}`);
        if(step&&i<gs.length-1){ await step(); if(cancel&&cancel()){ lpHide(note); return true; } } }
      EN_LOADED.add(`*#${only}`); lpHide(note); return true;
    }catch(e){ lpHide(note); return false; }
  }
  if(!quiet) lpShow(note,0,0,"Consultando peças, runas, almas e relíquias…");
  try{
    const ok=await ensureBM(g,only); if(!ok) return false;
    const tiers=only?[only]:[4,5,6,7,8];
    const ids=[]; for(const k of bmKeys(g)) for(const t of tiers) for(let e=0;e<=4;e++) ids.push(bmId(k,t,e));
    const mats=[]; for(const t of tiers) for(const e of [1,2,3]) mats.push(`T${t}_${EN_MAT[e][0]}`);
    try{ await bmFetch(ids,SHOP_LOCS); await fetchIds(mats,DATA.itens,SHOP_LOCS); EN_LOADED.add(only?`${g}#${only}`:g); return true; }catch(e){ return false; }
  } finally{ if(!quiet) lpHide(note); }
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
  { const og=el("optgroup",{label:"Todos"}); og.append(el("option",{value:"*",text:"Todas as mercadorias"})); sel.append(og); }
  for(const og of src.children) sel.append(og.cloneNode(true)); sel.value="*";
  const ts=$("enTier"); ["Todos",4,5,6,7,8].forEach((t,i)=>ts.append(el("button",{type:"button","data-t":String(i?t:0),"aria-pressed":String((i?t:0)===enTierSel),text:i?`T${t}`:t})));
  ts.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ts.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); enTierSel=+b.dataset.t; renderEN(); });
  sel.addEventListener("change",()=>{ store.set("enGroup",sel.value); renderEN(); });
}
let EN_TOK=0;
async function renderEN(partial=false){
  const note=$("enNote"), tb=$("enTable");
  if(!BM||!GEAR){ note.textContent="Abrindo os dados das peças…"; try{ [BM,GEAR]=await Promise.all([BM||need("bm"),GEAR||need("gear")]); }catch(e){ note.textContent="Não consegui abrir os dados das peças."; return; } }
  setupEN(); const FAVON=!!(window.FAV&&FAV.on("encantar")); const g=$("enGroup").value, t=FAVON?0:enTierSel;
  const favG=FAVON?[...new Set(FAV.list("encantar").map(f=>f.c&&f.c.g).filter(Boolean))]:[];
  if(FAVON){ for(const gg of favG){ if(!EN_LOADED.has(gg)){ tb.textContent=""; note.textContent="Consultando os favoritos…"; const ok=await ensureEnch(gg); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } } } }
  else if(!partial&&!enLoaded(g,t)){ tb.textContent=""; const my=++EN_TOK, gone=()=>my!==EN_TOK||$("enGroup").value!==g||enTierSel!==t; const ok=await ensureEnch(g,t,gone,false,()=>renderEN(true)); if(gone()) return; if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } }
  if(!partial) EN_TOK++;
  const rows=[]; if(FAVON){ const keep=new Set(FAV.list("encantar").map(f=>f.k)); for(const gg of favG) for(const k of bmKeys(gg)) for(const tt of [4,5,6,7,8]) for(const e of [1,2,3]){ if(!keep.has(`${k}|${tt}|${e}`)) continue; const m=enModel(k,tt,e); if(m&&!m.miss) rows.push(m); } }
  else for(const k of bmKeys(g)) for(const tt of (t?[t]:[4,5,6,7,8])) for(const e of [1,2,3]){ const m=enModel(k,tt,e); if(m&&!m.miss) rows.push(m); }
  rows.sort((a,b)=>((b.save??-1e15)-(a.save??-1e15)));
  tb.textContent=""; const hr=tb.createTHead().insertRow(); ["Peça","Passo","Custo final","Economia"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody();
  for(const m of rows.slice(0,FAVON?rows.length:(t?40:80))){ const tr=body.insertRow(); tr.dataset.fav=`${m.key}|${m.t}|${m.e}`; tr.dataset.fctx=JSON.stringify({g:BM[m.key][1]}); tr.tabIndex=0; tr.className="clickrow"; tr.insertCell().append(withIcon(bmId(m.key,m.t,m.e),`${nmKey(m.key,m.name)} T${m.t}`)); { const sc=tr.insertCell(); sc.append(withIcon(bmId(m.key,m.t,m.e-1),`.${m.e-1} → .${m.e}`)); }
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
  FZ_LOADING=fetchPaced([...ids],DATA.itens,SHOP_LOCS,"fzNote","Consultando sementes, colheitas e animais").then(()=>{FZ_LOADED=true; return true;}).catch(()=>false).finally(()=>{FZ_LOADING=null;});
  return FZ_LOADING;
}
const fzName = id => (FARM.n[id]||id).replace(/^Sementes de /,"");
function cheapestCrop(){ let best=null; for(const r of FARM.p){ if(HERBS.test(r[0])) continue; const p=fzBuy(r[1],"food"); if(p&&(!best||p.p<best.p)) best={id:r[1],p:p.p}; } return best; }
/* foco: 1.000 por semente regada ou por vez que alimenta o filhote, sem spec; a spec de cada planta e animal reduz.
   o valor que o jogo mostra pode ser digitado na linha e fica guardado */
let FZ_OBS={}; try{ FZ_OBS=JSON.parse(store.get("fzObs")||"{}"); }catch(e){}
// a spec de cada planta, erva e animal vem da Minha ficha (seção Fazenda)
const fzFCE = id => itemFCE(id.replace(/^T\d_/,""));
const fzFocus = id => FZ_OBS[id]>0 ? FZ_OBS[id] : Math.max(1,Math.round(1000*Math.pow(0.5,fzFCE(id)/10000)));
const fzHasSpec = () => ["z:plantas","z:ervas","z:animais"].some(k=>spMax((PF.sp||{})[k])>0);
/* de onde vêm sementes, filhotes, ração e ingredientes: comprar na hora, ordem de compra, produzir na ilha ou já ter.
   SRC.seed e SRC.food valem na fazenda; SRC.ck, SRC.ckO (por ingrediente), SRC.ckM (valor manual) e SRC.ckN (fornadas) na cozinha */
let SRC={}; try{ SRC=JSON.parse(store.get("srcMat")||"{}")||{}; }catch(e){}
const srcSave=()=>{ try{ store.set("srcMat",JSON.stringify(SRC)); }catch(e){} };
function fzBuy(id,cls,npc){
  const m=SRC[cls]||"inst";
  if(m==="tenho") return {p:0,n:9,src:"tenho"};
  if(m==="planto"){ const u=farmUnit(id); if(u) return u; }
  const o=m==="ordem"?typical(id,1):null, i=o||typical(id,0);
  if(i) return {p:i.p,n:i.n,src:o?"ordem":"inst"};
  return npc?{p:npc,n:9,src:"npc"}:null;
}
/* custo de produzir 1 unidade na ilha, sem regar: semente que não volta dividida pela colheita;
   leite e ovos pela ração do dia dividida pelo que o animal dá. null se não sai da fazenda ou faltam dados */
function farmUnit(id){
  if(!FARM||!FZ_LOADED) return null;
  const r=FARM.p.find(r=>r[1]===id);
  if(r){ const [seed,,,chance,,,npc,avg]=r; const s=fzBuy(seed,"seed",npc); if(!s) return null; const y=avg*(st.prem?2:1); return y>0?{p:Math.max(0,s.p*(1-Math.min(chance,2)))/y,n:9,src:"planto"}:null; }
  const q=FARM.pr.find(r=>r[1]===id);
  if(q){ const [,,,avg,nut,fav]=q; if(!fav||!avg) return null; const f=SRC.food==="planto"?(FARM.p.some(r=>r[1]===fav)?farmUnit(fav):null):null, fb=f||fzBuy(fav,"food"); if(!fb) return null; return {p:Math.ceil(nut/96)*fb.p/avg,n:9,src:"planto"}; }
  return null;
}
const isFarmItem=id=>!!FARM&&(FARM.p.some(r=>r[1]===id)||FARM.pr.some(r=>r[1]===id));
const SRC_TAG={ordem:" (ordem)",tenho:" (já tem)",planto:" (da ilha)",npc:" (NPC)"};
function plantModel(r){
  const [seed,crop,t,chance,bonus,,npc,avg]=r; const ps=fzBuy(seed,"seed",npc), pc=typical(crop,0), pw=typical("T1_WORM",0);
  if(!pc||!ps) return null; const sp=ps.p;
  const yieldN=avg*(st.prem?2:1), back0=Math.min(chance,2), back1=Math.min(chance+bonus,2);
  const base=yieldN*pc.p*(1-taxOf())+(pw?0.1*pw.p:0)-sp;
  const fc=fzFocus(seed), gain=(back1-back0)*sp;
  return {seed,crop,t,sp,sSrc:ps.src,seedMkt:ps.src!=="npc",yieldN,back0,back1,cp:pc.p,p0:base+back0*sp,p1:base+back1*sp,fc,spf:gain/fc,thin:pc.n<2};
}
function animalRaise(r){
  const [baby,grown,t,hours,off,bonus,nut,fav,cat,npc,cycles]=r; if(cat!=="plants") return null;
  const pb=fzBuy(baby,"seed",npc), pg=typical(grown,0); if(!pg||!pb) return null; const bp=pb.p;
  let food=null; if(fav){ const f=fzBuy(fav,"food"); if(f) food={id:fav,n:Math.ceil(nut/96),p:f.p,src:f.src}; }
  if(!food){ const c=cheapestCrop(); if(c) food={id:c.id,n:Math.ceil(nut/48),p:c.p,src:SRC.food||"inst"}; }
  if(!food) return null; const n=cycles||1, o0=Math.min(off,1), o1=Math.min(off+bonus*n,1);
  const base=pg.p*(1-taxOf())-bp-food.n*food.p, h=st.prem?hours/2:hours, days=Math.max(1,h/24);
  const fc1=fzFocus(baby), fc=fc1*n;
  return {baby,grown,t,hours:h,bp,bSrc:pb.src,gp:pg.p,food,o0,o1,n,fc1,fc,p0:base+o0*bp,p1:base+o1*bp,days,spf:(o1-o0)*bp/fc,thin:pg.n<2};
}
function producerModel(r){
  const [grown,item,t,avg,nut,fav]=r; const pi=typical(item,0); if(!pi) return null;
  let food=null; if(fav){ const f=fzBuy(fav,"food"); if(f) food={id:fav,n:Math.ceil(nut/96),p:f.p,src:f.src}; }
  if(!food) return null; return {grown,item,t,avg,ip:pi.p,food,profit:avg*pi.p*(1-taxOf())-food.n*food.p,thin:pi.n<2};
}
function focusInput(id,val){
  const inp=el("input",{type:"number",min:"1",value:FZ_OBS[id]>0?String(FZ_OBS[id]):"",placeholder:String(val),"aria-label":"Foco que o jogo mostra"}); inp.className="fzobs";
  inp.addEventListener("change",()=>{ const v=+inp.value; if(v>0) FZ_OBS[id]=v; else delete FZ_OBS[id]; store.set("fzObs",JSON.stringify(FZ_OBS)); renderFZ(); });
  return inp;
}
/* filtros e ordenação de cada lista da fazenda (listfil.js); cada lista guarda os seus */
const fzP=m=>$("fzFocus").checked?m.p1:m.p0;
const FZ_SOLD={crop:m=>m.crop,herb:m=>m.crop,prod:m=>m.item,raise:m=>m.grown};
const FZ_DEF={crop:{k:"profit",dir:1},herb:{k:"profit",dir:1},prod:{k:"profit",dir:1},raise:{k:"day",dir:1}};
function fzFil(kind){
  const v={k:"minVol",lab:"Vende por dia, no mínimo",step:1,min:0,get:m=>lfVol(FZ_SOLD[kind](m))};
  if(kind==="crop"||kind==="herb") return [{k:"minP",lab:"Lucro mínimo por semente",step:100,get:fzP},{k:"minPct",lab:"Lucro % mínimo",step:1,get:m=>m.sp>0?fzP(m)/m.sp*100:null},{k:"minSpf",lab:"Prata por foco, no mínimo",step:1,get:m=>m.spf},v];
  if(kind==="prod") return [{k:"minP",lab:"Lucro mínimo por animal por dia",step:100,get:m=>m.profit},{k:"minPct",lab:"Lucro % mínimo",step:1,get:m=>{ const c=m.food.n*m.food.p; return c>0?m.profit/c*100:null; }},v];
  return [{k:"minP",lab:"Lucro mínimo por animal",step:1000,get:fzP},{k:"minDay",lab:"Lucro por dia, no mínimo",step:100,get:m=>fzP(m)/m.days},{k:"minPct",lab:"Lucro % mínimo",step:1,get:m=>{ const c=m.bp+m.food.n*m.food.p; return c>0?fzP(m)/c*100:null; }},{k:"minSpf",lab:"Prata por foco, no mínimo",step:1,get:m=>m.spf},v];
}
async function renderFZ(){
  const tb=$("fzTable"), note=$("fzNote"), bar=$("fzFil");
  if(!FARM){ note.textContent="Abrindo os dados da fazenda…"; try{ FARM=await need("farm"); }catch(e){ note.textContent="Não consegui abrir os dados da fazenda."; return; } }
  if(!FZ_LOADED){ tb.textContent=""; note.textContent="Consultando sementes, colheitas e animais…"; const ok=await ensureFZ(); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } }
  const focus=$("fzFocus").checked, plots=Math.max(1,Math.min(999,+$("fzPlots").value||1));
  $("fzSpecTxt").textContent = fzHasSpec() ? "O foco usa as specs de fazenda da sua ficha." : "Sem spec de fazenda na ficha: a conta usa o foco cheio. Preencha em Minha ficha, seção Fazenda.";
  const FAVON=!!(window.FAV&&FAV.on("fazenda")), rer=()=>renderFZ();
  /* modelos de cada lista, antes de desenhar, para buscar as vendas por dia de uma vez */
  const models=kind=>kind==="crop"||kind==="herb"?FARM.p.filter(r=>(kind==="herb")===HERBS.test(r[0])).map(plantModel).filter(Boolean)
    :kind==="prod"?FARM.pr.map(producerModel).filter(Boolean):FARM.b.map(animalRaise).filter(Boolean);
  const kinds=FAVON?["crop","herb","prod","raise"]:[fzKind], M={};
  let needVol=false, ids=[];
  for(const k of kinds){ M[k]=models(k); ids=ids.concat(M[k].map(FZ_SOLD[k])); const key="fz:"+k; if(lfState(key,FZ_DEF[k]).k==="vol"||(!FAVON&&lfNum(lfGet(key).minVol))) needVol=true; }
  if(FAVON){ if(bar) bar.hidden=true; } else lfBar(bar,"fz:"+fzKind,fzFil(fzKind),rer);
  await lfEnsureVol(ids,needVol,tb,note);
  tb.textContent=""; const hr=tb.createTHead().insertRow(); const body=tb.createTBody();
  const cell=(tr,v,cls)=>{ const c=tr.insertCell(); if(cls) c.className=cls; if(v instanceof Node) c.append(v); else c.textContent=v; return c; };
  const gl=v=>"num "+(v>=0?"gain":"loss");
  const gcell=(tr,v,sub)=>{ const c=tr.insertCell(); c.className="num gv-cell "+(v>=0?"gain":"loss"); c.append(el("b",{class:"gv",text:sgn(v)}),el("small",{class:"gv-sub",text:(v<0?"prejuízo: ":"")+sub})); return c; };
  let nOut=0;
  const draw=(kind,hr,keep)=>{
    const key="fz:"+kind, def=FZ_DEF[kind], vs={h:"Vende por dia",k:"vol",s:m=>lfVol(FZ_SOLD[kind](m)),t:"Ordenar pelas unidades vendidas por dia (7 dias, somando as cidades)"};
    const nm=id=>m=>fzName(id(m));
    let cols;
    if(kind==="crop"||kind==="herb") cols=[{h:"Planta",k:"name",s:nm(m=>m.crop)},{h:"Você ganha por colheita",k:"tot",s:m=>fzP(m)*9*plots,t:"Ordenar pela prata que sobra a cada colheita, em todos os seus lotes"},{h:"Semente",k:"cost",s:m=>m.sp,first:-1,t:"Ordenar pelo preço da semente (primeiro clique: a mais barata)"},{h:"Colheita",k:"sale",s:m=>m.cp,t:"Ordenar pelo preço da colheita"},{h:"Sementes de volta"},{h:"Lucro por semente",k:"profit",s:fzP},{h:"Foco por semente"},{h:"Prata por foco",k:"spf",s:m=>m.spf},vs];
    else if(kind==="prod") cols=[{h:"Animal",k:"name",s:nm(m=>m.grown)},{h:"Você ganha por dia",k:"tot",s:m=>m.profit*plots,t:"Ordenar pela prata que sobra por dia com todos os seus animais"},{h:"Produz por dia",k:"sale",s:m=>m.ip,t:"Ordenar pelo preço do produto"},{h:"Ração por dia",k:"cost",s:m=>m.food.n*m.food.p,first:-1,t:"Ordenar pelo custo da ração (primeiro clique: a mais barata)"},{h:"Lucro por animal por dia",k:"profit",s:m=>m.profit},vs];
    else cols=[{h:"Animal",k:"name",s:nm(m=>m.grown)},{h:"Você ganha",k:"tot",s:m=>fzP(m)*plots,t:"Ordenar pela prata que sobra ao vender os adultos, com todos os seus animais"},{h:"Filhote",k:"cost",s:m=>m.bp,first:-1,t:"Ordenar pelo preço do filhote (primeiro clique: o mais barato)"},{h:"Ração até crescer"},{h:"Adulto vende por",k:"sale",s:m=>m.gp},{h:"Filhote de volta"},{h:"Lucro por animal",k:"profit",s:fzP},{h:"Por dia",k:"day",s:m=>fzP(m)/m.days},{h:"Foco por alimentação"},{h:"Prata por foco",k:"spf",s:m=>m.spf},vs];
    lfHead(hr,key,cols,def,rer);
    let list=M[kind].filter(m=>keep(kind==="crop"||kind==="herb"?m.crop:m.grown));
    if(!FAVON){ const n=list.length; list=lfFilter(key,list,fzFil(kind)); nOut+=n-list.length; }
    list=lfSort(key,list,cols,def);
    if(kind==="crop"||kind==="herb"){
      for(const m of list){ const tr=body.insertRow(), p=focus?m.p1:m.p0; tr.dataset.fav=kind+"|"+m.crop;
        cell(tr,withIcon(m.crop,`${fzName(m.crop)} T${m.t}`)); gcell(tr,p*9*plots,`a cada 22 h, ${plots} ${plots>1?"lotes":"lote"} de 9`); cell(tr,withIcon(m.seed,m.sSrc==="tenho"?"já tem":`${fmt(m.sp)}${SRC_TAG[m.sSrc]||""}`),"num"); cell(tr,`${dec(m.yieldN)} × ${fmt(m.cp)}`,"num");
        cell(tr,`${Math.round((focus?m.back1:m.back0)*100)}%`,"num"); cell(tr,sgn(p),gl(p));
        cell(tr,focusInput(m.seed,m.fc),"num"); cell(tr,dec(m.spf),"num"); lfVolCell(tr,m.crop); }
      if(!FAVON) note.textContent=`Lote de 9 sementes, colhido a cada 22 horas. Colheita média de ${st.prem?"9 por semente (Premium dobra)":"4,5 por semente (sem Premium)"}, pela tabela do jogo, com a chance de 10% de minhoca. Regar gasta foco por semente e aumenta a chance de a semente voltar; ${focus?"a tabela já está com rega.":"marque a caixa para ver com rega."} Prata por foco é quanto cada ponto de foco devolve em sementes. Semente sem anúncio entra pelo preço do NPC. Lucro % é sobre o preço da semente.`;
    } else if(kind==="prod"){
      for(const m of list){ const tr=body.insertRow(); tr.dataset.fav=kind+"|"+m.grown; cell(tr,withIcon(m.grown,`${fzName(m.grown)} T${m.t}`)); gcell(tr,m.profit*plots,`por dia, ${plots} ${plots>1?"animais":"animal"}`); cell(tr,withIcon(m.item,`${dec(m.avg)} × ${fzName(m.item)} a ${fmt(m.ip)}`),"num"); cell(tr,withIcon(m.food.id,`${m.food.n} × ${fzName(m.food.id)} ${m.food.src==="tenho"?"(já tem)":"a "+fmt(m.food.p)+(SRC_TAG[m.food.src]||"")}`),"num"); cell(tr,sgn(m.profit),gl(m.profit)); lfVolCell(tr,m.item); }
      if(!FAVON) note.textContent="Animal adulto alimentado com a planta favorita (vale o dobro de nutrição), coletado uma vez por dia. Média de 9 produtos (7 a 11) pela tabela do jogo. O adulto não gasta foco. Lucro % é sobre o custo da ração; vendas por dia são do produto (leite, ovo, lã).";
    } else {
      for(const m of list){ const tr=body.insertRow(), p=focus?m.p1:m.p0; tr.dataset.fav=kind+"|"+m.grown;
        cell(tr,withIcon(m.grown,`${fzName(m.grown)} T${m.t}`)); gcell(tr,p*plots,`${plots} ${plots>1?"animais":"animal"} em ${dec(m.days)} dia${m.days>=2?"s":""}, ${sgn(p*plots/m.days)} por dia`); cell(tr,withIcon(m.baby,m.bSrc==="tenho"?"já tem":fmt(m.bp)+(SRC_TAG[m.bSrc]||"")),"num"); cell(tr,withIcon(m.food.id,`${m.food.n} × ${fzName(m.food.id)}${m.food.src==="tenho"?" (já tem)":m.food.src==="planto"?" (da ilha)":""}`),"num"); cell(tr,fmt(m.gp),"num");
        cell(tr,`${Math.round((focus?m.o1:m.o0)*100)}%`,"num"); cell(tr,sgn(p),gl(p)); cell(tr,`${sgn(p/m.days)} em ${dec(m.days)} dia${m.days>=2?"s":""}`,gl(p));
        const fcell=cell(tr,focusInput(m.baby,m.fc1),"num"); if(m.n>1) fcell.append(el("span",{class:"age",text:` × ${m.n} vezes`})); cell(tr,dec(m.spf),"num"); lfVolCell(tr,m.grown); }
      if(!FAVON) note.textContent=`Do filhote ao adulto, alimentado com a planta favorita ou a mais barata. ${st.prem?"Com Premium o crescimento leva metade do tempo.":"Sem Premium o crescimento leva o dobro do tempo."} Alimentar com foco gasta foco a cada vez (montarias aceitam várias vezes durante o crescimento) e aumenta a chance de vir um filhote novo ao pegar o adulto${focus?"; a tabela já está com foco":""}. Lucro vendendo o adulto no mercado; Lucro % é sobre filhote mais ração.`;
    }
    return cols.length;
  };
  if(!FAVON){ const nc=draw(fzKind,hr,()=>true); lfCount(bar,"fz:"+fzKind,fzFil(fzKind),nOut);
    const sum=$("fzSum"), shown=lfFilter("fz:"+fzKind,M[fzKind],fzFil(fzKind)), an=n=>`${n} ${n>1?"animais":"animal"}`, nada="Com os preços e as escolhas de agora, nada desta lista dá lucro.";
    if(fzKind==="crop"||fzKind==="herb") ganhoTop(sum,shown,m=>fzP(m)*9*plots,m=>`${fzName(m.crop)}: você ganha ${fmt(Math.round(fzP(m)*9*plots))} de prata a cada colheita (22 h) com ${plots} ${plots>1?"lotes":"lote"} de 9 sementes. Já descontadas as sementes${focus?" (com as que voltam ao regar)":" (com as que voltam)"} e as taxas de venda.`,nada);
    else if(fzKind==="prod") ganhoTop(sum,shown,m=>m.profit*plots,m=>`${fzName(m.grown)}: você ganha ${fmt(Math.round(m.profit*plots))} de prata por dia com ${an(plots)}, vendendo ${fzName(m.item)}. Já descontadas a ração e as taxas de venda.`,nada);
    else ganhoTop(sum,shown,m=>fzP(m)*plots,m=>`${fzName(m.grown)}: você ganha ${fmt(Math.round(fzP(m)*plots))} de prata com ${an(plots)}, vendendo os adultos depois de ${dec(m.days)} dia${m.days>=2?"s":""} (${fmt(Math.round(fzP(m)*plots/m.days))} por dia). Já descontados filhotes, ração e taxas de venda.`,nada);
    if(!body.rows.length){ const td=body.insertRow().insertCell(); td.colSpan=nc; td.className="muted"; td.textContent="Nada passa pelos filtros. Afrouxe um deles ou clique em Limpar filtros."; } }
  else { const sum=$("fzSum"); if(sum) sum.hidden=true; tb.deleteTHead(); const NM={crop:"Plantações",herb:"Ervas",prod:"Leite e ovos",raise:"Criação"}; let nF=0;
    for(const k of ["crop","herb","prod","raise"]){ const fav=new Set(FAV.list("fazenda").map(f=>f.k).filter(x=>x.startsWith(k+"|")).map(x=>x.slice(k.length+1))); if(!fav.size) continue;
      const sec=body.insertRow(); sec.className="fzsec"; const sc=sec.insertCell(); sc.colSpan=11; sc.textContent=NM[k];
      const h=body.insertRow(); h.className="fzh"; const before=body.rows.length; draw(k,h,id=>fav.has(id)); nF+=body.rows.length-before;
      if(body.rows.length===before){ h.remove(); sec.remove(); } }
    note.textContent=nF?"Só os seus favoritos, de todas as listas da fazenda (os filtros de lista não valem aqui, mas dá para ordenar clicando no cabeçalho). Preços e Premium valem como no resto do site.":"Nenhum favorito na fazenda ainda: marque a estrela de uma linha."; }
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.02,clearProps:"opacity,transform"});
}
document.querySelectorAll("[data-fz]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-fz]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); fzKind=b.dataset.fz; renderFZ(); }));
$("fzFocus").addEventListener("change",renderFZ);
document.querySelectorAll("[data-src]").forEach(b=>{ const [cls,v]=b.dataset.src.split(":"); b.setAttribute("aria-pressed",String((SRC[cls]||"inst")===v));
  b.addEventListener("click",()=>{ SRC[cls]=v; srcSave(); document.querySelectorAll(`[data-src^="${cls}:"]`).forEach(x=>x.setAttribute("aria-pressed",String(x===b))); if(cls==="ck") renderCook(); else if(FARM&&FZ_LOADED) renderFZ(); }); });
$("fzPlots").addEventListener("input",()=>{ if(FARM&&FZ_LOADED) renderFZ(); });
