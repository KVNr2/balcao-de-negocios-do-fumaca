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
/* Sinergia: só conta composições que usam EXATAMENTE a arma da build. Primeiro vê em qual conteúdo (modo) ela mais aparece;
   depois, nesse conteúdo, conta quais outras armas jogam junto. Pouca amostra = nenhuma recomendação. */
const SYN_MIN_COMPS = 3, SYN_MIN_PAR = 2, SYN_MIN_PCT = 0.3;
function synergyOf(b){
  const wc=weaponOf(b); const res={wc,porModo:{},modo:"",n:0,total:0,partners:{},roles:{},comps:[],ok:false};
  if(!wc||!COMPS) return res;
  const uses=COMPS.comps.filter(c=>c.slots.some(s=>s.arma===wc));
  for(const c of uses) for(const m of (c.modos||[])) if(m) res.porModo[m]=(res.porModo[m]||0)+1;
  const best=Object.entries(res.porModo).sort((x,y)=>y[1]-x[1])[0];
  res.modo=bMode||(best?best[0]:"");
  res.total=res.modo?COMPS.comps.filter(c=>(c.modos||[]).includes(res.modo)).length:0;
  for(const c of uses){
    if(res.modo&&!(c.modos||[]).includes(res.modo)) continue;
    const hit=c.slots.findIndex(s=>s.arma===wc); res.n++; res.comps.push({c,hit,w:1});
    const r=roleOf(c.slots[hit].papel); if(r) res.roles[r]=(res.roles[r]||0)+1;
    const seen=new Set([wc]);
    c.slots.forEach(s=>{ if(seen.has(s.arma)) return; seen.add(s.arma); res.partners[s.arma]=(res.partners[s.arma]||0)+1; });
  }
  res.comps.sort((x,y)=>((TIERV[y.c.tier]||0)-(TIERV[x.c.tier]||0))||(x.c.slots.length-y.c.slots.length));
  res.ok=res.n>=SYN_MIN_COMPS;
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
  const s=synergyOf(b);
  const gs=el("div",{class:"seg sm wrap",role:"group","aria-label":"Conteúdo"});
  const chips=[["","Onde mais é usada"]].concat(MODOS.filter(m=>m[0]&&s.porModo[m[0]]).sort((x,y)=>s.porModo[y[0]]-s.porModo[x[0]]));
  chips.forEach(([k,t])=>{ const bt=el("button",{type:"button",text:k?`${t} (${s.porModo[k]})`:t,"aria-pressed":String(bMode===k)}); bt.addEventListener("click",()=>{ bMode=k; renderBuilds(); }); gs.append(bt); });
  if(chips.length>1) box.append(gs);
  const nome=codeName(s.wc);
  if(!s.modo){ box.append(el("p",{class:"small muted",text:`Nenhuma composição do Top Comps usa ${nome}. Sem dados suficientes, não há recomendação de sinergia para esta build.`})); return box; }
  const cont=MODO_PT[s.modo]||s.modo;
  if(!s.ok){ box.append(el("p",{class:"small muted",text:`${nome} aparece em apenas ${s.n} composição(ões) de ${cont}. É pouco para recomendar sinergia, então não vou sugerir nada para esta build.`})); return box; }
  box.append(el("p",{class:"small",text:`${nome} é mais usada em ${cont}: aparece em ${s.n} de ${s.total} composições. Estas são as armas que jogam com ela nessas composições:`}));
  const roles=Object.entries(s.roles).sort((x,y)=>y[1]-x[1]);
  if(roles.length){ const rr=el("div",{class:"bc-meta"}); rr.append(el("small",{class:"muted",text:"Função nas composições:"})); roles.forEach(([r,n])=>rr.append(el("span",{class:"tag",text:`${r} ×${n}`}))); box.append(rr); }
  const top=Object.entries(s.partners).filter(([,n])=>n>=SYN_MIN_PAR&&n/s.n>=SYN_MIN_PCT).sort((x,y)=>y[1]-x[1]).slice(0,8);
  if(!top.length) box.append(el("p",{class:"small muted",text:"As composições são variadas e nenhuma arma se repete o bastante ao lado dela. Sem recomendação."}));
  else {
    const row=el("div",{class:"cc-row sum"});
    for(const [arma,n] of top){ const pct=Math.round(100*n/s.n); const t=tile(arma,codeName(arma),`${n} de ${s.n} (${pct}%)`); const has=(GB||[]).some(x=>x.wc===arma); if(has){ t.classList.add("link"); t.title="Ver as builds de "+codeName(arma); t.tabIndex=0; t.addEventListener("click",()=>goBuild(arma)); t.addEventListener("keydown",e=>{ if(e.key==="Enter") goBuild(arma); }); } row.append(t); }
    box.append(row);
  }
  box.append(el("h4",{text:"Composições de exemplo"}));
  const list=el("div",{class:"cc-list"}); s.comps.slice(0,4).forEach(r=>list.append(compCard(r))); box.append(list);
  box.append(el("p",{class:"tiny muted",text:`Fonte: Albion Online Builds, Top Comps. Os dados são atualizados todo dia (última vez em ${COMPS.atualizado.split("-").reverse().join("/")}).`}));
  return box;
}
const GEAR_SLOTS = [["h","Elmo"],["a","Peito"],["s","Botas"],["c","Capa"],["o","Secundária"]];
function fullImg(id,cls,q=1){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id||""); if(!m) return null; const im=zimg(m[2],+m[1],+(m[3]||0),cls||"nico",q); const n=codeName(m[2]); im.title=n+(m[3]?" ."+m[3]:""); im.alt=n; return im; }
function gbPrep(){
  buildIdx(); if(!GB||!W2LINE) return;
  for(const b of GB){ if(b.wc) continue; b.wc=b.w.replace(/^T\d_/,"").replace(/@\d$/,""); b.l=W2LINE[b.wc]||""; b.nome=codeName(b.wc); }
}
const SPEC_MIN = 70;
/* spec da arma específica da build (não a maestria da linha): vem de PF.sp["c:linha"].s[código da arma] */
const gbSpec = b => b.l ? (+(((PF.sp||{})["c:"+b.l]||{}).s||{})[b.wc]||0) : 0;
function gbGaps(b){ const miss=new Set(); for(const sl of ["h","a","s"]) for(const id of (b[sl]||[]).slice(0,1)){ const m=/^T\d_(?:HEAD|ARMOR|SHOES)_(PLATE|LEATHER|CLOTH)/.exec(id); const t=m&&({PLATE:"placa",LEATHER:"couro",CLOTH:"pano"})[m[1]]; if(t&&armorLv(t)<1) miss.add(t); } return [...miss]; }
/* IP de cada peça embaixo do ícone; a mais baixa fica em vermelho (o que puxa a média para baixo) */
/* "Qualidade de todas as peças" sobe para a barra de controles (junto de Set e Tier) */
function qMoveTop(card){ const q=card.querySelector(".kx-qtop"), bar=card.querySelector(".kx-alb"); if(!q||!bar) return; const ref=bar.querySelector(".bc-more"); bar.insertBefore(q,ref); }
function ipApply(b){ const els=b._bipEls, parts=b._ipParts; if(!els||!parts) return; const vals=parts.filter(p=>p.slot!=="c").map(p=>Math.round(p.ip)), min=Math.min(...vals), mix=vals.some(v=>v!==min);   // a capa não ganha maestria, então nunca é "a que puxa para baixo"
  for(const k in els){ const p=parts.find(x=>x.slot===k); const e=els[k]; if(!p){ e.textContent=""; e.classList.remove("low"); continue; } const v=Math.round(p.ip); e.textContent=String(v); const low=mix&&k!=="c"&&v===min; e.classList.toggle("low",low); e.title=low?"A peça com menor IP: puxa a média da build para baixo":""; } }
