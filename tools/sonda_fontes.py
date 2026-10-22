#!/usr/bin/env python3
"""Sonda 4: os eventos do killboard oficial (servidor Europa) de jogadores de Hellgate trazem o tipo de conteúdo (KillArea/Location)?"""
import json, urllib.request, urllib.parse, time, collections
B = "https://gameinfo-ams.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
def get(path):
    for _ in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(B + path, headers=UA), timeout=60) as r: return json.load(r)
        except Exception as e: err = str(e)[:100]; time.sleep(2)
    return {"_erro": err}
out = {"jogadores": {}}
for nome in ["Rema67", "Mandaryn", "L4CKY", "Tensheyy", "Plamenev"]:
    s = get("/search?q=" + urllib.parse.quote(nome))
    pl = [p for p in (s.get("players") or []) if p.get("Name") == nome] if isinstance(s, dict) else []
    if not pl: out["jogadores"][nome] = {"achou": False, "s": str(s)[:200]}; continue
    pid = pl[0]["Id"]
    ks = get(f"/players/{pid}/kills?limit=51") ; ds = get(f"/players/{pid}/deaths?limit=51")
    evs = (ks if isinstance(ks, list) else []) + (ds if isinstance(ds, list) else [])
    out["jogadores"][nome] = {"id": pid, "n": len(evs),
        "KillArea": dict(collections.Counter(str(e.get("KillArea")) for e in evs)),
        "Location": dict(collections.Counter(str(e.get("Location")) for e in evs)),
        "Category": dict(collections.Counter(str(e.get("Category")) for e in evs)),
        "Type": dict(collections.Counter(str(e.get("Type")) for e in evs)),
        "gvg": sum(1 for e in evs if e.get("GvGMatch")),
        "part": dict(collections.Counter(str(e.get("numberOfParticipants")) for e in evs)),
        "chaves": sorted(evs[0].keys()) if evs else []}
    if evs and "exemplo" not in out: out["exemplo"] = {k: v for k, v in evs[0].items() if k not in ("Participants", "GroupMembers", "Victim", "Killer")}
out["exemplo_equip"] = None
json.dump(out, open("tools/sonda-fontes.json", "w"), ensure_ascii=False, indent=1, default=str)
print(json.dumps(out, ensure_ascii=False, default=str)[:3000])
