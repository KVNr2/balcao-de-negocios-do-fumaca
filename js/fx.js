/* ================= efeitos (GSAP 3.13 + ScrollTrigger + SplitText + DrawSVG) ================= */
const FX = { ok: !!window.gsap };
if (FX.ok) { gsap.registerPlugin(...[window.ScrollTrigger, window.SplitText, window.DrawSVGPlugin].filter(Boolean)); gsap.defaults({ ease: "power2.out", duration: 0.5 }); }

function addFlourishes(root=document){
  root.querySelectorAll("h2:not(.has-fl)").forEach(h=>{
    h.classList.add("has-fl");
    const s=document.createElementNS("http://www.w3.org/2000/svg","svg"); s.setAttribute("class","flourish"); s.setAttribute("viewBox","0 0 240 14"); s.setAttribute("aria-hidden","true");
    s.innerHTML='<path d="M2 7 H96 M144 7 H238" stroke="var(--brass)" stroke-width="1.2" fill="none"/><path d="M120 1 L126 7 L120 13 L114 7 Z" fill="none" stroke="var(--saffron)" stroke-width="1.4"/><path d="M100 7 Q108 1 114 7 M126 7 Q132 13 140 7" stroke="var(--saffron)" stroke-width="1.2" fill="none"/>';
    h.after(s);
  });
}

function coinBurst(fromEl){
  if(!FX.ok||RM) return;
  const r=(fromEl||$("toast")).getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top;
  for(let i=0;i<14;i++){
    const c=document.createElement("span"); c.className="coin"; document.body.append(c);
    gsap.set(c,{x:cx,y:cy,xPercent:-50,yPercent:-50,rotation:gsap.utils.random(-90,90)});
    gsap.timeline({onComplete:()=>c.remove()})
      .to(c,{x:cx+gsap.utils.random(-140,140),y:cy-gsap.utils.random(60,170),rotationY:gsap.utils.random(360,1080),duration:.55,ease:"power2.out"})
      .to(c,{y:"+=220",autoAlpha:0,duration:.7,ease:"power2.in"});
  }
}

