/* ================= Plano do dia =================
   1) Foco do dia: reparte o foco que você tem entre refinar, fabricar, cozinhar e regar, do que mais rende por ponto
      de foco para o que menos, até o foco acabar. Cada uso tem um teto: o que o mercado vende por dia (não adianta
      fabricar mais do que vende) ou, na rega, as sementes que cabem nos seus lotes.
   2) Da ilha até a venda: com os seus lotes, compara vender a colheita, criar animais e cozinhar com o que a ilha
      produz, e mostra o passo a passo do que rende mais (plantar, cozinhar, levar e vender). */
let PL_READY=false, PL_P=null;
const plTax=()=>1-taxOf(), plField=()=>st.sell==="instant"?1:0;
async function plEnsure(note){
  if(PL_READY) return true;
  if(!PL_P) PL_P=(async()=>{
    note.textContent="Abrindo receitas, fazenda e preços…";
    if(!BM) BM=await need("bm").catch(()=>null);
    if(!FARM) FARM=await need("farm");
    await Promise.all([ensureCook(),ensureFZ()]);
    PL_READY=true; return true; })().catch(()=>{ PL_P=null; return false; });
  return PL_P;
}
/* prata a mais por ponto de foco num item da oficina (refino ou fabricação), pelos preços típicos */
function plOfItem(it){
  const fc1=Math.max(1,Math.round(it.focus*Math.pow(0.5,(it.fce||0)/10000)));
  let mat=0, art=0; for(const g of it.ing){ const p=typical(g.id,0); if(!p) return null; if(g.art) art+=g.n*p.p; else mat+=g.n*p.p; }
  const sale=typical(it.id,plField()); if(!sale) return null;
  const rN=rrr(it.bonus,false,st.daily), rF=rrr(it.bonus,true,st.daily), fee=it.fee*feeVal()/100;
  const profitF=it.q*sale.p*plTax()-mat*(1-rF)-art-fee; if(!(profitF>0)) return null;
  const gain=(rF-rN)*mat; return {id:it.id,name:it.name,city:it.city,q:it.q,t:it.t,e:it.e,fc1,gain,spf:gain/fc1,profitF,thin:sale.n<2,invest:mat*(1-rF)+art+fee,sale:sale.p};
}
function plCandidates(){
  const out=[];
  for(const it of ofItems("refine")){ const m=plOfItem(it); if(m) out.push({...m,kind:"Refinar",unit:"unidades"}); }
  if(BM){ const sv=[OF.tier,OF.ench]; OF.tier=0; OF.ench=-1;
    try{ for(const it of ofItems("g:*tudo")){ const m=plOfItem(it); if(m) out.push({...m,kind:"Fabricar",unit:"peças"}); } } finally{ [OF.tier,OF.ench]=sv; } }
  for(const id in COOK.r){ const m=cookModel(id); if(!m||m.miss||m.thin||!(m.p1>0)||!(m.spf>0)) continue;
    out.push({id,name:m.name,city:COOK_CITY[m.kind],q:m.q,fc1:m.fc,gain:m.p1-m.p0,spf:m.spf,profitF:m.p1,kind:m.kind==="f"?"Cozinhar":"Preparar",unit:m.kind==="f"?"fornadas":"fornadas",cook:true}); }
  /* rega: a planta que você colocaria nos seus lotes (a de maior lucro regando), com teto nas sementes que cabem */
  const L=ilhaL()||(+$("fzPlots").value||0);
  if(L>0){ const pl=FARM.p.map(plantModel).filter(Boolean).filter(m=>m.p1>0&&m.spf>0).sort((a,b)=>b.p1-a.p1)[0];
    if(pl) out.push({id:pl.crop,name:`${fzName(pl.crop)} (${fmt(9*L)} sementes nos seus ${fmt(L)} lotes)`,city:"sua ilha",q:1,fc1:pl.fc,gain:pl.p1-pl.p0,spf:pl.spf,profitF:pl.p1,kind:"Regar",unit:"sementes",cap:9*L}); }
  return out;
}
async function renderPlanoFoco(){
  const box=$("plFoco"), note=$("plNote"); box.textContent="";
  const bud=focBud(); if(!(bud>0)){ box.append(el("p",{class:"muted",text:"Sem foco para gastar. Informe acima quanto foco você tem."})); return; }
  let cand=plCandidates().sort((a,b)=>b.spf-a.spf);
  /* teto pelo mercado: só os primeiros da lista precisam do histórico de vendas */
  const top=cand.slice(0,80); await histFetch(top.flatMap(c=>c.kind==="Regar"?[]:SHOP_LOCS.map(l=>nk(c.id)+"|"+l)));
  let left=bud; const plan=[];
  for(const c of top){ if(left<c.fc1) continue;
    let maxUnits=c.cap!=null?c.cap:null;
    if(maxUnits==null){ const v=lfVol(c.id); if(v==null||v<0) continue; maxUnits=Math.floor(v/c.q); }
    if(!(maxUnits>0)) continue;
    const units=Math.min(maxUnits,Math.floor(left/c.fc1)); if(units<1) continue;
    const foc=units*c.fc1; left-=foc; plan.push({...c,units,foc,extra:units*c.gain,total:units*c.profitF,cut:units<Math.floor((left+foc)/c.fc1)});
    if(plan.length>=12||left<50) break; }
  if(!plan.length){ box.append(el("p",{class:"muted",text:"Com os preços de agora, nada que dá lucro aproveita o foco. Tente atualizar os preços."})); return; }
  const used=bud-left, extra=plan.reduce((a,x)=>a+x.extra,0), total=plan.reduce((a,x)=>a+x.total,0);
  const sum=el("p",{class:"ganho-top"}); sum.append(el("span",{class:"gt-l",text:"O foco do dia rende"}),el("b",{class:"gt-v",text:"+"+fmt(Math.round(extra))}),el("span",{class:"gt-t",text:`Gastando ${fmt(used)} de ${fmt(bud)} de foco na ordem abaixo, o foco põe ${fmt(Math.round(extra))} de prata a mais do que fazer as mesmas coisas sem foco. O lucro dessas tarefas, com foco, soma ${fmt(Math.round(total))}.${left>=50?` Sobram ${fmt(left)} de foco: o resto do mercado não absorve mais.`:""}`})); box.append(sum);
  const t=el("table",{class:"pl-t"}); const h=t.createTHead().insertRow(); ["","Onde gastar","Foco","Quanto","Prata por foco","O foco acrescenta","Lucro com foco"].forEach(x=>h.append(el("th",{text:x})));
  const b=t.createTBody();
  plan.forEach((x,i)=>{ const r=b.insertRow();
    r.insertCell().append(el("b",{class:"pl-n",text:String(i+1)}));
    const c=r.insertCell(); c.append(withIcon(x.id,el("span",{},el("b",{text:`${x.kind} ${x.name}`}),el("small",{class:"gv-sub",text:x.kind==="Regar"?"na sua ilha, a cada colheita":`em ${x.city}${x.cap==null?" · até o que o mercado vende por dia":""}`}))));
    const f=r.insertCell(); f.className="num"; f.textContent=fmt(x.foc);
    const u=r.insertCell(); u.className="num"; u.textContent=`${fmt(x.units)} ${x.units===1?({unidades:"unidade",peças:"peça",fornadas:"fornada",sementes:"semente"})[x.unit]||x.unit:x.unit}`;
    const s=r.insertCell(); s.className="num"; s.textContent=dec(x.spf);
    const e=r.insertCell(); e.className="num gain"; e.textContent="+"+fmt(Math.round(x.extra));
    const p=r.insertCell(); p.className="num gain"; p.textContent="+"+fmt(Math.round(x.total)); });
  const w=el("div",{class:"tbl"}); w.append(t); box.append(w);
  box.append(el("p",{class:"tiny muted",text:"Fabricar entra com os itens cujo preço já foi consultado (abra o Craft numa categoria para trazer mais). Os tetos usam as vendas por dia dos últimos 7 dias, somando as cidades. O custo de foco usa as specs da sua ficha."}));
}

