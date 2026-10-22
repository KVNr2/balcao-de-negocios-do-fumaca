#!/usr/bin/env python3
"""Sonda 5: o que distingue as kills de jogadores de Hellgate 2v2 das kills comuns do mundo aberto (Europa)?"""
import json, urllib.request, urllib.parse, time, collections, statistics as st
B = "https://gameinfo-ams.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
def get(path):
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(B + path, headers=UA), timeout=60) as r: return json.load(r)
        except Exception as e: err = str(e)[:100]; time.sleep(2)
    return {"_erro": err}
def feat(e):
    K, V = e["Killer"], e["Victim"]
    eq = lambda s: sum(1 for v in (s.get("Equipment") or {}).values() if v)
    inv = lambda s: sum(1 for v in (s.get("Inventory") or []) if v)
    return {"part": e.get("numberOfParticipants"), "grp": e.get("groupMemberCount"), "nPart": len(e.get("Participants") or []), "nGM": len(e.get("GroupMembers") or []),
            "ipK": round(K.get("AverageItemPower", 0)), "ipV": round(V.get("AverageItemPower", 0)), "eqK": eq(K), "eqV": eq(V), "invV": inv(V),
            "fame": e.get("TotalVictimKillFame"), "dfame": V.get("DeathFame"), "battle_eq_event": e.get("BattleId") == e.get("EventId"),
            "guildK": bool(K.get("GuildName")), "guildV": bool(V.get("GuildName")), "allyK": bool(K.get("AllianceName")), "kfame": K.get("KillFame")}
def resumo(fs):
    r = {"n": len(fs)}
    for k in fs[0]:
        vals = [f[k] for f in fs if f[k] is not None]
        if all(isinstance(v, bool) for v in vals): r[k] = round(sum(vals) / len(vals), 2)
        elif all(isinstance(v, (int, float)) for v in vals): r[k] = [min(vals), round(st.median(vals)), max(vals)]
        else: r[k] = dict(collections.Counter(map(str, vals)).most_common(5))
    return r
hg = []
for nome in ["Rema67", "Mandaryn", "L4CKY", "Tensheyy", "Plamenev", "Holyslut88", "Ostrogoth"]:
    s = get("/search?q=" + urllib.parse.quote(nome)); pl = [p for p in (s.get("players") or []) if p.get("Name") == nome] if isinstance(s, dict) else []
    if not pl: continue
    for e in (get(f"/players/{pl[0]['Id']}/kills?limit=51") or []):
        if isinstance(e, dict) and "Killer" in e: hg.append(feat(e))
ow = []
for off in range(0, 400, 51):
    r = get(f"/events?limit=51&offset={off}")
    if isinstance(r, list): ow += [feat(e) for e in r if "Killer" in e]
out = {"hellgate_players": resumo(hg) if hg else None, "feed_geral": resumo(ow) if ow else None}
json.dump(out, open("tools/sonda-fontes.json", "w"), ensure_ascii=False, indent=1, default=str)
print(json.dumps(out, ensure_ascii=False, default=str)[:3500])
