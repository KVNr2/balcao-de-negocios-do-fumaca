/* Motor de preços único: a mesma regra de compra e de venda em Craft, Refino, Cozinha, Transporte e Rotação.

   Cada registro de preço é r[cidade] = [menor anúncio, maior ordem de compra, hora do anúncio, hora da ordem].

   COMPRA (custo de cada unidade)
   - "inst":  compra na hora, do menor anúncio da cidade.
   - "ordem": põe ordem de compra no preço da maior ordem aberta (+ lance, se pedido) e paga 2,5% da ordem.
              Ordem abaixo de 70% do anúncio da mesma cidade é lance perdido (não enche) e não conta.
              Sem ordem que conte, cai para a compra na hora naquela cidade.
   - "auto":  o mais barato entre os dois, já com os 2,5%.

   VENDA (líquido de cada unidade, depois das taxas)
   - "ordem": anuncia no preço do menor anúncio da cidade. Paga a taxa de venda e 2,5% do anúncio.
   - "inst":  vende na hora para a maior ordem de compra da cidade. Paga só a taxa de venda.
   - "auto":  o que deixa mais prata, comparando os dois líquidos.
   - Mercado Negro: só existe venda na hora (para a ordem de compra dele), qualquer que seja o modo.
   - Anúncio mais de 30% acima da mediana dos anúncios das cidades (com 3 cidades ou mais) não vende e não conta.

   O resultado sempre traz p (preço da tabela), k (custo real ou líquido real, para comparar), c (cidade), mode e t (hora do preço). */
const PX={ ORDEM:0.025, LANCE_MIN:0.7, TETO:1.3 };
PX.chave=id=>id.includes("_LEVEL")?id.split("@")[0]:id;                       // como o preço fica guardado em DATA.itens
PX.rec=(id,tbl)=>(tbl||DATA.itens)[PX.chave(id)]||{};
PX.ordemOk=v=>!!(v&&v[1]>0&&(!v[0]||v[1]>=v[0]*PX.LANCE_MIN));
PX.taxa=()=>typeof taxBase==="function"?taxBase():(st.prem?0.04:0.08);
/* teto do anúncio: mediana dos anúncios das cidades (sem o Mercado Negro) × 1,3; sem 3 cidades com anúncio, não há teto */
PX.teto=r=>{ const ps=SHOP_LOCS.map(c=>r[c]&&r[c][0]).filter(x=>x>0).sort((a,b)=>a-b);
  if(ps.length<3) return Infinity; const m=ps.length%2?ps[(ps.length-1)/2]:(ps[ps.length/2-1]+ps[ps.length/2])/2; return m*PX.TETO; };
/* compra numa cidade. o.lance soma ao preço da ordem (ex.: 1 prata para ficar à frente) */
PX.compra=(r,c,modo,o={})=>{ const v=r[c]; if(!v) return null;
  const a=v[0]>0?{p:v[0],k:v[0],mode:"inst",t:v[2]||0,c}:null;
  const op=PX.ordemOk(v)?v[1]+(o.lance||0):0, b=op?{p:op,k:op*(1+PX.ORDEM),mode:"ordem",t:v[3]||0,c}:null;
  if(modo==="inst") return a;
  if(modo==="ordem") return b||a;
  return a&&b?(b.k<a.k?b:a):(a||b); };
/* venda numa cidade. teto: o de PX.teto(r) (passe Infinity para não aplicar) */
PX.venda=(r,c,modo,teto)=>{ const v=r[c]; if(!v) return null; const tx=PX.taxa();
  if(c==="Black Market") return v[1]>0?{p:v[1],k:v[1]*(1-tx),mode:"inst",t:v[3]||0,c}:null;
  const l=v[0]>0&&v[0]<=teto?{p:v[0],k:v[0]*(1-tx-PX.ORDEM),mode:"ordem",t:v[2]||0,c}:null;
  const i=v[1]>0?{p:v[1],k:v[1]*(1-tx),mode:"inst",t:v[3]||0,c}:null;
  if(modo==="inst") return i; if(modo==="ordem") return l;
  return l&&i?(i.k>=l.k?i:l):(l||i); };
/* a melhor entre várias cidades */
PX.melhorCompra=(r,locs,modo,o)=>{ let b=null; for(const c of locs){ const x=PX.compra(r,c,modo,o); if(x&&(!b||x.k<b.k)) b=x; } return b; };
PX.melhorVenda=(r,locs,modo,o={})=>{ const teto=o.semTeto?Infinity:PX.teto(r); let b=null; for(const c of locs){ const x=PX.venda(r,c,modo,teto); if(x&&(!b||x.k>b.k)) b=x; } return b; };
