/* ================= Builds: "Builds da comunidade" x "Nossas builds" (pasta builds/) ================= */
let nbLine=[], NB_REPO=null, NB_ALL=[], nbOpen=null, nbCont=[], nbSort="votos", nbSrc="com", nbView="build", nbBackComp=null;
try{ nbView=store.get("nb:view")==="comp"?"comp":"build"; }catch(e){}
const NB_EXTRAS=[["gb","Bolsa"],["m","Montaria"]];
const NB_SLOTS=[["w","Arma"],["o","Secundária"],["h","Elmo"],["a","Peito"],["s","Botas"],["c","Capa"],["p","Poção"],["f","Comida"]];
function nbMine(){ try{ return JSON.parse(store.get("nb:mine")||"[]"); }catch(e){ return []; } }
function nbSaveMine(a){ try{ store.set("nb:mine",JSON.stringify(a)); }catch(e){} }
function nbVotes(){ try{ return new Set(JSON.parse(store.get("nb:votes")||"[]")); }catch(e){ return new Set(); } }
let NB_CFG=null, NB_CLOUD=false;
const nbVoter=()=>{ let v=""; try{ v=store.get("nb:voter"); if(!v){ v=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now()); store.set("nb:voter",v); } }catch(e){} return v||"anon"; };
const nbApi=(path,o={})=>fetch(NB_CFG.url.replace(/\/$/,"")+"/rest/v1/"+path,{...o,headers:{apikey:NB_CFG.key,Authorization:"Bearer "+NB_CFG.key,"Content-Type":"application/json",...(o.headers||{})}});
function nbVote(id){ const v=nbVotes(); v.has(id)?v.delete(id):v.add(id); try{ store.set("nb:votes",JSON.stringify([...v])); }catch(e){} }
/* composição = um grupo de builds publicadas como uma entrada só. Vive na mesma tabela das builds (data.tipo = "comp"). */
const nbIsComp = b => !!b && (b.tipo==="comp" || (!b.w && Array.isArray(b.p) && Array.isArray(b.o)));
const nbMembers = c => [].concat((c&&c.p)||[],(c&&c.o)||[]);
const nbResolve = m => { const id=typeof m==="string"?m:m&&m.id; return (NB_ALL||[]).find(b=>b.id===id&&!nbIsComp(b))||(typeof m==="object"?m:null); };
function nbPrepBuild(b){
  if(!b||nbIsComp(b)) return;
  if(!b.wc&&b.w){ b.wc=b.w.replace(/^T\d_/,"").replace(/@\d$/,""); b.l=(typeof W2LINE!=="undefined"&&W2LINE[b.wc])||""; }
  if(!b.nome) b.nome=b.t||codeName(b.wc||"");
}
function nbPrepAll(){
  try{ buildIdx(); }catch(e){}
  (NB_ALL||[]).forEach(b=>{ nbPrepBuild(b); if(nbIsComp(b)) nbMembers(b).forEach(nbPrepBuild); });
}
function nbConts(b){
  if(nbIsComp(b)) return [...new Set([...(b.ks||[]),...nbMembers(b).flatMap(m=>nbConts(nbResolve(m))).filter(Boolean)])];
  return (b.ks&&b.ks.length)?b.ks:[b.k||""];
}
const nbCompIntervalo = c => { const min=Math.max(1,+c.min||1), max=Math.max(min,+c.max||min); return min===max?`${min} ${min===1?"jogador":"jogadores"}`:`${min} a ${max} jogadores`; };
const nbCompLinhas = c => [...new Set(nbMembers(c).map(m=>{ const b=nbResolve(m); return b&&b.l; }).filter(Boolean))];
async function nbLoad(){
  if(NB_REPO) return;
  NB_REPO=[]; try{ NB_CFG=await need("nuvem"); NB_CLOUD=!!(NB_CFG.url&&NB_CFG.key); }catch(e){ NB_CLOUD=false; }
  if(NB_CLOUD){ try{ const [rb,rv,rm]=await Promise.all([nbApi("nb_builds?select=id,data&order=created_at.desc&limit=300"),nbApi("rpc/nb_totais",{method:"POST",body:"{}"}),nbApi("rpc/nb_meus_votos",{method:"POST",body:JSON.stringify({p_voter:nbVoter()})})]);
      if(!rb.ok) throw 0; const bs=await rb.json(), tot={}; (rv.ok?await rv.json():[]).forEach(x=>tot[x.build_id]=x.n);
      const mine=rm.ok?(await rm.json()).map(x=>typeof x==="string"?x:x.nb_meus_votos||x.build_id):[]; try{ store.set("nb:votes",JSON.stringify(mine)); }catch(e){}
      NB_REPO=bs.map(x=>({...x.data,id:x.id,votos:tot[x.id]||0,cloud:true})); nbRefreshAll(); return; }catch(e){ NB_CLOUD=false; NB_REPO=[]; } }
  try{ const r=await fetch(`builds/index.json?v=${VER}`); const idx=r.ok?await r.json():[];
    const all=await Promise.all(idx.map(f=>fetch(`builds/${f}?v=${VER}`).then(x=>x.ok?x.json():null).catch(()=>null)));
    NB_REPO=all.filter(b=>b&&b.id&&(b.w||nbIsComp(b))).map(b=>({...b,repo:true})); }catch(e){}
  nbRefreshAll();
}
function nbRefreshAll(){ NB_ALL=[...(NB_REPO||[]),...nbMine().filter(m=>!(NB_REPO||[]).some(r=>r.id===m.id)).map(b=>({...b,local:true}))]; nbPrepAll(); window.NB_ALL=NB_ALL; }
nbRefreshAll();
const nbVotesOf=b=>b.cloud?(+b.votos||0):(+b.votos||0)+(nbVotes().has(b.id)?1:0);

