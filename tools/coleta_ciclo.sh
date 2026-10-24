#!/usr/bin/env bash
# Um ciclo de coleta: baixa a branch de dados, lê o feed de mortes e guarda (um commit só, sem histórico).
# Chamado de 6 em 6 minutos pelo workflow pvp-coleta.yml. Com o argumento "hist" lê o branch inteiro e faz também a carga de histórico.
set -u
HIST=${1:-}
SRV=${SRV:-us}; BR=pvp-dados; [ "$SRV" != "us" ] && BR=pvp-dados-$SRV   # um servidor por execução, cada um na sua branch
T0=$(date +%s)   # o ciclo tem de caber em 6 min: a leitura do feed vem primeiro e o histórico usa só o que sobrar
git worktree remove --force dados 2>/dev/null; rm -rf dados; git worktree prune
H=$(date -u +%F); O=$(date -u -d yesterday +%F)
if git fetch origin $BR 2>/dev/null; then
  git worktree add --no-checkout dados origin/$BR
  if [ "$HIST" != "hist" ]; then git -C dados sparse-checkout set --no-cone /perfis.json "/eventos/$H.jsonl.gz" "/eventos/$O.jsonl.gz" "/ancient/*.jsonl.gz"; fi
  git -C dados checkout
else
  git worktree add --detach dados; (cd dados && git checkout --orphan $BR && git rm -rf . -q)
fi
python3 tools/coletar_pvp.py dados $SRV || echo "::warning::a coleta terminou com erro; guardo o que houver"
if [ "$SRV" = "us" ]; then python3 tools/colher_ancient.py dados || echo "::warning::a colheita de Ancient Lands terminou com erro"; fi
if [ "$HIST" = "hist" ]; then
  # 330 s de ciclo menos o que já gastei e ~20 s para enviar; menos de 40 s não vale a pena
  MIN=$(python3 -c "import time;r=330-20-(time.time()-$T0);print(round(min(4.5,r/60),2) if r>=40 else 0)")
  if [ "$MIN" != "0" ]; then python3 tools/historico_pvp.py dados "$MIN" || echo "::warning::o histórico terminou com erro"; else echo "sem tempo para o histórico neste ciclo"; fi
fi
cd dados
git config user.name "pvp-bot"; git config user.email "pvp-bot@users.noreply.github.com"
git add -A
git commit -q --amend -m "mortes coletadas" 2>/dev/null || git commit -q -m "mortes coletadas" || { echo "nada novo para guardar"; exit 0; }
git push --force-with-lease origin HEAD:$BR || echo "::warning::não consegui enviar neste ciclo"
