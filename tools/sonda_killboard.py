#!/usr/bin/env python3
"""Sonda 2: amostra grande de eventos do killboard oficial: que tipos de área/conteúdo aparecem e se as skills vêm preenchidas."""
import json, urllib.request, collections, time
B = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
def get(path):
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(B + path, headers=UA), timeout=60) as r: return json.load(r)
        except Exception as e: err = str(e)[:100]; time.sleep(2)
    return {"_erro": err}
evs = []
for off in range(0, 1000, 51):
    r = get(f"/events?limit=51&offset={off}")
    if isinstance(r, list): evs += r
out = {"n": len(evs)}
out["KillArea"] = collections.Counter(str(e.get("KillArea")) for e in evs)
out["Category"] = collections.Counter(str(e.get("Category")) for e in evs)
out["Location"] = collections.Counter(str(e.get("Location")) for e in evs)
out["Type"] = collections.Counter(str(e.get("Type")) for e in evs)
out["gvg"] = sum(1 for e in evs if e.get("GvGMatch")); out["battle_igual_evento"] = sum(1 for e in evs if e.get("BattleId") == e.get("EventId"))
sp = tot = 0
for e in evs:
    for side in ("Killer", "Victim"):
        for k, it in (e[side].get("Equipment") or {}).items():
            if it: tot += 1; sp += bool(it.get("ActiveSpells") or it.get("PassiveSpells"))
out["itens_com_skills"] = [sp, tot]
out["part"] = collections.Counter(e.get("numberOfParticipants") for e in evs)
out["ip_killer_medio"] = sum(e["Killer"].get("AverageItemPower", 0) for e in evs) / max(1, len(evs))
out["periodo"] = [evs[-1]["TimeStamp"], evs[0]["TimeStamp"]] if evs else None
ex = [e for e in evs if e.get("KillArea") != "OPEN_WORLD"][:2]
out["exemplos_nao_open"] = ex
json.dump(out, open("tools/sonda-killboard.json", "w"), ensure_ascii=False, indent=1, default=str)
print(json.dumps({k: v for k, v in out.items() if k != "exemplos_nao_open"}, ensure_ascii=False, default=str))
