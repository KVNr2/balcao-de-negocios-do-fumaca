"""Mescla a tabela de perfis do job diário na do branch e apaga os arquivos de mortes com mais de 30 dias.
Uso: mesclar_perfis.py perfis_novo.json DIR_DO_BRANCH"""
import datetime, glob, json, os, sys
a = json.load(open(sys.argv[1])); pf = os.path.join(sys.argv[2], "perfis.json"); b = json.load(open(pf)) if os.path.exists(pf) else {}
for k, v in a.items():
    if k not in b or v[1] > b[k][1]: b[k] = v
json.dump(b, open(pf, "w"), separators=(",", ":"))
for old in glob.glob(os.path.join(sys.argv[2], "eventos.jsonl.gz")): os.remove(old)
corte = (datetime.datetime.utcnow() - datetime.timedelta(days=30)).strftime("%Y-%m-%d")
for f in glob.glob(os.path.join(sys.argv[2], "eventos", "*.jsonl.gz")):
    if os.path.basename(f)[:10] < corte: os.remove(f); print("expurgado", f)
