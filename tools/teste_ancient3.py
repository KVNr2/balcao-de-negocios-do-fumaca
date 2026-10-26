#!/usr/bin/env python3
"""Teste 3 do reconhecimento de Ancient Lands (não mexe no modelo do site), com o material de tools/estudo-ancient.json.gz (3 servidores).
Só características justas (vítima e grupo; sem assassino e sem itens): nGM, nPart, ipV, mountV, bagV, invV, fame, potionV, potCombate, potCresc, direboar.
Compara: A só as AL confirmadas | B + portadores de item exclusivo de AL como positivos fracos (sem os usar de teste).
Valida deixando de fora um vídeo (fonte) por vez; negativos: 30% separados para teste."""
import gzip, json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
from sklearn.ensemble import RandomForestClassifier
HERE = os.path.dirname(os.path.abspath(__file__))
D = list(json.load(gzip.open(os.path.join(HERE, "estudo-ancient.json.gz"))).values())
IDX = [C.FEATS.index(k) for k in ("nGM", "nPart", "ipV", "mountV", "bagV", "invV", "fame", "potionV", "potCombate", "potCresc", "direboar")]
def X(e): return np.array(C.vetor(C.feat(e)))[IDX]
cls = np.array([d["cls"] for d in D]); src = np.array([d.get("video") or d["srv"] for d in D]); Xs = np.array([X(d["e"]) for d in D])
al = np.where(cls == "al")[0]; neg = np.where(cls == "neg")[0]; fr = np.where(cls == "fraco")[0]
rng = np.random.RandomState(1); p = rng.permutation(len(neg)); cut = int(len(neg) * .7); ntr, nte = neg[p[:cut]], neg[p[cut:]]
print(f"AL {len(al)} (fontes {len(set(src[al]))}) | negativos {len(neg)} (treino {len(ntr)}, teste {len(nte)}) | positivos fracos {len(fr)}")
def rf(): return RandomForestClassifier(n_estimators=300, min_samples_leaf=2, max_depth=12, random_state=0, n_jobs=-1, class_weight="balanced")
def rodar(nome, fracos, peso_fraco):
    hit = tot = 0; sc_al = []; sc_neg = []
    for u in sorted(set(src[al])):
        m = src[al] == u; trA = al[~m]; teA = al[m]
        tr = np.concatenate([trA, ntr] + ([fr] if fracos else [])); y = np.array([1] * len(trA) + [0] * len(ntr) + ([1] * len(fr) if fracos else []))
        w = np.ones(len(y)); 
        if fracos: w[len(trA) + len(ntr):] = peso_fraco
        mod = rf().fit(Xs[tr], y, sample_weight=w)
        sc_al += list(mod.predict_proba(Xs[teA])[:, 1]); sc_neg += list(mod.predict_proba(Xs[nte])[:, 1])
    sc_al = np.array(sc_al); sc_neg = np.array(sc_neg)
    out = []
    for fp in (0.01, 0.02, 0.05):
        t = np.quantile(sc_neg, 1 - fp); out.append(f"FP {fp:.0%}: acerto {np.mean(sc_al > t):4.0%}")
    from sklearn.metrics import roc_auc_score
    auc = roc_auc_score([1] * len(sc_al) + [0] * len(sc_neg), list(sc_al) + list(sc_neg))
    print(f"{nome:40s} AUC {auc:.2f} | " + " | ".join(out))
rodar("A só as AL confirmadas", False, 1)
rodar("B + positivos fracos (peso 1)", True, 1)
rodar("B + positivos fracos (peso 0,3)", True, 0.3)

# diagnóstico: importância e variantes sem 'fame' e sem 'invV'; acerto por tamanho de grupo
nomes = ["nGM", "nPart", "ipV", "mountV", "bagV", "invV", "fame", "potionV", "potCombate", "potCresc", "direboar"]
mod = rf().fit(Xs[np.concatenate([al, ntr])], [1] * len(al) + [0] * len(ntr))
print("importância:", sorted(zip(np.round(mod.feature_importances_, 3), nomes), reverse=True)[:7])
def sem(nome_cols):
    keep = [i for i, n in enumerate(nomes) if n not in nome_cols]
    hit = []; sn = []
    for u in sorted(set(src[al])):
        m = src[al] == u; trA = al[~m]; teA = al[m]
        tr = np.concatenate([trA, ntr]); y = [1] * len(trA) + [0] * len(ntr)
        md = rf().fit(Xs[tr][:, keep], y); hit += list(md.predict_proba(Xs[teA][:, keep])[:, 1]); sn += list(md.predict_proba(Xs[nte][:, keep])[:, 1])
    t = np.quantile(sn, .98); from sklearn.metrics import roc_auc_score
    print(f"sem {nome_cols}: AUC {roc_auc_score([1]*len(hit)+[0]*len(sn), hit+sn):.2f} acerto com 2% FP {np.mean(np.array(hit)>t):.0%}")
sem(["fame"]); sem(["fame", "invV"]); sem(["fame", "invV", "bagV"])
# acerto por tamanho de grupo (modelo A, 2% FP)
hit = []; gm = []; sn = []
for u in sorted(set(src[al])):
    m = src[al] == u; trA = al[~m]; teA = al[m]
    md = rf().fit(Xs[np.concatenate([trA, ntr])], [1] * len(trA) + [0] * len(ntr)); hit += list(md.predict_proba(Xs[teA])[:, 1]); gm += list(Xs[teA][:, 0]); sn += list(md.predict_proba(Xs[nte])[:, 1])
t = np.quantile(sn, .98); hit = np.array(hit); gm = np.array(gm)
for lo, hi in ((1, 1), (2, 3), (4, 7), (8, 99)):
    mm = (gm >= lo) & (gm <= hi)
    if mm.sum(): print(f"grupo {lo}-{hi}: {mm.sum()} AL, acerto {np.mean(hit[mm] > t):.0%}")
print("negativos do teste por grupo:", {k: int(((Xs[nte][:, 0] >= a) & (Xs[nte][:, 0] <= b)).sum()) for k, (a, b) in {"1": (1, 1), "2-3": (2, 3), "4-7": (4, 7)}.items()})
