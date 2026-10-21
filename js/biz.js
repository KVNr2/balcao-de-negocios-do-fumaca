/* ================= mercado negro ================= */
let BM = null;                      // data/bm.json: chave: [nome, grupo, cidade com bônus, receita "P20L12", [extra, qtd] | 0, foco T4.0]
const BM_RES = {M:"METALBAR",P:"PLANKS",L:"LEATHER",C:"CLOTH"};
const BM_RES_PT = {M:"Barra",P:"Tábua",L:"Couro",C:"Tecido"};
const BM_GROUPS = [...LINES.map(([k,n])=>[k,n]),["a_placa","Armaduras de placa"],["a_couro","Armaduras de couro"],["a_pano","Armaduras de pano"],["mao","Mão secundária"]];
const BMP = {};                     // id: {cidade: [venda, compra, idade em horas da compra, idade da venda]}
const BMQ = {};                     // qualidades 2 a 5, mesmo formato do BMP: id: {qualidade: {cidade: [venda, compra, idade da compra, idade da venda]}} (a qualidade 1 fica no BMP)
const BM_VOL = {};                  // id: {qualidade: peças que o Mercado Negro comprou por dia (média dos últimos 7 dias)}, ou -1 se a consulta falhou
const BM_LOADED = new Set(); let BM_TOK=0, bmMode="craft", bmTierSel=0, bmQualSel=0, bmSel=null, PLANKS_LOADED=false;
const ageH = d => d&&!d.startsWith("0001") ? (Date.now()-Date.parse(d+"Z"))/3600e3 : Infinity;
/* allQ: traz as qualidades 1 a 5 (a 1 vai para o BMP, as outras para o BMQ); sem allQ só a qualidade 1, como as outras páginas usam */
async function bmFetch(ids, locs, allQ=false, step=API_CHUNK){
  const loc=locs.join(",").replace(/ /g,"%20");
  const parts=[]; for(let i=0;i<ids.length;i+=step) parts.push(ids.slice(i,i+step));
  const res=await Promise.all(parts.map(p=>apiJSON(`${HOST}/api/v2/stats/prices/${p.join(",")}.json?locations=${loc}&qualities=${allQ?"1,2,3,4,5":"1"}`)));   // pedaços em paralelo
  for(const j of res){
    for(const x of j){
      const qx=allQ?+x.quality:1; if(allQ&&!(qx>=1&&qx<=5)) continue;
      const sa=ageH(x.sell_price_min_date), ba=ageH(x.buy_price_max_date);
      const s=sa<MAX_AGE_H?x.sell_price_min:0, b=ba<MAX_AGE_H?x.buy_price_max:0; if(!s&&!b) continue;
      if(qx===1) (BMP[x.item_id]||(BMP[x.item_id]={}))[x.city]=[s,b,ba,sa];
      else { const m=BMQ[x.item_id]||(BMQ[x.item_id]={}); (m[qx]||(m[qx]={}))[x.city]=[s,b,ba,sa]; }
    }
  }
}
/* preços de um item numa qualidade: {cidade: [venda, compra, idade da compra, idade da venda]} */
const bmRec = (id,q) => q===1 ? (BMP[id]||{}) : (((BMQ[id]||{})[q])||{});
const bmHas = (id,q) => { const v=bmRec(id,q)["Black Market"]; return !!(v&&v[1]>0); };
const bmVolOf = (id,q) => { const v=BM_VOL[id]; return v==null ? null : typeof v==="number" ? -1 : (v[q]||0); };
const bmId=(key,t,e)=>`T${t}_${key}`+(e?`@${e}`:"");
const bmKeys=g=>g==="*"?Object.keys(BM):Object.keys(BM).filter(k=>BM[k][1]===g);
const BM_PEND={}, BM_PL={};
/* Todas as mercadorias em um tier: 1) só o preço do Mercado Negro de tudo, 2) escolhe os BM_TOPN mais promissores
   (lucro de fabricar, ou preço do Mercado Negro na revenda) e 3) busca as cidades só desses. Poucos pedidos à API. */
const BM_TOPN=10, BM_TOP={};
async function ensureBMTop(t,lk){
  const gear=[], extra=new Set();
  for(const k of Object.keys(BM)){ if(t<4&&BM[k][4]) continue; for(let e=0;e<=(t<4?0:4);e++) gear.push(bmId(k,t,e)); if(BM[k][4]) extra.add(`T${t}_${BM[k][4][0]}`); }
  for(const r of ["METALBAR","PLANKS","LEATHER","CLOTH"]) if(t<4) extra.add(`T${t}_${r}`);
  try{
    await bmFetch(gear,["Black Market"],true,150);
    if(!PLANKS_LOADED){ BM_PL.p=BM_PL.p||(async()=>{ const pl=[]; for(let x=4;x<=8;x++) for(let e=0;e<=4;e++) pl.push(`T${x}_PLANKS`+(e?`_LEVEL${e}@${e}`:"")); await fetchIds(pl,DATA.itens); PLANKS_LOADED=true; })().finally(()=>{ BM_PL.p=null; }); await BM_PL.p; }
    if(extra.size) await fetchIds([...extra],DATA.itens,[...CITIES,"Caerleon"]);
    /* candidatos dos dois modos juntos (fabricar e revender): trocar o modo depois só filtra, sem nova consulta */
    const topBy=pick=>{ const sc=new Map();
      for(const k of Object.keys(BM)){ if(t<4&&BM[k][4]) continue; for(let e=0;e<=(t<4?0:4);e++) for(let q=1;q<=5;q++){ const id=bmId(k,t,e); if(!bmHas(id,q)) continue; const m=bmModel(k,t,e,$("bmFocus").checked,q); if(!m.bm) continue; const v=pick(m); if(v!=null&&(!sc.has(id)||v>sc.get(id))) sc.set(id,v); } }
      return [...sc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,BM_TOPN).map(x=>x[0]); };
    const top=[...new Set([...topBy(m=>m.craft),...topBy(m=>m.net)])];
    if(top.length) await bmFetch(top,["Black Market",...SHOP_LOCS],true);
    BM_TOP[lk]=new Set(top); BM_LOADED.add(lk); return true;
  }catch(e){ return false; }
}
/* Aquecimento do cache: assim que os preços do site chegam, já busca o Mercado Negro da visão que a pessoa costuma abrir,
   em segundo plano e devagar (usa no máximo ~45 dos 100 pedidos por minuto da API; o resto fica para o que ela clicar).
   "Atualizar preços" (force) busca de novo; sem clicar, o próprio cache de 10 minutos vence e a atualização automática refaz. */
