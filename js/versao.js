/* ================= aba Versão: versão no ar, hora da publicação e frescor dos dados ================= */
const fmtDH = d => d.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
function haQuanto(d){ const s=Math.max(0,(Date.now()-d.getTime())/1000); if(s<90) return "agora mesmo"; const m=Math.round(s/60); if(m<60) return `há ${m} min`; const h=Math.round(m/60); if(h<36) return `há ${h} h`; return `há ${Math.round(h/24)} dias`; }
let VTOK=0;
async function renderVersao(){
  const tok=++VTOK, box=$("vBox"); const meu=document.documentElement.dataset.v||"";
  let pub=null; try{ pub=await fetch("versao.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json()); }catch(e){}
  if(tok!==VTOK) return; box.textContent="";
  if(!pub){ box.append(el("p",{class:"muted",text:"Não consegui ler a versão publicada agora. Confira a conexão e abra a aba de novo."})); return; }
  const d=new Date(pub.publicado); const atual=pub.v===meu;
  const hero=el("div",{class:"v-hero"});
  hero.append(el("small",{class:"v-k",text:"Versão no ar"}), el("div",{class:"v-code",text:pub.v}));
  const t=el("div",{class:"v-time"}); t.append(el("b",{text:fmtDH(d)}), el("span",{text:`horário de Brasília · ${haQuanto(d)}`})); hero.append(t);
  const st=el("div",{class:"v-st "+(atual?"ok":"novo")});
  st.append(el("span",{class:"v-dot"}), el("span",{text:atual?"Você está usando a versão mais recente.":`Há uma versão nova (a sua é ${meu}).`}));
  if(!atual){ const b=el("button",{type:"button",class:"bc-more",text:"Recarregar agora"}); b.addEventListener("click",()=>location.reload()); st.append(b); }
  hero.append(st); box.append(hero);
  /* novidades: com versão nova, mostra o que veio depois da versão do visitante; senão, as últimas */
  (async()=>{ try{
    const nv=await fetch("novidades.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json()), todas=(nv.itens||[]).slice().sort((a,b)=>b.t.localeCompare(a.t)); if(tok!==VTOK) return;
    const mine=(pub.hist||[]).find(h=>h.v===meu); let lista, titulo;
    if(!atual&&mine){ lista=todas.filter(x=>x.t>mine.t); titulo="O que há de novo nesta versão"; } else if(!atual){ lista=todas.slice(0,5); titulo="Novidades recentes"; } else { lista=todas.slice(0,6); titulo="O que mudou nas últimas atualizações"; }
    if(!lista.length) return;
    const sec=el("div",{class:"v-nov"}); sec.append(el("h4",{text:titulo}));
    for(const x of lista){ const c=el("div",{class:"v-nov-i"}); c.append(el("b",{text:x.titulo}),el("small",{class:"muted",text:fmtDH(new Date(x.t))})); const ul=el("ul",{class:"v-list"}); (x.itens||[]).forEach(t=>ul.append(el("li",{text:t}))); c.append(ul); sec.append(c); }
    hero.insertAdjacentElement("afterend",sec);
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
