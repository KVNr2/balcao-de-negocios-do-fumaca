/* Rotação de craft: um ou mais crafts fixos por cidade; uma visita (a uma cidade) a cada N dias, passando pelas cidades em rodízio.
   O foco é do personagem, não da cidade: cada visita usa o foco que encheu desde a anterior (10.000 por dia no Premium, até 30.000).
   Cada cidade volta a ser visitada depois de N × cidades dias: é o tempo das ordens encherem e da venda escoar.
   Cada material é comprado na cidade real onde sai mais barato (ordem de compra ou na hora) e levado até a cidade do craft.
   Você escolhe quantas peças fazer de cada item; o site sugere um número e guarda o que você escrever.
   Na visita: o foco acumulado (até 30.000) vai primeiro no item que mais rende por ponto de foco, e cada item fica limitado
   ao que você consegue vender no prazo escolhido (vendas por dia × a sua parte delas × dias). */
const ROT_CIDADES=["Lymhurst","Fort Sterling","Bridgewatch","Martlock","Thetford"];
const ROT=(()=>{ const d={cidades:[...ROT_CIDADES],itens:{},ultima:{},dias:3,cash:"",minPct:"",minVol:"",v:2};
  try{ const o=JSON.parse(store.get("rotacao")||"{}"); const r={...d,...o,itens:o.itens||{},ultima:o.ultima||{}};
    if(!o.v||o.v<2){ if(!r.cidades.includes("Thetford")) r.cidades=ROT_CIDADES.filter(c=>c==="Thetford"||r.cidades.includes(c)); r.v=2; }   // Thetford entrou na rotação
    if(!Array.isArray(r.tiers)) r.tiers=[]; if(!Array.isArray(r.enchs)) r.enchs=r.soE0?[0]:[]; if(!Array.isArray(r.vendaC)) r.vendaC=[];
    if(!r.compra) r.compra="ordem"; if(!r.venda) r.venda="auto"; if(r.grupo==null) r.grupo=""; if(!(r.vDias>0)) r.vDias=3; if(!r.enc) r.enc="auto"; if(!(r.fatia>0)) r.fatia=50; if(!r.qtd||typeof r.qtd!=="object") r.qtd={}; delete r.soE0;
    return r; }catch(e){ return {...d,tiers:[],enchs:[],vendaC:[],compra:"ordem",venda:"auto",grupo:"",qtd:{},vDias:3,fatia:50,enc:"auto"}; } })();
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
/* quanto dá para vender: as vendas por dia × a sua parte delas (há outros vendedores) × os dias em que você quer vender tudo.
   Item que vende menos de uma peça nesse prazo: no máximo 1. */
const rotVende=m=>m.vol!=null?m.vol*(ROT.fatia/100):null;
const rotTeto=m=>{ const v=rotVende(m); if(v==null) return Infinity; const t=Math.floor(v*ROT.vDias); return t>=1?t:(m.vol>0?1:0); };
const rotDiasVender=(m,n)=>{ const v=rotVende(m); return v>0&&n>0?n/v:null; };
const rotCiclo=()=>ROT.dias*Math.max(1,ROT.cidades.length);   // dias até voltar à mesma cidade
/* preço de um material na cidade da rotação (motor único, js/precos.js): a ordem a pôr é a maior aberta +1 prata, mais os 2,5% */
/* refinar você mesmo: matéria-prima e o refinado do tier de baixo comprados na cidade do bônus de refino (+40%), sem foco ou com foco */
function rotRef(id,foco){
  const P=typeof refParse==="function"&&refParse(id); if(!P||P.t<4) return null; const {R,t,e}=P;
  const rawId=idLv(t,R.raw,e), raw=PX.compra(PX.rec(rawId),R.city,ROT.compra,{lance:1}); if(!raw) return null;
  const prevId=t===4?`T3_${R.ref}`:idLv(t-1,R.ref,e), pb=PX.compra(PX.rec(prevId),R.city,ROT.compra,{lance:1}), pr=t>4?rotRef(prevId,false):null;
  const usePr=pr&&(!pb||pr.k<pb.k), prevK=usePr?pr.k:pb?pb.k:Infinity; if(!isFinite(prevK)) return null;
  const rr=rrr(0.40,foco,st.daily+bdItem(id)), fee=IV(t,e)*0.1125*feeVal()/100;
  return {k:(N[t]*raw.k+prevK)*(1-rr)+fee,rawId,raw,n:N[t],prevId,prevK,prevSrc:usePr?"refinado":"comprado",prevBuy:pb,rr,city:R.city,R,t,e};
}
/* tudo que a conta de refinar precisa de preço: matéria-prima e refinados dos tiers de baixo, até o T3 */
function rotRefIds(id){ const P=typeof refParse==="function"&&refParse(id); if(!P||P.t<4) return []; const {R,t,e}=P, out=[`T3_${R.ref}`];
  for(let k=4;k<=t;k++){ out.push(rotApi(idLv(k,R.raw,e)),rotApi(idLv(k,R.ref,e))); } return out; }
