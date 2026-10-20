/* ================= aba Build ZvZ: o que as maiores lutas recentes (albionbb, 100+ jogadores) estão usando ================= */
let ZVZ = null, zRole = "healer", zAli = "";
const ZROLE = [["tank","Tanks"],["healer","Curandeiros"],["support","Suportes"],["range","Ranged"],["melee","Melee"],["battlemount","Montaria de batalha"]];
const ZSLOT = [["cabeca","Elmo"],["peito","Peito"],["botas","Botas"],["capa","Capa"],["off","Secundária"],["pocao","Poção"],["comida","Comida"]];
function zimg(code,t,e,cls){
  const im=el("img",{class:cls||"nico",alt:"",width:"28",height:"28",loading:"lazy",decoding:"async"}); im.referrerPolicy="no-referrer";
  const ids=[`T${t}_${code}${e?"@"+e:""}`]; if(e) ids.push(`T${t}_${code}`);
  let i=0; const set=()=>iconSrc(im,ids[i],()=>{ if(++i<ids.length) set(); else { im.onerror=null; im.classList.add("nico-off"); } }); set(); return im;
}
const zNome = c => { buildIdx(); return codeName(c); };
const zPct = (n,t) => t?Math.round(n*1000/t)/10:0;
function zFonte(){ return ZVZ.papeis; }
function zDados(){ if(!zAli) return ZVZ.papeis; const a=ZVZ.aliancas.find(x=>x.nome===zAli); return a?a.papeis:ZVZ.papeis; }
function zVariante(w,v,top){
  const box=el("div",{class:"zvar"}); const row=el("div",{class:"zgear"});
  const mk=(code,t,e,tt)=>{ const w_=el("div",{class:"zg",title:zNome(code)+(e?"."+e:"")}); w_.append(zimg(code,t,e,"nico zi")); w_.append(el("span",{class:"zg-t",text:`${t}.${e||0}`})); return w_; };
  row.append(mk(w,v.arma.t,v.arma.e));
  for(const [k] of ZSLOT){ if(v[k]) row.append(mk(v[k].c,v[k].t,v[k].e)); }
  box.append(row,el("p",{class:"muted small",text:`${v.n} ${v.n===1?"jogador usou":"jogadores usaram"} este conjunto de elmo, peito e botas ${v.ip?"· IP médio "+v.ip:""}`}));
  return box;
}
function zCard(w,n,total,role){
  const info=ZVZ.armas[w]; const card=el("div",{class:"zcard"});
  const top=el("div",{class:"zc-top"}); top.append(zimg(w,info&&info.variantes[0]?info.variantes[0].arma.t:8,info&&info.variantes[0]?info.variantes[0].arma.e:0,"nico zbig"));
  const mid=el("div",{class:"zc-mid"}); mid.append(el("strong",{text:zNome(w)}),el("span",{class:"muted small",text:`${n} ${n===1?"jogador":"jogadores"} · ${zPct(n,total)}% de ${ROLE_Z(role)}`}));
  const bar=el("div",{class:"zbar"}); bar.append(el("i",{style:`width:${Math.min(100,zPct(n,total)*2.2)}%`})); mid.append(bar); top.append(mid); card.append(top);
  if(info&&info.variantes.length){ const det=el("details",{class:"zdet"}); det.append(el("summary",{text:`Build completa (${info.mortes} mortes e abates analisados)`}));
    info.variantes.forEach(v=>det.append(zVariante(w,v))); card.append(det); }
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
