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
