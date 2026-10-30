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
  var OCULTO = "fx:festa:oculto";
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

  var barra = null, timer = 0;
  function esconder(){ if(barra){ barra.remove(); barra = null; } }

  /* ---- desenho ----
     Uma faixa no topo da área das páginas: "Hoje no Albion" e um bloco por tipo de bônus (produção do dia, atividade, evento),
     cada um com os nomes em destaque e o horário em que acaba. O estilo está em css/vip.css (.fx-*). */
  function bloco(cls, rotulo, nomes, fim, dica){
    var i = document.createElement("span"); i.className = "fx-i " + cls; i.title = dica;
    var k = document.createElement("span"); k.className = "fx-k"; k.textContent = rotulo; i.appendChild(k);
    nomes.forEach(function(n){ var b = document.createElement("b"); b.textContent = n; i.appendChild(b); });
    if(fim){ var q = document.createElement("small"); q.textContent = fim; i.appendChild(q); }
    return i;
  }
  function desenhar(dados){
    var oculto = !!sessionStorage.getItem(OCULTO);
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
    if(!ativos.length || oculto) return esconder();   /* escondida, mas o bônus continua nas contas */

    if(!barra){
      barra = document.createElement("div");
      barra.className = "fx-barra";
      barra.setAttribute("role","status");
      barra.setAttribute("aria-live","polite");
      /* abaixo do título da página, dentro da .main (a .wrap é uma grade: fora da .main a faixa caía no fim da página) */
      var ph = document.getElementById("pagehead"), main = document.querySelector(".wrap .main");
      if(ph && ph.parentNode) ph.parentNode.insertBefore(barra, ph.nextSibling);      /* logo abaixo do título da página */
      else if(main) main.insertBefore(barra, main.firstChild);
      else document.body.insertBefore(barra, document.body.firstChild);
    }
    barra.textContent = "";
    var t = document.createElement("span"); t.className = "fx-t"; t.textContent = "Hoje no Albion"; barra.appendChild(t);

    if(diarios.length){
      var pct = Math.round(pctAtual()*100);
      var fimDia = diarios.map(function(e){ return ticks(e.EndTime); }).filter(Boolean).sort(function(a,b){ return a-b; })[0];
      var p = bloco("fx-prod", "Produção +" + pct + "%", diarios.map(function(e){ return nome(e.UniqueName); }),
        fimDia ? "troca " + quando(fimDia) : "",
        "Bônus diário de produção: +" + pct + "% de retorno de recursos para fabricar ou refinar estas categorias. Já entra nas contas de Craft, Refino, Cozinha, Mercado Negro e Plano do dia, e os itens aparecem marcados com \"+" + pct + "% hoje\". O jogo mostra o percentual na aba Atividades; se lá estiver diferente, troque aqui.");
      var pu = document.createElement("span"); pu.className = "fx-pct"; pu.setAttribute("role","group"); pu.setAttribute("aria-label","Percentual do bônus de produção");
      [0.1, 0.2].forEach(function(v){
        var b = document.createElement("button");
        b.type = "button"; b.className = "fx-pctb" + (pctAtual() === v ? " on" : "");
        b.textContent = Math.round(v*100) + "%"; b.setAttribute("aria-pressed", String(pctAtual() === v));
        b.title = "Percentual que o jogo está mostrando hoje na aba Atividades";
        b.addEventListener("click", function(){
          try{ localStorage.setItem(PCT_KEY, String(v)); }catch(e){}
          desenhar(dados);
        });
        pu.appendChild(b);
      });
      p.appendChild(pu); barra.appendChild(p);
    }
    if(atividades.length){
      atividades.forEach(function(e){
        barra.appendChild(bloco("fx-ativ", "Atividade", [nome(e.UniqueName)], "até " + quando(ticks(e.EndTime)), "Atividade com bônus extra no servidor agora."));
      });
    }
    if(sazonais.length){
      sazonais.forEach(function(e){
        barra.appendChild(bloco("fx-ev", "Evento", [nome(e.UniqueName)], "até " + quando(ticks(e.EndTime), true), "Evento sazonal em andamento."));
      });
    }
    var x = document.createElement("button");
    x.type = "button"; x.className = "fx-x"; x.textContent = "×";
    x.setAttribute("aria-label","Esconder os bônus até fechar a página"); x.title = "Esconder até fechar a página (os bônus continuam valendo nas contas)";
    x.addEventListener("click", function(){ try{ sessionStorage.setItem(OCULTO,"1"); }catch(e){} esconder(); });
    barra.appendChild(x);
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

  function iniciar(){ try{ ciclo(); }catch(e){} }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