/* prata a mais por ponto de foco refinando este material (com foco × sem foco) */
function rotRefSpf(id){ const a=rotRef(id,false), b=rotRef(id,true); if(!a||!b) return null; const fc=refFocus(b.R.k,b.t,b.e); return fc>0?(a.k-b.k)/fc:null; }
/* onde comprar: a cidade real mais barata (já com os 2,5% da ordem); a própria cidade do craft ganha se ficar até 3% acima, para não carregar à toa */
function rotCompra(id,city){ const r=PX.rec(id), loc=PX.compra(r,city,ROT.compra,{lance:1}), best=PX.melhorCompra(r,ROT_CIDADES,ROT.compra,{lance:1});
  return loc&&best&&loc.k<=best.k*1.03?loc:(best||loc); }
function rotMat(id,city){ const r=PX.rec(id);
  const ordem=(()=>{ const x=PX.compra(r,city,"ordem",{lance:1}); return x&&x.mode==="ordem"?x:null; })(), inst=PX.compra(r,city,"inst");
  let use=rotCompra(id,city);
  if(ROT.refinar){ const ref=rotRef(id,false); if(ref&&(!use||ref.k<use.k)) use={p:ref.k,k:ref.k,mode:"refino",ref,c:ref.city,t:ref.raw.t}; }
  return {ordem,inst,use}; }
/* melhor venda líquida nas cidades escolhidas (ou nas reais e Caerleon) e, se marcado, no Mercado Negro */
/* cidades cujo histórico de vendas a Rotação consulta: as de venda, Brecilien (para o total) e o Mercado Negro */
const ROT_HLOCS=()=>[...new Set([...ROT_CIDADES,...SHOP_LOCS,"Black Market"])];
/* " · 35 somando as cidades", quando o total é bem maior que o da cidade de venda */
const rotVolTot=(id,m)=>{ const t=typeof lfVol==="function"?lfVol(rotApi(id)):null; return t>0&&t-(m.vol||0)>=1&&t>(m.vol||0)*1.5?` · ${fmtU(t)} somando as cidades`:""; };
function rotVenda(id){ const r=PX.rec(id), locs=ROT.vendaC.length?ROT.vendaC.filter(c=>c!=="Black Market"):[...ROT_CIDADES,"Caerleon"];
  return PX.melhorVenda(r,[...locs,...(ROT.bm===false?[]:["Black Market"])],ROT.venda,{id:rotApi(id)}); }
/* item encantado tem dois caminhos: fabricar já encantado (materiais encantados) ou fabricar a .0 e encantar com runas, almas e relíquias.
   Runa, alma e relíquia não voltam no retorno de material. Devolve o caminho de encantar (receita da .0 + o que encanta) ou null. */
function rotRotaEnc(it){
  if(!(it.e>=1&&it.e<=3)||!GEAR||!GEAR.e) return null;   /* .4 não tem caminho de encantar */ const mm=/^T(\d)_(.+?)(?:@\d)?$/.exec(it.id), key=mm&&mm[2], n=key&&GEAR.e[key]; if(!n) return null;
  const it0=rotItem(bmId(key,it.t,0)); if(!it0) return null;
  const extra=[]; for(let k=1;k<=it.e;k++) extra.push({id:`T${it.t}_${EN_MAT[k][0]}`,n,nm:`${EN_MAT[k][1]} T${it.t}`,art:true,enc:true});
  return {it0,ing:[...it0.ing,...extra]};
}
function rotModel(it,city){
  it.fce=bmFCE(it.key);   // a ficha pode ter mudado (ou sincronizado) depois de montar o catálogo
  const venda=rotVenda(it.id); if(!venda) return {it,miss:"preço de venda"};
  const bonusC=it.city===city?it.bonus:0, bd=bdItem(it.id), rF=rrr(bonusC,true,st.daily+bd), rN=rrr(bonusC,false,st.daily+bd);
  /* caminho do encantado: o mais barato sem foco (ou o que você escolheu) */
  let ing=it.ing, focus=it.focus, feeB=it.fee, enc=null; const R=rotRotaEnc(it);
  if(R){ const custo=(l,f)=>{ let c=f*feeVal()/100; for(const g of l){ const x=rotMat(g.id,city); if(!x.use) return null; c+=g.n*(g.art?1:1-rN)*x.use.k; } return c; };
    const a=custo(it.ing,it.fee), b=custo(R.ing,R.it0.fee), usa=ROT.enc==="craft"?"craft":ROT.enc==="runas"?(b!=null?"runas":"craft"):(b!=null&&(a==null||b<a)?"runas":"craft");
    enc={a,b,usa}; if(usa==="runas"){ ing=R.ing; focus=R.it0.focus; feeB=R.it0.fee; } }
  const fc1=Math.max(1,Math.round(focus*Math.pow(0.5,(it.fce||0)/10000))), fee=feeB*feeVal()/100;
  let cF=fee, cN=fee, ordemT=0, instT=0; const mats=[];
  for(const g of ing){ const m=rotMat(g.id,city); if(!m.use) return {it,miss:g.nm};
    const fat=g.art?1:null, qF=g.n*(fat||(1-rF)), qN=g.n*(fat||(1-rN));
    cF+=qF*m.use.k; cN+=qN*m.use.k; if(m.inst) instT+=qF*m.inst.k; ordemT+=qF*m.use.k; mats.push({g,m,qF}); }
  const net=it.q*venda.k, pF=net-cF, pN=net-cN, h=OF2.hs[rotApi(it.id)+"|"+venda.c], vol=h&&h.vol>=0?h.vol:null;
  /* refinar: quanto economiza por peça e quanto rende o foco gasto refinando, para comparar com o foco gasto no craft */
  let refEco=0, refSpf=null; for(const x of mats){ if(x.m.use.mode!=="refino") continue; const b=rotCompra(x.g.id,city); if(b) refEco+=x.qF*(b.k-x.m.use.k); const sp=rotRefSpf(x.g.id); if(sp!=null&&(refSpf==null||sp>refSpf)) refSpf=sp; }
  return {it,city,venda,rF,rN,fc1,pF,pN,pct:cF>0?pF/cF:0,spf:(pF-pN)/fc1,mats,custoF:cF,custoN:cN,fee,enc,economia:instT-ordemT,vol,bonusC,bd,refEco,refSpf};
}
/* plano de uma visita. Sugestão: foco primeiro onde rende mais por ponto, sem passar do que você vende no prazo escolhido.
   Se você escreveu quantas fazer, vale o seu número: o foco vai primeiro nos itens que rendem mais por ponto e o resto sai sem foco. */