function nbVoteBtn(b){
  const voted=nbVotes().has(b.id), vb=el("button",{type:"button",class:"nb-vote"+(voted?" on":""),"aria-pressed":String(voted),title:voted?"Tirar meu voto":"Votar nesta "+(nbIsComp(b)?"composição":"build")});
  vb.append(el("span",{class:"nb-arrow",text:"▲"}),el("b",{text:String(nbVotesOf(b))}),el("small",{text:"votos"}));
  vb.addEventListener("click",async()=>{ const had=nbVotes().has(b.id); nbVote(b.id);
    if(b.cloud){ b.votos=Math.max(0,(+b.votos||0)+(had?-1:1)); nbRender(); try{ /* o código de quem votou é segredo: votar e tirar voto só pelas funções do banco (24/11) */
      await nbApi(had?"rpc/nb_tirar_voto":"rpc/nb_votar",{method:"POST",body:JSON.stringify({p_build:b.id,p_voter:nbVoter()})}); }catch(e){} }
    else nbRender(); });
  return vb;
}
async function nbPublicar(b,bt){
  bt.disabled=true; bt.textContent="Publicando…";
  try{ const o=JSON.parse(nbJson(b)); const r=await nbApi("nb_builds",{method:"POST",body:JSON.stringify({id:b.id,data:o}),headers:{Prefer:"return=minimal"}});
    if(!r.ok) throw 0; nbSaveMine(nbMine().filter(x=>x.id!==b.id)); NB_REPO=null; await nbLoad(); nbRender(); }
  catch(e){ bt.disabled=false; bt.textContent="Falhou, tentar de novo"; }
}
function nbAcoesLocais(b,act){
  if(!b.local) return;
  const nome=nbIsComp(b)?"composição":"build";
  const dl=el("button",{type:"button",class:"bc-more",text:"Baixar arquivo"}); dl.addEventListener("click",()=>nbExport(b));
  const cp=el("button",{type:"button",class:"bc-more",text:"Copiar código"}); cp.addEventListener("click",()=>{ navigator.clipboard&&navigator.clipboard.writeText(nbJson(b)); cp.textContent="Copiado"; setTimeout(()=>cp.textContent="Copiar código",1500); });
  const rm=el("button",{type:"button",class:"bc-more nb-del",text:"Apagar"}); rm.addEventListener("click",()=>{ if(!confirm(`Apagar esta ${nome} do seu navegador?`)) return; nbSaveMine(nbMine().filter(x=>x.id!==b.id)); nbRefreshAll(); nbRender(); });
  if(NB_CLOUD) act.append(rm); else act.append(dl,cp,rm);
  if(NB_CLOUD){ const pb=el("button",{type:"button",class:"bc-more nb-new",text:"Publicar para todos"}); pb.addEventListener("click",()=>nbPublicar(b,pb)); act.prepend(pb); }
}
function nbCard(b){
  const open=nbOpen===b.id, card=el("article",{class:"bcard"+(open?" open":"")});
  const top=el("div",{class:"bc-top"}); const wi=fullImg(b.w,"nico zbig"); top.append(wi||el("span",{class:"btile"}));
  const mid=el("div",{class:"bc-mid"}); mid.append(el("h4",{text:b.t}));
  const meta=el("div",{class:"bc-meta"}); nbConts(b).slice(0,3).forEach(k=>meta.append(el("span",{class:"tag",text:k?contName(k):"Outro"}))); if(nbConts(b).length>3) meta.append(el("span",{class:"tag mute",text:"+"+(nbConts(b).length-3)})); meta.append(el("span",{class:"tag mute",text:"por "+(b.au||"Balcão do Fumaça")}));
  { const t=gbSpecTag(b); if(t) meta.append(t); const gaps=gbGaps(b); if(gaps.length) meta.append(el("span",{class:"tag bad",text:`Sem spec em ${gaps.join(" e ")}`})); }
  if(b.local) meta.append(el("span",{class:"tag bad",text:"Só no seu navegador"}));
  (b.tg||[]).slice(0,3).forEach(t=>meta.append(el("span",{class:"tag mute",text:t}))); mid.append(meta); top.append(mid);
  const ib=albionBadge(b); const rt=el("div",{class:"bc-r"}); rt.append(ib,nbVoteBtn(b)); top.append(rt); card.append(top);
  if(b.desc) card.append(el("p",{class:"nb-desc small",text:b.desc}));
  card.append(gbStrip(b));
  const btn=el("button",{type:"button",class:"bc-more bc-tog","aria-expanded":String(open),text:open?"Fechar ▴":"Abrir ▾"});
  btn.addEventListener("click",()=>{ nbOpen=open?null:b.id; nbRender(); });
  const act=el("div",{class:"bc-act"}); act.append(btn,albionBar(b,ib,"n:"+b.id,{costHost:card}));
  if(nbBackComp&&nbOpen===b.id){ const vb=el("button",{type:"button",class:"bc-more",text:"← Voltar para a composição"}); vb.addEventListener("click",nbVoltarComp); act.append(vb); }
  nbAcoesLocais(b,act);
  card.append(act); if(open){ card.append(kbPanel(b)); qMoveTop(card); } return card;
}
/* ---------- composições em "Nossas builds" ---------- */
function nbCompTexto(c){
  const linha=(m,i)=>{ const b=nbResolve(m); if(!b) return `${i+1}. (build que saiu da lista)`;
    const nm=x=>x&&x[0]?itemNome(x[0].replace(/^T\d_/,"").replace(/@\d$/,"")):"";
    return `${i+1}. ${b.t||b.nome||""}: ${[b.wc&&codeName(b.wc),nm(b.h),nm(b.a),nm(b.s)].filter(Boolean).join(", ")}`; };
  let t=`${c.t} (${nbCompIntervalo(c)})\nPrincipais:\n${(c.p||[]).map(linha).join("\n")||"(nenhuma ainda)"}`;
  if((+c.max||1)>(+c.min||1)) t+=`\nOpcionais, se tiver mais gente:\n${(c.o||[]).map(linha).join("\n")||"(nenhuma ainda)"}`;
  return t;
}
function nbVerBuild(m,voltar){
  const b=nbResolve(m); if(!b||!b.id) return;
  nbView="build"; nbBackComp=voltar||null; try{ store.set("nb:view",nbView); }catch(e){}
  nbCont=[]; nbLine=[]; nbOpen=b.id; nbRender();
  setTimeout(()=>{ const c=document.querySelector("#nbBox .bcard.open"); if(c) c.scrollIntoView({behavior:"smooth",block:"start"}); },60);
}
function nbVoltarComp(){
  const id=nbBackComp; nbBackComp=null; nbView="comp"; try{ store.set("nb:view",nbView); }catch(e){}
  nbCont=[]; nbLine=[]; nbOpen=id; nbRender();
}
function nbAbrirBuild(m,c){
  const b=nbResolve(m), bt=el("button",{type:"button",class:"bc-more",text:"Ver build sozinha"});
  bt.disabled=!b||!b.id; bt.title=b&&b.id?"Abrir esta build na lista de builds":"Esta build não está mais na lista";
  bt.addEventListener("click",()=>nbVerBuild(m,c&&c.id)); return bt;
}
function nbCompCard(c){
  const open=nbOpen===c.id, card=el("article",{class:"bcard nb-comp"+(open?" open":"")});
  const top=el("div",{class:"bc-top"}); const primeiro=nbResolve(nbMembers(c)[0]);
  const wi=primeiro&&primeiro.w?fullImg(primeiro.w,"nico zbig"):null;
  top.append(wi||el("span",{class:"btile nb-cmp-ic",text:"≡"}));
  const mid=el("div",{class:"bc-mid"}); mid.append(el("h4",{text:c.t}));
  const meta=el("div",{class:"bc-meta"});
  nbConts(c).slice(0,3).forEach(k=>meta.append(el("span",{class:"tag",text:k?contName(k):"Outro"})));
  if(nbConts(c).length>3) meta.append(el("span",{class:"tag mute",text:"+"+(nbConts(c).length-3)}));
  meta.append(el("span",{class:"tag",text:nbCompIntervalo(c)}),el("span",{class:"tag mute",text:`${nbMembers(c).length} builds`}),el("span",{class:"tag mute",text:"por "+(c.au||"Balcão do Fumaça")}));
  if(c.local) meta.append(el("span",{class:"tag bad",text:"Só no seu navegador"}));
  (c.tg||[]).slice(0,3).forEach(t=>meta.append(el("span",{class:"tag mute",text:t}))); mid.append(meta); top.append(mid);
  const rt=el("div",{class:"bc-r"}); rt.append(nbVoteBtn(c)); top.append(rt); card.append(top);
  if(c.desc) card.append(el("p",{class:"nb-desc small",text:c.desc}));
  const res=el("div",{class:"nb-cp-res"}); nbMembers(c).slice(0,8).forEach(m=>{ const b=nbResolve(m), t=el("div",{class:"nb-cp-tile"}); const im=b&&b.w?fullImg(b.w,"nico"):null; if(im) t.append(im); t.append(el("small",{text:b?(b.t||b.nome||""):"Build indisponível"})); res.append(t); });
  if(nbMembers(c).length>8) res.append(el("span",{class:"cc-more",text:`+${nbMembers(c).length-8}`})); card.append(res);
  const btn=el("button",{type:"button",class:"bc-more bc-tog","aria-expanded":String(open),text:open?"Fechar ▴":"Abrir composição ▾"});
  btn.addEventListener("click",()=>{ nbOpen=open?null:c.id; nbRender(); });
  const cp=el("button",{type:"button",class:"bc-more",text:"Copiar para a party"});
  cp.addEventListener("click",async()=>{ try{ await navigator.clipboard.writeText(nbCompTexto(c)); cp.textContent="Copiado"; }catch(e){ cp.textContent="Não deu para copiar"; } setTimeout(()=>cp.textContent="Copiar para a party",1800); });
  const act=el("div",{class:"bc-act"}); act.append(btn,cp);
  if(c.local&&!NB_CLOUD){ const ed=el("button",{type:"button",class:"bc-more",text:"Editar"}); ed.addEventListener("click",()=>nbFormComp(c)); act.append(ed); }
  nbAcoesLocais(c,act); card.append(act);
  if(open){ const det=el("div",{class:"nb-cp-det"});
    const grupo=(tit,ids,dica)=>{ const s=el("section",{class:"nb-cp-gr"}); s.append(el("h5",{text:tit}),el("small",{class:"muted",text:dica}));
      const l=el("div",{class:"nb-cp-vagas"}); (ids||[]).forEach((m,i)=>{ const b=nbResolve(m), v=el("div",{class:"nb-cp-vaga"});
        const im=b&&b.w?fullImg(b.w,"nico"):null; v.append(el("span",{class:"cj-n",text:String(i+1)}),im||el("span",{class:"btile"}),el("div",{class:"cj-tx"},el("b",{text:b?(b.t||b.nome||""):"Build que saiu da lista"}),el("small",{class:"muted",text:b?[b.wc&&codeName(b.wc),contName(b.k)].filter(Boolean).join(", "):""})),nbAbrirBuild(m,c)); l.append(v); });
      s.append(l); return s; };
    det.append(grupo("Principais",c.p,`Com ${c.min||1} ${(+c.min||1)===1?"jogador":"jogadores"}, vão estas.`));
    if((+c.max||1)>(+c.min||1)) det.append(grupo("Opcionais",c.o,"Entram na ordem, conforme chega mais gente."));
    card.append(det); }
  return card;
}
const nbJson=b=>{ const o={...b}; delete o.local; delete o.repo; delete o.cloud; delete o.votos; delete o._qs; delete o._qi; delete o._refresh; return JSON.stringify(o,null,2); };
function nbExport(b){ const a=el("a",{href:URL.createObjectURL(new Blob([nbJson(b)],{type:"application/json"})),download:b.id+".json"}); document.body.append(a); a.click(); a.remove();
  alert("Arquivo baixado. Para publicar: coloque-o na pasta builds/ do site e acrescente o nome em builds/index.json (veja builds/LEIA-ME.md)."); }

