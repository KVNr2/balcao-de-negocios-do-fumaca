/* ================= paginação das listas (20, 40, 60 ou 100 por página; abre com 20) ================= */
const PG_SIZES=[20,40,60,100], PG={};
function pgState(key){ return PG[key]||(PG[key]={size:PG_SIZES[0],page:0,last:-1}); }
/* barra de paginação: "Mostrando 1–20 de 135", páginas e "por página". st = {size,page}; change() é chamado depois de mudar o estado */
function pgFill(box,st,total,change){
  box.textContent=""; const pages=Math.max(1,Math.ceil(total/st.size)); st.page=Math.min(Math.max(0,st.page),pages-1);
  box.hidden=total<=PG_SIZES[0]; if(box.hidden) return;
  const mk=(t,title,pg,cls,dis)=>{ const b=document.createElement("button"); b.type="button"; b.textContent=t; b.title=title; b.setAttribute("aria-label",title); if(cls) b.className=cls; b.disabled=!!dis; if(!dis&&pg!=null) b.addEventListener("click",()=>{ st.page=pg; change(true); }); return b; };
  const a=st.page*st.size+1, z=Math.min(total,(st.page+1)*st.size);
  const info=document.createElement("span"); info.className="pg-info"; info.textContent=`${a}–${z} de ${total}`;
  const nav=document.createElement("div"); nav.className="pg-nav";
  nav.append(mk("«","Primeira página",0,"",st.page===0),mk("‹","Página anterior",st.page-1,"",st.page===0));
  let lo=Math.max(0,st.page-2), hi=Math.min(pages-1,lo+4); lo=Math.max(0,hi-4);
  for(let i=lo;i<=hi;i++){ const b=mk(String(i+1),"Página "+(i+1),i,i===st.page?"on":""); if(i===st.page) b.setAttribute("aria-current","page"); nav.append(b); }
  nav.append(mk("›","Próxima página",st.page+1,"",st.page>=pages-1),mk("»","Última página",pages-1,"",st.page>=pages-1));
  const lab=document.createElement("label"); lab.className="pg-size"; lab.append("Por página ");
  const sel=document.createElement("select"); sel.setAttribute("aria-label","Registros por página"); PG_SIZES.forEach(n=>{ const o=document.createElement("option"); o.value=n; o.textContent=n; sel.append(o); }); sel.value=String(st.size);
  sel.addEventListener("change",()=>{ st.size=+sel.value; st.page=0; change(true); }); lab.append(sel);
  box.append(info,nav,lab);
}
/* paginação "de verdade": devolve só a fatia da página e monta a barra (quem chama desenha apenas a fatia) */
function pgSlice(key,list,sig,rerender){
  const st=pgState(key); if(st.sig!==sig){ st.sig=sig; st.page=0; }
  const pages=Math.max(1,Math.ceil(list.length/st.size)); st.page=Math.min(st.page,pages-1);
  const box=document.createElement("nav"); box.className="pager"; box.setAttribute("aria-label","Paginação");
  pgFill(box,st,list.length,sc=>{ rerender(); if(sc){ const h=document.getElementById(key==="bList"?"bList":"nbBox")||document.body; const r=h.getBoundingClientRect(); if(r.top<0) h.scrollIntoView({block:"start"}); } });
  return {items:list.slice(st.page*st.size,(st.page+1)*st.size),bar:box};
}
/* liga a paginação a uma lista que se redesenha sozinha: esconde os grupos fora da página (classe pg-off) */
function pgBind(host,key,getGroups,anchor){
  if(host._pg) return; host._pg=1; const st=pgState(key), box=document.createElement("nav"); box.className="pager"; box.setAttribute("aria-label","Paginação"); box.hidden=true; anchor.after(box);
  let raf=0;
  const apply=(scroll)=>{ raf=0; const gs=getGroups(); if(gs.length!==st.last){ st.page=0; st.last=gs.length; }
    const pages=Math.max(1,Math.ceil(gs.length/st.size)); st.page=Math.min(st.page,pages-1);
    gs.forEach((g,i)=>{ const on=i>=st.page*st.size&&i<(st.page+1)*st.size; g.forEach(e=>e.classList.toggle("pg-off",!on)); });
    pgFill(box,st,gs.length,sc=>{ apply(); if(sc){ const r=host.getBoundingClientRect(); if(r.top<0) host.scrollIntoView({block:"start",behavior:"smooth"}); } }); };
  new MutationObserver(()=>{ if(!raf) raf=requestAnimationFrame(()=>apply()); }).observe(host,{childList:true,subtree:host.tagName==="TABLE"});
  host._pgApply=apply; apply();
}
const pgTableGroups=tb=>{ if(tb.tBodies.length>1) return [...tb.tBodies].map(b=>[b]);
  const body=tb.tBodies[0]; if(!body) return []; const groups=[];
  for(const r of body.rows){ if(r.classList.contains("total")) continue; if(r.classList.contains("of-drow")&&groups.length) groups[groups.length-1].push(r); else groups.push([r]); } return groups; };

