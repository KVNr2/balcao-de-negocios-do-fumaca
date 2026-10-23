#!/usr/bin/env bash
# Um ciclo de coleta: baixa a branch de dados, lê o feed de mortes e guarda (um commit só, sem histórico).
# Chamado de 15 em 15 minutos pelo workflow pvp-coleta.yml.
set -u
git worktree remove --force dados 2>/dev/null; rm -rf dados; git worktree prune
H=$(date -u +%F); O=$(date -u -d yesterday +%F)
if git fetch origin pvp-dados 2>/dev/null; then
  git worktree add --no-checkout dados origin/pvp-dados
  git -C dados sparse-checkout set --no-cone /perfis.json "/eventos/$H.jsonl.gz" "/eventos/$O.jsonl.gz"
  git -C dados checkout
else
  git worktree add --detach dados; (cd dados && git checkout --orphan pvp-dados && git rm -rf . -q)
fi
python3 tools/coletar_pvp.py dados || echo "::warning::a coleta terminou com erro; guardo o que houver"
cd dados
git config user.name "pvp-bot"; git config user.email "pvp-bot@users.noreply.github.com"
git add -A
git commit -q --amend -m "mortes coletadas" 2>/dev/null || git commit -q -m "mortes coletadas" || { echo "nada novo para guardar"; exit 0; }
git push --force-with-lease origin HEAD:pvp-dados || echo "::warning::não consegui enviar neste ciclo"
