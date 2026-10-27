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
async function ensureEnch(g,only=0){
  if(enLoaded(g,only)) return true;
  const ok=await ensureBM(g,only); if(!ok) return false;
  const tiers=only?[only]:[4,5,6,7,8];
  const ids=[]; for(const k of bmKeys(g)) for(const t of tiers) for(let e=0;e<=4;e++) ids.push(bmId(k,t,e));
  const mats=[]; for(const t of tiers) for(const e of [1,2,3]) mats.push(`T${t}_${EN_MAT[e][0]}`);
  try{ await bmFetch(ids,SHOP_LOCS); await fetchIds(mats,DATA.itens,SHOP_LOCS); EN_LOADED.add(only?`${g}#${only}`:g); return true; }catch(e){ return false; }
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
  { const og=el("optgroup",{label:"Todos"}); og.append(el("option",{value:"*",text:"Todas as mercadorias (escolha um tier)"})); sel.append(og); }
  for(const og of src.children) sel.append(og.cloneNode(true)); sel.value=store.get("enGroup")||src.value; if(!sel.value) sel.value=src.value;
  const ts=$("enTier"); ["Todos",4,5,6,7,8].forEach((t,i)=>ts.append(el("button",{type:"button","data-t":String(i?t:0),"aria-pressed":String((i?t:0)===enTierSel),text:i?`T${t}`:t})));
  ts.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ts.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); enTierSel=+b.dataset.t; renderEN(); });
  sel.addEventListener("change",()=>{ store.set("enGroup",sel.value); renderEN(); });
}
async function renderEN(){
  const note=$("enNote"), tb=$("enTable");
  if(!BM||!GEAR){ note.textContent="Abrindo os dados das peças…"; try{ [BM,GEAR]=await Promise.all([BM||need("bm"),GEAR||need("gear")]); }catch(e){ note.textContent="Não consegui abrir os dados das peças."; return; } }
  setupEN(); const FAVON=!!(window.FAV&&FAV.on("encantar")); const g=$("enGroup").value, t=FAVON?0:enTierSel;
  const favG=FAVON?[...new Set(FAV.list("encantar").map(f=>f.c&&f.c.g).filter(Boolean))]:[];
  if(FAVON){ for(const gg of favG){ if(!EN_LOADED.has(gg)){ tb.textContent=""; note.textContent="Consultando os favoritos…"; const ok=await ensureEnch(gg); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } } } }
  else if(g==="*"&&!t){ tb.textContent=""; note.textContent="Para comparar todas as mercadorias, escolha um tier (T4 a T8) acima. Sem tier seriam milhares de peças para consultar."; return; }
  else if(!enLoaded(g,t)){ tb.textContent=""; note.textContent="Consultando peças, runas, almas e relíquias…"; const ok=await ensureEnch(g,t); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } if($("enGroup").value!==g) return; }
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
  const FAVON=!!(window.FAV&&FAV.on("fazenda"));
  tb.textContent=""; const hr=tb.createTHead().insertRow(); const body=tb.createTBody();
  const cell=(tr,v,cls)=>{ const c=tr.insertCell(); if(cls) c.className=cls; if(v instanceof Node) c.append(v); else c.textContent=v; return c; };
  const gl=v=>"num "+(v>=0?"gain":"loss");
  const draw=(kind,hr,keep)=>{
  if(kind==="crop"||kind==="herb"){
    ["Planta","Semente","Colheita","Sementes de volta","Lucro por semente",`Por dia em ${plots} lote${plots>1?"s":""}`,"Foco por semente","Prata por foco"].forEach(h=>hr.append(el("th",{text:h})));
    const list=FARM.p.filter(r=>(kind==="herb")===HERBS.test(r[0])).map(plantModel).filter(Boolean).filter(m=>keep(m.crop)).sort((a,b)=>(focus?b.p1-a.p1:b.p0-a.p0));
    for(const m of list){ const tr=body.insertRow(), p=focus?m.p1:m.p0; tr.dataset.fav=kind+"|"+m.crop;
      cell(tr,withIcon(m.crop,`${fzName(m.crop)} T${m.t}`)); cell(tr,withIcon(m.seed,`${fmt(m.sp)}${m.seedMkt?"":" (NPC)"}`),"num"); cell(tr,`${dec(m.yieldN)} × ${fmt(m.cp)}`,"num");
      cell(tr,`${Math.round((focus?m.back1:m.back0)*100)}%`,"num"); cell(tr,sgn(p),gl(p)); cell(tr,sgn(p*9*plots),gl(p));
      cell(tr,focusInput(m.seed,m.fc),"num"); cell(tr,dec(m.spf),"num"); }
    note.textContent=`Lote de 9 sementes, colhido a cada 22 horas. Colheita média de ${st.prem?"9 por semente (Premium dobra)":"4,5 por semente (sem Premium)"}, pela tabela do jogo, com a chance de 10% de minhoca. Regar gasta foco por semente e aumenta a chance de a semente voltar; ${focus?"a tabela já está com rega.":"marque a caixa para ver com rega."} Prata por foco é quanto cada ponto de foco devolve em sementes. Semente sem anúncio entra pelo preço do NPC.`;
  } else if(kind==="prod"){
    ["Animal","Produz por dia","Ração por dia","Lucro por animal por dia",`Com ${plots} ${plots>1?"animais":"animal"}`].forEach(h=>hr.append(el("th",{text:h})));
    const list=FARM.pr.map(producerModel).filter(Boolean).filter(m=>keep(m.grown)).sort((a,b)=>b.profit-a.profit);
    for(const m of list){ const tr=body.insertRow(); tr.dataset.fav=kind+"|"+m.grown; cell(tr,withIcon(m.grown,`${fzName(m.grown)} T${m.t}`)); cell(tr,withIcon(m.item,`${dec(m.avg)} × ${fzName(m.item)} a ${fmt(m.ip)}`),"num"); cell(tr,withIcon(m.food.id,`${m.food.n} × ${fzName(m.food.id)} a ${fmt(m.food.p)}`),"num"); cell(tr,sgn(m.profit),gl(m.profit)); cell(tr,sgn(m.profit*plots),gl(m.profit)); }
    note.textContent="Animal adulto alimentado com a planta favorita (vale o dobro de nutrição), coletado uma vez por dia. Média de 9 produtos (7 a 11) pela tabela do jogo. O adulto não gasta foco.";
  } else {
    ["Animal","Filhote","Ração até crescer","Adulto vende por","Filhote de volta","Lucro por animal","Por dia","Foco por alimentação","Prata por foco"].forEach(h=>hr.append(el("th",{text:h})));
    const list=FARM.b.map(animalRaise).filter(Boolean).filter(m=>keep(m.grown)).sort((a,b)=>(focus?b.p1/b.days-a.p1/a.days:b.p0/b.days-a.p0/a.days));
    for(const m of list){ const tr=body.insertRow(), p=focus?m.p1:m.p0; tr.dataset.fav=kind+"|"+m.grown;
      cell(tr,withIcon(m.grown,`${fzName(m.grown)} T${m.t}`)); cell(tr,withIcon(m.baby,fmt(m.bp)),"num"); cell(tr,withIcon(m.food.id,`${m.food.n} × ${fzName(m.food.id)}`),"num"); cell(tr,fmt(m.gp),"num");
      cell(tr,`${Math.round((focus?m.o1:m.o0)*100)}%`,"num"); cell(tr,sgn(p),gl(p)); cell(tr,`${sgn(p/m.days)} em ${dec(m.days)} dia${m.days>=2?"s":""}`,gl(p));
      const fcell=cell(tr,focusInput(m.baby,m.fc1),"num"); if(m.n>1) fcell.append(el("span",{class:"age",text:` × ${m.n} vezes`})); cell(tr,dec(m.spf),"num"); }
    note.textContent=`Do filhote ao adulto, alimentado com a planta favorita ou a mais barata. ${st.prem?"Com Premium o crescimento leva metade do tempo.":"Sem Premium o crescimento leva o dobro do tempo."} Alimentar com foco gasta foco a cada vez (montarias aceitam várias vezes durante o crescimento) e aumenta a chance de vir um filhote novo ao pegar o adulto${focus?"; a tabela já está com foco":""}. Lucro vendendo o adulto no mercado.`;
  }
  };
  if(!FAVON) draw(fzKind,hr,()=>true);
  else { tb.deleteTHead(); const NM={crop:"Plantações",herb:"Ervas",prod:"Leite e ovos",raise:"Criação"}; let nF=0;
    for(const k of ["crop","herb","prod","raise"]){ const fav=new Set(FAV.list("fazenda").map(f=>f.k).filter(x=>x.startsWith(k+"|")).map(x=>x.slice(k.length+1))); if(!fav.size) continue;
      const sec=body.insertRow(); sec.className="fzsec"; const sc=sec.insertCell(); sc.colSpan=9; sc.textContent=NM[k];
      const h=body.insertRow(); h.className="fzh"; const before=body.rows.length; draw(k,h,id=>fav.has(id)); nF+=body.rows.length-before;
      if(body.rows.length===before){ h.remove(); sec.remove(); } }
    note.textContent=nF?"Só os seus favoritos, de todas as listas da fazenda (os filtros de lista não valem aqui). Preços e Premium valem como no resto do site.":"Nenhum favorito na fazenda ainda: marque a estrela de uma linha."; }
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.02,clearProps:"opacity,transform"});
}
document.querySelectorAll("[data-fz]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-fz]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); fzKind=b.dataset.fz; renderFZ(); }));
$("fzFocus").addEventListener("change",renderFZ);
$("fzPlots").addEventListener("input",()=>{ if(FARM&&FZ_LOADED) renderFZ(); });
