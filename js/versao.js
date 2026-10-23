/* ================= aba Versão: versão no ar, hora da publicação e frescor dos dados ================= */
const fmtDH = d => d.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
function haQuanto(d){ const s=Math.max(0,(Date.now()-d.getTime())/1000); if(s<90) return "agora mesmo"; const m=Math.round(s/60); if(m<60) return `há ${m} min`; const h=Math.round(m/60); if(h<36) return `há ${h} h`; return `há ${Math.round(h/24)} dias`; }
let VTOK=0;
window.addEventListener("popstate",()=>{ const p=$("p-versao"); if(p&&!p.hidden){ renderVersao(); const y=history.state&&history.state.y; if(y!=null&&!location.hash.startsWith("#versao/atualizacoes")) setTimeout(()=>window.scrollTo({top:y}),60); else window.scrollTo({top:0}); } });
/* categorias da lista completa: Site, AlbionSpecs (o programa) e Rotinas (atualizações automáticas dos dados) */
const V_CATS=[["site","Site"],["programa","AlbionSpecs"],["rotinas","Rotinas"]];
const V_ROTINAS=[["PvP","data/pvp.json","uma vez por dia","Builds, armas e jogadores do PvP, a partir das mortes guardadas pelo coletor."],
  ["Coletor de mortes","","a cada 6 minutos","Lê o feed oficial de mortes do Albion, recupera o histórico dos jogadores já vistos e guarda as lutas pequenas dos últimos 30 dias."],
  ["ZvZ","data/zvz.json","a cada 6 horas","Funções e armas das maiores lutas recentes (200 jogadores ou mais)."],
  ["Builds (AlbionOnlineGrind)","data/builds-grind.json","todo dia","As builds mais votadas de cada conteúdo."],
  ["Composições (Top Comps)","data/comps.json","todo dia","As composições de grupo mais usadas."]];
function vIr(cat){ history.replaceState({...(history.state||{}),y:window.scrollY},""); history.pushState({vsub:1},"","#versao/atualizacoes"+(cat?"/"+cat:"")); renderVersao(); window.scrollTo({top:0}); }
function vVoltar(){ if(history.state&&history.state.vsub) history.back(); else { history.replaceState(null,"","#versao"); renderVersao(); } }
function vCard(x){ const c=el("div",{class:"v-nov-i"}), h=el("div",{class:"v-nov-h"}); h.append(el("b",{text:x.titulo}),el("span",{class:"v-tag "+(x.programa?"prog":"site"),text:x.programa?"AlbionSpecs":"Site"}),el("small",{class:"muted",text:fmtDH(new Date(x.t))})); c.append(h);
  const ul=el("ul",{class:"v-list"}); (x.itens||[]).forEach(t=>ul.append(el("li",{text:t}))); c.append(ul); return c; }