function tiltCards(){
  if(!FX.ok||RM||!matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  document.querySelectorAll(".sheet, ol.recs li, .links a, .mu").forEach(card=>{
    if(card.dataset.tilt) return; card.dataset.tilt=1;
    gsap.set(card,{transformPerspective:900});
    const rx=gsap.quickTo(card,"rotationX",{duration:.5,ease:"power3"}), ry=gsap.quickTo(card,"rotationY",{duration:.5,ease:"power3"}), z=gsap.quickTo(card,"y",{duration:.4,ease:"power3"});
    const strength = card.classList.contains("sheet") ? 2.2 : 4;
    card.addEventListener("pointermove",e=>{ const b=card.getBoundingClientRect(); const px=(e.clientX-b.left)/b.width-.5, py=(e.clientY-b.top)/b.height-.5; ry(px*strength); rx(-py*strength); z(-2); card.style.setProperty("--mx",`${(px+.5)*100}%`); card.style.setProperty("--my",`${(py+.5)*100}%`); });
    card.addEventListener("pointerleave",()=>{ rx(0); ry(0); z(0); });
  });
}

function revealOnScroll(){
  if(!FX.ok||RM||!window.ScrollTrigger) return;
  ScrollTrigger.batch(".panel:not([hidden]) .sheet:not(.revealed), .panel:not([hidden]) .tbl:not(.revealed)",{
    start:"top 92%", once:true,
    onEnter:batch=>{ batch.forEach(b=>b.classList.add("revealed")); gsap.from(batch,{autoAlpha:0,y:26,stagger:.08,duration:.6,ease:"power3.out",clearProps:"opacity,visibility"}); }
  });
  if(window.DrawSVGPlugin){
    gsap.utils.toArray(".flourish:not(.drawn)").forEach(f=>{ f.classList.add("drawn"); const ps=f.querySelectorAll("path");
      gsap.fromTo(ps,{drawSVG:"50% 50%"},{drawSVG:"0% 100%",duration:.9,stagger:.08,ease:"power2.inOut",scrollTrigger:{trigger:f,start:"top 95%",once:true}}); });
  }
}

function moveTabLamp(btn, instant){
  const lamp=$("tabLamp"); if(!lamp||!btn) return;
  const navEl=btn.parentElement, nav=navEl.getBoundingClientRect(), b=btn.getBoundingClientRect();
  const vertical=getComputedStyle(navEl).flexDirection==="column";
  const vars=vertical ? {x:0,y:b.top-nav.top-4,height:b.height+10,width:9} : {x:b.left-nav.left+navEl.scrollLeft,y:b.bottom-nav.top-3,width:b.width,height:3};
  if(!vertical&&!instant) btn.scrollIntoView({block:"nearest",inline:"nearest",behavior:RM?"auto":"smooth"});
  if(!FX.ok||RM||instant) gsap.set(lamp,vars); else gsap.to(lamp,{...vars,duration:.45,ease:"back.out(1.6)"});
}


/* nome saindo de um sopro de fumaça de dentro da barraca */
function smokeTitle(tl,chars,sweep){
  const stall=document.querySelector(".stall"), big=$("bigTitle"), NS="http://www.w3.org/2000/svg";
  const lite=matchMedia("(max-width:600px), (pointer:coarse)").matches;
  const sr=stall.getBoundingClientRect(), br=big.getBoundingClientRect();
  const W=Math.round(sr.width), H=Math.round(sr.height), cx=br.left-sr.left+br.width/2;
  const svg=document.createElementNS(NS,"svg"); svg.setAttribute("class","burst"); svg.setAttribute("viewBox",`0 0 ${W} ${H}`); svg.setAttribute("aria-hidden","true");
  svg.innerHTML=`<defs><radialGradient id="burstG"><stop offset="0" stop-color="#efe2c4" stop-opacity=".34"/><stop offset=".55" stop-color="#cdbd9c" stop-opacity=".12"/><stop offset="1" stop-color="#cdbd9c" stop-opacity="0"/></radialGradient>
    <filter id="smokeF" x="-25%" y="-60%" width="150%" height="220%" color-interpolation-filters="sRGB"><feTurbulence id="smTurb" type="fractalNoise" baseFrequency="0.011 0.028" numOctaves="2" seed="7" result="n"/><feDisplacementMap id="smDisp" in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur id="smBlur" in="d" stdDeviation="0"/></filter></defs>`;
  stall.append(svg);
  const puffs=[]; const n=lite?9:14, R=Math.max(60,br.height*.75);
  for(let i=0;i<n;i++){ const rx=gsap.utils.random(R*.6,R*1.25); const e=document.createElementNS(NS,"ellipse"); e.setAttribute("cx",cx); e.setAttribute("cy",H-30); e.setAttribute("rx",rx); e.setAttribute("ry",rx*.78); e.setAttribute("fill","url(#burstG)"); svg.append(e); puffs.push(e); }
  const rise=(br.top-sr.top+br.height/2)-(H-30), spread=Math.max(br.width*.55,140);
  gsap.set(puffs,{opacity:0,scale:.25,transformOrigin:"50% 50%"});
  tl.to(puffs,{opacity:()=>gsap.utils.random(.55,.9),scale:()=>gsap.utils.random(1.1,1.9),x:()=>gsap.utils.random(-spread,spread),y:()=>rise+gsap.utils.random(-50,40),duration:1.25,ease:"power3.out",stagger:{each:.035,from:"center"}},"title")
    .to(puffs,{opacity:0,y:"-=130",x:()=>"+="+gsap.utils.random(-60,60),scale:"+=0.8",duration:1.9,ease:"sine.in",stagger:.03,onComplete:()=>svg.remove()},"title+=1.05");
  gsap.set(chars,{opacity:0});
  if(!lite){
    const o={s:110,b:7,f:0.011}, disp=$("smDisp"), blur=$("smBlur"), turb=$("smTurb");
    tl.add(()=>{ big.style.filter="url(#smokeF)"; },"title+=.3")
      .fromTo(o,{s:110,b:7,f:0.011},{s:0,b:0,f:0.02,duration:1.7,ease:"power2.out",onUpdate:()=>{ disp.setAttribute("scale",o.s.toFixed(1)); blur.setAttribute("stdDeviation",o.b.toFixed(2)); turb.setAttribute("baseFrequency",`${o.f.toFixed(4)} ${(o.f*2.5).toFixed(4)}`); },onComplete:()=>{ big.style.filter=""; }},"title+=.3")
      .fromTo(chars,{opacity:0,y:26,scale:1.35},{opacity:1,y:0,scale:1,duration:1.15,ease:"power3.out",stagger:{each:.08,from:"center"}},"title+=.35");
  } else {
    tl.fromTo(chars,{opacity:0,y:22,scale:1.25,filter:"blur(12px)"},{opacity:1,y:0,scale:1,filter:"blur(0px)",duration:1.05,ease:"power3.out",stagger:{each:.08,from:"center"},clearProps:"filter"},"title+=.35");
  }
  tl.from(".sign .kicker",{opacity:0,y:10,filter:"blur(6px)",duration:.7,ease:"power2.out",clearProps:"filter"},"title+=1.15");
  // clarão das lanternas acendendo as letras
  tl.to(".lantern .glow",{scale:1.7,opacity:1,transformOrigin:"50% 50%",duration:.18,ease:"power2.out"},"title+=1.75")
    .to(".lantern .pane",{fill:"#fff1c9",duration:.18},"title+=1.75")
    .to(".lantern .glow",{scale:1,duration:.9,ease:"power2.inOut"},"title+=1.95")
    .to(".lantern .pane",{fill:"#e8ab45",duration:.9,clearProps:"fill"},"title+=1.95")
    .fromTo(big,{textShadow:"0 0 30px rgba(232,171,69,.35)"},{textShadow:"0 0 46px rgba(255,214,140,.95)",duration:.18,ease:"power2.out",immediateRender:false},"title+=1.75")
    .to(big,{textShadow:"0 0 30px rgba(232,171,69,.35)",duration:1,ease:"power2.inOut"},"title+=1.95")
    .fromTo(sweep,{opacity:1,backgroundPosition:"160% 0"},{backgroundPosition:"-60% 0",duration:.9,ease:"power2.inOut",immediateRender:false},"title+=1.75")
    .set(sweep,{opacity:0});
}

function stallIntro(){
  addFlourishes();
  if(!FX.ok) return;
  const mm=gsap.matchMedia();
  mm.add({motion:"(prefers-reduced-motion: no-preference)"},()=>{
    const tl=gsap.timeline();
    let chars=[$("bigTitle")];
    if(window.SplitText){ const sp=SplitText.create("#bigTitle",{type:"chars",charsClass:"ch"}); chars=sp.chars; }
    const sw=el("span",{class:"sweep","aria-hidden":"true",text:$("bigTitle").textContent}); $("bigTitle").append(sw);
    tl.from(".awning",{scaleY:0,transformOrigin:"50% 0%",duration:.9,ease:"elastic.out(1,.55)"})
      .from(".tassel",{rotation:gsap.utils.wrap([18,-18]),svgOrigin:(i,t)=>t.dataset.o,duration:1.2,ease:"elastic.out(1.2,.3)",stagger:{each:.02,from:"center"}},"<.25")
      .addLabel("title",.35);
    smokeTitle(tl,chars,sw);
    tl.from(".lantern",{y:-90,autoAlpha:0,duration:1.1,stagger:.2,ease:"bounce.out"},"title+=.3")
      .from(".deal > *",{y:16,autoAlpha:0,duration:.5,stagger:.08,clearProps:"opacity,visibility,transform"},"title+=1.1")
      .from(".ledger-book",{x:-40,rotationY:-24,transformPerspective:900,transformOrigin:"0% 50%",autoAlpha:0,duration:.7,ease:"power3.out",clearProps:"transform,opacity,visibility"},"-=.6")
      .from("nav.tabs button, nav.tabs .grp",{x:-14,autoAlpha:0,duration:.32,stagger:.025,clearProps:"opacity,visibility,transform"},"-=.45")
      .add(()=>moveTabLamp(document.querySelector('nav.tabs [aria-selected="true"]'),true));
    // ambient
    const AMB=FX.amb=[]; const amb=t=>(AMB.push(t),t);
    gsap.utils.toArray(".lantern").forEach((g,i)=>amb(gsap.to(g,{rotation:i?-3.4:2.8,svgOrigin:`${g.dataset.ox} 0`,duration:2.4+i*.6,ease:"sine.inOut",yoyo:true,repeat:-1,delay:1.6})));
    gsap.utils.toArray(".glow").forEach(c=>amb(gsap.to(c,{opacity:"random(0.5,1)",scale:"random(0.94,1.06)",transformOrigin:"50% 50%",duration:"random(0.08,0.3)",repeat:-1,repeatRefresh:true,ease:"none",delay:2.6})));
    gsap.utils.toArray(".tassel").forEach((t,i)=>amb(gsap.to(t,{rotation:gsap.utils.random(-4,4),svgOrigin:t.dataset.o,duration:gsap.utils.random(1.6,2.6),yoyo:true,repeat:-1,ease:"sine.inOut",delay:2+i*.03})));
    gsap.utils.toArray(".puff").forEach((p,i)=>{ const t=amb(gsap.timeline({repeat:-1,delay:i*.55}));
      t.fromTo(p,{y:40,scale:.4,autoAlpha:0},{y:-120,scale:1.1,autoAlpha:.55,duration:3.2,ease:"sine.out"}).to(p,{y:-300,scale:1.9,autoAlpha:0,duration:3.6,ease:"sine.in"});
      amb(gsap.to(p,{x:"+=34",duration:2.4+i*.25,yoyo:true,repeat:-1,ease:"sine.inOut"})); });
    amb(gsap.to("#bigTitle",{textShadow:"0 0 46px rgba(232,171,69,.6)",duration:2.4,yoyo:true,repeat:-1,ease:"sine.inOut",delay:3.6}));
    // fora da tela ou com a aba escondida, a fumaça e as lanternas param
    let onScreen=true; const sync=()=>{ const run=onScreen&&!document.hidden; AMB.forEach(t=>run?t.resume():t.pause()); };
    if("IntersectionObserver" in window){ const io=new IntersectionObserver(es=>{ onScreen=es[0].isIntersecting; sync(); },{rootMargin:"40px"}); io.observe(document.querySelector(".stall")); }
    document.addEventListener("visibilitychange",sync);
    if(window.ScrollTrigger){
      gsap.to(".lanterns",{yPercent:22,ease:"none",scrollTrigger:{trigger:".stall",start:"top top",end:"bottom top",scrub:true}});
      gsap.to(".smoke",{yPercent:-18,ease:"none",scrollTrigger:{trigger:".stall",start:"top top",end:"bottom top",scrub:true}});
      gsap.to(".sign",{yPercent:12,autoAlpha:.4,ease:"none",scrollTrigger:{trigger:".stall",start:"top top",end:"bottom top",scrub:true}});
    }
    revealOnScroll(); tiltCards();
  });
  mm.add({reduce:"(prefers-reduced-motion: reduce)"},()=>{ moveTabLamp(document.querySelector('nav.tabs [aria-selected="true"]'),true); });
  window.addEventListener("resize",()=>moveTabLamp(document.querySelector('nav.tabs [aria-selected="true"]'),true));
}