let WARM_RUN=0;
async function warmBM(force){
  const run=++WARM_RUN; const sleep=ms=>new Promise(f=>setTimeout(f,ms));
  try{
    if(!BM) BM=await need("bm"); if(!$("bmGroup")||!$("bmFocus")) return;
    const g=(()=>{ try{ const sg=store.get("bmGroup"); return sg&&sg!=="*"?sg:bmGroupDefault(); }catch(e){ return bmGroupDefault(); } })();
    const wait=async()=>{ for(;;){ const now=Date.now(), n=apiStamps.filter(t=>now-t<60e3).length; if(n<=45) return; await sleep(3000); } };
    const was=FORCE; if(force) FORCE=true;
    try{
      if(g==="*"){ for(const t of [8,7,6,5,4,3,2]){ if(run!==WARM_RUN) return; await wait(); await ensureBM("*",t); } }
      else { await wait(); await ensureBM(g,0); }
      /* só a visão que a pessoa abre: as outras mercadorias são buscadas quando ela clicar (uma vez, depois ficam no cache),
         para não pesar na API da comunidade com dezenas de pedidos por visita */
    } finally{ FORCE=was; }
  }catch(e){}
}
// atualização automática: a cada 10 min, se a aba estiver visível, refaz os preços (o cache vencido faz buscar de verdade)
setInterval(()=>{ if(!document.hidden&&typeof loadLive==="function"&&!$("reload").disabled) loadLive(false); },10.5*60e3);
const bmLk=(g,only)=>g==="*"?`*#${only}`:g;
function ensureBM(g,only=0){ const lk=bmLk(g,only); if(BM_LOADED.has(lk)) return Promise.resolve(true); return BM_PEND[lk]||(BM_PEND[lk]=ensureBM1(g,only).finally(()=>{ delete BM_PEND[lk]; })); }
async function ensureBM1(g,only=0){
  const lk=bmLk(g,only);
  if(g==="*"&&only) return ensureBMTop(only,lk);
  const keys=bmKeys(g), gear=[], extra=new Set();
  for(const k of keys) for(let t=(only||2);t<=(only||8);t++){ if(t<4&&BM[k][4]) continue; for(let e=0;e<=(t<4?0:4);e++) gear.push(bmId(k,t,e)); if(BM[k][4]) extra.add(`T${t}_${BM[k][4][0]}`); }
  for(const t of [2,3]) for(const r of ["METALBAR","PLANKS","LEATHER","CLOTH"]) extra.add(`T${t}_${r}`);
  try{
    await bmFetch(gear,["Black Market",...SHOP_LOCS],true);
    if(!PLANKS_LOADED){ BM_PL.p=BM_PL.p||(async()=>{ const pl=[]; for(let t=4;t<=8;t++) for(let e=0;e<=4;e++) pl.push(`T${t}_PLANKS`+(e?`_LEVEL${e}@${e}`:"")); await fetchIds(pl,DATA.itens); PLANKS_LOADED=true; })().finally(()=>{ BM_PL.p=null; }); await BM_PL.p; }
    if(extra.size) await fetchIds([...extra],DATA.itens,[...CITIES,"Caerleon"]);
    BM_LOADED.add(lk); return true;
  }catch(e){ return false; }
}
/* T2 e T3 não estão na tabela de foco: estimativa pela razão entre tiers (cerca de 1,75 por tier) */
const bmFocT=(t,e)=>t>=4?FOCUS_CRAFT[t-4][e]:Math.round(429/Math.pow(1.75,4-t));
function bmFCE(key){ return itemFCE(key); }   // armas, armaduras e mão secundária, pela spec de craft da ficha
/* q: qualidade da ordem do Mercado Negro (1 a 5). A ordem aceita essa qualidade ou melhor, então para revender
   vale a peça mais barata entre as qualidades q a 5. */
