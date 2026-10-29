/* ================= pesca =================
   data/pesca.json (gerado dos arquivos do jogo):
     n: nomes {id:[pt,en]}, ch: peixe picado por peixe {id:n},
     l: o que sai por fisgada em cada tipo de água {F<BIOMA><tier>|O<tier>: {f:{id:quantidade média}, o:outros}},
     z: mapas com água [id, nome, bioma, tier, região, qualidade, lagos, pontos de mar, cardumes]
   Valor de cada peixe = o melhor entre vender, picar (Peixe Picado) e cozinhar o prato que leva ele,
   com os preços de agora. Valor de um mapa = média de prata por fisgada, pela tabela de sorteio do jogo. */
let PESCA=null, PESCA_P=null, PC_LOADED=false, pcSel=null;
const PC_BIO={FR:"FOREST",SW:"SWAMP",MN:"MOUNTAIN",HL:"HIGHLANDS",ST:"STEPPE",AV:"AVALON"};
const PC_BIO_PT={FOREST:"floresta",SWAMP:"pântano",MOUNTAIN:"montanha",HIGHLANDS:"terras altas",STEPPE:"estepe",AVALON:"Avalon",DRAGON_AREA:"Ancient Lands"};
const PC_EXTRA=["T1_SEAWEED","T1_FISHSAUCE_LEVEL1","T1_FISHSAUCE_LEVEL2","T1_FISHSAUCE_LEVEL3","T1_FISHINGBAIT","T3_FISHINGBAIT","T5_FISHINGBAIT","T3_MEAL_PIE","T5_MEAL_PIE","T7_MEAL_PIE","T3_MEAL_PIE_FISH","T5_MEAL_PIE_FISH","T7_MEAL_PIE_FISH","T1_MEAL_SEAWEEDSALAD"];
/* bônus de pesca dos arquivos do jogo (spells e Destiny Board): rendimento = chance de vir peixe a mais; velocidade = espera menor pela fisgada */
const PC_AVA={4:.1,5:.125,6:.15,7:.175,8:.2};                                   // vara avaloniana, por tier
const PC_GEAR={4:.01,5:.02,6:.03,7:.05,8:.07};                                 // gorro + roupa + botas de pescador, somados
const PC_FOOD={"":[0,0,""],"T3_MEAL_PIE":[.05,0],"T5_MEAL_PIE":[.1,0],"T7_MEAL_PIE":[.15,0],"T3_MEAL_PIE_FISH":[.05,0],"T5_MEAL_PIE_FISH":[.1,0],"T7_MEAL_PIE_FISH":[.15,0],"T1_MEAL_SEAWEEDSALAD":[0,.1]}; // [rendimento, velocidade], 30 min
const PC_BAIT={"":0,"T1_FISHINGBAIT":.5,"T3_FISHINGBAIT":1.25,"T5_FISHINGBAIT":2.5};   // velocidade, 10 min
const PC_WAIT=0.6;   // parte do tempo de cada peixe que é espera pela fisgada (o que a velocidade encurta); o resto é lançar e o minijogo
function pcHour(){
  const g=(PF.coleta||{}).pesca||{}, m=+g.m||0, esp=+((g.s||{})[8])||0, rod=pcRod();
  const spec=0.0015*m+0.0035*esp, food=PC_FOOD[PC.food||""]||[0,0], bait=PC_BAIT[PC.bait||""]||0;
  const y=spec+(PC.vara==="avalon"?(PC_AVA[rod]||0):0)+(PC_GEAR[+PC.gear]||0)+food[0], sp=spec+bait+food[1];
  const base=Math.max(10,Math.min(1000,+PC.pace||120)), T=3600/base, t=T*((1-PC_WAIT)+PC_WAIT/(1+sp)), fph=3600/t;
  const fp=PC.food&&typical(PC.food,0), bp=PC.bait&&typical(PC.bait,0), cost=(fp?2*fp.p:0)+(bp?6*bp.p:0);
  return {fph,y,sp,spec,cost,base,missFood:!!PC.food&&!fp,missBait:!!PC.bait&&!bp};
}
let PC={rod:0, reg:"all", agua:"all", vara:"comum", gear:"0", food:"", bait:"", pace:120}; try{ Object.assign(PC,JSON.parse(store.get("pesca")||"{}")); }catch(e){}
const pcSave=()=>{ try{ store.set("pesca",JSON.stringify(PC)); }catch(e){} };
const pcZName=z=>/^\d+$/.test(z.n)?`Mapa ${z.n}`:z.n;
const pcName=id=>{ const n=PESCA&&PESCA.n[id]; return n?((typeof LANG!=="undefined"&&LANG==="en"?n[1]:n[0])||n[0]):id; };
const pcRod=()=>PC.rod>0?PC.rod:(((PF.coleta||{}).pesca||{}).tier||8);

