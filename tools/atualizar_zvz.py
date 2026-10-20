#!/usr/bin/env python3
"""Atualiza data/zvz.json com o que as maiores lutas recentes (albionbb, 100+ jogadores) estão usando:
 - função e arma de cada jogador (página da batalha no albionbb);
 - build completa de quem morreu (eventos da API oficial gameinfo, que trazem o equipamento todo).
Rodado todo dia pelo GitHub Actions. Se algo falhar ou vierem poucas batalhas, NÃO sobrescreve o arquivo atual."""
import json, re, sys, time, datetime, urllib.request, collections
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

BB = "https://albionbb.com"
GI = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (compatible; BalcaoFumaca-zvz/1.0; +https://kvnr2.github.io/balcao-de-negocios-do-fumaca/)", "Accept": "*/*"}
OUT = "data/zvz.json"
MAX_BATALHAS = 30
MAX_EVENTOS = 306          # por batalha (6 páginas de 51)
SLOTS = {"Head": "cabeca", "Armor": "peito", "Shoes": "botas", "Cape": "capa", "OffHand": "off", "Potion": "pocao", "Food": "comida"}

def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(2 * (i + 1))

def devalue(arr):
    """Decodifica o __NUXT_DATA__ do Nuxt (formato devalue: valores referenciados por índice)."""
    memo = {}
    def res(i):
        if i in memo: return memo[i]
        v = arr[i]
        if isinstance(v, list):
            if v and isinstance(v[0], str) and v[0] in ("Reactive", "ShallowReactive", "Ref", "ShallowRef", "NuxtError", "EmptyShallowRef", "EmptyRef"):
                memo[i] = res(v[1]) if len(v) > 1 else None; return memo[i]
            o = []; memo[i] = o
            for x in v: o.append(res(x) if isinstance(x, int) and not isinstance(x, bool) else x)
            return o
        if isinstance(v, dict):
            o = {}; memo[i] = o
            for k, x in v.items(): o[k] = res(x) if isinstance(x, int) and not isinstance(x, bool) else x
            return o
        memo[i] = v; return v
    return res(0)

def achar_jogadores(o, d=0):
    if d > 7 or o is None: return None
    if isinstance(o, list):
        if len(o) > 20 and isinstance(o[0], dict) and "weapon" in o[0] and "role" in o[0]: return o
        for x in o:
            r = achar_jogadores(x, d + 1)
            if r: return r
    elif isinstance(o, dict):
        for x in o.values():
            r = achar_jogadores(x, d + 1)
            if r: return r
    return None

def batalha(bid):
    try: html = get(f"{BB}/battles/{bid}")
    except Exception as e: print("::warning::batalha", bid, e); return None
    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m: return None
    jog = achar_jogadores(devalue(json.loads(m.group(1))))
    if not jog: return None
    t = re.search(r"(\d{4}-\d\d-\d\dT[\d:.]+Z)", m.group(1))
    return {"id": bid, "jogadores": jog, "hora": t.group(1) if t else ""}

def base(t):
    m = re.match(r"T(\d)_(.+?)(?:@(\d))?$", t or "")
    return (m.group(2), int(m.group(1)), int(m.group(3) or 0)) if m else (None, 0, 0)

def eventos(bid):
    out = []
    for off in range(0, MAX_EVENTOS, 51):
        try: pag = json.loads(get(f"{GI}/events/battle/{bid}?offset={off}&limit=51"))
        except Exception as e:
            print("eventos falhou", bid, off, e); break
        if not pag: break
        out += pag
        if len(pag) < 51: break
    return out

def modal(c):
    """(codigo, tier, encanto) mais comum num Counter de tuplas."""
    return c.most_common(1)[0] if c else None

def main():
    html = get(f"{BB}/?minPlayers=100")
    ids = []
    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if m:
        def achar(o, d=0):
            if d > 6: return
            if isinstance(o, dict):
                if "albionId" in o and "totalPlayers" in o:
                    if (o["totalPlayers"] or 0) >= 100: ids.append(str(o["albionId"]))
                    return
                for x in o.values(): achar(x, d + 1)
            elif isinstance(o, list):
                for x in o: achar(x, d + 1)
        achar(devalue(json.loads(m.group(1))))
    if not ids: ids = re.findall(r"/battles/(\d+)", html)
    ids = list(dict.fromkeys(ids))[:MAX_BATALHAS]
    print("batalhas na lista:", len(ids), "html", len(html))
    if not ids: print("::error::lista vazia; tam", len(html), "nuxt", bool(m), "albionId", html.count("albionId"), "battles", html.count("/battles/"), "fim:", html[-300:].replace("\n"," ")); sys.exit(1)
    with ThreadPoolExecutor(5) as ex: bats = [b for b in ex.map(batalha, ids) if b]
    bats = [b for b in bats if len(b["jogadores"]) >= 100]
    print("batalhas lidas (100+):", len(bats))
    if len(bats) < 5:
        print("::error::poucas batalhas lidas:", len(bats)); sys.exit(1)

    papeis = collections.defaultdict(collections.Counter); venc = collections.defaultdict(collections.Counter)
    w2role = collections.defaultdict(collections.Counter); w_n = collections.Counter()
    aliancas = collections.defaultdict(lambda: {"jog": 0, "bat": 0, "k": 0, "d": 0, "papeis": collections.defaultdict(collections.Counter), "ips": []})
    total_j = 0
    for b in bats:
        por_al = collections.defaultdict(lambda: [0, 0])
        for p in b["jogadores"]:
            a = p.get("allianceName") or ""
            por_al[a][0] += p.get("kills") or 0; por_al[a][1] += p.get("deaths") or 0
        for p in b["jogadores"]:
            r = p.get("role"); w = (p.get("weapon") or {}).get("name")
            if not r or not w: continue
            total_j += 1; papeis[r][w] += 1; w2role[w][r] += 1; w_n[w] += 1
            a = p.get("allianceName") or ""
            k, d = por_al[a]
            if a and k > d: venc[r][w] += 1
            if a:
                A = aliancas[a]; A["jog"] += 1; A["papeis"][r][w] += 1
                if p.get("ip"): A["ips"].append(p["ip"])
        for a, (k, d) in por_al.items():
            if a: aliancas[a]["bat"] += 1; aliancas[a]["k"] += k; aliancas[a]["d"] += d

    # builds completas pelas mortes
    with ThreadPoolExecutor(4) as ex: evs = list(ex.map(lambda b: eventos(b["id"]), bats))
    mortes = 0; por_arma = collections.defaultdict(list)
    for lista in evs:
        for e in lista:
            mortes += 1
            for lado in ("Victim", "Killer"):   # a coluna "action" mostra a build completa de quem matou e de quem morreu
                v = e.get(lado) or {}; eq = v.get("Equipment") or {}
                mh = base((eq.get("MainHand") or {}).get("Type"))
                if not mh[0] or (v.get("AverageItemPower") or 0) < 900: continue
                peca = {}
                for k, nome in SLOTS.items():
                    b_ = base((eq.get(k) or {}).get("Type"))
                    peca[nome] = b_ if b_[0] else None
                por_arma[mh[0]].append((mh, peca, v.get("AverageItemPower") or 0))
    armas = {}
    for w, lst in por_arma.items():
        cont = collections.Counter(); resumo = {}
        for mh, peca, ip in lst:
            chave = (peca["cabeca"][0] if peca["cabeca"] else "", peca["peito"][0] if peca["peito"] else "", peca["botas"][0] if peca["botas"] else "")
            cont[chave] += 1; resumo.setdefault(chave, []).append((mh, peca, ip))
        vars_ = []
        for chave, n in cont.most_common(3):
            itens = resumo[chave]; var = {"n": n, "ip": round(sum(i[2] for i in itens) / n), "arma": None}
            tm = collections.Counter((i[0][1], i[0][2]) for i in itens).most_common(1)[0][0]; var["arma"] = {"t": tm[0], "e": tm[1]}
            for nome in SLOTS.values():
                c = collections.Counter(i[1][nome] for i in itens if i[1][nome])
                if c:
                    (cod, t, e), nn = c.most_common(1)[0]; var[nome] = {"c": cod, "t": t, "e": e}
            vars_.append(var)
        armas[w] = {"mortes": len(lst), "variantes": vars_}
    for w, d in armas.items():
        d["papel"] = w2role[w].most_common(1)[0][0] if w in w2role else ""; d["jogadores"] = w_n.get(w, 0)
    for w in w_n:
        armas.setdefault(w, {"mortes": 0, "variantes": [], "papel": w2role[w].most_common(1)[0][0], "jogadores": w_n[w]})

    def pap(c): return {r: {"total": sum(cc.values()), "armas": cc.most_common(14)} for r, cc in c.items()}
    top_al = sorted(aliancas.items(), key=lambda x: -x[1]["jog"])[:8]
    novo = {
        "fonte": "albionbb (batalhas com 100+ jogadores) e gameinfo oficial (equipamento de quem morreu)",
        "atualizado": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"),
        "janela": {"batalhas": len(bats), "jogadores": total_j, "mortes": mortes, "de": min(b["hora"] for b in bats if b["hora"]) if any(b["hora"] for b in bats) else "", "ate": max(b["hora"] for b in bats if b["hora"]) if any(b["hora"] for b in bats) else ""},
        "papeis": pap(papeis), "vencedores": pap(venc),
        "armas": {w: d for w, d in armas.items() if d["jogadores"] >= 3},
        "aliancas": [{"nome": n, "jogadores": a["jog"], "batalhas": a["bat"], "k": a["k"], "d": a["d"], "ip": round(sum(a["ips"]) / len(a["ips"])) if a["ips"] else 0, "papeis": pap(a["papeis"])} for n, a in top_al],
    }
    open(OUT, "w").write(json.dumps(novo, ensure_ascii=False, separators=(",", ":")))
    print("gravado", OUT, "batalhas", len(bats), "jogadores", total_j, "mortes", mortes, "armas", len(novo["armas"]))

if __name__ == "__main__": main()
