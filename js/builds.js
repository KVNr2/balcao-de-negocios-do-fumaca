/* ================= aba Builds: cartões com ícones + combinações do Top Comps ================= */
let COMPS = null, bLine = "", bSort = "pop", bOpen = null, W2LINE = null, CODE2EN = null;
const ROLE_PT = {rdps:"Dano à distância", mdps:"Dano corpo a corpo", front:"Frente", frontdps:"Frente e dano", healer:"Curandeiro"};
const LINE_ICON = {espada:"MAIN_SWORD",machado:"MAIN_AXE",maca:"MAIN_MACE",martelo:"MAIN_HAMMER",lanca:"MAIN_SPEAR",bordao:"2H_QUARTERSTAFF",adaga:"MAIN_DAGGER",luvas:"2H_KNUCKLES_SET1",arco:"2H_BOW",besta:"2H_CROSSBOW",metamorfo:"2H_SHAPESHIFTER_SET1",fogo:"MAIN_FIRESTAFF",gelo:"MAIN_FROSTSTAFF",arcano:"MAIN_ARCANESTAFF",sagrado:"MAIN_HOLYSTAFF",natureza:"MAIN_NATURESTAFF",maldito:"MAIN_CURSEDSTAFF"};
let GB = null, bCont = "";
function buildIdx(){
  if(W2LINE||!SPECS||!GEAR) return;
  W2LINE={}; for(const g of SPECS.g){ if(!g.k.startsWith("c:")) continue; for(const it of g.it) W2LINE[it[0]]=g.k.slice(2); }
  CODE2EN={}; for(const [n,k] of Object.entries(GEAR.n)) if(!CODE2EN[k]) CODE2EN[k]=n;
}
const codeName = c => nmKey(c,(CODE2EN&&CODE2EN[c])||c.replace(/^(2H_|MAIN_|OFF_|HEAD_|ARMOR_|SHOES_)/,"").replace(/_/g," ").toLowerCase());
const weaponOf = b => b.wc;
function tile(code,label,sub,big){ const t=el("div",{class:"btile"+(big?" big":"")}); const im=itemImg(code,[4,5,6,7,8,3]); t.append(im); if(label) t.append(el("span",{class:"bt-n",text:label})); if(sub) t.append(el("span",{class:"bt-s",text:sub})); return t; }
const MODOS = [["","Todas as Comps"],["Mists 2v2","Mists 2v2"],["Hellgate 2v2","Hellgate 2v2"],["Hellgate 5v5","Hellgate 5v5"],["Depths 3v3","Depths 3v3"],["Bomb (Group)","Bomb (Grupo)"],["Gank (Group)","Gank (Grupo)"],["Roaming Avalon","Roaming Avalon"],["Small Fight (ZvZ)","Pequeno Combate (ZvZ)"],["Ancient Lands 3v3","Ancient Lands 3v3"],["Ancient Lands 5v5","Ancient Lands 5v5"],["Ancient Lands 7v7","Ancient Lands 7v7"],["Ancient Lands 20v20","Ancient Lands 20v20"]];
const MODO_PT = Object.fromEntries(MODOS.filter(m=>m[0]));
let bMode = "";
const ROLE_RX = [[/heal|cura|reden|hallow|holy|vida|sacr/i,"Curandeiro"],[/tank|front|heavy|frente|stop|mace|martelo|hammer/i,"Frente"],[/rdps|range|kite|dist|ranged|bow|arco/i,"Dano à distância"],[/mdps|melee|dive|brawl|corpo|perto/i,"Dano corpo a corpo"]];
const roleOf = s => { const t=s||""; for(const [rx,n] of ROLE_RX) if(rx.test(t)) return n; return ""; };
const TIERV = {S:3,A:2,B:1};
/* Sinergia por contagem: em cada composição que tem a arma da build (peso 1) ou outra arma da mesma linha (peso 0,5),
   conta quantas vezes cada arma, cada função e cada tipo de armadura aparecem junto dela. */
