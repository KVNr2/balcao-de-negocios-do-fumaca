/* ================= aba PVP: o que os jogadores que mais lutam usam em cada conteúdo (servidor US) ================= */
let PVP = null, pvC = "hg2", pvV = "build", pvT = 0, pvSort = "wilson", pvOpen = null, pvExp = false;
const PV_XP = 50;   // fama de PvP total (em milhões) para contar como experiente
const PV_CONT = [["hg2","Hellgate 2v2"],["hg5","Hellgate 5v5"],["corrompida","Corrompidas"],["solo","Brumas (solo)"],["depths","Depths"]];
const PV_TAM = t => t===1?"Solo":`Grupo de ${t}`;
const pvWilson = (v,n) => { if(!n) return 0; const z=1.64, p=v/n, d=1+z*z/n; return (p+z*z/(2*n)-z*Math.sqrt((p*(1-p)+z*z/(4*n))/n))/d; };
const pvKey = k => { const [w,o]=k.split("|"); return {w,o}; };
const pvNome = k => { const {w,o}=pvKey(k); buildIdx(); return codeName(w)+(o?" + "+codeName(o):""); };
function pvPrep(b){ if(b.nome) return; buildIdx(); b.nome=codeName(b.wc); b.l=(W2LINE&&W2LINE[b.wc])||""; b.t=b.nome; b.pop=0; b.tg=[]; if(b.o&&!Array.isArray(b.o)) b.o=[b.o]; }
function pvRel(titulo,dica,lista){
  const bx=el("div",{class:"pv-rel"}); bx.append(el("h4",{text:titulo}),el("p",{class:"tiny muted",text:dica}));
  if(!lista.length){ bx.append(el("p",{class:"small muted",text:"Sem amostra suficiente (mínimo de 3 lutas contra cada build)."})); return bx; }
  const row=el("div",{class:"cc-row sum"}); for(const [k,p,n] of lista){ const {w}=pvKey(k); row.append(tile(w,pvNome(k),`${p}% em ${n} lutas`)); } bx.append(row); return bx;
}
function pvStats(b,d){
  const box=el("div",{class:"pv-stats"});
  const resumo=el("div",{class:"pv-sum"});
  [["Lutas",b.n],["Vitórias",b.v],["Derrotas",b.d],["Jogadores",b.jog],["IP médio em luta",b.ip||"?"]].forEach(([k,v])=>resumo.append(el("div",{class:"v-card"},el("small",{class:"v-k",text:k}),el("b",{text:String(v)}))));
  box.append(resumo);
  box.append(pvRel("Fortes contra esta build","Builds que mais vencem esta, entre as que aparecem nos mesmos combates.",b.counter||[]));
  box.append(pvRel("Fracas contra esta build","Builds que esta vence com mais frequência.",b.fraco||[]));
  if((b.parc||[]).length){ const bx=el("div",{class:"pv-rel"}); bx.append(el("h4",{text:"Joga junto"}),el("p",{class:"tiny muted",text:"Builds que estavam no mesmo grupo nas vitórias."})); const row=el("div",{class:"cc-row sum"}); for(const [k,g] of b.parc){ row.append(tile(pvKey(k).w,pvNome(k),`${g} vitórias`)); } bx.append(row); box.append(bx); }
  box.append(el("p",{class:"tiny muted",text:"O jogo não informa as habilidades usadas em cada morte. As habilidades da build acima são as mais indicadas pela comunidade (AlbionOnlineGrind) para essa arma neste conteúdo."}));
  return box;
}
function pvCard(b,d){
  pvPrep(b); b._qi=[]; const open=pvOpen===b.id; const card=el("article",{class:"bcard"+(open?" open":"")});
  const top=el("div",{class:"bc-top"}); const wi=qImg(b,"w",b.w,"nico zbig"); top.append(wi||el("span",{class:"btile"}));
  const mid=el("div",{class:"bc-mid"}); const h4=el("h4"); h4.append(el("span",{text:b.t})); mid.append(h4);
  const nv=gbSpec(b), lv=nv>=SPEC_MIN?3:nv>0?2:0; const meta=el("div",{class:"bc-meta"});
  meta.append(el("span",{class:"tag",text:`${b.n} lutas`}),el("span",{class:"tag mute",text:`${b.jog} ${b.jog===1?"jogador":"jogadores"}`}));
  if(b.l) meta.append(el("span",{class:"tag"+(lv>=2?" good":""),text:nv?`${b.nome}: spec ${nv}`:`${b.nome}: sem spec`}));
  const gaps=gbGaps(b); if(gaps.length) meta.append(el("span",{class:"tag bad",text:`Sem spec em ${gaps.join(" e ")}`}));
  mid.append(meta); top.append(mid);
  const ib=albionBadge(b); const rt=el("div",{class:"bc-r"});
  const wr=el("div",{class:"pv-wr",title:`${b.v} vitórias e ${b.d} derrotas. Winrate = vitórias ÷ lutas.`}); wr.append(el("b",{text:b.wr.toLocaleString("pt-BR")+"%"}),el("small",{text:"winrate"}));
  h4.append(wr); rt.append(ib); top.append(rt); card.append(top); card.append(gbStrip(b));
  const btn=el("button",{type:"button",class:"bc-more bc-tog","aria-expanded":String(open),text:open?"Fechar ▴":"Abrir ▾"}); btn.addEventListener("click",()=>{ pvOpen=open?null:b.id; renderPvp(); });
  const act=el("div",{class:"bc-act"}); act.append(btn,albionBar(b,ib,"pv:"+b.id,{costHost:card})); card.append(act);
  if(open){ card.append(kbPanel(b),pvStats(b,d)); qMoveTop(card); }
  return card;
}
function pvJog(p){
  const r=el("div",{class:"pv-pl"}); const l=el("div",{class:"pv-pl-n"}); l.append(el("b",{text:p.nome}),el("small",{class:"muted",text:(p.guild||"sem guilda")+(p.xp!=null?` · fama de PvP: ${p.xp} mi`:"")})); r.append(l);
  const s=el("div",{class:"pv-pl-s"}); s.append(el("b",{text:p.wr.toLocaleString("pt-BR")+"%",title:"winrate"}),el("small",{text:`${p.v}V · ${p.d}D`}),el("small",{text:p.ip?`IP ${p.ip}`:""})); r.append(s);
  const bs=el("div",{class:"cc-row sum"}); for(const [k,q] of p.b) bs.append(tile(pvKey(k).w,pvNome(k),`${q}×`)); r.append(bs); return r;
}
function renderPvp(){
  const host=$("pvList"); if(!host) return;
  if(!PVP){ if(!renderPvp._l){ renderPvp._l=1; need("pvp").then(d=>{ PVP=d; renderPvp(); }).catch(()=>{ $("pvNote").textContent="Os dados do PVP ainda não foram gerados. Eles aparecem depois da primeira atualização automática."; }); } return; }
  const j=PVP.janela; $("pvNote").textContent=`${PVP.fonte}. ${j.eventos.toLocaleString("pt-BR")} mortes dos últimos ${j.dias} dias · atualizado em ${new Date(PVP.atualizado).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}.`;
  const cs=$("pvCont"); cs.textContent=""; for(const [k,n] of PV_CONT){ const tot=Object.keys(PVP.conteudos).filter(x=>x.startsWith(k+":")).reduce((a,x)=>a+PVP.conteudos[x].eventos,0); const b=el("button",{type:"button","aria-pressed":String(pvC===k),text:`${n} (${tot})`}); b.addEventListener("click",()=>{ pvC=k; pvT=0; pvOpen=null; renderPvp(); }); cs.append(b); }
  const tams=Object.keys(PVP.conteudos).filter(x=>x.startsWith(pvC+":")).map(x=>+x.split(":")[1]).sort((a,b)=>a-b);
  if(!tams.includes(pvT)) pvT=tams[tams.length-1]||0;
  const ts=$("pvTam"); ts.textContent=""; for(const t of tams){ const b=el("button",{type:"button","aria-pressed":String(pvT===t),text:PV_TAM(t)}); b.addEventListener("click",()=>{ pvT=t; pvOpen=null; renderPvp(); }); ts.append(b); }
  const vs=$("pvView"); vs.textContent=""; for(const [k,n] of [["build","Por build"],["jog","Por jogador"]]){ const b=el("button",{type:"button","aria-pressed":String(pvV===k),text:n}); b.addEventListener("click",()=>{ pvV=k; pvOpen=null; renderPvp(); }); vs.append(b); }
  $("pvSortW").hidden=pvV!=="build"; $("pvRefresh").hidden=pvV!=="build"; $("pvExp").checked=pvExp;
  host.textContent=""; const d=PVP.conteudos[`${pvC}:${pvT}`];
  if(!d){ host.append(el("p",{class:"empty",text:"Sem amostra suficiente neste conteúdo e tamanho de grupo."})); return; }
  if(pvV==="jog"){
    let l=d.jogadores.slice(); if(pvExp) l=l.filter(p=>(p.xp||0)>=PV_XP); l.sort((a,b)=>(pvWilson(b.v,b.n)-pvWilson(a.v,a.n)));
    $("pvCount").textContent=`${l.length} jogadores com 5 lutas ou mais`+(pvExp?" · só experientes":"");
    const pg=pgSlice("pvJ",l,[pvC,pvT,pvV].join("|"),renderPvp); pg.items.forEach(p=>host.append(pvJog(p))); host.append(pg.bar); return;
  }
  let l=d.builds.slice(); if(pvExp) l=l.map(b=>{ const n=(b.vx||0)+(b.dx||0); return {...b,v:b.vx||0,d:b.dx||0,n,wr:n?Math.round(1000*(b.vx||0)/n)/10:0}; }).filter(b=>b.n>=4); pvSort=$("pvSort").value||pvSort;
  if(pvSort==="wilson") l.sort((a,b)=>pvWilson(b.v,b.n+0)-pvWilson(a.v,a.n)); else if(pvSort==="wr") l.sort((a,b)=>b.wr-a.wr||b.n-a.n); else if(pvSort==="spec"){ l.forEach(pvPrep); l.sort((a,b)=>(gbSpec(b)-gbSpec(a))||(b.n-a.n)); } else l.sort((a,b)=>b.n-a.n);
  $("pvCount").textContent=`${l.length} builds com 4 lutas ou mais`+(pvExp?" de jogadores experientes":` · ${d.eventos.toLocaleString("pt-BR")} mortes`);
  const pg=pgSlice("pvB",l,[pvC,pvT,pvV,pvSort].join("|"),renderPvp); pg.items.forEach(b=>host.append(pvCard(b,d))); host.append(pg.bar);
}
{ const s=$("pvSort"); if(s) s.addEventListener("change",()=>{ pvSort=s.value; renderPvp(); });
  const x=$("pvExp"); if(x) x.addEventListener("change",()=>{ pvExp=x.checked; pvOpen=null; renderPvp(); });
  const r=$("pvRefresh"); if(r) r.addEventListener("click",async()=>{ if(r.disabled) return; r.disabled=true; const old=r.textContent; r.textContent="Atualizando…"; FORCE=true;
    try{ await Promise.all([...BLD_PANELS].filter(p=>p.isConnected).map(p=>p._upd(true))); r.textContent="Atualizado "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }
    catch(e){ r.textContent="Não consegui atualizar"; }
    finally{ FORCE=false; setTimeout(()=>{ r.disabled=false; if(r.textContent!=="Atualizando…") r.textContent=old; },4000); } }); }
