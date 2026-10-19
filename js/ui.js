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
  const body=tb.tBodies[0], rows=[...body.rows], fixed=rows.filter(r=>r.classList.contains("total")), rest=rows.filter(r=>!r.classList.contains("total"));
  rest.sort((a,b)=>{ const x=cellValue(a.cells[st.col]), y=cellValue(b.cells[st.col]);
    let d = (x.n!=null&&y.n!=null) ? x.n-y.n : (x.n!=null ? -1 : y.n!=null ? 1 : x.s.localeCompare(y.s,"pt-BR",{numeric:true}));
    return st.dir*d; });
  tb._sorting=true; rest.concat(fixed).forEach(r=>body.append(r)); tb._sorting=false;
  [...tb.tHead.rows[0].cells].forEach((th,i)=>{ th.setAttribute("aria-sort", i===st.col ? (st.dir>0?"ascending":"descending") : "none"); });
}
function makeSortable(tb){
  if(!tb.id||tb.classList.contains("heat")||tb.classList.contains("nosort")||tb._sortable) return; tb._sortable=true;
  try{ const s=JSON.parse(store.get("sort:"+tb.id)||"null"); if(s) SORT[tb.id]=s; }catch(e){}
  tb.addEventListener("click",ev=>{ const th=ev.target.closest("thead th"); if(!th||!th.textContent.trim()) return;
    const col=th.cellIndex, cur=SORT[tb.id]; const numeric=[...(tb.tBodies[0]||{rows:[]}).rows].some(r=>cellValue(r.cells[col]).n!=null);
    SORT[tb.id]={col,dir: cur&&cur.col===col ? -cur.dir : (numeric?-1:1)}; store.set("sort:"+tb.id,JSON.stringify(SORT[tb.id])); applySort(tb); });
  tb.addEventListener("keydown",ev=>{ if((ev.key==="Enter"||ev.key===" ")&&ev.target.matches("thead th")){ ev.preventDefault(); ev.target.click(); } });
  new MutationObserver(()=>{ if(tb._sorting) return; if(tb.tHead) [...tb.tHead.rows[0].cells].forEach(th=>{ if(th.textContent.trim()){ th.tabIndex=0; th.classList.add("sortable"); } }); applySort(tb); }).observe(tb,{childList:true});
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
