/* ================= Avalon: mapas das Estradas de Avalon ================= */
const AV_RES={ORE:["Minério","ore"],FIBER:["Fibra","fiber"],WOOD:["Madeira","wood"],ROCK:["Pedra","stone"],HIDE:["Couro","hide"]};
const AV_TYPE_G=g=>/^HIDEOUT/.test(g)?"HO":/^ROYAL/.test(g)?"ROYAL":/^BLACK/.test(g)?"BLACK":"TUNNEL";
const AV_G_PT={HO:"Hideout",ROYAL:"Royal",BLACK:"Black",TUNNEL:"Tunnel"};
const AV_Y_PT={ROYAL:"Royal",ROYAL_RED:"Red",BLACK_LOW:"Black, risco baixo",BLACK_MEDIUM:"Black, risco médio",BLACK_HIGH:"Black, risco alto",LOW:"Tunnel, risco baixo",MEDIUM:"Tunnel, risco médio",HIGH:"Tunnel, risco alto",DEEP:"Tunnel profundo",DEEP_RAID:"Tunnel profundo com raid",HIDEOUT:"Hideout",HIDEOUT_DEEP:"Hideout profundo"};
const AV_EXTRA={solo:["Dungeon solo",m=>m.s>0],group:["Dungeon de grupo",m=>m.g>0],raid:["Raid",m=>m.e>0],mist:["Portal da Brecilien",m=>m.mi>0]};
const AV_TZ=[["local","Do meu navegador"],["UTC","UTC"],["America/Sao_Paulo","São Paulo"],["America/New_York","Nova York"],["Europe/London","Londres"],["Europe/Berlin","Berlim"],["Asia/Tokyo","Tóquio"]];
const AV={data:null,q:"",tier:0,type:"",sort:"nome",res:new Set(),extra:new Set(),shown:60,saved:[],hist:[],inited:false};
const avNorm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const avRead=(k,d)=>{ try{ return JSON.parse(store.get(k)||"")||d; }catch(e){ return d; } };
const avSum=o=>Object.values(o||{}).reduce((a,b)=>a+b,0);
const avRes=(m,k)=>avSum(m.r[k]);
const avResTot=m=>Object.keys(m.r).reduce((a,k)=>a+avRes(m,k),0);
const avDg=m=>m.s+m.g+m.e;
function avMatch(m){
  if(AV.tier&&m.t!==AV.tier) return false;
  if(AV.type&&AV_TYPE_G(m.y)!==AV.type&&m.y!==AV.type) return false;
  for(const k of AV.res) if(!avRes(m,k)) return false;
  for(const k of AV.extra) if(!AV_EXTRA[k][1](m)) return false;
  if(AV.q){ const n=m._n; for(const w of avNorm(AV.q).split(" ")) if(w&&!n.includes(w)) return false; }
  return true;
}
const AV_MC={o:"#c98b4a",w:"#b07a46",f:"#7fc16b",h:"#d9b78e",s:"#a9a9b4"}, AV_MN={o:"Minério",w:"Madeira",f:"Fibra",h:"Couro",s:"Pedra",D:"Dungeon solo",G:"Dungeon de grupo",E:"Raid",P:"Portal",B:"Portal da Brecilien"};
/* minimapa desenhado com as posições do jogo: círculos = recursos, losango = dungeon solo, quadrado = grupo, estrela = raid, anel = portal */
function avMini(m){
  const NS="http://www.w3.org/2000/svg", [bx,by,W,H]=m.b||[0,0,1,1], vh=Math.max(40,Math.round(100*H/W)); const sv=document.createElementNS(NS,"svg"); sv.setAttribute("viewBox",`0 0 100 ${vh}`); sv.setAttribute("class","av-mini"); sv.setAttribute("role","img"); sv.setAttribute("aria-label",`Minimapa de ${m.n}`);
  const add=(tag,at,tx)=>{ const e=document.createElementNS(NS,tag); for(const k in at) e.setAttribute(k,at[k]); if(tx){ const t=document.createElementNS(NS,"title"); t.textContent=tx; e.append(t); } sv.append(e); return e; };
  add("rect",{x:0,y:0,width:100,height:vh,rx:4,class:"av-mbg"});
  for(let g=1;g<4;g++){ add("line",{x1:g*25,y1:0,x2:g*25,y2:vh,class:"av-mg"}); add("line",{x1:0,y1:vh*g/4,x2:100,y2:vh*g/4,class:"av-mg"}); }
  for(const [k,x,y] of m.m||[]){ const X=(x-bx)/W*100, Y=(y-by)/H*vh; if(!(X>=0&&X<=100&&Y>=0&&Y<=vh)) continue; const tt=AV_MN[k];
    if(AV_MC[k]) add("circle",{cx:X,cy:Y,r:3,fill:AV_MC[k],class:"av-md"},tt);
    else if(k==="D") add("rect",{x:X-2.6,y:Y-2.6,width:5.2,height:5.2,transform:`rotate(45 ${X} ${Y})`,class:"av-mdg solo"},tt);
    else if(k==="G") add("rect",{x:X-2.7,y:Y-2.7,width:5.4,height:5.4,class:"av-mdg grp"},tt);
    else if(k==="E") add("path",{d:`M${X} ${Y-4}L${X+1.3} ${Y-1.3}L${X+4} ${Y}L${X+1.3} ${Y+1.3}L${X} ${Y+4}L${X-1.3} ${Y+1.3}L${X-4} ${Y}L${X-1.3} ${Y-1.3}Z`,class:"av-mdg raid"},tt);
    else add("circle",{cx:X,cy:Y,r:3.2,class:"av-mp"+(k==="B"?" mist":"")},tt); }
  return sv;
}
const avTyCls=y=>y==="ROYAL_RED"?"red":({HO:"ho",ROYAL:"royal",BLACK:"black",TUNNEL:"tunnel"})[AV_TYPE_G(y)];
const avTypeTxt=y=>{ if(y==="ROYAL_RED") return "Red"; const g=AV_G_PT[AV_TYPE_G(y)], r=/(LOW|MEDIUM|HIGH)$/.exec(y); return r?`${g} · ${{LOW:"risco baixo",MEDIUM:"risco médio",HIGH:"risco alto"}[r[1]]}`:/DEEP/.test(y)?`${g} · profundo`:g; };
/* dungeons e portais do mapa, como tags coloridas (mesmas cores do minimapa) */
function avInfo(m){ const o=[]; const add=(cls,txt,n,tip)=>{ if(n>0) o.push({cls,txt,n,tip}); };
  add("solo","Dungeon solo",m.s,"Dungeons de 1 jogador"); add("grp","Dungeon de grupo",m.g,"Dungeons de grupo"); add("raid","Raid",m.e,"Raids");
  add("ptl","Portais",m.p+(m.ho||0)+(m.mi||0),"Portais para outros mapas"); add("ho","Hideout",m.ho||0,"Portais de hideout"); add("mist","Brecilien",m.mi||0,"Portal para a Brecilien");
  return o; }
