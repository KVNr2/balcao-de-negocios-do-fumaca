/* ================= guia de cada página ================= */
// [o que é, o que dá para fazer, como usar]
const GUIA = {
  "p-voce": ["O resumo do dia feito para a sua ficha.", "Ver o melhor uso do foco hoje, o que refinar, fabricar e cozinhar, aonde ir coletar e quais builds combinam com as suas armas.", "Preencha a Minha ficha uma vez. Depois é só abrir esta página quando entrar no jogo."],
  "p-ficha": ["A sua ficha, salva só no seu navegador.", "Digitar o Destiny Board inteiro: maestria e cada item de combate, craft, coleta, refino, cozinha, alquimia e fazenda. Todas as recomendações e o custo de foco saem daqui.", "Escreva o nome do personagem e abra cada linha para digitar os níveis; o resumo ao lado mostra o que já está preenchido. Para usar em outro aparelho, copie o link da ficha e abra lá."],
  "p-refino": ["Lucro de refinar minério, fibra e pelego com os preços de agora.", "Ver na tabela colorida qual tier e encantamento dá mais lucro, e fazer a conta exata de uma fornada.", "Escolha o material em cima. Verde é lucro, vermelho é prejuízo. Clique numa célula para abrir a conta, o histórico e a rota: onde comprar a matéria-prima, onde refinar e onde vender."],
  "p-craft": ["A oficina: receita, custo e lucro de cada item que dá para fabricar.", "Ver cada ingrediente com quantidade, cidade, preço e quando foi visto; o custo, a venda, o lucro e quantos vendem por dia. Vale para armas, armaduras, comidas, poções e refino.", "Escolha a categoria, o tier e o encantamento, e como compra e vende. Clique no título da coluna para ordenar e num item para ver os preços por cidade. Embaixo continua o mapa de lucro das armaduras."],
  "p-mk": ["O comparador de mercado, com todos os itens do jogo.", "Ver, para cada item, onde ele está mais caro e mais barato para vender e para comprar, e quando cada preço foi visto.", "Procure pelo nome em português ou inglês, ou escolha categoria, tipo, tier e encantamento. Clique num item para abrir os preços de todas as cidades e o gráfico de vendas por dia."],
  "p-encantar": ["Vale a pena encantar ou comprar já encantado?", "Comparar o custo de subir uma peça de nível (runa, alma, relíquia) com comprar ou fabricar a peça pronta.", "Escolha a linha de arma ou armadura e o tier. Economia positiva quer dizer que encantar sai mais barato."],
  "p-cozinha": ["Lucro de comidas e poções.", "Ver o que rende mais com foco, o que as builds usam e o histórico de preço de cada receita.", "Escolha comidas ou poções. Clique numa linha para ver os ingredientes."],
  "p-fazenda": ["Quanto rende a sua ilha.", "Comparar plantações, ervas, animais que dão leite e ovos e a criação de filhotes até adulto.", "Escolha o que quer ver, quantos lotes ou animais você tem. A spec de cada planta e animal vem da Minha ficha. O foco muda de planta para planta: se o jogo mostrar outro valor, digite na linha que ele fica guardado."],
  "p-trab": ["Diários e trabalhadores.", "Ver quanto vale encher um diário e vender, ou entregar ao seu trabalhador.", "Escolha o tier e digite a felicidade do seu trabalhador (a barra vai até 900 em T8) ou o rendimento em % que o jogo mostra. A lista de baixo mostra os diários do que você já coleta."],
  "p-mercado": ["O Mercado Negro de Caerleon compra equipamento.", "Achar peças que dão lucro fabricando para vender lá, ou comprando na cidade mais barata e revendendo, e ver quantas o Mercado Negro compra por dia.", "Escolha a mercadoria e clique no título de uma coluna para ordenar (por lucro, preço ou nome). A idade ao lado do preço diz quão recente é a ordem."],
  "p-prata": ["As atividades que mais dão prata por hora.", "Comparar ganho e risco de cada atividade.", "Use os filtros para ver só o que combina com você."],
  "p-mapas": ["Onde pescar e coletar hoje.", "Ver os peixes mais valiosos do dia e os mapas com mais lagos e recursos do seu tier.", "Escolha o recurso. Os mapas dizem onde o recurso existe, não onde ele está agora."],
  "p-builds": ["As builds mais votadas de cada tipo de conteúdo.", "Ver armas, peças, comida e poção de cada build, com as da sua ficha primeiro.", "Escolha o conteúdo (Mists, Hellgate, ZvZ, Gank e outros). Para saber quanto custa montar uma, use a página Custo da build."],
  "p-custo": ["Quanto custa montar uma build hoje.", "Ver o preço de cada peça, a cidade onde cada uma sai mais barata e a melhor cidade para comprar tudo de uma vez.", "Escolha uma build pronta, ou \"Montar peça por peça\" para escolher cada parte. O botão Editar esta build copia a escolhida para o seu set. Escolha tier e encantamento."],
  "p-zvz": ["O que o ZvZ está usando agora.", "Ver, por função, as armas mais usadas nas maiores lutas recentes e a build completa de cada uma.", "Escolha a função e, se quiser, uma aliança. Abra a arma para ver elmo, peito, botas, capa, poção e comida."],
  "p-matchup": ["Fichas das armas que você mais encontra nas Brumas e Corrompidas.", "Saber o golpe perigoso de cada uma, quando entrar e o que guardar.", "Procure a arma pelo nome. Marque a caixa para destacar as fichas em que as suas armas se dão bem."],
  "p-patch": ["O que mudou no último patch.", "Ver quais armas subiram ou caíram.", "Só leitura."],
  "p-versao": ["Qual versão do site está no ar e quando ela foi publicada.", "Conferir a versão que você está usando, a hora da publicação e quando cada base de dados foi atualizada.", "Se aparecer versão nova, use o botão para recarregar."],
  "p-fontes": ["De onde vêm os dados do site.", "Conferir as fontes e os sites de apoio.", "Só leitura."]
};
(function(){
  // O guia abre sozinho só na primeira visita de cada página; depois fica fechado, a não ser que a pessoa abra.
  let closed={}, seen={}; try{ closed=JSON.parse(localStorage.getItem("guiaFechado")||"{}"); seen=JSON.parse(localStorage.getItem("guiaVisto")||"{}"); }catch(e){}
  const io=("IntersectionObserver" in window)?new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ seen[e.target.dataset.p]=1; io.unobserve(e.target); try{ localStorage.setItem("guiaVisto",JSON.stringify(seen)); }catch(_){} } })):null;
  for(const [id,[que,pode,como]] of Object.entries(GUIA)){
    const panel=document.getElementById(id); if(!panel) continue;
    const d=document.createElement("details"); d.className="guide"; d.dataset.p=id; if(closed[id]===false || (!seen[id] && closed[id]!==true)) d.open=true; if(io) io.observe(d);
    d.innerHTML=`<summary>Como usar esta página</summary><dl><dt>Dá para</dt><dd></dd><dt>Como usar</dt><dd></dd></dl>`;
    const dds=d.querySelectorAll("dd"); dds[0].textContent=pode; dds[1].textContent=como;
    d.addEventListener("toggle",()=>{ closed[id]=!d.open; try{ localStorage.setItem("guiaFechado",JSON.stringify(closed)); }catch(e){} });
    const asides=[...panel.querySelectorAll(":scope > p.aside")];
    if(asides.length){ const m=document.createElement("details"); m.className="more"; m.innerHTML="<summary>Mais detalhes</summary>"; asides[0].replaceWith(m); m.append(...asides); }
    const banner=panel.querySelector(":scope > .banner"); (banner||null) ? banner.after(d) : panel.prepend(d);
  }
})();
