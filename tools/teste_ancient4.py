#!/usr/bin/env python3
"""Teste 4: como o teste 3, mas os negativos vêm do acervo dos coletores (3 servidores), com os mesmos tamanhos de grupo das AL
(classes solo, hg2, hg5, depths, corrompida com confiança >= .85), em vez dos negativos da sonda (90% solo).
Uso: teste_ancient4.py DIR_US DIR_EU DIR_SGP"""
import glob, gzip, json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score
HERE = os.path.dirname(os.path.abspath(__file__))
NOMES = ["nGM", "nPart", "ipV", "mountV", "bagV", "invV", "fame", "potionV", "potCombate", "potCresc", "direboar"]
IDX = [C.FEATS.index(k) for k in NOMES]
D = list(json.load(gzip.open(os.path.join(HERE, "estudo-ancient.json.gz"))).values())
def X(e): return np.array(C.vetor(C.feat(e)))[IDX]
STREAMER = os.environ.get("STREAMER") == "1"
cls = np.array([d["cls"] for d in D]); src = np.array([("w0n" if STREAMER and str(d.get("video")).startswith("twitch:") else (d.get("video") or d["srv"])) for d in D]); Xs = np.array([X(d["e"]) for d in D])
al = np.where(cls == "al")[0]; fr = np.where(cls == "fraco")[0]
# negativos do acervo
N = []; rng = np.random.RandomState(2)
for d in sys.argv[1:4]:
    for f in sorted(glob.glob(os.path.join(d, "eventos", "*.jsonl.gz"))):
        for l in gzip.open(f, "rt"):
            try: r = json.loads(l)
            except Exception: continue
            x = r.get("x")
            if not x or len(x) < 15 or r.get("c") not in ("solo", "hg2", "hg5", "depths", "corrompida") or (r.get("q") or 0) < .85: continue
            if r.get("dx"): continue
            N.append([x[i] for i in IDX] + [r["c"]])
print("negativos do acervo:", len(N))
grp = np.array([n[0] for n in N]); XN = np.array([n[:-1] for n in N], dtype=float); cN = np.array([n[-1] for n in N])
# amostra: até 6000 por faixa de grupo (1, 2-3, 4-7, 8+)
faixa = lambda g: np.where(g <= 1, 0, np.where(g <= 3, 1, np.where(g <= 7, 2, 3)))
sel = []
for b in range(4):
    ii = np.where(faixa(grp) == b)[0]; rng.shuffle(ii); sel += list(ii[:6000])
sel = np.array(sel); XN, grp, cN = XN[sel], grp[sel], cN[sel]
print("negativos usados por faixa de grupo:", {b: int((faixa(grp) == b).sum()) for b in range(4)}, "| por classe:", {c: int((cN == c).sum()) for c in set(cN)})
p = rng.permutation(len(XN)); cut = int(len(XN) * .7); ntr, nte = p[:cut], p[cut:]
def rf(): return RandomForestClassifier(n_estimators=300, min_samples_leaf=3, max_depth=14, random_state=0, n_jobs=-1, class_weight="balanced")
def rodar(nome, fracos):
    sa = []; ga = []; sn = None; sns = []
    for u in sorted(set(src[al])):
        m = src[al] == u; trA = al[~m]; teA = al[m]
        Xp = np.vstack([Xs[trA]] + ([Xs[fr]] if fracos else [])); X_ = np.vstack([Xp, XN[ntr]]); y = [1] * len(Xp) + [0] * len(ntr)
        md = rf().fit(X_, y); sa += list(md.predict_proba(Xs[teA])[:, 1]); ga += list(Xs[teA][:, 0]); sns.append(md.predict_proba(XN[nte])[:, 1])
    sa = np.array(sa); ga = np.array(ga); sn = np.mean(sns, axis=0); gn = XN[nte][:, 0]
    auc = roc_auc_score([1] * len(sa) + [0] * len(sn), list(sa) + list(sn))
    t2 = np.quantile(sn, .98); t1 = np.quantile(sn, .99)
    print(f"{nome}: AUC {auc:.2f} | acerto com FP 1%: {np.mean(sa > t1):.0%}, 2%: {np.mean(sa > t2):.0%}")
    for b, nm in enumerate(("grupo 1", "grupo 2-3", "grupo 4-7")):
        ma = faixa(ga) == b; mn = faixa(gn) == b
        if ma.sum() and mn.sum() > 30:
            t = np.quantile(sn[mn], .98); print(f"   {nm}: {int(ma.sum())} AL, acerto {np.mean(sa[ma] > t):.0%} com 2% de falso positivo medido só nos negativos do mesmo tamanho ({int(mn.sum())} negativos)")
rodar("A só AL confirmadas", False)
rodar("B + portadores de item exclusivo", True)