function rotPlano(city,foco,cash){
  const ms=(ROT.itens[city]||[]).map(id=>rotItem(id)).filter(Boolean).map(it=>rotModel(it,city)), Q=ROT.qtd[city]||{};
  const ok=ms.filter(m=>!m.miss).sort((a,b)=>b.spf-a.spf); let F=foco, C=cash>0?cash:Infinity; const sug=new Map();
  for(const m of ok){ const teto=rotTeto(m);
    if(!rotPassa(m)){ sug.set(m.it.id,{n:0,teto}); continue; }
    let nF=m.pF>0?Math.min(teto,Math.floor(F/m.fc1),Math.floor(C/Math.max(1,m.custoF))):0; if(!isFinite(nF)) nF=0; F-=nF*m.fc1; C-=nF*m.custoF;
    let nN=m.pN>0?Math.min(teto-nF,Math.floor(C/Math.max(1,m.custoN))):0; if(!isFinite(nN)) nN=0; C-=nN*m.custoN;
    sug.set(m.it.id,{n:nF+nN,teto}); }
  F=foco; const linhas=[];
  for(const m of ok){ const s=sug.get(m.it.id), q=Q[m.it.id], manual=q!=null&&q>=0, N=manual?q:s.n;
    const nF=m.pF>0?Math.max(0,Math.min(N,Math.floor(F/m.fc1))):0; F-=nF*m.fc1; const nN=N-nF;
    linhas.push({m,nF,nN,n:N,sug:s.n,manual,teto:s.teto,lucro:nF*m.pF+nN*m.pN,custo:nF*m.custoF+nN*m.custoN,foco:nF*m.fc1,fora:!rotPassa(m)&&!manual}); }
  for(const m of ms.filter(m=>m.miss)) linhas.push({m,nF:0,nN:0,n:0,sug:0,lucro:0,custo:0,foco:0});
  const ord=new Map((ROT.itens[city]||[]).map((id,i)=>[id,i])); linhas.sort((a,b)=>(ord.get(a.m.it.id)||0)-(ord.get(b.m.it.id)||0));   // na ordem em que você pôs
  return {city,linhas,lucro:linhas.reduce((a,l)=>a+l.lucro,0),custo:linhas.reduce((a,l)=>a+l.custo,0),foco:foco-F};
}
async function rotEnsure(note){
  if(!BM){ BM=await need("bm"); } if(!GEAR){ try{ GEAR=await need("gear"); }catch(e){} } rotCatalogo();
  const ids=new Set(), mats=new Set();
  for(const c of ROT.cidades) for(const id of (ROT.itens[c]||[])){ const it=rotItem(id); if(!it) continue; ids.add(rotApi(it.id));
    const R=rotRotaEnc(it); [...it.ing,...(R?R.ing:[])].forEach(g=>{ mats.add(rotApi(g.id)); if(ROT.refinar) rotRefIds(g.id).forEach(x=>mats.add(x)); }); }
  const falta=[...ids,...mats].filter(x=>!ROT_LOADED.has(x));
  if(falta.length){ note.textContent="Buscando os preços…"; await fetchIds([...ids].filter(x=>!ROT_LOADED.has(x)),DATA.itens,[...SHOP_LOCS,"Black Market"]); await fetchIds([...mats].filter(x=>!ROT_LOADED.has(x)),DATA.itens,SHOP_LOCS); falta.forEach(x=>ROT_LOADED.add(x)); }
  const keys=[...ids].flatMap(id=>ROT_HLOCS().map(c=>id+"|"+c)).filter(k=>OF2.hs[k]==null);
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
    ul.append(el("li",{},el("b",{text:`${m.it.nm}: ${fmt(l.nF+l.nN)} ${l.nF+l.nN>1?"peças":"peça"}`}),el("span",{class:"muted",text:` (${l.nF?`${fmt(l.nF)} com foco`:""}${l.nF&&l.nN?" e ":""}${l.nN?`${fmt(l.nN)} sem foco`:""}). Material ${fmtS(l.custo)}. Venda em ${bagCityPT(m.venda.c)} (${m.venda.mode==="inst"?"na hora":"anúncio"} a ${fmt(m.venda.p)}), ${sgn(Math.round(l.lucro))}.`}))); }
  card.append(ul);
  const bt=el("button",{type:"button",class:"btn",text:`Fiz a visita em ${best.city} hoje`}); bt.addEventListener("click",()=>{ ROT.ultima[best.city]=Date.now(); rotSave(); renderRot(); });
  card.append(bt);
  const outros=planos.filter(p=>p!==best).map(p=>{ const dd=rotDiasDesde(p.city); return `${p.city}: ${dd==null?"sem visita marcada":`há ${dd} ${dd===1?"dia":"dias"}`}, ${sgn(Math.round(p.lucro))}`; });
  if(outros.length) card.append(el("p",{class:"tiny muted",text:"Depois: "+outros.join(" · ")}));
  h.append(card);
}
/* textos curtos de como compra e como vende */
const rotModoC=u=>u.mode==="ordem"?"ordem de compra":u.mode==="refino"?"refinando você mesmo":"compra na hora";
const rotModoV=v=>v.c==="Black Market"?"venda na hora (Mercado Negro)":v.mode==="ordem"?"anúncio":"venda na hora";
const rotQN=(x,m)=>x.g.art?x.g.n:x.g.n*(1-m.rN);
const rotNm=(x,m)=>x.g.art&&/^artefato$/i.test(x.g.nm)?`Artefato de ${m.it.name} T${m.it.t}`:x.g.nm;
const rotPctN=m=>m.custoN>0?m.pN/m.custoN:0;
const rotDetAberto=(()=>{ try{ return new Set(JSON.parse(store.get("rotDetAberto")||"[]")); }catch(e){ return new Set(); } })();
function rotLembra(d,k){ if(rotDetAberto.has(k)) d.open=true;
  d.addEventListener("toggle",()=>{ d.open?rotDetAberto.add(k):rotDetAberto.delete(k); try{ store.set("rotDetAberto",JSON.stringify([...rotDetAberto])); }catch(e){} }); return d; }
