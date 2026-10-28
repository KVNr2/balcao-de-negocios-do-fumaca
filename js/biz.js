/* ================= mercado negro ================= */
let BM = null;                      // data/bm.json: chave: [nome, grupo, cidade com bônus, receita "P20L12", [extra, qtd] | 0, foco T4.0]
const BM_RES = {M:"METALBAR",P:"PLANKS",L:"LEATHER",C:"CLOTH"};
const BM_RES_PT = {M:"Barra",P:"Tábua",L:"Couro",C:"Tecido"};
const BM_GROUPS = [...LINES.map(([k,n])=>[k,n]),["a_placa","Armaduras de placa"],["a_couro","Armaduras de couro"],["a_pano","Armaduras de pano"],["mao","Mão secundária"]];
const BMP = {};                     // id: {cidade: [venda, compra, idade em horas da compra, idade da venda]}
const BMQ = {};                     // qualidades 2 a 5, mesmo formato do BMP: id: {qualidade: {cidade: [venda, compra, idade da compra, idade da venda]}} (a qualidade 1 fica no BMP)
const BM_VOL = {};                  // id: {qualidade: peças que o Mercado Negro comprou por dia (média dos últimos 7 dias)}, ou -1 se a consulta falhou
/* dicas dos cabeçalhos da tabela (a coluna fica curta; o que ela é e de onde vem está aqui) */
const BM_HT={"Pedido":"Pedido de compra atual do Mercado Negro para esta peça (qualidade indicada ou melhor), antes da taxa de venda. Vem só dos jogadores com o Albion Overlay coletando preços (Supabase do site). Pedido com mais de 72 horas não aparece.","Média 7 dias":"Média dos pedidos de compra do Mercado Negro registrados nos últimos 7 dias (não é média de vendas fechadas)","Custo":"Custo de fabricar a peça: matéria-prima (já com o retorno de recursos), artefato e taxa da bancada","Bônus em":"Cidade que dá bônus de retorno de recursos para fabricar esta peça"};
const BM_LOADED = new Set(), BM_TS = {}, BM_REF = {}; let BM_TOK=0, bmMode="craft", bmTierSel=0, bmQualSel=0, bmSel=null, PLANKS_LOADED=false;
const ageH = d => d&&!d.startsWith("0001") ? (Date.now()-Date.parse(d+"Z"))/3600e3 : Infinity;
/* allQ: traz as qualidades 1 a 5 (a 1 vai para o BMP, as outras para o BMQ); sem allQ só a qualidade 1, como as outras páginas usam */
const BM_A={};   // "id|qualidade|cidade": médias 7 e 30 dias registradas no Supabase {a7,n7,a30,n30}
const BMD={}, BMD_EXTRA=new Set();   // BMD: preços de materiais só do Supabase: id: {cidade: [venda, compra, hora da venda, hora da compra]}
const bmIso=t=>t?new Date(t).toISOString().slice(0,19):"0001-01-01T00:00:00";
/* Mercado Negro: todos os valores vêm só do Supabase (registrados pelo Albion Overlay), nada da API pública.
   allQ: traz as qualidades 1 a 5 (a 1 vai para o BMP, as outras para o BMQ); sem allQ só a qualidade 1 */
/* Preços: o Mercado Negro vem só da nossa base (Supabase). Os das cidades e dos materiais vêm do Albion Data, e para cada preço vale o
   mais recente: se o Albion Data foi coletado depois do nosso, fica o do Albion Data; senão, o do Supabase. As médias vêm sempre do Supabase. */