const avTag=(x,big)=>el("span",{class:"av-it "+x.cls+(big?" big":""),title:x.tip},el("span",{class:"av-itn",text:x.txt}),el("b",{text:"×"+x.n}));
function avZoom(m,pic){
  const old=document.getElementById("avZoom"); if(old) old.remove();
  const ov=el("div",{id:"avZoom",class:"av-zoom",role:"dialog","aria-modal":"true","aria-label":`Mapa ${m.n}`});
  const box=el("div",{class:"av-zbox"}), top=el("div",{class:"av-ztop"});
  const x=el("button",{type:"button",class:"av-zx","aria-label":"Fechar",text:"×"});
  top.append(el("b",{text:m.n}),el("span",{class:"tag t"+m.t,text:`T${m.t}`}),el("span",{class:"av-ty "+avTyCls(m.y),text:avTypeTxt(m.y)}),x);
  const body=el("div",{class:"av-zbody"});
  const L=el("section",{class:"av-zl"}); L.append(el("h4",{text:"Recursos no mapa"}));
  for(const k of Object.keys(AV_RES)){ const n=avRes(m,k); if(!n) continue; const mt=Math.max(...Object.keys(m.r[k]).map(Number)); const row=el("div",{class:"av-zr"}); const hd=el("div",{class:"av-zrh"}); const ic=fullImg(`T${mt}_${k}`,"av-ri"); hd.append(ic||el("i",{class:"av-rd r-"+AV_RES[k][1]}),el("span",{class:"av-rn",text:AV_RES[k][0]}),el("b",{class:"av-rq",title:"Quantidade no mapa",text:`×${n}`})); row.append(hd);
    const tt=el("div",{class:"av-zt"}); Object.keys(m.r[k]).map(Number).sort((a,b)=>a-b).forEach(t=>tt.append(el("span",{class:"av-zc",title:`Tier ${t}`},el("small",{text:`T${t}`}),el("b",{text:`×${m.r[k][t]}`})))); row.append(tt); L.append(row); }
  if(!L.querySelector(".av-zr")) L.append(el("p",{class:"muted small",text:"Sem recursos"}));
  const R=el("section",{class:"av-zrt"}); R.append(el("h4",{text:"Dungeons e portais"}));
  const inf=avInfo(m); const dg=el("div",{class:"av-zg"}); inf.forEach(i=>dg.append(avTag(i,true))); if(!m.s&&!m.g&&!m.e) dg.prepend(el("span",{class:"av-it none big",text:"Sem dungeons"})); R.append(dg);
  const meta=el("dl",{class:"av-zm"}); const kv=(k,v)=>{ meta.append(el("dt",{text:k}),el("dd",{text:v})); }; kv("Tipo",AV_Y_PT[m.y]||m.y); kv("Tier",`T${m.t}`); if(AV.saved.some(z=>z.i===m.i)) kv("Na rota","Sim ★"); R.append(meta);
  const mid=el("div",{class:"av-zmid"}); mid.append(pic?el("img",{class:"av-zimg",src:`imagens/avalon/${pic}`,alt:`Mapa ${m.n}`}):avMini(m));
  body.append(L,mid,R); box.append(top,body);
  ov.append(box);
  const close=()=>{ ov.remove(); document.removeEventListener("keydown",key); }, key=e=>{ if(e.key==="Escape") close(); };
  ov.addEventListener("click",e=>{ if(e.target===ov||e.target===x) close(); }); document.addEventListener("keydown",key);
  document.body.append(ov); x.focus();
}
function avCard(m){
  const saved=AV.saved.some(x=>x.i===m.i), card=el("article",{class:"av-card"+(saved?" on":"")});
  const hd=el("div",{class:"av-hd"}); hd.append(el("b",{class:"av-n",text:m.n}));
  const star=el("button",{type:"button",class:"av-star","aria-pressed":String(saved),title:saved?"Tirar da rota":"Salvar na rota (até 6)","aria-label":saved?"Tirar da rota":"Salvar na rota",text:saved?"★":"☆"});
  star.addEventListener("click",()=>avToggle(m.i)); hd.append(star); card.append(hd);
  const tg=el("div",{class:"av-tags"}); tg.append(el("span",{class:"tag t"+m.t,text:`T${m.t}`}),el("span",{class:"av-ty "+avTyCls(m.y),title:AV_Y_PT[m.y]||m.y,text:avTypeTxt(m.y)}));
  if(m.mi) tg.append(el("span",{class:"tag good",title:"Tem portal para a Brecilien",text:"Brecilien"}));
  const pic=AV.img&&AV.img[avNorm(m.n).replace(/ /g,"-")];
  if(pic){ const im=el("img",{class:"av-pic",src:`imagens/avalon/${pic}`,alt:`Mapa ${m.n}`,loading:"lazy",decoding:"async"}); const mini=avMini(m); im.addEventListener("error",()=>im.replaceWith(mini)); card.append(tg,im); } else card.append(tg,avMini(m));
  const rs=el("div",{class:"av-res"});
  for(const k of Object.keys(AV_RES)){ const n=avRes(m,k); if(!n) continue; const t=Object.keys(m.r[k]).sort().map(x=>`T${x}: ${m.r[k][x]}`).join(" · "); const c=el("span",{class:"av-r"+(AV.res.has(k)?" hi":""),title:`${AV_RES[k][0]} (${t})`}); const mt=Math.max(...Object.keys(m.r[k]).map(Number)); const ic=fullImg(`T${mt}_${k}`,"av-ri"); c.append(ic||el("i",{class:"av-rd r-"+AV_RES[k][1]}),el("span",{class:"av-rn",text:AV_RES[k][0]}),el("b",{class:"av-rq",title:"Quantidade no mapa",text:`×${n}`})); rs.append(c); }
  if(!rs.children.length) rs.append(el("span",{class:"muted small",text:"Sem recursos"}));
  card.append(el("div",{class:"av-rt",text:"Recursos no mapa (quantidade)"}),rs);
  const ft=el("div",{class:"av-ftags"}); const inf=avInfo(m); inf.forEach(x=>ft.append(avTag(x))); if(!m.s&&!m.g&&!m.e) ft.prepend(el("span",{class:"av-it none",text:"Sem dungeons"})); card.append(ft);
  card.classList.add("zoomable"); card.title="Clique para ampliar o mapa";
  card.addEventListener("click",e=>{ if(e.target.closest(".av-star")) return; avZoom(m,pic); });
  return card;
}
function avToggle(id){
  const i=AV.saved.findIndex(x=>x.i===id);
  if(i>=0) AV.saved.splice(i,1); else { if(AV.saved.length>=6){ $("avMsg").textContent="Você já salvou 6 mapas. Tire um para salvar outro."; return; } AV.saved.push({i:id,h:0}); }
  store.set("avSaved",JSON.stringify(AV.saved)); renderAv();
}
function avTzOff(ms,tz){ const p=new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(new Date(ms)).reduce((o,x)=>(o[x.type]=x.value,o),{}); return Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second)-Math.floor(ms/1000)*1000; }
function avBase(){ const v=$("avNow").value; const tz=$("avTz").value; if(!v) return Date.now(); const [d,t]=v.split("T"), [y,mo,da]=d.split("-").map(Number), [h,mi]=(t||"0:0").split(":").map(Number);
  if(tz==="local") return new Date(y,mo-1,da,h,mi).getTime(); const guess=Date.UTC(y,mo-1,da,h,mi); return guess-avTzOff(guess,tz); }
