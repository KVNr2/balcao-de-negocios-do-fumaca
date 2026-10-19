package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"
)

// Atualização automática: o site publica programa/versao.json ({"versao","sha256"}) e
// programa/ficha-albion.exe. Quando a versão muda, o programa instalado se troca sozinho.
const appVersion = "1.1.0"

var updateBase = "https://kvnr2.github.io/balcao-de-negocios-do-fumaca/programa/"

type versaoInfo struct {
	Versao string `json:"versao"`
	SHA256 string `json:"sha256"`
}

func httpGet(url string, timeout time.Duration, max int64) ([]byte, error) {
	c := &http.Client{Timeout: timeout}
	r, err := c.Get(url)
	if err != nil {
		return nil, err
	}
	defer r.Body.Close()
	if r.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d", r.StatusCode)
	}
	return io.ReadAll(io.LimitReader(r.Body, max))
}

// doUpdate troca o arquivo exe pelo publicado se a versão for outra. Devolve true se trocou.
func doUpdate(exe, base string) (bool, error) {
	_ = os.Remove(exe + ".old")
	b, err := httpGet(base+"versao.json", 4*time.Second, 1<<16)
	if err != nil {
		return false, err
	}
	var v versaoInfo
	if err := json.Unmarshal(b, &v); err != nil || v.Versao == "" || len(v.SHA256) != 64 {
		return false, fmt.Errorf("versao.json inválido")
	}
	if v.Versao == appVersion {
		return false, nil
	}
	nb, err := httpGet(base+"ficha-albion.exe", 90*time.Second, 64<<20)
	if err != nil {
		return false, err
	}
	sum := sha256.Sum256(nb)
	if !strings.EqualFold(hex.EncodeToString(sum[:]), v.SHA256) {
		return false, fmt.Errorf("arquivo baixado não confere com o sha256 publicado")
	}
	if err := os.Rename(exe, exe+".old"); err != nil {
		return false, err
	}
	if err := os.WriteFile(exe, nb, 0o755); err != nil {
		_ = os.Rename(exe+".old", exe)
		return false, err
	}
	return true, nil
}

// tryUpdate roda só no programa instalado. Se atualizou, abre a versão nova com os mesmos argumentos.
func tryUpdate() bool {
	if os.Getenv("FICHA_ALBION_ATUALIZADO") == "1" {
		return false
	}
	exe, err := os.Executable()
	if err != nil || !strings.Contains(strings.ToLower(exe), "fichaalbion") {
		return false
	}
	ok, err := doUpdate(exe, updateBase)
	if err != nil || !ok {
		return false // sem internet ou qualquer erro: segue com a versão atual
	}
	cmd := exec.Command(exe, os.Args[1:]...)
	cmd.Env = append(os.Environ(), "FICHA_ALBION_ATUALIZADO=1")
	return cmd.Start() == nil
}