async function ensurePesca(){
  if(PC_LOADED) return true;
  if(!PESCA_P) PESCA_P=(async()=>{
    PESCA=await need("pesca");
    await Promise.all([ensureCook(), fetchLive(PC_EXTRA,SHOP_LOCS,"pcNote","Consultando algas e molhos").catch(()=>{})]);
    PC_LOADED=true; return true; })().catch(()=>{ PESCA_P=null; return false; });
  return PESCA_P;
}

/* quanto vale 1 peixe em cada destino, já com as taxas de venda */
const PC_DISH={}; // peixe -> receitas da cozinha que levam ele
function pcDishes(){ if(Object.keys(PC_DISH).length) return PC_DISH;
  for(const id in COOK.r){ const r=COOK.r[id]; if(!r||!r[3]||!r[5]) continue; for(const [iid,c] of r[5]) if(/FISH/.test(iid)&&!/FISHSAUCE/.test(iid)) (PC_DISH[iid]=PC_DISH[iid]||[]).push({id,c}); }
  return PC_DISH; }
const PC_VAL={};
function pcValue(id){
  if(PC_VAL[id]) return PC_VAL[id];
  const tax=1-taxOf(), field=st.sell==="instant"?1:0;
  const it=typical(id,field), sell=it?it.p*tax:0;
  const chops=(PESCA.ch[id]||0), cp=typical("T1_FISHCHOPS",field), chop=chops&&cp?chops*cp.p*tax:0;
  /* prato: lucro da receita com o peixe de graça (você pescou), dividido pelos peixes que ela usa */
  let dish=0, dishId=null;
  const saveO=SRC.ckO; SRC.ckO=Object.assign({},saveO||{},{[id]:"tenho"});
  try{ for(const d of (pcDishes()[id]||[])){ const m=cookModel(d.id); if(m&&!m.miss&&!m.thin){ const v=m.p1/d.c; if(v>dish){ dish=v; dishId=d.id; } } } }
  finally{ SRC.ckO=saveO; }
  const best=Math.max(sell,chop,dish), how=best<=0?null:best===sell?"vender":best===chop?"picar":"cozinhar";
  return PC_VAL[id]={id,sell,chop,chops,dish,dishId,best,how,thin:!it||it.n<2,price:it?it.p:0};
}
const PC_HOW={vender:"vender",picar:"picar",cozinhar:"cozinhar"};
function pcLoot(key){ return (PESCA.l[key]||{}).f||{}; }
function pcEV(key){
  const f=pcLoot(key); let ev=0, rare=0, top=null, n=0;
  for(const [id,q] of Object.entries(f)){ const v=pcValue(id).best*q; ev+=v; if(/RARE|BOSS/.test(id)) rare+=q; if(id!=="T1_SEAWEED") n+=q; if(!top||v>top.v) top={id,v}; }
  return {ev,rare:n?rare/n:0,top};
}
const pcKeyF=(b,t)=>`F${PC_BIO[b]||b}${t}`, pcKeyO=t=>`O${t}`;

