"""Apaga do branch de dados os arquivos de mortes com mais de 14 dias e o que sobrou de formatos antigos (perfis.json, eventos.jsonl.gz).
Uso: expurgar.py DIR_DO_BRANCH"""
import datetime, glob, os, sys
d = sys.argv[1]; DIAS = 14
corte = (datetime.datetime.utcnow() - datetime.timedelta(days=DIAS)).strftime("%Y-%m-%d")
for f in glob.glob(os.path.join(d, "eventos", "*.jsonl.gz")):
    if os.path.basename(f)[:10] < corte: os.remove(f); print("expurgado", os.path.basename(f))
for f in ("perfis.json", "eventos.jsonl.gz"):
    if os.path.exists(os.path.join(d, f)): os.remove(os.path.join(d, f)); print("removido", f)
