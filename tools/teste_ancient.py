#!/usr/bin/env python3
"""Teste (não mexe no modelo do site): quão bem dá para reconhecer Ancient Lands só pelos dados da morte?
Valida deixando um VÍDEO inteiro de fora por vez (mortes do mesmo vídeo são parecidas entre si)."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
from sklearn.ensemble import RandomForestClassifier
HERE = os.path.dirname(os.path.abspath(__file__))
E = [e for e in json.load(open(os.path.join(HERE, "sonda-eventos.json"))) if e["srv"] == "us" and e["lab"] != "gank"]
A = [a for a in json.load(open(os.path.join(HERE, "exemplos-ancient.json"))) if a.get("srv", "us") == "us"]
X0 = np.array([C.vetor(e) for e in E]); y0 = np.array([e["lab"] for e in E])
XA = np.array([a["x"] for a in A], dtype=float); vA = np.array([a["v"] for a in A])
print("exemplos AL:", len(A), "de", len(set(vA)), "vídeos; outras classes:", len(E))
def rf(): return RandomForestClassifier(n_estimators=150, min_samples_leaf=2, max_depth=14, random_state=0, n_jobs=-1, class_weight="balanced")
hit = tot = 0; fp = 0
rng = np.random.RandomState(0); idx = rng.permutation(len(E)); cut = int(len(E) * .7)
tr0, te0 = idx[:cut], idx[cut:]
for v in sorted(set(vA)):
    m = vA == v
    Xt = np.vstack([X0[tr0], XA[~m]]); yt = np.concatenate([y0[tr0], np.array(["ancient"] * int((~m).sum()))])
    mod = rf().fit(Xt, yt)
    p = mod.predict(XA[m]); h = int((p == "ancient").sum()); hit += h; tot += int(m.sum())
    print(f"  fora {v}: {h}/{int(m.sum())} reconhecidos como Ancient;", "previsto:", dict(zip(*np.unique(p, return_counts=True))))
    fp += int((mod.predict(X0[te0]) == "ancient").sum())
print(f"recall Ancient (vídeo inédito): {hit}/{tot} = {hit/tot:.0%}")
print(f"falsos positivos nas outras classes (teste 30%): {fp/len(set(vA))/len(te0):.1%} em média")