/* card do item: lucro %, onde vende e quantas fazer (vem com a sugestão do site; o que você escrever fica guardado) */
function rotLinhaItem(l,c){
  const m=l.m, it=m.it, row=el("div",{class:"rot-i"});
  row.append(iconImg(it.id,40));
  const tx=el("div",{class:"rot-it"}), hd=el("div",{class:"rot-ih"}); hd.append(el("b",{text:it.nm}));
  if(!m.miss){ hd.append(el("span",{class:"rot-chip"+(m.bonusC?" ok":""),text:m.bonusC?`+${Math.round(m.bonusC*100)}% de retorno aqui`:`sem bônus aqui (é em ${it.city})`}));
    if(m.bd) hd.append(el("span",{class:"rot-chip ok",text:`+${Math.round(m.bd*100)}% hoje`}));
    if(m.enc&&m.enc.usa==="runas") hd.append(el("span",{class:"rot-chip",text:`fabricar .0 e encantar`})); }
  tx.append(hd);
  const ctl=el("div",{class:"rot-ctl2"});
  if(m.miss) tx.append(el("small",{class:"loss",text:`Sem preço de ${m.miss}: não dá para calcular.`}));
  else {
    tx.append(el("small",{class:m.pF>0?"gain":"loss",text:`Lucro: ${dec(m.pct*100)}% com foco · ${dec(rotPctN(m)*100)}% sem foco`}));
    { const hn=volNota(OF2.hs[rotApi(it.id)+"|"+m.venda.c]); tx.append(el("small",{class:"muted",text:`Vende ${m.vol==null?"?":fmtU(m.vol)} por dia em ${bagCityPT(m.venda.c)}${hn?` (${hn})`:""}${rotVolTot(it.id,m)}`}));
      if(m.venda.semSaida) tx.append(el("small",{class:"loss",text:"Vende menos de 1 por dia em todas as cidades: o preço usado é o da cidade que paga mais."}));
      else if(m.venda.anuncio) tx.append(el("small",{class:"muted",text:`Anúncio de ${fmt(m.venda.anuncio)} lá, mas a conta usa ${fmt(m.venda.p)} (até 1,3× o preço médio de 7 dias da cidade).`})); }
    const dv=rotDiasVender(m,l.n);
    if(dv!=null) tx.append(el("small",{class:dv>ROT.vDias*1.5?"warn":"muted",text:`${fmt(l.n)} ${l.n===1?"peça leva":"peças levam"} uns ${dv<1?"menos de 1 dia":`${dv<10?dec(dv):fmt(dv)} dias`} para vender${dv>ROT.vDias*1.5?`, mais que os ${ROT.vDias} que você quer`:""}`}));
    if(l.fora) tx.append(el("small",{class:"warn",text:"Abaixo dos seus filtros de lucro % ou vendas: a sugestão é não fazer."}));
    const lab=el("label",{class:"rot-q"}), inp=el("input",{type:"number",min:"0",step:"1",inputMode:"numeric",value:String(l.n),"aria-label":`Quantas ${it.nm} fazer em ${c}`});
    lab.append(el("span",{text:"Fazer"}),inp);
    ctl.append(lab,el("small",{class:"muted rot-qs",text:l.manual?(l.n!==l.sug?`sugestão: ${fmt(l.sug)}`:"igual à sugestão"):"sugestão do site"}));
    inp.addEventListener("change",()=>{ const v=inp.value.trim(), Q=ROT.qtd[c]=ROT.qtd[c]||{};
      if(v==="") delete Q[it.id]; else Q[it.id]=Math.max(0,Math.floor(+v)||0); rotSave(); renderRot(); });
    inp.addEventListener("keydown",ev=>{ if(ev.key==="Enter") inp.blur(); });
  }
  const rm=el("button",{type:"button",class:"btn sm ghost",text:"Tirar","aria-label":`Tirar ${it.nm} de ${c}`});
  rm.addEventListener("click",()=>{ ROT.itens[c]=(ROT.itens[c]||[]).filter(x=>x!==it.id); if(ROT.qtd[c]) delete ROT.qtd[c][it.id]; rotSave(); renderRot(); });
  ctl.append(rm); row.append(tx,ctl); return row;
}
/* materiais da visita somados: cada um na cidade real onde sai mais barato. Refinar você mesmo vira a matéria-prima, na cidade do refino.
   A quantidade já desconta o retorno de material, mas nunca fica abaixo da receita de um craft (o primeiro pede a receita cheia). */
