/* ================= oficina: receitas, custo, venda e lucro de cada item ================= */
const REF5 = [
  {raw:"ORE",ref:"METALBAR",city:"Thetford",rawPT:"Minério",refPT:"Barra de metal"},
  {raw:"FIBER",ref:"CLOTH",city:"Lymhurst",rawPT:"Fibra",refPT:"Tecido"},
  {raw:"HIDE",ref:"LEATHER",city:"Martlock",rawPT:"Pelego",refPT:"Couro"},
  {raw:"WOOD",ref:"PLANKS",city:"Fort Sterling",rawPT:"Madeira",refPT:"Tábua"},
  {raw:"ROCK",ref:"STONEBLOCK",city:"Bridgewatch",rawPT:"Pedra",refPT:"Bloco de pedra"}];
const MAT_PT = {METALBAR:"Barra de metal",PLANKS:"Tábua",LEATHER:"Couro",CLOTH:"Tecido"};
const OF = {cat:null, tier:0, ench:-1, q:"", rr:"auto", buy:"inst", sell:"ordem", city:"", loaded:new Set(), vol:{}};
function ofCats(){
  const c=[]; const mine=new Set(LINES.filter(([k])=>wl(k)>=2).map(([k])=>k));
  for(const [k,n] of LINES) c.push({k:"g:"+k,label:`Armas: ${n}`,grp:mine.has(k)?"Suas armas":"Outras armas"});
  c.push({k:"g:a_placa",label:"Armaduras de placa",grp:"Armaduras"},{k:"g:a_couro",label:"Armaduras de couro",grp:"Armaduras"},{k:"g:a_pano",label:"Armaduras de pano",grp:"Armaduras"},{k:"g:mao",label:"Mão secundária",grp:"Armaduras"});
  c.push({k:"meal",label:"Comidas",grp:"Consumíveis"},{k:"potion",label:"Poções",grp:"Consumíveis"},{k:"refine",label:"Refino (barras, tecido, couro, tábua, pedra)",grp:"Refino"});
  return c;
}
const idLv = (t,base,e) => `T${t}_${base}`+(e?`_LEVEL${e}`:"");
const apiLv = (t,base,e) => `T${t}_${base}`+(e?`_LEVEL${e}@${e}`:"");
function ofItems(cat){
  const out=[];
  if(cat.startsWith("g:")){ const g=cat.slice(2);
    for(const k of bmKeys(g)){ const r=BM[k]; for(let t=4;t<=8;t++) for(let e=0;e<=3;e++){
      const ing=[]; for(const [,c,n] of r[3].matchAll(/([MPLC])(\d+)/g)) ing.push({id:idLv(t,BM_RES[c],e),n:+n,nm:`${MAT_PT[BM_RES[c]]} T${t}.${e}`});
      if(r[4]) ing.push({id:`T${t}_${r[4][0]}`,n:r[4][1],nm:r[4][0].startsWith("ALCHEMY")?"Ingrediente raro":"Artefato",art:true});
      const cnt=ing.filter(x=>!x.art).reduce((a,x)=>a+x.n,0);
      out.push({id:bmId(k,t,e),key:k,name:nmKey(k,r[0]),t,e,q:1,ing,city:r[2],bonus:0.15,fee:cnt*IV(t,e)*0.1125,focus:r[5]*FOCUS_CRAFT[t-4][e]/429,fce:bmFCE(k)}); } }
  } else if(cat==="meal"||cat==="potion"){ const kind=cat==="meal"?"f":"p";
    for(const id in COOK.r){ const r=COOK.r[id]; if(r[1]!==kind||!r[3]) continue; const [name,,q,fo,nut,ing]=r;
      out.push({id,key:id,name,t:+id[1],e:0,q,ing:ing.map(([iid,n])=>({id:iid,n,nm:COOK.n[iid]||iid})),city:COOK_CITY[kind],bonus:0.15,fee:q*nut*0.1125,focus:fo,fce:cookFCE(kind,id)}); }
  } else if(cat==="refine"){
    for(const R of REF5) for(let t=4;t<=8;t++) for(let e=0;e<=3;e++){
      const prev=t===4?`T3_${R.ref}`:idLv(t-1,R.ref,e);
      out.push({id:idLv(t,R.ref,e),key:R.ref,name:`${R.refPT}`,t,e,q:1,ing:[{id:idLv(t,R.raw,e),n:N[t],nm:`${R.rawPT} T${t}.${e}`},{id:prev,n:1,nm:`${R.refPT} ${t===4?"T3":`T${t-1}.${e}`}`}],city:R.city,bonus:0.40,fee:IV(t,e)*0.1125,focus:FOCUS_REF[t-4][e],fce:({METALBAR:'metal',CLOTH:'cloth',LEATHER:'leather'}[R.ref]?refFCEt({METALBAR:'metal',CLOTH:'cloth',LEATHER:'leather'}[R.ref],t):0)}); }
  }
  return out;
}
async function ensureOf(cat){
  if(OF.loaded.has(cat)) return true;
  try{
    if(cat.startsWith("g:")){ const g=cat.slice(2); const ids=[], extra=new Set(), mats=new Set();
      for(const k of bmKeys(g)) for(let t=4;t<=8;t++){ for(let e=0;e<=3;e++){ ids.push(bmId(k,t,e)); for(const [,c] of BM[k][3].matchAll(/([MPLC])(\d+)/g)) mats.add(apiLv(t,BM_RES[c],e)); } if(BM[k][4]) extra.add(`T${t}_${BM[k][4][0]}`); }
      await fetchIds(ids,DATA.itens,SHOP_LOCS); await fetchIds([...mats,...extra],DATA.itens,SHOP_LOCS);
    } else if(cat==="meal"||cat==="potion"){ const ok=await ensureCook(); if(!ok) return false; }
    else { const ids=new Set(); for(const R of REF5){ ids.add(`T3_${R.ref}`); for(let t=4;t<=8;t++) for(let e=0;e<=3;e++){ ids.add(apiLv(t,R.raw,e)); ids.add(apiLv(t,R.ref,e)); } } await fetchIds([...ids],DATA.itens,SHOP_LOCS); }
    OF.loaded.add(cat); return true;
  }catch(e){ return false; }
}
function pickBuy(id){ const field=OF.buy==="inst"?0:1, want="min"; return bestCity(id,field,want,OF.city||null); }
function pickSell(id){ const field=OF.sell==="ordem"?0:1; return bestCity(id,field,"max",OF.city||null); }
function ofRR(it){ const fb=it.bonus===0.40?0.40:0.15;
  if(OF.rr==="none") return rrr(0,false,st.daily); if(OF.rr==="focus") return rrr(fb,true,st.daily); return rrr(fb,false,st.daily); }