function pcZones(){
  const rod=pcRod(), out=[];
  for(const [i,n,b,t,r,q,fw,oc,sw] of PESCA.z){
    if(t>rod) continue; if(PC.reg!=="all"&&r!==PC.reg) continue;
    const doce=fw>0&&PC.agua!=="mar"?pcEV(pcKeyF(b,t)):null, mar=oc>0&&PC.agua!=="doce"?pcEV(pcKeyO(t)):null;
    if(!doce&&!mar) continue;
    const best=[doce&&{w:"doce",...doce},mar&&{w:"mar",...mar}].filter(Boolean).sort((a,b)=>b.ev-a.ev)[0];
    out.push({i,n,b,t,r,q,fw,oc,sw,doce,mar,best});
  }
  return out;
}
const pcRegTxt=z=>z.r==="AVA"?"Estradas de Avalon":z.r==="ROY"?"continente real":`Zona Preta${z.q?`, qualidade ${z.q}`:""}`;

/* peixes: todos os que o jogo tem, com o melhor uso */
function pcFishList(){
  const ids=new Set(); for(const k in PESCA.l) for(const id in PESCA.l[k].f) if(id!=="T1_SEAWEED") ids.add(id);
  ids.add("T8_FISH_SALTWATER_ALL_BOSS_SHARK");
  const where={}; for(const k in PESCA.l){ const w=k[0]==="O"?"mar":PC_BIO_PT[k.slice(1).replace(/\d+$/,"")]; for(const [id,q] of Object.entries(PESCA.l[k].f)){ const s=(where[id]=where[id]||{}); s[w]=Math.max(s[w]||0,q); } }
  return [...ids].map(id=>{ const v=pcValue(id), w=where[id]||{}; const top=Object.entries(w).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
    return {...v, t:+id[1], name:pcName(id), rare:/RARE|BOSS/.test(id), salt:/SALTWATER/.test(id), where:id.includes("BOSS")?["mar (chefe dos cardumes)"]:top.slice(0,3)}; });
}

const PF_COLS=[
  {h:"Peixe",k:"name",s:m=>m.name},
  {h:"Vale pescado",k:"best",s:m=>m.best,t:"Ordenar pela prata que cada peixe rende no melhor uso"},
  {h:"Vendendo",k:"sell",s:m=>m.sell},
  {h:"Picado",k:"chop",s:m=>m.chop,t:"Peixe Picado: quantos sai de cada peixe vezes o preço"},
  {h:"No prato",k:"dish",s:m=>m.dish||null,t:"Lucro da receita que leva o peixe, com o peixe de graça"},
  {h:"Onde sai"},
  {h:"Vende por dia",k:"vol",s:m=>lfVol(m.id)} ];
const PF_FIL=[{k:"minV",lab:"Vale no mínimo",step:100,get:m=>m.best},{k:"minVol",lab:"Vende por dia, no mínimo",step:1,min:0,get:m=>lfVol(m.id)}];
const PZ_COLS=[
  {h:"Mapa",k:"name",s:z=>z.n},
  {h:"Prata por hora",k:"hour",s:z=>pcPerHour(z.best.ev)+((z.fw||0)+(z.sw||0))*1e-6,t:"Prata por hora pescando nesse mapa, com o seu ritmo, a sua vara, as specs e a comida"},
  {h:"Por fisgada",k:"ev",s:z=>z.best.ev,t:"Média de prata por peixe pescado nesse mapa, no melhor uso de cada peixe"},
  {h:"Tier e bioma",k:"tier",s:z=>z.t},
  {h:"Região"},
  {h:"Água",k:"agua",s:z=>(z.fw||0)+(z.oc||0),t:"Ordenar pela quantidade de pontos de pesca"},
  {h:"Raros",k:"rare",s:z=>z.best.rare,t:"Chance de cada fisgada ser um peixe raro"},
  {h:"O que mais rende ali"} ];
let PC_H=null; const pcPerHour=ev=>{ const h=PC_H||(PC_H=pcHour()); return h.fph*(1+h.y)*ev-h.cost; };
const PZ_FIL=[{k:"minHour",lab:"Prata por hora, no mínimo",step:1000,get:z=>pcPerHour(z.best.ev)},{k:"minEv",lab:"Prata por fisgada, no mínimo",step:10,get:z=>z.best.ev},{k:"minRare",lab:"Raros %, no mínimo",step:1,get:z=>z.best.rare*100}];