function gbStrip(b){
  const row=el("div",{class:"bgear"}); b._bipEls={};
  for(const [sl] of [["w"],["o"],["h"],["a"],["s"],["c"]]){ const ids=sl==="w"?[b.w]:b[sl]; if(!ids||!ids.length||!ids[0]) continue; const box=el("div",{class:"bg"+(sl==="w"?" bg-w":"")}); const im=qImg(b,sl,ids[0],"nico bi"); if(im) box.append(im);
    const n=el("span",{class:"bg-ip"}); b._bipEls[sl]=n; box.append(n);
    if(sl!=="w"&&ids.length>1){ const alt=el("div",{class:"bg-alt",title:"ou"}); ids.slice(1,3).forEach(i=>{ const x=qImg(b,sl,i,"nico bi-s"); if(x) alt.append(x); }); box.append(alt); } row.append(box); }
  const cons=[...(b.p||[]).slice(0,2),...(b.f||[]).slice(0,2)]; if(cons.length){ const box=el("div",{class:"bg cons"}); cons.forEach(i=>{ const x=fullImg(i,"nico bi-s"); if(x) box.append(x); }); row.append(box); }
  ipApply(b); return row;
}
/* Build completa em formato de killboard: uma casa por peça, com ícone grande, nome e tier; alternativas logo abaixo. */
const KB_CONS_PT={POTION_ACID:"Poção Ácida",POTION_BERSERK:"Poção de Fúria",POTION_CLEANSE:"Poção de Purificação",POTION_CLEANSE2:"Poção de Purificação",POTION_COOLDOWN:"Poção de Recarga",POTION_ENERGY:"Poção de Energia",POTION_GATHER:"Poção de Coleta",POTION_HEAL:"Poção de Cura",POTION_LAVA:"Poção de Lava",POTION_MOB_RESET:"Poção de Reinício de Monstros",POTION_REVIVE:"Poção de Ressurreição",POTION_SLOWFIELD:"Poção Lentidão",POTION_STONESKIN:"Poção Pele de Pedra",POTION_TORNADO:"Poção Tornado",MEAL_OMELETTE:"Omelete",MEAL_OMELETTE_AVALON:"Omelete de Avalon",MEAL_OMELETTE_DRAGONAREA:"Omelete de Dragão",MEAL_OMELETTE_FISH:"Omelete de Peixe",MEAL_PIE:"Torta",MEAL_PIE_FISH:"Torta de Peixe",MEAL_ROAST:"Assado",MEAL_ROAST_FISH:"Assado de Peixe",MEAL_SANDWICH:"Sanduíche",MEAL_SANDWICH_AVALON:"Sanduíche de Avalon",MEAL_SANDWICH_FISH:"Sanduíche de Peixe",MEAL_SOUP:"Sopa",MEAL_STEW:"Ensopado",MEAL_STEW_AVALON:"Ensopado de Avalon",MEAL_STEW_FISH:"Ensopado de Peixe"};
/* nomes de itens que o dicionário de códigos não tem (ferramentas, mochilas, montarias…) vêm do catálogo, carregado sob demanda */
let CATN=null, CATN_P=null; const catLoad=()=>CATN_P||(CATN_P=need("catalog").then(c=>{ CATN=new Map(); for(const r of c.i){ const k=r[0].replace(/^T\d+_/,""); if(!CATN.has(k)) CATN.set(k,r); } return CATN; }).catch(()=>null));
const itemNome = c => { if(KB_CONS_PT[c]) return KB_CONS_PT[c]; if(CODE2EN&&CODE2EN[c]) return codeName(c); if(CATN&&CATN.has(c)){ const r=CATN.get(c); return (LANG==="en"?r[6]:r[5])||r[6]||codeName(c); } if(!CATN_P) catLoad(); return codeName(c); };
function idInfo(id){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id||""); return m?{c:m[2],t:+m[1],e:+(m[3]||0)}:null; }
const SPELL = id => `https://render.albiononline.com/v1/spell/${id}.png`;
/* nome e descrição das habilidades (data/skills.json) no idioma escolhido em "Nomes" */
let SKS=null, SKS_P=null; const skLoad=()=>SKS_P||(SKS_P=need("skills").then(d=>{ SKS=d; return d; }).catch(()=>null));
const spellName=id=>{ const v=SKS&&SKS.s[id]; return (v&&(LANG==="en"?v[2]:v[0]))||id.replace(/^PASSIVE_/,"").replace(/_/g," ").toLowerCase(); };
const spellDesc=id=>{ const v=SKS&&SKS.s[id]; return (v&&(LANG==="en"?v[3]:v[1]))||""; };
function spellTip(im,id){ const set=()=>{ const d=spellDesc(id); im.title=spellName(id)+(d?"\n\n"+d:""); }; set(); im.addEventListener("mouseenter",set); if(!SKS) skLoad().then(set); }
function spellImg(id,cls){ const im=el("img",{class:cls||"kx-sp",alt:"",loading:"lazy",decoding:"async"}); im.referrerPolicy="no-referrer"; spellTip(im,id);
  /* primeiro o arquivo local (icons/spells/ID.png, baixado pelo script), depois o render oficial do jogo */
  const fontes=[`icons/spells/${id}.png`,SPELL(id)]; let i=0; im.onerror=()=>{ if(++i<fontes.length) im.src=fontes[i]; else im.remove(); }; im.src=fontes[0]; return im; }
