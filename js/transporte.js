/* Transporte: comprar numa cidade, levar e vender em outra.
   Corações de facção e recursos (matéria-prima e refinados T4 a T8, .0 a .4).
   Compra: na hora (menor anúncio) ou ordem de compra (+2,5%); Automático fica com a mais barata.
   Venda: anúncio (menor anúncio, +2,5%) ou na hora (maior ordem de compra); Automático fica com o maior líquido.
   Quanto levar: o que cabe na montaria escolhida, limitado pelo dinheiro e pelo que o destino vende em alguns dias. */
const TR_HEARTS=[["T1_FACTION_FOREST_TOKEN_1","Lymhurst"],["T1_FACTION_HIGHLAND_TOKEN_1","Martlock"],["T1_FACTION_STEPPE_TOKEN_1","Bridgewatch"],["T1_FACTION_MOUNTAIN_TOKEN_1","Fort Sterling"],["T1_FACTION_SWAMP_TOKEN_1","Thetford"],["T1_FACTION_CAERLEON_TOKEN_1","Caerleon"]];
const TR_HEART_PT={T1_FACTION_FOREST_TOKEN_1:"Coração Arbóreo",T1_FACTION_HIGHLAND_TOKEN_1:"Coração Empedrado",T1_FACTION_STEPPE_TOKEN_1:"Coração Bestial",T1_FACTION_MOUNTAIN_TOKEN_1:"Coração Montanhoso",T1_FACTION_SWAMP_TOKEN_1:"Coração Videira",T1_FACTION_CAERLEON_TOKEN_1:"Coração Sombrio"};
const TR=(()=>{ const d={grp:"hearts",tiers:[],enchs:[],de:[],para:[],buy:"auto",sell:"auto",mount:"T8_MOUNT_OX",cash:"",dias:3,seguro:false,pontos:false,qtdPontos:""};
  try{ const o=JSON.parse(store.get("transp")||"{}"); return {...d,...o,tiers:new Set(o.tiers||[]),enchs:new Set(o.enchs||[]),de:new Set(o.de||[]),para:new Set(o.para||[])}; }catch(e){ return {...d,tiers:new Set(),enchs:new Set(),de:new Set(),para:new Set()}; } })();
const trSave=()=>{ try{ store.set("transp",JSON.stringify({...TR,tiers:[...TR.tiers],enchs:[...TR.enchs],de:[...TR.de],para:[...TR.para]})); }catch(e){} };
const TR_LOADED=tSet(5*60e3);   // preço buscado vale 5 minutos; depois busca de novo
setInterval(()=>{ const p=$("p-transp"); if(p&&!p.hidden&&!document.hidden) renderTransp(); },5*60e3);   // página aberta (no overlay, por exemplo): atualiza sozinha
const trKey=id=>id.split("@")[0];   // T4_PLANKS_LEVEL1@1 -> T4_PLANKS_LEVEL1 (como fica guardado)
function trItems(){
  const out=[];
  if(TR.grp==="hearts"||TR.grp==="all") for(const [id,home] of TR_HEARTS) out.push({api:id,id,nm:TR_HEART_PT[id],home,t:1,e:0,kind:"Coração"});
  if(TR.grp!=="hearts"){
    const tiers=TR.tiers.size?[...TR.tiers]:[4,5,6,7,8], enchs=TR.enchs.size?[...TR.enchs]:[0,1,2,3];
    for(const R of REF5) for(const t of tiers) for(const e of enchs){
      if(TR.grp==="ref"||TR.grp==="all") out.push({api:apiLv(t,R.ref,e),id:trKey(apiLv(t,R.ref,e)),nm:`${R.refPT} T${t}.${e}`,t,e,kind:"Refinado"});
      if(TR.grp==="raw"||TR.grp==="all") out.push({api:apiLv(t,R.raw,e),id:trKey(apiLv(t,R.raw,e)),nm:`${R.rawPT} T${t}.${e}`,t,e,kind:"Matéria-prima"}); }
  }
  return out;
}
const trOrdemOk=v=>v&&v[1]>0&&(!v[0]||v[1]>=v[0]*0.7);
function trBuy(r,c){ const v=r[c]; if(!v) return null; const a=v[0]>0?{p:v[0],k:v[0],mode:"inst",t:v[2]}:null, o=trOrdemOk(v)?{p:v[1],k:v[1]*1.025,mode:"ordem",t:v[3]}:null;
  if(TR.buy==="inst") return a; if(TR.buy==="ordem") return o||a; return a&&o?(o.k<a.k?o:a):(a||o); }
