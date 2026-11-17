#!/usr/bin/env python3
"""Monta tools/rotulos-eventos.jsonl.gz: as mortes com rótulo de verdade (killboard-1) junto com o equipamento, lido do acervo do coletor.
Entrada: tools/rotulos-killboard1-eventos.json ({"us": {"id": "solo"}, "eu": {...}, "sgp": {...}}) e as pastas do acervo (PVP_DADOS, PVP_DADOS_EU, PVP_DADOS_SGP).
Uso: PVP_DADOS=... PVP_DADOS_EU=... PVP_DADOS_SGP=... python3 tools/montar_rotulos.py"""
import glob, gzip, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
rot = json.load(open(os.path.join(HERE, "rotulos-killboard1-eventos.json")))
raizes = {"us": os.environ.get("PVP_DADOS", ""), "eu": os.environ.get("PVP_DADOS_EU", ""), "sgp": os.environ.get("PVP_DADOS_SGP", "")}
saida = []; vistos = set()
if os.path.exists(os.path.join(HERE, "rotulos-eventos.jsonl.gz")):      # o que já está guardado continua (o acervo só guarda 30 dias)
    for l in gzip.open(os.path.join(HERE, "rotulos-eventos.jsonl.gz"), "rt", encoding="utf-8"):
        r = json.loads(l); saida.append(r); vistos.add((r["srv"], str(r["id"])))
for srv, raiz in raizes.items():
    if not raiz: continue
    alvo = rot.get(srv) or {}
    for f in sorted(glob.glob(os.path.join(raiz, "eventos", "*.jsonl.gz"))):
        for l in gzip.open(f, "rt", encoding="utf-8"):
            r = json.loads(l); k = str(r["id"])
            if k in alvo and (srv, k) not in vistos:
                r["lab"] = alvo[k]; r["srv"] = srv; saida.append(r); vistos.add((srv, k))
with gzip.open(os.path.join(HERE, "rotulos-eventos.jsonl.gz"), "wt", encoding="utf-8") as f:
    for r in saida: f.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")
print("mortes rotuladas com equipamento:", len(saida), "de", sum(len(v) for v in rot.values()), "rótulos")
