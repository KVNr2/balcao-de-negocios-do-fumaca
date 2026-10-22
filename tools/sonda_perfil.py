#!/usr/bin/env python3
"""Sonda: quais campos o perfil do jogador na API oficial traz (procura Infâmia por conteúdo)."""
import json, urllib.request
B = "https://gameinfo.albiononline.com/api/gameinfo"; UA = {"User-Agent": "Mozilla/5.0 Chrome/130.0", "Accept": "application/json"}
def get(p):
    try:
        with urllib.request.urlopen(urllib.request.Request(B + p, headers=UA), timeout=30) as r: return json.load(r)
    except Exception as e: return {"_erro": str(e)[:100]}
def chaves(o, pre=""):
    if isinstance(o, dict):
        for k, v in o.items():
            yield from chaves(v, pre + "." + k) if isinstance(v, (dict,)) else [(pre + "." + k, v if not isinstance(v, list) else "[lista]")]
out = {}
for i in ["QFwYKP0TRPuGMglx3bOPYg", "G0b5wr-NR8ap5XYBQgjFsw", "jrO-QaPcTeWTyKYu368rwA", "csV3w8IrSW652NNmK_p4FA", "gI9zqQUTRTySg54yrEij9g", "Tyd2-FzWQ4KqMQV-Kq4FFw"]:
    p = get("/players/" + i); out[i] = dict(chaves(p)) if isinstance(p, dict) else p
    print(i, json.dumps(out[i], ensure_ascii=False)[:1800])
s = get("/search?q=FumaHeLL"); out["busca"] = s
print(json.dumps(s, ensure_ascii=False)[:600])
json.dump(out, open("tools/sonda-perfil.json", "w"), ensure_ascii=False, indent=1)
