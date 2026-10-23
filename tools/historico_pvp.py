#!/usr/bin/env python3
"""Carga de histórico: para os jogadores que já aparecem no acervo, lê as últimas mortes que mataram (kills) e em que morreram (deaths)
pela API oficial (/players/{id}/kills|deaths) e guarda as lutas dos últimos 30 dias que o feed global não pegou.
Ritmo gentil (api_suave: 0,6 s entre pedidos, pausa em 429/503) e prazo curto: roda um pouco por hora. Uso: historico_pvp.py DIR_DADOS [MINUTOS]"""
import gzip, json, os, sys, time, datetime, glob, collections, heapq
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C, api_suave
from coletar_pvp import ler_dia, MAX_DIA, CONT, CONF, DIAS
get = api_suave.get
REFAZ = 14   # só relê um jogador depois de tantos dias
GRUPO = ("hg2", "hg5", "depths")
PESO = {"hg2": 4, "hg5": 10, "depths": 4}   # lutas em grupo valem mais: é onde falta amostra (os outros conteúdos pesam 1)
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
            tem.add(r["id"]); w = PESO.get(r["c"], 1)
            for p in [r["k"], r["v"]] + r["p"] + r.get("s", []):   # inclui os colegas de grupo: viram candidatos também
                if p.get("i"): freq[p["i"]] += w
    # sementes: jogadores que já eram os mais ativos em cada conteúdo (do método antigo); entram na fila com peso extra, sobretudo no 5v5, que é o mais raro
    try:
        for c, lst in json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "pvp-sementes.json"))).items():
            for pid, _ in lst: freq[pid] += {"hg5": 30, "hg2": 8, "depths": 8}.get(c, 2)
    except Exception: pass
    ef = os.path.join(d, "historico.json")
    try: feitos = json.load(open(ef))
    except Exception: feitos = {}
    hoje = datetime.datetime.utcnow().date(); lim = str(hoje - datetime.timedelta(days=REFAZ))
    def info(p):    # [data, mortes novas guardadas, mortes vistas] (formato antigo: só a data)
        x = feitos.get(p)
        return ["", 0, 0] if x is None else [x, 0, 0] if isinstance(x, str) else x
    def nota(p):
        """prioridade = peso do jogador no acervo x rendimento da última leitura (quem não rendeu nada passa para o fim da fila)"""
        f = freq[p]; _, nv, vs = info(p)
        return f * (0.15 if vs and nv == 0 else 1 + min(nv, 10) / 5)
    pilha = [(-nota(p), p) for p in freq if info(p)[0] < lim]; heapq.heapify(pilha); fila_n = len(pilha)
    mud = set(); lidos = novos = jog = bola = 0
    while pilha:
        if api_suave.PRAZO[0] and time.time() > api_suave.PRAZO[0]: break
        ns, pid = heapq.heappop(pilha)
        if info(pid)[0] >= lim or -ns != nota(pid): continue   # já lido ou prioridade desatualizada
        nv = vs = 0
        for via in ("kills", "deaths"):
            r = get(f"/players/{pid}/{via}?limit=51&offset=0", tries=2)
            if not isinstance(r, list): continue
            for e in r:
                if not isinstance(e, dict) or "Killer" not in e: continue
                lidos += 1; vs += 1
                if e["EventId"] in tem or e["TimeStamp"][:10] < corte: continue
                try: pr = C.prever(arv, C.feat(e))
                except Exception: continue
                c = max(pr, key=pr.get)
                if c not in CONT or pr[c] < CONF or not C.cabe(c, e): continue
                rr = C.empacotar(e, c, pr[c], arv.get("_v")); dia = arqs.setdefault(rr["t"][:10], {})
                if len(dia) >= MAX_DIA: continue
                dia[rr["id"]] = rr; tem.add(rr["id"]); mud.add(rr["t"][:10]); novos += 1; nv += 1
                for p in [rr["k"], rr["v"]] + rr["p"] + rr.get("s", []):   # bola de neve: os envolvidos numa luta nova entram na fila
                    q = p.get("i")
                    if not q or info(q)[0] >= lim: continue
                    if q not in freq: bola += 1
                    freq[q] += PESO.get(c, 1); heapq.heappush(pilha, (-nota(q), q))
        feitos[pid] = [str(hoje), nv, vs]; jog += 1
    for dia in mud:
        with gzip.open(os.path.join(ed, dia + ".jsonl.gz"), "wt", encoding="utf-8") as o:
            for r in sorted(arqs[dia].values(), key=lambda r: r["t"]): o.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")
    feitos = {p: x for p, x in feitos.items() if (x if isinstance(x, str) else x[0]) >= str(hoje - datetime.timedelta(days=REFAZ + 7))}
    json.dump(feitos, open(ef, "w"), separators=(",", ":"))
    print(f"histórico: {jog} jogadores lidos (fila {fila_n}, {bola} novos pela bola de neve); {lidos} mortes vistas; {novos} novas guardadas; falhas da API: {dict(api_suave.FALHAS)}")
    api_suave.registrar(d, "hist", {"jogadores": jog, "mortes_vistas": lidos, "novas": novos})
if __name__ == "__main__": main(sys.argv[1] if len(sys.argv) > 1 else "dados", float(sys.argv[2]) if len(sys.argv) > 2 else 4.5)
