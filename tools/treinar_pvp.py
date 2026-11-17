#!/usr/bin/env python3
"""Treina o classificador de conteúdo das mortes (floresta de árvores) e grava tools/pvp-arvore.json.
Rótulos de verdade: tools/rotulos-eventos.jsonl.gz (killboard-1, servidores US, EU e ASIA) com o equipamento de cada morte (montado por tools/montar_rotulos.py).
Características: as do evento (FEATS_BASE) mais as do catálogo do jogo (EXTRA: poder base das peças, tier equivalente, fama normalizada).
Uso: python3 tools/treinar_pvp.py [--gravar]"""
import collections, gzip, json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_predict
HERE = os.path.dirname(os.path.abspath(__file__))
MAPA = {"gank": "nenhum"}        # ganking no mundo aberto não é nenhum dos conteúdos classificados
R = [json.loads(l) for l in gzip.open(os.path.join(HERE, "rotulos-eventos.jsonl.gz"), "rt", encoding="utf-8")]
R = [r for r in R if r.get("x")]
# correções: mortes sem etiqueta no killboard-1 que são de duplas em sessão de Hellgate 2v2 (sem montaria, 6+ abates da dupla em 1 h); lista fixa porque o acervo só guarda 30 dias
COR = json.load(open(os.path.join(HERE, "rotulos-correcoes.json"))) if os.path.exists(os.path.join(HERE, "rotulos-correcoes.json")) else {}
for r in R: r["lab"] = COR.get(r["srv"], {}).get(str(r["id"]), r["lab"])
R = [r for r in R if r["lab"] != "zvz"]
y = np.array([MAPA.get(r["lab"], r["lab"]) for r in R]); srv = np.array([r["srv"] for r in R])
X = np.array([C.completar(r["x"], C.desempacotar(r)) for r in R], dtype=float)
print("exemplos:", len(y), dict(collections.Counter(y)), "servidores:", dict(collections.Counter(srv)))
def rf(seed=0): return RandomForestClassifier(n_estimators=80, min_samples_leaf=2, max_depth=14, random_state=seed, n_jobs=-1)
def cv(cols, seeds=3):
    ac = []; p = None
    for s in range(seeds):
        p = cross_val_predict(rf(s), X[:, cols], y, cv=StratifiedKFold(5, shuffle=True, random_state=s)); ac.append(float((p == y).mean()))
    return float(np.mean(ac)), p
n0 = len(C.FEATS_BASE)
a0, _ = cv(list(range(n0))); a1, p1 = cv(list(range(X.shape[1])))
print("acurácia (validação cruzada) só com as características do evento:", round(a0, 3), "| com as do catálogo:", round(a1, 3))
for s in sorted(set(srv)): m = srv == s; print("  servidor", s, ":", int(m.sum()), "mortes, acerto", round(float((p1[m] == y[m]).mean()), 3))
cl = sorted(set(y)); print("  por conteúdo (precisão / revocação):")
for c in cl:
    tp = int(((p1 == c) & (y == c)).sum()); print("   ", c, round(tp / max(1, int((p1 == c).sum())), 3), round(tp / max(1, int((y == c).sum())), 3), "n=", int((y == c).sum()))
m = rf().fit(X, y)
trees = []
for est in m.estimators_:
    T = est.tree_; v = T.value[:, 0, :]; v = v / v.sum(axis=1, keepdims=True)
    trees.append({"f": [int(i) for i in T.feature], "t": [round(float(t), 3) for t in T.threshold], "e": [int(i) for i in T.children_left], "d": [int(i) for i in T.children_right], "p": v.round(3).tolist()})
out = {"classes": [str(c) for c in m.classes_], "trees": trees, "n": int(len(y)), "acc_cv": round(a1, 3), "feats": C.FEATS}
bad = 0
for r, x in list(zip(R, X))[:200]:
    pr = C.prever_vetor(out, list(x)); ref = dict(zip(m.classes_, m.predict_proba(np.array([x]))[0]))
    if max(pr, key=pr.get) != max(ref, key=ref.get): bad += 1
print("divergências na conferência (leitura em Python x sklearn):", bad, "de 200")
if "--gravar" in sys.argv:
    json.dump(out, open(os.path.join(HERE, "pvp-arvore.json"), "w"), separators=(",", ":")); print("gravado:", os.path.getsize(os.path.join(HERE, "pvp-arvore.json")) // 1024, "KB")
