/* ================= Builds: "Builds da comunidade" x "Nossas builds" (pasta builds/) ================= */
let nbLine="", NB_REPO=null, NB_ALL=[], nbOpen=null, nbCont="", nbSort="votos", nbSrc="com";
const NB_EXTRAS=[["gb","Bolsa"],["m","Montaria"]];
const NB_SLOTS=[["w","Arma"],["o","Secundária"],["h","Elmo"],["a","Peito"],["s","Botas"],["c","Capa"],["p","Poção"],["f","Comida"]];
function nbMine(){ try{ return JSON.parse(store.get("nb:mine")||"[]"); }catch(e){ return []; } }
function nbSaveMine(a){ try{ store.set("nb:mine",JSON.stringify(a)); }catch(e){} }
function nbVotes(){ try{ return new Set(JSON.parse(store.get("nb:votes")||"[]")); }catch(e){ return new Set(); } }
let NB_CFG=null, NB_CLOUD=false;
const nbVoter=()=>{ let v=""; try{ v=store.get("nb:voter"); if(!v){ v=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2)+Date.now()); store.set("nb:voter",v); } }catch(e){} return v||"anon"; };
const nbApi=(path,o={})=>fetch(NB_CFG.url.replace(/\/$/,"")+"/rest/v1/"+path,{...o,headers:{apikey:NB_CFG.key,Authorization:"Bearer "+NB_CFG.key,"Content-Type":"application/json",...(o.headers||{})}});
function nbVote(id){ const v=nbVotes(); v.has(id)?v.delete(id):v.add(id); try{ store.set("nb:votes",JSON.stringify([...v])); }catch(e){} }
async function nbLoad(){
  if(NB_REPO) return;
  NB_REPO=[]; try{ NB_CFG=await need("nuvem"); NB_CLOUD=!!(NB_CFG.url&&NB_CFG.key); }catch(e){ NB_CLOUD=false; }
  if(NB_CLOUD){ try{ const [rb,rv,rm]=await Promise.all([nbApi("nb_builds?select=id,data&order=created_at.desc&limit=300"),nbApi("nb_votos_total?select=*"),nbApi("nb_votos?select=build_id&voter=eq."+encodeURIComponent(nbVoter()))]);
      if(!rb.ok) throw 0; const bs=await rb.json(), tot={}; (rv.ok?await rv.json():[]).forEach(x=>tot[x.build_id]=x.n);
      const mine=rm.ok?(await rm.json()).map(x=>x.build_id):[]; try{ store.set("nb:votes",JSON.stringify(mine)); }catch(e){}
      NB_REPO=bs.map(x=>({...x.data,id:x.id,votos:tot[x.id]||0,cloud:true})); nbRefreshAll(); return; }catch(e){ NB_CLOUD=false; NB_REPO=[]; } }
  try{ const r=await fetch(`builds/index.json?v=${VER}`); const idx=r.ok?await r.json():[];
    const all=await Promise.all(idx.map(f=>fetch(`builds/${f}?v=${VER}`).then(x=>x.ok?x.json():null).catch(()=>null)));
    NB_REPO=all.filter(b=>b&&b.id&&b.w).map(b=>({...b,repo:true})); }catch(e){}
  nbRefreshAll();
}
function nbRefreshAll(){ NB_ALL=[...(NB_REPO||[]),...nbMine().filter(m=>!(NB_REPO||[]).some(r=>r.id===m.id)).map(b=>({...b,local:true}))]; window.NB_ALL=NB_ALL; }
nbRefreshAll();
const nbConts=b=>(b.ks&&b.ks.length)?b.ks:[b.k||""];
const nbVotesOf=b=>b.cloud?(+b.votos||0):(+b.votos||0)+(nbVotes().has(b.id)?1:0);

