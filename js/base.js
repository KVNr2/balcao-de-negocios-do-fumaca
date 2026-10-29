
let DATA = {itens:{}};
const $ = id => document.getElementById(id);
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = { get(k){try{return localStorage.getItem(k)}catch(e){return null}}, set(k,v){try{localStorage.setItem(k,v)}catch(e){}}, del(k){try{localStorage.removeItem(k)}catch(e){}} };
const fmt = n => (n==null||!isFinite(n)) ? "—" : Math.round(n).toLocaleString("pt-BR");
const sgn = n => (n>0?"+":"")+fmt(n);
const fmtS = n => { if(n==null||!isFinite(n)) return "—"; const a=Math.abs(n); if(a>=1e6) return (n/1e6).toLocaleString("pt-BR",{maximumFractionDigits:1})+"M"; if(a>=1e4) return Math.round(n/1e3).toLocaleString("pt-BR")+" mil"; return fmt(n); };
const dec = n => n.toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1});
const el = (tag, props={}, ...kids) => { const e=document.createElement(tag); for(const [k,v] of Object.entries(props)){ if(k==="class") e.className=v; else if(k==="text") e.textContent=v; else if(k==="role"||k.startsWith("data-")||k.startsWith("aria-")) e.setAttribute(k,v); else e[k]=v; } for(const c of kids) if(c!=null) e.append(c); return e; };

/* ================= game constants ================= */
const RES = {
  metal:{raw:"ORE",ref:"METALBAR",city:"Thetford",rawName:"Minério",refName:"Barra de metal",prevName:"Barra",u:"barra",up:"barras",art:"uma",note:"Thetford tem o bônus de refino de minério. O minério vem barato de Fort Sterling, Martlock e Bridgewatch."},
  cloth:{raw:"FIBER",ref:"CLOTH",city:"Lymhurst",rawName:"Fibra (linho)",refName:"Tecido",prevName:"Tecido",u:"tecido",up:"tecidos",art:"um",note:"Lymhurst tem o bônus de refino de fibra."},
  leather:{raw:"HIDE",ref:"LEATHER",city:"Martlock",rawName:"Pelego",refName:"Couro",prevName:"Couro",u:"couro",up:"couros",art:"um",note:"Martlock tem o bônus de refino de pelego."},
  wood:{raw:"WOOD",ref:"PLANKS",city:"Fort Sterling",rawName:"Madeira",refName:"Tábua",prevName:"Tábua",u:"tábua",up:"tábuas",art:"uma",note:"Fort Sterling tem o bônus de refino de madeira."},
  stone:{raw:"ROCK",ref:"STONEBLOCK",city:"Bridgewatch",rawName:"Pedra",refName:"Bloco de pedra",prevName:"Bloco de pedra",u:"bloco",up:"blocos",art:"um",note:"Bridgewatch tem o bônus de refino de pedra."}
};
const N = {4:2,5:3,6:4,7:5,8:5};
const FOCUS_REF = [[54,94,164,287,503],[94,164,287,503,880],[164,287,503,880,1539],[287,503,880,1539,2694],[503,880,1539,2694,4715]]; // .4 estimado (×1,75 por nível)
const FOCUS_CRAFT = [[429,750,1313,2298,4021],[750,1313,2298,4021,7037],[1313,2298,4021,7037,12315],[2298,4021,7037,12315,21551],[4021,7037,12315,21551,37714]]; // elmo e botas; peito = ×2
const IV = (t,e)=>Math.pow(2,t+e);
const MATBAR = {PLATE:"METALBAR",LEATHER:"LEATHER",CLOTH:"CLOTH"};
const SETN = {PLATE:["Soldier","Knight","Guardian"],LEATHER:["Mercenary","Hunter","Assassin"],CLOTH:["Scholar","Cleric","Mage"]};
const SLOTN = {PLATE:{HEAD:"Helmet",ARMOR:"Armor",SHOES:"Boots"},LEATHER:{HEAD:"Hood",ARMOR:"Jacket",SHOES:"Shoes"},CLOTH:{HEAD:"Cowl",ARMOR:"Robe",SHOES:"Sandals"}};
const CRAFT_PT = {HEAD_PLATE:"Elmo de placa",HEAD_LEATHER:"Capuz de couro",HEAD_CLOTH:"Capote de pano",ARMOR_PLATE:"Peitoral de placa",ARMOR_LEATHER:"Jaqueta de couro",ARMOR_CLOTH:"Robe de pano",SHOES_PLATE:"Botas de placa",SHOES_LEATHER:"Sapatos de couro",SHOES_CLOTH:"Sandálias de pano"};
const CRAFT_CITY = {HEAD_PLATE:"Fort Sterling",HEAD_LEATHER:"Lymhurst",HEAD_CLOTH:"Thetford",ARMOR_PLATE:"Bridgewatch",ARMOR_LEATHER:"Thetford",ARMOR_CLOTH:"Fort Sterling",SHOES_PLATE:"Martlock",SHOES_LEATHER:"Lymhurst",SHOES_CLOTH:"Bridgewatch"};
const LINES = [["espada","Espadas"],["machado","Machados"],["maca","Maças"],["martelo","Martelos"],["lanca","Lanças"],["bordao","Bordões"],["adaga","Adagas"],["luvas","Luvas de guerra"],["arco","Arcos"],["besta","Bestas"],["metamorfo","Metamorfos"],["fogo","Fogo"],["gelo","Gelo"],["arcano","Arcano"],["sagrado","Sagrado"],["natureza","Natureza"],["maldito","Amaldiçoado"]];
const LINE_NAME = Object.fromEntries(LINES);
const GATHER = [["minerio","Minério","ORE","Montanha (Fort Sterling), terras altas (Martlock), estepe (Bridgewatch)"],["fibra","Fibra","FIBER","Pântano (Thetford), montanha, estepe"],["pelego","Pelego","HIDE","Estepe (Bridgewatch), floresta, pântano"],["madeira","Madeira","WOOD","Floresta (Lymhurst), pântano, terras altas"],["pedra","Pedra","ROCK","Terras altas (Martlock), montanha, floresta"],["pesca","Pesca",null,""]];
const FISH_BIOMES = [["FOREST","floresta"],["STEPPE","estepe"],["MOUNTAIN","montanha"],["HIGHLANDS","terras altas"],["SWAMP","pântano"],["AVALON","Avalon"],["DRAGON_AREA","Ancient Lands"]];
const FISH_IDS = (()=>{ const a=[]; for(let t=1;t<=8;t++) a.push(`T${t}_FISH_FRESHWATER_ALL_COMMON`,`T${t}_FISH_SALTWATER_ALL_COMMON`); for(const t of [3,5,7]){ for(const [b] of FISH_BIOMES) a.push(`T${t}_FISH_FRESHWATER_${b}_RARE`); a.push(`T${t}_FISH_SALTWATER_ALL_RARE`); } a.push("T1_FISHCHOPS","T8_FISH_SALTWATER_ALL_BOSS_SHARK"); return a; })();
const LV_W = ["Nada","T8","Média","Alta"], LV_S = ["Sem spec","Pouca","Média","Alta"];
const FCE_LV = [0,6000,15000,30000];

/* ================= builds ================= */
// c: brumas | corrompidas | barato | pve.  pop: salvamentos no AlbionOnlineGrind. mc: tier no MetaCorrupted (abr/2026). p: [up|down|flat, texto do Patch 3]
const P = {
  up_sw:["up","Espadas: Heroic Strike dura 4s (era 3,5s)"], up_dg:["up","Adagas: Bloodthirsty Blade 2,5% (era 4%)"], up_ts:["up","Ring of Death 36 (era 27), área dobrada"],
  dn_xb:["down","Bestas: Explosive Bolt 119 (era 130)"], dn_ss:["down","Metamorfos: Tether Shift 16 de energia, escudo 88"], dn_fw:["down","Spontaneous Combustion 45s (era 40s)"],
  dn_qs:["down","Bordões: Cartwheel 7 de energia (era 5)"], dn_ho:["down","Smite em PvP 115 (era 136)"], up_hh:["up","Infernal Boulder 24 por tick (era 18)"], up_gf:["up","Flame Pillar mais rápido"], flat:["flat","sem mudança"]
};
let BUILDS = [
 {w:"Battleaxe",l:"machado",c:"brumas",pop:207,g:["Elder's Muisak","Hunter Hood","Fiend Cowl","Mistwalker Jacket","Assassin Jacket","Soldier Boots","Cleric Sandals","Undead Cape","Avalonian Cape"],f:"Eel Stew, Puremist Snapper; poções de cura e Gigantify",p:P.flat},
 {w:"Dual Swords",l:"espada",c:"brumas",pop:90,g:["Hunter Hood","Fiend Cowl","Mercenary Jacket","Soldier Boots","Avalonian Cape","Undead Cape"],f:"Eel Stew; cura e Gigantify",p:P.up_sw},
 {w:"Deathgivers",l:"adaga",c:"brumas",pop:68,g:["Stalker Hood","Fiend Cowl","Mercenary Jacket","Mistwalker Jacket","Cleric Sandals","Undead Cape","Avalonian Cape"],f:"Eel Stew; cura e Gigantify",p:P.up_dg},
 {w:"Fists of Avalon",l:"luvas",c:"brumas",pop:43,mc:"S",g:["Cowl of Purity","Fiend Cowl","Feyscale Robe","Assassin Jacket","Cleric Sandals","Shoes of Tenacity","Undead Cape","Avalonian Cape"],f:"Eel Stew; cura e Gigantify",p:P.flat},
 {w:"Cursed Staff",l:"maldito",c:"brumas",pop:40,mc:"A",g:["Elder's Muisak","Guardian Helmet","Helmet of Valor","Cleric Robe","Mage Robe","Soldier Boots","Caerleon Cape"],f:"Stew; cura e Gigantify",p:P.flat},
 {w:"Prowling Staff",l:"metamorfo",c:"brumas",pop:36,g:["Fiend Cowl","Cultist Cowl","Mistwalker Jacket","Assassin Jacket","Soldier Boots","Undead Cape"],f:"Eel Stew; cura",p:P.dn_ss},
 {w:"Bloodletter",l:"adaga",c:"brumas",pop:27,g:["Elder's Mistcaller","Cultist Cowl","Mercenary Hood","Stalker Jacket","Cleric Sandals","Avalonian Cape","Undead Cape"],f:"Eel Stew; cura e Gigantify",p:P.up_dg},
 {w:"Spear",l:"lanca",c:"brumas",pop:24,mc:"A",g:["Elder's Mistcaller","Cultist Cowl","Fiend Cowl","Stalker Jacket","Soldier Boots","Undead Cape","Avalonian Cape"],f:"Puremist Snapper, Eel Stew; cura e Gigantify",p:P.flat},
 {w:"Carving Sword",l:"espada",c:"brumas",pop:18,g:["Fiend Cowl","Mistwalker Jacket","Soldier Boots","Undead Cape","Avalonian Cape"],f:"Eel Stew, Puremist Snapper",p:P.up_sw},
 {w:"Battle Bracers",l:"luvas",c:"brumas",pop:16,g:["Cowl of Purity","Fiend Cowl","Assassin Jacket","Scholar Sandals","Undead Cape","Avalonian Cape"],f:"Eel Stew; cura",p:P.flat},
 {w:"Bear Paws",l:"machado",c:"brumas",pop:15,g:["Fiend Cowl","Mistwalker Jacket","Soldier Boots","Undead Cape","Avalonian Cape"],f:"Eel Stew, Puremist Snapper",p:P.flat},
 {w:"Dagger",l:"adaga",c:"brumas",pop:14,g:["Elder's Torch","Helmet of Valor","Hunter Jacket","Cleric Sandals","Avalonian Cape"],f:"Eel Stew; cura e Gigantify",p:P.up_dg},
 {w:"Quarterstaff",l:"bordao",c:"brumas",pop:12,mc:"A",g:["Cultist Cowl","Fiend Cowl","Stalker Jacket","Cleric Sandals","Avalonian Cape","Demon Cape"],f:"Eel Stew, Omelette",p:P.dn_qs},
 {w:"Great Hammer",l:"martelo",c:"brumas",pop:11,g:["Cultist Cowl","Stalker Jacket","Cleric Sandals","Avalonian Cape"],f:"Eel Stew, Omelette; cura e Gigantify",p:P.flat},
 {w:"Double Bladed Staff",l:"bordao",c:"brumas",pop:11,g:["Cultist Cowl","Mercenary Hood","Stalker Jacket","Cleric Sandals","Avalonian Cape"],f:"Omelette, Eel Stew",p:P.dn_qs},
 {w:"Wildfire Staff",l:"fogo",c:"brumas",pop:9,g:["Elder's Tome of Spells","Hunter Hood","Cleric Robe","Feyscale Robe","Soldier Boots","Martlock Cape"],f:"Omelette; cura e Gigantify",p:P.flat},
 {w:"Chillhowl",l:"gelo",c:"brumas",pop:8,mc:"A",g:["Elder's Mistcaller","Hunter Hood","Cowl of Purity","Cultist Robe","Assassin Jacket","Soldier Boots","Lymhurst Cape"],f:"Omelette; cura e Gigantify",p:P.flat},
 {w:"Boltcasters",l:"besta",c:"brumas",pop:7,g:["Hunter Hood","Guardian Helmet","Cleric Robe","Soldier Boots","Martlock Cape"],f:"Eel Stew, Puremist Snapper",p:P.dn_xb},
 {w:"Flamewalker Staff",l:"fogo",c:"brumas",pop:7,mc:"A",g:["Elder's Mistcaller","Helmet of Valor","Feyscale Robe","Shoes of Tenacity","Smuggler Cape"],f:"Omelette, Puremist Snapper",p:P.dn_fw},
 {w:"Bow of Badon",l:"arco",c:"brumas",pop:7,g:["Cowl of Purity","Hunter Hood","Mistwalker Jacket","Soldier Boots","Undead Cape"],f:"Omelette, Eel Stew",p:P.flat},
 {w:"Fire Staff",l:"fogo",c:"brumas",pop:7,g:["Elder's Mistcaller","Soldier Helmet","Hunter Hood","Feyscale Robe","Cleric Robe","Soldier Boots","Martlock Cape"],f:"Omelette; cura e Gigantify",p:P.flat},
 {w:"Frost Staff",l:"gelo",c:"brumas",pop:7,g:["Elder's Leering Cane","Cowl of Purity","Assassin Jacket","Soldier Boots","Thetford Cape"],f:"Omelette; cura",p:P.flat},
 {w:"Light Crossbow",l:"besta",c:"brumas",pop:6,g:["Elder's Muisak","Guardian Helmet","Cleric Robe","Soldier Boots","Martlock Cape"],f:"Eel Stew, Puremist Snapper",p:P.dn_xb},
 {w:"Arclight Blasters",l:"besta",c:"brumas",pop:0,mc:"S",g:["Helmet of Valor ou Fiend Cowl","Mistwalker Jacket ou Cultist Robe","Scholar Sandals","Caerleon ou Brecilien Cape"],f:"Puremist Snapper ou Eel Stew",p:P.dn_xb,src:"pesquisa"},
 {w:"Forcepulse Bracers",l:"luvas",c:"brumas",pop:5,g:["Helmet of Valor","Fiend Cowl","Mercenary Jacket","Scholar Sandals","Smuggler Cape"],f:"Puremist Snapper, Eel Stew",p:P.flat},
 {w:"Hellfire Hands",l:"luvas",c:"brumas",pop:4,g:["Cleric Robe","Assassin Shoes","Hellion Shoes","Keeper Cape"],f:"Stew; cura e Gigantify",p:P.up_hh},
 {w:"Mistpiercer",l:"arco",c:"brumas",pop:4,g:["Royal Helmet","Assassin Jacket","Soldier Boots","Morgana Cape"],f:"Beef Sandwich",p:P.flat},
 {w:"Arcano (build Life Ender)",l:"arcano",c:"brumas",pop:4,g:["Elder's Mistcaller","Mage Cowl","Cowl of Purity","Mercenary Jacket","Demon Boots","Royal Boots","Thetford Cape"],f:"Stew, Pork",p:P.flat},
 {w:"Warbow",l:"arco",c:"brumas",pop:4,g:["Guardian Helmet","Cowl of Purity","Assassin Jacket","Soldier Boots","Undead Cape"],f:"Omelette",p:P.flat},
 {w:"Infinity Blade",l:"espada",c:"brumas",pop:3,g:["Elder's Facebreaker","Helmet of Valor","Mistwalker Jacket","Boots of Valor","Undead Cape"],f:"Eel Stew, Puremist Snapper",p:P.up_sw},
 {w:"Arcane Staff",l:"arcano",c:"brumas",pop:2,mc:"A",g:["Elder's Muisak","Cowl of Purity","Mercenary Jacket","Cleric Sandals","Thetford Cape"],f:"Eel Stew",p:P.flat},
 {w:"Mace",l:"maca",c:"brumas",pop:2,g:["Elder's Mistcaller","Cultist Cowl","Stalker Jacket","Hunter Shoes","Demon Cape"],f:"Stew; poção de veneno",p:P.flat},
 {w:"Pike",l:"lanca",c:"brumas",pop:2,g:["Stalker Hood","Cleric Robe","Knight Boots","Thetford Cape"],f:"Eel Stew",p:P.flat},
 {w:"Lightcaller",l:"metamorfo",c:"brumas",pop:0,mc:"S",g:["Fiend ou Mage Cowl","Robe of Purity ou Cultist Robe","Scholar Sandals","Caerleon ou Lymhurst Cape"],f:"Eel Stew",p:P.dn_ss,src:"pesquisa"},

 {w:"Arcane Staff",l:"arcano",c:"corrompidas",pop:84,mc:"A",g:["Elder's Mistcaller","Hunter Hood","Mercenary Jacket","Soldier Boots","Thetford Cape"],f:"Omelette; cura e Gigantify",p:P.flat},
 {w:"Bow of Badon",l:"arco",c:"corrompidas",pop:39,g:["Soldier Helmet","Hunter Hood","Assassin Jacket","Mistwalker Jacket","Soldier Boots","Thetford Cape"],f:"Omelette, Eel Stew",p:P.flat},
 {w:"Spear",l:"lanca",c:"corrompidas",pop:31,mc:"A",g:["Elder's Taproot","Cultist Cowl","Fiend Cowl","Jacket of Tenacity","Stalker Jacket","Soldier Boots","Thetford Cape"],f:"Puremist Snapper, Eel Stew",p:P.flat},
 {w:"Battleaxe",l:"machado",c:"corrompidas",pop:27,g:["Elder's Muisak","Hunter Hood","Fiend Cowl","Mercenary Jacket","Mistwalker Jacket","Soldier Boots","Thetford Cape"],f:"Puremist Snapper, Eel Stew",p:P.flat},
 {w:"Fire Staff",l:"fogo",c:"corrompidas",pop:25,g:["Elder's Mistcaller","Soldier Helmet","Hunter Hood","Cultist Robe","Soldier Boots","Martlock Cape"],f:"Omelette",p:P.flat},
 {w:"Trinity Spear",l:"lanca",c:"corrompidas",pop:11,g:["Hunter Hood","Cleric Robe","Mistwalker Jacket","Soldier Boots","Thetford Cape"],f:"Puremist Snapper",p:P.flat},
 {w:"Bow",l:"arco",c:"corrompidas",pop:11,g:["Hunter Hood","Fiend Cowl","Mercenary Jacket","Soldier Boots","Thetford Cape"],f:"Puremist Snapper, Eel Stew",p:P.flat},
 {w:"Cursed Skull",l:"maldito",c:"corrompidas",pop:10,g:["Hunter Hood","Mercenary Jacket","Soldier Boots","Martlock Cape"],f:"Puremist Snapper",p:P.flat},
 {w:"Deathgivers",l:"adaga",c:"corrompidas",pop:10,g:["Fiend Cowl","Stalker Hood","Mercenary Jacket","Mistwalker Jacket","Cleric Sandals","Thetford Cape"],f:"Eel Stew, Puremist Snapper",p:P.up_dg},
 {w:"Dual Swords",l:"espada",c:"corrompidas",pop:10,g:["Hunter Hood","Fiend Cowl","Mercenary Jacket","Soldier Boots","Thetford Cape"],f:"Eel Stew, Puremist Snapper",p:P.up_sw},
 {w:"Fists of Avalon",l:"luvas",c:"corrompidas",pop:8,mc:"S",g:["Cultist Cowl","Fiend Cowl","Mistwalker Jacket","Cleric Sandals","Thetford Cape"],f:"Eel Stew",p:P.flat},
 {w:"Skystrider Bow",l:"arco",c:"corrompidas",pop:8,mc:"A",g:["Cowl of Purity","Mage Cowl","Mistwalker Jacket","Assassin Jacket","Royal Boots","Soldier Boots","Smuggler Cape"],f:"Eel Stew, Omelette",p:P.flat},
 {w:"Broadsword",l:"espada",c:"corrompidas",pop:7,g:["Elder's Facebreaker","Hunter Hood","Mercenary Jacket","Scholar Sandals","Martlock Cape"],f:"Pork",p:P.up_sw},
 {w:"Primal Staff",l:"metamorfo",c:"corrompidas",pop:4,g:["Soldier Helmet","Hunter Hood","Cultist Robe","Soldier Boots","Martlock Cape"],f:"Eel Stew",p:P.dn_ss},
 {w:"Lifetouch Staff",l:"sagrado",c:"corrompidas",pop:4,g:["Elder's Mistcaller","Guardian Helmet","Hunter Hood","Cleric Robe","Mage Robe","Sandals of Purity","Smuggler Cape"],f:"Omelette",p:P.dn_ho},
 {w:"Great Frost Staff",l:"gelo",c:"corrompidas",pop:4,g:["Hunter Hood","Soldier Helmet","Cultist Robe","Soldier Boots","Martlock Cape"],f:"Omelette",p:P.flat},
 {w:"Claymore",l:"espada",c:"corrompidas",pop:4,mc:"A",g:["Fiend Cowl","Cultist Cowl","Cleric Robe","Soldier Armor","Soldier Boots","Thetford Cape"],f:"Eel Stew",p:P.up_sw},
 {w:"Chillhowl",l:"gelo",c:"corrompidas",pop:3,mc:"A",g:["Elder's Mistcaller","Soldier Helmet","Hunter Hood","Cultist Robe","Soldier Boots","Lymhurst Cape"],f:"Omelette",p:P.flat},
 {w:"Quarterstaff",l:"bordao",c:"corrompidas",pop:3,mc:"A",g:["Hunter Hood","Specter Hood","Mercenary Jacket","Knight Boots","Martlock Cape"],f:"Puremist Snapper",p:P.dn_qs},
 {w:"Light Crossbow",l:"besta",c:"corrompidas",pop:3,g:["Elder's Facebreaker","Helmet of Valor","Mercenary Jacket","Soldier Boots","Martlock Cape"],f:"Pork, Stew",p:P.dn_xb},
 {w:"Daybreaker",l:"lanca",c:"corrompidas",pop:3,g:["Elder's Taproot","Fiend Cowl","Hunter Hood","Mistwalker Jacket","Soldier Boots","Thetford Cape"],f:"Puremist Snapper",p:P.flat},
 {w:"Forgebark Staff",l:"natureza",c:"corrompidas",pop:3,mc:"A",g:["Elder's Facebreaker","Cowl of Purity","Guardian Helmet","Assassin Jacket","Stalker Shoes","Thetford Cape"],f:"Omelette",p:P.flat},
 {w:"Holy Staff",l:"sagrado",c:"corrompidas",pop:2,mc:"A",g:["Elder's Celestial Censer","Mage Cowl","Mage Robe","Cleric Sandals","Martlock Cape"],f:"Omelette",p:P.dn_ho},
 {w:"Tombhammer",l:"martelo",c:"corrompidas",pop:2,g:["Cultist Cowl","Soldier Armor","Scholar Sandals","Caerleon Cape"],f:"Beef Stew; veneno",p:P.flat},
 {w:"Great Hammer",l:"martelo",c:"corrompidas",pop:1,g:["Cultist Cowl","Soldier Armor","Stalker Jacket","Cleric Sandals","Thetford Cape"],f:"Eel Stew",p:P.flat},
 {w:"Twin Slayers",l:"adaga",c:"corrompidas",pop:2,g:["Duskweaver Helmet","Assassin Hood","Feyscale Robe","Mage Robe","Cultist Sandals","Avalonian Cape"],f:"Stew; veneno e Gigantify",p:P.up_ts},
 {w:"Arclight Blasters",l:"besta",c:"corrompidas",pop:0,mc:"S",g:["Helmet of Valor ou Fiend Cowl","Mistwalker Jacket ou Cultist Robe","Scholar Sandals","Caerleon ou Brecilien Cape"],f:"Puremist Snapper ou Eel Stew",p:P.dn_xb,src:"pesquisa"},
 {w:"Lightcaller",l:"metamorfo",c:"corrompidas",pop:0,mc:"S",g:["Fiend ou Mage Cowl","Robe of Purity ou Cultist Robe","Scholar Sandals","Caerleon ou Lymhurst Cape"],f:"Eel Stew",p:P.dn_ss,src:"pesquisa"},
 {w:"Flamewalker Staff",l:"fogo",c:"corrompidas",pop:0,mc:"A",g:["Fiend ou Mage Cowl","Robe of Purity ou Cultist Robe","Scholar Sandals","Caerleon Cape"],f:"Eel Stew",p:P.dn_fw,src:"pesquisa"},
 {w:"Shadowcaller",l:"maldito",c:"corrompidas",pop:0,mc:"A",g:[],f:"",p:P.flat,src:"MetaCorrupted"},
 {w:"Bloodmoon Staff",l:"metamorfo",c:"corrompidas",pop:0,mc:"A",g:[],f:"",p:P.dn_ss,src:"MetaCorrupted"},

 {w:"Battleaxe",l:"machado",c:"barato",pop:0,g:["Hunter Hood","Mercenary Jacket","Scholar Sandals","Thetford Cape"],f:"Roast Pork 7.1 ou Beef Stew 8.0; cura T6",p:P.flat,src:"pesquisa"},
 {w:"Dual Swords",l:"espada",c:"barato",pop:0,g:["Hunter Hood","Mercenary Jacket","Soldier Boots","Avalonian Cape"],f:"Beef Stew 8.0; cura ou Gigantify",p:P.up_sw,src:"pesquisa"},
 {w:"1H Spear",l:"lanca",c:"barato",pop:0,g:["Mage Cowl","Assassin Jacket","Scholar Sandals","Thetford Cape"],f:"Red Eel Stew 8.0 ou Omelette 7.1; cura T6",p:P.flat,src:"pesquisa"},
 {w:"Quarterstaff",l:"bordao",c:"barato",pop:0,g:["Soldier Helmet","Assassin Jacket","Hunter Shoes","Thetford Cape"],f:"Beef Stew 8.1; cura ou veneno",p:P.dn_qs,src:"pesquisa"},
 {w:"Bloodletter",l:"adaga",c:"barato",pop:0,g:["Fiend Cowl","Stalker Jacket","Scholar Sandals","Undead Cape"],f:"Beef Stew 8.0; invisibilidade ou Gigantify",p:P.up_dg,src:"pesquisa"},

 {w:"Druidic Staff",l:"natureza",c:"pve",pop:0,g:["Mercenary Jacket"],f:"Portal S.A.F.E., acampamentos e solar masmorra de grupo",p:P.flat,src:"pesquisa"},
 {w:"Blight Staff",l:"natureza",c:"pve",pop:0,g:[],f:"Portal S.A.F.E. e acampamentos dinâmicos",p:P.flat,src:"pesquisa"},
 {w:"Great Axe",l:"machado",c:"pve",pop:0,g:[],f:"Portal S.A.F.E. com set barato",p:P.flat,src:"pesquisa"},
 {w:"Shadowcaller",l:"maldito",c:"pve",pop:0,g:[],f:"Acampamentos T7 e T8",p:P.flat,src:"pesquisa"},
 {w:"Bloodmoon Staff",l:"metamorfo",c:"pve",pop:0,g:[],f:"Solar masmorra de grupo e estática",p:P.dn_ss,src:"pesquisa"},
 {w:"1H Dagger",l:"adaga",c:"pve",pop:0,g:["Hunter Jacket"],f:"Rastreio solo: mata a presa rápido",p:P.up_dg,src:"pesquisa"},
 {w:"Forge Hammers",l:"martelo",c:"pve",pop:0,g:[],f:"Rastreio solo: segura quem tenta roubar a caçada",p:P.flat,src:"pesquisa"}
];
const armorType = name => /Helmet|Armor\b|Boots/.test(name) ? "placa" : /Hood|Jacket|Shoes/.test(name) ? "couro" : /Cowl|Robe|Sandals/.test(name) ? "pano" : null;