/* importar do Albion: lê o texto "Copiar como texto" do Loadouts (JSON com equipment) e devolve o que o formulário usa */
/* texto fixo do próprio site com negrito/teclas (nunca recebe dado de fora) */
const nbRich=(tag,cls,h)=>{ const e=el(tag,cls?{class:cls}:{}); e.innerHTML=h; return e; };
function nbParseAlbion(txt){
  let o; try{ o=JSON.parse(String(txt||"").trim()); }catch(e){ return null; }
  if(!o||typeof o!=="object"||!Array.isArray(o.equipment)||!o.equipment.length) return null;
  const sel={}, q={}; let ok=0;
  for(const e of o.equipment){ const id=e&&e.item, m=/^T\d+_(.+?)(?:@\d)?$/.exec(id||""); if(!m) continue; const c=m[1]; let k=null;
    if(/^(MAIN|2H)_/.test(c)) k="w"; else if(/^OFF_/.test(c)) k="o"; else if(/^HEAD_/.test(c)) k="h"; else if(/^ARMOR_/.test(c)) k="a"; else if(/^SHOES_/.test(c)) k="s"; else if(/^CAPEITEM|^BACKPACK|_BACKPACK_/.test(c)) k="c";
    else if(/^BAG/.test(c)) k="gb"; else if(/^MOUNT_/.test(c)) k="m"; else if(/^POTION_/.test(c)) k="p"; else if(/^MEAL_/.test(c)) k="f";
    if(k&&!sel[k]){ sel[k]=id; ok++; const qq=Math.round(+e.quality); if("wohasc".includes(k)&&qq>=2&&qq<=5) (q[k]=qq); } }
  if(!ok||!sel.w) return null;
  if(/^T\d+_2H_/.test(sel.w)){ delete sel.o; delete q.o; }
  return {t:String(o.name||"").trim().slice(0,80),sel,q};
}
async function nbImportAlbion(bar){
  const host=bar.parentNode; host.querySelectorAll(".nb-warn,.nb-imp").forEach(x=>x.remove());
  const anc=host.querySelector(".nb-how")||bar; const warn=el("div",{class:"nb-warn",role:"alert"}); anc.after(warn);
  const falha=(msg)=>{ warn.textContent=""; warn.append(el("b",{text:msg}),el("span",{text:" No jogo, abra Loadouts, clique em \"Copiar como texto\" e depois clique em \"Importar do Albion\" de novo."})); };
  const painel=()=>{ warn.remove(); const p=el("section",{class:"nb-imp","aria-label":"Importar do Albion"});
    p.append(el("h4",{text:"Importar do Albion"}),
      nbRich("ol","","<li>No jogo, abra <b>Loadouts</b> e escolha o loadout.</li><li>Clique em <b>Copiar como texto</b>.</li><li>Cole o texto na caixa abaixo (<kbd>Ctrl</kbd>+<kbd>V</kbd>). A importação começa sozinha.</li>"));
    const ta=el("textarea",{rows:"4",placeholder:"Cole aqui o texto copiado do Loadouts do Albion","aria-label":"Texto do Loadouts do Albion"}); const msg=el("p",{class:"nb-imp-msg",role:"status"});
    const go=()=>{ const r=nbParseAlbion(ta.value); if(r) nbForm(r); else if(ta.value.trim()){ msg.textContent="Esse texto não é uma build do Albion. Confira se copiou com \"Copiar como texto\" no Loadouts."; msg.className="nb-imp-msg bad"; } };
    ta.addEventListener("paste",()=>setTimeout(go,0));
    const ok=el("button",{type:"button",class:"bc-more nb-new",text:"Importar"}); ok.addEventListener("click",go);
    const no=el("button",{type:"button",class:"bc-more",text:"Cancelar"}); no.addEventListener("click",()=>p.remove());
    const row=el("div",{class:"nb-imp-act"}); row.append(ok,no); p.append(ta,msg,row); anc.after(p); ta.focus(); };
  let txt=""; try{ txt=await navigator.clipboard.readText(); }catch(e){ return painel(); }
  if(!txt.trim()) return falha("A área de transferência está vazia.");
  const p=nbParseAlbion(txt); if(!p) return falha("O texto copiado não é uma build do Albion.");
  warn.remove(); nbForm(p);
}
function nbRender(){
  const box=$("nbBox"); if(!box) return; box.textContent=""; if(!nbRender._l){ nbRender._l=1; nbLoad().then(()=>nbRender()); catLoad().then(()=>nbRender()); } nbRefreshAll();
  const bar=el("div",{class:"nb-bar"});
  const view=el("div",{class:"seg nb-view",role:"group","aria-label":"O que mostrar"});
  [["build","Builds"],["comp","Composições"]].forEach(([v,t])=>{ const b=el("button",{type:"button","aria-pressed":String(nbView===v),text:t}); b.addEventListener("click",()=>{ nbView=v; nbBackComp=null; try{ store.set("nb:view",v); }catch(e){} nbCont=[]; nbLine=[]; nbOpen=null; nbRender(); }); view.append(b); });
  const mk=el("button",{type:"button",class:"bc-more"+(nbView==="build"?" nb-new":""),text:"+ Criar build"}); mk.addEventListener("click",()=>{ nbBackComp=null; nbForm(); });
  const mc=el("button",{type:"button",class:"bc-more"+(nbView==="comp"?" nb-new":""),text:"+ Criar composição"}); mc.addEventListener("click",()=>{ nbBackComp=null; nbFormComp(); });
  const sort=el("select",{"aria-label":"Ordem"}); [["votos","Mais votadas"],["novas","Mais novas"]].forEach(([v,t])=>sort.append(el("option",{value:v,text:t}))); sort.value=nbSort; sort.addEventListener("change",()=>{ nbSort=sort.value; nbRender(); });
  const cnt=el("span",{class:"muted small",id:"nbCount"});
  bar.append(view,mk,mc);
  if(nbView==="build"){ const alb=el("button",{type:"button",class:"bc-more",text:"Importar do Albion",title:"Lê o texto copiado do Loadouts do Albion e abre a criação da build já preenchida"}); alb.addEventListener("click",()=>nbImportAlbion(bar)); bar.append(alb); }
  box.append(bar);
  if(nbView==="build") box.append(nbRich("p","muted small nb-how","<b>Importar uma build do Albion:</b> no jogo, abra <b>Loadouts</b>, escolha o loadout e clique em <b>Copiar como texto</b>. Volte aqui, clique em <b>Importar do Albion</b>, dê um nome, escolha o conteúdo e salve."));
  nbPrepAll();
  const base=NB_ALL.filter(b=>(nbView==="comp")===nbIsComp(b));
  const used=new Map(); base.forEach(b=>nbConts(b).forEach(k=>used.set(k,(used.get(k)||0)+1)));
  const cc=el("div"); msel(cc,{label:"Conteúdo",all:`Todos (${base.length})`,opts:[...used.keys()].map(k=>({k,t:k?contName(k):"Outro",n:used.get(k)})),sel:nbCont,onChange:x=>{ nbCont=x; nbLine=[]; nbOpen=null; nbRender(); }}); if(base.length){ const rc=el("div",{class:"row-ctl"}); rc.append(cc); box.append(rc); }
  const wg=el("div",{class:"bweapons",role:"group","aria-label":"Filtrar por arma"}); const inCont=base.filter(b=>!nbCont.length||nbConts(b).some(k=>nbCont.includes(k)));
  { const nl=new Map(); inCont.forEach(b=>{ (nbIsComp(b)?nbCompLinhas(b):[b.l]).filter(Boolean).forEach(l=>nl.set(l,(nl.get(l)||0)+1)); });
    const present=new Set(inCont.flatMap(b=>nbIsComp(b)?nbCompLinhas(b):[b.l]).filter(Boolean));
    msel(wg,{label:"Arma",all:"Todas",opts:Object.entries(LINE_ICON).filter(([l])=>present.has(l)||nbLine.includes(l)).map(([l,code])=>({k:l,t:LINE_NAME[l]||l,n:nl.get(l)||0,ic:()=>itemImg(code,[8,7,6,5,4,3])})),sel:nbLine,onChange:x=>{ nbLine=x; nbOpen=null; nbRender(); }}); }
  if(base.length){ const bf=el("div",{class:"bfilters"}), sr=el("div",{class:"bsortrow"}), lb=el("label",{class:"f"}); lb.append("Ordem",sort); sr.append(lb,cnt); bf.append(wg,sr); box.append(bf); }
  const ord=a=>a.slice().sort((x,y)=>nbSort==="novas"?String(y.data||"").localeCompare(String(x.data||"")):(nbVotesOf(y)-nbVotesOf(x)));
  const flt=a=>a.filter(b=>(!nbCont.length||nbConts(b).some(k=>nbCont.includes(k)))&&(!nbLine.length||nbLine.includes(b.l)||(nbIsComp(b)&&nbCompLinhas(b).some(l=>nbLine.includes(l)))));
  const sec=(title,sub,list,empty)=>{ const s=el("section",{class:"nb-sec"}); s.append(el("h3",{class:"orn",text:title}),el("p",{class:"muted small",text:sub})); const l=el("div",{class:"blist"}); if(!list.length) l.append(el("p",{class:"empty",text:empty})); const pg=pgSlice("nb:"+nbView+":"+title,list,[nbCont,nbLine,nbSort].join("|"),nbRender); pg.items.forEach(b=>l.append(nbIsComp(b)?nbCompCard(b):nbCard(b))); s.append(l,pg.bar); box.append(s); };
  const publicadas=flt(base.filter(b=>b.repo||b.cloud)), minhas=flt(base.filter(b=>b.local));
  if(nbView==="build"){
    sec("Nossas builds",(NB_CLOUD?"Builds publicadas por todos que usam o site. Seu voto conta para todo mundo, um por navegador.":"Escolhidas pelo Balcão do Fumaça. A contagem de votos vem do arquivo da build; o seu voto soma +1 só para você."),ord(publicadas),NB_REPO?(base.length?"Nenhuma build nesta seleção. Troque o conteúdo ou a arma acima.":"Ainda não há builds publicadas. Seja o primeiro: clique em \"+ Criar build\" ou em \"Importar do Albion\"."):"Carregando…");
    if(minhas.length) sec("Suas builds",(NB_CLOUD?"Salvas só neste navegador porque a publicação falhou. Clique em Publicar para todos.":"Salvas só neste navegador. Baixe o arquivo e envie para a pasta builds/ do site para publicar."),ord(minhas),"");
  } else {
    sec("Nossas composições",(NB_CLOUD?"Composições publicadas por todos que usam o site. Abra uma para ver as builds de dentro e votar na composição.":"Composições escolhidas pelo Balcão do Fumaça. Abra uma para ver as builds de dentro."),ord(publicadas),NB_REPO?(base.length?"Nenhuma composição nesta seleção. Troque o conteúdo ou a arma acima.":"Ainda não há composições publicadas. Clique em \"+ Criar composição\" para juntar várias builds numa entrada só."):"Carregando…");
    if(minhas.length) sec("Suas composições",(NB_CLOUD?"Salvas só neste navegador porque a publicação falhou. Clique em Publicar para todos.":"Salvas só neste navegador. Baixe o arquivo e envie para a pasta builds/ do site para publicar."),ord(minhas),"");
  }
  const n=flt(base).length; cnt.textContent=n?`${n} ${n===1?(nbView==="comp"?"composição":"build"):(nbView==="comp"?"composições":"builds")}`:"";
}
const nbId=t=>(t||"build").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"-"+Math.random().toString(36).slice(2,6);

