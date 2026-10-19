package main

import (
	"bufio"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"
)

// ---------------------------------------------------------------------------
// Permissão de administrador
// ---------------------------------------------------------------------------

func amIAdmin() bool {
	f, err := os.Open("\\\\.\\PHYSICALDRIVE0")
	if err != nil {
		return false
	}
	f.Close()
	return true
}

func requestAdminPermission() {
	exe, err := os.Executable()
	if err != nil {
		fatalBox(err.Error())
	}
	args := ""
	if len(os.Args) > 1 {
		args = " -ArgumentList '" + strings.Join(os.Args[1:], "','") + "'"
	}
	if webMode {
		// O processo elevado só captura e grava o resultado; quem abre o navegador é este processo,
		// sem privilégio de administrador (assim abre no seu navegador de verdade).
		_ = os.Remove(resultPath())
		args = " -ArgumentList '" + strings.Join(append(append([]string{}, os.Args[1:]...), "-pai"), "','") + "'"
		cmd := exec.Command("powershell", "-WindowStyle", "Hidden", "-Command", "Start-Process '"+exe+"' -Verb RunAs -Wait"+args)
		cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		if err := cmd.Run(); err != nil {
			infoBox("Sem a permissão de Administrador o programa não consegue ler o jogo. Clique em Sincronizar de novo e aceite o aviso do Windows.")
			os.Exit(0)
		}
		if frag, e := os.ReadFile(resultPath()); e == nil && len(frag) > 0 {
			_ = os.Remove(resultPath())
			openURL(retURL + "#ficha=" + string(frag))
		}
		os.Exit(0)
	}
	cmd := exec.Command("powershell", "-WindowStyle", "Hidden", "-Command", "Start-Process '"+exe+"' -Verb RunAs"+args)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Run()
	os.Exit(0)
}

// ---------------------------------------------------------------------------
// Decodificador Photon Protocol18 (GpBinaryV18)
// Inteiros pequenos/tamanhos usam varint; short/float/double são little-endian.
// ---------------------------------------------------------------------------

// BEGIN-DECODER
type rd struct {
	b   []byte
	p   int
	bad bool
}

func (r *rd) need(n int) bool {
	if n < 0 || r.p+n > len(r.b) {
		r.bad = true
		return false
	}
	return true
}

func (r *rd) u8() byte {
	if !r.need(1) {
		return 0
	}
	v := r.b[r.p]
	r.p++
	return v
}

func (r *rd) u16() uint16 { // little-endian
	if !r.need(2) {
		return 0
	}
	v := binary.LittleEndian.Uint16(r.b[r.p:])
	r.p += 2
	return v
}

func (r *rd) varuint() uint32 {
	var v uint32
	var shift uint
	for i := 0; i < 5; i++ {
		b := r.u8()
		if r.bad {
			return 0
		}
		v |= uint32(b&0x7F) << shift
		if b&0x80 == 0 {
			return v
		}
		shift += 7
	}
	r.bad = true
	return 0
}

func (r *rd) varuint64() uint64 {
	var v uint64
	var shift uint
	for i := 0; i < 10; i++ {
		b := r.u8()
		if r.bad {
			return 0
		}
		v |= uint64(b&0x7F) << shift
		if b&0x80 == 0 {
			return v
		}
		shift += 7
	}
	r.bad = true
	return 0
}

func zz32(v uint32) int32 { return int32(v>>1) ^ -int32(v&1) }
func zz64(v uint64) int64 { return int64(v>>1) ^ -int64(v&1) }

func (r *rd) f32() float32 {
	if !r.need(4) {
		return 0
	}
	v := math.Float32frombits(binary.LittleEndian.Uint32(r.b[r.p:]))
	r.p += 4
	return v
}

func (r *rd) f64() float64 {
	if !r.need(8) {
		return 0
	}
	v := math.Float64frombits(binary.LittleEndian.Uint64(r.b[r.p:]))
	r.p += 8
	return v
}

func (r *rd) raw(n int) []byte {
	if !r.need(n) {
		return nil
	}
	v := r.b[r.p : r.p+n]
	r.p += n
	return v
}

func (r *rd) str() string {
	n := int(r.varuint())
	return string(r.raw(n))
}

// count lê um tamanho (varint) e confere se cabe nos bytes restantes.
func (r *rd) count() int {
	n := int(r.varuint())
	if r.bad || n < 0 || n > len(r.b)-r.p {
		r.bad = true
		return 0
	}
	return n
}

