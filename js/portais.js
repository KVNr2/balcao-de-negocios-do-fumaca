/* Portais: lembretes dos portais para as Terras Ancestrais (Ancient Lands, atualização Dragonfire).
   Cada lembrete guarda o mapa (pesquisa entre os 815 mapas do jogo: azuis, amarelos, vermelhos, pretos e de Avalon),
   o tamanho do portal, a hora em que abre (ou, se já está aberto, a hora em que fecha) e quantos minutos antes avisar.
   A lista fica no navegador e vai para o Albion Overlay (http://127.0.0.1:47832/portais), que avisa por cima do jogo
   com uma janelinha e som. Sem o overlay, o aviso aparece nesta página enquanto ela estiver aberta. */
(function(){
const LS="portais:v1", PONTE_P="http://127.0.0.1:47832/portais", EM_OVERLAY=location.host==="127.0.0.1:47832";
const TAM={p:["Pequeno","1 a 5"],m:["Médio","5 a 7"],g:["Grande","15 a 20"]};
const COR={azul:["Azul","#1d4ea8"],amarela:["Amarela","#c9a227"],vermelha:["Vermelha","#c4161c"],preta:["Preta","#000"],avalon:["Avalon","#5b3a1c"]};
const AVISOS=[0,1,2,3,5,10,15];
const PT={mapas:null,dados:{t:0,d:[]},sel:null,tam:"p",ab:false,av:2,overlay:false,timer:0,inited:false};

function carrega(){ try{ const j=JSON.parse(localStorage.getItem(LS)); if(j&&Array.isArray(j.d)) PT.dados=j; }catch(e){} }
function grava(enviar){ PT.dados.t=Date.now(); try{ localStorage.setItem(LS,JSON.stringify(PT.dados)); }catch(e){} if(enviar!==false) empurra(); }
const semAcento=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const dois=n=>(n<10?"0":"")+n;
function fmtT(ms){ if(ms<0) ms=0; let s=Math.round(ms/1000); const h=Math.floor(s/3600), m=Math.floor(s%3600/60); s%=60; return (h?h+":"+dois(m):m)+":"+dois(s); }
const hora=ms=>new Date(ms).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
function selo(c,t){ const k=COR[c]||["",""]; const s=el("span",{class:"pt-selo",text:k[0]+(t?" T"+t:"")}); s.style.background=k[1]; if(c==="amarela") s.style.color="var(--saffron-ink)"; return s; }

/* ---------- ponte com o Albion Overlay ---------- */
async function puxa(){
  try{ const r=await fetch(EM_OVERLAY?"/portais":PONTE_P,{cache:"no-store"}); if(!r.ok) throw 0; const j=await r.json(); PT.overlay=true;
    if(j&&Array.isArray(j.d)&&j.t>PT.dados.t){ PT.dados=j; try{ localStorage.setItem(LS,JSON.stringify(j)); }catch(e){} lista(); }
    else if(j&&j.t<PT.dados.t) empurra();
  }catch(e){ PT.overlay=false; }
  estadoOverlay();
}
async function empurra(){
  try{ const r=await fetch(EM_OVERLAY?"/portais":PONTE_P,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(PT.dados)}); if(!r.ok) throw 0; PT.overlay=true;
    const j=await r.json(); if(j&&Array.isArray(j.d)){ PT.dados=j; try{ localStorage.setItem(LS,JSON.stringify(j)); }catch(e){} }
  }catch(e){ PT.overlay=false; }
  estadoOverlay();
}
function estadoOverlay(){ const s=$("ptOverlay"); if(!s) return;
  s.textContent=PT.overlay?"O Albion Overlay está aberto: ele avisa por cima do jogo, com som.":"O Albion Overlay não está aberto neste PC: o aviso aparece só nesta página, enquanto ela estiver aberta.";
  s.classList.toggle("ok",PT.overlay); }

/* ---------- pesquisa de mapa ---------- */
async function mapas(){ if(PT.mapas) return PT.mapas; const r=await fetch("data/portais-mapas.json?v="+(document.documentElement.dataset.v||"")); PT.mapas=(await r.json()).map(m=>({...m,k:semAcento(m.n)})); return PT.mapas; }
function busca(){
  const q=semAcento($("ptQ").value.trim()), box=$("ptRes"); box.textContent=""; PT.ativo=-1;
  if(!q||!PT.mapas){ box.hidden=true; $("ptQ").setAttribute("aria-expanded","false"); return; }
  const cor=$("ptCor").value;
  const res=PT.mapas.filter(m=>(!cor||m.c===cor)&&m.k.includes(q)).sort((a,b)=>(a.k.startsWith(q)?0:1)-(b.k.startsWith(q)?0:1)||a.n.localeCompare(b.n)).slice(0,40);
  if(!res.length){ box.append(el("div",{class:"pt-vazio",text:`Não achei mapa com "${$("ptQ").value.trim()}".`})); }
  res.forEach((m,i)=>{ const o=el("div",{class:"pt-op",role:"option",id:"ptOp"+i,"aria-selected":"false"}); o.append(el("span",{class:"pt-nm",text:m.n}),selo(m.c,m.t));
    o.addEventListener("mousedown",ev=>{ ev.preventDefault(); escolhe(m); }); box.append(o); });
  box.hidden=false; $("ptQ").setAttribute("aria-expanded","true");
}
function marca(i){ const ops=[...$("ptRes").querySelectorAll(".pt-op")]; if(!ops.length) return; PT.ativo=(i+ops.length)%ops.length;
  ops.forEach((o,k)=>o.setAttribute("aria-selected",String(k===PT.ativo))); ops[PT.ativo].scrollIntoView({block:"nearest"}); $("ptQ").setAttribute("aria-activedescendant",ops[PT.ativo].id); }
function escolhe(m){ PT.sel=m; $("ptQ").value=m.n; $("ptRes").hidden=true; $("ptQ").setAttribute("aria-expanded","false");
  const s=$("ptSel"); s.textContent=""; s.append(selo(m.c,m.t),el("span",{text:m.n})); s.hidden=false; $("ptMsg").textContent=""; }

/* ---------- formulário ---------- */
function seg(id,fn){ $(id).querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{ $(id).querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); fn(b.dataset.v); })); }
function adiciona(){
  const msg=$("ptMsg");
  if(!PT.sel){ msg.textContent="Escolha o mapa na lista da pesquisa."; $("ptQ").focus(); return; }
  const h=+$("ptH").value||0, m=+$("ptM").value||0, s=+$("ptS").value||0, ms=((h*60+m)*60+s)*1000;
  if(ms<=0){ msg.textContent=PT.ab?"Diga em quanto tempo o portal fecha.":"Diga em quanto tempo o portal abre."; $("ptM").focus(); return; }
  PT.dados.d.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),m:PT.sel.i,n:PT.sel.n,c:PT.sel.c,t:PT.sel.t,tam:PT.tam,ab:PT.ab,alvo:Date.now()+ms,av:PT.av,ok:0});
  grava(); msg.textContent=`Lembrete de ${PT.sel.n} salvo.`;
  $("ptH").value=""; $("ptM").value=""; $("ptS").value=""; lista();
}