/* ================= profile ================= */
const EMPTY = () => ({v:3, nome:"", armas:{}, armaduras:{placa:0,couro:0,pano:0}, coleta:{}, refino:{}, craft:{}, cozinha:{m:0,s:{}}, alquimia:{m:0,s:{}}, sp:{}});
/* v3: a ficha guarda o Destiny Board inteiro. sp["c:espada"] = combate (maestria fica em armas.espada), sp["f:espada"] = craft da arma,
   sp["c:HEAD_PLATE"] = combate da armadura, craft das armaduras continua em craft.HEAD_PLATE, sp["z:plantas"] = fazenda.
   Cada grupo: {m: maestria, s: {item: nível}}. Coleta e refino ganham os tiers T2 a T8. */
const ARMAT = {PLATE:"placa",LEATHER:"couro",CLOTH:"pano"};
function toV3(p){ p.sp=p.sp||{}; if(p.v>=3) return p; p.v=3;
  for(const slot of ["HEAD","ARMOR","SHOES"]) for(const mat in ARMAT){ const v=(p.armaduras||{})[ARMAT[mat]]||0; if(v&&!p.sp[`c:${slot}_${mat}`]) p.sp[`c:${slot}_${mat}`]={m:Math.min(100,v),s:{}}; }
  for(const k in (p.coleta||{})){ const g=p.coleta[k]; if(g&&!g.s&&g.tier>0){ g.s={}; g.s[g.tier]=Math.max(1,g.n||0); } }
  return p; }
/* nível em número (0 a 100, armas até 120) → faixa usada nas recomendações: 0 nada, 1 pouca, 2 média, 3 alta */
const band = n => !(n>0) ? 0 : n<40 ? 1 : n<80 ? 2 : 3;
const OLD2N = [0,30,70,100];
function migrate(p){
  if(p.v>=2) return toV3(p); const q=EMPTY(); q.v=2; q.nome=p.nome||"";
  for(const k in (p.armas||{})) q.armas[k]=OLD2N[p.armas[k]]||0;
  for(const k in (p.armaduras||{})) q.armaduras[k]=OLD2N[p.armaduras[k]]||0;
  for(const k in (p.coleta||{})){ const g=p.coleta[k]||{}; q.coleta[k]={tier:g.tier||0,n:OLD2N[g.lv]||0}; }
  const ms=[[0,0],[50,10],[100,40],[100,100]];
  for(const k in (p.refino||{})){ const r=p.refino[k]||{}; const [m,sv]=ms[r.lv||0]; q.refino[k]={m,s:{4:sv,5:sv,6:sv,7:sv,8:sv},obs:r.obs||0}; }
  for(const k in (p.craft||{})){ const r=p.craft[k]||{}; const [m,sv]=ms[r.lv||0]; q.craft[k]={m,s:{1:sv,2:sv,3:sv},obs:r.obs||0}; }
  for(const k of ["cozinha","alquimia"]){ const lv=(p[k]||{}).lv||0; const [m,sv]=ms[lv]; q[k]={m,s:{},all:sv}; }
  return toV3(q);
}
const OLERAN = () => { const p=EMPTY(); p.nome="Oleran";
  for(const [k] of LINES) p.armas[k]=30; Object.assign(p.armas,{martelo:100,maca:100,besta:100,lanca:100,arcano:100,espada:0,adaga:0,sagrado:0,natureza:0});
  p.armaduras={placa:70,couro:70,pano:70};
  p.coleta={minerio:{s:{2:100,3:100,4:100,5:100,6:100,7:100,8:100}},pesca:{s:{2:100,3:100,4:100,5:100,6:100,7:100,8:100}}};
  p.craft={HEAD_PLATE:{m:50,s:{1:10,2:10,3:10}}}; p.cozinha={m:100,s:{},all:40}; p.alquimia={m:100,s:{},all:40}; return toV3(p); };
let PF = null, IS_EXAMPLE = false;
function deriveLv(){ // mantém .lv (0 a 3) para as recomendações
  for(const k in PF.coleta){ const g=PF.coleta[k]; if(g.s){ let top=0; for(let t=2;t<=8;t++) if((g.s[t]||0)>0) top=t; g.tier=top&&g.s[top]>=100&&top<8?top+1:top; g.n=top?g.s[top]:0; if(k==="pesca"){ const esp=g.s[8]||0, pes=g.m||0; g.tier=esp>=100?8:esp>0?7:pes>0?3:0; g.n=esp||pes; } } g.lv=band(g.n); }
  PF.sp=PF.sp||{}; for(const mat in ARMAT){ let v=0; for(const slot of ["HEAD","ARMOR","SHOES"]){ const g=PF.sp[`c:${slot}_${mat}`]; if(g) v=Math.max(v,g.m||0,...Object.values(g.s||{})); } PF.armaduras[ARMAT[mat]]=v; }
  for(const k in PF.refino){ const r=PF.refino[k]; r.lv=r.obs>0?2:band(Math.max(r.m||0,...Object.values(r.s||{}))); }
  for(const k in PF.craft){ const r=PF.craft[k]; r.lv=r.obs>0?2:band(Math.max(r.m||0,...Object.values(r.s||{}))); }
  for(const k of ["cozinha","alquimia"]){ const r=PF[k]||(PF[k]={m:0,s:{}}); r.lv=band(Math.max(r.m||0,r.all||0,...Object.values(r.s||{}))); }
}
function loadProfile(){ try{ const s=store.get("ficha"); if(s){ PF=migrate(Object.assign({},JSON.parse(s))); PF=Object.assign(EMPTY(),PF); PF.v=3; IS_EXAMPLE=false; deriveLv(); return; } }catch(e){} if(/[?&]overlay=1\b/.test(location.search)){ PF=EMPTY(); IS_EXAMPLE=false; deriveLv(); return; }   /* no overlay a ficha começa vazia (o exemplo Oleran é só do site) */
  PF=OLERAN(); IS_EXAMPLE=true; deriveLv(); }
function toast(msg){ const t=$("toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast._h);
  if(window.gsap&&!RM) gsap.fromTo(t,{y:16,opacity:0},{y:0,opacity:1,duration:.3,ease:"back.out(2)"}); toast._h=setTimeout(()=>{ if(window.gsap&&!RM) gsap.to(t,{opacity:0,y:10,duration:.25,onComplete:()=>t.hidden=true}); else t.hidden=true; },1800); }
/* lembrete no topo de Craft, Refino e Plano do dia: as contas de foco usam as specs da ficha, então ela precisa estar em dia */
function fichaLembrete(panelId){
  const pan=$(panelId); if(!pan) return; let b=pan.querySelector(":scope>.ficha-lemb");
  let dis=false; try{ dis=sessionStorage.getItem("fichaLemb")==="1"; }catch(e){}
  const dias=PF&&PF.atualizado?Math.floor((Date.now()-PF.atualizado)/864e5):null;
  const txt=IS_EXAMPLE?"Os números estão usando a ficha de exemplo. Preencha ou sincronize a sua em Minha ficha para o custo de foco e as sugestões usarem as suas specs."
    :dias==null?"As contas de foco e as sugestões usam as specs da sua ficha. Sincronize em Minha ficha de vez em quando para os números ficarem certos."
    :dias>=7?`Sua ficha foi atualizada há ${dias} dias. Se você subiu specs desde então, sincronize em Minha ficha para os números ficarem certos.`:null;
  if(!txt||dis){ if(b) b.remove(); return; }
  if(!b){ b=el("div",{class:"ficha-lemb",role:"note"}); const aside=pan.querySelector(":scope>.aside"); if(aside) aside.after(b); else pan.prepend(b); }
  b.textContent=""; const go=el("button",{type:"button",class:"linkbtn",text:"Abrir Minha ficha"}), ok=el("button",{type:"button",class:"linkbtn",text:"Entendi"});
  go.addEventListener("click",()=>showTab("t-ficha")); ok.addEventListener("click",()=>{ try{ sessionStorage.setItem("fichaLemb","1"); }catch(e){} b.remove(); });
  b.append(el("span",{text:txt}),go,ok);
}
function saveProfile(quieto){ IS_EXAMPLE=false; deriveLv(); PF.atualizado=Date.now(); store.set("ficha",JSON.stringify(PF)); if(typeof ponteEmpurrar==="function") ponteEmpurrar(); if(!quieto){ $("pfStatus").textContent="Ficha salva neste navegador."; toast("Ficha guardada no livro"); coinBurst(); } renderWho(); recompute(); }   /* quieto: ficha que chegou do programa/jogo, não uma edição da pessoa (sem aviso nem moedinhas) */
const spMax = g => g ? Math.max(g.m||0,...Object.values(g.s||{}).map(x=>+x||0)) : 0;
const wl = k => band(Math.max(PF.armas[k]||0, spMax((PF.sp||{})["c:"+k])));
const armorLv = t => band(PF.armaduras[t]||0);
/* eficiência de foco pela regra do jogo: 250 por nível da própria spec, 15 por nível das specs irmãs, 30 por nível de maestria.
   10.000 de eficiência cortam o foco pela metade. Se a pessoa digitou o custo de foco que o jogo mostra, ele manda. */
function fceRule(m,specs,own){ const all=Object.values(specs||{}).reduce((a,b)=>a+(+b||0),0), o=+((specs||{})[own])||0; return 250*o+15*(all-o)+30*(+m||0); }
const fceObs = (obs,base) => obs>0&&obs<base ? 10000*Math.log2(base/obs) : null;
const refFCEt = (res,t) => { const r=PF.refino[res]||{}; return fceObs(r.obs,FOCUS_REF[2][0]) ?? fceRule(r.m,r.s,t); };
const refFCE = res => refFCEt(res,6);
const craftFCE = (slot,mat,set=1) => { const r=PF.craft[slot+"_"+mat]||{}; return fceObs(r.obs,FOCUS_CRAFT[2][0]*(slot==="ARMOR"?2:1)) ?? fceRule(r.m,r.s,set); };
const refFocus = (res,t,e) => Math.max(1,Math.round(FOCUS_REF[t-4][e]*Math.pow(0.5,refFCEt(res,t)/10000)));
const craftFocus = (slot,mat,t,e,set=1) => Math.max(1,Math.round(FOCUS_CRAFT[t-4][e]*(slot==="ARMOR"?2:1)*Math.pow(0.5,craftFCE(slot,mat,set)/10000)));

/* ================= prices ================= */
const idOf = (t,base,e)=>`T${t}_${base}`+(e?`_LEVEL${e}`:"");
const gearId = (t,slot,mat,set,e)=>`T${t}_${slot}_${mat}_SET${set}`+(e?`@${e}`:"");
function median(a){ const s=[...a].sort((x,y)=>x-y); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; }
function typical(id, field, src=DATA.itens){ const r=src[id]; if(!r) return null; const pts=Object.entries(r).filter(([c,v])=>v[field]>0).map(([c,v])=>({c,p:v[field],t:v[field+2]||0})); if(!pts.length) return null; return {p:median(pts.map(x=>x.p)), n:pts.length, t:Math.max(...pts.map(x=>x.t))||snapTime()}; }
/* idade dos preços e ícones dos itens */
const snapTime = () => DATA.geradoEm && !LIVE ? Date.parse(DATA.geradoEm) : 0;
function fmtAge(t){ if(!t) return ""; const h=(Date.now()-t)/3600e3; return h<1 ? `${Math.max(1,Math.round(h*60))} min` : h<48 ? `${Math.round(h)}h` : `${Math.round(h/24)} dias`; }
const ageSpan = t => t ? el("span",{class:"age"+((Date.now()-t)>12*3600e3?" old":""),text:fmtAge(t)}) : null;
/* Ícones do jogo: vêm do Albion Market (pelo código do item). Tenta outros tiers se faltar. */
/* Tier liberado pela maestria da linha (armas e armaduras de combate): T4 no nível 1, T5 no 10, T6 no 30, T7 no 60, T8 no 100. */
const tierFromMastery = m => m>=100?8 : m>=60?7 : m>=30?6 : m>=10?5 : m>=1?4 : 3;
/* tier do ícone de cozinha, alquimia e fazenda: quem libera os tiers é a maestria (Alquimista, Mestre-cuca, Herborista, Fazendeiro, Criador de Animais), no mínimo T4 */
/* t2: o nó que libera o T2 (Sous Chef para cozinha e alquimia, Ceifeiro para a fazenda), 0 ou 1; vem do programa e não existe se ainda não sincronizou.
   Maestria 0: sem o nó só dá para fazer T1, com ele T2; sem a informação do nó, só até o T2. Com maestria, o tier da maestria. */
const iconTier = (m,t2) => m>=1 ? Math.max(4,tierFromMastery(m)) : t2===0 ? 1 : 2;
const tierOrder = t => { const o=[t]; for(let i=t-1;i>=1;i--) o.push(i); for(let i=t+1;i<=8;i++) o.push(i); return o; };
/* o servidor de ícones devolve uma imagem em branco (sem erro) para um tier que o item não tem, então a ordem importa:
   primeiro os tiers que temos salvos no site, e para os poucos itens sem cópia local, o tier em que ele existe */
const ICON_TIER_HINT = {MOUNT_MULE:[2,3], FARM_CARROT_SEED:[1], FARM_BEAN_SEED:[2], FARM_AGARIC_SEED:[2]};
/* sementes sem imagem própria: usa a do produto (cenoura, feijão, cogumelo), que temos salva, no tier em que ele existe */
/* tier mínimo de um item = o menor tier que temos salvo (as sementes sem imagem própria usam o do produto). Serve para mostrar em cinza o que a maestria ainda não libera. */
/* ícone/tier fixo de uma especialização (nenhum no momento; a galinha usa o pintinho T3, que é o que existe) */
const ICON_SPEC_TIER = {};
// tier mínimo para FAZER o item (nos detalhes do spec) quando difere do ícone: Montarias raras começa no Gamo T4, mas o ícone da árvore é o lobo (T6+)
const SPEC_MIN_TIER = {FARM_DIREWOLF_BABY:4};
const minTierOf = code => { if(ICON_SPEC_TIER[code]) return ICON_SPEC_TIER[code]; const a=ICON_ALT[code]; if(a) return a[1]; if(typeof ICONS_LOCAL==="undefined") return 0; for(let x=1;x<=8;x++) if(ICONS_LOCAL.has(`T${x}_${code}`)) return x; return 0; };
const ICON_ALT = {FARM_CARROT_SEED:["CARROT",1], FARM_BEAN_SEED:["BEAN",2], FARM_AGARIC_SEED:["AGARIC",2]};
function itemImg(code,tiers,gate){ let t=null, i=0; if(ICON_ALT[code]){ const [alt,tr]=ICON_ALT[code]; if(typeof ICONS_LOCAL!=="undefined"&&ICONS_LOCAL.has(`T${tr}_${alt}`)&&![1,2,3,4,5,6,7,8].some(x=>ICONS_LOCAL.has(`T${x}_${code}`))){ code=alt; tiers=[tr]; } }
  let lock=false;
  const ordem=l=>{ const sp=ICON_SPEC_TIER[code]; if(sp){ lock=!!(gate&&l[0]<sp); return [sp,...l.filter(x=>x!==sp)]; } const mn=gate?(SPEC_MIN_TIER[code]||minTierOf(code)):0; lock=!!(mn&&l[0]<mn); if(lock){ const sh=minTierOf(code)||mn; return [sh,...l.filter(x=>x!==sh)]; } const has=x=>typeof ICONS_LOCAL!=="undefined"&&ICONS_LOCAL.has(`T${x}_${code}`), loc=has(l[0])?[]:l.filter(has); const first=loc.length?loc:(ICON_TIER_HINT[code]||[]); return first.length?[...first,...l.filter(x=>!first.includes(x))]:l; };
  t=ordem(tiers||[4,5,6,3,7,8,2,1]);
  const im=el("img",{class:"nico",alt:"",width:"28",height:"28",loading:"lazy",decoding:"async"}); im.referrerPolicy="no-referrer"; const marca=()=>{ im.classList.toggle("nico-lock",lock); if(lock) im.title=`Só existe a partir do T${SPEC_MIN_TIER[code]||minTierOf(code)}: ainda não dá para fazer com a maestria atual.`; else im.removeAttribute("title"); }; marca();
  const set=()=>{ const id=`T${t[i]}_${code}`; iconSrc(im,id,fail); };
  const fail=()=>{ if(++i<t.length) set(); else { im.onerror=null; im.classList.add("nico-off"); } };
  im._tier=n=>{ t=ordem(tierOrder(n)); marca(); i=0; im.classList.remove("nico-off"); set(); }; set(); return im; }
/* item que representa a linha de maestria: o básico (SET1) quando existe, senão o primeiro da lista */
const REP_FIXO = {"z:animais":"FARM_HORSE_BABY","z:ervas":"FARM_AGARIC_SEED"};   // ícone da maestria do grupo quando o primeiro da lista não representa bem (criação de animais: o potro)
const repKey = g => REP_FIXO[g.k]||(g.it.find(x=>/_SET1$/.test(x[0]))||g.it[0])[0];
/* armaduras do craft: 1, 2, 3 são os sets básicos (…_SET1); as de facção/artefato têm o código sem SET (HEAD_PLATE_UNDEAD) */
const specCode = (g,key) => g.k.startsWith("a:") ? (/^\d+$/.test(key)?`${g.k.slice(2)}_SET${key}`:`${g.k.slice(2)}_${key}`) : key;
/* Qualidade do item: 1 a 5, como o jogo mostra. A moldura do ícone muda com ela. */
const QNAME = ["","Normal","Bom","Excepcional","Excelente","Obra-prima"];
/* preços das qualidades 2 a 5, no mesmo formato de DATA.itens (a qualidade 1 fica em DATA.itens): PQ[2][id][cidade] */
const PQ = {2:{},3:{},4:{},5:{}};
/* Ícones: primeiro a cópia local (icons/ID.webp na qualidade 1, icons/q2/ a icons/q5/ nas outras; a lista de ids está em js/icons.js);
   o que faltar vem direto do render oficial do Albion, na mesma qualidade, e por último do Albion Market (só qualidade 1). */
const ICON_LOCAL = (id,q=1) => (typeof ICONS_LOCAL!=="undefined" && ICONS_LOCAL.has(id)) ? (q>1 ? `icons/q${q}/${id}.webp` : `icons/${id}.webp`) : "";
const ICON_RENDER = (id,q=1) => `https://render.albiononline.com/v1/item/${id}.png?quality=${q}&size=128`;
const ICON_REMOTE = id => `https://albionmarket.gg/icon/${encodeURIComponent(id)}/1/200`;
const ICON = (id,q=1) => ICON_LOCAL(id,q) || ICON_RENDER(id,q);
/* tenta cada fonte em ordem; se todas falharem, chama onFail */
function iconSrc(im,id,onFail,q=1){ im.referrerPolicy="no-referrer"; const fontes=[ICON_LOCAL(id,q),ICON_RENDER(id,q),q===1?ICON_REMOTE(id):""].filter(Boolean); let i=0;
  im.onerror=()=>{ if(++i<fontes.length) im.src=fontes[i]; else onFail(); }; im.src=fontes[0]; }
const iconImg = (id,size=36,q=1) => { const i=el("img",{alt:"",loading:"lazy",decoding:"async",width:size,height:size}); i.className="ico"; iconSrc(i,id,()=>{ i.style.visibility="hidden"; },q); return i; };
/* célula com o ícone do item (tier e encantamento já vão no código, ex.: T6_2H_BOW@2) ao lado do texto; withIconQ usa o ícone da qualidade q */
const withIconQ = (id,q,...nodes) => { const w=el("span",{class:"cell-ic"}); const im=iconImg(id,36,q); im.classList.add("t"); const t=el("span",{class:"cell-tx"}); t.append(...nodes); w.append(im,t); return w; };
const withIcon = (id,...nodes) => withIconQ(id,1,...nodes);
function bestCity(id, field, want, only){ const r=DATA.itens[id]; if(!r) return null; let b=null; for(const [c,v] of Object.entries(r)){ if(only&&c!==only) continue; const p=v[field]; if(!(p>0)) continue; if(!b||(want==="min"?p<b.p:p>b.p)) b={p,c,t:v[field+2]||snapTime()}; } return b; }
const RED_CITIES = new Set(["Caerleon"]);
const routeWarn = cs => cs.some(c=>RED_CITIES.has(c)) ? "passa por Caerleon, rota de zona vermelha" : (new Set(cs)).size>2 ? "rota com várias cidades, conte o frete e o tempo" : "";
const prevId = (res,t,e) => t===4 ? `T3_${RES[res].ref}` : idOf(t-1,RES[res].ref,e);

/* ================= models ================= */
const st={res:"metal",focus:1,daily:0,prem:1,sell:"order",bc:"brumas"};
/* FOCO por dia (igual em todas as abas): Premium gera 10.000 por dia e guarda até 30.000; sem Premium não há foco. O foco só aumenta o retorno de recursos ao refinar/craftar. */
const FOC_DIA=10000, FOC_MAX=30000, FOC_UIS=new Set();
const focBud=()=>{ let v=store.get("focBud"); if(v==null||v==="") v=store.get("wkFocBud"); return v==null||v===""?(st.prem?FOC_DIA:0):Math.max(0,Math.min(FOC_MAX,Math.round(+v)||0)); };
const focSet=v=>store.set("focBud",String(Math.max(0,Math.min(FOC_MAX,Math.round(+v||0)))));
/* painel do foco por dia (barra, número e atalhos); onChange recalcula a aba. _sync() atualiza os valores e desliga tudo sem Premium. */
function focBudUI(onChange,note){ const box=el("div",{class:"wk-foc"}); const w=el("div",{class:"wk-fbud"}), rng=el("input",{type:"range",min:"0",max:String(FOC_MAX),step:"500","aria-label":"Foco por dia"}), num=el("input",{type:"number",min:"0",max:String(FOC_MAX),step:"500","aria-label":"Foco por dia"}), pre=el("div",{class:"seg",role:"group","aria-label":"Atalhos de foco"}), hint=el("p",{class:"tiny wk-foct"});
  const f=el("div",{class:"f wk-fcol"}); f.append(el("span",{text:"Foco disponível por dia"}),w); w.append(rng,num,pre);
  [[10000,"1 dia · 10.000","Um dia de foco do Premium"],[20000,"2 dias · 20.000","Dois dias guardados"],[30000,"Cheio · 30.000","Reserva cheia (máximo)"]].forEach(([v,t,tt])=>{ const b=el("button",{type:"button",text:t,title:tt}); b.dataset.f=String(v); b.addEventListener("click",()=>{ focSet(v); box._sync(); if(onChange) onChange(); }); pre.append(b); });
  num.addEventListener("change",()=>{ focSet(num.value); box._sync(); if(onChange) onChange(); }); rng.addEventListener("input",()=>{ num.value=rng.value; }); rng.addEventListener("change",()=>{ focSet(rng.value); box._sync(); if(onChange) onChange(); });
  box.append(f,hint);
  box._sync=()=>{ const v=focBud(); rng.disabled=num.disabled=false; rng.value=num.value=String(v); pre.querySelectorAll("button").forEach(b=>{ b.disabled=false; b.setAttribute("aria-pressed",String(+b.dataset.f===v)); });
    hint.textContent=st.prem?`Premium: ${fmt(FOC_DIA)} de foco por dia, guardando até ${fmt(FOC_MAX)}. ${note||""}`:`Sem Premium você não ganha foco novo (e a taxa de venda é 8%), mas pode usar o foco que já tem guardado: informe quanto você tem. ${note||""}`; };
  FOC_UIS.add(box); box._sync(); return box; }
const rrr=(cityB,focus,daily)=>{const b=0.18+cityB+(focus?0.59:0)+daily; return b/(1+b);};
const taxOf=()=> (st.prem?0.04:0.08)+(st.sell==="order"?0.025:0);
const feeVal=()=>+$("fee").value||0;
function model(res,t,e,o={}){
  const R=RES[res];
  const raw=o.raw!=null?{p:o.raw,n:9}:typical(idOf(t,R.raw,e),0);
  const prev=o.prev!=null?{p:o.prev,n:9}:typical(prevId(res,t,e),0);
  const bar=o.bar!=null?{p:o.bar,n:9}:typical(idOf(t,R.ref,e), st.sell==="instant"?1:0);
  if(!raw||!prev||!bar) return null;
  const inputs=N[t]*raw.p+prev.p, fee=IV(t,e)*0.1125*(o.fee??feeVal())/100, tax=taxOf(), net=bar.p*(1-tax);
  const r1=rrr(0.40,true,st.daily), r0=rrr(0.40,false,st.daily);
  const p1=net-inputs*(1-r1)-fee, p0=net-inputs*(1-r0)-fee, fc=o.fc||refFocus(res,t,e);
  return {raw,prev,bar,inputs,fee,tax,net,r1,r0,p1,p0,fc,spf:(p1-p0)/fc,thin:Math.min(raw.n,prev.n,bar.n)<2};
}
function craftModel(slot,mat,set,t,e){
  const cnt=slot==="ARMOR"?16:8;
  const bar=typical(idOf(t,MATBAR[mat],e),0), item=typical(gearId(t,slot,mat,set,e), st.sell==="instant"?1:0);
  if(!bar||!item) return null;
  const inputs=cnt*bar.p, fee=cnt*IV(t,e)*0.1125*feeVal()/100, net=item.p*(1-taxOf());
  const r1=rrr(0.15,true,st.daily), r0=rrr(0.15,false,st.daily);
  const p1=net-inputs*(1-r1)-fee, p0=net-inputs*(1-r0)-fee, fc=craftFocus(slot,mat,t,e,set);
  return {bar,item,inputs,fee,net,p1,p0,fc,spf:(p1-p0)/fc,thin:Math.min(bar.n,item.n)<2,cnt};
}
function refRoute(res,t,e){ const R=RES[res]; const raw=bestCity(idOf(t,R.raw,e),0,"min"), prev=bestCity(prevId(res,t,e),0,"min"), bar=bestCity(idOf(t,R.ref,e),st.sell==="instant"?1:0,"max");
  if(!raw||!prev||!bar) return null; const m=model(res,t,e,{raw:raw.p,prev:prev.p,bar:bar.p}); return m&&Object.assign(m,{rawC:raw.c,prevC:prev.c,barC:bar.c}); }
function craftRoute(slot,mat,set,t,e){ const bar=bestCity(idOf(t,MATBAR[mat],e),0,"min"), item=bestCity(gearId(t,slot,mat,set,e),st.sell==="instant"?1:0,"max"); if(!bar||!item) return null;
  const cnt=slot==="ARMOR"?16:8, inputs=cnt*bar.p, fee=cnt*IV(t,e)*0.1125*feeVal()/100, net=item.p*(1-taxOf()), r1=rrr(0.15,true,st.daily), r0=rrr(0.15,false,st.daily);
  return {barC:bar.c,bar:bar.p,itemC:item.c,item:item.p,p1:net-inputs*(1-r1)-fee,p0:net-inputs*(1-r0)-fee}; }
const gearName=(slot,mat,set)=>`${SETN[mat][set-1]} ${SLOTN[mat][slot]}`;

/* ================= live data ================= */
const HOST="https://west.albion-online-data.com";
/* dados fixos (data/*.json), baixados uma vez e guardados pelo navegador */
const VER = document.documentElement.dataset.v || "1";
const DATA_P = {};
function need(name){ return DATA_P[name] || (DATA_P[name] = fetch(`data/${name}.json?v=${VER}`).then(r=>{ if(!r.ok) throw new Error(name); return r.json(); })); }
/* cache das respostas da API: 10 min para preços, 6 h para histórico */
/* Cache das respostas da API no IndexedDB do navegador (centenas de MB, sem o limite de ~5 MB do localStorage que apagava tudo quando enchia).
   Fica também em memória; o que vence (6 h) é descartado ao abrir. Os preços valem pelo prazo de cada consulta; a nuvem em tempo quase real cobre o resto. */
let FORCE=false;
const CACHE_MEM=new Map(), CACHE_W=new Map(); let CACHE_DB=null, CACHE_TM=0;
const CACHE_READY=Promise.race([(async()=>{
  try{ Object.keys(localStorage).filter(k=>k.startsWith("c1:")).forEach(k=>localStorage.removeItem(k)); }catch(e){}
  try{ const db=await new Promise((ok,no)=>{ const r=indexedDB.open("albion-cache",1); r.onupgradeneeded=()=>r.result.createObjectStore("c"); r.onsuccess=()=>ok(r.result); r.onerror=()=>no(r.error); });
    CACHE_DB=db; await new Promise(ok=>{ const tx=db.transaction("c","readwrite"), rq=tx.objectStore("c").openCursor(), now=Date.now();
      rq.onsuccess=()=>{ const c=rq.result; if(!c){ ok(); return; } const v=c.value; if(v&&now-v.t<6*3600e3) CACHE_MEM.set(c.key,v); else c.delete(); c.continue(); }; rq.onerror=()=>ok(); }); }catch(e){}
})(),new Promise(f=>setTimeout(f,4000))]);
function cacheGet(url,ttlMin){ const o=CACHE_MEM.get(url); if(!o||Date.now()-o.t>ttlMin*60e3) return null; return o; }
function cachePut(url,j){ const o={t:Date.now(),j}; CACHE_MEM.set(url,o); if(!CACHE_DB) return; CACHE_W.set(url,o);
  if(!CACHE_TM) CACHE_TM=setTimeout(()=>{ CACHE_TM=0; const w=[...CACHE_W]; CACHE_W.clear(); try{ const st=CACHE_DB.transaction("c","readwrite").objectStore("c"); for(const [k,v] of w) st.put(v,k); }catch(e){} },1500); }
/* limite global de pedidos simultâneos à API (como um pool de threads): o resto espera a vez */
const API_MAX=6; let apiBusy=0; const apiQ=[];
const apiSlot=()=>apiBusy<API_MAX?(apiBusy++,Promise.resolve()):new Promise(f=>apiQ.push(f));
const apiFree=()=>{ const n=apiQ.shift(); if(n) n(); else apiBusy--; };
/* a API aceita 100 pedidos por minuto: o site se limita a 70 (janela deslizante) e, se mesmo assim receber 429,
   espera até a hora que a própria API informa ("resets at ...") e tenta de novo */
/* o limite de endereço da API é 4096 caracteres: junta o máximo de itens por pedido (até 200) sem passar de 3800 */
function apiChunks(ids,extra=60){ const out=[]; let cur=[], len=extra+80; for(const id of ids){ if(cur.length&&(cur.length>=200||len+id.length+1>3800)){ out.push(cur); cur=[]; len=extra+80; } cur.push(id); len+=id.length+1; } if(cur.length) out.push(cur); return out; }
const API_CHUNK=120;   // itens por pedido (a API aceitou 160 sem problema)
/* Medido no teste de 27/10: a API recusa (429, "apiv2/1m") acima de 100 pedidos por 60 s, e a documentação fala em 300 por 5 minutos. Usamos até 85 por minuto
   e 250 por 5 minutos: rajada rápida no começo, depois ritmo contínuo. Um 429 trava todos os pedidos até o horário que a API informar. */
const API_MIN=85, API_5MIN=250;
/* A API conta por janela de relógio (reinicia em :00 do minuto e a cada 5 minutos) e por endereço de internet. Medido em 27/10: 100 por minuto e 300 por 5 minutos.
   Todas as páginas do mesmo endereço (abas do site, quadros do overlay) dividem este contador pelo localStorage; o que vem de outro navegador não dá para ver,
   por isso a margem (85 e 250) e a espera exata depois de um 429. */
let _apiMem=[], _apiBlockMem=0;
function apiRead(){ try{ const a=JSON.parse(localStorage.getItem("apiStamps")||"[]"), b=+localStorage.getItem("apiBlock")||0; const now=Date.now(); return {st:a.filter(t=>now-t<300e3),block:Math.max(b,_apiBlockMem)}; }catch(e){ const now=Date.now(); _apiMem=_apiMem.filter(t=>now-t<300e3); return {st:_apiMem,block:_apiBlockMem}; } }
function apiWrite(st){ _apiMem=st; try{ localStorage.setItem("apiStamps",JSON.stringify(st)); }catch(e){} }
function apiBlock(until){ _apiBlockMem=Math.max(_apiBlockMem,until); try{ localStorage.setItem("apiBlock",String(Math.max(+localStorage.getItem("apiBlock")||0,until))); }catch(e){} }
function apiLoad(){ const {st,block}=apiRead(), now=Date.now(); return {m1:st.filter(t=>now-t<60e3).length,m5:st.length,block:block>now?block-now:0}; }
async function apiPace(){ for(;;){ const {st,block}=apiRead(), now=Date.now(); const m1=st.filter(t=>now-t<60e3); let w=0;
    if(block>now) w=block-now;
    else if(st.length>=API_5MIN) w=300e3-(now-st[0])+50;
    else if(m1.length>=API_MIN) w=60e3-(now-m1[0])+50;
    if(w<=0){ st.push(now); apiWrite(st); return; } await new Promise(f=>setTimeout(f,Math.max(250,Math.min(w,30e3)))); } }
const apiResetMs=txt=>{ const m=/resets at (\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d)/.exec(txt||""); if(!m) return 0; const t=Date.parse(m[1]+"T"+m[2]+"Z")-Date.now(); return Math.min(310e3,Math.max(1e3,t+1500)); };
/* Barra de carregamento visual (aparece acima da lista) e pausa entre as etapas, para as consultas grandes não sobrecarregarem a API.
   anchor: o elemento antes do qual a barra aparece; total de 0 ou 1 = sem contagem (barra animada) */
const lpSleep=ms=>new Promise(f=>setTimeout(f,ms));
function lpEl(anchor){ if(!anchor) return null; let b=anchor._lp; if(b&&b.isConnected) return b;
  b=document.createElement("div"); b.className="bm-prog"; b.hidden=true; b.setAttribute("role","progressbar"); b.setAttribute("aria-valuemin","0"); b.setAttribute("aria-valuemax","100");
  b.innerHTML='<div class="bm-prog-top"><span class="bm-spin" aria-hidden="true"></span><b></b><span class="bm-prog-pct"></span></div><div class="bm-prog-track"><i></i></div>'; anchor.before(b); anchor._lp=b; return b; }
function lpShow(anchor,done,total,txt,unit="tipos"){ const b=lpEl(anchor); if(!b) return; b.hidden=false; const det=total>1, pc=det?Math.round(Math.min(1,done/total)*100):100;
  b.classList.toggle("det",det); b.querySelector("i").style.width=pc+"%"; b.querySelector("b").textContent=txt||"Consultando preços…"; b.querySelector(".bm-prog-pct").textContent=det?`${done} de ${total} ${unit} · ${pc}%`:""; b.setAttribute("aria-valuenow",String(pc)); b.setAttribute("aria-label",txt||"Consultando preços"); }
function lpHide(anchor){ if(anchor&&anchor._lp) anchor._lp.hidden=true; }
/* consulta uma lista grande de itens em lotes espaçados, com a barra de carregamento ancorada no elemento de id anchorId */
async function fetchPaced(ids,itens,locs,anchorId,txt,q){
  const a=anchorId&&document.getElementById(anchorId), lotes=[]; for(let i=0;i<ids.length;i+=200) lotes.push(ids.slice(i,i+200));
  try{ for(let i=0;i<lotes.length;i++){ if(i) await lpSpace(); if(a&&lotes.length>1) lpShow(a,i,lotes.length,txt,"lotes"); else if(a) lpShow(a,0,0,txt);
      await fetchIds(lotes[i],itens,locs,q); if(a&&lotes.length>1) lpShow(a,i+1,lotes.length,txt,"lotes"); } }
  finally{ if(a) lpHide(a); } }
/* pausa entre lotes: curta enquanto há folga na cota da API; deixa uma reserva para o que o usuário clicar no meio */
async function lpSpace(){ await lpSleep(300); for(;;){ const l=apiLoad(); if(!l.block&&l.m1<API_MIN-15&&l.m5<API_5MIN-25) return; await lpSleep(1000); } }
/* Preços coletados pelo Albion Overlay (tabela market_latest no Supabase, mesmo formato do Albion Data).
   Para cada item/cidade/qualidade vale o valor mais recente entre o Albion Data e o nosso. */
const CROWD_MEM=new Map(); let CROWD_OFF=false; const CROWD={hits:0};
/* ===== Preços em tempo real (Albion Overlay) =====
   O programa avisa no instante em que um preço chega do jogo (antes de ele ir para a nuvem, o que só acontece depois de 45 s sem página
   nova). Aqui o valor é aplicado na hora nas listas já carregadas, guardado para as próximas consultas (o mais recente vence o Albion
   Data e o Supabase) e a aba aberta é redesenhada. Só vale dentro do overlay (?overlay=1): a página-mãe repassa os avisos por postMessage
   e cada quadro também pede o que já chegou nos últimos 20 min ao abrir. */
const LIVEP={ovr:new Map(),timer:0,n:0,fonte:"jogo",mud:new Set(),outros:false};   /* mud: "qualidade|item" cujo valor mudou de verdade nas listas do Mercado; outros: mudou algo nas demais abas */
const livepIso=t=>new Date(t).toISOString().slice(0,19), livepMs=d=>d&&!String(d).startsWith("0001")?(Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(String(d))?d:d+"Z")||0):0;
function livepAplicar(j,nuvem){
  if(!j||!Array.isArray(j.itens)||!j.itens.length) return;
  const now=Date.now(); let n=0, ch=false;
  for(const [k,v] of LIVEP.ovr) if(now-v.t>20*60e3) LIVEP.ovr.delete(k);
  const toc=new Map();
  for(const e of j.itens){
    const q=+e.q, c=e.c, t=+e.t||now, s=+e.s||0, b=+e.b||0; if(!(q>=1&&q<=5)||!c||!e.i||!(s||b)) continue;
    const key=e.i+"|"+c+"|"+q, old=LIVEP.ovr.get(key); if(old&&(old.t>t||(nuvem&&old.s===s&&old.b===b))) continue;
    LIVEP.ovr.set(key,{s,b,sa:+e.sa||0,ba:+e.ba||0,t}); n++;
    const k=e.i.includes("_LEVEL")?e.i.split("@")[0]:e.i;
    /* listas já carregadas: [venda, compra, hora da venda, hora da compra] */
    const tg=q===1?DATA.itens:PQ[q]; if(tg&&tg[k]){ const a=tg[k][c]||(tg[k][c]=[0,0,0,0]), a0=a[0], a1=a[1]; if(s&&c!=="Black Market"&&(!nuvem||t>=a[2])){ a[0]=s; a[2]=t; } if(b&&(!nuvem||t>=a[3])){ a[1]=b; a[3]=t; } if(a[0]!==a0||a[1]!==a1){ LIVEP.mud.add(q+"|"+k); ch=true; } (toc.get(tg)||toc.set(tg,new Set()).get(tg)).add(k); }
    if(typeof BMD!=="undefined"&&q===1&&BMD[k]){ const a=BMD[k][c]||(BMD[k][c]=[0,0,0,0]), a0=a[0], a1=a[1]; if(s&&c!=="Black Market"&&(!nuvem||t>=a[2])){ a[0]=s; a[2]=t; } if(b&&(!nuvem||t>=a[3])){ a[1]=b; a[3]=t; } if(a[0]!==a0||a[1]!==a1){ LIVEP.outros=true; ch=true; } }
    /* Mercado Negro e aba Mercado: [venda, compra, idade da compra em horas, idade da venda em horas] */
    if(typeof BMP!=="undefined"){ const r=q===1?BMP[e.i]:((BMQ[e.i]||{})[q]); if(r){ const a=r[c]||(r[c]=[0,0,Infinity,Infinity]), a0=a[0], a1=a[1]; if(s&&c!=="Black Market"&&(!nuvem||(Date.now()-t)/36e5<=a[3])){ a[0]=s; a[3]=Math.max(0,(Date.now()-t)/36e5); } if(b&&(!nuvem||(Date.now()-t)/36e5<=a[2])){ a[1]=b; a[2]=Math.max(0,(Date.now()-t)/36e5); } if(a[0]!==a0||a[1]!==a1){ LIVEP.outros=true; ch=true; } } }
  }
  if(!n) return;
  for(const [tg,ks] of toc) try{ dropOutliers(tg,ks); }catch(e){}
  CROWD_MEM.clear(); SB_MEM.clear(); LIVEP.n+=n; LIVEP.fonte=nuvem?"nuvem":"jogo";
  if(LIVEP.ovr.size>5000){ const o=[...LIVEP.ovr].sort((x,y)=>x[1].t-y[1].t); for(let i=0;i<o.length-4000;i++) LIVEP.ovr.delete(o[i][0]); }
  if(ch) livepAgenda();   /* só redesenha se algum valor mudou de verdade */
}
function livepApiRows(out,idx,ids,locs,quals){
  if(!LIVEP.ovr.size) return; const I=new Set(ids), L=locs.length?new Set(locs):null, Q=new Set(quals.map(String));
  for(const [key,v] of LIVEP.ovr){ const p=key.split("|"), id=p[0], c=p[1], q=p[2]; if(!I.has(id)||(L&&!L.has(c))||!Q.has(q)) continue;
    let x=idx.get(key); if(!x){ x={item_id:id,city:c,quality:+q,sell_price_min:0,sell_price_min_date:"0001-01-01T00:00:00",sell_price_max:0,sell_price_max_date:"0001-01-01T00:00:00",buy_price_min:0,buy_price_min_date:"0001-01-01T00:00:00",buy_price_max:0,buy_price_max_date:"0001-01-01T00:00:00"}; out.push(x); idx.set(key,x); }
    if(v.s>0&&c!=="Black Market"&&v.t>livepMs(x.sell_price_min_date)){ x.sell_price_min=v.s; x.sell_price_min_date=livepIso(v.t); x.sell_amt=v.sa; x._src="app"; }
    if(v.b>0&&v.t>livepMs(x.buy_price_max_date)){ x.buy_price_max=v.b; x.buy_price_max_date=livepIso(v.t); x.buy_amt=v.ba; x._src="app"; } }
}
function livepSbRows(out,ids,locs,quals){
  if(!LIVEP.ovr.size) return; const I=new Set(ids), L=new Set(locs), Q=new Set(quals.map(String)), idx=new Map(out.map((x,i)=>[x.item_id+"|"+x.city+"|"+x.quality,i]));
  for(const [key,v] of LIVEP.ovr){ const p=key.split("|"), id=p[0], c=p[1], q=p[2]; if(!I.has(id)||!L.has(c)||!Q.has(q)) continue;
    let i=idx.get(key), x; if(i==null){ x={item_id:id,quality:+q,city:c,sell_min:0,sell_min_at:null,sell_amt:null,buy_max:0,buy_max_at:null,buy_amt:null,avg7:null,avg7_n:0,avg30:null,avg30_n:0}; out.push(x); idx.set(key,out.length-1); } else x=out[i]={...out[i]};
    const iso=new Date(v.t).toISOString();
    if(v.s>0&&c!=="Black Market"&&v.t>livepMs(x.sell_min_at)){ x.sell_min=v.s; x.sell_min_at=iso; x.sell_amt=v.sa; }
    if(v.b>0&&v.t>livepMs(x.buy_max_at)){ x.buy_max=v.b; x.buy_max_at=iso; x.buy_amt=v.ba; } }
}
/* redesenha só a aba aberta, no máximo a cada 2,5 s, sem mexer em quem está digitando e mantendo a rolagem */
function livepAgenda(){ if(LIVEP.timer) return; LIVEP.timer=setTimeout(()=>{ LIVEP.timer=0; livepRedesenha(); },2500); }
async function livepRedesenha(){
  const a=document.activeElement; if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)){ livepAgenda(); return; }
  const y=window.scrollY, vis=id=>{ const p=$("p-"+id); return !!p&&!p.hidden; };
  try{
    const hh=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    const w=$("when"); if(w){ const nv=LIVEP.fonte==="nuvem"; w.textContent=(nv?"preço novo, ":"preço do jogo, ")+hh; $("whenBox").classList.remove("stale","off"); $("whenBox").title=nv?"Preço novo de outro jogador chegou à nuvem às "+hh+" (Albion Overlay), conferida a cada poucos segundos":"Preço novo lido do jogo às "+hh+" (Albion Overlay), aplicado na hora"; }
    const mud=LIVEP.mud; LIVEP.mud=new Set(); LIVEP.outros=false;
    if(vis("mk")){ if(mud.size) mkAtualizaLinhas(mud); }   /* Mercado: só as linhas e os valores que mudaram, sem redesenhar nem consultar a API */
    else{
      if(["voce","craft","refino","mercado","fazenda","encantar"].some(vis)) recompute(false);
      if(vis("cozinha")) await renderCook(); if(vis("mapas")) renderMaps(); if(vis("trab")) await renderWK();
    }
    if(typeof BAG!=="undefined"&&BAG.open&&typeof bagRender==="function") bagRender();
  }catch(e){}
  requestAnimationFrame(()=>window.scrollTo(0,y)); setTimeout(()=>window.scrollTo(0,y),250);
}
/* ===== Nuvem em tempo quase real =====
   A cada ~20 s (jitter) pergunta ao Supabase só "o que mudou desde a última vez" (índices parciais em sell_min_at/buy_max_at), enquanto a aba do navegador
   está visível e uma aba de preços aberta. Sem mudanças o intervalo cresce até 60 s; com mudanças volta a 20 s. Erro: espera 60 s. */