// value lê um valor de tipo t.
func (r *rd) value(t byte) interface{} {
	if r.bad {
		return nil
	}
	if t >= 128 { // tipo customizado "slim"
		n := int(r.varuint())
		d := r.raw(n)
		return fmt.Sprintf("custom%d:%x", t-128, d)
	}
	switch t {
	case 0: // tipo desconhecido: não dá para continuar lendo
		r.bad = true
		return nil
	case 8: // null
		return nil
	case 2:
		return r.u8() != 0
	case 3:
		return r.u8()
	case 4:
		return int16(r.u16())
	case 5:
		return r.f32()
	case 6:
		return r.f64()
	case 7:
		return r.str()
	case 9:
		return zz32(r.varuint())
	case 10:
		return zz64(r.varuint64())
	case 11:
		return int32(r.u8())
	case 12:
		return -int32(r.u8())
	case 13:
		return int32(r.u16())
	case 14:
		return -int32(r.u16())
	case 15:
		return int64(r.u8())
	case 16:
		return -int64(r.u8())
	case 17:
		return int64(r.u16())
	case 18:
		return -int64(r.u16())
	case 19: // custom
		id := r.u8()
		n := int(r.varuint())
		d := r.raw(n)
		return fmt.Sprintf("custom%d:%x", id, d)
	case 20: // dictionary
		kt, vt := r.u8(), r.u8()
		n := r.count()
		out := map[string]interface{}{}
		for i := 0; i < n && !r.bad; i++ {
			k, v := kt, vt
			if k == 0 {
				k = r.u8()
			}
			kv := r.value(k)
			if v == 0 {
				v = r.u8()
			}
			out[fmt.Sprint(kv)] = r.value(v)
		}
		return out
	case 21: // hashtable
		n := r.count()
		out := map[string]interface{}{}
		for i := 0; i < n && !r.bad; i++ {
			kv := r.value(r.u8())
			out[fmt.Sprint(kv)] = r.value(r.u8())
		}
		return out
	case 23: // array de objetos
		n := r.count()
		out := make([]interface{}, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, r.value(r.u8()))
		}
		return out
	case 24: // OperationRequest aninhado
		r.u8()
		return r.params()
	case 25: // OperationResponse aninhado
		r.u8()
		r.u16()
		r.value(r.u8())
		return r.params()
	case 26: // EventData aninhado
		r.u8()
		return r.params()
	case 27:
		return false
	case 28:
		return true
	case 29:
		return int16(0)
	case 30:
		return int32(0)
	case 31:
		return int64(0)
	case 32:
		return float32(0)
	case 33:
		return float64(0)
	case 34:
		return byte(0)
	case 0x40: // array de arrays
		n := r.count()
		et := r.u8()
		out := make([]interface{}, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, r.value(et))
		}
		return out
	case 66: // bool[]
		n := int(r.varuint())
		if r.bad || n < 0 || n > 8*(len(r.b)-r.p) {
			r.bad = true
			return nil
		}
		out := make([]bool, 0, n)
		for len(out) < n && !r.bad {
			b := r.u8()
			for bit := 0; bit < 8 && len(out) < n; bit++ {
				out = append(out, b&(1<<uint(bit)) != 0)
			}
		}
		return out
	case 67: // byte[]
		n := r.count()
		return r.raw(n)
	case 68: // short[]
		n := r.count()
		out := make([]int16, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, int16(r.u16()))
		}
		return out
	case 69: // float[] (confirmado em captura real: coordenadas em float32)
		n := r.count()
		out := make([]float32, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, r.f32())
		}
		return out
	case 70: // double[]
		n := r.count()
		out := make([]float64, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, r.f64())
		}
		return out
	case 71: // string[]
		n := r.count()
		out := make([]string, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, r.str())
		}
		return out
	case 72: // hashtable[]
		n := r.count()
		out := make([]interface{}, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, r.value(21))
		}
		return out
	case 73: // int[] comprimido
		n := r.count()
		out := make([]int32, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, zz32(r.varuint()))
		}
		return out
	case 74: // long[] comprimido
		n := r.count()
		out := make([]int64, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			out = append(out, zz64(r.varuint64()))
		}
		return out
	case 83: // array de tipo customizado
		n := r.count()
		id := r.u8()
		out := make([]string, 0, n)
		for i := 0; i < n && !r.bad; i++ {
			l := int(r.varuint())
			out = append(out, fmt.Sprintf("custom%d:%x", id, r.raw(l)))
		}
		return out
	default:
		r.bad = true
		return nil
	}
}

// params lê a tabela de parâmetros: quantidade (1 byte), depois chave, tipo e valor.
func (r *rd) params() map[byte]interface{} {
	n := int(r.u8())
	out := make(map[byte]interface{}, n)
	for i := 0; i < n && !r.bad; i++ {
		k := r.u8()
		t := r.u8()
		out[k] = r.value(t)
	}
	return out
}

// END-DECODER

// ---------------------------------------------------------------------------
// Mensagens Photon
// ---------------------------------------------------------------------------

type frag struct {
	count int
	got   int
	data  []byte
	seen  map[int32]bool
}

var fragments = map[int32]*frag{}

var (
	flagFind   string
	flagNome   string
	flagRaw    bool
	logFile    *os.File
	failDumped int
	encDumped  int
	moveLogged int
)

func dbg(k string) { msgCounts["dbg "+k]++ }

func short(v interface{}) string {
	s := fmt.Sprintf("%v", v)
	if len(s) > 160 {
		s = s[:160] + "…"
	}
	return fmt.Sprintf("%T=%s", v, s)
}

