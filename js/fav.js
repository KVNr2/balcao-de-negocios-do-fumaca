/* Favoritos: estrela em cada linha das listas (Refino, Craft, Encantar, Cozinha, Fazenda, Trabalhadores, Mercado,
   Mercado Negro) e a opção "Só favoritos". Cada lista marca suas linhas com data-fav (a chave do favorito) e,
   quando precisa para achar a linha de novo, data-fctx (JSON com o contexto, ex.: grupo ou categoria).
   Com "Só favoritos" ligado, a lista é montada só com os favoritos salvos e ignora os filtros de seleção
   (categoria, tier, encantamento, busca...): as próprias listas consultam window.FAV.
   Guardado no navegador; com o overlay aberto, a lista é espelhada nele (site e overlay iguais). */
(function(){
"use strict";
const LS="favs:v2", LSO="favsOnly:v1", PONTE_F="http://127.0.0.1:47832/favoritos";
const TABLES={ encantar:{id:"enTable",ctl:"#p-encantar .row-ctl"}, cozinha:{id:"ckTable",ctl:"#p-cozinha .row-ctl"}, fazenda:{id:"fzTable",ctl:"#p-fazenda .row-ctl"},
  trab:{id:"wkTable",ctl:"#p-trab .row-ctl"}, mk:{id:"mkTable",ctl:"#p-mk .row-ctl"}, mercado:{id:"bmTable",ctl:"#p-mercado .row-ctl"} };
const RENDER={ refino:"renderOf", craft:"renderOf", encantar:"renderEN", cozinha:"renderCook", fazenda:"renderFZ", trab:"renderWK", mk:"renderMk", mercado:"renderBM" };
/* controles de seleção que não valem enquanto só os favoritos aparecem */
const IGN={ refino:["#ofCat","#ofFind","#ofTier","#ofEnch"], craft:["#ofCat","#ofFind","#ofTier","#ofEnch","#ofQual"], encantar:["#enGroup","#enTier"],
  cozinha:["[data-ck]","#ckBuilds"], fazenda:["[data-fz]"], mk:["#mkFind","#mkCat","#mkSub","#mkTier","#mkEnch","#mkOnly"],
  mercado:["#bmFind","#bmCat","#bmSub","#bmTierS","#bmEnch","#bmQualS","#bmAtivo"] };
let DB={t:0,d:{}}, ONLY={};
try{ const j=JSON.parse(localStorage.getItem(LS)||"null"); if(j&&j.d) DB=j; }catch(e){}
try{ ONLY=JSON.parse(localStorage.getItem(LSO)||"{}")||{}; }catch(e){}
const has=(tab,k)=>!!(DB.d[tab]&&DB.d[tab][k]);
function save(push){ try{ localStorage.setItem(LS,JSON.stringify(DB)); }catch(e){} if(push) pushBridge(); }
function saveOnly(){ try{ localStorage.setItem(LSO,JSON.stringify(ONLY)); }catch(e){} }
function toggle(tab,k,ctx){ const d=DB.d[tab]||(DB.d[tab]={}); if(d[k]) delete d[k]; else d[k]=ctx||1; DB.t=Date.now(); save(true); }

window.FAV={
  on:tab=>!!ONLY[tab],
  has,
  list:tab=>Object.entries(DB.d[tab]||{}).map(([k,v])=>({k,c:v&&typeof v==="object"?v:null}))
};

/* ---------- espelho com o programa (overlay) ---------- */
let busy=false;
function pushBridge(){ try{ fetch(PONTE_F,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(DB)}).catch(()=>{}); }catch(e){} }
async function pullBridge(){
  if(busy) return; busy=true;
  try{
    const r=await fetch(PONTE_F,{cache:"no-store"}); if(!r.ok) return; const j=await r.json();
    if(j&&j.d&&(j.t||0)>(DB.t||0)){ DB=j; save(false); refresh(); }
    else if((DB.t||0)>((j&&j.t)||0)) pushBridge();
  }catch(e){} finally{ busy=false; }
}

/* ---------- estrela ---------- */
const STAR_OFF='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.9 1-5.9L3.5 9.8l5.9-.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const STAR_ON='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.9 1-5.9L3.5 9.8l5.9-.8z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
function ctxOf(row){ try{ return row.dataset.fctx?JSON.parse(row.dataset.fctx):null; }catch(e){ return null; } }
function star(tab,k,row){
  const b=document.createElement("button"); b.type="button"; b.className="favstar"; b.dataset.k=k; b.dataset.tab=tab; paint(b,has(tab,k));
  b.addEventListener("click",ev=>{ ev.stopPropagation(); ev.preventDefault(); toggle(tab,k,ctxOf(row)); paint(b,has(tab,k)); applyAll(); });
  b.addEventListener("keydown",ev=>{ ev.stopPropagation(); });
  return b;
}
function paint(b,on){ b.innerHTML=on?STAR_ON:STAR_OFF; b.classList.toggle("on",on); b.title=on?"Tirar dos favoritos":"Marcar como favorito"; b.setAttribute("aria-pressed",String(on)); b.setAttribute("aria-label",b.title); }
function ensureStar(tab,row,host,k){
  let b=host.querySelector(":scope>.favstar");
  if(!b||b.dataset.k!==k||b.dataset.tab!==tab){ if(b) b.remove(); b=star(tab,k,row); host.prepend(b); }
  else if(has(tab,k)!==b.classList.contains("on")) paint(b,has(tab,k));
}

/* ---------- tabelas ---------- */
function passTable(tab,cfg){
  const tb=document.getElementById(cfg.id); if(!tb||!tb.tBodies.length) return; const only=!!ONLY[tab];
  const rows=[]; for(const body of tb.tBodies) for(const r of body.rows) rows.push(r);
  let detail=null, n=0;
  for(const tr of rows){
    if(tr.classList.contains("of-drow")){ if(detail!==null) tr.classList.toggle("fav-off",detail); continue; }
    const k=tr.dataset.fav; if(!k||!tr.cells[0]){ detail=null; continue; }
    ensureStar(tab,tr,tr.cells[0],k);
    const hide=only&&!has(tab,k); tr.classList.toggle("fav-off",hide); detail=hide; if(!hide) n++;
  }
  tb.classList.toggle("fav-empty",only&&!n);
}
/* ---------- refino e craft (oficina) ---------- */
function ofTab(){ const r=document.getElementById("ofRoot"); const p=r&&r.closest(".panel"); return p?p.id.replace(/^p-/,""):"craft"; }
function passOf(){
  const root=document.getElementById("ofRoot"); if(!root) return; const tab=ofTab(); if(tab!=="refino"&&tab!=="craft") return; const only=!!ONLY[tab];
  root.querySelectorAll(".of-row[data-fav]").forEach(row=>{ const k=row.dataset.fav; ensureStar(tab,row,row,k);
    const item=row.closest(".of-item")||row; item.classList.toggle("fav-off",only&&!has(tab,k)); });
  const cnt=root.querySelector(".of-cnt"); if(cnt){ let l=document.getElementById("ofFavOnly"); if(!l){ l=mkOnly("ofFavOnly"); cnt.after(l); } syncOnly(l,tab); }
}
/* ---------- opção "Só favoritos" ---------- */
function mkOnly(id){
  const l=document.createElement("label"); l.className="chk favonly"; if(id) l.id=id;
  l.innerHTML='<input type="checkbox"> <span class="favdot">★</span> Só favoritos <small class="favhint" hidden>(sem filtros)</small>';
  l.querySelector("input").addEventListener("change",ev=>{ const tab=l.dataset.tab; ONLY[tab]=ev.target.checked; saveOnly(); mode(tab); });
  return l;
}
function syncOnly(l,tab){ l.dataset.tab=tab; const i=l.querySelector("input"); if(i.checked!==!!ONLY[tab]) i.checked=!!ONLY[tab]; l.querySelector(".favhint").hidden=!ONLY[tab]; }
function dim(tab){
  const on=!!ONLY[tab], of=tab==="refino"||tab==="craft"; if(of&&tab!==ofTab()) return;
  for(const sel of IGN[tab]||[]) document.querySelectorAll(sel).forEach(e=>{ const t=e.closest("label.f,.seg")||e; t.classList.toggle("fav-ign",on); });
}
function mode(tab){ dim(tab); const fn=window[RENDER[tab]]; try{ if(typeof fn==="function") fn(); }catch(e){} applyAll(); }
function setupCtl(){
  for(const [tab,cfg] of Object.entries(TABLES)){
    const all=document.querySelectorAll(cfg.ctl), ctl=all[all.length-1]; if(!ctl) continue; let l=ctl.querySelector(".favonly");
    if(!l){ l=mkOnly(); ctl.append(l); } syncOnly(l,tab);
  }
}
let q=0;
function applyAll(){ cancelAnimationFrame(q); q=requestAnimationFrame(()=>{ obsOff(); try{ setupCtl(); for(const [t,c] of Object.entries(TABLES)) passTable(t,c); passOf(); for(const t of Object.keys(IGN)) dim(t); }catch(e){} obsOn(); }); }
function refresh(){ document.querySelectorAll(".favstar").forEach(b=>paint(b,has(b.dataset.tab,b.dataset.k))); applyAll(); for(const t of Object.keys(ONLY)) if(ONLY[t]&&RENDER[t]&&typeof window[RENDER[t]]==="function"){ try{ window[RENDER[t]](); }catch(e){} } }
const mo=new MutationObserver(()=>applyAll());
function obsOn(){ for(const c of Object.values(TABLES)){ const t=document.getElementById(c.id); if(t) mo.observe(t,{childList:true,subtree:true}); } const r=document.getElementById("ofRoot"); if(r) mo.observe(r,{childList:true,subtree:true}); }
function obsOff(){ mo.disconnect(); }

const css=document.createElement("style"); css.textContent=`
.favstar{background:none;border:0;padding:2px;margin:0 8px 0 0;cursor:pointer;color:var(--smoke);line-height:0;vertical-align:middle;border-radius:6px;flex:none}
.favstar:hover{color:var(--saffron)}.favstar.on{color:var(--saffron)}.favstar:focus-visible{outline:2px solid var(--saffron);outline-offset:1px}
td>.favstar{float:left;margin-top:4px}
.oflist .of-row{position:relative}.oflist .of-row>.favstar{position:absolute;top:8px;right:10px;z-index:2;margin:0}
.fav-off{display:none!important}
.fav-ign{opacity:.38;pointer-events:none}
.favonly{white-space:nowrap}.favonly .favdot{color:var(--saffron)}.favonly .favhint{color:var(--smoke)}
table.fav-empty::after{content:"Nenhum favorito aqui ainda: marque a estrela de uma linha.";display:block;padding:16px;color:var(--smoke)}
tr.fzsec th,tr.fzsec td{font:600 17px var(--f-display);color:var(--saffron);padding-top:18px;text-align:left}
`; document.head.append(css);

document.addEventListener("click",ev=>{ if(ev.target.closest("[role=tab],.of-g,select,button")) setTimeout(applyAll,60); },true);
window.addEventListener("load",()=>{ applyAll(); pullBridge(); });
setInterval(()=>{ if(document.visibilityState==="visible") pullBridge(); },5000);
applyAll();
})();
