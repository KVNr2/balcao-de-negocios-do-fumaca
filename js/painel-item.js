/* Painel "Pesquisa de item" (estilo overlay do POE 2): preços por cidade do item lido na tela do jogo.
   Parâmetros: id (id base, ex. T5_SHOES_CLOTH_SET1), e (encantamento 0-4), q (qualidade 1-5; 0 = qualquer),
   n (nome do item), av (avisos da leitura, separados por ;).
   Funciona no overlay (janela local 127.0.0.1:47832) e aberto direto no navegador (para testar). */
(function(){
"use strict";
var HOST="https://west.albion-online-data.com";
var CIDADES=[["Caerleon","Caerleon"],["Bridgewatch","Bridgewatch"],["Fort Sterling","Fort Sterling"],["Lymhurst","Lymhurst"],["Martlock","Martlock"],["Thetford","Thetford"],["Brecilien","Brecilien"],["Black Market","Mercado Negro"]];
var QN=["Qualquer","Normal","Bom","Excepcional","Excelente","Obra-prima"];
var $=function(i){return document.getElementById(i)};
var P=new URLSearchParams(location.search);
var OV=location.port==="47832";   /* dentro do overlay: janela sem barra de título, arrastável pelo cabeçalho */
var S={id:(P.get("id")||"").replace(/[^A-Za-z0-9_]/g,""),e:Math.max(0,Math.min(4,+P.get("e")||0)),q:Math.max(0,Math.min(5,+P.get("q")||0)),modo:"v",cid:new Set(CIDADES.map(function(c){return c[0]})),
  prices:null,hist:{},gen:0,quando:0};

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function fmt(n){return n>0?window.fmtS?fmtS(n):String(Math.round(n)):"—"}
var tier=(/^T(\d)/.exec(S.id)||[])[1]||"";

/* ---------- limite da API (mesmos contadores do site: localStorage apiStamps / apiBlock) ---------- */
function lsGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function sleep(ms){return new Promise(function(f){setTimeout(f,ms)})}
async function pace(){
  for(;;){var now=Date.now(),st=(lsGet("apiStamps",[])||[]).filter(function(t){return now-t<300e3}),blk=+lsGet("apiBlock",0)||0,m1=st.filter(function(t){return now-t<60e3});
    var w=0;if(blk>now)w=blk-now;else if(st.length>=250)w=300e3-(now-st[0])+50;else if(m1.length>=85)w=60e3-(now-m1[0])+50;
    if(w<=0){st.push(now);lsSet("apiStamps",st);return}
    prog(null,"Aguardando o limite da API ("+Math.ceil(w/1000)+" s)…");await sleep(Math.max(500,Math.min(w,5000)))}
}
async function apiJSON(url){
  for(var n=0;n<2;n++){
    await pace();
    var r=await fetch(url);
    if(r.status===429){var t=await r.text(),m=/resets at (\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d)/.exec(t||""),ms=m?Math.min(310e3,Math.max(1e3,Date.parse(m[1]+"T"+m[2]+"Z")-Date.now()+1500)):30e3;
      lsSet("apiBlock",Date.now()+ms);continue}
    if(!r.ok)throw new Error("API "+r.status);
    return r.json()}
  throw new Error("limite da API: tente de novo em instantes");
}

/* ---------- barra de carregamento ---------- */
function prog(pc,txt,n){var g=$("pg");g.hidden=false;if(txt)$("pgt").textContent=txt;if(pc!=null)$("pgb").style.width=pc+"%";$("pgn").textContent=n||""}
function progFim(){$("pg").hidden=true}

/* ---------- dados ---------- */
function ids5(){var a=[];for(var i=0;i<5;i++)a.push(S.id+(i?"@"+i:""));return a}
function locs(){return CIDADES.map(function(c){return encodeURIComponent(c[0])}).join(",")}
var parseT=function(d){return d&&d.indexOf("0001")!==0?Date.parse(d.length<=19?d+"Z":d):0};

async function carregarPrecos(){
  var ids=ids5();
  prog(10,"Consultando preços nas cidades…","1 de 3");
  var api=await apiJSON(HOST+"/api/v2/stats/prices/"+ids.join(",")+".json?locations="+locs()+"&qualities=1,2,3,4,5");
  api=(Array.isArray(api)?api:[]).map(function(x){return{id:x.item_id,city:x.city,q:x.quality,sell:x.sell_price_min||0,sellT:parseT(x.sell_price_min_date),buy:x.buy_price_max||0,buyT:parseT(x.buy_price_max_date)}});
  prog(40,"Conferindo preços coletados pelo overlay…","2 de 3");
  try{
    var cfg=await (await fetch("data/nuvem.json")).json();
    if(cfg&&cfg.url&&cfg.key){
      var qs="select=item_id,quality,city,sell_min,sell_min_at,buy_max,buy_max_at&item_id=in.("+ids.map(encodeURIComponent).join(",")+")&quality=in.(1,2,3,4,5)&limit=1000";
      var ctl=new AbortController(),tm=setTimeout(function(){ctl.abort()},5000);
      try{var r=await fetch(cfg.url.replace(/\/$/,"")+"/rest/v1/market_latest?"+qs,{signal:ctl.signal,headers:{apikey:cfg.key,Authorization:"Bearer "+cfg.key}});
        if(r.ok){var rows=await r.json(),ix={};api.forEach(function(x){ix[x.id+"|"+x.city+"|"+x.q]=x});
          (rows||[]).forEach(function(c){var k=c.item_id+"|"+c.city+"|"+c.quality,x=ix[k];
            if(!x){x={id:c.item_id,city:c.city,q:c.quality,sell:0,sellT:0,buy:0,buyT:0};api.push(x);ix[k]=x}
            if(c.city!=="Black Market"&&c.sell_min&&c.sell_min_at&&Date.parse(c.sell_min_at)>x.sellT){x.sell=c.sell_min;x.sellT=Date.parse(c.sell_min_at)}
            if(c.buy_max&&c.buy_max_at&&Date.parse(c.buy_max_at)>x.buyT){x.buy=c.buy_max;x.buyT=Date.parse(c.buy_max_at)}})}}
      finally{clearTimeout(tm)}}
  }catch(e){/* nuvem fora do ar: segue só com a API pública */}
  S.prices=api;S.quando=Date.now();
}

async function carregarHist(){
  var id=S.id+(S.e?"@"+S.e:"");
  if(S.hist[id])return;
  prog(70,"Buscando as médias de 7 e 30 dias…","3 de 3");
  var j=await apiJSON(HOST+"/api/v2/stats/history/"+id+".json?locations="+locs()+"&qualities=1,2,3,4,5&time-scale=24");
  var out={},now=Date.now();
  (Array.isArray(j)?j:[]).forEach(function(s){
    var w7=0,n7=0,w30=0,n30=0;
    (s.data||[]).forEach(function(d){var t=Date.parse((d.timestamp||"")+(String(d.timestamp||"").length<=19?"Z":"")),dias=(now-t)/864e5,c=d.item_count||0,p=d.avg_price||0;
      if(dias<=30&&c>0){w30+=p*c;n30+=c;if(dias<=7){w7+=p*c;n7+=c}}});
    out[s.location+"|"+s.quality]={m7:n7?w7/n7:0,m30:n30?w30/n30:0}});
  S.hist[id]=out;
}

/* ---------- tela ---------- */
function idade(t){if(!t)return["",false];var h=(Date.now()-t)/36e5;return[h<1?"<1 h":h<48?Math.round(h)+" h":Math.round(h/24)+" d",h>48]}
function cabecalho(){
  var id=S.id+(S.e?"@"+S.e:"");
  $("ic").src="https://render.albiononline.com/v1/item/"+id+".png?quality="+(S.q||1)+"&size=128";
  $("nome").textContent=P.get("n")||S.id||"Item não informado";
  $("sub").innerHTML="T"+esc(tier)+(S.e?' · <b class="e'+S.e+'">.'+S.e+"</b>":" · .0")+(S.q?" · "+esc(QN[S.q]):" · qualquer qualidade");
  $("fq").value=String(S.q);$("fe").value=String(S.e);
}
function desenhar(){
  cabecalho();
  var tb=$("tbd");tb.innerHTML="";$("vz").hidden=true;
  if(!S.prices)return;
  var id=S.id+(S.e?"@"+S.e:""),h=S.hist[id]||{};
  var rows;
  if(S.modo==="v"){
    rows=S.prices.filter(function(x){return x.id===id&&S.cid.has(x.city)&&(!S.q||x.q===S.q)&&x.sell>0});
    rows.forEach(function(x){x.p=x.sell;x.t=x.sellT;x.de=0});
  }else{
    /* Pedido de compra do jogo vale para a qualidade dele OU MELHOR: quem vende um item de qualidade Q aceita qualquer pedido de qualidade <= Q.
       Então o maior pedido de compra para a qualidade Q é o maior entre os pedidos de qualidade 1..Q da cidade (o jogo mostra assim). */
    var mine=S.prices.filter(function(x){return x.id===id&&S.cid.has(x.city)&&x.buy>0});
    var cs={};mine.forEach(function(x){cs[x.city]=1});
    rows=[];
    Object.keys(cs).forEach(function(c){
      for(var q=1;q<=5;q++){
        if(S.q&&q!==S.q)continue;
        var best=null;
        mine.forEach(function(y){if(y.city===c&&y.q<=q&&(!best||y.buy>best.buy))best=y});
        if(best)rows.push({id:id,city:c,q:q,p:best.buy,t:best.buyT,de:best.q<q?best.q:0});
      }
    });
    if(!S.q){ /* sem filtro de qualidade: não repete a mesma linha (mesmo preço herdado) em várias qualidades */
      var vis={};rows=rows.filter(function(x){var k=x.city+"|"+x.p+"|"+x.t;if(x.de&&vis[k])return false;vis[k]=1;return true});
    }
  }
  rows.sort(function(a,b){return S.modo==="v"?a.p-b.p:b.p-a.p});
  if(!rows.length){var v=$("vz");v.hidden=false;v.textContent=S.cid.size?"Sem preços "+(S.modo==="v"?"de venda":"de compra")+" para este filtro. O dado pode ainda não ter sido coletado.":"Marque ao menos uma cidade.";return}
  var nome={};CIDADES.forEach(function(c){nome[c[0]]=c[1]});
  tb.innerHTML=rows.slice(0,25).map(function(x,i){var a=idade(x.t),hh=h[x.city+"|"+x.q];
    return '<tr'+(i===0?' class="top"':'')+'><td>'+esc(nome[x.city]||x.city)+'</td><td class="n p">'+fmt(x.p)+'</td><td class="q"'+(x.de?' title="Pedido de compra de qualidade '+esc(QN[x.de]||x.de)+' ou melhor"':'')+'>'+esc(QN[x.q]||"")+(x.de?" ↓":"")+'</td><td class="idade'+(a[1]?" velho":"")+'">'+esc(a[0])+'</td><td class="n m">'+(hh?fmt(hh.m7):"—")+'</td><td class="n m">'+(hh?fmt(hh.m30):"—")+"</td></tr>"}).join("");
  $("fonte").textContent="Albion Data + preços do overlay · "+new Date(S.quando).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
}
function resumoCidades(){var n=S.cid.size;$("fcs").textContent=n===CIDADES.length?"Todas":n===0?"Nenhuma":n<=2?CIDADES.filter(function(c){return S.cid.has(c[0])}).map(function(c){return c[1]}).join(", "):n+" cidades"}

async function consultar(){
  var g=++S.gen;
  if(!S.id){$("vz").hidden=false;$("vz").textContent="Nenhum item. Abra a tela de detalhes do item no jogo e use o atalho de pesquisa do overlay.";return}
  try{
    if(!S.prices)await carregarPrecos();
    if(g!==S.gen)return;
    desenhar();
    await carregarHist();
    if(g!==S.gen)return;
    prog(100,"Pronto");desenhar();
  }catch(e){$("vz").hidden=false;$("vz").textContent="Não consegui consultar os preços: "+(e&&e.message||e);}
  finally{if(g===S.gen)progFim()}
}

/* ---------- controles ---------- */
(function(){
  var lista=$("fcl");
  lista.innerHTML=CIDADES.map(function(c){return '<label><input type="checkbox" value="'+esc(c[0])+'" checked>'+esc(c[1])+"</label>"}).join("");
  var salvo=lsGet("pi_cidades",null);if(Array.isArray(salvo)&&salvo.length)S.cid=new Set(salvo.filter(function(c){return CIDADES.some(function(k){return k[0]===c})}));
  [].forEach.call(lista.querySelectorAll("input"),function(i){i.checked=S.cid.has(i.value);i.addEventListener("change",function(){if(i.checked)S.cid.add(i.value);else S.cid.delete(i.value);lsSet("pi_cidades",Array.from(S.cid));resumoCidades();desenhar()})});
  resumoCidades();
  $("fq").addEventListener("change",function(){S.q=+this.value;desenhar()});
  $("fe").addEventListener("change",function(){S.e=+this.value;S.gen++;desenhar();consultar()});
  [].forEach.call($("ft").querySelectorAll("button"),function(b){b.addEventListener("click",function(){S.modo=b.dataset.v;[].forEach.call($("ft").querySelectorAll("button"),function(o){o.setAttribute("aria-pressed",String(o===b))});desenhar()})});
  $("atu").addEventListener("click",function(){S.prices=null;S.hist={};consultar()});
  $("x").addEventListener("click",function(){window.close()});
  document.addEventListener("keydown",function(e){if(e.key==="Escape"){var d=$("fc");if(d.open){d.open=false;return}window.close()}});
  document.addEventListener("click",function(e){var d=$("fc");if(d.open&&!d.contains(e.target))d.open=false});
  var av=(P.get("av")||"").split(";").filter(Boolean);if(av.length){$("av").hidden=false;$("av").textContent="Atenção na leitura: "+av.join("; ")}
  if(OV){   /* protocolo das janelinhas do overlay (sem barra do navegador; arrastar pelo cabeçalho) */
    requestAnimationFrame(function(){requestAnimationFrame(function(){fetch("/pronto?dlg=1",{method:"POST"})})});
    var moldura=function(){var t=Math.round((window.outerHeight-window.innerHeight)*(window.devicePixelRatio||1));if(t>=10&&t<=90)fetch("/moldura?dlg=1&top="+t,{method:"POST"})};
    moldura();setTimeout(moldura,400);
    var c=$("bar"),d=null,pend=null,raf=0;
    var flush=function(){raf=0;if(pend){fetch("/mover?dlg=1&dx="+Math.round(pend.x*(window.devicePixelRatio||1))+"&dy="+Math.round(pend.y*(window.devicePixelRatio||1)),{method:"POST"});pend=null}};
    c.addEventListener("pointerdown",function(e){if(e.button!==0||e.target.closest("button"))return;d={x:e.screenX,y:e.screenY};c.setPointerCapture(e.pointerId)});
    c.addEventListener("pointermove",function(e){if(!d)return;var dx=e.screenX-d.x,dy=e.screenY-d.y;if(!dx&&!dy)return;d={x:e.screenX,y:e.screenY};pend=pend?{x:pend.x+dx,y:pend.y+dy}:{x:dx,y:dy};if(!raf)raf=requestAnimationFrame(flush)});
    c.addEventListener("pointerup",function(){d=null});c.addEventListener("pointercancel",function(){d=null});
  }
})();
cabecalho();consultar();
})();
