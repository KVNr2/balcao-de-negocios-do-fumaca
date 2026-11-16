/* Painel "Mapa de Avalon" (telinha do overlay): imagem do mapa, recursos e dungeons, na mesma informação da aba Avalon.
   Parâmetros: q (nome do mapa lido da tela) ou i (id, ex. TNL-001). Funciona no overlay e aberto direto no navegador. */
(function(){
"use strict";
var $=function(i){return document.getElementById(i)};
var P=new URLSearchParams(location.search), OV=location.port==="47832";
var RES={ORE:"Minério",FIBER:"Fibra",WOOD:"Madeira",ROCK:"Pedra",HIDE:"Couro"};
var YPT={ROYAL:"Royal",ROYAL_RED:"Royal (vermelho)",BLACK_LOW:"Low Black",BLACK_MEDIUM:"Medium Black",BLACK_HIGH:"High Black",LOW:"Low Tunnel",MEDIUM:"Medium Tunnel",HIGH:"High Tunnel",DEEP:"Deep Tunnel",DEEP_RAID:"Deep Tunnel (raid)",HIDEOUT:"Hideout",HIDEOUT_DEEP:"Deep Hideout"};
var G=function(y){return /^HIDEOUT/.test(y)?"HO":/^ROYAL/.test(y)?"ROYAL":/^BLACK/.test(y)?"BLACK":"TUNNEL"};
var CLS=function(y){return y==="ROYAL_RED"?"red":({HO:"ho",ROYAL:"royal",BLACK:"black",TUNNEL:"tunnel"})[G(y)]};
var TYIMG={ho:"imagens/ico-ho.png",tunnel:"imagens/ico-tunnel.png",black:"imagens/ico-black.svg",royal:"imagens/ico-blue.svg",red:"imagens/ico-red.svg"};
var norm=function(s){return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()};
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function soma(o){return Object.keys(o||{}).reduce(function(a,k){return a+o[k]},0)}

function mini(m){   /* sem foto: minimapa desenhado com as posições do jogo (mesma ideia da aba Avalon) */
  var b=m.b||[0,0,1,1],W=b[2],H=b[3],vh=Math.max(40,Math.round(100*H/W)),MC={o:"#c98b4a",w:"#b07a46",f:"#7fc16b",h:"#d9b78e",s:"#a9a9b4"};
  var s='<svg class="pa-mini" viewBox="0 0 100 '+vh+'" role="img" aria-label="Minimapa de '+esc(m.n)+'"><rect class="bg" width="100" height="'+vh+'" rx="4"/>';
  for(var g=1;g<4;g++)s+='<line class="gr" x1="'+g*25+'" y1="0" x2="'+g*25+'" y2="'+vh+'"/><line class="gr" x1="0" y1="'+vh*g/4+'" x2="100" y2="'+vh*g/4+'"/>';
  (m.m||[]).forEach(function(p){var X=(p[1]-b[0])/W*100,Y=(p[2]-b[1])/H*vh;if(!(X>=0&&X<=100&&Y>=0&&Y<=vh))return;
    if(MC[p[0]])s+='<circle cx="'+X+'" cy="'+Y+'" r="3" fill="'+MC[p[0]]+'"/>';
    else if(p[0]==="D")s+='<rect x="'+(X-2.6)+'" y="'+(Y-2.6)+'" width="5.2" height="5.2" transform="rotate(45 '+X+' '+Y+')" fill="#a8283c"/>';
    else if(p[0]==="G")s+='<rect x="'+(X-2.7)+'" y="'+(Y-2.7)+'" width="5.4" height="5.4" fill="#9a5420"/>';
    else if(p[0]==="E")s+='<circle cx="'+X+'" cy="'+Y+'" r="3.6" fill="#7b45b8"/>';
    else s+='<circle cx="'+X+'" cy="'+Y+'" r="3.2" fill="none" stroke="#6fa8ff" stroke-width="1.2"/>'});
  return s+"</svg>";
}
function tag(cls,txt,n){return n>0?'<span class="it '+cls+'">'+esc(txt)+'<b>×'+n+"</b></span>":""}

function desenhar(m,pic){
  var c=CLS(m.y),ty=G(m.y).toLowerCase(),h='';
  h+='<div class="pa-hd"><img src="'+esc(TYIMG[c==="red"?"red":ty]||"")+'" alt="">'+'<span class="pa-nome">'+esc(m.n)+'</span><span class="tag t'+m.t+'">T'+m.t+'</span><span class="ty '+c+'">'+esc(YPT[m.y]||m.y)+"</span></div>";
  h+=pic?'<img class="pa-img" src="imagens/avalon/'+esc(pic)+'" alt="Mapa '+esc(m.n)+'">':mini(m);
  h+="<h4>Recursos no mapa</h4>";
  var any=false;
  Object.keys(RES).forEach(function(k){var n=soma(m.r&&m.r[k]);if(!n)return;any=true;
    var ts=Object.keys(m.r[k]).map(Number).sort(function(a,b){return a-b}),mt=ts[ts.length-1];
    h+='<div class="rec"><img src="icons/T'+mt+"_"+k+'.webp" alt="" onerror="this.onerror=null;this.src=\'https://render.albiononline.com/v1/item/T'+mt+"_"+k+'.png?size=64\'"><span class="rn">'+RES[k]+"</span>"+'<span class="tt">'+ts.map(function(t){return '<span class="zc"><small>T'+t+"</small><b>×"+m.r[k][t]+"</b></span>"}).join("")+"</span></div>"});
  if(!any)h+='<div class="vazio" style="padding:6px">Sem recursos</div>';
  h+="<h4>Dungeons e baús</h4><div class=\"tags\">";
  var dg=(m.s||0)+(m.g||0)+(m.e||0);
  if(!dg)h+='<span class="it none">Sem dungeons</span>';
  h+=tag("solo","Dungeon solo",m.s)+tag("grp","Dungeon de grupo",m.g)+tag("raid","Raid",m.e)+tag("ho","Hideout",m.ho||0)+tag("mist","Brecilien",m.mi||0)+tag("blue","Baú azul",m.cb)+tag("green","Baú verde",m.cg)+tag("gold","Baú dourado",m.cy);
  h+="</div>";
  $("c").innerHTML=h;
}
function vazio(t){$("c").innerHTML='<div class="vazio">'+esc(t)+"</div>"}

(async function(){
  try{
    var R=await Promise.all([fetch("data/avalon.json").then(function(r){return r.json()}),fetch("imagens/avalon/index.json").then(function(r){return r.ok?r.json():null}).catch(function(){return null})]);
    var data=R[0],imgs=R[1],q=P.get("q"),id=P.get("i"),m=null;
    if(id)m=data.filter(function(x){return x.i===id})[0];
    if(!m&&q){var n=norm(q);m=data.filter(function(x){return norm(x.n)===n})[0]}
    if(!m)return vazio(q?"Não achei o mapa \""+q+"\" na lista de Avalon.":"Nenhum mapa informado.");
    desenhar(m,imgs&&imgs[norm(m.n).replace(/ /g,"-")]);
  }catch(e){vazio("Não consegui abrir os dados do mapa.")}
})();

$("x").addEventListener("click",function(){window.close()});
document.addEventListener("keydown",function(e){if(e.key==="Escape")window.close()});
if(OV){   /* protocolo das janelinhas do overlay (sem barra do navegador; arrastar pelo cabeçalho) */
  requestAnimationFrame(function(){requestAnimationFrame(function(){fetch("/pronto?dlg=1",{method:"POST"})})});
  var moldura=function(){var t=Math.round((window.outerHeight-window.innerHeight)*(window.devicePixelRatio||1));if(t>=10&&t<=90)fetch("/moldura?dlg=1&top="+t,{method:"POST"})};
  moldura();setTimeout(moldura,400);
  var c=$("bar"),d=null,pend=null,raf=0;
  var flush=function(){raf=0;if(pend){fetch("/mover?dlg=1&dx="+Math.round(pend.x*(window.devicePixelRatio||1))+"&dy="+Math.round(pend.y*(window.devicePixelRatio||1)),{method:"POST"});pend=null}};
  c.addEventListener("pointerdown",function(e){if(e.button!==0||e.target.closest("button"))return;d={x:e.screenX,y:e.screenY};c.setPointerCapture(e.pointerId)});
  c.addEventListener("pointermove",function(e){if(!d)return;var dx=e.screenX-d.x,dy=e.screenY-d.y;if(!dx&&!dy)return;d={x:e.screenX,y:e.screenY};pend=pend?{x:pend.x+dx,y:pend.y+dy}:{x:dx,y:dy};if(!raf)raf=requestAnimationFrame(flush)});
  c.addEventListener("pointerup",function(){d=null});c.addEventListener("pointercancel",function(){d=null});
}
})();