function ofModel(it){
  const sale=pickSell(it.id); if(!sale) return null;
  let cost=0, miss=0, rr=ofRR(it); const parts=[];
  for(const g of it.ing){ const b=pickBuy(g.id); if(!b){ miss++; parts.push({...g,b:null}); continue; } const c=g.n*b.p*(OF.buy==="ordem"?1.025:1); cost+=g.art?c:c*(1-rr); parts.push({...g,b}); }
  if(miss) return {it,sale,parts,miss};
  const fee=it.fee*feeVal()/100; cost+=fee;
  const tax=(st.prem?0.04:0.08)+(OF.sell==="ordem"?0.025:0), net=it.q*sale.p*(1-tax), profit=net-cost;
  const fc=Math.max(1,Math.round(it.focus*Math.pow(0.5,(it.fce||0)/10000)));
  return {it,sale,parts,cost,net,profit,pct:cost>0?profit/cost:0,rr,fee,fc};
}
function setupOf(){
  const sel=$("ofCat"); if(sel.options.length) return;
  const groups={}; for(const c of ofCats()){ (groups[c.grp]||(groups[c.grp]=el("optgroup",{label:c.grp}))).append(el("option",{value:c.k,text:c.label})); }
  ["Suas armas","Armaduras","Consumíveis","Refino","Outras armas"].forEach(g=>{ if(groups[g]) sel.append(groups[g]); });
  sel.value=store.get("ofCat")||sel.options[0].value;
  const tb=$("ofTier"); ["Todos",1,2,3,4,5,6,7,8].forEach((t,i)=>tb.append(el("button",{type:"button","data-t":String(i?t:0),"aria-pressed":String(i===0),text:i?`T${t}`:t})));
  const eb=$("ofEnch"); ["Todos",0,1,2,3].forEach((e,i)=>eb.append(el("button",{type:"button","data-e":String(i?e:-1),"aria-pressed":String(i===0),text:i?`.${e}`:e})));
  const seg=(box,attr,key)=>box.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; box.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); OF[key]=attr==="t"||attr==="e"?+b.dataset[attr]:b.dataset[attr]; renderOf(); });
  seg(tb,"t","tier"); seg(eb,"e","ench"); seg($("ofRR"),"rr","rr"); seg($("ofBuy"),"buy","buy"); seg($("ofSell"),"sell","sell");
  const cs=$("ofCity"); cs.append(el("option",{value:"",text:"Automático (melhor cidade)"})); SHOP_LOCS.forEach(c=>cs.append(el("option",{value:c,text:c})));
  cs.addEventListener("change",()=>{ OF.city=cs.value; renderOf(); });
  sel.addEventListener("change",()=>{ store.set("ofCat",sel.value); renderOf(); });
  $("ofFind").addEventListener("input",()=>{ OF.q=$("ofFind").value.trim().toLowerCase(); renderOf(); });
}
function chip(g){
  const d=el("span",{class:"chip",title:`${g.nm}${g.b?`: ${fmt(g.b.p)} em ${g.b.c}`:": sem preço"}`});
  d.append(iconImg(g.id.replace(/_LEVEL(\d)$/,"_LEVEL$1@$1"),28),el("span",{class:"q",text:`${g.n}×`}));
  const t=el("span",{class:"cp"}); if(g.b){ t.append(el("b",{text:fmtS(g.b.p)}),el("small",{text:g.b.c}),ageSpan(g.b.t)||""); } else t.append(el("small",{class:"loss",text:"sem preço"}));
  d.append(t); return d;
}
async function renderOf(){
  const note=$("ofNote"), tb=$("ofTable");
  if(!BM){ try{ BM=await need("bm"); }catch(e){ note.textContent="Não consegui abrir as receitas."; return; } }
  setupOf(); const cat=$("ofCat").value;
  if(!OF.loaded.has(cat)){ tb.textContent=""; note.textContent="Consultando receitas e preços…"; const ok=await ensureOf(cat); if(!ok){ note.textContent="Não consegui consultar os preços agora."; return; } if($("ofCat").value!==cat) return; }
  let items=ofItems(cat).filter(it=>(!OF.tier||it.t===OF.tier)&&(OF.ench<0||it.e===OF.ench)&&(!OF.q||it.name.toLowerCase().includes(OF.q)));
  const rows=items.map(ofModel).filter(Boolean), ok=rows.filter(m=>!m.miss).sort((a,b)=>b.profit-a.profit), shown=ok.slice(0,60);
  tb.textContent=""; const hr=tb.createTHead().insertRow(); ["Item e receita","Custo","Venda","Lucro","Lucro %","Onde vender","Vendas/dia"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody();
  for(const m of shown){ const tr=body.insertRow(); tr.dataset.id=m.it.id; tr.dataset.city=m.sale.c;
    const c0=tr.insertCell(); c0.className="itemcell"; const head=el("div",{class:"ihead"}); head.append(iconImg(m.it.id,40)); const nmb=el("span",{class:"inm"}); nmb.append(el("strong",{text:m.it.name}),el("small",{text:`T${m.it.t}.${m.it.e}${m.it.q>1?` · fornada de ${m.it.q}`:""} · faz em ${m.it.city}`})); head.append(nmb); const rc=el("div",{class:"recipe"}); m.parts.forEach(g=>rc.append(chip(g))); c0.append(head,rc);
    const c1=tr.insertCell(); c1.className="num loss"; c1.textContent=fmt(m.cost);
    const c2=tr.insertCell(); c2.className="num"; c2.textContent=fmt(m.net);
    const c3=tr.insertCell(); c3.className="num "+(m.profit>=0?"gain":"loss"); c3.textContent=sgn(m.profit);
    const c4=tr.insertCell(); c4.className="num "+(m.profit>=0?"gain":"loss"); c4.textContent=`${m.pct>=0?"+":""}${dec(m.pct*100)}%`;
    const c5=tr.insertCell(); c5.className="small"; c5.append(el("b",{text:m.sale.c}),el("br"),`${fmt(m.sale.p)} cada `,ageSpan(m.sale.t)||"");
    const c6=tr.insertCell(); c6.className="num vol"; c6.textContent="…";
    tr.classList.add("clickrow"); tr.addEventListener("click",ev=>{ if(ev.target.closest(".chip")){ const id=ev.target.closest(".chip").querySelector("img").src.match(/item\/([^.]+)\.png/); if(id) openItem(decodeURIComponent(id[1])); return; } openItem(m.it.id); }); }
  const pos=ok.filter(m=>m.profit>0).length, faltam=rows.length-ok.length;
  note.textContent=ok.length?`${ok.length} itens com preço; ${pos} dão lucro. Retorno de recursos usado: ${dec((ok[0]||{rr:0}).rr*100)}%${OF.rr==="auto"?" (cidade com bônus, sem foco)":""}.${ok.length>60?" Mostrando os 60 primeiros.":""}${faltam?` ${faltam} sem preço de algum ingrediente.`:""} Clique num item ou ingrediente para ver os preços por cidade.`:"Nenhum item com preço suficiente nesse filtro.";
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.22,stagger:.012,clearProps:"opacity,transform"});
  fillVolumes(shown);
}
async function fillVolumes(shown){
  const need_=shown.filter(m=>OF.vol[m.it.id+"|"+m.sale.c]==null);
  for(let i=0;i<need_.length;i+=25){ const part=need_.slice(i,i+25), ids=[...new Set(part.map(m=>m.it.id))], locs=[...new Set(part.map(m=>m.sale.c))];
    try{ const j=await apiJSON(`${HOST}/api/v2/stats/history/${ids.join(",")}.json?locations=${locs.join(",").replace(/ /g,"%20")}&time-scale=24`,360);
      for(const m of part){ OF.vol[m.it.id+"|"+m.sale.c]=0; }
      const since=Date.now()-7*86400e3;
      for(const x of j){ const k=x.item_id+"|"+x.location; let sum=0; for(const d of (x.data||[])) if(Date.parse(d.timestamp+"Z")>=since) sum+=d.item_count; if(k in OF.vol) OF.vol[k]+=sum/7; }
    }catch(e){ for(const m of part) OF.vol[m.it.id+"|"+m.sale.c]=-1; } }
  document.querySelectorAll("#ofTable tbody tr").forEach(tr=>{ const v=OF.vol[tr.dataset.id+"|"+tr.dataset.city]; const c=tr.querySelector(".vol"); if(!c) return; c.textContent=v==null?"…":v<0?"—":v<1?"menos de 1":v<10?dec(v):fmt(v); c.classList.toggle("loss",v>=0&&v<3); c.title="Média de vendas por dia nos últimos 7 dias na cidade de venda, somando todas as qualidades"; });
}