const NUVEM={since:0,delay:20e3,timer:0,on:false,busy:false,skew:0};
function nuvemAbaAberta(){ return ["voce","craft","refino","mercado","fazenda","encantar","cozinha","mapas","trab","mk"].some(id=>{ const p=$("p-"+id); return !!p&&!p.hidden; }); }
function nuvemAgenda(ms){ clearTimeout(NUVEM.timer); NUVEM.timer=setTimeout(nuvemCiclo,ms); }
async function nuvemCiclo(){
  if(NUVEM.busy) return;
  if(document.hidden||!nuvemAbaAberta()){ nuvemAgenda(5000); return; }
  NUVEM.busy=true; let prox=NUVEM.delay;
  try{
    const cfg=await need("nuvem"); if(!(cfg.url&&cfg.key)){ NUVEM.on=false; return; }
    if(!NUVEM.since) NUVEM.since=Date.now()-NUVEM.skew-2*60e3; /* since fica no relógio do servidor */
    const x=new Date(NUVEM.since).toISOString();
    const qs=`select=item_id,quality,city,sell_min,sell_min_at,sell_amt,buy_max,buy_max_at,buy_amt&or=(sell_min_at.gt.${x},buy_max_at.gt.${x})&limit=500`;
    const ctl=new AbortController(), tm=setTimeout(()=>ctl.abort(),8000);
    let r; try{ r=await fetch(cfg.url.replace(/\/$/,"")+"/rest/v1/market_latest?"+qs,{signal:ctl.signal,cache:"no-store",headers:{apikey:cfg.key,Authorization:"Bearer "+cfg.key}}); } finally{ clearTimeout(tm); }
    if(!r.ok) throw new Error("nuvem "+r.status);
    const d=Date.parse(r.headers.get("Date")||""); if(d) NUVEM.skew=Date.now()-d;
    const rows=await r.json(); if(!Array.isArray(rows)) throw new Error("nuvem formato");
    const itens=[]; let mx=NUVEM.since;
    for(const c of rows){ const ts=Date.parse(c.sell_min_at)||0, tb=Date.parse(c.buy_max_at)||0, t=Math.max(ts,tb); if(!t) continue; if(t>mx) mx=t;
      itens.push({i:c.item_id,q:c.quality,c:c.city,s:(ts>NUVEM.since&&c.city!=="Black Market")?c.sell_min:0,sa:c.sell_amt,b:tb>NUVEM.since?c.buy_max:0,ba:c.buy_amt,t:ts>tb&&ts>0?ts:tb||ts}); }
    NUVEM.since=mx;
    if(itens.length){ livepAplicar({itens},true); NUVEM.delay=20e3; prox=rows.length>=500?1500:20e3; } else NUVEM.delay=Math.min(60e3,Math.round(NUVEM.delay*1.5));
    if(itens.length===0) prox=NUVEM.delay;
  }catch(e){ prox=60e3; }
  finally{ NUVEM.busy=false; nuvemAgenda(prox+Math.round(Math.random()*3000)); }
}
function nuvemIniciar(){ if(NUVEM.on) return; NUVEM.on=true; nuvemAgenda(8000);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden&&NUVEM.on){ NUVEM.delay=20e3; nuvemAgenda(1500); } }); }
/* ===== Varredura da API na nuvem =====
   O banco e os programas Albion Overlay consultam a API pública em blocos pequenos (T4 a T8, todos os encantamentos e qualidades) e gravam em market_latest.
   Enquanto o bloco mais antigo tiver menos de valido_min minutos (crawl_estado), os itens cobertos vêm só da nuvem e a API pública fica de reserva
   (falha da nuvem, atualização manual ou item fora da cobertura = consulta normal à API). */
const VARR={est:null,t:0,ids:null,hits:0};
const VARR_CIDADES=new Set(["Caerleon","Bridgewatch","Fort Sterling","Lymhurst","Martlock","Thetford","Brecilien","Black Market"]);
async function varrFresca(){
  const now=Date.now();
  if(!(VARR.est!==null&&now-VARR.t<(VARR.est?120e3:60e3))){
    try{ const cfg=await need("nuvem"); const r=await fetch(cfg.url.replace(/\/$/,"")+"/rest/v1/crawl_estado?select=mais_antigo_em,valido_min&id=eq.1",{headers:{apikey:cfg.key,Authorization:"Bearer "+cfg.key},cache:"no-store"});
      const d=Date.parse(r.headers.get("Date")||""); if(d) NUVEM.skew=Date.now()-d;
      const j=r.ok?await r.json():[]; VARR.est=j[0]||false; }catch(e){ VARR.est=false; }
    VARR.t=now; }
  const e=VARR.est; if(!e||!e.mais_antigo_em) return false;
  return (Date.now()-NUVEM.skew-Date.parse(e.mais_antigo_em))<=(+e.valido_min||90)*60e3;
}
async function varrIds(){
  if(VARR.ids) return VARR.ids; const cat=await need("catalog"), set=new Set();
  for(const r of cat.i){ if(!(r[3]>=4&&r[3]<=8)||!/^[A-Z0-9_]{3,56}$/.test(r[0])) continue;   /* mesma regra do banco (crawl_semear_json) */ const lv=r[2]==="resources"||r[2]==="refinedresources", ne=(r[4]||lv)?4:0;
    for(let e=0;e<=ne;e++) set.add(!e?r[0]:lv?`${r[0]}_LEVEL${e}@${e}`:`${r[0]}@${e}`); }
  return VARR.ids=set;
}
async function varrCobre(url){
  try{ const m=/stats\/prices\/([^?]+)\.json\?(.*)$/.exec(url); if(!m) return false;
    const q=new URLSearchParams(m[2]); const locs=(q.get("locations")||"").split(",").filter(Boolean); if(locs.some(c=>!VARR_CIDADES.has(c))) return false;
    if((q.get("qualities")||"1").split(",").some(x=>!(+x>=1&&+x<=5))) return false;
    if(!(await varrFresca())) return false; const set=await varrIds();
    return decodeURIComponent(m[1]).split(",").every(id=>set.has(id));
  }catch(e){ return false; }
}
async function crowdMerge(url,j,strict){
  if(CROWD_OFF||!Array.isArray(j)){ if(strict) throw new Error("nuvem indisponível"); return j; }
  try{
    const m=/stats\/prices\/([^?]+)\.json\?(.*)$/.exec(url); if(!m) return j;
    const ids=decodeURIComponent(m[1]).split(","), q=new URLSearchParams(m[2]);
    const locs=(q.get("locations")||"").split(",").filter(Boolean), quals=(q.get("qualities")||"1").split(",");
    const key=m[1]+"|"+m[2]; let rows; const hit=CROWD_MEM.get(key);
    if(hit&&Date.now()-hit.t<60e3) rows=hit.r;
    else{
      const cfg=await need("nuvem"); if(!(cfg.url&&cfg.key)){ CROWD_OFF=true; if(strict) throw new Error("nuvem indisponível"); return j; }
      const qs=`select=item_id,quality,city,sell_min,sell_min_at,sell_amt,buy_max,buy_max_at,buy_amt&item_id=in.(${ids.map(encodeURIComponent).join(",")})`+(locs.length?`&city=in.(${locs.map(c=>encodeURIComponent(c)).join(",")})`:"")+`&quality=in.(${quals.join(",")})&limit=1000`;
      const ctl=new AbortController(); const tm=setTimeout(()=>ctl.abort(),5000);
      try{ /* o Supabase devolve no máximo 1000 linhas por pedido: pagina, senão as linhas do Mercado Negro podiam ficar de fora */
        rows=[]; for(let off=0;off<8000;off+=1000){ const r=await fetch(cfg.url.replace(/\/$/,"")+"/rest/v1/market_latest?"+qs+"&order=item_id,city,quality&offset="+off,{signal:ctl.signal,headers:{apikey:cfg.key,Authorization:"Bearer "+cfg.key}}); if(!r.ok){ if(!rows.length||strict) throw new Error("nuvem "+r.status); break; } const part=await r.json(); if(!Array.isArray(part)) break; rows.push(...part); if(part.length<1000) break; } }
      finally{ clearTimeout(tm); }
      CROWD_MEM.set(key,{t:Date.now(),r:rows});
    }
    if((!rows||!rows.length)&&!LIVEP.ovr.size) return j; rows=rows||[];
    const out=j.map(x=>({...x})), idx=new Map(out.map(x=>[x.item_id+"|"+x.city+"|"+x.quality,x]));
    const iso=t=>new Date(t).toISOString().slice(0,19), ms=d=>d&&!d.startsWith("0001")?Date.parse(d+"Z"):0;
    for(const c of rows){
      const k=c.item_id+"|"+c.city+"|"+c.quality; let x=idx.get(k);
      if(!x){ x={item_id:c.item_id,city:c.city,quality:c.quality,sell_price_min:0,sell_price_min_date:"0001-01-01T00:00:00",sell_price_max:0,sell_price_max_date:"0001-01-01T00:00:00",buy_price_min:0,buy_price_min_date:"0001-01-01T00:00:00",buy_price_max:0,buy_price_max_date:"0001-01-01T00:00:00"}; out.push(x); idx.set(k,x); }
      if(c.city!=="Black Market"&&c.sell_min&&c.sell_min_at&&Date.parse(c.sell_min_at)>ms(x.sell_price_min_date)){   /* Mercado Negro só tem pedido de compra: o preço de venda da página não vale */ x.sell_price_min=c.sell_min; x.sell_price_min_date=iso(c.sell_min_at); x.sell_amt=c.sell_amt; x._src="app"; CROWD.hits++; }
      if(c.buy_max&&c.buy_max_at&&Date.parse(c.buy_max_at)>ms(x.buy_price_max_date)){ x.buy_price_max=c.buy_max; x.buy_price_max_date=iso(c.buy_max_at); x.buy_amt=c.buy_amt; x._src="app"; CROWD.hits++; }
    }
    livepApiRows(out,idx,ids,locs,quals);
    return out;
  }catch(e){ if(strict) throw e; return j; }
}
/* Preços só do Supabase (Albion Overlay), sem passar pela API pública: usado pelo Mercado Negro.
   Devolve as linhas de market_latest (menor venda, maior pedido de compra, médias de 7 e 30 dias) dos itens, cidades e qualidades pedidos. */