function bmModel(key,t,e,focus=$("bmFocus").checked,q=1){
  const r=BM[key], id=bmId(key,t,e), rec=bmRec(id,q);
  const bmo=rec["Black Market"], cae=rec["Caerleon"];
  const bm=bmo&&bmo[1]>0?{p:bmo[1],age:bmo[2]}:null;
  let buy=null; for(let qq=q;qq<=5;qq++){ const rq=bmRec(id,qq); for(const c of SHOP_LOCS){ const v=rq[c]; if(v&&v[0]>0&&(!buy||v[0]<buy.p)) buy={c,p:v[0],age:v[3],q:qq}; } }
  const buyC=buy?buy.p:null;
  const tax=st.prem?0.04:0.08, net=bm?bm.p*(1-tax):null;
  let res=0, cnt=0, thin=false, miss=null; const parts=[];
  for(const [,c,n] of r[3].matchAll(/([MPLC])(\d+)/g)){ const rid=idOf(t,BM_RES[c],e), p=typical(rid,0); if(!p){ miss=BM_RES_PT[c]; break; } if(p.n<2) thin=true; res+=+n*p.p; cnt+=+n; parts.push({id:rid,nm:`${BM_RES_PT[c]} T${t}.${e}`,q:+n,p:p.p}); }
  let art=0; if(!miss&&r[4]){ const p=typical(`T${t}_${r[4][0]}`,0); if(!p) miss="artefato"; else { art=p.p*r[4][1]; parts.push({id:`T${t}_${r[4][0]}`,nm:(r[4][0].startsWith("ALCHEMY")?"Ingrediente raro":"Artefato")+` T${t}`,q:r[4][1],p:p.p,art:true}); } }
  const rr=rrr(0.15,focus,st.daily), fee=cnt*IV(t,e)*0.1125*feeVal()/100;
  const cost=miss?null:res*(1-rr)+art+fee;
  const fc=Math.max(1,Math.round(r[5]*bmFocT(t,e)/429*Math.pow(0.5,bmFCE(key)/10000)));
  return {key,t,e,q,id,name:r[0],city:r[2],bm,net,buyC,buy,flip:net!=null&&buyC?net-buyC:null,cost,craft:net!=null&&cost!=null?net-cost:null,parts,res,art,fee,rr,fc,thin,miss,focus};
}
function bmGroupDefault(){ const mine=LINES.filter(([k])=>wl(k)>=2).sort((a,b)=>wl(b[0])-wl(a[0])); return mine.length?mine[0][0]:"martelo"; }
function setupBM(){
  const sel=$("bmGroup"); if(sel.options.length) return;
  const mine=new Set(LINES.filter(([k])=>wl(k)>=2).map(([k])=>k));
  const og1=el("optgroup",{label:"Suas armas"}), og2=el("optgroup",{label:"Outras armas"}), og3=el("optgroup",{label:"Armaduras e mão secundária"});
  for(const [k,n] of BM_GROUPS){ const o=el("option",{value:k,text:n}); (k.startsWith("a_")||k==="mao"?og3:mine.has(k)?og1:og2).append(o); }
  [og1,og2,og3].forEach(g=>{ if(g.children.length) sel.append(g); }); { const sg=store.get("bmGroup"); sel.value=(sg&&sg!=="*"&&BM_GROUPS.some(x=>x[0]===sg)||LINES.some(x=>x[0]===sg))?sg:bmGroupDefault(); if(!sel.value) sel.value=bmGroupDefault(); }
  const ts=$("bmTier"); ["Todos",2,3,4,5,6,7,8].forEach((t,i)=>ts.append(el("button",{type:"button","data-t":String(i?t:0),"aria-pressed":String(i===0),text:i?`T${t}`:t})));
  ts.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ts.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); bmTierSel=+b.dataset.t; renderBM(); });
  const qs=$("bmQual"); ["Todas",1,2,3,4,5].forEach((q,i)=>qs.append(el("button",{type:"button","data-q":String(i?q:0),"aria-pressed":String(i===0),text:i?QNAME[q]:q})));
  qs.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; qs.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); bmQualSel=+b.dataset.q; renderBM(); });
  sel.addEventListener("change",()=>{ store.set("bmGroup",sel.value); bmSel=null; renderBM(); });
  document.querySelectorAll("[data-bm]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-bm]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); bmMode=b.dataset.bm; renderBM(); }));
  $("bmFocus").addEventListener("change",renderBM); $("bmAtivo").addEventListener("change",()=>{ store.set("bmAtivo",$("bmAtivo").checked?"1":"0"); renderBM(); });
}
async function renderBM(partial){
  const tok=partial?BM_TOK:++BM_TOK;
  if(!BM){ $("bmNote").textContent="Abrindo o livro do Mercado Negro…"; try{ BM=await need("bm"); }catch(e){ $("bmNote").textContent="Não consegui abrir os dados do Mercado Negro."; return; } }
  setupBM(); if(!$("bmAtivo").dataset.init){ $("bmAtivo").dataset.init="1"; try{ $("bmAtivo").checked=store.get("bmAtivo")==="1"; }catch(e){} } const g=$("bmGroup").value, tb=$("bmTable"), note=$("bmNote");
  if(g==="*"&&!bmTierSel&&!partial){   // todas as mercadorias e todos os tiers: busca um tier por vez (do T8 ao T2) e mostra o que já chegou
    const falta=[8,7,6,5,4,3,2].filter(t=>!BM_LOADED.has(bmLk("*",t)));
    for(let i=0;i<falta.length;i++){ const t=falta[i];
      note.textContent=i?`Consultando T${t} (${i+1} de ${falta.length}); mostrando o que já chegou. ${note.textContent}`:`Consultando as ordens do Mercado Negro, T${t} (1 de ${falta.length})…`;
      if(i+1<falta.length) ensureBM(g,falta[i+1]).catch(()=>{});   // adianta só o próximo tier (a API limita pedidos por minuto)
      const ok=await ensureBM(g,t); if(tok!==BM_TOK) return;
      if(!ok){ note.textContent="Não consegui consultar o Mercado Negro agora. Tente de novo em um minuto."; return; }
      if(i<falta.length-1){ await renderBM(true); if(tok!==BM_TOK) return; } }
  } else if(!(partial&&g==="*"&&!bmTierSel)&&!BM_LOADED.has(bmLk(g,bmTierSel))){ tb.textContent=""; note.textContent="Consultando as ordens do Mercado Negro…"; const ok=await ensureBM(g,g==="*"?bmTierSel:0); if(!ok){ note.textContent="Não consegui consultar o Mercado Negro agora. Tente de novo em um minuto."; return; } if($("bmGroup").value!==g||tok!==BM_TOK) return; }
  const rows=[]; for(const k of bmKeys(g)) for(let t=2;t<=8;t++){ if(bmTierSel&&t!==bmTierSel) continue; if(t<4&&BM[k][4]) continue; for(let e=0;e<=(t<4?0:4);e++) for(let q=1;q<=5;q++){ if(bmQualSel&&q!==bmQualSel) continue; if(!bmHas(bmId(k,t,e),q)) continue; if($("bmAtivo").checked&&(bmRec(bmId(k,t,e),q)["Black Market"][2]||0)>BM_ATIVO_H) continue; if(g==="*"){ const tp=BM_TOP[bmLk(g,t)]; if(!tp||!tp.has(bmId(k,t,e))) continue; } const m=bmModel(k,t,e,$("bmFocus").checked,q); if(m.bm) rows.push(m); } }
  const val=m=>bmMode==="flip"?m.flip:m.craft, base=m=>bmMode==="flip"?(m.buy&&m.buy.p):m.cost, pct=m=>{ const b=base(m), v=val(m); return b>0&&v!=null?v/b*100:-Infinity; };
  /* ordem: primeiro pela porcentagem de lucro, depois pelo valor em prata (o cabeçalho de cada coluna inverte a prioridade) */
  const cmp=bmSort==="val"?(a,b)=>val(b)-val(a)||pct(b)-pct(a):(a,b)=>pct(b)-pct(a)||val(b)-val(a);
  let ok=rows.filter(m=>val(m)!=null).sort(cmp); if(g==="*"&&!bmTierSel){ const c={}; ok=ok.filter(m=>(c[m.t]=(c[m.t]||0)+1)<=5); }   // todos os tiers: os 5 mais lucrativos de cada um
  const shown=ok.slice(0,100);
  if(BM_GEN!==DATA.geradoEm){ BM_BASE=BM_CUR; BM_CUR={}; BM_GEN=DATA.geradoEm; }
  tb.textContent=""; const hr=tb.createTHead().insertRow();
  (bmMode==="flip"?["Peça","Tier","Qualidade","O MN paga (bruto)","Preço médio","Mais barato em","Preço lá","Lucro %","Lucro por peça","O MN compra por dia"]:["Peça","Tier","Qualidade","O MN paga (bruto)","Preço médio","Custo para fabricar","Lucro %","Lucro por peça","Cidade com bônus","O MN compra por dia"]).concat([""]).forEach(h=>{ const th=el("th",{text:h}), pc=h==="Lucro %", vl=h==="Lucro por peça";
    if(pc||vl){ th.className="bm-sort"; th.tabIndex=0; th.setAttribute("role","button"); const on=pc===(bmSort==="pct"); th.setAttribute("aria-sort",on?"descending":"none"); th.append(on?" ▼":""); th.title=pc?"Ordenar primeiro pela porcentagem de lucro (e depois pelo valor)":"Ordenar primeiro pelo valor do lucro (e depois pela porcentagem)";
      const go=()=>{ bmSort=pc?"pct":"val"; renderBM(); }; th.addEventListener("click",go); th.addEventListener("keydown",ev=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); go(); } }); }
    hr.append(th); });
  for(const m of shown){ const body=tb.createTBody(); const tr=document.createElement("tr"); body.append(tr); tr.className="clickrow bm-row "+(val(m)>=0?"is-gain":"is-loss"); tr.tabIndex=0;
    tr.insertCell().append(withIconQ(m.id,m.q,nmKey(m.key,m.name))); tr.insertCell().textContent=`${m.t}.${m.e}`;
    tr.insertCell().append(el("span",{class:"qtag q"+m.q,text:QNAME[m.q]}));
    const c1=tr.insertCell(); c1.className="num"; c1.append(fmt(m.bm.p)," ",el("span",{class:"age"+(m.bm.age>6?" old":""),title:ageTip(m.bm.age),text:ageTxt(m.bm.age)}));
    { const cm=tr.insertCell(); cm.className="num mk-avg bm-avg"; cm.title="Média do que o Mercado Negro pagou por esta peça (ponderada pelas peças vendidas nos últimos 7 dias; sem valor se não vendeu nesse período)"; cm.textContent=avgTxt(bmAvgOf(m.id,m.q)); }
    if(bmMode==="flip"){ tr.insertCell().textContent=m.buy.c+(m.buy.q>m.q?` (${QNAME[m.buy.q]})`:""); const cb=tr.insertCell(); cb.className="num"; cb.append(fmt(m.buy.p)," ",el("span",{class:"age"+(m.buy.age>6?" old":""),title:ageTip(m.buy.age),text:ageTxt(m.buy.age)})); }
    else { const c2=tr.insertCell(); c2.className="num"; c2.textContent=fmt(m.cost); }
    const v=val(m), pc=pct(m), cp=tr.insertCell(); cp.className="num bm-pct "+(v>=0?"gain":"loss"); cp.textContent=pc===-Infinity?"—":`${v>=0?"+":""}${dec(pc)}%`;
    const c3=tr.insertCell(); c3.className="num bm-profit "+(v>=0?"gain":"loss"); c3.textContent=sgn(v); { const key=m.id+"|"+m.q+"|"+bmMode, old=BM_BASE[key]; BM_CUR[key]=v; if(old!=null&&Math.abs(v-old)>=1){ const up=v>old; c3.prepend(el("span",{class:"bm-chg "+(up?"up":"dn"),title:`${up?"Subiu":"Caiu"} desde a última atualização: o lucro era ${sgn(old)}`,text:up?"▲":"▼"})," "); } }
    if(bmMode!=="flip"){ const c4=tr.insertCell(); c4.className="small muted"; c4.textContent=`${m.city}${m.thin?", pouca oferta":""}`; }
    const cv=tr.insertCell(); cv.className="num vol"; cv.textContent=volTxt(bmVolOf(m.id,m.q)); tr.dataset.id=m.id; tr.dataset.q=String(m.q);
    const cg=tr.insertCell(); const gb=el("button",{type:"button",class:"btn mn-craft",title:"Abrir no Craft: fabricar este item e vender para o Mercado Negro",text:"Craft ➜"}); if(m.t<4){ gb.disabled=true; gb.title="O Craft calcula a partir do T4"; } gb.addEventListener("click",ev=>{ ev.stopPropagation(); ofFromBM(BM[m.key][1],m); }); gb.addEventListener("keydown",ev=>ev.stopPropagation()); cg.append(gb);
    const dr=document.createElement("tr"); body.append(dr); dr.className="of-drow"; dr.hidden=true; const dc=document.createElement("td"); dr.append(dc); dc.colSpan=11;
    const toggle=()=>{ const open=dr.hidden; dr.hidden=!open; tr.classList.toggle("open",open); tr.setAttribute("aria-expanded",String(open)); if(open){ dc.textContent=""; try{ dc.append(bmPanel(m)); }catch(e){ dc.append(el("p",{class:"small loss",text:"Não consegui montar os detalhes: "+(e&&e.message||e)})); } setTimeout(()=>{ try{ const r=dr.getBoundingClientRect(); if(r.bottom>innerHeight-8) dr.scrollIntoView({block:"nearest",behavior:RM?"auto":"smooth"}); }catch(e){} },60); } };
    tr.setAttribute("aria-expanded","false"); tr.addEventListener("click",ev=>{ if(ev.target.closest("a,button")) return; toggle(); }); tr.addEventListener("keydown",ev=>{ if(ev.target===tr&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); toggle(); } }); }
  { const w=$("bmWrap"); if(w) w.style.setProperty("--tblw",(w.clientWidth-8)+"px"); }
  const gname=g==="*"?"todas as mercadorias":BM_GROUPS.find(x=>x[0]===g)[1], pos=ok.filter(m=>val(m)>0).length;
  const qtxt=bmQualSel?` na qualidade ${QNAME[bmQualSel].toLowerCase()}`:"";
  note.textContent = !rows.length ? `Nenhuma ordem do Mercado Negro para ${gname.toLowerCase()}${qtxt} nos últimos 3 dias.`
    : `${rows.length} ordens de ${gname.toLowerCase()}${qtxt}; ${pos} dão lucro ${bmMode==="flip"?"comprando na cidade mais barata e levando para Caerleon":"fabricando"+($("bmFocus").checked?" com foco":" sem foco")}.${g==="*"&&!bmTierSel?" Mostrando os 5 mais lucrativos de cada tier (a lista completa de tudo pesa demais para a API; escolha uma mercadoria para ver todos).":ok.length>100?` Mostrando as 100 de maior lucro de ${fmt(ok.length)} registros: não são todos.`:(bmSort==="val"?" Ordenado pelo valor do lucro e, se empatar, pela porcentagem.":" Ordenado pela porcentagem de lucro e, se empatar, pelo valor.")} Clique numa linha para ver a conta e o histórico.`;
  if(window.gsap&&!RM) gsap.from(tb.querySelectorAll(".bm-row"),{opacity:0,x:-8,duration:.25,stagger:.015,clearProps:"opacity,transform"});
  hbar($("bmWrap")); bmVolumes(shown);
}
/* idade do preço: quanto tempo faz que algum jogador viu esse preço no jogo (a API só tem dado novo quando alguém escaneia) */
const ageTxt=h=>h<1?"agora":h<24?`${Math.round(h)}h`:`${Math.round(h/24)}d`;
const ageTip=h=>h<1?"Visto agora há pouco por algum jogador.":`Último jogador que viu esse preço: há ${h<24?Math.round(h)+" h":Math.round(h/24)+" dia(s)"}.${h>6?" Pode ter mudado desde então.":""}`;
/* o que mudou na última atualização de preços: compara o lucro de cada linha com o da atualização anterior */
const BM_ATIVO_H=6;
let BM_GEN="", BM_BASE={}, BM_CUR={}, bmSort="pct";
const BM_AVG={};   // id: {qualidade: preço médio que o Mercado Negro pagou}, ou -1 se a consulta falhou
const bmAvgOf=(id,q)=>{ const v=BM_AVG[id]; return v==null?undefined:typeof v==="number"?null:(v[q]||null); };
const avgTxt=v=>v===undefined?"…":v?fmt(Math.round(v)):"—";
const volTxt=v=>v==null?"…":v<0?"—":v===0?"0":v<1?"menos de 1":v<10?dec(v):fmt(v);
// Quantas peças o Mercado Negro comprou por dia na última semana (a API não mostra o tamanho das ordens abertas;
// o histórico de vendas dele é o melhor sinal de quanto ele absorve).
async function bmVolumes(shown){
  const ids=[...new Set(shown.map(m=>m.id).filter(id=>BM_VOL[id]==null))];
  for(let i=0;i<ids.length;i+=25){ const part=ids.slice(i,i+25);
    try{ const j=await apiJSON(`${HOST}/api/v2/stats/history/${part.join(",")}.json?locations=Black%20Market&time-scale=24`,360);
      const vol={}, av={}; part.forEach(id=>{ vol[id]={}; av[id]={}; }); const since=Date.now()-7*86400e3;
      for(const x of j){ const v=vol[x.item_id]; if(!v) continue; const q=+x.quality||1; let sum=0; for(const d of (x.data||[])) if(Date.parse(d.timestamp+"Z")>=since) sum+=d.item_count; v[q]=(v[q]||0)+sum/7;
        let sw=0,sp=0,aw=0,ap=0; for(const d of (x.data||[])){ const w=d.item_count||0, pr=d.avg_price||0; if(!w||!pr) continue; aw+=w; ap+=w*pr; if(Date.parse(d.timestamp+"Z")>=since){ sw+=w; sp+=w*pr; } }
        const pm=sw?sp/sw:0; if(pm) av[x.item_id][q]=pm; }
      part.forEach(id=>{ BM_VOL[id]=vol[id]; BM_AVG[id]=av[id]; });
    }catch(e){ part.forEach(id=>{ BM_VOL[id]=-1; BM_AVG[id]=-1; }); }
    document.querySelectorAll("#bmTable tbody tr").forEach(tr=>{ if(!tr.dataset.id) return; const c=tr.querySelector(".vol"); if(c) c.textContent=volTxt(bmVolOf(tr.dataset.id,+tr.dataset.q||1)); const c2=tr.querySelector(".bm-avg"); if(c2){ const t=avgTxt(bmAvgOf(tr.dataset.id,+tr.dataset.q||1)); if(c2.firstChild&&c2.firstChild.nodeType===3) c2.firstChild.nodeValue=t; else c2.prepend(t); } });
  }
}
function bmPanel(m){
  const d=el("div",{class:"of-xp"}), left=el("div",{class:"of-xl"}), right=el("div",{class:"of-xs"});
  left.append(el("h4",{class:"of-xh",text:"Preços & quantidades"}));
  const hd=el("div",{class:"of-xr of-xhd"}); ["Stats","Item","Valor","Tempo","Cidade","Qtd"].forEach(x=>hd.append(el("span",{text:x}))); left.append(hd);
  const ageT=h=>h==null?"—":h<1?"agora":`${Math.round(h)}h`;
  const row=(kind,lab,id,q,nmText,sub,val,tempo,city,qty)=>{ const r=el("div",{class:"of-xr "+kind}); r.append(el("span",{class:"of-pill "+kind,text:lab}));
    const it=el("span",{class:"of-xi"}); it.append(el("i",{class:"of-dot"+(kind==="buy"?" red":"")}),iconImg(id,34,q)); const nmE=el("span",{class:"of-xn"}); nmE.append(el("b",{text:nmText})); if(sub) nmE.append(el("small",{text:sub})); it.append(nmE); r.append(it);
    r.append(el("b",{class:"of-xv",text:fmt(val)}),el("span",{class:"of-xt",text:tempo}),el("span",{class:"of-xc",text:city}),el("span",{class:"of-xq",text:qty})); return r; };
  const nmI=nmKey(m.key,m.name);
  left.append(row("sale","VENDA INST",m.id,m.q,nmI,`${QNAME[m.q]} ou melhor`,m.bm.p,ageT(m.bm.age),"Black Market","1x"));
  if(bmMode!=="flip"&&m.cost!=null) for(const p of m.parts) left.append(row("buy","COMPRA INST",(p.id||m.id).replace(/_LEVEL(\d)$/,"_LEVEL$1@$1"),1,p.nm,p.art?"artefato não volta":"preço típico nas cidades",p.p,"—",m.city,`${fmt(p.q)}x`));
  if(bmMode==="flip"&&m.flip!=null&&m.buy) left.append(row("buy","COMPRA INST",m.id,m.buy.q,nmI,`${m.buy.q>m.q?QNAME[m.buy.q]+" · ":""}mais barato nas cidades`,m.buy.p,ageT(m.buy.age),m.buy.c,"1x"));
  const hist=el("div",{class:"hist"}); const hh=el("div",{class:"hist-h"}); const ht=el("span",{text:"O que o Mercado Negro pagou em 30 dias"}); const rg=el("div",{class:"seg hist-seg",role:"group","aria-label":"Período do gráfico"}); let hdias=30;
  [7,30].forEach(n=>{ const bt=el("button",{type:"button","aria-pressed":String(n===hdias),text:n+"d"}); bt.addEventListener("click",ev=>{ ev.stopPropagation(); hdias=n; rg.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===bt))); ht.textContent=`O que o Mercado Negro pagou em ${n} dias`; drawHistory(svg,hn,m.id,"Black Market",m.q,true,n); }); rg.append(bt); });
  hh.append(ht,rg); const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("viewBox","0 0 760 230"); svg.setAttribute("role","img"); const hn=el("p",{class:"tiny muted"}); hist.append(hh,svg,hn); left.append(hist);
  const card=(cls,title,lines,tot)=>{ const c=el("div",{class:"of-xcard "+cls}); c.append(el("h4",{class:"of-xh",text:title})); for(const [k,v,cc] of lines){ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{class:cc||"",text:v})); c.append(l); } if(tot){ const l=el("div",{class:"of-xline of-xtot"}); l.append(el("span",{text:tot[0]}),el("b",{text:tot[1]})); c.append(l); } return c; };
  const vv=bmVolOf(m.id,m.q), tax=st.prem?4:8, bruto=m.bm.p, taxV=bruto-m.net;
  const crafting=bmMode!=="flip"&&m.cost!=null&&m.craft!=null, flipping=bmMode==="flip"&&m.flip!=null;
  if(crafting) right.append(card("cost","Custos detalhados (−)",[["Matérias primas",fmt(m.res)],[`Retorno de recursos (${Math.round(m.rr*100)}%)`,"−"+fmt(m.res*m.rr)],...(m.art>0?[["Artefato",fmt(m.art)]]:[]),["Taxa da estação",fmt(m.fee)]],["Custo para fabricar",fmt(m.cost)]));
  else if(flipping) right.append(card("cost","Custos detalhados (−)",[[`Compra em ${m.buy.c}`,fmt(m.buyC)]],["Custo da compra",fmt(m.buyC)]));
  const lucro=bmMode==="flip"?m.flip:m.craft;
  const lines=[["O MN paga",fmt(bruto)],[`Taxa de venda (${tax}%${st.prem?" Premium":""})`,"−"+fmt(taxV)],["Líquido da venda",fmt(m.net)]];
  if(crafting&&bmMode!=="flip") lines.push(["Cidade com bônus",m.city],["Foco gasto",m.focus?fmt(m.fc):"desligado"]);
  if(vv!=null&&vv>=0) lines.push(["O MN compra por dia (7 dias)",volTxt(vv)]);
  { const rc=card(lucro!=null&&lucro<0?"res neg":"res",lucro!=null&&lucro<0?"Resultado (−)":"Resultado (+)",lines,[bmMode==="flip"?"Lucro revendendo":"Lucro fabricando",lucro==null?"—":sgn(lucro)]); right.append(rc); }
  d.append(left,right); drawHistory(svg,hn,m.id,"Black Market",m.q,true); return d;
}

