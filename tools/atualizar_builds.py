#!/usr/bin/env python3
"""Atualiza data/builds-grind.json com as builds mais votadas de cada tipo de conteúdo do AlbionOnlineGrind.
Usa a API que a própria página usa (/api/builds?page=1&category=XXX). Mantém o arquivo antigo se vier pouca coisa."""
import json, sys, time, datetime, urllib.request, urllib.error
BASE = "https://albiononlinegrind.com"
UA = {"User-Agent": "Mozilla/5.0 (compatible; BalcaoFumaca-builds/1.0; +https://kvnr2.github.io/balcao-de-negocios-do-fumaca/)", "Accept": "application/json,*/*", "Referer": BASE + "/builds"}
OUT = "data/builds-grind.json"
# chave da API -> nome igual ao do filtro "Type Of Content" do site, na ordem do site
CATS = [("ABYSSAL_DEPTHS_2V2","Abyssal Depths (2v2)"),("ABYSSAL_DEPTHS_3V3","Abyssal Depths (3v3)"),("ANCIENT_LANDS","Ancient Lands"),("BOMB_SQUAD","Bomb Squad"),
 ("CORRUPTED_DUNGEON","Corrupted Dungeon"),("CRYSTAL_ARENA_1V1","Crystal Arena (1v1)"),("CRYSTAL_ARENA_5V5","Crystal Arena (5v5)"),("CRYSTAL_ARENA","Crystal Arena"),("CRYSTAL_CREATURES","Crystal Creatures"),
 ("FAME_FARM_GROUP","Fame Farm (Group)"),("FAME_FARM_GROUP_AVALON","Fame Farm (Group Avalon)"),("FAME_FARM_SOLO","Fame Farm (Solo)"),
 ("GANK_DUO","Gank (Duo)"),("GANK_GROUP","Gank (Group)"),("GANK_SOLO","Gank (Solo)"),("GATHERING","Gathering"),("HCE","HCE"),
 ("HELLGATE_2V2","Hellgate (2v2)"),("HELLGATE_5V5","Hellgate (5v5)"),("MISTS_DUO","Mists (Duo)"),("MISTS_SOLO","Mists (Solo)"),("OFF_META","Off-Meta"),("OPEN_WORLD","Open World"),
 ("SMALL_SCALE","Small Scale"),("TRACKING_GROUP","Tracking (Group)"),("TRACKING_SOLO","Tracking (Solo)"),("TRANSPORTING","Transporting"),("WORLD_BOSS","World Boss"),("ZVZ","ZvZ")]
SLOTS = [("w","weapon_id",None),("h","helmet_id","helmet_id_alt"),("a","chest_id","chest_id_alt"),("s","boots_id","boots_id_alt"),("c","cape_id","cape_id_alt"),("o","offhand_id","offhand_id_alt"),("f","food_id","food_alt"),("p","potion_id","potion_alt")]
POR_CAT = 40

def get(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r: return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(8 * (i + 1)); continue
            if i == tries - 1: raise
            time.sleep(3)
        except Exception:
            if i == tries - 1: raise
            time.sleep(3)

def lista(v):
    if not v: return []
    if isinstance(v, str): v = [v]
    return [x for x in v if isinstance(x, str) and x]

def main():
    conteudos, builds, vistos = [], [], set()
    for key, nome in CATS:
        time.sleep(2.5)
        try: j = json.loads(get(f"{BASE}/api/builds?page=1&category={key}"))
        except Exception as e: print("::warning::", key, e); continue
        bl = [b for b in (j.get("builds") or []) if b.get("category") == key]
        if not bl: print("sem builds:", key); continue
        conteudos.append({"k": key, "nome": nome, "total": j.get("total") or len(bl)})
        for b in bl[:POR_CAT]:
            if b["id"] in vistos: continue
            vistos.add(b["id"])
            e = {"k": key, "id": b["slug"], "t": b.get("title") or "", "pop": b.get("upvote_count") or 0, "tg": (b.get("tags") or [])[:6], "au": b.get("author") or ""}
            if not b.get("weapon_id"): continue
            e["wn"] = b.get("weapon_name") or ""
            for sl, a, c in SLOTS:
                ids = lista(b.get(a)) + (lista(b.get(c)) if c else [])
                if ids: e[sl] = list(dict.fromkeys(ids))
            e["w"] = e["w"][0]
            # habilidades e passivas (ids do jogo): w = arma; h/a/s = [recomendado, alternativa]
            sk = {"w": lista(b.get("weapon_skills"))}
            for sl, p1, p2 in (("h", "helmet_skills", "helmet_alt_skills"), ("a", "chest_skills", "chest_alt_skills"), ("s", "boots_skills", "boots_alt_skills")):
                sk[sl] = [lista(b.get(p1)), lista(b.get(p2))]
            if any(sk["w"]) or any(any(v) for k, v in sk.items() if k != "w"): e["sk"] = sk
            builds.append(e)
        print(key, len(bl), "total", j.get("total"))
    if len(builds) < 60 or len(conteudos) < 8:
        print("::error::dados insuficientes", len(builds), len(conteudos)); sys.exit(1)
    open(OUT, "w").write(json.dumps({"fonte": "AlbionOnlineGrind (builds mais votadas de cada conteúdo)", "atualizado": datetime.datetime.utcnow().strftime("%Y-%m-%d"), "conteudos": conteudos, "builds": builds}, ensure_ascii=False, separators=(",", ":")))
    print("gravado", len(builds), "builds em", len(conteudos), "conteúdos")

if __name__ == "__main__": main()