function nbCard(b){
  const open=nbOpen===b.id, card=el("article",{class:"bcard"+(open?" open":"")});
  const top=el("div",{class:"bc-top"}); const wi=fullImg(b.w,"nico zbig"); top.append(wi||el("span",{class:"btile"}));
  const mid=el("div",{class:"bc-mid"}); mid.append(el("h4",{text:b.t}));
  const meta=el("div",{class:"bc-meta"}); nbConts(b).slice(0,3).forEach(k=>meta.append(el("span",{class:"tag",text:k?contName(k):"Outro"}))); if(nbConts(b).length>3) meta.append(el("span",{class:"tag mute",text:"+"+(nbConts(b).length-3)})); meta.append(el("span",{class:"tag mute",text:"por "+(b.au||"Balcão do Fumaça")}));
  { const nv=gbSpec(b), lv=nv>=SPEC_MIN?3:nv>0?2:0; if(b.l) meta.append(el("span",{class:"tag"+(lv>=2?" good":""),text:nv?`${b.nome}: spec ${nv}`:`${b.nome}: sem spec`})); const gaps=gbGaps(b); if(gaps.length) meta.append(el("span",{class:"tag bad",text:`Sem spec em ${gaps.join(" e ")}`})); }
  if(b.local) meta.append(el("span",{class:"tag bad",text:"Só no seu navegador"}));
  (b.tg||[]).slice(0,3).forEach(t=>meta.append(el("span",{class:"tag mute",text:t}))); mid.append(meta); top.append(mid);
  const voted=nbVotes().has(b.id), vb=el("button",{type:"button",class:"nb-vote"+(voted?" on":""),"aria-pressed":String(voted),title:voted?"Tirar meu voto":"Votar nesta build"});
  vb.append(el("span",{class:"nb-arrow",text:"▲"}),el("b",{text:String(nbVotesOf(b))}),el("small",{text:"votos"}));
  vb.addEventListener("click",async()=>{ const had=nbVotes().has(b.id); nbVote(b.id);
    if(b.cloud){ b.votos=Math.max(0,(+b.votos||0)+(had?-1:1)); nbRender(); try{ if(had) await nbApi(`nb_votos?build_id=eq.${encodeURIComponent(b.id)}&voter=eq.${encodeURIComponent(nbVoter())}`,{method:"DELETE"}); else await nbApi("nb_votos",{method:"POST",body:JSON.stringify({build_id:b.id,voter:nbVoter()}),headers:{Prefer:"return=minimal"}}); }catch(e){} }
    else nbRender(); }); const ib=albionBadge(b); const rt=el("div",{class:"bc-r"}); rt.append(ib,vb); top.append(rt); card.append(top);
  if(b.desc) card.append(el("p",{class:"nb-desc small",text:b.desc}));
  card.append(gbStrip(b));
  const btn=el("button",{type:"button",class:"bc-more","aria-expanded":String(open),text:open?"Esconder build completa":"Ver build completa"});
  btn.addEventListener("click",()=>{ nbOpen=open?null:b.id; nbRender(); });
  const act=el("div",{class:"bc-act"}); act.append(btn,albionBar(b,ib,"n:"+b.id));
  if(b.local){ const dl=el("button",{type:"button",class:"bc-more",text:"Baixar arquivo"}); dl.addEventListener("click",()=>nbExport(b));
    const cp=el("button",{type:"button",class:"bc-more",text:"Copiar código"}); cp.addEventListener("click",()=>{ navigator.clipboard&&navigator.clipboard.writeText(nbJson(b)); cp.textContent="Copiado"; setTimeout(()=>cp.textContent="Copiar código",1500); });
    const rm=el("button",{type:"button",class:"bc-more nb-del",text:"Apagar"}); rm.addEventListener("click",()=>{ if(!confirm("Apagar esta build do seu navegador?")) return; nbSaveMine(nbMine().filter(x=>x.id!==b.id)); nbRefreshAll(); nbRender(); });
    if(NB_CLOUD) act.append(rm); else act.append(dl,cp,rm); }
  if(b.local&&NB_CLOUD){ const pb=el("button",{type:"button",class:"bc-more nb-new",text:"Publicar para todos"}); pb.addEventListener("click",async()=>{ pb.disabled=true; pb.textContent="Publicando…"; try{ const o=JSON.parse(nbJson(b)); const r=await nbApi("nb_builds",{method:"POST",body:JSON.stringify({id:b.id,data:o}),headers:{Prefer:"return=minimal"}}); if(!r.ok) throw 0; nbSaveMine(nbMine().filter(x=>x.id!==b.id)); NB_REPO=null; await nbLoad(); nbRender(); }catch(e){ pb.disabled=false; pb.textContent="Falhou, tentar de novo"; } }); act.prepend(pb); }
  card.append(act); if(open) card.append(kbPanel(b)); return card;
}
const nbJson=b=>{ const o={...b}; delete o.local; delete o.repo; delete o.cloud; delete o.votos; return JSON.stringify(o,null,2); };
function nbExport(b){ const a=el("a",{href:URL.createObjectURL(new Blob([nbJson(b)],{type:"application/json"})),download:b.id+".json"}); document.body.append(a); a.click(); a.remove();
  alert("Arquivo baixado. Para publicar: coloque-o na pasta builds/ do site e acrescente o nome em builds/index.json (veja builds/LEIA-ME.md)."); }

