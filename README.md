# Balcão de Negócios do Fumaça

Site do grupo para fazer prata no Albion Online (servidor Américas).

- Preços ao vivo do [Albion Data Project](https://www.albion-online-data.com/), puxados pelo navegador de quem abre a página e guardados por 10 minutos no próprio navegador.
- Cada jogador preenche a própria ficha. A ficha fica salva no navegador dele e pode ser copiada para outro computador.
- Recomendações de refino, craft, encantamento, cozinha, fazenda, coleta e builds a partir da ficha.

## Como está organizado

- `index.html`: a página (estrutura e textos).
- `css/balcao.css`: a base de estilos (componentes, tabelas, mapas de calor).
- `css/vip.css`: a estrutura do Pedro (barra superior, menu que recolhe, ícones, ficha em árvore).
- `css/souk.css`: a identidade do souk por cima da estrutura (cores, fontes, toldo, lampião e fumaça). Os três entram no carimbo de versão `?v=`.
- `js/base.js`: ficha, preços, cache da API, refino, craft, cozinha, histórico e mapas.
- `js/fx.js`: efeitos com GSAP (fumaça do título, lanternas, menu em livro); as animações de fundo param fora da tela.
- `js/biz.js`: Mercado Negro (uma linha por peça, tier, encantamento e qualidade, com filtro de qualidade), trabalhadores e matchups.
- `js/novos.js`: custo da build, encantar e ilha e fazenda.
- `js/ui.js`: ordenar qualquer tabela clicando no título da coluna.
- `js/guia.js`: o quadro "Como usar esta página" de cada página (textos no topo do arquivo).
- `js/oficina.js`: oficina de craft (receitas, custo, lucro, vendas por dia), comparador de mercado e quadro de detalhe do item.
- `js/main.js`: troca de páginas e inicialização.
- `data/catalog.json`: todos os itens do jogo (nome em português e inglês, categoria, tier) para a página Mercado.
- `data/specs.json`: o Destiny Board para a Minha ficha (combate, craft e fazenda; cada grupo com a maestria e os itens). Gerado a partir de catalog.json e farm.json.
- `data/*.json`: dados fixos tirados dos arquivos do jogo (receitas, mapas, diários, fazenda, peças) e a foto de preços de reserva. Cada um só é baixado quando a página que usa é aberta.
- `icons/`: ícones do jogo em WebP 128 px, baixados do render oficial (`render.albiononline.com/v1/item/ID.png?quality=N&size=128`). Na raiz ficam os de qualidade 1 (`icons/ID.webp`); as qualidades 2 a 5 ficam em `icons/q2/`, `icons/q3/`, `icons/q4/` e `icons/q5/`, com o mesmo nome de arquivo. A lista de ids com cópia local está em `js/icons.js`. Se um arquivo faltar (hoje, `T3_FIBER` e `T8_HEAD_CLOTH_KEEPER@1` na q2, `T8_ARTEFACT_HEAD_CLOTH_FEY` e `T8_ARTEFACT_HEAD_PLATE_HELL` na q3 e `T6_SHARD_AVALONIAN` na q4), o navegador busca direto no render oficial, na mesma qualidade.
- `builds.json`: builds da semana, atualizado aos domingos por uma tarefa agendada.
- `efeitos.html`: página de teste dos efeitos do título.

Os arquivos levam `?v=` com um código de versão no `index.html`; ao trocar um arquivo, trocar também esse código para o navegador não usar a versão antiga.

O site não aparece em buscadores (`robots.txt` e `noindex`). Publicação: Settings > Pages > Branch `main`, pasta `/ (root)`.

Albion Online é da Sandbox Interactive, sem ligação com este site.

## Versão dos arquivos
Depois de mexer em `css/`, `js/` ou `data/`, rode `./carimbo.sh`. Ele troca o `?v=` de todos os arquivos no `index.html` para os navegadores dos amigos baixarem a versão nova.