const SB_MEM=new Map();
async function sbRows(ids,locs,quals=[1]){
  const cfg=await need("nuvem"); if(!(cfg.url&&cfg.key)) throw new Error("Supabase não configurado");
  const base=cfg.url.replace(/\/$/,"")+"/rest/v1/market_latest?select=item_id,quality,city,sell_min,sell_min_at,sell_amt,buy_max,buy_max_at,buy_amt,avg7,avg7_n,avg30,avg30_n";
  const out=[], parts=[]; for(let i=0;i<ids.length;i+=60) parts.push(ids.slice(i,i+60));
  const hd={apikey:cfg.key,Authorization:"Bearer "+cfg.key};
  await Promise.all(parts.map(async part=>{
    const key=part.join(",")+"|"+locs.join(",")+"|"+quals.join(","); const hit=SB_MEM.get(key);
    if(hit&&Date.now()-hit.t<45e3&&!FORCE){ out.push(...hit.r); return; }
    const qs=`&item_id=in.(${part.map(encodeURIComponent).join(",")})&city=in.(${locs.map(encodeURIComponent).join(",")})&quality=in.(${quals.join(",")})&order=item_id,city,quality&limit=1000`;
    const rows=[]; for(let off=0;off<10000;off+=1000){ const r=await fetch(base+qs+"&offset="+off,{headers:hd}); if(!r.ok) throw new Error("Supabase respondeu "+r.status); const j=await r.json(); rows.push(...j); if(j.length<1000) break; }
    SB_MEM.set(key,{t:Date.now(),r:rows}); out.push(...rows);
  }));
  livepSbRows(out,ids,locs,quals);
  return out;
}
/* Leitura só da nuvem (varredura fresca): mesmo formato de fetchIds, sem passar pela API pública */
async function varrCobreIds(ids){ if(FORCE) return false; try{ if(!(await varrFresca())) return false; const set=await varrIds(); return ids.every(id=>set.has(id)); }catch(e){ return false; } }
async function fetchIdsNuvem(ids,target,locs,q){
  const rows=await sbRows(ids,locs,[q]), lim=Date.now()-MAX_AGE_H*3600e3, ms=d=>d?(Date.parse(d)||0):0, ks=new Set();
  for(const x of rows){ const bm=x.city==="Black Market", ts=bm?0:ms(x.sell_min_at), tb=ms(x.buy_max_at);
    const s=!bm&&x.sell_min>0&&ts>lim?x.sell_min:0, b=x.buy_max>0&&tb>lim?x.buy_max:0; if(!s&&!b) continue;
    const k=x.item_id.includes("_LEVEL")?x.item_id.split("@")[0]:x.item_id; (target[k]||(target[k]={}))[x.city]=[s,b,s?ts:0,b?tb:0]; ks.add(k); }
  dropOutliers(target,ks); VARR.hits+=ids.length;
}
async function apiJSON(url,ttlMin=10){
  if(!FORCE&&url.includes("/stats/prices/")&&await varrCobre(url)){ try{ const o=await crowdMerge(url,[],true); VARR.hits++; return o; }catch(e){ /* nuvem falhou: segue para a API pública */ } }
  const j=await apiJSON0(url,ttlMin);
  return url.includes("/stats/prices/")?crowdMerge(url,j):j;
}
/* registro de cada pedido à API (para o diagnóstico: abra o site com ?diag=1) */
const API_LOG=[]; function apiLog(url,status,ini,fim,pedido,txt){ API_LOG.push({t:ini||pedido,esperou:Math.max(0,(ini||pedido)-pedido),ms:fim-(ini||pedido),status,itens:((/prices\/([^?]*)\.json/.exec(url)||[])[1]||"").split(",").filter(Boolean).length,url:url.length,resp:(txt||"").slice(0,200)}); if(API_LOG.length>3000) API_LOG.splice(0,500); }
async function apiJSON0(url,ttlMin=10){
  await CACHE_READY;
  if(!FORCE){ const c=cacheGet(url,ttlMin); if(c){ apiJSON.oldest=Math.min(apiJSON.oldest||Infinity,c.t); return c.j; } }
  let r;
  for(let n=0;;n++){
    await apiSlot(); const t0=Date.now(); let t1=0; try{ await apiPace(); t1=Date.now(); r=await fetch(url); } catch(e){ apiLog(url,0,t1||t0,Date.now(),t0,"erro de rede: "+(e&&e.message)); throw e; } finally{ apiFree(); }
    apiLog(url,r.status,t1,Date.now(),t0,r.status===429?await r.clone().text().catch(()=>""):"");
    if(r.ok||n>=3||!(r.status===429||r.status>=500)) break;
    const txt=r.status===429?await r.text().catch(()=>""):""; const w=r.status===429?(apiResetMs(txt)||1500*Math.pow(2,n)):1500*Math.pow(2,n); if(r.status===429) apiBlock(Date.now()+w);
    await new Promise(f=>setTimeout(f,w));
  }
  if(!r.ok) throw new Error("API respondeu "+r.status); let j=await r.json();
  /* lista de preços: guarda só o que o site usa e só linhas com preço (a API devolve uma linha por cidade mesmo vazia); cabe muito mais no cache do navegador */
  if(url.includes("/stats/prices/")&&Array.isArray(j)) j=j.filter(x=>x.sell_price_min>0||x.buy_price_max>0).map(x=>({item_id:x.item_id,city:x.city,quality:x.quality,sell_price_min:x.sell_price_min,sell_price_min_date:x.sell_price_min_date,buy_price_max:x.buy_price_max,buy_price_max_date:x.buy_price_max_date}));
  cachePut(url,j); return j;
}
const CITIES=["Thetford","Fort Sterling","Martlock","Bridgewatch","Lymhurst"];
const MAX_AGE_H=72;
const fresh=d=>d&&!d.startsWith("0001")&&(Date.now()-Date.parse(d+"Z"))<MAX_AGE_H*3600e3;
function baseIds(){ const ids=[]; for(const r of Object.values(RES)){ ids.push(`T3_${r.ref}`); for(let t=4;t<=8;t++) for(let e=0;e<=4;e++) for(const b of [r.raw,r.ref]) ids.push(`T${t}_${b}`+(e?`_LEVEL${e}@${e}`:"")); }
  for(const b of ["WOOD","ROCK"]) for(let t=4;t<=8;t++) for(let e=0;e<=4;e++) ids.push(`T${t}_${b}`+(e?`_LEVEL${e}@${e}`:""));
  return ids.concat(FISH_IDS); }
function familyIds(slot,mat){ const ids=[]; for(let s=1;s<=3;s++) for(let t=4;t<=8;t++) for(let e=0;e<=4;e++) ids.push(gearId(t,slot,mat,s,e)); return ids; }
/* q: qualidade dos preços (1 a 5). Para q de 2 a 5, passe PQ[q] como target. */
/* preços suspeitos (anúncio de troll, placeholder tipo 799.999): fora de 1/6 a 6 vezes a mediana das cidades do mesmo item, o valor é descartado; com só duas cidades, descarta o maior se passar de 10 vezes o outro */
function dropOutliers(target,keys){
  const med=a=>{ a=a.slice().sort((x,y)=>x-y); const m=a.length>>1; return a.length%2?a[m]:(a[m-1]+a[m])/2; };
  for(const k of keys){ const r=target[k]; if(!r) continue;
    for(const f of [0,1]){ const cs=Object.keys(r).filter(c=>c!=="Black Market"&&r[c][f]>0); /* Mercado Negro: ordens do jogo, não de jogadores — sem filtro */ if(cs.length<2) continue; const vs=cs.map(c=>r[c][f]);
      if(cs.length>=3){ const m=med(vs); for(const c of cs){ const v=r[c][f]; if(v>m*6||v<m/6){ r[c][f]=0; r[c][f+2]=0; } } }
      else { const [lo,hi]=vs[0]<vs[1]?[0,1]:[1,0]; if(vs[hi]>vs[lo]*10){ r[cs[hi]][f]=0; r[cs[hi]][f+2]=0; } } } }
}
async function fetchIds(ids, target, locs=CITIES, q=1, ttl=10){
  const loc=locs.join(",").replace(/ /g,"%20");
  const parts=apiChunks(ids,loc.length+q.toString().length);
  const res=await Promise.all(parts.map(p=>apiJSON(`${HOST}/api/v2/stats/prices/${p.join(",")}.json?locations=${loc}&qualities=${q}`,ttl)));   // pedaços em paralelo
  for(const j of res){
    for(const x of j){
      const s=fresh(x.sell_price_min_date)?x.sell_price_min:0, b=fresh(x.buy_price_max_date)?x.buy_price_max:0;
      if(!s&&!b) continue; const k=x.item_id.includes("_LEVEL")?x.item_id.split("@")[0]:x.item_id; (target[k]||(target[k]={}))[x.city]=[s,b,s?Date.parse(x.sell_price_min_date+"Z"):0,b?Date.parse(x.buy_price_max_date+"Z"):0];
    }
  }
  dropOutliers(target,new Set(res.flat().map(x=>x.item_id.includes("_LEVEL")?x.item_id.split("@")[0]:x.item_id)));
}
const loadedFam=new Set();
async function ensureFamily(slot,mat){ const key=slot+"_"+mat; if(loadedFam.has(key)) return true; try{ await fetchIds(familyIds(slot,mat),DATA.itens); loadedFam.add(key); return true; }catch(e){ return false; } }
let LIVE=false;
async function loadLive(force){
  const btn=$("reload"), btnTxt=t=>{ const sp=btn.querySelector("span"); (sp||btn).textContent=t; }; btn.disabled=true; btn.classList.add("busy"); btnTxt("Atualizando…"); FORCE=!!force; apiJSON.oldest=Infinity;
  try{
    const itens={}; await fetchIds(baseIds(),itens);
    if(Object.keys(itens).length<30) throw new Error("poucos dados");
    let ouro=DATA.ouro; try{ const g=await apiJSON(`${HOST}/api/v2/stats/gold.json?count=168`,30); if(g[0]) ouro=g[0].price; drawGold(g); }catch(e){}
    const when=isFinite(apiJSON.oldest)?new Date(apiJSON.oldest):new Date(); FORCE=false;
    const hh=when.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    if(!force){ const o=DATA.itens||{}; for(const k in o) if(!(k in itens)) itens[k]=o[k]; }   /* atualização automática: mantém o que o Mercado já consultou */
    DATA={geradoEm:new Date().toISOString(),janela:`ao vivo, ${hh}`,ouro,itens}; LIVE=true; loadedFam.clear();
    COOK_LOADED=false; BM_LOADED.clear(); PLANKS_LOADED=false; WK_LOADED=false; FZ_LOADED=false; EN_LOADED.clear(); OF.loaded.clear(); if(force){ MK_SEEN.clear(); for(const q in PQ) PQ[q]={}; } if(typeof BMQ!=="undefined") for(const k in BMQ) delete BMQ[k]; applyMeta(); recompute(true); btn.classList.remove("busy"); btnTxt("Atualizar preços"); setTimeout(()=>{ try{ warmBM(!!force); }catch(e){} },400); if(!$("p-cozinha").hidden) renderCook(); if(!$("p-mapas").hidden) renderMaps(); if(!$("p-mercado").hidden) renderBM(); if(!$("p-trab").hidden) renderWK(); if(!$("p-fazenda").hidden) renderFZ(); if(!$("p-encantar").hidden) renderEN(); if(!$("p-craft").hidden) renderOf(); if(!$("p-mk").hidden) renderMk();
  }catch(e){ FORCE=false; $("when").textContent="sem conexão, usando os salvos"; $("whenBox").classList.add("off"); $("whenBox").title="Não consegui puxar os preços ao vivo agora. "+(DATA.janela?"Usando os preços salvos no site: "+DATA.janela:""); btn.classList.remove("busy"); btnTxt("Tentar de novo"); }
  btn.disabled=false;
}

function drawGold(g){
  const s=$("goldSpark"); if(!s||!g||g.length<4) return; const pts=[...g].reverse(); const v=pts.map(x=>x.price), lo=Math.min(...v), hi=Math.max(...v), W=96, H=22, P=3;
  const X=i=>P+i*(W-2*P)/(pts.length-1), Y=p=>H-P-(hi===lo?0.5:(p-lo)/(hi-lo))*(H-2*P);
  const d=v.map((p,i)=>`${i?"L":"M"}${X(i).toFixed(1)} ${Y(p).toFixed(1)}`).join(" ");
  s.innerHTML=`<path d="${d} L${X(v.length-1).toFixed(1)} ${H} L${X(0)} ${H} Z" fill="var(--saffron)" opacity=".12"/><path d="${d}" fill="none" stroke="var(--saffron)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(v.length-1)}" cy="${Y(v[v.length-1])}" r="3" fill="var(--saffron)" stroke="var(--night)" stroke-width="1.5"/>`;
  const box=$("goldBox"); box.tabIndex=0; const ch=((v[v.length-1]-v[0])/v[0]*100);
  bindTip(box,()=>[["v",`${fmt(v[v.length-1])} pratas por ouro`],["",`Últimos 7 dias: de ${fmt(lo)} a ${fmt(hi)}`],["k",`${ch>=0?"Subiu":"Caiu"} ${dec(Math.abs(ch))}% na semana`]]);
}

/* ================= tooltip ================= */
const tip=$("tip");
function showTip(lines,x,y){ tip.textContent=""; lines.forEach(([cls,txt])=>tip.append(el("div",{class:cls||"",text:txt}))); tip.hidden=false; const w=tip.offsetWidth,h=tip.offsetHeight; let L=x+14,T=y+14; if(L+w>innerWidth-8) L=x-w-14; if(T+h>innerHeight-8) T=y-h-14; tip.style.left=Math.max(8,L)+"px"; tip.style.top=Math.max(8,T)+"px"; }
function bindTip(node,get){ node.addEventListener("pointermove",ev=>{const l=get(); if(l) showTip(l,ev.clientX,ev.clientY);}); node.addEventListener("pointerleave",()=>tip.hidden=true); node.addEventListener("focus",()=>{const r=node.getBoundingClientRect(); const l=get(); if(l) showTip(l,r.right,r.top);}); node.addEventListener("blur",()=>tip.hidden=true); }

/* ================= heatmaps ================= */
function heatColor(v,scale){ const r=v/scale; if(Math.abs(r)<0.04) return ["var(--h-neutral)",false]; if(r>0) return r<0.25?["var(--h-b1)",false]:r<0.55?["var(--h-b2)",false]:r<0.85?["var(--h-b3)",true]:["var(--h-b4)",true]; return r>-0.25?["var(--h-r1)",false]:r>-0.6?["var(--h-r2)",true]:["var(--h-r3)",true]; }
function drawHeat(tbl, get, onPick, tipFor){
  tbl.textContent=""; const cells={}; let max=0;
  for(let t=4;t<=8;t++) for(let e=0;e<=4;e++){ const m=get(t,e); cells[t+"."+e]=m; if(m) max=Math.max(max,Math.abs(m.p1)); }
  const hr=tbl.createTHead().insertRow(); hr.append(el("th",{text:""})); [0,1,2,3,4].forEach(e=>hr.append(el("th",{text:`.${e}`,scope:"col"})));
  const tb=tbl.createTBody();
  for(let t=4;t<=8;t++){ const tr=tb.insertRow(); tr.append(el("th",{class:"rh",scope:"row",text:`T${t}`}));
    for(let e=0;e<=4;e++){ const m=cells[t+"."+e], td=tr.insertCell(); td.tabIndex=0;
      if(!m){ td.className="na"; td.textContent="sem preço"; bindTip(td,()=>[["",`T${t}.${e}: falta preço de algum insumo.`]]); continue; }
      const [bg,dark]=heatColor(m.p1,Math.max(max*0.6,1)); td.style.background=bg; td.style.color=dark?"#ffffff":"var(--ink)"; if(m.thin) td.classList.add("thin");
      td.append(sgn(m.p1), el("small",{text:`${dec(m.spf)} por foco`}));
      if(onPick){ td.addEventListener("click",()=>onPick(t,e)); td.addEventListener("keydown",ev=>{ if(ev.key==="Enter") onPick(t,e); }); }
      bindTip(td,()=>tipFor(t,e,m));
    } }
}
function renderHeat(){
  const R=RES[st.res];
  drawHeat($("heat"),(t,e)=>model(st.res,t,e),(t,e)=>{ $("tier").value=t; $("ench").value=e; calc(true); $("calcTitle").scrollIntoView({behavior:"smooth",block:"start"}); },
    (t,e,m)=>[["v",`${sgn(m.p1)} por ${R.u} com foco`],["",`${R.refName} T${t}.${e} em ${R.city}`],(()=>{ const r=refRoute(st.res,t,e); return r?["",`Melhor rota: compra em ${r.rawC}, vende em ${r.barC}: ${sgn(r.p1)}`]:["k","Sem rota: faltam preços"]; })(),["k",`Sem foco: ${sgn(m.p0)}`],["k",`${R.rawName}: ${fmt(m.raw.p)} (${m.raw.n} cid.) × ${N[t]}`],["k",`Barra anterior: ${fmt(m.prev.p)} (${m.prev.n} cid.)`],["k",`Venda: ${fmt(m.bar.p)} (${m.bar.n} cid.)`],["k",`Custo de foco ${m.fc}, ${dec(m.spf)} pratas por ponto`]]);
  { const h=$("contaTitle"); if(h) h.textContent=`A conta de ${R.art} ${R.u}`; const fl=$("focusLbl"); if(fl) fl.textContent=`Custo de foco por ${R.u}`; }
  $("matTitle").textContent=`${R.refName}: lucro por ${R.u}, com foco, em ${R.city}`;
  { const top=$("heatTop"); if(top){ top.textContent=""; const all=[]; for(let t=4;t<=8;t++) for(let e=0;e<=4;e++){ const m=model(st.res,t,e); if(m&&m.p1!=null) all.push({t,e,m}); } all.sort((a,b)=>b.m.p1-a.m.p1);
      top.append(el("span",{class:"ht-l",text:"Melhores combinações agora"}));
      all.slice(0,5).forEach((x,i)=>{ const b=el("button",{type:"button",class:"ht-chip "+(x.m.p1>0?"gain":x.m.p1<0?"loss":"flat"),title:"Abrir na calculadora"}); b.append(el("b",{text:`${i+1}. T${x.t}.${x.e}`}),el("span",{text:sgn(x.m.p1)}),el("small",{text:`${dec(x.m.spf!=null?x.m.spf:0)} por foco`}));
        b.addEventListener("click",()=>{ $("tier").value=x.t; $("ench").value=x.e; calc(true); $("calcTitle").scrollIntoView({behavior:RM?"auto":"smooth",block:"start"}); }); top.append(b); }); } }
}
async function renderCraft(){
  const slot=$("cSlot").value, mat=$("cMat").value, set=+$("cSet").value, key=slot+"_"+mat;
  $("cTitle").textContent=`${gearName(slot,mat,set)}: lucro por peça, com foco, em ${CRAFT_CITY[key]}`;
  const lv=(PF.craft[key]||{}).lv||0, fceNow=Math.round(craftFCE(slot,mat,set));
  $("cNote").textContent=`${CRAFT_PT[key]} tem bônus de fabricação em ${CRAFT_CITY[key]}. Usa ${slot==="ARMOR"?16:8} ${mat==="PLATE"?"barras de metal":mat==="LEATHER"?"couros":"tecidos"}. Sua ficha: eficiência de foco ${fmt(fceNow)} nesse conjunto.`;
  $("cStatus").textContent="Buscando preços das peças…";
  const ok=await ensureFamily(slot,mat);
  $("cStatus").textContent= ok ? "Preço da peça: qualidade normal, mediana das cidades reais." : "Não consegui buscar o preço das peças agora. Tente atualizar os preços.";
  drawHeat($("cHeat"),(t,e)=>craftModel(slot,mat,set,t,e),null,(t,e,m)=>[["v",`${sgn(m.p1)} por peça com foco`],["",`${gearName(slot,mat,set)} T${t}.${e}`],(()=>{ const r=craftRoute(slot,mat,set,t,e); return r?["",`Melhor rota: barras em ${r.barC}, vende em ${r.itemC}: ${sgn(r.p1)}`]:["k","Sem rota: faltam preços"]; })(),["k",`Sem foco: ${sgn(m.p0)}`],["k",`${m.cnt} × barra a ${fmt(m.bar.p)} (${m.bar.n} cid.)`],["k",`Venda da peça: ${fmt(m.item.p)} (${m.item.n} cid.)`],["k",`Custo de foco ${fmt(m.fc)}, ${dec(m.spf)} pratas por ponto`]]);
}

/* ================= refining calculator ================= */
const num=id=>{const x=+$(id).value; return x>0?x:null;};
function calc(reset){
  const R=RES[st.res], t=+$("tier").value, e=+$("ench").value;
  $("lRaw").textContent=`${R.rawName} T${t}.${e}, cada (usa ${N[t]})`;
  $("lPrev").textContent= t===4 ? `${R.prevName} T3 (usa 1)` : `${R.prevName} T${t-1}.${e} (usa 1)`;
  $("lBar").textContent=`Venda de ${R.refName.toLowerCase()} T${t}.${e}`;
  $("calcTitle").textContent=`Calculadora de ${R.refName.toLowerCase()} em ${R.city}`;
  if(reset){ const a=typical(idOf(t,R.raw,e),0), b=typical(prevId(st.res,t,e),0), c=typical(idOf(t,R.ref,e),st.sell==="instant"?1:0);
    const hint=(x,w)=>x?`${w}, ${x.n} ${x.n>1?"cidades":"cidade"}${x.t?`, visto há ${fmtAge(x.t)}`:""}`:"sem preço, digite o do jogo";
    $("pRaw").value=a?Math.round(a.p):""; $("sRaw").textContent=hint(a,"preço típico");
    $("pPrev").value=b?Math.round(b.p):""; $("sPrev").textContent=hint(b,"preço típico");
    $("pBar").value=c?Math.round(c.p):""; $("sBar").textContent=hint(c,st.sell==="instant"?"ordem de compra típica":"preço típico");
    $("focusCost").value=refFocus(st.res,t,e); $("focusHint").textContent=refFCE(st.res)>0?"da sua ficha":"sem spec; ajuste na ficha"; }
  const m=model(st.res,t,e,{raw:num("pRaw"),prev:num("pPrev"),bar:num("pBar"),fc:num("focusCost")});
  const L=$("ledger"); L.textContent=""; const v=$("verdict");
  if(!m){ v.textContent="Faltam preços para esta combinação. Abra o mercado no jogo e digite os valores acima."; return; }
  const useF=st.focus===1, rr=useF?m.r1:m.r0, p=useF?m.p1:m.p0, pool=+$("focusPool").value||0, bars=useF?Math.floor(pool/m.fc):0;
  [["Insumos",`${N[t]} × ${fmt(m.raw.p)} + ${fmt(m.prev.p)}`,-m.inputs],["Volta pelo retorno",`${dec(rr*100)}% dos insumos`,m.inputs*rr],["Taxa da estação",`valor de item ${IV(t,e)}`,-m.fee],["Venda",`${fmt(m.bar.p)} menos ${dec(m.tax*100)}% de taxas`,m.net]]
    .forEach(([a,b,c])=>{ const tr=L.insertRow(); const td=tr.insertCell(); td.append(a,el("small",{text:b})); tr.insertCell().textContent=sgn(c); });
  const tr=L.insertRow(); tr.className="total"; tr.insertCell().textContent=`Lucro por ${R.u}`; const tc=tr.insertCell(); tc.textContent=sgn(p); tc.className=p>=0?"gain":"loss";
  if(useF){ const t2=L.insertRow(); const a=t2.insertCell(); a.append(`Com ${fmt(pool)} de foco`,el("small",{text:`${fmt(bars)} ${R.up}, ${dec(m.spf)} pratas por ponto de foco`})); const b=t2.insertCell(); b.textContent=sgn(bars*p); b.className=p>=0?"gain":"loss"; }
  renderRoute(t,e,p);
  drawHistory($("histRef"),$("histRefNote"),idOf(t,R.ref,e),R.city); $("histRefTitle").textContent=`${R.refName} T${t}.${e} em ${R.city}, últimos 30 dias`;
  v.textContent = m.p0>0 ? `Dá lucro até sem foco (${sgn(m.p0)} por ${R.u}). Vale comprar ${R.rawName.toLowerCase()} por ordem de compra e refinar em volume.`
    : m.p1>0 ? `Só compensa com foco: sem ele você perde ${fmt(-m.p0)} por ${R.u}.` : `Com estes preços não compensa refinar, nem com foco. Olhe outro tier na tabela.`;
}

function renderRoute(t,e,pNow){
  const R=RES[st.res], box=$("route"); box.textContent=""; const r=refRoute(st.res,t,e);
  box.append(el("h3",{class:"orn",text:"Onde comprar e vender"}));
  if(!r){ box.append(el("p",{class:"small muted",text:"Faltam preços em alguma cidade para montar a rota."})); return; }
  const useF=st.focus===1, pr=useF?r.p1:r.p0, sellTxt=st.sell==="instant"?"ordem de compra mais alta":"anúncio mais alto";
  const ol=el("ol");
  [[`Compre ${R.rawName.toLowerCase()} T${t}.${e} em ${r.rawC}`,fmt(r.raw.p)+" cada"],[`Compre ${R.prevName.toLowerCase()} ${t===4?"T3":`T${t-1}.${e}`} em ${r.prevC}`,fmt(r.prev.p)],[`Refine em ${R.city}`,"cidade com bônus"],[`Venda em ${r.barC}`,`${fmt(r.bar.p)}, ${sellTxt}`]]
    .forEach(([a,b])=>ol.append(el("li",{},document.createTextNode(a+": "),el("span",{class:"num",text:b}))));
  box.append(ol);
  const diff=pr-pNow, warn=routeWarn([r.rawC,r.prevC,R.city,r.barC]);
  box.append(el("p",{class:"small"},document.createTextNode(`Lucro por ${R.u} nessa rota: `),el("strong",{class:pr>=0?"gain":"loss",text:sgn(pr)}),document.createTextNode(` ${useF?"com":"sem"} foco, ${diff>=0?`${fmt(diff)} a mais`:`${fmt(-diff)} a menos`} que a conta acima.${warn?" Atenção: "+warn+".":""}`)));
  const b=el("button",{type:"button",class:"linkbtn",text:"Usar os preços da rota na calculadora"}); b.addEventListener("click",()=>{ $("pRaw").value=Math.round(r.raw.p); $("pPrev").value=Math.round(r.prev.p); $("pBar").value=Math.round(r.bar.p); $("sRaw").textContent=`mais barato, em ${r.rawC}`; $("sPrev").textContent=`mais barato, em ${r.prevC}`; $("sBar").textContent=`mais alto, em ${r.barC}`; calc(false); });
  box.append(b, el("p",{class:"tiny muted",text:"O anúncio mais alto pode demorar a vender, e cada cidade a mais é frete e risco. A conta acima usa o preço típico das cidades, que é mais conservador."}));
}

/* ================= recommendations ================= */
function bestRefining(){ const out=[]; for(const res in RES) for(let t=4;t<=8;t++) for(let e=0;e<=4;e++){ const m=model(res,t,e,{fee:500}); if(m&&!m.thin&&m.p1>0) out.push({res,t,e,m,day:m.p1*Math.floor(10000/m.fc)}); } return out.sort((a,b)=>b.day-a.day); }
function bestCraft(){ const out=[]; for(const key in PF.craft){ if(!(PF.craft[key].lv>0)) continue; const [slot,mat]=key.split("_"); if(!loadedFam.has(key)) continue;
  for(let s=1;s<=3;s++) for(let t=4;t<=8;t++) for(let e=0;e<=4;e++){ const m=craftModel(slot,mat,s,t,e); if(m&&!m.thin&&m.p1>0) out.push({slot,mat,s,t,e,m,day:m.p1*Math.floor(10000/m.fc)}); } } return out.sort((a,b)=>b.day-a.day); }
function rankBuilds(c,onlyMine){
  const tierB={S:3,A:2}; return BUILDS.filter(b=>b.c===c&&(!onlyMine||wl(b.l)>=1))
    .sort((a,b)=>(wl(b.l)-wl(a.l))||((tierB[b.mc]||0)-(tierB[a.mc]||0))||(b.pop-a.pop)); }
function armorGaps(b){ const miss=new Set(); for(const g of b.g){ const t=armorType(g); if(t&&armorLv(t)<1) miss.add(t); } return [...miss]; }
const apiIcon=id=>(id||"").replace(/_LEVEL(\d)$/,"_LEVEL$1@$1");
/* icon: id do item principal (ícone grande à esquerda); extras: ids numa fileira de ícones pequenos */
function recItem(title, lines, icon, extras){ const li=el("li"); const body=icon?el("div",{class:"rec-b"}):li;
  if(icon){ li.classList.add("has-ic"); const w=el("span",{class:"rec-ic"}); w.append(iconImg(apiIcon(icon),56)); li.append(w,body); }
  body.append(el("strong",{text:title})); lines.filter(Boolean).forEach(l=>body.append(el("span",{text:l})));
  if(extras&&extras.length){ const r=el("div",{class:"rec-ics"}); extras.slice(0,7).forEach(i=>r.append(iconImg(apiIcon(i),38))); body.append(r); }
  return li; }
