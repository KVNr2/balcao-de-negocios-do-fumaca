/* Menu do item (botão direito), parte de fabricação: qualidade esperada pela sua spec e fabricar .0 e encantar × fabricar já encantado.
   Fica no menu, e não nos cartões, para não encher a lista de informação.

   QUALIDADE (fonte: wiki do jogo e Albion Free Market, "How Crafting Quality Chances Work")
   - Cada peça faz uma ou mais "jogadas" de qualidade e fica com a melhor. Chance de cada jogada:
     Normal 68,9%, Bom 25%, Excepcional 5%, Excelente 1%, Obra-prima 0,1%.
   - Pontos de qualidade dão jogadas: cada 100 pontos, uma jogada a mais; o resto é a chance de mais uma.
   - Pontos (estimativa): 0,75 por nível da maestria da linha, 0,75 por nível de cada spec da linha e mais 6 por nível da spec do próprio item; foco soma 50. */
const QJ=[0,0.689,0.25,0.05,0.01,0.001];
function qualPontos(full,foco){
  const x=typeof SPIDX!=="undefined"&&SPIDX[full]; if(!x) return foco?50:0;
  const [gk,key]=x, g=spGet(gk)||{}, s=g.s||{}, todas=Object.values(s).reduce((a,b)=>a+(+b||0),0), own=+s[key]||0;
  return 0.75*(+g.m||0)+0.75*todas+6*own+(foco?50:0);
}
/* chance de cada qualidade (1 a 5) com a melhor de n jogadas, n vindo dos pontos */
function qualChances(pts){
  const dist=n=>{ const acc=[0]; let c=0; for(let q=1;q<=5;q++){ c+=QJ[q]; acc[q]=Math.min(1,c); }
    const out=[0]; for(let q=1;q<=5;q++) out[q]=Math.pow(acc[q],n)-(q>1?Math.pow(acc[q-1],n):0); return out; };
  const n=1+Math.floor(pts/100), f=(pts%100)/100, a=dist(n), b=dist(n+1);
  return a.map((v,i)=>(1-f)*v+f*b[i]);
}
const MC_LOCS=()=>[...SHOP_LOCS,"Black Market"];
/* preço líquido de venda de cada qualidade; quem não tem preço vende pelo da qualidade de baixo (a peça melhor também atende ordem de qualidade menor) */
async function mcVendaQual(id){
  const key=PX.chave(id), out=[0];
  for(let q=1;q<=5;q++){ const T={}; try{ await fetchIds([id],T,MC_LOCS(),q); }catch(e){} const v=PX.melhorVenda(T[key]||{},MC_LOCS(),"auto"); out[q]=v; }
  for(let q=2;q<=5;q++) if(!out[q]||(out[q-1]&&out[q-1].k>out[q].k)) out[q]=out[q-1]?{...out[q-1],herdado:true}:out[q];
  return out;
}
/* custo de fabricar uma peça (catálogo da Rotação/Craft), sem foco, na cidade com bônus, comprando no Automático */
function mcCusto(it){
  const bd=bdItem(it.id), rr=rrr(it.bonus,false,st.daily+bd); let c=it.fee*feeVal()/100;
  for(const g of it.ing){ const x=PX.melhorCompra(PX.rec(g.id),SHOP_LOCS,"auto"); if(!x) return null; c+=g.n*(g.art?1:(1-rr))*x.k; }
  return c;
}
async function mcBox(id,q){
  const box=el("div",{class:"imenu-mc"}); box.append(el("p",{class:"tiny muted",text:"Calculando…"}));
  (async()=>{
    try{
      if(!BM) BM=await need("bm"); if(!GEAR) GEAR=await need("gear");
      const m=/^T(\d)_(.+?)(?:@(\d))?$/.exec(id), t=+m[1], e=+(m[3]||0), key=m[2];
      const cat=(typeof rotCatalogo==="function"&&rotCatalogo())||[];
      const it=cat.find(x=>x.id===id), it0=cat.find(x=>x.id===bmId(key,t,0));
      box.textContent="";
      /* qualidade */
      const full=key, pN=qualPontos(full,false), pF=qualPontos(full,true), cN=qualChances(pN), cF=qualChances(pF);
      const vq=await mcVendaQual(id);
      const tb=el("table",{class:"imenu-qt"}), hr=tb.createTHead().insertRow(); ["Qualidade","Sem foco","Com foco","Vende por"].forEach(h=>hr.append(el("th",{text:h})));
      const body=tb.createTBody(); let evN=0, evF=0;
      for(let k=1;k<=5;k++){ const r=body.insertRow(), v=vq[k]; r.insertCell().textContent=QNAME[k];
        const a=r.insertCell(); a.className="num"; a.textContent=dec(cN[k]*100)+"%"; const b=r.insertCell(); b.className="num"; b.textContent=dec(cF[k]*100)+"%";
        const c=r.insertCell(); c.className="num"; c.textContent=v?fmtS(v.p)+(v.herdado?"*":""):"—"; if(v) c.title=`${v.mode==="inst"?"Venda na hora":"Anúncio"} em ${bagCityPT(v.c)}, líquido ${fmt(Math.round(v.k))}${v.herdado?". Sem preço desta qualidade: vale o da qualidade de baixo":""}`;
        if(v){ evN+=cN[k]*v.k; evF+=cF[k]*v.k; } }
      box.append(el("b",{class:"imenu-mch",text:"Qualidade com a sua spec"}),tb);
      const base=vq[1]&&vq[1].k;
      box.append(el("p",{class:"tiny",text:base?`Valor esperado por peça, já com as taxas: ${fmt(Math.round(evN))} sem foco e ${fmt(Math.round(evF))} com foco. Contando tudo como Normal: ${fmt(Math.round(base))} (${sgn(Math.round(evN-base))} sem foco).`:"Sem preço de venda da qualidade Normal agora."}));
      box.append(el("p",{class:"tiny muted",text:`${dec(pN)} pontos de qualidade (${dec(pF)} com foco), pela sua ficha. É uma estimativa: a fórmula do jogo não é oficial.`}));
      /* fabricar .0 e encantar × fabricar encantado */
      if(e>=1&&it&&it0&&GEAR.e[key]){
        const runas=[]; for(let k=1;k<=e;k++) runas.push(`T${t}_${EN_MAT[k][0]}`);
        const ids=[...new Set([...it.ing,...it0.ing].map(g=>rotApi(g.id))),...runas];
        await fetchIds(ids,DATA.itens,SHOP_LOCS);
        const n=GEAR.e[key], c0=mcCusto(it0), cE=mcCusto(it); let enc=0, falta="";
        for(let k=1;k<=e;k++){ const x=PX.melhorCompra(PX.rec(runas[k-1]),SHOP_LOCS,"auto"); if(!x){ falta=EN_MAT[k][1].toLowerCase(); break; } enc+=n*x.k; }
        box.append(el("b",{class:"imenu-mch",text:`Fabricar .0 e encantar até .${e}`}));
        if(c0==null||cE==null||falta) box.append(el("p",{class:"tiny muted",text:`Sem preço de ${falta||"algum material"} agora.`}));
        else { const tot=c0+enc, eco=cE-tot;
          box.append(el("p",{class:"tiny",text:`Fabricar .0: ${fmtS(c0)}. Encantar (${fmt(n)} de cada: ${runas.map((r,i)=>EN_MAT[i+1][1].toLowerCase()).join(", ")}): ${fmtS(enc)}. Total ${fmtS(tot)}.`}),
            el("p",{class:"tiny "+(eco>0?"gain":"loss"),text:`Fabricar já .${e}: ${fmtS(cE)}. ${eco>0?`Encantar sai ${fmtS(eco)} mais barato.`:`Fabricar já encantado sai ${fmtS(-eco)} mais barato.`}`}),
            el("p",{class:"tiny muted",text:"Sem foco, na cidade com bônus, comprando no Automático (o mais barato entre ordem e compra na hora)."})); }
      }
    }catch(err){ box.textContent=""; box.append(el("p",{class:"tiny muted",text:"Não consegui calcular agora."})); }
  })();
  return box;
}
