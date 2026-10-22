#!/usr/bin/env python3
"""Sonda 6: busca na API oficial os eventos rotulados pelo killboard-1 e resume as características por conteúdo."""
import json, urllib.request, time, collections, statistics as st
from concurrent.futures import ThreadPoolExecutor
BASES = {"eu": "https://gameinfo-ams.albiononline.com/api/gameinfo", "us": "https://gameinfo.albiononline.com/api/gameinfo"}
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
def get(base, path):
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(base + path, headers=UA), timeout=60) as r: return json.load(r)
        except Exception: time.sleep(1.5)
    return None
def feat(e):
    K, V = e["Killer"], e["Victim"]
    eqs = lambda s: s.get("Equipment") or {}
    ps = e.get("Participants") or []; gm = e.get("GroupMembers") or []
    ips = [round(p.get("AverageItemPower", 0)) for p in ps + [K]]
    return {"nPart": len(ps), "nGM": len(gm), "partN": e.get("numberOfParticipants"), "ipK": round(K.get("AverageItemPower", 0)), "ipV": round(V.get("AverageItemPower", 0)),
            "mountK": bool(eqs(K).get("Mount")), "mountV": bool(eqs(V).get("Mount")), "bagV": bool(eqs(V).get("Bag")), "capeV": bool(eqs(V).get("Cape")),
            "foodV": bool(eqs(V).get("Food")), "potionV": bool(eqs(V).get("Potion")), "invV": sum(1 for v in (V.get("Inventory") or []) if v),
            "fame": e.get("TotalVictimKillFame"), "guildV": bool(V.get("GuildName")), "allyV": bool(V.get("AllianceName")),
            "potT": ((eqs(V).get("Potion") or {}).get("Type") or "-").split("@")[0], "foodT": ((eqs(V).get("Food") or {}).get("Type") or "-").split("@")[0], "mountT": ((eqs(V).get("Mount") or {}).get("Type") or "-").split("@")[0], "ipMaxPart": max(ips) if ips else 0, "ipMinPart": min(ips) if ips else 0}
def resumo(fs):
    r = {"n": len(fs)}
    for k in fs[0]:
        vals = [f[k] for f in fs if f[k] is not None]
        if not vals: continue
        if all(isinstance(v, str) for v in vals): r[k] = dict(collections.Counter(vals).most_common(6)); continue
        if all(isinstance(v, bool) for v in vals): r[k] = round(sum(vals) / len(vals), 2)
        else: r[k] = [min(vals), round(st.median(vals)), max(vals)]
    return r
rot = json.load(open("tools/rotulos-killboard1.json")); rot_us = json.load(open("tools/rotulos-killboard1-us.json"))
def uma(item):
    i, lab = item
    for srv, b in ([("us", BASES["us"])] if i in rot_us else BASES.items()):
        e = get(b, f"/events/{i}")
        if isinstance(e, dict) and "Killer" in e: return lab, srv, feat(e)
    return lab, None, None
with ThreadPoolExecutor(10) as ex: res = list(ex.map(uma, list(rot_us.items()) + [(i, l) for i, l in rot.items() if i not in rot_us]))
por = collections.defaultdict(list); falhas = collections.Counter(); srv = collections.Counter()
for lab, s, f in res:
    if f: por[lab].append(f); srv[s] += 1
    else: falhas[lab] += 1
json.dump([{"id": i, "lab": l, "srv": sv, **f} for (i, l), (l2, sv, f) in zip(list(rot_us.items()) + [(i, l) for i, l in rot.items() if i not in rot_us], res) if f], open("tools/sonda-eventos.json", "w"))
out = {"servidor_achado": dict(srv), "falhas": dict(falhas), "por_rotulo": {l: resumo(v) for l, v in por.items()}}
json.dump(out, open("tools/sonda-fontes.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(out, ensure_ascii=False)[:3000])