async function renderLista(box,tok){
  const m=/^#versao\/atualizacoes(?:\/(site|programa|rotinas))?/.exec(location.hash), cat=(m&&m[1])||"site";
  box.textContent="";
  const top=el("div",{class:"v-top"}); const back=el("button",{type:"button",class:"bc-more",text:"← Voltar"}); back.addEventListener("click",vVoltar); top.append(back,el("h3",{text:"Todas as atualizações"})); box.append(top);
  const seg=el("div",{class:"seg",role:"group","aria-label":"Categoria"});
  V_CATS.forEach(([k,t])=>{ const b=el("button",{type:"button","aria-pressed":String(cat===k),text:t}); b.addEventListener("click",()=>{ history.replaceState(history.state,"","#versao/atualizacoes/"+k); renderLista(box,tok); }); seg.append(b); }); box.append(seg);
  const w=el("div",{class:"v-nov"}); box.append(w);
  if(cat==="rotinas"){
    w.before(el("p",{class:"muted small",text:"Rotinas são as atualizações automáticas de dados, sem mudança no site. A hora é da última vez que cada uma gravou."}));
    for(const [nome,url,freq,desc] of V_ROTINAS){ const c=el("div",{class:"v-nov-i"}), h=el("div",{class:"v-nov-h"}); h.append(el("b",{text:nome}),el("span",{class:"v-tag rot",text:freq})); c.append(h,el("p",{class:"small",text:desc})); const q=el("small",{class:"muted",text:url?"Última atualização: …":"Roda sozinha no GitHub, a cada 6 minutos (uma execução de 1 hora com 10 coletas)."}); c.append(q); w.append(c);
      if(url) fetch(url+"?"+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(j=>{ const raw=j.atualizado||""; const dd=new Date(/T/.test(raw)?raw:raw+"T00:00:00Z"); q.textContent=isNaN(dd)?"Sem data registrada.":`Última atualização: ${/T/.test(raw)?fmtDH(dd)+" ("+haQuanto(dd)+")":dd.toLocaleDateString("pt-BR",{timeZone:"UTC"})}`; }).catch(()=>{ q.textContent="Não consegui ler a data agora."; }); }
    return; }
  let todas=[]; try{ todas=((await fetch("novidades.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json())).itens||[]).slice().sort((a,b)=>b.t.localeCompare(a.t)); }catch(e){ w.append(el("p",{class:"muted",text:"Não consegui ler a lista agora."})); return; }
  if(tok!==VTOK) return;
  const sel=todas.filter(x=>cat==="programa"?!!x.programa:!x.programa);
  w.before(el("p",{class:"muted small",text:`${sel.length} ${sel.length===1?"atualização":"atualizações"} ${cat==="programa"?"do programa AlbionSpecs":"do site"}.`}));
  sel.forEach(x=>w.append(vCard(x)));
}
async function renderVersao(){
  const tok=++VTOK, box=$("vBox"); const meu=document.documentElement.dataset.v||"";
  let pub=null; try{ pub=await fetch("versao.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json()); }catch(e){}
  if(tok!==VTOK) return;
  if(/^#versao\/atualizacoes/.test(location.hash)){ renderLista(box,tok); return; }
  box.textContent="";
  if(!pub){ box.append(el("p",{class:"muted",text:"Não consegui ler a versão publicada agora. Confira a conexão e abra a aba de novo."})); return; }
  const d=new Date(pub.publicado); const atual=pub.v===meu;
  const hero=el("div",{class:"v-hero"});
  hero.append(el("small",{class:"v-k",text:"Versão no ar"}), el("div",{class:"v-code",text:pub.v}));
  const t=el("div",{class:"v-time"}); t.append(el("b",{text:fmtDH(d)}), el("span",{text:`horário de Brasília · ${haQuanto(d)}`})); hero.append(t);
  const resumo=el("ul",{class:"v-list v-res"}); hero.append(resumo);
  const st=el("div",{class:"v-st "+(atual?"ok":"novo")});
  st.append(el("span",{class:"v-dot"}), el("span",{text:atual?"Você está usando a versão mais recente.":`Há uma versão nova (a sua é ${meu}).`}));
  if(!atual){ const b=el("button",{type:"button",class:"bc-more",text:"Recarregar agora"}); b.addEventListener("click",()=>location.reload()); st.append(b); }
  hero.append(st);
  const todasBtn=el("button",{type:"button",class:"bc-more v-todas",text:"Ver todas as atualizações →"}); todasBtn.addEventListener("click",()=>vIr("site")); hero.append(todasBtn); box.append(hero);
  /* resumo curto do que mudou: com versão nova, o que veio depois da versão do visitante; senão, as últimas do site */
  (async()=>{ try{
    const nv=await fetch("novidades.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json()), todas=(nv.itens||[]).filter(x=>!x.programa).sort((a,b)=>b.t.localeCompare(a.t)); if(tok!==VTOK) return;
    const mine=(pub.hist||[]).find(h=>h.v===meu); let lista=!atual&&mine?todas.filter(x=>x.t>mine.t):todas.slice(0,3); if(!lista.length) lista=todas.slice(0,3);
    const cur=(t,n=150)=>{ const p=t.indexOf(". "); if(p>20&&p<n) return t.slice(0,p+1); return t.length>n?t.slice(0,n-1).trimEnd()+"…":t; };
    lista.slice(0,4).forEach(x=>{ const li=el("li"); li.append(el("b",{text:x.titulo+": "}),document.createTextNode(cur((x.itens||[])[0]||""))); resumo.append(li); });
  }catch(e){} })();
  /* programa AlbionSpecs (.exe): a versão é publicada à parte do site; atualizar o programa não exige recarregar a página */
  const prog=el("div",{class:"v-hero v-prog"}); box.append(prog);
  prog.append(el("small",{class:"v-k",text:"Programa AlbionSpecs"}));
  (async()=>{ try{
    const pj=await fetch("programa/versao.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json());
    prog.append(el("div",{class:"v-code",text:"v"+(pj.versao||"?")}));
    const pt=el("div",{class:"v-time"}); prog.append(pt);
    let nota=null; try{ nota=((await fetch("novidades.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json())).itens||[]).find(x=>x.programa===pj.versao); }catch(e){}
    if(tok!==VTOK) return;
    if(nota){ const dt=new Date(nota.t); pt.append(el("b",{text:fmtDH(dt)}), el("span",{text:`horário de Brasília · ${haQuanto(dt)}`})); const ul=el("ul",{class:"v-list"}); (nota.itens||[]).forEach(t=>ul.append(el("li",{text:t}))); prog.append(ul); }
    else try{ const c=(await fetch("https://api.github.com/repos/KVNr2/balcao-de-negocios-do-fumaca/commits?path=programa/versao.json&per_page=1",{headers:{Accept:"application/vnd.github+json"}}).then(r=>r.json()))[0];
      const dt=new Date(c.commit.committer.date); pt.append(el("b",{text:fmtDH(dt)}), el("span",{text:`horário de Brasília · ${haQuanto(dt)} · ${c.commit.message.split("\n")[0].replace(/^AlbionSpecs\s*[\d.]+:\s*/,"")}`})); }catch(e){}
    prog.append(el("div",{class:"v-st ok"},el("span",{class:"v-dot"}),el("span",{text:"O programa se atualiza sozinho ao abrir; não precisa recarregar o site."})));
  }catch(e){ prog.append(el("p",{class:"muted",text:"Não consegui ler a versão do programa agora."})); } })();
  /* commits mais novos que esta versão: o commit que gerou a versão é o último que mexeu em versao.json; o que veio depois ainda não entrou no ar */
  const pend=el("div",{class:"v-pend"}); box.append(pend); pend.append(el("small",{class:"muted",text:"Verificando se há atualizações a caminho…"}));
  const REPO="https://api.github.com/repos/KVNr2/balcao-de-negocios-do-fumaca";
  const gh=u=>fetch(REPO+u,{headers:{Accept:"application/vnd.github+json"}}).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });
  (async()=>{ try{
    const base=(await gh("/commits?path=versao.json&per_page=1"))[0]; const cmp=await gh(`/compare/${base.sha}...main`);
    if(tok!==VTOK) return; pend.textContent=""; let n=cmp.ahead_by||0;
    /* commits que só mexeram no programa (.exe) ou em ferramentas não mudam o site: não são "atualização a caminho" */
    if(n&&Array.isArray(cmp.files)&&cmp.files.length&&cmp.files.every(f=>/^(programa|tools)\//.test(f.filename))) n=0;
    const box2=el("div",{class:"v-st "+(n?"novo":"ok")}); box2.append(el("span",{class:"v-dot"}), el("span",{text:n?`Faltam ${n} ${n===1?"atualização":"atualizações"} entrarem no ar (a publicação leva de 1 a 2 minutos).`:"Tudo o que foi enviado ao repositório já está no ar."}));
    const rb=el("button",{type:"button",class:"bc-more",text:"Verificar de novo"}); rb.addEventListener("click",()=>renderVersao()); box2.append(rb); pend.append(box2);
    if(n){ const ul=el("ul",{class:"v-list"}); cmp.commits.slice(-8).reverse().forEach(c=>{ const dt=new Date(c.commit.committer.date); ul.append(el("li",{text:`${fmtDH(dt)} · ${c.commit.message.split("\n")[0]}`})); }); pend.append(ul); }
  }catch(e){ pend.textContent=""; pend.append(el("small",{class:"muted",text:"Não consegui verificar se há atualizações a caminho agora (limite do GitHub ou sem conexão)."})); } })();
  box.append(el("h4",{text:"Dados do site"}));
  const grid=el("div",{class:"v-grid"}); box.append(grid);
  const fontes=[["ZvZ (lutas de 200+ jogadores)","data/zvz.json",j=>j.atualizado],["PVP (killboard, servidor US)","data/pvp.json",j=>j.atualizado],["Builds (AlbionOnlineGrind)","data/builds-grind.json",j=>j.atualizado],["Composições (Top Comps)","data/comps.json",j=>j.atualizado]];
  for(const [nome,url,f] of fontes){
    const c=el("div",{class:"v-card"}); c.append(el("small",{class:"v-k",text:nome})); const v=el("b",{text:"…"}); c.append(v); grid.append(c);
    fetch(url+"?"+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(j=>{ const raw=f(j)||""; const dd=new Date(/T/.test(raw)?raw:raw+"T00:00:00Z"); if(isNaN(dd)){ v.textContent=raw||"sem data"; return; } v.textContent=/T/.test(raw)?`${fmtDH(dd)} (${haQuanto(dd)})`:dd.toLocaleDateString("pt-BR",{timeZone:"UTC"}); }).catch(()=>{ v.textContent="indisponível"; });
  }
}