/* ================= ordenar tabelas pelo título da coluna ================= */
// Vale para qualquer tabela dentro de .tbl (menos os mapas de calor). O sentido escolhido fica
// guardado por tabela e é reaplicado quando a tabela é redesenhada.
const SORT = {};
function cellValue(td){
  if(!td) return {n:-Infinity,s:""};
  const sel=td.querySelector("select"); const s=(sel?sel.options[sel.selectedIndex].text:td.textContent).trim();
  const m=s.replace(/−/g,"-").match(/[-+]?\d[\d.]*(,\d+)?/);
  if(m&&/^[-+−]?\s*\d/.test(s)){ const n=parseFloat(m[0].replace(/\./g,"").replace(",","."));
    const mult=/\d\s*M\b/.test(s)?1e6:/\d\s*mil\b/.test(s)?1e3:1; return {n:n*mult,s}; }
  return {n:null,s};
}
function applySort(tb){
  const st=SORT[tb.id]; if(!st||!tb.tBodies[0]||!tb.tHead) return;
  const dash0=tb.id==="mkTable";   // só no Mercado a diferença vazia conta como 0%; nas demais listas, sem valor vai para o fim
  const cmp=(x,y)=>{ if(st.auto&&dash0){ if(x.n==null&&y.n!=null&&/^[—–-]?$/.test(x.s.trim()))x={n:0,s:x.s}; if(y.n==null&&x.n!=null&&/^[—–-]?$/.test(y.s.trim()))y={n:0,s:y.s}; }
    if((x.n==null)!==(y.n==null)) return x.n==null?1:-1;   // sem valor (ex.: "Sem preço") sempre no fim, qualquer que seja o sentido
    let d = (x.n!=null&&y.n!=null) ? x.n-y.n : (x.n!=null ? -1 : y.n!=null ? 1 : x.s.localeCompare(y.s,"pt-BR",{numeric:true})); return st.dir*d; };
  tb._sorting=true;
  if(tb.tBodies.length>1){   // um tbody por item (linha + painel de detalhe): ordena os tbodies inteiros
    const bodies=[...tb.tBodies]; bodies.sort((a,b)=>cmp(cellValue(a.rows[0]&&a.rows[0].cells[st.col]),cellValue(b.rows[0]&&b.rows[0].cells[st.col]))); if(bodies.some((x,i)=>x!==tb.tBodies[i])) bodies.forEach(x=>tb.append(x));
  } else {
    const body=tb.tBodies[0], rows=[...body.rows], fixed=rows.filter(r=>r.classList.contains("total"));
    // linha de detalhe (.of-drow) anda sempre junto da linha anterior
    const groups=[]; for(const r of rows){ if(r.classList.contains("total")) continue; if(r.classList.contains("of-drow")&&groups.length) groups[groups.length-1].push(r); else groups.push([r]); }
    groups.sort((a,b)=>cmp(cellValue(a[0].cells[st.col]),cellValue(b[0].cells[st.col])));
    groups.flat().concat(fixed).forEach(r=>body.append(r));
  }
  tb._sorting=false;
  [...tb.tHead.rows[0].cells].forEach((th,i)=>{ th.setAttribute("aria-sort", i===st.col ? (st.dir>0?"ascending":"descending") : "none"); });
}
/* ordem padrão: pela coluna de lucro, diferença ou economia, do maior para o menor (verde em cima) */
const PROFIT_COL=/lucro|diferen[çc]a|economia|encher e vender/i;
function autoSort(tb){
  const cur=SORT[tb.id]; if(cur&&!cur.auto) return;
  if(!tb.tHead||!tb.tHead.rows[0]) return; const col=[...tb.tHead.rows[0].cells].findIndex(th=>PROFIT_COL.test(th.textContent));
  if(col<0){ delete SORT[tb.id]; return; } SORT[tb.id]={col,dir:-1,auto:true};
}
function makeSortable(tb){
  if(!tb.id||tb.classList.contains("heat")||tb.classList.contains("nosort")||tb._sortable) return; tb._sortable=true;
  try{ store.set("sort:"+tb.id,""); }catch(e){}   // a ordem escolhida não fica salva: a lista sempre abre pelo maior lucro/diferença
  tb.addEventListener("click",ev=>{ const th=ev.target.closest("thead th"); if(!th||!th.textContent.trim()) return;
    const col=th.cellIndex, cur=SORT[tb.id]; const numeric=[...tb.rows].some(r=>r.parentNode.tagName==="TBODY"&&cellValue(r.cells[col]).n!=null);
    SORT[tb.id]={col,dir: cur&&!cur.auto&&cur.col===col ? -cur.dir : (numeric?-1:1)}; if(PG[tb.id]) PG[tb.id].page=0; applySort(tb); if(tb._pgApply) tb._pgApply(); });
  tb.addEventListener("keydown",ev=>{ if((ev.key==="Enter"||ev.key===" ")&&ev.target.matches("thead th")){ ev.preventDefault(); ev.target.click(); } });
  const mo=new MutationObserver(()=>{ if(tb._sorting) return; autoSort(tb); if(tb.tHead) [...tb.tHead.rows[0].cells].forEach(th=>{ if(th.textContent.trim()){ th.tabIndex=0; th.classList.add("sortable"); } }); applySort(tb); mo.takeRecords(); });
  mo.observe(tb,{childList:true});
}
document.querySelectorAll(".tbl table[id]").forEach(makeSortable);

