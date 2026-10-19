/* ================= wiring ================= */
const tabs=[...document.querySelectorAll("nav.tabs [role=tab]")];
function showTab(id, quiet){ let panel=null; tabs.forEach(b=>{const on=b.id===id; b.setAttribute("aria-selected",String(on)); const p=$(b.getAttribute("aria-controls")); p.hidden=!on; if(on) panel=p;}); tip.hidden=true; store.set("tab",id); if(id==="t-craft") renderCraft();
  if(id==="t-cozinha") renderCook(); if(id==="t-mapas") renderMaps(); if(id==="t-mercado") renderBM(); if(id==="t-trab") renderWK(); if(id==="t-matchup") renderMU(); if(id==="t-encantar") renderEN(); if(id==="t-fazenda") renderFZ(); if(id==="t-custo") renderBC();
  moveTabLamp(tabs.find(b=>b.id===id), quiet); addFlourishes(panel||document);
  if(!quiet&&panel){ animatePanel(panel); if(FX.ok&&!RM){ revealOnScroll(); tiltCards(); if(window.ScrollTrigger) ScrollTrigger.refresh(); } } }
function animatePanel(panel){
  if(!window.gsap||RM) return;
  const bk=document.querySelector(".book"); if(bk&&bk.getBoundingClientRect().top<-40&&matchMedia("(min-width:901px)").matches) window.scrollTo({top:bk.getBoundingClientRect().top+scrollY-12,behavior:"smooth"});
  gsap.fromTo(panel,{opacity:0,rotationY:-8,x:-22,transformPerspective:1600,transformOrigin:"0% 50%"},{opacity:1,rotationY:0,x:0,duration:.55,ease:"power3.out",clearProps:"transform,opacity"});
  const cells=panel.querySelectorAll("table.heat td"); if(cells.length) gsap.from(cells,{opacity:0,scale:.86,duration:.28,stagger:{each:.012},ease:"power1.out",clearProps:"opacity,transform"});
  const bars=panel.querySelectorAll(".plot .bar"); if(bars.length) gsap.from(bars,{scaleX:0,duration:.7,stagger:.05,ease:"power3.out",clearProps:"transform"});
  const recs=panel.querySelectorAll("ol.recs li"); if(recs.length) gsap.from(recs,{opacity:0,x:-12,duration:.35,stagger:.05,ease:"power2.out",clearProps:"opacity,transform"});
}
tabs.forEach(b=>b.addEventListener("click",()=>showTab(b.id)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.goto)));
document.querySelectorAll("[data-res]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-res]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); st.res=b.dataset.res; $("resNote").textContent=RES[st.res].note; renderHeat(); calc(true); }));
document.querySelectorAll("[data-g]").forEach(b=>b.addEventListener("click",()=>{ const g=b.dataset.g; document.querySelectorAll(`[data-g="${g}"]`).forEach(x=>x.setAttribute("aria-pressed",String(x===b))); st[g]= g==="sell"?b.dataset.v:parseFloat(b.dataset.v); recompute(g==="sell"); }));
document.querySelectorAll("[data-bc]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-bc]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); st.bc=b.dataset.bc; renderBuilds(); }));
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
function applyMeta(){ if(DATA.ouro){ $("goldV").textContent=fmt(DATA.ouro); $("premV").textContent=fmtS(DATA.ouro*3750); } if(DATA.janela) $("when").textContent=DATA.janela; }
async function loadCraftFamilies(){ const keys=Object.keys(PF.craft).filter(k=>PF.craft[k].lv>0); for(const k of keys){ const [s,m]=k.split("_"); await ensureFamily(s,m); } renderRecs(); renderHero(); }
function recompute(reset){ $("resNote").textContent=RES[st.res].note; renderHeat(); calc(!!reset); renderRecs(); renderHero(); renderBuilds(); if(!$("p-craft").hidden) renderCraft(); if(!$("p-fazenda").hidden&&FARM) renderFZ(); if(!$("p-encantar").hidden&&GEAR) renderEN(); if(LIVE) loadCraftFamilies(); }

loadProfile(); renderProfile(); renderWho(); renderActs("all");
stallIntro();
(async()=>{
  try{ const [p,c,z,g]=await Promise.all([need("precos"),need("cook"),need("zones"),need("gear")]); DATA=p; COOK=c; ZONES=z; GEAR=g; }catch(e){ $("when").textContent="Não consegui abrir os dados do site"; }
  applyMeta();
  const hash=location.hash.slice(1), start=tabs.find(b=>b.id==="t-"+hash)?"t-"+hash:(store.get("tab")||"t-voce"); recompute(true); if($(start)) showTab(start,true);
  loadBuilds(); loadLive();
})();


