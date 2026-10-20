#!/usr/bin/env python3
"""Baixa os ícones das habilidades e passivas das builds para icons/spells/.
Rode no seu PC (o render do jogo costuma bloquear servidores):
    python tools/baixar_icones_skills.py
Lê os ids em data/builds-grind.json (campo "sk"), baixa de
https://render.albiononline.com/v1/spell/<ID>.png e pula o que já existe.
Depois: git add icons/spells && git commit -m "ícones de habilidades" && git push"""
import json, os, sys, time, urllib.request, urllib.error

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DADOS = os.path.join(RAIZ, "data", "builds-grind.json")
SAIDA = os.path.join(RAIZ, "icons", "spells")
URL = "https://render.albiononline.com/v1/spell/{}.png"

def ids_das_builds():
    d = json.load(open(DADOS, encoding="utf-8"))
    ids = set()
    for b in d.get("builds", []):
        for k, v in (b.get("sk") or {}).items():
            for x in (v if k == "w" else [y for par in v for y in par]):
                if isinstance(x, str) and x: ids.add(x)
    return sorted(ids)

def baixar(i):
    req = urllib.request.Request(URL.format(i), headers={"User-Agent": "Mozilla/5.0"})
    for t in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r: return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(2 * (t + 1))
        except Exception: time.sleep(2 * (t + 1))
    return None

def main():
    ids = ids_das_builds()
    if not ids: print("Nenhuma habilidade em data/builds-grind.json (o robô de builds ainda não gravou o campo sk)."); return 1
    os.makedirs(SAIDA, exist_ok=True)
    novos = falhas = 0
    for n, i in enumerate(ids, 1):
        dst = os.path.join(SAIDA, i + ".png")
        if os.path.exists(dst) and os.path.getsize(dst) > 100: continue
        b = baixar(i)
        if b: open(dst, "wb").write(b); novos += 1
        else: falhas += 1; print("falhou:", i)
        if n % 25 == 0: print(f"{n}/{len(ids)}")
        time.sleep(0.15)
    print(f"{len(ids)} habilidades: {novos} baixadas agora, {falhas} falharam, o resto já existia.")
    return 0

if __name__ == "__main__": sys.exit(main())