/* ================= números alinhados à direita ================= */
// Coluna em que quase toda célula é um número (preço, lucro, %) fica alinhada à direita,
// para os dígitos baterem uns embaixo dos outros.
const NUMCELL=/^[-+−]?\s*[\d.,]+\s*(%|M|mil|k)?(\s+(há\s+)?\d+\s*(min|h|d))?$/;
function alignNum(tb){
  const body=tb.tBodies[0]; if(!body||!tb.tHead||!tb.tHead.rows[0]) return;
  const rows=[...body.rows], head=tb.tHead.rows[0].cells;
  for(let c=0;c<head.length;c++){
    let num=0,tot=0;
    for(const r of rows.slice(0,40)){ const td=r.cells[c]; if(!td||td.colSpan>1) continue; const t=td.textContent.trim(); if(!t||t==="—"||t==="-") continue; tot++; if(NUMCELL.test(t)) num++; }
    const on=tot>0&&num/tot>=.7; head[c].classList.toggle("n",on);
    for(const r of rows){ const td=r.cells[c]; if(td&&td.colSpan===1) td.classList.toggle("n",on); }
  }
}
document.querySelectorAll(".tbl table").forEach(tb=>{ if(tb.classList.contains("heat")) return; alignNum(tb);
  new MutationObserver(()=>{ if(!tb._sorting) alignNum(tb); }).observe(tb,{childList:true,subtree:true}); });

