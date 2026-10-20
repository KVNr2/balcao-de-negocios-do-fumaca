/* ================= Builds: "Builds da comunidade" x "Nossas builds" (pasta builds/) ================= */
let nbLine="", NB_REPO=null, NB_ALL=[], nbOpen=null, nbCont="", nbSort="votos", nbSrc="com";
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
const nbVotesOf=b=>b.cloud?(+b.votos||0):(+b.votos||0)+(nbVotes().has(b.id)?1:0);

function nbCard(b){
  const open=nbOpen===b.id, card=el("article",{class:"bcard"+(open?" open":"")});
  const top=el("div",{class:"bc-top"}); const wi=fullImg(b.w,"nico zbig"); top.append(wi||el("span",{class:"btile"}));
  const mid=el("div",{class:"bc-mid"}); mid.append(el("h4",{text:b.t}));
  const meta=el("div",{class:"bc-meta"}); meta.append(el("span",{class:"tag",text:b.k?contName(b.k):"Outro"})); meta.append(el("span",{class:"tag mute",text:"por "+(b.au||"Balcão do Fumaça")}));
  { const nv=gbSpec(b), lv=nv>=SPEC_MIN?3:nv>0?2:0; if(b.l) meta.append(el("span",{class:"tag"+(lv>=2?" good":""),text:nv?`${b.nome}: spec ${nv}`:`${b.nome}: sem spec`})); const gaps=gbGaps(b); if(gaps.length) meta.append(el("span",{class:"tag bad",text:`Sem spec em ${gaps.join(" e ")}`})); }
  if(b.local) meta.append(el("span",{class:"tag bad",text:"Só no seu navegador"}));
  (b.tg||[]).slice(0,3).forEach(t=>meta.append(el("span",{class:"tag mute",text:t}))); mid.append(meta); top.append(mid);
  const voted=nbVotes().has(b.id), vb=el("button",{type:"button",class:"nb-vote"+(voted?" on":""),"aria-pressed":String(voted),title:voted?"Tirar meu voto":"Votar nesta build"});
  vb.append(el("span",{class:"nb-arrow",text:"▲"}),el("b",{text:String(nbVotesOf(b))}),el("small",{text:"votos"}));
  vb.addEventListener("click",async()=>{ const had=nbVotes().has(b.id); nbVote(b.id);
    if(b.cloud){ b.votos=Math.max(0,(+b.votos||0)+(had?-1:1)); nbRender(); try{ if(had) await nbApi(`nb_votos?build_id=eq.${encodeURIComponent(b.id)}&voter=eq.${encodeURIComponent(nbVoter())}`,{method:"DELETE"}); else await nbApi("nb_votos",{method:"POST",body:JSON.stringify({build_id:b.id,voter:nbVoter()}),headers:{Prefer:"return=minimal"}}); }catch(e){} }
    else nbRender(); }); const rt=el("div",{class:"bc-r"}); rt.append(vb); top.append(rt); card.append(top);
  if(b.desc) card.append(el("p",{class:"nb-desc small",text:b.desc}));
  card.append(gbStrip(b));
  const btn=el("button",{type:"button",class:"bc-more","aria-expanded":String(open),text:open?"Esconder build completa":"Ver build completa"});
  btn.addEventListener("click",()=>{ nbOpen=open?null:b.id; nbRender(); });
  const act=el("div",{class:"bc-act"}); act.append(btn,custoCtl("n:"+b.id));
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
  const box=$("nbBox"); if(!box) return; box.textContent=""; if(!nbRender._l){ nbRender._l=1; nbLoad().then(()=>nbRender()); } nbRefreshAll();
  const bar=el("div",{class:"nb-bar"}); const mk=el("button",{type:"button",class:"bc-more nb-new",text:"+ Criar build"}); mk.addEventListener("click",()=>nbForm());
  const imp=el("button",{type:"button",class:"bc-more",text:"Colar código"}); imp.addEventListener("click",()=>{ const t=prompt("Cole aqui o código da build:"); if(!t) return; try{ const b=JSON.parse(t); if(!b.w||!b.t) throw 0; b.id=b.id||nbId(b.t); const a=nbMine(); if(!a.some(x=>x.id===b.id)) a.unshift(b); nbSaveMine(a); nbRender(); }catch(e){ alert("Código inválido."); } });
  const sort=el("select",{"aria-label":"Ordem"}); [["votos","Mais votadas"],["novas","Mais novas"]].forEach(([v,t])=>sort.append(el("option",{value:v,text:t}))); sort.value=nbSort; sort.addEventListener("change",()=>{ nbSort=sort.value; nbRender(); });
  const cnt=el("span",{class:"muted small",id:"nbCount"}); bar.append(mk,imp,sort,cnt); box.append(bar);
  try{ buildIdx(); }catch(e){} for(const b of NB_ALL){ if(!b.wc&&b.w){ b.wc=b.w.replace(/^T\d_/,"").replace(/@\d$/,""); b.l=(typeof W2LINE!=="undefined"&&W2LINE[b.wc])||""; b.nome=codeName(b.wc); } }
  const used=new Map(); NB_ALL.forEach(b=>used.set(b.k||"",(used.get(b.k||"")||0)+1));
  const cc=el("div",{class:"seg wrap",role:"group","aria-label":"Conteúdo"}); const mkc=(k,t,n)=>{ const x=el("button",{type:"button","aria-pressed":String(nbCont===k),text:`${t} (${n})`}); x.addEventListener("click",()=>{ nbCont=k; nbLine=""; nbOpen=null; nbRender(); }); cc.append(x); };
  mkc("","Todos",NB_ALL.length); [...used.keys()].forEach(k=>mkc(k,k?contName(k):"Outro",used.get(k))); box.append(cc);
  const wg=el("div",{class:"bweapons",role:"group","aria-label":"Filtrar por arma"}); const inCont=NB_ALL.filter(b=>nbCont===""||(b.k||"")===nbCont); const present=new Set(inCont.map(b=>b.l));
  const all=el("button",{type:"button",class:"bw all","aria-pressed":String(!nbLine),text:"Todas"}); all.addEventListener("click",()=>{ nbLine=""; nbRender(); }); wg.append(all);
  for(const [l,code] of Object.entries(LINE_ICON)){ if(!present.has(l)&&nbLine!==l) continue; const x=el("button",{type:"button",class:"bw","aria-pressed":String(nbLine===l),title:LINE_NAME[l]}); x.append(itemImg(code,[8,7,6,5,4,3])); x.addEventListener("click",()=>{ nbLine=nbLine===l?"":l; nbRender(); }); wg.append(x); }
  box.append(wg);
  const ord=a=>a.slice().sort((x,y)=>nbSort==="novas"?String(y.data||"").localeCompare(String(x.data||"")):(nbVotesOf(y)-nbVotesOf(x)));
  const flt=a=>a.filter(b=>(!nbCont||(b.k||"")===nbCont)&&(!nbLine||b.l===nbLine));
  const sec=(title,sub,list,empty)=>{ const s=el("section",{class:"nb-sec"}); s.append(el("h3",{class:"orn",text:title}),el("p",{class:"muted small",text:sub})); const l=el("div",{class:"blist"}); if(!list.length) l.append(el("p",{class:"empty",text:empty})); list.forEach(b=>l.append(nbCard(b))); s.append(l); box.append(s); };
  sec("Nossas builds",(NB_CLOUD?"Builds publicadas por todos que usam o site. Seu voto conta para todo mundo, um por navegador.":"Escolhidas pelo Balcão do Fumaça. A contagem de votos vem do arquivo da build; o seu voto soma +1 só para você."),ord(flt((NB_REPO||[]))),NB_REPO?"Ainda não há builds publicadas nesta seleção.":"Carregando…");
  { const n=flt(NB_ALL).length; cnt.textContent=n?`${n} ${n===1?"build":"builds"}`:""; }
  const mine=NB_ALL.filter(b=>b.local); if(mine.length) sec("Suas builds",(NB_CLOUD?"Salvas só neste navegador porque a publicação falhou. Clique em Publicar para todos.":"Salvas só neste navegador. Baixe o arquivo e envie para a pasta builds/ do site para publicar."),ord(flt(mine)),"");
}
const nbId=t=>(t||"build").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)+"-"+Math.random().toString(36).slice(2,6);

