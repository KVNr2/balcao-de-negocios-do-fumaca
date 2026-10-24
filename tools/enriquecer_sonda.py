#!/usr/bin/env python3
"""Acrescenta às mortes de tools/sonda-eventos.json as características novas (nTes, nDrag: tesouros e itens de dragão no inventário da vítima),
baixando cada evento da API oficial (servidor US). Pode ser repetido: só pede os que ainda não têm."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pvp_comum as C, api_suave
f = os.path.join(HERE, "sonda-eventos.json"); E = json.load(open(f)); ok = falha = 0
for i, e in enumerate(E):
    if e["srv"] != "us" or "nTes" in e: continue
    r = api_suave.get(f"/events/{e['id']}")
    if not isinstance(r, dict) or "Victim" not in r: falha += 1; continue
    e["nTes"] = C._conta(r["Victim"], "TREASURE"); e["nDrag"] = C._conta(r["Victim"], "DRAGON"); ok += 1
    if ok % 100 == 0: json.dump(E, open(f, "w"), separators=(",", ":")); print(ok, "feitos", flush=True)
json.dump(E, open(f, "w"), separators=(",", ":"))
print("enriquecidos:", ok, "falhas:", falha, dict(api_suave.FALHAS))