/* ---------- formulário de criação ---------- */
let NB_CAT=null, NB_REFRESH=null, NB_IDS=null;
const NB_FILTER={ t:r=>r[1]==="gathering"&&/_TOOL_/.test(r[0]), gh:r=>r[1]==="gathering"&&/_HEAD_GATHERER_/.test(r[0]), ga:r=>r[1]==="gathering"&&/_ARMOR_GATHERER_/.test(r[0]), gs:r=>r[1]==="gathering"&&/_SHOES_GATHERER_/.test(r[0]), gk:r=>r[1]==="gathering"&&/_BACKPACK_GATHERER_/.test(r[0]), gb:r=>r[1]==="bags", m:r=>r[1]==="mounts",
  /* itens de coleta entram nas peças a que pertencem: ferramenta = arma, chapéu/traje/botas = elmo/peito/botas, mochila = capa */
  w:r=>r[1]==="weapons"||(r[1]==="gathering"&&/_TOOL_/.test(r[0])), o:r=>r[1]==="offhands", h:r=>r[1]==="head"||(r[1]==="gathering"&&/_HEAD_GATHERER_/.test(r[0])), a:r=>r[1]==="armors"||(r[1]==="gathering"&&/_ARMOR_GATHERER_/.test(r[0])), s:r=>r[1]==="shoes"||(r[1]==="gathering"&&/_SHOES_GATHERER_/.test(r[0])), c:r=>(r[1]==="capes"&&r[2]!=="other")||(r[1]==="gathering"&&/_BACKPACK_GATHERER_/.test(r[0])), p:r=>r[1]==="consumables"&&r[2]==="potions", f:r=>r[1]==="consumables"&&r[2]==="food" };
