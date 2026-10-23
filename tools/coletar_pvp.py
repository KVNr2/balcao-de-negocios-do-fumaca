#!/usr/bin/env python3
"""Coleta o feed global de mortes da API oficial (a mesma do killboard do Albion): /events?limit=51&offset=N.
Guarda só as mortes de PvP pequeno (hg2, hg5, corrompida, solo, depths) em DADOS/eventos.jsonl.gz, últimos 30 dias, sem repetir.
Rodado a cada ~15 min pelo workflow pvp-coleta.yml. Uso: coletar_pvp.py DIR_DADOS"""
import gzip, json, os, sys, time, datetime, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
B = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
CONT = ("hg2", "hg5", "corrompida", "solo", "depths"); CONF = 0.7; DIAS = 30; MAXEV = 250000; PAGS = 20
def get(path, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(B + path, headers=UA), timeout=30) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 400: return None          # passou do limite de offset
            time.sleep(5 * (i + 1) if e.code in (429, 503) else 2 + i)
        except Exception: time.sleep(2 + i)
    return None
def main(d):
    os.makedirs(d, exist_ok=True); f = os.path.join(d, "eventos.jsonl.gz"); arv = C.carregar()
    tem = {}
    if os.path.exists(f):
        for l in gzip.open(f, "rt", encoding="utf-8"):
            try: r = json.loads(l); tem[r["id"]] = r
            except Exception: pass
    antes = len(tem); lidos = novos = 0
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
            if c in CONT and pr[c] >= CONF: tem[e["EventId"]] = C.empacotar(e, c); novos += 1
        time.sleep(0.7)
    corte = (datetime.datetime.utcnow() - datetime.timedelta(days=DIAS)).strftime("%Y-%m-%dT%H:%M:%S")
    rs = sorted((r for r in tem.values() if r["t"] >= corte), key=lambda r: r["t"])[-MAXEV:]
    with gzip.open(f, "wt", encoding="utf-8") as o:
        for r in rs: o.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"feed lido: {lidos} mortes; novas guardadas: {novos}; total {antes} -> {len(rs)}; mais antiga {rs[0]['t'] if rs else '-'}")
    if lidos == 0: sys.exit(1)
main(sys.argv[1] if len(sys.argv) > 1 else "dados")