/* da ilha até a venda: o que fazer com os seus lotes */
function plBestChain(L){
  const saveCk=SRC.ck, saveO=SRC.ckO, saveA=SRC.ckAuto, saveL=SRC.lotes; let best=null;
  SRC.ck="planto"; SRC.ckO={}; SRC.ckAuto=true; SRC.lotes=L;
  try{ for(const id in COOK.r){ const m=cookModel(id); if(!m||m.miss||m.thin||!(m.p1>0)) continue; const lpb=ckLotsPerBatch(m); if(!(lpb>0)) continue;
      const N=Math.floor(L/lpb+1e-9); if(N<1) continue; const v=lfVol(id), sell=v>0?Math.min(N*m.q,v):N*m.q;
      const total=m.p1*N; if(!best||total>best.total) best={m,N,lpb,total,vol:v,parts:m.parts.map(x=>({...x,p:{...x.p}}))}; } }
  finally{ SRC.ck=saveCk; SRC.ckO=saveO; SRC.ckAuto=saveA; SRC.lotes=saveL; }
  return best;
}
function renderPlanoIlha(){
  const box=$("plIlha"); box.textContent="";
  const L=ilhaL(); if(!(L>0)){ box.append(el("p",{class:"muted",text:"Informe acima quantos lotes você tem na ilha."})); return; }
  const opts=[];
  const crop=FARM.p.map(plantModel).filter(Boolean).sort((a,b)=>b.p1-a.p1)[0];
  if(crop) opts.push({k:"Vender a colheita",v:crop.p1*9*L,txt:`Plantar ${fzName(crop.crop)} nos ${fmt(L)} lotes, regar e vender a colheita`,crop});
  const prod=FARM.pr.map(producerModel).filter(Boolean).map(m=>({m,ps:fzPasture(L,m.food,m.food.n,9)})).sort((a,b)=>b.m.profit*b.ps.an-a.m.profit*a.ps.an)[0];
  if(prod) opts.push({k:"Leite e ovos",v:prod.m.profit*prod.ps.an,txt:`${fmt(prod.ps.an)} ${fzName(prod.m.grown)} em ${fmt(prod.ps.P)} pastos${prod.ps.F?` e ${fmt(prod.ps.F)} lotes de ração`:""}, vendendo ${fzName(prod.m.item)} (por dia)`});
  const ch=plBestChain(L);
  if(ch) opts.push({k:"Cozinhar com o que a ilha dá",v:ch.total,txt:`${fmt(ch.N)} fornadas de ${ch.m.name} com os ingredientes da ilha`,ch});
  if(!opts.length){ box.append(el("p",{class:"muted",text:"Com os preços de agora, nada da ilha dá lucro."})); return; }
  opts.sort((a,b)=>b.v-a.v); const top=opts[0];
  const cmp=el("div",{class:"pl-cmp"});
  opts.forEach((o,i)=>{ const c=el("div",{class:"pl-opt"+(i===0?" best":"")}); c.append(el("span",{class:"of-ct",text:o.k}),el("b",{class:o.v>=0?"gain":"loss",text:sgn(Math.round(o.v))}),el("small",{text:o.txt})); cmp.append(c); });
  box.append(el("p",{class:"small",text:`Com ${fmt(L)} lotes, por colheita (22 h) ou por dia nos animais:`}),cmp);
  if(top.ch){ const {m,N}=top.ch, ol=el("ol",{class:"pl-steps"});
    const plan=ckFarmPlan({...m,parts:top.ch.parts},N);
    const plant=top.ch.parts.filter(x=>x.p.src==="planto").map(x=>`${COOK.n[x.iid]||x.iid}`).join(", "), buy=top.ch.parts.filter(x=>x.p.src!=="planto").map(x=>`${fmt(Math.ceil(x.c*N))} × ${COOK.n[x.iid]||x.iid}`).join(", ");
    ol.append(el("li",{text:`Plante na ilha: ${plant}. O quadro abaixo diz quantos lotes de cada.`}));
    if(buy) ol.append(el("li",{text:`Compre o resto: ${buy}.`}));
    ol.append(el("li",{text:`Cozinhe ${fmt(N)} fornadas de ${m.name} em ${COOK_CITY[m.kind]} (cidade com bônus), com ${fmt(m.fc*N)} de foco.`}));
    const sc=bestCity(m.id,plField(),"max"), v=lfVol(m.id);
    ol.append(el("li",{text:`Venda ${fmt(m.q*N)} ${m.kind==="f"?"porções":"poções"}${sc?` em ${sc.c}, perto de ${fmt(sc.p)} cada`:""}.${v>0&&v<m.q*N?` O mercado vende uns ${fmtU(v)} por dia: leva alguns dias para vender tudo.`:""}`}));
    box.append(el("h3",{class:"pl-h3",text:"Passo a passo"}),ol); if(plan) box.append(plan);
    if(window.bagBtn){ const bg=el("div",{class:"ck-bag"}); bg.append(bagBtn(()=>[{id:m.id,q:m.q*N,nm:m.name,sell:m.item.p,sellC:sc?sc.c:COOK_CITY[m.kind]}],"Pôr o que sai na bag"),el("span",{text:`Pôr as ${fmt(m.q*N)} ${m.kind==="f"?"porções":"poções"} na bag para ver peso e montaria`})); box.append(bg); }
  } else if(top.crop){ box.append(el("p",{class:"small",text:`O que mais rende agora é plantar ${fzName(top.crop.crop)} e vender a colheita. Veja os detalhes na Ilha e fazenda.`})); }
  else box.append(el("p",{class:"small",text:"O que mais rende agora são os animais de Leite e ovos. Veja os detalhes na Ilha e fazenda."}));
}
async function renderPlano(){
  const note=$("plNote");
  { const bx=$("plFocBox"); if(bx&&!bx.firstChild) bx.append(focBudUI(()=>renderPlano(),"O plano reparte esse foco.")); }
  { const l=$("plLotes"); if(l&&document.activeElement!==l) l.value=ilhaL()>0?String(ilhaL()):""; }
  const ok=await plEnsure(note); if(!ok){ note.textContent="Não consegui abrir os dados agora. Tente atualizar."; return; }
  note.textContent="Com os preços de agora, as specs da sua ficha e as escolhas de origem dos materiais da Cozinha e da Fazenda.";
  renderPlanoIlha(); renderPlanoProd(false); await renderPlanoFoco();
}
{ const l=$("plLotes"); if(l){ let tm; l.addEventListener("input",()=>{ const v=Math.round(+l.value); SRC.lotes=v>0?v:0; srcSave(); const fp=$("fzPlots"); if(fp&&v>0) fp.value=String(v); clearTimeout(tm); tm=setTimeout(renderPlano,350); }); } }