/* comidas, poções e capas: nome em português e o que fazem, do jogo (data/cons.json) */
let COS=null, COS_P=null; const cosLoad=()=>COS_P||(COS_P=need("cons").then(d=>{ COS=d; cosGeneric(); if(typeof CONS_PT!=="undefined") for(const k in CONS_PT) if(d.c[k]) CONS_PT[k]=d.c[k].n; return d; }).catch(()=>null));
const cosFxTxt = d => (d||"").replace(/^Condição:\s*/,"Quando: ").replace(/\n+Efeito:\s*/,"\nEfeito: ").replace(/\s+m\s+ao seu/,"m ao seu").trim();
function cosInfo(id){ if(!COS) return null; const i=idInfo(id); if(!i) return null; const base=`T${i.t}_${i.c}`;
  if(/^CAPEITEM_/.test(i.c)) return {n:COS.kn[base]||null,p:COS.k[i.c]||[]};
  if(/^(MEAL|POTION)_/.test(i.c)){ const x=COS.c[base+(i.e?`@${i.e}`:"")]||COS.c[base]; return x?{n:x.n,d:x.d}:null; }
  return null; }
/* nome genérico por código (sem "Menor" e "Maior"), usado onde só se conhece o código */
function cosGeneric(){ if(!COS) return; const by={}; for(const k in COS.c){ if(k.includes("@")) continue; const code=k.replace(/^T\d_/,""), t=+k[1], n=COS.c[k].n; if(!n) continue; if(!by[code]||t<by[code].t) by[code]={t,n}; }
  for(const code in by) KB_CONS_PT[code]=by[code].n.replace(/\s+(Menor|Maior)$/,""); }
const consNome = key => { const x=cosInfo(String(key).replace(/^(T\d_)/,"$1")); return x&&x.n||null; };
function cosFill(id,nameB,box){ const x=cosInfo(id); if(!x) return; if(x.n&&nameB) nameB.textContent=x.n; box.textContent=""; if(!box._t){ box._t=1; box.tabIndex=0; box.title="Clique para ver o texto inteiro"; box.addEventListener("click",()=>box.classList.toggle("open")); box.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); box.classList.toggle("open"); } }); }
  if(x.p){ for(const p of x.p){ const d=el("div",{class:"kx-fxi"}); d.append(el("b",{text:p.n||"Passiva da capa"})); if(p.d) d.append(el("span",{text:cosFxTxt(p.d)})); box.append(d); } if(!x.p.length) box.append(el("span",{class:"muted",text:"Capa comum, sem habilidade."})); }
  else if(x.d) box.append(el("span",{text:cosFxTxt(x.d)})); }
