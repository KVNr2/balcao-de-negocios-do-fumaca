/* ================= wiring ================= */
const tabs=[...document.querySelectorAll("nav.tabs [role=tab]")];
function setPageHead(btn){ if(!btn) return; let g=btn.previousElementSibling; while(g&&!g.classList.contains("grp")) g=g.previousElementSibling;
  const fl=(btn.querySelector(".fl")||{}).textContent||""; $("phKick").textContent=g?g.textContent:"";
  $("phTitle").textContent=btn.querySelector(".tl").textContent; const gd=(typeof GUIA!=="undefined"&&GUIA[btn.getAttribute("aria-controls")])||[]; $("phDesc").textContent=gd[0]||""; document.title=`${btn.querySelector(".tl").textContent} · Balcão de Negócios do Fumaça`; }
function showTab(id, quiet){ setPageHead(tabs.find(b=>b.id===id)); tabs.forEach(b=>b.tabIndex=b.id===id?0:-1);
  { const sel=tabs.find(b=>b.id===id); if(sel&&matchMedia("(max-width:900px)").matches) sel.scrollIntoView({block:"nearest",inline:"center",behavior:quiet||RM?"auto":"smooth"}); } let panel=null; tabs.forEach(b=>{const on=b.id===id; b.setAttribute("aria-selected",String(on)); const p=$(b.getAttribute("aria-controls")); p.hidden=!on; if(on) panel=p;}); tip.hidden=true; store.set("tab",id); if(id==="t-craft") renderCraft();
  if(id==="t-cozinha") renderCook(); if(id==="t-mapas") renderMaps(); if(id==="t-mercado") renderBM(); if(id==="t-trab") renderWK(); if(id==="t-matchup") renderMU(); if(id==="t-craft") renderOf(); if(id==="t-mk") renderMk(); if(id==="t-encantar") renderEN(); if(id==="t-fazenda") renderFZ(); if(id==="t-custo") renderBC(); if(id==="t-zvz") renderZvz(); if(id==="t-versao") renderVersao();
  moveTabLamp(tabs.find(b=>b.id===id), quiet); addFlourishes(panel||document);
  if(!quiet&&panel){ animatePanel(panel); if(FX.ok&&!RM){ revealOnScroll(); tiltCards(); if(window.ScrollTrigger) ScrollTrigger.refresh(); } } }
