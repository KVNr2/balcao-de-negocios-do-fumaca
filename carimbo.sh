#!/bin/bash
# Atualiza o ?v= de todos os CSS e JS do index.html (e o data-v da tag <html>) para o navegador
# não usar arquivos velhos. Rode depois de qualquer mudança em css/, js/ ou data/.
# Só mexe no <html data-v=...>: os botões da calculadora também usam data-v e não podem ser trocados.
set -e
cd "$(dirname "$0")"
V=$(cat css/*.css js/*.js data/*.json | sha1sum | cut -c1-8)
sed -i -E "s/\?v=[0-9a-f]{8}/?v=$V/g; s/(<html[^>]*data-v=\")[0-9a-f]{8}\"/\1$V\"/" index.html
echo "$V" > versao.txt
# versao.json: hora em que esta versão foi gerada (só muda quando o conteúdo muda) e as últimas 60 versões, para a aba Versão
# saber quais novidades (novidades.json) vieram depois da versão que o visitante está usando
python3 - "$V" <<'PY'
import json, sys, datetime
v = sys.argv[1]
try: ant = json.load(open("versao.json"))
except Exception: ant = {}
if ant.get("v") != v:
    agora = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    hist = ant.get("hist") or ([{"v": ant["v"], "t": ant["publicado"]}] if ant.get("v") else [])
    hist = [h for h in hist if h["v"] != v] + [{"v": v, "t": agora}]
    open("versao.json", "w").write(json.dumps({"v": v, "publicado": agora, "hist": hist[-60:]}, separators=(",", ":")) + "\n")
PY
echo "versão $V"
