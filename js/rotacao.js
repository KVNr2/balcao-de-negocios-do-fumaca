/* Rotação de craft: um ou mais crafts fixos por cidade; uma visita (a uma cidade) a cada N dias, passando pelas cidades em rodízio.
   O foco é do personagem, não da cidade: cada visita usa o foco que encheu desde a anterior (10.000 por dia no Premium, até 30.000).
   Cada cidade volta a ser visitada depois de N × cidades dias: é o tempo das ordens encherem e da venda escoar.
   Entre as visitas, ordens de compra na própria cidade juntam o material mais barato (o material fica no mercado de onde a ordem encheu).
   Na visita: o foco acumulado (até 30.000) vai primeiro no item que mais rende por ponto de foco, e cada item fica limitado
   ao que a melhor cidade de venda absorve até a próxima visita. */
const ROT_CIDADES=["Lymhurst","Fort Sterling","Bridgewatch","Martlock","Thetford"];
const ROT=(()=>{ const d={cidades:[...ROT_CIDADES],itens:{},ultima:{},dias:3,cash:"",minPct:"",minVol:"",v:2};
  try{ const o=JSON.parse(store.get("rotacao")||"{}"); const r={...d,...o,itens:o.itens||{},ultima:o.ultima||{}};
    if(!o.v||o.v<2){ if(!r.cidades.includes("Thetford")) r.cidades=ROT_CIDADES.filter(c=>c==="Thetford"||r.cidades.includes(c)); r.v=2; }   // Thetford entrou na rotação
    if(!Array.isArray(r.tiers)) r.tiers=[]; if(!Array.isArray(r.enchs)) r.enchs=r.soE0?[0]:[]; if(!Array.isArray(r.vendaC)) r.vendaC=[];
    if(!r.compra) r.compra="ordem"; if(!r.venda) r.venda="auto"; if(r.grupo==null) r.grupo=""; delete r.soE0;
    return r; }catch(e){ return {...d,tiers:[],enchs:[],vendaC:[],compra:"ordem",venda:"auto",grupo:""}; } })();
/* filtros de catálogo (sugestões e busca): tier, encantamento e tipo, como no Craft */
const ROT_GRUPOS=[["","Tudo"],["armas","Armas"],["armaduras","Armaduras"],["mao","Mão secundária"]];
const rotCatOk=it=>(!ROT.tiers.length||ROT.tiers.includes(it.t))&&(ROT.enchs.length?ROT.enchs.includes(it.e):it.e<=3)&&(!ROT.grupo||it.grp===ROT.grupo);
const rotNum=v=>{ const n=typeof numBR==="function"?numBR(v):parseFloat(String(v).replace(",",".")); return n!=null&&isFinite(n)?n:null; };
/* filtros de lucro % e de vendas por dia: valem para as sugestões e para o plano (o item que não passa fica de fora do plano) */
function rotPassa(m){ if(!m||m.miss) return false; const mp=rotNum(ROT.minPct), mv=rotNum(ROT.minVol);
  if(mp!=null&&!(m.pct*100>=mp)) return false; if(mv!=null&&mv>0&&!(m.vol!=null&&m.vol>=mv)) return false; return true; }
