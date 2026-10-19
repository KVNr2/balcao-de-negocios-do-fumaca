# Programa AlbionSpecs

Lê, no seu PC, os níveis do seu Destiny Board quando você entra no personagem e leva para o site (botão **Sincronizar**).

**Como instalar (uma vez):** baixe `AlbionSpecs.exe` e dê dois cliques. Ele se copia para `%LOCALAPPDATA%\FichaAlbion` e liga o botão do site. Depois pode apagar o arquivo baixado.

**Como usar:** no site, em *Minha ficha*, clique em **Sincronizar**, aceite o aviso do Windows (precisa de Administrador para ouvir a rede do jogo) e entre no personagem.

- Só ouve o tráfego local do Albion (como o Albion Data Client). Não altera nem envia nada do jogo e não manda dados para a internet.
- O Windows SmartScreen pode avisar que o programa é de "editor desconhecido" porque ele não é assinado: clique em *Mais informações* e *Executar assim mesmo*.

## Atualização automática
Cada vez que alguém clica em **Sincronizar**, o programa instalado confere `versao.json` neste site. Se a versão mudou, ele baixa o `AlbionSpecs.exe` novo, confere o `sha256` e se troca sozinho. Sem internet ou com qualquer erro, segue com a versão atual.

**Para publicar uma versão nova** (por exemplo, quando a tabela de IDs dos nós mudar): rode `FONTE=<pasta do código no seu PC> programa/publicar.sh 1.2.0` (precisa do Go), faça o commit de `AlbionSpecs.exe` e `versao.json` e envie para a `main`.

Obs.: `ficha-albion.exe` na pasta é só uma cópia com o nome antigo, para quem instalou antes se atualizar e migrar sozinho para `AlbionSpecs.exe`. Pode ser removida no futuro.
