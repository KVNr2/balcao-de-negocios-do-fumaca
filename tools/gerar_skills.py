#!/usr/bin/env python3
"""Gera data/skills.json (habilidades de cada arma/peça, com nome e descrição em PT-BR e EN)
a partir do ao-bin-dumps (items.json, spells.json, localization.json).
Uso: python3 tools/gerar_skills.py CAMINHO_DO_ao-bin-dumps"""
import json, re, sys, os
D = sys.argv[1] if len(sys.argv) > 1 else "aobd"
L = lambda x: x if isinstance(x, list) else ([] if x is None else [x])
root = json.load(open(f"{D}/items.json"))["items"]
allit = {}
for k in ("weapon", "equipmentitem"):
    for x in root[k]: allit[x["@uniquename"]] = x
def resolve(name):
    it = allit.get(name); cl = it and it.get("craftingspelllist")
    if not cl: return []
    out = resolve(cl["@reference"]) if "@reference" in cl and cl["@reference"] != name else []
    rm = {r["@uniquename"] for r in L(cl.get("removespell"))}
    out = [s for s in out if s[0] not in rm]
    out += [(c["@uniquename"], c.get("@slots")) for c in L(cl.get("craftspell"))]
    return out
SP = json.load(open(f"{D}/spells.json"))["spells"]
sdef = {}
for k in ("activespell", "passivespell", "togglespell"):
    for s in L(SP.get(k)): sdef[s["@uniquename"]] = s
loc = {}
for tu in json.load(open(f"{D}/localization.json"))["tmx"]["body"]["tu"]:
    t = tu["@tuid"]
    if t.startswith("@SPELLS_"):
        v = {x["@xml:lang"]: x["seg"] for x in L(tu.get("tuv"))}
        loc[t] = v
def look(tag, lang):
    v = loc.get(tag) or {}
    return v.get(lang) or v.get("EN-US") or ""
def tokens(txt, sp):
    def dollar(m):
        path = m.group(1); cur = sp
        try:
            for part in path.split("."):
                mm = re.match(r"(\w+)(?:\[(\d+)\])?$", part)
                key, idx = mm.group(1), mm.group(2)
                nxt = cur.get(key) if key in cur else cur.get("@" + key)
                if idx is not None: nxt = L(nxt)[int(idx)]
                cur = nxt
            return str(cur) if not isinstance(cur, (dict, list)) else "…"
        except Exception: return "…"
    txt = re.sub(r"\$([^$]+)\$", dollar, txt)
    txt = re.sub(r"\{\d+\}", "…", txt).replace("$…", "…")
    txt = re.sub(r"\[/?[a-z]+\]", "", txt)
    return txt.strip()
def info(sid):
    sp = sdef.get(sid, {}); res = []
    for lang in ("PT-BR", "EN-US"):
        nm = look(sp.get("@namelocatag") or f"@SPELLS_{sid}", lang) or sid.replace("_", " ").title()
        ds = tokens(look(sp.get("@descriptionlocatag") or f"@SPELLS_{sid}_DESC", lang), sp)
        res += [nm, ds]
    return res
def rep(code):
    best = None
    for t in range(8, 3, -1):
        if f"T{t}_{code}" in allit and resolve(f"T{t}_{code}"): best = f"T{t}_{code}"; break
    return best
items, used = {}, set()
codes = {re.sub(r"^T\d_", "", k) for k in allit}
for code in sorted(codes):
    r = rep(code)
    if not r: continue
    it = allit[r]; spells = resolve(r); w = it.get("@slottype") == "mainhand" or r.split("_")[1] in ("MAIN", "2H")
    if re.match(r"^(MAIN|2H)_", code):
        slots = {"1": [], "2": [], "3": [], "p": []}
        for n, s in spells:
            if n.startswith("PASSIVE_"): slots["p"].append(n)
            elif s in slots: slots[s].append(n)
        out = [slots["1"], slots["2"], slots["3"], slots["p"]]
    elif re.match(r"^(HEAD|ARMOR|SHOES)_", code):
        out = [[n for n, _ in spells if not n.startswith("PASSIVE_")], [n for n, _ in spells if n.startswith("PASSIVE_")]]
    else: continue
    if not any(out): continue
    items[code] = out; used.update(n for l in out for n in l)
spells = {s: info(s) for s in sorted(used)}
json.dump({"i": items, "s": spells}, open("data/skills.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(items), "itens,", len(spells), "habilidades")
