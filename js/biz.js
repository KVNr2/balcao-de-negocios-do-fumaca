/* ================= mercado negro ================= */
let BM = null;                      // data/bm.json: chave: [nome, grupo, cidade com bônus, receita "P20L12", [extra, qtd] | 0, foco T4.0]
const BM_RES = {M:"METALBAR",P:"PLANKS",L:"LEATHER",C:"CLOTH"};
const BM_RES_PT = {M:"Barra",P:"Tábua",L:"Couro",C:"Tecido"};
const BM_GROUPS = [...LINES.map(([k,n])=>[k,n]),["a_placa","Armaduras de placa"],["a_couro","Armaduras de couro"],["a_pano","Armaduras de pano"],["mao","Mão secundária"]];
const BMP = {};                     // id: {cidade: [venda, compra, idade em horas da compra, idade da venda]}
const BMQ = {};                     // qualidades 2 a 5, mesmo formato do BMP: id: {qualidade: {cidade: [venda, compra, idade da compra, idade da venda]}} (a qualidade 1 fica no BMP)
const BM_VOL = {};                  // id: {qualidade: peças que o Mercado Negro comprou por dia (média dos últimos 7 dias)}, ou -1 se a consulta falhou
const BM_LOADED = new Set(); let bmMode="craft", bmTierSel=0, bmQualSel=0, bmSel=null, PLANKS_LOADED=false;
const ageH = d => d&&!d.startsWith("0001") ? (Date.now()-Date.parse(d+"Z"))/3600e3 : Infinity;
/* allQ: traz as qualidades 1 a 5 (a 1 vai para o BMP, as outras para o BMQ); sem allQ só a qualidade 1, como as outras páginas usam */
async function bmFetch(ids, locs, allQ=false){
  const loc=locs.join(",").replace(/ /g,"%20");
  for(let i=0;i<ids.length;i+=40){
    const j=await apiJSON(`${HOST}/api/v2/stats/prices/${ids.slice(i,i+40).join(",")}.json?locations=${loc}&qualities=${allQ?"1,2,3,4,5":"1"}`);
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
const bmKeys=g=>Object.keys(BM).filter(k=>BM[k][1]===g);
async function ensureBM(g){
  if(BM_LOADED.has(g)) return true;
  const keys=bmKeys(g), gear=[], extra=new Set();
  for(const k of keys) for(let t=4;t<=8;t++){ for(let e=0;e<=4;e++) gear.push(bmId(k,t,e)); if(BM[k][4]) extra.add(`T${t}_${BM[k][4][0]}`); }
  try{
    await bmFetch(gear,["Black Market",...SHOP_LOCS],true);
    if(!PLANKS_LOADED){ const pl=[]; for(let t=4;t<=8;t++) for(let e=0;e<=4;e++) pl.push(`T${t}_PLANKS`+(e?`_LEVEL${e}@${e}`:"")); await fetchIds(pl,DATA.itens); PLANKS_LOADED=true; }
    if(extra.size) await fetchIds([...extra],DATA.itens,[...CITIES,"Caerleon"]);
    BM_LOADED.add(g); return true;
  }catch(e){ return false; }
}
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
  for(const [,c,n] of r[3].matchAll(/([MPLC])(\d+)/g)){ const rid=idOf(t,BM_RES[c],e), p=typical(rid,0); if(!p){ miss=BM_RES_PT[c]; break; } if(p.n<2) thin=true; res+=+n*p.p; cnt+=+n; parts.push({nm:`${BM_RES_PT[c]} T${t}.${e}`,q:+n,p:p.p}); }
  let art=0; if(!miss&&r[4]){ const p=typical(`T${t}_${r[4][0]}`,0); if(!p) miss="artefato"; else { art=p.p*r[4][1]; parts.push({nm:(r[4][0].startsWith("ALCHEMY")?"Ingrediente raro":"Artefato")+` T${t}`,q:r[4][1],p:p.p,art:true}); } }
  const rr=rrr(0.15,focus,st.daily), fee=cnt*IV(t,e)*0.1125*feeVal()/100;
  const cost=miss?null:res*(1-rr)+art+fee;
  const fc=Math.max(1,Math.round(r[5]*FOCUS_CRAFT[t-4][e]/429*Math.pow(0.5,bmFCE(key)/10000)));
  return {key,t,e,q,id,name:r[0],city:r[2],bm,net,buyC,buy,flip:net!=null&&buyC?net-buyC:null,cost,craft:net!=null&&cost!=null?net-cost:null,parts,res,art,fee,rr,fc,thin,miss,focus};
}
function bmGroupDefault(){ const mine=LINES.filter(([k])=>wl(k)>=2).sort((a,b)=>wl(b[0])-wl(a[0])); return mine.length?mine[0][0]:"martelo"; }
function setupBM(){
  const sel=$("bmGroup"); if(sel.options.length) return;
  const mine=new Set(LINES.filter(([k])=>wl(k)>=2).map(([k])=>k));
  const og1=el("optgroup",{label:"Suas armas"}), og2=el("optgroup",{label:"Outras armas"}), og3=el("optgroup",{label:"Armaduras e mão secundária"});
  for(const [k,n] of BM_GROUPS){ const o=el("option",{value:k,text:n}); (k.startsWith("a_")||k==="mao"?og3:mine.has(k)?og1:og2).append(o); }
  [og1,og2,og3].forEach(g=>{ if(g.children.length) sel.append(g); }); sel.value=store.get("bmGroup")||bmGroupDefault();
  const ts=$("bmTier"); ["Todos",4,5,6,7,8].forEach((t,i)=>ts.append(el("button",{type:"button","data-t":String(i?t:0),"aria-pressed":String(i===0),text:i?`T${t}`:t})));
  ts.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ts.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); bmTierSel=+b.dataset.t; renderBM(); });
  const qs=$("bmQual"); ["Todas",1,2,3,4,5].forEach((q,i)=>qs.append(el("button",{type:"button","data-q":String(i?q:0),"aria-pressed":String(i===0),text:i?QNAME[q]:q})));
  qs.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; qs.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); bmQualSel=+b.dataset.q; renderBM(); });
  sel.addEventListener("change",()=>{ store.set("bmGroup",sel.value); bmSel=null; $("bmDetail").hidden=true; renderBM(); });
  document.querySelectorAll("[data-bm]").forEach(b=>b.addEventListener("click",()=>{ document.querySelectorAll("[data-bm]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); bmMode=b.dataset.bm; renderBM(); }));
  $("bmFocus").addEventListener("change",renderBM);
}
async function renderBM(){
  if(!BM){ $("bmNote").textContent="Abrindo o livro do Mercado Negro…"; try{ BM=await need("bm"); }catch(e){ $("bmNote").textContent="Não consegui abrir os dados do Mercado Negro."; return; } }
  setupBM(); const g=$("bmGroup").value, tb=$("bmTable"), note=$("bmNote");
  if(!BM_LOADED.has(g)){ tb.textContent=""; note.textContent="Consultando as ordens do Mercado Negro…"; const ok=await ensureBM(g); if(!ok){ note.textContent="Não consegui consultar o Mercado Negro agora. Tente de novo em um minuto."; return; } if($("bmGroup").value!==g) return; }
  const rows=[]; for(const k of bmKeys(g)) for(let t=4;t<=8;t++){ if(bmTierSel&&t!==bmTierSel) continue; for(let e=0;e<=4;e++) for(let q=1;q<=5;q++){ if(bmQualSel&&q!==bmQualSel) continue; if(!bmHas(bmId(k,t,e),q)) continue; const m=bmModel(k,t,e,$("bmFocus").checked,q); if(m.bm) rows.push(m); } }
  const val=m=>bmMode==="flip"?m.flip:m.craft;
  const ok=rows.filter(m=>val(m)!=null).sort((a,b)=>val(b)-val(a)), shown=ok.slice(0,100);
  tb.textContent=""; const hr=tb.createTHead().insertRow();
  (bmMode==="flip"?["Peça","Tier","Qualidade","O MN paga","Mais barato em","Preço lá","Lucro por peça","O MN compra por dia"]:["Peça","Tier","Qualidade","O MN paga","Custo para fabricar","Lucro por peça","Cidade com bônus","O MN compra por dia"]).concat([""]).forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody();
  for(const m of shown){ const tr=body.insertRow(); tr.className="clickrow"; tr.tabIndex=0;
    tr.insertCell().append(withIconQ(m.id,m.q,nmKey(m.key,m.name))); tr.insertCell().textContent=`${m.t}.${m.e}`;
    tr.insertCell().append(el("span",{class:"qtag q"+m.q,text:QNAME[m.q]}));
    const c1=tr.insertCell(); c1.className="num"; c1.append(fmt(m.bm.p)," ",el("span",{class:"age"+(m.bm.age>6?" old":""),text:m.bm.age<1?"agora":`${Math.round(m.bm.age)}h`}));
    if(bmMode==="flip"){ tr.insertCell().textContent=m.buy.c+(m.buy.q>m.q?` (${QNAME[m.buy.q]})`:""); const cb=tr.insertCell(); cb.className="num"; cb.append(fmt(m.buy.p)," ",el("span",{class:"age"+(m.buy.age>6?" old":""),text:m.buy.age<1?"agora":`${Math.round(m.buy.age)}h`})); }
    else { const c2=tr.insertCell(); c2.className="num"; c2.textContent=fmt(m.cost); }
    const v=val(m), c3=tr.insertCell(); c3.className="num "+(v>=0?"gain":"loss"); c3.textContent=sgn(v);
    if(bmMode!=="flip"){ const c4=tr.insertCell(); c4.className="small muted"; c4.textContent=`${m.city}${m.thin?", pouca oferta":""}`; }
    const cv=tr.insertCell(); cv.className="num vol"; cv.textContent=volTxt(bmVolOf(m.id,m.q)); tr.dataset.id=m.id; tr.dataset.q=String(m.q);
    const cg=tr.insertCell(); const gb=el("button",{type:"button",class:"btn mn-craft",title:"Abrir no Craft: fabricar este item e vender para o Mercado Negro",text:"Craft ➜"}); gb.addEventListener("click",ev=>{ ev.stopPropagation(); ofFromBM(g,m); }); gb.addEventListener("keydown",ev=>ev.stopPropagation()); cg.append(gb);
    const pick=()=>{ bmSel=m; renderBMDetail(); }; tr.addEventListener("click",pick); tr.addEventListener("keydown",ev=>{ if(ev.key==="Enter") pick(); }); }
  const gname=BM_GROUPS.find(x=>x[0]===g)[1], pos=ok.filter(m=>val(m)>0).length;
  const qtxt=bmQualSel?` na qualidade ${QNAME[bmQualSel].toLowerCase()}`:"";
  note.textContent = !rows.length ? `Nenhuma ordem do Mercado Negro para ${gname.toLowerCase()}${qtxt} nos últimos 3 dias.`
    : `${rows.length} ordens de ${gname.toLowerCase()}${qtxt}; ${pos} dão lucro ${bmMode==="flip"?"comprando na cidade mais barata e levando para Caerleon":"fabricando"+($("bmFocus").checked?" com foco":" sem foco")}.${ok.length>100?" Mostrando as 100 melhores.":""} Clique numa linha para ver a conta e o histórico.`;
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.015,clearProps:"opacity,transform"});
  bmVolumes(shown);
}
const volTxt=v=>v==null?"…":v<0?"—":v===0?"0":v<1?"menos de 1":v<10?dec(v):fmt(v);
// Quantas peças o Mercado Negro comprou por dia na última semana (a API não mostra o tamanho das ordens abertas;
// o histórico de vendas dele é o melhor sinal de quanto ele absorve).
async function bmVolumes(shown){
  const ids=[...new Set(shown.map(m=>m.id).filter(id=>BM_VOL[id]==null))];
  for(let i=0;i<ids.length;i+=25){ const part=ids.slice(i,i+25);
    try{ const j=await apiJSON(`${HOST}/api/v2/stats/history/${part.join(",")}.json?locations=Black%20Market&time-scale=24`,360);
      const vol={}; part.forEach(id=>vol[id]={}); const since=Date.now()-7*86400e3;
      for(const x of j){ const v=vol[x.item_id]; if(!v) continue; const q=+x.quality||1; let sum=0; for(const d of (x.data||[])) if(Date.parse(d.timestamp+"Z")>=since) sum+=d.item_count; v[q]=(v[q]||0)+sum/7; }
      part.forEach(id=>BM_VOL[id]=vol[id]);
    }catch(e){ part.forEach(id=>BM_VOL[id]=-1); }
    document.querySelectorAll("#bmTable tbody tr").forEach(tr=>{ const c=tr.querySelector(".vol"); if(c&&tr.dataset.id) c.textContent=volTxt(bmVolOf(tr.dataset.id,+tr.dataset.q||1)); });
  }
}
function renderBMDetail(){
  const m=bmSel, box=$("bmDetail"); if(!m) return; box.hidden=false;
  $("bmTitle").textContent=`${nmKey(m.key,m.name)} ${m.t}.${m.e} · ${QNAME[m.q]}`;
  const L=$("bmLedger"); L.textContent=""; const add=(a,b,cls)=>{ const tr=L.insertRow(); if(cls) tr.className=cls; tr.insertCell().textContent=a; const c=tr.insertCell(); c.className="num"; c.textContent=b; };
  add(`O Mercado Negro paga (qualidade ${QNAME[m.q].toLowerCase()} ou melhor)`,fmt(m.bm.p)); { const vv=bmVolOf(m.id,m.q); if(vv!=null&&vv>=0) add("O Mercado Negro comprou por dia (7 dias)",volTxt(vv)); } add(`Menos a taxa de venda (${st.prem?4:8}%)`,fmt(m.net));
  if(m.cost!=null){ for(const p of m.parts) add(`${p.q} × ${p.nm}`,fmt(p.q*p.p)); add(`Volta ${Math.round(m.rr*100)}% dos recursos em ${m.city}`,"−"+fmt(m.res*m.rr)); add("Taxa da estação",fmt(m.fee));
    const tr=L.insertRow(); tr.className="total"; tr.insertCell().textContent="Lucro fabricando"; const tc=tr.insertCell(); tc.className=m.craft>=0?"gain":"loss"; tc.textContent=sgn(m.craft);
    if(m.focus) add("Custo de foco",fmt(m.fc)); }
  if(m.flip!=null){ add(`Comprando em ${m.buy.c}${m.buy.q>m.q?` (qualidade ${QNAME[m.buy.q].toLowerCase()})`:""} por`,fmt(m.buyC)); const tr=L.insertRow(); tr.className="total"; tr.insertCell().textContent="Lucro revendendo"; const tc=tr.insertCell(); tc.className=m.flip>=0?"gain":"loss"; tc.textContent=sgn(m.flip); }
  drawHistory($("histBm"),$("histBmNote"),m.id,"Black Market",m.q);
  if(window.gsap&&!RM) gsap.from(box,{y:14,opacity:0,duration:.35,clearProps:"opacity,transform"});
  box.scrollIntoView({block:"nearest",behavior:RM?"auto":"smooth"});
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
function wkModel(ty,t){
  const j=JOURNALS[ty]&&JOURNALS[ty][t]; if(!j) return null;
  const empty=typical(`T${t}_JOURNAL_${ty}_EMPTY`,0), full=typical(`T${t}_JOURNAL_${ty}_FULL`,0);
  let yieldV=null, thin=false;
  if(Array.isArray(j[3])){ let sw=0, sv=0, wAll=0; for(const [iid,w,q] of j[3]){ wAll+=w; const p=typical(lootKey(iid),0); if(!p) continue; sw+=w; sv+=w*q*p.p; }
    if(sw>=wAll*0.8){ yieldV=j[1]*(sv/sw)*wkYield(t)*(1-taxOf()); thin=sw<wAll*0.97; } }
  else yieldV=j[3]*wkYield(t);
  return {ty,t,fame:j[0],empty,full,yieldV,thin,buyFull:yieldV!=null&&full?yieldV-full.p:null,fill:full&&empty?full.p*(1-taxOf())-empty.p:null};
}
function setupWK(){
  const ts=$("wkTier"); if(ts.children.length) return;
  const top=Math.max(...Object.values(PF.coleta||{}).map(g=>g.tier||0),6); wkTierSel=Math.min(8,Math.max(4,top));
  [4,5,6,7,8].forEach(t=>ts.append(el("button",{type:"button","data-t":String(t),"aria-pressed":String(t===wkTierSel),text:`T${t}`})));
  ts.addEventListener("click",ev=>{ const b=ev.target.closest("button"); if(!b) return; ts.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); wkTierSel=+b.dataset.t; renderWK(); });
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
  tb.textContent=""; const hr=tb.createTHead().insertRow(); ["Trabalhador","Diário vazio","Diário cheio",`Devolve (${Math.round(wkYield(wkTierSel)*100)}%)`,"Comprar cheio e entregar","Encher e vender","Enche com"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(), t=wkTierSel;
  for(const [ty,nm,how] of WK){ const m=wkModel(ty,t); if(!m) continue; const tr=body.insertRow();
    tr.insertCell().textContent=`${nm} T${t}`;
    for(const v of [m.empty&&m.empty.p,m.full&&m.full.p,m.yieldV]){ const c=tr.insertCell(); c.className="num"; c.textContent=v?fmt(v):"—"; }
    for(const v of [m.buyFull,m.fill]){ const c=tr.insertCell(); c.className="num "+(v==null?"":v>=0?"gain":"loss"); c.textContent=v==null?"—":sgn(v); }
    const c=tr.insertCell(); c.className="small muted"; c.textContent=`${fmt(m.fame)} de fama ${how}${m.thin?"; parte do saque sem preço":""}`; }
  renderWKMine();
  if(window.gsap&&!RM) gsap.from(body.rows,{opacity:0,x:-8,duration:.25,stagger:.03,clearProps:"opacity,transform"});
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
    const card=el("article",{class:"mu"+(hi&&good.length?" mine":"")});
    card.append(el("h3",{},document.createTextNode(nm(m.w)),el("small",{text:LINE_NAME[m.l]||""})));
    const dl=el("dl"); const row=(t,d,cls)=>{ if(!d) return; dl.append(el("dt",{text:t}),el("dd",{class:cls||"",text:d})); };
    row("O perigo",m.ameaca,"threat"); row("Costuma vir com",m.outras); row("Quando entrar",m.janela); row("Guarde",m.guardar); row("Erro comum",m.erro); row("Quem lida bem",[].concat(m.forte_contra||[]).join("; ")); if(m.patch) row("Patch",m.patch);
    card.append(dl);
    if(hi&&good.length) card.append(el("p",{class:"small",text:`Suas linhas citadas: ${good.map(k=>LINE_NAME[k]).join(", ")}.`}));
    const src=el("p",{class:"src"}); const fs=[].concat(m.fonte||[]); if(fs.length){ src.append("Fonte: "); fs.slice(0,2).forEach((u,i)=>{ if(i) src.append(", "); let h=u; try{ h=new URL(u).hostname.replace(/^www\./,""); }catch(e){} src.append(el("a",{href:u,target:"_blank",rel:"noopener",text:h})); }); card.append(src); }
    box.append(card); }
  if(!box.children.length) box.textContent="Nenhuma ficha com esse nome.";
  tiltCards();
  if(window.gsap&&!RM) gsap.from(box.children,{opacity:0,y:16,rotationX:-8,transformPerspective:800,duration:.4,stagger:.04,ease:"power3.out",clearProps:"opacity,transform"});
}

