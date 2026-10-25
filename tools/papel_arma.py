"""Função (papel) de cada arma no PvP: tank, healer, support, range ou melee.
Vale a tabela tools/roles_armas.json (a mesma do ZvZ); o que não está nela segue a família da arma."""
import json, os, re
_R = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "roles_armas.json")))
_REGRAS = [   # a primeira que casar vale
    (r"HOLYSTAFF|NATURESTAFF|WILDSTAFF|FALLENSTAFF|REDEMPTION|LIFETOUCH|DIVINE|HALLOWFALL|DRUIDIC|RAMPANT|BLIGHT", "healer"),
    (r"HAMMER|MACE|RAM_|ROCKSTAFF|ROCKMACE|POLEHAMMER|COMBATSTAFF|GROVEKEEPER|FORGE", "tank"),
    (r"BOW|CROSSBOW|FIRESTAFF|INFERNOSTAFF|FROSTSTAFF|GLACIALSTAFF|ICECRYSTAL|DEMONICSTAFF|SKULLORB|CURSEDSTAFF|FIRE_RINGPAIR", "range"),
    (r"ARCANE|ENIGMATIC|ICEGAUNTLETS", "support"),
    (r"SWORD|CLAYMORE|AXE|DAGGER|SPEAR|TRIDENT|SCYTHE|SICKLE|KNUCKLES|QUARTERSTAFF|DOUBLEBLADED|GLAIVE|HALBERD|SCIMITAR|RAPIER|CLAW|CLEAVER|HARPOON|SHAPESHIFTER|KATAR|SCYTHE", "melee"),
]
def papel(w):
    if w in _R: return _R[w]
    for rx, p in _REGRAS:
        if re.search(rx, w or ""): return p
    return ""
