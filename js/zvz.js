/* ================= aba Build ZvZ: o que as maiores lutas recentes (albionbb, 100+ jogadores) estão usando ================= */
let ZVZ = null, zRole = "healer", zAli = "";
const ZROLE = [["tank","Tanks"],["healer","Curandeiros"],["support","Suportes"],["range","Ranged"],["melee","Melee"],["battlemount","Montaria de batalha"]];
const ZSLOT = [["cabeca","Elmo"],["peito","Peito"],["botas","Botas"],["capa","Capa"],["off","Secundária"],["pocao","Poção"],["comida","Comida"]];
function zimg(code,t,e,cls,q=1){
  const im=el("img",{class:cls||"nico",alt:"",width:"28",height:"28",loading:"lazy",decoding:"async"}); im.referrerPolicy="no-referrer";
  let ids; const mk=()=>{ ids=[`T${t}_${code}${e?"@"+e:""}`]; if(e) ids.push(`T${t}_${code}`); }; mk();
  let i=0; const set=()=>iconSrc(im,ids[i],()=>{ if(++i<ids.length) set(); else { im.onerror=null; im.classList.add("nico-off"); } },q); set(); im._q=nq=>{ if(nq===q) return; q=nq; i=0; im.classList.remove("nico-off"); set(); };
  /* troca o tier/encanto do ícone (ex.: ao escolher "T6 equivalente") */
  im._id=(nt,ne)=>{ if(nt===t&&ne===e) return; t=nt; e=ne; mk(); i=0; im.classList.remove("nico-off"); set(); }; return im;
}
const zNome = c => { buildIdx(); return codeName(c); };
const zPct = (n,t) => t?Math.round(n*1000/t)/10:0;
function zFonte(){ return ZVZ.papeis; }
function zDados(){ if(!zAli) return ZVZ.papeis; const a=ZVZ.aliancas.find(x=>x.nome===zAli); return a?a.papeis:ZVZ.papeis; }
/* ===== Overgear e qualidade, lidos do IP médio que os jogadores tinham na luta =====
   Teto = IP médio que esse conjunto (arma, secundária, elmo, peito, botas, capa) alcança com a ficha cheia (maestria e todas as specs no máximo) em qualidade Normal.
   A maioria dos jogadores não é cheia em tudo; então IP até o teto é compatível com Normal. Overgear = overcharge do Albion (até +100 de IP com todas as peças). Acima do teto: até +20 qualidade Boa e/ou pouco overcharge; até +100 provável overcharge; acima de +100 overcharge completo mais qualidade melhor (em ZvZ Excelente/Obra-prima são raras pelo custo). */
const zTeto=(w,v)=>{ const zid=x=>x?`T${x.t}_${x.c}${x.e?"@"+x.e:""}`:""; const two=/^2H_/.test(w);
  const ids=[`T${v.arma.t}_${w}${v.arma.e?"@"+v.arma.e:""}`,zid(v.off),zid(v.cabeca),zid(v.peito),zid(v.botas),zid(v.capa)]; let sum=0;
  for(let i=0;i<ids.length;i++){ if(!ids[i]) continue; const r=ipItemFull(ids[i]); if(!r) return null; sum+=r.ip*(i===0&&two?2:1); }
  return Math.round(sum/6); };
