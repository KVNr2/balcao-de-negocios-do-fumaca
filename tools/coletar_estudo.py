#!/usr/bin/env python3
"""Material para o estudo de Ancient Lands: baixa o JSON COMPLETO (todos os campos) de
 - positivos: os eventos confirmados por vídeo (ids-ancient.json, Américas, Europa e Ásia);
 - fracos: mortes recentes do feed com item de dragão exato (itens que só existem por causa de AL), nos três servidores;
 - negativos: mortes recentes do feed que o classificador atual reconhece com folga como outro conteúdo (hg2, hg5, corrompida, solo, depths).
Grava tools/estudo-ancient.json.gz (acumula entre execuções). Uso: coletar_estudo.py"""
import gzip, json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pvp_comum as C, api_suave
SRV = {"us": "https://gameinfo.albiononline.com/api/gameinfo", "eu": "https://gameinfo-ams.albiononline.com/api/gameinfo", "sgp": "https://gameinfo-sgp.albiononline.com/api/gameinfo"}
TOK = {"QUESTITEM_TOKEN_DRAGONS", "SHARD_FIRE_DRAGON", "SHARD_RANDOM_DUNGEON_ELITE_DRAGON_TOKEN"}
f = os.path.join(HERE, "estudo-ancient.json.gz")
D = json.load(gzip.open(f, "rt")) if os.path.exists(f) else {}
arv = C.carregar(); api_suave.PRAZO[0] = time.time() + 40 * 60
def tem_tok(e): return bool(TOK & set(C.familias(e["Victim"])))
# 1) positivos confirmados por vídeo
for fnt in json.load(open(os.path.join(HERE, "ids-ancient.json")))["fontes"]:
    s = fnt.get("servidor", "us"); api_suave.B = SRV[s]
    for i in fnt["ids"]:
        k = f"{s}:{i}"
        if k in D: continue
        e = api_suave.get(f"/events/{i}")
        if isinstance(e, dict) and "Killer" in e: D[k] = {"cls": "al", "srv": s, "video": fnt["video"], "e": e}
print("positivos:", sum(1 for v in D.values() if v["cls"] == "al"), flush=True)
# 2) feed recente dos três servidores: fracos (dragão) e negativos (folga)
neg = {s: sum(1 for v in D.values() if v["cls"] == "neg" and v["srv"] == s) for s in SRV}
for s in SRV:
    api_suave.B = SRV[s]
    for pg in range(20):
        r = api_suave.get(f"/events?limit=51&offset={pg * 51}")
        if not isinstance(r, list) or not r: break
        for e in r:
            if not isinstance(e, dict) or "Killer" not in e: continue
            k = f"{s}:{e['EventId']}"
            if k in D: continue
            try: pr = C.prever(arv, C.feat(e)); c = max(pr, key=pr.get)
            except Exception: continue
            if tem_tok(e): D[k] = {"cls": "fraco", "srv": s, "e": e}
            elif c in ("hg2", "hg5", "corrompida", "solo", "depths") and pr[c] >= .9 and C.cabe(c, e) and neg[s] < 400:
                D[k] = {"cls": "neg", "srv": s, "c": c, "e": e}; neg[s] += 1
    print(s, "fracos:", sum(1 for v in D.values() if v["cls"] == "fraco" and v["srv"] == s), "neg:", neg[s], flush=True)
with gzip.open(f, "wt", encoding="utf-8") as o: json.dump(D, o, separators=(",", ":"))
print("total:", len(D), "tamanho MB:", round(os.path.getsize(f) / 1e6, 1))
