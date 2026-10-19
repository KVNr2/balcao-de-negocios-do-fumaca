# Ícone do programa

Arte original, desenhada para este projeto (nenhuma imagem do jogo ou de terceiros): um medalhão escuro com anel dourado e uma rede de nós ligados, lembrando um tabuleiro de destino.

- `draw.py` desenha os PNGs (16, 24, 32, 48 px para a bandeja; 256 px para o arquivo) e o `icon.ico`.
- `mksyso.py rsrc_windows_amd64.syso` gera o recurso que coloca o ícone no `.exe` (copie para `programa/fonte/`).
- Os PNGs da bandeja ficam em `programa/fonte/icons/` e são embutidos no programa.
