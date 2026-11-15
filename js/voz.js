/* ================= Live: salas de voz estilo canal do Discord (padrão "cinema") =================
   Lista de salas com quem está dentro de cada uma (como os canais de voz do Discord): qualquer pessoa cria uma sala nova e ela aparece
   na lista de todos (a sala "cinema" sempre existe; as outras somem depois de 24 h sem uso; salas privadas não aparecem, só entra quem souber o nome).
   Dentro da sala: conversa por microfone e transmissão de tela com som (uma pessoa por vez, para todos da sala assistirem juntos).
   A voz e o vídeo vão direto de navegador para navegador (WebRTC, malha: cada um fala com cada um, até 6 pessoas). O Supabase só leva as mensagens
   de combinação (SDP) pelas funções voz_sync / voz_enviar / voz_sair / voz_usar / voz_canais (consulta a cada ~1,5 s enquanto se está na sala).
   Voz: uma ligação por par (quem entrou depois liga para quem já estava). Tela: ligação separada, sempre iniciada por quem transmite.
   Anti-retorno: o microfone usa cancelamento de eco, redução de ruído e ganho automático do navegador (dá para desligar); a transmissão pede ao
   navegador que tire dela o som desta aba (restrictOwnAudio), então a voz da sala não volta para quem ouve.
   Qualidade: voz em Opus a 96 kbps com correção de perda (o padrão do navegador é ~32 kbps); som da tela em estéreo a 192 kbps e SEM o
   processamento de voz que o navegador aplica por padrão (ele estraga música e efeitos); vídeo com partida a 4 Mbps e teto de 6 a 8 Mbps por espectador
   (o padrão sobe devagar a partir de ~300 kbps, o que deixa a imagem borrada nos primeiros minutos).
   Controles: microfone liga/desliga, áudio (ouvir os outros) liga/desliga e volume geral, volume e mudo por pessoa, escolha de microfone e
   de saída de áudio. Sem microfone liberado, entra só como ouvinte.
   Armazenamento local: lv:nome (nome nas salas), vz:prefs (eco, ruído, ganho, aparelhos). */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };
  var MAX = 6, POLL = 1500;
  var cfg = null, falhas = 0;
  var eu = "", sala = "", nome = "", dentro = false, entrando = false, timer = 0, gen = 0, usadoT = 0, privadaNova = false;
  var mic = null, micOn = true, somOn = true, volGeral = 1;
  var pessoas = [], conns = {}, ctx = null, medidor = 0, loc = null;
  var tela = null, vt = {}, canais = [], pretoT = 0;

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
  function limparSala(t){ return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }
  function prefs(){ var p = ls("vz:prefs") || {}; return { eco: p.eco !== false, ruido: p.ruido !== false, ganho: p.ganho !== false, micDev: p.micDev || "", saida: p.saida || "" }; }
  function salvarPrefs(){ ls("vz:prefs", { eco: $("vzEco").checked, ruido: $("vzRuido").checked, ganho: $("vzGanho").checked, micDev: $("vzMicDev").value || "", saida: $("vzSaida").value || "" }); }

  /* ---- qualidade: ajusta o SDP (o lado que recebe diz ao que envia quanto aceita) ---- */
  function melhorarSdp(sdp, tipo){
    var op = /a=rtpmap:(\d+) opus\/48000/.exec(sdp), opusPt = op && op[1], vpts = [], m, re = /a=rtpmap:(\d+) (?:VP8|VP9|H264|AV1)\/90000/g;
    while((m = re.exec(sdp))) vpts.push(m[1]);
    var opusP = tipo === "tela" ? "maxaveragebitrate=192000;stereo=1;sprop-stereo=1;useinbandfec=1;usedtx=0;maxplaybackrate=48000"
                                : "maxaveragebitrate=96000;stereo=0;sprop-stereo=0;useinbandfec=1;usedtx=0;cbr=0;maxplaybackrate=48000";
    var vidP = "x-google-min-bitrate=1500;x-google-start-bitrate=4000;x-google-max-bitrate=8000";
    var linhas = sdp.split("\r\n"), out = [], temFmtp = {};
    linhas.forEach(function(l){ var f = /^a=fmtp:(\d+) /.exec(l); if(f) temFmtp[f[1]] = true; });
    linhas.forEach(function(l){
      var f = /^a=fmtp:(\d+) (.*)$/.exec(l), r = /^a=rtpmap:(\d+) /.exec(l);
      if(f && f[1] === opusPt){
        var base = f[2].split(";").filter(function(x){ return !/^(maxaveragebitrate|stereo|sprop-stereo|useinbandfec|usedtx|cbr|maxplaybackrate)=/.test(x.trim()); });
        out.push("a=fmtp:" + f[1] + " " + base.concat(opusP.split(";")).filter(Boolean).join(";")); return;
      }
      if(tipo === "tela" && f && vpts.indexOf(f[1]) >= 0){
        var b2 = f[2].split(";").filter(function(x){ return !/^x-google-(min|start|max)-bitrate=/.test(x.trim()); });
        out.push("a=fmtp:" + f[1] + " " + b2.concat(vidP.split(";")).filter(Boolean).join(";")); return;
      }
      out.push(l);
      if(r && r[1] === opusPt && !temFmtp[opusPt]) out.push("a=fmtp:" + opusPt + " " + opusP);
      if(tipo === "tela" && r && vpts.indexOf(r[1]) >= 0 && !temFmtp[r[1]]) out.push("a=fmtp:" + r[1] + " " + vidP);
    });
    return out.join("\r\n");
  }
  function descLocal(pc, d, tipo){ return pc.setLocalDescription({ type: d.type, sdp: melhorarSdp(d.sdp, tipo) }); }
  function limitarAudio(pc, bps){
    pc.getSenders().forEach(function(sd){ if(sd.track && sd.track.kind === "audio"){ var pa = sd.getParameters(); if(!pa.encodings || !pa.encodings.length) pa.encodings = [{}]; pa.encodings[0].maxBitrate = bps; sd.setParameters(pa).catch(function(){}); } });
  }

  /* ---- microfone ---- */
  function pegarMic(){
    var c = { echoCancellation: $("vzEco").checked, noiseSuppression: $("vzRuido").checked, autoGainControl: $("vzGanho").checked, channelCount: 1, sampleRate: 48000 };
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
      var cx = id === "eu" ? loc : conns[id];
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

  /* ---- voz: uma ligação com cada pessoa ---- */
  function volumeDe(c){ return (somOn && !c.mudo) ? Math.min(1, Math.max(0, volGeral * c.vol)) : 0; }
  function aplicarVolumes(){
    Object.keys(conns).forEach(function(k){ var c = conns[k]; if(c.audio){ c.audio.muted = !somOn || c.mudo; c.audio.volume = volumeDe(c); } });
    var v = $("vzVideo"); if(v){ var preview = !!tela; v.muted = preview || !somOn; v.volume = Math.min(1, Math.max(0, volGeral)); }
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
      if(pc.connectionState === "connected"){ c.ok = true; clearTimeout(c.tm); limitarAudio(pc, 96000); desenharGente(); }
      if(pc.connectionState === "failed" || pc.connectionState === "closed"){ fecharConn(id); }
      if(pc.connectionState === "disconnected"){ clearTimeout(c.tm); c.tm = setTimeout(function(){ if(conns[id] === c && pc.connectionState !== "connected") fecharConn(id); }, 8000); }
    };
    return c;
  }
  function euMesmo(){ for(var i = 0; i < pessoas.length; i++) if(pessoas[i].eu === eu) return pessoas[i]; return null; }
  function souIniciador(p){ var m = euMesmo(); if(!m) return false; return m.entrou > p.entrou || (m.entrou === p.entrou && m.eu > p.eu); }
  function ofertar(p, g){
    var c = novaConn(p.eu, p.nome), pc = c.pc;
    pc.createOffer().then(function(o){ return descLocal(pc, o, "voz"); }).then(function(){ return esperaIce(pc); }).then(function(){
      if(g !== gen || conns[p.eu] !== c) return;
      return rpc("voz_enviar", { p_sala: sala, p_de: eu, p_para: p.eu, p_tipo: "oferta", p_sdp: pc.localDescription.sdp });
    }).catch(function(){ if(conns[p.eu] === c) fecharConn(p.eu); });
  }
  function atender(s, g){
    var p = pessoas.filter(function(x){ return x.eu === s.de; })[0]; if(!p) return;
    var c = novaConn(p.eu, p.nome), pc = c.pc;
    pc.setRemoteDescription({ type: "offer", sdp: s.sdp }).then(function(){ return pc.createAnswer(); }).then(function(a){ return descLocal(pc, a, "voz"); })
      .then(function(){ return esperaIce(pc); }).then(function(){
        if(g !== gen || conns[p.eu] !== c) return;
        return rpc("voz_enviar", { p_sala: sala, p_de: eu, p_para: p.eu, p_tipo: "resposta", p_sdp: pc.localDescription.sdp });
      }).catch(function(){ if(conns[p.eu] === c) fecharConn(p.eu); });
  }

  /* ---- tela: ligação separada, sempre iniciada por quem transmite ---- */
  function iniciarTela(){
    if(tela || !dentro) return;
    if(!navigator.mediaDevices.getDisplayMedia){ erro("Este navegador não permite transmitir a tela. Use o Chrome ou o Edge, no computador."); return; }
    erro("");
    // som da tela SEM o processamento de voz do navegador (eco/ruído/ganho estragam música e efeitos); restrictOwnAudio tira o som desta aba da captura
    var audio = $("vzTelaSom").checked ? { restrictOwnAudio: true, echoCancellation: false, noiseSuppression: false, autoGainControl: false } : false;
    navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 } }, audio: audio }).then(function(ms){
      if(!dentro){ ms.getTracks().forEach(function(t){ t.stop(); }); return; }
      tela = { stream: ms, pcs: {} };
      ms.getVideoTracks().forEach(function(t){ try{ t.contentHint = "motion"; }catch(e){} t.addEventListener("ended", function(){ if(tela && tela.stream === ms) pararTela(); }); });
      ms.getAudioTracks().forEach(function(t){ try{ t.contentHint = "music"; }catch(e){} });
      $("vzVideo").srcObject = ms; $("vzVideo").play().catch(function(){}); aplicarVolumes(); atualizarTelaUi(); vigiarPreto(ms);
      clearTimeout(timer); sync(gen); // avisa já que estou transmitindo
    }).catch(function(e){ if(!e || e.name !== "NotAllowedError") erro("Não consegui capturar a tela."); });
  }
  function pararTela(){
    clearInterval(pretoT);
    if(tela){
      Object.keys(tela.pcs).forEach(function(k){ try{ tela.pcs[k].close(); }catch(e){} });
      tela.stream.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} }); tela = null;
    }
    var v = $("vzVideo"); if(v && !Object.keys(vt).length) v.srcObject = null;
    atualizarTelaUi();
    if(dentro){ clearTimeout(timer); sync(gen); }
  }
  function atualizarTelaUi(){
    var quem = pessoas.filter(function(p){ return p.tela && p.eu !== eu; })[0];
    var b = $("vzTela"); b.textContent = tela ? "Parar a transmissão" : "Transmitir tela"; b.disabled = !tela && !!quem;
    b.title = !tela && quem ? quem.nome + " já está transmitindo" : "";
    $("vzTelaSom").disabled = !!tela;
    var mostra = !!tela || !!quem; $("vzStage").hidden = !mostra;
    $("vzBadge").textContent = tela ? "VOCÊ ESTÁ TRANSMITINDO" : (quem ? "AO VIVO · " + quem.nome : "AO VIVO");
    aplicarVolumes();
  }
  function ofertarTela(p, g){
    var pc = new RTCPeerConnection(ICE); tela.pcs[p.eu] = pc; var ms = tela.stream;
    ms.getTracks().forEach(function(t){ pc.addTrack(t, ms); });
    pc.onconnectionstatechange = function(){ if(pc.connectionState === "failed" || pc.connectionState === "closed"){ try{ pc.close(); }catch(e){} if(tela && tela.pcs[p.eu] === pc) delete tela.pcs[p.eu]; } };
    pc.createOffer().then(function(o){ return descLocal(pc, o, "tela"); }).then(function(){ return esperaIce(pc); }).then(function(){
      if(g !== gen || !tela || tela.pcs[p.eu] !== pc) return;
      return rpc("voz_enviar", { p_sala: sala, p_de: eu, p_para: p.eu, p_tipo: "toferta", p_sdp: pc.localDescription.sdp });
    }).catch(function(){ try{ pc.close(); }catch(e){} if(tela && tela.pcs[p.eu] === pc) delete tela.pcs[p.eu]; });
  }
  function respostaTela(s){
    var pc = tela && tela.pcs[s.de]; if(!pc || pc.signalingState !== "have-local-offer") return;
    pc.setRemoteDescription({ type: "answer", sdp: s.sdp }).then(function(){
      // a internet de quem transmite se divide entre os espectadores: 1 espectador pode usar até 8 Mbps, 5 espectadores ~2 Mbps cada
      var n = Math.max(1, Object.keys(tela.pcs).length), teto = Math.round(Math.max(2000000, Math.min(8000000, 10000000 / n)));
      pc.getSenders().forEach(function(sd){
        if(!sd.track) return; var pa = sd.getParameters(); if(!pa.encodings || !pa.encodings.length) pa.encodings = [{}];
        if(sd.track.kind === "video"){ pa.encodings[0].maxBitrate = teto; pa.encodings[0].maxFramerate = 30; pa.degradationPreference = "maintain-resolution"; }
        else pa.encodings[0].maxBitrate = 192000;
        sd.setParameters(pa).catch(function(){});
      });
    }).catch(function(){ try{ pc.close(); }catch(e){} delete tela.pcs[s.de]; });
  }
  function fecharVt(id){ var x = vt[id]; if(!x) return; try{ x.pc.close(); }catch(e){} delete vt[id]; var v = $("vzVideo"); if(v && !tela && !Object.keys(vt).length) v.srcObject = null; }
  function atenderTela(s, g){
    fecharVt(s.de);
    var pc = new RTCPeerConnection(ICE); vt[s.de] = { pc: pc };
    pc.ontrack = function(ev){ var v = $("vzVideo"); if(tela) return; if(v.srcObject !== ev.streams[0]) v.srcObject = ev.streams[0]; aplicarVolumes(); v.play().catch(function(){}); };
    pc.onconnectionstatechange = function(){ if(pc.connectionState === "failed" || pc.connectionState === "closed"){ if(vt[s.de] && vt[s.de].pc === pc) fecharVt(s.de); } };
    pc.setRemoteDescription({ type: "offer", sdp: s.sdp }).then(function(){ return pc.createAnswer(); }).then(function(a){ return descLocal(pc, a, "tela"); })
      .then(function(){ return esperaIce(pc); }).then(function(){
        if(g !== gen || !vt[s.de] || vt[s.de].pc !== pc) return;
        return rpc("voz_enviar", { p_sala: sala, p_de: eu, p_para: s.de, p_tipo: "tresposta", p_sdp: pc.localDescription.sdp });
      }).catch(function(){ if(vt[s.de] && vt[s.de].pc === pc) fecharVt(s.de); });
  }
  function gerirTela(g, ids){
    var quem = pessoas.filter(function(p){ return p.tela && p.eu !== eu; })[0];
    if(tela && quem){ pararTela(); erro(quem.nome + " já estava transmitindo. Uma pessoa por vez."); return; }
    Object.keys(vt).forEach(function(k){ if(!quem || quem.eu !== k) fecharVt(k); });
    if(tela){
      pessoas.forEach(function(p){ if(p.eu !== eu && !tela.pcs[p.eu]) ofertarTela(p, g); });
      Object.keys(tela.pcs).forEach(function(k){ if(!ids[k]){ try{ tela.pcs[k].close(); }catch(e){} delete tela.pcs[k]; } });
    }
    atualizarTelaUi();
  }
  /* imagem preta na captura (quase sempre aceleração de hardware desligada no navegador, ou site com proteção): avisa quem transmite */
  function vigiarPreto(ms){
    clearInterval(pretoT); var n = 0, cv = document.createElement("canvas"); cv.width = 32; cv.height = 18; var g = cv.getContext("2d", { willReadFrequently: true }), p = $("vzVideo");
    pretoT = setInterval(function(){
      if(!tela || tela.stream !== ms){ clearInterval(pretoT); return; }
      if(!p.videoWidth || p.readyState < 2) return;
      var d; try{ g.drawImage(p, 0, 0, 32, 18); d = g.getImageData(0, 0, 32, 18).data; }catch(e){ return; }
      var soma = 0; for(var i = 0; i < d.length; i += 4) soma += d[i] + d[i + 1] + d[i + 2];
      if(soma > 40){ n = 0; if(/preta/.test($("vzErr").textContent)) erro(""); return; }
      if(++n === 5) erro("A transmissão está saindo preta. Ative a aceleração de hardware do navegador (Edge ou Chrome: Configurações > Sistema > Usar aceleração gráfica quando disponível), reinicie o navegador e transmita de novo. Se for um site com proteção (Netflix, Prime), ele também deixa a captura preta; nesse caso compartilhe a tela inteira em vez da aba.");
    }, 1000);
  }

  /* ---- ciclo de presença ---- */
  function sync(g){
    if(g !== gen || !dentro) return;
    rpc("voz_sync", { p_sala: sala, p_eu: eu, p_nome: nome, p_tela: !!tela }).then(function(r){
      if(g !== gen || !dentro) return;
      falhas = 0;
      if(!r || !r.ok){ sair(r && r.err === "cheia" ? "A sala está cheia (máximo de " + MAX + " pessoas)." : ((r && r.err) || "Perdi a conexão com a sala.")); return; }
      var antes = pessoas.map(function(p){ return p.eu + p.nome + p.tela; }).join(); pessoas = r.pessoas || [];
      var ids = {}; pessoas.forEach(function(p){ ids[p.eu] = 1; });
      Object.keys(conns).forEach(function(k){ if(!ids[k]) fecharConn(k); });
      (r.sinais || []).forEach(function(s){
        if(s.tipo === "oferta") atender(s, g);
        else if(s.tipo === "resposta"){ var c = conns[s.de]; if(c && c.pc.signalingState === "have-local-offer") c.pc.setRemoteDescription({ type: "answer", sdp: s.sdp }).catch(function(){ fecharConn(s.de); }); }
        else if(s.tipo === "toferta") atenderTela(s, g);
        else if(s.tipo === "tresposta") respostaTela(s);
      });
      pessoas.forEach(function(p){
        if(p.eu === eu) return;
        var c = conns[p.eu];
        if(c){ c.nome = p.nome; if(!c.ok && Date.now() - c.t0 > 25000) fecharConn(p.eu); } // não fechou a ligação: tenta de novo
        if(!conns[p.eu] && souIniciador(p)) ofertar(p, g);
      });
      gerirTela(g, ids);
      if(antes !== pessoas.map(function(p){ return p.eu + p.nome + p.tela; }).join()) desenharGente();
      $("vzSt").textContent = pessoas.length + (pessoas.length === 1 ? " pessoa na sala" : " pessoas na sala"); $("vzSt").classList.add("on");
      if(Date.now() - usadoT > 300000){ usadoT = Date.now(); rpc("voz_usar", { p_sala: sala, p_eu: eu, p_privada: privadaNova }).then(listarCanais).catch(function(){}); }
    }).catch(function(e){ if(g === gen && dentro && ++falhas >= 4){ sair("Não consegui falar com o servidor das salas (" + ((e && e.message) || "erro") + "). Tente de novo em instantes."); } }).then(function(){ if(g === gen && dentro) timer = setTimeout(function(){ sync(g); }, POLL); });
  }

  /* ---- tela (interface) ---- */
  function desenharGente(){
    var el = $("vzGente"); if(!el) return; el.textContent = "";
    pessoas.forEach(function(p){
      var me = p.eu === eu, c = conns[p.eu];
      var row = document.createElement("div"); row.className = "vz-p"; row.dataset.id = me ? "eu" : p.eu;
      var av = document.createElement("span"); av.className = "av"; av.textContent = (p.nome || "?").charAt(0).toUpperCase();
      var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = p.nome || "Alguém";
      var sm = document.createElement("small"); sm.textContent = (me ? (mic ? (micOn ? "(você)" : "(você · mudo)") : "(você · só ouvindo)") : (c && c.ok ? "" : "conectando…")) + (p.tela ? " · transmitindo" : ""); nm.appendChild(sm);
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
  function modo(dentroUi){ $("vzOn").hidden = !dentroUi; $("vzSalaAtual").textContent = dentroUi ? sala : ""; desenharCanais(); }

  /* ---- lista de salas (como os canais do Discord) ---- */
  function desenharCanais(){
    var L = $("vzCanais"); L.textContent = "";
    var lista = canais.slice();
    if(dentro && !lista.some(function(c){ return c.sala === sala; })) lista.unshift({ sala: sala, gente: [] });
    lista.forEach(function(c){
      var aqui = dentro && c.sala === sala;
      var row = document.createElement("div"); row.className = "vz-c" + (aqui ? " aqui" : ""); row.setAttribute("role", "listitem");
      var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = c.sala; row.appendChild(nm);
      var gt = document.createElement("div"); gt.className = "gt";
      var gente = aqui ? pessoas.map(function(p){ return { nome: p.nome, tela: p.tela }; }) : (c.gente || []);
      if(!gente.length){ var v = document.createElement("em"); v.textContent = "vazia"; gt.appendChild(v); }
      gente.forEach(function(g){ var s = document.createElement("span"); s.textContent = g.nome + (g.tela ? " · tela" : ""); if(g.tela) s.className = "tl"; gt.appendChild(s); });
      row.appendChild(gt);
      var bt = document.createElement("button"); bt.type = "button"; bt.className = "of-btn";
      if(aqui){ bt.textContent = "Você está aqui"; bt.disabled = true; }
      else { bt.textContent = "Entrar"; bt.addEventListener("click", function(){ entrar(c.sala, false); }); }
      row.appendChild(bt); L.appendChild(row);
    });
  }
  function listarCanais(){
    if(document.hidden) return Promise.resolve();
    var p = $("p-live"); if(!p || p.hidden) return Promise.resolve();
    return rpc("voz_canais").then(function(r){
      if(!Array.isArray(r)) return;
      canais = r; desenharCanais();
      if(!dentro){ var n = r.reduce(function(a, c){ return a + (c.gente || []).length; }, 0); $("vzSt").textContent = n ? n + (n === 1 ? " pessoa nas salas" : " pessoas nas salas") : "fora da sala"; $("vzSt").classList.toggle("on", n > 0); }
    }).catch(function(){});
  }

  function entrar(s, privada){
    if(entrando) return;
    if(dentro && limparSala(s) === sala) return;
    if(!window.RTCPeerConnection || !navigator.mediaDevices){ erro("Este navegador não permite chamadas de voz. Use o Chrome ou o Edge."); return; }
    nome = $("vzNome").value.trim().slice(0, 24); if(!nome){ erro("Escreva seu nome para entrar numa sala."); $("vzNome").focus(); return; }
    s = limparSala(s); if(s.length < 3){ erro("O nome da sala precisa ter pelo menos 3 letras ou números."); return; }
    if(dentro) sair("");
    erro(""); entrando = true; privadaNova = !!privada; $("vzSt").textContent = "entrando…"; $("vzCriar").disabled = true;
    ls("lv:nome", nome); salvarPrefs();
    var libera = null;
    Promise.race([pegarMic(), new Promise(function(_, no){ libera = setTimeout(function(){ no({ name: "Tempo" }); }, 10000); })]).then(function(ms){ clearTimeout(libera); if(!entrando){ ms.getTracks().forEach(function(t){ t.stop(); }); return; } mic = ms; }, function(e){ clearTimeout(libera);
      mic = null;
      erro(e && e.name === "NotAllowedError" ? "Microfone não liberado: você entra só ouvindo. Libere o microfone no cadeado do navegador e entre de novo para falar." : e && e.name === "Tempo" ? "O navegador não respondeu ao pedido do microfone: você entra só ouvindo." : "Não achei um microfone: você entra só ouvindo.");
    }).then(function(){
      $("vzCriar").disabled = false; sala = s; eu = rnd(16); dentro = true; entrando = false; pessoas = []; conns = {}; vt = {}; tela = null; gen++; loc = {}; usadoT = 0; falhas = 0;
      micOn = true; somOn = true; $("vzSom").dataset.on = "1"; $("vzSom").setAttribute("aria-label", "Silenciar o áudio da sala");
      $("vzMic").disabled = !mic; aplicarMicOn(); if(mic) ligarMedidor("eu", mic);
      modo(true); listarAparelhos(); atualizarTelaUi(); $("vzSt").textContent = "entrando…"; sync(gen);
    });
  }
  function sair(texto){
    var era = dentro; dentro = false; entrando = false; $("vzCriar").disabled = false; gen++; clearTimeout(timer); clearInterval(medidor); medidor = 0;
    pararTela(); Object.keys(vt).forEach(fecharVt);
    Object.keys(conns).forEach(fecharConn); fecharMic(); loc = null; pessoas = [];
    var v = $("vzVideo"); if(v) v.srcObject = null; $("vzStage").hidden = true;
    if(era && sala && eu) rpc("voz_sair", { p_sala: sala, p_eu: eu }).catch(function(){});
    modo(false); $("vzSt").classList.remove("on"); $("vzSt").textContent = "fora da sala"; $("vzGente").textContent = "";
    erro(texto || ""); listarCanais();
  }

  function linkConvite(){
    var h = location.hostname, base = (/^https?:$/.test(location.protocol) && h && h !== "localhost" && h !== "127.0.0.1" && !/^\[/.test(h)) ? location.origin + location.pathname : "https://kvnr2.github.io/balcao-de-negocios-do-fumaca/";
    return base + "?sala=" + encodeURIComponent(sala) + "#live";
  }
  function copiar(txt){
    if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
    return new Promise(function(ok, no){ var t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); var r = false; try{ r = document.execCommand("copy"); }catch(e){} t.remove(); r ? ok() : no(); });
  }
  function convidado(){
    var q; try{ q = new URLSearchParams(location.search).get("sala"); }catch(e){}
    q = limparSala(q); if(q.length < 3) return;
    $("vzConviteSala").textContent = q; $("vzConvite").hidden = false;
    $("vzConviteEntrar").addEventListener("click", function(){ $("vzConvite").hidden = true; entrar(q, true); });
    $("vzConviteFechar").addEventListener("click", function(){ $("vzConvite").hidden = true; });
    try{ history.replaceState(null, "", location.pathname + "#live"); }catch(e){}
  }
  function iniciar(){
    if(!$("vz")) return;
    var p = prefs(); $("vzNome").value = ls("lv:nome") || "";
    $("vzEco").checked = p.eco; $("vzRuido").checked = p.ruido; $("vzGanho").checked = p.ganho;
    $("vzNovo").addEventListener("submit", function(e){ e.preventDefault(); var s = $("vzSala").value; if(!s.trim()){ erro("Escreva o nome da sala nova."); $("vzSala").focus(); return; } entrar($("vzPriv").checked ? limparSala(s).slice(0, 30) + "-" + rnd(6) : s, $("vzPriv").checked); $("vzSala").value = ""; $("vzPriv").checked = false; });
    $("vzConv").addEventListener("click", function(){
      var b = this, l = linkConvite();
      copiar(l).then(function(){ b.textContent = "Link copiado!"; }, function(){ b.textContent = "Não consegui copiar"; erro("Link do convite: " + l); }).then(function(){ setTimeout(function(){ b.textContent = "Copiar convite"; }, 2500); });
    });
    convidado();
    $("vzSair").addEventListener("click", function(){ sair(""); });
    $("vzTela").addEventListener("click", function(){ if(tela) pararTela(); else iniciarTela(); });
    $("vzFull").addEventListener("click", function(){ var el = $("vzStage"); if(document.fullscreenElement){ document.exitFullscreen(); return; } (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el); });
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
    var antigo = window.renderLive; window.renderLive = function(){ if(antigo) antigo(); listarCanais(); }; // ao abrir a aba, já mostra as salas
    listarCanais(); setInterval(listarCanais, 8000);
  }
  window.vzEstado = function(){ return { dentro: dentro, sala: sala, eu: eu, pessoas: pessoas.length, conectados: Object.keys(conns).filter(function(k){ return conns[k].ok; }).length, mic: !!mic, micOn: micOn, somOn: somOn, transmitindo: !!tela, assistindo: Object.keys(vt).length }; };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
