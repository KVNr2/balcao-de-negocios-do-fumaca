/* ================= guia de cada página ================= */
// [o que é, o que dá para fazer, como usar]
const GUIA = {
  "p-voce": ["O resumo do dia feito para a sua ficha.", "Ver o melhor uso do foco hoje, o que refinar, fabricar e cozinhar, aonde ir coletar e quais builds combinam com as suas armas.", "Preencha a Minha ficha uma vez. Depois é só abrir esta página quando entrar no jogo."],
  "p-ficha": ["As suas specs, salvas só no seu navegador.", "Marcar o nível de armas, armaduras, coleta, refino, craft, cozinha e alquimia. Todas as recomendações do site saem daqui.", "Clique no nível de cada linha. Para usar em outro computador, copie a ficha e cole lá."],
  "p-refino": ["Lucro de refinar minério, fibra e pelego com os preços de agora.", "Ver na tabela colorida qual tier e encantamento dá mais lucro, e fazer a conta exata de uma fornada.", "Escolha o material em cima. Verde é lucro, vermelho é prejuízo. Clique numa célula para abrir a conta e o histórico."],
  "p-craft": ["Lucro de fabricar elmos, peitos e botas.", "Comparar tier e encantamento de cada conjunto de armadura.", "Escolha a peça, o material e o conjunto. A tabela mostra o lucro por peça com foco."],
  "p-encantar": ["Vale a pena encantar ou comprar já encantado?", "Comparar o custo de subir uma peça de nível (runa, alma, relíquia) com comprar ou fabricar a peça pronta.", "Escolha a linha de arma ou armadura e o tier. Economia positiva quer dizer que encantar sai mais barato."],
  "p-cozinha": ["Lucro de comidas e poções.", "Ver o que rende mais com foco, o que as builds usam e o histórico de preço de cada receita.", "Escolha comidas ou poções. Clique numa linha para ver os ingredientes."],
  "p-fazenda": ["Quanto rende a sua ilha.", "Comparar plantações, ervas, animais que dão leite e ovos e a criação de filhotes até adulto.", "Escolha o que quer ver, quantos lotes ou animais você tem e a sua spec de fazenda. O foco muda de planta para planta: se o jogo mostrar outro valor, digite na linha que ele fica guardado."],
  "p-trab": ["Diários e trabalhadores.", "Ver quanto vale encher um diário e vender, ou entregar ao seu trabalhador.", "Escolha o tier e a felicidade da sua casa. A lista de baixo mostra os diários do que você já coleta."],
  "p-mercado": ["O Mercado Negro de Caerleon compra equipamento.", "Achar peças que dão lucro fabricando para vender lá, ou comprando em Caerleon e revendendo.", "Escolha a mercadoria. A idade ao lado do preço diz quão recente é a ordem; confira no jogo antes de fabricar."],
  "p-prata": ["As atividades que mais dão prata por hora.", "Comparar ganho e risco de cada atividade.", "Use os filtros para ver só o que combina com você."],
  "p-mapas": ["Onde pescar e coletar hoje.", "Ver os peixes mais valiosos do dia e os mapas com mais lagos e recursos do seu tier.", "Escolha o recurso. Os mapas dizem onde o recurso existe, não onde ele está agora."],
  "p-builds": ["Builds para Brumas, Corrompidas e PvE.", "Ver armas, peças, comida e poção de cada build, com as da sua ficha primeiro.", "Escolha o conteúdo. Para saber quanto custa montar uma, use a página Custo da build."],
  "p-custo": ["Quanto custa montar uma build hoje.", "Ver o preço de cada peça, a cidade onde cada uma sai mais barata e a melhor cidade para comprar tudo de uma vez.", "Escolha a build, o tier e o encantamento. Onde a build dá duas opções, troque no seletor da peça."],
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
