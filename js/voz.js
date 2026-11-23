/* ================= Live: salas de voz estilo canal do Discord =================
   Lista de salas com quem está dentro de cada uma (como os canais de voz do Discord): qualquer pessoa cria uma sala nova e ela aparece
   na lista de todos (somem logo que ficam vazias; salas privadas não aparecem, só entra quem souber o nome).
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
  var RN_URL = ((document.currentScript && document.currentScript.src) || "js/voz.js").replace(/voz\.js.*$/, "rnnoise/rnnoise-worklet.js"), rnOk = null;
  var eu = "", sala = "", nome = "", dentro = false, entrando = false, timer = 0, gen = 0, usadoT = 0, privadaNova = false;
  var mic = null, micOn = true, somOn = true, volGeral = 1;
  var pessoas = [], conns = {}, ctx = null, medidor = 0, loc = null;
  var tela = null, vt = {}, canais = [], pretoT = 0, avEnviado = null;
  function meuAv(){ var v = ls("lv:avatar"); return typeof v === "string" ? v : ""; }

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
  var CORES = ["#2f7d74", "#b98c46", "#8e2c2c", "#4a6fa5", "#7a5c9e", "#a0652d", "#4f8f4f", "#a04a7a"];
  function cor(n){ var h = 0; n = String(n || "?"); for(var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return CORES[h % CORES.length]; }
  /* avatar: "db:estilo:semente" = DiceBear (estilos de licença CC0, sem crédito obrigatório); "foto:<md5>" = foto pequena buscada uma vez (voz_foto);
     sem avatar, a inicial do nome numa cor tirada do nome */
  /* avatares autorais do Balcão (medalhão com fundo de cor, anel latão e um emblema), desenhados aqui mesmo em SVG: valor "db:fumaca:<emblema>-<fundo>".
     Avatares antigos da DiceBear ("db:<estilo>:<semente>") continuam aparecendo. */
  var fotos = {}, fotoPedida = {};
  const P="#efe2c4", S="#e8ab45", B="#b98c46", D="#1d1206";
  const FUNDOS={vinho:"#8e2c2c",azulejo:"#2f7d74",noite:"#2c1f1f",anil:"#33406e",oliva:"#55602f",cobre:"#7a4a24"};
  const EMB={
   lanterna:`<g transform="translate(32 31) scale(1.18) translate(-32 -31)"><path d="M27 15h10l3 5H24z" fill="${B}"/><circle cx="32" cy="13" r="2" fill="none" stroke="${B}" stroke-width="1.5"/><path d="M24 20h16l3 11-3 12H24l-3-12z" fill="${D}" stroke="${B}" stroke-width="1.6"/><path d="M26.5 23h11l2 8-2 9h-11l-2-9z" fill="${S}"/><path d="M32 25l1.6 4.4 4.4 1.6-4.4 1.6L32 37l-1.6-4.4L26 31l4.4-1.6z" fill="${D}" opacity=".7"/><path d="M24 44h16l-3 4h-10z" fill="${B}"/></g>`,
   estrela:`<path d="M32 12l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="${S}"/><path d="M32 22l2.4 7.6L42 32l-7.6 2.4L32 42l-2.4-7.6L22 32l7.6-2.4z" fill="${P}"/>`,
   lua:`<circle cx="29" cy="33" r="17" fill="${P}"/><circle cx="37" cy="27" r="14.5" fill="%BG%"/><path d="M44 36l1.4 3.6 3.6 1.4-3.6 1.4L44 46l-1.4-3.6-3.6-1.4 3.6-1.4z" fill="${S}"/>`,
   espada:`<path d="M32 10l4 6v22h-8V16z" fill="${P}"/><path d="M32 12v26" stroke="#cdbd9c" stroke-width="1.2"/><rect x="22" y="38" width="20" height="4" rx="2" fill="${S}"/><rect x="30" y="42" width="4" height="8" fill="${B}"/><circle cx="32" cy="52.5" r="3" fill="${S}"/>`,
   escudo:`<path d="M32 11l17 6v12c0 11-7 19-17 24c-10-5-17-13-17-24V17z" fill="${P}"/><path d="M32 15l13 4.6V29c0 8.6-5.3 14.9-13 19z" fill="${S}"/><path d="M32 22v20M24 30h16" stroke="${D}" stroke-width="2.2" opacity=".55"/>`,
   pocao:`<rect x="27" y="10" width="10" height="5" rx="1.5" fill="${B}"/><path d="M28.5 15h7v8l9 12c3 5-1 14-8 14h-9c-7 0-11-9-8-14l9-12z" fill="${P}"/><path d="M19.6 37h24.8c1.8 4.8-1.6 10-7.4 10h-10c-5.8 0-9.2-5.2-7.4-10z" fill="${S}"/><circle cx="27" cy="41" r="1.8" fill="${P}"/><circle cx="34" cy="43" r="1.2" fill="${P}"/>`,
   moeda:`<circle cx="32" cy="32" r="18" fill="${S}"/><circle cx="32" cy="32" r="14" fill="none" stroke="${D}" stroke-width="1.6" opacity=".45"/><path d="M32 22l2.6 7.4L42 32l-7.4 2.6L32 42l-2.6-7.4L22 32l7.4-2.6z" fill="${D}" opacity=".55"/>`,
   peixe:`<path d="M12 32c7-10 21-12 32-4l8-6v20l-8-6c-11 8-25 6-32-4z" fill="${P}"/><circle cx="21" cy="30" r="2.2" fill="${D}"/><path d="M30 25c3 4 3 10 0 14" fill="none" stroke="${S}" stroke-width="2.4" stroke-linecap="round"/>`,
   machado:`<rect x="30" y="12" width="4" height="40" rx="2" fill="${B}"/><path d="M34 14c9 0 15 6 15 14s-6 13-15 13z" fill="${P}"/><path d="M34 18c6 1 10 5 10 10s-4 9-10 10z" fill="${S}"/>`,
   orbe:`<rect x="30.5" y="30" width="3" height="24" rx="1.5" fill="${B}"/><circle cx="32" cy="22" r="11" fill="${S}"/><circle cx="32" cy="22" r="11" fill="none" stroke="${P}" stroke-width="2"/><circle cx="28.5" cy="18.5" r="3" fill="${P}" opacity=".8"/><path d="M22 31c3 3 17 3 20 0" stroke="${P}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
   picareta:`<rect x="30" y="20" width="4" height="34" rx="2" fill="${B}" transform="rotate(-35 32 37)"/><path d="M13 26c9-11 29-13 40-4c-12-3-27-2-40 4z" fill="${P}" transform="rotate(-35 32 30)"/>`,
   folha:`<path d="M15 47c0-21 13-33 35-35c0 22-12 35-33 35z" fill="${P}"/><path d="M17 46C26 37 33 29 44 18" stroke="${S}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M27 36l-1-8M33 30l-.5-7M27 36l8 0M33 30l7.5-.4" stroke="${S}" stroke-width="1.8" stroke-linecap="round"/>`,
   chama:`<path d="M32 10c3 9 14 13 14 26a14 14 0 0 1-28 0c0-8 5-11 7-17c2 4 2 7 5 9c1-7 0-12 2-18z" fill="${S}"/><path d="M32 30c1.5 5 7 6 7 12a7 7 0 0 1-14 0c0-4 3-5 4-9c1 2 2 3 3 3z" fill="${P}"/>`,
   coroa:`<path d="M14 44l-2-22 11 9 9-15 9 15 11-9-2 22z" fill="${S}"/><rect x="14" y="44" width="36" height="6" rx="1.5" fill="${P}"/><circle cx="32" cy="38" r="2.6" fill="${P}"/><circle cx="22" cy="40" r="1.8" fill="${P}"/><circle cx="42" cy="40" r="1.8" fill="${P}"/>`,
   tenda:`<path d="M10 28l22-14 22 14z" fill="${P}"/><path d="M14 28h36" stroke="${B}" stroke-width="2"/><path d="M14 28l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4" fill="none" stroke="#8e2c2c" stroke-width="3"/><rect x="17" y="32" width="30" height="18" fill="${D}" opacity=".55"/><path d="M27 50V38h10v12" fill="${S}"/>`,
   arco:`<path d="M24 12c16 6 16 34 0 40" fill="none" stroke="${P}" stroke-width="3.4" stroke-linecap="round"/><path d="M24 12v40" stroke="${S}" stroke-width="1.4"/><path d="M14 32h32" stroke="${B}" stroke-width="2.2"/><path d="M46 32l-6-4v8z" fill="${S}"/><path d="M14 32l-3-3M14 32l-3 3" stroke="${P}" stroke-width="1.8" stroke-linecap="round"/>`
  };
  
  function svgFumaca(emb, fundo){ if(!EMB[emb] || !FUNDOS[fundo]) return ""; var x = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="' + FUNDOS[fundo] + '"/><circle cx="32" cy="32" r="29.5" fill="none" stroke="' + B + '" stroke-width="1.5" opacity=".7"/>' + EMB[emb].replace(/%BG%/g, FUNDOS[fundo]) + "</svg>"; return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(x); }
  function avUrl(av){
    var m = /^db:([a-z-]{3,24}):([A-Za-z0-9_-]{1,32})$/.exec(av || "");
    if(m && m[1] === "fumaca"){ var q = m[2].split("-"); return svgFumaca(q[0], q[1]); }
    if(m) return "https://api.dicebear.com/9.x/" + m[1] + "/svg?seed=" + encodeURIComponent(m[2]);
    if(/^data:image\//.test(av || "")) return av;
    var f = /^foto:([0-9a-f]{32})$/.exec(av || ""); if(f) return fotos[f[1]] || "";
    return "";
  }
  function pedirFoto(av){
    var f = /^foto:([0-9a-f]{32})$/.exec(av || ""); if(!f || fotos[f[1]] || fotoPedida[f[1]]) return; fotoPedida[f[1]] = 1;
    rpc("voz_foto", { p_hash: f[1] }).then(function(r){ if(typeof r === "string" && /^data:image\//.test(r)){ fotos[f[1]] = r; document.querySelectorAll('[data-av="' + av + '"]').forEach(function(e){ pintarAv(e, null, av); }); } }).catch(function(){ fotoPedida[f[1]] = 0; });
  }
  function pintarAv(a, n, av){
    var u = avUrl(av);
    if(n != null) a.dataset.nome = n; n = a.dataset.nome || "";
    a.dataset.av = av || "";
    if(u){ a.textContent = ""; a.style.background = "var(--cloth-2) center/cover no-repeat url(\"" + u.replace(/"/g, "%22") + "\")"; a.classList.add("com-img"); }
    else { a.textContent = (n || "?").trim().charAt(0).toUpperCase() || "?"; a.style.background = n ? cor(n) : ""; a.classList.remove("com-img"); if(av) pedirFoto(av); }
  }
  /* barra de volume: a parte preenchida acompanha o valor (100% = barra cheia) */
  function pintaVol(r){ var mn = +r.min || 0, mx = +r.max || 100, v = +r.value; r.style.setProperty("--p", ((v - mn) / (mx - mn) * 100) + "%"); r.title = "Volume " + Math.round(v) + "%"; }
  function avatar(n, cls, av){ var a = document.createElement("span"); a.className = "dz-av" + (cls ? " " + cls : ""); pintarAv(a, n, av); return a; }
  function prefs(){ var p = ls("vz:prefs") || {}; return { eco: p.eco !== false, ruido: p.ruido !== false, ganho: p.ganho !== false, gate: p.gate !== false, micDev: p.micDev || "", saida: p.saida || "" }; }
  function salvarPrefs(){ ls("vz:prefs", { eco: $("vzEco").checked, ruido: $("vzRuido").checked, ganho: $("vzGanho").checked, gate: $("vzGate").checked, micDev: $("vzMicDev").value || "", saida: $("vzSaida").value || "" }); }

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
    var c = { echoCancellation: $("vzEco").checked, noiseSuppression: $("vzRuido").checked && !($("vzGate").checked && rnOk !== false), autoGainControl: $("vzGanho").checked, channelCount: 1, sampleRate: 48000 };
    var d = $("vzMicDev").value; if(d) c.deviceId = { exact: d };
    return navigator.mediaDevices.getUserMedia({ audio: c, video: false }).then(function(ms){ return $("vzGate").checked ? tratar(ms) : ms; });
  }
  /* Porta de ruído: o navegador já corta eco e ruído, mas deixa um chiado entre as falas (e filtros de voz fracos aumentam esse chiado quando você para de falar).
     Aqui o som passa por um filtro que tira o grave (zumbido, vento) e por uma porta que abaixa o volume quando só há ruído de fundo e abre sozinha na sua fala.
     Roda na thread de áudio (AudioWorklet), então não atrasa se a aba ficar em segundo plano. Se o navegador não suportar, usa o microfone normal. */
  var GATE_JS = "class G extends AudioWorkletProcessor{constructor(){super();this.nf=0.003;this.g=0.15;this.h=0;}process(i,o){var a=i[0],b=o[0];if(!a||!a.length)return true;var s=0,n=a[0].length;for(var k=0;k<n;k++){var x=a[0][k];s+=x*x;}var r=Math.sqrt(s/n);if(r<this.nf)this.nf=this.nf*0.8+r*0.2;else this.nf=Math.min(0.05,this.nf*1.0008+1e-7);var thr=Math.max(0.006,this.nf*3);if(r>thr)this.h=110;else if(this.h>0)this.h--;var t=this.h>0?1:0.12;this.g+=(t-this.g)*(t>this.g?0.35:0.03);for(var c=0;c<b.length;c++){var ic=a[c]||a[0];for(var q=0;q<n;q++)b[c][q]=ic[q]*this.g;}return true;}}registerProcessor('gate-voz',G);";
  var gateOk = null;
  function tratarGate(ms){
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC || !window.AudioWorkletNode || gateOk === false) return ms;
    if(!ctx) ctx = new AC();
    if(ctx.state === "suspended") ctx.resume().catch(function(){});
    var prep = gateOk ? Promise.resolve() : ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([GATE_JS], { type: "application/javascript" })));
    return prep.then(function(){
      gateOk = true;
      var src = ctx.createMediaStreamSource(ms), hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 90; hp.Q.value = 0.7;
      var gt = new AudioWorkletNode(ctx, "gate-voz", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit", outputChannelCount: [1] });
      var dst = ctx.createMediaStreamDestination(); src.connect(hp); hp.connect(gt); gt.connect(dst);
      var out = dst.stream; out._raw = ms; out._nodes = [src, hp, gt];
      return out;
    }).catch(function(){ gateOk = false; return ms; });
  }
  /* Isolador de voz (RNNoise, rede neural que separa a voz do resto) rodando no navegador de quem fala, na thread de áudio. Precisa de 48 kHz.
     Se o módulo não carregar, cai na porta de ruído simples acima. */
  function novoCtx(){ var AC = window.AudioContext || window.webkitAudioContext; try{ return new AC({ sampleRate: 48000, latencyHint: "interactive" }); }catch(e){ return new AC(); } }
  function tratar(ms){
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC || !window.AudioWorkletNode || rnOk === false) return tratarGate(ms);
    if(!ctx) ctx = novoCtx();
    if(ctx.sampleRate !== 48000){ rnOk = false; return tratarGate(ms); }
    if(ctx.state === "suspended") ctx.resume().catch(function(){});
    var prep = rnOk ? Promise.resolve() : ctx.audioWorklet.addModule(RN_URL);
    return prep.then(function(){
      rnOk = true;
      var src = ctx.createMediaStreamSource(ms), hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80; hp.Q.value = 0.7;
      var rn = new AudioWorkletNode(ctx, "rnnoise-voz", { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: "explicit", outputChannelCount: [1] });
      var dst = ctx.createMediaStreamDestination(); src.connect(hp); hp.connect(rn); rn.connect(dst);
      var out = dst.stream; out._raw = ms; out._nodes = [src, hp, rn];
      return out;
    }).catch(function(){ rnOk = false; return tratarGate(ms); });
  }
  function fecharStream(s){
    if(!s) return;
    s.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} });
    if(s._raw) s._raw.getTracks().forEach(function(t){ try{ t.stop(); }catch(e){} });
    if(s._nodes) s._nodes.forEach(function(n){ try{ n.disconnect(); }catch(e){} });
  }
  function fecharMic(){ fecharStream(mic); mic = null; }
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
      fecharStream(antigo);
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
      if(!ctx){ var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return; ctx = novoCtx(); }
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
    var el = $("vz"); if(!el) return;
    Array.prototype.forEach.call(el.querySelectorAll("[data-id]"), function(row){
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
    navigator.mediaDevices.getDisplayMedia({ selfBrowserSurface: "exclude", surfaceSwitching: "include", systemAudio: "include", video: { frameRate: { ideal: 30, max: 30 }, width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 } }, audio: audio }).then(function(ms){
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
  function mostraTela(){ return !!tela || pessoas.some(function(p){ return p.tela && p.eu !== eu; }); }
  function atualizarTelaUi(){
    var quem = pessoas.filter(function(p){ return p.tela && p.eu !== eu; })[0];
    var b = $("vzTela"); b.querySelector(".tx").textContent = tela ? "Parar transmissão" : "Transmitir tela"; b.classList.toggle("on", !!tela); $("vzPalco").classList.toggle("com-tela", mostraTela()); b.disabled = !tela && !!quem;
    b.title = !tela && quem ? quem.nome + " já está transmitindo" : "";
    $("vzTelaSom").disabled = !!tela;
    var mostra = !!tela || !!quem; $("vzStage").hidden = !mostra; $("vzStage").classList.toggle("eu", !!tela); $("vzFull").hidden = !!tela; $("vzDicaTela").hidden = !tela;
    $("vzBadge").textContent = tela ? "TRANSMITINDO" : (quem ? "AO VIVO · " + quem.nome : "AO VIVO");
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
    var avM = meuAv(), avArgs = { p_sala: sala, p_eu: eu, p_nome: nome, p_tela: !!tela }; if(avM !== avEnviado) avArgs.p_avatar = avM;
    rpc("voz_sync", avArgs).then(function(r){ if(r && r.ok) avEnviado = avM;
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
      if(antes !== pessoas.map(function(p){ return p.eu + p.nome + p.tela; }).join()){ desenharGente(); desenharCanais(); }
      $("vzSt").textContent = pessoas.length + (pessoas.length === 1 ? " pessoa na sala" : " pessoas na sala"); $("vzSt").classList.add("on");
      if(Date.now() - usadoT > 300000){ usadoT = Date.now(); rpc("voz_usar", { p_sala: sala, p_eu: eu, p_privada: privadaNova }).then(listarCanais).catch(function(){}); }
    }).catch(function(e){ if(g === gen && dentro && ++falhas >= 4){ sair("Não consegui falar com o servidor das salas (" + ((e && e.message) || "erro") + "). Tente de novo em instantes."); } }).then(function(){ if(g === gen && dentro) timer = setTimeout(function(){ sync(g); }, POLL); });
  }

  /* ---- tela (interface) ---- */
  function desenharGente(){
    var el = $("vzGente"); if(!el) return; el.textContent = "";
    pessoas.forEach(function(p){
      var me = p.eu === eu, c = conns[p.eu];
      var t = document.createElement("div"); t.className = "dz-t" + (me ? " eu" : ""); t.dataset.id = me ? "eu" : p.eu;
      var av = avatar(p.nome, "dz-av-g", p.eu === eu ? meuAv() : p.av); t.appendChild(av);
      var nm = document.createElement("div"); nm.className = "dz-t-n"; nm.textContent = p.nome || "Alguém";
      var sm = document.createElement("small"); sm.textContent = me ? (mic ? (micOn ? "você" : "você · microfone desligado") : "você · só ouvindo") : (c && c.ok ? "" : "conectando…"); nm.appendChild(sm); t.appendChild(nm);
      if(p.tela){ var ao = document.createElement("span"); ao.className = "dz-live"; ao.textContent = "AO VIVO"; t.appendChild(ao); }
      if(me && mic && !micOn){ var mm = document.createElement("span"); mm.className = "dz-mudo"; mm.setAttribute("aria-label", "microfone desligado"); mm.textContent = "mudo"; t.appendChild(mm); }
      if(!me){
        var ct = document.createElement("div"); ct.className = "dz-t-c";
        var vol = document.createElement("input"); vol.type = "range"; vol.min = 0; vol.max = 100; vol.value = c ? Math.round(c.vol * 100) : 100; vol.setAttribute("aria-label", "Volume de " + p.nome); pintaVol(vol);
        vol.addEventListener("input", function(){ pintaVol(vol); var cc = conns[p.eu]; if(cc){ cc.vol = (+vol.value) / 100; aplicarVolumes(); } });
        var mu = document.createElement("button"); mu.type = "button"; mu.className = "mu"; mu.dataset.on = c && c.mudo ? "1" : "0"; mu.textContent = c && c.mudo ? "Mudo" : "Silenciar";
        mu.addEventListener("click", function(){ var cc = conns[p.eu]; if(!cc) return; cc.mudo = !cc.mudo; mu.dataset.on = cc.mudo ? "1" : "0"; mu.textContent = cc.mudo ? "Mudo" : "Silenciar"; aplicarVolumes(); });
        ct.appendChild(vol); ct.appendChild(mu); t.appendChild(ct);
      }
      el.appendChild(t);
    });
  }
  function modo(dentroUi){ $("vzOn").hidden = !dentroUi; $("vzVazio").hidden = dentroUi; $("vzSalaAtual").textContent = dentroUi ? sala : ""; if(dentroUi) abrirNovo(false); desenharCanais(); }
  function abrirNovo(abre){ $("vzNovo").hidden = !abre; $("vzMais").setAttribute("aria-expanded", abre ? "true" : "false"); if(abre) $("vzSala").focus(); }

  /* ---- lista de salas (como os canais do Discord) ---- */
  function desenharCanais(){
    var L = $("vzCanais"); L.textContent = "";
    var lista = canais.slice();
    if(dentro && !lista.some(function(c){ return c.sala === sala; })) lista.unshift({ sala: sala, gente: [] });
    lista.forEach(function(c){
      var aqui = dentro && c.sala === sala;
      var row = document.createElement("div"); row.className = "dz-c" + (aqui ? " aqui" : ""); row.setAttribute("role", "listitem");
      var bt = document.createElement("button"); bt.type = "button"; bt.className = "dz-c-b";
      bt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM16 9a4 4 0 0 1 0 6"/></svg>';
      var nm = document.createElement("span"); nm.className = "nm"; nm.textContent = c.sala; bt.appendChild(nm);
      var gente = aqui ? pessoas.map(function(p){ return { eu: p.eu, nome: p.nome, tela: p.tela, av: p.eu === eu ? meuAv() : p.av }; }) : (c.gente || []);
      if(gente.length){ var n = document.createElement("span"); n.className = "n"; n.textContent = gente.length; bt.appendChild(n); }
      if(aqui){ bt.setAttribute("aria-current", "true"); bt.title = "Você está nesta sala"; } else { bt.title = "Entrar em " + c.sala; bt.addEventListener("click", function(){ entrar(c.sala, false); }); }
      row.appendChild(bt);
      if(gente.length){
        var ul = document.createElement("div"); ul.className = "dz-m";
        gente.forEach(function(g){
          var li = document.createElement("div"); li.className = "dz-mi"; if(aqui && g.eu) li.dataset.id = g.eu === eu ? "eu" : g.eu;
          li.appendChild(avatar(g.nome, "dz-av-p", g.av)); var s = document.createElement("span"); s.className = "t"; s.textContent = g.nome; li.appendChild(s);
          if(g.tela){ var l = document.createElement("span"); l.className = "dz-live"; l.textContent = "AO VIVO"; li.appendChild(l); }
          ul.appendChild(li);
        });
        row.appendChild(ul);
      }
      L.appendChild(row);
    });
    if(!lista.length){ var v = document.createElement("p"); v.className = "dz-sem"; v.textContent = "Nenhuma sala aberta. Crie a primeira em Nova sala."; L.appendChild(v); }
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
      $("vzCriar").disabled = false; sala = s; eu = rnd(16); avEnviado = null; dentro = true; entrando = false; pessoas = []; conns = {}; vt = {}; tela = null; gen++; loc = {}; usadoT = 0; falhas = 0;
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
    $("vzEco").checked = p.eco; $("vzRuido").checked = p.ruido; $("vzGanho").checked = p.ganho; $("vzGate").checked = p.gate;
    $("vzMais").addEventListener("click", function(){ abrirNovo($("vzNovo").hidden); });
    function atualizaEuAv(){ pintarAv($("vzEuAv"), $("vzNome").value.trim(), meuAv()); }
    /* escolha do avatar: 16 emblemas autorais e 6 cores de fundo */
    var pick = $("vzAvPick"), grade = $("vzAvGrade"), cores = $("vzAvCores");
    function usarAv(v){ ls("lv:avatar", v); atualizaEuAv(); if(dentro) desenharGente(); marcarAv(); }
    function atual(){ var m = /^db:fumaca:([a-z]+)-([a-z]+)$/.exec(meuAv()); return m ? { e: m[1], f: m[2] } : null; }
    var fundoSel = (atual() || {}).f || "vinho";
    function marcarAv(){ var a = atual();
      grade.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", String(!!a && b.dataset.e === a.e)); });
      cores.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.dataset.f === fundoSel)); }); }
    function montarGrade(){
      grade.textContent = "";
      Object.keys(EMB).forEach(function(e){ var b = document.createElement("button"); b.type = "button"; b.dataset.e = e; b.setAttribute("aria-label", "Avatar " + e); b.title = e.charAt(0).toUpperCase() + e.slice(1);
        var im = document.createElement("img"); im.src = svgFumaca(e, fundoSel); im.alt = ""; b.appendChild(im); b.addEventListener("click", function(){ usarAv("db:fumaca:" + this.dataset.e + "-" + fundoSel); }); grade.appendChild(b); });
      marcarAv();
    }
    function montarCores(){
      cores.textContent = "";
      Object.keys(FUNDOS).forEach(function(f){ var b = document.createElement("button"); b.type = "button"; b.dataset.f = f; b.style.background = FUNDOS[f]; b.setAttribute("aria-label", "Fundo " + f); b.title = "Fundo " + f;
        b.addEventListener("click", function(){ fundoSel = this.dataset.f; var a = atual(); montarGrade(); if(a) usarAv("db:fumaca:" + a.e + "-" + fundoSel); }); cores.appendChild(b); });
    }
    function abrirPick(abrir){ pick.hidden = !abrir; $("vzEuAv").setAttribute("aria-expanded", String(abrir)); if(abrir){ if(!cores.children.length) montarCores(); montarGrade(); } }
    $("vzEuAv").addEventListener("click", function(){ abrirPick(pick.hidden); });
    $("vzAvSem").addEventListener("click", function(){ usarAv(""); });
    $("vzAvFechar").addEventListener("click", function(){ abrirPick(false); $("vzEuAv").focus(); });
    document.addEventListener("keydown", function(e){ if(e.key === "Escape" && !pick.hidden) abrirPick(false); });
    $("vzAvFoto").addEventListener("change", function(){
      var f = this.files && this.files[0]; this.value = ""; if(!f) return;
      if(!/^image\//.test(f.type)){ erro("Escolha um arquivo de imagem."); return; }
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function(){
        var c = document.createElement("canvas"); c.width = c.height = 64; var g = c.getContext("2d"), l = Math.min(img.width, img.height);
        g.drawImage(img, (img.width - l) / 2, (img.height - l) / 2, l, l, 0, 0, 64, 64); URL.revokeObjectURL(url);
        var d = c.toDataURL("image/jpeg", 0.82); if(d.length > 15000) d = c.toDataURL("image/jpeg", 0.6);
        if(d.length > 15000){ erro("Não consegui reduzir essa foto. Tente outra."); return; }
        erro(""); usarAv(d);
      };
      img.onerror = function(){ URL.revokeObjectURL(url); erro("Não consegui abrir essa imagem."); };
      img.src = url;
    });
    $("vzNome").addEventListener("input", atualizaEuAv); atualizaEuAv();
    $("vzNovo").addEventListener("submit", function(e){ e.preventDefault(); var s = $("vzSala").value; if(!s.trim()){ erro("Escreva o nome da sala nova."); $("vzSala").focus(); return; } entrar($("vzPriv").checked ? limparSala(s).slice(0, 30) + "-" + rnd(6) : s, $("vzPriv").checked); $("vzSala").value = ""; $("vzPriv").checked = false; });
    $("vzConv").addEventListener("click", function(){
      var b = this, l = linkConvite();
      var tx = b.querySelector(".tx"); copiar(l).then(function(){ tx.textContent = "Link copiado!"; }, function(){ tx.textContent = "Não copiou"; erro("Link do convite: " + l); }).then(function(){ setTimeout(function(){ tx.textContent = "Convidar"; }, 2500); });
    });
    convidado();
    var vd = $("vzVideo"); vd.addEventListener("loadedmetadata", function(){ if(vd.videoWidth && vd.videoHeight) $("vzStage").style.aspectRatio = vd.videoWidth + " / " + vd.videoHeight; });
    vd.addEventListener("dblclick", function(){ if(!tela) $("vzFull").click(); });
    $("vzSair").addEventListener("click", function(){ sair(""); });
    $("vzTela").addEventListener("click", function(){ if(tela) pararTela(); else iniciarTela(); });
    $("vzFull").addEventListener("click", function(){ var el = $("vzStage"); if(document.fullscreenElement){ document.exitFullscreen(); return; } (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el); });
    $("vzMic").addEventListener("click", function(){ if(!mic) return; micOn = !micOn; aplicarMicOn(); });
    $("vzSom").addEventListener("click", function(){
      somOn = !somOn; this.dataset.on = somOn ? "1" : "0"; this.setAttribute("aria-label", somOn ? "Silenciar o áudio da sala" : "Ligar o áudio da sala"); aplicarVolumes();
      if(somOn && ctx && ctx.state === "suspended") ctx.resume().catch(function(){});
    });
    pintaVol($("vzVol")); $("vzVol").addEventListener("input", function(){ pintaVol(this); volGeral = (+this.value) / 100; aplicarVolumes(); });
    ["vzEco", "vzRuido", "vzGanho", "vzGate"].forEach(function(id){ $(id).addEventListener("change", function(){ salvarPrefs(); trocarMic(); }); });
    $("vzMicDev").addEventListener("change", function(){ salvarPrefs(); trocarMic(); });
    $("vzSaida").addEventListener("change", function(){
      salvarPrefs(); var s = this.value;
      Object.keys(conns).forEach(function(k){ var a = conns[k].audio; if(a && a.setSinkId) a.setSinkId(s).catch(function(){}); });
    });
    window.addEventListener("pagehide", function(){ if(dentro && sala && eu) rpc("voz_sair", { p_sala: sala, p_eu: eu }).catch(function(){}); });
    var antigo = window.renderLive; window.renderLive = function(){ if(antigo) antigo(); listarCanais(); }; // ao abrir a aba, já mostra as salas
    listarCanais(); setInterval(listarCanais, 8000);
  }
  window.vzEstado = function(){ return { rn: rnOk, dentro: dentro, sala: sala, eu: eu, pessoas: pessoas.length, conectados: Object.keys(conns).filter(function(k){ return conns[k].ok; }).length, mic: !!mic, micOn: micOn, somOn: somOn, transmitindo: !!tela, assistindo: Object.keys(vt).length }; };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();

/* ================= Live: duas vistas (Transmissões e Salas de voz) =================
   A aba tem um seletor no topo. A escolha fica guardada (lv:vista). Entrar numa sala, chegar por convite de sala ou estar transmitindo numa
   sala leva para Salas de voz; abrir um link de live, assistir ou transmitir pelo /live leva para Transmissões. Os números ao lado mostram
   quantas lives estão no ar e quantas pessoas estão nas salas. */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var tT = $("lvTabT"), tV = $("lvTabV"); if(!tT || !tV) return;
  function ls(k, v){ try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){} return null; }
  function mostrar(v, guardar){
    var voz = v === "voz";
    $("lvViewT").hidden = voz; $("lvViewV").hidden = !voz;
    tT.setAttribute("aria-selected", String(!voz)); tT.setAttribute("aria-pressed", String(!voz));
    tV.setAttribute("aria-selected", String(voz)); tV.setAttribute("aria-pressed", String(voz));
    if(guardar) ls("lv:vista", v);
  }
  tT.addEventListener("click", function(){ mostrar("trans", true); });
  tV.addEventListener("click", function(){ mostrar("voz", true); });
  [tT, tV].forEach(function(b, i){ b.addEventListener("keydown", function(e){ if(e.key === "ArrowRight" || e.key === "ArrowLeft"){ var o = i ? tT : tV; o.focus(); o.click(); } }); });
  function contar(){
    var nT = document.querySelectorAll("#lvLista .lv-dot.on").length, nV = document.querySelectorAll("#vzCanais ul li").length;
    $("lvCntT").textContent = nT ? String(nT) : ""; $("lvCntT").title = nT ? (nT === 1 ? "1 live no ar" : nT + " lives no ar") : "";
    $("lvCntV").textContent = nV ? String(nV) : ""; $("lvCntV").title = nV ? (nV === 1 ? "1 pessoa nas salas" : nV + " pessoas nas salas") : "";
  }
  var vis = function(id){ var e = $(id); return !!(e && !e.hidden); };
  var antes = { on: false, conv: false, emit: false, wrap: false };
  function seguir(){
    var a = { on: vis("vzOn"), conv: vis("vzConvite"), emit: vis("lvEmit") || vis("lvEntregue"), wrap: vis("lvWrap") };
    if((a.on && !antes.on) || (a.conv && !antes.conv)) mostrar("voz", false);
    else if((a.emit && !antes.emit) || (a.wrap && !antes.wrap)) mostrar("trans", false);
    antes = a; contar();
  }
  var mo = new MutationObserver(seguir);
  ["lvLista", "vzCanais"].forEach(function(id){ var e = $(id); if(e) mo.observe(e, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] }); });
  ["vzOn", "vzConvite", "lvEmit", "lvEntregue", "lvWrap"].forEach(function(id){ var e = $(id); if(e) mo.observe(e, { attributes: true, attributeFilter: ["hidden"] }); });
  mostrar(ls("lv:vista") === "voz" ? "voz" : "trans", false); seguir();
})();