function kxItem(id,skills,b,slot){
  const i=idInfo(id); const row=el("div",{class:"kx-it"}); if(!i) return row;
  const im=b&&slot?qImg(b,slot,id,"nico kx-i"):fullImg(id,"nico kx-i"); if(im) row.append(im);
  const tx=el("div",{class:"kx-tx"}); const nb=el("b",{text:itemNome(i.c),title:`T${i.t}${i.e?"."+i.e:""}`}); tx.append(nb);
  if(skills&&skills.length){ const sp=el("div",{class:"kx-sps"}); skills.forEach(x=>sp.append(spellImg(x))); tx.append(sp); }
  if(/^(MEAL|POTION|CAPEITEM)_/.test(i.c)){ const fx=el("div",{class:"kx-fx"}); tx.append(fx); if(COS) cosFill(id,nb,fx); else cosLoad().then(()=>cosFill(id,nb,fx)); }
  row.append(tx); return row;
}
/* carregamento do Albion (Loadouts > Colar texto): JSON no mesmo formato que o jogo gera em "Copiar como texto" */
/* "Equivalente a TN": todas as peças passam a valer N (tier + encanto = N: T8 = 8.0, 7.1, 6.2, 5.3, 4.4; T5 = 5.0 ou 4.1; T4 = só 4.0).
   Cada peça fica no tier dela quando dá; se o tier dela passa de N, desce para TN.0; se faltam mais de 4 encantos, sobe de tier. */
function albionEquiv(id,N){ const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id||""); if(!m||!N) return {id,ok:true}; const t=+m[1]; if(t<4) return {id,ok:true};
  const nt=Math.max(Math.max(4,N-4),Math.min(t,N)), ne=N-nt; return {id:`T${nt}_${m[2]}${ne?"@"+ne:""}`,ok:true}; }
function albionLoadout(b,set,tier,qf){
  const pick=(arr,i)=>{ arr=[].concat(arr||[]).filter(Boolean); return arr[i]||arr[0]||""; };
  const w=set&&b.w2?b.w2:b.w, x=b.x||{};
  const slots=[["w",w],["o",/^T\d+_2H_/.test(w)?"":pick(b.o,set)],["h",pick(b.h,set)],["a",pick(b.a,set)],["s",pick(b.s,set)],["c",pick(b.c,set)],["gb",x.gb||""],["m",x.m||""],["p",pick(b.p,set)],["f",pick(b.f,set)]];
  const equipment=[]; let miss=0; albionLoadout.slots=[]; for(let [k,id] of slots){ if(!id) continue; const cs=b._costSel&&b._costSel[k]; if(cs&&cs.from===id) id=cs.id; else if(tier&&["w","o","h","a","s","c"].includes(k)){ const q=albionEquiv(id,tier); if(!q.ok) miss++; id=q.id; } const gear=["w","o","h","a","s","c"].includes(k), food=k==="p"||k==="f";
    const e={item:id,quality:gear&&qf?(qf(k)||1):1}; if(gear) (albionLoadout.slots=albionLoadout.slots||[]).push(k); if(k==="p") e.stack=10; e.pref=gear?[1,1,2]:food?[0,0,1,1]:[0,0,0]; equipment.push(e); }
  albionLoadout.miss=miss; return JSON.stringify({version:1,name:String(b.t||b.nome||"Build").slice(0,40)+(tier?" T"+tier:""),icon:13,color:12,equipment});
}
/* barra de ações do card: tier das peças (muda o IP, o carregamento e o custo), set, copiar e ver custo */
const QOPT=[1,2,3,4,5];
/* imagem de uma peça da build com a borda da qualidade escolhida; guardada para trocar quando a qualidade muda */
function qImg(b,slot,id,cls){ if(!"wohasc".includes(slot)) return fullImg(id,cls); const im=fullImg(id,cls,bQf(b)(slot)); if(im){ im._orig=id; (b._qi=b._qi||[]).push([slot,im]); } return im; }
/* troca qualidade e tier (equivalente) dos ícones da build conforme as escolhas */
const bQApply=b=>(b._qi||[]).forEach(([k,im])=>{ const T=b._tier||0, cs=b._costSel&&b._costSel[k], e=im._orig?(cs&&cs.from===im._orig?cs.id:albionEquiv(im._orig,T).id):null, m=e&&/^T(\d)_.+?(?:@(\d))?$/.exec(e); if(m&&im._id) im._id(+m[1],+(m[2]||0)); if(im._q) im._q(bQf(b)(k)); });
const bQ=b=>b._qs||(b._qs={a:1,p:{...(b.q||{})}});          // qualidade escolhida na build: a = todas as peças, p = peça específica (vale mais)
const bQf=b=>k=>bQ(b).p[k]||bQ(b).a;
const QCOL={1:"#b9b2a6",2:"#5fbf6a",3:"#4aa3e8",4:"#b072e8",5:"#f0b43c"}, QIP={1:0,2:20,3:40,4:60,5:100};
/* escolha de qualidade em 5 bolinhas coloridas (cor = qualidade no jogo); .value funciona como num select */
function qPick(val,label,fn){ const g=el("div",{class:"qp",role:"radiogroup","aria-label":label||"Qualidade"}), nm=el("span",{class:"qp-n"}), bs=[];
  const paint=()=>{ bs.forEach(([q,bt])=>{ const on=q===g._v; bt.classList.toggle("on",on); bt.setAttribute("aria-checked",on?"true":"false"); }); nm.textContent=QNAME[g._v]+(QIP[g._v]?" +"+QIP[g._v]:""); nm.style.color=g._v>1?QCOL[g._v]:""; };
  QOPT.forEach(q=>{ const bt=el("button",{type:"button",class:"qp-d",role:"radio",title:QNAME[q]+(QIP[q]?" (+"+QIP[q]+" de IP)":" (sem bônus)"),"aria-label":QNAME[q]}); bt.style.setProperty("--qc",QCOL[q]); bt.addEventListener("click",()=>{ if(g._v===q) return; g._v=q; paint(); if(fn) fn(q); }); bs.push([q,bt]); g.append(bt); });
  g.append(nm); g._v=+val||1; Object.defineProperty(g,"value",{get:()=>String(g._v),set:v=>{ g._v=+v||1; paint(); }}); paint(); return g; }
