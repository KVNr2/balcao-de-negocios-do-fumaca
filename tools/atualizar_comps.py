#!/usr/bin/env python3
"""Atualiza data/comps.json com as composições do Albion Online Builds (rodado todo dia pelo GitHub Actions).
Lê o sitemap de composições, baixa cada página e extrai modo, tier e as armas/peças de cada papel.
Se algo der errado ou vierem poucas composições, NÃO sobrescreve o arquivo atual."""
import json, re, sys, time, datetime, urllib.request
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

BASE = "https://www.albiononlinebuilds.com"
UA = {"User-Agent": "Mozilla/5.0 (compatible; BalcaoFumaca-comps/1.0; +https://kvnr2.github.io/balcao-de-negocios-do-fumaca/)"}
OUT = "data/comps.json"
NAO_ARMA = re.compile(r"^(Bag|Head|Capeitem|Cape|Armor|Shoes|Potion|Meal)\b", re.I)

def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(2 * (i + 1))

def code(s): return re.sub(r"\s+", "_", s.strip()).upper()

def grupo(modos):
    t = " ".join(modos).lower()
    if "pve" in t: return "pve"
    if re.search(r"\b(7|10|15|20|30|40)\s?v\s?\d+|zvz|small fight|large|grandes", t): return "zvz"   # 7v7, 20v20, ZvZ e small fight
    if re.search(r"\b[2-6]\s?v\s?[2-6]\b|hellgate|crystal|depths|ancient lands", t): return "5v5"
    if "avalon" in t or "roaming" in t: return "avalon"
    if "gank" in t or "bomb" in t: return "gank"
    return "outro"

def parse(slug, html):
    d = BeautifulSoup(html, "html.parser")
    h1 = d.find("h1")
    if not h1: return None
    head = h1.parent.get_text(" | ", strip=True)
    tier = (re.search(r"TIER:\s*([SABC])", head) or [None, ""])[1]
    antes = head.split(h1.get_text(strip=True))[0]
    modos = [m.strip(" ★|") for m in re.split(r"\|", antes) if m.strip(" ★|") and not m.strip().upper().startswith("TIER")]
    slots = []
    for a in d.select('a[href*="/build/"]'):
        alts = [re.sub(r" icon$", "", (i.get("alt") or "")) for i in a.find_all("img")]
        if not alts: continue
        armas = [x for x in alts if x and not NAO_ARMA.match(x)]
        if not armas: continue
        f = lambda p: next((x[len(p):] for x in alts if x.startswith(p)), "")
        s = {"papel": a.get_text(" ", strip=True)[:30], "arma": code(armas[0])}
        if len(armas) > 1 and armas[1] != armas[0] and armas[1].lower().startswith(("off", "main")): s["off"] = code(armas[1])
        if f("Head "): s["cabeca"] = "HEAD_" + code(f("Head "))
        if f("Armor "):
            s["peito"] = "ARMOR_" + code(f("Armor "))
            s["tipo"] = {"PLATE": "P", "LEATHER": "L", "CLOTH": "C"}.get(code(f("Armor ")).split("_")[0], "x")
        if f("Shoes "): s["botas"] = "SHOES_" + code(f("Shoes "))
        slots.append(s)
    if not slots: return None
    autor = ""; atual = ""
    m = re.search(r"Atualizado:\s*([\d/]+)", head)
    if m: atual = "-".join(reversed(m.group(1).split("/")))
    return {"id": slug, "nome": h1.get_text(strip=True), "modos": modos, "grupo": grupo(modos), "tier": tier, "atualizado": atual, "slots": slots}

def main():
    xml = get(BASE + "/sitemaps/comps-pt.xml")
    slugs = [u.rsplit("/", 1)[-1] for u in re.findall(r"<loc>([^<]+/comp/[^<]+)</loc>", xml)]
    print("composições no sitemap:", len(slugs))
    def um(s):
        try: return parse(s, get(f"{BASE}/pt/comp/{s}"))
        except Exception as e:
            print("falhou", s, e); return None
    with ThreadPoolExecutor(6) as ex: comps = [c for c in ex.map(um, slugs) if c]
    comps = [c for c in comps if c["grupo"] != "pve" and len(c["slots"]) >= 2]
    print("válidas:", len(comps))
    if len(comps) < 15:
        print("poucas composições; mantendo o arquivo atual"); sys.exit(0)
    novo = {"fonte": "Albion Online Builds, Top Comps", "atualizado": datetime.date.today().isoformat(), "comps": comps}
    txt = json.dumps(novo, ensure_ascii=False, separators=(",", ":"))
    try: velho = json.load(open(OUT))
    except Exception: velho = None
    if velho and json.dumps(velho.get("comps"), ensure_ascii=False, separators=(",", ":")) == json.dumps(comps, ensure_ascii=False, separators=(",", ":")):
        print("sem mudanças"); return
    open(OUT, "w").write(txt)
    print("gravado", OUT)

if __name__ == "__main__": main()
