# Nossas builds

Cada arquivo `.json` desta pasta é uma build que aparece na aba **Builds > Nossas builds**.

## Como publicar uma build
1. No site, em Builds > Nossas builds, clique em **Criar build** e salve.
2. Na build criada (seção "Suas builds"), clique em **Baixar arquivo**.
3. Coloque o arquivo baixado nesta pasta (`builds/`).
4. Acrescente o nome do arquivo em `builds/index.json`, por exemplo: `["minha-build.json"]`.
5. Faça commit e push. Em 1 a 2 minutos a build aparece para todo mundo.

## Como publicar uma composição
Uma composição reúne várias builds numa entrada só, com jogadores principais e opcionais. Em **Builds > Nossas builds > Composições**, clique em **Criar composição**, escolha as builds e salve. Para publicar:
1. Na composição salva, clique em **Baixar arquivo**.
2. Coloque o arquivo nesta pasta e acrescente o nome em `builds/index.json`.
3. Faça commit e push. A composição aparece no segmento **Composições**.

O arquivo da composição leva `"tipo": "comp"`, `min`, `max`, `p` (principais) e `o` (opcionais). Cada build de dentro vai junto no arquivo, então a composição continua funcionando mesmo que uma build de origem saia da lista.

## Votos
O campo `votos` do arquivo é a contagem oficial. Cada visitante também pode dar o seu voto,
que fica salvo só no navegador dele e soma +1 na tela dele.

## Sincronizar entre todos os navegadores (Supabase, grátis)
Sem isso, as builds ficam só no navegador de quem criou. Com isso, qualquer visitante cria, publica e vota, e todos veem.
1. Crie uma conta em supabase.com e um projeto novo (plano grátis).
2. No projeto: SQL Editor > New query, cole o conteúdo de `builds/supabase.sql` e clique em Run.
3. Em Project Settings > API, copie a **Project URL** e a chave **anon public** (essa chave pode ficar pública).
4. Edite `data/nuvem.json`: `{"url":"https://SEUPROJETO.supabase.co","key":"CHAVE_ANON"}`. Faça commit e push.
5. Para apagar ou corrigir uma build: Table Editor > `nb_builds` no painel do Supabase.

Projeto já criado: `balcao-do-fumaca` (Supabase, região São Paulo), ligado em `data/nuvem.json`.
