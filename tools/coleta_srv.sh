#!/usr/bin/env bash
# Um ciclo: baixa a branch ancient-srv, coleta as candidatas da Europa e da Ásia e envia (um commit só).
set -u
git worktree remove --force srv 2>/dev/null; rm -rf srv; git worktree prune
if git fetch origin ancient-srv 2>/dev/null; then git worktree add --no-checkout srv origin/ancient-srv; git -C srv checkout
else git worktree add --detach srv; (cd srv && git checkout --orphan ancient-srv && git rm -rf . -q); fi
python3 tools/coletar_srv.py srv || echo "::warning::a coleta de servidores terminou com erro"
cd srv
git config user.name "pvp-bot"; git config user.email "pvp-bot@users.noreply.github.com"
git add -A
git commit -q --amend -m "candidatas EU/SGP" 2>/dev/null || git commit -q -m "candidatas EU/SGP" || { echo "nada novo"; exit 0; }
git push --force-with-lease origin HEAD:ancient-srv || echo "::warning::não consegui enviar neste ciclo"
