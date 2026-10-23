#!/usr/bin/env python3
"""Coleta o feed global de mortes da API oficial (a mesma do killboard do Albion): /events?limit=51&offset=N.
Guarda só as mortes de PvP pequeno (hg2, hg5, corrompida, solo, depths) em DADOS/eventos.jsonl.gz, últimos 7 dias (máx. 300 mil), sem repetir.
Rodado a cada ~15 min pelo workflow pvp-coleta.yml. Uso: coletar_pvp.py DIR_DADOS"""
from concurrent.futures import ThreadPoolExecutor
import gzip, json, os, sys, time, datetime, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
B = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
LIM = 500e6; BUDGET_PERFIS = 400   # só entra morte em que alguém (quem venceu ou a vítima) tem 500 mi de fama de PvP ou mais
CONT = ("hg2", "hg5", "corrompida", "solo", "depths"); CONF = 0.7; DIAS = 7; MAXEV = 300000; PAGS = 20
def get(path, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(B + path, headers=UA), timeout=30) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 400: return None          # passou do limite de offset
            time.sleep(5 * (i + 1) if e.code in (429, 503) else 2 + i)
        except Exception: time.sleep(2 + i)
    return None
def fama_ok(c0, agora):
    """cache [fama, quando]: quem já tem 500 mi nunca expira (a fama só sobe); os abaixo são relidos depois de 7 dias"""
    return c0 and (c0[0] is not None and (c0[0] >= LIM or agora - c0[1] < 7 * 86400))
def main(d):
    os.makedirs(d, exist_ok=True); f = os.path.join(d, "eventos.jsonl.gz"); arv = C.carregar()
    tem = {}
    if os.path.exists(f):
        for l in gzip.open(f, "rt", encoding="utf-8"):
            try: r = json.loads(l); tem[r["id"]] = r
            except Exception: pass
    antes = len(tem); lidos = novos = 0; sem_fama = 0
    pf = os.path.join(d, "perfis.json")   # tabela de jogadores: id -> [fama de PvP, quando foi lida]
    try: cache = json.load(open(pf)) if os.path.exists(pf) else {}
    except Exception: cache = {}
    agora = time.time(); cand = []
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
            if c in CONT and pr[c] >= CONF and C.cabe(c, e): cand.append((c, e))
        time.sleep(0.7)
    ids = set()
    for c, e in cand:
        for p in [e["Killer"], e["Victim"]] + (e.get("Participants") or []):
            if p.get("Id"): ids.add(p["Id"])
    falta = [i for i in ids if not fama_ok(cache.get(i), agora)][:BUDGET_PERFIS]
    def perfil(i):
        r = get(f"/players/{i}", tries=2); return i, (r.get("KillFame") if isinstance(r, dict) else None)
    with ThreadPoolExecutor(8) as ex:
        for i, fm in ex.map(perfil, falta):
            if fm is not None: cache[i] = [fm, agora]
    for c, e in cand:
        venc = {e["Killer"].get("Id")} | {p.get("Id") for p in (e.get("Participants") or []) if (p.get("DamageDone") or 0) > 0 or (p.get("SupportHealingDone") or 0) > 0}
        gs = [(cache.get(i) or [None])[0] for i in venc | {e["Victim"].get("Id")} if i]
        if any(g is not None and g >= LIM for g in gs): tem[e["EventId"]] = C.empacotar(e, c); novos += 1
        elif any(g is None for g in gs): sem_fama += 1
    json.dump({i: v for i, v in cache.items() if v[0] >= LIM or agora - v[1] < 60 * 86400}, open(pf, "w"), separators=(",", ":"))
    corte = (datetime.datetime.utcnow() - datetime.timedelta(days=DIAS)).strftime("%Y-%m-%dT%H:%M:%S")
    rs = sorted((r for r in tem.values() if r["t"] >= corte), key=lambda r: r["t"])[-MAXEV:]
    with gzip.open(f, "wt", encoding="utf-8") as o:
        for r in rs: o.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"feed lido: {lidos} mortes; candidatas {len(cand)}; sem fama conhecida {sem_fama}; jogadores na tabela {len(cache)}; novas guardadas: {novos}; total {antes} -> {len(rs)}; mais antiga {rs[0]['t'] if rs else '-'}")
    if lidos == 0: sys.exit(1)
main(sys.argv[1] if len(sys.argv) > 1 else "dados")
