/* ================= Montar a bag: o que vai na viagem, quanto pesa, quanto vale e com o que levar =================
   Peso de cada item, velocidade das montarias e as faixas de sobrecarga vêm dos arquivos do jogo (ao-bin-dumps).
   A carga que cada montaria e bolsa soma vem da tabela da wiki oficial (qualidade normal).
   A bag fica guardada no navegador e pode ser compartilhada por link (#bag=...). */
let CARGA=null;
const BAG_KEY="bag";
const BAG={items:[],bag:"T6_BAG",food:"",gear:0,mount:"",from:"",to:"",open:false};
try{ Object.assign(BAG,JSON.parse(store.get(BAG_KEY)||"{}")); BAG.open=false; }catch(e){}
const bagSave=()=>{ const {open,...o}=BAG; store.set(BAG_KEY,JSON.stringify(o)); };
const BAG_DEST=[...SHOP_LOCS,"Black Market"];
const bagCityPT=c=>c==="Black Market"?"Mercado Negro":c;

async function bagData(){ if(!CARGA) CARGA=await need("carga"); return CARGA; }
const bagW=id=>{ if(!CARGA) return 0; const b=String(id).split("@")[0]; return CARGA.w[b]??CARGA.w[b.replace(/_LEVEL\d$/,"")]??null; };

/* ---------- pôr na bag ---------- */
function bagAdd(list,label){
  for(const x of list){ if(!x||!x.id||!(x.q>0)) continue;
    const cur=BAG.items.find(i=>i.id===x.id);
    if(cur){ cur.q+=Math.round(x.q); Object.assign(cur,{...x,q:cur.q}); }
    else BAG.items.push({...x,q:Math.round(x.q)}); }
  if(!BAG.from){ const f=list.find(x=>x.buyC&&BAG_DEST.includes(x.buyC)); if(f) BAG.from=f.buyC; }
  if(!BAG.to){ const t=list.find(x=>x.sellC&&BAG_DEST.includes(x.sellC)); if(t) BAG.to=t.sellC; }
  bagSave(); bagFab(); if(BAG.open) bagRender();
  toast(label||`${list.length>1?list.length+" itens":"Item"} na bag`);
}
function bagBtn(get,title){ const b=el("button",{type:"button",class:"bag-add",title:title||"Pôr na bag (para calcular peso, valor e montaria)","aria-label":"Pôr na bag"});
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M12 12v5M9.5 14.5h5"/></svg>';
  b.addEventListener("click",ev=>{ ev.stopPropagation(); ev.preventDefault(); try{ const l=get(); if(l&&l.length) bagAdd(l); }catch(e){ toast("Não consegui pôr na bag"); } });
  b.addEventListener("keydown",ev=>ev.stopPropagation()); return b; }