function synergyOf(b){
  const wc=weaponOf(b); const res={n:0,partners:{},lines:{},roles:{},comps:[]};
  if(!wc||!COMPS) return res;
  for(const c of COMPS.comps){
    if(bMode&&!(c.modos||[]).includes(bMode)) continue;
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
  (c.modos||[]).slice(0,2).forEach(m=>{ if(m) hd.append(el("span",{class:"tag",text:MODO_PT[m]||m})); });
  hd.append(el("small",{class:"muted",text:`${c.slots.length} jogadores${c.atualizado?", atualizada em "+c.atualizado.split("-").reverse().join("/"):""}`}));
  card.append(hd);
  const row=el("div",{class:"cc-row"}); const groups=[]; const idx=new Map();
  c.slots.forEach((s,i)=>{ if(idx.has(s.arma)){ groups[idx.get(s.arma)].n++; } else { idx.set(s.arma,groups.length); groups.push({s,n:1,me:false}); } if(i===hit) groups[idx.get(s.arma)].me=true; });
  groups.sort((x,y)=>(y.me-x.me)); const show=groups.slice(0,8);
  show.forEach(g=>{ const s=g.s; const sub=(s.papel&&!/^\d/.test(s.papel)?s.papel.slice(0,22):(s.tipo==="P"?"placa":s.tipo==="L"?"couro":s.tipo==="C"?"pano":"")); const t=tile(s.arma,codeName(s.arma),g.n>1?`×${g.n}`:sub); if(g.me) t.classList.add("me"); row.append(t); });
  if(groups.length>show.length) row.append(el("span",{class:"cc-more",text:`+${groups.length-show.length}`}));
  card.append(row); return card;
}
function goBuild(code){ const other=(GB||[]).find(x=>x.wc===code); if(!other) return false; bCont=""; bLine=""; bOpen=other.id; renderBuilds(); const t2=document.querySelector(".bcard.open"); if(t2) t2.scrollIntoView({block:"center",behavior:"smooth"}); return true; }
function synergyPanel(b){
  const box=el("div",{class:"bsyn"});
  if(!COMPS){ box.textContent="Abrindo as composições…"; return box; }
  box.append(el("h4",{text:"Combina com"}));
  const gs=el("div",{class:"seg sm wrap",role:"group","aria-label":"Modo de jogo"});
  MODOS.forEach(([k,t])=>{ const n=k?COMPS.comps.filter(c=>(c.modos||[]).includes(k)).length:COMPS.comps.length; const bt=el("button",{type:"button",text:k?`${t} (${n})`:t,"aria-pressed":String(bMode===k)}); if(k&&!n) bt.classList.add("dim"); bt.addEventListener("click",()=>{ bMode=k; renderBuilds(); }); gs.append(bt); });
  box.append(gs);
  const s=synergyOf(b);
  if(!s.n){ box.append(el("p",{class:"small muted",text:`Nenhuma composição ${bMode?"de "+(MODO_PT[bMode]||bMode)+" ":""}usa ${b.nome} nem outra arma da linha ${(LINE_NAME[b.l]||"outras")}. Esta build serve melhor solo ou em grupo pequeno.`})); return box; }
  const exact=s.comps.filter(x=>x.w===1).length;
  box.append(el("p",{class:"small",text:exact?`${b.nome} aparece em ${exact} de ${COMPS.comps.filter(c=>!bMode||(c.modos||[]).includes(bMode)).length} composições do Top Comps${s.comps.length>exact?`, e outras ${s.comps.length-exact} usam armas parecidas (mesma linha, contam meio ponto)`:""}. A sinergia vem de quantas vezes cada arma joga ao lado dela:`:`Nenhuma composição usa exatamente ${b.nome}, mas ${s.comps.length} usam outra arma da linha ${(LINE_NAME[b.l]||"outras")}. A sinergia vem de quantas vezes cada arma joga ao lado delas:`}));
  const roles=Object.entries(s.roles).sort((x,y)=>y[1]-x[1]);
  if(roles.length){ const rr=el("div",{class:"bc-meta"}); rr.append(el("small",{class:"muted",text:"Função nas composições:"})); roles.forEach(([r,n])=>rr.append(el("span",{class:"tag",text:`${r} ×${fmtN(n)}`}))); box.append(rr); }
  const top=Object.entries(s.partners).sort((x,y)=>y[1]-x[1]).slice(0,8);
  const row=el("div",{class:"cc-row sum"});
  for(const [arma,n] of top){ const pct=Math.round(100*n/s.n); const t=tile(arma,codeName(arma),`${fmtN(n)} de ${fmtN(s.n)} (${pct}%)`); const has=(GB||[]).some(x=>x.wc===arma); if(has){ t.classList.add("link"); t.title="Ver as builds de "+codeName(arma); t.tabIndex=0; t.addEventListener("click",()=>goBuild(arma)); t.addEventListener("keydown",e=>{ if(e.key==="Enter") goBuild(arma); }); } row.append(t); }
  box.append(row);
  const ln=Object.entries(s.lines).sort((x,y)=>y[1]-x[1]).slice(0,5);
  if(ln.length){ const lr=el("div",{class:"bc-meta"}); lr.append(el("small",{class:"muted",text:"Linhas que mais acompanham:"})); ln.forEach(([l,n])=>lr.append(el("span",{class:"tag",text:`${LINE_NAME[l]||l} ×${fmtN(n)}`}))); box.append(lr); }
  box.append(el("h4",{text:"Composições de exemplo"}));
  const list=el("div",{class:"cc-list"}); s.comps.slice(0,4).forEach(r=>list.append(compCard(r))); box.append(list);
  box.append(el("p",{class:"tiny muted",text:`Fonte: Albion Online Builds, Top Comps. Os dados são atualizados todo dia (última vez em ${COMPS.atualizado.split("-").reverse().join("/")}).`}));
  return box;
}
const GEAR_SLOTS = [["h","Elmo"],["a","Peito"],["s","Botas"],["c","Capa"],["o","Secundária"]];
function fullImg(id,cls){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id||""); if(!m) return null; const im=zimg(m[2],+m[1],+(m[3]||0),cls||"nico"); const n=codeName(m[2]); im.title=n+(m[3]?" ."+m[3]:""); im.alt=n; return im; }
function gbPrep(){
  buildIdx(); if(!GB||!W2LINE) return;
  for(const b of GB){ if(b.wc) continue; b.wc=b.w.replace(/^T\d_/,"").replace(/@\d$/,""); b.l=W2LINE[b.wc]||""; b.nome=codeName(b.wc); }
}
function gbGaps(b){ const miss=new Set(); for(const sl of ["h","a","s"]) for(const id of (b[sl]||[]).slice(0,1)){ const m=/^T\d_(?:HEAD|ARMOR|SHOES)_(PLATE|LEATHER|CLOTH)/.exec(id); const t=m&&({PLATE:"placa",LEATHER:"couro",CLOTH:"pano"})[m[1]]; if(t&&armorLv(t)<1) miss.add(t); } return [...miss]; }
function gbStrip(b){
  const row=el("div",{class:"bgear"});
  for(const [sl] of GEAR_SLOTS){ const ids=b[sl]; if(!ids||!ids.length) continue; const box=el("div",{class:"bg"}); const im=fullImg(ids[0],"nico bi"); if(im) box.append(im);
    if(ids.length>1){ const alt=el("div",{class:"bg-alt",title:"ou"}); ids.slice(1,3).forEach(i=>{ const x=fullImg(i,"nico bi-s"); if(x) alt.append(x); }); box.append(alt); } row.append(box); }
  const cons=[...(b.p||[]).slice(0,2),...(b.f||[]).slice(0,2)]; if(cons.length){ const box=el("div",{class:"bg cons"}); cons.forEach(i=>{ const x=fullImg(i,"nico bi-s"); if(x) box.append(x); }); row.append(box); }
  return row;
}
function buildCard(b){
  const open=bOpen===b.id; const wc=b.wc;
  const card=el("article",{class:"bcard"+(open?" open":"")});
  const top=el("div",{class:"bc-top"});
  const wi=fullImg(b.w,"nico zbig"); top.append(wi||el("span",{class:"btile"}));
  const mid=el("div",{class:"bc-mid"}); const h=el("h4"); h.append(b.t||b.nome); mid.append(h);
  const nv=b.l?Math.max(PF.armas[b.l]||0,spMax((PF.sp||{})["c:"+b.l])):0; const lv=b.l?wl(b.l):0;
  const meta=el("div",{class:"bc-meta"}); meta.append(el("span",{class:"tag",text:contName(b.k)}));
  if(b.l) meta.append(el("span",{class:"tag"+(lv>=2?" good":""),text:nv?`${LINE_NAME[b.l]}: nível ${nv}`:`${LINE_NAME[b.l]}: sem spec`}));
  const gaps=gbGaps(b); if(gaps.length) meta.append(el("span",{class:"tag bad",text:`Sem spec em ${gaps.join(" e ")}`}));
  (b.tg||[]).slice(0,3).forEach(t=>meta.append(el("span",{class:"tag mute",text:t})));
  mid.append(meta); top.append(mid);
  const rt=el("div",{class:"bc-r"}); rt.append(el("span",{class:"pop",text:`${b.pop} votos`})); top.append(rt); card.append(top);
  card.append(gbStrip(b));
  const btn=el("button",{type:"button",class:"bc-more","aria-expanded":String(open),text:open?"Esconder combinações":"Ver o que combina com esta build"});
  btn.addEventListener("click",()=>{ bOpen=open?null:b.id; renderBuilds(); });
  card.append(btn);
  if(open) card.append(synergyPanel(b));
  return card;
}
const contName = k => { const c=(GBC||[]).find(x=>x.k===k); return c?c.nome:k; };
let GBC = null;
function renderBuilds(){
  const host=$("bList"); if(!host) return; host.textContent="";
  if(!COMPS&&!renderBuilds._l){ renderBuilds._l=1; need("comps").then(c=>{ COMPS=c; renderBuilds(); }).catch(()=>{}); }
  if(!GB&&!renderBuilds._g){ renderBuilds._g=1; need("builds-grind").then(d=>{ GB=d.builds; GBC=d.conteudos; GB_DATE=d.atualizado; gbPrep(); renderBuilds(); }).catch(()=>{ $("bCount").textContent="As builds ainda não foram carregadas."; }); }
  if(!GB) { host.append(el("p",{class:"empty",text:"Carregando as builds…"})); return; }
  gbPrep();
  const only=$("bOnlyMine").checked;
  const cc=$("bCont"); cc.textContent="";
  const mk=(k,t,n)=>{ const b=el("button",{type:"button","aria-pressed":String(bCont===k),text:`${t} (${n})`,title:k?"Quantidade de builds salvas no site; aqui aparecem as mais votadas":""}); b.addEventListener("click",()=>{ bCont=k; bLine=""; bOpen=null; renderBuilds(); }); cc.append(b); };
  mk("","Todos",GB.length+" mais votadas"); for(const c of GBC) mk(c.k,c.nome,c.total.toLocaleString("pt-BR"));
  let list=GB.filter(b=>(!bCont||b.k===bCont)&&(!only||(b.l&&wl(b.l)>=1)));
  const present=new Set(list.map(b=>b.l));
  const grid=$("bWeapons"); grid.textContent="";
  const all=el("button",{type:"button",class:"bw all","aria-pressed":String(!bLine),text:"Todas"}); all.addEventListener("click",()=>{ bLine=""; renderBuilds(); }); grid.append(all);
  for(const [l,code] of Object.entries(LINE_ICON)){ if(!present.has(l)&&bLine!==l) continue; const b=el("button",{type:"button",class:"bw","aria-pressed":String(bLine===l),title:LINE_NAME[l]}); b.append(itemImg(code,[8,7,6,5,4,3])); b.addEventListener("click",()=>{ bLine=bLine===l?"":l; renderBuilds(); }); grid.append(b); }
  if(bLine) list=list.filter(b=>b.l===bLine);
  if(bSort==="nome") list=list.slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
  else if(bSort==="spec") list=list.slice().sort((a,b)=>((b.l?wl(b.l):0)-(a.l?wl(a.l):0))||(b.pop-a.pop));
  else list=list.slice().sort((a,b)=>b.pop-a.pop);
  $("bCount").textContent=list.length?`${list.length} ${list.length===1?"build":"builds"} · dados de ${(GB_DATE||"").split("-").reverse().join("/")}`:"";
  if(!list.length){ host.append(el("p",{class:"empty",text:only?"Nenhuma build deste conteúdo usa as armas da sua ficha. Desmarque o filtro para ver todas.":"Nenhuma build nesta seleção."})); return; }
  for(const b of list.slice(0,60)) host.append(buildCard(b));
  if(list.length>60) host.append(el("p",{class:"muted small",text:`Mostrando as 60 mais votadas de ${list.length}. Use os filtros para ver as outras.`}));
}
let GB_DATE = "";