function animatePanel(panel){
  if(!window.gsap||RM) return;
  const bk=document.querySelector("#pagehead"); if(bk&&bk.getBoundingClientRect().top<-40&&matchMedia("(min-width:901px)").matches) window.scrollTo({top:bk.getBoundingClientRect().top+scrollY-12,behavior:"smooth"});
  gsap.fromTo(panel,{opacity:0,rotationY:-8,x:-22,transformPerspective:1600,transformOrigin:"0% 50%"},{opacity:1,rotationY:0,x:0,duration:.55,ease:"power3.out",clearProps:"transform,opacity"});
  const cells=panel.querySelectorAll("table.heat td"); if(cells.length) gsap.from(cells,{opacity:0,scale:.86,duration:.28,stagger:{each:.012},ease:"power1.out",clearProps:"opacity,transform"});
  const bars=panel.querySelectorAll(".plot .bar"); if(bars.length) gsap.from(bars,{scaleX:0,duration:.7,stagger:.05,ease:"power3.out",clearProps:"transform"});
  const recs=panel.querySelectorAll("ol.recs li"); if(recs.length) gsap.from(recs,{opacity:0,x:-12,duration:.35,stagger:.05,ease:"power2.out",clearProps:"opacity,transform"});
}
tabs.forEach(b=>b.addEventListener("click",()=>showTab(b.id)));
// teclado no menu: setas sobem e descem entre as páginas, Home e End vão para a primeira e a última
document.querySelector("nav.tabs").addEventListener("keydown",ev=>{ const i=tabs.indexOf(document.activeElement); if(i<0) return;
  const k=ev.key, n=k==="ArrowDown"||k==="ArrowRight"?i+1:k==="ArrowUp"||k==="ArrowLeft"?i-1:k==="Home"?0:k==="End"?tabs.length-1:null; if(n==null) return;
  ev.preventDefault(); const b=tabs[(n+tabs.length)%tabs.length]; b.focus(); showTab(b.id); });
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.goto)));
document.querySelectorAll("[data-res]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-res]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); st.res=b.dataset.res; $("resNote").textContent=RES[st.res].note; renderHeat(); calc(true); }));
document.querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",()=>{ const g=b.dataset.g; document.querySelectorAll(`[data-g="${g}"]`).forEach(x=>x.setAttribute("aria-pressed",String(x===b))); st[g]= g==="sell"?b.dataset.v:parseFloat(b.dataset.v); recompute(g==="sell"); }));
$("bSort").addEventListener("change",e=>{ bSort=e.target.value; renderBuilds(); });
$("bOnlyMine").addEventListener("change",renderBuilds);
document.querySelectorAll("[data-ck]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-ck]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); ckKind=b.dataset.ck; ckSel=null; renderCook(); }));
$("ckBuilds").addEventListener("change",renderCook);
["tier","ench"].forEach(id=>$(id).addEventListener("change",()=>calc(true)));
["pRaw","pPrev","pBar","focusCost","focusPool"].forEach(id=>$(id).addEventListener("input",()=>calc(false)));
$("fee").addEventListener("input",()=>recompute(false));
["cSlot","cMat","cSet"].forEach(id=>$(id).addEventListener("change",renderCraft));
$("reload").addEventListener("click",()=>loadLive(true));
document.querySelectorAll("[data-lang]").forEach(b=>{ b.setAttribute("aria-pressed",String(b.dataset.lang===LANG)); b.addEventListener("click",()=>setLang(b.dataset.lang)); });
$("muFind").addEventListener("input",renderMU); $("muMine").addEventListener("change",renderMU);
function applyMeta(){ if(DATA.ouro){ $("goldV").textContent=fmt(DATA.ouro); $("premV").textContent=fmtS(DATA.ouro*3750); } if(DATA.janela){ const d=DATA.geradoEm?new Date(DATA.geradoEm):null;
    $("when").textContent=LIVE?DATA.janela:(d&&!isNaN(d)?`salvos em ${d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}`:DATA.janela);
    $("whenBox").classList.toggle("stale",!LIVE); $("whenBox").classList.remove("off");
    $("whenBox").title=LIVE?"Consultados agora no Albion Online Data; cada preço é o anúncio mais recente de até 3 dias":"Preços salvos no site: "+DATA.janela; } }
async function loadCraftFamilies(){ const keys=Object.keys(PF.craft).filter(k=>PF.craft[k].lv>0); for(const k of keys){ const [s,m]=k.split("_"); await ensureFamily(s,m); } renderRecs(); renderHero(); }
function recompute(reset){ $("resNote").textContent=RES[st.res].note; renderHeat(); calc(!!reset); renderRecs(); renderHero(); renderBuilds(); if(!$("p-craft").hidden) renderCraft(); if(!$("p-fazenda").hidden&&FARM) renderFZ(); if(!$("p-encantar").hidden&&GEAR) renderEN(); if(LIVE) loadCraftFamilies(); }

loadProfile(); renderProfile(); renderWho(); renderActs("all");
stallIntro();
(async()=>{
  try{ const [p,c,z,g,sp]=await Promise.all([need("precos"),need("cook"),need("zones"),need("gear"),need("specs")]); DATA=p; COOK=c; ZONES=z; GEAR=g; SPECS=sp; indexSpecs(); }catch(e){ $("when").textContent="Não consegui abrir os dados do site"; }
  applyMeta(); renderSpecs(); renderCookProfile(); importFromHash();
  const hash=location.hash.slice(1), start=tabs.find(b=>b.id==="t-"+hash)?"t-"+hash:(store.get("tab")||"t-voce"); recompute(true); if($(start)) showTab(start,true);
  loadBuilds(); loadLive();
})();



$("muClose").addEventListener("click",()=>{ const d=$("muDlg"); if(d.close) d.close(); else d.removeAttribute("open"); });
$("muDlg").addEventListener("click",ev=>{ if(ev.target===$("muDlg")) $("muClose").click(); });

/* ================= Para você: resumo em cartões; clicar num tópico abre o detalhe ================= */
(function(){
  const panel=document.getElementById("p-voce"); if(!panel) return;
  const T=[["recRefino","Refino","Metal, tecido e couro com o seu foco"],["recCraft","Craft","O que fabricar com o seu foco"],["recCook","Cozinha e alquimia","Comidas e poções"],["recGo","Aonde ir hoje","Pesca e coleta"],["recBrumas","Builds das Brumas","As que combinam com a sua ficha"],["recCorr","Builds das Corrompidas","As que combinam com a sua ficha"],["recColeta","Coleta","Preço da matéria-prima no seu tier"],["recPesca","Pesca","Peixes mais valiosos"]];
  const blocks=T.map(([id])=>{ const e=document.getElementById(id); return e&&e.closest(".block"); });
  if(blocks.some(b=>!b)) return;
  const hero=panel.querySelector(".deal");
  const wrap=document.createElement("div"); wrap.className="vc";
  wrap.innerHTML='<div class="vc-h"><h2>Resumo do dia</h2><span class="tiny muted">Clique num tópico para ver o detalhe.</span><button type="button" class="btn ghost" id="vcAll" aria-pressed="false">Mostrar tudo</button></div><div class="vc-tiles" id="vcTiles"></div><div class="vc-detail" id="vcDetail"></div>';
  (hero||panel.firstElementChild).after(wrap);
  const tiles=wrap.querySelector("#vcTiles"), det=wrap.querySelector("#vcDetail"), allBtn=wrap.querySelector("#vcAll");
  panel.querySelectorAll(":scope > .cols").forEach(c=>c.remove());   // os blocos vão para a área de detalhe
  const btns=[];
  const trunc=(s,n)=>s.length>n?s.slice(0,n-1).trimEnd()+"…":s;
  T.forEach(([id,nome,sub],i)=>{
    const b=blocks[i]; b.classList.add("vc-det"); b.dataset.vc=id; det.append(b);
    const btn=document.createElement("button"); btn.type="button"; btn.className="vc-tile"; btn.dataset.vc=id; btn.setAttribute("aria-expanded","false");
    btn.innerHTML='<span class="vc-n"></span><b class="vc-t"></b><span class="vc-s"></span><span class="vc-go">Ver detalhe ›</span>'; btn.querySelector(".vc-n").textContent=nome;
    tiles.append(btn); btns.push(btn);
    const upd=()=>{
      btn.hidden=b.hidden; if(b.hidden) return;
      const el=document.getElementById(id); let t="", s="", ic=null;
      if(el.tagName==="OL"){ const li=el.querySelector("li:not(.empty)"); if(li){ t=li.querySelector("strong")?li.querySelector("strong").textContent:""; const sp=li.querySelectorAll("span:not(.rec-ic)"); s=sp[0]?sp[0].textContent:""; const im=li.querySelector(".rec-ic img"); ic=im?im.cloneNode(true):null; } else { const e=el.querySelector("li"); s=e?e.textContent:""; } }
      else { const tr=el.querySelector("tbody tr"); if(tr){ const c=[...tr.cells].map(x=>x.textContent.trim()).filter(Boolean); t=c[0]||""; s=c.slice(1,3).join(" · "); } }
      btn.querySelector(".vc-t").textContent=trunc(t||"Sem dados ainda",60); btn.querySelector(".vc-s").textContent=trunc(s||sub,90);
      { let w=btn.querySelector(".vc-ic"); if(!w){ w=document.createElement("span"); w.className="vc-ic"; btn.prepend(w); } w.textContent=""; if(ic){ ic.width=ic.height=44; w.append(ic); } w.hidden=!ic; }
      btn.classList.toggle("gain",/\+\d/.test(s)||/\+\d/.test(t)); };
    new MutationObserver(upd).observe(b,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]}); upd();
  });
  const show=id=>{ btns.forEach(x=>{ const on=x.dataset.vc===id; x.classList.toggle("on",on); x.setAttribute("aria-expanded",String(on)); }); det.querySelectorAll(".vc-det").forEach(b=>b.classList.toggle("open",b.dataset.vc===id)); };
  let cur=null;
  tiles.addEventListener("click",ev=>{ const b=ev.target.closest(".vc-tile"); if(!b) return; const id=b.dataset.vc; cur=cur===id?null:id; wrap.classList.remove("all"); allBtn.setAttribute("aria-pressed","false"); show(cur); if(cur) setTimeout(()=>{ const d=det.querySelector(".vc-det.open"); if(d) d.scrollIntoView({block:"nearest",behavior:"smooth"}); },50); });
  allBtn.addEventListener("click",()=>{ const on=allBtn.getAttribute("aria-pressed")!=="true"; allBtn.setAttribute("aria-pressed",String(on)); allBtn.textContent=on?"Recolher":"Mostrar tudo"; wrap.classList.toggle("all",on); cur=null; show(null); });
})();