/* ================= mercado: todos os itens do jogo ================= */
let CATALOG = null;                 // data/catalog.json: c: categorias, i: [id, categoria, subcategoria, tier, encantável, nome PT, nome EN]
const MK = {cat:"crafting", sub:"resources", tier:0, ench:0, q:"", only:true};
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
  for(const c of order) if(CATALOG.c[c]) sel.append(el("option",{value:c,text:CATALOG.c[c]}));
  sel.value=store.get("mkCat2")||"crafting"; MK.cat=sel.value; if(MK.cat!=="crafting") MK.sub="";
  const tb=$("mkTier"); ["Todos",1,2,3,4,5,6,7,8].forEach((t,i)=>tb.append(el("button",{type:"button","data-t":String(i?t:0),"aria-pressed":String(i===0),text:i?`T${t}`:t})));
  const eb=$("mkEnch"); ["Todos",0,1,2,3,4].forEach((e,i)=>eb.append(el("button",{type:"button","data-e":String(i?e:-1),"aria-pressed":String(i===1),text:i?`.${e}`:e})));
  const seg=(box,attr,key)=>box.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; box.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); MK[key]=+b.dataset[attr]; renderMk(); });
  seg(tb,"t","tier"); seg(eb,"e","ench");
  sel.addEventListener("change",()=>{ MK.cat=sel.value; MK.sub=""; store.set("mkCat2",sel.value); fillSubs(); renderMk(); });
  $("mkSub").addEventListener("change",()=>{ MK.sub=$("mkSub").value; renderMk(); });
  let tmr=null; $("mkFind").addEventListener("input",()=>{ clearTimeout(tmr); tmr=setTimeout(()=>{ MK.q=$("mkFind").value.trim().toLowerCase(); renderMk(); },250); });
  $("mkOnly").addEventListener("change",()=>{ MK.only=$("mkOnly").checked; renderMk(); });
  fillSubs();
}
function fillSubs(){ const ss=$("mkSub"); ss.textContent=""; ss.append(el("option",{value:"",text:"Todas"}));
  const subs=[...new Set(CATALOG.i.filter(r=>r[1]===MK.cat).map(r=>r[2]))].sort((a,b)=>subName(a).localeCompare(subName(b),"pt-BR")); subs.forEach(s=>ss.append(el("option",{value:s,text:subName(s)}))); ss.value=MK.sub; }
