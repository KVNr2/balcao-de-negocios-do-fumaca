package main

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"time"
)

// Janela do programa: uma página local (só 127.0.0.1) que mostra o andamento em tempo real.
type uiState struct {
	mu      sync.Mutex
	Stage   string         `json:"stage"` // espera | recebido | pronto | vazio | tempo
	Nos     int            `json:"nos"`
	Found   int            `json:"found"`
	Why     string         `json:"why"`
	Copied  bool           `json:"copied"`
	Ramos   map[string]int `json:"ramos"`
	Since   int64          `json:"since"`
	code    string
	started time.Time
	lastPoll time.Time
}

var ui = &uiState{Stage: "espera", started: time.Now()}

func (u *uiState) update(f func()) {
	u.mu.Lock()
	defer u.mu.Unlock()
	f()
}

func startUI(openBrowser bool) (string, bool) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return "", false
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, uiPage)
	})
	mux.HandleFunc("/state", func(w http.ResponseWriter, r *http.Request) {
		ui.mu.Lock()
		ui.Since = int64(time.Since(ui.started).Seconds())
		ui.lastPoll = time.Now()
		b, _ := json.Marshal(ui)
		ui.mu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		w.Write(b)
	})
	mux.HandleFunc("/copy", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "método", http.StatusMethodNotAllowed)
			return
		}
		ui.mu.Lock()
		code := ui.code
		ui.mu.Unlock()
		if code == "" || copyToClipboard(code) != nil {
			http.Error(w, "falhou", http.StatusInternalServerError)
			return
		}
		w.Write([]byte("ok"))
	})
	mux.HandleFunc("/quit", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "método", http.StatusMethodNotAllowed)
			return
		}
		w.Write([]byte("ok"))
		go func() { time.Sleep(200 * time.Millisecond); os.Exit(0) }()
	})
	go http.Serve(ln, mux)
	url := "http://" + ln.Addr().String() + "/"
	// explorer abre o navegador sem privilégio de administrador
	if openBrowser {
		_ = exec.Command("explorer.exe", url).Start()
	}
	// Janela preta some; se a página não abrir, ela volta. Se a aba for fechada, o programa encerra.
	go func() {
		showConsole(false)
		time.Sleep(60 * time.Second)
		ui.mu.Lock()
		never := ui.lastPoll.IsZero()
		ui.mu.Unlock()
		if never {
			showConsole(true)
			return
		}
		for {
			time.Sleep(5 * time.Second)
			ui.mu.Lock()
			gone := time.Since(ui.lastPoll) > 120*time.Second && ui.Stage != "espera" && ui.Stage != "recebido"
			ui.mu.Unlock()
			if gone {
				os.Exit(0)
			}
		}
	}()
	return url, true
}

