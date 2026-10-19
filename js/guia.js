/* ================= guia de cada página ================= */
// [o que é, o que dá para fazer, como usar]
const GUIA = {
  "p-voce": ["O resumo do dia feito para a sua ficha.", "Ver o melhor uso do foco hoje, o que refinar, fabricar e cozinhar, aonde ir coletar e quais builds combinam com as suas armas.", "Preencha a Minha ficha uma vez. Depois é só abrir esta página quando entrar no jogo."],
  "p-ficha": ["A sua ficha, salva só no seu navegador.", "Digitar o nível de cada spec como está no Destiny Board: armas, armaduras, coleta, refino, craft, cozinha e alquimia. Todas as recomendações e o custo de foco saem daqui.", "Escreva o nome do personagem e os níveis. Para usar em outro aparelho, copie o link da ficha e abra lá."],
  "p-refino": ["Lucro de refinar minério, fibra e pelego com os preços de agora.", "Ver na tabela colorida qual tier e encantamento dá mais lucro, e fazer a conta exata de uma fornada.", "Escolha o material em cima. Verde é lucro, vermelho é prejuízo. Clique numa célula para abrir a conta, o histórico e a rota: onde comprar a matéria-prima, onde refinar e onde vender."],
  "p-craft": ["A oficina: receita, custo e lucro de cada item que dá para fabricar.", "Ver cada ingrediente com quantidade, cidade, preço e quando foi visto; o custo, a venda, o lucro e quantos vendem por dia. Vale para armas, armaduras, comidas, poções e refino.", "Escolha a categoria, o tier e o encantamento, e como compra e vende. Clique no título da coluna para ordenar e num item para ver os preços por cidade. Embaixo continua o mapa de lucro das armaduras."],
  "p-mk": ["O comparador de mercado.", "Ver, para cada item, onde ele está mais caro e mais barato para vender e para comprar, e quando cada preço foi visto.", "Escolha a categoria e o tier. Clique num item para abrir os preços de todas as cidades e o gráfico de vendas por dia."],
  "p-encantar": ["Vale a pena encantar ou comprar já encantado?", "Comparar o custo de subir uma peça de nível (runa, alma, relíquia) com comprar ou fabricar a peça pronta.", "Escolha a linha de arma ou armadura e o tier. Economia positiva quer dizer que encantar sai mais barato."],
  "p-cozinha": ["Lucro de comidas e poções.", "Ver o que rende mais com foco, o que as builds usam e o histórico de preço de cada receita.", "Escolha comidas ou poções. Clique numa linha para ver os ingredientes."],
  "p-fazenda": ["Quanto rende a sua ilha.", "Comparar plantações, ervas, animais que dão leite e ovos e a criação de filhotes até adulto.", "Escolha o que quer ver, quantos lotes ou animais você tem e a sua spec de fazenda. O foco muda de planta para planta: se o jogo mostrar outro valor, digite na linha que ele fica guardado."],
  "p-trab": ["Diários e trabalhadores.", "Ver quanto vale encher um diário e vender, ou entregar ao seu trabalhador.", "Escolha o tier e a felicidade da sua casa. A lista de baixo mostra os diários do que você já coleta."],
  "p-mercado": ["O Mercado Negro de Caerleon compra equipamento.", "Achar peças que dão lucro fabricando para vender lá, ou comprando em Caerleon e revendendo.", "Escolha a mercadoria e clique no título de uma coluna para ordenar (por lucro, preço ou nome). A idade ao lado do preço diz quão recente é a ordem."],
  "p-prata": ["As atividades que mais dão prata por hora.", "Comparar ganho e risco de cada atividade.", "Use os filtros para ver só o que combina com você."],
  "p-mapas": ["Onde pescar e coletar hoje.", "Ver os peixes mais valiosos do dia e os mapas com mais lagos e recursos do seu tier.", "Escolha o recurso. Os mapas dizem onde o recurso existe, não onde ele está agora."],
  "p-builds": ["Builds para Brumas, Corrompidas e PvE.", "Ver armas, peças, comida e poção de cada build, com as da sua ficha primeiro.", "Escolha o conteúdo. Para saber quanto custa montar uma, use a página Custo da build."],
  "p-custo": ["Quanto custa montar uma build hoje.", "Ver o preço de cada peça, a cidade onde cada uma sai mais barata e a melhor cidade para comprar tudo de uma vez.", "Escolha uma build pronta, ou \"Montar peça por peça\" para escolher cada parte. O botão Editar esta build copia a escolhida para o seu set. Escolha tier e encantamento."],
  "p-matchup": ["Fichas das armas que você mais encontra nas Brumas e Corrompidas.", "Saber o golpe perigoso de cada uma, quando entrar e o que guardar.", "Procure a arma pelo nome. Marque a caixa para destacar as fichas em que as suas armas se dão bem."],
  "p-patch": ["O que mudou no último patch.", "Ver quais armas subiram ou caíram.", "Só leitura."],
  "p-fontes": ["De onde vêm os dados do site.", "Conferir as fontes e os sites de apoio.", "Só leitura."]
};
(function(){
  let closed={}; try{ closed=JSON.parse(localStorage.getItem("guiaFechado")||"{}"); }catch(e){}
  for(const [id,[que,pode,como]] of Object.entries(GUIA)){
    const panel=document.getElementById(id); if(!panel) continue;
    const d=document.createElement("details"); d.className="guide"; if(!closed[id]) d.open=true;
    d.innerHTML=`<summary>Como usar esta página</summary><dl><dt>O que é</dt><dd></dd><dt>Dá para</dt><dd></dd><dt>Como usar</dt><dd></dd></dl>`;
    const dds=d.querySelectorAll("dd"); dds[0].textContent=que; dds[1].textContent=pode; dds[2].textContent=como;
    d.addEventListener("toggle",()=>{ closed[id]=!d.open; try{ localStorage.setItem("guiaFechado",JSON.stringify(closed)); }catch(e){} });
    const aside=panel.querySelector(":scope > p.aside");
    if(aside){ const m=document.createElement("details"); m.className="more"; m.innerHTML="<summary>Mais detalhes</summary>"; aside.replaceWith(m); m.append(aside); }
    const banner=panel.querySelector(":scope > .banner"); (banner||null) ? banner.after(d) : panel.prepend(d);
  }
})();