async function bmMergedRows(ids,locs,quals){
  const sbr=(await sbRows(ids,locs,quals)).map(x=>({...x})), cities=locs.filter(c=>c!=="Black Market"); if(!cities.length) return sbr;
  const loc=cities.join(",").replace(/ /g,"%20"), parts=[]; for(let i=0;i<ids.length;i+=API_CHUNK) parts.push(ids.slice(i,i+API_CHUNK));
  let ad=[]; try{ ad=(await Promise.all(parts.map(p=>apiJSON0(`${HOST}/api/v2/stats/prices/${p.join(",")}.json?locations=${loc}&qualities=${quals.join(",")}`)))).flat(); }catch(e){ ad=[]; }
  const idx=new Map(sbr.map(x=>[x.item_id+"|"+x.city+"|"+x.quality,x])), ms=d=>{ if(!d||String(d).startsWith("0001")) return 0; d=String(d); return Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(d)?d:d+"Z")||0; };
  for(const a of ad){ if(!a||a.city==="Black Market") continue; const k=a.item_id+"|"+a.city+"|"+a.quality; let x=idx.get(k);
    if(!x){ x={item_id:a.item_id,quality:+a.quality,city:a.city,sell_min:0,sell_min_at:null,sell_amt:null,buy_max:0,buy_max_at:null,buy_amt:null,avg7:null,avg7_n:0,avg30:null,avg30_n:0}; sbr.push(x); idx.set(k,x); }
    if(a.sell_price_min>0&&ms(a.sell_price_min_date)>ms(x.sell_min_at)){ x.sell_min=a.sell_price_min; x.sell_min_at=a.sell_price_min_date+"Z"; }
    if(a.buy_price_max>0&&ms(a.buy_price_max_date)>ms(x.buy_max_at)){ x.buy_max=a.buy_price_max; x.buy_max_at=a.buy_price_max_date+"Z"; }
  }
  return sbr;
}
async function bmFetch(ids, locs, allQ=false){
  const rows=await bmMergedRows(ids,locs,allQ?[1,2,3,4,5]:[1]);
  for(const x of rows){
    const qx=+x.quality; if(!(qx>=1&&qx<=5)) continue;
    BM_A[x.item_id+"|"+qx+"|"+x.city]={a7:x.avg7,n7:x.avg7_n||0,a30:x.avg30,n30:x.avg30_n||0};
    const sa=ageH(bmIso(x.sell_min_at)), ba=ageH(bmIso(x.buy_max_at));
    const s=x.city!=="Black Market"&&sa<MAX_AGE_H?x.sell_min||0:0, b=ba<MAX_AGE_H?x.buy_max||0:0; if(!s&&!b) continue;
    if(qx===1) (BMP[x.item_id]||(BMP[x.item_id]={}))[x.city]=[s,b,ba,sa];
    else { const m=BMQ[x.item_id]||(BMQ[x.item_id]={}); (m[qx]||(m[qx]={}))[x.city]=[s,b,ba,sa]; }
  }
}
/* preço dos materiais (barras, tábuas, couro, pano, artefatos...) das contas de fabricação, cidades e materiais: o preço mais recente entre o Albion Data e o Supabase */
function bmMatIds(){ const ids=new Set(baseIds().filter(i=>!FISH_IDS.includes(i))); for(let t=4;t<=8;t++) for(let e=0;e<=4;e++) ids.add(`T${t}_PLANKS`+(e?`_LEVEL${e}@${e}`:"")); BMD_EXTRA.forEach(i=>ids.add(i)); return [...ids]; }
async function bmMats(extra){
  (extra||[]).forEach(i=>BMD_EXTRA.add(i));
  const rows=await bmMergedRows(bmMatIds(),[...CITIES,"Caerleon"],[1]);
  for(const k of Object.keys(BMD)) delete BMD[k];
  for(const x of rows){
    const sa=ageH(bmIso(x.sell_min_at)), ba=ageH(bmIso(x.buy_max_at));
    const s=x.sell_min>0&&sa<MAX_AGE_H?x.sell_min:0, b=x.buy_max>0&&ba<MAX_AGE_H?x.buy_max:0; if(!s&&!b) continue;
    const k=x.item_id.includes("_LEVEL")?x.item_id.split("@")[0]:x.item_id;
    (BMD[k]||(BMD[k]={}))[x.city]=[s,b,s?Date.parse(bmIso(x.sell_min_at)+"Z"):0,b?Date.parse(bmIso(x.buy_max_at)+"Z"):0];
  }
  dropOutliers(BMD,new Set(Object.keys(BMD)));
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
    await bmFetch(gear,["Black Market"],true);
    await bmMats(extra);
    /* candidatos dos dois modos juntos (fabricar e revender): trocar o modo depois só filtra, sem nova consulta */
    const topBy=pick=>{ const sc=new Map();
      for(const k of Object.keys(BM)){ if(t<4&&BM[k][4]) continue; for(let e=0;e<=(t<4?0:4);e++) for(let q=1;q<=5;q++){ const id=bmId(k,t,e); if(!bmHas(id,q)) continue; const m=bmModel(k,t,e,$("bmFocus").checked,q); if(!m.bm) continue; const v=pick(m); if(v!=null&&(!sc.has(id)||v>sc.get(id))) sc.set(id,v); } }
      return [...sc.entries()].sort((a,b)=>b[1]-a[1]).slice(0,BM_TOPN).map(x=>x[0]); };
    const top=[...new Set([...topBy(m=>m.craft),...topBy(m=>m.net)])];
    if(top.length) await bmFetch(top,["Black Market",...SHOP_LOCS],true);
    BM_TOP[lk]=new Set(top); BM_LOADED.add(lk); BM_TS[lk]=Date.now(); return true;
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
    const wait=async()=>{};
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
const bmLk=(g,only)=>g==="*"?`*#${only}`:`${g}#${only||0}`;
function ensureBM(g,only=0){ const lk=bmLk(g,only); if(BM_LOADED.has(lk)) return Promise.resolve(true); return BM_PEND[lk]||(BM_PEND[lk]=ensureBM1(g,only).finally(()=>{ delete BM_PEND[lk]; })); }
async function ensureBM1(g,only=0){
  const lk=bmLk(g,only);
  if(g==="*"&&only) return ensureBMTop(only,lk);
  const keys=bmKeys(g), gear=[], extra=new Set();
  for(const k of keys) for(let t=(only||2);t<=(only||8);t++){ if(t<4&&BM[k][4]) continue; for(let e=0;e<=(t<4?0:4);e++) gear.push(bmId(k,t,e)); if(BM[k][4]) extra.add(`T${t}_${BM[k][4][0]}`); }
  for(const t of [2,3]) for(const r of ["METALBAR","PLANKS","LEATHER","CLOTH"]) extra.add(`T${t}_${r}`);
  try{
    await bmFetch(gear,["Black Market",...SHOP_LOCS],true);
    await bmMats(extra);
    BM_LOADED.add(lk); BM_TS[lk]=Date.now(); return true;
  }catch(e){ return false; }
}
/* o que já foi carregado envelhece: ao abrir ou refazer a lista, relê as ordens do Mercado Negro (o valor mais recente vale) sem apagar a tela */
function bmStaleCheck(g,only){
  const lks=(g==="*"&&!only)?[8,7,6,5,4,3,2].map(t=>[t,bmLk(g,t)]):[[only,bmLk(g,only)]];
  for(const [t,lk] of lks){ if(!BM_LOADED.has(lk)||BM_REF[lk]||Date.now()-(BM_TS[lk]||0)<45e3) continue;
    BM_REF[lk]=(g==="*"&&t?ensureBMTop(t,lk):ensureBM1(g,t||0)).catch(()=>false).finally(()=>{ delete BM_REF[lk]; }).then(ok=>{ if(ok&&!Object.keys(BM_REF).length) renderBM(true); }); }
}
/* T2 e T3 não estão na tabela de foco: estimativa pela razão entre tiers (cerca de 1,75 por tier) */
const bmFocT=(t,e)=>t>=4?FOCUS_CRAFT[t-4][e]:Math.round(429/Math.pow(1.75,4-t));
function bmFCE(key){ return itemFCE(key); }   // armas, armaduras e mão secundária, pela spec de craft da ficha
/* q: qualidade da ordem do Mercado Negro (1 a 5). A ordem aceita essa qualidade ou melhor, então para revender
   vale a peça mais barata entre as qualidades q a 5. */
/* preço de compra de material: a mediana das cidades, ou o preço de venda na cidade escolhida em "Cidade de compra" */
function bmTyp(id){ if(!BMF.buy) return typical(id,0,BMD); const v=(BMD[id]||{})[BMF.buy]; return v&&v[0]>0?{p:v[0],n:2,t:v[2]||0}:null; }
function bmModel(key,t,e,focus=$("bmFocus").checked,q=1){
  const r=BM[key], id=bmId(key,t,e), rec=bmRec(id,q);
  const bmo=rec["Black Market"], cae=rec["Caerleon"];
  const bm=bmo&&bmo[1]>0?{p:bmo[1],age:bmo[2]}:null;
  let buy=null; for(let qq=q;qq<=5;qq++){ const rq=bmRec(id,qq); for(const c of SHOP_LOCS){ if(BMF.buy&&c!==BMF.buy) continue; const v=rq[c]; if(v&&v[0]>0&&(!buy||v[0]<buy.p)) buy={c,p:v[0],age:v[3],q:qq}; } }
  const buyC=buy?buy.p:null;
  const tax=st.prem?0.04:0.08, net=bm?bm.p*(1-tax):null;
  let res=0, cnt=0, thin=false, miss=null; const parts=[];
  for(const [,c,n] of r[3].matchAll(/([MPLC])(\d+)/g)){ const rid=idOf(t,BM_RES[c],e), p=bmTyp(rid); if(!p){ miss=BM_RES_PT[c]; break; } if(p.n<2) thin=true; res+=+n*p.p; cnt+=+n; parts.push({id:rid,nm:`${BM_RES_PT[c]} T${t}.${e}`,q:+n,p:p.p}); }
  let art=0; if(!miss&&r[4]){ const p=bmTyp(`T${t}_${r[4][0]}`); if(!p) miss="artefato"; else { art=p.p*r[4][1]; parts.push({id:`T${t}_${r[4][0]}`,nm:(r[4][0].startsWith("ALCHEMY")?"Ingrediente raro":"Artefato")+` T${t}`,q:r[4][1],p:p.p,art:true}); } }
  const rr=rrr(0.15,focus,st.daily), fee=cnt*IV(t,e)*0.1125*feeVal()/100;
  const cost=miss?null:res*(1-rr)+art+fee;
  const fc=Math.max(1,Math.round(r[5]*bmFocT(t,e)/429*Math.pow(0.5,bmFCE(key)/10000)));
  return {key,t,e,q,id,name:r[0],city:r[2],bm,net,buyC,buy,flip:net!=null&&buyC?net-buyC:null,cost,craft:net!=null&&cost!=null?net-cost:null,parts,res,art,fee,rr,fc,thin,miss,focus};
}
function bmGroupDefault(){ return LINES[0][0]; }   /* sem ordem por spec: o Mercado Negro compra de todos, o que a pessoa sabe fabricar não muda o que ele paga */
/* seleção da aba, como no Mercado: busca livre (acha em qualquer tipo) ou categoria + tipo */
const BMF={q:"",cat:"",sub:"",ench:-1,lim:0,buy:""};
const BM_CATS=[["weapons","Armas"],["armors","Peito"],["head","Cabeça"],["shoes","Pés"],["offhands","Mão secundária"]];
const bmCatOf=k=>k.startsWith("ARMOR_")?"armors":k.startsWith("HEAD_")?"head":k.startsWith("SHOES_")?"shoes":BM[k][1]==="mao"?"offhands":"weapons";
function bmFillSub(){ const x=$("bmSub"); x.textContent=""; x.append(el("option",{value:"",text:"Todas"}));
  const opts=BMF.cat==="weapons"?LINES.map(([k,n])=>[k,n]):["armors","head","shoes"].includes(BMF.cat)?[["a_placa","Placa"],["a_couro","Couro"],["a_pano","Pano"]]:[];
  opts.forEach(([v,t])=>x.append(el("option",{value:v,text:t}))); x.disabled=!opts.length; x.value=BMF.sub; if(x.value!==BMF.sub){ BMF.sub=""; x.value=""; } }
function bmSelKeys(){ const q=BMF.q.trim().toLowerCase(), search=q.length>=2;
  return Object.keys(BM).filter(k=>{ if(search){ const r=BM[k], gn=(BM_GROUPS.find(x=>x[0]===r[1])||[0,""])[1].toLowerCase(); return nmKey(k,r[0]).toLowerCase().includes(q)||r[0].toLowerCase().includes(q)||k.toLowerCase().includes(q)||gn.includes(q); }
    return (!BMF.cat||bmCatOf(k)===BMF.cat)&&(!BMF.sub||BM[k][1]===BMF.sub); }); }
function bmSelGroups(keys){ const ord=BM_GROUPS.map(x=>x[0]); return [...new Set(keys.map(k=>BM[k][1]))].sort((a,b)=>ord.indexOf(a)-ord.indexOf(b)); }
function setupBM(){
  const sel=$("bmGroup"); if(sel.options.length) return;
  const og1=el("optgroup",{label:"Armas"}), og3=el("optgroup",{label:"Armaduras e mão secundária"});
  for(const [k,n] of BM_GROUPS){ const o=el("option",{value:k,text:n}); (k.startsWith("a_")||k==="mao"?og3:og1).append(o); }
  [og1,og3].forEach(g=>{ if(g.children.length) sel.append(g); }); { const sg=store.get("bmGroup"); sel.value=(sg&&sg!=="*"&&BM_GROUPS.some(x=>x[0]===sg)||LINES.some(x=>x[0]===sg))?sg:bmGroupDefault(); if(!sel.value) sel.value=bmGroupDefault(); }
  /* filtros iguais aos da aba Mercado: busca, categoria, tipo, tier, encantamento e qualidade */
  /* a aba sempre abre em Todas as categorias e tipos; só tier, encantamento e qualidade são lembrados */
  BMF.cat=""; BMF.sub=""; try{ const sv=JSON.parse(store.get("bmF")||"null"); if(sv){ BMF.ench=sv.ench==null?-1:+sv.ench; bmTierSel=+sv.tier||0; bmQualSel=+sv.qual||0; } }catch(e){}
  const bmSave=()=>{ try{ store.set("bmF",JSON.stringify({cat:BMF.cat,sub:BMF.sub,ench:BMF.ench,tier:bmTierSel,qual:bmQualSel})); }catch(e){} };
  const fill=(id,opts,val,fn)=>{ const x=$(id); opts.forEach(([v,t])=>x.append(el("option",{value:String(v),text:t}))); x.value=String(val); x.addEventListener("change",()=>{ fn(x.value); bmSave(); BMF.lim=0; bmSel=null; renderBM(); }); };
  fill("bmCat",[["","Todas"],...BM_CATS],BMF.cat,v=>{ BMF.cat=v; BMF.sub=""; bmFillSub(); });
  bmFillSub();
  $("bmSub").addEventListener("change",()=>{ BMF.sub=$("bmSub").value; if(BMF.sub&&[...sel.options].some(o=>o.value===BMF.sub)){ sel.value=BMF.sub; store.set("bmGroup",BMF.sub); } bmSave(); BMF.lim=0; bmSel=null; renderBM(); });
  fill("bmTierS",[[0,"Todos"],...[2,3,4,5,6,7,8].map(t=>[t,`T${t}`])],bmTierSel,v=>{ bmTierSel=+v; });
  fill("bmEnch",[[-1,"Todos"],...[0,1,2,3,4].map(e=>[e,`.${e}`])],BMF.ench,v=>{ BMF.ench=+v; });
  fill("bmBuyC",[["","Todas"],...SHOP_LOCS.map(c=>[c,c])],BMF.buy,v=>{ BMF.buy=v; });
  fill("bmQualS",[[0,"Todas"],...[1,2,3,4,5].map(q=>[q,QNAME[q]])],bmQualSel,v=>{ bmQualSel=+v; });
  { let tmr=null; $("bmFind").addEventListener("input",()=>{ clearTimeout(tmr); tmr=setTimeout(()=>{ BMF.q=$("bmFind").value.trim(); BMF.lim=0; renderBM(); },250); }); }
  sel.addEventListener("change",()=>{ store.set("bmGroup",sel.value); bmSel=null; renderBM(); });
  document.querySelectorAll("[data-bm]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-bm]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); bmMode=b.dataset.bm; renderBM(); }));
  { const fbx=$("bmFocBox"); if(fbx&&!fbx.firstChild){ fbx.append(focBudUI(renderBM,"O foco só aumenta o retorno de recursos ao fabricar. Cada linha mostra quantas receitas o foco do dia cobre.")); } const fx=()=>{ if(fbx) fbx.hidden=!$("bmFocus").checked||bmMode==="flip"; }; $("bmFocus").addEventListener("change",fx); fx(); }
  $("bmFocus").addEventListener("change",renderBM); $("bmAtivo").addEventListener("change",()=>{ store.set("bmAtivo",$("bmAtivo").checked?"1":"0"); renderBM(); });
}
/* barra de carregamento do Mercado Negro (componente compartilhado, acima da faixa de resumo) */
function bmProg(on,done,total,txt){ const a=$("bmStatus"); if(on) lpShow(a,done,total,txt); else lpHide(a); }
async function renderBM(partial){
  const tok=partial?BM_TOK:++BM_TOK;
  { const fbx=$("bmFocBox"); if(fbx){ fbx.hidden=!$("bmFocus").checked||bmMode==="flip"; FOC_UIS.forEach(u=>u._sync()); } }
  if(!BM){ bmProg(true,0,0,"Abrindo o livro do Mercado Negro…"); $("bmNote").textContent=""; try{ BM=await need("bm"); }catch(e){ bmProg(false); $("bmNote").textContent="Não consegui abrir os dados do Mercado Negro."; return; } }
  setupBM(); if(!$("bmAtivo").dataset.init){ $("bmAtivo").dataset.init="1"; try{ $("bmAtivo").checked=store.get("bmAtivo")==="1"; }catch(e){} }
  const FAVON=!!(window.FAV&&FAV.on("mercado")), favs=FAVON?FAV.list("mercado"):[], favSet=new Set(favs.map(f=>f.k));
  const tb=$("bmTable"), note=$("bmNote"), T=FAVON?0:bmTierSel, keys=FAVON?[...new Set(favs.map(f=>f.c&&f.c.key).filter(k=>k&&BM[k]))]:bmSelKeys(), groups=bmSelGroups(keys);
  const lim=groups.length, useG=groups.slice(0,lim), useSet=new Set(useG), more=groups.length>useG.length;
  if(!partial) for(const g of useG) bmStaleCheck(g,T);
  const falta=useG.filter(g=>!BM_LOADED.has(bmLk(g,T)));
  if(!partial&&falta.length){   // busca um tipo por vez e mostra o que já chegou (a API limita pedidos por minuto)
    if(falta.length===useG.length) tb.textContent="";
    for(let i=0;i<falta.length;i++){ const g=falta[i], gn=(BM_GROUPS.find(x=>x[0]===g)||[0,g])[1];
      if(i){ await new Promise(f=>setTimeout(f,120)); if(tok!==BM_TOK) return; }
      bmProg(true,useG.length-falta.length+i,useG.length,falta.length>1?`Consultando as ordens do Mercado Negro: ${gn.toLowerCase()}`:"Consultando as ordens do Mercado Negro…");
      const ok=await ensureBM(g,T); if(tok!==BM_TOK) return;
      if(!ok){ bmProg(false); note.textContent="Não consegui consultar o Mercado Negro agora. Tente de novo em um minuto."; return; }
      bmProg(true,useG.length-falta.length+i+1,useG.length,falta.length>1?`Consultando as ordens do Mercado Negro: ${gn.toLowerCase()}`:"Consultando as ordens do Mercado Negro…");
      if(i<falta.length-1){ await renderBM(true); if(tok!==BM_TOK) return; } }
  }
  const rows=[]; for(const k of keys){ if(!useSet.has(BM[k][1])) continue; for(let t=2;t<=8;t++){ if(T&&t!==T) continue; if(t<4&&BM[k][4]) continue; for(let e=0;e<=(t<4?0:4);e++){ if(!FAVON&&BMF.ench>=0&&e!==BMF.ench) continue; for(let q=1;q<=5;q++){ if(!FAVON&&bmQualSel&&q!==bmQualSel) continue; if(FAVON&&!favSet.has(bmId(k,t,e)+"|"+q)) continue; if(!bmHas(bmId(k,t,e),q)) continue; if(!FAVON&&$("bmAtivo").checked&&(bmRec(bmId(k,t,e),q)["Black Market"][2]||0)>BM_ATIVO_H) continue; const m=bmModel(k,t,e,$("bmFocus").checked,q); if(m.bm) rows.push(m); } } } }
  const val=m=>bmMode==="flip"?m.flip:m.craft, base=m=>bmMode==="flip"?(m.buy&&m.buy.p):m.cost, pct=m=>{ const b=base(m), v=val(m); return b>0&&v!=null?v/b*100:-Infinity; };
  /* ordem: primeiro pela porcentagem de lucro, depois pelo valor em prata (o cabeçalho de cada coluna inverte a prioridade) */
  const cmp=bmSort==="val"?(a,b)=>val(b)-val(a)||pct(b)-pct(a):(a,b)=>pct(b)-pct(a)||val(b)-val(a);
  let ok=rows.filter(m=>val(m)!=null).sort(cmp);
  const shown=ok.slice(0,100);
  if(BM_GEN!==DATA.geradoEm){ BM_BASE=BM_CUR; BM_CUR={}; BM_GEN=DATA.geradoEm; }
  tb.textContent=""; const hr=tb.createTHead().insertRow();
  (bmMode==="flip"?["Peça","Tier","Qualidade","Pedido","Média 7 dias","Mais barato em","Preço lá","Lucro %","Lucro por peça"]:["Peça","Tier","Qualidade","Pedido","Média 7 dias","Custo","Lucro %","Lucro por peça","Bônus em"]).concat([""]).forEach(h=>{ const th=el("th",{text:h,...(BM_HT[h]?{title:BM_HT[h]}:{})}), pc=h==="Lucro %", vl=h==="Lucro por peça";
    if(pc||vl){ th.className="bm-sort"; th.tabIndex=0; th.setAttribute("role","button"); const on=pc===(bmSort==="pct"); th.setAttribute("aria-sort",on?"descending":"none"); th.append(on?" ▼":""); th.title=pc?"Ordenar primeiro pela porcentagem de lucro (e depois pelo valor)":"Ordenar primeiro pelo valor do lucro (e depois pela porcentagem)";
      const go=()=>{ bmSort=pc?"pct":"val"; renderBM(); }; th.addEventListener("click",go); th.addEventListener("keydown",ev=>{ if(ev.key==="Enter"||ev.key===" "){ ev.preventDefault(); go(); } }); }
    hr.append(th); });
  for(const m of shown){ const body=tb.createTBody(); const tr=document.createElement("tr"); body.append(tr); tr.className="clickrow bm-row "+(val(m)>=0?"is-gain":"is-loss"); tr.tabIndex=0;
    tr.insertCell().append(withIconQ(m.id,m.q,nmKey(m.key,m.name))); tr.insertCell().textContent=`${m.t}.${m.e}`;
    tr.insertCell().append(el("span",{class:"qtag q"+m.q,text:QNAME[m.q]}));
    const c1=tr.insertCell(); c1.className="num"; c1.append(fmt(m.bm.p)," ",el("span",{class:"age"+(m.bm.age>6?" old":""),title:ageTip(m.bm.age),text:ageTxt(m.bm.age)}));
    { const cm=tr.insertCell(); cm.className="num mk-avg bm-avg"; { const A=BM_A[m.id+"|"+m.q+"|Black Market"]||{}; cm.title=`Média dos pedidos de compra do Mercado Negro registrados pelo Albion Overlay nos últimos 7 dias (${A.n7||0} registro${A.n7===1?"":"s"}). Não é média de vendas fechadas.`; } cm.textContent=avgTxt(bmAvgOf(m.id,m.q)); }
    if(bmMode==="flip"){ tr.insertCell().textContent=m.buy.c+(m.buy.q>m.q?` (${QNAME[m.buy.q]})`:""); const cb=tr.insertCell(); cb.className="num"; cb.append(fmt(m.buy.p)," ",el("span",{class:"age"+(m.buy.age>6?" old":""),title:ageTip(m.buy.age),text:ageTxt(m.buy.age)})); }
    else { const c2=tr.insertCell(); c2.className="num"; c2.textContent=fmt(m.cost); }
    const v=val(m), pc=pct(m), cp=tr.insertCell(); cp.className="num bm-pct "+(v>=0?"gain":"loss"); cp.textContent=pc===-Infinity?"—":`${v>=0?"+":""}${dec(pc)}%`;
    const c3=tr.insertCell(); c3.className="num bm-profit "+(v>=0?"gain":"loss"); c3.textContent=sgn(v); { const key=m.id+"|"+m.q+"|"+bmMode, old=BM_BASE[key]; BM_CUR[key]=v; if(old!=null&&Math.abs(v-old)>=1){ const up=v>old; c3.prepend(el("span",{class:"bm-chg "+(up?"up":"dn"),title:`${up?"Subiu":"Caiu"} desde a última atualização: o lucro era ${sgn(old)}`,text:up?"▲":"▼"})," "); } }
    if(bmMode!=="flip"){ const c4=tr.insertCell(); c4.className="small muted"; c4.textContent=`${m.city}${m.thin?", pouca oferta":""}`;
      if(m.focus&&m.fc>0){ const nR=Math.floor(focBud()/m.fc), fm=el("span",{class:"wk-fm"+(nR>0?" full":" none"),title:`Cada receita gasta ${fmt(m.fc)} de foco; com ${fmt(focBud())} por dia o foco cobre ${nR} receita${nR===1?"":"s"}`}); fm.append(el("span",{class:"wk-fl",text:"Foco"}),el("b",{text:nR>0?`cobre ${fmt(nR)} receita${nR===1?"":"s"}`:"não cobre 1 receita"})); c4.append(el("br"),fm); } }
    tr.dataset.id=m.id; tr.dataset.q=String(m.q); tr.dataset.fav=m.id+"|"+m.q; tr.dataset.fctx=JSON.stringify({key:m.key,t:m.t,e:m.e,q:m.q});
    const cg=tr.insertCell(); const gb=el("button",{type:"button",class:"btn mn-craft",title:"Abrir no Craft: fabricar este item e vender para o Mercado Negro",text:"Craft ➜"}); gb.addEventListener("click",ev=>{ ev.stopPropagation(); ofFromBM(BM[m.key][1],m); }); gb.addEventListener("keydown",ev=>ev.stopPropagation()); cg.append(gb,bagBtn(()=>[{id:m.id,q:1,nm:`${nmKey(m.key,m.name)} ${m.t}.${m.e}`,sell:m.bm.p,sellC:"Black Market",buy:bmMode==="flip"?m.buyC:m.cost,buyC:bmMode==="flip"?(m.buy&&m.buy.c):m.city}],"Pôr na bag para vender no Mercado Negro"));
    const dr=document.createElement("tr"); body.append(dr); dr.className="of-drow"; dr.hidden=true; const dc=document.createElement("td"); dr.append(dc); dc.colSpan=10;
    const toggle=()=>{ const open=dr.hidden; dr.hidden=!open; tr.classList.toggle("open",open); tr.setAttribute("aria-expanded",String(open)); if(open){ dc.textContent=""; try{ dc.append(bmPanel(m)); }catch(e){ dc.append(el("p",{class:"small loss",text:"Não consegui montar os detalhes: "+(e&&e.message||e)})); } setTimeout(()=>{ try{ const r=dr.getBoundingClientRect(); if(r.bottom>innerHeight-8) dr.scrollIntoView({block:"nearest",behavior:RM?"auto":"smooth"}); }catch(e){} },60); } };
    tr.setAttribute("aria-expanded","false"); tr.addEventListener("click",ev=>{ if(ev.target.closest("a,button")) return; toggle(); }); tr.addEventListener("keydown",ev=>{ if(ev.target===tr&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); toggle(); } }); }
  { const w=$("bmWrap"); if(w) w.style.setProperty("--tblw",(w.clientWidth-8)+"px"); }
  const q0=BMF.q.trim(), gname=q0.length>=2?`"${q0}"`:BMF.sub?((BM_GROUPS.find(x=>x[0]===BMF.sub)||[0,BMF.sub])[1]):BMF.cat?(BM_CATS.find(x=>x[0]===BMF.cat)||[0,""])[1]:"todas as mercadorias", pos=ok.filter(m=>val(m)>0).length;
  const qtxt=(bmQualSel?` na qualidade ${QNAME[bmQualSel].toLowerCase()}`:"")+(BMF.ench>=0?`, encantamento .${BMF.ench}`:"");
  note.textContent = !keys.length ? "Nenhuma peça com esse filtro."
    : !rows.length ? `Nenhuma ordem do Mercado Negro registrada para ${gname.toLowerCase()}${qtxt} nos últimos 3 dias (só aparecem peças que alguém com o Albion Overlay viu no jogo).${more?` Foram consultados ${useG.length} de ${groups.length} tipos: use "Consultar mais".`:""}`
    : `${rows.length} ordens registradas de ${gname.toLowerCase()}${qtxt}; ${pos} dão lucro ${bmMode==="flip"?"comprando na cidade mais barata e levando para Caerleon":"fabricando"+($("bmFocus").checked?" com foco":" sem foco")}.${more?` Foram consultados ${useG.length} de ${groups.length} tipos: use "Consultar mais" para os outros.`:""}${ok.length>100?` Mostrando as 100 de maior lucro de ${fmt(ok.length)} registros: não são todos.`:(bmSort==="val"?" Ordenado pelo valor do lucro e, se empatar, pela porcentagem.":" Ordenado pela porcentagem de lucro e, se empatar, pelo valor.")} Clique numa linha para ver a conta e as médias.`;
  if(FAVON) note.textContent=rows.length?`Só os seus favoritos (${rows.length} ordens do Mercado Negro): os filtros de seleção não valem aqui. ${pos} dão lucro ${bmMode==="flip"?"comprando na cidade mais barata e levando para Caerleon":"fabricando"+($("bmFocus").checked?" com foco":" sem foco")}. Clique numa linha para ver a conta e as médias.`:(favs.length?"Nenhuma ordem do Mercado Negro para os seus favoritos nos últimos 3 dias.":"Nenhum favorito aqui ainda: marque a estrela de uma linha.");
  if(!partial) bmProg(false);
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
const bmAvgOf=(id,q)=>{ const a=BM_A[id+"|"+q+"|Black Market"]; return a&&a.a7?a.a7:null; };
const avgTxt=v=>v===undefined?"…":v?fmt(Math.round(v)):"—";
const volTxt=v=>v==null?"…":v<0?"—":v===0?"0":v<1?"menos de 1":v<10?dec(v):fmt(v);
async function bmVolumes(){}   // o Supabase não registra vendas fechadas: não há "vendas por dia"
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
  { const A=BM_A[m.id+"|"+m.q+"|Black Market"]||{}, hist=el("div",{class:"hist"}), hh=el("div",{class:"hist-h"}); hh.append(el("span",{text:"Médias do que o Mercado Negro pediu"}));
    const lin=(n,a,c)=>`${n}: ${a?fmt(a)+` (${c} registro${c===1?"":"s"})`:"sem registro"}`;
    hist.append(hh,el("p",{class:"small",text:lin("7 dias",A.a7,A.n7||0)+"  ·  "+lin("30 dias",A.a30,A.n30||0)}),el("p",{class:"tiny muted",text:"Média dos pedidos de compra registrados por jogadores com o Albion Overlay (não é média de vendas fechadas); fica mais precisa conforme os dias de coleta passam."})); left.append(hist); }
  const card=(cls,title,lines,tot)=>{ const c=el("div",{class:"of-xcard "+cls}); c.append(el("h4",{class:"of-xh",text:title})); for(const [k,v,cc] of lines){ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{class:cc||"",text:v})); c.append(l); } if(tot){ const l=el("div",{class:"of-xline of-xtot"}); l.append(el("span",{text:tot[0]}),el("b",{text:tot[1]})); c.append(l); } return c; };
  const tax=st.prem?4:8, bruto=m.bm.p, taxV=bruto-m.net;
  const crafting=bmMode!=="flip"&&m.cost!=null&&m.craft!=null, flipping=bmMode==="flip"&&m.flip!=null;
  if(crafting) right.append(card("cost","Custos detalhados (−)",[["Matérias primas",fmt(m.res)],[`Retorno de recursos (${Math.round(m.rr*100)}%)`,"−"+fmt(m.res*m.rr)],...(m.art>0?[["Artefato",fmt(m.art)]]:[]),["Taxa da estação",fmt(m.fee)]],["Custo para fabricar",fmt(m.cost)]));
  else if(flipping) right.append(card("cost","Custos detalhados (−)",[[`Compra em ${m.buy.c}`,fmt(m.buyC)]],["Custo da compra",fmt(m.buyC)]));
  const lucro=bmMode==="flip"?m.flip:m.craft;
  const lines=[["Pedido de compra atual",fmt(bruto)],[`Taxa de venda (${tax}%${st.prem?" Premium":""})`,"−"+fmt(taxV)],["Líquido da venda",fmt(m.net)]];
  if(crafting&&bmMode!=="flip") lines.push(["Cidade com bônus",m.city],["Foco gasto",m.focus?fmt(m.fc):"desligado"]); if(m.focus&&m.fc>0) lines.push([`Receitas que o foco cobre (${fmt(focBud())}/dia)`,fmt(Math.floor(focBud()/m.fc))]);
  { const rc=card(lucro!=null&&lucro<0?"res neg":"res",lucro!=null&&lucro<0?"Resultado (−)":"Resultado (+)",lines,[bmMode==="flip"?"Lucro revendendo":"Lucro fabricando",lucro==null?"—":sgn(lucro)]); right.append(rc); }
  d.append(left,right); return d;
}