const zQmin=x=>x<=20?"Bom":x<=40?"Excepcional":x<=60?"Excelente":"Obra-prima";
function zLeitura(w,v){ if(!v.ip) return null; let teto; try{ teto=zTeto(w,v); }catch(e){ return null; } if(!teto) return null;
  const exc=v.ip-teto, pouco=v.n<3?` (amostra pequena: ${v.n} ${v.n===1?"jogador":"jogadores"})`:"", cards=[];
  if(exc<=0) cards.push(["ok","Compatível com qualidade Normal","IP "+(-exc)+" abaixo do máximo possível ("+teto+" com spec cheia, qualidade Normal). Sem sinal de overgear nem de qualidade melhor."+pouco]);
  else if(exc<=20) cards.push(["both","Overgear leve e/ou qualidade Boa","IP "+exc+" acima do máximo possível em Normal ("+teto+"). Pode ser um pouco de overcharge (overgear) e/ou peças Boas (+20), as duas opções mais baratas."+pouco]);
  else if(exc<=100) cards.push(["over","Overgear (overcharge) provável","IP "+exc+" acima do máximo possível em Normal ("+teto+"), "+(exc>=90?"quase todo o":"cerca de "+exc+"% do")+" overcharge possível (até +100 com todas as peças). Qualidade Excepcional ou melhor também explicaria, mas custa bem mais, então o overgear é o mais provável."+pouco]);
  else if(exc<=200) cards.push(["both","Overgear e qualidade melhor","IP "+exc+" acima do máximo possível em Normal ("+teto+"): passa do overcharge completo (+100), então além do overgear provavelmente havia qualidade melhor, cerca de "+zQmin(exc-100)+" na média."+pouco]);
  else cards.push(["over","Muito acima do possível","IP "+exc+" acima do máximo possível em Normal ("+teto+"), mais que overcharge completo e Obra-prima juntos (+200). Provável que as peças tivessem tier ou encanto maior que o mostrado, ou que a estimativa esteja baixa para esse conjunto."+pouco]);
  return {teto,cards}; }
function zVariante(w,v,idx){
  const box=el("div",{class:"zvar"}); const row=el("div",{class:"zgear"});
  const mk=(code,t,e,tt)=>{ const w_=el("div",{class:"zg",title:zNome(code)+(e?"."+e:"")}); w_.append(zimg(code,t,e,"nico zi")); w_.append(el("span",{class:"zg-t",text:`${t}.${e||0}`})); return w_; };
  row.append(mk(w,v.arma.t,v.arma.e));
  for(const [k] of ZSLOT){ if(v[k]) row.append(mk(v[k].c,v[k].t,v[k].e)); }
  const zb=zBuild(w,v), vbadge=albionBadge(zb); vbadge.classList.add("ip-in"); row.append(vbadge); box.append(row,albionBar(zb,vbadge,`z:${w}:${idx}`,{qBar:true}),el("p",{class:"muted small",text:`${v.n} ${v.n===1?"jogador usou":"jogadores usaram"} este conjunto de elmo, peito e botas `}));
  const lei=zLeitura(w,v); if(lei){ const obs=el("div",{class:"zobs"}); obs.append(el("div",{class:"zobs-ip",title:"IP médio dos jogadores que usaram este conjunto, lido da luta"},el("small",{text:"IP médio na luta"}),el("b",{text:String(v.ip)})),el("div",{class:"zobs-ip zobs-max",title:"IP médio que esse conjunto alcança com a ficha cheia (maestria e specs no máximo) em qualidade Normal"},el("small",{text:"Máx. spec cheia"}),el("b",{text:String(lei.teto)}))); lei.cards.forEach(([k,t,d])=>{ const c=el("div",{class:"zobs-c "+k}); c.append(el("b",{text:t}),el("span",{text:d})); obs.append(c); }); box.append(obs); }
  return box;
}
const zBuild=(w,v)=>{ const zid=x=>x?`T${x.t}_${x.c}${x.e?"@"+x.e:""}`:"";
  return {o:v.off?[zid(v.off)]:[],t:zNome(w),w:`T${v.arma.t}_${w}${v.arma.e?"@"+v.arma.e:""}`,h:[zid(v.cabeca)],a:[zid(v.peito)],s:[zid(v.botas)],c:[zid(v.capa)],p:[zid(v.pocao)],f:[zid(v.comida)]}; };