async function nbForm(pre){ if(!nbSrc||nbSrc!=="nos") return;
  /* tela própria dentro da aba, com botão para voltar à lista */
  const host=$("nbBox"); host.textContent=""; const dlg={close:()=>{ nbRender(); const a=$("p-builds"); if(a) a.scrollIntoView({block:"start"}); }};
  const body=el("div",{class:"nb-form"}); host.append(body);
  const back=el("button",{type:"button",class:"bc-more nb-back",text:"← Voltar para as builds"}); back.addEventListener("click",()=>dlg.close());
  body.append(back,el("h3",{class:"orn",text:"Criar build"})); window.scrollTo({top:0,behavior:"smooth"});
  if(!NB_CAT){ body.append(el("p",{class:"muted small",text:"Abrindo o catálogo de itens…"})); try{ NB_CAT=await need("catalog"); await catLoad(); }catch(e){ body.textContent="Não consegui abrir o catálogo."; return; } body.lastChild.remove(); }
  let curPick=null; const SETS=[{sel:{},sk:{}},{sel:{},sk:{}}]; let cs=0, sel=SETS[0].sel; const fld=(lab,node)=>{ const l=el("label",{class:"nb-f"}); l.append(el("span",{text:lab}),node); return l; };
  if(pre) Object.assign(SETS[0].sel,pre.sel);
  const nome=el("input",{type:"text",maxlength:"80",placeholder:"Ex.: Lamina Aclarada para Fame Farm"}), au=el("input",{type:"text",maxlength:"40",placeholder:"Seu nome"}); try{ au.value=store.get("nbAuthor")||""; }catch(e){} if(pre&&pre.t) nome.value=pre.t;
  /* conteúdo: várias opções; características: etiquetas que aparecem no cartão */
  /* caixa de seleção múltipla (estilo SelectCheckboxMenu): botão com resumo, painel com marcar todos, filtro e lista de caixas */
  const msel=(opts,{max,ph})=>{ const st=new Set(), box=el("div",{class:"ms"}), tr=el("button",{type:"button",class:"ms-tr","aria-haspopup":"listbox","aria-expanded":"false"}), val=el("span",{class:"ms-val"}); tr.append(val,el("span",{class:"ms-ar",text:"▾","aria-hidden":"true"}));
    const pn=el("div",{class:"ms-pn",hidden:true}), hd=el("div",{class:"ms-hd"}), all=el("input",{type:"checkbox","aria-label":"Selecionar todos",title:"Selecionar todos"}), q=el("input",{type:"search",placeholder:"Filtrar…","aria-label":"Filtrar"}), x=el("button",{type:"button",class:"ms-x","aria-label":"Fechar",text:"✕"}), ul=el("div",{class:"ms-ul",role:"listbox"});
    if(max) all.hidden=true; hd.append(all,q,x); pn.append(hd,ul); box.append(tr,pn);
    const lab=v=>(opts.find(o=>o[0]===v)||[0,v])[1];
    const paint=()=>{ val.textContent=""; if(!st.size) val.append(el("span",{class:"ms-ph",text:ph})); else { [...st].slice(0,3).forEach(v=>val.append(el("span",{class:"ms-chip",text:lab(v)}))); if(st.size>3) val.append(el("span",{class:"ms-chip mute",text:"+"+(st.size-3)})); } all.checked=st.size===opts.length&&opts.length>0; };
    const vis=()=>{ const f=q.value.trim().toLowerCase(); return opts.filter(o=>!f||o[1].toLowerCase().includes(f)); };
    const list=()=>{ ul.textContent=""; vis().forEach(([v,t])=>{ const row=el("label",{class:"ms-it"}), cb=el("input",{type:"checkbox"}); cb.checked=st.has(v); cb.disabled=!st.has(v)&&!!max&&st.size>=max; cb.addEventListener("change",()=>{ if(cb.checked) st.add(v); else st.delete(v); paint(); list(); }); row.append(cb,el("span",{text:t})); ul.append(row); }); if(!ul.children.length) ul.append(el("p",{class:"muted small ms-no",text:"Nada encontrado."})); if(max) ul.append(el("p",{class:"muted small ms-no",text:`${st.size} de ${max} no máximo`})); };
    all.addEventListener("change",()=>{ vis().forEach(([v])=>{ if(all.checked) st.add(v); else st.delete(v); }); paint(); list(); });
    q.addEventListener("input",list);
    const open=o=>{ pn.hidden=!o; tr.setAttribute("aria-expanded",String(o)); if(o){ q.value=""; list(); q.focus({preventScroll:true}); } };
    tr.addEventListener("click",()=>open(pn.hidden)); x.addEventListener("click",()=>{ open(false); tr.focus(); });
    document.addEventListener("click",ev=>{ if(!box.isConnected||pn.hidden||box.contains(ev.target)) return; open(false); });
    box.addEventListener("keydown",ev=>{ if(ev.key==="Escape"&&!pn.hidden){ ev.stopPropagation(); open(false); tr.focus(); } });
    paint(); return {st,box}; };
  const K=msel((GBC||[]).map(c=>[c.k,c.nome]).concat(Object.entries(CONT_EXTRA)).concat([["","Outro"]]),{ph:"Selecione um ou mais conteúdos…"}), T=msel(["PvE","PvP","Solo","Grupo","Fame Farm","Tank","Healer","DPS","Suporte","Mobilidade"].map(x=>[x,x]),{max:6,ph:"Selecione até 6 características…"});
  const ds=el("textarea",{rows:"3",maxlength:"400",placeholder:"Como jogar, rotação, observações…"});
  const g1=el("div",{class:"nb-g"}); g1.append(fld("Nome da build",nome),fld("Autor",au),); body.append(g1); { const l1=el("div",{class:"nb-f nb-wide"}); l1.append(el("span",{text:"Conteúdo (escolha um ou mais)"}),K.box); const l2=el("div",{class:"nb-f nb-wide"}); l2.append(el("span",{text:"Características (opcional, aparecem como etiquetas no cartão)"}),T.box); body.append(l1,l2); } body.append(fld("Descrição",ds));
  body.append(el("h4",{text:"Peças e habilidades"}),el("p",{class:"muted small",text:"Clique em uma casa para escolher a peça e as habilidades dela. Use Set 1 / Set 2 para montar uma alternativa (no Set 2 só a mão secundária muda)."}));
  let SKD={i:{},s:{}}; try{ SKD=await skLoad()||SKD; }catch(e){}
  let sk=SETS[0].sk; const setBar=el("div",{class:"seg nb-sets",role:"group","aria-label":"Set"}); const wrap=el("div",{class:"nb-vg"}); const grid=el("div",{class:"kx-g nb-kg"}); const pick=el("div",{class:"nb-pick"}); const exBox=el("div",{class:"nb-ex"}); wrap.append(grid); const qBox=el("section",{class:"nb-q"}); const QS={}; if(pre&&pre.q) Object.assign(QS,pre.q); body.append(setBar,wrap,qBox,exBox,pick);
  const code=id=>String(id||"").replace(/^T\d+_/,"").replace(/@\d$/,"");
  /* todas as habilidades que a peça realmente tem no jogo (data/skills.json, gerado do ao-bin-dumps) */
  const spellOpts=(s,id)=>{ const o=(SKD.i||{})[code(id)]; return o||[]; };
  const POS={w:["Q","W","E","Passiva"]}; const posLab=(s,i)=>s==="w"?POS.w[i]:(i?"Passiva":"Habilidade");
  const is2h=()=>/^T\d+_2H_/.test(SETS[0].sel.w||"");   // a arma é sempre a do Set 1
  const drawSets=()=>{ setBar.textContent=""; SETS.forEach((st,i)=>{ const n=Object.keys(st.sel).length; const b=el("button",{type:"button","aria-pressed":String(cs===i),text:i?`Set 2 (outra secundária)${n?" · "+n:""}`:`Set 1 (recomendado)${n?" · "+n:""}`}); b.addEventListener("click",()=>{ cs=i; sel=SETS[i].sel; sk=SETS[i].sk; curPick=null; pick.textContent=""; draw(); drawSets(); }); setBar.append(b); });
    if(cs===1) setBar.append(el("span",{class:"muted small nb-sethint",text:"No Set 2 as peças são iguais às do Set 1; só a mão secundária pode mudar (e a ferramenta, se a arma do Set 1 for de coleta)."})); };
  const draw=()=>{ grid.textContent=""; [null,"h","c","w","a","o","p","s","f"].forEach(s=>{ if(s==="o"&&is2h()){ const off=el("button",{type:"button",class:"kx-c nb-cell nb-off",disabled:true,title:"Arma de 2 mãos ocupa a secundária"}); off.append(el("span",{class:"nb-plus",text:"⛔"}),el("small",{text:"Arma de 2 mãos"})); grid.append(off); return; } if(s&&s!=="o"&&cs===1&&!(s==="w"&&/_TOOL_/.test(SETS[0].sel.w||""))){ const w1=SETS[0].sel[s], lk=el("button",{type:"button",class:"kx-c nb-cell nb-lock",disabled:true,title:"Igual ao Set 1: no Set 2 só a mão secundária muda"});
      if(w1){ const im=fullImg(w1,"nico kx-big"); if(im) lk.append(im); const l=(SETS[0].sk[s]||[]).filter(Boolean); if(l.length){ const ov=el("div",{class:"kx-ov"+(s==="w"?" kx-left":"")}); l.forEach(v=>ov.append(spellImg(v,"kx-sm"))); lk.append(ov); } lk.append(el("span",{class:"nb-lk",text:"🔒 Igual ao Set 1"})); }
      else lk.append(el("span",{class:"nb-plus",text:"🔒"}),el("small",{text:"Defina no Set 1"}));
      grid.append(lk); return; }
      const cell=el("button",{type:"button",class:"kx-c nb-cell"+(s?"":" vazio")+(s&&!sel[s]?" nb-add":"")}); if(!s){ grid.append(cell); cell.disabled=true; return; }
      const lab=NB_SLOTS.find(x=>x[0]===s)[1]; cell.title=lab;
      if(sel[s]){ const im=fullImg(sel[s],"nico kx-big"); if(im) cell.append(im); if(["w","h","a","s"].includes(s)&&spellOpts(s,sel[s]).some(x=>x.length)){ const n=s==="w"?4:2, ov=el("div",{class:"kx-ov"+(s==="w"?" kx-left":"")}); for(let i=0;i<n;i++){ const v=(sk[s]||[])[i]; if(v) ov.append(spellImg(v,"kx-sm")); else ov.append(el("span",{class:"nb-spph",text:"+",title:posLab(s,i)})); } cell.append(ov); } }
      else cell.append(el("span",{class:"nb-plus",text:"+"}),el("small",{text:lab}));
      if(sel[s]){ const x=el("span",{class:"nb-x",role:"button",tabindex:"0",title:"Remover "+lab.toLowerCase(),"aria-label":"Remover "+lab.toLowerCase(),text:"✕"});
        const rm=ev=>{ ev.stopPropagation(); ev.preventDefault(); delete sel[s]; delete sk[s]; if(cs===0&&s==="w") delete SETS[1].sel.w; if(curPick&&curPick[0]===s){ curPick=null; pick.textContent=""; } draw(); };
        x.addEventListener("click",rm); x.addEventListener("keydown",ev=>{ if(ev.key==="Enter"||ev.key===" ") rm(ev); }); cell.append(x); }
      cell.addEventListener("click",()=>openPick(s,lab)); grid.append(cell); }); drawSets(); drawEx(); drawQ(); };
  /* qualidade de cada peça de equipamento (vale para os dois sets); "todas" aplica a todas de uma vez */
  const drawQ=()=>{ qBox.textContent=""; const ks=["w","o","h","a","s","c"].filter(k=>SETS[0].sel[k]&&!(k==="o"&&is2h())); if(!ks.length) return;
    qBox.append(el("h4",{text:"Qualidade e encantamento das peças"}),el("p",{class:"muted small",text:"Qualidade (quadradinhos, cor da borda): Normal por padrão; muda o IP e o que vai ao Albion ao copiar. Encantamento (bolinhas .0 a .4): troca o encanto da peça escolhida."}));
    if(!NB_IDS&&NB_CAT) NB_IDS=new Set(NB_CAT.i.map(r=>r[0]));
    const enOf=k=>(idInfo(SETS[0].sel[k])||{e:0}).e, hasEn=(k,e)=>{ const m=idInfo(SETS[0].sel[k]); return !!m&&(!NB_IDS||NB_IDS.has(`T${m.t}_${m.c}${e?"@"+e:""}`)); };
    const setEn=(k,e)=>{ if(!hasEn(k,e)) return false; SETS.forEach((st,i)=>{ if(i&&k==="o") return; const m=idInfo(st.sel[k]); if(m) st.sel[k]=`T${m.t}_${m.c}${e?"@"+e:""}`; }); return true; };
    const offUnavail=(g,ks)=>{ [...g.querySelectorAll(".ep-d")].forEach((bt,e)=>{ if(!ks.some(k=>hasEn(k,e))){ bt.disabled=true; bt.title="Sem esse encantamento nesta peça"; } }); };
    const all0=el("div",{class:"nb-qr nb-qa"}); const eAll=ePick(ks.every(k=>enOf(k)===enOf(ks[0]))?enOf(ks[0]):-1,"Encantamento de todas as peças",e=>{ if(e<0) e=0; ks.forEach(k=>setEn(k,e)); draw(); });
    offUnavail(eAll,ks); all0.append(el("b",{text:"Encantamento de todas"}),eAll); qBox.append(all0);
    const rows=[]; const all=el("div",{class:"nb-qr nb-qa"}); const apick=qPick(ks.every(k=>(QS[k]||1)===(QS[ks[0]]||1))?(QS[ks[0]]||1):1,"Qualidade de todas as peças",q=>{ ks.forEach(k=>{ QS[k]=q; }); rows.forEach(([k,x])=>{ x.value=String(q); }); });
    all.append(el("b",{text:"Todas as peças"}),apick); qBox.append(all);
    ks.forEach(k=>{ const id=SETS[0].sel[k], i=idInfo(id)||{c:""}; const r=el("div",{class:"nb-qr"}); const im=fullImg(id,"nico nb-qi",QS[k]||1); const x=qPick(QS[k]||1,"Qualidade: "+itemNome(i.c),q=>{ QS[k]=q; if(im&&im._q) im._q(q); }); rows.push([k,x]); const ex=ePick(enOf(k),"Encantamento: "+itemNome(i.c),e=>{ if(e<0) e=0; setEn(k,e); draw(); }); offUnavail(ex,[k]); if(im) r.append(im); r.append(el("span",{class:"nb-qn",text:itemNome(i.c)}),x,ex); qBox.append(r); }); };
  /* coleta e extras: ferramenta, set de coleta, bolsa e montaria (iguais nos dois sets; edite no Set 1) */
  const drawEx=()=>{ exBox.textContent=""; exBox.append(el("h4",{text:"Extras"}),el("p",{class:"muted small",text:cs===1?"Iguais ao Set 1.":"Bolsa e montaria. São as mesmas nos dois sets."}));
    const row=el("div",{class:"nb-exg"}); NB_EXTRAS.forEach(([x,lab])=>{ const id=SETS[0].sel[x]; const c=el("button",{type:"button",class:"nb-xc"+(id?" on":"")+(cs===1?" nb-lock2":""),title:lab,disabled:cs===1});
      if(id){ const im=fullImg(id,"nico nb-xi"); if(im) c.append(im); const cn=el("small",{text:itemNome(idInfo(id).c)}); c.append(cn); if(NB_CAT){ const bare=id.replace(/@\d$/,""); const r=NB_CAT.i.find(z=>z[0]===bare)||NB_CAT.i.find(z=>z[0].endsWith("_"+idInfo(id).c)); if(r) cn.textContent=(LANG==="en"?r[6]:r[5])||r[6]||cn.textContent; } if(cs!==1){ const rx=el("span",{class:"nb-x nb-x2",role:"button",tabindex:"0",title:"Remover "+lab.toLowerCase(),"aria-label":"Remover "+lab.toLowerCase(),text:"✕"}); const rm=ev=>{ ev.stopPropagation(); ev.preventDefault(); delete SETS[0].sel[x]; if(curPick&&curPick[0]===x){ curPick=null; pick.textContent=""; } draw(); }; rx.addEventListener("click",rm); rx.addEventListener("keydown",ev=>{ if(ev.key==="Enter"||ev.key===" ") rm(ev); }); c.append(rx); } }
      else c.append(el("span",{class:"nb-plus",text:"+"}),el("small",{text:lab}));
      c.addEventListener("click",()=>openPick(x,lab)); row.append(c); }); exBox.append(row); };
  const openPick=(s,lab)=>{ curPick=[s,lab]; pick.textContent=""; if(matchMedia("(max-width:1100px)").matches) pick.scrollIntoView({block:"nearest",behavior:"smooth"}); const q=el("input",{type:"search",placeholder:`Buscar ${lab.toLowerCase()}…`}), t=el("select",{"aria-label":"Tier"}), e=el("select",{"aria-label":"Encantamento"}), res=el("div",{class:"nb-res"}), spk=el("div",{class:"nb-sk"});
    (["p","f"].includes(s)?[1,2,3,4,5,6,7,8]:[2,3,4,5,6,7,8]).forEach(n=>t.append(el("option",{value:n,text:"T"+n}))); t.value="8"; (["p","f"].includes(s)?[0,1,2,3]:[0,1,2,3,4]).forEach(n=>e.append(el("option",{value:n,text:n?"."+n:"sem encanto"})));
    const head=el("div",{class:"nb-ph"}); head.append(el("b",{text:lab}),q,t,e); if(sel[s]){ const cl=el("button",{type:"button",class:"bc-more",text:"Remover peça"}); cl.addEventListener("click",()=>{ delete sel[s]; delete sk[s]; pick.textContent=""; draw(); }); head.append(cl); }
    const ok=el("button",{type:"button",class:"bc-more",text:"Fechar"}); ok.addEventListener("click",()=>{ pick.textContent=""; }); head.append(ok); pick.append(head,res,spk);
    const drawSk=()=>{ spk.textContent=""; if(!sel[s]||!["w","h","a","s"].includes(s)) return; const o=spellOpts(s,sel[s]); if(!o.some(x=>x.length)){ if(!/GATHERER|_TOOL_/.test(sel[s])) spk.append(el("p",{class:"muted small",text:"Não tenho a lista de habilidades desta peça."})); return; }
      spk.append(el("b",{class:"small",text:"Escolha as habilidades"}));
      o.forEach((list,i)=>{ if(!list.length) return; const grp=el("div",{class:"nb-skg"}); grp.append(el("h5",{class:"nb-skl",text:posLab(s,i)+(s==="w"&&i<3?" (habilidade "+(i+1)+")":"")}));
        const cards=el("div",{class:"nb-skc"}); list.forEach(v=>{ const inf=(SKD.s||{})[v]||[]; const nome=spellName(v), desc=spellDesc(v);
          const b=el("button",{type:"button",class:"nb-skcard"+((sk[s]||[])[i]===v?" on":""),"aria-pressed":String((sk[s]||[])[i]===v)}); const ic=el("span",{class:"nb-skic"}); ic.append(spellImg(v,"kx-sm"));
          const tx=el("span",{class:"nb-sktx"}); tx.append(el("b",{text:nome}),el("small",{text:desc}));
          b.append(ic,tx); b.addEventListener("click",()=>{ sk[s]=sk[s]||[]; sk[s][i]=sk[s][i]===v?undefined:v; draw(); drawSk(); }); cards.append(b); });
        grp.append(cards); spk.append(grp); }); };
    drawSk();
    const rows=NB_CAT.i.filter(r=>NB_FILTER[s](r)&&/^T\d_/.test(r[0])&&(!(s==="w"&&cs===1)||r[1]==="gathering")); const by=new Map(); for(const r of rows){ const c=r[0].replace(/^T\d+_/,""), key=(s==="p"||s==="f")?r[0]:c; if(!by.has(key)) by.set(key,{c,nome:LANG==="en"?r[6]:r[5],en:r[6],pt:r[5],tiers:new Set(),ench:0,sub:r[1]==="gathering"?"gather":r[2],mat:(/^(cloth|leather|plate)_/.exec(r[2])||[])[1]||(r[1]==="gathering"?"gather":"")}); const o=by.get(key); o.tiers.add(r[3]); if(r[4]) o.ench=1; }
    const list=[...by.values()].filter(o=>o.pt&&o.en).sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
    let mat=""; const matBar=el("div",{class:"seg nb-mat",role:"group","aria-label":"Material"});
    const drawMat=()=>{ matBar.textContent=""; [["","Todos"],["cloth","Tecido"],["leather","Couro"],["plate","Placa"],["gather","Coleta"]].forEach(([k,t2])=>{ const b2=el("button",{type:"button","aria-pressed":String(mat===k),text:t2}); b2.addEventListener("click",()=>{ mat=k; drawMat(); show(); }); matBar.append(b2); }); };
    if(["h","a","s"].includes(s)){ drawMat(); pick.insertBefore(matBar,res); }
    let sub=""; const subs=[...new Set(list.map(o=>o.sub))].filter(Boolean); const sn=x=>x==="gather"?"Coleta":typeof subName==="function"?subName(x):x.replace(/_/g," ");
    if(!["h","a","s"].includes(s)&&subs.length>1){ const ss=el("select",{"aria-label":"Tipo",class:"nb-sub"}); ss.append(el("option",{value:"",text:"Todos os tipos"})); subs.sort((a,b)=>sn(a).localeCompare(sn(b),"pt-BR")).forEach(x=>ss.append(el("option",{value:x,text:sn(x)}))); ss.addEventListener("change",()=>{ sub=ss.value; show(); }); head.append(ss); }
    const cnt=el("p",{class:"muted small nb-cnt"}); pick.insertBefore(cnt,res);
    const show=()=>{ res.textContent=""; const f=q.value.trim().toLowerCase(); const out=list.filter(o=>o.tiers.has(+t.value)&&(!mat||o.mat===mat)&&(!sub||o.sub===sub)&&(!f||o.pt.toLowerCase().includes(f)||o.en.toLowerCase().includes(f)||o.c.toLowerCase().includes(f)));
      cnt.textContent=`${out.length} ${out.length===1?"item":"itens"}`;
      if(!out.length) res.append(el("p",{class:"muted small",text:"Nada encontrado neste tier. Troque o tier ou o filtro."}));
      out.forEach(o=>{ const b=el("button",{type:"button",class:"nb-it"}); const tt=Math.max(...[...o.tiers].filter(n=>n<=+t.value),...[...o.tiers].slice(0,1)); b.append(fullImg(`T${tt}_${o.c}${o.ench&&+e.value?"@"+e.value:""}`,"nico nb-ri")||"",el("span",{text:o.nome}));
        b.addEventListener("click",()=>{ const ts=[...o.tiers].sort((a,b)=>a-b); const tier=ts.includes(+t.value)?+t.value:ts[ts.length-1]; const en=o.ench?+e.value:0; const nid=`T${tier}_${o.c}${en?"@"+en:""}`; if(!sel[s]||code(sel[s])!==o.c) delete sk[s]; sel[s]=nid; if(cs===0&&s==="w"&&!/_TOOL_/.test(nid)) delete SETS[1].sel.w; if(s==="w"&&/^T\d+_2H_/.test(nid)){ SETS.forEach(st=>{ delete st.sel.o; delete st.sk.o; }); } draw(); drawSk(); head.querySelector("b").textContent=lab; }); res.append(b); }); };
    [q,t,e].forEach(n=>n.addEventListener("input",show)); show(); q.focus({preventScroll:true}); };
  draw(); drawSets(); NB_REFRESH=()=>{ draw(); if(curPick) openPick(curPick[0],curPick[1]); };
  const err=el("p",{class:"nb-err small",hidden:true}), save=el("button",{type:"button",class:"bc-more nb-new",text:"Salvar build"});
  save.addEventListener("click",()=>{ if(!nome.value.trim()||!SETS[0].sel.w){ err.hidden=false; err.textContent="Dê um nome à build e escolha pelo menos a arma."; return; }
    const b={id:nbId(nome.value),t:nome.value.trim(),au:au.value.trim()||"Visitante",ks:[...K.st],k:[...K.st][0]||"",tg:[...T.st],desc:ds.value.trim(),data:new Date().toISOString().slice(0,10),votos:0};
    /* Set 1 = recomendado, Set 2 = alternativa (peças, e habilidades de arma/elmo/peito/botas) */
    const S1=SETS[0], S2=SETS[1], K2={};
    for(const [x] of NB_SLOTS){ const ids=[S1.sel[x],S2.sel[x]].filter(Boolean); if(!ids.length) continue; if(x==="w"){ b.w=S1.sel.w; if(S2.sel.w&&/_TOOL_/.test(S1.sel.w)) b.w2=S2.sel.w; } else b[x]=ids; }
    const skl=(st,x)=>{ const l=st.sk[x]||[], n=x==="w"?4:2; if(!st.sel[x]||!l.some(Boolean)) return null; const a=Array.from({length:n},(_,i)=>l[i]||"").filter(Boolean); return a; };
    for(const x of ["w","h","a","s"]){ if(x==="w"){ const a=skl(S1,"w"); if(a) K2.w=a;  } else { const a=[S1,S2].filter(st=>st.sel[x]).map(st=>skl(st,x)||[]); if(a.some(l=>l.length)) K2[x]=a; } }
    if(Object.keys(K2).length) b.sk=K2;
    { const Q={}; for(const k in QS) if(S1.sel[k]&&QS[k]>1&&!(k==="o"&&is2h())) Q[k]=QS[k]; if(Object.keys(Q).length) b.q=Q; }
    { const X={}; for(const [x] of NB_EXTRAS) if(S1.sel[x]) X[x]=S1.sel[x]; if(Object.keys(X).length) b.x=X; }
    try{ store.set("nbAuthor",au.value.trim()); }catch(e){} const fim=()=>{ nbOpen=b.id; nbRender(); setTimeout(()=>{ const c=document.querySelector("#nbBox .bcard.open"); if(c) c.scrollIntoView({block:"center",behavior:"smooth"}); },100); };
    if(NB_CLOUD){ save.disabled=true; save.textContent="Publicando…"; const o={...b}; delete o.id; delete o.votos; nbApi("nb_builds",{method:"POST",body:JSON.stringify({id:b.id,data:o}),headers:{Prefer:"return=minimal"}}).then(async r=>{ if(!r.ok) throw 0; NB_REPO=null; await nbLoad(); fim(); }).catch(()=>{ const a=nbMine(); a.unshift(b); nbSaveMine(a); err.hidden=false; err.textContent="Não consegui publicar agora; a build ficou salva só no seu navegador. Use \"Publicar para todos\" depois."; save.disabled=false; save.textContent="Salvar build"; nbRender(); }); return; }
    const a=nbMine(); a.unshift(b); nbSaveMine(a); fim(); });
  const cancel=el("button",{type:"button",class:"bc-more",text:"Cancelar"}); cancel.addEventListener("click",()=>dlg.close());
  body.append(err,el("div",{class:"nb-act nb-btns"}),save,cancel);
  /* duas colunas: montagem à esquerda, escolha de peça e habilidades à direita */
  { const lay=el("div",{class:"nb-lay"}), Lc=el("div",{class:"nb-L"}), Rc=el("aside",{class:"nb-R","aria-label":"Escolher peça e habilidades"});
    [...body.children].forEach(c=>{ if(c===back||c.tagName==="H3") return; (c===pick?Rc:Lc).append(c); }); lay.append(Lc,Rc); body.append(lay); }
}