func emit(kind string, code int, dir string, params map[byte]interface{}) {
	keys := make([]int, 0, len(params))
	for k := range params {
		keys = append(keys, int(k))
	}
	sort.Ints(keys)

	// conta por direção/tipo/código (e pelo código de evento/operação no parâmetro 252/253)
	ck := fmt.Sprintf("%s %s code=%d", dir, kind, code)
	_, has252 := params[252]
	if v, ok := params[252]; ok {
		ck += fmt.Sprintf(" p252=%v", v)
	}
	if v, ok := params[253]; ok {
		ck += fmt.Sprintf(" p253=%v", v)
	}
	msgCounts[ck]++

	// Eventos de movimento (código 3, sem parâmetro 252) são milhares e não interessam:
	// só os 3 primeiros vão para o log e para a lista.
	if kind == "EVENT" && code == 3 && !has252 {
		moveLogged++
		if moveLogged > 3 {
			return
		}
	}

	// guarda a mensagem para montar a ficha depois
	if len(captured) < 300000 {
		captured = append(captured, capMsg{kind: kind, code: code, dir: dir, params: params})
		if kind == "EVENT" && fmt.Sprint(params[252]) == "150" {
			if ids, ok := params[2].([]int16); ok && len(ids) > 0 {
				atomic.StoreInt32(&got150, 1)
			}
		}
	}

	var sb, fb strings.Builder // sb = versão curta (tela), fb = versão completa (arquivo de log)
	hdr := fmt.Sprintf("[%s] %s %s code=%d", time.Now().Format("15:04:05"), dir, kind, code)
	sb.WriteString(hdr)
	fb.WriteString(hdr)
	full := strings.Builder{}
	for _, k := range keys {
		v := params[byte(k)]
		fmt.Fprintf(&sb, "\n    %3d: %s", k, short(v))
		if bs, ok := v.([]byte); ok {
			fmt.Fprintf(&fb, "\n    %3d: []byte(%d)=%x", k, len(bs), bs)
		} else {
			fmt.Fprintf(&fb, "\n    %3d: %T=%v", k, v, v)
		}
		fmt.Fprintf(&full, "%v ", v)
	}

	// Filtro: só mostra mensagens que contenham o texto procurado
	if flagFind != "" && !strings.Contains(strings.ToLower(full.String()), strings.ToLower(flagFind)) {
		return
	}
	// Sem filtro, evita inundar a tela: mostra só uma linha por mensagem
	out := sb.String()
	if flagFind == "" && !flagRaw {
		out = fmt.Sprintf("[%s] %s %s code=%d params=%v", time.Now().Format("15:04:05"), dir, kind, code, keys)
	}
	fmt.Println(out)
	if logFile != nil {
		fmt.Fprintln(logFile, fb.String())
	}
}

// dumpFail registra por que uma mensagem não foi decodificada (primeiras 25 vão para o log).
func dumpFail(why string, p []byte) {
	dbg("falha: " + why)
	if failDumped >= 25 || logFile == nil {
		return
	}
	failDumped++
	n := len(p)
	if n > 240 {
		n = 240
	}
	fmt.Fprintf(logFile, "FAIL %s len=%d hex=%x\n", why, len(p), p[:n])
}

func handleMessage(p []byte, dir string) {
	if len(p) < 3 {
		return
	}
	if p[0] != 0xF3 {
		dumpFail("sem assinatura 0xF3", p)
		return
	}
	if p[1]&0x80 != 0 {
		dbg(fmt.Sprintf("mensagem criptografada %s msgType=%d", dir, p[1]&0x7F))
		if encDumped < 12 && logFile != nil {
			encDumped++
			n := len(p)
			if n > 160 {
				n = 160
			}
			fmt.Fprintf(logFile, "ENC %s len=%d hex=%x\n", dir, len(p), p[:n])
		}
		return
	}
	mt := p[1] & 0x7F
	r := &rd{b: p, p: 2}
	switch mt {
	case 2: // request
		op := r.u8()
		params := r.params()
		if r.bad {
			dumpFail("REQ inválido", p)
			return
		}
		emit("REQ", int(op), dir, params)
	case 3, 7: // response (algumas versões do Albion usam o tipo 7)
		op := r.u8()
		r.u16() // returnCode
		r.value(r.u8())
		params := r.params()
		if r.bad {
			dumpFail("RESP inválido", p)
			return
		}
		emit("RESP", int(op), dir, params)
	case 4: // event
		code := r.u8()
		params := r.params()
		if r.bad {
			dumpFail("EVENT inválido", p)
			return
		}
		emit("EVENT", int(code), dir, params)
	default:
		dbg(fmt.Sprintf("msgType %d ignorado", mt))
	}
}

