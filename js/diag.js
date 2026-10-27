/* Diagnóstico da API (abra o site com ?diag=1): mostra o registro dos pedidos e mede quantos pedidos por minuto a API aguenta. */
(function(){
  const box=document.createElement("div"); box.id="diagBox";
  box.style.cssText="position:fixed;right:10px;bottom:10px;z-index:99999;width:min(460px,calc(100vw - 20px));max-height:78vh;overflow:auto;background:#14110d;color:#f1e6d0;border:1px solid #c98a2b;border-radius:10px;padding:10px 12px;font:12px/1.4 ui-monospace,Consolas,monospace;box-shadow:0 8px 30px #000a";
  const mk=(t,fn)=>{ const b=document.createElement("button"); b.textContent=t; b.style.cssText="margin:2px 4px 2px 0;padding:4px 8px;background:#2b2216;color:#f1e6d0;border:1px solid #c98a2b;border-radius:6px;cursor:pointer"; b.onclick=fn; return b; };
  const out=document.createElement("pre"); out.style.cssText="white-space:pre-wrap;margin:6px 0 0"; const tst=document.createElement("pre"); tst.style.cssText="white-space:pre-wrap;margin:6px 0 0;color:#9fd18b";
  let testando=false, parar=false, TLOG=[];
  const pct=(a,p)=>a.length?a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]:0;
  function resumo(){
    const now=Date.now(), w=m=>API_LOG.filter(x=>now-x.t<m*60e3), a1=w(1), a5=w(5);
    const n429=API_LOG.filter(x=>x.status===429).length, ms=API_LOG.filter(x=>x.status===200).map(x=>x.ms), esp=API_LOG.map(x=>x.esperou);
    const ult=API_LOG.filter(x=>x.status===429).slice(-1)[0];
    out.textContent=`Pedidos registrados: ${API_LOG.length}\nÚltimo minuto: ${a1.length} · últimos 5 min: ${a5.length}  (medido: 100 por 60 s; oficial: 300/5 min)\nRespostas 429 (limite): ${n429}${ult?`\nÚltimo 429: ${new Date(ult.t).toLocaleTimeString()} — ${ult.resp}`:""}\nTempo de resposta (ms): mediana ${pct(ms,.5)} · p90 ${pct(ms,.9)} · máx ${ms.length?Math.max(...ms):0}\nEspera interna antes de enviar (ms): mediana ${pct(esp,.5)} · máx ${esp.length?Math.max(...esp):0}\nItens por pedido (média): ${API_LOG.length?Math.round(API_LOG.reduce((s,x)=>s+x.itens,0)/API_LOG.length):0}`;
  }
  /* teste: pedidos com itens diferentes (sem cache), em ritmo crescente; para no primeiro 429 */
  async function teste(passos=[30,60,90,120,150],DUR=40e3){
    if(testando) return; testando=true; parar=false; TLOG=[]; tst.textContent="Iniciando…";
    let ids=[]; try{ const c=await need("catalog"); ids=c.i.map(r=>r[0]); }catch(e){ ids=["T4_BAG","T5_BAG","T6_BAG","T7_BAG","T8_BAG"]; }
    let k=0; const nextUrl=()=>{ const lote=[]; for(let i=0;i<20;i++) lote.push(ids[(k*20+i)%ids.length]); k++; return `${HOST}/api/v2/stats/prices/${lote.join(",")}.json?locations=Caerleon&qualities=1&_d=${Date.now()}${k}`; };
    let parouEm=null;
    for(const rate of passos){
      if(parar||parouEm) break; const gap=60e3/rate, ini=Date.now(); let env=0, ok=0, lim=0, outro=0, lat=[];
      while(Date.now()-ini<DUR&&!parar&&!parouEm){
        const alvo=ini+env*gap; const esp=alvo-Date.now(); if(esp>0) await new Promise(f=>setTimeout(f,esp));
        env++; const t0=Date.now();
        fetch(nextUrl()).then(async r=>{ const ms=Date.now()-t0; lat.push(ms); if(r.status===429){ lim++; const tx=await r.text().catch(()=>""); if(!parouEm) parouEm={rate,env,tx:tx.slice(0,200)}; TLOG.push({t:t0,rate,status:429,ms,resp:tx.slice(0,200)}); } else if(r.ok){ ok++; TLOG.push({t:t0,rate,status:r.status,ms}); await r.text(); } else { outro++; TLOG.push({t:t0,rate,status:r.status,ms}); } }).catch(e=>{ outro++; TLOG.push({t:t0,rate,status:0,erro:String(e)}); });
        tst.textContent=TLOG.length||env?`Teste: ${rate} pedidos/min · enviados ${env} · ok ${ok} · 429 ${lim} · outros ${outro}${parouEm?"\nPARADO no primeiro 429.":""}`:"";
      }
      await new Promise(f=>setTimeout(f,3000));
      tst.textContent+=`\n→ ${rate}/min por ${DUR/1000}s: enviados ${env}, ok ${ok}, 429 ${lim}, outros ${outro}, latência mediana ${pct(lat,.5)} ms`;
      TLOG.push({resumo:true,rate,env,ok,lim,outro,lat:pct(lat,.5)});
    }
    tst.textContent+=parouEm?`\nA API passou a recusar com ${parouEm.rate} pedidos/min (depois de ${parouEm.env} pedidos neste passo). Resposta: ${parouEm.tx}`:(parar?"\nTeste interrompido.":"\nNenhum 429 no teste.");
    testando=false;
  }
  function baixar(){ const txt=JSON.stringify({gerado:new Date().toISOString(),ua:navigator.userAgent,pedidosDoSite:API_LOG,teste:TLOG},null,1); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([txt],{type:"application/json"})); a.download="diagnostico-api.json"; a.click(); }
  const h=document.createElement("b"); h.textContent="Diagnóstico da API"; box.append(h,document.createElement("br"),
    mk("Rodar teste de limite (~3 min)",teste),mk("Teste sustentado: 7 min a 85/min",()=>teste([85],420e3)),mk("Parar",()=>{ parar=true; }),mk("Baixar registro",baixar),mk("Fechar",()=>box.remove()),out,tst);
  document.body.append(box); resumo(); setInterval(resumo,1000);
})();