/* ================= ícones nos títulos de cada tópico (no lugar da estrelinha) ================= */
(function(){
  const MAP=[[/ca[cç]ada|rastre|pegada/i,"t-pegadas"],[/combate|arma|zvz/i,"t-zvz"],[/craft|fabric|oficina/i,"t-craft"],[/coleta|miner|colher/i,"t-trab"],[/refin/i,"t-refino"],[/cozinha|aliment|comida|poç|alquimia/i,"t-cozinha"],[/fazenda|ilha|plant|animal|cria/i,"t-fazenda"],[/encant/i,"t-encantar"],[/pesca|mapa|onde (pescar|coletar)|aonde/i,"t-mapas"],[/prata|ganho/i,"t-prata"],[/mercado negro/i,"t-mercado"],[/mercado/i,"t-mk"],[/custo|onde comprar/i,"t-custo"],[/matchup/i,"t-matchup"],[/build/i,"t-builds"],[/patch|mudou/i,"t-patch"],[/fonte|n[uú]mero/i,"t-fontes"],[/vers/i,"t-versao"],[/resumo|dia|ficha|para voc/i,"t-voce"]];
  const tabOf=h=>{ const p=h.closest("section.panel"); return p?p.getAttribute("aria-labelledby"):null; };
  function run(root){ (root||document).querySelectorAll("h2:not(.has-ic),h3.orn:not(.has-ic)").forEach(h=>{
      if(h.closest("dialog,header,nav")) return;
      const txt=h.textContent; let id=null; for(const [rx,t] of MAP) if(rx.test(txt)){ id=t; break; } if(!id) id=tabOf(h);
      const src=id&&document.querySelector(`#${id} svg.ic`); if(!src) return;
      const ic=src.cloneNode(true); ic.setAttribute("class","hic"); ic.setAttribute("aria-hidden","true"); h.classList.add("has-ic"); h.prepend(ic); }); }
  run();
  document.querySelectorAll("nav.tabs [role=tab]").forEach(b=>b.addEventListener("click",()=>setTimeout(run,300)));
  new MutationObserver(()=>{ clearTimeout(run._t); run._t=setTimeout(run,200); }).observe(document.querySelector("main")||document.body,{childList:true,subtree:true});
})();
