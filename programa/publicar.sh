#!/bin/bash
# Publica uma versão nova do programa: ./publicar.sh 1.2.0
# 1) troca appVersion em fonte/update.go  2) compila  3) atualiza versao.json com o sha256
# Os programas instalados se atualizam sozinhos na próxima vez que alguém clicar em Sincronizar.
set -e
cd "$(dirname "$0")"
[ -n "$1" ] || { echo "uso: $0 NOVA_VERSAO"; exit 1; }
sed -i "s/^const appVersion = \".*\"/const appVersion = \"$1\"/" fonte/update.go
(cd fonte && GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H=windowsgui -s -w" -o ../ficha-albion.exe .)
printf '{"versao":"%s","sha256":"%s"}\n' "$1" "$(sha256sum ficha-albion.exe | cut -d' ' -f1)" > versao.json
echo "Pronto: faça commit de ficha-albion.exe, versao.json e fonte/ e envie para a main."