/* ---------- formulário de composição ---------- */
function nbMultiCheck(opts,ph){
  const st=new Set(), box=el("div",{class:"ms"}), tr=el("button",{type:"button",class:"ms-tr","aria-haspopup":"listbox","aria-expanded":"false"}), val=el("span",{class:"ms-val"});
  tr.append(val,el("span",{class:"ms-ar",text:"▾","aria-hidden":"true"}));
  const pn=el("div",{class:"ms-pn",hidden:true}), hd=el("div",{class:"ms-hd"}), all=el("input",{type:"checkbox","aria-label":"Selecionar todos",title:"Selecionar todos"}), q=el("input",{type:"search",placeholder:"Filtrar…","aria-label":"Filtrar"}), x=el("button",{type:"button",class:"ms-x","aria-label":"Fechar",text:"✕"}), ul=el("div",{class:"ms-ul",role:"listbox"});
  hd.append(all,q,x); pn.append(hd,ul); box.append(tr,pn);
  const lab=v=>(opts.find(o=>o[0]===v)||[0,v])[1];
  const paint=()=>{ val.textContent=""; if(!st.size) val.append(el("span",{class:"ms-ph",text:ph})); else { [...st].slice(0,3).forEach(v=>val.append(el("span",{class:"ms-chip",text:lab(v)}))); if(st.size>3) val.append(el("span",{class:"ms-chip mute",text:"+"+(st.size-3)})); } all.checked=st.size===opts.length&&opts.length>0; };
  const list=()=>{ ul.textContent=""; const f=q.value.trim().toLowerCase(); const vis=opts.filter(o=>!f||o[1].toLowerCase().includes(f)); vis.forEach(([v,t])=>{ const row=el("label",{class:"ms-it"}), cb=el("input",{type:"checkbox"}); cb.checked=st.has(v); cb.addEventListener("change",()=>{ if(cb.checked) st.add(v); else st.delete(v); paint(); list(); }); row.append(cb,el("span",{text:t})); ul.append(row); }); if(!ul.children.length) ul.append(el("p",{class:"muted small ms-no",text:"Nada encontrado."})); };
  all.addEventListener("change",()=>{ opts.forEach(([v])=>{ if(all.checked) st.add(v); else st.delete(v); }); paint(); list(); });
  q.addEventListener("input",list);
  const open=o=>{ pn.hidden=!o; tr.setAttribute("aria-expanded",String(o)); if(o){ q.value=""; list(); q.focus({preventScroll:true}); } };
  tr.addEventListener("click",()=>open(pn.hidden)); x.addEventListener("click",()=>{ open(false); tr.focus(); });
  document.addEventListener("click",ev=>{ if(!box.isConnected||pn.hidden||box.contains(ev.target)) return; open(false); });
  box.addEventListener("keydown",ev=>{ if(ev.key==="Escape"&&!pn.hidden){ ev.stopPropagation(); open(false); tr.focus(); } });
  paint(); return {st,box};
}
const nbSnapBuild=b=>{ const o={}; for(const k of ["id","t","au","k","ks","tg","desc","data","w","w2","o","h","a","s","c","p","f","q","sk","x","wc","l","nome"]) if(b[k]!=null) o[k]=b[k]; return o; };
async function nbFormComp(pre){
  if(!nbSrc||nbSrc!=="nos") return;
  const host=$("nbBox"); host.textContent=""; const dlg={close:()=>{ nbView="comp"; try{ store.set("nb:view",nbView); }catch(e){} nbRender(); const a=$("p-builds"); if(a) a.scrollIntoView({block:"start"}); }};
  const body=el("div",{class:"nb-form nb-cp-form"}); host.append(body);
  const back=el("button",{type:"button",class:"bc-more nb-back",text:"← Voltar para as composições"}); back.addEventListener("click",()=>dlg.close());
  body.append(back,el("h3",{class:"orn",text:pre?"Editar composição":"Criar composição"}),el("p",{class:"muted small",text:"Escolha várias builds de Nossas builds. As principais entram com o mínimo de jogadores; as opcionais entram se vier mais gente. A composição vira uma entrada só e pode ser votada e publicada."}));
  window.scrollTo({top:0,behavior:"smooth"}); catLoad().catch(()=>{});
  const fld=(lab,node)=>{ const l=el("label",{class:"nb-f"}); l.append(el("span",{text:lab}),node); return l; };
  if(!GBC){ const espera=el("p",{class:"muted small",text:"Abrindo a lista de conteúdos…"}); body.append(espera);
    try{ const d=await need("builds-grind"); GBC=d.conteudos||[]; }catch(e){} finally{ espera.remove(); } }
  const nome=el("input",{type:"text",maxlength:"80",placeholder:"Ex.: Comp de Brumas 5v5"}), au=el("input",{type:"text",maxlength:"40",placeholder:"Seu nome"});
  try{ au.value=store.get("nbAuthor")||""; }catch(e){}
  if(pre){ nome.value=pre.t||""; if(pre.au) au.value=pre.au; }
  const K=nbMultiCheck((GBC||[]).map(c=>[c.k,c.nome]).concat(Object.entries(CONT_EXTRA)).concat([["","Outro"]]),"Selecione um ou mais conteúdos…");
  if(pre) (pre.ks||[pre.k||""]).forEach(k=>K.st.add(k));
  const ds=el("textarea",{rows:"3",maxlength:"400",placeholder:"Como jogar, rotação, observações…"}); if(pre&&pre.desc) ds.value=pre.desc;
  const mi=el("input",{type:"number",min:"1",max:"20",value:String(pre&&pre.min||4),"aria-label":"Mínimo de jogadores"});
  const ma=el("input",{type:"number",min:"1",max:"20",value:String(pre&&pre.max||7),"aria-label":"Máximo de jogadores"});
  const g1=el("div",{class:"nb-g"}); g1.append(fld("Nome da composição",nome),fld("Autor",au));
  const g2=el("div",{class:"nb-g"}); g2.append(fld("Jogadores, de",mi),fld("até",ma));
  const lk=el("div",{class:"nb-f nb-wide"}); lk.append(el("span",{text:"Conteúdo (escolha um ou mais)"}),K.box);
  body.append(g1,g2,lk,fld("Descrição",ds),el("h4",{text:"Builds da composição"}));
  const picked=new Map();
  (pre?nbMembers(pre):[]).forEach(m=>{ const b=nbResolve(m); if(b) picked.set(b.id,{g:(pre&&pre.o||[]).some(x=>(typeof x==="string"?x:x.id)===b.id)?"o":"p",b:nbSnapBuild(b)}); });
  const q=el("input",{type:"search",placeholder:"Buscar build por nome ou autor…","aria-label":"Buscar build"});
  const lista=el("div",{class:"nb-cp-list"}), escolhidas=el("div",{class:"nb-cp-escolhidas"}), aviso=el("p",{class:"muted small"});
  const alvos=NB_ALL.filter(b=>!nbIsComp(b)).slice().sort((a,b)=>String(a.t||"").localeCompare(String(b.t||""),"pt"));
  const maximo=()=>Math.max(1,Math.min(20,Math.round(+ma.value)||Math.max(1,Math.round(+mi.value)||1)));
  const drawEscolhidas=()=>{ escolhidas.textContent=""; const grupos=[["p","Principais"],["o","Opcionais"]];
    grupos.forEach(([g,tit])=>{ const itens=[...picked.values()].filter(x=>x.g===g); const s=el("div",{class:"nb-cp-gr"}); s.append(el("h5",{text:`${tit} (${itens.length})`}));
      const l=el("div",{class:"nb-cp-slot"}); itens.forEach(({b})=>{ const v=el("div",{class:"nb-cp-vaga"}); const im=b.w?fullImg(b.w,"nico"):null; if(im) v.append(im); v.append(el("span",{class:"nb-cp-nm",text:b.t||b.nome||""}));
        const rm=el("button",{type:"button",class:"bc-more",text:"Tirar","aria-label":"Tirar "+b.t+" da composição"}); rm.addEventListener("click",()=>{ picked.delete(b.id); drawEscolhidas(); drawLista(); }); v.append(rm); l.append(v); });
      if(!itens.length) l.append(el("p",{class:"muted small",text:"Nenhuma ainda."})); s.append(l); escolhidas.append(s); }); };
  const drawLista=()=>{ lista.textContent=""; const f=q.value.trim().toLowerCase(); const out=alvos.filter(b=>!f||String(b.t||"").toLowerCase().includes(f)||String(b.au||"").toLowerCase().includes(f)||String(b.wc||"").toLowerCase().includes(f));
    aviso.textContent=`${out.length} ${out.length===1?"build encontrada":"builds encontradas"}`;
    if(!out.length) lista.append(el("p",{class:"muted small",text:"Nenhuma build com esse nome."}));
    out.forEach(b=>{ const atual=picked.get(b.id), cheio=!atual&&picked.size>=maximo(); const row=el("div",{class:"nb-cp-it"+(atual?" on":"")}); const im=b.w?fullImg(b.w,"nico"):null; if(im) row.append(im);
      const tx=el("div",{class:"nb-cp-tx"}); tx.append(el("b",{text:b.t||b.nome||""}),el("small",{class:"muted",text:[b.wc&&codeName(b.wc),contName(b.k)].filter(Boolean).join(" · ")})); row.append(tx);
      [["p","Principal"],["o","Opcional"]].forEach(([g,t])=>{ const bt=el("button",{type:"button",class:"bc-more"+(atual&&atual.g===g?" on":""),text:t,"aria-pressed":String(!!atual&&atual.g===g)}); bt.disabled=cheio; bt.title=cheio?`A composição já tem ${maximo()} builds. Aumente o máximo para pôr mais.`:""; bt.addEventListener("click",()=>{ picked.set(b.id,{g,b:nbSnapBuild(b)}); drawEscolhidas(); drawLista(); }); row.append(bt); }); lista.append(row); }); };
  mi.addEventListener("change",()=>{ const v=Math.max(1,Math.min(20,Math.round(+mi.value)||1)); mi.value=String(v); if(+ma.value<v) ma.value=String(v); drawEscolhidas(); drawLista(); });
  ma.addEventListener("change",()=>{ const v=Math.max(Math.round(+mi.value)||1,Math.min(20,Math.round(+ma.value)||1)); ma.value=String(v); drawEscolhidas(); drawLista(); });
  q.addEventListener("input",drawLista);
  const picker=el("section",{class:"nb-cp-pick"}); picker.append(el("h4",{text:"Builds disponíveis"}),q,aviso,lista,el("h4",{text:"Builds escolhidas"}),escolhidas); body.append(picker);
  drawEscolhidas(); drawLista();
  const err=el("p",{class:"nb-err small",hidden:true}), save=el("button",{type:"button",class:"bc-more nb-new",text:pre?"Salvar alterações":"Salvar composição"});
  save.addEventListener("click",()=>{ const min=Math.max(1,Math.min(20,Math.round(+mi.value)||1)), max=Math.max(min,Math.min(20,Math.round(+ma.value)||min)); mi.value=String(min); ma.value=String(max);
    if(!nome.value.trim()||!picked.size){ err.hidden=false; err.textContent="Dê um nome à composição e escolha pelo menos uma build."; return; }
    const escolhidas=[...picked.values()].sort((a,b)=>(a.g==="p"?0:1)-(b.g==="p"?0:1));
    if(!escolhidas.some(x=>x.g==="p")){ err.hidden=false; err.textContent="Marque pelo menos uma build como principal."; return; }
    const todos=escolhidas.map(x=>x.b);
    const c={...(pre||{}),tipo:"comp",id:pre&&pre.id||nbId(nome.value),t:nome.value.trim(),au:au.value.trim()||"Visitante",ks:[...K.st],k:[...K.st][0]||"",desc:ds.value.trim(),data:new Date().toISOString().slice(0,10),votos:pre&&pre.votos||0,min,max,p:todos.slice(0,min),o:todos.slice(min,max)};
    delete c.local; delete c.repo; delete c.cloud; delete c._qs; delete c._qi; delete c._refresh;
    try{ store.set("nbAuthor",au.value.trim()); }catch(e){}
    const fim=()=>{ nbView="comp"; try{ store.set("nb:view",nbView); }catch(e){} nbOpen=c.id; nbRender(); setTimeout(()=>{ const card=document.querySelector("#nbBox .bcard.open"); if(card) card.scrollIntoView({behavior:"smooth",block:"center"}); },100); };
    if(NB_CLOUD){ save.disabled=true; save.textContent="Publicando…"; const o2={...c}; delete o2.id; delete o2.votos;
      nbApi("nb_builds",{method:"POST",body:JSON.stringify({id:c.id,data:o2}),headers:{Prefer:"return=minimal"}}).then(async r=>{ if(!r.ok) throw 0; NB_REPO=null; await nbLoad(); fim(); }).catch(()=>{ const a=nbMine().filter(x=>x.id!==c.id); a.unshift(c); nbSaveMine(a); err.hidden=false; err.textContent="Não consegui publicar agora; a composição ficou salva só no seu navegador. Use \"Publicar para todos\" depois."; save.disabled=false; save.textContent=pre?"Salvar alterações":"Salvar composição"; }); return; }
    const a=nbMine().filter(x=>x.id!==c.id); a.unshift(c); nbSaveMine(a); fim(); });
  const cancel=el("button",{type:"button",class:"bc-more",text:"Cancelar"}); cancel.addEventListener("click",()=>dlg.close());
  const acts=el("div",{class:"nb-act nb-cp-act"}); acts.append(save,cancel); body.append(err,acts);
}

