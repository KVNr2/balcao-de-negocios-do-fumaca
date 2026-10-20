/* ================= aba Builds: cartões com ícones + combinações do Top Comps ================= */
let COMPS = null, bLine = "", bSort = "pop", bOpen = null, W2LINE = null, CODE2EN = null;
const ROLE_PT = {rdps:"Dano à distância", mdps:"Dano corpo a corpo", front:"Frente", frontdps:"Frente e dano", healer:"Curandeiro"};
const LINE_ICON = {espada:"MAIN_SWORD",machado:"MAIN_AXE",maca:"MAIN_MACE",martelo:"MAIN_HAMMER",lanca:"MAIN_SPEAR",bordao:"2H_QUARTERSTAFF",adaga:"MAIN_DAGGER",luvas:"2H_KNUCKLES_SET1",arco:"2H_BOW",besta:"2H_CROSSBOW",metamorfo:"2H_SHAPESHIFTER_SET1",fogo:"MAIN_FIRESTAFF",gelo:"MAIN_FROSTSTAFF",arcano:"MAIN_ARCANESTAFF",sagrado:"MAIN_HOLYSTAFF",natureza:"MAIN_NATURESTAFF",maldito:"MAIN_CURSEDSTAFF"};
const CONT_PT = {brumas:"Brumas", corrompidas:"Corrompidas", barato:"Abadia, set barato", pve:"PvE e rastreio"};
function buildIdx(){
  if(W2LINE||!SPECS||!GEAR) return;
  W2LINE={}; for(const g of SPECS.g){ if(!g.k.startsWith("c:")) continue; for(const it of g.it) W2LINE[it[0]]=g.k.slice(2); }
  CODE2EN={}; for(const [n,k] of Object.entries(GEAR.n)) if(!CODE2EN[k]) CODE2EN[k]=n;
}
const codeName = c => nmKey(c,(CODE2EN&&CODE2EN[c])||c.replace(/^(2H_|MAIN_|OFF_|HEAD_|ARMOR_|SHOES_)/,"").replace(/_/g," ").toLowerCase());
const weaponOf = b => gearKey(b.w);
function buildSlotKind(name){ const k=gearKey(name.split(/\s+ou\s+/)[0]); return k?{k,t:(GEAR.s||{})[k]||""}:null; }
function tile(code,label,sub,big){ const t=el("div",{class:"btile"+(big?" big":"")}); const im=itemImg(code,[4,5,6,7,8,3]); t.append(im); if(label) t.append(el("span",{class:"bt-n",text:label})); if(sub) t.append(el("span",{class:"bt-s",text:sub})); return t; }
function gearStrip(b){
  const row=el("div",{class:"bgear"}); const seen=new Set();
  const order={h:0,a:1,s:2,c:3,o:4,w:5};
  const items=b.g.map(n=>({n,x:buildSlotKind(n)})).sort((p,q)=>(order[p.x?p.x.t:"z"]??9)-(order[q.x?q.x.t:"z"]??9));
  for(const {n,x} of items){ if(!x||seen.has(x.k)) continue; seen.add(x.k); const im=itemImg(x.k,[4,5,6,7,8,3]); im.title=nm(n); im.alt=nm(n); row.append(im); }
  return row;
}
const GRP_PT = {"":"Todos os modos","5v5":"5v5 e 3v3","zvz":"ZvZ","avalon":"Avalon","gank":"Gank e bomba"};
let bGroup = "";
const ROLE_RX = [[/heal|cura|reden|hallow|holy|vida|sacr/i,"Curandeiro"],[/tank|front|heavy|frente|stop|mace|martelo|hammer/i,"Frente"],[/rdps|range|kite|dist|ranged|bow|arco/i,"Dano à distância"],[/mdps|melee|dive|brawl|corpo|perto/i,"Dano corpo a corpo"]];
const roleOf = s => { const t=s||""; for(const [rx,n] of ROLE_RX) if(rx.test(t)) return n; return ""; };
const TIERV = {S:3,A:2,B:1};
/* Sinergia por contagem: em cada composição que tem a arma da build (peso 1) ou outra arma da mesma linha (peso 0,5),
   conta quantas vezes cada arma, cada função e cada tipo de armadura aparecem junto dela. */