/* ---------- lista e contagem ---------- */
function lista(){
  const box=$("ptLista"); if(!box) return; box.textContent="";
  const d=[...PT.dados.d].sort((a,b)=>a.alvo-b.alvo);
  $("ptN").textContent=d.length?` (${d.length})`:"";
  if(!d.length){ box.append(el("p",{class:"muted",text:"Nenhum lembrete. Escolha o mapa, o tamanho e o tempo que aparece no jogo e salve."})); return; }
  for(const p of d){
    const r=el("div",{class:"pt-row","data-id":p.id});
    const cab=el("div",{class:"pt-cab"}); cab.append(el("span",{class:"pt-mapa",text:p.n}),selo(p.c,p.t),el("span",{class:"pt-tam",text:`${TAM[p.tam][0]} · ${TAM[p.tam][1]}`}));
    const t=el("div",{class:"pt-tempo"}); const av=el("div",{class:"pt-av muted small"});
    const ac=el("div",{class:"pt-ac"});
    if(!p.ab){ const b=el("button",{type:"button",class:"bc-more",text:"Já abriu"}); b.addEventListener("click",()=>abriu(p.id)); ac.append(b); }
    const x=el("button",{type:"button",class:"bc-more",text:"Apagar","aria-label":`Apagar o lembrete de ${p.n}`}); x.addEventListener("click",()=>{ PT.dados.d=PT.dados.d.filter(q=>q.id!==p.id); grava(); lista(); }); ac.append(x);
    r.append(cab,t,av,ac); box.append(r);
  }
  tique();
}
function abriu(id){ const p=PT.dados.d.find(q=>q.id===id); if(!p) return;
  const r=document.querySelector(`.pt-row[data-id="${id}"] .pt-ac`); if(!r||r.querySelector(".pt-fecha")) return;
  const f=el("div",{class:"pt-fecha"}); const mm=el("input",{type:"number",min:"0",max:"180",placeholder:"min","aria-label":"Minutos para fechar"}); const ss=el("input",{type:"number",min:"0",max:"59",placeholder:"seg","aria-label":"Segundos para fechar"});
  const ok=el("button",{type:"button",class:"bc-more",text:"Salvar"});
  ok.addEventListener("click",()=>{ const ms=((+mm.value||0)*60+(+ss.value||0))*1000; if(ms<=0){ mm.focus(); return; } p.ab=true; p.alvo=Date.now()+ms; p.ok=0; grava(); lista(); });
  f.append(el("span",{class:"muted small",text:"Fecha em"}),mm,ss,ok); r.prepend(f); mm.focus(); }