const qSelect=(val,todas,label)=>{ const x=el("select",{class:"kx-q","aria-label":label||"Qualidade"}); if(todas) x.append(el("option",{value:"0",text:"= todas"})); QOPT.forEach(q=>x.append(el("option",{value:String(q),text:QNAME[q]}))); x.value=String(val); return x; };
/* custo da build direto na aba: compra tudo numa cidade, na qualidade escolhida, e usa o equivalente mais barato (T8 = 8.0, 7.1, 6.2, 5.3, 4.4) */
/* preços das peças da build: média do histórico de vendas na cidade escolhida, dos últimos 7 dias; se não houver venda, dos últimos 30 dias.
   Ficam à parte do BMP, para não misturar com as outras abas. */
const BLD_P={}, BLD_F={};
async function bldFetch(ids,city){
  const todo=[...new Set(ids)].filter(id=>!BLD_F[`${id}|${city}`]||Date.now()-BLD_F[`${id}|${city}`]>6*36e5);
  const loc=encodeURIComponent(city), t7=Date.now()-7*864e5, t30=Date.now()-30*864e5;
  for(let i=0;i<todo.length;i+=20){ const part=todo.slice(i,i+20);
    const j=await apiJSON(`${HOST}/api/v2/stats/history/${part.join(",")}.json?locations=${loc}&time-scale=24`,360);
    for(const x of j){ const k=`${x.item_id}|${city}|${+x.quality||1}`; let n7=0,v7=0,n30=0,v30=0;
      for(const d of (x.data||[])){ const t=Date.parse(d.timestamp+"Z"), n=d.item_count||0; if(!(d.avg_price>0)||!n) continue; if(t>=t30){ n30+=n; v30+=d.avg_price*n; } if(t>=t7){ n7+=n; v7+=d.avg_price*n; } }
      BLD_P[k]={p7:n7?v7/n7:0,p30:n30?v30/n30:0}; }
    for(const id of part) BLD_F[`${id}|${city}`]=Date.now(); }
}
/* d = 7 pede só a média de 7 dias; d = 30 aceita a de 30 dias */
const bldPrice=(id,c,q,d)=>{ const r=BLD_P[`${id}|${c}|${q}`]; if(!r) return null; if(d===7) return r.p7?{p:r.p7,d:7}:null; return r.p30?{p:r.p30,d:30}:null; };
let BLD_CITY=(()=>{ try{ const c=localStorage.getItem("bldCity"); return c&&c!=="auto"?c:"Caerleon"; }catch(e){ return "Caerleon"; } })();
const BLD_PANELS=new Set();
let BLD_TIER=(()=>{ try{ const t=+localStorage.getItem("bldTier"); return t>=4&&t<=8?t:0; }catch(e){ return 0; } })();   // tier escolhido vale para todas as builds e não se perde ao abrir o card
function costPanel(b,get,ui){
  const box=el("div",{class:"bld-cost"}); const cs=el("select",{"aria-label":"Cidade de compra",title:"Cidade de referência: o valor é a média de vendas dos últimos 7 dias nela (30 dias se não houver)"});
  SHOP_LOCS.forEach(c=>cs.append(el("option",{value:c,text:c}))); cs.value=BLD_CITY;
  const out=el("span",{class:"bld-tot",role:"status","aria-live":"polite"});
  const row=(cap,x)=>{ const l=el("label",{class:"bld-row"}); l.append(el("span",{class:"bld-k",text:cap}),x); return l; };
  const ts=ui.tsel; box.append(row("Tier",ts)); if(ui.sel) box.append(row("Set",ui.sel)); box.append(row("Custo em",cs),out,ui.btn,ui.msg);
  let seen=false, run=0;
  box._upd=async(force)=>{ if(!seen&&!force) return; seen=true; const my=++run; const {set,tier,qf}=get(); const pick=arr=>{ arr=[].concat(arr||[]).filter(Boolean); return arr[set]||arr[0]||""; };
    const w=set&&b.w2?b.w2:b.w; const base=[["w",w],["o",/^T\d+_2H_/.test(w)?"":pick(b.o)],["h",pick(b.h)],["a",pick(b.a)],["s",pick(b.s)],["c",pick(b.c)]].filter(x=>x[1]);
    const cons=[pick(b.p),pick(b.f)].filter(Boolean);
    const gear=base.map(([k,id])=>{ const m=idInfo(id); if(!m) return null; const sum=tier||Math.min(12,m.t+m.e); return {k,src:id,code:m.c,q:qf(k)||1,groups:[m.t<4?[[m.t,m.e]]:bcEquivs(sum)]}; }).filter(Boolean);
    const idOf=(g,t,e)=>`T${t}_${g.code}`+(e?`@${e}`:"");
    out.classList.add("load"); out.textContent="…";
    const ids=[...new Set([...gear.flatMap(g=>g.groups.flat().map(([t,e])=>idOf(g,t,e))),...cons])];
    try{ await bldFetch(ids,BLD_CITY); }catch(err){ if(my===run){ out.classList.remove("load"); out.textContent="sem preço agora"; } return; }
    if(my!==run) return;
    /* só equivalentes do tier pedido (T8 = 8.0, 7.1, 6.2, 5.3, 4.4), na cidade escolhida: média de 7 dias; sem ela, média de 30 dias. Nada de outra cidade nem de tier abaixo */
    const find=(g,d)=>{ let best=null; for(const [t,e] of g.groups[0]){ const r=bldPrice(idOf(g,t,e),BLD_CITY,g.q,d); if(r&&(!best||r.p<best.p)) best={...r,t,e}; } return best; };
    const sel=gear.map(g=>({g,x:find(g,7)||find(g,30)}));
    b._costSel={}; for(const {g,x} of sel) if(x) b._costSel[g.k]={from:g.src,id:idOf(g,x.t,x.e)}; bQApply(b);
    const pr=id=>{ const r=bldPrice(id,BLD_CITY,1,7)||bldPrice(id,BLD_CITY,1,30); return r?r.p:null; };
    let tot=0, miss=0, old=0; const tip=[], names=[];
    for(const {g,x} of sel){ const nm=itemNome(g.code);
      if(x){ tot+=x.p; if(x.d===30) old++; tip.push(`${nm} T${x.t}${x.e?"."+x.e:""}: ${fmt(x.p)} (média de ${x.d} dias)`); }
      else { miss++; names.push(nm); tip.push(`${nm}: sem vendas em ${BLD_CITY} nos últimos 30 dias`); } }
    for(const id of cons){ const p=pr(id), ii=idInfo(id), cx=cosInfo(id); if(p) tot+=p; tip.push(`${(cx&&cx.n)||itemNome(ii.c)}: ${p?fmt(p):"sem preço"}`); }
    out.classList.remove("load"); out.textContent=""; out.title=tip.join("\n");
    if(!tot){ out.textContent="sem preço nesta cidade"; return; }
    out.append(el("b",{text:fmt(tot)}),document.createTextNode(" prata"));
    const wn=[]; if(miss) wn.push(`faltam ${miss}`); if(old) wn.push(`${old} com média de 30 dias`);
    if(wn.length) out.append(el("span",{class:"bld-warn",text:wn.join(" · "),title:(miss?`Sem vendas em ${BLD_CITY} nos últimos 30 dias: ${names.join(", ")}. O total não inclui.\n`:"")+"Passe o mouse no valor para ver peça por peça."}));
  };
  cs.addEventListener("change",()=>{ BLD_CITY=cs.value; try{ localStorage.setItem("bldCity",BLD_CITY); }catch(e){} BLD_PANELS.forEach(p=>p._sync()); });
  box._sync=()=>{ cs.value=BLD_CITY; box._upd(); }; BLD_PANELS.add(box);
  const start=()=>{ if(!seen){ seen=true; box._upd(); } };
  if("IntersectionObserver" in window){ const io=new IntersectionObserver(es=>{ if(es.some(e=>e.isIntersecting)) start(); }); io.observe(box); } else start();
  cosLoad().then(()=>{ if(seen) box._upd(); });
  return box;
}
function albionBar(b,badge,costValue,opts){
  const bar=el("div",{class:"kx-alb"}); let set=b._set||0, tier=BLD_TIER, setSel=null; const qf=bQf(b);
  const refresh=()=>{ b._tier=tier; if(badge) badge._upd(set,tier,qf); bQApply(b); if(b._cost) b._cost._upd(); }; b._refresh=refresh;
  const hasAlt=!!(b.w2||[b.o,b.h,b.a,b.s,b.c,b.p,b.f].some(a=>a&&a[1]));
  if(hasAlt){ const sel=el("select",{"aria-label":"Set"}); sel.append(el("option",{value:"0",text:"Set 1 (recomendado)"}),el("option",{value:"1",text:"Set 2 (alternativa)"})); sel.addEventListener("change",()=>{ set=+sel.value; b._set=set; refresh(); }); sel.value=String(set); setSel=sel; }
  const tsel=el("select",{"aria-label":"Tier das peças"});
  tsel.append(el("option",{value:"0",text:"Tier original"})); [4,5,6,7,8].forEach(t=>tsel.append(el("option",{value:String(t),text:`T${t} equivalente`}))); tsel.value=String(tier); tsel.title="O tier vale para o IP, o custo, os ícones e o texto copiado ao Albion. Cada peça usa o equivalente mais barato (T8 = 8.0, 7.1, 6.2, 5.3 ou 4.4).";
  tsel.addEventListener("change",()=>{ tier=+tsel.value; BLD_TIER=tier; try{ localStorage.setItem("bldTier",String(tier)); }catch(e){} refresh(); });
  if(opts&&opts.qBar){ const ql=el("label",{class:"alb-tier",title:"Qualidade das peças: muda o IP e o texto copiado ao Albion. Bom +20, Excepcional +40, Excelente +60, Obra-prima +100 de IP por peça."}); const qs=qSelect(bQ(b).a,false,"Qualidade das peças"); qs.addEventListener("change",()=>{ bQ(b).a=+qs.value; refresh(); }); ql.append(qs); bar.append(ql); }
  const btn=el("button",{type:"button",class:"bc-more",text:"Copiar para o Albion",title:"Copia o carregamento com o tier escolhido. No jogo: Loadouts > Colar texto (ou Começar da área de transferência)."});
  const msg=el("span",{class:"bld-msg muted small",role:"status"});
  btn.addEventListener("click",async()=>{ if(b._cost){ msg.textContent="Calculando as peças…"; try{ await b._cost._upd(true); }catch(e){} msg.textContent=""; } const t=albionLoadout(b,set,tier,qf); try{ await navigator.clipboard.writeText(t); msg.textContent="Copiado. No jogo, abra Loadouts e use Colar texto."; }catch(e){ const ta=el("textarea",{readonly:"",rows:"4"}); ta.value=t; bar.append(ta); ta.select(); msg.textContent="Copie o texto abaixo e cole em Loadouts no jogo."; } });
  const cp=costPanel(b,()=>({set,tier,qf}),{tsel,sel:setSel,btn,msg}); b._cost=cp; (opts&&opts.costHost||bar).append(cp);
  refresh(); return bar;
}
function kbPanel(b){
  const sk=b.sk||{}; const box=el("div",{class:"kx"});
  /* esquerda: habilidades e passivas, recomendado x alternativa */
  const L=el("section",{class:"kx-l"}); L.append(el("h4",{text:"Peças, habilidades e passivas"}));
  const qsl=[];   // seletores por peça, para atualizar quando muda o geral
  const qtop=el("div",{class:"kx-qtop"}); { const qa=qPick(bQ(b).a,"Qualidade de todas as peças",q=>{ bQ(b).a=q; bQ(b).p={}; qsl.forEach(([k,x])=>{ x.value=String(q); }); if(b._refresh) b._refresh(); });
    qtop.append(el("span",{class:"kx-qt",text:"Qualidade (todas)"}),qa,el("small",{class:"muted",text:"Aplica a todas as peças. Para mudar só uma, use as bolinhas dela na lista."})); }
  L.append(qtop);
  const hd=el("div",{class:"kx-cols kx-hd"}); hd.append(el("span",{class:"kx-rec",text:"★ Recomendado"}),el("span",{text:"Alternativa"})); L.append(hd);
  const rows=[["w",[b.w,b.w2].filter(Boolean),sk.w?[sk.w,sk.w2||[]]:[]],["o",b.o,[]],["h",b.h,sk.h||[]],["a",b.a,sk.a||[]],["s",b.s,sk.s||[]],["c",b.c,[]],["p",b.p,[]],["f",b.f,[]]];
  rows.forEach(([k,ids,skl])=>{ if(!ids||!ids.length||!ids[0]) return; const r=el("div",{class:"kx-cols"});
    const first=kxItem(ids[0],skl[0],b,k);
    if("wohasc".includes(k)){ const x=qPick(bQf(b)(k),"Qualidade: "+itemNome((idInfo(ids[0])||{}).c||""),q=>{ bQ(b).p[k]=q; if(b._refresh) b._refresh(); }); qsl.push([k,x]); const tx=first.querySelector(".kx-tx"); (tx||first).append(x); }
    r.append(first); r.append(ids[1]?kxItem(ids[1],skl[1],b,k):el("div")); L.append(r); });
  box.append(L);
  /* direita: visão geral no formato do killboard (3 colunas) */
  const R=el("section",{class:"kx-r"}); R.append(el("h4",{text:"Visão geral"}));
  const g=el("div",{class:"kx-g"});
  [null,["h",b.h,sk.h&&sk.h[0]],["c",b.c],["w",[b.w],sk.w],["a",b.a,sk.a&&sk.a[0]],["o",b.o],["p",b.p],["s",b.s,sk.s&&sk.s[0]],["f",b.f]].forEach(c=>{
    const cell=el("div",{class:"kx-c"+(c?"":" vazio")}); const ids=c&&c[1];
    if(ids&&ids[0]){ const im=qImg(b,c[0],ids[0],"nico kx-big"); if(im) cell.append(im);
      const sl=c[2]; if(sl&&sl.length){
        /* 4 habilidades (arma): coluna à esquerda do ícone; com 2 ou 3, embaixo */
        const lado=sl.length>=4; const sp=el("div",{class:"kx-ov"+(lado?" kx-left":"")}); sl.forEach(x=>sp.append(spellImg(x,"kx-sm"))); cell.append(sp); } }
    g.append(cell); });
  R.append(g); box.append(R);
  if(b.x&&Object.keys(b.x).length){ const X=el("section",{class:"kx-x"}); X.append(el("h4",{text:"Extras"})); const xg=el("div",{class:"kx-xg"});
    [["t","Ferramenta"],["gh","Chapéu de coleta"],["ga","Traje de coleta"],["gs","Botas de coleta"],["gk","Mochila de coleta"],["gb","Bolsa"],["m","Montaria"]].forEach(([k,lab])=>{ const id=b.x[k]; if(!id) return; const i=idInfo(id); if(!i) return; const it=el("div",{class:"kx-xi"}); const im=fullImg(id,"nico kx-i"); if(im) it.append(im); const tx=el("div",{class:"kx-tx"}); const nb=el("b",{text:itemNome(i.c),title:`T${i.t}${i.e?"."+i.e:""}`}); tx.append(el("small",{class:"muted",text:lab}),nb); it.append(tx); xg.append(it);
      need("catalog").then(c=>{ const bare=id.replace(/@\d$/,""); const r=c.i.find(z=>z[0]===bare)||c.i.find(z=>z[0].endsWith("_"+i.c)); if(r){ const n=(LANG==="en"?r[6]:r[5])||r[6]; if(n) nb.textContent=n; } }).catch(()=>{}); });
    X.append(xg); box.append(X); }
  return box;
}
function buildCard(b){
  const open=bOpen===b.id; const wc=b.wc;
  b._qi=[]; const card=el("article",{class:"bcard"+(open?" open":"")});
  const top=el("div",{class:"bc-top"});
  const wi=qImg(b,"w",b.w,"nico zbig"); top.append(wi||el("span",{class:"btile"}));
  const mid=el("div",{class:"bc-mid"}); const h=el("h4"); h.append(b.t||b.nome); mid.append(h);
  const nv=gbSpec(b); const lv=nv>=SPEC_MIN?3:nv>0?2:0;
  const meta=el("div",{class:"bc-meta"}); meta.append(el("span",{class:"tag",text:contName(b.k)}));
  if(b.l) meta.append(el("span",{class:"tag"+(lv>=2?" good":""),text:nv?`${b.nome}: spec ${nv}`:`${b.nome}: sem spec`}));
  const gaps=gbGaps(b); if(gaps.length) meta.append(el("span",{class:"tag bad",text:`Sem spec em ${gaps.join(" e ")}`}));
  (b.tg||[]).slice(0,3).forEach(t=>meta.append(el("span",{class:"tag mute",text:t})));
  mid.append(meta); top.append(mid);
  const ib=albionBadge(b); const rt=el("div",{class:"bc-r"}); rt.append(ib,el("span",{class:"pop",text:`${b.pop} votos`})); top.append(rt); card.append(top);
  card.append(gbStrip(b));
  const btn=el("button",{type:"button",class:"bc-more bc-tog","aria-expanded":String(open),text:open?"Fechar ▴":"Abrir ▾"});
  btn.addEventListener("click",()=>{ bOpen=open?null:b.id; renderBuilds(); });
  const act=el("div",{class:"bc-act"}); act.append(btn,albionBar(b,ib,"g:"+b.id,{costHost:rt})); card.append(act);
  if(open){ card.append(kbPanel(b)); qMoveTop(card); }
  return card;
}
const CONT_EXTRA = {COLETA:"Coleta"};   // tipos de conteúdo que só existem nas Nossas builds
const contName = k => { const c=(GBC||[]).find(x=>x.k===k); return c?c.nome:(CONT_EXTRA[k]||k); };
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
  let list=GB.filter(b=>(!bCont||b.k===bCont)&&(!only||gbSpec(b)>=SPEC_MIN));
  const present=new Set(list.map(b=>b.l));
  const grid=$("bWeapons"); grid.textContent="";
  const all=el("button",{type:"button",class:"bw all","aria-pressed":String(!bLine),text:"Todas"}); all.addEventListener("click",()=>{ bLine=""; renderBuilds(); }); grid.append(all);
  for(const [l,code] of Object.entries(LINE_ICON)){ if(!present.has(l)&&bLine!==l) continue; const b=el("button",{type:"button",class:"bw","aria-pressed":String(bLine===l),title:LINE_NAME[l]}); b.append(itemImg(code,[8,7,6,5,4,3])); b.addEventListener("click",()=>{ bLine=bLine===l?"":l; renderBuilds(); }); grid.append(b); }
  if(bLine) list=list.filter(b=>b.l===bLine);
  if(bSort==="nome") list=list.slice().sort((a,b)=>a.nome.localeCompare(b.nome,"pt"));
  else if(bSort==="spec") list=list.slice().sort((a,b)=>(gbSpec(b)-gbSpec(a))||(b.pop-a.pop));
  else list=list.slice().sort((a,b)=>b.pop-a.pop);
  $("bCount").textContent=list.length?`${list.length} ${list.length===1?"build":"builds"} · dados de ${(GB_DATE||"").split("-").reverse().join("/")}`:"";
  if(!list.length){ host.append(el("p",{class:"empty",text:only?"Nenhuma build deste conteúdo usa uma arma sua com spec 70 ou mais. Desmarque o filtro para ver todas.":"Nenhuma build nesta seleção."})); return; }
  const pg=pgSlice("bList",list,[bCont,bLine,only,bSort].join("|"),renderBuilds);
  for(const b of pg.items) host.append(buildCard(b));
  host.append(pg.bar);
}
let GB_DATE = "";