/* ---------- formulário de criação ---------- */
let NB_CAT=null;
const NB_FILTER={ w:r=>r[1]==="weapons", o:r=>r[1]==="offhands", h:r=>r[1]==="head", a:r=>r[1]==="armors", s:r=>r[1]==="shoes", c:r=>r[1]==="capes", p:r=>r[1]==="consumables"&&r[2]==="potions", f:r=>r[1]==="consumables"&&r[2]==="food" };
async function nbForm(){ if(!nbSrc||nbSrc!=="nos") return;
  /* tela própria dentro da aba, com botão para voltar à lista */
  const host=$("nbBox"); host.textContent=""; const dlg={close:()=>{ nbRender(); const a=$("p-builds"); if(a) a.scrollIntoView({block:"start"}); }};
  const body=el("div",{class:"nb-form"}); host.append(body);
  const back=el("button",{type:"button",class:"bc-more nb-back",text:"← Voltar para as builds"}); back.addEventListener("click",()=>dlg.close());
  body.append(back,el("h3",{class:"orn",text:"Criar build"})); window.scrollTo({top:0,behavior:"smooth"});
  if(!NB_CAT){ body.append(el("p",{class:"muted small",text:"Abrindo o catálogo de itens…"})); try{ NB_CAT=await need("catalog"); }catch(e){ body.textContent="Não consegui abrir o catálogo."; return; } body.lastChild.remove(); }
  const sel={}; const fld=(lab,node)=>{ const l=el("label",{class:"nb-f"}); l.append(el("span",{text:lab}),node); return l; };
  const nome=el("input",{type:"text",maxlength:"80",placeholder:"Ex.: Lamina Aclarada para Fame Farm"}), au=el("input",{type:"text",maxlength:"40",placeholder:"Seu nome"}); try{ au.value=store.get("nbAuthor")||""; }catch(e){}
  const k=el("select"); k.append(el("option",{value:"",text:"Outro"})); (GBC||[]).forEach(c=>k.append(el("option",{value:c.k,text:c.nome})));
  const tg=el("input",{type:"text",placeholder:"PvE, Solo, Fame Farm (separe por vírgula)"}), ds=el("textarea",{rows:"3",maxlength:"400",placeholder:"Como jogar, rotação, observações…"});
  const g1=el("div",{class:"nb-g"}); g1.append(fld("Nome da build",nome),fld("Autor",au),fld("Conteúdo",k),fld("Tags",tg)); body.append(g1,fld("Descrição",ds));
  body.append(el("h4",{text:"Peças e habilidades"}),el("p",{class:"muted small",text:"Clique em uma casa para escolher a peça e as habilidades dela."}));
  let GBD=[]; try{ GBD=(await need("builds-grind")).builds||[]; }catch(e){}
  const sk={}; const wrap=el("div",{class:"nb-vg"}); const grid=el("div",{class:"kx-g nb-kg"}); const pick=el("div",{class:"nb-pick"}); wrap.append(grid); body.append(wrap,pick);
  const code=id=>String(id||"").replace(/^T\d+_/,"").replace(/@\d$/,"");
  /* habilidades já usadas por outras builds para o mesmo item: é de onde saem as opções */
  const spellOpts=(s,id)=>{ const c=code(id), n=s==="w"?4:2, o=Array.from({length:n},()=>new Set());
    for(const x of GBD){ const bs=x[s]; const it=s==="w"?x.w:(bs&&bs[0]); if(!it||code(it)!==c) continue; const l=s==="w"?(x.sk||{}).w:(((x.sk||{})[s]||[])[0]); (l||[]).slice(0,n).forEach((v,i)=>{ if(v) o[i].add(v); }); } return o.map(z=>[...z]); };
  const POS={w:["Q","W","E","Passiva"]}; const posLab=(s,i)=>s==="w"?POS.w[i]:(i?"Passiva":"Habilidade");
  const draw=()=>{ grid.textContent=""; [null,"h","c","w","a","o","p","s","f"].forEach(s=>{ const cell=el("button",{type:"button",class:"kx-c nb-cell"+(s?"":" vazio")+(s&&!sel[s]?" nb-add":"")}); if(!s){ grid.append(cell); cell.disabled=true; return; }
      const lab=NB_SLOTS.find(x=>x[0]===s)[1]; cell.title=lab;
      if(sel[s]){ const im=fullImg(sel[s],"nico kx-big"); if(im) cell.append(im); const l=(sk[s]||[]).filter(Boolean); if(l.length){ const ov=el("div",{class:"kx-ov"+(s==="w"&&l.length>=4?" kx-left":"")}); l.forEach(v=>ov.append(spellImg(v,"kx-sm"))); cell.append(ov); } }
      else cell.append(el("span",{class:"nb-plus",text:"+"}),el("small",{text:lab}));
      cell.addEventListener("click",()=>openPick(s,lab)); grid.append(cell); }); };
  const openPick=(s,lab)=>{ pick.textContent=""; pick.scrollIntoView({block:"nearest",behavior:"smooth"}); const q=el("input",{type:"search",placeholder:`Buscar ${lab.toLowerCase()}…`}), t=el("select",{"aria-label":"Tier"}), e=el("select",{"aria-label":"Encantamento"}), res=el("div",{class:"nb-res"}), spk=el("div",{class:"nb-sk"});
    [4,5,6,7,8].forEach(n=>t.append(el("option",{value:n,text:"T"+n}))); t.value="8"; [0,1,2,3,4].forEach(n=>e.append(el("option",{value:n,text:n?"."+n:"sem encanto"})));
    const head=el("div",{class:"nb-ph"}); head.append(el("b",{text:lab}),q,t,e); if(sel[s]){ const cl=el("button",{type:"button",class:"bc-more",text:"Remover peça"}); cl.addEventListener("click",()=>{ delete sel[s]; delete sk[s]; pick.textContent=""; draw(); }); head.append(cl); }
    const ok=el("button",{type:"button",class:"bc-more",text:"Fechar"}); ok.addEventListener("click",()=>{ pick.textContent=""; }); head.append(ok); pick.append(head,spk,res);
    const drawSk=()=>{ spk.textContent=""; if(!sel[s]||!["w","h","a","s"].includes(s)) return; const o=spellOpts(s,sel[s]); if(!o.some(x=>x.length)){ spk.append(el("p",{class:"muted small",text:"Ainda não há habilidades conhecidas para esta peça."})); return; }
      spk.append(el("b",{class:"small",text:"Habilidades"})); o.forEach((list,i)=>{ if(!list.length) return; const row=el("div",{class:"nb-skrow"}); row.append(el("span",{class:"nb-skl",text:posLab(s,i)})); list.forEach(v=>{ const b=el("button",{type:"button",class:"nb-spb"+((sk[s]||[])[i]===v?" on":""),title:v.replace(/^PASSIVE_/,"").replace(/_/g," ").toLowerCase()}); b.append(spellImg(v,"kx-sm")); b.addEventListener("click",()=>{ sk[s]=sk[s]||[]; sk[s][i]=sk[s][i]===v?undefined:v; draw(); drawSk(); }); row.append(b); }); spk.append(row); }); };
    drawSk();
    const rows=NB_CAT.i.filter(NB_FILTER[s]); const by=new Map(); for(const r of rows){ const c=r[0].replace(/^T\d+_/,""); if(!by.has(c)) by.set(c,{c,nome:LANG==="en"?r[6]:r[5],en:r[6],pt:r[5],tiers:new Set(),ench:0}); const o=by.get(c); o.tiers.add(r[3]); if(r[4]&&!/consumables/.test(r[1])) o.ench=1; }
    const list=[...by.values()].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
    const show=()=>{ res.textContent=""; const f=q.value.trim().toLowerCase(); const out=list.filter(o=>!f||o.pt.toLowerCase().includes(f)||o.en.toLowerCase().includes(f)||o.c.toLowerCase().includes(f)).slice(0,60);
      if(!out.length) res.append(el("p",{class:"muted small",text:"Nada encontrado."}));
      out.forEach(o=>{ const b=el("button",{type:"button",class:"nb-it"}); const tt=Math.max(...[...o.tiers].filter(n=>n<=+t.value),...[...o.tiers].slice(0,1)); b.append(fullImg(`T${tt}_${o.c}`,"nico nb-ri")||"",el("span",{text:o.nome}));
        b.addEventListener("click",()=>{ const ts=[...o.tiers].sort((a,b)=>a-b); const tier=ts.includes(+t.value)?+t.value:ts[ts.length-1]; const en=o.ench?+e.value:0; const nid=`T${tier}_${o.c}${en?"@"+en:""}`; if(!sel[s]||code(sel[s])!==o.c) delete sk[s]; sel[s]=nid; draw(); drawSk(); head.querySelector("b").textContent=lab; }); res.append(b); }); };
    [q,t,e].forEach(n=>n.addEventListener("input",show)); show(); q.focus({preventScroll:true}); };
  draw();
  const err=el("p",{class:"nb-err small",hidden:true}), save=el("button",{type:"button",class:"bc-more nb-new",text:"Salvar build"});
  save.addEventListener("click",()=>{ if(!nome.value.trim()||!sel.w){ err.hidden=false; err.textContent="Dê um nome à build e escolha pelo menos a arma."; return; }
    const b={id:nbId(nome.value),t:nome.value.trim(),au:au.value.trim()||"Visitante",k:k.value,tg:tg.value.split(",").map(s=>s.trim()).filter(Boolean).slice(0,6),desc:ds.value.trim(),data:new Date().toISOString().slice(0,10),votos:0};
    for(const [s] of NB_SLOTS) if(sel[s]) b[s]= s==="w"?sel[s]:[sel[s]];
    { const K={}; for(const s of ["w","h","a","s"]){ const l=(sk[s]||[]); if(!sel[s]||!l.some(Boolean)) continue; const arr=Array.from({length:s==="w"?4:2},(_,i)=>l[i]||""); K[s]=s==="w"?arr.filter(Boolean):[arr.filter(Boolean),[]]; } if(Object.keys(K).length) b.sk=K; }
    try{ store.set("nbAuthor",au.value.trim()); }catch(e){} const fim=()=>{ nbOpen=b.id; nbRender(); setTimeout(()=>{ const c=document.querySelector("#nbBox .bcard.open"); if(c) c.scrollIntoView({block:"center",behavior:"smooth"}); },100); };
    if(NB_CLOUD){ save.disabled=true; save.textContent="Publicando…"; const o={...b}; delete o.id; delete o.votos; nbApi("nb_builds",{method:"POST",body:JSON.stringify({id:b.id,data:o}),headers:{Prefer:"return=minimal"}}).then(async r=>{ if(!r.ok) throw 0; NB_REPO=null; await nbLoad(); fim(); }).catch(()=>{ const a=nbMine(); a.unshift(b); nbSaveMine(a); err.hidden=false; err.textContent="Não consegui publicar agora; a build ficou salva só no seu navegador. Use \"Publicar para todos\" depois."; save.disabled=false; save.textContent="Salvar build"; nbRender(); }); return; }
    const a=nbMine(); a.unshift(b); nbSaveMine(a); fim(); });
  const cancel=el("button",{type:"button",class:"bc-more",text:"Cancelar"}); cancel.addEventListener("click",()=>dlg.close());
  body.append(err,el("div",{class:"nb-act nb-btns"}),save,cancel);
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
