#!/usr/bin/env python3
"""Treina a árvore de decisão que diz de qual conteúdo é uma morte (rótulos do killboard-1, servidor US) e grava tools/pvp-arvore.json."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import cross_val_score
import pvp_comum as C
E = [e for e in json.load(open("tools/sonda-eventos.json")) if e["srv"] == "us" and e["lab"] != "gank"]
X = [C.vetor(e) for e in E]; y = [e["lab"] for e in E]
t = DecisionTreeClassifier(max_depth=6, min_samples_leaf=5, random_state=0)
print("acurácia (validação cruzada):", round(cross_val_score(t, X, y, cv=5).mean(), 3))
t.fit(X, y); T = t.tree_
p = (T.value[:, 0, :] / T.value[:, 0, :].sum(axis=1, keepdims=True)).round(3).tolist()
json.dump({"classes": list(t.classes_), "f": [int(i) for i in T.feature], "t": [round(float(v), 2) for v in T.threshold],
           "e": [int(i) for i in T.children_left], "d": [int(i) for i in T.children_right], "p": p, "n": len(E), "feats": C.FEATS},
          open("tools/pvp-arvore.json", "w"), separators=(",", ":"))
print("nós:", T.node_count)
