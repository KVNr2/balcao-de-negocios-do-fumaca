#!/bin/bash
# Publica uma versão nova do programa: ./publicar.sh 1.2.0
# 1) troca appVersion em $FONTE/update.go  2) compila  3) atualiza versao.json com o sha256
# Os programas instalados se atualizam sozinhos na próxima vez que alguém clicar em Sincronizar.
set -e
cd "$(dirname "$0")"
SITE="$PWD"
# O código-fonte NÃO fica no repositório. Aponte para a sua pasta: FONTE=/caminho/albion-sniffer ./publicar.sh 1.3.2
FONTE="${FONTE:?defina FONTE com a pasta do código-fonte (fica só no seu PC)}"
[ -n "$1" ] || { echo "uso: $0 NOVA_VERSAO"; exit 1; }
sed -i "s/^const appVersion = \".*\"/const appVersion = \"$1\"/" "$FONTE/update.go"
(cd "$FONTE" && GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H=windowsgui -s -w" -o "$SITE/AlbionSpecs.exe" .)
# cópia com o nome antigo: só para quem instalou antes do nome AlbionSpecs.exe se atualizar e migrar sozinho
cp AlbionSpecs.exe ficha-albion.exe
printf '{"versao":"%s","sha256":"%s"}\n' "$1" "$(sha256sum AlbionSpecs.exe | cut -d' ' -f1)" > versao.json
echo "Pronto: faça commit só de AlbionSpecs.exe, ficha-albion.exe e versao.json e envie para a main."