function extremes(id){ const r=DATA.itens[mkKey(id)]||{}; const out={smax:null,smin:null,bmax:null,bmin:null};
  for(const [c,v] of Object.entries(r)){ if(v[0]>0){ if(!out.smax||v[0]>out.smax.p) out.smax={p:v[0],c,t:v[2]}; if(!out.smin||v[0]<out.smin.p) out.smin={p:v[0],c,t:v[2]}; }
    if(v[1]>0){ if(!out.bmax||v[1]>out.bmax.p) out.bmax={p:v[1],c,t:v[3]}; if(!out.bmin||v[1]<out.bmin.p) out.bmin={p:v[1],c,t:v[3]}; } } return out; }
const MK_SEEN = new Set();
async function renderMk(){
  const note=$("mkNote"), tb=$("mkTable");
  if(!CATALOG){ note.textContent="Abrindo o catálogo de itens do jogo…"; try{ CATALOG=await need("catalog"); }catch(e){ note.textContent="Não consegui abrir o catálogo."; return; } }
  setupMk();
  const q=MK.q, search=q.length>=2;
  let base=CATALOG.i.filter(r=> search ? ((r[5]||"").toLowerCase().includes(q)||(r[6]||"").toLowerCase().includes(q)||r[0].toLowerCase().includes(q)) : (r[1]===MK.cat&&(!MK.sub||r[2]===MK.sub)));
  base=base.filter(r=>!MK.tier||r[3]===MK.tier);
  if(search){ const rank={weapons:0,armors:1,head:1,shoes:1,offhands:2,capes:2,crafting:3,consumables:3,farming:4,mounts:4,bags:4,gathering:5,artefacts:6,other:7,furniture:8,vanity:9};
    const nm_=r=>(mkName(r)||"").toLowerCase(); base.sort((a,b)=>((nm_(b).startsWith(q))-(nm_(a).startsWith(q)))||((rank[a[1]]??9)-(rank[b[1]]??9))||(a[3]-b[3])); }
  else base.sort((a,b)=>subName(a[2]).localeCompare(subName(b[2]),"pt-BR")||mkName(a).localeCompare(mkName(b),"pt-BR")||(a[3]-b[3]));
  const list=[]; for(const r of base){ const es = MK.ench<0 ? (r[4]||isLevelRes(r)?[0,1,2,3]:[0]) : (MK.ench===0||r[4]||isLevelRes(r)?[MK.ench]:[]); for(const e of es) list.push({r,e,id:mkId(r,e)}); }
  const total=list.length, slice=list.slice(0,180);
  const want=slice.map(x=>x.id).filter(id=>!MK_SEEN.has(id));
  if(want.length){ note.textContent=`Consultando ${want.length} itens em todas as cidades…`; tb.textContent="";
    try{ await fetchIds(want,DATA.itens,SHOP_LOCS); want.forEach(id=>MK_SEEN.add(id)); }catch(e){ note.textContent="Não consegui consultar os preços agora."; return; } }
  const rows=slice.map(x=>({...x,x:extremes(x.id)})).filter(x=>!MK.only||x.x.smin||x.x.bmax);
  tb.textContent=""; const hr=tb.createTHead().insertRow(); ["Item","Maior venda","Menor venda","Maior compra","Menor compra","Diferença"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody();
  const cellP=(tr,o,cls)=>{ const c=tr.insertCell(); c.className="mkp "+(cls||""); if(!o){ c.textContent="—"; return; } c.append(el("b",{class:"city",text:o.c}),el("span",{class:"num",text:fmt(o.p)}),ageSpan(o.t)||""); };
  for(const x of rows){ const tr=body.insertRow(); tr.className="clickrow"; const nm_=mkName(x.r);
    const c0=tr.insertCell(); c0.className="itemcell"; const hd=el("div",{class:"ihead"}); hd.append(iconImg(x.id,36)); const nb=el("span",{class:"inm"}); nb.append(el("strong",{text:nm_}),el("small",{text:`${x.r[3]?`T${x.r[3]}.${x.e}`:"sem tier"}, ${CATALOG.c[x.r[1]]||""}${x.r[2]&&subName(x.r[2])!==CATALOG.c[x.r[1]]?`: ${subName(x.r[2])}`:""}`})); hd.append(nb); c0.append(hd);
    cellP(tr,x.x.smax); cellP(tr,x.x.smin,"gain"); cellP(tr,x.x.bmax,"gain"); cellP(tr,x.x.bmin);
    const d=tr.insertCell(); d.className="num"; d.textContent=x.x.smax&&x.x.smin?fmt(x.x.smax.p-x.x.smin.p):"—"; d.title="Maior venda menos menor venda: o espaço para comprar numa cidade e vender em outra";
    tr.addEventListener("click",()=>openItem(x.id,`${nm_} ${x.r[3]?`T${x.r[3]}.${x.e}`:""}`)); }
  note.textContent = !total ? "Nenhum item com esse filtro." : `${total} ${total>1?"itens":"item"}${search?` com "${q}"`:` em ${CATALOG.c[MK.cat]}${MK.sub?` · ${subName(MK.sub)}`:""}`}${total>180?"; mostrando os 180 primeiros, use tier, encantamento ou a busca para filtrar":""}. ${rows.length<slice.length?`${slice.length-rows.length} sem anúncio nos últimos 3 dias ficaram de fora. `:""}Clique num item para ver todas as cidades e o histórico.`;
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.2,stagger:.006,clearProps:"opacity,transform"});
}