func handlePhoton(pl []byte, dir string) {
	off := 0
	// um datagrama UDP pode conter vários pacotes Photon em sequência
	for off+12 <= len(pl) {
		flags := pl[off+2]
		if flags == 1 { // pacote inteiro criptografado: o Albion Data Project também só ignora
			dbg("pacote criptografado ignorado")
			return
		}
		hdr := 12
		if flags == 0xCC { // CRC ligado: 4 bytes extras depois do cabeçalho
			hdr = 16
		}
		if off+hdr > len(pl) {
			return
		}
		cmdCount := int(pl[off+3])
		pos := off + hdr
		ok := true
		for i := 0; i < cmdCount; i++ {
			if pos+12 > len(pl) {
				ok = false
				break
			}
			ctype := pl[pos]
			clen := int(int32(binary.BigEndian.Uint32(pl[pos+4:])))
			if clen < 12 || pos+clen > len(pl) {
				ok = false
				break
			}
			dbg(fmt.Sprintf("comando tipo %d", ctype))
			body := pl[pos+12 : pos+clen]
			switch ctype {
			case 6: // reliable
				handleMessage(body, dir)
			case 7: // unreliable (4 bytes extra de sequência)
				if len(body) > 4 {
					handleMessage(body[4:], dir)
				}
			case 8: // fragmento
				if len(body) >= 20 {
					startSeq := int32(binary.BigEndian.Uint32(body[0:]))
					fcount := int(int32(binary.BigEndian.Uint32(body[4:])))
					fnum := int32(binary.BigEndian.Uint32(body[8:]))
					total := int(int32(binary.BigEndian.Uint32(body[12:])))
					foff := int(int32(binary.BigEndian.Uint32(body[16:])))
					data := body[20:]
					if total <= 0 || total > 1<<22 || foff < 0 || foff+len(data) > total {
						break
					}
					f := fragments[startSeq]
					if f == nil {
						if len(fragments) > 200 {
							fragments = map[int32]*frag{}
						}
						f = &frag{count: fcount, data: make([]byte, total), seen: map[int32]bool{}}
						fragments[startSeq] = f
					}
					if !f.seen[fnum] {
						f.seen[fnum] = true
						copy(f.data[foff:], data)
						f.got++
					}
					if f.got >= f.count {
						delete(fragments, startSeq)
						handleMessage(f.data, dir)
					}
				}
			}
			pos += clen
		}
		if !ok {
			dbg("pacote Photon malformado")
			return
		}
		off = pos
	}
}

// ---------------------------------------------------------------------------
// Ficha (JSON para o site) e área de transferência
// ---------------------------------------------------------------------------

var got150 int32 // 1 = a lista de níveis do Destiny Board (evento 150) já chegou

type capMsg struct {
	kind   string
	code   int
	dir    string
	params map[byte]interface{}
}

var (
	captured  []capMsg           // mensagens Photon decodificadas durante a captura
	msgCounts = map[string]int{} // quantas vezes cada (tipo, código) apareceu
	logPath   string
)

// nodeLevels extrai do login o nível de cada nó do Destiny Board do próprio jogador:
// evento 150 (parâmetro 2 = IDs dos nós em int16, parâmetro 3 = níveis em bytes).
// Confirmado numa captura real: 301 nós, níveis de 0 a 105.
func nodeLevels(msgs []capMsg) map[int]int {
	for _, m := range msgs {
		if m.kind != "EVENT" || fmt.Sprint(m.params[252]) != "150" {
			continue
		}
		ids, ok1 := m.params[2].([]int16)
		lv, ok2 := m.params[3].([]byte)
		if !ok1 || !ok2 || len(ids) != len(lv) || len(ids) == 0 {
			continue
		}
		out := make(map[int]int, len(ids))
		for i, id := range ids {
			out[int(id)] = int(lv[i])
		}
		return out
	}
	return nil
}