/* ---------- conta ---------- */
const bagTotW=()=>BAG.items.reduce((a,i)=>{ const w=bagW(i.id); return a+(w==null?0:w*i.q); },0);
const bagMissW=()=>BAG.items.filter(i=>bagW(i.id)==null);
const bagSell=i=>{ const to=BAG.to; if(to){ const r=(DATA.itens||{})[i.id.includes("_LEVEL")?i.id.split("@")[0]:i.id]||{}, v=r[to]; const p=to==="Black Market"?(v&&v[1]):(v&&v[0]); if(p>0) return {p,c:to}; } return i.sell>0?{p:i.sell,c:i.sellC}:null; };
const bagAvg=i=>{ const s=bagSell(i); if(!s||typeof OF2==="undefined") return 0; const h=OF2.hs[nk(i.id)+"|"+s.c]; return h&&h.avg>0?h.avg:0; };
function bagTotals(){ let cost=0,sale=0,avg=0,miss=0; for(const i of BAG.items){ if(i.buy>0) cost+=i.buy*i.q; const s=bagSell(i); if(s) sale+=s.p*i.q; else miss++; const a=bagAvg(i); avg+=(a||(s?s.p:0))*i.q; } return {cost,sale,avg,miss}; }
function bagOver(pct){ let f=1; for(const [lim,fac] of CARGA.over) if(pct>lim) f=fac; return f; }
const bagBagOf=()=>CARGA.bags.find(b=>b.id===BAG.bag)||null;
const bagFoodPct=()=>{ const f=CARGA.food.find(x=>x.id===BAG.food); return f?f.pct:0; };
/* carga e velocidade com uma montaria (ou a pé) */
function bagCalc(m){
  const bg=bagBagOf(), items=bagTotW(), fixed=(+BAG.gear||0)+(bg?bg.w:0)+(m?m.w:0);
  const cap=(CARGA.base+(bg?bg.kg:0)+(m?m.kg:0))*(1+bagFoodPct()/100), tot=items+fixed, pct=cap>0?tot/cap*100:Infinity;
  const sp=CARGA.speed*(1+(m?m.sp:0)/100)*bagOver(pct);
  return {items,fixed,tot,cap,pct,sp,free:cap-fixed};
}
const bagPrice=id=>{ const r=(DATA.itens||{})[id]; if(!r) return null; let b=null; for(const [c,v] of Object.entries(r)) if(v[0]>0&&(!b||v[0]<b.p)) b={p:v[0],c}; return b; };
/* risco da rota */
function bagRisk(){ const a=BAG.from, b=BAG.to; if(!a||!b) return {lvl:0,txt:"Escolha de onde sai e para onde vai para ver o risco do caminho."};
  const set=new Set([a,b]);
  if(a===b) return {lvl:0,txt:"Mesma cidade: sem viagem."};
  if(set.has("Caerleon")||set.has("Black Market")) return {lvl:3,txt:"Caerleon e o Mercado Negro ficam no meio das zonas vermelhas: quem morre perde a carga e a montaria. Vá com montaria rápida e não leve mais do que aceita perder."};
  if(set.has("Brecilien")) return {lvl:3,txt:"Brecilien fica nas Brumas: dá para ser atacado e perder tudo no caminho. Leve só o que aceita perder."};
  return {lvl:1,txt:"Entre cidades reais dá para ir só por zonas azuis e amarelas (mais longe, sem perda total). Cortando por zona vermelha chega mais rápido, mas quem morre lá perde a carga."}; }
/* recomendação: velocidade carregando tudo, descontada quando a montaria custa uma parte grande da carga */
function bagRank(){
  const V=Math.max(bagTotals().sale||bagTotals().cost||0,1);
  return CARGA.mounts.map(m=>{ const c=bagCalc(m), pr=bagPrice(m.id); const ok=c.pct<=100.0001;
    const pen=pr?Math.min(.6,pr.p/(pr.p+V)):0, score=ok&&pr?c.sp*(1-pen):-1;
    const trips=c.free>0?Math.max(1,Math.ceil(c.items/c.free)):Infinity;
    return {m,c,pr,ok,score,trips}; });
}

/* ---------- interface ---------- */
function bagFab(){
  let f=$("bagFab"); if(!f){ f=el("button",{type:"button",id:"bagFab",class:"bag-fab","aria-controls":"bagDrawer","aria-expanded":"false"}); document.body.append(f); f.addEventListener("click",()=>bagToggle()); }
  const n=BAG.items.length; f.hidden=false; f.textContent=""; f.classList.toggle("vazia",!n); f.title=n?"Abrir a bag":"Bag vazia: abrir para montar a carga"; f.setAttribute("aria-label",n?`Bag: ${n} ${n===1?"item":"itens"}`:"Bag vazia");
  f.insertAdjacentHTML("beforeend",'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>');
  f.append(el("span",{class:"bf-t",text:"Bag"}),el("b",{text:n?`${fmt(n)} ${n===1?"item":"itens"}${CARGA?` · ${fmt(Math.round(bagTotW()))} kg`:""}`:"vazia"}));
}
function bagToggle(on){ BAG.open=on==null?!BAG.open:on; let d=$("bagDrawer");
  if(!d){ d=el("aside",{id:"bagDrawer",class:"bag-dr","aria-label":"Montar a bag",role:"dialog"}); document.body.append(d);
    document.addEventListener("keydown",ev=>{ if(ev.key==="Escape"&&BAG.open) bagToggle(false); }); }
  d.hidden=!BAG.open; $("bagFab").setAttribute("aria-expanded",String(BAG.open)); document.body.classList.toggle("bag-on",BAG.open);
  if(BAG.open) bagRender(); }
