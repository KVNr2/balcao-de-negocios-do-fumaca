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
out = {"kb1": {}}
base = "https://killboard-1.com"
found = set(); scripts = set(); links = set()
for path in ["/", "/leaderboard", "/hellgate", "/corrupted", "/mists", "/depths", "/builds", "/stats"]:
    st, html = get(base + path)
    out["kb1"][path] = {"status": st, "len": len(html), "titulo": (re.findall(r"<title>(.*?)</title>", html, re.S) or [""])[0][:120]}
    for m in re.findall(r'(?:src|href)="([^"]+\.js[^"]*)"', html): scripts.add(m)
    for m in re.findall(r'href="(/[^"#?]*)"', html): links.add(m)
    for m in re.findall(r'https?://[^\s"\'<>]*(?:api|json|snapshot)[^\s"\'<>]*', html): found.add(m)
out["kb1"]["links"] = sorted(links)[:80]; out["kb1"]["scripts"] = sorted(scripts)[:30]
for s_ in list(scripts)[:15]:
    url = s_ if s_.startswith("http") else base + (s_ if s_.startswith("/") else "/" + s_)
    st, js = get(url)
    for m in re.findall(r'https?://[^\s"\'`<>\\]*(?:api|snapshot|json|gameinfo)[^\s"\'`<>\\]*', js): found.add(m)
    for m in re.findall(r'["\'`](/(?:api|v\d|data|snapshot)[^"\'`\s]*)["\'`]', js): found.add(m)
out["kb1"]["endpoints"] = sorted(found)[:150]
json.dump(out, open("tools/sonda-fontes.json", "w"), ensure_ascii=False, indent=1)
print(json.dumps(out["kb1"], ensure_ascii=False)[:3000])
