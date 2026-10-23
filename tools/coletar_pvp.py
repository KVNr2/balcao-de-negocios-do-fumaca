#!/usr/bin/env python3
"""Coleta o feed global de mortes da API oficial (a mesma do killboard do Albion): /events?limit=51&offset=N.
Guarda as mortes de PvP pequeno (hg2, hg5, corrompida, solo, depths) de qualquer jogador em DADOS/eventos/AAAA-MM-DD.jsonl.gz, sem repetir.
Quem passa do limite de participantes do conteúdo fica de fora. Os arquivos com mais de 30 dias são apagados pela atualização diária (tools/expurgar.py).
Rodado a cada ~15 min pelo workflow pvp-coleta.yml. Uso: coletar_pvp.py DIR_DADOS"""
import gzip, json, os, sys, time, datetime, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
B = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
MAX_DIA = 45000   # teto de mortes guardadas por dia (cada arquivo diário fica em ~10 MB)
CONT = ("hg2", "hg5", "corrompida", "solo", "depths"); CONF = 0.7; DIAS = 30; MAXEV = 1200000; PAGS = 20
import api_suave
get = api_suave.get
def ler_dia(f):
    out = {}
    if os.path.exists(f):
        for l in gzip.open(f, "rt", encoding="utf-8"):
            try: r = json.loads(l); out[r["id"]] = r
            except Exception: pass
    return out
def main(d):
    api_suave.PRAZO[0] = time.time() + 6.5 * 60   # passou disso, para de pedir e grava o que já tem (o job tem 10 min)
    ed = os.path.join(d, "eventos"); os.makedirs(ed, exist_ok=True); arv = C.carregar()
    hoje = datetime.datetime.utcnow().date(); dias = [str(hoje - datetime.timedelta(days=k)) for k in range(0, 2)]
    # um arquivo por dia (data da morte). Para não repetir, olho o de hoje e o de ontem
    tem = {}; arqs = {}
    for dia in dias:
        arqs[dia] = ler_dia(os.path.join(ed, dia + ".jsonl.gz")); tem.update(arqs[dia])
    antes = len(tem); lidos = novos = 0
    cand = []; novas_l = []; nv = set()
    for pg in range(PAGS):
        r = get(f"/events?limit=51&offset={pg * 51}")
        if not isinstance(r, list) or not r: break
        for e in r:
            if not isinstance(e, dict) or "Killer" not in e: continue
            lidos += 1
            if e["EventId"] in tem: continue
            try: pr = C.prever(arv, C.feat(e))
            except Exception: continue
            c = max(pr, key=pr.get)
            if c in CONT and pr[c] >= CONF and C.cabe(c, e): cand.append((c, e, pr[c]))
    for c, e, q in cand:
        r = C.empacotar(e, c, q, arv.get("_v")); tem[e["EventId"]] = r; novas_l.append(r); nv.add(r["id"]); novos += 1
    for r in novas_l:
        dia = arqs.setdefault(r["t"][:10], {})
        if len(dia) < MAX_DIA: dia[r["id"]] = r
        else: nv.discard(r["id"])
    for dia, rs in arqs.items():
        if not any(i in nv for i in rs): continue   # só regrava o dia que recebeu mortes novas
        with gzip.open(os.path.join(ed, dia + ".jsonl.gz"), "wt", encoding="utf-8") as o:
            for r in sorted(rs.values(), key=lambda r: r["t"]): o.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"falhas da API: {dict(api_suave.FALHAS)}")
    print(f"feed lido: {lidos} mortes; candidatas {len(cand)}; novas guardadas: {novos}; arquivos de hoje/ontem {antes} -> {antes + novos}")
    if lidos == 0: sys.exit(1)
main(sys.argv[1] if len(sys.argv) > 1 else "dados")