/* ================= trabalhadores ================= */
let JOURNALS = null;                // data/journals.json: tipo: {tier: [fama, quantidade base, prata do vazio, saque | prata]}
const WK = [["ORE","Minerador","minerando","minerio"],["FISHING","Pescador","pescando","pesca"],["FIBER","Colhedor de fibra","colhendo fibra","fibra"],["HIDE","Esfolador","esfolando","pelego"],["WOOD","Lenhador","cortando madeira","madeira"],["STONE","Pedreiro","quebrando pedra","pedra"],
  ["WARRIOR","Ferreiro","fabricando placa e armas de guerreiro",null],["HUNTER","Flecheiro","fabricando couro e armas de caçador",null],["MAGE","Imbuidor","fabricando pano e cajados",null],["TOOLMAKER","Funileiro","fabricando ferramentas",null],["MERCENARY","Mercenário","matando monstros",null]];
let WK_LOADED=false, WK_LOADING=null, wkTierSel=0;
/* felicidade: a barra do trabalhador tem 100 pontos por segmento e (tier + 1) segmentos (T8: 900).
   Cheia rende 150%; o rendimento cresce em linha com a felicidade. O % que o jogo mostra, se digitado, manda. */
const hapMax = t => (t+1)*100;
const wkHap = () => { const v=+(store.get("wkHap")||""); return v>0?v:null; };
const wkPct = () => { const v=+(store.get("wkPct")||""); return v>0?v:null; };
const wkYield = t => wkPct() ? wkPct()/100 : (wkHap()==null ? 1.5 : Math.min(wkHap(),hapMax(t))/hapMax(t)*1.5);
const lootKey = id => id;
const lootApi = id => { const m=id.match(/_LEVEL(\d)$/); return m?`${id}@${m[1]}`:id; };
function ensureWK(){
  if(WK_LOADED) return Promise.resolve(true); if(WK_LOADING) return WK_LOADING;
  const ids=new Set();
  for(const [ty] of WK) for(let t=4;t<=8;t++){ ids.add(`T${t}_JOURNAL_${ty}_EMPTY`); ids.add(`T${t}_JOURNAL_${ty}_FULL`); const l=JOURNALS[ty][t][3]; if(Array.isArray(l)) for(const [iid] of l) if(!DATA.itens[iid]) ids.add(lootApi(iid)); }
  WK_LOADING=fetchIds([...ids],DATA.itens,[...CITIES,"Caerleon"]).then(()=>{WK_LOADED=true; return true;}).catch(()=>false).finally(()=>{WK_LOADING=null;});
  return WK_LOADING;
}
const wkN = () => Math.max(1,Math.min(99,Math.round(+(store.get("wkN")||1)||1)));
const wkBuyMode = () => store.get("wkBuy")==="ordem"?"ordem":"direto";
/* onde comprar o diário cheio: direto = menor preço de venda entre as cidades; por ordem = maior ordem de compra aberta + 2,5% de taxa da ordem */
function wkCost(id){
  const r=(DATA.itens||{})[id]||{}; let best=null; const ord=wkBuyMode()==="ordem";
  for(const c of SHOP_LOCS){ const v=r[c]; if(!v) continue; const p=ord?v[1]:v[0]; if(!(p>0)) continue; const cost=ord?p*1.025:p; if(!best||cost<best.p) best={c,p:cost}; }
  return best;
}
function wkModel(ty,t,wt=t){
  const j=JOURNALS[ty]&&JOURNALS[ty][t]; if(!j) return null;
  const empty=typical(`T${t}_JOURNAL_${ty}_EMPTY`,0), full=typical(`T${t}_JOURNAL_${ty}_FULL`,0);
  let yieldV=null, thin=false;
  if(Array.isArray(j[3])){ let sw=0, sv=0, wAll=0; for(const [iid,w,q] of j[3]){ wAll+=w; const p=typical(lootKey(iid),0); if(!p) continue; sw+=w; sv+=w*q*p.p; }
    if(sw>=wAll*0.8){ yieldV=j[1]*(sv/sw)*wkYield(wt)*(1-taxOf()); thin=sw<wAll*0.97; } }
  else yieldV=j[3]*wkYield(wt);
  const bc=wkCost(`T${t}_JOURNAL_${ty}_FULL`);
  return {ty,t,fame:j[0],empty,full,yieldV,thin,buyCity:bc,buyFull:yieldV!=null&&bc?yieldV-bc.p:null,fill:full&&empty?full.p*(1-taxOf())-empty.p:null};
}
function setupWK(){
  const ts=$("wkTier"); if(ts.children.length) return;
  const top=Math.max(...Object.values(PF.coleta||{}).map(g=>g.tier||0),6); wkTierSel=Math.min(8,Math.max(4,top));
  [4,5,6,7,8].forEach(t=>ts.append(el("button",{type:"button","data-t":String(t),"aria-pressed":String(t===wkTierSel),text:`T${t}`})));
  ts.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ts.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); wkTierSel=+b.dataset.t; renderWK(); });
  { const ni=$("wkN"); ni.value=String(wkN()); ni.addEventListener("change",()=>{ const v=Math.max(1,Math.min(99,Math.round(+ni.value||1))); ni.value=String(v); store.set("wkN",String(v)); renderWK(); });
    const bs=$("wkBuy"); bs.querySelectorAll("button").forEach(b=>{ b.setAttribute("aria-pressed",String(b.dataset.m===wkBuyMode())); b.addEventListener("click",()=>{ store.set("wkBuy",b.dataset.m); bs.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); renderWK(); }); }); }
  const hi=$("wkHap"), pi=$("wkPct"); hi.value=wkHap()??""; pi.value=wkPct()??""; hi.placeholder=String(hapMax(wkTierSel));
  hi.addEventListener("change",()=>{ const v=Math.max(0,Math.round(+hi.value||0)); hi.value=v?String(v):""; store.set("wkHap",v?String(v):""); renderWK(); });
  pi.addEventListener("change",()=>{ const v=Math.max(0,Math.round(+pi.value||0)); pi.value=v?String(v):""; store.set("wkPct",v?String(v):""); renderWK(); });
}
async function renderWK(){
  if(!JOURNALS){ try{ JOURNALS=await need("journals"); }catch(e){ $("wkStatus").textContent="Não consegui abrir os dados dos diários."; return; } }
  setupWK(); const tb=$("wkTable");
  if(!WK_LOADED){ tb.textContent=""; $("wkStatus").dataset.base=$("wkStatus").dataset.base||$("wkStatus").textContent; $("wkStatus").textContent="Consultando os preços dos diários…"; const ok=await ensureWK(); $("wkStatus").textContent=$("wkStatus").dataset.base; if(!ok){ $("wkStatus").textContent="Não consegui consultar os diários agora."; return; } }
  const mx=hapMax(wkTierSel); $("wkHapMax").textContent=`de ${mx}`; $("wkHap").max=String(mx); $("wkHap").placeholder=String(mx);
  $("wkYieldTxt").textContent = wkPct() ? `Usando o rendimento de ${wkPct()}% que você digitou.` : wkHap()==null ? `Sem felicidade digitada: a conta usa a barra cheia (${mx} em T${wkTierSel}), que rende 150%.` : `Felicidade ${Math.min(wkHap(),mx)} de ${mx} em T${wkTierSel}: rende ${Math.round(wkYield(wkTierSel)*100)}% (cheia rende 150%).`;
  tb.textContent=""; const hr=tb.createTHead().insertRow(); ["Trabalhador","Diário vazio","Diário cheio","Comprar o cheio em",`Devolve (${Math.round(wkYield(wkTierSel)*100)}%)`,"Comprar cheio e entregar",`Por dia com ${wkN()} ${wkN()===1?"trabalhador":"trabalhadores"}`,"Encher e vender","Enche com",""].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(), t=wkTierSel;
  for(const [ty,nm,how] of WK){ const m=wkModel(ty,t); if(!m) continue; const tr=body.insertRow();
    tr.insertCell().append(withIcon(`T${t}_JOURNAL_${ty}_FULL`,`${nm} T${t}`));
    [[m.empty&&m.empty.p,`T${t}_JOURNAL_${ty}_EMPTY`],[m.full&&m.full.p,`T${t}_JOURNAL_${ty}_FULL`]].forEach(([v,ic])=>{ const c=tr.insertCell(); c.className="num"; const tx=v?fmt(v):"—"; c.append(withIcon(ic,tx)); });
    { const c=tr.insertCell(); c.className="small"; if(m.buyCity){ c.append(el("b",{text:fmt(Math.round(m.buyCity.p))})," ",el("span",{class:"muted",text:m.buyCity.c})); c.title=wkBuyMode()==="ordem"?"Maior ordem de compra aberta nessa cidade, mais 2,5% de taxa para montar a ordem":"Menor preço de venda entre as cidades"; } else c.textContent="—"; }
    { const c=tr.insertCell(); c.className="num"; c.textContent=m.yieldV?fmt(m.yieldV):"—"; }
    { const c=tr.insertCell(); c.className="num "+(m.buyFull==null?"":m.buyFull>=0?"gain":"loss"); c.textContent=m.buyFull==null?"—":sgn(m.buyFull); }
    { const c=tr.insertCell(); const v=m.buyFull==null?null:m.buyFull*wkN(); c.className="num bm-profit "+(v==null?"":v>=0?"gain":"loss"); c.textContent=v==null?"—":sgn(v); c.title=`${sgn(m.buyFull||0)} por diário × ${wkN()}, um diário por trabalhador por dia`; }
    { const c=tr.insertCell(); c.className="num "+(m.fill==null?"":m.fill>=0?"gain":"loss"); c.textContent=m.fill==null?"—":sgn(m.fill); }
    const c=tr.insertCell(); c.className="small muted"; c.textContent=`${fmt(m.fame)} de fama ${how}${m.thin?"; parte do saque sem preço":""}`;
    { const rc=tr.insertCell(); const rb=el("button",{type:"button",class:"btn mn-craft",title:"Abrir o Refino para ver o que fazer com o que o trabalhador devolve",text:"Refino ➜"}); rb.addEventListener("click",()=>{ const b=document.getElementById("t-refino"); if(b) b.click(); }); rc.append(rb); } }
  renderWKRank();
  renderWKMine();
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.03,clearProps:"opacity,transform"});
}
/* ranking: qual tier de diário rende mais por dia, com o trabalhador do tier escolhido e a quantidade informada */
function renderWKRank(){
  const box=$("wkRank"); if(!box) return; box.textContent=""; const wt=wkTierSel, rows=[];
  for(const [ty,nm] of WK) for(let t=4;t<=wt;t++){ const m=wkModel(ty,t,wt); if(m&&m.buyFull!=null) rows.push({m,nm,v:m.buyFull*wkN()}); }
  rows.sort((a,b)=>b.v-a.v);
  if(!rows.length){ box.append(el("p",{class:"small muted",text:"Sem preços suficientes para montar o ranking agora."})); return; }
  const tb=el("table",{}); const hr=tb.createTHead().insertRow(); ["#","Diário","Comprar o cheio em","Preço do cheio","Devolve","Por diário",`Por dia (${wkN()})`].forEach(h=>hr.append(el("th",{text:h}))); const body=tb.createTBody();
  rows.slice(0,10).forEach((r,i)=>{ const m=r.m, tr=body.insertRow(); tr.insertCell().textContent=String(i+1);
    tr.insertCell().append(withIcon(`T${m.t}_JOURNAL_${m.ty}_FULL`,`${r.nm} T${m.t}`));
    { const c=tr.insertCell(); c.className="small"; c.textContent=m.buyCity?m.buyCity.c:"—"; }
    { const c=tr.insertCell(); c.className="num"; c.textContent=m.buyCity?fmt(Math.round(m.buyCity.p)):"—"; }
    { const c=tr.insertCell(); c.className="num"; c.textContent=fmt(m.yieldV); }
    { const c=tr.insertCell(); c.className="num "+(m.buyFull>=0?"gain":"loss"); c.textContent=sgn(m.buyFull); }
    { const c=tr.insertCell(); c.className="num bm-profit "+(r.v>=0?"gain":"loss"); c.textContent=sgn(r.v); } });
  box.append(tb);
}
function renderWKMine(){
  const box=$("wkMine"); box.textContent=""; const items=[];
  for(const [ty,nm,how,gk] of WK){ if(!gk) continue; const g=(PF.coleta||{})[gk]; if(!g||!(g.tier>=4)) continue; const m=wkModel(ty,Math.min(8,g.tier)); if(!m||m.fill==null) continue;
    items.push(recItem(`Diário de ${nm.toLowerCase()} T${m.t}`,[`Vazio a ${fmt(m.empty.p)}, cheio a ${fmt(m.full.p)}: ${sgn(m.fill)} por diário que você encher ${how}`,`Enche com ${fmt(m.fame)} de fama. ${m.buyFull!=null?(m.buyFull>0?`Com trabalhador a ${Math.round(wkYield(m.t)*100)}%, entregar rende mais: ${sgn(m.buyFull)} sobre o preço do cheio.`:`Vender o cheio rende mais que entregar ao trabalhador.`):""}`])); }
  const mc=wkModel("MERCENARY",6); if(mc&&mc.fill!=null) items.push(recItem("Diário de mercenário T6",[`${sgn(mc.fill)} por diário que você encher nas Corrompidas, Brumas ou masmorras`,`Enche com ${fmt(mc.fame)} de fama matando monstros`]));
  if(!items.length) items.push(recItem("Marque suas coletas na ficha",["Com coleta e tier marcados, aparece aqui quanto vale encher os diários do que você já faz."]));
  items.forEach(i=>box.append(i));
}

