#!/usr/bin/env python3
"""Atualiza data/zvz.json com o que as maiores lutas recentes estão usando.
Fonte principal: AtlasChill (https://atlaschill.com/albion/pt-BR/battleboard?minPlayers=200). A página da lista e a de cada luta
trazem no HTML os jogadores (arma, aliança, kills/mortes) e os eventos de morte com o equipamento completo de quem matou e de quem morreu.
Reserva: AlbionBB + API oficial, se o AtlasChill não responder. A função (tank, curandeiro...) vem da tabela tools/roles_armas.json.
Se algo falhar ou vierem poucas lutas, NÃO sobrescreve o arquivo atual."""
import json, re, sys, os, time, datetime, urllib.request, collections
from concurrent.futures import ThreadPoolExecutor

ATLAS = "https://atlaschill.com/albion"
SERVIDORES = ["americas", "europe", "asia"]
MIN_JOGADORES = 200
MAX_POR_SERVIDOR = 10
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      "Accept": "text/html,application/json,*/*", "Accept-Language": "en-US,en;q=0.9"}
OUT = "data/zvz.json"
SLOTS = {"Head": "cabeca", "Armor": "peito", "Shoes": "botas", "Cape": "capa", "OffHand": "off", "Potion": "pocao", "Food": "comida"}
HERE = os.path.dirname(os.path.abspath(__file__))
ROLES = json.load(open(os.path.join(HERE, "roles_armas.json")))

def get(url, tries=3, extra=None):
    h = dict(UA); h.update(extra or {})
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(3 * (i + 1))

def base(t):
    m = re.match(r"T(\d)_(.+?)(?:@(\d))?$", t or "")
    return (m.group(2), int(m.group(1)), int(m.group(3) or 0)) if m else (None, 0, 0)

def papel_da_arma(w):
    if w in ROLES: return ROLES[w]
    if re.search(r"HOLYSTAFF|FALLENSTAFF|REDEMPTION|LIFETOUCH|DIVINE|NATURESTAFF|GREATHOLY|GREATNATURE", w): return "healer"
    return ""