// applyNodes grava na ficha (formato do site) os níveis dos nós conhecidos (nodeMap, em nodes.go).
// Só mexe nos itens que vieram no login; maestria e o resto da ficha ficam como estavam.
// Devolve quantos itens foram atualizados.
func applyNodes(ficha map[string]interface{}, lv map[int]int) int {
	child := func(parent map[string]interface{}, k string) map[string]interface{} {
		m, _ := parent[k].(map[string]interface{})
		if m == nil {
			m = map[string]interface{}{}
			parent[k] = m
		}
		return m
	}
	setMastery := func(ref nodeRef, v int) {
		if ref.store == "armas" {
			child(ficha, "armas")[ref.grp] = float64(v)
			return
		}
		child(child(ficha, ref.store), ref.grp)["m"] = float64(v)
	}
	found := 0
	hasItem := map[string]bool{} // ramos que tiveram algum item no login
	for id, ref := range nodeMap {
		v, ok := lv[id]
		if !ok {
			continue // nó ausente do login: não mexe (tratado abaixo se for maestria)
		}
		if ref.store == "armas" || ref.key == "m" {
			setMastery(ref, v)
			found++
			continue
		}
		grp := child(child(ficha, ref.store), ref.grp)
		if _, has := grp["m"]; !has && (ref.store == "sp" || ref.store == "craft" || ref.store == "refino") {
			grp["m"] = float64(0)
		}
		st := child(grp, "s")
		if v > 0 {
			st[ref.key] = float64(v)
		} else {
			delete(st, ref.key) // o site também apaga o item quando o nível é 0
		}
		hasItem[ref.store+"|"+ref.grp] = true
		found++
	}
	// O login não manda o nível de quem está no máximo: maestria ausente num ramo que
	// já tem itens liberados = maestria 100/100.
	for id, ref := range nodeMap {
		if _, ok := lv[id]; ok {
			continue
		}
		if (ref.store == "armas" || ref.key == "m") && hasItem[map[bool]string{true: "sp", false: ref.store}[ref.store == "armas"]+"|"+map[bool]string{true: "c:" + ref.grp, false: ref.grp}[ref.store == "armas"]] {
			setMastery(ref, 100)
		}
	}
	// Tiers (coleta/refino) ausentes mas com um tier acima presente = tier no máximo
	// (Iniciante T3 é 1/1; os demais 100/100).
	maxTier := map[string]int{}
	for id, ref := range nodeMap {
		if _, ok := lv[id]; !ok || (ref.store != "coleta" && ref.store != "refino") {
			continue
		}
		if t, err := strconv.Atoi(ref.key); err == nil && t > maxTier[ref.store+"|"+ref.grp] {
			maxTier[ref.store+"|"+ref.grp] = t
		}
	}
	// T2 não é um nó por recurso: o Coletor Aprendiz (T1) libera as ferramentas de grau 2 de todos os
	// recursos e o Refinador Iniciante (T2) vale para todos os refinos, ambos 1/1.
	for k, mt := range maxTier {
		p := strings.SplitN(k, "|", 2)
		if p[1] == "pesca" || (p[0] == "coleta" && mt < 3) || (p[0] == "refino" && mt < 4) {
			continue
		}
		st := child(child(child(ficha, p[0]), p[1]), "s")
		if _, has := st["2"]; !has {
			st["2"] = float64(1)
		}
	}
	for id, ref := range nodeMap {
		if _, ok := lv[id]; ok || (ref.store != "coleta" && ref.store != "refino") {
			continue
		}
		t, err := strconv.Atoi(ref.key)
		if err != nil || t >= maxTier[ref.store+"|"+ref.grp] {
			continue
		}
		v := 100
		if ref.store == "coleta" && t == 3 {
			v = 1
		}
		grp := child(child(ficha, ref.store), ref.grp)
		child(grp, "s")[ref.key] = float64(v)
	}
	return found
}

// fichaFromCapture: lê a ficha-base (o "Copiar código" do site, salvo em ficha-base.txt ao lado
// do .exe) e atualiza nela os ramos conhecidos. SEM a ficha-base devolve found=0: uma ficha
// montada só com os ramos já descobertos apagaria o resto da sua ficha ao colar no site.
func fichaFromCapture(msgs []capMsg) (map[string]interface{}, int, string) {
	lv := nodeLevels(msgs)
	if lv == nil {
		return nil, 0, "os níveis do Destiny Board não apareceram na captura"
	}
	var ficha map[string]interface{}
	raw, err := os.ReadFile(outPath("ficha-base.txt"))
	if err != nil {
		// Sem ficha-base: parte de uma ficha vazia (para quem ainda não criou a ficha no site).
		fmt.Println("[i] ficha-base.txt não encontrado: usando uma ficha NOVA. Se você já tem ficha no site,")
		fmt.Println("    ela será substituída ao colar. Para manter, salve o 'Copiar código' do site em ficha-base.txt.")
		ficha = map[string]interface{}{
			"v": float64(3), "nome": flagNome,
			"armas":     map[string]interface{}{},
			"armaduras": map[string]interface{}{"placa": float64(0), "couro": float64(0), "pano": float64(0)},
			"coleta":    map[string]interface{}{}, "refino": map[string]interface{}{}, "craft": map[string]interface{}{},
			"cozinha":  map[string]interface{}{"m": float64(0), "s": map[string]interface{}{}},
			"alquimia": map[string]interface{}{"m": float64(0), "s": map[string]interface{}{}},
			"sp":       map[string]interface{}{},
		}
	} else {
		js, derr := base64.StdEncoding.DecodeString(strings.TrimSpace(string(raw)))
		if derr != nil {
			return nil, 0, "ficha-base.txt não é um código válido do site"
		}
		if uerr := json.Unmarshal(js, &ficha); uerr != nil || ficha["armas"] == nil {
			return nil, 0, "ficha-base.txt não é uma ficha válida do site"
		}
	}
	n := applyNodes(ficha, lv)
	if n == 0 {
		return nil, 0, "nenhum ramo conhecido apareceu completo na captura"
	}
	return ficha, n, ""
}

func copyToClipboard(s string) error {
	cmd := exec.Command("clip")
	cmd.Stdin = strings.NewReader(s)
	return cmd.Run()
}

func waitEnter(msg string) {
	fmt.Print(msg)
	bufio.NewReader(os.Stdin).ReadString('\n')
}

