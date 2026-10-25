#!/usr/bin/env python3
"""Teste 2 do reconhecimento de Ancient Lands (não mexe no modelo do site). Compara variantes:
 A base (17 características) | B + positivos extras (mortes com item de dragão) | C + características de itens | D + peso igual por fonte
Valida deixando de fora um vídeo por vez e também o streamer inteiro (w0n23 contra os outros)."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
from sklearn.ensemble import RandomForestClassifier
HERE = os.path.dirname(os.path.abspath(__file__))
TOK = {"QUESTITEM_TOKEN_DRAGONS", "SHARD_FIRE_DRAGON", "SHARD_RANDOM_DUNGEON_ELITE_DRAGON_TOKEN"}   # itens de dragão exatos (o texto solto "DRAGON" pega artefato de dungeon)
E = [e for e in json.load(open(os.path.join(HERE, "sonda-eventos.json"))) if e["srv"] == "us" and e["lab"] != "gank" and "fam" in e]
A = [a for a in json.load(open(os.path.join(HERE, "exemplos-ancient.json"))) if a.get("srv", "us") == "us" and "fam" in a]
dragE = np.array([bool(TOK & set(e["fam"])) for e in E])
X0 = np.array([C.vetor(e) for e in E]); XA = np.array([a["x"] for a in A], dtype=float); vA = np.array([a["v"] for a in A])
F0 = [set(e["fam"]) for e in E]; FA = [set(a["fam"]) for a in A]
grupoA = np.array(["w0n" if v.startswith("twitch:") else v for v in vA])
print(f"exemplos AL {len(A)} (vídeos {len(set(vA))}); outras mortes {len(E)}, das quais {int(dragE.sum())} com item de dragão exato")
def itens(fams, top):
    return np.array([[t in f for t in top] + [len(TOK & f), sum(1 for x in f if x.startswith("TREASURE")), len(f)] for f in fams], dtype=float)
def escolher(Fpos, Fneg, n=25):
    cp = {}; cn = {}
    for f in Fpos:
        for x in f: cp[x] = cp.get(x, 0) + 1
    for f in Fneg:
        for x in f: cn[x] = cn.get(x, 0) + 1
    r = sorted(((cp[x] / len(Fpos) - cn.get(x, 0) / max(len(Fneg), 1), x) for x in cp if cp[x] >= 4), reverse=True)
    return [x for d, x in r[:n] if d >= .1]
def rf(): return RandomForestClassifier(n_estimators=200, min_samples_leaf=2, max_depth=14, random_state=0, n_jobs=-1, class_weight="balanced")
def avaliar(nome, extra_pos, usa_itens, peso, unidade):
    rng = np.random.RandomState(1); idx = rng.permutation(len(E)); cut = int(len(E) * .7); tr0, te0 = idx[:cut], idx[cut:]
    tr0 = np.array([i for i in tr0]); te_neg = np.array([i for i in te0 if not dragE[i]])   # mortes com item de dragão não contam como "negativas" no teste
    hit = tot = fp = nfp = 0
    for u in sorted(set(unidade)):
        m = unidade == u
        trn = np.array([i for i in tr0 if not (extra_pos and dragE[i])]); wk = np.array([i for i in tr0 if extra_pos and dragE[i]], dtype=int)
        Xp = np.vstack([XA[~m]] + ([X0[wk]] if len(wk) else [])); Fp = [f for f, mm in zip(FA, m) if not mm] + [F0[i] for i in wk]
        Xn = X0[trn]; Fn = [F0[i] for i in trn]
        if usa_itens:
            top = escolher(Fp, Fn); Xp = np.hstack([Xp, itens(Fp, top)]); Xn = np.hstack([Xn, itens(Fn, top)])
        X = np.vstack([Xp, Xn]); y = np.array([1] * len(Xp) + [0] * len(Xn))
        w = np.ones(len(y))
        if peso:   # cada fonte (vídeo) soma o mesmo peso total no treino
            src = list(vA[~m]) + ["fraco"] * len(wk); cnt = {s: src.count(s) for s in set(src)}
            for k, s in enumerate(src): w[k] = len(Xp) / len(cnt) / cnt[s]
        mod = rf().fit(X, y, sample_weight=w)
        Xa = XA[m]; Xt = X0[te_neg]
        if usa_itens: Xa = np.hstack([Xa, itens([f for f, mm in zip(FA, m) if mm], top)]); Xt = np.hstack([Xt, itens([F0[i] for i in te_neg], top)])
        hit += int(mod.predict(Xa).sum()); tot += int(m.sum()); fp += int(mod.predict(Xt).sum()); nfp += len(te_neg)
    print(f"{nome:42s} acerto {hit/tot:4.0%} ({hit}/{tot})  falsos positivos {fp/nfp:4.1%}")
for titulo, un in (("deixando UM VÍDEO de fora", vA), ("deixando o STREAMER de fora (w0n23 / outros)", grupoA)):
    print("==", titulo)
    avaliar("A base", False, False, False, un)
    avaliar("B + positivos extras (dragão)", True, False, False, un)
    avaliar("C + itens", False, True, False, un)
    avaliar("B + C", True, True, False, un)
    avaliar("B + C + peso igual por fonte", True, True, True, un)
