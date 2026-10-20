# Nossas builds

Cada arquivo `.json` desta pasta é uma build que aparece na aba **Builds > Nossas builds**.

## Como publicar uma build
1. No site, em Builds > Nossas builds, clique em **Criar build** e salve.
2. Na build criada (seção "Suas builds"), clique em **Baixar arquivo**.
3. Coloque o arquivo baixado nesta pasta (`builds/`).
4. Acrescente o nome do arquivo em `builds/index.json`, por exemplo: `["minha-build.json"]`.
5. Faça commit e push. Em 1 a 2 minutos a build aparece para todo mundo.

## Votos
O campo `votos` do arquivo é a contagem oficial. Cada visitante também pode dar o seu voto,
que fica salvo só no navegador dele e soma +1 na tela dele.