const avFull=(ms,tz)=>new Date(ms).toLocaleString("pt-BR",{timeZone:tz==="local"?undefined:tz,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
function avRoute(){
  const tz=$("avTz").value, fmtx=$("avFmt").value, base=avBase(); const lab=tz==="local"?"horário local":(AV_TZ.find(x=>x[0]===tz)||[0,tz])[1];
  const lines=AV.saved.map((s,k)=>{ const m=AV.byId[s.i]; if(!m) return ""; let t=`${k+1}. ${m.n} (T${m.t})`; if(s.h) t+=fmtx==="rel"?` · portal fecha em ${s.h}h`:` · portal fecha ${avFull(base+s.h*3600e3,tz)}`; return t; }).filter(Boolean);
  const o=lines.join("\n"); $("avOut").value=o?o+(fmtx==="full"?`\n(${lab})`:""):"";
}
function avSavedUI(){
  const box=$("avSaved"); box.textContent=""; $("avSavedN").textContent=AV.saved.length?`(${AV.saved.length}/6)`:"";
  if(!AV.saved.length){ box.append(el("p",{class:"muted small",text:"Nenhum mapa salvo ainda."})); }
  AV.saved.forEach((s,k)=>{ const m=AV.byId[s.i]; if(!m) return; const r=el("div",{class:"av-sr"}); r.append(el("span",{class:"av-sn",text:`${k+1}. ${m.n}`}),el("span",{class:"tag t"+m.t,text:`T${m.t}`}));
    const sel=el("select",{"aria-label":`Fechamento do portal de ${m.n}`,title:"Em quanto tempo o portal fecha"}); sel.append(el("option",{value:"0",text:"sem horário"})); for(let h=1;h<=5;h++) sel.append(el("option",{value:String(h),text:`+${h}h`})); sel.value=String(s.h||0);
    sel.addEventListener("change",()=>{ s.h=+sel.value; store.set("avSaved",JSON.stringify(AV.saved)); avRoute(); });
    const up=el("button",{type:"button",class:"av-mv",title:"Subir","aria-label":"Subir",text:"↑"}), dn=el("button",{type:"button",class:"av-mv",title:"Descer","aria-label":"Descer",text:"↓"}), x=el("button",{type:"button",class:"av-mv",title:"Remover","aria-label":"Remover",text:"×"});
    const mv=(d)=>{ const j=k+d; if(j<0||j>=AV.saved.length) return; [AV.saved[k],AV.saved[j]]=[AV.saved[j],AV.saved[k]]; store.set("avSaved",JSON.stringify(AV.saved)); renderAv(); };
    up.addEventListener("click",()=>mv(-1)); dn.addEventListener("click",()=>mv(1)); x.addEventListener("click",()=>avToggle(s.i));
    r.append(sel,up,dn,x); box.append(r); });
  avRoute();
}
function avHistUI(){ const h=$("avHist"); h.textContent=""; if(!AV.hist.length) return; h.append(el("span",{class:"muted small",text:"Buscas recentes: "}));
  AV.hist.forEach(q=>{ const b=el("button",{type:"button",class:"av-chip",text:q}); b.addEventListener("click",()=>{ $("avQ").value=q; AV.q=q; AV.shown=60; renderAv(); }); h.append(b); });
  const c=el("button",{type:"button",class:"linkbtn",text:"limpar"}); c.addEventListener("click",()=>{ AV.hist=[]; store.set("avHist","[]"); avHistUI(); }); h.append(c); }
function avInit(){
  AV.inited=true; AV.saved=avRead("avSaved",[]).filter(x=>x&&x.i); AV.hist=avRead("avHist",[]);
  const tier=$("avTier"); [[0,"Todos"],[4,"T4"],[6,"T6"],[8,"T8"]].forEach(([v,t])=>{ const b=el("button",{type:"button","aria-pressed":String(v===0),text:t}); b.addEventListener("click",()=>{ AV.tier=v; AV.shown=60; [...tier.children].forEach(x=>x.setAttribute("aria-pressed",String(x===b))); renderAv(); }); tier.append(b); });
  const ty=$("avType"); ty.append(el("option",{value:"",text:"Todos os tipos"})); for(const [k,v] of Object.entries(AV_G_PT)) ty.append(el("option",{value:k,text:v})); ty.append(el("option",{value:"ROYAL_RED",text:"Red"})); ty.addEventListener("change",()=>{ AV.type=ty.value; AV.shown=60; renderAv(); });
  const mk=(host,obj,set)=>{ for(const k in obj){ const b=el("button",{type:"button","aria-pressed":"false",text:Array.isArray(obj[k])?obj[k][0]:obj[k]}); b.addEventListener("click",()=>{ if(set.has(k)) set.delete(k); else set.add(k); b.setAttribute("aria-pressed",String(set.has(k))); AV.shown=60; renderAv(); }); host.append(b); } };
  mk($("avRes"),AV_RES,AV.res); mk($("avExtra"),AV_EXTRA,AV.extra);
  $("avSort").addEventListener("change",()=>{ AV.sort=$("avSort").value; renderAv(); });
  let tmr; $("avQ").addEventListener("input",()=>{ AV.q=$("avQ").value; AV.shown=60; renderAv(); clearTimeout(tmr); tmr=setTimeout(()=>{ const q=AV.q.trim(); if(q.length<3) return; AV.hist=[q,...AV.hist.filter(x=>x!==q)].slice(0,15); store.set("avHist",JSON.stringify(AV.hist)); avHistUI(); },1500); });
  $("avClear").addEventListener("click",()=>{ AV.q="";AV.tier=0;AV.type="";AV.res.clear();AV.extra.clear();AV.shown=60; $("avQ").value=""; $("avType").value=""; document.querySelectorAll("#avTier button,#avRes button,#avExtra button").forEach((b,i)=>b.setAttribute("aria-pressed",String(b.parentElement.id==="avTier"&&b.textContent==="Todos"))); renderAv(); });
  $("avMore").addEventListener("click",()=>{ AV.shown+=60; renderAv(); });
  const tz=$("avTz"); AV_TZ.forEach(([v,t])=>tz.append(el("option",{value:v,text:t}))); tz.value=store.get("avTz")||"local"; $("avFmt").value=store.get("avFmt")||"rel";
  const setNow=()=>{ const d=new Date(), tzv=$("avTz").value, ms=d.getTime(); const o=tzv==="local"?-d.getTimezoneOffset()*60000:avTzOff(ms,tzv); $("avNow").value=new Date(ms+o).toISOString().slice(0,16); };
  setNow(); tz.addEventListener("change",()=>{ store.set("avTz",tz.value); setNow(); avRoute(); }); $("avFmt").addEventListener("change",()=>{ store.set("avFmt",$("avFmt").value); avRoute(); }); $("avNow").addEventListener("input",avRoute);
  $("avCopy").addEventListener("click",async()=>{ const t=$("avOut").value; if(!t){ $("avMsg").textContent="Salve um mapa primeiro."; return; } try{ await navigator.clipboard.writeText(t); $("avMsg").textContent="Rota copiada."; }catch(e){ $("avOut").select(); $("avMsg").textContent="Selecionei o texto: use Ctrl+C."; } });
  $("avDel").addEventListener("click",()=>{ AV.saved=[]; store.set("avSaved","[]"); $("avMsg").textContent=""; renderAv(); });
  avHistUI();
}
async function renderAv(){
  if(!AV.data){ $("avCount").textContent="Abrindo os mapas…"; try{ AV.data=await need("avalon"); }catch(e){ $("avCount").textContent="Não consegui abrir os mapas."; return; } AV.byId={}; for(const m of AV.data){ m._n=avNorm(m.n); AV.byId[m.i]=m; } }
  if(AV.img===undefined){ try{ const r=await fetch(`imagens/avalon/index.json?v=${VER}`); AV.img=r.ok?await r.json():null; }catch(e){ AV.img=null; } if($("avLeg")) $("avLeg").hidden=!!AV.img; }
  if(!AV.inited) avInit();
  let l=AV.data.filter(avMatch); const so=AV.sort;
  l.sort((a,b)=>((so==="rec"?avResTot(b)-avResTot(a):so==="dg"?avDg(b)-avDg(a):so==="tier"?b.t-a.t:0)||a.n.localeCompare(b.n,"pt")));
  $("avCount").textContent=`${l.length} ${l.length===1?"mapa":"mapas"} de ${AV.data.length}`;
  const host=$("avList"); host.textContent=""; if(!l.length) host.append(el("p",{class:"empty",text:"Nenhum mapa com esses filtros."}));
  l.slice(0,AV.shown).forEach(m=>host.append(avCard(m))); $("avMore").hidden=l.length<=AV.shown; $("avMore").textContent=`Mostrar mais (${l.length-AV.shown})`;
  avSavedUI();
}