const gearIcon=name=>{ try{ const k=typeof gearKey==="function"&&GEAR?gearKey(name):null; return k?`T6_${k}`:null; }catch(e){ return null; } };
function renderRecs(){
  const r=bestRefining(), box=$("recRefino"); box.textContent="";
  if(!r.length) box.append(el("li",{class:"empty",text:"Com os preços de agora, nenhum refino dá lucro com segurança."}));
  r.slice(0,3).forEach(x=>{ const R=RES[x.res]; const rt=refRoute(x.res,x.t,x.e); box.append(recItem(`${R.refName} T${x.t}.${x.e} em ${R.city}`,[`${sgn(x.m.p1)} por ${R.u}, uns ${fmtS(x.day)} com 10.000 de foco`,rt?`Compre ${R.rawName.toLowerCase()} em ${rt.rawC} e venda em ${rt.barC}: ${sgn(rt.p1)} por ${R.u}${routeWarn([rt.rawC,R.city,rt.barC])?"; "+routeWarn([rt.rawC,R.city,rt.barC]):""}`:null,`Custo de foco ${x.m.fc} por ${R.u}${refFCE(x.res)>0?"":", sem spec"}. Sem foco: ${sgn(x.m.p0)}`],idOf(x.t,R.ref,x.e))); });
  const cbox=$("recCraft"); cbox.textContent="";
  const lines=Object.keys(PF.craft).filter(k=>PF.craft[k].lv>0);
  if(!lines.length){ cbox.append(el("li",{class:"empty",text:"Marque na sua ficha as peças que você fabrica para ver o melhor craft."})); }
  else{ const c=bestCraft();
    if(!c.length) cbox.append(el("li",{class:"empty",text: lines.every(k=>loadedFam.has(k)) ? "Com os preços de agora, nenhuma das suas linhas dá lucro com segurança." : "Buscando preços das peças…"}));
    c.slice(0,3).forEach(x=>{ const k=x.slot+"_"+x.mat; cbox.append(recItem(`${gearName(x.slot,x.mat,x.s)} T${x.t}.${x.e} em ${CRAFT_CITY[k]}`,[`${sgn(x.m.p1)} por peça, uns ${fmtS(x.day)} com 10.000 de foco`,`Custo de foco ${fmt(x.m.fc)} por peça. Venda típica ${fmt(x.m.item.p)}`,(()=>{ const r=craftRoute(x.slot,x.mat,x.s,x.t,x.e); return r?`Barras em ${r.barC}, venda em ${r.itemC}: ${sgn(r.p1)} por peça`:null; })()],gearId(x.t,x.slot,x.mat,x.s,x.e))); }); }
  for(const [c,id] of [["brumas","recBrumas"],["corrompidas","recCorr"]]){
    const b=rankBuilds(c,true).slice(0,3), bx=$(id); bx.textContent="";
    if(!b.length) bx.append(el("li",{class:"empty",text:"Nenhuma build da lista usa as armas da sua ficha."}));
    b.forEach(x=>{ const gaps=armorGaps(x); bx.append(recItem(`${nm(x.w)} (${LINE_NAME[x.l]}, spec ${LV_W[wl(x.l)].toLowerCase()})`,[x.g.length?x.g.map(nm).join(", "):"Equipamento: veja no MetaCorrupted",nmFood(x.f)||null,`Patch 3: ${x.p[1]}`,gaps.length?`Atenção: sem spec em ${gaps.join(" e ")} na sua ficha`:null],gearIcon(x.w),(x.g||[]).map(gearIcon).filter(Boolean))); });
  }
  const tb=$("recColeta"); tb.textContent="";
  const hr=tb.createTHead().insertRow(); ["Recurso","Seu tier",".0",".1",".2",".3",".4","Onde aparece"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(); let any=false;
  for(const [k,name,base,bio] of GATHER){ const g=PF.coleta[k]; if(!base||!g||!(g.tier>=4)) continue; any=true; const tr=body.insertRow();
    tr.insertCell().textContent=name; tr.insertCell().textContent=`T${g.tier}, nível ${g.n||0}`;
    for(let e=0;e<=4;e++){ const td=tr.insertCell(); td.className="num"; if(!base){ td.textContent="—"; continue; } const p=typical(idOf(g.tier,base,e),0); td.textContent=p?fmt(p.p):"—"; }
    tr.insertCell().textContent= base ? bio : "Peixe não está na API de preços desta página ainda"; }
  if(!any){ const tr=body.insertRow(); const td=tr.insertCell(); td.colSpan=8; td.textContent="Marque na sua ficha o tier de coleta de cada recurso."; }
  renderFish(); renderCookRecs(); renderGo();
}
function renderFish(){
  const g=PF.coleta.pesca, box=$("fishBlock"); if(!g||!(g.tier>=1)){ box.hidden=true; return; } box.hidden=false;
  const tb=$("recPesca"); tb.textContent=""; const hr=tb.createTHead().insertRow(); ["Peixe","Tier","Preço típico","Cidades"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(), rows=[];
  const add=(name,t,id)=>{ const p=typical(id,0); rows.push({name,t,p}); };
  for(const t of [g.tier,g.tier-1].filter(x=>x>=1)){ add("Comum de água doce",t,`T${t}_FISH_FRESHWATER_ALL_COMMON`); add("Comum de água salgada",t,`T${t}_FISH_SALTWATER_ALL_COMMON`); }
  const rares=[]; for(const t of [7,5,3].filter(x=>x<=g.tier)){ for(const [b,n] of FISH_BIOMES){ const p=typical(`T${t}_FISH_FRESHWATER_${b}_RARE`,0); if(p) rares.push({name:`Raro de ${n}`,t,p}); } const s=typical(`T${t}_FISH_SALTWATER_ALL_RARE`,0); if(s) rares.push({name:"Raro do mar",t,p:s}); }
  rares.sort((a,b)=>b.p.p-a.p.p); rows.push(...rares.slice(0,6));
  if(g.tier>=8){ const sh=typical("T8_FISH_SALTWATER_ALL_BOSS_SHARK",0); if(sh) rows.push({name:"Tubarão (chefe do mar)",t:8,p:sh}); }
  const ch=typical("T1_FISHCHOPS",0); if(ch) rows.push({name:"Chopped Fish (peixe picado)",t:1,p:ch});
  for(const r of rows){ const tr=body.insertRow(); tr.insertCell().textContent=r.name; tr.insertCell().textContent=`T${r.t}`; const td=tr.insertCell(); td.className="num"; td.textContent=r.p?fmt(r.p.p):"—"; tr.insertCell().textContent=r.p?String(r.p.n):"—"; }
}
function renderHero(){
  const r=bestRefining()[0], c=bestCraft()[0], k=bestCook()[0];
  const cands=[r&&{kind:"ref",x:r},c&&{kind:"craft",x:c},k&&{kind:"cook",x:{m:k,day:k.day,name:k.name,kind:k.kind}}].filter(Boolean).sort((a,b)=>b.x.day-a.x.day);
  const best=cands[0]||null;
  const ans=$("heroAnswer"); ans.textContent="";
  const who = PF.nome && !IS_EXAMPLE ? `${PF.nome}, hoje` : "Hoje";
  if(!best){ ans.textContent=`${who}, nenhum refino ou craft da sua ficha dá lucro seguro com os preços de agora.`; $("heroOthers").textContent=""; return; }
  const x=best.x, b=el("b");
  const n=el("span",{class:"num",text:sgn(x.m.p1)});
  if(best.kind==="ref"){ const R=RES[x.res]; b.textContent=`${R.refName.toLowerCase()} T${x.t}.${x.e}`; ans.append(`${who} o seu foco rende mais refinando `,b,` em ${R.city}: `,n,` por ${R.u}, uns ${fmtS(x.day)} com 10.000 de foco.`); }
  else if(best.kind==="cook"){ b.textContent=x.name; ans.append(`${who} o seu foco rende mais ${x.kind==="f"?"cozinhando":"preparando"} `,b,` em ${COOK_CITY[x.kind]}: `,n,` por fornada, uns ${fmtS(x.day)} com 10.000 de foco.`); }
  else{ b.textContent=`${gearName(x.slot,x.mat,x.s)} T${x.t}.${x.e}`; ans.append(`${who} o seu foco rende mais fabricando `,b,` em ${CRAFT_CITY[x.slot+"_"+x.mat]}: `,n,` por peça, uns ${fmtS(x.day)} com 10.000 de foco.`); }
  { const hid=best.kind==="ref"?idOf(x.t,RES[x.res].ref,x.e):best.kind==="cook"?x.m.id:gearId(x.t,x.slot,x.mat,x.s,x.e); const old=ans.parentNode.querySelector(".hero-ic"); if(old) old.remove(); const hi=el("span",{class:"hero-ic"}); hi.append(iconImg(apiIcon(hid),84)); ans.parentNode.prepend(hi); }
  if(window.gsap&&!RM){ const o={v:0}; gsap.to(o,{v:x.m.p1,duration:1.1,ease:"power2.out",onUpdate:()=>n.textContent=sgn(o.v)}); }
  $("heroOthers").textContent="";
  $("heroOthers").append(el("span",{class:"muted",text:"Com o custo de foco da sua ficha e o preço típico das cidades. Confira o preço no jogo antes de comprar."}));
}

/* ================= nomes em português ou inglês ================= */
let LANG = store.get("lang")||"pt";
function expandAlts(g){ const alts=g.split(/\s+ou\s+/).map(a=>a.trim()), last=alts[alts.length-1].split(" ").pop(); return alts.map(a=>(!/\s/.test(a)&&alts.length>1)?`${a} ${last}`:a); }
const FOOD_PT = [[/Deadwater Eel Stew|Eel Stew/g,"Guisado de Enguia"],[/Roasted Puremist Snapper|Puremist Snapper/g,"Pargo Neblina-pura"],[/Beef Sandwich/g,"Sanduíche de Carne"],[/Beef Stew/g,"Guisado de Carne"],[/Pork Omelette/g,"Omelete de Porco"],[/Omelette/g,"Omelete"],[/Roast Pork/g,"Porco Assado"],[/\bPork\b/g,"Porco Assado"],[/\bStew\b/g,"Guisado"],[/Gigantify/g,"Crescimento"]];
function nm(en){ if(LANG==="en"||!GEAR||!en) return en; return expandAlts(en).map(a=>{ const k=gearKey(a); return k&&GEAR.p[k]?GEAR.p[k]:a; }).join(" ou "); }
const nmKey = (k,en) => LANG==="pt"&&GEAR&&GEAR.p[k] ? GEAR.p[k] : en;
const nmFood = f => (LANG==="en"||!f) ? f : FOOD_PT.reduce((s,[rx,pt])=>s.replace(rx,pt),f);
function setLang(l){ LANG=l; store.set("lang",l); document.querySelectorAll("[data-lang]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.lang===l)));
  renderBuilds(); renderRecs(); renderSpecs(); ["p-mercado","p-encantar","p-matchup"].forEach(id=>{ if(!$(id).hidden) ({"p-mercado":renderBM,"p-encantar":renderEN,"p-matchup":renderMU})[id](); }); }

/* ================= profile editor ================= */
function segRow(label, val, labels, onSet){ const row=el("div",{class:"lv"}); row.append(el("span",{class:"lbl",text:label})); const seg=el("div",{class:"seg sm",role:"group","aria-label":label});
  labels.forEach((t,i)=>{ const b=el("button",{type:"button",text:t,"aria-pressed":String(i===val)}); b.addEventListener("click",()=>{ [...seg.children].forEach(x=>x.setAttribute("aria-pressed",String(x===b))); onSet(i); }); seg.append(b); }); row.append(seg); return row; }
function numIn(val,max,label,onSet,ph){ const inp=el("input",{type:"number",min:"0",max:String(max),step:"1",inputMode:"numeric",value:val?String(val):"",placeholder:ph||"—","aria-label":label}); inp.className="lvn";
  inp.addEventListener("change",()=>{ let v=Math.round(+inp.value||0); v=Math.max(0,Math.min(max,v)); inp.value=v?String(v):""; onSet(v); }); return inp; }
function lvRow(label,inputs,hint,ic){ const row=el("div",{class:"lvrow"}); const lb=el("span",{class:"lbl"}); if(ic){ lb.classList.add("with-ic"); lb.append(ic,document.createTextNode(label)); } else lb.textContent=label; row.append(lb); const box=el("div",{class:"lvins"}); inputs.forEach(x=>box.append(x)); row.append(box); if(hint) row.append(el("span",{class:"lvh",text:hint})); return row; }
const tagIn = (t,inp,ic) => { const w=el("label",{class:"lvt"}), s=el("span",{text:t}); if(ic){ const h=el("span",{class:"lvtn"}); h.append(ic,s); w.append(h,inp); } else w.append(s,inp); return w; };
const bandTxt = n => ["sem spec","começando","média","alta"][band(n)];
/* nó recolhível da ficha (igual aos das armas): ícone, nome e resumo; o corpo só é montado quando abre */
function spNode(nome,ic,getSum,build){ const d=el("details",{class:"spg"}), sm=el("summary"), nmS=el("span",{class:"spn",text:nome}), sumS=el("span",{class:"sps"}); sm.append(ic,nmS,sumS); d.append(sm); const body=el("div",{class:"spgrid"}); d.append(body);
  /* getSum devolve um texto ou uma lista de chips [[texto, classe]...] (com .p = percentual preenchido), igual aos cartões do Combate */
  const upd=()=>{ const t=getSum();
    if(Array.isArray(t)){ sumS.textContent=""; if(!t.length) sumS.append(el("span",{class:"spchip off",text:"sem spec"})); else t.forEach(([x,c])=>sumS.append(el("span",{class:"spchip "+(c||""),text:x}))); sumS.classList.toggle("on",t.length>0); d.classList.toggle("has",t.length>0); d.style.setProperty("--p",(t.p||0)+"%"); }
    else { sumS.textContent=t; sumS.classList.toggle("on",t!=="sem spec"); }
    refreshSec(); }; let built=false;
  d.addEventListener("toggle",()=>{ if(!d.open||built) return; built=true; build(body,upd); }); upd(); return d; }
/* resumo de cada seção da árvore da ficha: quantos nós têm spec */
const SEC_BOX = {"Combate":"pfCombat","Craft":"pfCraftAll","Coleta":"pfGather","Refino":"pfRefine","Cozinha e alquimia":"pfCook","Fazenda":"pfFarm"};
function refreshSec(){ clearTimeout(refreshSec._a); refreshSec._a=setTimeout(()=>{ try{ renderArvore(); renderCaca(); }catch(e){} },120); const TOT={on:0,all:0}; for(const [n,id] of Object.entries(SEC_BOX)){ const box=$(id), out=document.querySelector(`.secsum[data-sec="${n}"]`); if(!box||!out) continue; const all=box.querySelectorAll("details.spg"), on=box.querySelectorAll("details.spg .sps.on"); out.textContent=all.length?(on.length?`${on.length} de ${all.length} com spec`:"sem spec"):""; out.classList.toggle("on",on.length>0); out.style.setProperty("--p",(all.length?Math.round(on.length/all.length*100):0)+"%"); TOT.on+=on.length; TOT.all+=all.length; }
  const pct=TOT.all?Math.round(TOT.on/TOT.all*100):0, pb=$("pfProgBar"); if(pb){ pb.style.width=pct+"%"; $("pfProgTxt").textContent=`${TOT.on} de ${TOT.all} itens com spec (${pct}%)`; $("pfProg").setAttribute("aria-valuenow",String(pct)); $("pfProgHint").textContent=pct===0?"Comece por Combate e Craft: é de lá que saem a maioria das recomendações.":pct<60?"Quanto mais itens você preencher, mais certeiras ficam as recomendações e o custo de foco.":"Ficha bem preenchida. O que faltar, é só deixar em branco."; } }
function renderProfile(){
  $("pfName").value=PF.nome||"";
  const g=$("pfGather"); g.textContent=""; const gg=el("div",{class:"spgroups"}); g.append(gg);
  for(const [k,n,base] of GATHER){ const cur=PF.coleta[k]||(PF.coleta[k]={s:{}}); cur.s=cur.s||{};
    const code=base||"FISH_FRESHWATER_ALL_COMMON", tiers=t=>tierOrder(t);
    gg.append(spNode(n,itemImg(code,[4,3,5,2,6,7,8,1]),()=>{ deriveLv(); const vals=Object.values(cur.s).filter(x=>x>0), ch=[]; if(cur.m>0) ch.push(["Maestria "+cur.m,"m"]); if(vals.length) ch.push([`${vals.length}/${k==="pesca"?1:7} itens`,"n"],["Maior "+Math.max(...vals),"mx"]); if(cur.tier) ch.push(["Coleta até T"+cur.tier,"t"]); ch.p=Math.round(vals.length/(k==="pesca"?1:7)*100); return ch; },(body,upd)=>{
      if(k==="pesca"){ body.append(tagIn("Pescador",numIn(cur.m||0,100,"Pescador",x=>{ cur.m=x; saveProfile(); upd(); }),itemImg(code,[4,3,5,2,6,7,8,1])),tagIn("Especialista",numIn(cur.s[8]||0,100,"Especialista em pesca",x=>{ if(x) cur.s[8]=x; else delete cur.s[8]; saveProfile(); upd(); }),itemImg(code,[8,7,6,5,4,3,2,1]))); }
      else for(let t=2;t<=8;t++) body.append(tagIn(`T${t}`,numIn(cur.s[t]||0,100,`${n} T${t}`,x=>{ if(x) cur.s[t]=x; else delete cur.s[t]; saveProfile(); upd(); }),itemImg(code,tiers(t)))); })); }
  const r=$("pfRefine"); r.textContent=""; const rg=el("div",{class:"spgroups"}); r.append(rg);
  for(const k in RES){ const cur=PF.refino[k]||(PF.refino[k]={m:0,s:{}}); cur.s=cur.s||{};
    rg.append(spNode(RES[k].refName,itemImg(RES[k].ref,[6,5,4,7,8,3,2,1]),()=>{ const vals=Object.values(cur.s).filter(x=>x>0), ch=[]; if(cur.m) ch.push(["Maestria "+cur.m,"m"]); if(vals.length) ch.push([`${vals.length}/7 itens`,"n"],["Maior "+Math.max(...vals),"mx"]); if(ch.length) ch.push(["Foco T6.0: "+fmt(refFocus(k,6,0)),"f"]); ch.p=Math.round(vals.length/7*100); return ch; },(body,upd)=>{
      body.append(tagIn("Maestria",numIn(cur.m||0,100,`Maestria de ${RES[k].refName}`,x=>{ cur.m=x; saveProfile(); upd(); }),itemImg(RES[k].ref,[6,5,4,7,8,3,2,1])));
      for(let t=2;t<=8;t++) body.append(tagIn(`T${t}`,numIn(cur.s[t]||0,100,`${RES[k].refName} T${t}`,x=>{ if(x) cur.s[t]=x; else delete cur.s[t]; saveProfile(); upd(); }),itemImg(RES[k].ref,tierOrder(t))));
      body.append(tagIn("Foco T6.0 no jogo",numIn(cur.obs||0,99999,`Custo de foco no jogo para ${RES[k].refName} T6.0`,x=>{ cur.obs=x; saveProfile(); upd(); },"—"))); })); }
  renderSpecs(); renderCookProfile(); refreshSec(); renderArvore(); renderCaca();
}
function renderGatherHint(row,cur){ deriveLv(); const h=row.querySelector(".lvh"); if(h) h.textContent=cur.tier?`coleta até T${cur.tier}`:"sem spec"; }

/* ================= Destiny Board completo (data/specs.json) ================= */
let SPECS=null, SPIDX={};             // SPIDX: chave do item no jogo (MAIN_SWORD, HEAD_PLATE_SET1, FARM_CARROT_SEED) → [grupo, chave na ficha]
function indexSpecs(){ SPIDX={}; for(const g of SPECS.g){ if(g.k.startsWith("c:")) continue;
  for(const [key] of g.it){ const full = g.k.startsWith("a:") ? g.k.slice(2)+"_"+(/^\d$/.test(key)?"SET"+key:key) : key; SPIDX[full]=[g.k,key]; } } }
/* onde fica guardado cada grupo: craft de armadura em PF.craft, o resto em PF.sp. A maestria de combate das armas fica em PF.armas. */
function spGet(k){ return k.startsWith("a:") ? (PF.craft[k.slice(2)]||{}) : ((PF.sp||{})[k]||{}); }
function spEnsure(k){ if(k.startsWith("a:")){ const kk=k.slice(2); return PF.craft[kk]||(PF.craft[kk]={m:0,s:{}}); } PF.sp=PF.sp||{}; const g=PF.sp[k]||(PF.sp[k]={m:0,s:{}}); g.s=g.s||{}; return g; }
const spMastery = k => k.startsWith("c:")&&LINE_NAME[k.slice(2)] ? (PF.armas[k.slice(2)]||0) : (spGet(k).m||0);
function spSetMastery(k,v){ if(k.startsWith("c:")&&LINE_NAME[k.slice(2)]){ PF.armas[k.slice(2)]=v; return; } spEnsure(k).m=v; }
/* eficiência de foco de qualquer item que tenha spec de craft na ficha */
function itemFCE(full){ const x=SPIDX[full]; if(!x) return 0; const [gk,key]=x;
  if(gk.startsWith("a:")){ const [slot,mat]=gk.slice(2).split("_"); return craftFCE(slot,mat,key); }
  const g=spGet(gk); return fceRule(g.m,g.s,key); }
const SP_SECS = [["combate","pfCombat"],["craft","pfCraftAll"],["fazenda","pfFarm"]];
function spSummary(g){ const st=spGet(g.k), s=st.s||{}, m=spMastery(g.k), vals=g.it.map(([key])=>+s[key]||0).filter(v=>v>0);
  const parts=[]; if(m) parts.push(`maestria ${m}`); if(vals.length) parts.push(`${vals.length} de ${g.it.length} com nível, maior ${Math.max(...vals)}`);
  if(g.k.startsWith("a:")){ const [slot,mat]=g.k.slice(2).split("_"); if(m||vals.length||st.obs) parts.push(`foco T6.0: ${fmt(craftFocus(slot,mat,6,0,1))}`); }
  return parts.length?parts.join(", "):"sem spec"; }
function renderSpecs(){
  if(!SPECS) return;
  for(const [sec,box] of SP_SECS){ const root=$(box); if(!root) continue; root.textContent=""; let sub=null, grid=null; const subs=[];
    const refreshSubs=()=>{ for(const sn of subs){ const on=sn._gs.filter(x=>spSummary(x)!=="sem spec").length; sn._cnt.textContent=on?`${on} de ${sn._gs.length} com spec`:""; sn._cnt.classList.toggle("on",!!on); sn._cnt.style.setProperty("--p",(sn._gs.length?Math.round(on/sn._gs.length*100):0)+"%"); } refreshSec(); };
    for(const g of SPECS.g.filter(x=>x.sec===sec)){
      if(g.sub!==sub){ sub=g.sub; const sn=el("details",{class:"spsubn"}), ss=el("summary"); const lab=el("span",{text:sub}), cnt=el("span",{class:"secsum"}); ss.append(lab,cnt); sn.append(ss); grid=el("div",{class:"spgroups"}); sn.append(grid); root.append(sn); sn._cnt=cnt; sn._grid=grid; subs.push(sn); sn._gs=[]; }
      const curSub=subs[subs.length-1]; curSub._gs.push(g);
      const d=el("details",{class:"spg"}), sm=el("summary"), nmS=el("span",{class:"spn",text:g.nome}), sumS=el("span",{class:"sps",text:spSummary(g)});
      sm.append(nmS,sumS); d.append(sm); const body=el("div",{class:"spgrid"}); d.append(body);
      const icons=[], combate=g.sec==="combate", tierIc=combate||g.sec==="fazenda", icT=combate?tierFromMastery:iconTier;   // tierIc: o tier do ícone segue a maestria (como nas armaduras)
      const mk=(key,gate)=>{ const im=itemImg(specCode(g,key), tierIc?tierOrder(icT(spMastery(g.k),spGet(g.k).t2)):null, g.sec==="fazenda"&&gate!==false); icons.push(im); return im; };
      const upd=()=>{ const base=spSummary(g); sumS.classList.toggle("on",base!=="sem spec"); sumS.title=base;
        { const sv=spGet(g.k).s||{}, vals=g.it.map(([k])=>+sv[k]||0).filter(v=>v>0), m=spMastery(g.k); sumS.textContent="";
          const chip=(t,c)=>sumS.append(el("span",{class:"spchip "+(c||""),text:t}));
          if(base==="sem spec"){ chip("sem spec","off"); } else { if(m) chip("Maestria "+m,"m"); if(vals.length) chip(`${vals.length}/${g.it.length} itens`,"n"); if(vals.length) chip("Maior "+Math.max(...vals),"mx"); if(combate&&m) chip("Usa até T"+tierFromMastery(m),"t"); if(g.k.startsWith("a:")&&(m||vals.length)){ const [slot,mat]=g.k.slice(2).split("_"); chip("Foco T6.0: "+fmt(craftFocus(slot,mat,6,0,1)),"f"); } }
          d.style.setProperty("--p",(g.it.length?Math.round(vals.length/g.it.length*100):0)+"%"); d.classList.toggle("has",base!=="sem spec"); } refreshSubs();
        if(tierIc){ const t=icT(spMastery(g.k),spGet(g.k).t2); icons.forEach(im=>im._tier(t)); } if(combate) lockRows(); };
      /* sem maestria (abaixo do T4) não dá para usar item nenhuma da linha: some o nome e o ícone, a não ser que o item já tenha nível */
      const rows=[], hint=el("p",{class:"tiny muted splock",text:"Digite a maestria da linha para liberar as armas e peças. Sem maestria não dá para usar nenhuma delas.",hidden:true});
      /* nó de prévia: o que a maestria 1 libera (itens T4), só enquanto a maestria está zerada */
      const unl=el("details",{class:"spunlock"}); { const us=el("summary",{text:`Itens liberados com a maestria 1 (T4): ${g.it.length}`}); const ug=el("div",{class:"spunl-grid"}); unl.append(us,ug); let ub=false;
        unl.addEventListener("toggle",()=>{ if(!unl.open||ub) return; ub=true; for(const [key,pt,en] of g.it){ const label=LANG==="en"?en:pt, cell=el("div",{class:"spunl-it",title:label}); const im=itemImg(specCode(g,key),[4,5,6,3,7,8]); cell.append(im,el("span",{text:label})); ug.append(cell); } }); }
      const lockRows=()=>{ if(!combate) return; const open=tierFromMastery(spMastery(g.k))>=4, sv=spGet(g.k).s||{}; let hid=0; unl.style.display=open?"none":""; for(const r of rows){ const hide=!open&&!(+sv[r.key]>0); r.el.style.display=hide?"none":""; if(hide) hid++; } hint.hidden=!hid; };
      sm.prepend(mk(repKey(g),false));
      let built=false;
      d.addEventListener("toggle",()=>{ if(!d.open||built) return; built=true;
        body.append(tagIn("Maestria",numIn(spMastery(g.k),g.mmax,`Maestria de ${g.nome}`,x=>{ spSetMastery(g.k,x); saveProfile(); upd(); },"—"),mk(repKey(g),false)));
        for(const [key,pt,en] of g.it){ const label=LANG==="en"?en:pt;
          const row=tagIn(label,numIn(+(spGet(g.k).s||{})[key]||0,g.max,`${g.nome}: ${label}`,x=>{ const st=spEnsure(g.k); st.s=st.s||{}; if(x) st.s[key]=x; else delete st.s[key]; saveProfile(); upd(); },"—"),mk(key)); rows.push({el:row,key}); body.append(row); }
        if(combate){ body.append(hint); body.append(unl); lockRows(); }
        if(g.k.startsWith("a:")){ const kk=g.k.slice(2); body.append(tagIn("Foco T6.0 no jogo",numIn((PF.craft[kk]||{}).obs||0,99999,`Custo de foco no jogo para ${g.nome} T6.0`,x=>{ spEnsure(g.k).obs=x; saveProfile(); upd(); },"—"))); }
      });
      upd(); grid.append(d); }
    refreshSubs(); } }
const MEAL_PT = {SOUP:"Sopa",SALAD:"Salada",SEAWEEDSALAD:"Salada de algas",PIE:"Torta",OMELETTE:"Omelete",STEW:"Guisado",SANDWICH:"Sanduíche",ROAST:"Assado",GRILLEDFISH:"Peixe grelhado"};
function cookTypes(kind){ const m={}; for(const id in COOK.r){ const r=COOK.r[id]; if(r[1]!==kind||!r[3]) continue; const tp=cookType(id); if(!m[tp]) m[tp]= MEAL_PT[tp] || r[0].replace(/^Poção\s+((de|da|do)\s+)?/i,"").replace(/\s+(Menor|Maior)$/,""); } return m; }
/* ícones da cozinha e da alquimia: começa pelo T4 e, se o prato não existe nele (omelete, por exemplo, é T3, T5 e T7), pega o mais próximo que existe;
   peixe grelhado e salada de algas só existem no T1. O tipo "MOB" é a poção calmante (código POTION_MOB_RESET). */
/* os nós do jogo (Especialização de Mestre-cuca e de Alquimista), na ordem do jogo: [tipo, nome, item do ícone]. A ficha guarda o nível por tipo. */
const COOK_NODES = {
  f:[["MEAT","Carne","MEAT"],["OMELETTE","Omeletes","MEAL_OMELETTE"],["PIE","Tortas","MEAL_PIE"],["PRODUCTS","Ingredientes de cozinha","BREAD"],["ROAST","Assados","MEAL_ROAST"],["SALAD","Saladas","MEAL_SALAD"],["SANDWICH","Sanduíches","MEAL_SANDWICH"],["SOUP","Sopas","MEAL_SOUP"],["STEW","Guisados","MEAL_STEW"]],
  p:[["ACID","Poção Ácida","POTION_ACID"],["ALCOHOL","Álcool","ALCOHOL"],["BERSERK","Poção de Fúria","POTION_BERSERK"],["CLEANSE","Poção de Invisibilidade","POTION_CLEANSE"],["CLEANSE2","Poção Purificadora","POTION_CLEANSE2"],["COOLDOWN","Poção Venenosa","POTION_COOLDOWN"],["ENERGY","Poção de Energia","POTION_ENERGY"],["GATHER","Poção de Coleta","POTION_GATHER"],["HEAL","Poção de Cura","POTION_HEAL"],["LAVA","Poção Infernal","POTION_LAVA"],["LIFEWARD","Poção Salva-vidas","POTION_LIFEWARD"],["MOB","Poção Calmante","POTION_MOB_RESET"],["REVIVE","Poção de Crescimento","POTION_REVIVE"],["SLOWFIELD","Poção Pegajosa","POTION_SLOWFIELD"],["STONESKIN","Poção de Resistência","POTION_STONESKIN"],["TORNADO","Tornado Engarrafado","POTION_TORNADO"]]};
function renderCookProfile(){ const c=$("pfCook"); c.textContent=""; const cg=el("div",{class:"spgroups"}); c.append(cg);
  for(const [k,n,kind] of [["cozinha","Cozinha","f"],["alquimia","Alquimia","p"]]){ const cur=PF[k]||(PF[k]={m:0,s:{}}); cur.s=cur.s||{}; const nodes=COOK_NODES[kind], types=Object.fromEntries(nodes.map(x=>[x[0],x[1]])), iconeDe=Object.fromEntries(nodes.map(x=>[x[0],x[2]]));
    const icons=[], mk=(code,gate)=>{ const im=itemImg(code,tierOrder(iconTier(cur.m,cur.t2)),gate!==false); icons.push(im); return im; }, retier=()=>{ const t=iconTier(cur.m,cur.t2); icons.forEach(im=>im._tier(t)); };
    const ic=()=>kind==="f"?itemImg("MEAL_SOUP",[1],false):mk("POTION_HEAL",false);   // ícone da maestria de Cozinha: a sopa T1, fixa
    cg.append(spNode(n,ic(),()=>{ const n0=Object.keys(types).length, vals=Object.keys(types).map(tp=>cur.s[tp]??cur.all??0).filter(x=>x>0), ch=[]; if(cur.m) ch.push(["Maestria "+cur.m,"m"]); if(vals.length) ch.push([`${vals.length}/${n0} itens`,"n"],["Maior "+Math.max(...vals),"mx"]); ch.p=Math.round(vals.length/n0*100); return ch; },(body,upd)=>{
      const save=()=>{ saveProfile(); upd(); retier(); };
      body.append(tagIn("Maestria",numIn(cur.m||0,100,`Maestria de ${n}`,x=>{ cur.m=x; save(); }),ic()));
      for(const [tp,label] of Object.entries(types)) body.append(tagIn(label,numIn(cur.s[tp]??cur.all??0,100,`${n}: ${label}`,x=>{ cur.s[tp]=x; save(); }),mk(iconeDe[tp]))); })); } }
function renderWho(){ $("who").textContent = IS_EXAMPLE ? "Ficha de exemplo: Oleran" : (PF.nome ? `Ficha: ${PF.nome}` : "Ficha sem nome"); $("exampleBanner").hidden=!IS_EXAMPLE; }
$("pfName").addEventListener("change",()=>{ PF.nome=$("pfName").value.trim().slice(0,40); saveProfile(); });
$("pfCopy").addEventListener("click",()=>{ const code=btoa(unescape(encodeURIComponent(JSON.stringify(PF)))); const done=()=>$("pfStatus").textContent="Código da ficha copiado. Cole em outro navegador em Colar ficha.";
  try{ navigator.clipboard.writeText(code).then(done,()=>{ $("pfPasteBox").hidden=false; $("pfPaste").value=code; $("pfPaste").select(); $("pfStatus").textContent="Copie o código selecionado abaixo."; }); }catch(e){ $("pfPasteBox").hidden=false; $("pfPaste").value=code; } });
$("pfPasteBtn").addEventListener("click",()=>{ $("pfPasteBox").hidden=!$("pfPasteBox").hidden; $("pfPaste").value=""; $("pfPaste").focus(); });
$("pfPasteApply").addEventListener("click",()=>{ try{ const o=JSON.parse(decodeURIComponent(escape(atob($("pfPaste").value.trim())))); if(typeof o!=="object"||!o.armas) throw 0; PF=Object.assign(EMPTY(),migrate(o)); saveProfile(); renderProfile(); $("pfPasteBox").hidden=true; $("pfPasteMsg").textContent=""; }catch(e){ $("pfPasteMsg").textContent="Esse código não é uma ficha válida. Copie de novo pelo botão Copiar minha ficha."; } });
/* Buscar do Albion: o programa do PC abre o site de volta com a ficha depois do "#" (não vai para servidor nenhum). */
/* A sincronização só existe no Windows (programa do PC). Celular e outros sistemas veem um aviso e preenchem a ficha na mão. */
const AF_OS = (()=>{ const ua=navigator.userAgent||"", uad=navigator.userAgentData;
  if(/Android/i.test(ua)) return "android";
  if(/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints||0)>1)) return "ios";
  if(uad && uad.mobile) return "mobile";
  if(/Windows/i.test(ua)) return "windows";
  if(/Mac/i.test(ua)) return "mac";
  if(/Linux|X11|CrOS/i.test(ua)) return "linux";
  return "windows"; })();
if(AF_OS!=="windows"){ document.body.classList.add("sem-sync"); const cel=["android","ios","mobile"].includes(AF_OS);
  $("pfSemTit").textContent=cel?"Sincronizar ainda não funciona no celular":"Sincronizar só funciona no Windows";
  $("pfSemTxt").textContent=cel?"Por enquanto não há suporte para sincronizar a ficha pelo celular. Nesse aparelho você digita tudo manualmente: abra cada seção abaixo (Combate, Craft, Coleta, Refino, Árvore da fazenda e da cozinha, Caçada) e preencha os níveis do seu Destiny Board. A ficha fica salva neste navegador.":"O programa de sincronia é feito para Windows. Neste sistema você digita os níveis manualmente: abra cada seção abaixo e preencha os do seu Destiny Board. A ficha fica salva neste navegador.";
  $("pfSemSync").hidden=false; $("pfOverlay").hidden=true; }
$("pfAlbion").href="albion-ficha://iniciar?voltar="+encodeURIComponent(location.origin+location.pathname);
async function lerFichaDoAlbion(txt){ txt=decodeURIComponent(txt);
  if(txt.startsWith("gz.")){ const bin=Uint8Array.from(atob(txt.slice(3).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
    return JSON.parse(await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).text()); }
  return JSON.parse(decodeURIComponent(escape(atob(txt)))); }
async function aplicarFichaDoAlbion(){ const m=/^#ficha=(.+)$/.exec(location.hash); if(!m) return; history.replaceState(null,"",location.pathname+location.search+ponteHash0);   /* devolve o endereço de antes (ex.: #ficha), senão a página perde a aba em que estava */
  let o=null; try{ o=await lerFichaDoAlbion(m[1]); if(typeof o!=="object"||!o||!o.armas) o=null; }catch(err){ o=null; }
  if(!o){ $("pfStatus").textContent="Não consegui ler a ficha vinda do Albion."; return; }
  for(let i=0;!PF&&i<200;i++) await new Promise(r=>setTimeout(r,50)); if(!PF) return;
  { const mesclar=(a,b)=>{ if(b&&typeof b==="object"&&!Array.isArray(b)){ const r=Object.assign({},a&&typeof a==="object"?a:{}); for(const k in b) r[k]=mesclar(r[k],b[k]); return r; } return ((b===0||b==="")&&a)?a:b; };
    const nomeAntes=(!IS_EXAMPLE&&PF.nome)||"";
    /* a ficha de exemplo (Oleran) nunca entra na mistura: só se mantém o que a própria pessoa preencheu */
    const nomeNovo=String(o.nome||"").trim(), outra=!!(nomeAntes&&nomeNovo&&nomeAntes.toLowerCase()!==nomeNovo.toLowerCase());   /* ficha de OUTRO personagem: não mistura com a atual */
    const novo=migrate(o), base=(IS_EXAMPLE||outra)?EMPTY():PF;
    PF=Object.assign(EMPTY(),mesclar(base,novo));
    /* cozinha e alquimia vindas do jogo trazem cada tipo; o "all" (nível igual para todos, de fichas antigas e do exemplo) deixa de valer */
    for(const k of ["cozinha","alquimia"]) if(novo[k]&&novo[k].s&&Object.keys(novo[k].s).length&&PF[k]) delete PF[k].all; if(nomeAntes&&!(o.nome&&String(o.nome).trim())) PF.nome=nomeAntes; else if(o.nome) PF.nome=String(o.nome).trim().slice(0,40); saveProfile(true); ponteEco=fichaCode(); renderProfile(); renderWho(); $("pfStatus").textContent=outra?`Ficha de ${nomeNovo} aplicada. Ela substituiu a ficha de ${nomeAntes}, porque são personagens diferentes.`:"Ficha do Albion aplicada (o que você já tinha preenchido foi mantido)."; } }
/* Navegação interna: ao clicar em Sincronizar, esta mesma aba vai para a página de andamento do programa (127.0.0.1, só no seu PC)
   e volta sozinha para cá já com a ficha. Nada de aba nova. */
/* Ponte com o Albion Overlay (o programa): site e overlay usam a MESMA ficha. O programa guarda a ficha em
   http://127.0.0.1:47832/ficha (só neste PC). O site puxa quando há novidade (seq maior) e empurra quando você edita. */
const PONTE="http://127.0.0.1:47832/ficha";
let ponteHash0="", ponteSeq=0, ponteLig=false, ponteEco="", ponteInit=false;   /* ponteInit: só empurra depois de ter puxado a ficha do programa uma vez (uma ficha vazia do site nunca apaga a do jogo) */ try{ ponteSeq=+localStorage.getItem("ponteSeq")||0; }catch(e){}
async function pontePuxar(){ try{
    const r=await fetch(PONTE,{cache:"no-store"}); if(!r.ok) return false; const j=await r.json(); ponteLig=true; ponteInit=true;
    if(j.atalho) document.querySelectorAll("kbd[data-atalho]").forEach(k=>{ if(k.textContent!==j.atalho) k.textContent=j.atalho; });   /* mostra o atalho que a pessoa escolheu no programa */
    if(j.code && j.seq>ponteSeq && j.code!==ponteEco && j.code!==fichaCode()){
      ponteSeq=j.seq; try{ localStorage.setItem("ponteSeq",String(ponteSeq)); }catch(e){}
      ponteEco=j.code; if(!/^#ficha=/.test(location.hash)) ponteHash0=location.hash; location.hash="#ficha="+encodeURIComponent(j.code); }   /* reaproveita o caminho que já aplica a ficha do jogo */
    else if(j.seq>ponteSeq){ ponteSeq=j.seq; try{ localStorage.setItem("ponteSeq",String(ponteSeq)); }catch(e){} }
    if(typeof afSet==="function") afSet(); return true; }catch(e){ ponteLig=false; return false; } }
let pontePush=0;
function ponteEmpurrar(){ clearTimeout(pontePush); pontePush=setTimeout(async()=>{ try{
    if(!ponteInit) return; const code=fichaCode(); if(code===ponteEco) return;
    const r=await fetch(PONTE,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({code})}); if(!r.ok) return;
    const j=await r.json(); ponteEco=code; ponteSeq=Math.max(ponteSeq,j.seq||0); try{ localStorage.setItem("ponteSeq",String(ponteSeq)); }catch(e){} }catch(e){} },1500); }
/* Sincronizar: o programa abre o overlay na aba Minha ficha; aqui só esperamos a ficha chegar pela ponte */
let irSync=false;
async function irParaSincronia(){ if(irSync) return; irSync=true; const st=$("pfStatus"), t0=Date.now();
  st.textContent="Abrindo o Albion Overlay… se o Windows perguntar, permita e aceite o aviso de Administrador. Se o Albion já estiver aberto, saia para a seleção de personagem e entre de novo.";
  const seq0=ponteSeq;
  while(Date.now()-t0<300000){ await new Promise(r=>setTimeout(r,2000)); await pontePuxar();
    if(ponteSeq>seq0){ st.textContent="Ficha lida do jogo e aplicada."; irSync=false; return; }
    if(Date.now()-t0>20000&&!ponteLig) st.textContent="Não consegui falar com o programa. Confira se o Albion Overlay está aberto (ícone na bandeja) e, se o seu navegador bloqueia acesso ao PC local (Brave), permita para este site."; }
  st.textContent="Tempo esgotado: a ficha não chegou. Relogue no personagem e clique em Sincronizar de novo."; irSync=false; }
pontePuxar(); document.addEventListener("visibilitychange",()=>{ if(!document.hidden) pontePuxar(); }); window.addEventListener("focus",pontePuxar); setInterval(()=>{ if(!document.hidden) pontePuxar(); },15000);
/* primeira vez neste navegador: baixa o programa e explica tudo na própria página (o protocolo albion-ficha:// só existe depois de abrir o programa uma vez) */
const afOk = () => { try{ return localStorage.getItem("afProg")==="1"; }catch(e){ return false; } };
const afSet = () => { try{ localStorage.setItem("afProg","1"); }catch(e){} };
function afBaixar(){ const a=el("a",{href:"programa/AlbionOverlay.exe",download:"AlbionOverlay.exe"}); document.body.append(a); a.click(); a.remove(); }
let afInfo=false;
function afMostrarPrimeira(){ $("pfPrimeira").hidden=false; $("pfPrimeira").scrollIntoView({behavior:RM?"auto":"smooth",block:"center"});
  if(!afInfo){ afInfo=true; fetch("programa/versao.json?"+Date.now(),{cache:"no-store"}).then(r=>r.json()).then(j=>{ $("pfSha").textContent=j.sha256||"indisponível"; $("pfVer").textContent=j.versao||"?"; }).catch(()=>{ $("pfSha").textContent="indisponível agora"; $("pfVer").textContent="?"; }); } }
$("pfAlbion").addEventListener("click",ev=>{
  if(afOk()){ setTimeout(irParaSincronia,1200); return; }
  ev.preventDefault(); afMostrarPrimeira(); afBaixar();
  $("pfStatus").textContent="Baixando o AlbionOverlay.exe… siga os passos acima. Depois de abrir o programa uma vez, volte aqui e clique em Sincronizar."; });
/* Página aberta DENTRO do Albion Overlay (?overlay=1) ou com o programa já rodando: nada para baixar nem instalar.
   Dentro do overlay a sincronia e a coleta de preços ficam nos botões do próprio overlay. */
const EM_OVERLAY=/[?&]overlay=1\b/.test(location.search);
nuvemIniciar();
/* preços em tempo real: avisos da página-mãe do overlay e o que já chegou antes de este quadro abrir */
if(EM_OVERLAY){
  window.addEventListener("message",e=>{ const d=e.data&&e.data.avPrecos; if(d&&e.origin===location.origin&&e.source===window.parent) livepAplicar(d); });
  fetch(location.origin+"/precos?desde=0",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{ if(j) livepAplicar(j); }).catch(()=>{});
}
/* Só no overlay: as listas largas (tabelas e cartões com rolagem para o lado) se ajustam à largura da janela com um zoom pequeno,
   até FIT_MIN; abaixo disso fica a rolagem. O site normal não passa por aqui. */
if(EM_OVERLAY){ (function(){
  const FIT_MIN=.66; let raf=0;
  const wide=e=>{ const o=getComputedStyle(e).overflowX; return (o==="auto"||o==="scroll")&&e.clientWidth>0; };
  function fit(){ raf=0;
    const panel=[...document.querySelectorAll("section.panel")].find(p=>!p.hidden); if(!panel) return;
    for(const e of panel.querySelectorAll(".tbl,.bm2,.of-list,.of2-main,[data-fit]")){
      if(!wide(e)) continue;
      e.style.zoom=""; if(e.scrollWidth<=e.clientWidth+1){ continue; }
      let z=Math.max(FIT_MIN,Math.floor(e.clientWidth/e.scrollWidth*100)/100);
      for(let i=0;i<8;i++){ e.style.zoom=String(z); if(e.scrollWidth<=e.clientWidth+1||z<=FIT_MIN) break; z=Math.max(FIT_MIN,Math.round((z-.02)*100)/100); }
    } }
  const ask=()=>{ if(!raf) raf=requestAnimationFrame(fit); };
  new MutationObserver(ask).observe(document.querySelector("main")||document.body,{childList:true,subtree:true});
  addEventListener("resize",ask); document.addEventListener("click",()=>setTimeout(ask,80)); ask();
})(); }
if(EM_OVERLAY){ document.body.classList.add("em-overlay"); afSet();
  $("pfAlbion").hidden=true; $("pfPrimeira").hidden=true; $("pfOverlay").hidden=true;
  $("pfSteps").innerHTML="<li><b>Você está no Albion Overlay.</b> Não precisa baixar nem instalar nada.</li><li>Para ler a ficha do jogo, use o botão <b>Sincronizar agora</b> no topo desta aba do overlay. Se o Albion já estiver aberto, saia para a seleção de personagem e entre de novo.</li><li>A ficha daqui e a do site no navegador são a mesma: edite onde preferir.</li>";
  $("pfDica").textContent="A coleta de preços do mercado fica em Ajustes, no overlay."; }
$("pfBaixar").addEventListener("click",()=>{ afMostrarPrimeira(); afBaixar(); $("pfStatus").textContent="Baixando o AlbionOverlay.exe… siga os passos acima. Depois de abrir o programa uma vez, volte aqui e clique em Sincronizar."; });
$("pfJaTenho").addEventListener("click",()=>{ afSet(); $("pfPrimeira").hidden=true; location.href=$("pfAlbion").href; setTimeout(irParaSincronia,1200); });
$("pfFechaPrim").addEventListener("click",()=>{ $("pfPrimeira").hidden=true; });
aplicarFichaDoAlbion(); window.addEventListener("hashchange",aplicarFichaDoAlbion);
$("pfExample").addEventListener("click",()=>{ PF=OLERAN(); saveProfile(); renderProfile(); });
$("pfClear").addEventListener("click",()=>{ PF=EMPTY(); saveProfile(); renderProfile(); if(typeof ponteLimpar==="function") ponteLimpar(); });
/* "Limpar ficha" também esvazia a ficha guardada no programa (o aviso do overlay passa a dizer que não há ficha) */
async function ponteLimpar(){ clearTimeout(pontePush); ponteEco=fichaCode(); if(!ponteLig) return; try{ const r=await fetch(PONTE,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({limpar:true})}); if(!r.ok) return; const j=await r.json(); ponteSeq=Math.max(ponteSeq,j.seq||0); try{ localStorage.setItem("ponteSeq",String(ponteSeq)); }catch(e){} }catch(e){} }

/* ================= activities ================= */
const ACTS=[
 {n:"Corrompidas solo",d:"PvP 1v1, Stalker e Slayer letais",lo:2.0,hi:8.0,r:"h",tags:["solo"]},
 {n:"Brumas e tesouros de Brecilien",d:"Abadias sem montaria",lo:1.5,hi:4.0,r:"h",tags:["solo"]},
 {n:"Corações de facção em grupo",d:"Guerra de Facções",lo:1.8,hi:3.5,r:"m",tags:["grupo"]},
 {n:"Baús das Estradas de Avalon",d:"1 a 3 jogadores",lo:1.2,hi:3.0,r:"h",tags:["grupo"]},
 {n:"Craft com foco",d:"Precisa de spec na linha",lo:1.0,hi:3.0,r:"l",tags:["solo","seguro"]},
 {n:"Flip para o Mercado Negro",d:"Transporte por zona vermelha",lo:0.8,hi:3.0,r:"m",tags:["solo"]},
 {n:"Coleta T6+",d:"Minério, pelego ou fibra",lo:0.6,hi:2.5,r:"m",tags:["solo"]},
 {n:"Flip na mesma cidade",d:"Ordens de compra e venda",lo:0.5,hi:2.0,r:"l",tags:["solo","seguro"]},
 {n:"Mobs T4 e T5 em zona amarela",d:"",lo:0.4,hi:0.9,r:"l",tags:["solo","seguro"]},
 {n:"Ilha com foco",d:"Plantio e criação",lo:0.3,hi:0.9,r:"l",tags:["solo","seguro"]},
 {n:"Expedições",d:"",lo:0.25,hi:0.6,r:"l",tags:["solo","grupo","seguro"]}
];
const RISK={h:"risco alto",m:"risco médio",l:"risco baixo"}, MAXV=8;
$("ticks").innerHTML=[0,2,4,6,8].map(v=>`<span style="left:${v/MAXV*100}%">${v}M</span>`).join("");
function renderActs(f){ const box=$("rows"); box.textContent="";
  ACTS.filter(a=>f==="all"||a.tags.includes(f)).forEach(a=>{ const row=el("div",{class:"row r-"+a.r,tabIndex:0}); const lbl=el("div",{class:"lbl",text:a.n}); const sub=el("span"); sub.append(el("span",{class:`risk ${a.r} rk-chip`,text:RISK[a.r],style:"display:inline"})); if(a.d) sub.append(`  ${a.d}`); lbl.append(sub);
    const plot=el("div",{class:"plot"}); [2,4,6].forEach(v=>{const g=el("span",{class:"grid"}); g.style.left=(v/MAXV*100)+"%"; plot.append(g);}); const bar=el("span",{class:"bar"}); bar.style.left=(a.lo/MAXV*100)+"%"; bar.style.width=((a.hi-a.lo)/MAXV*100)+"%"; plot.append(bar);
    row.append(lbl,plot,el("div",{class:"val num",text:`${dec(a.lo)} a ${dec(a.hi)}M`})); box.append(row);
    bindTip(row,()=>[["v",`${dec(a.lo)} a ${dec(a.hi)} milhões por hora`],["",a.n],["k",RISK[a.r]+(a.d?", "+a.d.toLowerCase():"")],["k","Estimativa bruta da AlbionCodex, abr/2026"]]); }); }
document.querySelectorAll("[data-f]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-f]").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); renderActs(b.dataset.f);}));

