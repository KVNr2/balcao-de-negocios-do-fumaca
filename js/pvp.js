/* ================= aba PVP: o que os jogadores que mais lutam usam em cada conteúdo (servidor US) ================= */
let PVP = null, pvC = "hg2", pvV = "build", pvT = 0, pvSort = "wilson", pvOpen = null;
const PV_CONT = [["hg2","Hellgate 2v2"],["hg5","Hellgate 5v5"],["corrompida","Corrompidas"],["solo","Brumas (solo)"],["depths","Depths"]];
const PV_TAM = t => t===1?"Solo":`Grupo de ${t}`;
const pvWilson = (v,n) => { if(!n) return 0; const z=1.64, p=v/n, d=1+z*z/n; return (p+z*z/(2*n)-z*Math.sqrt((p*(1-p)+z*z/(4*n))/n))/d; };
const pvKey = k => { const [w,o]=k.split("|"); return {w,o}; };
/* nível da arma pelo winrate puxado para 50% quanto menos lutas (6 lutas de peso): S 58%+, A 52%+, B 46%+, C abaixo; com menos de 5 usos fica sem nível */
let pvArmO="usos",pvArmOpen=false;
const pvTier=(v,n)=>{ if(n<5) return "?"; const w=(v+3)/(n+6); return w>=0.58?"S":w>=0.52?"A":w>=0.46?"B":"C"; };
const pvNome = k => { const {w,o}=pvKey(k); buildIdx(); return codeName(w)+(o?" + "+codeName(o):""); };
function pvPrep(b){ if(b.nome) return; buildIdx(); b.nome=codeName(b.wc); b.l=(W2LINE&&W2LINE[b.wc])||""; b.t=b.nome; b.pop=0; b.tg=[]; if(b.o&&!Array.isArray(b.o)) b.o=[b.o]; }
/* builds fortes/fracas: só o ícone da arma (com o %); ao clicar mostra o nome, as lutas e deixa abrir aquela build */
function pvRel(titulo,dica,lista,cls,b,d){
  const bx=el("div",{class:"pv-rel "+cls}); bx.append(el("h4",{text:titulo}),el("p",{class:"tiny muted",text:dica}));
  if(!lista.length){ bx.append(el("p",{class:"small muted",text:"Sem amostra suficiente (mínimo de 3 lutas contra cada build)."})); return bx; }
  const row=el("div",{class:"pv-ic"}), det=el("div",{class:"pv-det"}); det.hidden=true; const pre=b.id.split(":")[0]; let ativo=null;
  for(const [k,p,n] of lista){ const {w}=pvKey(k); const bt=el("button",{type:"button",class:"pv-i","aria-pressed":"false",title:`${pvNome(k)}: ${p}% em ${n} lutas`}); bt.append(itemImg(w,[4,5,6,7,8,3]),el("small",{text:p+"%"}));
    bt.addEventListener("click",()=>{ if(ativo===bt){ det.hidden=true; bt.setAttribute("aria-pressed","false"); ativo=null; return; } if(ativo) ativo.setAttribute("aria-pressed","false"); ativo=bt; bt.setAttribute("aria-pressed","true"); det.hidden=false; det.textContent="";
      det.append(el("b",{text:pvNome(k)}),el("span",{text:` · ${p}% das lutas entre as duas, em ${n} lutas`}));
      const alvo=d.builds.find(x=>x.id===pre+":"+k); if(alvo){ const ab=el("button",{type:"button",class:"btn mn-craft",text:"Abrir essa build"}); ab.addEventListener("click",()=>{ pvOpen=alvo.id; renderPvp(); }); det.append(ab); } });
    row.append(bt); }
  bx.append(row,det); return bx;
}
function pvStats(b,d){
  const box=el("div",{class:"pv-stats"});
  const tot=Math.max(1,b.n), pv=100*b.v/tot;
  const hd=el("div",{class:"pv-head"}); const big=el("div",{class:"pv-big"}); big.append(el("b",{text:b.wr.toLocaleString("pt-BR")+"%"}),el("small",{text:"winrate"}));
  const bar=el("div",{class:"pv-bar",title:`${b.v} vitórias · ${b.d} derrotas`}); bar.append(el("i",{class:"w",style:`width:${pv}%`}),el("i",{class:"l",style:`width:${100-pv}%`}));
  const lg=el("div",{class:"pv-lg"}); lg.append(el("span",{class:"w",text:`${b.v} vitórias`}),el("span",{class:"l",text:`${b.d} derrotas`}));
  const mid=el("div",{class:"pv-hm"}); mid.append(bar,lg); hd.append(big,mid); box.append(hd);
  const resumo=el("div",{class:"pv-sum"});
  [["Lutas",b.n],["Jogadores",b.jog],["IP médio em luta",b.ip||"?"]].forEach(([k,v])=>resumo.append(el("div",{class:"pv-st"},el("b",{text:String(v)}),el("small",{text:k}))));
  hd.append(resumo);
  const two=el("div",{class:"pv-two"});
  two.append(pvRel("Fortes contra esta build","Builds que mais vencem esta. Clique no ícone.",b.counter||[],"bad",b,d),pvRel("Fracas contra esta build","Builds que esta vence com mais frequência. Clique no ícone.",b.fraco||[],"good",b,d)); box.append(two);
  if((b.parc||[]).length){ const bx=el("div",{class:"pv-rel"}); bx.append(el("h4",{text:"Joga junto"}),el("p",{class:"tiny muted",text:"Builds que estavam no mesmo grupo nas vitórias."})); const row=el("div",{class:"pv-ic"}); for(const [k,g] of b.parc){ const bt=el("span",{class:"pv-i",title:`${pvNome(k)}: ${g} vitórias juntos`}); bt.append(itemImg(pvKey(k).w,[4,5,6,7,8,3]),el("small",{text:`${g}×`})); row.append(bt); } bx.append(row); box.append(bx); }
  box.append(el("p",{class:"tiny muted",text:"O jogo não informa as habilidades usadas em cada morte. As habilidades da build abaixo são as mais indicadas pela comunidade (AlbionOnlineGrind) para essa arma neste conteúdo."}));
  return box;
}
function pvCard(b,d){
  pvPrep(b); b._qi=[]; const open=pvOpen===b.id; const card=el("article",{class:"bcard"+(open?" open":"")});
  const top=el("div",{class:"bc-top"}); const wi=qImg(b,"w",b.w,"nico zbig"); top.append(wi||el("span",{class:"btile"}));
  const mid=el("div",{class:"bc-mid"}); const h4=el("h4"); h4.append(el("span",{text:b.t})); mid.append(h4);
  const nv=gbSpec(b), lv=nv>=SPEC_MIN?3:nv>0?2:0; const meta=el("div",{class:"bc-meta"});
  meta.append(el("span",{class:"tag",text:`${b.v}V · ${b.d}D`}),el("span",{class:"tag mute",text:`${b.jog} ${b.jog===1?"jogador":"jogadores"}`}));
  if(b.l) meta.append(el("span",{class:"tag"+(lv>=2?" good":""),text:nv?`${b.nome}: spec ${nv}`:`${b.nome}: sem spec`}));
  const gaps=gbGaps(b); if(gaps.length) meta.append(el("span",{class:"tag bad",text:`Sem spec em ${gaps.join(" e ")}`}));
  mid.append(meta); top.append(mid);
  const ib=albionBadge(b); const rt=el("div",{class:"bc-r"});
  const wr=el("div",{class:"pv-wc",title:`${b.v} vitórias e ${b.d} derrotas. Winrate = vitórias ÷ lutas.`}); wr.append(el("b",{text:b.wr.toLocaleString("pt-BR")+"%"}),el("small",{text:`winrate em ${b.n} ${b.n===1?"luta":"lutas"}`}));
  h4.append(wr); rt.append(ib); top.append(rt); card.append(top); card.append(gbStrip(b));
  const btn=el("button",{type:"button",class:"bc-more bc-tog","aria-expanded":String(open),text:open?"Fechar ▴":"Abrir ▾"}); btn.addEventListener("click",()=>{ pvOpen=open?null:b.id; renderPvp(); });
  const act=el("div",{class:"bc-act"}); act.append(btn,albionBar(b,ib,"pv:"+b.id,{costHost:card})); card.append(act);
  if(open){ card.append(kbPanel(b),pvStats(b,d)); qMoveTop(card); }
  return card;
}
function pvJog(p,d){
  const r=el("div",{class:"pv-pl"}); const l=el("div",{class:"pv-pl-n"}); l.append(el("b",{text:p.nome}),el("small",{class:"muted",text:(p.guild||"sem guilda")+(p.xp!=null?` · fama de PvP: ${p.xp} mi`:"")})); r.append(l);
  const s=el("div",{class:"pv-pl-s"}); s.append(el("b",{text:p.wr.toLocaleString("pt-BR")+"%",title:"winrate"}),el("small",{text:`${p.v} ${p.v===1?"kill":"kills"} · ${p.d} ${p.d===1?"morte":"mortes"} · ${p.n} lutas`}),el("small",{text:p.ip?`IP ${p.ip}`:""})); r.append(s);
  const bs=el("div",{class:"pv-pb"});
  for(const [k,q,g] of p.b){ const {w,o}=pvKey(k); let src=g&&Object.keys(g).length?g:null, tip=false;
    if(!src){ const ref=(d.builds||[]).find(x=>x.id.endsWith(":"+k)); if(ref){ src=ref; tip=true; } }
    const bb={id:"pj:"+p.nome+k,wc:w,w:(src&&src.w&&(Array.isArray(src.w)?src.w[0]:src.w))||"",o:src&&src.o,h:src&&src.h,a:src&&src.a,s:src&&src.s,c:src&&src.c,p:src&&src.p,f:src&&src.f,ip:p.ip}; if(bb.o&&!Array.isArray(bb.o)) bb.o=[bb.o]; bb.nome=codeName(w); bb._qi=[];
    const ln=el("div",{class:"pv-bl"}); const hd=el("div",{class:"pv-bn"}); const wi=bb.w?qImg(bb,"w",bb.w,"nico zbig"):null; hd.append(wi||tile(w,"",""));
    const nm=el("div",{class:"pv-bt"}); nm.append(el("b",{text:pvNome(k)}),el("small",{class:"muted",text:`${q} ${q===1?"luta":"lutas"} com esta build`+(tip?" · peças mais usadas nesta build":"")})); hd.append(nm); ln.append(hd);
    if(src){ try{ ln.append(gbStrip(bb)); }catch(e){} } bs.append(ln); }
  r.append(bs); return r;
}
function renderPvp(){
  const host=$("pvList"); if(!host) return;
  if(!PVP){ if(!renderPvp._l){ renderPvp._l=1; need("pvp").then(d=>{ PVP=d; renderPvp(); }).catch(()=>{ $("pvNote").textContent="Os dados do PVP ainda não foram gerados. Eles aparecem depois da primeira atualização automática."; }); } return; }
  const j=PVP.janela; $("pvNote").textContent=`${PVP.fonte}. ${Object.values(PVP.conteudos).reduce((a,c)=>a+c.builds.length,0).toLocaleString("pt-BR")} builds, vindas de ${j.eventos.toLocaleString("pt-BR")} mortes dos últimos ${j.dias} dias · atualizado em ${new Date(PVP.atualizado).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}.`;
  const cs=$("pvCont"); cs.textContent=""; for(const [k,n] of PV_CONT){ const tot=Object.keys(PVP.conteudos).filter(x=>x.startsWith(k+":")).reduce((a,x)=>a+PVP.conteudos[x].builds.length,0); const b=el("button",{type:"button","aria-pressed":String(pvC===k),text:`${n} (${tot} ${tot===1?"build":"builds"})`}); b.addEventListener("click",()=>{ pvC=k; pvT=0; pvOpen=null; renderPvp(); }); cs.append(b); }
  const tams=Object.keys(PVP.conteudos).filter(x=>x.startsWith(pvC+":")).map(x=>+x.split(":")[1]).sort((a,b)=>a-b);
  if(!tams.includes(pvT)) pvT=tams[tams.length-1]||0;
  const ts=$("pvTam"); ts.textContent=""; for(const t of tams){ const b=el("button",{type:"button","aria-pressed":String(pvT===t),text:PV_TAM(t)}); b.addEventListener("click",()=>{ pvT=t; pvOpen=null; renderPvp(); }); ts.append(b); }
  const vs=$("pvView"); vs.textContent=""; for(const [k,n] of [["build","Por build"],["jog","Por jogador"]]){ const b=el("button",{type:"button","aria-pressed":String(pvV===k),text:n}); b.addEventListener("click",()=>{ pvV=k; pvOpen=null; renderPvp(); }); vs.append(b); }
  $("pvSortW").hidden=pvV!=="build"; $("pvJSortW").hidden=pvV!=="jog"; $("pvRefresh").hidden=pvV!=="build";
  host.textContent=""; const d=PVP.conteudos[`${pvC}:${pvT}`];
  if(!d){ host.append(el("p",{class:"empty",text:"Sem amostra suficiente neste conteúdo e tamanho de grupo."})); return; }
  if(pvV==="jog"){
    let l=d.jogadores.slice(), js=$("pvJSort").value||"kills";
    l.sort(js==="wilson"?(a,b)=>pvWilson(b.v,b.n)-pvWilson(a.v,a.n):js==="n"?(a,b)=>b.n-a.n||b.v-a.v:(a,b)=>b.v-a.v||b.wr-a.wr);
    $("pvCount").textContent=`${l.length} jogadores com 5 lutas ou mais${PVP.janela.fama_min?`, todos com ${PVP.janela.fama_min} mi de fama de PvP ou mais`:""}`;
    const pg=pgSlice("pvJ",l,[pvC,pvT,pvV,js].join("|"),renderPvp); pg.items.forEach(p=>host.append(pvJog(p,d))); host.append(pg.bar); return;
  }
  if(d.armas&&d.armas.length){ const bx=el("details",{class:"pv-arm"}); if(pvArmOpen) bx.open=true; bx.addEventListener("toggle",()=>{ pvArmOpen=bx.open; });
    const sh=a=>(a[2]+3)/(a[1]+6); const el5=d.armas.filter(a=>a[1]>=5).sort((a,b)=>sh(b)-sh(a)); const tr=new Map(); el5.forEach((a,i)=>{ const p=(i+.5)/el5.length; tr.set(a[0],p<=.2?"S":p<=.5?"A":p<=.8?"B":"C"); });
    const sm=el("summary",{class:"pv-arm-t"}); sm.append(el("h4",{text:"Tier list de armas"}),el("small",{class:"muted",text:"Níveis S a C por winrate e usos"})); bx.append(sm);
    const hd=el("div",{class:"pv-arm-h"});
    const sg=el("div",{class:"pv-arm-s",role:"group","aria-label":"Ordenar armas"}); const ord={usos:"Mais usadas",wr:"Maior winrate",nivel:"Melhor nível"};
    Object.keys(ord).forEach(k=>{ const bt=el("button",{type:"button",class:"pv-chip"+(pvArmO===k?" on":""),text:ord[k]}); bt.onclick=()=>{ pvArmO=k; pvArmOpen=true; renderPvp(); }; sg.append(bt); }); hd.append(sg);
    bx.append(hd,el("small",{class:"muted",text:"Soma de todas as builds da arma. Nível compara as armas desta lista pelo winrate (ajustado quando há poucas lutas): S = 20% melhores, A = próximos 30%, B = 30% seguintes, C = restante. Armas com menos de 5 usos ficam sem nível."}));
    const L=d.armas.slice(); const ro={S:0,A:1,B:2,C:3}; if(pvArmO==="wr") L.sort((a,b)=>b[4]-a[4]||b[1]-a[1]); else if(pvArmO==="nivel") L.sort((a,b)=>(ro[tr.get(a[0])]??9)-(ro[tr.get(b[0])]??9)||sh(b)-sh(a)); else L.sort((a,b)=>b[1]-a[1]);
    const mx=Math.max(...L.map(a=>a[1])); const tb=el("table",{class:"pv-armt"}); const th=tb.createTHead().insertRow(); ["#","Arma","Nível","Winrate","Usos"].forEach(t=>th.append(el("th",{text:t})));
    const bd=tb.createTBody(); L.forEach(([w,n,v,dd,wr],i)=>{ const r=bd.insertRow(); r.insertCell().textContent=i+1; const c1=r.insertCell(); const aw=el("div",{class:"pv-an"}); c1.append(aw); const im=itemImg(w,[8,7,6,5,4]); if(im){ im.classList.add("pv-ai"); aw.append(im); } aw.append(el("b",{text:codeName(w)}));
      const nv=tr.get(w)||"?"; r.insertCell().append(el("span",{class:"pv-tier t"+nv,title:nv==="?"?"Poucos usos para dar um nível":"Posição entre as armas da lista, pelo winrate ajustado",text:nv}));
      const cw=r.insertCell(); cw.className="pv-wc"; cw.append(el("span",{class:"pv-wrb"+(wr>=50?" up":" dn"),style:`width:${Math.min(100,Math.max(4,wr))}%`}),el("span",{class:"pv-wrn",text:wr.toLocaleString("pt-BR")+"%"}));
      const c3=r.insertCell(); c3.className="pv-us"; c3.append(el("span",{class:"pv-bar",style:`width:${Math.max(4,Math.round(n/mx*100))}%`}),el("span",{class:"pv-un",text:String(n)})); });
    const wp=el("div",{class:"pv-armw"}); wp.append(tb); bx.append(wp); host.append(bx); }
  let l=d.builds.slice(); pvSort=$("pvSort").value||pvSort;
  if(pvSort==="wilson") l.sort((a,b)=>pvWilson(b.v,b.n+0)-pvWilson(a.v,a.n)); else if(pvSort==="wr") l.sort((a,b)=>b.wr-a.wr||b.n-a.n); else if(pvSort==="spec"){ l.forEach(pvPrep); l.sort((a,b)=>(gbSpec(b)-gbSpec(a))||(b.n-a.n)); } else l.sort((a,b)=>b.n-a.n);
  $("pvCount").textContent=`${l.length} builds com 4 lutas ou mais · ${d.eventos.toLocaleString("pt-BR")} mortes${PVP.janela.fama_min?` de jogadores com ${PVP.janela.fama_min} mi de fama de PvP ou mais`:""}`;
  const pg=pgSlice("pvB",l,[pvC,pvT,pvV,pvSort].join("|"),renderPvp); pg.items.forEach(b=>host.append(pvCard(b,d))); host.append(pg.bar);
}
{ const s=$("pvSort"); if(s) s.addEventListener("change",()=>{ pvSort=s.value; renderPvp(); }); const sj=$("pvJSort"); if(sj) sj.addEventListener("change",renderPvp);
  const r=$("pvRefresh"); if(r) r.addEventListener("click",async()=>{ if(r.disabled) return; r.disabled=true; const old=r.textContent; r.textContent="Atualizando…"; FORCE=true;
    try{ await Promise.all([...BLD_PANELS].filter(p=>p.isConnected).map(p=>p._upd(true))); r.textContent="Atualizado "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); }
    catch(e){ r.textContent="Não consegui atualizar"; }
    finally{ FORCE=false; setTimeout(()=>{ r.disabled=false; if(r.textContent!=="Atualizando…") r.textContent=old; },4000); } }); }
