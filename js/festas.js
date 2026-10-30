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
  function publicar(linhas, ativo){
    /* base.js lê window.BONUS_DIA nas contas de refino, craft e cozinha */
    window.BONUS_DIA = { pct: ativo ? pctAtual() : 0, linhas: linhas || {} };
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

  /* ---- desenho ---- */
  function desenhar(dados){
    if(sessionStorage.getItem(OCULTO)) return esconder();
    publicar({}, false);                                  /* sem bônus até provar o contrário */
    var agora = new Date();
    var ev = (dados && dados.Events) || [];
    var ativos = ev.filter(function(e){
      var ini = ticks(e.StartTime), fim = ticks(e.EndTime);
      return fim && fim > agora && (!ini || ini <= agora);
    });
    if(!ativos.length) return esconder();

    var sazonais = ativos.filter(function(e){ return +e.Kind === 0; });
    var atividades = ativos.filter(function(e){ return +e.Kind === 1; });
    var diarios = ativos.filter(function(e){ return +e.Kind === 2; });

    var partes = [], pctUI = null;
    /* publica para as contas (base.js lê window.BONUS_DIA) antes de desenhar */
    var linhas = {};
    diarios.forEach(function(e){ var k = String(e.UniqueName||"").replace(/^COMMON_/,""); if(k) linhas[k] = 1; });
    publicar(linhas, diarios.length > 0);
    if(diarios.length){
      var itens = diarios.map(function(e){ return nome(e.UniqueName); });
      var fimDia = diarios.map(function(e){ return ticks(e.EndTime); }).filter(Boolean).sort(function(a,b){ return a-b; })[0];
      var pct = Math.round(pctAtual()*100);
      partes.push({rot:"Produção", txt:itens.join(" e ") + (fimDia ? " até " + quando(fimDia) : "") + " · " + pct + "%",
                   dica:"Bônus diário de produção do jogo: já entra nas contas de refino, craft e cozinha destes itens. O percentual é o que aparece na aba Atividades."});
      pctUI = document.createElement("span"); pctUI.className = "fx-pct";
      [0.1, 0.2].forEach(function(v){
        var b = document.createElement("button");
        b.type = "button"; b.className = "fx-pctb" + (pctAtual() === v ? " on" : "");
        b.textContent = Math.round(v*100) + "%";
        b.title = "Percentual que o jogo está mostrando hoje na aba Atividades";
        b.addEventListener("click", function(){
          try{ localStorage.setItem(PCT_KEY, String(v)); }catch(e){}
          publicar(linhas, true); desenhar(dados);
          try{ if(window.recompute) window.recompute(false); }catch(e){}
        });
        pctUI.appendChild(b);
      });
    }
    if(atividades.length){
      partes.push({rot:"Atividade", txt:atividades.map(function(e){ return nome(e.UniqueName) + " até " + quando(ticks(e.EndTime)); }).join(" · "),
                   dica:"Atividade com bônus extra no servidor."});
    }
    if(sazonais.length){
      partes.push({rot:"Evento", txt:sazonais.map(function(e){ return nome(e.UniqueName) + " até " + quando(ticks(e.EndTime), true); }).join(" · "),
                   dica:"Evento sazonal em andamento."});
    }
    if(!partes.length) return esconder();

    if(!barra){
      if(!document.getElementById("fx-estilo")){
        var st = document.createElement("style"); st.id = "fx-estilo";
        st.textContent = [
          ".fx-barra{display:flex;align-items:center;gap:8px 14px;flex-wrap:wrap;margin:0 0 10px;padding:7px 12px;",
          "border:1px solid rgba(201,138,43,.4);border-radius:10px;font-size:13px;line-height:1.35;",
          "background:linear-gradient(180deg,rgba(43,34,22,.92),rgba(20,17,13,.92));color:#f1e6d0}",
          ".fx-barra .fx-t{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#c98a2b;font-weight:700}",
          ".fx-barra .fx-i{display:inline-flex;gap:5px;align-items:baseline;min-width:0}",
          ".fx-barra .fx-i b{font-weight:600;color:#ffd98a}",
          ".fx-barra .fx-i small{color:#a99b84}",
          ".fx-barra .fx-x{margin-left:auto;background:none;border:0;color:#a99b84;font-size:16px;line-height:1;cursor:pointer;padding:2px 4px}",
          ".fx-barra .fx-x:hover{color:#f1e6d0}",
          ".fx-barra .fx-pct{display:inline-flex;gap:2px;margin-left:2px}",
          ".fx-barra .fx-pctb{border:1px solid rgba(201,138,43,.4);background:none;color:#a99b84;font:inherit;font-size:11px;",
          "padding:1px 6px;border-radius:6px;cursor:pointer}",
          ".fx-barra .fx-pctb.on{background:rgba(201,138,43,.22);color:#ffd98a;border-color:#c98a2b}",
          "@media (max-width:640px){.fx-barra{font-size:12px;padding:6px 9px;gap:6px 10px}}"
        ].join("");
        document.head.appendChild(st);
      }
      barra = document.createElement("div");
      barra.className = "fx-barra";
      barra.setAttribute("role","status");
      barra.setAttribute("aria-live","polite");
      var cab = document.querySelector("header.vip-top");
      if(cab && cab.parentNode) cab.parentNode.insertBefore(barra, cab.nextSibling);
      else document.body.insertBefore(barra, document.body.firstChild);
    }

    barra.textContent = "";
    var t = document.createElement("span"); t.className = "fx-t"; t.textContent = "Bônus ativos"; barra.appendChild(t);
    partes.forEach(function(p){
      var i = document.createElement("span"); i.className = "fx-i"; i.title = p.dica;
      var r = document.createElement("small"); r.textContent = p.rot + ":";
      var b = document.createElement("b"); b.textContent = p.txt;
      i.appendChild(r); i.appendChild(b); barra.appendChild(i);
    });
    if(pctUI) barra.appendChild(pctUI);
    var x = document.createElement("button");
    x.type = "button"; x.className = "fx-x"; x.textContent = "×";
    x.setAttribute("aria-label","Esconder os bônus até fechar a página");
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

  function iniciar(){
    if(sessionStorage.getItem(OCULTO)) return;
    try{ ciclo(); }catch(e){}
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
