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
- `js/biz.js`: Mercado Negro, trabalhadores e matchups.
- `js/novos.js`: custo da build, encantar e ilha e fazenda.
- `js/ui.js`: ordenar qualquer tabela clicando no título da coluna.
- `js/guia.js`: o quadro "Como usar esta página" de cada página (textos no topo do arquivo).
- `js/oficina.js`: oficina de craft (receitas, custo, lucro, vendas por dia), comparador de mercado e quadro de detalhe do item.
- `js/main.js`: troca de páginas e inicialização.
- `data/catalog.json`: todos os itens do jogo (nome em português e inglês, categoria, tier) para a página Mercado.
- `data/specs.json`: o Destiny Board para a Minha ficha (combate, craft e fazenda; cada grupo com a maestria e os itens). Gerado a partir de catalog.json e farm.json.
- `data/*.json`: dados fixos tirados dos arquivos do jogo (receitas, mapas, diários, fazenda, peças) e a foto de preços de reserva. Cada um só é baixado quando a página que usa é aberta.
- `builds.json`: builds da semana, atualizado aos domingos por uma tarefa agendada.
- `efeitos.html`: página de teste dos efeitos do título.

Os arquivos levam `?v=` com um código de versão no `index.html`; ao trocar um arquivo, trocar também esse código para o navegador não usar a versão antiga.

O site não aparece em buscadores (`robots.txt` e `noindex`). Publicação: Settings > Pages > Branch `main`, pasta `/ (root)`.

Albion Online é da Sandbox Interactive, sem ligação com este site.

## Versão dos arquivos
Depois de mexer em `css/`, `js/` ou `data/`, rode `./carimbo.sh`. Ele troca o `?v=` de todos os arquivos no `index.html` para os navegadores dos amigos baixarem a versão nova.
