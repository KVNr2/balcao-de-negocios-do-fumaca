package main

import (
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
)

// Protocolo "albion-ficha://": o botão do site abre este programa. Registrado só para o usuário
// atual (HKCU), não precisa de Administrador.
const protoScheme = "albion-ficha"
const defaultSite = "https://kvnr2.github.io/balcao-de-negocios-do-fumaca/"

var (
	webMode bool   // aberto pelo botão do site
	retURL  = defaultSite
)

func regAdd(args ...string) {
	c := exec.Command("reg", append([]string{"add"}, args...)...)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = c.Run()
}

func registerProtocol(exe string) {
	base := `HKCU\Software\Classes\` + protoScheme
	regAdd(base, "/ve", "/d", "URL:Ficha do Albion", "/f")
	regAdd(base, "/v", "URL Protocol", "/d", "", "/f")
	regAdd(base+`\shell\open\command`, "/ve", "/d", `"`+exe+`" "%1"`, "/f")
}

// Instalação (dois cliques no programa baixado): copia para %LOCALAPPDATA%\FichaAlbion e registra o
// endereço albion-ficha://. Depois disso o botão Sincronizar do site abre o programa sozinho.
func installSelf() {
	exe, err := os.Executable()
	if err != nil {
		fatalBox(err.Error())
	}
	dir := filepath.Join(os.Getenv("LOCALAPPDATA"), "FichaAlbion")
	dst := filepath.Join(dir, "ficha-albion.exe")
	if !strings.EqualFold(exe, dst) {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			fatalBox("Não consegui criar a pasta " + dir + ": " + err.Error())
		}
		b, err := os.ReadFile(exe)
		if err != nil {
			fatalBox("Não consegui ler o programa: " + err.Error())
		}
		if err := os.WriteFile(dst, b, 0o755); err != nil {
			fatalBox("Não consegui instalar em " + dst + ": " + err.Error() + "\nFeche o programa se ele estiver aberto e tente de novo.")
		}
	}
	registerProtocol(dst)
	infoBox("Instalado!\n\nVolte ao site, clique em Sincronizar e entre no seu personagem no Albion.\n\nPode apagar este arquivo baixado.")
}

// A página de retorno vem no endereço (albion-ficha://iniciar?voltar=...), mas só é aceita se for
// o site oficial ou um teste local.
func parseReturnURL(a string) string {
	u, err := url.Parse(a)
	if err != nil {
		return defaultSite
	}
	r, err := url.Parse(u.Query().Get("voltar"))
	if err != nil || r.Host == "" {
		return defaultSite
	}
	h := r.Hostname()
	if (r.Scheme == "https" && h == "kvnr2.github.io") || (r.Scheme == "http" && (h == "localhost" || h == "127.0.0.1")) {
		r.Fragment = ""
		return r.String()
	}
	return defaultSite
}

// Abre o site de volta com a ficha depois do "#" (essa parte do endereço não vai para servidor nenhum).
func openSiteWithFicha(code string) {
	_ = exec.Command("explorer.exe", retURL+"#ficha="+url.QueryEscape(code)).Start()
}
