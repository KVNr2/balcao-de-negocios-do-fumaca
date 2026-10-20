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