const uiPage = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ficha do Albion</title>
<style>
:root{--bg:#12141a;--card:#1b1e27;--line:#2c3140;--tx:#ecebe6;--mut:#9aa0ae;--gold:#e0b050;--ok:#6fcf8e;--warn:#e8a05a}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(900px 500px at 50% -10%,#232838 0,var(--bg) 70%);color:var(--tx);font:16px/1.5 "Segoe UI",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}
.wrap{width:100%;max-width:560px}
h1{margin:0 0 4px;font-size:24px;letter-spacing:.3px;color:var(--gold)}
.sub{color:var(--mut);margin:0 0 22px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.steps{display:flex;gap:10px;margin-bottom:20px}
.step{flex:1;text-align:center;font-size:13px;color:var(--mut)}
.dot{width:34px;height:34px;border-radius:50%;margin:0 auto 6px;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;font-weight:700}
.step.on .dot{border-color:var(--gold);color:var(--gold);animation:pulse 1.6s infinite}
.step.on{color:var(--tx)}
.step.ok .dot{background:var(--ok);border-color:var(--ok);color:#10261a}
.step.ok{color:var(--tx)}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(224,176,80,.5)}100%{box-shadow:0 0 0 12px rgba(224,176,80,0)}}
.big{font-size:20px;font-weight:600;margin:6px 0}
.hint{color:var(--mut);margin:6px 0 0;white-space:pre-line}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:16px 0 4px}
.stat{background:#161922;border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.stat b{display:block;font-size:22px;color:var(--gold)}
.stat span{font-size:12px;color:var(--mut)}
ul.r{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-wrap:wrap;gap:6px}
ul.r li{background:#161922;border:1px solid var(--line);border-radius:999px;padding:3px 10px;font-size:13px;color:var(--mut)}
.btns{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
button,a.btn{font:inherit;cursor:pointer;border-radius:10px;padding:10px 16px;border:1px solid var(--line);background:#222735;color:var(--tx);text-decoration:none}
button.p,a.btn.p{background:var(--gold);color:#241a05;border-color:var(--gold);font-weight:600}
button:hover,a.btn:hover{filter:brightness(1.12)}
.warn{color:var(--warn)}
.foot{margin-top:14px;font-size:12px;color:var(--mut);text-align:center}
.hide{display:none}
</style></head><body><div class="wrap">
<h1>Ficha do Albion</h1>
<p class="sub">Lê o seu Destiny Board e prepara a ficha para o site.</p>
<div class="card">
 <div class="steps">
  <div class="step" id="s1"><div class="dot">1</div>Entrar no personagem</div>
  <div class="step" id="s2"><div class="dot">2</div>Níveis recebidos</div>
  <div class="step" id="s3"><div class="dot">3</div>Ficha copiada</div>
 </div>
 <div class="big" id="t"></div>
 <p class="hint" id="h"></p>
 <div id="res" class="hide">
  <div class="stats"><div class="stat"><b id="n1">0</b><span>nós lidos do jogo</span></div><div class="stat"><b id="n2">0</b><span>níveis colocados na ficha</span></div></div>
  <ul class="r" id="r"></ul>
 </div>
 <div class="btns hide" id="b">
  <button class="p" id="cp">Copiar ficha de novo</button>
  <a class="btn" target="_blank" rel="noopener" href="https://kvnr2.github.io/balcao-de-negocios-do-fumaca/">Abrir o site</a>
  <button id="q">Fechar programa</button>
 </div>
</div>
<div class="foot">Só os seus dados são lidos, nada é enviado para a internet.</div>
</div>
<script>
var NAMES={armas:"Armas",sp:"Especializações",craft:"Craft de armaduras",coleta:"Coleta",refino:"Refino"};
function $(i){return document.getElementById(i)}
function cls(id,c){$(id).className="step "+c}
function render(s){
 var st=s.stage;
 var late=(s.since>=45);cls("s1",st=="espera"?"on":"ok");cls("s2",st=="recebido"?"on":(st=="espera"?"":"ok"));cls("s3",st=="pronto"?"ok":"");
 var t="",h="";
 if(st=="espera"){t="Aguardando você entrar no jogo";h="Abra o Albion, escolha o personagem e clique em Entrar.\n\nEu percebo sozinho quando você loga e copio a ficha. Não precisa apertar nada aqui, nem abrir o Painel do Destino."+(late?"\n\nDemorando? Se você já estava dentro do mundo quando abri o programa, volte para a seleção de personagem e entre de novo.":"")}
 else if(st=="recebido"){t="Níveis recebidos!";h="Montando a sua ficha. Só um instante, pode deixar o jogo como está."}
 else if(st=="pronto"){t="Ficha copiada!";h="Agora no site:\n1. Abra Minha ficha e clique em Colar ficha.\n2. Aperte Ctrl+V.\n3. Clique em Usar esta ficha."}
 else if(st=="vazio"){t="Nada foi copiado";h=s.why||"";}
 else if(st=="tempo"){t="Tempo esgotado";h="Os níveis não apareceram. Feche o programa, abra de novo e então entre no personagem."}
 $("t").textContent=t;$("h").textContent=h;$("h").className="hint"+(st=="vazio"||st=="tempo"?" warn":"");
 var done=(st=="pronto"||st=="vazio"||st=="tempo");
 $("b").className="btns"+(done?"":" hide");
 $("cp").className=st=="pronto"?"p":"hide";
 var showRes=(st=="pronto"||st=="vazio");
 $("res").className=showRes?"":"hide";
 if(showRes){$("n1").textContent=s.nos;$("n2").textContent=s.found;
  var r=$("r");r.textContent="";
  for(var k in (s.ramos||{})){var li=document.createElement("li");li.textContent=(NAMES[k]||k)+": "+s.ramos[k];r.appendChild(li)}}
}
function poll(){fetch("/state").then(function(r){return r.json()}).then(render).catch(function(){$("t").textContent="Programa fechado";$("h").textContent="Pode fechar esta aba."})}
setInterval(poll,700);poll();
$("cp").onclick=function(){fetch("/copy",{method:"POST"}).then(function(r){$("cp").textContent=r.ok?"Copiado!":"Falhou ao copiar";setTimeout(function(){$("cp").textContent="Copiar ficha de novo"},1800)})};
$("q").onclick=function(){fetch("/quit",{method:"POST"}).finally(function(){$("t").textContent="Programa fechado";$("h").textContent="Pode fechar esta aba.";$("b").className="hide"})};
</script></body></html>`