/* ================= Sugestão de produção com o foco cheio =================
   Pensa num foco fixo (30.000 por padrão, a reserva cheia) e escolhe o que fabricar, entre equipamentos e consumíveis,
   pelo lucro com foco por ponto de foco, até o foco acabar. Cada item tem teto no que o mercado vende em N dias
   (vendas por dia dos últimos 7 dias, somando as cidades), para não fabricar o que fica parado. */
let PP={foc:30000,dias:3,tipo:"tudo",parte:80,spec:true}; try{ Object.assign(PP,JSON.parse(store.get("plProd")||"{}")); }catch(e){}
const ppSave=()=>{ try{ store.set("plProd",JSON.stringify(PP)); }catch(e){} };
let PP_BUSY=false;
async function renderPlanoProd(run){
  const box=$("plProd"); if(!box) return;
  { const f=$("ppFoc"), d=$("ppDias"); if(f&&document.activeElement!==f) f.value=String(PP.foc); if(d&&document.activeElement!==d) d.value=String(PP.dias); const pt=$("ppParte"), sp=$("ppSpec"); if(pt&&document.activeElement!==pt) pt.value=String(PP.parte); if(sp) sp.checked=!!PP.spec;
    document.querySelectorAll("[data-pp]").forEach(b=>b.setAttribute("aria-pressed",String(PP.tipo===b.dataset.pp))); }
  if(!run){ if(!box.dataset.done){ box.textContent=""; box.append(el("p",{class:"muted",text:"Clique em Montar sugestão. Na primeira vez o site consulta o preço de todos os equipamentos, o que leva perto de um minuto."})); } return; }
  if(PP_BUSY) return; PP_BUSY=true; box.textContent=""; const note=el("p",{class:"small muted"}); box.append(note);
  try{
    if(!BM) BM=await need("bm");
    if(PP.tipo!=="cons"){ const sv=[OF.tier,OF.ench]; OF.tier=0; OF.ench=-1; try{ await ensureOfG("g:*tudo",note); } finally{ [OF.tier,OF.ench]=sv; } }
    if(PP.tipo!=="equip"){ note.textContent="Consultando comidas e poções…"; await ensureCook(); }
    const cand=[];
    if(PP.tipo!=="cons"){ const sv=[OF.tier,OF.ench]; OF.tier=0; OF.ench=-1;
      try{ for(const it of ofItems("g:*tudo")){ const m=plOfItem(it); if(m&&!m.thin&&(!PP.spec||(it.fce||0)>0)) cand.push({...m,name:`${m.name} T${m.t}.${m.e}`,kind:"Fabricar",unit:["peça","peças"]}); } } finally{ [OF.tier,OF.ench]=sv; } }
    if(PP.tipo!=="equip") for(const id in COOK.r){ const m=cookModel(id); if(!m||m.miss||m.thin||!(m.p1>0)) continue; if(PP.spec&&!(cookFCE(m.kind,id)>0)) continue;
      cand.push({id,name:m.name,city:COOK_CITY[m.kind],q:m.q,fc1:m.fc,profitF:m.p1,invest:m.cost*(1-rrr(0.15,true,st.daily))+m.fee,sale:m.item.p,kind:m.kind==="f"?"Cozinhar":"Preparar",unit:["fornada","fornadas"]}); }
    cand.forEach(c=>c.ppf=c.profitF/c.fc1); cand.sort((a,b)=>b.ppf-a.ppf);
    const top=cand.slice(0,160); note.textContent="Consultando quanto o mercado vende por dia…";
    await histFetch(top.flatMap(c=>SHOP_LOCS.map(l=>nk(c.id)+"|"+l)));
    let left=PP.foc; const plan=[];
    for(const c of top){ if(left<c.fc1) continue; const v=lfVol(c.id); if(!(v>=0.5)) continue;
      const cap=Math.floor(v*PP.dias*(PP.parte/100)/c.q); if(cap<1) continue;
      const n=Math.min(cap,Math.floor(left/c.fc1)); if(n<1) continue;
      left-=n*c.fc1; plan.push({...c,n,foc:n*c.fc1,lucro:n*c.profitF,inv:n*c.invest,dias:n*c.q/(v*PP.parte/100),vol:v});
      if(left<20||plan.length>=15) break; }
    box.textContent=""; box.dataset.done="1";
    if(!plan.length){ box.append(el("p",{class:"muted",text:"Com os preços de agora, nada que dá lucro vende o bastante nesse prazo. Tente mais dias ou atualize os preços."})); return; }
    const used=PP.foc-left, lucro=plan.reduce((a,x)=>a+x.lucro,0), inv=plan.reduce((a,x)=>a+x.inv,0);
    const sum=el("p",{class:"ganho-top"}); sum.append(el("span",{class:"gt-l",text:`Com ${fmt(PP.foc)} de foco`}),el("b",{class:"gt-v",text:"+"+fmt(Math.round(lucro))}),el("span",{class:"gt-t",text:`Fabricando o que está abaixo, o lucro soma ${fmt(Math.round(lucro))} de prata, com ${fmt(Math.round(inv))} de investimento em materiais e taxas. Tudo vende em até ${PP.dias} ${PP.dias>1?"dias":"dia"} se você ficar com ${PP.parte}% das vendas do mercado.${PP.spec?" Só entra o que você tem spec na ficha.":""}${left>=20?` Sobram ${fmt(left)} de foco: o resto não venderia nesse prazo.`:""}`})); box.append(sum);
    const t=el("table",{class:"pl-t"}); const h=t.createTHead().insertRow(); ["","O que fazer","Quanto","Foco","Investimento","Lucro","Lucro por foco","Vende em"].forEach(x=>h.append(el("th",{text:x})));
    const b=t.createTBody();
    plan.forEach((x,i)=>{ const r=b.insertRow();
      r.insertCell().append(el("b",{class:"pl-n",text:String(i+1)}));
      r.insertCell().append(withIcon(x.id,el("span",{},el("b",{text:`${x.kind} ${x.name}`}),el("small",{class:"gv-sub",text:`em ${x.city} · vende ${fmtU(x.vol)} por dia, a ${fmt(Math.round(x.sale))} cada`}))));
      const c=(v,cls)=>{ const td=r.insertCell(); td.className="num"+(cls?" "+cls:""); td.textContent=v; };
      c(`${fmt(x.n)} ${x.n>1?x.unit[1]:x.unit[0]}`); c(fmt(x.foc)); c(fmt(Math.round(x.inv))); c("+"+fmt(Math.round(x.lucro)),"gain"); c(dec(x.ppf)); c(x.dias<1?"menos de 1 dia":`${dec(x.dias)} dias`); });
    const w=el("div",{class:"tbl"}); w.append(t); box.append(w);
    if(window.bagBtn){ const bg=el("div",{class:"ck-bag"}); bg.append(bagBtn(()=>plan.map(x=>({id:x.id,q:x.n*x.q,nm:x.name,sell:x.sale})),"Pôr o que sai na bag"),el("span",{text:"Pôr tudo o que sai na bag para ver peso, valor e montaria"})); box.append(bg); }
    box.append(el("p",{class:"tiny muted",text:"Lucro com foco, na cidade com bônus de cada item, comprando os materiais pelo preço típico e vendendo pelo preço típico (estratégia de venda do site). A ordem é pelo lucro por ponto de foco, porque o foco é o que acaba primeiro. O prazo de venda usa as vendas por dia dos últimos 7 dias, somando as cidades, e conta só a parte das vendas que você escolheu: com o preço mais baixo do anúncio você pega mais; com muita gente vendendo o mesmo item, menos."}));
  } catch(e){ box.textContent=""; box.append(el("p",{class:"loss",text:"Não consegui montar a sugestão agora: "+(e&&e.message||e)})); }
  finally{ PP_BUSY=false; }
}
{ const pt=$("ppParte"), sp=$("ppSpec");
  if(pt) pt.addEventListener("change",()=>{ const v=Math.round(+pt.value); PP.parte=v>0?Math.min(100,v):80; ppSave(); });
  if(sp) sp.addEventListener("change",()=>{ PP.spec=sp.checked; ppSave(); }); }
{ const f=$("ppFoc"), d=$("ppDias"), go=$("ppGo");
  if(f) f.addEventListener("change",()=>{ const v=Math.round(+f.value); PP.foc=v>0?Math.min(FOC_MAX,v):30000; ppSave(); });
  if(d) d.addEventListener("change",()=>{ const v=Math.round(+d.value); PP.dias=v>0?Math.min(30,v):3; ppSave(); });
  document.querySelectorAll("[data-pp]").forEach(b=>b.addEventListener("click",()=>{ PP.tipo=b.dataset.pp; ppSave(); renderPlanoProd(false); }));
  if(go) go.addEventListener("click",()=>renderPlanoProd(true)); }
