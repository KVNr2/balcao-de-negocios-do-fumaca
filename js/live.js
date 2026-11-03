/* ================= Live: transmissão direta pelo navegador (WebRTC), sem YouTube =================
   Fluxo: o bot do Discord (/live) cria uma sala no Supabase e posta o link de assistir (sala + token de quem assiste); por padrão a live aparece sozinha na aba Live de quem usa o site/overlay (live_publicas); quem transmite pode desmarcar e deixar só por link;
   só o dono recebe o link de transmitir (com o token de transmissão). O vídeo NÃO passa pelo Supabase: vai direto do navegador de quem
   transmite para o de cada espectador (P2P). O Supabase só leva as mensagens de combinação (SDP) pelas funções live_* (consulta a cada ~1 a 2 s).
   Limites: até MAX espectadores por transmissão (o envio é da internet de quem transmite); sem servidor TURN, então redes que bloqueiam P2P
   (alguns celulares/CGNAT) podem não conectar.
   Armazenamento local: lv:salas (links que a pessoa abriu), lv:emit (sala que ela transmite). Dentro do overlay vale o mesmo, com armazenamento próprio. */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var MAX = 5, ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };
  var K_SALAS = "lv:salas", K_EMIT = "lv:emit";
  var cfg = null, salas = [], info = {}, pub = {}, emit = null, sel = null;
  var vpc = null, vId = "", vTimer = 0, vGen = 0, vMudo = true, vRetry = 0;
  var stream = null, pcs = {}, worker = null, sIniciando = false;

  function ls(k, v){ try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} return null; }
  function rpc(nome, args){
    return Promise.resolve(cfg || need("nuvem")).then(function(c){
      cfg = c;
      return fetch(c.url.replace(/\/$/, "") + "/rest/v1/rpc/" + nome, { method: "POST", cache: "no-store",
        headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json" }, body: JSON.stringify(args || {}) });
    }).then(function(r){ if(!r.ok) throw new Error(nome + " " + r.status); return r.json(); });
  }
  function rnd(n){ var a = new Uint8Array(n), s = ""; crypto.getRandomValues(a); for(var i = 0; i < n; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[a[i] % 36]; return s; }
  function erro(t){ var e = $("lvErr"); e.textContent = t || ""; e.hidden = !t; }
  function esperaIce(pc){
    return new Promise(function(ok){
      if(pc.iceGatheringState === "complete") return ok();
      var t = setTimeout(done, 4000);
      function done(){ clearTimeout(t); pc.removeEventListener("icegatheringstatechange", chg); ok(); }
      function chg(){ if(pc.iceGatheringState === "complete") done(); }
      pc.addEventListener("icegatheringstatechange", chg);
    });
  }

  /* ---- links: #live=SALA.TOKEN[&s=TOKEN_TRANSMISSAO] ---- */
  function lerLink(txt){
    var m = /live=([a-z0-9]{8})\.([a-f0-9]{32})(?:&s=([a-f0-9]{32}))?/i.exec(String(txt || ""));
    return m ? { s: m[1].toLowerCase(), t: m[2].toLowerCase(), ts: m[3] ? m[3].toLowerCase() : "" } : null;
  }
  function guardar(l){
    if(!l) return false;
    if(!salas.some(function(x){ return x.s === l.s; })){ salas.push({ s: l.s, t: l.t }); ls(K_SALAS, salas); }
    if(l.ts){ emit = { s: l.s, t: l.t, ts: l.ts }; ls(K_EMIT, emit); }
    return true;
  }

  /* ---- lista de lives ---- */
  function todas(){ // salvas + as que aparecem sozinhas (públicas do grupo)
    var l = salas.map(function(x){ return { s: x.s, t: x.t, auto: false }; });
    Object.keys(pub).forEach(function(k){ if(!l.some(function(x){ return x.s === k; })) l.push({ s: k, t: pub[k].t, auto: true }); });
    return l;
  }
  function atualizarLista(){
    var pi = salas.length ? rpc("live_info", { p_salas: salas }).catch(function(){ return null; }) : Promise.resolve([]);
    var pp = rpc("live_publicas").catch(function(){ return null; });
    return Promise.all([pi, pp]).then(function(rs){
      if(rs[0]){
        info = {}; (rs[0] || []).forEach(function(x){ info[x.sala] = x; });
        var antes = salas.length;
        salas = salas.filter(function(x){ return info[x.s] && info[x.s].ativo; }); // encerradas ou desconhecidas saem da lista
        if(salas.length !== antes) ls(K_SALAS, salas);
        if(emit && !(info[emit.s] && info[emit.s].ativo)){ if(!stream){ emit = null; ls(K_EMIT, null); } }
      }
      if(rs[1]){ pub = {}; (rs[1] || []).forEach(function(x){ pub[x.sala] = x; if(!info[x.sala]) info[x.sala] = x; }); }
      mostrarEmit(); desenharLista(); pontoAba();
      if(sel && vpc && !(info[sel] && info[sel].no_ar)) parar("A transmissão terminou.");
    });
  }
  function pontoAba(){ var t = $("t-live"); if(t) t.classList.toggle("ao-vivo", todas().some(function(x){ return info[x.s] && info[x.s].no_ar; })); }
  function desenharLista(){
    var L = $("lvLista"); L.textContent = "";
    var lista = todas();
    if(!lista.length){
      var v = document.createElement("div"); v.className = "lv-vazio";
      v.innerHTML = "<b>Ninguém está transmitindo agora</b>Quando alguém digitar /live no Discord e começar, a live aparece aqui sozinha.";
      L.appendChild(v); return;
    }
    lista.forEach(function(x){
      var i = info[x.s] || {}, c = document.createElement("div"); c.className = "lv-card" + (sel === x.s ? " sel" : "");
      var d = document.createElement("span"); d.className = "lv-dot" + (i.no_ar ? " on" : "");
      var n = document.createElement("div"); n.className = "info";
      var b = document.createElement("b"); b.textContent = i.titulo || "Live"; var s = document.createElement("span");
      s.textContent = (i.dono ? "de " + i.dono + " · " : "") + (i.no_ar ? "no ar agora" : "aguardando começar") + (x.auto ? "" : " · link salvo");
      n.appendChild(b); n.appendChild(s);
      var bt = document.createElement("button"); bt.type = "button"; bt.className = "of-btn"; bt.textContent = sel === x.s && vpc ? "Assistindo" : "Assistir"; bt.disabled = !i.no_ar || (sel === x.s && !!vpc);
      bt.addEventListener("click", function(){ assistir(x.s); });
      if(x.auto){ c.appendChild(d); c.appendChild(n); c.appendChild(bt); L.appendChild(c); return; }
      var rm = document.createElement("button"); rm.type = "button"; rm.className = "lv-x"; rm.title = "Remover da lista"; rm.setAttribute("aria-label", "Remover da lista"); rm.textContent = "×";
      rm.addEventListener("click", function(){
        if(sel === x.s) parar("");
        salas = salas.filter(function(y){ return y.s !== x.s; }); ls(K_SALAS, salas); desenharLista(); pontoAba();
      });
      c.appendChild(d); c.appendChild(n); c.appendChild(bt); c.appendChild(rm); L.appendChild(c);
    });
  }

  /* ---- espectador ---- */
  function msgPalco(t){ var m = $("lvMsg"); m.textContent = t || ""; m.hidden = !t; }
  function parar(texto){
    vGen++; clearTimeout(vTimer); clearTimeout(vRetry);
    if(vpc){ try{ vpc.close(); }catch(e){} vpc = null; }
    $("lvVideo").srcObject = null; $("lvBadge").hidden = true; $("lvSomDica").hidden = true;
    if(texto){ $("lvWrap").hidden = false; msgPalco(texto); } else { $("lvWrap").hidden = true; msgPalco(""); sel = null; }
    desenharLista();
  }
  function assistir(sid){
    var sl = todas().filter(function(x){ return x.s === sid; })[0]; if(!sl) return;
    parar(""); erro(""); sel = sid; var gen = ++vGen; vId = rnd(16);
    $("lvWrap").hidden = false; msgPalco("Conectando…"); $("lvTit").textContent = (info[sid] && info[sid].titulo) || "Live"; desenharLista();
    var pc = vpc = new RTCPeerConnection(ICE);
    pc.addTransceiver("video", { direction: "recvonly" }); pc.addTransceiver("audio", { direction: "recvonly" });
    pc.ontrack = function(ev){
      var v = $("lvVideo"); if(v.srcObject !== ev.streams[0]) v.srcObject = ev.streams[0];
      v.muted = vMudo; v.play().catch(function(){});
    };
    pc.onconnectionstatechange = function(){
      if(gen !== vGen) return;
      if(pc.connectionState === "connected"){ msgPalco(""); $("lvBadge").hidden = false; atualizarSom(); }
      if(pc.connectionState === "failed" || pc.connectionState === "disconnected"){
        $("lvBadge").hidden = true; msgPalco("A conexão caiu. Tentando de novo…");
        clearTimeout(vRetry); vRetry = setTimeout(function(){ if(gen === vGen && info[sid] && info[sid].no_ar) assistir(sid); else if(gen === vGen) parar("A transmissão terminou."); }, 4000);
      }
    };
    pc.createOffer().then(function(o){ return pc.setLocalDescription(o); }).then(function(){ return esperaIce(pc); }).then(function(){
      if(gen !== vGen) return;
      return rpc("live_v_pedir", { p_sala: sid, p_tv: sl.t, p_viewer: vId, p_sdp: pc.localDescription.sdp }).then(function(r){
        if(gen !== vGen) return;
        if(!r || !r.ok){ parar(""); erro((r && r.err) || "Não consegui pedir a transmissão."); return; }
        esperarResposta(sid, sl.t, gen, pc, Date.now());
      });
    }).catch(function(){ if(gen === vGen){ parar(""); erro("Não consegui conectar. Confira sua internet."); } });
  }
  function esperarResposta(sid, tv, gen, pc, t0){
    if(gen !== vGen) return;
    if(Date.now() - t0 > 25000){ parar(""); erro("O streamer não respondeu a tempo. Confirme que a aba dele continua aberta."); return; }
    rpc("live_v_resp", { p_sala: sid, p_tv: tv, p_viewer: vId }).then(function(r){
      if(gen !== vGen) return;
      if(r && r.pronto){
        if(r.erro){ parar(""); erro(r.erro === "cheia" ? "Esta transmissão já está com o máximo de " + MAX + " espectadores." : r.erro); return; }
        pc.setRemoteDescription({ type: "answer", sdp: r.sdp }).catch(function(){ parar(""); erro("Resposta inválida do streamer."); });
        return;
      }
      vTimer = setTimeout(function(){ esperarResposta(sid, tv, gen, pc, t0); }, 1000);
    }).catch(function(){ vTimer = setTimeout(function(){ esperarResposta(sid, tv, gen, pc, t0); }, 1500); });
  }
  function atualizarSom(){ $("lvMute").dataset.on = vMudo ? "0" : "1"; $("lvMute").setAttribute("aria-label", vMudo ? "Ligar o som" : "Silenciar"); $("lvSomDica").hidden = !vMudo || !vpc || vpc.connectionState !== "connected"; }
  function alternarSom(){ vMudo = !vMudo; var v = $("lvVideo"); v.muted = vMudo; if(!vMudo){ v.volume = (+$("lvVol").value) / 100; v.play().catch(function(){}); } atualizarSom(); }
  function telaCheia(){ var el = $("lvStage"); if(document.fullscreenElement){ document.exitFullscreen(); return; } (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el); }

  /* ---- quem transmite ---- */
  function stEmit(t, on){ var s = $("lvEmitSt"); s.textContent = t; s.classList.toggle("on", !!on); }
  function mostrarEmit(){
    $("lvEmit").hidden = !emit; if(!emit) return;
    var i = info[emit.s]; $("lvEmitTit").textContent = "Você vai transmitir: " + ((i && i.titulo) || "sua live");
  }
  function escolher(){
    if(sIniciando) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia){ erro("Este navegador não permite transmitir a tela. Abra o link no Chrome ou no Edge, no computador."); return; }
    sIniciando = true; erro("");
    navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 }, width: { max: 1920 }, height: { max: 1080 } }, audio: $("lvAudio").checked }).then(function(ms){
      sIniciando = false; pararCaptura(false); stream = ms;
      ms.getVideoTracks().forEach(function(t){ try{ t.contentHint = "motion"; }catch(e){} t.addEventListener("ended", function(){ if(stream === ms){ pararCaptura(false); stEmit("compartilhamento parado", false); erro("Você parou de compartilhar a tela. Clique em Escolher tela ou janela para continuar."); } }); });
      var p = $("lvPrev"); p.srcObject = ms; p.hidden = false;
      stEmit("no ar", true); iniciarSync();
    }).catch(function(e){ sIniciando = false; if(!e || e.name !== "NotAllowedError") erro("Não consegui capturar a tela."); });
  }
  function pararCaptura(avisarFim){
    if(worker){ worker.terminate(); worker = null; }
    Object.keys(pcs).forEach(function(k){ try{ pcs[k].close(); }catch(e){} }); pcs = {};
    if(stream){ stream.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} }); stream = null; }
    var p = $("lvPrev"); if(p){ p.srcObject = null; p.hidden = true; }
    if(avisarFim && emit) rpc("live_s_fim", { p_sala: emit.s, p_ts: emit.ts }).catch(function(){});
  }
  function encerrar(){
    pararCaptura(true); stEmit("encerrada", false);
    if(emit){ var id = emit.s; salas = salas.filter(function(x){ return x.s !== id; }); ls(K_SALAS, salas); emit = null; ls(K_EMIT, null); }
    mostrarEmit(); desenharLista(); pontoAba();
  }
  function iniciarSync(){
    // relógio em Worker: não é freado quando a aba fica em segundo plano
    try{
      var blob = new Blob(["setInterval(function(){postMessage(1)},2000)"], { type: "text/javascript" });
      worker = new Worker(URL.createObjectURL(blob)); worker.onmessage = sync;
    }catch(e){ worker = null; }
    if(!worker){ var h = setInterval(function(){ if(!stream){ clearInterval(h); return; } sync(); }, 2000); }
    sync();
  }
  function conectados(){ return Object.keys(pcs).filter(function(k){ var s = pcs[k].connectionState; return s !== "closed" && s !== "failed"; }).length; }
  function sync(){
    if(!stream || !emit) return;
    rpc("live_s_sync", { p_sala: emit.s, p_ts: emit.ts }).then(function(r){
      if(!r || !r.ok){ if(r && r.err){ pararCaptura(false); stEmit("encerrada", false); erro(r.err); } return; }
      if(typeof r.publica === "boolean" && $("lvPublica").checked !== r.publica && document.activeElement !== $("lvPublica")) $("lvPublica").checked = r.publica;
      (r.ofertas || []).forEach(function(o){ atender(o); });
      var n = conectados(); stEmit("no ar · " + n + (n === 1 ? " espectador" : " espectadores"), true);
    }).catch(function(){});
  }
  function atender(o){
    var ts = emit.ts, sid = emit.s;
    if(pcs[o.viewer]){ try{ pcs[o.viewer].close(); }catch(e){} delete pcs[o.viewer]; }
    if(conectados() >= MAX){ rpc("live_s_resp", { p_sala: sid, p_ts: ts, p_viewer: o.viewer, p_sdp: null, p_erro: "cheia" }).catch(function(){}); return; }
    var pc = new RTCPeerConnection(ICE); pcs[o.viewer] = pc;
    stream.getTracks().forEach(function(t){ pc.addTrack(t, stream); });
    pc.onconnectionstatechange = function(){ if(pc.connectionState === "failed" || pc.connectionState === "closed" || pc.connectionState === "disconnected"){ try{ pc.close(); }catch(e){} if(pcs[o.viewer] === pc) delete pcs[o.viewer]; } };
    pc.setRemoteDescription({ type: "offer", sdp: o.sdp }).then(function(){
      // limita o envio por espectador (vários espectadores dividem a internet de quem transmite)
      pc.getSenders().forEach(function(s){ if(s.track && s.track.kind === "video"){ var p = s.getParameters(); if(!p.encodings || !p.encodings.length) p.encodings = [{}]; p.encodings[0].maxBitrate = 3000000; s.setParameters(p).catch(function(){}); } });
      return pc.createAnswer();
    }).then(function(a){ return pc.setLocalDescription(a); }).then(function(){ return esperaIce(pc); }).then(function(){
      return rpc("live_s_resp", { p_sala: sid, p_ts: ts, p_viewer: o.viewer, p_sdp: pc.localDescription.sdp, p_erro: null });
    }).catch(function(){ try{ pc.close(); }catch(e){} delete pcs[o.viewer]; });
  }

  /* ---- ligação ---- */
  function adicionarLink(txt){
    var l = lerLink(txt);
    if(!l){ erro("Não reconheci esse link. Cole o link inteiro que o bot postou no Discord."); return Promise.resolve(false); }
    erro(""); guardar(l); mostrarEmit(); return atualizarLista().then(function(){ return true; });
  }
  /* esconder a aba para quem só usa o Discord (preferência deste navegador; um link de live ou o botão do rodapé trazem a aba de volta) */
  function aplicarOculta(){
    var o = ls("lv:ocultar") === 1, t = $("t-live"), g = t && t.previousElementSibling;
    if(t) t.style.display = o ? "none" : ""; if(g && g.classList.contains("grp")) g.style.display = o ? "none" : "";
    var m = $("lvMostrar"); if(m) m.hidden = !o;
  }
  function ocultar(o){
    ls("lv:ocultar", o ? 1 : null); aplicarOculta();
    if(o){ if(vpc) parar(""); try{ history.replaceState(null, "", location.pathname + location.search + "#voce"); }catch(e){} var v = $("t-voce"); if(v) v.click(); }
    else { var t = $("t-live"); if(t) t.click(); }
  }
  window.renderLive = function(){ mostrarEmit(); atualizarLista(); };

  function iniciar(){
    if(!$("p-live")) return;
    salas = ls(K_SALAS) || []; if(!Array.isArray(salas)) salas = []; emit = ls(K_EMIT);
    var vindo = lerLink(location.hash);
    if(vindo) ls("lv:ocultar", null);
    if(vindo){ guardar(vindo); try{ history.replaceState(null, "", location.pathname + location.search + "#live"); }catch(e){} }
    $("lvColar").addEventListener("submit", function(e){ e.preventDefault(); var v = $("lvLink").value.trim(); if(!v) return; adicionarLink(v).then(function(ok){ if(ok) $("lvLink").value = ""; }); });
    $("lvPublica").addEventListener("change", function(){ if(emit) rpc("live_s_publica", { p_sala: emit.s, p_ts: emit.ts, p_publica: this.checked }).catch(function(){}); });
    $("lvEscolher").addEventListener("click", escolher); $("lvEncerrar").addEventListener("click", encerrar);
    $("lvMute").addEventListener("click", alternarSom);
    $("lvVol").addEventListener("input", function(){ $("lvVideo").volume = (+this.value) / 100; });
    $("lvFull").addEventListener("click", telaCheia);
    $("lvOcultar").addEventListener("click", function(){ ocultar(true); }); $("lvMostrar").addEventListener("click", function(){ ocultar(false); });
    aplicarOculta(); if(ls("lv:ocultar") === 1 && !$("p-live").hidden && !vindo){ var vv = $("t-voce"); if(vv) vv.click(); }
    mostrarEmit(); atualizarLista();
    setInterval(function(){ if(!document.hidden || stream) atualizarLista(); }, 15000);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
