#!/usr/bin/env python3
"""Treina o classificador de conteúdo das mortes (floresta de árvores) e grava tools/pvp-arvore.json.
Rótulos de verdade: tools/sonda-eventos.json (killboard-1, servidor US). Opcional: PVP_DADOS=pasta do acervo do coletor; mortes ali
com confiança alta entram como exemplos extras (auto-treino), mas só se a validação nos rótulos de verdade não piorar.
Uso: python3 tools/treinar_pvp.py [--gravar]"""
import glob, gzip, json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
E = [e for e in json.load(open(os.path.join(HERE, "sonda-eventos.json"))) if e["srv"] == "us" and e["lab"] != "gank"]
X = np.array([C.vetor(e) for e in E]); y = np.array([e["lab"] for e in E])
def rf(): return RandomForestClassifier(n_estimators=80, min_samples_leaf=2, max_depth=14, random_state=0, n_jobs=-1)
# exemplos extras do acervo (só com vetor de características e confiança guardados pelo coletor)
XP = np.zeros((0, X.shape[1])); yp = np.array([])
d = os.environ.get("PVP_DADOS", "")
if d:
    ex = []
    for f in glob.glob(os.path.join(d, "eventos", "*.jsonl.gz")):
        for l in gzip.open(f, "rt", encoding="utf-8"):
            try: r = json.loads(l)
            except Exception: continue
            if r.get("x") and (r.get("q") or 0) >= 0.9: ex.append((r["x"], r["c"]))
    if ex: XP = np.array([a for a, _ in ex], dtype=float); yp = np.array([b for _, b in ex])
    print("exemplos extras do acervo (confiança >= 0,9):", len(ex))
def cv(extra):
    acc = []
    for tr, te in StratifiedKFold(5, shuffle=True, random_state=0).split(X, y):
        Xt, yt = X[tr], y[tr]
        if extra and len(yp): Xt = np.vstack([Xt, XP]); yt = np.concatenate([yt, yp])
        acc.append((rf().fit(Xt, yt).predict(X[te]) == y[te]).mean())
    return float(np.mean(acc))
a0 = cv(False); print("acurácia só com rótulos de verdade:", round(a0, 3))
usar = False
if len(yp) >= 200:
    a1 = cv(True); print("acurácia com exemplos do acervo:", round(a1, 3)); usar = a1 >= a0 - 0.002 and a1 > a0
Xf, yf = (np.vstack([X, XP]), np.concatenate([y, yp])) if usar else (X, y)
m = rf().fit(Xf, yf); print("modelo final com", len(yf), "exemplos", "(inclui acervo)" if usar else "(só rótulos de verdade)")
trees = []
for est in m.estimators_:
    T = est.tree_; v = T.value[:, 0, :]; v = v / v.sum(axis=1, keepdims=True)
    trees.append({"f": [int(i) for i in T.feature], "t": [round(float(t), 2) for t in T.threshold], "e": [int(i) for i in T.children_left], "d": [int(i) for i in T.children_right], "p": v.round(3).tolist()})
out = {"classes": [str(c) for c in m.classes_], "trees": trees, "n": int(len(yf)), "acc_cv": round(a0, 3), "feats": C.FEATS}
# confere que a leitura em Python (a do coletor) dá o mesmo que o sklearn
bad = 0
for e in E[:200]:
    pr = C.prever(out, e); ref = dict(zip(m.classes_, m.predict_proba(np.array([C.vetor(e)]))[0]))
    if max(pr, key=pr.get) != max(ref, key=ref.get): bad += 1
print("divergências na conferência:", bad, "de 200")
if "--gravar" in sys.argv:
    json.dump(out, open(os.path.join(HERE, "pvp-arvore.json"), "w"), separators=(",", ":")); print("gravado:", os.path.getsize(os.path.join(HERE, "pvp-arvore.json")) // 1024, "KB")