/* ---------- troca entre comunidade e nossas ---------- */
function nbInit(){
  const p=$("p-builds"); if(!p||p._nb) return; p._nb=1;
  const seg=el("div",{class:"seg nb-src",id:"bSrc",role:"group","aria-label":"Origem das builds"}); const box=el("div",{id:"nbBox",hidden:true});
  const first=p.querySelector(".aside"); first.after(seg); seg.after(box);
  const hide=[...p.querySelectorAll(".row-ctl,.bfilters,#bList,.cols")];
  const set=v=>{ nbSrc=v; try{ store.set("bSrc",v); }catch(e){} seg.textContent="";
    [["com","Builds da comunidade"],["nos","Nossas builds"]].forEach(([k,t])=>{ const b=el("button",{type:"button","aria-pressed":String(v===k),text:t}); b.addEventListener("click",()=>set(k)); seg.append(b); });
    hide.forEach(h=>h.hidden=v==="nos"); box.hidden=v!=="nos"; first.hidden=v==="nos"; if(v==="nos") nbRender(); };
  set((()=>{ try{ return store.get("bSrc")==="nos"?"nos":"com"; }catch(e){ return "com"; } })());
}
nbInit();

document.querySelectorAll("[data-lang]").forEach(b=>b.addEventListener("click",()=>setTimeout(()=>{ if(NB_REFRESH&&document.querySelector("#nbBox .nb-form")) NB_REFRESH(); else if(nbSrc==="nos"&&!$("nbBox").hidden) nbRender(); },0)));
