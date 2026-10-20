/* ================= guia de cada página ================= */
// [o que é, o que dá para fazer, como usar]
const GUIA = {
  "p-voce": ["O resumo do seu dia no Albion, montado a partir da sua ficha.",
    "Ver de uma vez o que mais compensa fazer hoje: onde gastar o foco, o que refinar, fabricar e cozinhar, aonde ir coletar e quais builds combinam com as suas armas.",
    "Primeiro preencha a página Minha ficha (leva alguns minutos e só precisa fazer uma vez). Depois é só abrir esta página quando entrar no jogo. Para atualizar os preços, use o botão laranja no alto."],
  "p-ficha": ["A sua ficha de personagem, salva só no seu navegador.",
    "Digitar o seu Destiny Board: maestria e cada item de combate, craft, coleta, refino, cozinha, alquimia e fazenda. Todos os cálculos do site (custo de foco, recomendações, builds) usam esta ficha.",
    "Escreva o nome do personagem e abra cada grupo para digitar os níveis; o resumo ao lado mostra o que já está preenchido. O que você não souber, deixe em branco. Para usar em outro aparelho, copie o link da ficha e abra lá."],
  "p-refino": ["Quanto lucra refinar minério, fibra ou pelego (barra, tecido, couro) com os preços de agora.",
    "Descobrir qual tier e encantamento dá mais lucro por unidade refinada e conferir a conta de uma fornada. Foco é o recurso do jogo que reduz o custo de fabricar; aqui o lucro já considera taxas e o foco da sua ficha.",
    "Escolha o material em cima (metal, tecido ou couro). Veja as \"Melhores combinações agora\" e a tabela colorida: verde é lucro, vermelho é prejuízo. Clique numa combinação ou numa célula para abrir a calculadora, o histórico de preço e a rota: onde comprar a matéria-prima, onde refinar e onde vender."],
  "p-craft": ["A oficina: receita, custo e lucro de cada item que dá para fabricar.",
    "Achar o que vale a pena fabricar para vender. Cada linha mostra o item, o custo, o preço de venda e o lucro: linha verde dá lucro, vermelha dá prejuízo. A lista abre já ordenada, do maior lucro para o menor.",
    "Escolha a categoria, o tier e o encantamento (\"Todos\" mostra tudo) e como você compra e vende. Clique numa linha para abrir a conta logo abaixo dela: cada ingrediente com quantidade, cidade e preço, e o histórico. Clique no título de uma coluna para ordenar de outro jeito. Se a receita tiver muitos itens, use a barra de rolagem lateral."],
  "p-mk": ["O comparador de mercado, com todos os itens do jogo.",
    "Ver onde cada item está mais barato e mais caro entre as cidades e quanto dá para ganhar comprando numa e vendendo na outra (coluna Diferença). A lista abre ordenada pela maior diferença: verde é ganho, amarelo é 0%.",
    "Procure pelo nome em português ou inglês, ou use os filtros de categoria, tipo, tier, encantamento, qualidade e cidade (\"Todos\" não filtra nada). Clique numa linha ou em Detalhe para abrir as ofertas de venda e compra, o resumo e o histórico de 7 ou 30 dias. Para ver mais itens, use o botão \"Consultar mais\" no fim da lista."],
  "p-encantar": ["Vale a pena encantar uma peça ou comprar já encantada?",
    "Comparar o custo de subir a peça de nível (usando runa, alma ou relíquia) com o preço de comprar ou fabricar a peça já no nível novo. A coluna Economia é a diferença: verde quer dizer que encantar sai mais barato.",
    "Escolha a mercadoria e o tier (\"Todos\" mostra tudo). A lista abre ordenada da maior economia para a menor; passos sem preço ficam no fim. Clique numa linha para ver a conta completa: a peça de base, o material e o que custaria comprar pronta."],
  "p-cozinha": ["Lucro de comidas (Caerleon) e poções (Brecilien).",
    "Ver o que rende mais ao fabricar uma fornada com foco e o que as builds usam. Verde é lucro, vermelho é prejuízo; receitas sem preço de ingrediente ficam no fim da lista.",
    "Escolha Comidas ou Poções. Marque \"Só o que as builds usam\" se quiser filtrar. Clique numa linha para abrir a conta logo abaixo: ingredientes, taxas, lucro por fornada e histórico de preço."],
  "p-fazenda": ["Quanto rende a sua ilha: plantações, ervas, animais e criação.",
    "Comparar o lucro de cada semente, de cada animal que dá leite ou ovos e de criar filhotes até adultos, com os preços de agora.",
    "Escolha o que quer ver (Plantações, Ervas, Leite e ovos ou Criação) e quantos lotes ou animais você tem. A lista abre ordenada do maior lucro para o menor. A spec vem da sua ficha. O foco gasto muda de planta para planta: se o jogo mostrar outro valor, digite na linha e o site guarda."],
  "p-trab": ["Diários e trabalhadores da ilha.",
    "Ver quanto vale encher um diário e vender, ou entregar o diário cheio ao seu trabalhador. A lista mostra o resultado de cada tipo de trabalhador, do melhor para o pior.",
    "Escolha o tier. Digite a felicidade do seu trabalhador (a barra vai até 900 no T8) ou o rendimento em % que o jogo mostra; sem isso, a conta usa a barra cheia. Abaixo, a lista mostra os diários do que você já coleta na ficha."],
  "p-mercado": ["O Mercado Negro de Caerleon, que compra equipamento.",
    "Achar peças que dão lucro: fabricando para vender lá, ou comprando na cidade mais barata e revendendo. Mostra também quantas peças o Mercado Negro compra por dia. Linha verde é lucro, vermelha é prejuízo.",
    "Escolha a mercadoria, o tier e a qualidade (\"Todos\" mostra tudo; com tudo em Todos, a lista carrega um tier por vez) e o modo: Fabricar e vender ou Comprar barato e revender. A lista mostra as 100 de maior lucro. Clique numa linha para ver a conta e o histórico; o botão \"Craft\" leva a peça para a aba Craft. A idade ao lado do preço mostra quão recente é a ordem."],
  "p-prata": ["Uma comparação das atividades que mais rendem prata por hora.",
    "Comparar o ganho e o risco de cada atividade (corrompidas, brumas, coleta, craft e outras). A barra mostra a faixa de prata por hora; a cor mostra o risco: verde baixo, amarelo médio, vermelho alto.",
    "Use os botões Tudo, Solo, Grupo e Sem risco para ver só o que combina com o seu jeito de jogar. Passe o mouse numa linha para ver mais detalhes. São estimativas de uma tabela da comunidade: servem para comparar, não para prometer."],
  "p-mapas": ["Onde pescar e coletar hoje.",
    "Ver os peixes mais valiosos do dia (pelo preço de agora) e os mapas com mais lagos e recursos para o seu tier.",
    "Em Onde coletar, escolha o recurso (minério, fibra, pelego, madeira ou pedra). Os mapas dizem onde o recurso existe, não onde ele está agora: nenhum site mostra isso em tempo real. Os hotspots aparecem no mapa dentro do jogo."],
  "p-builds": ["As builds mais votadas de cada tipo de conteúdo.",
    "Ver armas, peças, comida e poção de cada build, com as que combinam com a sua ficha primeiro.",
    "Escolha o tipo de conteúdo (Mists, Hellgate, ZvZ, Gank e outros) e abra uma build. Para saber quanto custa montar, use o botão da build ou a página Custo da build."],
  "p-custo": ["Quanto custa montar uma build hoje.",
    "Ver o preço de cada peça da build, a cidade onde cada uma sai mais barata e a melhor cidade para comprar tudo de uma vez só. Os preços aparecem em vermelho porque são custo.",
    "Escolha uma build pronta, o tier e o encantamento (\"Equivalente\" usa a versão mais barata). Se uma parte tiver opções, escolha na própria linha. Para mudar peças, use \"Editar esta build peça por peça\". À direita, veja as melhores cidades para comprar o set e quanto dá para perder antes de acabar o dinheiro."],
  "p-zvz": ["O que o ZvZ está usando agora.",
    "Ver, por função, as armas mais usadas nas maiores lutas recentes e a build completa de cada uma.",
    "Escolha a função e, se quiser, uma aliança. Abra a arma para ver elmo, peito, botas, capa, poção e comida, e use o botão para calcular o custo da build."],
  "p-matchup": ["Fichas das armas que você mais encontra nas Brumas e Corrompidas.",
    "Saber, antes da luta, qual é o golpe perigoso de cada arma, quando entrar nela e o que guardar para responder. Os ícones mostram as habilidades mais usadas.",
    "Procure a arma pelo nome ou role pela lista. Clique num cartão para abrir a ficha completa. Marque a caixa \"Destacar o que as minhas armas fazem bem\" para marcar as fichas em que as suas armas se dão bem."],
  "p-patch": ["O que mudou no último patch do jogo e o que mudou desde que o grupo parou de jogar.",
    "Ver rápido o que sobe e o que cai: linhas verdes são buffs, vermelhas são nerfs, amarelas são eventos. A segunda tabela mostra, update por update, o efeito na economia de prata.",
    "É só leitura: role a página. Use esta aba para decidir que armas e atividades vale rever depois de uma atualização."],
  "p-versao": ["Qual versão do site está no ar e quando ela foi publicada.",
    "Conferir se você está usando a versão mais nova, a hora da publicação e quando cada base de dados foi atualizada.",
    "Compare o código da versão com o que foi informado. Se aparecer versão nova, use o botão para recarregar, ou atualize a página com Ctrl+F5."],
  "p-fontes": ["De onde vêm os dados do site.",
    "Conferir de onde vem cada número (preços, receitas, custo de foco, prata por hora) e abrir os sites de apoio usados.",
    "É só leitura. Clique num cartão (com a seta ↗) para abrir o site em outra aba."]
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
