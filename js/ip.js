/* ================= IP (poder de item) estimado pela sua ficha =================
   IP do item = base do tier (T4 700 … T8 1100) + 100 por encanto + bônus da Tábua do Destino × (1 + modificador de maestria do tier)
   bônus = maestria do grupo × 0,2 + spec do próprio item × 2,0 (+ 0,2 de cada nível dela) + demais specs do grupo × 0,2 (0,1 nas de artefato/real/avalon/cristal; 0,6 nas mãos secundárias simples)
   modificador de maestria: T5 5%, T6 10%, T7 15%, T8 20%. Qualidade normal. Capa, bolsa, montaria e comida não recebem bônus de spec.
   IP médio = (elmo + peito + botas + capa + arma + mão secundária) ÷ 6; arma de duas mãos conta nas duas posições; sem mão secundária conta 0. */
const IP_ARTE=/_(MORGANA|HELL|UNDEAD|KEEPER|FEY|AVALON|CRYSTAL|ROYAL)$/;
function ipItem(id){
  const m=idInfo(id); if(!m) return null; buildIdx();
  const base=100*m.t+300+100*m.e; const gk=W2LINE&&W2LINE[m.c]; const grp=gk&&SPECS&&SPECS.g.find(g=>g.k==="c:"+gk);
  let bonus=0, mod=m.t>=5?(m.t-4)*0.05:0;
  if(grp){ const f=(PF&&PF.sp&&PF.sp[grp.k])||{}, s=f.s||{}, off=/^OFF_/.test(m.c), own=+s[m.c]||0;
    let oth=0; for(const [c] of grp.it){ if(c===m.c) continue; oth+=(+s[c]||0)*(IP_ARTE.test(c)?0.1:off?0.6:0.2); }
    bonus=(+f.m||0)*0.2+own*2.2+oth; }
  const ip=base+bonus*(1+mod);
  return {ip,base,bonus:bonus*(1+mod),mod};
}
/* IP médio da build no set e tier escolhidos; lê as peças já convertidas pelo mesmo caminho do carregamento do Albion */
function ipBuild(b,set,tier){
  const eq=JSON.parse(albionLoadout(b,set,tier)).equipment, miss=albionLoadout.miss||0; const parts=[]; let sum=0, two=false;
  for(const e of eq){ const m=idInfo(e.item); if(!m) continue; let slot=null;
    if(/^(MAIN|2H)_/.test(m.c)){ slot="w"; two=/^2H_/.test(m.c); } else if(/^OFF_/.test(m.c)) slot="o"; else if(/^HEAD_/.test(m.c)) slot="h"; else if(/^ARMOR_/.test(m.c)) slot="a"; else if(/^SHOES_/.test(m.c)) slot="s"; else if(/^CAPEITEM/.test(m.c)) slot="c";
    if(!slot) continue; const r=ipItem(e.item); if(!r) continue; parts.push({id:e.item,slot,ip:r.ip}); sum+=r.ip; if(slot==="w"&&two) sum+=r.ip; }
  return {avg:sum/6,parts,miss,sem:!(PF&&PF.sp&&Object.keys(PF.sp).length)};
}
/* selo verde grande com o IP; upd(set,tier) recalcula quando a pessoa troca o set ou o tier */
function albionBadge(b){
  const w=el("div",{class:"ip-badge",role:"status"}); const num=el("b",{class:"ip-n"}), lab=el("span",{class:"ip-l",text:"IP médio aprox."}), sub=el("div",{class:"ip-s"}); w.append(lab,num,sub);
  w._upd=(set,tier)=>{ let r; try{ r=ipBuild(b,set||0,tier||0); }catch(e){ w.hidden=true; return; } w.hidden=false;
    num.textContent="≈ "+Math.round(r.avg).toLocaleString("pt-BR");
    sub.textContent=""; sub.append(el("span",{class:"ip-c",text:tier?`T${tier} equivalente`:"Tier original"}),el("span",{class:"ip-c"+(r.sem?" off":""),text:r.sem?"Sem ficha":"Sua ficha"}));
    w.title="Valor aproximado: depende do tier e da qualidade das peças. Aqui o cálculo usa o tier escolhido em \"Tier das peças\" e qualidade normal (cada qualidade acima soma de +20 a +100 por peça). "+"\nIP de cada peça:\n"+r.parts.map(p=>`${({w:"Arma",o:"Mão secundária",h:"Elmo",a:"Peito",s:"Botas",c:"Capa"})[p.slot]}: ${Math.round(p.ip).toLocaleString("pt-BR")}`).join("\n")+(r.sem?". Carregue sua ficha para somar os bônus de maestria e spec.":""); };
  w._upd(0,0); return w;
}
