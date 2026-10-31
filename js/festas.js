/* ================= Bônus ativos: evento, atividade e produção do dia =================
   Fonte: Albion Data Project — /api/v2/stats/festivities (documentado em albion-online-data.com/developer).

   Kind 0 = evento sazonal · Kind 1 = atividade (ex.: pontos de facção) · Kind 2 = bônus diário de produção,
   com UniqueName no formato COMMON_<linha de item> (COMMON_CROSSBOW = toda a linha de besta).

   StartTime/EndTime vêm em ticks do .NET (100 ns desde 0001-01-01Z). A conta é
   Date = ticks/10000 - 62135596800000 (ms), porque 62135596800000 é a distância, em ms, de 0001-01-01 até 1970-01-01.

   A resposta inteira expira no menor EndTime (campo ExpiresAt) e, até uma nova confirmação, o endereço devolve 404.
   Por isso: 404 = silêncio (não é erro); o instantâneo vale até ExpiresAt.

   O bônus de produção tem janela de 24 h (ex.: 29/10 10:00 -> 30/10 10:00 UTC): o horário final é real e mostra
   quando a dupla de itens troca, então ele aparece na faixa. */
(function(){
  "use strict";

  var HOST  = "https://west.albion-online-data.com";   /* servidor Américas, o mesmo que o site usa */
  var CHAVE = "fx:festa";                             /* cache na sessão */
  var TICKS_1970 = 62135596800000;
  var TTL_MAX = 10 * 60e3;                            /* no máximo 10 min de cache, mesmo que ExpiresAt seja maior */
  var PCT_KEY = "fx:festa:pct";                       /* 10% ou 20%: a API não manda, o jogo mostra na aba Atividades */

  var NOMES = {
    COMMON_SWORD:"Espada", COMMON_AXE:"Machado", COMMON_MACE:"Maça", COMMON_HAMMER:"Martelo",
    COMMON_CROSSBOW:"Besta", COMMON_BOW:"Arco", COMMON_DAGGER:"Adaga", COMMON_SPEAR:"Lança",
    COMMON_QUARTERSTAFF:"Bordão", COMMON_FIRE_STAFF:"Cajado de fogo", COMMON_FROST_STAFF:"Cajado de gelo",
    COMMON_ARCANE_STAFF:"Cajado arcano", COMMON_HOLY_STAFF:"Cajado sagrado", COMMON_CURSED_STAFF:"Cajado maldito",
    COMMON_NATURE_STAFF:"Cajado da natureza", COMMON_SHAPESHIFTER_STAFF:"Cajado metamorfo",
    COMMON_WAR_GLOVES:"Manoplas", COMMON_PLATE_ARMOR:"Armadura de placa", COMMON_LEATHER_ARMOR:"Armadura de couro",
    COMMON_CLOTH_ARMOR:"Armadura de pano", COMMON_PLATE_HELMET:"Elmo de placa", COMMON_LEATHER_HOOD:"Capuz de couro",
    COMMON_CLOTH_COWL:"Capote de pano", COMMON_PLATE_BOOTS:"Botas de placa", COMMON_LEATHER_SHOES:"Sapatos de couro",
    COMMON_CLOTH_SANDALS:"Sandálias de pano", COMMON_CAPE:"Capa", COMMON_BAG:"Bolsa",
    COMMON_POTION:"Poção", COMMON_MEAL:"Comida", COMMON_TOOL:"Ferramenta",
    FACTIONPOINTS:"Pontos de facção"
  };
  var EVENTOS = { HALLOWEEN:"Halloween", WINTER:"Inverno", EASTER:"Páscoa", SUMMER:"Verão",
                  ANNIVERSARY:"Aniversário", CHRISTMAS:"Natal", HARVEST:"Colheita" };

  function nome(u){
    if(!u) return "";
    if(typeof bonusNome === "function" && typeof BONUS_NOME !== "undefined" && BONUS_NOME[bonusCanon(u)]) return bonusNome(u);   /* nomes de base.js (const no escopo global, fora do window) */
    if(NOMES[u]) return NOMES[u];
    for(var k in EVENTOS){ if(u.indexOf(k) === 0) return EVENTOS[k]; }
    return u.replace(/^COMMON_/,"").replace(/_/g," ").toLowerCase().replace(/^./,function(c){ return c.toUpperCase(); });
  }
  function quando(d, comData){
    var hoje = new Date();
    var mesmoDia = d.toDateString() === hoje.toDateString();
    var hh = d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    return (comData || !mesmoDia) ? d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}) + " " + hh : hh;
  }
  function ticks(t){ var n = Number(t); return isFinite(n) && n > 0 ? new Date(n/1e4 - TICKS_1970) : null; }
  function pctAtual(){ try{ var v = parseFloat(localStorage.getItem(PCT_KEY)); return v === 0.2 ? 0.2 : 0.1; }catch(e){ return 0.1; } }
  var ultimo = "";
  function publicar(linhas, ativo){
    /* base.js lê window.BONUS_DIA nas contas de refino, craft, cozinha, Mercado Negro e Plano do dia */
    window.BONUS_DIA = { pct: ativo ? pctAtual() : 0, linhas: linhas || {} };
    var sig = JSON.stringify(window.BONUS_DIA);
    if(sig !== ultimo){ var antes = ultimo; ultimo = sig; if(antes || (ativo && Object.keys(linhas || {}).length)) refazer(); }
  }
  /* com o bônus automático, o botão manual "Bônus diário" (+10% em tudo) sairia em dobro: fica escondido e zerado */
  function manual(ocultar){
    document.querySelectorAll('[data-g="daily"]').forEach(function(b){ var c = b.closest(".ctl"); if(c) c.hidden = ocultar; });
    var od = document.getElementById("ofDaily"); if(od){ var l = od.closest("label"); if(l) l.hidden = ocultar; }
    if(ocultar && typeof st !== "undefined" && st.daily){ st.daily = 0; var z = document.querySelector('[data-g="daily"][data-v="0"]'); if(z) z.click(); }
  }
  /* refaz a aba aberta para as contas usarem o bônus que acabou de chegar */
  function refazer(){
    try{ if(window.recompute) window.recompute(false); }catch(e){}
    var aba = function(id){ var p = document.getElementById(id); return p && !p.hidden; };
    try{ if((aba("p-craft") || aba("p-refino")) && window.renderOf) renderOf(); }catch(e){}
    try{ if(aba("p-cozinha") && window.renderCook) renderCook(); }catch(e){}
    try{ if(aba("p-mercado") && window.renderBM) renderBM(); }catch(e){}
    try{ var pp = document.getElementById("plProd"), go = document.getElementById("ppGo");
         if(aba("p-plano") && pp && pp.children.length && go) go.click(); }catch(e){}
  }

  /* ---- cache ---- */
  function lerCache(){
    try{ var s = sessionStorage.getItem(CHAVE); if(!s) return null; var o = JSON.parse(s);
         return (o && o.expira > Date.now()) ? o : null; }catch(e){ return null; }
  }
  function gravarCache(dados, expira){
    try{ sessionStorage.setItem(CHAVE, JSON.stringify({dados:dados, expira:expira})); }catch(e){}
  }

  var barra = null, timer = 0, ultimoDados = null;
  var EM_OV = /[?&]overlay=1\b/.test(location.search) && window.parent !== window;
  function esconder(){ if(barra){ barra.remove(); barra = null; } }

  /* ---- desenho ----
     "Hoje no Albion" mora no cabeçalho, no espaço livre entre o aviso de preços e o Ouro/Premium (.fx-barra, estilo em css/vip.css).
     Dentro do Albion Overlay as páginas são quadros (iframes): em vez de desenhar aqui, o quadro manda o modelo pronto para a
     página-mãe (postMessage { fxBarra }), que desenha no centro da barra de cima do overlay. Sem bônus ativo, manda null.
     Não há mais botão de fechar: a faixa é pequena e fica sempre à vista. */
  function modelo(diarios, atividades, sazonais){
    var m = [];
    if(diarios.length){
      var pct = Math.round(pctAtual()*100);
      var fimDia = diarios.map(function(e){ return ticks(e.EndTime); }).filter(Boolean).sort(function(a,b){ return a-b; })[0];
      m.push({cls:"fx-prod", rotulo:"Produção +" + pct + "%", nomes:diarios.map(function(e){ return nome(e.UniqueName); }),
        fim: fimDia ? "troca " + quando(fimDia) : "", pct:true,
        dica:"Bônus diário de produção: +" + pct + "% de retorno de recursos para fabricar ou refinar estas categorias. Já entra nas contas de Craft, Refino, Cozinha, Mercado Negro e Plano do dia, e os itens aparecem marcados com \"+" + pct + "% hoje\". O jogo mostra o percentual na aba Atividades; se lá estiver diferente, troque aqui."});
    }
    atividades.forEach(function(e){ m.push({cls:"fx-ativ", rotulo:"Atividade", nomes:[nome(e.UniqueName)], fim:"até " + quando(ticks(e.EndTime)), dica:"Atividade com bônus extra no servidor agora."}); });
    sazonais.forEach(function(e){ m.push({cls:"fx-ev", rotulo:"Evento", nomes:[nome(e.UniqueName)], fim:"até " + quando(ticks(e.EndTime), true), dica:"Evento sazonal em andamento."}); });
    return m;
  }
  function bloco(b){
    var i = document.createElement("span"); i.className = "fx-i " + b.cls; i.title = b.dica;
    var k = document.createElement("span"); k.className = "fx-k"; k.textContent = b.rotulo; i.appendChild(k);
    b.nomes.forEach(function(n){ var x = document.createElement("b"); x.textContent = n; i.appendChild(x); });
    if(b.fim){ var q = document.createElement("small"); q.textContent = b.fim; i.appendChild(q); }
    if(b.pct){
      var pu = document.createElement("span"); pu.className = "fx-pct"; pu.setAttribute("role","group"); pu.setAttribute("aria-label","Percentual do bônus de produção");
      [0.1, 0.2].forEach(function(v){
        var bt = document.createElement("button");
        bt.type = "button"; bt.className = "fx-pctb" + (pctAtual() === v ? " on" : "");
        bt.textContent = Math.round(v*100) + "%"; bt.setAttribute("aria-pressed", String(pctAtual() === v));
        bt.title = "Percentual que o jogo está mostrando hoje na aba Atividades";
        bt.addEventListener("click", function(){
          try{ localStorage.setItem(PCT_KEY, String(v)); }catch(e){}
          desenhar(ultimoDados);
        });
        pu.appendChild(bt);
      });
      i.appendChild(pu);
    }
    return i;
  }
  function desenhar(dados){
    ultimoDados = dados;
    var agora = new Date();
    var ev = (dados && dados.Events) || [];
    var ativos = ev.filter(function(e){
      var ini = ticks(e.StartTime), fim = ticks(e.EndTime);
      return fim && fim > agora && (!ini || ini <= agora);
    });
    var sazonais = ativos.filter(function(e){ return +e.Kind === 0; });
    var atividades = ativos.filter(function(e){ return +e.Kind === 1; });
    var diarios = ativos.filter(function(e){ return +e.Kind === 2; });
    if(dados) manual(true);                               /* a API respondeu: o bônus do dia é automático */

    /* publica para as contas (base.js lê window.BONUS_DIA) antes de desenhar */
    var linhas = {};
    diarios.forEach(function(e){ var k = String(e.UniqueName||"").replace(/^COMMON_/,""); if(k) linhas[k] = 1; });
    publicar(linhas, diarios.length > 0);
    var m = modelo(diarios, atividades, sazonais);

    if(EM_OV){
      try{ window.parent.postMessage({fxBarra: m.length ? {blocos:m} : null}, location.origin); }catch(e){}
      return;
    }
    if(!m.length) return esconder();

    if(!barra){
      barra = document.createElement("div");
      barra.className = "fx-barra";
      barra.setAttribute("role","status");
      barra.setAttribute("aria-live","polite");
      /* no cabeçalho, entre o aviso "Preços ao vivo" e o grupo Ouro/Premium/Patch */
      var facts = document.querySelector(".vip-top .facts");
      if(facts && facts.parentNode) facts.parentNode.insertBefore(barra, facts);
      else document.body.insertBefore(barra, document.body.firstChild);
    }
    barra.textContent = "";
    var pista = document.createElement("div"); pista.className = "fx-pista"; barra.appendChild(pista);
    var t = document.createElement("span"); t.className = "fx-t"; t.textContent = "Hoje no Albion"; pista.appendChild(t);
    m.forEach(function(b){ pista.appendChild(bloco(b)); });
    ajustar();
    if(!ro && window.ResizeObserver){ ro = new ResizeObserver(function(){ ajustar(); }); ro.observe(barra); }
  }
  /* o espaço do cabeçalho é pequeno: se o conteúdo não cabe, a pista vai e volta devagar (pausa com o mouse em cima) */
  var ro = null;
  function ajustar(){
    if(!barra) return;
    var pista = barra.firstChild; if(!pista) return;
    var d = pista.offsetWidth - barra.clientWidth;
    barra.classList.toggle("rola", d > 4);
    if(d > 4){ pista.style.setProperty("--d", d + "px"); pista.style.setProperty("--t", Math.max(8, Math.round(d/18) + 6) + "s"); }
  }

  /* ---- busca ---- */
  function buscar(){
    var ctl = new AbortController();
    var tm = setTimeout(function(){ ctl.abort(); }, 8000);
    fetch(HOST + "/api/v2/stats/festivities", {signal:ctl.signal, cache:"no-store"})
      .then(function(r){
        if(r.status === 404){ gravarCache(null, Date.now() + TTL_MAX); return null; }   /* sem instantâneo confirmado */
        if(!r.ok) throw new Error("festa " + r.status);
        return r.json();
      })
      .then(function(j){
        if(j === null){ desenhar(null); return; }
        var exp = Date.parse(j.ExpiresAt || "") || 0;
        gravarCache(j, Math.min(exp || Infinity, Date.now() + TTL_MAX));
        desenhar(j);
      })
      .catch(function(){ desenhar((lerCache() || {}).dados || null); })
      .then(function(){ clearTimeout(tm); });
  }

  function ciclo(){
    var c = lerCache();
    if(c) desenhar(c.dados); else buscar();
    clearInterval(timer);
    timer = setInterval(function(){
      var k = lerCache();
      if(k) desenhar(k.dados); else buscar();
    }, 60e3);
  }

  /* o percentual mudou em outro quadro/aba do mesmo endereço (ex.: clique no cabeçalho do overlay): redesenha */
  window.addEventListener("storage", function(e){ if(e.key === PCT_KEY && ultimoDados !== null) desenhar(ultimoDados); });

  function iniciar(){ try{ ciclo(); }catch(e){} }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