/* ================= cozinha e alquimia ================= */
let COOK = {r:{},n:{}};               // data/cook.json: r: {id: [nome, f|p, qtd, foco, nutrição, [[insumo, qtd]...]]}, n: nomes dos insumos
const BUILD_FOOD = ["T8_MEAL_STEW_FISH","T7_MEAL_ROAST_FISH","T7_MEAL_OMELETTE","T5_MEAL_OMELETTE","T3_MEAL_OMELETTE","T8_MEAL_STEW","T6_MEAL_STEW","T7_MEAL_ROAST","T8_MEAL_SANDWICH","T7_MEAL_OMELETTE_FISH",
  "T6_POTION_HEAL","T4_POTION_HEAL","T7_POTION_REVIVE","T5_POTION_REVIVE","T8_POTION_COOLDOWN","T6_POTION_COOLDOWN","T8_POTION_CLEANSE","T7_POTION_STONESKIN","T5_POTION_STONESKIN","T7_POTION_CLEANSE2","T5_POTION_CLEANSE2","T6_POTION_ENERGY"];
const COOK_CITY = {f:"Caerleon",p:"Brecilien"};
const COOK_LOCS = ["Thetford","Fort Sterling","Martlock","Bridgewatch","Lymhurst","Caerleon","Brecilien"];
const cookType = id => (id.split("_")[2]||"");
const cookFCE = (k,id) => { const r=PF[k==="f"?"cozinha":"alquimia"]||{}; const specs=Object.assign({},r.s||{}); if(r.all&&id){ const tp=cookType(id); if(specs[tp]==null) specs[tp]=r.all; } return fceRule(r.m,specs,id?cookType(id):""); };
let COOK_LOADED=false, COOK_LOADING=null, ckKind="f", ckSel=null;
function ensureCook(){
  if(COOK_LOADED) return Promise.resolve(true);
  if(COOK_LOADING) return COOK_LOADING;
  const ids=[...new Set([...Object.keys(COOK.r), ...Object.keys(COOK.n)])].filter(i=>!i.startsWith("QUESTITEM"));
  COOK_LOADING=fetchPaced(ids,DATA.itens,COOK_LOCS,"ckNote","Consultando os ingredientes e pratos").then(()=>{COOK_LOADED=true; return true;}).catch(()=>false).finally(()=>{COOK_LOADING=null;});
  return COOK_LOADING;
}
/* preço de cada ingrediente conforme de onde ele vem (SRC fica em novos.js) */
/* linha de resumo acima da tabela: o que mais rende na lista, em prata no bolso */
function ganhoTop(box,list,val,txt,none){
  if(!box) return; box.textContent=""; if(!list.length){ box.hidden=true; return; } box.hidden=false;
  const best=list.reduce((a,b)=>val(b)>val(a)?b:a), v=val(best);
  if(!(v>0)){ box.className="ganho-top neg"; box.textContent=none; return; }
  box.className="ganho-top"; box.append(el("span",{class:"gt-l",text:"O que mais rende"}),el("b",{class:"gt-v",text:"+"+fmt(Math.round(v))}),el("span",{class:"gt-t",text:txt(best)}));
}
const ckN=()=>Math.max(1,Math.min(99999,Math.round(+((SRC||{}).ckN)||1)));
/* lotes da ilha (o mesmo número da Ilha e fazenda): quantos lotes uma fornada ocupa com o que você produz na ilha,
   e quantas fornadas cabem nos seus lotes a cada colheita (plantas a cada 22 h, leite e ovos por dia, 9 animais por pasto) */