function tique(){
  const agora=Date.now();
  for(const p of PT.dados.d){
    const r=document.querySelector(`.pt-row[data-id="${p.id}"]`); const falta=p.alvo-agora;
    if(r){ const t=r.querySelector(".pt-tempo"), av=r.querySelector(".pt-av");
      t.textContent=p.ab?(falta>0?`Aberto · fecha em ${fmtT(falta)}`:"Fechou"):(falta>0?`Abre em ${fmtT(falta)}`:"Deve estar aberto: use Já abriu para contar até fechar");
      r.classList.toggle("pt-passou",falta<=0);
      av.textContent=falta>0?(p.av?`Aviso às ${hora(p.alvo-p.av*60000)} (${p.av} min antes)`:`Aviso às ${hora(p.alvo)} (na hora)`):""; }
    /* aviso aqui na página só quando o overlay não está aberto (senão ele avisa por cima do jogo) */
    if(!PT.overlay&&!EM_OVERLAY&&!p.ok&&agora>=p.alvo-p.av*60000){ p.ok=1; grava(false); if(agora<p.alvo+10*60000) avisa(p); }
  }
}
function avisa(p){
  try{ const s=new Audio("sons/lembrete.mp3"); s.volume=.9; s.play().catch(()=>{}); }catch(e){}
  const box=$("ptAviso"); if(!box) return; const f=p.alvo-Date.now();
  const c=el("div",{class:"pt-aviso",role:"alert"}); c.append(el("strong",{text:`Portal ${TAM[p.tam][0].toLowerCase()} em ${p.n}`}),el("span",{text:p.ab?(f>0?` fecha em ${fmtT(f)}`:" fechou"):(f>0?` abre em ${fmtT(f)}`:" já abriu")}));
  const x=el("button",{type:"button",class:"bc-more",text:"Ok"}); x.addEventListener("click",()=>c.remove()); c.append(x); box.append(c);
  if(document.hidden&&"Notification" in window&&Notification.permission==="granted"){ try{ new Notification("Lembrete de portal",{body:`${p.n}: portal ${TAM[p.tam][0].toLowerCase()} ${p.ab?"fecha":"abre"} às ${hora(p.alvo)}`,icon:"identidade-visual/icone-overlay-128.png"}); }catch(e){} }
}

/* ---------- montagem ---------- */
async function setupPortais(){
  if(PT.inited) return; PT.inited=true; carrega();
  seg("ptTam",v=>PT.tam=v); seg("ptAb",v=>{ PT.ab=v==="1"; $("ptTLab").textContent=PT.ab?"Fecha em":"Abre em"; });
  const sa=$("ptAvis"); AVISOS.forEach(a=>sa.append(el("option",{value:String(a),text:a?`${a} min antes`:"Na hora"}))); sa.value="2"; sa.addEventListener("change",()=>PT.av=+sa.value);
  const q=$("ptQ"); q.addEventListener("input",()=>{ PT.sel=null; $("ptSel").hidden=true; busca(); }); q.addEventListener("focus",busca); q.addEventListener("blur",()=>setTimeout(()=>{ $("ptRes").hidden=true; q.setAttribute("aria-expanded","false"); },120));
  q.addEventListener("keydown",ev=>{ const ops=$("ptRes").querySelectorAll(".pt-op");
    if(ev.key==="ArrowDown"){ ev.preventDefault(); marca(PT.ativo+1); } else if(ev.key==="ArrowUp"){ ev.preventDefault(); marca(PT.ativo-1); }
    else if(ev.key==="Enter"&&ops.length){ ev.preventDefault(); const i=PT.ativo>=0?PT.ativo:0; const nm=ops[i].querySelector(".pt-nm").textContent; const m=PT.mapas.find(x=>x.n===nm&&ops[i].textContent.includes(x.n)); if(m) escolhe(m); }
    else if(ev.key==="Escape"){ $("ptRes").hidden=true; } });
  $("ptCor").addEventListener("change",busca);
  $("ptAdd").addEventListener("click",adiciona);
  $("ptNotif").addEventListener("click",()=>{ if("Notification" in window) Notification.requestPermission().then(()=>$("ptNotif").hidden=Notification.permission!=="default"); });
  $("ptNotif").hidden=EM_OVERLAY||!("Notification" in window)||Notification.permission!=="default";
  try{ await mapas(); }catch(e){ $("ptMsg").textContent="Não consegui carregar a lista de mapas. Recarregue a página."; }
  lista(); puxa();
}
window.renderPortais=function(){ setupPortais().then(()=>{ lista(); puxa(); }); };
/* a contagem e os avisos continuam com a página aberta em qualquer aba */
carrega(); setInterval(()=>{ if($("p-portais")&&!$("p-portais").hidden) tique(); else if(PT.dados.d.some(p=>!p.ok)) tique(); },1000);
setInterval(()=>{ if(document.visibilityState==="visible") puxa(); },10000); puxa();

