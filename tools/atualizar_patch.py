#!/usr/bin/env python3
"""Atualiza data/patches.json com as notas oficiais de patch do Albion Online.
Fonte: fórum oficial, quadro Patch Notes (https://forum.albiononline.com/index.php/Board/114-Patch-Notes/). Cada patch tem duas
publicações: as notas gerais ("[2. November 2026] Dragonfire Patch 4") e o equilíbrio de combate ("... Combat Balance Changes - ...").
O texto fica em inglês (o original); o que já foi traduzido à mão (campo "curado": true) nunca é sobrescrito.
Se algo falhar ou não vier nada legível, NÃO sobrescreve o arquivo atual e sai com erro."""
import json, re, sys, os, time, datetime, urllib.request, urllib.parse
from html.parser import HTMLParser

BOARD = "https://forum.albiononline.com/index.php/Board/114-Patch-Notes/"
HOST = "https://forum.albiononline.com"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9"}
OUT = "data/patches.json"
MAX_PATCHES = 8       # quantos patches recentes da lista são lidos
SEMPRE_RELER = 3      # os mais novos são relidos sempre (a Sandbox edita as notas depois de publicar)
MESES = {m: i + 1 for i, m in enumerate("January February March April May June July August September October November December".split())}

def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i == tries - 1: raise
            time.sleep(4 * (i + 1))

# ---------- lista do quadro ----------
def listar(html):
    """Devolve {id_do_patch: {"titulo", "data", "geral": url, "combate": url, "tid"}}; título e data vêm do endereço da publicação."""
    achados = {}
    for m in re.finditer(r'href="((?:https://forum\.albiononline\.com)?/index\.php/Thread/(\d+)-([^/"?#]+)/?)', html):
        url, tid, slug = m.group(1), int(m.group(2)), urllib.parse.unquote(m.group(3)).replace("​", "")
        s = re.match(r"(\d{1,2})-([A-Za-z]+)-(\d{4})-(.+)$", slug)
        if not s or s.group(2) not in MESES: continue
        titulo = s.group(4).replace("-", " ").strip()
        combate = titulo.lower().startswith("combat balance changes ")
        if combate: titulo = titulo[len("combat balance changes "):].strip()
        if not titulo: continue
        data = "%s-%02d-%02d" % (s.group(3), MESES[s.group(2)], int(s.group(1)))
        pid = re.sub(r"[^a-z0-9]+", "-", titulo.lower()).strip("-")
        g = achados.setdefault(pid, {"titulo": titulo, "data": data, "tid": 0})
        g["tid"] = max(g["tid"], tid)
        g["combate" if combate else "geral"] = url if url.startswith("http") else HOST + url
    return achados