/* ================= trabalhadores ================= */
let JOURNALS = null;                // data/journals.json: tipo: {tier: [fama, quantidade base, prata do vazio, saque | prata]}
const WK = [["ORE","Minerador","minerando","minerio"],["FISHING","Pescador","pescando","pesca"],["FIBER","Colhedor de fibra","colhendo fibra","fibra"],["HIDE","Esfolador","esfolando","pelego"],["WOOD","Lenhador","cortando madeira","madeira"],["STONE","Pedreiro","quebrando pedra","pedra"],
  ["WARRIOR","Ferreiro","fabricando placa e armas de guerreiro",null],["HUNTER","Flecheiro","fabricando couro e armas de caçador",null],["MAGE","Imbuidor","fabricando pano e cajados",null],["TOOLMAKER","Funileiro","fabricando ferramentas",null],["MERCENARY","Mercenário","matando monstros",null]];
let WK_SHOW=20, WK_LOADED=false, WK_LOADING=null, wkTierSel=0;
/* felicidade: a barra do trabalhador tem 100 pontos por segmento e (tier + 1) segmentos (T8: 900).
   Cheia rende 150%; o rendimento cresce em linha com a felicidade. O % que o jogo mostra, se digitado, manda. */
const hapMax = t => 105*t-5;   // felicidade de uma casa mobiliada no tier do trabalhador (T8 = 835, T7 = 730, T6 = 625...), tabela da comunidade
const wkHap = () => { const v=+(store.get("wkHap")||""); return v>0?v:null; };
const wkPct = () => { const v=+(store.get("wkPct")||""); return v>0?v:null; };
/* rendimento do diário de tier jt com felicidade h: o jogo pede 100 de felicidade por tier do diário. Abaixo disso rende h ÷ (100 × jt);
   acima rende 100% + 0,5% por ponto de sobra, no máximo 150% (wiki oficial do Laborer e tabela albiononlinegrind). Conferido: T8 com 835 e diário T8 = 117,5%; diário T7 = 150%; T7 com 730 e diário T8 = 91,25%. */
