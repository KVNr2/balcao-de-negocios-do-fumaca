#!/usr/bin/env python3
"""Estudo de Ancient Lands sobre tools/estudo-ancient.json.gz: características só da VÍTIMA (as de quem matou vazam: 45 de 57 mortes confirmadas são do mesmo jogador).
Compara conjuntos de características por validação cruzada agrupada (vídeo/streamer) e mede o acerto com 1% e 2% de falsos positivos."""
import gzip, json, os, sys, collections
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import pvp_comum as C
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score
TOK = {"QUESTITEM_TOKEN_DRAGONS", "SHARD_FIRE_DRAGON", "SHARD_RANDOM_DUNGEON_ELITE_DRAGON_TOKEN"}
D = json.load(gzip.open(os.path.join(HERE, "estudo-ancient.json.gz"), "rt"))
def carac(e):
    V, K = e["Victim"], e["Killer"]; q = V.get("Equipment") or {}; fam = set(C.familias(V)); inv = [x for x in (V.get("Inventory") or []) if x]
    import re
    tiers = [int(m.group(1)) for x in inv for m in [re.match(r"T(\d)", x.get("Type", ""))] if m]
    vit = {"ipV": V.get("AverageItemPower") or 0, "montV": bool(q.get("Mount")), "bagV": bool(q.get("Bag")), "potV": bool(q.get("Potion")), "foodV": bool(q.get("Food")), "capeV": bool(q.get("Cape")),
           "inv": len(inv), "nFam": len(fam), "nTes": sum(1 for f in fam if f.startswith("TREASURE")), "tok": len(TOK & fam),
           "relic": "RELIC" in fam, "soul": "SOUL" in fam, "rune": "RUNE" in fam, "tierInv": float(np.mean(tiers)) if tiers else 0, "silverbag": "SILVERBAG_NONTRADABLE" in fam}
    ctx = {"nGM": len(e.get("GroupMembers") or []), "nPart": e.get("numberOfParticipants") or 0}
    kil = {"ipK": K.get("AverageItemPower") or 0, "montK": bool((K.get("Equipment") or {}).get("Mount"))}
    return vit, ctx, kil
rows = [(v["cls"], v["srv"], v.get("video", "-"), carac(v["e"])) for v in D.values()]
cls = np.array([r[0] for r in rows]); vid = np.array([("w0n" if r[2].startswith("twitch:") else r[2]) if r[0] == "al" else "x" for r in rows])
def M(partes): return np.array([[float(x) for p in partes for x in r[3][p].values()] for r in rows])
conj = {"só vítima": [0], "vítima + grupo (nGM, nPart)": [0, 1], "vítima + grupo + assassino": [0, 1, 2], "só grupo + assassino (o que o w0n deixa vazar)": [1, 2]}
al = cls == "al"; neg = cls == "neg"; fr = cls == "fraco"
print(f"positivos {al.sum()} | negativos {neg.sum()} | portadores de item de dragão {fr.sum()}")
def rf(): return RandomForestClassifier(n_estimators=300, min_samples_leaf=2, max_depth=12, random_state=0, n_jobs=-1, class_weight="balanced")
rng = np.random.RandomState(0); fold_neg = rng.randint(0, 5, len(rows))
for nome, p in conj.items():
    X = M(p); sc = np.full(len(rows), np.nan); fr_sc = np.zeros(len(rows))
    for k in range(5):   # cada rodada tira um grupo de vídeos de AL e um quinto dos negativos
        vids = sorted(set(vid[al])); fora = {v for i, v in enumerate(vids) if i % 5 == k}
        te = (al & np.isin(vid, list(fora))) | (neg & (fold_neg == k)); tr = (al | neg) & ~te
        mod = rf().fit(X[tr], al[tr].astype(int)); sc[te] = mod.predict_proba(X[te])[:, 1]; fr_sc += mod.predict_proba(X)[:, 1] / 5 * fr
    m = al | neg; auc = roc_auc_score(al[m], sc[m])
    lim = {fp: np.quantile(sc[neg & ~np.isnan(sc)], 1 - fp) for fp in (.01, .02, .05)}
    rec = {fp: (sc[al] >= l).mean() for fp, l in lim.items()}
    prop = {fp: (fr_sc[fr] >= l).mean() for fp, l in lim.items()}
    print(f"{nome:46s} AUC {auc:.2f} | acerto com 1% FP: {rec[.01]:.0%}, 2%: {rec[.02]:.0%}, 5%: {rec[.05]:.0%} | portadores de dragão pontuados como AL (1%/2%): {prop[.01]:.0%}/{prop[.02]:.0%}")
# importância na melhor configuração
X = M([0, 1]); mod = rf().fit(X[al | neg], al[al | neg].astype(int)); nomes = list(rows[0][3][0]) + list(rows[0][3][1])
print("importância (vítima + grupo):", sorted(zip(np.round(mod.feature_importances_, 3), nomes), reverse=True)[:8])