# ---------- leitor do texto de uma publicação ----------
class Corpo(HTMLParser):
    """Lê o primeiro <div class="messageText"> e devolve eventos: ("titulo",t) ("b",t) ("txt",t) ("li",nivel,t)."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.dentro = 0; self.div = 0; self.ul = 0; self.b = 0; self.span_titulo = 0
        self.buf = []; self.buf_b = True; self.ev = []; self.feito = False
    def tem_classe(self, attrs):
        return "messageText" in (dict(attrs).get("class") or "").split()
    def flush(self):
        t = re.sub(r"\s+", " ", "".join(self.buf)).strip(); só_b = self.buf_b; self.buf = []; self.buf_b = True
        if not t or not self.dentro or self.feito: return
        if self.span_titulo and not self.ev: self.ev.append(("titulo", t))
        elif self.ul > 0: self.ev.append(("li", self.ul, t))
        elif só_b: self.ev.append(("b", t))
        else: self.ev.append(("txt", t))
    def handle_starttag(self, tag, attrs):
        if tag == "div":
            if self.dentro: self.div += 1
            elif self.tem_classe(attrs) and not self.feito: self.dentro = 1; self.div = 1
            return
        if not self.dentro: return
        if tag == "br": self.flush()
        elif tag == "ul": self.flush(); self.ul += 1
        elif tag == "li": self.flush()
        elif tag == "b" or tag == "strong": self.b += 1
        elif tag == "span" and "font-size" in (dict(attrs).get("style") or "") and not self.ev: self.span_titulo += 1
    def handle_endtag(self, tag):
        if not self.dentro: return
        if tag == "div":
            self.div -= 1
            if self.div <= 0: self.flush(); self.dentro = 0; self.feito = True
        elif tag == "ul": self.flush(); self.ul = max(0, self.ul - 1)
        elif tag == "li": self.flush()
        elif tag == "b" or tag == "strong": self.b = max(0, self.b - 1)
        elif tag == "span" and self.span_titulo: self.flush(); self.span_titulo = 0
    def handle_data(self, d):
        if not self.dentro or self.feito: return
        if d.strip() and not self.b: self.buf_b = False
        self.buf.append(d)

def eventos(html):
    p = Corpo(); p.feed(html); p.flush()
    return p.ev

def cabecalho(ev):
    """('Dragonfire Patch 4', '32.040.1', '2026-11-02') a partir da primeira linha da publicação."""
    for k, *r in ev:
        if k == "titulo":
            t = r[0]; m = re.search(r"Version\s+([\d.]+)\s*-\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})", t)
            if m and m.group(2) in MESES:
                return m.group(1), "%s-%02d-%02d" % (m.group(4), MESES[m.group(2)], int(m.group(3)))
            return None, None
    return None, None

# ---------- equilíbrio de combate ----------
SETA = re.compile(r"\s*(?:→|->)\s*")
def linha(txt):
    if SETA.search(txt):
        esq, _, dir_ = txt.partition("→") if "→" in txt else txt.partition("->")
        esq, dir_ = esq.strip(), dir_.strip()
        if ":" in esq:
            r, _, de = esq.rpartition(":"); return {"r": r.strip(), "de": de.strip(), "para": dir_}
        m = re.match(r"^(.*?)\s+(\S+)$", esq)
        return {"r": m.group(1) if m else "", "de": m.group(2) if m else esq, "para": dir_}
    if ":" in txt:
        r, _, t = txt.partition(":"); return {"r": r.strip(), "texto": t.strip()}
    return {"r": txt, "texto": ""}

MENOR_E_MELHOR = re.compile(r"cooldown|cast time|stand time|cost|energy|delay|recharge|windup|animation|duration of (?:the )?(?:debuff|cd)", re.I)
def num(s):
    m = re.search(r"-?\d+(?:[.,]\d+)?", (s or "").replace(" ", "")); return float(m.group(0).replace(",", ".")) if m else None
def classificar(linhas):
    """Palpite automático: sobe o que é bom, desce o que é custo ou espera. Empate ou sem números = 'mudou'."""
    pts = 0
    for l in linhas:
        a, b = num(l.get("de")), num(l.get("para"))
        if a is None or b is None or a == b: continue
        sobe = b > a; melhor = (not sobe) if MENOR_E_MELHOR.search(l.get("r", "")) else sobe
        pts += 1 if melhor else -1
    return "buff" if pts > 0 else "nerf" if pts < 0 else "mudou"

PAR = re.compile(r"^(.*?)\s*\(([^()]+)\)\s*$")
def combate(ev):
    cats = []; cat = None; pend = []; reinicia = False; atual = None
    for e in ev:
        k = e[0]
        if k == "b":
            cat = {"cat": e[1], "itens": []}; cats.append(cat); pend = []; reinicia = False; atual = None
        elif k == "txt":
            if cat is None: continue
            if reinicia: pend = []; reinicia = False
            pend.append(e[1])
        elif k == "li" and cat is not None:
            niv, t = e[1], e[2]
            if niv == 1:
                m = PAR.match(t); hab, item = (m.group(1), m.group(2)) if m else (t, cat["cat"])
                if not m: hab, item = "", t
                atual = {"item": item, "hab": hab, "tipo": "mudou", "auto": True, "nota": " ".join(pend), "linhas": []}
                cat["itens"].append(atual); pend = []; reinicia = True
            elif atual is not None and niv == 2:
                atual["linhas"].append(linha(t))
            elif atual is not None and niv >= 3:
                ult = atual["linhas"][-1] if atual["linhas"] else None
                if ult and "texto" in ult: ult["texto"] = (ult["texto"] + " · " + t).strip(" ·")
                else: atual["linhas"].append({"r": "", "texto": t})
    itens = [g for g in cats if g["itens"]]
    for g in itens:
        for it in g["itens"]: it["tipo"] = classificar(it["linhas"])
    return itens

# ---------- notas gerais ----------
def simbolo(t):
    if SETA.search(t):
        a, b = None, None
        m = re.search(r"(-?\d+(?:[.,]\d+)?)[^→\d-]*(?:→|->)\s*(-?\d+(?:[.,]\d+)?)", t)
        if m: a, b = float(m.group(1).replace(",", ".")), float(m.group(2).replace(",", "."))
        if a is not None and b is not None and a != b: return "▲" if b > a else "▼"
    if re.search(r"\b(reduced|decreased|lowered|less frequent|nerfed|can no longer)\b", t, re.I): return "▼"
    if re.search(r"\b(increased|improved|more frequent|extended|buffed|faster)\b", t, re.I): return "▲"
    if re.search(r"\b(added|new|now)\b", t, re.I): return "!"
    return "•"

PLAT = re.compile(r"^\[([A-Za-z0-9 ]+)\]\s*(.*)$")
def geral(ev):
    secoes = []; fixes = []; sec = None; grupo = None; em_fixes = False; pai = None
    for e in ev:
        k = e[0]
        if k == "titulo": continue
        if k == "b" or (k == "txt" and em_fixes and e[1].endswith(":") and len(e[1]) < 40):
            t = e[1].rstrip(":").strip()
            if re.match(r"^Fixes$", t, re.I): em_fixes = True; grupo = None; sec = None; continue
            if em_fixes:
                grupo = {"grupo": re.sub(r"\s*Fixes$", "", t) or t, "itens": []}; fixes.append(grupo); continue
            if re.search(r"Combat Balance", t, re.I): sec = None; continue
            titulo = t; sec = {"id": re.sub(r"[^a-z0-9]+", "-", titulo.lower()).strip("-"), "titulo": titulo, "intro": "", "itens": []}
            secoes.append(sec); pai = None; continue
        if k == "txt":
            if sec is not None and not sec["itens"] and len(sec["intro"]) < 900: sec["intro"] = (sec["intro"] + " " + e[1]).strip()
            continue
        if k == "li":
            niv, t = e[1], e[2]
            if em_fixes and grupo is not None:
                m = PLAT.match(t); grupo["itens"].append({"p": m.group(1), "t": m.group(2)} if m else {"t": t}); continue
            if sec is None: continue
            if niv == 1: sec["itens"].append([simbolo(t), t]); pai = sec["itens"][-1]
            else:
                if pai is not None and pai[1] and not pai[1].endswith("::"):
                    # o item de cima vira o prefixo dos filhos (ex.: "Spirit Weaver" → "Spirit Weaver: Drowsy Essence ...")
                    if pai in sec["itens"]: sec["itens"].remove(pai); pai.append("x")
                    sec["_pre"] = pai[1]
                sec["itens"].append([simbolo(t), (sec.get("_pre", "") + ": " if sec.get("_pre") else "") + t])
    for s in secoes: s.pop("_pre", None)
    for s in secoes:
        if not s["intro"]: s.pop("intro")
    return [s for s in secoes if s["itens"] or s.get("intro")], [g for g in fixes if g["itens"]]

# ---------- montagem ----------
def montar(pid, g, htmls):
    p = {"id": pid, "titulo": g["titulo"], "data": g["data"], "idioma": "en", "curado": False, "links": {"oficial": BOARD}}
    if g.get("geral"): p["links"]["geral"] = g["geral"]
    if g.get("combate"): p["links"]["combate"] = g["combate"]
    ver = None
    bal, secoes, fixes = [], [], []
    if "geral" in htmls:
        ev = eventos(htmls["geral"]); v, d = cabecalho(ev); ver = ver or v
        if d: p["data"] = d
        secoes, fixes = geral(ev)
    if "combate" in htmls:
        ev = eventos(htmls["combate"]); v, d = cabecalho(ev); ver = ver or v
        bal = combate(ev)
    if ver: p["versao"] = ver
    n = sum(len(x["itens"]) for x in bal)
    p["resumo"] = ("%d mudanças de combate e %d atualizações de conteúdo. " % (n, len(secoes)) if bal or secoes else "") + "Texto original em inglês."
    if bal: p["balance"] = bal
    if secoes: p["secoes"] = secoes
    if fixes: p["fixes"] = fixes
    return p, n + len(secoes) + sum(len(f["itens"]) for f in fixes)

def main():
    atual = json.load(open(OUT, encoding="utf-8")) if os.path.exists(OUT) else {"patches": []}
    existentes = {p["id"]: p for p in atual["patches"]}
    achados = listar(get(BOARD))
    if not achados: print("::error::nenhum patch na lista do fórum (o endereço ou o layout mudou?)"); sys.exit(1)
    recentes = sorted(achados.items(), key=lambda kv: -kv[1]["tid"])[:MAX_PATCHES]
    novos = {}; lidos = 0
    for i, (pid, g) in enumerate(recentes):
        if existentes.get(pid, {}).get("curado"): continue
        if pid in existentes and i >= SEMPRE_RELER: continue
        htmls = {}
        for tipo in ("geral", "combate"):
            if g.get(tipo): htmls[tipo] = get(g[tipo]); time.sleep(1.5)
        p, qtd = montar(pid, g, htmls)
        if qtd == 0: print("aviso: nada legível em", pid); continue
        novos[pid] = p; lidos += 1; print("lido:", pid, p.get("versao", "?"), p["data"], "| combate:", sum(len(x["itens"]) for x in p.get("balance", [])), "| seções:", len(p.get("secoes", [])))
    if not lidos: print("nada novo para gravar"); return
    existentes.update(novos)
    patches = sorted(existentes.values(), key=lambda p: p["data"], reverse=True)
    out = dict(atual); out["patches"] = patches; out["atualizado"] = datetime.date.today().isoformat()
    tmp = OUT + ".tmp"; json.dump(out, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1); os.replace(tmp, OUT)
    print("gravado:", OUT, "com", len(patches), "patches")

if __name__ == "__main__":
    main()