function trSell(r,c,teto){ const v=r[c]; if(!v) return null; const tx=taxBase();
  const l=v[0]>0&&v[0]<=teto?{p:v[0],k:v[0]*(1-tx-0.025),mode:"ordem",t:v[2]}:null, i=v[1]>0?{p:v[1],k:v[1]*(1-tx),mode:"inst",t:v[3]}:null;
  if(TR.sell==="inst") return i; if(TR.sell==="ordem") return l; return l&&i?(i.k>=l.k?i:l):(l||i); }
const TR_RISCO=c=>c==="Caerleon"?2:c==="Brecilien"?1:0;
const trRiscoTxt=(a,b)=>{ if(a===b) return ["Sem viagem","Vende na mesma cidade onde resgata."]; const r=Math.max(TR_RISCO(a),TR_RISCO(b)); return r===2?["Zona vermelha","Caerleon fica no meio das zonas vermelhas: quem morre perde a carga e a montaria."]:r===1?["Névoas","Brecilien só se alcança pelas Névoas, onde dá para ser atacado e perder a carga."]:["Segura","Entre cidades reais dá para ir só por zonas azuis e amarelas, sem perda total."]; };
const trMount=()=>(CARGA&&CARGA.mounts.find(m=>m.id===TR.mount))||null;
const trCap=()=>{ const m=trMount(); return CARGA?(CARGA.base+(m?m.kg:0)):0; };
function trRoutes(items){
  const locs=SHOP_LOCS, de=TR.de.size?[...TR.de]:locs, para=TR.para.size?[...TR.para]:locs, cap=trCap(), cash=+String(TR.cash).replace(/\D/g,"")||0, tx=taxBase();
  const out=[];
  for(const it of items){ const r=DATA.itens[it.id]; if(!r) continue; const w=bagW(it.id), pontos=TR.pontos&&it.kind==="Coração";
    const ps=locs.map(c=>r[c]&&r[c][0]).filter(x=>x>0).sort((a,b)=>a-b);
    const teto=ps.length>=3?(ps.length%2?ps[(ps.length-1)/2]:(ps[ps.length/2-1]+ps[ps.length/2])/2)*1.3:Infinity;
    /* corações por pontos de facção: saem de graça da cidade da facção (o custo é só o ponto, que não é prata) */
    const origens=pontos?[it.home].filter(c=>!TR.de.size||TR.de.has(c)):de;
    for(const a of origens){ const b0=pontos?{p:0,k:0,mode:"pontos",t:Date.now()}:trBuy(r,a); if(!b0) continue;
      for(const b of para){ if(a===b&&!pontos) continue; if(TR.seguro&&(TR_RISCO(a)||TR_RISCO(b))) continue; const s0=trSell(r,b,teto); if(!s0) continue;
        const lucro=s0.k-b0.k; if(!(lucro>0)) continue;
        const h=typeof OF2!=="undefined"?OF2.hs[nk(it.api)+"|"+b]:null, vol=h&&h.vol>=0?h.vol:null;
        let n=w>0&&cap>0?Math.floor(cap/w):Infinity; const lim=[];
        if(cash>0&&b0.k>0){ const nc=Math.floor(cash/b0.k); if(nc<n){ n=nc; lim.push("dinheiro"); } }
        if(pontos){ const q=Math.floor(+String(TR.qtdPontos).replace(/\D/g,"")||0); if(q>0&&q<n){ n=q; lim.push("corações"); } }
        if(vol!=null){ const nv=Math.max(1,Math.round(vol*TR.dias)); if(nv<n){ n=nv; lim.push("vendas"); } }
        if(!isFinite(n)) n=0; else if(n===Math.floor(cap/w)&&!lim.length) lim.push("carga");
        out.push({it,a,b,buy:b0,sell:s0,lucro,pct:b0.k>0?lucro/b0.k:null,w,vol,n,total:lucro*n,peso:n*(w||0),lim,idade:Math.min(b0.t||Infinity,s0.t||Infinity)});
      } }
  }
  return out.sort((x,y)=>y.total-x.total||y.lucro-x.lucro);
}
async function trEnsure(items,note){
  const need=items.filter(it=>!TR_LOADED.has(it.api)).map(it=>it.api);
  if(need.length){ note.textContent="Buscando os preços nas cidades…"; await fetchIds(need,DATA.itens,SHOP_LOCS); need.forEach(x=>TR_LOADED.add(x)); }
  if(!CARGA){ try{ await bagData(); }catch(e){} }
}
async function trVol(rows){
  const keys=[...new Set(rows.map(r=>nk(r.it.api)+"|"+r.b))].filter(k=>OF2.hs[k]==null);   // todas as rotas com lucro: a consulta é por item, com todas as cidades de uma vez
  if(!keys.length) return false; await histFetch(keys); return true;
}
let TR_TOK=0;
async function renderTransp(){
  const host=$("trList"), note=$("trNote"); if(!host) return; const tok=++TR_TOK;
  trUI();
  const items=trItems(); host.textContent="";
  try{ await trEnsure(items,note); }catch(e){ note.textContent="Não consegui buscar os preços agora. Tente atualizar."; return; } if(tok!==TR_TOK) return;
  let rows=trRoutes(items);
  note.textContent="Consultando quanto cada destino vende por dia…";
  if(await trVol(rows)){ if(tok!==TR_TOK) return; rows=trRoutes(items); }
  trHearts(); host.textContent="";
  const m=trMount();
  note.textContent=rows.length?`${fmt(rows.length)} rotas com lucro, em ${fmt(new Set(rows.map(r=>r.it.id)).size)} itens. A carga é a de ${m?mtNm(m):"quem vai a pé"} (${fmt(Math.round(trCap()))} kg, sem contar bolsa e comida). A quantidade de cada rota é o que cabe na montaria${+TR.cash?", no seu dinheiro":""} e no que o destino vende em ${TR.dias} ${TR.dias>1?"dias":"dia"}. Lucro já descontadas as taxas.`:"Nenhuma rota dá lucro com esses filtros agora.";
  /* um cartão por item: a melhor rota, e as outras boas embaixo */
  const por=new Map(); for(const r of rows){ const g=por.get(r.it.id); if(g) g.alt.push(r); else por.set(r.it.id,{r,alt:[]}); }
  const grupos=[...por.values()], LIM=40;
  for(const g of grupos.slice(0,LIM)) host.append(trCard(g.r,g.alt));
  if(grupos.length>LIM) host.append(el("p",{class:"small muted",text:`Mostrando os ${LIM} itens que mais rendem por viagem, de ${fmt(grupos.length)}.`}));
}
const TR_BUYL={inst:"compra na hora",ordem:"ordem de compra"}, TR_SELLL={inst:"venda na hora",ordem:"anúncio"};
function trCard(r,alt=[]){
  const c=el("article",{class:"tr-card"}), [rk,rt]=trRiscoTxt(r.a,r.b);
  const head=el("div",{class:"tr-h"}); head.append(iconImg(r.it.api,48),el("div",{class:"tr-nm"},el("b",{text:r.it.nm}),el("small",{class:"muted",text:`${r.it.kind}${r.w?` · ${dec(r.w)} kg cada`:""}`})),el("span",{class:"tr-risk r"+Math.max(TR_RISCO(r.a),TR_RISCO(r.b)),text:rk,title:rt}));
  const rota=el("div",{class:"tr-rota"});
  const ponta=(lab,cid,p,modo,cls)=>el("div",{class:"tr-p "+cls},el("small",{class:"muted",text:lab}),el("b",{text:bagCityPT(cid)}),el("span",{text:`${fmt(p)} · ${modo}`}));
  rota.append(r.buy.mode==="pontos"?el("div",{class:"tr-p buy"},el("small",{class:"muted",text:"Resgata em"}),el("b",{text:bagCityPT(r.a)}),el("span",{text:"com pontos de facção"})):ponta("Compra em",r.a,r.buy.p,TR_BUYL[r.buy.mode],"buy"),el("span",{class:"tr-seta","aria-hidden":"true",text:"→"}),ponta("Vende em",r.b,r.sell.p,TR_SELLL[r.sell.mode],"sell"));
  const nums=el("div",{class:"tr-n"});
  const n=(lab,v,cls,tit)=>{ const d=el("div",{class:cls||""},el("small",{class:"muted",text:lab}),el("b",{text:v})); if(tit) d.title=tit; return d; };
  nums.append(n("Lucro por unidade",sgn(Math.round(r.lucro)),"gain",`Venda líquida ${fmt(Math.round(r.sell.k))} − custo ${fmt(Math.round(r.buy.k))}`),n("Lucro %",r.pct==null?"—":dec(r.pct*100)+"%","",r.pct==null?"Sem custo em prata: o coração veio dos pontos de facção":""),
    n("Vende por dia no destino",r.vol==null?"—":fmtU(r.vol)),
    n("Leva por viagem",r.n?`${fmt(r.n)} un.`:"—","",r.lim.length?`Limitado por: ${r.lim.join(", ")}`:""),
    n(r.buy.mode==="pontos"?"Vale em prata":"Investe",r.buy.mode==="pontos"?fmtS(r.n*r.sell.k):fmtS(r.n*r.buy.k),"",r.buy.mode==="pontos"?"O que esses corações rendem vendidos, depois das taxas":""),n("Ganha na viagem",sgn(Math.round(r.total)),"gain big"));
  c.append(head,rota,nums);
  const ft=el("div",{class:"tr-ft"});
  ft.append(el("small",{class:"muted",text:`${r.n?`${fmt(Math.round(r.peso))} kg · `:""}${r.lim.includes("vendas")?`só o que ${bagCityPT(r.b)} vende em ${TR.dias} ${TR.dias>1?"dias":"dia"} · `:""}${r.lim.includes("dinheiro")?"limitado pelo seu dinheiro · ":""}preços de ${fmtAge(r.idade===Infinity?0:r.idade)||"agora"}`}));
  if(window.bagBtn&&r.n) ft.append(bagBtn(()=>[{id:r.it.api,q:r.n,nm:r.it.nm,buy:r.buy.p,buyC:r.a,sell:r.sell.p,sellC:r.b}],"Pôr esta carga na bag"));
  c.append(ft);
  if(alt.length){ const d=el("details",{class:"tr-alt"}); d.append(el("summary",{text:`Outras rotas com lucro (${alt.length})`}));
    const ul=el("ul",{class:"small"}); for(const x of alt.slice(0,8)) ul.append(el("li",{text:`${bagCityPT(x.a)} → ${bagCityPT(x.b)}: ${sgn(Math.round(x.lucro))} por unidade, ${sgn(Math.round(x.total))} na viagem (${fmt(x.n)} un.)${TR_RISCO(x.a)||TR_RISCO(x.b)?` · ${trRiscoTxt(x.a,x.b)[0].toLowerCase()}`:""}`}));
    d.append(ul); c.append(d); }
  return c;
}
/* quadro dos corações: onde cada um está mais barato e mais caro agora */
function trHearts(){
  const box=$("trHearts"); if(!box) return; box.textContent=""; box.hidden=TR.grp==="raw"||TR.grp==="ref";
  if(box.hidden) return;
  const tbl=el("table",{class:"tr-ht"}), hr=tbl.createTHead().insertRow(); ["Coração",...SHOP_LOCS.map(bagCityPT)].forEach(t=>hr.append(el("th",{text:t})));
  const tb=tbl.createTBody();
  for(const [id,home] of TR_HEARTS){ const r=DATA.itens[id]||{}, tr=tb.insertRow(); const c0=tr.insertCell(); c0.append(withIcon(id,el("span",{text:TR_HEART_PT[id]})));
    const vals=SHOP_LOCS.map(c=>r[c]&&r[c][0]>0?r[c][0]:0), ok=vals.filter(x=>x>0), mn=Math.min(...ok), mx=Math.max(...ok);
    SHOP_LOCS.forEach((c,i)=>{ const td=tr.insertCell(); td.className="num"+(vals[i]&&vals[i]===mn?" tr-lo":vals[i]&&vals[i]===mx?" tr-hi":""); td.textContent=vals[i]?fmt(vals[i]):"—"; if(vals[i]&&r[c][2]){ const ag=fmtAge(r[c][2]); td.append(el("small",{class:"tr-age"+((Date.now()-r[c][2])>6*3600e3?" old":""),text:ag})); } if(c===home) td.title="Cidade da facção deste coração"; if(c===home) td.classList.add("tr-home"); }); }
  box.append(el("h3",{class:"orn",text:"Corações de facção agora"}),el("p",{class:"small muted",text:"Menor anúncio de cada coração em cada cidade, com quanto tempo faz que o preço foi visto (em vermelho, mais de 6 horas). A página busca de novo a cada 5 minutos. Verde é onde está mais barato, dourado onde está mais caro. A borda marca a cidade da facção de cada coração."}),el("div",{class:"tbl-wrap"},tbl));
}
function trUI(){
  const box=$("trCtl"); if(!box||box.dataset.ok) { trPaint(); return; } box.dataset.ok="1";
  const seg=(id,opts,key)=>{ const g=$(id); opts.forEach(([v,t,tt])=>{ const b=el("button",{type:"button",text:t}); b.dataset.v=v; if(tt) b.title=tt; g.append(b); }); g.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; TR[key]=b.dataset.v; trSave(); renderTransp(); }); };
  seg("trGrp",[["hearts","Corações"],["ref","Refinados"],["raw","Matéria-prima"],["all","Tudo"]],"grp");
  seg("trBuyS",[["auto","Automático","A mais barata entre comprar na hora e pôr ordem de compra (+2,5%)"],["inst","Na hora"],["ordem","Ordem de compra"]],"buy");
  seg("trSellS",[["auto","Automático","O que deixa mais prata depois das taxas: anunciar (+2,5%) ou vender na hora"],["ordem","Anunciar"],["inst","Na hora"]],"sell");
  const go=()=>{ trSave(); renderTransp(); };
  mselUI("trTier",[4,5,6,7,8].map(t=>[t,`T${t}`]),TR.tiers,"T4 a T8","tiers",go);
  mselUI("trEnch",[0,1,2,3,4].map(e=>[e,`.${e}`]),TR.enchs,".0 a .3","encantamentos",go);
  mselUI("trDe",SHOP_LOCS.map(c=>[c,c]),TR.de,"Todas","cidades",go);
  mselUI("trPara",SHOP_LOCS.map(c=>[c,c]),TR.para,"Todas","cidades",go);
  const cash=$("trCash"); cash.value=TR.cash; let tm; cash.addEventListener("input",()=>{ TR.cash=cash.value; clearTimeout(tm); tm=setTimeout(go,400); });
  const dias=$("trDias"); dias.value=String(TR.dias); dias.addEventListener("change",()=>{ TR.dias=Math.max(1,Math.min(14,Math.round(+dias.value)||3)); dias.value=String(TR.dias); go(); });
  const pts=$("trPontos"), qp=$("trQtdPontos"); pts.checked=!!TR.pontos; qp.value=TR.qtdPontos||""; qp.closest("label").hidden=!TR.pontos;
  pts.addEventListener("change",()=>{ TR.pontos=pts.checked; qp.closest("label").hidden=!TR.pontos; go(); });
  { let t3; qp.addEventListener("input",()=>{ TR.qtdPontos=qp.value; clearTimeout(t3); t3=setTimeout(go,400); }); }
  const seguro=$("trSeguro"); seguro.checked=!!TR.seguro; seguro.addEventListener("change",()=>{ TR.seguro=seguro.checked; go(); });
  const ms=$("trMount"); bagData().then(()=>{ ms.textContent=""; ms.append(el("option",{value:"",text:"A pé"})); for(const m of CARGA.mounts) ms.append(el("option",{value:m.id,text:`${mtNm(m)} · ${fmt(m.kg)} kg`})); ms.value=TR.mount; if(ms.selectedIndex<0) ms.value="T8_MOUNT_OX"; }).catch(()=>{});
  ms.addEventListener("change",()=>{ TR.mount=ms.value; go(); });
  trPaint();
}
function trPaint(){
  const p=(id,v)=>{ const g=$(id); if(g) g.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===v))); };
  p("trGrp",TR.grp); p("trBuyS",TR.buy); p("trSellS",TR.sell);
  const rf=TR.grp!=="hearts"; ["trTierL","trEnchL"].forEach(id=>{ const x=$(id); if(x) x.hidden=!rf; });
}