function nbRender(){
  const box=$("nbBox"); if(!box) return; box.textContent=""; if(!nbRender._l){ nbRender._l=1; nbLoad().then(()=>nbRender()); catLoad().then(()=>nbRender()); } nbRefreshAll();
  const bar=el("div",{class:"nb-bar"}); const mk=el("button",{type:"button",class:"bc-more nb-new",text:"+ Criar build"}); mk.addEventListener("click",()=>nbForm());
  const imp=el("button",{type:"button",class:"bc-more",text:"Colar código"}); imp.addEventListener("click",()=>{ const t=prompt("Cole aqui o código da build:"); if(!t) return; try{ const b=JSON.parse(t); if(!b.w||!b.t) throw 0; b.id=b.id||nbId(b.t); const a=nbMine(); if(!a.some(x=>x.id===b.id)) a.unshift(b); nbSaveMine(a); nbRender(); }catch(e){ alert("Código inválido."); } });
  const sort=el("select",{"aria-label":"Ordem"}); [["votos","Mais votadas"],["novas","Mais novas"]].forEach(([v,t])=>sort.append(el("option",{value:v,text:t}))); sort.value=nbSort; sort.addEventListener("change",()=>{ nbSort=sort.value; nbRender(); });
  const cnt=el("span",{class:"muted small",id:"nbCount"}); bar.append(mk,imp,sort,cnt); box.append(bar);
  try{ buildIdx(); }catch(e){} for(const b of NB_ALL){ if(!b.wc&&b.w){ b.wc=b.w.replace(/^T\d_/,"").replace(/@\d$/,""); b.l=(typeof W2LINE!=="undefined"&&W2LINE[b.wc])||""; b.nome=codeName(b.wc); } }
  const used=new Map(); NB_ALL.forEach(b=>nbConts(b).forEach(k=>used.set(k,(used.get(k)||0)+1)));
  const cc=el("div",{class:"seg wrap",role:"group","aria-label":"Conteúdo"}); const mkc=(k,t,n)=>{ const x=el("button",{type:"button","aria-pressed":String(nbCont===k),text:`${t} (${n})`}); x.addEventListener("click",()=>{ nbCont=k; nbLine=""; nbOpen=null; nbRender(); }); cc.append(x); };
  mkc("","Todos",NB_ALL.length); [...used.keys()].forEach(k=>mkc(k,k?contName(k):"Outro",used.get(k))); box.append(cc);
  const wg=el("div",{class:"bweapons",role:"group","aria-label":"Filtrar por arma"}); const inCont=NB_ALL.filter(b=>nbCont===""||nbConts(b).includes(nbCont)); const present=new Set(inCont.map(b=>b.l));
  const all=el("button",{type:"button",class:"bw all","aria-pressed":String(!nbLine),text:"Todas"}); all.addEventListener("click",()=>{ nbLine=""; nbRender(); }); wg.append(all);
  for(const [l,code] of Object.entries(LINE_ICON)){ if(!present.has(l)&&nbLine!==l) continue; const x=el("button",{type:"button",class:"bw","aria-pressed":String(nbLine===l),title:LINE_NAME[l]}); x.append(itemImg(code,[8,7,6,5,4,3])); x.addEventListener("click",()=>{ nbLine=nbLine===l?"":l; nbRender(); }); wg.append(x); }
  box.append(wg);
  const ord=a=>a.slice().sort((x,y)=>nbSort==="novas"?String(y.data||"").localeCompare(String(x.data||"")):(nbVotesOf(y)-nbVotesOf(x)));
  const flt=a=>a.filter(b=>(!nbCont||nbConts(b).includes(nbCont))&&(!nbLine||b.l===nbLine));
  const sec=(title,sub,list,empty)=>{ const s=el("section",{class:"nb-sec"}); s.append(el("h3",{class:"orn",text:title}),el("p",{class:"muted small",text:sub})); const l=el("div",{class:"blist"}); if(!list.length) l.append(el("p",{class:"empty",text:empty})); const pg=pgSlice("nb:"+title,list,[nbCont,nbLine,nbSort].join("|"),nbRender); pg.items.forEach(b=>l.append(nbCard(b))); s.append(l,pg.bar); box.append(s); };
  sec("Nossas builds",(NB_CLOUD?"Builds publicadas por todos que usam o site. Seu voto conta para todo mundo, um por navegador.":"Escolhidas pelo Balcão do Fumaça. A contagem de votos vem do arquivo da build; o seu voto soma +1 só para você."),ord(flt((NB_REPO||[]))),NB_REPO?"Ainda não há builds publicadas nesta seleção.":"Carregando…");
  { const n=flt(NB_ALL).length; cnt.textContent=n?`${n} ${n===1?"build":"builds"}`:""; }
  const mine=NB_ALL.filter(b=>b.local); if(mine.length) sec("Suas builds",(NB_CLOUD?"Salvas só neste navegador porque a publicação falhou. Clique em Publicar para todos.":"Salvas só neste navegador. Baixe o arquivo e envie para a pasta builds/ do site para publicar."),ord(flt(mine)),"");
}
const nbId=t=>(t||"build").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"-"+Math.random().toString(36).slice(2,6);

