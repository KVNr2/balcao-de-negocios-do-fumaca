#!/usr/bin/env python3
"""Acrescenta às mortes de tools/sonda-eventos.json as características novas (nTes, nDrag: tesouros e itens de dragão no inventário da vítima),
baixando cada evento da API oficial (servidor US). Pode ser repetido: só pede os que ainda não têm."""
import json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pvp_comum as C, api_suave
f = os.path.join(HERE, "sonda-eventos.json"); E = json.load(open(f)); ok = falha = 0
FIM = time.time() + 38 * 60   # orçamento: grava o que deu e para; pode rodar de novo para continuar
from concurrent.futures import ThreadPoolExecutor
pend = [e for e in E if e["srv"] == "us" and "nTes" not in e and e.get("falhas", 0) < 2]
def um(e):
    if time.time() > FIM: return None
    return e, api_suave.get(f"/events/{e['id']}")
with ThreadPoolExecutor(8) as ex:
    for k, res in enumerate(ex.map(um, pend), 1):
        if res is None: continue
        e, r = res
        if not isinstance(r, dict) or "Victim" not in r: falha += 1; e["falhas"] = e.get("falhas", 0) + 1
        else: e["nTes"] = C._conta(r["Victim"], "TREASURE"); e["nDrag"] = C._conta(r["Victim"], "DRAGON"); ok += 1
        if k % 50 == 0: json.dump(E, open(f, "w"), separators=(",", ":")); print(ok, "feitos", flush=True)
json.dump(E, open(f, "w"), separators=(",", ":"))
print("enriquecidos:", ok, "falhas:", falha, dict(api_suave.FALHAS))