const rotSave=()=>{ try{ store.set("rotacao",JSON.stringify(ROT)); }catch(e){} };
const rotDKey=id=>id.includes("_LEVEL")?id.split("@")[0]:id;              // como o preço fica guardado
const rotApi=id=>/_LEVEL\d$/.test(id)?nk(id):id;                         // como a API pede
let ROT_CAT=null; const ROT_LOADED=tSet(5*60e3);   // preço buscado vale 5 minutos; depois busca de novo
/* catálogo de tudo que se fabrica na aba Craft (armas, armaduras e mão secundária, T4 a T8, .0 a .4) */
function rotCatalogo(){
  if(ROT_CAT||!BM) return ROT_CAT;
  const t0=new Set(OF.tiers), e0=new Set(OF.enchs); OF.tiers.clear(); OF.enchs.clear();
  try{ ROT_CAT=[]; for(const g of ofGroups("g:*tudo")){ const grp=g==="mao"?"mao":g.startsWith("a_")?"armaduras":"armas"; for(const it of ofItems("g:"+g)) if(it.t>=4){ it.grp=grp; ROT_CAT.push(it); } } } finally{ t0.forEach(x=>OF.tiers.add(x)); e0.forEach(x=>OF.enchs.add(x)); }
  ROT_CAT.forEach(it=>{ it.nm=`${it.name} T${it.t}.${it.e}`; it.busca=(it.nm+" "+it.name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); });
  return ROT_CAT;
}
const rotItem=id=>(rotCatalogo()||[]).find(it=>it.id===id);
const rotFocoVisita=()=>Math.min(FOC_MAX,(st.prem?FOC_DIA:0)*ROT.dias);
const rotCiclo=()=>ROT.dias*Math.max(1,ROT.cidades.length);   // dias até voltar à mesma cidade
const rotOrdemOk=v=>v&&v[1]>0&&(!v[0]||v[1]>=v[0]*0.7);
/* preço de um material na cidade da rotação: ordem de compra (a maior aberta +1, mais os 2,5%) ou, sem ordem, o anúncio */
function rotMat(id,city){ const r=DATA.itens[rotDKey(id)]||{}, v=r[city];
  const ordem=rotOrdemOk(v)?{p:v[1]+1,k:(v[1]+1)*1.025,mode:"ordem"}:null, inst=v&&v[0]>0?{p:v[0],k:v[0],mode:"inst"}:null;
  let fora=null; for(const c of ROT_CIDADES){ if(c===city) continue; const w=r[c]; if(w&&w[0]>0&&(!fora||w[0]<fora.p)) fora={p:w[0],c}; }
  const use=ROT.compra==="inst"?(inst||ordem):ROT.compra==="auto"?(ordem&&inst?(ordem.k<inst.k?ordem:inst):(ordem||inst)):(ordem||inst);
  return {ordem,inst,use,fora}; }
/* melhor venda líquida entre as cidades reais, Caerleon e o Mercado Negro (equipamento) */
function rotVenda(id){ const r=DATA.itens[rotDKey(id)]||{}, tx=taxBase(); let best=null;
  const locs=ROT.vendaC.length?ROT.vendaC.filter(c=>c!=="Black Market"):[...ROT_CIDADES,"Caerleon"];
  const ps=[...ROT_CIDADES,"Caerleon"].map(c=>r[c]&&r[c][0]).filter(x=>x>0).sort((a,b)=>a-b), teto=ps.length>=3?(ps.length%2?ps[(ps.length-1)/2]:(ps[ps.length/2-1]+ps[ps.length/2])/2)*1.3:Infinity;   // anúncio fora da curva não vende
  for(const c of [...locs,...(ROT.bm===false?[]:["Black Market"])]){ const v=r[c]; if(!v) continue; const op=[];
    if(c==="Black Market"){ if(v[1]>0) op.push({p:v[1],k:v[1]*(1-tx),mode:"inst"}); }
    else { if(v[0]>0&&v[0]<=teto&&ROT.venda!=="inst") op.push({p:v[0],k:v[0]*(1-tx-0.025),mode:"ordem"}); if(v[1]>0&&ROT.venda!=="ordem") op.push({p:v[1],k:v[1]*(1-tx),mode:"inst"}); }
    for(const o of op) if(!best||o.k>best.k) best={...o,c}; }
  return best; }