/* ---------- formulário de criação ---------- */
let NB_CAT=null, NB_REFRESH=null;
const NB_FILTER={ t:r=>r[1]==="gathering"&&/_TOOL_/.test(r[0]), gh:r=>r[1]==="gathering"&&/_HEAD_GATHERER_/.test(r[0]), ga:r=>r[1]==="gathering"&&/_ARMOR_GATHERER_/.test(r[0]), gs:r=>r[1]==="gathering"&&/_SHOES_GATHERER_/.test(r[0]), gk:r=>r[1]==="gathering"&&/_BACKPACK_GATHERER_/.test(r[0]), gb:r=>r[1]==="bags", m:r=>r[1]==="mounts",
  /* itens de coleta entram nas peças a que pertencem: ferramenta = arma, chapéu/traje/botas = elmo/peito/botas, mochila = capa */
  w:r=>r[1]==="weapons"||(r[1]==="gathering"&&/_TOOL_/.test(r[0])), o:r=>r[1]==="offhands", h:r=>r[1]==="head"||(r[1]==="gathering"&&/_HEAD_GATHERER_/.test(r[0])), a:r=>r[1]==="armors"||(r[1]==="gathering"&&/_ARMOR_GATHERER_/.test(r[0])), s:r=>r[1]==="shoes"||(r[1]==="gathering"&&/_SHOES_GATHERER_/.test(r[0])), c:r=>(r[1]==="capes"&&r[2]!=="other")||(r[1]==="gathering"&&/_BACKPACK_GATHERER_/.test(r[0])), p:r=>r[1]==="consumables"&&r[2]==="potions", f:r=>r[1]==="consumables"&&r[2]==="food" };
async function nbForm(){ if(!nbSrc||nbSrc!=="nos") return;
  /* tela própria dentro da aba, com botão para voltar à lista */
  const host=$("nbBox"); host.textContent=""; const dlg={close:()=>{ nbRender(); const a=$("p-builds"); if(a) a.scrollIntoView({block:"start"}); }};
  const body=el("div",{class:"nb-form"}); host.append(body);
  const back=el("button",{type:"button",class:"bc-more nb-back",text:"← Voltar para as builds"}); back.addEventListener("click",()=>dlg.close());
  body.append(back,el("h3",{class:"orn",text:"Criar build"})); window.scrollTo({top:0,behavior:"smooth"});
  if(!NB_CAT){ body.append(el("p",{class:"muted small",text:"Abrindo o catálogo de itens…"})); try{ NB_CAT=await need("catalog"); await catLoad(); }catch(e){ body.textContent="Não consegui abrir o catálogo."; return; } body.lastChild.remove(); }
  let curPick=null; const SETS=[{sel:{},sk:{}},{sel:{},sk:{}}]; let cs=0, sel=SETS[0].sel; const fld=(lab,node)=>{ const l=el("label",{class:"nb-f"}); l.append(el("span",{text:lab}),node); return l; };
  const nome=el("input",{type:"text",maxlength:"80",placeholder:"Ex.: Lamina Aclarada para Fame Farm"}), au=el("input",{type:"text",maxlength:"40",placeholder:"Seu nome"}); try{ au.value=store.get("nbAuthor")||""; }catch(e){}
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
  let sk=SETS[0].sk; const setBar=el("div",{class:"seg nb-sets",role:"group","aria-label":"Set"}); const wrap=el("div",{class:"nb-vg"}); const grid=el("div",{class:"kx-g nb-kg"}); const pick=el("div",{class:"nb-pick"}); const exBox=el("div",{class:"nb-ex"}); wrap.append(grid); body.append(setBar,wrap,exBox,pick);
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
      cell.addEventListener("click",()=>openPick(s,lab)); grid.append(cell); }); drawSets(); drawEx(); };
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