/* ================= matchups ================= */
let MU = null;                      // data/matchups.json
const LINE_RX = {espada:/espad|sword/i,machado:/machad|\baxe/i,maca:/maç|\bmace/i,martelo:/martel|hammer/i,lanca:/lanç|spear|pike|glaive/i,bordao:/bordõ|bordão|quarterstaff/i,adaga:/adag|dagger/i,luvas:/luva|gloves|bracer|fists/i,arco:/\barco|\bbow\b|longbow|warbow/i,besta:/besta|crossbow|boltcaster|repeater/i,metamorfo:/metamorf|shapeshift/i,fogo:/fogo|\bfire/i,gelo:/gelo|frost/i,arcano:/arcan/i,sagrado:/sagrad|holy/i,natureza:/naturez|nature/i,maldito:/maldit|amaldi|curse/i};
async function renderMU(){
  const box=$("muCards"); if(!MU){ box.textContent="Abrindo as fichas…"; try{ MU=await need("matchups"); }catch(e){ box.textContent="Não consegui abrir as fichas agora."; return; } }
  const q=($("muFind").value||"").trim().toLowerCase(), hi=$("muMine").checked, mine=LINES.filter(([k])=>wl(k)>=2).map(([k])=>k);
  box.textContent="";
  for(const m of MU){ if(q&&!(m.w+" "+(LINE_NAME[m.l]||"")).toLowerCase().includes(q)) continue;
    const good=mine.filter(k=>LINE_RX[k]&&LINE_RX[k].test([].concat(m.forte_contra||[]).join(" ")));
    const card=el("article",{class:"mu mu-c"+(hi&&good.length?" mine":""),tabIndex:0,role:"button","aria-label":`Abrir a ficha de ${nm(m.w)}`});
    const head=()=>{ const hd=el("div",{class:"mu-hd"}); const wi=m.code?zimg(m.code,8,0,"mu-wi"):null; if(wi){ wi.alt=nm(m.w); wi.title=nm(m.w); hd.append(wi); }
      hd.append(el("h3",{},document.createTextNode(nm(m.w)),el("small",{text:LINE_NAME[m.l]||""})));
      if(m.sp&&m.sp.length){ const sk=el("div",{class:"mu-sks",title:"Habilidades mais usadas nas builds com esta arma"}); m.sp.forEach((id,i)=>{ const b=el("span",{class:"mu-sk"+(i===3?" pas":"")}); b.append(spellImg(id,"mu-sp"),el("i",{text:["Q","W","E","P"][i]||""})); sk.append(b); }); hd.append(sk); }
      return hd; };
    card.append(head());
    const dl=el("dl"); const row=(t,d,cls)=>{ if(!d) return; dl.append(el("dt",{text:t}),el("dd",{class:cls||"",text:d})); };
    row("O perigo",m.ameaca,"threat"); row("Costuma vir com",m.outras); row("Quando entrar",m.janela); row("Guarde",m.guardar); row("Erro comum",m.erro); row("Quem lida bem",[].concat(m.forte_contra||[]).join("; ")); if(m.patch) row("Patch",m.patch);
    const resumo=el("p",{class:"mu-sum"}); resumo.append(el("b",{text:"O perigo: "}),m.ameaca||""); card.append(resumo);
    if(m.janela){ const w=el("p",{class:"mu-win"}); w.append(el("b",{text:"Quando entrar: "}),m.janela); card.append(w); }
    if(hi&&good.length) card.append(el("p",{class:"small",text:`Suas linhas citadas: ${good.map(k=>LINE_NAME[k]).join(", ")}.`}));
    card.append(el("span",{class:"mu-more",text:"Ver a ficha completa ›"}));
    const open=()=>{ const dlg=$("muDlg"), body=$("muBody"); body.textContent=""; body.append(head(),dl);
      if(hi&&good.length) body.append(el("p",{class:"small",text:`Suas linhas citadas: ${good.map(k=>LINE_NAME[k]).join(", ")}.`}));
      const src=el("p",{class:"src"}); const fs=[].concat(m.fonte||[]); if(fs.length){ src.append("Fonte: "); fs.slice(0,2).forEach((u,i)=>{ if(i) src.append(", "); let h=u; try{ h=new URL(u).hostname.replace(/^www\./,""); }catch(e){} src.append(el("a",{href:u,target:"_blank",rel:"noopener",text:h})); }); body.append(src); }
      if(dlg.showModal&&!dlg.open) dlg.showModal(); else dlg.setAttribute("open",""); };
    card.addEventListener("click",ev=>{ if(ev.target.closest("a")) return; open(); }); card.addEventListener("keydown",ev=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); open(); } });
    box.append(card); }
  if(!box.children.length) box.textContent="Nenhuma ficha com esse nome.";
  tiltCards();
  if(window.gsap&&!RM) gsap.from(box.children,{opacity:0,y:16,rotationX:-8,transformPerspective:800,duration:.4,stagger:.04,ease:"power3.out",clearProps:"opacity,transform"});
}