async function renderPesca(){
  const note=$("pcNote");
  if(!PC_LOADED){ note.textContent="Abrindo os dados de pesca e os preços…"; const ok=await ensurePesca(); if(!ok){ note.textContent="Não consegui abrir os dados de pesca agora. Tente atualizar."; return; } }
  for(const k in PC_VAL) delete PC_VAL[k];
  const rod=pcRod(); $("pcRod").value=String(PC.rod||0);
  document.querySelectorAll("[data-pc]").forEach(b=>{ const [k,v]=b.dataset.pc.split(":"); b.setAttribute("aria-pressed",String(PC[k]===v)); });
  { const H=pcHour(); for(const [id,k] of [["pcGear","gear"],["pcFood","food"],["pcBait","bait"]]){ const e=$(id); if(e) e.value=String(PC[k]||(k==="gear"?"0":"")); } const pp=$("pcPace"); if(pp&&document.activeElement!==pp) pp.value=String(PC.pace||120);
    const ht=$("pcHourTxt"); if(ht) ht.textContent=`Com isso: ${fmt(Math.round(H.fph))} fisgadas por hora (velocidade +${dec(H.sp*100)}%) e ${dec(H.y*100)}% de chance de peixe a mais. As specs da ficha dão +${dec(H.spec*100)}% nos dois.${H.cost?` Comida e isca custam uns ${fmt(Math.round(H.cost))} por hora.`:""}${H.missFood||H.missBait?" Sem preço para a comida ou a isca escolhida: o custo ficou de fora.":""}`; }
  note.textContent=`Vara T${rod}${PC.rod>0?"":" (da sua ficha)"}: só entram mapas até T${rod}. Valores com os preços de agora e as taxas de venda; o prato conta o foco e a cidade com bônus, como na Cozinha.`;
  renderPcZones(); await renderPcFish();
}