function rotModel(it,city){
  it.fce=bmFCE(it.key);   // a ficha pode ter mudado (ou sincronizado) depois de montar o catálogo
  const venda=rotVenda(it.id); if(!venda) return {it,miss:"preço de venda"};
  const bonusC=it.city===city?it.bonus:0, bd=bdItem(it.id), rF=rrr(bonusC,true,st.daily+bd), rN=rrr(bonusC,false,st.daily+bd);
  const fc1=Math.max(1,Math.round(it.focus*Math.pow(0.5,(it.fce||0)/10000))), fee=it.fee*feeVal()/100;
  let cF=fee, cN=fee, ordemT=0, instT=0; const mats=[];
  for(const g of it.ing){ const m=rotMat(g.id,city); if(!m.use) return {it,miss:g.nm};
    const fat=g.art?1:null, qF=g.n*(fat||(1-rF)), qN=g.n*(fat||(1-rN));
    cF+=qF*m.use.k; cN+=qN*m.use.k; if(m.inst) instT+=qF*m.inst.k; ordemT+=qF*m.use.k; mats.push({g,m,qF}); }
  const net=it.q*venda.k, pF=net-cF, pN=net-cN, h=OF2.hs[rotApi(it.id)+"|"+venda.c], vol=h&&h.vol>=0?h.vol:null;
  return {it,city,venda,rF,rN,fc1,pF,pN,pct:cF>0?pF/cF:0,spf:(pF-pN)/fc1,mats,custoF:cF,economia:instT-ordemT,vol,bonusC,bd};
}
/* plano de uma visita: foco primeiro onde rende mais por ponto, sem passar do que a venda absorve até a próxima visita */
function rotPlano(city,foco,cash){
  const ms=(ROT.itens[city]||[]).map(id=>rotItem(id)).filter(Boolean).map(it=>rotModel(it,city));
  const ok=ms.filter(rotPassa).sort((a,b)=>b.spf-a.spf); let F=foco, C=cash>0?cash:Infinity; const linhas=[];
  for(const m of ok){ const teto=m.vol!=null?Math.max(1,Math.floor(m.vol*rotCiclo())):Infinity;
    let nF=m.pF>0?Math.min(teto,Math.floor(F/m.fc1),Math.floor(C/Math.max(1,m.custoF))):0; F-=nF*m.fc1; C-=nF*m.custoF;
    let nN=m.pN>0?Math.min(teto-nF,Math.floor(C/Math.max(1,m.custoF))):0; if(!isFinite(nN)) nN=0; C-=nN*m.custoF;
    if(!isFinite(nF)) nF=0;
    linhas.push({m,nF,nN,teto,lucro:nF*m.pF+nN*m.pN,foco:nF*m.fc1}); }
  for(const m of ms.filter(m=>!rotPassa(m))) linhas.push({m,nF:0,nN:0,lucro:0,foco:0,fora:!m.miss});
  return {city,linhas,lucro:linhas.reduce((a,l)=>a+l.lucro,0),foco:foco-F};
}
async function rotEnsure(note){
  if(!BM){ BM=await need("bm"); } rotCatalogo();
  const ids=new Set(), mats=new Set();
  for(const c of ROT.cidades) for(const id of (ROT.itens[c]||[])){ const it=rotItem(id); if(!it) continue; ids.add(rotApi(it.id)); it.ing.forEach(g=>mats.add(rotApi(g.id))); }
  const falta=[...ids,...mats].filter(x=>!ROT_LOADED.has(x));
  if(falta.length){ note.textContent="Buscando os preços…"; await fetchIds([...ids].filter(x=>!ROT_LOADED.has(x)),DATA.itens,[...SHOP_LOCS,"Black Market"]); await fetchIds([...mats].filter(x=>!ROT_LOADED.has(x)),DATA.itens,SHOP_LOCS); falta.forEach(x=>ROT_LOADED.add(x)); }
  const keys=[...ids].flatMap(id=>[...ROT_CIDADES,"Caerleon","Black Market"].map(c=>id+"|"+c)).filter(k=>OF2.hs[k]==null);
  if(keys.length){ note.textContent="Consultando quanto cada item vende por dia…"; await histFetch(keys); }
}
let ROT_TOK=0;
async function renderRot(){
  const box=$("rotBox"), note=$("rotNote"); if(!box) return; const tok=++ROT_TOK;
  rotUI();
  try{ await rotEnsure(note); }catch(e){ note.textContent="Não consegui buscar os preços agora. Tente atualizar."; } if(tok!==ROT_TOK) return;
  note.textContent="";
  const foco=rotFocoVisita(), cash=+String(ROT.cash).replace(/\D/g,"")||0, porCid=cash>0?cash/Math.max(1,ROT.cidades.length):0;
  const planos=ROT.cidades.map(c=>rotPlano(c,foco,porCid));
  rotHoje(planos); rotCidades(planos); rotOrdens(planos);
}
const rotDiasDesde=c=>{ const t=ROT.ultima[c]; return t?Math.floor((Date.now()-t)/864e5):null; };
function rotHoje(planos){
  const h=$("rotHoje"); h.textContent="";
  const com=planos.filter(p=>p.linhas.some(l=>l.nF+l.nN>0));
  if(!com.length){ h.append(el("p",{class:"muted",text:"Escolha pelo menos um item em cada cidade para o site montar o plano do dia."})); return; }
  const nota=p=>{ const d=rotDiasDesde(p.city); return (d==null||d>=rotCiclo()?1:0)*1e12+p.lucro; };   // primeiro quem já está na hora, depois o que rende mais
  const best=com.slice().sort((a,b)=>nota(b)-nota(a))[0], d=rotDiasDesde(best.city);
  const card=el("div",{class:"rot-hoje"});
  card.append(el("small",{class:"muted",text:"Hoje"}),el("h3",{text:`Vá para ${best.city}`}),
    el("p",{class:"small",text:`${d==null?"Você ainda não marcou nenhuma visita aqui.":d>=rotCiclo()?`Última visita há ${d} ${d===1?"dia":"dias"}: as ordens já tiveram o ciclo todo para encher.`:`Última visita há ${d} ${d===1?"dia":"dias"}.`} ${best.foco?`Com ${fmt(best.foco)} de foco, a`:"Sem foco, a"} visita rende uns ${sgn(Math.round(best.lucro))}, com ${fmtS(best.linhas.reduce((a,l)=>a+(l.nF+l.nN)*(l.m.custoF||0),0))} de material.`}));
  const ul=el("ul",{class:"rot-todo"});
  for(const l of best.linhas){ if(!(l.nF+l.nN)) continue; const m=l.m;
    ul.append(el("li",{},el("b",{text:`${m.it.nm}: ${fmt(l.nF+l.nN)} ${l.nF+l.nN>1?"peças":"peça"}`}),el("span",{class:"muted",text:` (${l.nF?`${fmt(l.nF)} com foco`:""}${l.nF&&l.nN?" e ":""}${l.nN?`${fmt(l.nN)} sem foco`:""}). Material ${fmtS((l.nF+l.nN)*m.custoF)}. Venda em ${bagCityPT(m.venda.c)} (${m.venda.mode==="inst"?"na hora":"anúncio"} a ${fmt(m.venda.p)}), ${sgn(Math.round(l.lucro))}.`}))); }
  card.append(ul);
  const bt=el("button",{type:"button",class:"btn",text:`Fiz a visita em ${best.city} hoje`}); bt.addEventListener("click",()=>{ ROT.ultima[best.city]=Date.now(); rotSave(); renderRot(); });
  card.append(bt);
  const outros=planos.filter(p=>p!==best).map(p=>{ const dd=rotDiasDesde(p.city); return `${p.city}: ${dd==null?"sem visita marcada":`há ${dd} ${dd===1?"dia":"dias"}`}, ${sgn(Math.round(p.lucro))}`; });
  if(outros.length) card.append(el("p",{class:"tiny muted",text:"Depois: "+outros.join(" · ")}));
  h.append(card);
}
function rotCidades(planos){
  const g=$("rotCid"); g.textContent="";
  for(const p of planos){ const c=p.city, card=el("article",{class:"rot-c"});
    const dd=rotDiasDesde(c);
    card.append(el("div",{class:"rot-ch"},el("h4",{text:c}),el("span",{class:"tag",text:dd==null?"sem visita":dd===0?"visitada hoje":`há ${dd} ${dd===1?"dia":"dias"}`})));
    for(const l of p.linhas){ const m=l.m, it=m.it, row=el("div",{class:"rot-i"});
      row.append(iconImg(it.id,40));
      const tx=el("div",{class:"rot-it"}); tx.append(el("b",{text:it.nm}));
      if(m.miss) tx.append(el("small",{class:"loss",text:`Sem preço: ${m.miss}`}));
      else { tx.append(el("small",{class:"muted",text:`${m.bonusC?`+${Math.round(m.bonusC*100)}% aqui`:`sem bônus aqui (bônus em ${it.city})`}${m.bd?` · +${Math.round(m.bd*100)}% hoje`:""} · ${dec(m.spf)} de prata por foco · vende ${m.vol==null?"?":fmtU(m.vol)}/dia em ${bagCityPT(m.venda.c)}`}));
        tx.append(el("small",{class:m.pF>0?"gain":"loss",text:`${sgn(Math.round(m.pF))} por peça com foco (${dec(m.pct*100)}%) · ${sgn(Math.round(m.pN))} sem foco`}));
        if(l.fora) tx.append(el("small",{class:"warn",text:"Abaixo dos filtros de lucro % ou vendas por dia: fica fora do plano."})); }
      const rm=el("button",{type:"button",class:"btn sm ghost",text:"Tirar","aria-label":`Tirar ${it.nm} de ${c}`}); rm.addEventListener("click",()=>{ ROT.itens[c]=(ROT.itens[c]||[]).filter(x=>x!==it.id); rotSave(); renderRot(); });
      row.append(tx,rm); card.append(row); }
    card.append(rotSugBox(c,p));
    card.append(rotBusca(c));
    g.append(card); }
}
/* procurar um item para pôr na cidade: mostra primeiro os que têm bônus nela */
function rotBusca(city){
  const w=el("div",{class:"rot-add"}), inp=el("input",{type:"search",placeholder:"Pôr item: ex. espada larga t6.1","aria-label":`Pôr um item na rotação de ${city}`}), res=el("div",{class:"rot-res"});
  const so=el("label",{class:"chk small"}); const cb=el("input",{type:"checkbox"}); cb.checked=true; so.append(cb," Só com bônus nesta cidade");
  const busca=()=>{ res.textContent=""; const q=inp.value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,""); const cat=rotCatalogo()||[]; if(q.length<2&&!cb.checked) return;
    const toks=q.split(/\s+/).filter(Boolean); const tem=new Set(ROT.itens[city]||[]);
    const l=cat.filter(it=>(!cb.checked||it.city===city)&&rotCatOk(it)&&!tem.has(it.id)&&toks.every(t=>it.busca.includes(t))).slice(0,q?8:0);
    for(const it of l){ const b=el("button",{type:"button",class:"rot-op"}); b.append(iconImg(it.id,28),el("span",{text:it.nm}),el("small",{class:"muted",text:it.city===city?`+15% aqui`:`bônus em ${it.city}`}));
      b.addEventListener("click",()=>{ (ROT.itens[city]=ROT.itens[city]||[]).push(it.id); rotSave(); renderRot(); }); res.append(b); } };
  let tm; inp.addEventListener("input",()=>{ clearTimeout(tm); tm=setTimeout(busca,200); }); cb.addEventListener("change",busca);
  w.append(inp,so,res); return w;
}
function rotOrdens(planos){
  const o=$("rotOrd"); o.textContent="";
  let total=0, eco=0; const blocos=[];
  for(const p of planos){ const mats=new Map();
    for(const l of p.linhas){ const n=l.nF+l.nN; if(!n||l.m.miss) continue;
      for(const x of l.m.mats){ const q=Math.ceil(x.qF*n), k=x.g.id, cur=mats.get(k)||{x,q:0}; cur.q+=q; mats.set(k,cur); } }
    if(!mats.size) continue;
    const tb=el("table",{class:"rot-ot"}), hr=tb.createTHead().insertRow(); ["Material","Quantidade","Ordem a pôr","Comprar na hora","Mais barato fora"].forEach(t=>hr.append(el("th",{text:t})));
    const body=tb.createTBody(); let sub=0, subE=0;
    for(const {x,q} of mats.values()){ const m=x.m, tr=body.insertRow();
      tr.insertCell().append(withIcon(rotApi(x.g.id),el("span",{text:x.g.nm})));
      const c1=tr.insertCell(); c1.className="num"; c1.textContent=fmt(q);
      const c2=tr.insertCell(); c2.className="num"; c2.textContent=m.ordem?`${fmt(m.ordem.p)} cada · ${fmtS(m.ordem.p*q)}`:"sem ordem aberta: compre na hora"; if(m.ordem){ sub+=m.ordem.k*q; }
      const c3=tr.insertCell(); c3.className="num muted"; c3.textContent=m.inst?fmt(m.inst.p):"—"; if(m.ordem&&m.inst) subE+=(m.inst.p-m.ordem.k)*q;
      const c4=tr.insertCell(); c4.className="num small"; c4.textContent=m.fora&&m.use&&m.fora.p<m.use.k*0.9?`${bagCityPT(m.fora.c)} a ${fmt(m.fora.p)}`:"—"; if(m.fora&&m.use&&m.fora.p<m.use.k*0.9) c4.title="Mais de 10% abaixo do custo daqui. Compensa só se você passar lá; veja o peso na página Transporte."; }
    total+=sub; eco+=subE;
    blocos.push(el("div",{class:"rot-ob"},el("h4",{text:`${p.city}${sub?` · ${fmtS(sub)} em ordens`:""}`}),el("div",{class:"tbl-wrap"},tb))); }
  o.append(el("p",{class:"small",text:blocos.length?`Para a próxima visita de cada cidade: ${fmtS(total)} em ordens de compra, ${subTxt(eco)} em relação a comprar tudo na hora. Ponha a ordem na própria cidade do craft: o material fica no mercado onde a ordem encheu.`:"Os materiais aparecem aqui quando a rotação tiver itens com preço."}),...blocos);
}
const subTxt=v=>v>0?`uns ${fmtS(v)} a menos`:"quase o mesmo";
function rotUI(){
  const b=$("rotCtl"); if(!b||b.dataset.ok) return; b.dataset.ok="1";
  const cs=new Set(ROT.cidades);
  mselUI("rotCidades",ROT_CIDADES.map(c=>[c,c]),cs,"Nenhuma","cidades",()=>{ ROT.cidades=ROT_CIDADES.filter(c=>cs.has(c)); rotSave(); renderRot(); });
  const d=$("rotDias"); d.value=String(ROT.dias); d.addEventListener("change",()=>{ ROT.dias=Math.max(1,Math.min(7,Math.round(+d.value)||3)); d.value=String(ROT.dias); rotSave(); renderRot(); });
  for(const [id,k] of [["rotMinPct","minPct"],["rotMinVol","minVol"]]){ const i=$(id); i.value=ROT[k]; let t2; i.addEventListener("input",()=>{ ROT[k]=i.value.trim(); rotSave(); for(const c in ROT_SUG) delete ROT_SUG[c]; clearTimeout(t2); t2=setTimeout(renderRot,400); }); }
  { const bm=$("rotBM"); bm.checked=ROT.bm!==false; bm.addEventListener("change",()=>{ ROT.bm=bm.checked; rotSave(); for(const c in ROT_SUG) delete ROT_SUG[c]; renderRot(); }); }
  const muda=()=>{ rotSave(); for(const c in ROT_SUG) delete ROT_SUG[c]; renderRot(); };
  { const ts=new Set(ROT.tiers), es=new Set(ROT.enchs), vs=new Set(ROT.vendaC);
    mselUI("rotTier",[4,5,6,7,8].map(t=>[t,`T${t}`]),ts,"T4 a T8","tiers",()=>{ ROT.tiers=[...ts].sort(); muda(); });
    mselUI("rotEnch",[0,1,2,3,4].map(e=>[e,`.${e}`]),es,".0 a .3","encantamentos",()=>{ ROT.enchs=[...es].sort(); muda(); });
    mselUI("rotVendaC",[...ROT_CIDADES,"Caerleon"].map(c=>[c,c]),vs,"Todas","cidades",()=>{ ROT.vendaC=[...vs]; muda(); }); }
  const seg=(id,opts,k)=>{ const g=$(id); opts.forEach(([v,t,tt])=>{ const b=el("button",{type:"button",text:t}); b.dataset.v=v; if(tt) b.title=tt; g.append(b); });
    const pinta=()=>g.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===ROT[k]))); pinta();
    g.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ROT[k]=b.dataset.v; pinta(); muda(); }); };
  seg("rotGrupo",ROT_GRUPOS,"grupo");
  seg("rotCompra",[["ordem","Ordem de compra","A maior ordem aberta +1, mais os 2,5% da ordem. Sem ordem aberta, compra na hora."],["auto","Automático","O mais barato entre pôr ordem (+2,5%) e comprar na hora"],["inst","Na hora","Compra do menor anúncio da cidade"]],"compra");
  seg("rotVenda",[["auto","Automático","O que deixa mais prata depois das taxas: anunciar (+2,5%) ou vender na hora"],["ordem","Anunciar"],["inst","Na hora"]],"venda");
  const m=$("rotCash"); m.value=ROT.cash; let tm; m.addEventListener("input",()=>{ ROT.cash=m.value; rotSave(); clearTimeout(tm); tm=setTimeout(renderRot,400); });
}

