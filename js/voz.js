/* ================= Live: sala de voz "Cinema" (estilo canal de voz do Discord) =================
   Várias pessoas entram numa sala (nome livre, padrão "cinema"), conversam por microfone e assistem juntas a live de filme.
   A voz vai direto de navegador para navegador (WebRTC, malha: cada um fala com cada um, até 6 pessoas). O Supabase só leva as mensagens
   de combinação (SDP) pelas funções voz_sync / voz_enviar / voz_sair / voz_contagem (consulta a cada ~1,5 s enquanto se está na sala).
   Anti-retorno: o microfone usa cancelamento de eco, redução de ruído e ganho automático do navegador (dá para desligar); quem transmite a tela
   pede ao navegador que tire da transmissão o som desta aba (restrictOwnAudio, ver live.js), então a voz da sala não volta para quem ouve.
   Controles: microfone liga/desliga, áudio (ouvir os outros) liga/desliga e volume geral, volume e mudo por pessoa, escolha de microfone e
   de saída de áudio. Sem microfone liberado, entra só como ouvinte.
   Armazenamento local: lv:nome (nome na sala), vz:prefs (sala, eco, ruído, ganho). */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };
  var MAX = 6, POLL = 1500;
  var cfg = null;
  var eu = "", sala = "", nome = "", dentro = false, entrando = false, timer = 0, gen = 0;
  var mic = null, micOn = true, somOn = true, volGeral = 1;
  var pessoas = [], conns = {}, ctx = null, medidor = 0, loc = null;

  function ls(k, v){ try{ if(v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){} return null; }
  function rpc(nomeFn, args){
    return Promise.resolve(cfg || need("nuvem")).then(function(c){
      cfg = c;
      return fetch(c.url.replace(/\/$/, "") + "/rest/v1/rpc/" + nomeFn, { method: "POST", cache: "no-store", keepalive: nomeFn === "voz_sair",
        headers: { apikey: c.key, Authorization: "Bearer " + c.key, "Content-Type": "application/json" }, body: JSON.stringify(args || {}) });
    }).then(function(r){ if(!r.ok) throw new Error(nomeFn + " " + r.status); return r.json(); });
  }
  function rnd(n){ var a = new Uint8Array(n), s = ""; crypto.getRandomValues(a); for(var i = 0; i < n; i++) s += "abcdefghijklmnopqrstuvwxyz0123456789"[a[i] % 36]; return s; }
  function erro(t){ var e = $("vzErr"); e.textContent = t || ""; e.hidden = !t; }
  function esperaIce(pc){
    return new Promise(function(ok){
      if(pc.iceGatheringState === "complete") return ok();
      var t = setTimeout(done, 4000);
      function done(){ clearTimeout(t); pc.removeEventListener("icegatheringstatechange", chg); ok(); }
      function chg(){ if(pc.iceGatheringState === "complete") done(); }
      pc.addEventListener("icegatheringstatechange", chg);
    });
  }
  function limparSala(t){ return String(t || "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }
  function prefs(){ var p = ls("vz:prefs") || {}; return { sala: p.sala || "cinema", eco: p.eco !== false, ruido: p.ruido !== false, ganho: p.ganho !== false, micDev: p.micDev || "", saida: p.saida || "" }; }
  function salvarPrefs(){ ls("vz:prefs", { sala: limparSala($("vzSala").value) || "cinema", eco: $("vzEco").checked, ruido: $("vzRuido").checked, ganho: $("vzGanho").checked, micDev: $("vzMicDev").value || "", saida: $("vzSaida").value || "" }); }

  /* ---- microfone ---- */
  function pegarMic(){
    var c = { echoCancellation: $("vzEco").checked, noiseSuppression: $("vzRuido").checked, autoGainControl: $("vzGanho").checked, channelCount: 1 };
    var d = $("vzMicDev").value; if(d) c.deviceId = { exact: d };
    return navigator.mediaDevices.getUserMedia({ audio: c, video: false });
  }
  function fecharMic(){ if(mic){ mic.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} }); mic = null; } }
  function aplicarMicOn(){
    if(mic) mic.getAudioTracks().forEach(function(t){ t.enabled = micOn; });
    var b = $("vzMic"); b.dataset.on = micOn ? "1" : "0"; b.setAttribute("aria-label", micOn ? "Desligar o microfone" : "Ligar o microfone");
    desenharGente();
  }
  function trocarMic(){ // trocou o aparelho ou uma opção: pega de novo e troca a faixa sem derrubar ninguém
    if(!dentro || !mic) return;
    var antigo = mic;
    pegarMic().then(function(ms){
      mic = ms; aplicarMicOn(); ligarMedidor("eu", ms);
      var nova = ms.getAudioTracks()[0];
      Object.keys(conns).forEach(function(k){
        conns[k].pc.getSenders().forEach(function(s){ if(s.track && s.track.kind === "audio") s.replaceTrack(nova).catch(function(){}); });
      });
      antigo.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} });
    }).catch(function(){ erro("Não consegui usar esse microfone."); });
  }
  function listarAparelhos(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then(function(ds){
      var p = prefs(), mi = $("vzMicDev"), sa = $("vzSaida");
      function enche(sel, tipo, atual){
        sel.textContent = "";
        var o0 = document.createElement("option"); o0.value = ""; o0.textContent = "Padrão do sistema"; sel.appendChild(o0);
        ds.filter(function(d){ return d.kind === tipo && d.deviceId && d.deviceId !== "default" && d.deviceId !== "communications"; }).forEach(function(d, i){
          var o = document.createElement("option"); o.value = d.deviceId; o.textContent = d.label || (tipo === "audioinput" ? "Microfone " : "Saída ") + (i + 1); sel.appendChild(o);
        });
        if(atual && Array.prototype.some.call(sel.options, function(o){ return o.value === atual; })) sel.value = atual;
      }
      enche(mi, "audioinput", p.micDev); enche(sa, "audiooutput", p.saida);
      $("vzSaidaF").hidden = !("setSinkId" in HTMLMediaElement.prototype);
    }).catch(function(){});
  }

  /* ---- medidor de voz (quem está falando) ---- */
  function ligarMedidor(id, stream){
    try{
      if(!ctx){ var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return; ctx = new AC(); }
      if(ctx.state === "suspended") ctx.resume().catch(function(){});
      var cx = id === "eu" ? loc : conns[id]; if(id === "eu"){ if(!loc) loc = {}; cx = loc; }
      if(!cx) return;
      if(cx.src){ try{ cx.src.disconnect(); }catch(e){} }
      cx.src = ctx.createMediaStreamSource(stream); cx.an = ctx.createAnalyser(); cx.an.fftSize = 512; cx.src.connect(cx.an); cx.buf = new Uint8Array(cx.an.fftSize);
    }catch(e){}
    if(!medidor) medidor = setInterval(medir, 180);
  }
  function nivel(cx){
    if(!cx || !cx.an) return 0;
    cx.an.getByteTimeDomainData(cx.buf); var m = 0; for(var i = 0; i < cx.buf.length; i++){ var v = Math.abs(cx.buf[i] - 128); if(v > m) m = v; }
    return m / 128;
  }
  function medir(){
    var el = $("vzGente"); if(!el) return;
    Array.prototype.forEach.call(el.children, function(row){
      var id = row.dataset.id, cx = id === "eu" ? loc : conns[id];
      var fala = nivel(cx) > 0.06 && !(id === "eu" && !micOn) && !(id !== "eu" && (!somOn || (conns[id] && conns[id].mudo)));
      row.classList.toggle("fala", fala);
    });
  }

  /* ---- conexões com cada pessoa ---- */
  function volumeDe(c){ return (somOn && !c.mudo) ? Math.min(1, Math.max(0, volGeral * c.vol)) : 0; }
  function aplicarVolumes(){
    Object.keys(conns).forEach(function(k){ var c = conns[k]; if(c.audio){ c.audio.muted = !somOn || c.mudo; c.audio.volume = volumeDe(c); } });
  }
  function fecharConn(id){
    var c = conns[id]; if(!c) return;
    clearTimeout(c.tm); try{ c.pc.close(); }catch(e){}
    if(c.audio){ try{ c.audio.srcObject = null; c.audio.remove(); }catch(e){} }
    if(c.src){ try{ c.src.disconnect(); }catch(e){} }
    delete conns[id];
  }
  function novaConn(id, quem){
    fecharConn(id);
    var pc = new RTCPeerConnection(ICE);
    var c = conns[id] = { pc: pc, nome: quem || "Alguém", vol: 1, mudo: false, audio: null, t0: Date.now(), ok: false };
    if(mic && mic.getAudioTracks().length){ mic.getAudioTracks().forEach(function(t){ pc.addTrack(t, mic); }); }
    else pc.addTransceiver("audio", { direction: "recvonly" });
    pc.ontrack = function(ev){
      if(!c.audio){
        var a = document.createElement("audio"); a.autoplay = true; a.setAttribute("playsinline", ""); $("vzAudios").appendChild(a); c.audio = a;
        var s = $("vzSaida").value; if(s && a.setSinkId) a.setSinkId(s).catch(function(){});
      }
      if(c.audio.srcObject !== ev.streams[0]) c.audio.srcObject = ev.streams[0];
      aplicarVolumes(); c.audio.play().catch(function(){});
      ligarMedidor(id, ev.streams[0]);
    };
    pc.onconnectionstatechange = function(){
      if(conns[id] !== c) return;
      if(pc.connectionState === "connected"){ c.ok = true; clearTimeout(c.tm); desenharGente(); }
      if(pc.connectionState === "failed" || pc.connectionState === "closed"){ fecharConn(id); }
      if(pc.connectionState === "disconnected"){ clearTimeout(c.tm); c.tm = setTimeout(function(){ if(conns[id] === c && pc.connectionState !== "connected") fecharConn(id); }, 8000); }
    };
    return c;
  }
  function euMesmo(){ for(var i = 0; i < pessoas.length; i++) if(pessoas[i].eu === eu) return pessoas[i]; return null; }
  function souIniciador(p){ var m = euMesmo(); if(!m) return false; return m.entrou > p.entrou || (m.entrou === p.entrou && m.eu > p.eu); }
  function ofertar(p, g){
    var c = novaConn(p.eu, p.nome), pc = c.pc;
    pc.createOffer().then(function(o){ return pc.setLocalDescription(o); }).then(function(){ return esperaIce(pc); }).then(function(){
      if(g !== gen || conns[p.eu] !== c) return;
      return rpc("voz_enviar", { p_sala: sala, p_de: eu, p_para: p.eu, p_tipo: "oferta", p_sdp: pc.localDescription.sdp });
    }).catch(function(){ if(conns[p.eu] === c) fecharConn(p.eu); });
  }
  function atender(s, g){
    var p = pessoas.filter(function(x){ return x.eu === s.de; })[0]; if(!p) return;
    var c = novaConn(p.eu, p.nome), pc = c.pc;
    pc.setRemoteDescription({ type: "offer", sdp: s.sdp }).then(function(){ return pc.createAnswer(); }).then(function(a){ return pc.setLocalDescription(a); })
      .then(function(){ return esperaIce(pc); }).then(function(){
        if(g !== gen || conns[p.eu] !== c) return;
        return rpc("voz_enviar", { p_sala: sala, p_de: eu, p_para: p.eu, p_tipo: "resposta", p_sdp: pc.localDescription.sdp });
      }).catch(function(){ if(conns[p.eu] === c) fecharConn(p.eu); });
  }

  /* ---- ciclo de presença ---- */
  function sync(g){
    if(g !== gen || !dentro) return;
    rpc("voz_sync", { p_sala: sala, p_eu: eu, p_nome: nome }).then(function(r){
      if(g !== gen || !dentro) return;
      if(!r || !r.ok){ sair(r && r.err === "cheia" ? "A sala está cheia (máximo de " + MAX + " pessoas)." : ((r && r.err) || "Perdi a conexão com a sala.")); return; }
      var antes = pessoas.map(function(p){ return p.eu + p.nome; }).join(); pessoas = r.pessoas || [];
      var ids = {}; pessoas.forEach(function(p){ ids[p.eu] = 1; });
      Object.keys(conns).forEach(function(k){ if(!ids[k]) fecharConn(k); });
      (r.sinais || []).forEach(function(s){
        if(s.tipo === "oferta") atender(s, g);
        else if(s.tipo === "resposta"){ var c = conns[s.de]; if(c && c.pc.signalingState === "have-local-offer") c.pc.setRemoteDescription({ type: "answer", sdp: s.sdp }).catch(function(){ fecharConn(s.de); }); }
      });
      pessoas.forEach(function(p){
        if(p.eu === eu) return;
        var c = conns[p.eu];
        if(c){ c.nome = p.nome; if(!c.ok && Date.now() - c.t0 > 25000) fecharConn(p.eu); } // não fechou a ligação: tenta de novo
        if(!conns[p.eu] && souIniciador(p)) ofertar(p, g);
      });
      if(antes !== pessoas.map(function(p){ return p.eu + p.nome; }).join()) desenharGente();
      $("vzSt").textContent = pessoas.length + (pessoas.length === 1 ? " pessoa na sala" : " pessoas na sala"); $("vzSt").classList.add("on");
    }).catch(function(){}).then(function(){ if(g === gen && dentro) timer = setTimeout(function(){ sync(g); }, POLL); });
  }

  /* ---- tela ---- */
  function desenharGente(){
    var el = $("vzGente"); if(!el) return; el.textContent = "";
    pessoas.forEach(function(p){
      var me = p.eu === eu, c = conns[p.eu];
      var row = document.createElement("div"); row.className = "vz-p"; row.dataset.id = me ? "eu" : p.eu;
      var av = document.createElement("span"); av.className = "av"; av.textContent = (p.nome || "?").charAt(0).toUpperCase();
      var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = p.nome || "Alguém";
      var sm = document.createElement("small"); sm.textContent = me ? (mic ? (micOn ? "(você)" : "(você · mudo)") : "(você · só ouvindo)") : (c && c.ok ? "" : "conectando…"); nm.appendChild(sm);
      row.appendChild(av); row.appendChild(nm);
      if(!me){
        var vol = document.createElement("input"); vol.type = "range"; vol.min = 0; vol.max = 100; vol.value = c ? Math.round(c.vol * 100) : 100; vol.setAttribute("aria-label", "Volume de " + p.nome);
        vol.addEventListener("input", function(){ var cc = conns[p.eu]; if(cc){ cc.vol = (+vol.value) / 100; aplicarVolumes(); } });
        var mu = document.createElement("button"); mu.type = "button"; mu.className = "mu"; mu.dataset.on = c && c.mudo ? "1" : "0"; mu.textContent = c && c.mudo ? "Mudo" : "Silenciar";
        mu.addEventListener("click", function(){ var cc = conns[p.eu]; if(!cc) return; cc.mudo = !cc.mudo; mu.dataset.on = cc.mudo ? "1" : "0"; mu.textContent = cc.mudo ? "Mudo" : "Silenciar"; aplicarVolumes(); });
        row.appendChild(vol); row.appendChild(mu);
      }
      el.appendChild(row);
    });
  }
  function modo(dentroUi){ $("vzEnt").hidden = dentroUi; $("vzOn").hidden = !dentroUi; }

  function entrar(){
    if(dentro || entrando) return;
    if(!window.RTCPeerConnection || !navigator.mediaDevices){ erro("Este navegador não permite chamadas de voz. Use o Chrome ou o Edge."); return; }
    nome = $("vzNome").value.trim().slice(0, 24); if(!nome){ erro("Escreva um nome para aparecer na sala."); $("vzNome").focus(); return; }
    var s = limparSala($("vzSala").value); if(s.length < 3){ erro("O nome da sala precisa ter pelo menos 3 letras ou números."); return; }
    erro(""); entrando = true; $("vzEntrar").disabled = true;
    ls("lv:nome", nome); $("vzSala").value = s; salvarPrefs();
    pegarMic().then(function(ms){ mic = ms; }, function(e){
      mic = null;
      erro(e && e.name === "NotAllowedError" ? "Microfone não liberado: você entra só ouvindo. Libere o microfone no cadeado do navegador e entre de novo para falar." : "Não achei um microfone: você entra só ouvindo.");
    }).then(function(){
      sala = s; eu = rnd(16); dentro = true; entrando = false; $("vzEntrar").disabled = false; pessoas = []; conns = {}; gen++; loc = {};
      micOn = true; somOn = true; $("vzSom").dataset.on = "1"; $("vzSom").setAttribute("aria-label", "Silenciar o áudio da sala");
      $("vzMic").disabled = !mic; aplicarMicOn(); if(mic) ligarMedidor("eu", mic);
      modo(true); listarAparelhos(); $("vzSt").textContent = "entrando…"; sync(gen);
    });
  }
  function sair(texto){
    var era = dentro; dentro = false; entrando = false; gen++; clearTimeout(timer); clearInterval(medidor); medidor = 0;
    Object.keys(conns).forEach(fecharConn); fecharMic(); loc = null; pessoas = [];
    if(era && sala && eu) rpc("voz_sair", { p_sala: sala, p_eu: eu }).catch(function(){});
    modo(false); $("vzEntrar").disabled = false; $("vzSt").classList.remove("on"); $("vzSt").textContent = "vazia"; $("vzGente").textContent = "";
    erro(texto || ""); contar();
  }
  function contar(){
    if(dentro || document.hidden) return;
    var p = $("p-live"); if(!p || p.hidden) return;
    var s = limparSala($("vzSala").value) || "cinema";
    rpc("voz_contagem", { p_salas: [s] }).then(function(r){
      if(dentro) return; var n = (r && r[s]) || 0;
      $("vzSt").textContent = n ? n + (n === 1 ? " pessoa na sala" : " pessoas na sala") : "vazia"; $("vzSt").classList.toggle("on", n > 0);
    }).catch(function(){});
  }

  function iniciar(){
    if(!$("vz")) return;
    var p = prefs(); $("vzNome").value = ls("lv:nome") || ""; $("vzSala").value = p.sala;
    $("vzEco").checked = p.eco; $("vzRuido").checked = p.ruido; $("vzGanho").checked = p.ganho;
    $("vzEntrar").addEventListener("click", entrar); $("vzSair").addEventListener("click", function(){ sair(""); });
    $("vzNome").addEventListener("keydown", function(e){ if(e.key === "Enter") entrar(); });
    $("vzSala").addEventListener("keydown", function(e){ if(e.key === "Enter") entrar(); });
    $("vzSala").addEventListener("change", function(){ salvarPrefs(); contar(); });
    $("vzMic").addEventListener("click", function(){ if(!mic) return; micOn = !micOn; aplicarMicOn(); });
    $("vzSom").addEventListener("click", function(){
      somOn = !somOn; this.dataset.on = somOn ? "1" : "0"; this.setAttribute("aria-label", somOn ? "Silenciar o áudio da sala" : "Ligar o áudio da sala"); aplicarVolumes();
      if(somOn && ctx && ctx.state === "suspended") ctx.resume().catch(function(){});
    });
    $("vzVol").addEventListener("input", function(){ volGeral = (+this.value) / 100; aplicarVolumes(); });
    ["vzEco", "vzRuido", "vzGanho"].forEach(function(id){ $(id).addEventListener("change", function(){ salvarPrefs(); trocarMic(); }); });
    $("vzMicDev").addEventListener("change", function(){ salvarPrefs(); trocarMic(); });
    $("vzSaida").addEventListener("change", function(){
      salvarPrefs(); var s = this.value;
      Object.keys(conns).forEach(function(k){ var a = conns[k].audio; if(a && a.setSinkId) a.setSinkId(s).catch(function(){}); });
    });
    window.addEventListener("pagehide", function(){ if(dentro && sala && eu) rpc("voz_sair", { p_sala: sala, p_eu: eu }).catch(function(){}); });
    var antigo = window.renderLive; window.renderLive = function(){ if(antigo) antigo(); contar(); }; // ao abrir a aba, já mostra quantos estão na sala
    contar(); setInterval(contar, 12000);
  }
  window.vzEstado = function(){ return { dentro: dentro, sala: sala, eu: eu, pessoas: pessoas.length, conectados: Object.keys(conns).filter(function(k){ return conns[k].ok; }).length, mic: !!mic, micOn: micOn, somOn: somOn }; };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
