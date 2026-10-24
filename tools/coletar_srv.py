#!/usr/bin/env python3
"""Candidatas a Ancient Lands dos servidores da Europa e da Ásia (o coletor principal só lê as Américas), para dar variedade aos exemplos.
Lê o feed global de cada servidor (/events?limit=51&offset=N) e guarda, sem rótulo, as candidatas no mesmo formato de tools/cand_ancient.py
em DIR/<servidor>/ancient/cand-AAAA-MM-DD.jsonl.gz. Não toca nos dados do site. Guarda só 7 dias. Uso: coletar_srv.py DIR [eu sgp]"""
import os, sys, time, glob, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C, api_suave, cand_ancient
SRV = {"eu": "https://gameinfo-ams.albiononline.com/api/gameinfo", "sgp": "https://gameinfo-sgp.albiononline.com/api/gameinfo"}
PAGS = 20
def main(d, servidores):
    api_suave.PRAZO[0] = time.time() + 5 * 60; arv = C.carregar()
    for s in servidores:
        api_suave.B = SRV[s]; al = []; lidos = 0
        for pg in range(PAGS):
            r = api_suave.get(f"/events?limit=51&offset={pg * 51}")
            if not isinstance(r, list) or not r: break
            for e in r:
                if not isinstance(e, dict) or "Killer" not in e: continue
                lidos += 1
                try: pr = C.prever(arv, C.feat(e))
                except Exception: continue
                al.append((e, pr, False))
        pasta = os.path.join(d, s); nov = cand_ancient.guardar(pasta, al)
        lim = (datetime.datetime.utcnow() - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
        for f in glob.glob(os.path.join(pasta, "ancient", "cand-*.jsonl.gz")):
            if os.path.basename(f)[5:15] < lim: os.remove(f)
        print(f"{s}: feed {lidos} mortes; candidatas novas {nov}; falhas {dict(api_suave.FALHAS)}")
if __name__ == "__main__": main(sys.argv[1], sys.argv[2:] or list(SRV))