const ilhaL=()=>Math.max(0,Math.round(+((SRC||{}).lotes)||0));
function ckLotsPerBatch(m){
  if(!FARM||!FZ_LOADED||!m||!m.parts) return 0; const rr=rrr(0.15,true,st.daily), pm=st.prem?2:1; let lots=0;
  for(const x of m.parts){ if(!x.p||x.p.src!=="planto") continue; const units=x.c*(1-rr);
    const r=FARM.p.find(r=>r[1]===x.iid); if(r){ lots+=units/(9*r[7]*pm); continue; }
    const q=FARM.pr.find(r=>r[1]===x.iid); if(q){ const an=units/q[3]; lots+=an/9; const pr=producerModel(q);
      if(SRC.food==="planto"&&pr){ const fr=FARM.p.find(z=>z[1]===pr.food.id); if(fr) lots+=an*pr.food.n/(9*fr[7]*pm*24/22); } } }
  return lots;
}
function ckNFor(m){ if(SRC.ckAuto&&ilhaL()>0){ const l=ckLotsPerBatch(m); if(l>0) return Math.floor(ilhaL()/l+1e-9); } return ckN(); }
const ckMode=iid=>((SRC.ckO||{})[iid])||SRC.ck||"inst";
function ckBuy(iid){
  const m=ckMode(iid);
  if(m==="manual"){ const v=(SRC.ckM||{})[iid]; if(v!=null&&v!==""&&+v>=0) return {p:+v,n:9,src:"manual"}; }
  if(m==="tenho") return {p:0,n:9,src:"tenho"};
  if(m==="planto"){ const u=farmUnit(iid,!!(SRC.ckF||{})[iid]); if(u) return u; }
  const o=m==="ordem"?typical(iid,1):null, i=o||typical(iid,0);
  return i?{p:i.p,n:i.n,src:o?"ordem":"inst"}:null;
}
const ckNeedsFarm=()=>SRC.ck==="planto"||Object.values(SRC.ckO||{}).includes("planto");
function cookModel(id){
  const r=COOK.r[id]; if(!r||!r[3]) return null; const [name,kind,q,fo,nut,ing]=r;
  let cost=0, miss=null, thin=false; const parts=[];
  for(const [iid,c] of ing){ const p=ckBuy(iid); if(!p){ miss=COOK.n[iid]||iid; break; } cost+=c*p.p; if(p.n<2&&(p.src==="inst"||p.src==="ordem")) thin=true; parts.push({iid,c,p}); }
  const item=typical(id, st.sell==="instant"?1:0);
  if(miss||!item) return {id,name,kind,q,miss:miss||"preço do próprio item"};
  if(item.n<2) thin=true;
  const fee=q*nut*0.1125*feeVal()/100, net=q*item.p*(1-taxOf());
  const r1=rrr(0.15,true,st.daily), r0=rrr(0.15,false,st.daily);
  const p1=net-cost*(1-r1)-fee, p0=net-cost*(1-r0)-fee, fc=Math.max(1,Math.round(fo*Math.pow(0.5,cookFCE(kind,id)/10000)));
  const bc=cost*(1-r1)+fee;
  return {id,name,kind,q,cost,fee,net,item,parts,p1,p0,pct:bc>0?p1/bc:0,fc,spf:(p1-p0)/fc,day:p1*Math.floor(10000/fc),thin,tier:+id[1]};
}
const ckMix=m=>focMix(ckNFor(m),m.fc,m.p1,m.p0), ckTot=m=>ckMix(m).tot;
const CK_FIL=[
  {k:"minP",lab:"Lucro mínimo (no total)",step:1000,get:m=>ckTot(m)},
  {k:"minPct",lab:"Lucro % mínimo",step:1,get:m=>m.pct*100},
  {k:"minSpf",lab:"Prata por foco, no mínimo",step:1,get:m=>m.spf},
  {k:"minVol",lab:"Vende por dia, no mínimo",step:1,min:0,get:m=>lfVol(m.id)} ];
const CK_COLS=[
  {h:"Item",k:"name",s:m=>m.name},
  {h:"Fornada"},
  {h:"Você ganha",k:"profit",s:m=>m.miss?null:ckTot(m),t:"Ordenar pela prata que sobra no bolso, já descontados ingredientes, taxas e retorno"},
  {h:"Lucro %",k:"pct",s:m=>m.miss?null:m.pct,t:"Ordenar pelo lucro sobre o custo da fornada"},
  {h:"Por ponto de foco",k:"spf",s:m=>m.miss?null:m.spf},
  {h:"Venda típica",k:"sale",s:m=>m.miss?null:m.item.p},
  {h:"Vende por dia",k:"vol",s:m=>lfVol(m.id),t:"Ordenar pelas unidades vendidas por dia (7 dias, somando as cidades)"},
  {h:""} ];
async function renderCook(){
  const tb=$("ckTable"), note=$("ckNote"), bar=$("ckFil"), NC=CK_COLS.length; tb.textContent="";
  const rer=()=>renderCook(), def={k:"profit",dir:1};
  lfHead(tb.createTHead().insertRow(),"ck",CK_COLS,def,rer);
  const body=tb.createTBody();
  if(!COOK_LOADED){ const td=body.insertRow().insertCell(); td.colSpan=NC; td.textContent="Buscando preços dos ingredientes…"; await ensureCook(); if(!COOK_LOADED){ td.textContent="Não consegui buscar os preços agora. Tente atualizar."; return; } return renderCook(); }
  lfBar(bar,"ck",CK_FIL,rer);
  if(ckNeedsFarm()){ try{ if(!FARM) FARM=await need("farm"); await ensureFZ(); }catch(e){} }
  { const l=$("ckLotes"); if(l&&document.activeElement!==l) l.value=SRC.lotes>0?String(SRC.lotes):""; }
  { const bx=$("ckTeto"); if(bx&&!bx.firstChild) bx.append(tetoUI(()=>renderCook())); }
  const N=ckN(), AUTO=!!(SRC.ckAuto&&ilhaL()>0); { const th=tb.tHead.rows[0].cells[2]; const b=th&&th.querySelector(".lf-hs"); if(b&&AUTO) b.firstChild.textContent=`Você ganha com ${fmt(ilhaL())} lotes`; else if(b&&N>1) b.firstChild.textContent=`Você ganha em ${fmt(N)} fornadas`; }
  const only=$("ckBuilds").checked, FAVON=!!(window.FAV&&FAV.on("cozinha"));
  let rows=Object.keys(COOK.r).filter(id=>FAVON?FAV.has("cozinha",id):(COOK.r[id][1]===ckKind&&(!only||BUILD_FOOD.includes(id)))).map(cookModel).filter(Boolean);
  const st0=lfState("ck",def), needVol=st0.k==="vol"||lfNum(lfGet("ck").minVol);
  await lfEnsureVol(rows.map(m=>m.id),needVol,tb,note);
  const nAll=rows.length; rows=lfSort("ck",lfFilter("ck",rows,CK_FIL),CK_COLS,def); lfCount(bar,"ck",CK_FIL,nAll-rows.length);
  ganhoTop($("ckSum"),rows.filter(m=>!m.miss),m=>ckTot(m),m=>{ const n=ckNFor(m), mx=ckMix(m); return `${m.name}: você ganha ${fmt(Math.round(mx.tot))} de prata em ${n>1?fmt(n)+" fornadas":"uma fornada"}${AUTO&&ckLotsPerBatch(m)>0?`, o máximo que os seus ${fmt(ilhaL())} lotes dão por colheita`:""} (${fmt(m.q*n)} ${m.kind==="f"?"porções":"poções"}, ${fmt(mx.foc)} de foco${mx.parcial?`; ${mixTxt(mx)}`:""}). Já descontados ingredientes, taxa da estação e taxas de venda.`; },"Com os preços de agora, nada desta lista dá lucro.");
  if(!rows.length){ const td=body.insertRow().insertCell(); td.colSpan=NC; td.className="muted"; td.textContent=nAll?"Nada passa pelos filtros. Afrouxe um deles ou clique em Limpar filtros.":"Nada para mostrar aqui."; }
  for(const m of rows){ const tr=body.insertRow(); tr.dataset.fav=m.id; tr.tabIndex=0; tr.className="clickrow";
    const a=tr.insertCell(); const an=el("span"); an.append(m.name); if(BUILD_FOOD.includes(m.id)) an.append(" ",el("span",{class:"spec",text:"build"})); a.append(withIcon(m.id,an));
    tr.insertCell().textContent=`${m.q} ${m.kind==="f"?(m.q>1?"porções":"porção"):(m.q>1?"poções":"poção")}`;
    if(m.miss){ const td=tr.insertCell(); td.colSpan=4; td.className="muted"; td.textContent=`Sem preço: ${m.miss}`; lfVolCell(tr,m.id); tr.insertCell(); continue; }
    const Nm=ckNFor(m), lpb=ilhaL()>0?ckLotsPerBatch(m):0;
    const c=tr.insertCell(); c.className="num gv-cell "+(m.p1>=0?"gain":"loss");
    if(AUTO&&lpb>0&&Nm<1){ c.className="num gv-cell muted"; c.append(el("b",{class:"gv",text:"—"}),el("small",{class:"gv-sub",text:`1 fornada ocupa ${dec(lpb)} lotes: mais que os seus ${fmt(ilhaL())}`})); }
    else { const mx=focMix(Nm,m.fc,m.p1,m.p0); c.className="num gv-cell "+(mx.tot>=0?"gain":"loss"); c.append(el("b",{class:"gv",text:sgn(mx.tot)}),el("small",{class:"gv-sub",text:(mx.tot<0?"prejuízo: ":"")+(AUTO&&lpb>0?`${fmt(Nm)} fornadas com seus lotes · ${sgn(m.p1)} cada`:Nm>1?`${sgn(m.p1)} por fornada`:"por fornada, com foco")+` · ${fmt(mx.foc)} de foco`+(mx.parcial?` · ${mixTxt(mx)}`:"")+(!AUTO&&lpb>0?` · seus lotes dão ${fmt(Math.floor(ilhaL()/lpb+1e-9))}`:"")})); }
    const p=tr.insertCell(); p.className="num "+(m.p1>=0?"gain":"loss"); p.textContent=dec(m.pct*100)+"%";
    const d=tr.insertCell(); d.className="num"; d.textContent=dec(m.spf);
    const e=tr.insertCell(); e.className="num"; e.textContent=fmt(m.item.p);
    lfVolCell(tr,m.id);
    const f=tr.insertCell(); f.className="tiny muted"; f.textContent=m.thin?"pouca oferta":"";
    const dr=document.createElement("tr"); dr.className="of-drow"; dr.hidden=true; const dc=document.createElement("td"); dc.colSpan=NC; dr.append(dc); tr.after(dr); tr.dataset.id=m.id;
    const toggle=()=>{ const open=dr.hidden; dr.hidden=!open; tr.classList.toggle("open",open); tr.setAttribute("aria-expanded",String(open)); ckSel=open?m.id:null;
      if(open){ dc.textContent=""; try{ dc.append(cookPanel(m)); }catch(e){ dc.append(el("p",{class:"small loss",text:"Não consegui montar os detalhes: "+(e&&e.message||e)})); } setTimeout(()=>{ try{ const r=dr.getBoundingClientRect(); if(r.bottom>innerHeight-8) dr.scrollIntoView({block:"nearest",behavior:RM?"auto":"smooth"}); }catch(e){} },60); } };
    tr.setAttribute("aria-expanded","false"); tr.addEventListener("click",toggle); tr.addEventListener("keydown",ev=>{ if(ev.target===tr&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); toggle(); } });
    if(ckSel===m.id) toggle();
  }
  { const w=tb.parentNode; if(w) w.style.setProperty("--tblw",(w.clientWidth-8)+"px"); }
}
const CK_PILL={inst:"COMPRA INST",ordem:"ORDEM COMPRA",planto:"DA ILHA",tenho:"JÁ TENHO",manual:"MANUAL"};
const CK_SUB={inst:"menor anúncio nas cidades",ordem:"ordem de compra, preço típico",planto:"custo de produzir na ilha",tenho:"entra como custo zero",manual:"valor que você digitou"};
const CK_OPT=[["","Como o geral"],["inst","Compro na hora"],["ordem","Ordem de compra"],["planto","Produzo na ilha"],["tenho","Já tenho"],["manual","Valor manual"]];
/* o que plantar ou criar na ilha para N fornadas, com foco por ingrediente e onde o foco rende mais */
function ckFarmPlan(m,N){
  if(!FARM||!FZ_LOADED) return null;
  const rr=rrr(0.15,true,st.daily), rows=[], usos=[{nm:`Fabricar ${m.name} com foco`,spf:m.spf,craft:true}];
  for(const x of m.parts){ if(x.p.src!=="planto") continue;
    const U=Math.ceil(x.c*N*(1-rr)), nm=COOK.n[x.iid]||x.iid;
    const r=FARM.p.find(r=>r[1]===x.iid);
    if(r){ const [seed,,,chance,bonus,,npc,avg]=r, per=9*avg*(st.prem?2:1), lotes=Math.max(1,Math.ceil(U/per)), foc=!!(SRC.ckF||{})[x.iid];
      const sp=(fzBuy(seed,"seed",npc)||{p:0}).p, fc1=fzFocus(seed), gain=(Math.min(chance+bonus,2)-Math.min(chance,2))*sp, spf=fc1?gain/fc1:0;
      rows.push({iid:x.iid,nm,U,txt:`${fmt(lotes)} ${lotes>1?"lotes":"lote"} (${fmt(lotes*9)} sementes, uma colheita dá uns ${fmt(Math.round(lotes*per))})`,foc,focTxt:`regar gasta ${fmt(lotes*9*fc1)} de foco`,spf});
      usos.push({nm:`Regar ${nm}`,spf}); continue; }
    const q=FARM.pr.find(r=>r[1]===x.iid);
    if(q){ const pm=producerModel(q), an=Math.max(1,Math.ceil(U/q[3])); const f=pm&&fzFeedLots(pm.food,pm.food.n*an);
      rows.push({iid:x.iid,nm,U,txt:`${fmt(an)} ${an>1?"animais":"animal"} (${fzName(q[0])}) por 1 dia de coleta${f?`, com ${f.lotes} ${f.lotes>1?"lotes":"lote"} de ${fzName(pm.food.id)} para a ração`:""}`}); }
  }
  if(!rows.length) return null;
  const box=el("div",{class:"ck-farm"}); box.append(el("b",{class:"of-ct",text:`Na ilha para ${fmt(N)} ${N>1?"fornadas":"fornada"}`}));
  for(const r of rows){
    const l=el("div",{class:"ck-fl"}); const t=el("div"); t.append(el("b",{text:`${r.nm}: ${fmt(r.U)}`}),el("small",{class:"muted",text:` já contando o retorno`}),el("div",{class:"small",text:r.txt})); l.append(withIcon(r.iid,t));
    if(r.spf!=null){ const lab=el("label",{class:"chk ck-foc"}), cb=el("input",{type:"checkbox"}); cb.checked=r.foc;
      cb.addEventListener("click",ev=>ev.stopPropagation()); cb.addEventListener("change",()=>{ SRC.ckF=SRC.ckF||{}; if(cb.checked) SRC.ckF[r.iid]=true; else delete SRC.ckF[r.iid]; srcSave(); renderCook(); });
      lab.append(cb,` Regar com foco (${r.focTxt}; ${dec(r.spf)} de prata por foco)`); l.append(lab); }
    box.append(l); }
  const best=usos.filter(u=>u.spf>0).sort((a,b)=>b.spf-a.spf);
  if(best.length>1) box.append(el("p",{class:"small ck-fbest",text:`Onde o foco rende mais: ${best.map((u,i)=>`${i?"":"1º "}${u.nm} (${dec(u.spf)} por ponto)`).join(", depois ")}. Se o foco do dia não dá para tudo, gaste primeiro no que vem antes.`}));
  return box;
}
/* detalhe da receita: mesmo desenho do Mercado Negro (compras em vermelho, venda e lucro em verde), para N fornadas */
function cookPanel(m){
  const N=ckNFor(m)||ckN(), d=el("div",{class:"of-xp"}), left=el("div",{class:"of-xl"}), right=el("div",{class:"of-xs"}), city=COOK_CITY[m.kind];
  left.append(el("h4",{class:"of-xh",text:`${m.name} em ${city}${N>1?`, ${fmt(N)} fornadas`:""}`}));
  const hd=el("div",{class:"of-xr of-xhd"}); ["Stats","Item","Valor","Tempo","Cidade","Qtd"].forEach(x=>hd.append(el("span",{text:x}))); left.append(hd);
  const row=(kind,lab,id,nm,sub,val,qty,where)=>{ const r=el("div",{class:"of-xr "+kind}); r.append(el("span",{class:"of-pill "+kind,text:lab}));
    const it=el("span",{class:"of-xi"}); it.append(el("i",{class:"of-dot"+(kind==="buy"?" red":"")}),iconImg(id,34)); const n=el("span",{class:"of-xn"}); n.append(el("b",{text:nm})); if(sub) n.append(el("small",{text:sub})); it.append(n); r.append(it);
    r.append(el("b",{class:"of-xv",text:fmt(val)}),el("span",{class:"of-xt",text:"—"}),el("span",{class:"of-xc",text:where}),el("span",{class:"of-xq",text:qty})); return r; };
  left.append(row("sale","VENDA INST",m.id,m.name,"preço típico",m.item.p,`${fmt(m.q*N)}x`,city));
  for(const x of m.parts) left.append(row("buy",CK_PILL[x.p.src]||"COMPRA INST",x.iid,COOK.n[x.iid]||x.iid,CK_SUB[x.p.src]||"",x.p.p,`${fmt(x.c*N)}x`,x.p.src==="tenho"||x.p.src==="planto"?"—":city));
  /* de onde vem cada ingrediente: troca só este, por cima do geral */
  const box=el("div",{class:"ck-src"}); box.append(el("b",{class:"of-ct",text:"De onde vem cada ingrediente"}),el("span"));
  for(const x of m.parts){
    const sel=el("select",{"aria-label":"De onde vem "+(COOK.n[x.iid]||x.iid)}), cur=(SRC.ckO||{})[x.iid]||"";
    for(const [v,t] of CK_OPT){ if(v==="planto"&&FARM&&!isFarmItem(x.iid)) continue; const o=el("option",{value:v,text:t}); if(v===cur) o.selected=true; sel.append(o); }
    const man=el("input",{type:"number",min:"0",step:"1",placeholder:"prata cada",value:(SRC.ckM||{})[x.iid]!=null?String(SRC.ckM[x.iid]):""}); man.hidden=cur!=="manual"; man.setAttribute("aria-label","Valor manual de "+(COOK.n[x.iid]||x.iid));
    sel.addEventListener("click",ev=>ev.stopPropagation()); man.addEventListener("click",ev=>ev.stopPropagation());
    sel.addEventListener("change",()=>{ SRC.ckO=SRC.ckO||{}; if(sel.value) SRC.ckO[x.iid]=sel.value; else delete SRC.ckO[x.iid]; srcSave(); man.hidden=sel.value!=="manual"; if(sel.value==="manual"&&man.value==="") { man.focus(); return; } renderCook(); });
    man.addEventListener("change",()=>{ SRC.ckM=SRC.ckM||{}; if(man.value==="") delete SRC.ckM[x.iid]; else SRC.ckM[x.iid]=+man.value; srcSave(); renderCook(); });
    box.append(el("span",{text:COOK.n[x.iid]||x.iid}),el("span",{class:"ck-srcw"},sel,man));
  }
  left.append(box);
  { const fp=ckFarmPlan(m,N); if(fp) left.append(fp); }
  if(window.bagBtn){ const bg=el("div",{class:"ck-bag"}), sc0=bestCity(m.id,st.sell==="instant"?1:0,"max");
    const mats=()=>m.parts.map(x=>({id:x.iid,q:x.c*N,nm:COOK.n[x.iid]||x.iid,buy:x.p.p,buyC:city}));
    const prod=()=>[{id:m.id,q:m.q*N,nm:m.name,sell:m.item.p,sellC:sc0?sc0.c:city}];
    bg.append(bagBtn(mats,"Pôr os ingredientes na bag"),el("span",{text:`Ingredientes de ${fmt(N)} fornada${N>1?"s":""}`}),bagBtn(prod,"Pôr o que sai na bag"),el("span",{text:`${fmt(m.q*N)} ${m.kind==="f"?"porções":"poções"} prontas`}));
    left.append(bg); }
  const hist=el("div",{class:"hist"}), hh=el("div",{class:"hist-h"}); hh.append(el("span",{text:"Histórico de 30 dias"})); const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("viewBox","0 0 520 150"); svg.setAttribute("role","img"); const hn=el("p",{class:"tiny muted"}); hist.append(hh,svg,hn); left.append(hist);
  const card=(cls,title,lines,tot)=>{ const c=el("div",{class:"of-xcard "+cls}); c.append(el("h4",{class:"of-xh",text:title})); for(const [k,v] of lines){ const l=el("div",{class:"of-xline"}); l.append(el("span",{text:k}),el("b",{text:v})); c.append(l); } if(tot){ const l=el("div",{class:"of-xline of-xtot"}); l.append(el("span",{text:tot[0]}),el("b",{text:tot[1]})); c.append(l); } return c; };
  const rr=rrr(0.15,true,st.daily), bruto=m.q*m.item.p*N, fN=N>1?` (${fmt(N)} fornadas)`:"";
  right.append(card("cost","Custos detalhados (−)",[[`Ingredientes${fN}`,fmt(m.cost*N)],[`Retorno de recursos (${dec(rr*100)}%)`,"−"+fmt(m.cost*rr*N)],["Taxa da estação",fmt(m.fee*N)]],[N>1?"Custo total":"Custo da fornada",fmt((m.cost*(1-rr)+m.fee)*N)]));
  const lines=[[`Venda (${fmt(m.q*N)} × ${fmt(m.item.p)})`,fmt(bruto)],[`Taxas de venda (${dec(taxOf()*100)}%)`,"−"+fmt(bruto-m.net*N)],["Líquido da venda",fmt(m.net*N)],[N>1?"Foco no total":"Foco por fornada",fmt(focMix(N,m.fc,m.p1,m.p0).foc)]];
  if(N>1) lines.push(["Lucro por fornada",sgn(m.p1)]);
  lines.push(["Com 10.000 de foco",sgn(m.day)+" por dia"],["Por ponto de foco",dec(m.spf)+" pratas"]);
  const v=lfVol(m.id); if(v!=null&&v>=0) lines.push(["O mercado vende por dia",`${fmtU(v)} (você faz ${fmt(m.q*N)})`]);
  const sc=bestCity(m.id,st.sell==="instant"?1:0,"max"); if(sc) lines.push(["Melhor cidade para vender",`${sc.c}, ${fmt(sc.p)} cada`]);
  { const mx=focMix(N,m.fc,m.p1,m.p0); if(mx.parcial){ lines.push(["Com o teto de foco",mixTxt(mx)],["Sem foco, cada fornada dá",sgn(m.p0)]); }
  right.append(card(mx.tot<0?"res neg":"res",mx.tot<0?"Resultado (−)":"Resultado (+)",lines,[N>1?"Lucro total":"Lucro por fornada",sgn(mx.tot)])); }
  d.append(left,right); drawHistory(svg,hn,m.id,city); return d;
}
function bestCook(){ if(!COOK_LOADED) return []; const out=[]; for(const id in COOK.r){ const k=COOK.r[id][1]; if(((PF[k==="f"?"cozinha":"alquimia"]||{}).lv||0)===0) continue; const m=cookModel(id); if(m&&!m.miss&&!m.thin&&m.p1>0) out.push(m); } return out.sort((a,b)=>b.day-a.day); }
function renderCookRecs(){
  const box=$("recCook"); box.textContent="";
  const has=((PF.cozinha||{}).lv||0)+((PF.alquimia||{}).lv||0);
  if(!has){ box.append(el("li",{class:"empty",text:"Marque cozinha ou alquimia na sua ficha para ver o que rende mais."})); return; }
  if(!COOK_LOADED){ box.append(el("li",{class:"empty",text:"Buscando preços dos ingredientes…"})); ensureCook().then(ok=>{ if(ok){ renderCookRecs(); renderHero(); } }); return; }
  const c=bestCook(); if(!c.length){ box.append(el("li",{class:"empty",text:"Com os preços de agora, nada da cozinha ou da alquimia dá lucro com segurança."})); return; }
  c.slice(0,3).forEach(m=>box.append(recItem(`${m.name} em ${COOK_CITY[m.kind]}`,[`${sgn(m.p1)} por fornada de ${m.q}, uns ${fmtS(m.day)} com 10.000 de foco`,`Custo de foco ${fmt(m.fc)}. Venda típica ${fmt(m.item.p)} cada`,BUILD_FOOD.includes(m.id)?"As builds usam":null],m.id)));
}

