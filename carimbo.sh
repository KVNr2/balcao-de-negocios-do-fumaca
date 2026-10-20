#!/bin/bash
# Atualiza o ?v= de todos os CSS e JS do index.html (e o data-v da tag <html>) para o navegador
# não usar arquivos velhos. Rode depois de qualquer mudança em css/, js/ ou data/.
# Só mexe no <html data-v=...>: os botões da calculadora também usam data-v e não podem ser trocados.
set -e
cd "$(dirname "$0")"
V=$(cat css/*.css js/*.js data/*.json | sha1sum | cut -c1-8)
sed -i -E "s/\?v=[0-9a-f]{8}/?v=$V/g; s/(<html[^>]*data-v=\")[0-9a-f]{8}\"/\1$V\"/" index.html
echo "$V" > versao.txt
# versao.json: guarda a hora em que esta versão foi gerada (só muda quando o conteúdo muda)
ANT=$(sed -n 's/.*"v":"\([0-9a-f]*\)".*/\1/p' versao.json 2>/dev/null || true)
if [ "$ANT" != "$V" ]; then printf '{"v":"%s","publicado":"%s"}\n' "$V" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > versao.json; fi
echo "versão $V"
