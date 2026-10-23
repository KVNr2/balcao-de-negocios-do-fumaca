#!/usr/bin/env python3
"""Carga de histórico: para os jogadores que já aparecem no acervo, lê as últimas mortes que mataram (kills) e em que morreram (deaths)
pela API oficial (/players/{id}/kills|deaths) e guarda as lutas dos últimos 30 dias que o feed global não pegou.
Ritmo gentil (api_suave: 0,6 s entre pedidos, pausa em 429/503) e prazo curto: roda um pouco por hora. Uso: historico_pvp.py DIR_DADOS [MINUTOS]"""
import gzip, json, os, sys, time, datetime, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C, api_suave
from coletar_pvp import ler_dia, MAX_DIA, CONT, CONF, DIAS
get = api_suave.get
REFAZ = 14   # só relê um jogador depois de tantos dias
def main(d, minutos=4.5):
    api_suave.PRAZO[0] = time.time() + minutos * 60
    ed = os.path.join(d, "eventos"); os.makedirs(ed, exist_ok=True); arv = C.carregar()
    corte = (datetime.datetime.utcnow() - datetime.timedelta(days=DIAS)).strftime("%Y-%m-%d")
    arqs = {}; tem = set(); freq = collections.Counter()
    for f in sorted(glob.glob(os.path.join(ed, "*.jsonl.gz"))):
        dia = os.path.basename(f)[:10]
        if dia < corte: continue
        arqs[dia] = ler_dia(f)
        for r in arqs[dia].values():
            tem.add(r["id"])
            for p in [r["k"], r["v"]] + r["p"] + r.get("s", []):
                if p.get("i"): freq[p["i"]] += 1
    ef = os.path.join(d, "historico.json")
    try: feitos = json.load(open(ef))
    except Exception: feitos = {}
    hoje = datetime.datetime.utcnow().date(); lim = str(hoje - datetime.timedelta(days=REFAZ))
    fila = [p for p, _ in freq.most_common() if feitos.get(p, "") < lim]
    mud = set(); lidos = novos = jog = 0
    for pid in fila:
        if api_suave.PRAZO[0] and time.time() > api_suave.PRAZO[0]: break
        for via in ("kills", "deaths"):
            r = get(f"/players/{pid}/{via}?limit=51&offset=0", tries=2)
            if not isinstance(r, list): continue
            for e in r:
                if not isinstance(e, dict) or "Killer" not in e: continue
                lidos += 1
                if e["EventId"] in tem or e["TimeStamp"][:10] < corte: continue
                try: pr = C.prever(arv, C.feat(e))
                except Exception: continue
                c = max(pr, key=pr.get)
                if c not in CONT or pr[c] < CONF or not C.cabe(c, e): continue
                rr = C.empacotar(e, c, pr[c], arv.get("_v")); dia = arqs.setdefault(rr["t"][:10], {})
                if len(dia) >= MAX_DIA: continue
                dia[rr["id"]] = rr; tem.add(rr["id"]); mud.add(rr["t"][:10]); novos += 1
        feitos[pid] = str(hoje); jog += 1
    for dia in mud:
        with gzip.open(os.path.join(ed, dia + ".jsonl.gz"), "wt", encoding="utf-8") as o:
            for r in sorted(arqs[dia].values(), key=lambda r: r["t"]): o.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")
    feitos = {p: t for p, t in feitos.items() if t >= str(hoje - datetime.timedelta(days=REFAZ + 7))}
    json.dump(feitos, open(ef, "w"), separators=(",", ":"))
    print(f"histórico: {jog} jogadores lidos (fila {len(fila)}); {lidos} mortes vistas; {novos} novas guardadas; falhas da API: {dict(api_suave.FALHAS)}")
if __name__ == "__main__": main(sys.argv[1] if len(sys.argv) > 1 else "dados", float(sys.argv[2]) if len(sys.argv) > 2 else 4.5)