// outPath coloca os arquivos de saída ao lado do .exe (e não em C:\Windows\System32
// quando o programa se reabre como Administrador).
func outPath(name string) string {
	if filepath.IsAbs(name) {
		return name
	}
	if exe, err := os.Executable(); err == nil && !strings.Contains(exe, "go-build") {
		return filepath.Join(filepath.Dir(exe), name)
	}
	return name
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

func main() {
	portsFlag := flag.String("ports", "5055,5056,5058", "portas UDP do Albion (separadas por vírgula)")
	flag.StringVar(&flagFind, "find", "", "mostra só mensagens cujos valores contenham este texto (ex: COMBAT_)")
	flag.StringVar(&flagNome, "nome", "FumaHeLL", "nome do personagem na ficha (usado só se não houver ficha-base.txt)")
	flag.BoolVar(&flagRaw, "v", false, "mostra todos os parâmetros de cada mensagem")
	dump := flag.String("out", "", "opcional, só para depuração: salva o log completo das mensagens (padrão: não salva)")
	ipFlag := flag.String("ip", "", "IP local da placa de rede a escutar (padrão: detecta sozinho)")
	secs := flag.Int("secs", 900, "duração da captura em segundos")
	janela := flag.Bool("janela", false, "modo avulso: abre a janela e captura sem o botão do site")
	pai := flag.Bool("pai", false, "interno: aberto pelo próprio programa (modo do botão do site)")
	flag.Parse()
	for _, a := range flag.Args() {
		if strings.HasPrefix(a, protoScheme+"://") {
			webMode = true
			retURL = parseReturnURL(a)
		}
	}
	if webMode && tryUpdate() {
		return // atualizou e abriu a versão nova
	}
	if !webMode && !*janela {
		installSelf() // primeira vez: copia o programa para o lugar fixo e registra o botão do site
		return
	}

	if !amIAdmin() {
		fmt.Println("[!] Solicitando permissão de Administrador...")
		requestAdminPermission()
		return
	}

	ports := map[uint16]bool{}
	for _, s := range strings.Split(*portsFlag, ",") {
		if n, err := strconv.Atoi(strings.TrimSpace(s)); err == nil {
			ports[uint16(n)] = true
		}
	}

	fmt.Println("==========================================================")
	fmt.Println("   Sniffer Albion — Raw UDP + decodificador Photon (P18)  ")
	fmt.Println("==========================================================")

	// Lista os IPs IPv4 de todas as placas (ajuda a achar a placa certa)
	fmt.Println("[i] Placas de rede (IPv4) encontradas:")
	if ifaces, e := net.Interfaces(); e == nil {
		for _, ifc := range ifaces {
			if ifc.Flags&net.FlagUp == 0 {
				continue
			}
			addrs, _ := ifc.Addrs()
			for _, a := range addrs {
				if ipn, ok := a.(*net.IPNet); ok && ipn.IP.To4() != nil {
					fmt.Printf("      - %-30s %s\n", ifc.Name, ipn.IP)
				}
			}
		}
	}

	var localIP net.IP
	if *ipFlag != "" {
		localIP = net.ParseIP(*ipFlag)
		if localIP == nil || localIP.To4() == nil {
			fatalBox(fmt.Sprint("IP inválido em -ip: ", *ipFlag))
		}
		fmt.Printf("[+] Usando o IP informado: %s\n", localIP)
	} else {
		connIP, err := net.Dial("udp", "8.8.8.8:80")
		if err != nil {
			fatalBox(fmt.Sprint("Sem conexão com a internet:", err))
		}
		localIP = connIP.LocalAddr().(*net.UDPAddr).IP
		connIP.Close()
		fmt.Printf("[+] IP detectado automaticamente: %s (se estiver errado, use -ip SEU_IP)\n", localIP)
	}

	fd, err := syscall.Socket(syscall.AF_INET, syscall.SOCK_RAW, syscall.IPPROTO_IP)
	if err != nil {
		fatalBox(fmt.Sprint("Erro ao criar socket:", err))
	}

	var addr [4]byte
	copy(addr[:], localIP.To4())
	if err = syscall.Bind(fd, &syscall.SockaddrInet4{Port: 0, Addr: addr}); err != nil {
		fatalBox(fmt.Sprint("Erro no bind:", err))
	}

	const SIO_RCVALL = 0x98000001
	in := []byte{1, 0, 0, 0}
	out := make([]byte, 4)
	var ret uint32
	if err = syscall.WSAIoctl(fd, SIO_RCVALL, &in[0], 4, &out[0], 4, &ret, nil, 0); err != nil {
		fatalBox(fmt.Sprint("Falha ao ativar SIO_RCVALL:", err))
	}

	// Contadores de diagnóstico
	var total, udpAll, udpAlbion, photonOK, recvErrs uint64
	var lastErr atomic.Value
	var active, stopped int32 // active: 1 = decodificando; stopped: 1 = encerrando

	// A leitura do socket roda em segundo plano desde já (para esvaziar o buffer),
	// mas só decodifica depois que o usuário apertar ENTER.
	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 65535)
		rawDumped := 0
		for {
			// WSARecv é a chamada correta para ler de um socket no Windows
			wb := syscall.WSABuf{Len: uint32(len(buf)), Buf: &buf[0]}
			var recvd, rflags uint32
			if rerr := syscall.WSARecv(fd, &wb, 1, &recvd, &rflags, nil, nil); rerr != nil {
				if atomic.LoadInt32(&stopped) == 1 {
					return
				}
				atomic.AddUint64(&recvErrs, 1)
				lastErr.Store(rerr.Error())
				time.Sleep(10 * time.Millisecond)
				continue
			}
			if atomic.LoadInt32(&active) == 0 {
				continue
			}
			n := int(recvd)
			atomic.AddUint64(&total, 1)
			if n < 28 {
				continue
			}
			if buf[0]>>4 != 4 || buf[9] != 17 { // só IPv4 + UDP
				continue
			}
			atomic.AddUint64(&udpAll, 1)

			ihl := int(buf[0]&0x0F) * 4 // tamanho real do cabeçalho IP
			if n < ihl+8 {
				continue
			}
			src := binary.BigEndian.Uint16(buf[ihl:])
			dst := binary.BigEndian.Uint16(buf[ihl+2:])
			if !ports[src] && !ports[dst] {
				continue
			}
			atomic.AddUint64(&udpAlbion, 1)

			udpLen := int(binary.BigEndian.Uint16(buf[ihl+4:]))
			end := ihl + udpLen
			if end > n || udpLen < 8 {
				end = n
			}
			payload := make([]byte, end-(ihl+8))
			copy(payload, buf[ihl+8:end])

			dir := "C→S"
			if ports[src] {
				dir = "S→C"
			}
			// Os primeiros pacotes brutos vão para o log (para conferir o formato)
			if rawDumped < 15 && logFile != nil {
				rawDumped++
				ln := len(payload)
				if ln > 96 {
					ln = 96
				}
				fmt.Fprintf(logFile, "RAW %s %d->%d len=%d hex=%x\n", dir, src, dst, len(payload), payload[:ln])
			}
			atomic.AddUint64(&photonOK, 1)
			handlePhoton(payload, dir)
		}
	}()

	uiURL, uiOK := startUI(!webMode)
	startTray("Ficha do Albion: aguardando você entrar no jogo", "Aguardando você entrar no jogo")
	fmt.Println("==========================================================")
	if uiOK {
		fmt.Println("  A janela do programa abriu no navegador:", uiURL)
		fmt.Println("  Abra o Albion e entre com o personagem. Eu detecto o login sozinho.")
		fmt.Println("  (Esta janela preta some sozinha; use o botão da página para fechar.)")
	} else {
		fmt.Println("  Abra o Albion e entre com o personagem. Eu detecto o login sozinho.")
	}
	fmt.Println("==========================================================")

	if *dump != "" {
		logPath = outPath(*dump)
		if f, ferr := os.Create(logPath); ferr == nil {
			logFile = f
		} else {
			fmt.Println("[!] Não consegui criar o arquivo de log:", ferr)
		}
	}
	atomic.StoreInt32(&active, 1)
	fmt.Printf("[▶] Aguardando o login no jogo (até %d s)...\n", *secs)

	start := time.Now()
	deadline := time.After(time.Duration(*secs) * time.Second)
	tk := time.NewTicker(500 * time.Millisecond)
	ticks := 0
	var doneAt time.Time
