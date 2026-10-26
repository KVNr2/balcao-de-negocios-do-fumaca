"""Características de um evento de morte e classificador de conteúdo (árvore treinada em tools/treinar_pvp.py)."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
COMBATE = ("STONESKIN", "ENERGY", "LAVA", "TORNADO")
def _eq(s): return s.get("Equipment") or {}
def _t(x): return ((x or {}).get("Type") or "")
def _conta(V, palavra):
    """quantos itens do inventário da vítima têm essa palavra no tipo (tesouros e itens de dragão aparecem nas mortes de Ancient Lands)"""
    return sum(1 for v in (V.get("Inventory") or []) if v and palavra in _t(v))
# itens que, nos dados (57 mortes de AL contra 1.016 de outros conteúdos), só aparecem em Ancient Lands; o texto "DRAGON" solto não vale (pega a montaria do dragão do pântano e armaduras de dragão)
EXATOS_AL = {"QUESTITEM_TOKEN_DRAGONS", "SHARD_FIRE_DRAGON", "SHARD_RANDOM_DUNGEON_ELITE_DRAGON_TOKEN", "ALCHEMY_RARE_DRAGONAREA", "UNIQUE_UNLOCK_LORE_DRAGON_11"}
def exatos_al(V):
    """quantos itens exclusivos de Ancient Lands (inventário + equipamento) a vítima levava"""
    import re
    its = list(V.get("Inventory") or []) + list(_eq(V).values())
    return sum(1 for v in its if v and _t(v) and re.sub(r"^T\d_", "", _t(v)).split("@")[0] in EXATOS_AL)
def familias(V):
    """tipos distintos de item da vítima (inventário + equipamento), sem tier nem encanto: material para descobrir quais itens indicam Ancient Lands"""
    import re
    its = list(V.get("Inventory") or []) + list(_eq(V).values())
    return sorted({re.sub(r"^T\d_", "", _t(v)).split("@")[0] for v in its if v and _t(v)})
def feat(e):
    K, V = e["Killer"], e["Victim"]
    ps = e.get("Participants") or []; gm = e.get("GroupMembers") or []
    ips = [round(p.get("AverageItemPower", 0)) for p in ps + [K]]
    pot, mnt = _t(_eq(V).get("Potion")), _t(_eq(V).get("Mount"))
    return {"nGM": len(gm), "nPart": len(ps), "ipK": round(K.get("AverageItemPower", 0)), "ipV": round(V.get("AverageItemPower", 0)),
            "mountK": bool(_eq(K).get("Mount")), "mountV": bool(_eq(V).get("Mount")), "bagV": bool(_eq(V).get("Bag")),
            "invV": sum(1 for v in (V.get("Inventory") or []) if v), "fame": e.get("TotalVictimKillFame"), "potionV": bool(_eq(V).get("Potion")),
            "ipMaxPart": max(ips) if ips else 0, "ipMinPart": min(ips) if ips else 0, "potT": pot.split("@")[0], "mountT": mnt.split("@")[0],
            "nTes": _conta(V, "TREASURE"), "nDrag": _conta(V, "DRAGON")}
FEATS = ["nGM", "nPart", "ipK", "ipV", "mountK", "mountV", "bagV", "invV", "fame", "potionV", "ipMaxPart", "ipMinPart", "potCombate", "potCresc", "direboar", "nTes", "nDrag"]
def vetor(f):
    pt = f.get("potT") or ""
    x = [float(f.get(k) or 0) for k in FEATS[:12]]
    x.append(1.0 if any(c in pt for c in COMBATE) else 0.0)
    x.append(1.0 if ("REVIVE" in pt or "HEAL" in pt) else 0.0)
    x.append(1.0 if "DIREBOAR" in (f.get("mountT") or "") else 0.0)
    x.append(float(f.get("nTes") or 0)); x.append(float(f.get("nDrag") or 0))
    return x
def _folha(a, x):
    n = 0
    while a["f"][n] >= 0:
        n = a["e"][n] if x[a["f"][n]] <= a["t"][n] else a["d"][n]
    return a["p"][n]
def prever(arv, f): return prever_vetor(arv, vetor(f))
def prever_vetor(arv, x):
    x = list(x) + [0.0] * max(0, len(arv.get("feats") or []) - len(x))   # vetores guardados antes das características novas
    """probabilidade de cada conteúdo. O modelo pode ser uma árvore (formato antigo) ou uma floresta ("trees"): média das árvores"""
    if "trees" in arv:
        ts = arv["trees"]; ps = [_folha(a, x) for a in ts]
        return dict(zip(arv["classes"], [sum(p[i] for p in ps) / len(ps) for i in range(len(arv["classes"]))]))
    return dict(zip(arv["classes"], _folha(arv, x)))
def carregar(path=None):
    import hashlib
    f = path or os.path.join(HERE, "pvp-arvore.json"); a = json.load(open(f))
    a["_v"] = hashlib.md5(open(f, "rb").read()).hexdigest()[:8]   # identifica o modelo: mortes classificadas com ele não precisam reclassificar
    return a

# ---- armazenamento compacto das mortes coletadas (branch pvp-dados) ----
SLOTS = ("MainHand", "OffHand", "Head", "Armor", "Shoes", "Cape", "Potion", "Food")
def _pp(p):
    eq = _eq(p)
    return {"i": p.get("Id"), "n": p.get("Name"), "g": p.get("GuildName") or "", "ip": round(p.get("AverageItemPower") or 0),
            "d": 1 if ((p.get("DamageDone") or 0) > 0 or (p.get("SupportHealingDone") or 0) > 0) else 0,
            "e": {s: _t(eq.get(s)) for s in SLOTS if _t(eq.get(s))}}
def grupo(e):
    """colegas do grupo de quem matou que estavam na luta (sobreviventes sem dano nem cura incluídos); só vale se o assassino está na lista, o que confirma que é o grupo dele"""
    gm = e.get("GroupMembers") or []; k = (e.get("Killer") or {}).get("Id")
    if not k or k not in {m.get("Id") for m in gm}: return []
    ja = {k} | {p.get("Id") for p in (e.get("Participants") or [])}
    vistos = []
    for m in gm:
        if m.get("Id") and m["Id"] not in ja and m.get("Equipment") and m["Id"] not in [v["Id"] for v in vistos]: vistos.append(m)
    return vistos
def empacotar(e, c, q=None, m=None):
    """x = vetor de características e q = confiança, guardados para reclassificar com o modelo novo e para o auto-treino"""
    try: x = [round(v, 1) for v in vetor(feat(e))]
    except Exception: x = None
    dx = exatos_al(e["Victim"])
    return {"id": e["EventId"], "t": e["TimeStamp"][:19], "c": c, "m": m, "x": x, "q": round(q, 3) if q else None, "gm": len(e.get("GroupMembers") or []),
            **({"dx": dx} if dx else {}),
            "k": _pp(e["Killer"]), "v": _pp(e["Victim"]), "p": [_pp(p) for p in (e.get("Participants") or []) if p.get("Id") and p.get("Id") != e["Killer"].get("Id")], "s": [_pp(p) for p in grupo(e)]}
def _up(x):
    return {"Id": x["i"], "Name": x["n"], "GuildName": x["g"], "AverageItemPower": x["ip"], "DamageDone": x["d"], "SupportHealingDone": 0,
            "Equipment": {s: {"Type": t} for s, t in x["e"].items()}}
def desempacotar(r):
    return {"EventId": r["id"], "TimeStamp": r["t"] + ".000000000Z", "_c": r["c"], "_x": r.get("x"), "_m": r.get("m"), "_dx": r.get("dx") or 0, "GroupMembers": [{}] * r["gm"],
            "Killer": _up(r["k"]), "Victim": _up(r["v"]), "Participants": [_up(p) for p in r["p"]] + [dict(_up(p), _g=True) for p in r.get("s") or []]}

# máximo de jogadores do lado vencedor (quem matou + quem ajudou) por conteúdo; acima disso a luta é grande demais e não entra
MAX_VENC = {"hg2": 2, "hg5": 5, "corrompida": 1, "solo": 2, "depths": 3}
def n_venc(e):
    ids = {(e.get("Killer") or {}).get("Id")}
    for p in e.get("Participants") or []:
        if p.get("Id") and (p.get("_g") or (p.get("DamageDone") or 0) > 0 or (p.get("SupportHealingDone") or 0) > 0): ids.add(p["Id"])
    ids |= {m["Id"] for m in grupo(e)}
    return len(ids - {None})
# Terras Antigas (AL): morte classificada como solo, com item de dragão (dx>0), IP máximo entre 1150 e 1320 (soft cap 1200) e fama de abate acima de zero
AL_IP = (1150, 1320)
def eh_al(c, e):
    if c != "solo" or (e.get("_dx") or 0) <= 0: return False
    try: m = max(e["Killer"].get("AverageItemPower") or 0, e["Victim"].get("AverageItemPower") or 0)
    except Exception: return False
    x = e.get("_x") or []
    return AL_IP[0] <= m <= AL_IP[1] and len(x) > 8 and x[8] > 0
def cabe(c, e): return n_venc(e) <= MAX_VENC.get(c, 99)
