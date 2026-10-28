/* Filtros e ordenação das listas de Cozinha e alquimia e de Ilha e fazenda, no mesmo jeito do Craft e do Refino:
   cabeçalho clicável para ordenar e uma linha de filtros (lucro mínimo, lucro %, prata por foco, vendas por dia).
   Cada lista guarda o seu estado no navegador ("lf:<chave>"). As vendas por dia vêm do histórico de 7 dias
   (histFetch, em oficina.js), somando as cidades. */
const LF={};
const lfNum=v=>v!=null&&v!==""&&isFinite(v);
function lfGet(key){ if(!LF[key]){ let o={}; try{ o=JSON.parse(store.get("lf:"+key)||"{}")||{}; }catch(e){} LF[key]=o; } return LF[key]; }
function lfSave(key){ try{ store.set("lf:"+key,JSON.stringify(LF[key])); }catch(e){} }

/* linha de filtros: fields = [{k,lab,step,get(m)}]. Só remonta quando muda a lista, para não perder o foco do campo */
function lfBar(box,key,fields,onChange){
  if(!box) return; box.hidden=false;
  const sig=key+":"+fields.map(f=>f.k).join(",");
  if(box.dataset.sig!==sig){
    box.dataset.sig=sig; box.textContent=""; const s=lfGet(key); let tm;
    box.append(el("span",{class:"of-ct",text:"Filtrar"}));
    for(const f of fields){
      const i=el("input",{type:"number",step:String(f.step||1),placeholder:"qualquer"}); if(f.min!=null) i.min=String(f.min);
      if(lfNum(s[f.k])) i.value=String(s[f.k]);
      i.addEventListener("input",()=>{ const v=i.value.trim().replace(",","."); if(v===""||!isFinite(+v)) delete s[f.k]; else s[f.k]=+v; lfSave(key); clearTimeout(tm); tm=setTimeout(onChange,350); });
      box.append(el("label",{class:"of-fil"},f.lab,i));
    }
    const clr=el("button",{type:"button",class:"linkbtn of-fclr",text:"Limpar filtros"});
    clr.addEventListener("click",()=>{ for(const f of fields) delete s[f.k]; box.querySelectorAll("input").forEach(i=>i.value=""); lfSave(key); onChange(); });
    box.append(clr,el("small",{class:"muted lf-ct"}));
  }
  lfCount(box,key,fields,0);
}
function lfActive(key,fields){ const s=lfGet(key); return fields.some(f=>lfNum(s[f.k])); }
function lfFilter(key,list,fields){
  const s=lfGet(key); let out=list;
  for(const f of fields) if(lfNum(s[f.k])) out=out.filter(m=>{ const v=f.get(m); return v!=null&&isFinite(v)&&v>=s[f.k]; });
  return out;
}
function lfCount(box,key,fields,n){
  if(!box) return; const ct=box.querySelector(".lf-ct"), clr=box.querySelector(".of-fclr");
  if(ct) ct.textContent=n>0?`${fmt(n)} fora pelos filtros`:""; if(clr) clr.hidden=!lfActive(key,fields);
}

/* ordenação: cols = [{h,k,s(m),first,t}]; s ausente = coluna sem ordenação. dir 1 = maior primeiro (no nome, A a Z) */
function lfState(key,def){ const s=lfGet(key); return {k:s.sort||def.k, dir:s.dir||def.dir||1}; }
function lfSort(key,list,cols,def){
  const {k,dir}=lfState(key,def), c=cols.find(c=>c.s&&c.k===k)||cols.find(c=>c.s&&c.k===def.k); if(!c) return list;
  const bad=v=>v==null||(typeof v==="number"&&(!isFinite(v)||v<0&&c.k==="vol"));
  return list.slice().sort((a,b)=>{ const x=c.s(a), y=c.s(b);
    if(c.k==="name") return dir*String(x).localeCompare(String(y),"pt");
    if(bad(x)&&bad(y)) return 0; if(bad(x)) return 1; if(bad(y)) return -1; return dir*(y-x); });
}
function lfHead(hr,key,cols,def,onChange){
  const {k,dir}=lfState(key,def), s=lfGet(key);
  for(const c of cols){
    const th=el("th"); hr.append(th);
    if(!c.s){ th.textContent=c.h; continue; }
    const on=c.k===k, desc=(dir>0)===(c.k!=="name");
    th.setAttribute("aria-sort",on?(desc?"descending":"ascending"):"none");
    const b=el("button",{type:"button",class:"lf-hs"+(on?" on":""),title:c.t||("Ordenar por "+c.h.toLowerCase())});
    b.append(c.h,el("i",{class:"of-ar",text:on?(desc?"▼":"▲"):"↕"}));
    b.addEventListener("click",ev=>{ ev.stopPropagation(); if(on) s.dir=-dir; else s.dir=c.first||1; s.sort=c.k; lfSave(key); onChange(); });
    th.append(b);
  }
}

/* vendas por dia somando as cidades: null = ainda não consultado, -1 = sem resposta */
const lfVolKeys=ids=>[...new Set(ids)].flatMap(id=>SHOP_LOCS.map(c=>nk(id)+"|"+c));
function lfVol(id){
  if(typeof OF2==="undefined") return null; let t=0, any=false;
  for(const c of SHOP_LOCS){ const h=OF2.hs[nk(id)+"|"+c]; if(!h) return null; if(h.vol>=0){ t+=h.vol; any=true; } }
  return any?t:-1;
}
function lfVolCell(tr,id){ const c=tr.insertCell(); c.className="num lf-vol"; c.dataset.lfv=id; c.textContent=fmtU(lfVol(id)); c.title="Unidades vendidas por dia nos últimos 7 dias, somando as cidades"; return c; }
/* busca o que falta; se a lista precisa do número para filtrar ou ordenar, espera; senão preenche as células depois */
async function lfEnsureVol(ids,need,tb,note){
  const keys=lfVolKeys(ids).filter(k=>OF2.hs[k]==null); if(!keys.length) return true;
  if(need){ const old=note&&note.textContent; if(note) note.textContent="Consultando as vendas por dia…"; await histFetch(keys); if(note) note.textContent=old; return true; }
  histFetch(keys).then(()=>{ if(tb) tb.querySelectorAll("[data-lfv]").forEach(c=>{ c.textContent=fmtU(lfVol(c.dataset.lfv)); }); });
  return false;
}