const wkYield = (jt,wt) => { if(wkPct()) return wkPct()/100; const h=wkHap()??hapMax(wt), need=100*jt; return h>=need ? 1+Math.min(0.5,(h-need)*0.005) : h/need; };
const lootKey = id => id;
const lootApi = id => { const m=id.match(/_LEVEL(\d)$/); return m?`${id}@${m[1]}`:id; };
function ensureWK(){
  if(WK_LOADED) return Promise.resolve(true); if(WK_LOADING) return WK_LOADING;
  const ids=new Set();
  for(const [ty] of WK) for(let t=4;t<=8;t++){ ids.add(`T${t}_JOURNAL_${ty}_EMPTY`); ids.add(`T${t}_JOURNAL_${ty}_FULL`); const l=JOURNALS[ty][t][3]; if(Array.isArray(l)) for(const [iid] of l) if(!DATA.itens[iid]) ids.add(lootApi(iid)); }
  WK_LOADING=fetchPaced([...ids],DATA.itens,[...CITIES,"Caerleon"],"wkStatus","Consultando os diários").then(()=>{WK_LOADED=true; return true;}).catch(()=>false).finally(()=>{WK_LOADING=null;});
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
/* Trabalhadores: o lucro é só o valor do diário cheio contra o valor do que o trabalhador devolve (vendido, já sem a taxa). Nada de refino nem craft aqui. */
const wkList=()=>{ try{ const a=JSON.parse(store.get("wkList")||"[]"); return Array.isArray(a)?a.filter(x=>x&&WK.some(w=>w[0]===x.ty)&&x.t>=4&&x.t<=8&&x.n>=1):[]; }catch(e){ return []; } };
const wkSave=a=>store.set("wkList",JSON.stringify(a));
const wkYieldW=(w,jt)=>{ if(w.pct>0) return w.pct/100; const h=w.h>0?w.h:hapMax(w.t), need=100*jt; return h>=need?1+Math.min(0.5,(h-need)*0.005):h/need; };
function wkModelW(w,jt){
  const ty=w.ty, j=JOURNALS[ty]&&JOURNALS[ty][jt]; if(!j) return null;
  const yld=wkYieldW(w,jt), tax=taxOf(), items=[]; let valor=null, thin=false;
  const empty=typical(`T${jt}_JOURNAL_${ty}_EMPTY`,0), full=typical(`T${jt}_JOURNAL_${ty}_FULL`,0), bc=wkCost(`T${jt}_JOURNAL_${ty}_FULL`);
  if(Array.isArray(j[3])){ let wAll=0, sw=0, sv=0; for(const [iid,wt] of j[3]) wAll+=wt;
    for(const [iid,wt,q] of j[3]){ const p=typical(lootKey(iid),0), qtd=j[1]*yld*wt/wAll*q; items.push({iid,qtd,p:p?p.p:null,v:p?qtd*p.p*(1-tax):null}); if(p){ sw+=wt; sv+=qtd*p.p*(1-tax); } }
    if(sw>=wAll*0.8){ valor=sv*(wAll/sw); thin=sw<wAll*0.97; items.sort((a,b)=>(b.v||0)-(a.v||0)); } }
  else valor=j[3]*yld;
  return {w,ty,t:jt,yld,items,valor,thin,empty,full,bc,fame:j[0],base:j[1],silver:!Array.isArray(j[3]),lucro:valor!=null&&bc?valor-bc.p:null,pct:valor!=null&&bc&&bc.p>0?(valor-bc.p)/bc.p*100:null};
}
/* usado por "Pelo que você já faz" */
function wkModel(ty,t,wt=t){ const m=wkModelW({ty,t:wt,h:wkHap()||0,pct:wkPct()||0},t); if(!m) return null; return {ty,t,fame:m.fame,empty:m.empty,full:m.full,buyFull:m.lucro,fill:m.full&&m.empty?m.full.p*(1-taxOf())-m.empty.p:null}; }
function wkRefresh(){
  const L=wkList(), box=$("wkChips"); box.textContent="";
  if(!L.length) box.append(el("p",{class:"small muted",text:"Nenhum trabalhador adicionado. Escolha o tipo, o tier e a felicidade da casa dele, a quantidade, e clique em Adicionar."}));
  L.forEach((w,i)=>{ const c=el("span",{class:"wk-chip"}); const nm=WK.find(x=>x[0]===w.ty)[1]; c.append(el("b",{text:`${nm} T${w.t}`}),el("span",{class:"muted",text:w.pct>0?` · rende ${w.pct}%`:` · felicidade ${w.h>0?w.h:hapMax(w.t)}`}),el("b",{class:"wk-x",text:` ×${w.n}`}));
    const q=el("input",{type:"number",min:"1",max:"99",value:String(w.n),"aria-label":`Quantidade de ${nm} T${w.t}`}); q.addEventListener("change",()=>{ const a=wkList(); a[i].n=Math.max(1,Math.min(99,Math.round(+q.value||1))); wkSave(a); renderWK(); });
    const x=el("button",{type:"button",class:"wk-del",title:"Remover este trabalhador","aria-label":"Remover",text:"×"}); x.addEventListener("click",()=>{ const a=wkList(); a.splice(i,1); wkSave(a); renderWK(); }); c.append(q,x); box.append(c); });
}
function setupWK(){
  const ty=$("wkAddTy"); if(ty.children.length) return;
  WK.filter(w=>w[0]!=="MERCENARY"&&w[0]!=="TOOLMAKER"||true).forEach(w=>ty.append(el("option",{value:w[0],text:w[1]})));
  const ts=$("wkAddT"); [4,5,6,7,8].forEach(t=>ts.append(el("option",{value:String(t),text:`T${t}`}))); ts.value="8";
  const upd=()=>{ $("wkAddH").placeholder=String(hapMax(+ts.value)); }; ts.addEventListener("change",upd); upd();
  $("wkAddB").addEventListener("click",()=>{ const a=wkList(), w={ty:ty.value,t:+ts.value,h:Math.max(0,Math.round(+$("wkAddH").value||0)),pct:Math.max(0,Math.round(+$("wkAddP").value||0)),n:Math.max(1,Math.min(99,Math.round(+$("wkAddN").value||1)))};
    const k=a.find(x=>x.ty===w.ty&&x.t===w.t&&x.h===w.h&&x.pct===w.pct); if(k) k.n=Math.min(99,k.n+w.n); else a.push(w); wkSave(a); renderWK(); });
  const bs=$("wkBuy"); bs.querySelectorAll("button").forEach(b=>{ b.setAttribute("aria-pressed",String(b.dataset.m===wkBuyMode())); b.addEventListener("click",()=>{ store.set("wkBuy",b.dataset.m); bs.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); renderWK(); }); });
  $("wkPrem").querySelectorAll("button").forEach(b=>{ b.setAttribute("aria-pressed",String(+b.dataset.v===+st.prem)); b.addEventListener("click",()=>{ renderWK(); }); });
}
const wkItemNome=iid=>{ const m=/^T(\d)_(.+?)(?:_LEVEL(\d))?$/.exec(iid); if(!m) return iid; const R={FIBER:"Fibra",ORE:"Minério",HIDE:"Pelego",WOOD:"Madeira",ROCK:"Pedra"}[m[2]]; const t=`T${m[1]}${m[3]?"."+m[3]:""}`; return R?`${R} ${t}`:`${itemNome(m[2])} ${t}`; };
const wkPcs=(v,d=1)=>v==null?"—":v.toLocaleString("pt-BR",{maximumFractionDigits:d});
async function renderWK(){
  if(!JOURNALS){ try{ JOURNALS=await need("journals"); }catch(e){ $("wkStatus").textContent="Não consegui abrir os dados dos diários."; return; } }
  setupWK(); wkRefresh(); const tb=$("wkTable"); const L=wkList();
  if(!L.length){ tb.textContent=""; return; }
  if(!WK_LOADED){ tb.textContent=""; $("wkStatus").dataset.base=$("wkStatus").dataset.base||$("wkStatus").textContent; $("wkStatus").textContent="Consultando os preços dos diários…"; const ok=await ensureWK(); $("wkStatus").textContent=$("wkStatus").dataset.base; if(!ok){ $("wkStatus").textContent="Não consegui consultar os diários agora."; return; } }
  { const wp=tb.parentNode; if(wp) wp.style.setProperty("--tblw",Math.max(560,wp.clientWidth-8)+"px"); }
  tb.textContent=""; const hr=tb.createTHead().insertRow();
  ["Trabalhador e diário","Diário cheio (preço)","Rende","O que volta (por diário)","Valor do que volta","Lucro","Lucro %",""].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(), rows=[];
  for(const w of L) for(let jt=4;jt<=w.t;jt++){ const m=wkModelW(w,jt); if(m) rows.push(m); }
  rows.sort((a,b)=>(b.lucro==null?-Infinity:b.lucro*b.w.n)-(a.lucro==null?-Infinity:a.lucro*a.w.n));
  const wkKey=m=>`${m.ty}|T${m.w.t}|T${m.t}|${m.w.n}`, FAVON=!!(window.FAV&&FAV.on("trab"));
  if(FAVON){ const kept=rows.filter(m=>FAV.has("trab",wkKey(m))); rows.length=0; rows.push(...kept); }
  const cls=v=>v==null?"":v>=0?"gain":"loss", pc=v=>v==null?"—":(v>=0?"+":"")+dec(v)+"%";
  for(const m of rows.slice(0,FAVON?rows.length:WK_SHOW)){ const w=m.w, N=w.n, nmW=WK.find(x=>x[0]===m.ty)[1], tr=body.insertRow(); tr.dataset.fav=wkKey(m);
    tr.insertCell().append(withIcon(`T${m.t}_JOURNAL_${m.ty}_FULL`,`${nmW} T${w.t}${N>1?` ×${N}`:""}: diário T${m.t}`));
    { const c=tr.insertCell(); c.className="small"; if(m.bc){ c.append(el("b",{text:fmt(Math.round(m.bc.p*N))})," ",el("span",{class:"muted",text:m.bc.c})); if(N>1) c.append(el("br"),el("small",{class:"muted",text:`${fmt(Math.round(m.bc.p))} cada`})); } else c.textContent="—"; }
    { const c=tr.insertCell(); c.className="num"; c.textContent=Math.round(m.yld*100)+"%"; c.title=`Este trabalhador T${w.t} com ${w.pct>0?`rendimento informado de ${w.pct}%`:`felicidade ${w.h>0?w.h:hapMax(w.t)}`} rende ${Math.round(m.yld*100)}% num diário T${m.t}`; }
    { const c=tr.insertCell(); c.className="wk-ret"; if(m.silver) c.append(el("span",{class:"muted small",text:"prata dos peixes"})); else { m.items.slice(0,6).forEach(it=>{ const sp=el("span",{class:"wk-ri",title:`${wkPcs(it.qtd*N,2)} ${itemNome(it.iid.replace(/^T\d+_/,""))}${it.p?` a ${fmt(it.p)}`:" (sem preço)"}`}); const im=iconImg(lootApi(it.iid),32,1); sp.append(im,el("b",{text:wkPcs(it.qtd*N,1)})); c.append(sp); }); if(m.items.length>6) c.append(el("span",{class:"muted small",text:`+${m.items.length-6}`})); } }
    { const c=tr.insertCell(); c.className="num"; c.textContent=m.valor!=null?fmt(Math.round(m.valor*N)):"—"; c.title="Venda do que volta, já sem a taxa de venda"+(m.thin?" (alguns itens raros sem preço)":""); }
    { const c=tr.insertCell(); c.className="num bm-profit "+cls(m.lucro); c.textContent=m.lucro!=null?sgn(m.lucro*N):"—"; c.title=m.lucro!=null?`${sgn(m.lucro)} por diário`:""; }
    { const c=tr.insertCell(); c.className="num "+cls(m.pct); c.textContent=pc(m.pct); }
    const ac=tr.insertCell(); ac.className="wk-act";
    const dr=body.insertRow(); dr.hidden=true; dr.className="of-drow wk-det"; const dc=dr.insertCell(); dc.colSpan=8;
    { const d=el("div",{class:"of-xp"}), left=el("div",{class:"of-xl"}), tax=taxOf();
      left.append(el("h4",{class:"of-xh",text:"Preços & quantidades"}));
      const hd2=el("div",{class:"of-xr of-xhd"}); ["Stats","Item","Valor","Tempo","Cidade","Qtd"].forEach(x=>hd2.append(el("span",{text:x}))); left.append(hd2);
      const row=(kind,lab,id,nmText,sub,val,tm,city,qty)=>{ const r=el("div",{class:"of-xr "+kind}); r.append(el("span",{class:"of-pill "+kind,text:lab}));
        const it_=el("span",{class:"of-xi"}); it_.append(el("i",{class:"of-dot"+(kind==="buy"?" red":"")}),iconImg(id,34,1)); const nm=el("span",{class:"of-xn"}); nm.append(el("b",{text:nmText})); if(sub) nm.append(el("small",{text:sub})); it_.append(nm); r.append(it_);
        r.append(el("b",{class:"of-xv",text:val!=null?fmt(Math.round(val)):"—"}),el("span",{class:"of-xt"},tm&&typeof ageSpan==="function"?(ageSpan(tm)||"—"):"—"),el("span",{class:"of-xc",text:city||"—"}),el("span",{class:"of-xq",text:fmt(Math.round(qty*100)/100)+"x"})); return r; };
      const ord=wkBuyMode()==="ordem";
      if(m.bc) left.append(row("buy",ord?"ORDEM COMPRA":"COMPRA INST",`T${m.t}_JOURNAL_${m.ty}_FULL`,`Diário cheio T${m.t}`,`${nmW}${ord?" · mais 2,5% de taxa da ordem":""}`,m.bc.p,0,m.bc.c,N));
      if(m.silver) left.append(row("sale","VALOR DO JOGO",`T${m.t}_JOURNAL_${m.ty}_FULL`,"Peixes e prata do saque","valor fixo do jogo",m.valor/N*0+m.valor,0,"—",N));
      else for(const it of m.items) left.append(row("sale","PREÇO TÍPICO",lootApi(it.iid),wkItemNome(it.iid),"preço típico nas cidades",it.p,0,"cidades",it.qtd*N));
      const right=el("div",{class:"of-xs"});
      const card=(cls,title,lines,tot)=>{ const c=el("div",{class:"of-xcard "+cls}); c.append(el("h4",{class:"of-xh",text:title})); for(const [k,v,cc] of lines){ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{class:cc||"",text:v})); c.append(l); } if(tot){ const l=el("div",{class:"of-xline of-xtot"}); l.append(el("span",{text:tot[0]}),el("b",{text:tot[1]})); c.append(l); } return c; };
      const bruto=m.valor!=null?(m.silver?m.valor:m.valor/(1-tax)):null, cp=m.bc?m.bc.p:null;
      right.append(card("cost","Custos detalhados (−)",[["Diário cheio"+(N>1?` ×${N}`:""),cp!=null?fmt(Math.round(cp*N)):"—"]],["Custo total",cp!=null?fmt(Math.round(cp*N)):"—"]));
      right.append(card("res","Resultado (+)",[["Rendimento do trabalhador",Math.round(m.yld*100)+"%"],["Valor bruto do que volta",bruto!=null?fmt(Math.round(bruto*N)):"—","gain"],["Taxa de venda"+(st.prem?" (Premium)":""),m.silver?"—":bruto!=null?"−"+fmt(Math.round(bruto*tax*N)):"—"],["Líquido da venda",m.valor!=null?fmt(Math.round(m.valor*N)):"—"],["Lucro por diário",m.lucro!=null?sgn(m.lucro):"—",m.lucro>=0?"gain":"loss"],["Diário vazio que volta (não entra na conta)",m.empty?fmt(Math.round(m.empty.p*N)):"—"]],["Lucro total",m.lucro!=null?sgn(m.lucro*N):"—"]));
      { const c=el("div",{class:"of-xcard foc"}); c.append(el("h4",{class:"of-xh",text:`Rendimento do trabalhador T${w.t}`}));
        for(let jt=4;jt<=w.t;jt++){ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:`Diário T${jt} (pede ${fmt(100*jt)} de felicidade)`}),el("b",{class:jt===m.t?"gain":"",text:Math.round(wkYieldW(w,jt)*100)+"%"})); c.append(l); }
        c.append(el("p",{class:"tiny muted",text:`A casa precisa de 100 de felicidade por tier do diário. Com menos, rende felicidade ÷ (100 × tier); com mais, 100% mais 0,5% por ponto de sobra, até 150%. Sua felicidade: ${w.pct>0?"não informada (usando os "+w.pct+"% do jogo)":(w.h>0?w.h:hapMax(w.t))+(w.h>0?"":" (casa T"+w.t+" mobiliada)")}.`})); right.append(c); }
      d.append(left,right); dc.append(d); }
    const db=el("button",{type:"button",class:"btn mn-craft",text:"Detalhes ▾","aria-expanded":"false"}); db.addEventListener("click",()=>{ dr.hidden=!dr.hidden; db.textContent=dr.hidden?"Detalhes ▾":"Detalhes ▴"; db.setAttribute("aria-expanded",String(!dr.hidden)); }); ac.append(db); }
  { let mb=$("wkMore"); if(!mb){ mb=el("button",{type:"button",id:"wkMore",class:"btn mn-craft"}); tb.parentNode.after(mb); mb.addEventListener("click",()=>{ WK_SHOW+=30; renderWK(); }); } mb.hidden=rows.length<=WK_SHOW; mb.textContent=`Mostrar mais (${WK_SHOW} de ${rows.length})`; }
  renderWKMine();
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.03,clearProps:"opacity,transform"});
}
function renderWKMine(){
  const box=$("wkMine"); box.textContent=""; const items=[];
  for(const [ty,nm,how,gk] of WK){ if(!gk) continue; const g=(PF.coleta||{})[gk]; if(!g||!(g.tier>=4)) continue; const m=wkModel(ty,Math.min(8,g.tier)); if(!m||m.fill==null) continue;
    items.push(recItem(`Diário de ${nm.toLowerCase()} T${m.t}`,[`Vazio a ${fmt(m.empty.p)}, cheio a ${fmt(m.full.p)}: ${sgn(m.fill)} por diário que você encher ${how}`,`Enche com ${fmt(m.fame)} de fama. ${m.buyFull!=null?(m.buyFull>0?`Com trabalhador a ${Math.round(wkYield(m.t,Math.max(m.t,wkTierSel))*100)}%, entregar rende mais: ${sgn(m.buyFull)} sobre o preço do cheio.`:`Vender o cheio rende mais que entregar ao trabalhador.`):""}`])); }
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

