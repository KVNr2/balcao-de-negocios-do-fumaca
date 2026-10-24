#!/usr/bin/env python3
"""Baixa da API oficial os eventos de tools/ids-ancient.json (Ancient Lands confirmados por vídeo) e grava tools/exemplos-ancient.json
com o vetor de características de cada um (mesmo vetor do classificador) e o rótulo "ancient". Uso: rotular_ancient.py"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pvp_comum as C, api_suave
src = json.load(open(os.path.join(HERE, "ids-ancient.json")))["fontes"]
out_f = os.path.join(HERE, "exemplos-ancient.json")
ex = {(r["id"] if r.get("srv", "us") == "us" else f"{r['srv']}:{r['id']}"): r for r in json.load(open(out_f))} if os.path.exists(out_f) else {}
arv = C.carregar(); novos = falhas = 0
SRV = {"us": "https://gameinfo.albiononline.com/api/gameinfo", "eu": "https://gameinfo-ams.albiononline.com/api/gameinfo", "sgp": "https://gameinfo-sgp.albiononline.com/api/gameinfo"}
for fnt in src:
    srv = fnt.get("servidor", "us"); api_suave.B = SRV[srv]
    for i in fnt["ids"]:
        if "fam" in (ex.get(i) or ex.get(f"{srv}:{i}") or {}): continue
        e = api_suave.get(f"/events/{i}")
        if not isinstance(e, dict) or "Killer" not in e: falhas += 1; continue
        f = C.feat(e); x = C.vetor(f); pr = C.prever(arv, f); c = max(pr, key=pr.get)
        ex[i if srv == "us" else f"{srv}:{i}"] = {"id": i, "srv": srv, "t": e["TimeStamp"][:19] + "Z", "lab": "ancient", "x": [float(v) for v in x], "g": len(e.get("GroupMembers") or []),
                 "n": e.get("numberOfParticipants"), "p": [c, round(pr[c], 2)], "v": fnt["video"], "fam": C.familias(e["Victim"])}; novos += 1
json.dump(sorted(ex.values(), key=lambda r: r["t"]), open(out_f, "w"), separators=(",", ":"))
print(f"exemplos: {len(ex)} ({novos} novos, {falhas} falhas); falhas da API {dict(api_suave.FALHAS)}")
for r in sorted(ex.values(), key=lambda r: r["t"]): print(r["id"], r["t"], "g", r["g"], "n", r["n"], "prevê", r["p"])