/* quadro de detalhe de um item */
const CITY_COLOR = {"Thetford":"#a46ad8","Fort Sterling":"#e9e4d8","Martlock":"#4aa3df","Bridgewatch":"#e8963f","Lymhurst":"#6cc06a","Caerleon":"#d0463f","Brecilien":"#3ec3b0","Black Market":"#8d8d99"};
async function openItem(apiId,name){
  const dlg=$("itemDlg"); const key=apiId.includes("_LEVEL")?apiId.split("@")[0]:apiId;
  $("dlgTitle").textContent=name||nmKey(apiId.replace(/^T\d_/,"").replace(/@\d$/,""),apiId); iconSrc($("dlgIcon"),apiId,()=>{}); $("dlgSub").textContent=apiId;
  const box=$("dlgCities"); box.textContent="Consultando…"; $("dlgChart").textContent=""; $("dlgNote").textContent="";
  if(dlg.showModal&&!dlg.open) dlg.showModal(); else dlg.setAttribute("open","");
  const locs=[...SHOP_LOCS,"Black Market"];
  const tgt={}; try{ await fetchIds([apiId],tgt,locs); }catch(e){}
  const r=tgt[key]||{}; box.textContent="";
  const t=el("table",{class:"ledger dlgt"}); const h=t.createTHead().insertRow(); ["Cidade","Menor venda","Atualizado","Maior compra","Atualizado"].forEach(x=>h.append(el("th",{text:x})));
  const b=t.createTBody(); const rows=Object.entries(r).sort((a,b_)=>((a[1][0]||1e15)-(b_[1][0]||1e15)));
  for(const [c,v] of rows){ const tr=b.insertRow(); const cc=tr.insertCell(); cc.append(el("span",{class:"dot",style:`background:${CITY_COLOR[c]||"#999"}`}),c);
    const a=tr.insertCell(); a.className="num"; a.textContent=v[0]?fmt(v[0]):"—"; tr.insertCell().append(ageSpan(v[2])||"—");
    const d=tr.insertCell(); d.className="num"; d.textContent=v[1]?fmt(v[1]):"—"; tr.insertCell().append(ageSpan(v[3])||"—"); }
  if(!rows.length) box.textContent="Nenhum anúncio recente desse item."; else box.append(t);
  try{ const j=await apiJSON(`${HOST}/api/v2/stats/history/${apiId}.json?locations=${locs.join(",").replace(/ /g,"%20")}&time-scale=24`,360); drawStack($("dlgChart"),j); }catch(e){ $("dlgNote").textContent="Sem histórico agora."; }
}
function drawStack(svg,series){
  const ns="http://www.w3.org/2000/svg", mk=(t,a)=>{ const e=document.createElementNS(ns,t); for(const k in a) e.setAttribute(k,a[k]); return e; };
  const days={}; for(const s of series) for(const d of (s.data||[]).slice(-30)){ const k=d.timestamp.slice(0,10); (days[k]||(days[k]={}))[s.location]=(days[k][s.location]||0)+d.item_count; }
  const keys=Object.keys(days).sort().slice(-30); if(keys.length<2){ $("dlgNote").textContent="Pouco histórico para esse item."; return; }
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
