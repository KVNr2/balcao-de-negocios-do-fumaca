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
/* da ilha até a venda: o que fazer com os seus lotes */
function plBestChain(L){
  const saveCk=SRC.ck, saveO=SRC.ckO, saveA=SRC.ckAuto, saveL=SRC.lotes; let best=null;
  SRC.ck="planto"; SRC.ckO={}; SRC.ckAuto=true; SRC.lotes=L;
  try{ for(const id in COOK.r){ const m=cookModel(id); if(!m||m.miss||m.thin||!(m.p1>0)) continue; const lpb=ckLotsPerBatch(m); if(!(lpb>0)) continue;
      const N=Math.floor(L/lpb+1e-9); if(N<1) continue; const v=lfVol(id), sell=v>0?Math.min(N*m.q,v):N*m.q;
      const total=focMix(N,m.fc,m.p1,m.p0).tot; if(!best||total>best.total) best={m,N,lpb,total,vol:v,parts:m.parts.map(x=>({...x,p:{...x.p}}))}; } }
  finally{ SRC.ck=saveCk; SRC.ckO=saveO; SRC.ckAuto=saveA; SRC.lotes=saveL; }
  return best;
}
function renderPlanoIlha(){
  const box=$("plIlha"); box.textContent="";
  const L=ilhaL(); if(!(L>0)){ box.append(el("p",{class:"muted",text:"Informe acima quantos lotes você tem na ilha."})); return; }
  const opts=[];
  const crop=FARM.p.map(plantModel).filter(Boolean).sort((a,b)=>b.p1-a.p1)[0];
  if(crop){ const mx=focMix(9*L,crop.fc,crop.p1,crop.p0); opts.push({k:"Vender a colheita",v:mx.tot,txt:`Plantar ${fzName(crop.crop)} nos ${fmt(L)} lotes, regar e vender a colheita${mx.parcial?` (${mixTxt(mx)})`:""}`,crop}); }
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
    { const mx=focMix(N,m.fc,m.p1,m.p0); ol.append(el("li",{text:`Cozinhe ${fmt(N)} fornadas de ${m.name} em ${COOK_CITY[m.kind]} (cidade com bônus), ${mx.parcial?`${fmt(mx.k)} com foco e ${fmt(N-mx.k)} sem, gastando ${fmt(mx.foc)} de foco (o seu teto)`:`com ${fmt(mx.foc)} de foco`}.`})); }
    const sc=bestCity(m.id,plField(),"max"), v=lfVol(m.id);
    ol.append(el("li",{text:`Venda ${fmt(m.q*N)} ${m.kind==="f"?"porções":"poções"}${sc?` em ${sc.c}, perto de ${fmt(sc.p)} cada`:""}.${v>0&&v<m.q*N?` O mercado vende uns ${fmtU(v)} por dia: leva alguns dias para vender tudo.`:""}`}));
    box.append(el("h3",{class:"pl-h3",text:"Passo a passo"}),ol); if(plan) box.append(plan);
    if(window.bagBtn){ const bg=el("div",{class:"ck-bag"}); bg.append(bagBtn(()=>[{id:m.id,q:m.q*N,nm:m.name,sell:m.item.p,sellC:sc?sc.c:COOK_CITY[m.kind]}],"Pôr o que sai na bag"),el("span",{text:`Pôr as ${fmt(m.q*N)} ${m.kind==="f"?"porções":"poções"} na bag para ver peso e montaria`})); box.append(bg); }
  } else if(top.crop){ box.append(el("p",{class:"small",text:`O que mais rende agora é plantar ${fzName(top.crop.crop)} e vender a colheita. Veja os detalhes na Ilha e fazenda.`})); }
  else box.append(el("p",{class:"small",text:"O que mais rende agora são os animais de Leite e ovos. Veja os detalhes na Ilha e fazenda."}));
}
async function renderPlano(){
  const note=$("plNote");
  { const l=$("plLotes"); if(l&&document.activeElement!==l) l.value=ilhaL()>0?String(ilhaL()):""; }
  { const bx=$("plTeto"); if(bx&&!bx.firstChild) bx.append(tetoUI(()=>renderPlano())); }
  const ok=await plEnsure(note); if(!ok){ note.textContent="Não consegui abrir os dados agora. Tente atualizar."; return; }
  note.textContent="Com os preços de agora, as specs da sua ficha e as escolhas de origem dos materiais da Cozinha e da Fazenda.";
  renderPlanoIlha(); renderPlanoProd(false);
}
{ const l=$("plLotes"); if(l){ let tm; l.addEventListener("input",()=>{ const v=Math.round(+l.value); SRC.lotes=v>0?v:0; srcSave(); const fp=$("fzPlots"); if(fp&&v>0) fp.value=String(v); clearTimeout(tm); tm=setTimeout(renderPlano,350); }); } }