# ---------- AtlasChill ----------
def fluxo(html):
    """Junta os pedaços self.__next_f.push([1,"..."]) do Next.js em um texto só."""
    partes = []
    for m in re.finditer(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', html):
        try: partes.append(json.loads(m.group(1)))
        except Exception: pass
    return "".join(partes)

def array_apos(txt, chave):
    """Acha todos os arrays JSON que começam em "chave":[ e devolve o maior que for válido."""
    melhor = []
    for m in re.finditer(r'"%s":\[' % re.escape(chave), txt):
        i = m.end() - 1; d = 0; ins = False; esc = False
        for j in range(i, len(txt)):
            c = txt[j]
            if ins:
                if esc: esc = False
                elif c == "\\\\" or c == "\\": esc = True
                elif c == '"': ins = False
            elif c == '"': ins = True
            elif c == "[": d += 1
            elif c == "]":
                d -= 1
                if d == 0:
                    try:
                        arr = json.loads(txt[i:j + 1])
                        if len(arr) > len(melhor): melhor = arr
                    except Exception: pass
                    break
    return melhor

def lista_atlas(servidor):
    html = get(f"{ATLAS}/pt-BR/battleboard?server={servidor}&minPlayers={MIN_JOGADORES}")
    f = fluxo(html)
    achados = re.findall(r'\{"id":(\d{8,}),"startTime":"([^"]+)"', f)
    ids = list(dict.fromkeys(i for i, _ in achados))[:MAX_POR_SERVIDOR]
    print(servidor, "lista:", len(ids), "lutas (html", len(html), "fluxo", len(f), ")")
    return ids

def norm_equip(eq):
    out = {}
    for k, v in (eq or {}).items():
        t = v.get("Type") if isinstance(v, dict) else v
        if t: out[k] = t
    return out

def luta_atlas(par):
    servidor, bid = par
    try:
        html = get(f"{ATLAS}/pt-BR/battleboard/{bid}/{servidor}")
    except Exception as e:
        print("::warning::luta", bid, e); return None
    f = fluxo(html)
    jog = array_apos(f, "players")
    jog = [p for p in jog if isinstance(p, dict) and ("mainHand" in p or "name" in p)]
    ev = array_apos(f, "events")
    als = array_apos(f, "alliances")
    if len(jog) < 50: print("::warning::luta", bid, "jogadores", len(jog), "fluxo", len(f)); return None
    t = re.search(r'"startTime":"([^"]+)"', f)
    pl = []
    for p in jog:
        w = base(p.get("mainHand"))[0]
        if not w: continue
        pl.append({"allianceName": p.get("allianceName") or "", "kills": p.get("kills") or 0, "deaths": p.get("deaths") or 0, "weapon": w, "role": papel_da_arma(w)})
    eventos = []
    for e in ev:
        for lado in ("killer", "victim"):
            x = e.get(lado) or {}
            eq = norm_equip(x.get("equipment") or x.get("Equipment"))
            if eq.get("MainHand"): eventos.append({"eq": eq, "ip": x.get("averageItemPower") or x.get("itemPower") or x.get("ip") or 0})
    ips = {a.get("name"): a.get("avgIp") for a in als if isinstance(a, dict) and a.get("avgIp")}
    return {"id": bid, "hora": t.group(1) if t else "", "jogadores": pl, "eventos": eventos, "ips": ips, "mortes": len(ev)}

def coletar_atlas():
    pares = []
    for s in SERVIDORES:
        try:
            for i in lista_atlas(s): pares.append((s, i))
        except Exception as e: print("::warning::lista", s, e)
        time.sleep(1.5)
    out = []
    for p in pares:
        b = luta_atlas(p)
        if b: out.append(b)
        time.sleep(0.8)
    return out

# ---------- reserva: AlbionBB + API oficial ----------
def coletar_albionbb():
    API = "https://api.albionbb.com/us"; GI = "https://gameinfo.albiononline.com/api/gameinfo"
    h = {"Origin": "https://albionbb.com", "Referer": "https://albionbb.com/"}
    lista = json.loads(get(f"{API}/battles?minPlayers=200", extra=h))
    ids = [str(x["albionId"]) for x in sorted(lista, key=lambda x: x.get("startedAt") or "", reverse=True) if (x.get("totalPlayers") or 0) >= MIN_JOGADORES][:10]
    def um(bid):
        try: j = json.loads(get(f"{API}/battles/{bid}", extra=h))
        except Exception: return None
        pl = [{"allianceName": p.get("allianceName") or "", "kills": p.get("kills") or 0, "deaths": p.get("deaths") or 0,
               "weapon": (p.get("weapon") or {}).get("name"), "role": p.get("role") or ""} for p in (j.get("players") or []) if (p.get("weapon") or {}).get("name")]
        evs = []
        for off in range(0, 1600, 51):
            try: pag = json.loads(get(f"{GI}/events/battle/{bid}?offset={off}&limit=51"))
            except Exception: break
            if not pag: break
            evs += pag
            if len(pag) < 51: break
        eventos = []
        for e in evs:
            for lado in ("Victim", "Killer"):
                x = e.get(lado) or {}; eq = norm_equip(x.get("Equipment"))
                if eq.get("MainHand"): eventos.append({"eq": eq, "ip": x.get("AverageItemPower") or 0})
        return {"id": bid, "hora": j.get("startedAt") or "", "jogadores": pl, "eventos": eventos, "ips": {}, "mortes": len(evs)}
    with ThreadPoolExecutor(4) as ex: return [b for b in ex.map(um, ids) if b and len(b["jogadores"]) >= MIN_JOGADORES]

# ---------- agregação ----------
def main():
    fonte = "AtlasChill (battleboard, lutas com 200+ jogadores)"
    bats = []
    # O AtlasChill usa a API oficial do jogo; ele bloqueia o Actions, então lemos a mesma base direto (lista AlbionBB + eventos oficiais)
    try: bats = coletar_albionbb(); fonte = "API oficial do Albion + AlbionBB (mesma base do AtlasChill; 10 últimas lutas com 200+ jogadores, Americas)"
    except Exception as e: print("::error::coleta falhou", e); sys.exit(1)
    if len(bats) < 5: print("::error::poucas lutas lidas:", len(bats)); sys.exit(1)

    papeis = collections.defaultdict(collections.Counter); venc = collections.defaultdict(collections.Counter)
    w_papel = collections.defaultdict(collections.Counter); w_n = collections.Counter()
    aliancas = collections.defaultdict(lambda: {"jog": 0, "bat": 0, "k": 0, "d": 0, "papeis": collections.defaultdict(collections.Counter), "ipn": 0, "ips": 0})
    total_j = 0; sem_papel = collections.Counter()
    for b in bats:
        por_al = collections.defaultdict(lambda: [0, 0])
        for p in b["jogadores"]:
            por_al[p["allianceName"]][0] += p["kills"]; por_al[p["allianceName"]][1] += p["deaths"]
        for p in b["jogadores"]:
            w, r, a = p["weapon"], p["role"], p["allianceName"]
            total_j += 1; w_n[w] += 1
            if not r: sem_papel[w] += 1; continue
            papeis[r][w] += 1; w_papel[w][r] += 1
            k, d = por_al[a]
            if a and k > d: venc[r][w] += 1
            if a: aliancas[a]["jog"] += 1; aliancas[a]["papeis"][r][w] += 1
        for a, (k, d) in por_al.items():
            if a:
                A = aliancas[a]; A["bat"] += 1; A["k"] += k; A["d"] += d
                if b["ips"].get(a): A["ips"] += b["ips"][a]; A["ipn"] += 1
    if sem_papel: print("armas sem função conhecida:", dict(sem_papel.most_common(12)))

    mortes = sum(b["mortes"] for b in bats); por_arma = collections.defaultdict(list)
    for b in bats:
        for e in b["eventos"]:
            eq = e["eq"]; mh = base(eq.get("MainHand"))
            if not mh[0] or (e["ip"] and e["ip"] < 900): continue
            peca = {nome: (base(eq.get(k)) if base(eq.get(k))[0] else None) for k, nome in SLOTS.items()}
            por_arma[mh[0]].append((mh, peca, e["ip"] or 0))
    armas = {}
    for w, lst in por_arma.items():
        cont = collections.Counter(); resumo = {}
        for mh, peca, ip in lst:
            chave = tuple(peca[n][0] if peca[n] else "" for n in ("cabeca", "peito", "botas"))
            cont[chave] += 1; resumo.setdefault(chave, []).append((mh, peca, ip))
        vars_ = []
        for chave, n in cont.most_common(3):
            itens = resumo[chave]; ipv = [i[2] for i in itens if i[2]]
            tm = collections.Counter((i[0][1], i[0][2]) for i in itens).most_common(1)[0][0]
            var = {"n": n, "ip": round(sum(ipv) / len(ipv)) if ipv else 0, "arma": {"t": tm[0], "e": tm[1]}}
            for nome in SLOTS.values():
                c = collections.Counter(i[1][nome] for i in itens if i[1][nome])
                if c: (cod, t, e), _ = c.most_common(1)[0]; var[nome] = {"c": cod, "t": t, "e": e}
            vars_.append(var)
        armas[w] = {"mortes": len(lst), "variantes": vars_}
    for w in list(w_n):
        a = armas.setdefault(w, {"mortes": 0, "variantes": []})
        a["papel"] = w_papel[w].most_common(1)[0][0] if w in w_papel else ""; a["jogadores"] = w_n[w]

    def pap(c): return {r: {"total": sum(cc.values()), "armas": cc.most_common(14)} for r, cc in c.items()}
    top_al = sorted(aliancas.items(), key=lambda x: -x[1]["jog"])[:8]
    horas = [b["hora"] for b in bats if b["hora"]]
    novo = {
        "fonte": fonte, "atualizado": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"),
        "janela": {"batalhas": len(bats), "jogadores": total_j, "mortes": mortes, "de": min(horas) if horas else "", "ate": max(horas) if horas else ""},
        "papeis": pap(papeis), "vencedores": pap(venc),
        "armas": {w: d for w, d in armas.items() if d.get("jogadores", 0) >= 3},
        "aliancas": [{"nome": n, "jogadores": a["jog"], "batalhas": a["bat"], "k": a["k"], "d": a["d"], "ip": round(a["ips"] / a["ipn"]) if a["ipn"] else 0, "papeis": pap(a["papeis"])} for n, a in top_al],
    }
    if sum(v["total"] for v in novo["papeis"].values()) < 300: print("::error::poucos jogadores com função:", novo["papeis"].keys()); sys.exit(1)
    open(OUT, "w").write(json.dumps(novo, ensure_ascii=False, separators=(",", ":")))
    print("gravado", OUT, "| fonte:", fonte, "| lutas", len(bats), "jogadores", total_j, "mortes", mortes, "armas", len(novo["armas"]))

if __name__ == "__main__":
    try: main()
    except SystemExit: raise
    except Exception:
        import traceback; print("::error::" + traceback.format_exc().replace("\n", " | ")[-900:]); sys.exit(1)