function zCard(w,n,total,role){
  const info=ZVZ.armas[w]; const card=el("div",{class:"zcard"});
  const top=el("div",{class:"zc-top"}); top.append(zimg(w,info&&info.variantes[0]?info.variantes[0].arma.t:8,info&&info.variantes[0]?info.variantes[0].arma.e:0,"nico zbig"));
  const mid=el("div",{class:"zc-mid"}); mid.append(el("strong",{text:zNome(w)}),el("span",{class:"muted small",text:`${n} ${n===1?"jogador":"jogadores"} · ${zPct(n,total)}% de ${ROLE_Z(role)}`}));
  const bar=el("div",{class:"zbar"}); bar.append(el("i",{style:`width:${Math.min(100,zPct(n,total)*2.2)}%`})); mid.append(bar); top.append(mid); card.append(top);
  if(info&&info.variantes.length){ const zb0=zBuild(w,info.variantes[0]); const ab=albionBar(zb0,null,`z:${w}:0`); ab.classList.add("z-alb"); ab.title="Copia a build mais usada desta arma"; card.append(ab); }
  if(info&&info.variantes.length){ const det=el("details",{class:"zdet"}); det.append(el("summary",{text:`Build completa (${info.mortes} mortes e abates analisados)`}));
    info.variantes.forEach((v,i)=>det.append(zVariante(w,v,i))); card.append(det); }
  else card.append(el("p",{class:"muted small",text:"Sem build completa nas mortes recentes."}));
  return card;
}
const ROLE_Z = r => (ZROLE.find(x=>x[0]===r)||[0,r])[1].toLowerCase();
function renderZvz(){
  const host=$("zList"); if(!host) return; 
  if(!ZVZ){ if(!renderZvz._l){ renderZvz._l=1; need("zvz").then(d=>{ ZVZ=d; renderZvz(); }).catch(()=>{ $("zNote").textContent="Os dados do ZvZ ainda não foram gerados. Eles aparecem depois da primeira atualização automática."; }); } return; }
  const j=ZVZ.janela, d=zDados();
  $("zNote").textContent=`Fonte: ${ZVZ.fonte}. ${j.batalhas} batalhas · ${j.jogadores} jogadores · ${j.mortes} mortes lidas. Atualizado em ${new Date(ZVZ.atualizado).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}.`;
  const rs=$("zRoles"); rs.textContent="";
  for(const [k,n] of ZROLE){ const t=(d[k]||{}).total||0; if(!t&&k!==zRole) continue; const b=el("button",{type:"button","aria-pressed":String(zRole===k),text:`${n} (${t})`}); b.addEventListener("click",()=>{ zRole=k; renderZvz(); }); rs.append(b); }
  const sel=$("zAli"); if(!sel._ok){ sel._ok=1; sel.append(el("option",{value:"",text:"Todas as alianças"})); ZVZ.aliancas.forEach(a=>sel.append(el("option",{value:a.nome,text:`${a.nome} (${a.jogadores} jogadores${a.ip?", IP "+a.ip:""})`}))); sel.addEventListener("change",()=>{ zAli=sel.value; renderZvz(); }); }
  host.textContent=""; const r=d[zRole];
  if(!r||!r.armas.length){ host.append(el("p",{class:"empty",text:"Sem dados para esta função."})); return; }
  for(const [w,n] of r.armas) host.append(zCard(w,n,r.total,zRole));
  const v=(ZVZ.vencedores||{})[zRole];
  if(v&&v.armas.length&&!zAli){ const b=el("div",{class:"block"}); b.append(el("h3",{class:"orn",text:"Mais usadas pelas alianças que ganharam a luta"})); const row=el("div",{class:"zwin"});
    for(const [w,n] of v.armas.slice(0,8)){ const t=el("div",{class:"btile"}); t.append(zimg(w,8,0,"nico zi")); t.append(el("span",{class:"bt-n",text:zNome(w)}),el("span",{class:"bt-s",text:`${n}× (${zPct(n,v.total)}%)`})); row.append(t); }
    b.append(row); host.append(b); }
}
