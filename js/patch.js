/* ================= aba Patch: notas oficiais do Albion no formato do albionzvz.com =================
   Dados: data/patches.json, escrito a partir das notas oficiais de patch do fórum do Albion
   (forum.albiononline.com, categoria Patch Notes, e o Log de alterações em albiononline.com/changelog). */
let PATCHES=null, PT_FILTRO="todos";
const PT_DATA=s=>{ const d=new Date(s+"T12:00:00Z"); return isNaN(d)?s:d.toLocaleDateString("pt-BR",{timeZone:"UTC",day:"2-digit",month:"long",year:"numeric"}); };
function ptNum(s){ const m=/-?\d+(?:[.,]\d+)?/.exec(String(s||"").replace(/\s/g,"")); return m?parseFloat(m[0].replace(",",".")):null; }
function ptPct(de,para){ const a=ptNum(de), b=ptNum(para); if(a==null||b==null||a===0) return null; const p=(b-a)/Math.abs(a)*100; if(Math.abs(p)<0.05) return null;
  const r=Math.abs(p)>=100?Math.round(p):Math.round(p*10)/10; return (r>0?"+":"−")+String(Math.abs(r)).replace(".",",")+"%"; }
function ptIcone(it){ let id=it.ic||null;
  if(id&&!/^T\d/.test(id)) id="T8_"+id;
  if(!id){ try{ const k=GEAR&&typeof gearKey==="function"?gearKey(it.item):null; if(k) id="T8_"+k; }catch(e){} }
  if(!id) return null;
  const im=el("img",{class:"pt-ic",src:`icons/${id}.webp`,alt:"",loading:"lazy",width:"48",height:"48"}); im.addEventListener("error",()=>{ im.style.visibility="hidden"; }); return im; }
let PT_NOMES=null; /* data/nomes-ptbr.json: nomes oficiais do jogo (i: itens, h: habilidades), inglês → português */
function ptUm(n){ n=(n||"").trim(); if(!n) return n; const d=PT_NOMES&&PT_NOMES.i; if(d&&d[n]) return d[n];
  const m=n.match(/^(?:Todos os|Todas as|All)\s+(.+?)s?$/); if(m&&d&&d[m[1]]) return "Todos os "+d[m[1]];
  try{ const k=GEAR&&typeof gearKey==="function"?gearKey(n):null; if(k&&GEAR.p&&GEAR.p[k]) return GEAR.p[k]; }catch(e){} return n; }
function ptTrad(txt){ return (txt||"").split(/( e | and |, | \/ )/).map((t,i)=>i%2?t:ptUm(t)).join(""); }
function ptNome(it){ return it.nome||ptTrad(it.item); }
function ptHab(it){ const h=it.hab||""; if(!h||it.hab_pt) return it.hab_pt||h; const m=h.match(/^(.*?)(\s*\([^)]*\))?$/), b=(m&&m[1]||h).trim(), x=m&&m[2]||"", d=PT_NOMES&&PT_NOMES.h; return d&&d[b]?d[b]+x:h; }
const ptEl=(tag,props,kids)=>el(tag,props,...(kids||[]));
const PT_TIPO={buff:"Buff",nerf:"Nerf",mudou:"Mudou"};
function ptLinha(l){ const row=el("div",{class:"pt-row"}); row.append(el("span",{class:"pt-r",text:l.r}));
  const v=el("span",{class:"pt-v"});
  if(l.texto){ v.append(el("span",{class:"pt-tx",text:l.texto})); }
  else { v.append(el("span",{class:"pt-de",text:l.de}),el("span",{class:"pt-seta",text:"→"}),el("b",{class:"pt-para",text:l.para})); const p=ptPct(l.de,l.para); if(p) v.append(el("small",{class:"pt-pct "+(p[0]==="+"?"up":"dn"),text:p})); }
  row.append(v); return row; }