function rotCompras(p){ const mp=new Map();
  const add=(id,nm,q,b,via)=>{ if(!(q>0)||!b) return; const k=id+"|"+b.c+"|"+b.mode, cur=mp.get(k)||{id,nm,q:0,c:b.c,mode:b.mode,p:b.p,k:b.k,via:new Set()}; cur.q+=q; if(via) cur.via.add(via); mp.set(k,cur); };
  for(const l of p.linhas){ if(!l.n||l.m.miss) continue; const m=l.m;
    for(const x of m.mats){ const u=x.m.use, q=Math.max(l.nF*x.qF+l.nN*rotQN(x,m),x.g.n);
      if(u.mode==="refino"){ const f=u.ref, via=`para refinar em ${f.city}`;
        add(f.rawId,`${f.R.rawPT} T${f.t}.${f.e}`,q*f.n*(1-f.rr),rotCompra(f.rawId,f.city),via);
        if(f.prevSrc==="comprado") add(f.prevId,`${f.R.refPT} ${f.t===4?"T3":`T${f.t-1}.${f.e}`}`,q*(1-f.rr),rotCompra(f.prevId,f.city),via); continue; }
      add(x.g.id,rotNm(x,m),q,u,x.g.enc?"para encantar":x.g.art?"artefato":null); } }
  return [...mp.values()].map(x=>({...x,q:Math.ceil(x.q)})).sort((a,b)=>b.q*b.k-a.q*a.k); }
const rotLcItem=x=>({id:rotApi(x.id),nm:x.nm,q:x.q,c:x.c,p:x.p,modo:x.mode==="ordem"?"ordem":"inst"});
function rotTabMats(ls,city){
  const tb=el("table",{class:"rot-tb rot-mt"}), tbd=el("tbody");
  tb.append(el("thead",{},el("tr",{},el("th",{text:"Material"}),el("th",{class:"n",text:"Comprar"}),el("th",{text:"Onde"}),el("th",{class:"n",text:"Preço"}),el("th",{class:"n",text:"Total"}))));
  for(const x of ls){ const nm=el("span",{class:"rot-mn"}); nm.append(iconImg(rotApi(x.id),28),el("span",{},el("span",{text:x.nm}),x.via.size?el("small",{class:"muted",text:[...x.via].join(", ")}):null));
    tbd.append(el("tr",{},el("td",{},nm),el("td",{class:"n",text:fmt(x.q)}),
      el("td",{},el("span",{text:bagCityPT(x.c)+(x.c===city?" (aqui)":"")}),el("small",{class:"muted",text:x.mode==="ordem"?"ordem de compra":"compra na hora"})),
      el("td",{class:"n",text:fmt(x.p)}),el("td",{class:"n",text:fmtS(x.q*x.k)}))); }
  tb.append(tbd); return tb; }
