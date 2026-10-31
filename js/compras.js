/* Lista de compras: os materiais que você mandou do Craft, Refino, Cozinha e Rotação, juntos e separados por cidade.
   Cada linha tem a quantidade, o preço de quando foi posta (ordem de compra ou compra na hora) e de onde veio.
   Fica salva neste aparelho (o overlay tem a dele). Itens iguais na mesma cidade e do mesmo jeito somam. */
const LC_KEY="compras";
let LC=(()=>{ try{ const v=JSON.parse(store.get(LC_KEY)||"[]"); return Array.isArray(v)?v:[]; }catch(e){ return []; } })();
const lcSave=()=>{ try{ store.set(LC_KEY,JSON.stringify(LC)); }catch(e){} lcBadge(); };
/* list: [{id, nm, q, c (cidade), p (preço de cada), modo ("ordem" | "inst")}]; origem: texto curto ("Craft: Espada Larga T6.1") */
function lcAdd(list,origem){
  let n=0;
  for(const x of list){ if(!x||!x.id||!(x.q>0)) continue; const c=x.c||"Qualquer cidade", modo=x.modo==="ordem"?"ordem":"inst", k=x.id+"|"+c+"|"+modo;
    const cur=LC.find(i=>i.k===k&&!i.feito);
    if(cur){ cur.q+=Math.ceil(x.q); if(x.p>0) cur.p=x.p; if(origem&&!cur.origem.includes(origem)) cur.origem.push(origem); }
    else LC.push({k,id:x.id,nm:x.nm||x.id,q:Math.ceil(x.q),c,p:x.p||0,modo,origem:origem?[origem]:[],feito:false,t:Date.now()});
    n++; }
  lcSave(); if(n&&typeof toast==="function") toast(`${n} ${n===1?"material foi":"materiais foram"} para a Lista de compras`);
  const pg=$("p-compras"); if(pg&&!pg.hidden) renderCompras();
}
function lcBtn(get,origem,txt){ const b=el("button",{type:"button",class:"btn ghost",text:txt||"Pôr na lista de compras"}); b.addEventListener("click",ev=>{ ev.stopPropagation(); try{ const l=get(); if(l&&l.length) lcAdd(l,typeof origem==="function"?origem():origem); }catch(e){ if(typeof toast==="function") toast("Não consegui pôr na lista"); } }); return b; }
function lcBadge(){ const t=$("t-compras"); if(!t) return; const em=t.querySelector(".fl"); const n=LC.filter(i=>!i.feito).length; if(em) em.textContent=n?`${n} ${n===1?"item":"itens"}`:"vazia"; }
function lcTexto(cidade,linhas){ return `${cidade}:\n`+linhas.map(i=>`- ${fmt(i.q)}x ${i.nm}${i.p?` (${i.modo==="ordem"?"ordem a":"na hora,"} ${fmt(i.p)})`:""}`).join("\n"); }
function renderCompras(){
  const box=$("lcBox"); if(!box) return; box.textContent=""; lcBadge();
  const abertos=LC.filter(i=>!i.feito), feitos=LC.filter(i=>i.feito);
  const topo=el("div",{class:"lc-top"});
  const tot=abertos.reduce((a,i)=>a+i.q*(i.p||0)*(i.modo==="ordem"?1.025:1),0);
  topo.append(el("p",{class:"small",text:abertos.length?`${fmt(abertos.length)} ${abertos.length===1?"material":"materiais"} para comprar, uns ${fmtS(tot)} pelos preços de quando foram postos (ordem já com os 2,5%).`:"Nada para comprar. Use Pôr na lista de compras no Craft, Refino, Cozinha ou Rotação de craft."}));
  const acoes=el("div",{class:"btnrow"});
  if(feitos.length){ const b=el("button",{type:"button",class:"btn ghost",text:`Tirar os comprados (${feitos.length})`}); b.addEventListener("click",()=>{ LC=LC.filter(i=>!i.feito); lcSave(); renderCompras(); }); acoes.append(b); }
  if(LC.length){ const b=el("button",{type:"button",class:"btn ghost",text:"Limpar tudo"}); b.addEventListener("click",()=>{ if(b.dataset.ok){ LC=[]; lcSave(); renderCompras(); } else { b.dataset.ok="1"; b.textContent="Clique de novo para limpar"; setTimeout(()=>{ delete b.dataset.ok; b.textContent="Limpar tudo"; },3000); } }); acoes.append(b); }
  topo.append(acoes); box.append(topo);
  const cidades=[...new Set(LC.map(i=>i.c))].sort((a,b)=>a.localeCompare(b,"pt"));
  for(const c of cidades){ const ls=LC.filter(i=>i.c===c).sort((a,b)=>(a.feito-b.feito)||a.nm.localeCompare(b.nm,"pt")), ab=ls.filter(i=>!i.feito);
    const card=el("article",{class:"lc-c"}), hd=el("div",{class:"lc-h"});
    const sub=ab.reduce((a,i)=>a+i.q*(i.p||0)*(i.modo==="ordem"?1.025:1),0);
    hd.append(el("h4",{text:bagCityPT(c)}),el("span",{class:"muted small",text:ab.length?`${ab.length} para comprar · ${fmtS(sub)}`:"tudo comprado"}));
    const cp=el("button",{type:"button",class:"btn sm ghost",text:"Copiar"}); cp.addEventListener("click",async()=>{ try{ await navigator.clipboard.writeText(lcTexto(bagCityPT(c),ab)); cp.textContent="Copiado"; }catch(e){ cp.textContent="Não deu"; } setTimeout(()=>{ cp.textContent="Copiar"; },1500); });
    if(ab.length) hd.append(cp);
    card.append(hd);
    for(const i of ls){ const r=el("label",{class:"lc-i"+(i.feito?" feito":"")}), cb=el("input",{type:"checkbox"}); cb.checked=!!i.feito;
      cb.addEventListener("change",()=>{ i.feito=cb.checked; lcSave(); renderCompras(); });
      const tx=el("span",{class:"lc-tx"},el("b",{text:`${fmt(i.q)}x ${i.nm}`}),el("small",{class:"muted",text:`${i.p?`${i.modo==="ordem"?"ordem a":"na hora,"} ${fmt(i.p)} · ${fmtS(i.q*i.p)}`:"sem preço"}${i.origem.length?` · ${i.origem.slice(0,3).join(", ")}${i.origem.length>3?"…":""}`:""}`}));
      const rm=el("button",{type:"button",class:"lc-x",text:"×","aria-label":`Tirar ${i.nm} da lista`}); rm.addEventListener("click",ev=>{ ev.preventDefault(); LC=LC.filter(x=>x!==i); lcSave(); renderCompras(); });
      r.append(cb,iconImg(i.id,32),tx,rm); card.append(r); }
    box.append(card); }
}
setTimeout(lcBadge,0);