/* Sugestões pela sua spec: itens com bônus na cidade, das linhas em que a sua ficha tem mais eficiência de foco (spec),
   ordenados pelo que uma visita rende com o foco de uma visita, respeitando o que a venda absorve no ciclo. */
const ROT_SUG={};
const rotSpecPct=fce=>Math.round((1-Math.pow(0.5,(fce||0)/10000))*100);
const ROT_BOA_VENDA=5;   // "boas vendas" quando o filtro de vendas por dia está vazio
const ROT_SUG_MODO={};
function rotSugBox(city,plano){
  const w=el("details",{class:"rot-sug"}); w.append(el("summary",{text:"Sugestões de craft"}));
  const body=el("div",{class:"rot-sb"}); w.append(body);
  const desenha=()=>{ body.textContent=""; const modo=ROT_SUG_MODO[city]||"spec", key=city+"|"+modo, s=ROT_SUG[key];
    const seg=el("div",{class:"seg rot-sm",role:"group","aria-label":"Tipo de sugestão"});
    for(const [v,t,tt] of [["spec","Pela minha spec","Itens com bônus aqui nas linhas em que a sua ficha tem mais spec"],["lucro","Mais lucro com boas vendas",`Todos os itens com bônus aqui, os que mais rendem por visita entre os que vendem ao menos ${rotNum(ROT.minVol)||ROT_BOA_VENDA} por dia`]]){
      const b=el("button",{type:"button",text:t,title:tt}); b.setAttribute("aria-pressed",String(v===modo)); b.addEventListener("click",()=>{ ROT_SUG_MODO[city]=v; desenha(); }); seg.append(b); }
    body.append(seg);
    if(!s){ body.append(el("p",{class:"tiny muted",text:modo==="spec"?"Procura, entre os itens com bônus aqui, os das linhas em que você tem mais spec, e mostra os que mais rendem por visita.":`Olha todos os itens com bônus aqui (T4 a T8, .0 a .3) e mostra os que mais rendem por visita entre os que vendem ao menos ${fmtU(rotNum(ROT.minVol)||ROT_BOA_VENDA)} por dia. Faz bem mais consultas: pode levar meio minuto.`})); const b=el("button",{type:"button",class:"btn sm",text:"Procurar"}); b.addEventListener("click",()=>rotSugCalc(city,desenha,modo)); body.append(b); return; }
    if(s.loading){ body.append(el("p",{class:"tiny muted",text:s.loading})); return; }
    if(!s.lista.length){ body.append(el("p",{class:"tiny muted",text:s.vazio||(ROT.minPct||ROT.minVol?"Nada passa pelos filtros de lucro % e vendas por dia aqui. Afrouxe um deles.":"Nada com lucro e boas vendas agora aqui.")})); return; }
    const tem=new Set(ROT.itens[city]||[]);
    for(const x of s.lista){ const m=x.m, it=m.it, r=el("div",{class:"rot-op rot-sg"});
      r.append(iconImg(it.id,28),el("span",{},el("b",{text:it.nm}),el("small",{class:"muted",text:` · ${it.fce>0?`spec ${rotSpecPct(it.fce)}% menos foco · `:modo==="lucro"?"sem spec · ":""}lucro ${dec(m.pct*100)}% · ${dec(m.spf)} por foco · ${sgn(Math.round(x.visita))} numa visita${m.vol!=null?` · vende ${fmtU(m.vol)}/dia em ${bagCityPT(m.venda.c)}`:""}`})));
      const b=el("button",{type:"button",class:"btn sm",text:tem.has(it.id)?"Já está":"Pôr"}); b.disabled=tem.has(it.id);
      b.addEventListener("click",()=>{ (ROT.itens[city]=ROT.itens[city]||[]).push(it.id); rotSave(); renderRot(); }); r.append(b); body.append(r); } };
  desenha(); const s0=ROT_SUG[city+"|"+(ROT_SUG_MODO[city]||"spec")]; if(s0&&!s0.loading) w.open=true; return w;
}
async function rotSugCalc(city,redraw,modo="spec"){
  const key=city+"|"+modo, set=v=>{ ROT_SUG[key]=v; redraw(); };
  set({loading:modo==="spec"?"Procurando as linhas com mais spec…":"Separando os itens com bônus aqui…"});
  const cat=rotCatalogo()||[], comBonus=cat.filter(it=>it.city===city&&rotCatOk(it)); comBonus.forEach(it=>{ it.fce=bmFCE(it.key); });
  let cands=comBonus;
  if(modo==="spec"){ const porLinha=new Map(); for(const it of comBonus){ const v=porLinha.get(it.key); if(!v||it.fce>v) porLinha.set(it.key,it.fce||0); }
    const linhas=[...porLinha.entries()].filter(([,f])=>f>0).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>k);
    if(!linhas.length){ set({lista:[],vazio:"A sua ficha não tem spec de craft nas linhas com bônus aqui. Preencha a Minha ficha (ou sincronize pelo overlay), ou use Mais lucro com boas vendas."}); return; }
    cands=comBonus.filter(it=>linhas.includes(it.key)); }
  set({loading:`Buscando preços de ${fmt(cands.length)} itens…`});
  try{
    const ids=[...new Set(cands.map(it=>rotApi(it.id)))].filter(x=>!ROT_LOADED.has(x)), mats=[...new Set(cands.flatMap(it=>it.ing.map(g=>rotApi(g.id))))].filter(x=>!ROT_LOADED.has(x));
    if(mats.length) await fetchIds(mats,DATA.itens,SHOP_LOCS); mats.forEach(x=>ROT_LOADED.add(x));
    for(let i=0;i<ids.length;i+=150){ const part=ids.slice(i,i+150); await fetchIds(part,DATA.itens,[...SHOP_LOCS,"Black Market"]); part.forEach(x=>ROT_LOADED.add(x)); if(ids.length>150) set({loading:`Buscando preços: ${fmt(Math.min(ids.length,i+150))} de ${fmt(ids.length)}…`}); }
    const F=rotFocoVisita(), visita=m=>{ const teto=m.vol!=null?Math.max(1,Math.floor(m.vol*rotCiclo())):Infinity, nF=m.pF>0?Math.min(teto,F>0?Math.floor(F/m.fc1):0):0, nN=m.pN>0?Math.min(teto-nF,isFinite(teto)?teto:0):0; return nF*m.pF+nN*m.pN; };
    const mp=rotNum(ROT.minPct), mv=rotNum(ROT.minVol)||(modo==="lucro"?ROT_BOA_VENDA:null);
    let ms=cands.map(it=>rotModel(it,city)).filter(m=>!m.miss&&m.pF>0&&(mp==null||m.pct*100>=mp));
    /* spec: os que mais rendem por foco; lucro: os de maior lucro por peça (as vendas decidem depois) */
    ms=ms.sort(modo==="spec"?(a,b)=>b.spf-a.spf:(a,b)=>b.pF-a.pF).slice(0,modo==="spec"?40:80);
    set({loading:`Consultando quanto ${fmt(ms.length)} itens vendem por dia…`});
    const keys=ms.map(m=>rotApi(m.it.id)+"|"+m.venda.c).filter(k=>OF2.hs[k]==null); if(keys.length) await histFetch(keys);
    ms=ms.map(m=>rotModel(m.it,city)).filter(m=>rotPassa(m)&&(mv==null||(m.vol!=null&&m.vol>=mv)));
    const lista=ms.map(m=>({m,visita:visita(m)})).filter(x=>x.visita>0).sort((a,b)=>b.visita-a.visita).slice(0,modo==="spec"?6:8);
    set({lista});
  }catch(e){ set({lista:[],vazio:"Não consegui buscar os preços agora."}); }
}