function synergyOf(b){
  const wc=weaponOf(b); const res={n:0,partners:{},lines:{},roles:{},comps:[]};
  if(!wc||!COMPS) return res;
  for(const c of COMPS.comps){
    if(bGroup&&c.grupo!==bGroup) continue;
    let hit=c.slots.findIndex(s=>s.arma===wc), w=1;
    if(hit<0){ hit=c.slots.findIndex(s=>W2LINE[s.arma]===b.l); w=0.5; }
    if(hit<0) continue;
    res.n+=w; res.comps.push({c,hit,w});
    const seen=new Set([c.slots[hit].arma]);
    const r=roleOf(c.slots[hit].papel); if(r) res.roles[r]=(res.roles[r]||0)+w;
    c.slots.forEach((s,i)=>{ if(i===hit||seen.has(s.arma)) return; seen.add(s.arma);
      res.partners[s.arma]=(res.partners[s.arma]||0)+w; const l=W2LINE[s.arma]; if(l) res.lines[l]=(res.lines[l]||0)+w; });
  }
  res.comps.sort((x,y)=>(y.w-x.w)||((TIERV[y.c.tier]||0)-(TIERV[x.c.tier]||0))||(x.c.slots.length-y.c.slots.length));
  return res;
}
const fmtN = n => Number.isInteger(n)?String(n):n.toFixed(1).replace(".",",");
function compCard(r){
  const {c,hit}=r; const card=el("div",{class:"ccard"});
  const hd=el("div",{class:"cc-h"}); hd.append(el("b",{text:c.nome}));
  if(c.tier) hd.append(el("span",{class:"tag tier-"+c.tier,text:"tier "+c.tier}));
  (c.modos&&c.modos.length?c.modos:[GRP_PT[c.grupo]||""]).slice(0,2).forEach(m=>{ if(m) hd.append(el("span",{class:"tag",text:m})); });
  hd.append(el("small",{class:"muted",text:`${c.slots.length} jogadores${c.atualizado?", atualizada em "+c.atualizado.split("-").reverse().join("/"):""}`}));
  card.append(hd);
  const row=el("div",{class:"cc-row"}); const groups=[]; const idx=new Map();
  c.slots.forEach((s,i)=>{ if(idx.has(s.arma)){ groups[idx.get(s.arma)].n++; } else { idx.set(s.arma,groups.length); groups.push({s,n:1,me:false}); } if(i===hit) groups[idx.get(s.arma)].me=true; });
  groups.sort((x,y)=>(y.me-x.me)); const show=groups.slice(0,8);
  show.forEach(g=>{ const s=g.s; const sub=(s.papel&&!/^\d/.test(s.papel)?s.papel.slice(0,22):(s.tipo==="P"?"placa":s.tipo==="L"?"couro":s.tipo==="C"?"pano":"")); const t=tile(s.arma,codeName(s.arma),g.n>1?`×${g.n}`:sub); if(g.me) t.classList.add("me"); row.append(t); });
  if(groups.length>show.length) row.append(el("span",{class:"cc-more",text:`+${groups.length-show.length}`}));
  card.append(row); return card;
}
function goBuild(code){ const other=BUILDS.find(x=>weaponOf(x)===code); if(!other) return false; st.bc=other.c; bLine=""; bOpen=other.w+"|"+other.c; document.querySelectorAll("[data-bc]").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.bc===st.bc))); renderBuilds(); const t2=document.querySelector(".bcard.open"); if(t2) t2.scrollIntoView({block:"center",behavior:"smooth"}); return true; }
function synergyPanel(b){
  const box=el("div",{class:"bsyn"});
  if(!COMPS){ box.textContent="Abrindo as composições…"; return box; }
  box.append(el("h4",{text:"Combina com"}));
  const gs=el("div",{class:"seg sm",role:"group","aria-label":"Modo de jogo"});
  const have=new Set(COMPS.comps.map(c=>c.grupo));
  Object.entries(GRP_PT).forEach(([k,t])=>{ if(k&&!have.has(k)) return; const bt=el("button",{type:"button",text:t,"aria-pressed":String(bGroup===k)}); bt.addEventListener("click",()=>{ bGroup=k; renderBuilds(); }); gs.append(bt); });
  box.append(gs);
  const s=synergyOf(b);
  if(!s.n){ box.append(el("p",{class:"small muted",text:`Nenhuma composição ${bGroup?"de "+GRP_PT[bGroup]+" ":""}usa ${nm(b.w)} nem outra arma da linha ${LINE_NAME[b.l]}. Esta build serve melhor solo ou em grupo pequeno.`})); return box; }
  const exact=s.comps.filter(x=>x.w===1).length;
  box.append(el("p",{class:"small",text:exact?`${nm(b.w)} aparece em ${exact} de ${COMPS.comps.filter(c=>!bGroup||c.grupo===bGroup).length} composições do Top Comps${s.comps.length>exact?`, e outras ${s.comps.length-exact} usam armas parecidas (mesma linha, contam meio ponto)`:""}. A sinergia vem de quantas vezes cada arma joga ao lado dela:`:`Nenhuma composição usa exatamente ${nm(b.w)}, mas ${s.comps.length} usam outra arma da linha ${LINE_NAME[b.l]}. A sinergia vem de quantas vezes cada arma joga ao lado delas:`}));
  const roles=Object.entries(s.roles).sort((x,y)=>y[1]-x[1]);
  if(roles.length){ const rr=el("div",{class:"bc-meta"}); rr.append(el("small",{class:"muted",text:"Função nas composições:"})); roles.forEach(([r,n])=>rr.append(el("span",{class:"tag",text:`${r} ×${fmtN(n)}`}))); box.append(rr); }
  const top=Object.entries(s.partners).sort((x,y)=>y[1]-x[1]).slice(0,8);
  const row=el("div",{class:"cc-row sum"});
  for(const [arma,n] of top){ const pct=Math.round(100*n/s.n); const t=tile(arma,codeName(arma),`${fmtN(n)} de ${fmtN(s.n)} (${pct}%)`); const has=BUILDS.some(x=>weaponOf(x)===arma); if(has){ t.classList.add("link"); t.title="Ver as builds de "+codeName(arma); t.tabIndex=0; t.addEventListener("click",()=>goBuild(arma)); t.addEventListener("keydown",e=>{ if(e.key==="Enter") goBuild(arma); }); } row.append(t); }
  box.append(row);
  const ln=Object.entries(s.lines).sort((x,y)=>y[1]-x[1]).slice(0,5);
  if(ln.length){ const lr=el("div",{class:"bc-meta"}); lr.append(el("small",{class:"muted",text:"Linhas que mais acompanham:"})); ln.forEach(([l,n])=>lr.append(el("span",{class:"tag",text:`${LINE_NAME[l]||l} ×${fmtN(n)}`}))); box.append(lr); }
  box.append(el("h4",{text:"Composições de exemplo"}));
  const list=el("div",{class:"cc-list"}); s.comps.slice(0,4).forEach(r=>list.append(compCard(r))); box.append(list);
  box.append(el("p",{class:"tiny muted",text:`Fonte: Albion Online Builds, Top Comps. Os dados são atualizados todo dia (última vez em ${COMPS.atualizado.split("-").reverse().join("/")}).`}));
  return box;
}
function buildCard(b){
  const id=b.w+"|"+b.c, open=bOpen===id; const wc=weaponOf(b);
  const card=el("article",{class:"bcard"+(open?" open":"")});
  const top=el("div",{class:"bc-top"});
  top.append(wc?tile(wc,"",""):el("span",{class:"btile"}));
  const mid=el("div",{class:"bc-mid"}); const h=el("h4"); h.append(nm(b.w));
  if(b.mc) h.append(el("span",{class:"tag tier-"+b.mc,text:"tier "+b.mc}));
  mid.append(h);
  const nv=Math.max(PF.armas[b.l]||0,spMax((PF.sp||{})["c:"+b.l])); const lv=wl(b.l);
  const meta=el("div",{class:"bc-meta"}); meta.append(el("span",{class:"tag",text:CONT_PT[b.c]||b.c}),el("span",{class:"tag"+(lv>=2?" good":""),text:nv?`${LINE_NAME[b.l]}: nível ${nv}`:`${LINE_NAME[b.l]}: sem spec`}));
  const gaps=armorGaps(b); if(gaps.length) meta.append(el("span",{class:"tag bad",text:`Sem spec em ${gaps.join(" e ")}`}));
  mid.append(meta); top.append(mid);
  const rt=el("div",{class:"bc-r"}); rt.append(el("span",{class:"pop",text:b.src==="pesquisa"?"Pesquisa, não conferida":b.src==="MetaCorrupted"?"MetaCorrupted":`${b.pop} salvos`}),el("span",{class:`chg ${b.p[0]}`,text:b.p[1]}));
  top.append(rt); card.append(top);
  card.append(gearStrip(b));
  if(b.f) card.append(el("p",{class:"bc-food",text:nmFood(b.f)}));
  const btn=el("button",{type:"button",class:"bc-more","aria-expanded":String(open),text:open?"Esconder combinações":"Ver o que combina com esta build"});
  btn.addEventListener("click",()=>{ bOpen=open?null:id; renderBuilds(); });
  card.append(btn);
  if(open) card.append(synergyPanel(b));
  return card;
}
function renderBuilds(){
  const only=$("bOnlyMine").checked; let list=rankBuilds(st.bc,only);
  const host=$("bList"); host.textContent="";
  if(!COMPS&&!renderBuilds._l){ renderBuilds._l=1; need("comps").then(c=>{ COMPS=c; renderBuilds(); }).catch(()=>{}); }
  buildIdx();
  const present=new Set(rankBuilds(st.bc,only).map(b=>b.l));
  const grid=$("bWeapons"); grid.textContent="";
  const all=el("button",{type:"button",class:"bw all","aria-pressed":String(!bLine),text:"Todas"}); all.addEventListener("click",()=>{ bLine=""; renderBuilds(); }); grid.append(all);
  for(const [l,code] of Object.entries(LINE_ICON)){ if(!present.has(l)&&bLine!==l) continue; const b=el("button",{type:"button",class:"bw","aria-pressed":String(bLine===l),title:LINE_NAME[l]}); b.append(itemImg(code,[4,5,6,7,8,3])); b.addEventListener("click",()=>{ bLine=bLine===l?"":l; renderBuilds(); }); grid.append(b); }
  if(bLine) list=list.filter(b=>b.l===bLine);
  if(bSort==="nome") list=list.slice().sort((a,b)=>nm(a.w).localeCompare(nm(b.w),"pt"));
  else if(bSort==="spec") list=list.slice().sort((a,b)=>(wl(b.l)-wl(a.l))||(b.pop-a.pop));
  $("bCount").textContent=list.length?`${list.length} ${list.length===1?"build":"builds"}`:"";
  if(!list.length){ host.append(el("p",{class:"empty",text:only?"Nenhuma build desta lista usa as armas da sua ficha. Desmarque o filtro para ver todas.":"Nenhuma build nesta seleção."})); return; }
  for(const b of list) host.append(buildCard(b));
}
