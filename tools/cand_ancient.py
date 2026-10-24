"""Candidatas a Ancient Lands, sem rótulo: mortes do feed com grupo de 4–7 ou 15–20 jogadores (os tamanhos que os portais geram),
sem cara de ZvZ e sem maioria de armas típicas de gank. Só servem de material de teste; não entram nas builds do site.
Saída: DIR/ancient/cand-AAAA-MM-DD.jsonl.gz {id,t,x,g,n,p:[classe,confiança],k:1 se já está no acervo}. Teto por dia e guarda de 7 dias (expurgar.py)."""
import gzip, json, os, re
import pvp_comum as C
MAX_DIA = 3000
TAM = set(range(4, 8)) | set(range(15, 21))
# armas típicas de gank (garras, patas de urso, adagas duplas, foices, cajado do equilíbrio, besta), tiradas das builds de gank da comunidade
GANK = {"2H_CLAWPAIR", "2H_DUALAXE_KEEPER", "2H_DAGGERPAIR", "2H_DUALSICKLE_UNDEAD", "2H_QUARTERSTAFF_AVALON", "2H_CROSSBOW"}
def _base(t): return re.sub(r"^T\d_", "", (t or "")).split("@")[0]
def _armas(e):
    out = []
    for p in [e.get("Killer") or {}] + list(e.get("Participants") or []):
        t = ((p.get("Equipment") or {}).get("MainHand") or {}).get("Type")
        if t: out.append(_base(t))
    return out
def provavel_gank(e):
    a = _armas(e)
    return bool(a) and sum(1 for w in a if w in GANK) / len(a) >= 0.5
def serve(e, pr):
    g = len(e.get("GroupMembers") or [])
    return g in TAM and pr.get("zvz", 0) < 0.7 and not provavel_gank(e)
def guardar(d, itens):
    """itens: lista de (evento, previsão {classe:prob}, no_acervo:bool)"""
    pasta = os.path.join(d, "ancient"); os.makedirs(pasta, exist_ok=True); dias = {}; novos = 0
    for e, pr, kk in itens:
        if not serve(e, pr): continue
        dia = e["TimeStamp"][:10]
        if dia not in dias:
            dias[dia] = {}; f = os.path.join(pasta, f"cand-{dia}.jsonl.gz")
            if os.path.exists(f):
                for l in gzip.open(f, "rt", encoding="utf-8"):
                    try: r = json.loads(l); dias[dia][r["id"]] = r
                    except Exception: pass
        if e["EventId"] in dias[dia] or len(dias[dia]) >= MAX_DIA: continue
        try: x = C.vetor(C.feat(e))
        except Exception: continue
        c = max(pr, key=pr.get)
        dias[dia][e["EventId"]] = {"id": e["EventId"], "t": e["TimeStamp"][:19] + "Z", "x": [float(v) for v in x], "g": len(e.get("GroupMembers") or []),
                                   "n": e.get("numberOfParticipants"), "p": [c, round(pr[c], 2)], "k": 1 if kk else 0}; novos += 1
    for dia, rs in dias.items():
        with gzip.open(os.path.join(pasta, f"cand-{dia}.jsonl.gz"), "wt", encoding="utf-8") as o:
            for r in sorted(rs.values(), key=lambda r: r["t"]): o.write(json.dumps(r, separators=(",", ":")) + "\n")
    return novos
