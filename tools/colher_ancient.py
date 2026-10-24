#!/usr/bin/env python3
"""Guarda, sem rótulo, as mortes e kills recentes dos jogadores de tools/fontes-ancient.json (candidatos a exemplos de Ancient Lands).
A API só devolve os 10 últimos de cada lista, então isto roda em todo ciclo. O rótulo vem depois (janelas de transmissão com título "Ancient Lands").
Saída: DIR/ancient/AAAA-MM.jsonl.gz com {id,t,f:"k"|"v",s:índice da fonte,x:vetor de características,g:membros do grupo,n:participantes,p:previsão atual}. Uso: colher_ancient.py DIR_DADOS"""
import gzip, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C, api_suave
def ler(f):
    out = {}
    if os.path.exists(f):
        for l in gzip.open(f, "rt", encoding="utf-8"):
            try: r = json.loads(l); out[(r["id"], r["f"])] = r
            except Exception: pass
    return out
def main(d):
    api_suave.PRAZO[0] = time.time() + 90
    fs = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fontes-ancient.json")))["ids"]
    pasta = os.path.join(d, "ancient"); os.makedirs(pasta, exist_ok=True); arv = C.carregar(); arqs = {}; novos = 0
    for i, pid in enumerate(fs):
        for lado, rota in (("v", "deaths"), ("k", "kills")):
            r = api_suave.get(f"/players/{pid}/{rota}")
            if not isinstance(r, list): continue
            for e in r:
                if not isinstance(e, dict) or "Killer" not in e: continue
                mes = e["TimeStamp"][:7]
                if mes not in arqs: arqs[mes] = ler(os.path.join(pasta, mes + ".jsonl.gz"))
                ch = (e["EventId"], lado)
                if ch in arqs[mes]: continue
                try:
                    f = C.feat(e); x = C.vetor(f); pr = C.prever(arv, f); c = max(pr, key=pr.get)
                except Exception: continue
                arqs[mes][ch] = {"id": e["EventId"], "t": e["TimeStamp"][:19] + "Z", "f": lado, "s": i, "x": x if isinstance(x, list) else list(x),
                                 "g": len(e.get("GroupMembers") or []), "n": e.get("numberOfParticipants"), "p": [c, round(pr[c], 2)]}
                novos += 1
    for mes, rs in arqs.items():
        with gzip.open(os.path.join(pasta, mes + ".jsonl.gz"), "wt", encoding="utf-8") as o:
            for r in sorted(rs.values(), key=lambda r: (r["t"], r["f"])): o.write(json.dumps(r, separators=(",", ":")) + "\n")
    print(f"ancient: {novos} eventos novos das fontes")
    api_suave.registrar(d, "ancient", {"novos": novos})
if __name__ == "__main__": main(sys.argv[1] if len(sys.argv) > 1 else "dados")