function renderPcZones(){
  PC_H=pcHour(); const H=PC_H;
  const tb=$("pcZTable"), bar=$("pcZFil"), rer=()=>renderPcZones(), def={k:"hour",dir:1}; tb.textContent="";
  lfHead(tb.createTHead().insertRow(),"pz",PZ_COLS,def,rer); lfBar(bar,"pz",PZ_FIL,rer);
  const all=pcZones(); let list=lfFilter("pz",all,PZ_FIL); lfCount(bar,"pz",PZ_FIL,all.length-list.length); list=lfSort("pz",list,PZ_COLS,def);
  const body=tb.createTBody(), NC=PZ_COLS.length;
  ganhoTop($("pcSum"),list,z=>pcPerHour(z.best.ev),z=>`${pcZName(z)} (${PC_BIO_PT[PC_BIO[z.b]]} T${z.t}, ${pcRegTxt(z)}): uns ${fmt(Math.round(pcPerHour(z.best.ev)))} de prata por hora no ${z.best.w==="mar"?"mar":"lago"}, com ${fmt(Math.round(H.fph))} fisgadas por hora, ${dec(H.y*100)}% de peixe a mais e ${fmt(Math.round(z.best.ev))} por fisgada${H.cost?`, já tirando ${fmt(Math.round(H.cost))} de comida e isca`:""}. O que mais pesa é ${pcName(z.best.top.id)}, ${PC_HOW[pcValue(z.best.top.id).how]||"vender"}.`,"Com os preços de agora, nenhum mapa da lista rende.");
  if(!list.length){ const td=body.insertRow().insertCell(); td.colSpan=NC; td.className="muted"; td.textContent=all.length?"Nenhum mapa passa pelos filtros.":"Nenhum mapa com água até o tier da sua vara nessa região."; return; }
  for(const z of list.slice(0,150)){
    const tr=body.insertRow(); tr.className="clickrow"; tr.tabIndex=0;
    tr.insertCell().append(el("b",{text:pcZName(z)}));
    { const hv=pcPerHour(z.best.ev), hc=tr.insertCell(); hc.className="num gv-cell "+(hv>=0?"gain":"loss"); hc.append(el("b",{class:"gv",text:fmt(Math.round(hv))}),el("small",{class:"gv-sub",text:`${fmt(Math.round(H.fph*(1+H.y)))} peixes por hora`})); }
    const g=tr.insertCell(); g.className="num gv-cell"; g.append(el("b",{class:"gv",text:fmt(Math.round(z.best.ev))}),el("small",{class:"gv-sub",text:`no ${z.best.w==="mar"?"mar":"lago"}${z.doce&&z.mar?`; ${z.best.w==="mar"?"lago":"mar"}: ${fmt(Math.round((z.best.w==="mar"?z.doce:z.mar).ev))}`:""}`}));
    tr.insertCell().textContent=`T${z.t}, ${PC_BIO_PT[PC_BIO[z.b]]}`;
    const rg=tr.insertCell(); rg.textContent=pcRegTxt(z); if(z.r!=="ROY") rg.className="loss";
    tr.insertCell().textContent=z.r==="AVA"?"lagos dos corredores, variam por estrada":[z.fw?`${z.fw} pontos no lago`:"",z.oc?"mar":"",z.sw?`${z.sw} de cardume`:""].filter(Boolean).join(", ");
    const rc=tr.insertCell(); rc.className="num"; rc.textContent=dec(z.best.rare*100)+"%";
    const tc=tr.insertCell(); tc.append(withIcon(z.best.top.id,pcName(z.best.top.id)));
    const dr=document.createElement("tr"); dr.className="of-drow"; dr.hidden=true; const dc=document.createElement("td"); dc.colSpan=NC; dr.append(dc); tr.after(dr);
    const toggle=()=>{ const open=dr.hidden; dr.hidden=!open; tr.classList.toggle("open",open); tr.setAttribute("aria-expanded",String(open)); pcSel=open?z.i:null; if(open){ dc.textContent=""; dc.append(pcZonePanel(z)); } };
    tr.setAttribute("aria-expanded","false"); tr.addEventListener("click",toggle); tr.addEventListener("keydown",ev=>{ if(ev.target===tr&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); toggle(); } });
    if(pcSel===z.i) toggle();
  }
  if(list.length>150) body.insertRow().insertCell().append(el("span",{class:"muted",text:`Mostrando 150 de ${fmt(list.length)} mapas. Use os filtros para afinar.`}));
}

/* o que sai em cada fisgada daquele mapa, com a chance e o valor */
function pcZonePanel(z){
  const box=el("div",{class:"pc-zp"});
  for(const [w,ev,key] of [["Lago (água doce)",z.doce,pcKeyF(z.b,z.t)],["Mar (água salgada)",z.mar,pcKeyO(z.t)]]){
    if(!ev) continue;
    const f=pcLoot(key), n=Object.entries(f).filter(([id])=>id!=="T1_SEAWEED").reduce((a,[,q])=>a+q,0);
    const sec=el("div",{class:"pc-zs"}); sec.append(el("h4",{class:"of-xh",text:`${w}: ${fmt(Math.round(ev.ev))} de prata por fisgada`}));
    const t=el("table",{class:"pc-lt"}); const h=t.createTHead().insertRow(); ["O que sai","Chance","Vale","Melhor uso","Pesa no valor"].forEach(x=>h.append(el("th",{text:x})));
    const b=t.createTBody();
    for(const [id,q] of Object.entries(f).sort((a,b)=>pcValue(b[0]).best*b[1]-pcValue(a[0]).best*a[1])){
      const v=pcValue(id), r=b.insertRow();
      r.insertCell().append(withIcon(id,pcName(id)));
      const c=r.insertCell(); c.className="num"; c.textContent=id==="T1_SEAWEED"?`${dec(q)} por fisgada`:`${dec(q/n*100)}%`;
      const vv=r.insertCell(); vv.className="num"; vv.textContent=fmt(Math.round(v.best));
      r.insertCell().textContent=v.how?(v.how==="cozinhar"&&v.dishId?`cozinhar: ${COOK.r[v.dishId][0]}`:v.how==="picar"?`picar (${v.chops} picados)`:"vender"):"sem preço";
      const pv=r.insertCell(); pv.className="num"; pv.textContent=ev.ev>0?`${dec(v.best*q/ev.ev*100)}%`:"—";
    }
    sec.append(t); box.append(sec);
  }
  box.append(el("p",{class:"tiny muted",text:`Tabela de sorteio do jogo para zona T${z.t} de ${PC_BIO_PT[PC_BIO[z.b]]}. Os raros dos biomas vizinhos também saem, com menos chance. ${(PESCA.l[pcKeyF(z.b,z.t)]||{}).o>0?`Mais ou menos 1 fisgada em ${fmt(Math.round(1/PESCA.l[pcKeyF(z.b,z.t)].o))} traz fragmento, livro ou baú, que fica fora da conta.`:""}`}));
  return box;
}

