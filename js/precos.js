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
const PX={ ORDEM:0.025, LANCE_MIN:0.7, TETO:1.3, MIN_VOL:1 };
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
/* venda numa cidade. teto: o de PX.teto(r) (passe Infinity para não aplicar).
   h: vendas da cidade nos últimos 7 dias (histDias), quando já consultadas. Com h:
   - o anúncio vale no máximo 1,3× o preço médio de 7 dias da cidade (acima disso, conta como anunciado nesse teto);
   - cidade sem venda nos 7 dias: o anúncio não conta;
   - cidade que vende menos de PX.MIN_VOL por dia: o anúncio sai marcado saida:false (só é escolhido se nenhuma cidade vender).
   Venda na hora (para uma ordem de compra) não depende das vendas: a ordem já está lá. */
PX.venda=(r,c,modo,teto,h)=>{ const v=r[c]; if(!v) return null; const tx=PX.taxa();
  if(c==="Black Market") return v[1]>0?{p:v[1],k:v[1]*(1-tx),mode:"inst",t:v[3]||0,c}:null;
  const hk=!!(h&&h.vol>=0); let lp=v[0]>0&&v[0]<=teto?v[0]:0, cap=0;
  if(lp&&hk){ if(!(h.avg>0)) lp=0; else if(lp>h.avg*PX.TETO){ cap=lp; lp=Math.round(h.avg*PX.TETO); } }
  const l=lp?{p:lp,k:lp*(1-tx-PX.ORDEM),mode:"ordem",t:v[2]||0,c,...(cap?{anuncio:cap}:{}),...(hk&&h.vol<PX.MIN_VOL?{saida:false}:{})}:null;
  const i=v[1]>0?{p:v[1],k:v[1]*(1-tx),mode:"inst",t:v[3]||0,c}:null;
  if(modo==="inst") return i; if(modo==="ordem") return l;
  if(l&&i&&l.saida===false) return i;
  return l&&i?(i.k>=l.k?i:l):(l||i); };
/* vendas de 7 dias de um item numa cidade (histDias), se já consultadas */
PX.hist=(id,c)=>{ if(!id||typeof OF2==="undefined"||!OF2.hs) return null; const k=(typeof nk==="function"?nk(id):id)+"|"+c; return OF2.hs[k]||null; };
/* a melhor entre várias cidades */
PX.melhorCompra=(r,locs,modo,o)=>{ let b=null; for(const c of locs){ const x=PX.compra(r,c,modo,o); if(x&&(!b||x.k<b.k)) b=x; } return b; };
/* venda: com o.id, usa as vendas de cada cidade (PX.venda). Escolhe a melhor entre as cidades onde o item vende;
   se não vende em nenhuma, a melhor de todas, marcada semSaida. o.semTeto: cidade escolhida à mão, sem teto nenhum. */
PX.melhorVenda=(r,locs,modo,o={})=>{ const teto=o.semTeto?Infinity:PX.teto(r); let b=null, z=null;
  for(const c of locs){ let h=o.semTeto?null:PX.hist(o.id,c); if(h&&o.qual>1) h={...h,avg:Infinity};   /* qualidade acima de Normal: o preço médio mistura as qualidades, só as vendas contam */
    const x=PX.venda(r,c,modo,teto,h); if(!x) continue;
    if(x.saida===false){ if(!z||x.k>z.k) z=x; } else if(!b||x.k>b.k) b=x; }
  return b||(z?{...z,semSaida:true}:null); };
/* as cidades que vendem (pelo menos 1 por dia), da que deixa mais prata para a que deixa menos: a primeira é a de melhorVenda.
   Serve para mostrar uma segunda cidade de venda e ver se vale espalhar a produção. */
PX.ranking=(r,locs,modo,o={})=>{ const teto=o.semTeto?Infinity:PX.teto(r), out=[];
  for(const c of locs){ let h=o.semTeto?null:PX.hist(o.id,c); if(h&&o.qual>1) h={...h,avg:Infinity};
    const x=PX.venda(r,c,modo,teto,h); if(x&&x.saida!==false) out.push(x); }
  return out.sort((a,b)=>b.k-a.k); };
PX.segunda=(r,locs,modo,o={})=>{ const l=PX.ranking(r,locs,modo,o); return l.find((x,i)=>i>0&&x.c!==l[0].c)||null; };

/* Vendas por dia a partir do histórico diário (uma ou mais séries da API, somadas por dia).
   Conta os 7 dias completos antes de hoje; dia sem registro conta como zero.
   vol = mediana desses 7 dias: um dia fora da curva não mexe no número. Se a mediana der zero mas houve venda
   (item que vende de vez em quando), usa a média, para não sumir. avg = preço médio ponderado pelas vendas. */
function histDias(series){
  const dias=[1,2,3,4,5,6,7].map(i=>new Date(Date.now()-i*864e5).toISOString().slice(0,10)), cnt=Object.fromEntries(dias.map(d=>[d,0])); let n=0, v=0;
  for(const s of series||[]) for(const d of (s.data||[])){ const k=String(d.timestamp||"").slice(0,10); if(!(k in cnt)) continue; const c=d.item_count||0; cnt[k]+=c; n+=c; v+=(d.avg_price||0)*c; }
  const xs=dias.map(d=>cnt[d]).sort((a,b)=>a-b), med=xs[3], media=n/7;
  return {vol:med>0?med:media, med, media, avg:n?v/n:0}; }
/* texto curto para quando a média de 7 dias foge da mediana: "mediana; a média de 7 dias é 7,4" */
const volNota=h=>h&&h.media!=null&&h.vol>0&&Math.abs(h.media-h.vol)>Math.max(0.5,h.vol*0.3)?`mediana dos 7 dias; a média é ${typeof fmtU==="function"?fmtU(h.media):h.media.toFixed(1)}`:"";
