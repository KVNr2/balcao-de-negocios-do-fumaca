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
document.querySelectorAll("[data-ck]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-ck]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); ckKind=b.dataset.ck; ckSel=null; $("ckDetail").hidden=true; renderCook(); }));
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


