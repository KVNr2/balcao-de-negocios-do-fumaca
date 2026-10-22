#!/usr/bin/env python3
"""Sonda 3: de onde sai o ranking de Corrupted/Hellgate/Mists? Olha o HTML e os scripts do SlayerBoard e testa endpoints do gameinfo oficial."""
import json, re, urllib.request, time
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "*/*"}
def get(url, n=60000, tries=2):
    err = ""
    for _ in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.status, r.read(n * 20).decode("utf-8", "replace")
        except urllib.error.HTTPError as e: return e.code, ""
        except Exception as e: err = str(e)[:100]; time.sleep(2)
    return 0, err
out = {"slayerboard": {}, "gameinfo": {}}
pages = ["https://albionslayerboard.com/eu/leaderboard/", "https://albionslayerboard.com/eu/builds/", "https://albionslayerboard.com/eu/counters/", "https://albionslayerboard.com/eu/insights/", "https://albionslayerboard.com/eu/meta/"]
found = set(); scripts = set()
for p in pages:
    st, html = get(p)
    out["slayerboard"][p] = {"status": st, "len": len(html)}
    for m in re.findall(r'(?:src|href)="([^"]+\.js[^"]*)"', html): scripts.add(m)
    for m in re.findall(r'https?://[^\s"\'<>]*(?:api|gameinfo|json|snapshot)[^\s"\'<>]*', html): found.add(m)
    for m in re.findall(r'["\'](/(?:api|snapshot|data)[^"\']*)["\']', html): found.add(m)
out["slayerboard"]["scripts"] = sorted(scripts)[:30]
for s in list(scripts)[:12]:
    url = s if s.startswith("http") else "https://albionslayerboard.com" + (s if s.startswith("/") else "/" + s)
    st, js = get(url)
    for m in re.findall(r'https?://[^\s"\'`<>\\]*(?:api|gameinfo|snapshot|json)[^\s"\'`<>\\]*', js): found.add(m)
    for m in re.findall(r'["\'`](/(?:api|snapshot|data|v\d)[^"\'`\s]*)["\'`]', js): found.add(m)
out["slayerboard"]["endpoints"] = sorted(found)[:120]
G = "https://gameinfo.albiononline.com/api/gameinfo"
cands = ["/events?limit=3", "/leaderboard", "/ranking", "/leaderboards", "/matches", "/matches/crystal", "/matches/hellgate", "/matches/corrupted", "/corrupted", "/hellgate", "/hellgate/leaderboard",
         "/events/playerfame?range=week&limit=3&offset=0", "/events/killfame?range=week&limit=3", "/players/statistics", "/mists", "/solo", "/duels", "/events/battle", "/battles?limit=3&sort=recent"]
for c in cands:
    st, body = get(G + c, 3000)
    out["gameinfo"][c] = {"status": st, "inicio": body[:300]}
json.dump(out, open("tools/sonda-fontes.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps({"endpoints": out["slayerboard"]["endpoints"][:40], "gameinfo": {k: v["status"] for k, v in out["gameinfo"].items()}}, ensure_ascii=False))