/* ================= menu lateral: recolher em ícones ================= */
(function(){
  const app=document.querySelector(".wrap.app"), btn=document.getElementById("navToggle"); if(!app||!btn) return;
  document.querySelectorAll("nav.tabs [role=tab]").forEach(b=>{ const t=b.querySelector(".tl"); if(t) b.title=t.textContent; });
  const set=on=>{ app.classList.toggle("rail",on); btn.setAttribute("aria-expanded",String(!on)); btn.title=on?"Expandir o menu":"Recolher o menu"; };
  set(store.get("rail")==="1");
  btn.addEventListener("click",()=>{ const on=!app.classList.contains("rail"); set(on); store.set("rail",on?"1":"0"); });
})();

/* ================= listas no padrão visual: cartões com verde (lucro), vermelho (prejuízo) e amarelo (zero) ================= */
function skinRows(tb){
  tb._skin=true;
  for(const body of tb.tBodies) for(const tr of body.rows){
    if(tr.classList.contains("of-drow")||tr.classList.contains("total")||tr.classList.contains("bm-row")) continue;
    tr.classList.add("bm-row");
    const cells=[...tr.cells].filter(c=>c.classList.contains("gain")||c.classList.contains("loss")); const last=cells[cells.length-1];
    tr.classList.add(last?(last.classList.contains("gain")?"is-gain":"is-loss"):"is-flat");
  }
}
function skinTable(tb){
  if(!tb.id||tb.classList.contains("heat")||tb.classList.contains("bm2t")) return;
  tb.classList.add("bm2t","lst"); const w=tb.parentNode; if(w&&w.classList.contains("tbl")) w.classList.add("bm2");
  const go=()=>{ skinRows(tb); if(typeof hbar==="function"&&w) hbar(w); };
  let t=null; new MutationObserver(()=>{ if(tb._sorting) return; clearTimeout(t); t=setTimeout(go,30); }).observe(tb,{childList:true,subtree:true}); go();
}
document.querySelectorAll(".tbl table[id]").forEach(skinTable);

/* ================= ligar a paginação às listas ================= */
document.querySelectorAll(".tbl table[id]").forEach(tb=>{ if(tb.classList.contains("heat")) return; const w=tb.closest(".tbl")||tb; pgBind(tb,tb.id,()=>pgTableGroups(tb),w); });
{ const of=$("ofTable"); if(of) pgBind(of,"ofTable",()=>[...of.children].filter(c=>c.classList.contains("of-item")).map(c=>[c]),of.closest(".tbl")||of); }
{ const zl=$("zList"); if(zl) pgBind(zl,"zList",()=>[...zl.children].filter(c=>c.classList.contains("zcard")).map(c=>[c]),zl); }

/* ================= botão "Limpar filtros" (igual em todas as abas com busca) =================
   defs: [id, padrão] na ordem em que devem ser desfeitos (o padrão pode ser função). Só conta/zera o que difere do padrão.
   count(): filtros extras que não são campos (estado em variáveis). reset(): desfaz esses extras. btn: botão que já existe com o próprio clique. */