function ptCard(it,idx,cat){ const c=el("article",{class:"pt-card "+it.tipo,id:`pt-${idx}`}); c.dataset.tipo=it.tipo;
  const h=el("header",{class:"pt-ch"}); const ic=ptIcone(it); if(ic) h.append(ic);
  const t=el("div",{class:"pt-ct"}); if(cat) t.append(el("small",{class:"pt-kick",text:cat})); t.append(el("b",{text:ptNome(it)}),el("small",{text:ptHab(it)})); h.append(t,el("span",{class:"pt-badge "+it.tipo,text:PT_TIPO[it.tipo]||it.tipo,title:it.auto?"Classificação automática: pode errar":""})); c.append(h);
  (it.linhas||[]).forEach(l=>c.append(ptLinha(l)));
  if(it.nota) c.append(ptEl("p",{class:"pt-nota"},[el("b",{text:it.auto?"Nota dos devs (original) ":"Nota dos devs "}),document.createTextNode(it.nota)]));
  return c; }
function ptCompacto(a){ const w=el("div",{class:"pt-comp"});
  if(a.idioma==="en") w.append(el("p",{class:"small muted",text:"Texto original em inglês, lido automaticamente do fórum oficial."}));
  (a.balance||[]).forEach(g=>{ const ul=el("ul",{class:"pt-sim"}); g.itens.forEach(it=>{ const li=el("li"); li.append(el("span",{class:"pt-badge "+it.tipo,text:PT_TIPO[it.tipo]||it.tipo}),el("span",{text:`${ptNome(it)}${it.hab?" ("+ptHab(it)+")":""}: `+(it.linhas||[]).map(l=>l.texto!=null?`${l.r}${l.texto?": "+l.texto:""}`:`${l.r}: ${l.de} → ${l.para}`).join("; ")})); ul.append(li); }); w.append(el("h4",{class:"pt-gh",text:g.cat}),ul); });
  (a.secoes||[]).forEach(s=>{ w.append(el("h4",{class:"pt-gh",text:s.titulo})); const ul=el("ul",{class:"pt-sim"}); (s.itens||[]).forEach(([s1,tx])=>{ const li=el("li"); li.append(el("span",{class:"pt-s",text:s1,"aria-hidden":"true"}),el("span",{text:tx})); ul.append(li); }); w.append(ul); });
  (a.fixes||[]).forEach(g=>{ w.append(el("h4",{class:"pt-gh",text:"Correções: "+g.grupo})); const ul=el("ul",{class:"pt-sim"}); g.itens.forEach(x=>{ const li=el("li"); if(x.p) li.append(el("span",{class:"pt-plat",text:x.p})); li.append(el("span",{text:x.t})); ul.append(li); }); w.append(ul); });
  return w; }
function ptSecao(s){ const b=el("section",{class:"block pt-sec",id:"pt-"+s.id}); b.append(el("h3",{class:"orn",text:s.titulo}));
  if(s.intro) b.append(el("p",{class:"small muted",text:s.intro}));
  if(s.tabela){ const t=el("table",{class:"pt-tab"}); const th=el("tr"); s.tabela.cab.forEach(x=>th.append(el("th",{text:x}))); t.append(ptEl("thead",{},[th])); const tb=el("tbody"); s.tabela.linhas.forEach(r=>{ const tr=el("tr"); r.forEach(x=>tr.append(el("td",{text:x}))); tb.append(tr); }); t.append(tb); b.append(ptEl("div",{class:"tbl"},[t])); }
  const ul=el("ul",{class:"pt-sim"}); (s.itens||[]).forEach(([s1,tx])=>{ const li=el("li"); li.append(el("span",{class:"pt-s s"+({"▲":"up","▼":"dn","!":"nw","=":"eq","⇄":"vr"}[s1]||"nw"),text:s1,"aria-hidden":"true"}),el("span",{text:tx})); ul.append(li); }); b.append(ul); return b; }