/* ================= Onde gastar o foco =================
   Um foco fixo (30.000 por padrão, a reserva cheia) e a pergunta: o que fazer com ele para ganhar mais prata?
   Entram equipamentos, comidas e poções, refino e a rega das plantas da ilha. A ordem é pelo lucro com foco por
   ponto de foco (o foco é o que acaba primeiro), e cada item tem teto no que o mercado compra no prazo escolhido,
   contando só a sua parte das vendas. A coluna Sem foco mostra quanto a mesma coisa daria sem gastar foco. */
let PP={foc:30000,dias:3,parte:80,spec:true,cats:{equip:true,cons:true,ref:true,rega:true}}; try{ Object.assign(PP,JSON.parse(store.get("plProd")||"{}")); }catch(e){}
if(!PP.cats) PP.cats={equip:true,cons:true,ref:true,rega:true};
const ppSave=()=>{ try{ store.set("plProd",JSON.stringify(PP)); }catch(e){} };
let PP_BUSY=false;
async function renderPlanoProd(run){
  const box=$("plProd"); if(!box) return;
  { const f=$("ppFoc"), d=$("ppDias"), pt=$("ppParte"), sp=$("ppSpec");
    if(f&&document.activeElement!==f) f.value=String(PP.foc); if(d&&document.activeElement!==d) d.value=String(PP.dias); if(pt&&document.activeElement!==pt) pt.value=String(PP.parte); if(sp) sp.checked=!!PP.spec;
    document.querySelectorAll("[data-ppc]").forEach(c=>{ c.checked=!!PP.cats[c.dataset.ppc]; }); }
  if(!run){ if(!box.dataset.done){ box.textContent=""; box.append(el("p",{class:"muted",text:"Ajuste as opções e clique em Montar plano. Na primeira vez o site consulta o preço de todos os equipamentos, o que leva perto de um minuto; depois fica mais rápido."})); } return; }
  if(PP_BUSY) return; PP_BUSY=true; box.textContent=""; const note=el("p",{class:"small muted"}); box.append(note);
  try{
    const C=PP.cats; if(!(C.equip||C.cons||C.ref||C.rega)){ box.textContent=""; box.append(el("p",{class:"muted",text:"Marque pelo menos uma opção em O que entra."})); return; }
    const ok=await plEnsure(note); if(!ok) throw new Error("dados da fazenda ou da cozinha");
    if(C.equip){ if(!BM) BM=await need("bm"); const sv=[OF.tier,OF.ench]; OF.tier=0; OF.ench=-1; try{ await ensureOfG("g:*tudo",note); } finally{ [OF.tier,OF.ench]=sv; } }
    const cand=[];
    const ofPush=(it,kind,unit,nm)=>{ const m=plOfItem(it); if(!m||m.thin||(PP.spec&&!((it.fce||0)>0))) return; cand.push({...m,name:nm||m.name,kind,unit,semFoco:m.profitF-m.gain}); };
    if(C.equip){ const sv=[OF.tier,OF.ench]; OF.tier=0; OF.ench=-1; try{ for(const it of ofItems("g:*tudo")) ofPush(it,"Fabricar",["peça","peças"],`${it.name} T${it.t}.${it.e}`); } finally{ [OF.tier,OF.ench]=sv; } }
    if(C.ref) for(const it of ofItems("refine")) ofPush(it,"Refinar",["unidade","unidades"]);
    if(C.cons) for(const id in COOK.r){ const m=cookModel(id); if(!m||m.miss||m.thin||!(m.p1>0)) continue; if(PP.spec&&!(cookFCE(m.kind,id)>0)) continue;
      cand.push({id,name:m.name,city:COOK_CITY[m.kind],q:m.q,fc1:m.fc,profitF:m.p1,semFoco:m.p0,invest:m.inv,sale:m.item.p,kind:m.kind==="f"?"Cozinhar":"Preparar",unit:["fornada","fornadas"]}); }
    if(C.rega){ const L=ilhaL(); if(L>0){ const pl=FARM.p.map(plantModel).filter(Boolean).filter(m=>m.p1>0&&m.fc>0).sort((a,b)=>b.p1/b.fc-a.p1/a.fc)[0];
      if(pl) cand.push({id:pl.crop,name:`${fzName(pl.crop)} nos seus ${fmt(L)} lotes`,city:"sua ilha",q:1,fc1:pl.fc,profitF:pl.p1,semFoco:pl.p0,invest:pl.sp,sale:pl.cp,kind:"Plantar e regar",unit:["semente","sementes"],cap:9*L,rega:true}); } }
    /* o que o foco acrescenta de verdade: se já dá lucro sem foco, só a diferença; se sem foco daria prejuízo, o lucro inteiro (o foco é o que faz valer a pena) */
    cand.forEach(c=>{ c.val=c.profitF-Math.max(0,c.semFoco); c.ppf=c.val/c.fc1; }); cand.sort((a,b)=>b.ppf-a.ppf);
    const top=cand.filter(c=>c.ppf>0).slice(0,200); note.textContent="Consultando quanto o mercado vende por dia…";
    await histFetch(top.filter(c=>!c.rega).flatMap(c=>SHOP_LOCS.map(l=>nk(c.id)+"|"+l)));
    let left=PP.foc; const plan=[];
    for(const c of top){ if(left<c.fc1) continue; let cap, v=null;
      if(c.rega) cap=c.cap; else { v=lfVol(c.id); if(!(v>=0.5)) continue; cap=Math.floor(v*PP.dias*(PP.parte/100)/c.q); }
      if(!(cap>=1)) continue; const n=Math.min(cap,Math.floor(left/c.fc1)); if(n<1) continue;
      left-=n*c.fc1; plan.push({...c,n,foc:n*c.fc1,lucro:n*c.profitF,sem:n*c.semFoco,valor:n*c.val,inv:n*c.invest,dias:v?n*c.q/(v*PP.parte/100):null,vol:v});
      if(left<20||plan.length>=15) break; }
    box.textContent=""; box.dataset.done="1";
    if(!plan.length){ box.append(el("p",{class:"muted",text:"Com os preços de agora, nada que dá lucro vende o bastante nesse prazo. Tente mais dias, marque mais opções ou atualize os preços."})); return; }
    const used=PP.foc-left, lucro=plan.reduce((a,x)=>a+x.lucro,0), valor=plan.reduce((a,x)=>a+x.valor,0), inv=plan.reduce((a,x)=>a+x.inv,0);
    const sum=el("p",{class:"ganho-top"}); sum.append(el("span",{class:"gt-l",text:`Com ${fmt(PP.foc)} de foco`}),el("b",{class:"gt-v",text:"+"+fmt(Math.round(valor))}),el("span",{class:"gt-t",text:`O foco acrescenta ${fmt(Math.round(valor))} de prata fazendo o que está abaixo. O lucro dessas tarefas, com foco, soma ${fmt(Math.round(lucro))}, com ${fmt(Math.round(inv))} de investimento em materiais e taxas. Tudo vende em até ${PP.dias} ${PP.dias>1?"dias":"dia"} se você ficar com ${PP.parte}% das vendas do mercado.${PP.spec?" Só entra o que você tem spec na ficha.":""}${left>=20?` Sobram ${fmt(left)} de foco: o resto não venderia nesse prazo.`:""}`})); box.append(sum);
    const t=el("table",{class:"pl-t"}); const h=t.createTHead().insertRow(); ["","O que fazer","Quanto","Foco","Investimento","Lucro com foco","O foco acrescenta","Por ponto de foco","Vende em"].forEach(x=>h.append(el("th",{text:x})));
    const b=t.createTBody();
    plan.forEach((x,i)=>{ const r=b.insertRow();
      r.insertCell().append(el("b",{class:"pl-n",text:String(i+1)}));
      r.insertCell().append(withIcon(x.id,el("span",{},el("b",{text:`${x.kind} ${x.name}`}),el("small",{class:"gv-sub",text:x.rega?"a cada colheita (22 h), regando todas as sementes":`em ${x.city} · vende ${fmtU(x.vol)} por dia, a ${fmt(Math.round(x.sale))} cada`}))));
      const c=(v,cls)=>{ const td=r.insertCell(); td.className="num"+(cls?" "+cls:""); td.textContent=v; };
      c(`${fmt(x.n)} ${x.n>1?x.unit[1]:x.unit[0]}`); c(fmt(x.foc)); c(fmt(Math.round(x.inv))); c("+"+fmt(Math.round(x.lucro)),"gain"); { const td=r.insertCell(); td.className="num gain"; td.append(document.createTextNode("+"+fmt(Math.round(x.valor))),el("small",{class:"gv-sub",text:x.sem>0?`sem foco já daria ${sgn(Math.round(x.sem))}`:"sem foco daria prejuízo"})); } c(dec(x.ppf)); c(x.dias==null?"—":x.dias<1?"menos de 1 dia":`${dec(x.dias)} dias`); });
    const w=el("div",{class:"tbl"}); w.append(t); box.append(w);
    if(window.bagBtn){ const bg=el("div",{class:"ck-bag"}); bg.append(bagBtn(()=>plan.filter(x=>!x.rega).map(x=>({id:x.id,q:x.n*x.q,nm:x.name,sell:x.sale})),"Pôr o que sai na bag"),el("span",{text:"Pôr tudo o que sai na bag para ver peso, valor e montaria"})); box.append(bg); }
    box.append(el("p",{class:"tiny muted",text:"Lucro com foco na cidade com bônus de cada item, comprando os materiais e vendendo pelo preço típico (estratégia de venda do site). A ordem é por quanto cada ponto de foco acrescenta: se a tarefa já dá lucro sem foco, conta só a diferença que o foco faz; se sem foco daria prejuízo, conta o lucro inteiro, porque é o foco que faz valer a pena. O que dá lucro sem foco você pode fazer de qualquer jeito, sem gastar foco. O prazo usa as vendas por dia dos últimos 7 dias, somando as cidades e todas as qualidades, e conta só a parte das vendas que você escolheu. A rega usa a planta que mais rende por foco e as sementes que cabem nos seus lotes (campo Lotes na ilha)."}));
  } catch(e){ box.textContent=""; box.append(el("p",{class:"loss",text:"Não consegui montar o plano agora: "+(e&&e.message||e)})); }
  finally{ PP_BUSY=false; }
}
{ const pt=$("ppParte"), sp=$("ppSpec"), f=$("ppFoc"), d=$("ppDias"), go=$("ppGo");
  if(pt) pt.addEventListener("change",()=>{ const v=Math.round(+pt.value); PP.parte=v>0?Math.min(100,v):80; ppSave(); });
  if(sp) sp.addEventListener("change",()=>{ PP.spec=sp.checked; ppSave(); });
  if(f) f.addEventListener("change",()=>{ const v=Math.round(+f.value); PP.foc=v>0?Math.min(FOC_MAX,v):30000; ppSave(); });
  if(d) d.addEventListener("change",()=>{ const v=Math.round(+d.value); PP.dias=v>0?Math.min(30,v):3; ppSave(); });
  document.querySelectorAll("[data-ppc]").forEach(c=>c.addEventListener("change",()=>{ PP.cats[c.dataset.ppc]=c.checked; ppSave(); }));
  if(go) go.addEventListener("click",()=>renderPlanoProd(true)); }