function limparFiltros({scope,into,after,btn,defs=[],count,reset,focus}){
  const root=typeof scope==="string"?document.getElementById(scope):scope; if(!root) return;
  const val=id=>{ const x=document.getElementById(id); return x?(x.type==="checkbox"?x.checked:(x.type==="search"||x.type==="text"?x.value.trim():x.value)):null; };
  const dflt=d=>typeof d==="function"?d():d;
  const nAtivos=()=>defs.filter(([id,d])=>{ const v=val(id); return v!==null&&v!==dflt(d); }).length+(count?count():0);
  if(!btn){
    btn=document.createElement("button"); btn.type="button"; btn.className="clr";
    btn.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg><span>Limpar filtros</span><b class="clr-n" hidden></b>';
    const alvo=typeof after==="string"?document.getElementById(after):after;
    if(alvo) alvo.insertAdjacentElement("afterend",btn); else (typeof into==="string"?document.getElementById(into):into||root).append(btn);
  } else { btn.classList.add("clr"); if(!btn.querySelector(".clr-n")){ btn.insertAdjacentHTML("beforeend",'<b class="clr-n" hidden></b>'); } }
  const sync=()=>{ const n=nAtivos(), b=btn.querySelector(".clr-n"); btn.classList.toggle("idle",!n); btn.setAttribute("aria-disabled",String(!n)); b.hidden=!n; b.textContent=n;
    btn.setAttribute("aria-label",n?`Limpar ${n} ${n>1?"filtros":"filtro"}`:"Limpar filtros (nenhum filtro ativo)"); };
  const agenda=()=>setTimeout(sync,80);
  ["input","change","click"].forEach(t=>root.addEventListener(t,agenda,true));
  setInterval(()=>{ if(root.offsetParent!==null) sync(); },700);   // pega mudanças feitas pelo código (ex.: "Craft" que preenche a busca)
  btn.addEventListener("click",()=>{
    if(btn.classList.contains("idle")) return;
    for(const [id,d] of defs){ const x=document.getElementById(id), v=val(id); if(!x||v===null||v===dflt(d)) continue;
      if(x.type==="checkbox") x.checked=dflt(d); else x.value=dflt(d);
      x.dispatchEvent(new Event(x.type==="search"||x.type==="text"?"input":"change",{bubbles:true})); }
    if(reset) reset();
    sync(); const f=focus&&document.getElementById(focus); if(f) f.focus({preventScroll:true});
  });
  sync(); return sync;
}
function iniciarLimpar(){
  limparFiltros({scope:"p-mk",into:document.querySelector("#p-mk .row-ctl"),focus:"mkFind",
    defs:[["mkFind",""],["mkCat",""],["mkSub",""],["mkTier",""],["mkEnch",""],["mkQual","1"],["mkCity",""],["mkOnly",true]]});
  limparFiltros({scope:"p-mercado",into:document.querySelector("#p-mercado .row-ctl"),focus:"bmFind",
    defs:[["bmFind",""],["bmCat",""],["bmSub",""],["bmTierS",""],["bmEnch",""],["bmQualS",""],["bmAtivo",false]]});
  limparFiltros({scope:"p-matchup",into:document.querySelector("#p-matchup .row-ctl"),focus:"muFind",defs:[["muFind",""],["muMine",false]]});
  limparFiltros({scope:"ofRoot",after:"ofFind",focus:"ofFind",
    defs:[["ofFind",""],["ofCat",()=>{ const s=document.getElementById("ofCat"); return s&&s.options[0]?s.options[0].value:""; }],["ofTier",""],["ofEnch",""],["ofQual","0"]]});
  limparFiltros({scope:"p-builds",into:document.querySelector("#p-builds .row-ctl"),defs:[["bOnlyMine",false]],
    count:()=>(typeof bCont!=="undefined"&&bCont?1:0)+(typeof bLine!=="undefined"&&bLine?1:0),
    reset:()=>{ bCont=""; bLine=""; bOpen=null; renderBuilds(); }});
  limparFiltros({scope:"p-avalon",btn:document.getElementById("avClear"),
    count:()=>typeof AV==="undefined"||!AV.inited?0:(AV.q.trim()?1:0)+(AV.tier?1:0)+(AV.type?1:0)+AV.res.size+AV.extra.size,reset:()=>{}, });
}