wait:
	for {
		select {
		case <-tk.C:
			// Assim que a lista de níveis chega, espera 2 s (para o resto do pacote) e encerra.
			if atomic.LoadInt32(&got150) == 1 {
				if doneAt.IsZero() {
					doneAt = time.Now()
					fmt.Println("[✓] Níveis do Destiny Board recebidos. Finalizando...")
					ui.update(func() { ui.Stage = "recebido" })
					setTray("Ficha do Albion: lendo os níveis", "Lendo os níveis do Destiny Board")
				} else if time.Since(doneAt) >= 2*time.Second {
					break wait
				}
			}
			ticks++
			if ticks%10 != 0 { // diagnóstico a cada 5 s
				continue
			}
			left := *secs - int(time.Since(start).Seconds())
			if left < 0 {
				left = 0
			}
			fmt.Printf("[diag] faltam %ds | pacotes IP=%d | UDP=%d | UDP nas portas do Albion=%d | enviados ao decodificador=%d | erros de leitura=%d\n",
				left, atomic.LoadUint64(&total), atomic.LoadUint64(&udpAll),
				atomic.LoadUint64(&udpAlbion), atomic.LoadUint64(&photonOK),
				atomic.LoadUint64(&recvErrs))
			if e, ok := lastErr.Load().(string); ok && e != "" {
				fmt.Printf("[diag] último erro de leitura: %s\n", e)
			}
		case <-deadline:
			ui.update(func() { ui.Stage = "tempo" })
			if webMode {
				fatalBox("Os níveis do Destiny Board não apareceram. Clique em \"Buscar do Albion\" de novo no site e depois entre no personagem.")
			}
			break wait
		}
	}
	tk.Stop()

	// Encerra a captura: fechar o socket destrava a leitura em andamento
	atomic.StoreInt32(&active, 0)
	atomic.StoreInt32(&stopped, 1)
	syscall.Closesocket(fd)
	select {
	case <-done:
	case <-time.After(3 * time.Second):
	}

	fmt.Printf("[■] Captura finalizada. Mensagens Photon decodificadas: %d\n", len(captured))
	fmt.Printf("[diag] final: pacotes IP=%d | UDP=%d | UDP nas portas do Albion=%d | enviados ao decodificador=%d | erros de leitura=%d\n",
		atomic.LoadUint64(&total), atomic.LoadUint64(&udpAll),
		atomic.LoadUint64(&udpAlbion), atomic.LoadUint64(&photonOK), atomic.LoadUint64(&recvErrs))

	// Resumo por tipo/código de mensagem e contadores internos (ajuda a achar as specs e a depurar)
	keys := make([]string, 0, len(msgCounts))
	for k := range msgCounts {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	fmt.Println("[i] Resumo do decodificador:")
	for _, k := range keys {
		if strings.HasPrefix(k, "dbg ") {
			fmt.Printf("      %s = %d\n", k, msgCounts[k])
		}
	}
	if logFile != nil {
		fmt.Fprintln(logFile, "\n===== RESUMO (tipo código = quantidade) =====")
		for _, k := range keys {
			fmt.Fprintf(logFile, "%s = %d\n", k, msgCounts[k])
		}
		logFile.Sync()
		logFile.Close()
		fmt.Printf("[✓] Log salvo em: %s\n", logPath)
	}

	// Níveis dos nós do Destiny Board (só os do próprio jogador; nada de outros jogadores)
	if lv := nodeLevels(captured); lv != nil {
		nos := make(map[string]int, len(lv))
		for id, n := range lv {
			nos[strconv.Itoa(id)] = n
		}
		if js, e := json.Marshal(map[string]interface{}{"nos": nos}); e == nil {
			if e = os.WriteFile(outPath("niveis.json"), js, 0o644); e == nil {
				fmt.Printf("[✓] Níveis de %d nós do Destiny Board salvos em: %s\n", len(nos), outPath("niveis.json"))
			}
		}
	} else {
		fmt.Println("[!] Os níveis do Destiny Board não apareceram (comece a captura na seleção de personagem).")
	}

	// Ficha para o site
	ficha, found, why := fichaFromCapture(captured)
	nNos := 0
	if lv := nodeLevels(captured); lv != nil {
		nNos = len(lv)
	}
	if found > 0 {
		js, _ := json.Marshal(ficha)
		code := base64.StdEncoding.EncodeToString(js)
		_ = os.WriteFile(outPath("ficha.json"), js, 0o644)
		_ = os.WriteFile(outPath("ficha.txt"), []byte(code), 0o644)
		// A ficha nova vira a base da próxima vez: o que você preencheu no site (nome, cozinha, etc.)
		// não se perde e você não precisa copiar o código do site de novo.
		_ = os.WriteFile(outPath("ficha-base.txt"), []byte(code), 0o644)
		if cerr := copyToClipboard(code); cerr != nil {
			fmt.Println("[!] Não consegui copiar automaticamente; o código está em", outPath("ficha.txt"))
		} else {
			ramos := map[string]int{}
			for _, k := range []string{"armas", "sp", "craft", "coleta", "refino"} {
				if m, ok := ficha[k].(map[string]interface{}); ok && len(m) > 0 {
					ramos[k] = len(m)
				}
			}
			ui.update(func() {
				ui.Stage, ui.Nos, ui.Found, ui.Copied, ui.Ramos, ui.code = "pronto", nNos, found, true, ramos, code
			})
			setTray("Ficha do Albion: ficha copiada", "Ficha copiada")
			balloonTray("Ficha copiada", "Cole no site: Minha ficha, Colar ficha.")
			if webMode {
				saveResult(js)
				balloonTray("Ficha pronta", "Abrindo o site com os níveis do seu Destiny Board.")
				time.Sleep(1500 * time.Millisecond)
				if !*pai { // aberto direto como administrador: abre o site daqui mesmo
					if frag, e := os.ReadFile(resultPath()); e == nil {
						openURL(retURL + "#ficha=" + string(frag))
					}
				}
				exitNow(0)
			}
			fmt.Printf("[✓] %d níveis atualizados na sua ficha. Código COPIADO.\n", found)
			fmt.Println("    No site: Minha ficha > Colar ficha > Ctrl+V > Usar esta ficha.")
			fmt.Println("    (Só os ramos já mapeados foram atualizados; o resto ficou como na ficha-base.)")
		}
	} else {
		ui.update(func() {
			if ui.Stage != "tempo" {
				ui.Stage, ui.Nos, ui.Why = "vazio", nNos, why
			}
		})
		if webMode {
			fatalBox("Nada foi enviado ao site: " + why)
		}
		fmt.Println("[!] Nada foi copiado:", why)
		fmt.Println("    (assim a sua ficha atual no site não é sobrescrita por uma vazia ou parcial).")
	}

	if uiOK {
		fmt.Println("\nPronto. Use a janela do navegador.")
		select {} // a página local continua no ar; o botão "Fechar programa" encerra
	}
	waitEnter("\nPressione ENTER para fechar... ")
}