/* aba Detalhes: a conta completa de um item */
function rotDetItem(l,city){
  const m=l.m, it=m.it, box=el("section",{class:"rot-dx"});
  const hd=el("div",{class:"rot-dxh"}); hd.append(iconImg(it.id,32),el("b",{text:it.nm})); box.append(hd);
  if(m.miss){ box.append(el("p",{class:"small loss",text:`Falta o preço de ${m.miss}.`})); return box; }
  const net=it.q*m.venda.k, cmp=el("table",{class:"rot-tb rot-cmp"}), cb=el("tbody");
  cmp.append(el("thead",{},el("tr",{},el("th",{text:""}),el("th",{class:"n",text:"Com foco"}),el("th",{class:"n",text:"Sem foco"}))));
  const ln=(rot,a,b,cls)=>cb.append(el("tr",{class:cls||""},el("th",{text:rot}),el("td",{class:"n",text:a}),el("td",{class:"n",text:b})));
  ln("Retorno de material",`${dec(m.rF*100)}%`,`${dec(m.rN*100)}%`);
  ln("Custo por peça",fmt(m.custoF),fmt(m.custoN));
  ln("Taxa da estação (já no custo)",fmt(m.fee),fmt(m.fee));
  ln("Venda, depois das taxas",fmt(net),fmt(net));
  ln("Lucro por peça",sgn(Math.round(m.pF)),sgn(Math.round(m.pN)),"tot");
  ln("Foco por peça",fmt(m.fc1),"0");
  cmp.append(cb); const wc=el("div",{class:"rot-tbw"}); wc.append(cmp); box.append(wc);
  if(m.enc){ const e=m.enc, ab=e.a!=null&&e.b!=null;
    box.append(el("p",{class:"small",text:`Caminho: ${e.usa==="runas"?`fabricar a .0 e encantar até .${it.e}`:`fabricar já .${it.e} com materiais encantados`}.${ab?` Sem foco, fabricar já encantado custa ${fmt(e.a)} por peça e fabricar a .0 e encantar, ${fmt(e.b)}${ROT.enc==="auto"?" (o site usa o mais barato)":""}.`:e.b==null?" Sem preço de runa, alma ou relíquia agora.":""}`})); }
  const tb=el("table",{class:"rot-tb"}), tbd=el("tbody");
  tb.append(el("thead",{},el("tr",{},el("th",{text:"Receita"}),el("th",{class:"n",text:"Pede"}),el("th",{class:"n",text:"Gasta, com foco"}),el("th",{class:"n",text:"Sem foco"}),el("th",{class:"n",text:"Preço"}))));
  for(const x of m.mats){ const u=x.m.use;
    tbd.append(el("tr",{},el("td",{},el("span",{text:rotNm(x,m)}),el("small",{class:"muted",text:`${rotModoC(u)}${u.c?` em ${bagCityPT(u.c)}`:""}${x.g.enc?" · para encantar, não volta no retorno":x.g.art?" · não volta no retorno":""}`})),
      el("td",{class:"n",text:fmt(x.g.n)}),el("td",{class:"n",text:dec(x.qF)}),el("td",{class:"n",text:dec(rotQN(x,m))}),el("td",{class:"n",text:fmt(u.p)}))); }
  tb.append(tbd); const wr=el("div",{class:"rot-tbw"}); wr.append(tb); box.append(wr);
  box.append(el("p",{class:"small muted",text:`"Gasta" é a média por peça depois do retorno de material. Venda: ${rotModoV(m.venda)} a ${fmt(m.venda.p)} em ${bagCityPT(m.venda.c)}${it.q>1?` (sai ${it.q} por craft)`:""}. ${m.vol==null?"Não sei quanto vende por dia.":`Vende uns ${fmtU(m.vol)} por dia; com ${ROT.fatia}% dessas vendas, em ${ROT.vDias} ${ROT.vDias===1?"dia":"dias"} você vende uns ${l.teto!=null&&isFinite(l.teto)?fmt(l.teto):"?"}.`}${ROT.refinar&&m.refEco>0?` Refinar os materiais você mesmo deixa a peça ${fmtS(m.refEco)} mais barata.`:""}`}));
  return box;
}
/* menu da cidade: o que fazer de cada item, os materiais somados e o total; a conta completa fica em Detalhes */
function rotDetCidade(p){
  const c=p.city, d=rotLembra(el("details",{class:"rot-det"}),c), pcs=p.linhas.reduce((a,l)=>a+l.n,0);
  const sm=el("summary"); sm.append(el("span",{text:`Plano em ${c}`}),el("b",{class:p.lucro>0?"gain":"muted",text:pcs?`${sgn(Math.round(p.lucro))} de lucro`:"nada para fazer"}));
  d.append(sm);
  const its=el("div",{class:"rot-pi"});
  for(const l of p.linhas){ const m=l.m; if(m.miss) continue; const b=el("div",{class:"rot-pl"});
    const h=el("div",{class:"rot-plh"}); h.append(iconImg(m.it.id,28),el("b",{text:m.it.nm}),el("span",{class:l.lucro>0?"gain":l.lucro<0?"loss":"muted",text:l.n?sgn(Math.round(l.lucro)):"não fazer"})); b.append(h);
    const f=(rot,n,cu,lu)=>el("div",{class:"rot-plf"},el("span",{},el("span",{class:"muted",text:rot+": "}),`${fmt(n)} ${n===1?"peça":"peças"}`),el("span",{text:`custo ${fmt(cu)}/peça`}),el("span",{class:lu>0?"gain":"loss",text:`lucro ${sgn(Math.round(lu))}/peça`}));
    b.append(f("Com foco",l.nF,m.custoF,m.pF),f("Sem foco",l.nN,m.custoN,m.pN));
    if(l.n) b.append(el("small",{class:"muted",text:`Custo total ${fmtS(l.custo)}${l.foco?` · ${fmt(l.foco)} de foco`:""}`}));
    its.append(b); }
  d.append(its);
  const ls=rotCompras(p);
  if(ls.length){ const mt=el("div",{class:"rot-mats"}), hh=el("div",{class:"rot-mh"}); hh.append(el("b",{text:"Materiais"}));
    if(typeof lcBtn==="function"){ const lb=lcBtn(()=>ls.map(rotLcItem),`Rotação: ${c}`,"Pôr na lista de compras"); lb.classList.add("sm"); hh.append(lb); }
    const wr=el("div",{class:"rot-tbw"}); wr.append(rotTabMats(ls,c));
    mt.append(hh,wr,el("small",{class:"muted",text:"Já descontado o retorno de material. Compre cada um onde está mais barato e leve até aqui."})); d.append(mt); }
  if(pcs) d.append(el("div",{class:"rot-tot"},el("span",{text:`Total: custo ${fmtS(p.custo)}${p.foco?` · ${fmt(p.foco)} de foco`:""}`}),el("b",{class:p.lucro>0?"gain":"loss",text:`lucro ${sgn(Math.round(p.lucro))}`})));
  const dt=rotLembra(el("details",{class:"rot-det2"}),c+"|det"); dt.append(el("summary",{text:"Detalhes"}));
  for(const l of p.linhas) dt.append(rotDetItem(l,c));
  d.append(dt);
  return d;
}
function rotCidades(planos){
  const g=$("rotCid"); g.textContent="";
  for(const p of planos){ const c=p.city, card=el("article",{class:"rot-c"});
    const dd=rotDiasDesde(c);
    card.append(el("div",{class:"rot-ch"},el("h4",{text:c}),el("span",{class:"tag",text:dd==null?"sem visita":dd===0?"visitada hoje":`há ${dd} ${dd===1?"dia":"dias"}`})));
    for(const l of p.linhas) card.append(rotLinhaItem(l,c));
    if(p.linhas.length) card.append(rotDetCidade(p));
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
  const o=$("rotOrd"); o.textContent=""; let total=0; const blocos=[];
  for(const p of planos){ const ls=rotCompras(p); if(!ls.length) continue; const sub=ls.reduce((a,x)=>a+x.q*x.k,0); total+=sub;
    const lb=typeof lcBtn==="function"?lcBtn(()=>ls.map(rotLcItem),`Rotação: ${p.city}`,"Pôr na lista de compras"):null; if(lb) lb.classList.add("sm");
    blocos.push(el("div",{class:"rot-ob"},el("div",{class:"rot-obh"},el("h4",{text:`${p.city} · ${fmtS(sub)}`}),lb),el("div",{class:"tbl-wrap"},rotTabMats(ls,p.city)))); }
  o.append(el("p",{class:"small",text:blocos.length?`Para a próxima visita de cada cidade: ${fmtS(total)} em materiais. Cada um aparece na cidade onde sai mais barato; compre lá e leve até a cidade do craft.`:"Os materiais aparecem aqui quando houver peças para fazer."}));
  blocos.forEach(b=>o.append(b));
}
const subTxt=v=>v>0?`uns ${fmtS(v)} a menos`:"quase o mesmo";
function rotUI(){
  const b=$("rotCtl"); if(!b||b.dataset.ok) return; b.dataset.ok="1";
  { const rf=$("rotRefinar"); if(rf){ rf.checked=!!ROT.refinar; rf.addEventListener("change",()=>{ ROT.refinar=rf.checked; rotSave(); for(const c in ROT_SUG) delete ROT_SUG[c]; renderRot(); }); } }
  const cs=new Set(ROT.cidades);
  mselUI("rotCidades",ROT_CIDADES.map(c=>[c,c]),cs,"Nenhuma","cidades",()=>{ ROT.cidades=ROT_CIDADES.filter(c=>cs.has(c)); rotSave(); renderRot(); });
  const d=$("rotDias"); d.value=String(ROT.dias); d.addEventListener("change",()=>{ ROT.dias=Math.max(1,Math.min(7,Math.round(+d.value)||3)); d.value=String(ROT.dias); rotSave(); renderRot(); });
  for(const [id,k] of [["rotMinPct","minPct"],["rotMinVol","minVol"]]){ const i=$(id); i.value=ROT[k]; let t2; i.addEventListener("input",()=>{ ROT[k]=i.value.trim(); rotSave(); for(const c in ROT_SUG) delete ROT_SUG[c]; clearTimeout(t2); t2=setTimeout(renderRot,400); }); }
  for(const [id,k,mn,mx,def] of [["rotVDias","vDias",1,30,3],["rotFatia","fatia",5,100,50]]){ const i=$(id); if(!i) continue; i.value=String(ROT[k]);
    i.addEventListener("change",()=>{ ROT[k]=Math.max(mn,Math.min(mx,Math.round(+String(i.value).replace(",","."))||def)); i.value=String(ROT[k]); rotSave(); for(const c in ROT_SUG) delete ROT_SUG[c]; renderRot(); }); }
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
  seg("rotEnc",[["auto","O mais barato","Compara, sem foco, fabricar já encantado com fabricar a .0 e encantar com runas, almas e relíquias"],["craft","Fabricar já encantado","Com barras, tábuas, couros e tecidos encantados"],["runas","Fabricar .0 e encantar","Fabrica a .0 e encanta com runas (.1), almas (.2) e relíquias (.3)"]],"enc");
  seg("rotVenda",[["auto","Automático","O que deixa mais prata depois das taxas: anunciar (+2,5%) ou vender na hora"],["ordem","Anunciar"],["inst","Na hora"]],"venda");
  const m=$("rotCash"); m.value=ROT.cash; let tm; m.addEventListener("input",()=>{ ROT.cash=m.value; rotSave(); clearTimeout(tm); tm=setTimeout(renderRot,400); });
}

/* Sugestões pela sua spec: itens com bônus na cidade, das linhas em que a sua ficha tem mais eficiência de foco (spec),
   ordenados pelo que uma visita rende com o foco de uma visita, respeitando o que você vende no prazo escolhido. */
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
    const ids=[...new Set(cands.map(it=>rotApi(it.id)))].filter(x=>!ROT_LOADED.has(x)), mats=[...new Set(cands.flatMap(it=>{ const R=rotRotaEnc(it); return [...it.ing,...(R?R.ing:[])].map(g=>rotApi(g.id)); }))].filter(x=>!ROT_LOADED.has(x));
    if(mats.length) await fetchIds(mats,DATA.itens,SHOP_LOCS); mats.forEach(x=>ROT_LOADED.add(x));
    for(let i=0;i<ids.length;i+=150){ const part=ids.slice(i,i+150); await fetchIds(part,DATA.itens,[...SHOP_LOCS,"Black Market"]); part.forEach(x=>ROT_LOADED.add(x)); if(ids.length>150) set({loading:`Buscando preços: ${fmt(Math.min(ids.length,i+150))} de ${fmt(ids.length)}…`}); }
    const F=rotFocoVisita(), visita=m=>{ const teto=rotTeto(m), nF=m.pF>0?Math.min(teto,F>0?Math.floor(F/m.fc1):0):0, nN=m.pN>0?Math.min(teto-nF,isFinite(teto)?teto:0):0; return nF*m.pF+nN*m.pN; };
    const mp=rotNum(ROT.minPct), mv=rotNum(ROT.minVol)||(modo==="lucro"?ROT_BOA_VENDA:null);
    let ms=cands.map(it=>rotModel(it,city)).filter(m=>!m.miss&&m.pF>0&&(mp==null||m.pct*100>=mp));
    /* spec: os que mais rendem por foco; lucro: os de maior lucro por peça (as vendas decidem depois) */
    ms=ms.sort(modo==="spec"?(a,b)=>b.spf-a.spf:(a,b)=>b.pF-a.pF).slice(0,modo==="spec"?40:80);
    set({loading:`Consultando quanto ${fmt(ms.length)} itens vendem por dia…`});
    const keys=ms.flatMap(m=>ROT_HLOCS().map(c=>rotApi(m.it.id)+"|"+c)).filter(k=>OF2.hs[k]==null); if(keys.length) await histFetch(keys);   // todas as cidades: a venda só conta onde o item vende
    /* com as vendas de cada cidade os preços mudam: refaz todos, e quem subiu para o topo sem histórico ganha uma segunda consulta */
    { const n=modo==="spec"?40:80, ord=modo==="spec"?(a,b)=>b.spf-a.spf:(a,b)=>b.pF-a.pF, todos=()=>cands.map(it=>rotModel(it,city)).filter(m=>!m.miss&&m.pF>0&&(mp==null||m.pct*100>=mp)).sort(ord).slice(0,n);
      ms=todos(); const k2=ms.flatMap(m=>ROT_HLOCS().map(c=>rotApi(m.it.id)+"|"+c)).filter(k=>OF2.hs[k]==null); if(k2.length){ await histFetch(k2); ms=todos(); } }
    ms=ms.filter(m=>rotPassa(m)&&(mv==null||(m.vol!=null&&m.vol>=mv)));
    const lista=ms.map(m=>({m,visita:visita(m)})).filter(x=>x.visita>0).sort((a,b)=>b.visita-a.visita).slice(0,modo==="spec"?6:8);
    set({lista});
  }catch(e){ set({lista:[],vazio:"Não consegui buscar os preços agora."}); }
}
