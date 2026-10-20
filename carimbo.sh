#!/bin/bash
# Atualiza o ?v= de todos os CSS e JS do index.html (e o data-v da tag <html>) para o navegador
# não usar arquivos velhos. Rode depois de qualquer mudança em css/, js/ ou data/.
# Só mexe no <html data-v=...>: os botões da calculadora também usam data-v e não podem ser trocados.
set -e
cd "$(dirname "$0")"
V=$(cat css/*.css js/*.js data/*.json | sha1sum | cut -c1-8)
sed -i -E "s/\?v=[0-9a-f]{8}/?v=$V/g; s/(<html[^>]*data-v=\")[0-9a-f]{8}\"/\1$V\"/" index.html
echo "$V" > versao.txt
echo "versão $V"
