/* ================= IP (poder de item) estimado pela sua ficha =================
   IP do item = base do tier (T4 700 … T8 1100) + 100 por encanto + bônus da Tábua do Destino × (1 + modificador de maestria do tier)
   bônus = maestria do grupo × 0,2 + spec do próprio item × 2,0 (+ 0,2 de cada nível dela) + demais specs do grupo × 0,2 (0,1 nas de artefato/real/avalon/cristal; 0,6 nas mãos secundárias simples)
   modificador de maestria: T5 5%, T6 10%, T7 15%, T8 20%. Qualidade normal. Capa, bolsa, montaria e comida não recebem bônus de spec.
   IP médio = (elmo + peito + botas + capa + arma + mão secundária) ÷ 6; arma de duas mãos conta nas duas posições; sem mão secundária conta 0. */
/* Nó de cristal: +0,025 por nível às armas e mãos secundárias da mesma categoria (g=guerreiro, c=caçador, m=mago; escudo=g, tocha=c, livro=m). Conferido no jogo com maça, escudo e arco; as categorias de lança, bordão, natureza, metamorfo, besta, livro e tocha ainda não foram vistas no jogo. */
const IP_CLS={espada:"g",machado:"g",maca:"g",martelo:"g",luvas:"g",besta:"g",escudo:"g",arco:"c",lanca:"c",adaga:"c",bordao:"c",natureza:"c",metamorfo:"c",tocha:"c",fogo:"m",gelo:"m",arcano:"m",sagrado:"m",maldito:"m",livro:"m"};
const IP_CRIST=/_CRYSTAL$/;
/* base de poder de item de cada item além da do tier (data/ipoff.json, tirado do items.json do jogo): artefatos e itens de 1 mão/2 mãos especiais têm +25, +50, +75 ou +100 */
let IPOFF={};
const IP_ARTE=/_(MORGANA|HELL|UNDEAD|KEEPER|FEY|AVALON|CRYSTAL|ROYAL)$/;
function ipItem(id){
  const m=idInfo(id); if(!m) return null; buildIdx();
  const base=100*m.t+300+100*m.e+(IPOFF[m.c]||0); const gk=W2LINE&&W2LINE[m.c]; const grp=gk&&SPECS&&SPECS.g.find(g=>g.k==="c:"+gk);
  let bonus=0, mod=m.t>=5?(m.t-4)*0.05:0;
  if(grp){ const f=(PF&&PF.sp&&PF.sp[grp.k])||{}, s=f.s||{}, off=/^OFF_/.test(m.c), own=+s[m.c]||0, ownCr=IP_CRIST.test(m.c);
    const cf=c=>IP_ARTE.test(c)?0.1:off?0.6:0.2;   // quanto cada nível de um item dá aos demais do grupo (escudo comum 0,6; artefato 0,1; resto 0,2)
    let oth=0; for(const [c] of grp.it){ if(c===m.c||IP_CRIST.test(c)) continue; oth+=(+s[c]||0)*cf(c); }
    let cry=0; const cls=IP_CLS[gk];   // cristais de todas as linhas da mesma categoria (mão secundária recebe de todas)
    if(cls) for(const g2 of SPECS.g){ const ln=g2.k.slice(2); if(!g2.k.startsWith("c:")||IP_CLS[ln]!==cls) continue; const s2=((PF&&PF.sp&&PF.sp[g2.k])||{}).s||{}; for(const [c] of g2.it) if(IP_CRIST.test(c)) cry+=(+s2[c]||0)*0.025; }
    bonus=(+spMastery(grp.k)||0)*0.2+own*(2+(ownCr?0:cf(m.c)))+oth+cry; }   // a maestria das armas fica em PF.armas, não em PF.sp
  const ip=Math.floor(base+bonus*(1+mod)+1e-9);   // o jogo corta a fração (não arredonda)
  return {ip,base,bonus:bonus*(1+mod),mod};
}
/* IP médio da build no set e tier escolhidos; lê as peças já convertidas pelo mesmo caminho do carregamento do Albion */
const IP_QUAL={1:0,2:20,3:40,4:60,5:100};   // bônus de IP da qualidade: normal 0, bom +20, excepcional +40, excelente +60, obra-prima +100
function ipBuild(b,set,tier,qf){
  const eq=JSON.parse(albionLoadout(b,set,tier,qf)).equipment, miss=albionLoadout.miss||0; const parts=[]; let sum=0, two=false;
  for(const e of eq){ const m=idInfo(e.item); if(!m) continue; let slot=null;
    if(/^(MAIN|2H)_/.test(m.c)){ slot="w"; two=/^2H_/.test(m.c); } else if(/^OFF_/.test(m.c)) slot="o"; else if(/^HEAD_/.test(m.c)) slot="h"; else if(/^ARMOR_/.test(m.c)) slot="a"; else if(/^SHOES_/.test(m.c)) slot="s"; else if(/^CAPEITEM/.test(m.c)) slot="c";
    if(!slot) continue; const r=ipItem(e.item); if(!r) continue; const ip=r.ip+(IP_QUAL[e.quality]||0); parts.push({id:e.item,slot,ip,q:e.quality||1}); sum+=ip; if(slot==="w"&&two) sum+=ip; }
  return {avg:sum/6,parts,miss,two,sem:!(PF&&PF.sp&&Object.keys(PF.sp).length)};
}
/* selo verde grande com o IP; upd(set,tier) recalcula quando a pessoa troca o set ou o tier */
function albionBadge(b){
  const w=el("div",{class:"ip-badge",role:"status"}); const num=el("b",{class:"ip-n"}), lab=el("span",{class:"ip-l",text:"IP"}), sub=el("div",{class:"ip-s"}); w.append(lab,num,sub);
  w._upd=(set,tier,qf)=>{ let r; try{ r=ipBuild(b,set||0,tier||0,qf); }catch(e){ w.hidden=true; return; } w.hidden=false;
    b._ipParts=r.parts; if(typeof ipApply==='function') ipApply(b);
    num.textContent=Math.round(r.avg).toLocaleString("pt-BR");
    sub.textContent=""; sub.append(el("span",{class:"ip-c",text:tier?`T${tier} equivalente`:"Tier original"}),el("span",{class:"ip-c"+(r.sem?" off":""),text:r.sem?"Sem ficha":"Sua ficha"})); { const qs=new Set(r.parts.map(p=>p.q)); if(!(qs.size===1&&qs.has(1))) sub.append(el("span",{class:"ip-c",text:qs.size===1?QNAME[[...qs][0]]:"Qualidades mistas"})); }
    { const N={w:"Arma",o:"Mão secundária",h:"Elmo",a:"Peito",s:"Botas",c:"Capa"}, f=n=>Math.round(n).toLocaleString("pt-BR"), avg=Math.round(r.avg), min=Math.min(...r.parts.map(p=>Math.round(p.ip)));
      w.title="IP médio da build (média das peças"+(r.two?", arma de 2 mãos conta em dobro":"")+").\n"+r.parts.map(p=>{ const v=Math.round(p.ip), d=v-avg; return `${N[p.slot]}: ${f(v)}${p.q>1?" ("+QNAME[p.q]+" +"+IP_QUAL[p.q]+")":""}${v===min&&r.parts.some(x=>Math.round(x.ip)!==v)?"  ← menor, puxa a média para baixo":d<0?"  ("+d+")":""}`; }).join("\n")+"\nCalculado com "+(tier?"T"+tier+" equivalente":"o tier original")+(r.sem?"; carregue sua ficha para somar maestria e spec.":", com a sua ficha.")+"\nNão conta itens energizados."; }
    w.setAttribute("aria-label","IP "+num.textContent); };
  w._upd(0,0); return w;
}