/* ================= menu do item (botão direito, toque longo ou tecla de menu) =================
   Vale para qualquer ícone de item do site (img[data-item]). Mostra onde está mais barato agora nas cidades da royal e atalhos:
   Mercado, Mercado Negro, como fabricar (Craft, Refino ou Cozinha), equivalentes de mesmo IP mais baratos, bag e copiar o nome. */
const IM={el:null,cat:null};
async function imNome(id){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id)||[]; const base=id.split("@")[0].replace(/_LEVEL\d$/,"");
  if(typeof COOK!=="undefined"&&COOK&&COOK.r&&COOK.r[id]) return {pt:COOK.r[id][0],en:COOK.r[id][0]};
  try{ if(!IM.cat){ const c=await need("catalog"); IM.cat=new Map(c.i.map(r=>[r[0],r])); } const r=IM.cat.get(base); if(r) return {pt:r[5]||r[6],en:r[6]||r[5]}; }catch(e){}
  if(m[2]&&typeof BM!=="undefined"&&BM&&BM[m[2]]){ const n=nmKey(m[2],BM[m[2]][0]); return {pt:n,en:BM[m[2]][0]}; }
  return {pt:id,en:id}; }
function imFechar(){ if(IM.el){ IM.el.remove(); IM.el=null; } }
async function imPrecos(ids,q){ const locs=[...CITIES,"Caerleon"], out={};
  try{ const j=await apiJSON(`${HOST}/api/v2/stats/prices/${ids.join(",")}.json?locations=${locs.join(",").replace(/ /g,"%20")}&qualities=${q||1}`);
    for(const x of j){ if(!(x.sell_price_min>0)||!fresh(x.sell_price_min_date)) continue; const o=out[x.item_id]; if(!o||x.sell_price_min<o.p) out[x.item_id]={p:x.sell_price_min,c:x.city}; } }catch(e){}
  return out; }