/* ================= histórico ================= */
const HIST_CACHE={};
async function drawHistory(svg,note,id,city,q=1,rich=false,days=30){
  if(!svg) return; svg.innerHTML=""; if(rich&&svg.parentNode) svg.parentNode.hidden=false; note.textContent="Carregando histórico…";
  const key=id+"|"+city+(q>1?"|"+q:""); let rows=HIST_CACHE[key];
  if(!rows){ try{ const apiId=/_LEVEL(\d)/.test(id)?`${id}@${id.match(/_LEVEL(\d)/)[1]}`:id;
      const j=await apiJSON(`${HOST}/api/v2/stats/history/${apiId}.json?locations=${encodeURIComponent(city)}&time-scale=24`,360);
      rows=(j.find(x=>x.quality===q)||(q===1?j[0]:null)||{}).data||[]; HIST_CACHE[key]=rows; }catch(e){ rows=null; } }
  if(!rows||rows.length<(days<=7?2:3)){ if(rich&&svg.parentNode){ svg.parentNode.hidden=true; note.textContent=""; return; } note.textContent=`Sem histórico suficiente em ${city}${q>1?`, na qualidade ${QNAME[q].toLowerCase()}`:""}.`; return; }
  rows=rows.slice(-days);
  const W=rich?1100:520,H=rich?452:150,PL=rich?56:48,PR=rich?84:10,PT=rich?22:10,PB=rich?172:24, v=rows.map(r=>r.avg_price), lo=Math.min(...v), hi=Math.max(...v), pad=(hi-lo)*0.12||hi*0.05;
  const y0=lo-pad, y1=hi+pad, XP=rich?22:0, X=i=>PL+XP+i*(W-PL-PR-2*XP)/(rows.length-1), Y=p=>PT+(1-(p-y0)/(y1-y0))*(H-PT-PB);
  const ns="http://www.w3.org/2000/svg", mk=(t,a)=>{ const e=document.createElementNS(ns,t); for(const k in a) e.setAttribute(k,a[k]); return e; };
  for(const g of [y0+(y1-y0)*0.15,(y0+y1)/2,y1-(y1-y0)*0.15]){ svg.append(mk("line",{x1:PL,x2:W-PR,y1:Y(g),y2:Y(g),stroke:"var(--line-soft)","stroke-width":1}));
    const t=mk("text",{x:PL-6,y:Y(g)+4,"text-anchor":"end","font-size":11,fill:"var(--smoke)"}); t.textContent=fmtS(g); svg.append(t); }
  const d=v.map((p,i)=>`${i?"L":"M"}${X(i).toFixed(1)} ${Y(p).toFixed(1)}`).join(" ");
  svg.append(mk("path",{d:`${d} L${X(v.length-1)} ${H-PB} L${X(0)} ${H-PB} Z`,fill:"var(--saffron)",opacity:.1}));
  const line=mk("path",{d,fill:"none",stroke:"var(--saffron)","stroke-width":2,"stroke-linejoin":"round","stroke-linecap":"round"}); svg.append(line);
  const dot=mk("circle",{cx:X(v.length-1),cy:Y(v[v.length-1]),r:4,fill:"var(--saffron)",stroke:"var(--cloth)","stroke-width":2}); svg.append(dot);
  [[0,"start"],[rows.length-1,"end"]].forEach(([i,a])=>{ const t=mk("text",{x:X(i),y:H-6,"text-anchor":a,"font-size":11,fill:"var(--smoke)"}); t.textContent=new Date(rows[i].timestamp+"Z").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}); svg.append(t); });
  const cross=mk("line",{y1:PT,y2:H-PB,stroke:"var(--parch-2)","stroke-width":1,opacity:0}); const hd=mk("circle",{r:4,fill:"var(--parch)",opacity:0}); svg.append(cross,hd);
  const hit=mk("rect",{x:PL,y:PT,width:W-PL-PR,height:H-PT-PB,fill:"transparent"}); svg.append(hit);
  const at=ev=>{ const b=svg.getBoundingClientRect(); const sx=(ev.clientX-b.left)*W/b.width; const i=Math.max(0,Math.min(rows.length-1,Math.round((sx-PL-XP)/((W-PL-PR-2*XP)/(rows.length-1))))); return i; };
  hit.addEventListener("pointermove",ev=>{ const i=at(ev); cross.setAttribute("x1",X(i)); cross.setAttribute("x2",X(i)); cross.setAttribute("opacity",.6); hd.setAttribute("cx",X(i)); hd.setAttribute("cy",Y(v[i])); hd.setAttribute("opacity",1);
    showTip([["v",`${fmt(v[i])} pratas`],["",new Date(rows[i].timestamp+"Z").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})],["k",`${fmt(rows[i].item_count)} vendidos no dia em ${city}`]],ev.clientX,ev.clientY); });
  hit.addEventListener("pointerleave",()=>{ cross.setAttribute("opacity",0); hd.setAttribute("opacity",0); tip.hidden=true; });
  if(rich){   /* versão do Mercado Negro: linha da média, mínimo, máximo, valor de agora e quadros de resumo */
    svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
    /* barras: peças vendidas por dia (altura proporcional), embaixo do preço */
    const lbl=(x,y,txt,fill,anc="start",fw=700)=>{ const t=mk("text",{x,y,"text-anchor":anc,"font-size":11.5,"font-weight":fw,fill}); t.textContent=txt; svg.append(t); };
    const cnt=rows.map(r=>r.item_count||0), cmx=Math.max(1,...cnt), yb=H-22, bhm=98, bw=Math.max(3,Math.min(26,(W-PL-PR)/rows.length*0.62)), bars=[], cts=[];
    svg.append(mk("line",{x1:PL,x2:W-PR,y1:yb,y2:yb,stroke:"var(--line-soft)","stroke-width":1}));
    cnt.forEach((c,i)=>{ const h=c?Math.max(2,c/cmx*bhm):0, b=mk("rect",{x:X(i)-bw/2,y:yb-h,width:bw,height:h,rx:2,fill:"var(--saffron)",opacity:.6,"pointer-events":"none"}); svg.append(b); bars.push(b); if(c&&(rows.length<=16||bw>=16)){ const ct=mk("text",{x:X(i),y:yb-h-4,"text-anchor":"middle","font-size":rows.length>16?11:13,"font-weight":800,fill:"var(--parch)","pointer-events":"none"}); ct.textContent=fmt(c); ct.setAttribute("stroke","#0d0a08"); ct.setAttribute("stroke-width",3.5); ct.setAttribute("paint-order","stroke"); cts.push(ct); } });
    { const ca=cnt.reduce((a,b)=>a+b,0)/cnt.length, cy=yb-ca/cmx*bhm; svg.append(mk("line",{x1:PL,x2:W-PR,y1:cy,y2:cy,stroke:"var(--parch-2)","stroke-width":1.2,"stroke-dasharray":"5 4",opacity:.8,"pointer-events":"none"})); lbl(W-PR+8,cy-3,"média","var(--parch-2)","start",500); lbl(W-PR+8,cy+10,dec(ca)+" /dia","var(--parch-2)","start",700); cts.forEach(t=>svg.append(t)); }
    { const t3=mk("text",{x:PL,y:yb-bhm-26,"text-anchor":"start","font-size":10.5,"font-weight":700,fill:"var(--smoke)"}); t3.textContent="PEÇAS VENDIDAS POR DIA";t3.setAttribute("font-size",12.5);t3.setAttribute("fill","var(--saffron)"); svg.append(t3); const t4=mk("text",{x:PL,y:PT-8,"text-anchor":"start","font-size":10.5,"font-weight":700,fill:"var(--smoke)"}); t4.textContent="PREÇO MÉDIO PAGO NO DIA"; svg.append(t4); }
    const nt=Math.min(rows.length,rows.length>14?7:rows.length); for(let k=1;k<nt-1;k++){ const i=Math.round(k*(rows.length-1)/(nt-1)); const t=mk("text",{x:X(i),y:H-6,"text-anchor":"middle","font-size":9.5,fill:"var(--smoke)",opacity:.75}); t.textContent=new Date(rows[i].timestamp+"Z").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}); svg.append(t); }
    cross.setAttribute("y2",yb); hit.setAttribute("height",yb-PT);
    hit.addEventListener("pointermove",ev=>{ const i=at(ev); bars.forEach((b,k)=>b.setAttribute("opacity",k===i?1:.6)); });
    hit.addEventListener("pointerleave",()=>bars.forEach(b=>b.setAttribute("opacity",.6)));
    const mn=Math.min(...v), mx=Math.max(...v), av=v.reduce((a,b)=>a+b,0)/v.length, nw=v[v.length-1], dv=(nw-av)/av*100, col=nw<av*0.93?"#6cc06a":nw>av*1.07?"#e8963f":"var(--parch-2)";
    svg.append(mk("line",{x1:PL,x2:W-PR,y1:Y(av),y2:Y(av),stroke:"var(--parch-2)","stroke-width":1.2,"stroke-dasharray":"5 4",opacity:.7})); { let ay=Y(av), ny=Y(nw); if(Math.abs(ay-ny)<30) ay=ny+(ay>=ny?1:-1)*30; lbl(W-PR+8,ay-3,"média","var(--parch-2)","start",500); lbl(W-PR+8,ay+10,fmt(Math.round(av)),"var(--parch-2)","start",700); }
    const iMn=v.indexOf(mn), iMx=v.indexOf(mx);
    [[iMx,mx,"#e8963f",-9],[iMn,mn,"#6cc06a",16]].forEach(([i,val,c,dy])=>{ svg.append(mk("circle",{cx:X(i),cy:Y(val),r:4,fill:c,stroke:"var(--cloth)","stroke-width":1.5})); lbl(Math.min(Math.max(X(i),PL+26),W-PR-26),Y(val)+dy,fmt(val),c,"middle"); });
    dot.setAttribute("r",5.5); dot.setAttribute("fill",col);
    const tg=mk("g",{}); const bx=W-PR+6, by=Y(nw); const rc=mk("rect",{x:bx,y:by-11,width:PR-8,height:22,rx:5,fill:col}); tg.append(rc); svg.append(tg); const tt=mk("text",{x:bx+(PR-8)/2,y:by+4,"text-anchor":"middle","font-size":11.5,"font-weight":800,fill:"#1b1410"}); tt.textContent=fmtS(nw); svg.append(tt);
    const old=svg.parentNode.querySelector(".hist-tiles"); if(old) old.remove();
    const tl=el("div",{class:"hist-tiles"}); const tile=(k,val,sub,c)=>{ const d=el("div",{class:"hist-tile"}); d.append(el("small",{text:k}),el("b",{text:val,style:c?`color:${c}`:""})); if(sub) d.append(el("em",{text:sub})); tl.append(d); };
    tile("Agora",fmt(nw),`${dv>=0?"+":""}${dec(dv)}% vs média`,col); tile("Média",fmt(Math.round(av)),`${rows.length} dias`); tile("Menor",fmt(mn),"mais barato do período","#6cc06a"); tile("Maior",fmt(mx),"mais caro do período","#e8963f"); { const tot=cnt.reduce((a,b)=>a+b,0); tile("Vendidos",fmt(tot),`${dec(tot/rows.length)} por dia`); }
    svg.parentNode.insertBefore(tl,svg);
  }
  const chg=(v[v.length-1]-v[0])/v[0]*100, avg=v.reduce((a,b)=>a+b,0)/v.length, now=v[v.length-1];
  note.textContent=`Média de ${fmt(avg)} em ${rows.length} dias em ${city}; ${chg>=0?"subiu":"caiu"} ${dec(Math.abs(chg))}%. ${now<avg*0.93?"Está abaixo da média: bom momento para comprar.":now>avg*1.07?"Está acima da média: bom momento para vender.":"Está perto da média."}`;
  if(window.gsap&&window.DrawSVGPlugin&&!RM){ gsap.fromTo(line,{drawSVG:"0%"},{drawSVG:"100%",duration:1.1,ease:"power2.inOut"}); gsap.from(dot,{scale:0,transformOrigin:"50% 50%",duration:.4,delay:1,ease:"back.out(3)"}); }
}

/* ================= mapas ================= */
let ZONES = [];                     // data/zones.json: {i,n,b,t,r,q,w,res}
const BIOME_PT = {FR:"floresta",SW:"pântano",MN:"montanha",HL:"terras altas",ST:"estepe"};
const FISH_TO_BIOME = {FOREST:"FR",STEPPE:"ST",MOUNTAIN:"MN",HIGHLANDS:"HL",SWAMP:"SW"};
const MAIN_BIOME = {ORE:"MN",FIBER:"SW",HIDE:"ST",WOOD:"FR",ROCK:"HL"};
const GATHER_KEY = {minerio:"ORE",fibra:"FIBER",pelego:"HIDE",madeira:"WOOD",pedra:"ROCK"};
const zoneLine = z => `${z.n}: ${BIOME_PT[z.b]} T${z.t}, ${z.r==="ROY"?"continente real":`Zona Preta, qualidade ${z.q||"?"}`}`;
function fishToday(){
  const g=PF.coleta.pesca||{}, maxT=Math.max(3,Math.min(7,g.tier||7)); const out=[];
  for(const t of [7,5,3].filter(x=>x<=maxT)){ for(const [b,n] of FISH_BIOMES){ const p=typical(`T${t}_FISH_FRESHWATER_${b}_RARE`,0); if(p) out.push({b,n,t,p}); } }
  return out.sort((a,b)=>b.p.p-a.p.p);
}
let mapRes=null;
function renderMaps(){
  const fb=$("mapFish"); fb.textContent="";
  const f=fishToday();
  if(!f.length){ fb.append(el("p",{class:"muted",text:"Sem preço de peixe raro agora. Tente atualizar os preços."})); }
  const shown=new Set(); let rank=0; const ol=el("ol",{class:"recs"});
  for(const x of f){ if(rank>=3) break; const code=FISH_TO_BIOME[x.b];
    if(!code){ ol.append(recItem(`Raro de ${x.n} T${x.t}: ${fmt(x.p.p)} cada`,[x.b==="AVALON"?"Sai nas Estradas de Avalon, nos lagos dos corredores.":"Sai nas Ancient Lands, pelos portais do Dragonfire."],`T${x.t}_FISH_FRESHWATER_${x.b}_RARE`)); rank++; continue; }
    if(shown.has(code)) continue; shown.add(code);
    const zs=ZONES.filter(z=>z.b===code&&z.t>=x.t&&z.w>0).sort((a,b)=>(b.w-a.w)||(a.r==="ROY"?-1:1)||(b.t-a.t)).slice(0,3);
    ol.append(recItem(`Raro de ${x.n} T${x.t}: ${fmt(x.p.p)} cada`,[zs.length?`Mapas de ${BIOME_PT[code]} T${x.t}+ com mais lagos:`:`Procure zonas de ${BIOME_PT[code]} T${x.t} ou mais.`,...zs.map(zoneLine)],`T${x.t}_FISH_FRESHWATER_${x.b}_RARE`)); rank++; }
  fb.append(ol);
  const eel=typical("T8_MEAL_STEW_FISH",0), fishEel=typical("T7_FISH_FRESHWATER_FOREST_RARE",0);
  if(eel&&fishEel) fb.append(el("p",{class:"tiny muted",text:`Dica de cozinha: o Guisado de Enguia de Água-podre (comida das builds) usa 1 Enguia de Água-podre T7 da floresta e vende a ${fmt(eel.p)}; o peixe sozinho vale ${fmt(fishEel.p)}.`}));
  // gathering
  const seg=$("mapResSeg"); seg.textContent="";
  const opts=[["minerio","Minério"],["fibra","Fibra"],["pelego","Pelego"],["madeira","Madeira"],["pedra","Pedra"]];
  if(!mapRes){ const mine=opts.find(([k])=>(PF.coleta[k]||{}).tier>=4); mapRes=mine?mine[0]:"minerio"; }
  opts.forEach(([k,n])=>{ const b=el("button",{type:"button",text:n,"aria-pressed":String(k===mapRes)}); b.addEventListener("click",()=>{ mapRes=k; renderMaps(); }); seg.append(b); });
  const gb=$("mapGather"); gb.textContent="";
  const base=GATHER_KEY[mapRes], bio=MAIN_BIOME[base], tier=Math.max(4,(PF.coleta[mapRes]||{}).tier||6);
  const prices=[0,1,2,3,4].map(e=>typical(idOf(tier,base,e),0)).map(p=>p?fmt(p.p):"—");
  gb.append(el("p",{class:"small",text:`${opts.find(o=>o[0]===mapRes)[1]} é o recurso principal da ${BIOME_PT[bio]}. No seu tier (T${tier}), cada unidade vale ${prices.join(", ")} nos encantamentos .0 a .4.`}));
  const roy=ZONES.filter(z=>z.b===bio&&z.r==="ROY"&&z.t>=tier).sort((a,b)=>(b.res-a.res)||(a.t-b.t)).slice(0,3);
  const out=ZONES.filter(z=>z.b===bio&&z.r==="OUT"&&z.t>=tier).sort((a,b)=>((b.q||0)-(a.q||0))||(b.res-a.res)||(a.t-b.t)).slice(0,3);
  const ol2=el("ol",{class:"recs"});
  if(roy.length) ol2.append(recItem("No continente real",roy.map(zoneLine)));
  if(out.length) ol2.append(recItem("Na Zona Preta (mais recompensa, mais risco)",[...out.map(zoneLine),"Qualidade mais alta paga mais e é mais patrulhada. Vale entrar pelo Portal S.A.F.E."]));
  if(!roy.length&&!out.length) ol2.append(el("li",{class:"empty",text:"Nenhuma zona encontrada para esse recurso e tier."}));
  gb.append(ol2);
  if(window.gsap&&!RM) gsap.from($("p-mapas").querySelectorAll("ol.recs li"),{autoAlpha:0,y:10,stagger:.05,duration:.35,clearProps:"all"});
}
function renderGo(){
  const box=$("recGo"); box.textContent="";
  const f=fishToday()[0];
  if(f&&(PF.coleta.pesca||{}).tier>=1){ const code=FISH_TO_BIOME[f.b]; const z=code?ZONES.filter(z=>z.b===code&&z.t>=f.t&&z.w>0).sort((a,b)=>b.w-a.w)[0]:null;
    box.append(recItem(`Pescar: raro de ${f.n} T${f.t}`,[`${fmt(f.p.p)} cada`, z?`Ex.: ${zoneLine(z)}`:(f.b==="AVALON"?"Estradas de Avalon":"Ancient Lands")],`T${f.t}_FISH_FRESHWATER_${f.b}_RARE`)); }
  for(const [k,n] of GATHER){ const g=PF.coleta[k]; const base=GATHER_KEY[k]; if(!base||!g||!(g.tier>=4)) continue;
    const bio=MAIN_BIOME[base]; const z=ZONES.filter(z=>z.b===bio&&z.r==="OUT"&&z.t>=g.tier).sort((a,b)=>((b.q||0)-(a.q||0))||(b.res-a.res))[0];
    const p=typical(idOf(g.tier,base,1),0);
    box.append(recItem(`Coletar ${n.toLowerCase()} T${g.tier}`,[p?`T${g.tier}.1 a ${fmt(p.p)} por unidade`:null, z?`Ex.: ${zoneLine(z)}`:null],idOf(g.tier,base,1))); }
  if(!box.children.length) box.append(el("li",{class:"empty",text:"Marque coleta ou pesca na sua ficha para ver os mapas recomendados."}));
  const more=el("li",{class:"empty"}); const b=el("button",{type:"button",class:"linkbtn",text:"Ver todos os mapas"}); b.addEventListener("click",()=>showTab("t-mapas")); more.append(b); box.append(more);
}

/* ================= builds semanais ================= */
async function loadBuilds(){ try{ const r=await fetch("builds.json",{cache:"no-store"}); if(!r.ok) return; const j=await r.json(); if(Array.isArray(j.builds)&&j.builds.length>20){ BUILDS=j.builds; BUILDS_DATE=j.atualizado||""; renderBuilds(); renderRecs(); } }catch(e){} }
let BUILDS_DATE="";

/* link da ficha: o código vai depois do # e não sai do navegador */
function fichaCode(){ return btoa(unescape(encodeURIComponent(JSON.stringify(PF)))); }
$("pfLink").addEventListener("click",()=>{ const url=`${location.origin}${location.pathname}#ficha=${fichaCode()}`;
  const done=()=>$("pfStatus").textContent="Link copiado. Abra em outro aparelho para usar a mesma ficha, ou mande para um amigo usar de base.";
  try{ navigator.clipboard.writeText(url).then(done,()=>{ $("pfPasteBox").hidden=false; $("pfPaste").value=url; $("pfPaste").select(); $("pfStatus").textContent="Copie o link selecionado abaixo."; }); }catch(e){ $("pfPasteBox").hidden=false; $("pfPaste").value=url; } });
function importFromHash(){
  const m=location.hash.match(/^#ficha=([A-Za-z0-9+/=]+)/); if(!m) return;
  let o=null; try{ o=JSON.parse(decodeURIComponent(escape(atob(m[1])))); }catch(e){} history.replaceState(null,"",location.pathname);
  if(!o||typeof o!=="object") return;
  const box=el("div",{class:"banner big importbox"}); box.append(el("b",{text:`Abrir a ficha de ${o.nome||"alguém"} neste navegador?`}),document.createTextNode(IS_EXAMPLE?" Você ainda não tem ficha aqui.":" Isso substitui a ficha que está salva aqui."));
  const yes=el("button",{type:"button",class:"btn",text:"Usar esta ficha"}), no=el("button",{type:"button",class:"btn ghost",text:"Agora não"});
  yes.addEventListener("click",()=>{ PF=Object.assign(EMPTY(),migrate(o)); saveProfile(); renderProfile(); box.remove(); showTab("t-ficha"); });
  no.addEventListener("click",()=>box.remove());
  box.append(el("div",{class:"btnrow"},yes,no)); const p=$("p-voce"); p.prepend(box); showTab("t-voce",true);
}

/* Árvore da fazenda, da cozinha e da caçada: mesmo padrão do Combate. Cada maestria é um cartão (maestria, itens com spec, maior nível, "usa até T");
   os cartões ficam sob o nó que os libera (Sous Chef, Ceifeiro, Rastreador aprendiz). Clicar no cartão abre os campos de cada especialização. */
const ARV_OPEN = new Set();
const PEGADAS='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="7.6" cy="16.2" rx="2.7" ry="3.4"/><circle cx="4.6" cy="11.4" r="1.15"/><circle cx="7.2" cy="9.9" r="1.2"/><circle cx="9.9" cy="10.4" r="1.15"/><circle cx="11.6" cy="12.6" r="1"/><ellipse cx="16.6" cy="8.6" rx="2.5" ry="3.2"/><circle cx="13.8" cy="4.2" r="1.05"/><circle cx="16.2" cy="2.9" r="1.1"/><circle cx="18.7" cy="3.4" r="1.05"/><circle cx="20.2" cy="5.5" r=".95"/></svg>';
const pegadas=()=>{ const sp=el("span",{class:"arv-pata","aria-hidden":"true"}); sp.innerHTML=PEGADAS; return sp; };
const CACA=[["PANTHER","Pantera das Sombras"],["ENT","Espírito Arbóreo"],["DIREBEAR","Urso Espiritual"],["WEREWOLF","Lobisomem"],["IMP","Diabrete Infernal"],["ELEMENTAL_ROCK","Golem de Pedra Rúnica"],["EAGLE","Águia da Alvorada"],["FACTION_MOB","Presa Rara"]];
/* monta uma seção inteira (Fazenda/cozinha ou Caçada) dentro de `box`; `def(ctx)` devolve as subseções [{id,nome,gate,cartoes}] */
function arvoreSecao(box,sumId,def){ if(!box||!SPECS) return; if(box.contains(document.activeElement)&&document.activeElement.tagName==="INPUT") return; box.textContent="";
  const reg=[], cards=[], subs=[], retierAll=()=>reg.forEach(r=>r.im._tier(r.tier()));
  const geral=()=>{ const on=cards.filter(c=>c.d.classList.contains("has")).length, sm=$(sumId); if(sm){ sm.textContent=on?`${on} de ${cards.length} com spec`:"sem spec"; sm.classList.toggle("on",on>0); sm.style.setProperty("--p",(cards.length?Math.round(on/cards.length*100):0)+"%"); } };
  const refresh=()=>{ cards.forEach(c=>c.upd()); subs.forEach(sn=>{ const on=sn._cs.filter(c=>c.d.classList.contains("has")).length; sn._cnt.textContent=on?`${on} de ${sn._cs.length} com spec`:""; sn._cnt.classList.toggle("on",!!on); sn._cnt.style.setProperty("--p",(sn._cs.length?Math.round(on/sn._cs.length*100):0)+"%"); }); geral(); };
  const salvar=()=>{ saveProfile(); retierAll(); refresh(); };
  const ico=(code,tier,gate)=>{ const im=itemImg(code,tier&&tierOrder(typeof tier==="function"?tier():tier),gate!==false&&typeof tier==="function"); if(typeof tier==="function") reg.push({im,tier}); return im; };
  const cartao=o=>{ const d=el("details",{class:"spg"}), sm=el("summary"), sumS=el("span",{class:"sps"}); sm.append(o.ic(),el("span",{class:"spn",text:o.nome}),sumS); d.append(sm);
    const vals=()=>o.itens.map(([c])=>+o.getV(c)||0).filter(v=>v>0);
    const upd=()=>{ const v=vals(), m=o.getM()||0, any=m>0||v.length>0; sumS.textContent=""; const chip=(t,c)=>sumS.append(el("span",{class:"spchip "+(c||""),text:t}));
      if(!any) chip("sem spec","off"); else { if(m) chip("Maestria "+m,"m"); if(v.length) chip(`${v.length}/${o.itens.length} itens`,"n"); if(v.length) chip("Maior "+Math.max(...v),"mx"); if(o.tier) chip("Usa até T"+o.tier(),"t"); }
      d.style.setProperty("--p",Math.round(v.length/o.itens.length*100)+"%"); d.classList.toggle("has",any); sumS.classList.toggle("on",any); };
    let built=false; const body=el("div",{class:"spgrid"}); d.append(body);
    d.addEventListener("toggle",()=>{ if(d.open) ARV_OPEN.add(o.id); else ARV_OPEN.delete(o.id); if(!d.open||built) return; built=true;
      body.append(tagIn("Maestria",numIn(o.getM()||0,o.mmax||100,"Maestria de "+o.nome,v=>{ o.setM(v); salvar(); },"—"),o.semIcCorpo?null:o.ic()));
      o.itens.forEach(([c,label,ic])=>{ body.append(tagIn(label,numIn(+o.getV(c)||0,o.max||100,`${o.nome}: ${label}`,v=>{ o.setV(c,v); salvar(); },"—"),ic?ic(o.tier):null)); }); });
    d.open=ARV_OPEN.has(o.id); const card={d,upd}; cards.push(card); upd(); return card; };
  const porta=(rot,get,set)=>{ const l=el("div",{class:"arv-porta"}), b=el("button",{type:"button",class:"arv-tg"}); const pinta=()=>{ const v=get(); b.textContent=v===undefined?"—/1":`${v?1:0}/1`; b.classList.toggle("on",v>0); b.setAttribute("aria-pressed",v>0?"true":"false"); };
    pinta(); b.addEventListener("click",()=>{ set(get()>0?0:1); pinta(); salvar(); }); l.append(el("span",{text:rot}),b); return l; };
  for(const sd of def({ico,cartao,porta})){ const sn=el("details",{class:"spsubn"}), ss=el("summary"), cnt=el("span",{class:"secsum"}); ss.append(el("span",{text:sd.nome}),cnt); sn.append(ss);
    if(sd.nota) sn.append(el("p",{class:"tiny muted arv-nota",text:sd.nota})); if(sd.gate) sn.append(sd.gate);
    const grid=el("div",{class:"spgroups"}); sn.append(grid); sn._cnt=cnt; sn._cs=sd.cartoes.map(f=>f()); sn._cs.forEach(c=>grid.append(c.d)); sn.open=true; subs.push(sn); box.append(sn); }
  refresh(); }
function renderArvore(){ arvoreSecao($("pfArvore"),"arvSum",({ico,cartao,porta})=>{
  const gF=["z:plantas","z:ervas","z:animais"], gC=["cozinha","alquimia"];
  const gateF=()=>gF.map(k=>(PF.sp||{})[k]&&(PF.sp[k]||{}).t2).find(v=>v!==undefined), gateC=()=>gC.map(k=>(PF[k]||{}).t2).find(v=>v!==undefined);
  const faz=(k,nome,id)=>()=>{ const g=SPECS.g.find(x=>x.k===k), tier=()=>iconTier(spMastery(k),spGet(k).t2);
    return cartao({id,nome,ic:()=>ico(repKey(g),tier,false),itens:g.it.map(([c,l])=>[c,l,t=>ico(c,t)]),getM:()=>spMastery(k),setM:v=>spSetMastery(k,v),mmax:g.mmax||100,max:g.max||100,
      getV:c=>(spGet(k).s||{})[c],setV:(c,v)=>{ const st=spEnsure(k); st.s=st.s||{}; if(v) st.s[c]=v; else delete st.s[c]; },tier}); };
  const coz=(k,nome,kind,id,ic)=>()=>{ const cur=()=>(PF[k]=PF[k]||{m:0,s:{}}), tier=()=>iconTier(cur().m||0,cur().t2);
    return cartao({id,nome,ic:()=>ic(tier),itens:COOK_NODES[kind].map(([tp,l,code])=>[tp,l,t=>ico(code,t)]),getM:()=>cur().m||0,setM:v=>{ cur().m=v; },mmax:100,max:100,
      getV:tp=>{ const c=cur(); return (c.s||{})[tp]??c.all??0; },setV:(tp,v)=>{ const c=cur(); c.s=c.s||{}; c.s[tp]=v; },tier}); };
  return [
    {nome:"Cozinha e alquimia (Sous Chef)",nota:"Fazendeiro aprendiz (1/1) libera o T1. O Sous Chef libera o T2 e abre as duas maestrias.",
      gate:porta("Sous Chef liberado (libera o T2)",gateC,v=>gC.forEach(k=>{ (PF[k]=PF[k]||{m:0,s:{}}).t2=v; })),
      cartoes:[coz("cozinha","Mestre-cuca","f","c-mc",()=>itemImg("MEAL_SOUP",[1])),coz("alquimia","Alquimista","p","c-alq",t=>ico("POTION_HEAL",t,false))]},
    {nome:"Fazenda (Ceifeiro)",nota:"O Ceifeiro libera o T2 e abre as três maestrias da fazenda.",
      gate:porta("Ceifeiro liberado (libera o T2)",gateF,v=>gF.forEach(k=>{ spEnsure(k).t2=v; })),
      cartoes:[faz("z:ervas","Herborista","c-her"),faz("z:plantas","Fazendeiro","c-faz"),faz("z:animais","Criador de animais","c-cri")]}]; }); }
/* Caçada: a maestria desbloqueia os kits de rastreamento (T?_2H_TOOL_TRACKING, o tier segue a maestria); cada especialização é o rastreio de um tipo de criatura
   e usa o item que ela solta. Presa Rara: a sacola de prata (T1 a T8). */
const CACA_ITEM={PANTHER:"ALCHEMY_RARE_PANTHER",ENT:"ALCHEMY_RARE_ENT",DIREBEAR:"ALCHEMY_RARE_DIREBEAR",WEREWOLF:"ALCHEMY_RARE_WEREWOLF",IMP:"ALCHEMY_RARE_IMP",ELEMENTAL_ROCK:"ALCHEMY_RARE_ELEMENTAL",EAGLE:"ALCHEMY_RARE_EAGLE",FACTION_MOB:"SILVERBAG_NONTRADABLE"};
function renderCaca(){ arvoreSecao($("pfCaca"),"cacaSum",({ico,cartao})=>{ const rast=()=>spEnsure("z:rastreio"), tier=()=>tierFromMastery(spGet("z:rastreio").m||0);
  return [{nome:"Rastreador aprendiz (1/1)",cartoes:[()=>cartao({id:"c-rast",nome:"Rastreador experiente",ic:()=>ico("2H_TOOL_TRACKING",tier,false),
    itens:CACA.map(([c,l])=>[c,l,CACA_ITEM[c]?t=>ico(CACA_ITEM[c],t,false):pegadas]),tier,getM:()=>spGet("z:rastreio").m||0,setM:v=>{ rast().m=v; },mmax:100,max:100,
    getV:c=>(spGet("z:rastreio").s||{})[c],setV:(c,v)=>{ const st=rast(); st.s=st.s||{}; if(v) st.s[c]=v; else delete st.s[c]; }})]}]; }); }
