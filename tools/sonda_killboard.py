#!/usr/bin/env python3
"""Sonda: mostra o que a API oficial do Albion (gameinfo) devolve, para planejar a aba de meta (killboard).
Só lê e grava tools/sonda-killboard.json (formato dos campos, valores de exemplo e contagens)."""
import json, urllib.request, collections, sys
B = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
def get(path):
    try:
        with urllib.request.urlopen(urllib.request.Request(B + path, headers=UA), timeout=60) as r:
            return json.load(r)
    except Exception as e:
        return {"_erro": str(e)[:200]}
def shape(x, d=0):
    if isinstance(x, dict): return {k: shape(v, d + 1) if d < 3 else type(v).__name__ for k, v in list(x.items())[:40]}
    if isinstance(x, list): return [shape(x[0], d + 1)] if x else []
    return x if isinstance(x, (int, float, bool)) or x is None else (x[:60] if isinstance(x, str) else str(type(x)))
out = {}
ev = get("/events?limit=51&offset=0")
out["events_n"] = len(ev) if isinstance(ev, list) else ev
if isinstance(ev, list) and ev:
    out["event_exemplo"] = ev[0]
    out["event_shape"] = shape(ev[0])
    out["KillArea"] = collections.Counter(str(e.get("KillArea")) for e in ev)
    out["Location"] = collections.Counter(str(e.get("Location")) for e in ev)
    out["Type"] = collections.Counter(str(e.get("Type")) for e in ev)
    out["n_participantes"] = collections.Counter(e.get("numberOfParticipants") for e in ev)
    out["gvg"] = sum(1 for e in ev if e.get("GvGMatch"))
for off in (1000, 5000, 20000):
    r = get(f"/events?limit=51&offset={off}")
    out[f"offset_{off}"] = len(r) if isinstance(r, list) else r
for nome, p in {"playerfame": "/events/playerfame?range=week&limit=15&offset=0", "killfame": "/events/killfame?range=week&limit=15&offset=0",
                "pve_fame": "/events/playerfame?range=month&limit=5&offset=0&type=PvE", "ranking_kills": "/players/statistics?limit=5"}.items():
    r = get(p); out[nome] = {"shape": shape(r[0]) if isinstance(r, list) and r else r, "n": len(r) if isinstance(r, list) else None, "exemplo": (r[0] if isinstance(r, list) and r else None)}
# eventos de um jogador (como seria acompanhar o top)
try:
    pid = ev[0]["Killer"]["Id"]
    k = get(f"/players/{pid}/kills")
    out["player_kills"] = {"n": len(k) if isinstance(k, list) else k, "areas": collections.Counter(str(e.get("KillArea")) for e in k) if isinstance(k, list) else None}
    st = get(f"/players/{pid}")
    out["player"] = shape(st)
except Exception as e:
    out["player_erro"] = str(e)
json.dump(out, open("tools/sonda-killboard.json", "w"), ensure_ascii=False, indent=1, default=str)
print(json.dumps({k: v for k, v in out.items() if k not in ("event_exemplo",)}, ensure_ascii=False, default=str)[:3000])