const bagSel=(opts,cur,onCh,label)=>{ const s=el("select",{"aria-label":label}); opts.forEach(([v,t])=>s.append(el("option",{value:v,text:t}))); s.value=cur; s.addEventListener("change",()=>onCh(s.value)); return s; };
const bagNm=i=>{ if(i.nm) return i.nm; const c=typeof CATALOG!=="undefined"&&CATALOG?CATALOG.i.find(r=>r[0]===i.id.split("@")[0].replace(/_LEVEL\d$/,"")):null; return c?mkName(c):i.id; };
const mtNm=m=>`${LANG==="en"?m.en:m.pt} T${m.id[1]}`;

async function bagRender(){
  const d=$("bagDrawer"); if(!d) return;
  if(!CARGA){ d.textContent=""; d.append(el("p",{class:"small muted",text:"Abrindo pesos e montarias…"})); try{ await bagData(); }catch(e){ d.textContent="Não consegui abrir os dados de carga."; return; } }
  /* preços das montarias, bolsas e tortas (uma vez por sessão; o cache da API segura 10 min) */
  if(!bagRender.priced){ bagRender.priced=1; const ids=[...CARGA.mounts.map(m=>m.id),...CARGA.bags.map(b=>b.id),...CARGA.food.map(f=>f.id)];
    fetchIds(ids,DATA.itens,SHOP_LOCS).then(()=>{ if(BAG.open) bagRender(); }).catch(()=>{}); }
  /* média de 7 dias de cada item na cidade de venda */
  if(typeof histFetch==="function"){ const keys=BAG.items.map(i=>{ const s=bagSell(i); return s?nk(i.id)+"|"+s.c:null; }).filter(Boolean).filter(k=>OF2.hs[k]==null);
    if(keys.length&&!bagRender.hBusy){ bagRender.hBusy=1; histFetch(keys).finally(()=>{ bagRender.hBusy=0; if(BAG.open) bagRender(); }); } }
  bagFab(); const sc=d.scrollTop; d.textContent="";
  const head=el("div",{class:"bag-h"}); head.append(el("h2",{text:"Sua bag"}));
  const close=el("button",{type:"button",class:"bag-x","aria-label":"Fechar",text:"×"}); close.addEventListener("click",()=>bagToggle(false)); head.append(close); d.append(head);
  if(!BAG.items.length){ d.append(el("p",{class:"bag-empty",text:"A bag está vazia. Nas abas Refino, Craft, Mercado e Mercado Negro, use o botão com a sacola em cada linha para pôr o item aqui. Depois é só escolher bolsa, comida e de onde para onde vai: o site soma o peso, o valor e indica a montaria."})); return; }
  /* itens */
  const list=el("div",{class:"bag-list"});
  for(const i of BAG.items){ const w=bagW(i.id), s=bagSell(i), a=bagAvg(i), row=el("div",{class:"bag-it"});
    row.append(iconImg(nk(i.id),40));
    const nm=el("div",{class:"bag-in"}); nm.append(el("b",{text:bagNm(i)}),el("small",{text:`${w==null?"peso desconhecido":fmt1(w*i.q)+" kg"}${s?` · vende ${fmt(s.p)} em ${bagCityPT(s.c)}`:""}${a?` · média ${fmt(Math.round(a))}`:""}${i.buy>0?` · custou ${fmt(Math.round(i.buy))}`:""}`})); row.append(nm);
    const q=el("input",{type:"number",min:"0",step:"1",value:String(i.q),class:"bag-q","aria-label":`Quantidade de ${bagNm(i)}`});
    q.addEventListener("change",()=>{ const v=Math.max(0,Math.round(+q.value||0)); if(!v) BAG.items=BAG.items.filter(x=>x!==i); else i.q=v; bagSave(); bagRender(); });
    const rm=el("button",{type:"button",class:"bag-rm","aria-label":`Tirar ${bagNm(i)} da bag`,text:"×"}); rm.addEventListener("click",()=>{ BAG.items=BAG.items.filter(x=>x!==i); bagSave(); bagRender(); });
    row.append(q,rm); list.append(row); }
  d.append(list);
  const tt=bagTotals(), tw=bagTotW(), miss=bagMissW();
  const tot=el("div",{class:"bag-tot"});
  const line=(k,v,cls,tip)=>{ const l=el("div",{class:"bag-l",title:tip||""}); l.append(el("span",{text:k}),el("b",{class:cls||"",text:v})); tot.append(l); };
  line("Peso dos itens",`${fmt1(tw)} kg`,"",miss.length?`${miss.length} item(ns) sem peso nos dados do jogo`:"");
  if(tt.cost>0) line("Custo (o que você pagou ou gastou)",fmt(Math.round(tt.cost)));
  line(`Valor de venda${BAG.to?` em ${bagCityPT(BAG.to)}`:""}`,tt.sale>0?fmt(Math.round(tt.sale)):"—","",tt.miss?`${tt.miss} item(ns) sem preço de venda`:"");
  line("Preço médio da bag (7 dias)",tt.avg>0?fmt(Math.round(tt.avg)):"…","","Soma pelo preço médio de venda dos últimos 7 dias na cidade de venda; sem média, entra o preço atual");
  if(tt.cost>0&&tt.sale>0){ const tax=(st.prem?0.04:0.08)+0.025, lucro=tt.sale*(1-tax)-tt.cost; line("Lucro ao vender (com taxas)",sgn(Math.round(lucro)),lucro>=0?"gain":"loss","Venda por ordem: taxa de venda e de anúncio descontadas"); }
  d.append(tot);
  /* viagem */
  const via=el("div",{class:"bag-sec"}); via.append(el("h3",{text:"Viagem"}));
  const dest=[["","—"],...BAG_DEST.map(c=>[c,bagCityPT(c)])];
  const r1=el("div",{class:"bag-row"}); r1.append(el("label",{class:"f"},"De",bagSel(dest,BAG.from,v=>{ BAG.from=v; bagSave(); bagRender(); },"De onde sai")),el("label",{class:"f"},"Para",bagSel(dest,BAG.to,v=>{ BAG.to=v; bagSave(); bagRender(); },"Para onde vai"))); via.append(r1);
  const rk=bagRisk(); via.append(el("p",{class:"bag-risk r"+rk.lvl,text:rk.txt}));
  if(rk.lvl>=3&&tt.sale>0) via.append(el("p",{class:"tiny muted",text:`Em jogo nesta viagem: ${fmt(Math.round(tt.sale))} em itens, mais o que você estiver vestindo e a montaria.`}));
  d.append(via);
  /* equipamento */
  const eq=el("div",{class:"bag-sec"}); eq.append(el("h3",{text:"Bolsa, comida e equipamento"}));
  const bagOpts=[["","Sem bolsa"],...CARGA.bags.map(b=>{ const p=bagPrice(b.id); return [b.id,`${b.id.includes("INSIGHT")?"Sacola da Visão":"Bolsa"} T${b.id[1]} · +${fmt(b.kg)} kg${p?` · ${fmtS(p.p)}`:""}`]; })];
  const foodOpts=[["","Sem comida"],...CARGA.food.map(f=>{ const p=bagPrice(f.id), nm=(COOK&&COOK.n&&COOK.n[f.id])||f.id; return [f.id,`${nm} · +${dec(f.pct)}% de carga${p?` · ${fmtS(p.p)}`:""}`]; })];
  const gear=el("input",{type:"number",min:"0",step:"1",value:String(BAG.gear||0),"aria-label":"Peso do seu equipamento"}); gear.addEventListener("change",()=>{ BAG.gear=Math.max(0,+gear.value||0); bagSave(); bagRender(); });
  const r2=el("div",{class:"bag-row"}); r2.append(el("label",{class:"f"},"Bolsa",bagSel(bagOpts,BAG.bag,v=>{ BAG.bag=v; bagSave(); bagRender(); },"Bolsa")),el("label",{class:"f"},"Comida",bagSel(foodOpts,BAG.food,v=>{ BAG.food=v; bagSave(); bagRender(); },"Comida")));
  const r3=el("div",{class:"bag-row"}); r3.append(el("label",{class:"f",title:"Peso do que você está vestindo (aparece no inventário do jogo). Bolsa e montaria já entram sozinhas."},"Seu equipamento (kg)",gear)); eq.append(r2,r3);
  eq.append(el("p",{class:"tiny muted",text:`Carga do personagem sem nada: ${CARGA.base} kg. As tortas valem 30 minutos.`})); d.append(eq);
  /* montaria escolhida e recomendação */
  const mt=el("div",{class:"bag-sec"}); mt.append(el("h3",{text:"Montaria"}));
  const rank=bagRank(), feas=rank.filter(r=>r.ok&&r.pr).sort((a,b)=>b.score-a.score);
  const best=feas[0], bestCommon=feas.find(r=>!r.m.rare);
  const card=(r,tag)=>{ const c=el("div",{class:"bag-rec"+(r.m.rare?" rare":"")}); c.append(iconImg(r.m.id,48));
    const t=el("div",{}); t.append(el("small",{class:"bag-tag",text:tag}),el("b",{text:mtNm(r.m)}),el("span",{text:`carga ${fmt(Math.round(r.c.pct))}% · ${dec(r.c.sp)} m/s (+${r.m.sp}%) · ${r.pr?fmtS(r.pr.p)+" em "+r.pr.c:"sem preço"}${r.m.rare?" · rara":""}`}));
    const use=el("button",{type:"button",class:"linkbtn",text:BAG.mount===r.m.id?"em uso":"usar esta"}); use.addEventListener("click",()=>{ BAG.mount=r.m.id; bagSave(); bagRender(); }); t.append(use); c.append(t); return c; };
  if(best) mt.append(card(best,"Mais indicada"));
  if(bestCommon&&bestCommon!==best) mt.append(card(bestCommon,"Melhor fora as raras"));
  else if(bestCommon&&bestCommon===best) mt.append(el("p",{class:"tiny muted",text:"A mais indicada já não é rara."}));
  if(!best){ const big=rank.filter(r=>r.c.free>0).sort((a,b)=>b.c.free-a.c.free)[0]; mt.append(el("p",{class:"bag-risk r3",text:big?`Nenhuma montaria leva tudo de uma vez. A que mais carrega é ${mtNm(big.m)}: ${fmt(big.trips)} viagens de cerca de ${fmt1(big.c.items/big.trips)} kg.`:"Nenhuma montaria leva essa carga."})); }
  const opts=[["","A pé (sem montaria)"],...CARGA.mounts.map(m=>[m.id,`${mtNm(m)} · +${fmt(m.kg)} kg · +${m.sp}%${m.rare?" · rara":""}`])];
  mt.append(el("label",{class:"f"},"Montaria que você vai usar",bagSel(opts,BAG.mount,v=>{ BAG.mount=v; bagSave(); bagRender(); },"Montaria")));
  const cur=CARGA.mounts.find(m=>m.id===BAG.mount)||null, cc=bagCalc(cur);
  const meter=el("div",{class:"bag-meter"+(cc.pct>100?" over":cc.pct>85?" warn":"")}); meter.append(el("i",{style:`width:${Math.min(100,cc.pct)}%`}));
  mt.append(meter,el("p",{class:"small",text:`${fmt1(cc.tot)} kg de ${fmt1(cc.cap)} kg (${fmt(Math.round(cc.pct))}% da carga). Velocidade ${dec(cc.sp)} m/s${cc.pct>100?`. Sobrecarga: ${bagOver(cc.pct)===0?"não dá para andar":`anda a ${Math.round(bagOver(cc.pct)*100)}%`}`:""}.`}));
  if(cc.pct>100&&cc.free>0){ const n=Math.ceil(cc.items/cc.free); mt.append(el("p",{class:"small",text:`Com ${cur?mtNm(cur):"a pé"} sem sobrecarga: ${fmt(n)} ${n===1?"viagem":"viagens"} de até ${fmt1(cc.free)} kg${tt.sale>0?`, cerca de ${fmtS(tt.sale/n)} por viagem`:""}.`})); }
  /* tabela das que levam tudo */
  const det=el("details",{class:"bag-all"}); det.append(el("summary",{text:`Todas as montarias que levam a bag inteira (${feas.length})`}));
  const tb=el("table",{class:"bag-t"}); const th=tb.createTHead().insertRow(); ["Montaria","Carga","Velocidade","Preço"].forEach(h=>th.append(el("th",{text:h})));
  const bd=tb.createTBody(); for(const r of feas.slice(0,40)){ const tr=bd.insertRow(); tr.insertCell().textContent=mtNm(r.m)+(r.m.rare?" (rara)":""); tr.insertCell().textContent=`${fmt(Math.round(r.c.pct))}%`; tr.insertCell().textContent=`${dec(r.c.sp)} m/s`; tr.insertCell().textContent=r.pr?fmtS(r.pr.p):"—"; }
  det.append(tb,el("p",{class:"tiny muted",text:"Ordem: mais rápida carregando tudo, descontando quando a montaria custa uma parte grande do valor da carga. Montarias sem preço no mercado aparecem só na lista de escolha."})); mt.append(det);
  d.append(mt);
  /* ações */
  const act=el("div",{class:"bag-act"});
  const share=el("button",{type:"button",class:"btn",text:"Copiar link da bag"}); share.addEventListener("click",()=>{ const code=btoa(unescape(encodeURIComponent(JSON.stringify({i:BAG.items.map(i=>[i.id,i.q,i.sell||0,i.sellC||"",i.buy||0,i.buyC||"",i.nm||""]),b:BAG.bag,f:BAG.food,m:BAG.mount,o:BAG.from,d:BAG.to})))).replace(/=+$/,"");
    const url=location.origin+location.pathname+"#bag="+code; try{ navigator.clipboard.writeText(url).then(()=>toast("Link da bag copiado"),()=>prompt("Copie o link da bag:",url)); }catch(e){ prompt("Copie o link da bag:",url); } });
  const clr=el("button",{type:"button",class:"btn ghost",text:"Esvaziar"}); clr.addEventListener("click",()=>{ BAG.items=[]; bagSave(); bagRender(); });
  act.append(share,clr); d.append(act);
  d.append(el("p",{class:"tiny muted bag-src",text:"Peso dos itens, velocidade das montarias e faixas de sobrecarga: arquivos do jogo. Carga de montarias e bolsas: wiki oficial do Albion, em qualidade normal (qualidade maior carrega um pouco mais). Confira no jogo antes de viajar com carga cara."}));
  d.scrollTop=sc;
}
const fmt1=v=>v>=100?fmt(Math.round(v)):dec(v);

/* ---------- bag vinda por link ---------- */
function bagFromHash(){ const m=/#bag=([A-Za-z0-9+/_-]+)/.exec(location.hash); if(!m) return;
  try{ const o=JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g,"+").replace(/_/g,"/"))))); history.replaceState(null,"",location.pathname+location.search);
    const items=(o.i||[]).map(([id,q,sell,sellC,buy,buyC,nm])=>({id,q,sell,sellC,buy,buyC,nm}));
    if(BAG.items.length&&!confirm("Trocar a sua bag atual pela bag deste link?")) return;
    Object.assign(BAG,{items,bag:o.b||BAG.bag,food:o.f||"",mount:o.m||"",from:o.o||"",to:o.d||""}); bagSave(); bagToggle(true); toast("Bag do link aberta");
  }catch(e){ toast("Esse link de bag não abriu"); } }

(function bagBoot(){ bagFab(); bagData().then(()=>bagFab()).catch(()=>{}); window.addEventListener("hashchange",bagFromHash); setTimeout(bagFromHash,1500); })();