const css=document.createElement("style"); css.textContent=`
.pt-form{position:relative;z-index:5;display:flex;flex-wrap:wrap;gap:14px 18px;align-items:flex-start}
.pt-form>.ctl{flex:none}.pt-form .pt-busca{flex:1 1 280px;max-width:380px}.pt-form .seg{flex-wrap:nowrap}
#ptCor,#ptAvis{min-width:150px}
.pt-busca{position:relative;z-index:50}
.pt-busca input,.pt-t input,.pt-fecha input,#ptCor,#ptAvis{height:var(--ctl-h,40px);box-sizing:border-box}
.pt-busca input{width:100%}
.pt-res{position:absolute;left:0;right:0;top:100%;margin-top:4px;max-height:300px;overflow:auto;background:var(--cloth);border:1px solid var(--line);border-radius:var(--r-ctl,8px);z-index:30;box-shadow:0 14px 40px rgba(0,0,0,.5)}
.pt-op{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;cursor:pointer;color:var(--parch)}
.pt-op:hover,.pt-op[aria-selected="true"]{background:var(--cloth-2);box-shadow:inset 3px 0 0 var(--saffron)}
.pt-vazio{padding:10px 12px;color:var(--smoke)}
.pt-sel{display:flex;align-items:center;gap:8px;margin-top:6px;color:var(--parch)}
.pt-selo{display:inline-block;border-radius:999px;padding:1px 9px;font:700 12.5px var(--f-body);color:#fff;white-space:nowrap}
.pt-t{display:flex;gap:6px}.pt-t input{width:70px}
.pt-ov{margin:12px 0 0;color:var(--smoke);font-size:14px}.pt-ov.ok{color:var(--gain)}
.pt-lista{display:grid;gap:10px}
.pt-row{display:grid;grid-template-columns:1fr auto;gap:4px 14px;align-items:center;background:var(--cloth);border:1px solid var(--line-soft);border-radius:var(--r-panel,12px);padding:12px 14px}
.pt-row.pt-passou{opacity:.7}.pt-row.pt-passou .pt-tempo{font-size:17px;color:var(--parch-2)}
.pt-cab{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.pt-mapa{font:600 19px var(--f-display);color:var(--parch)}
.pt-tam{color:var(--parch-2);font-size:14.5px}
.pt-tempo{grid-column:1;font:600 22px var(--f-display);color:var(--saffron);font-variant-numeric:tabular-nums}
.pt-av{grid-column:1}
.pt-ac{grid-column:2;grid-row:1/span 3;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;align-items:center}
.pt-fecha{display:flex;align-items:center;gap:6px}.pt-fecha input{width:64px}
#ptAviso{position:fixed;right:18px;bottom:18px;display:grid;gap:10px;z-index:90}
.pt-aviso{display:flex;align-items:center;gap:10px;background:var(--cloth);border:1px solid var(--line);border-radius:14px;padding:14px 16px;box-shadow:0 14px 40px rgba(0,0,0,.5);color:var(--parch);border-top:7px solid var(--madder)}
.pt-aviso strong{font:600 17px var(--f-display)}
@media (max-width:700px){.pt-row{grid-template-columns:1fr}.pt-ac{grid-column:1;grid-row:auto;justify-content:flex-start}}
`; document.head.append(css);
})();