async function imIr(tab){ const t=$(tab); if(t) t.click(); await new Promise(f=>setTimeout(f,60)); }
async function imAcao(k,id,q,nm){
  const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id)||[], t=+m[1]||0, e=+(m[3]||0), code=(m[2]||"").replace(/_LEVEL\d$/,"");
  if(k==="mk"){ await imIr("t-mk"); try{ if(typeof setupMk==="function") setupMk(); MK.cat=""; const c=$("mkCat"); if(c) c.value=""; MK.sub=""; MK.tiers.clear(); MK.enchs.clear(); if(t>=4){ MK.tiers.add(t); MK.enchs.add(e); } ["mkTier","mkEnch"].forEach(x=>{ const b=$(x); if(b&&b._msel) b._msel.paint(); }); const f=$("mkFind"); f.value=nm.pt; MK.q=nm.pt.toLowerCase(); mkGatilho(); setTimeout(()=>{ const g=$("mkGo"); if(g&&!g.hidden&&!g.disabled) g.click(); },400); }catch(err){} return; }
  if(k==="bm"){ await imIr("t-mercado"); const f=$("bmFind"); if(f){ f.value=nm.pt; f.dispatchEvent(new Event("input",{bubbles:true})); } return; }
  if(k==="craft"){
    if(typeof COOK!=="undefined"&&COOK.r&&COOK.r[id]){ await imIr("t-cozinha"); const kind=COOK.r[id][1]; const b=document.querySelector(`[data-ck="${kind}"]`); if(b&&b.getAttribute("aria-pressed")!=="true") b.click();
      setTimeout(()=>{ const r=document.querySelector(`#ckTable tr[data-fav="${id}"]`); if(r){ r.scrollIntoView({block:"center",behavior:"smooth"}); if(r.getAttribute("aria-expanded")!=="true") r.click(); } },900); return; }
    if(/^(METALBAR|PLANKS|CLOTH|LEATHER|STONEBLOCK)$/.test(code)){ await imIr("t-refino"); setupOf(); ofApplyMode("refine"); OF.tier=t; OF.ench=e; ofFiltLoad(ofFiltSave()); const f=$("ofFind"); f.value=""; OF.q=""; renderOf(); return; }
    if(!BM) BM=await need("bm");
    if(BM[code]){ setupOf(); ofApplyMode("craft"); const sel=$("ofCat"); sel.value="g:"+BM[code][1]; store.set("ofCat",sel.value); OF.tier=t; OF.ench=e; ofFiltLoad(ofFiltSave());
      const n=nmKey(code,BM[code][0]); OF.q=n.toLowerCase(); $("ofFind").value=n; OF2.open.clear(); OF2.open.add(id); await imIr("t-craft"); try{ ofCards(); }catch(err){} renderOf(); }
    return; }
  if(k==="bag"){ const pr=await imPrecos([id],q); const b=pr[id]; bagAdd([{id:id.replace(/_LEVEL(\d)@\d$/,"_LEVEL$1"),q:1,nm:nm.pt,sell:b?b.p:0,sellC:b?b.c:""}]); return; }
  if(k==="copy"){ try{ await navigator.clipboard.writeText(LANG==="en"?nm.en:nm.pt); }catch(err){} return; }
}
async function itemMenu(id,q,x,y,origem){
  imFechar(); const nm=await imNome(id), info=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id), t=info?+info[1]:0, e=info?+(info[3]||0):0, code=info?info[2].replace(/_LEVEL\d$/,""):"";
  const menu=el("div",{class:"imenu",role:"menu","aria-label":"Ações do item "+nm.pt}); IM.el=menu;
  const hd=el("div",{class:"imenu-h"}); hd.append(iconImg(id,40,q),el("span",{},el("b",{text:nm.pt}),el("small",{class:"muted",text:`${t?`T${t}.${e}`:""}${q>1?` · ${QNAME[q]}`:""}`}))); menu.append(hd);
  const preco=el("p",{class:"imenu-p",text:"Procurando o menor preço nas cidades da royal…"}); menu.append(preco);
  const itens=[]; const add=(k,txt,sub)=>{ const b=el("button",{type:"button",class:"imenu-i",role:"menuitem"}); b.append(el("span",{text:txt})); if(sub) b.append(el("small",{text:sub})); b.addEventListener("click",()=>{ imFechar(); imAcao(k,id,q,nm); }); menu.append(b); itens.push(b); return b; };
  if(!BM&&typeof need==="function"){ try{ BM=await need("bm"); }catch(err){} }
  const gear=!!(BM&&BM[code]), cook=typeof COOK!=="undefined"&&COOK&&COOK.r&&!!COOK.r[id], ref=/^(METALBAR|PLANKS|CLOTH|LEATHER|STONEBLOCK)$/.test(code);
  add("mk","Procurar no Mercado","preços em todas as cidades");
  if(gear) add("bm","Ver no Mercado Negro","quanto o Mercado Negro paga");
  if(gear||cook||ref) add("craft",cook?"Como fazer (Cozinha e alquimia)":ref?"Como refinar (Refino)":"Como fabricar (Craft)","receita, custo e lucro");
  const eqBox=el("div",{class:"imenu-eq",hidden:true});
  if(gear&&t>=4&&bcEquivs(t+e).length>1){ const b=el("button",{type:"button",class:"imenu-i",role:"menuitem"}); b.append(el("span",{text:"Substituição de mesmo IP mais barata"}),el("small",{text:`${t}.${e} = ${bcEquivs(t+e).map(([a,b])=>a+"."+b).join(" = ")}`}));
    b.addEventListener("click",async()=>{ eqBox.hidden=false; eqBox.textContent="Consultando…"; const ids=bcEquivs(t+e).map(([a,b])=>`T${a}_${code}${b?"@"+b:""}`); const pr=await imPrecos(ids,q); eqBox.textContent="";
      const lst=ids.map(i=>({i,r:pr[i]})).sort((a,b)=>(a.r?a.r.p:Infinity)-(b.r?b.r.p:Infinity));
      for(const {i,r} of lst){ const mm=/^T(\d)_.+?(?:@(\d))?$/.exec(i); const li=el("div",{class:"imenu-eqr"+(i===id?" cur":"")}); li.append(iconImg(i,24,q),el("span",{text:`${mm[1]}.${mm[2]||0}${i===id?" (este)":""}`}),el("span",{class:"muted",text:r?r.c:"sem anúncio"}),el("b",{text:r?fmtS(r.p):"—"})); eqBox.append(li); } });
    menu.append(b,eqBox); itens.push(b); }
  if(typeof bagAdd==="function") add("bag","Pôr na bag","calcula peso, valor e montaria");
  add("copy","Copiar o nome",`para colar na busca do mercado do jogo`);
  document.body.append(menu);
  const W=menu.offsetWidth, H=menu.offsetHeight; menu.style.left=Math.max(8,Math.min(x,innerWidth-W-8))+"px"; menu.style.top=Math.max(8,Math.min(y,innerHeight-H-8))+"px";
  if(itens[0]) itens[0].focus({preventScroll:true});
  menu.addEventListener("keydown",ev=>{ const i=itens.indexOf(document.activeElement); if(ev.key==="Escape"){ imFechar(); if(origem&&origem.focus) origem.focus(); } else if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){ ev.preventDefault(); const n=itens.length; itens[(i+(ev.key==="ArrowDown"?1:-1)+n)%n].focus(); } });
  const pr=await imPrecos([id],q); if(IM.el!==menu) return; const b=pr[id];
  preco.textContent=""; if(b) preco.append("Mais barato agora: ",el("b",{text:fmt(b.p)})," em ",el("b",{class:"imenu-c",text:b.c})); else preco.textContent="Sem anúncio de venda recente nas cidades da royal.";
}
document.addEventListener("contextmenu",ev=>{ const im=ev.target.closest&&ev.target.closest("img[data-item]"); if(!im||ev.shiftKey) return; ev.preventDefault(); itemMenu(im.dataset.item,+im.dataset.q||1,ev.clientX,ev.clientY,im.closest("[tabindex]")); });
document.addEventListener("click",ev=>{ if(IM.el&&!IM.el.contains(ev.target)) imFechar(); },true);
addEventListener("resize",imFechar); addEventListener("scroll",ev=>{ if(IM.el&&!IM.el.contains(ev.target)) imFechar(); },true);
/* toque longo (celular) */
{ let tm=null, x0=0, y0=0; document.addEventListener("pointerdown",ev=>{ if(ev.pointerType!=="touch") return; const im=ev.target.closest&&ev.target.closest("img[data-item]"); if(!im) return; x0=ev.clientX; y0=ev.clientY; clearTimeout(tm); tm=setTimeout(()=>{ itemMenu(im.dataset.item,+im.dataset.q||1,x0,y0,null); },550); });
  ["pointerup","pointercancel"].forEach(t=>document.addEventListener(t,()=>clearTimeout(tm))); document.addEventListener("pointermove",ev=>{ if(Math.abs(ev.clientX-x0)+Math.abs(ev.clientY-y0)>10) clearTimeout(tm); }); }
/* teclado: tecla de menu ou Shift+F10 numa linha que tem ícone de item */
document.addEventListener("keydown",ev=>{ if(!(ev.key==="ContextMenu"||(ev.shiftKey&&ev.key==="F10"))) return; const a=document.activeElement; const im=a&&(a.matches&&a.matches("img[data-item]")?a:a.querySelector&&a.querySelector("img[data-item]")); if(!im) return; ev.preventDefault(); const r=im.getBoundingClientRect(); itemMenu(im.dataset.item,+im.dataset.q||1,r.left,r.bottom+4,a); });