function ptFixes(p){ const b=el("section",{class:"block pt-sec",id:"pt-fixes"}); const n=(p.fixes||[]).reduce((a,g)=>a+g.itens.length,0); b.append(el("h3",{class:"orn",text:`Correções (${n})`}));
  p.fixes.forEach(g=>{ b.append(el("h4",{class:"pt-gh",text:`${g.grupo} (${g.itens.length})`})); const ul=el("ul",{class:"pt-sim"}); g.itens.forEach(x=>{ const li=el("li"); if(x.p) li.append(el("span",{class:"pt-plat",text:x.p})); li.append(el("span",{text:x.t})); ul.append(li); }); b.append(ul); }); return b; }
function ptRender(){
  const box=$("patchBox"); if(!box||!PATCHES) return; box.textContent="";
  const [p,...ant]=PATCHES.patches; const bal0=p.balance||[], sec0=p.secoes||[], fix0=p.fixes||[], en=p.idioma==="en"; const todos=[]; bal0.forEach(g=>g.itens.forEach(it=>todos.push(it)));
  const nb=todos.filter(x=>x.tipo==="buff").length, nn=todos.filter(x=>x.tipo==="nerf").length;
  const head=el("div",{class:"pt-head"}); const top=el("div",{class:"pt-top"}); top.append(el("span",{class:"pt-live",text:"No ar"}),el("small",{class:"muted",text:`${p.versao?"Versão "+p.versao+" · ":""}${PT_DATA(p.data)}`})); head.append(top,el("h2",{text:p.titulo}),el("p",{class:"small muted",text:p.resumo}));
  const fonte=el("p",{class:"small pt-fonte"}); fonte.append(document.createTextNode("Fonte: "));
  [["Notas gerais","geral"],["Equilíbrio de combate","combate"],["Log de alterações oficial","oficial"]].filter(([t,k])=>p.links&&p.links[k]).forEach(([t,k],i)=>{ if(i) fonte.append(document.createTextNode(" · ")); fonte.append(el("a",{href:p.links[k],target:"_blank",rel:"noopener",text:t})); });
  head.append(fonte);
  if(en) head.append(el("p",{class:"small pt-aviso",text:"Este patch foi lido automaticamente do fórum oficial e está no texto original, em inglês, ainda sem tradução. A classificação em buff ou nerf é um palpite automático (pelo sentido dos números) e pode errar: confira nos valores."}));
  const chips=el("div",{class:"pt-chips"}); const ch=(t,cls,alvo)=>{ const b=el("button",{type:"button",class:"pt-chip "+cls,text:t}); b.addEventListener("click",()=>{ if(alvo==="buff"||alvo==="nerf"){ PT_FILTRO=alvo; ptRender(); const e=$("pt-bal"); if(e) e.scrollIntoView({behavior:"smooth",block:"start"}); } else { const e=$(alvo); if(e) e.scrollIntoView({behavior:"smooth",block:"start"}); } }); chips.append(b); };
  if(todos.length){ ch(`${nb} buffs`,"buff","buff"); ch(`${nn} nerfs`,"nerf","nerf"); } if(sec0.length) ch(`${sec0.length} atualizações de conteúdo`,"cont","pt-"+sec0[0].id); if(fix0.length) ch(`Correções`,"fix","pt-fixes");
  head.append(chips); box.append(head);
  /* sua arma foi atingida? */
  const gl=el("section",{class:"block pt-glance",id:"pt-glance"}); if(todos.length){ gl.append(el("h3",{class:"orn",text:"Sua arma foi mexida?"}),el("p",{class:"small muted",text:"Itens com mudança neste patch. Toque num item para ver os números."}));
  [["buff","Buffs",nb],["nerf","Nerfs",nn]].forEach(([tp,tt,n])=>{ const g=el("div",{class:"pt-gl "+tp}); g.append(el("h4",{class:"pt-gh",text:`${tt} (${n})`})); const w=el("div",{class:"pt-icons"});
    todos.forEach((it,i)=>{ if(it.tipo!==tp) return; const a=el("button",{type:"button",class:"pt-mini",title:ptNome(it)}); const ic=ptIcone(it); if(ic) a.append(ic); a.append(el("span",{text:ptNome(it)})); a.addEventListener("click",()=>{ PT_FILTRO="todos"; ptRender(); const e=$(`pt-${i}`); if(e){ e.scrollIntoView({behavior:"smooth",block:"center"}); e.classList.add("pt-flash"); } }); w.append(a); }); g.append(w); gl.append(g); }); box.append(gl); }
  /* equilíbrio de combate */
  const bal=el("section",{class:"block",id:"pt-bal"}); if(todos.length){ bal.append(el("h3",{class:"orn",text:`Equilíbrio de combate (${todos.length})`}));
  const seg=el("div",{class:"seg sm",role:"group","aria-label":"Filtro"}); [["todos",`Todos ${todos.length}`],["buff",`Buffs ${nb}`],["nerf",`Nerfs ${nn}`]].forEach(([k,t])=>{ const b=el("button",{type:"button","aria-pressed":String(PT_FILTRO===k),text:t}); b.addEventListener("click",()=>{ PT_FILTRO=k; ptRender(); const e=$("pt-bal"); if(e) e.scrollIntoView({block:"start"}); }); seg.append(b); }); bal.append(seg);
  const gd=el("div",{class:"pt-grid"}); let i=0;
  bal0.forEach(g=>{ const itens=g.itens.map(it=>[it,i++]).filter(([it])=>PT_FILTRO==="todos"||it.tipo===PT_FILTRO); if(!itens.length) return; itens.forEach(([it,ix])=>gd.append(ptCard(it,ix,g.cat))); });
  bal.append(gd); box.append(bal); }
  sec0.forEach(s=>box.append(ptSecao(s))); if(fix0.length) box.append(ptFixes(p));
  /* patches anteriores */
  const an=el("section",{class:"block",id:"pt-ant"}); an.append(el("h3",{class:"orn",text:"Patches anteriores"}));
  ant.forEach(a=>{ const d=el("details",{class:"pt-ant-i"}); const s=el("summary"); s.append(el("b",{text:a.titulo}),el("small",{class:"muted",text:PT_DATA(a.data)}),el("span",{class:"small",text:a.resumo})); d.append(s);
    if(a.anterior){ const t=el("table",{class:"bm2t lst"}); const tb=el("tbody"); a.anterior.forEach(([k,v])=>tb.append(ptEl("tr",{class:"bm-row"},[el("td",{text:k}),el("td",{text:v})]))); t.append(tb); d.append(ptEl("div",{class:"tbl bm2 patchl"},[t])); }
    else d.append(ptCompacto(a));
    an.append(d); });
  box.append(an);
  box.append(ptEl("p",{class:"small muted pt-rodape"},[document.createTextNode("Notas oficiais do Albion Online (forum.albiononline.com), atualizadas automaticamente uma vez por dia; os patches traduzidos foram resumidos à mão. Os percentuais de variação são calculados pelo site a partir dos valores “era → agora”. A classificação em buff ou nerf é leitura nossa. Conteúdo não afiliado à Sandbox Interactive.")]));
}
async function renderPatch(){
  const box=$("patchBox"); if(!box) return;
  if(!PATCHES){ box.textContent="Carregando as notas de patch…"; try{ const [pj]=await Promise.all([need("patches"),(PT_NOMES?Promise.resolve():need("nomes-ptbr").then(n=>{ PT_NOMES=n; }).catch(()=>{})),(GEAR?Promise.resolve():need("gear").then(g=>{ GEAR=g; }).catch(()=>{}))]); PATCHES=pj; }catch(e){ box.textContent="Não consegui carregar as notas de patch agora."; return; } }
  ptRender();
}