async function renderPcFish(){
  const tb=$("pcFTable"), bar=$("pcFFil"), rer=()=>renderPcFish(), def={k:"best",dir:1}; tb.textContent="";
  lfHead(tb.createTHead().insertRow(),"pf",PF_COLS,def,rer); lfBar(bar,"pf",PF_FIL,rer);
  const rod=pcRod();
  let all=pcFishList().filter(m=>m.t<=rod&&(PC.agua==="all"||(PC.agua==="mar")===m.salt));
  const st0=lfState("pf",def); await lfEnsureVol(all.map(m=>m.id),st0.k==="vol"||lfNum(lfGet("pf").minVol),tb,$("pcNote"));
  let list=lfFilter("pf",all,PF_FIL); lfCount(bar,"pf",PF_FIL,all.length-list.length); list=lfSort("pf",list,PF_COLS,def);
  const body=tb.createTBody();
  for(const m of list){
    const tr=body.insertRow();
    tr.insertCell().append(withIcon(m.id,el("span",{},m.name+` T${m.t}`,m.rare?el("span",{class:"spec",text:m.id.includes("BOSS")?"chefe":"raro"}):"")));
    const g=tr.insertCell(); g.className="num gv-cell "+(m.best>0?"gain":"muted"); g.append(el("b",{class:"gv",text:m.best>0?fmt(Math.round(m.best)):"—"}),el("small",{class:"gv-sub",text:m.how?(m.how==="cozinhar"&&m.dishId?`cozinhando ${COOK.r[m.dishId][0]}`:m.how==="picar"?`picando (${m.chops} picados)`:"vendendo"):"sem preço"}));
    const s=tr.insertCell(); s.className="num"; s.textContent=m.sell>0?fmt(Math.round(m.sell)):"—";
    const c=tr.insertCell(); c.className="num"; c.textContent=m.chop>0?fmt(Math.round(m.chop)):"—";
    const d=tr.insertCell(); d.className="num"; d.textContent=m.dish>0?fmt(Math.round(m.dish)):"—"; if(m.dishId) d.title=COOK.r[m.dishId][0];
    tr.insertCell().textContent=m.where.join(", ");
    lfVolCell(tr,m.id);
  }
}

document.querySelectorAll("[data-pc]").forEach(b=>b.addEventListener("click",()=>{ const [k,v]=b.dataset.pc.split(":"); PC[k]=v; pcSave(); pcSel=null; renderPesca(); }));
for(const [id,k] of [["pcGear","gear"],["pcFood","food"],["pcBait","bait"]]){ const e=$(id); if(e) e.addEventListener("change",()=>{ PC[k]=e.value; pcSave(); renderPesca(); }); }
{ const e=$("pcPace"); if(e){ let tm; e.addEventListener("input",()=>{ const v=Math.round(+e.value); if(v>0){ PC.pace=v; pcSave(); clearTimeout(tm); tm=setTimeout(renderPesca,350); } }); } }
{ const r=$("pcRod"); if(r) r.addEventListener("change",()=>{ const v=+r.value; PC.rod=v>=1&&v<=8?v:0; pcSave(); renderPesca(); }); }
