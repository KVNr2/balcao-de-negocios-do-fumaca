#!/bin/bash
# Publica uma versão nova do programa: FONTE=/caminho/albion-sniffer ./publicar.sh 2.0.1
# 1) troca appVersion em $FONTE/update.go  2) compila uma cópia SEM as páginas embutidas do overlay (siteov/): o overlay
#    sempre usa o site publicado  3) grava AlbionOverlay.exe (download novo) e uma cópia idêntica AlbionSpecs.exe (é por ela
#    que os programas antigos se atualizam e viram o Albion Overlay)  4) atualiza versao.json com o sha256.
# Ordem para publicar: primeiro o site (com as mudanças do overlay), depois o programa.
# Os programas instalados se atualizam sozinhos na próxima vez que alguém clicar em Sincronizar ou abrir o programa.
set -e
cd "$(dirname "$0")"
SITE="$PWD"
# O código-fonte NÃO fica no repositório. Aponte para a sua pasta.
FONTE="${FONTE:?defina FONTE com a pasta do código-fonte (fica só no seu PC)}"
[ -n "$1" ] || { echo "uso: $0 NOVA_VERSAO"; exit 1; }
sed -i "s/^const appVersion = \".*\"/const appVersion = \"$1\"/" "$FONTE/update.go"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cp -r "$FONTE"/. "$TMP"/
rm -rf "$TMP/siteov"; mkdir -p "$TMP/siteov"; echo "O overlay usa o site publicado." > "$TMP/siteov/LEIA-ME.txt"
(cd "$TMP" && GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H=windowsgui -s -w" -o "$SITE/AlbionOverlay.exe" .)
cp AlbionOverlay.exe AlbionSpecs.exe
SHA="$(sha256sum AlbionOverlay.exe | cut -d' ' -f1)"
printf '{"versao":"%s","sha256":"%s"}\n' "$1" "$SHA" > versao.json
echo "Pronto ($1, sha256 $SHA): faça commit de AlbionOverlay.exe, AlbionSpecs.exe e versao.json e envie para a main."
