
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
  metal:{raw:"ORE",ref:"METALBAR",city:"Thetford",rawName:"Minério",refName:"Barra de metal",prevName:"Barra",note:"Thetford tem o bônus de refino de minério. O minério vem barato de Fort Sterling, Martlock e Bridgewatch."},
  cloth:{raw:"FIBER",ref:"CLOTH",city:"Lymhurst",rawName:"Fibra (linho)",refName:"Tecido",prevName:"Tecido",note:"Lymhurst tem o bônus de refino de fibra."},
  leather:{raw:"HIDE",ref:"LEATHER",city:"Martlock",rawName:"Pelego",refName:"Couro",prevName:"Couro",note:"Martlock tem o bônus de refino de pelego."}
};
const N = {4:2,5:3,6:4,7:5,8:5};
const FOCUS_REF = [[54,94,164,287],[94,164,287,503],[164,287,503,880],[287,503,880,1539],[503,880,1539,2694]];
const FOCUS_CRAFT = [[429,750,1313,2298],[750,1313,2298,4021],[1313,2298,4021,7037],[2298,4021,7037,12315],[4021,7037,12315,21551]]; // elmo e botas; peito = ×2
const IV = (t,e)=>Math.pow(2,t+e);
const MATBAR = {PLATE:"METALBAR",LEATHER:"LEATHER",CLOTH:"CLOTH"};
const SETN = {PLATE:["Soldier","Knight","Guardian"],LEATHER:["Mercenary","Hunter","Assassin"],CLOTH:["Scholar","Cleric","Mage"]};
const SLOTN = {PLATE:{HEAD:"Helmet",ARMOR:"Armor",SHOES:"Boots"},LEATHER:{HEAD:"Hood",ARMOR:"Jacket",SHOES:"Shoes"},CLOTH:{HEAD:"Cowl",ARMOR:"Robe",SHOES:"Sandals"}};
const CRAFT_PT = {HEAD_PLATE:"Elmo de placa",HEAD_LEATHER:"Capuz de couro",HEAD_CLOTH:"Capucha de pano",ARMOR_PLATE:"Peitoral de placa",ARMOR_LEATHER:"Jaqueta de couro",ARMOR_CLOTH:"Robe de pano",SHOES_PLATE:"Botas de placa",SHOES_LEATHER:"Sapatos de couro",SHOES_CLOTH:"Sandálias de pano"};
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
  for(const k in PF.coleta){ const g=PF.coleta[k]; if(g.s){ let top=0; for(let t=2;t<=8;t++) if((g.s[t]||0)>0) top=t; g.tier=top&&g.s[top]>=100&&top<8?top+1:top; g.n=top?g.s[top]:0; } g.lv=band(g.n); }
  PF.sp=PF.sp||{}; for(const mat in ARMAT){ let v=0; for(const slot of ["HEAD","ARMOR","SHOES"]){ const g=PF.sp[`c:${slot}_${mat}`]; if(g) v=Math.max(v,g.m||0,...Object.values(g.s||{})); } PF.armaduras[ARMAT[mat]]=v; }
  for(const k in PF.refino){ const r=PF.refino[k]; r.lv=r.obs>0?2:band(Math.max(r.m||0,...Object.values(r.s||{}))); }
  for(const k in PF.craft){ const r=PF.craft[k]; r.lv=r.obs>0?2:band(Math.max(r.m||0,...Object.values(r.s||{}))); }
  for(const k of ["cozinha","alquimia"]){ const r=PF[k]||(PF[k]={m:0,s:{}}); r.lv=band(Math.max(r.m||0,r.all||0,...Object.values(r.s||{}))); }
}
function loadProfile(){ try{ const s=store.get("ficha"); if(s){ PF=migrate(Object.assign({},JSON.parse(s))); PF=Object.assign(EMPTY(),PF); PF.v=3; IS_EXAMPLE=false; deriveLv(); return; } }catch(e){} PF=OLERAN(); IS_EXAMPLE=true; deriveLv(); }
function toast(msg){ const t=$("toast"); t.textContent=msg; t.hidden=false; clearTimeout(toast._h);
  if(window.gsap&&!RM) gsap.fromTo(t,{y:16,opacity:0},{y:0,opacity:1,duration:.3,ease:"back.out(2)"}); toast._h=setTimeout(()=>{ if(window.gsap&&!RM) gsap.to(t,{opacity:0,y:10,duration:.25,onComplete:()=>t.hidden=true}); else t.hidden=true; },1800); }
function saveProfile(){ IS_EXAMPLE=false; deriveLv(); store.set("ficha",JSON.stringify(PF)); $("pfStatus").textContent="Ficha salva neste navegador."; toast("Ficha guardada no livro"); coinBurst(); renderWho(); recompute(); }
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
function typical(id, field){ const r=DATA.itens[id]; if(!r) return null; const pts=Object.entries(r).filter(([c,v])=>v[field]>0).map(([c,v])=>({c,p:v[field],t:v[field+2]||0})); if(!pts.length) return null; return {p:median(pts.map(x=>x.p)), n:pts.length, t:Math.max(...pts.map(x=>x.t))||snapTime()}; }
/* idade dos preços e ícones dos itens */
const snapTime = () => DATA.geradoEm && !LIVE ? Date.parse(DATA.geradoEm) : 0;
function fmtAge(t){ if(!t) return ""; const h=(Date.now()-t)/3600e3; return h<1 ? `${Math.max(1,Math.round(h*60))} min` : h<48 ? `${Math.round(h)}h` : `${Math.round(h/24)} dias`; }
const ageSpan = t => t ? el("span",{class:"age"+((Date.now()-t)>12*3600e3?" old":""),text:fmtAge(t)}) : null;
const ICON = id => `https://render.albiononline.com/v1/item/${encodeURIComponent(id)}.png?size=64&quality=1`;
const iconImg = (id,size=36) => { const i=el("img",{src:ICON(id),alt:"",loading:"lazy",decoding:"async",width:size,height:size}); i.className="ico"; i.onerror=()=>{ i.style.visibility="hidden"; }; return i; };
function bestCity(id, field, want, only){ const r=DATA.itens[id]; if(!r) return null; let b=null; for(const [c,v] of Object.entries(r)){ if(only&&c!==only) continue; const p=v[field]; if(!(p>0)) continue; if(!b||(want==="min"?p<b.p:p>b.p)) b={p,c,t:v[field+2]||snapTime()}; } return b; }
const RED_CITIES = new Set(["Caerleon"]);
const routeWarn = cs => cs.some(c=>RED_CITIES.has(c)) ? "passa por Caerleon, rota de zona vermelha" : (new Set(cs)).size>2 ? "rota com várias cidades, conte o frete e o tempo" : "";
const prevId = (res,t,e) => t===4 ? `T3_${RES[res].ref}` : idOf(t-1,RES[res].ref,e);

/* ================= models ================= */
const st={res:"metal",focus:1,daily:0,prem:1,sell:"order",bc:"brumas"};
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
const CACHE_PREFIX="c1:";
let FORCE=false;
function cacheGet(url,ttlMin){ try{ const raw=localStorage.getItem(CACHE_PREFIX+url); if(!raw) return null; const o=JSON.parse(raw); if(Date.now()-o.t>ttlMin*60e3) return null; return o; }catch(e){ return null; } }
function cachePut(url,j){ const v=JSON.stringify({t:Date.now(),j}); try{ localStorage.setItem(CACHE_PREFIX+url,v); }catch(e){ try{ Object.keys(localStorage).filter(k=>k.startsWith(CACHE_PREFIX)).forEach(k=>localStorage.removeItem(k)); localStorage.setItem(CACHE_PREFIX+url,v); }catch(e2){} } }
async function apiJSON(url,ttlMin=10){
  if(!FORCE){ const c=cacheGet(url,ttlMin); if(c){ apiJSON.oldest=Math.min(apiJSON.oldest||Infinity,c.t); return c.j; } }
  const r=await fetch(url); if(!r.ok) throw new Error("API respondeu "+r.status); const j=await r.json(); cachePut(url,j); return j;
}
const CITIES=["Thetford","Fort Sterling","Martlock","Bridgewatch","Lymhurst"];
const MAX_AGE_H=72;
const fresh=d=>d&&!d.startsWith("0001")&&(Date.now()-Date.parse(d+"Z"))<MAX_AGE_H*3600e3;
function baseIds(){ const ids=[]; for(const r of Object.values(RES)){ ids.push(`T3_${r.ref}`); for(let t=4;t<=8;t++) for(let e=0;e<=3;e++) for(const b of [r.raw,r.ref]) ids.push(`T${t}_${b}`+(e?`_LEVEL${e}@${e}`:"")); }
  for(const b of ["WOOD","ROCK"]) for(let t=4;t<=8;t++) for(let e=0;e<=3;e++) ids.push(`T${t}_${b}`+(e?`_LEVEL${e}@${e}`:""));
  return ids.concat(FISH_IDS); }
function familyIds(slot,mat){ const ids=[]; for(let s=1;s<=3;s++) for(let t=4;t<=8;t++) for(let e=0;e<=3;e++) ids.push(gearId(t,slot,mat,s,e)); return ids; }
async function fetchIds(ids, target, locs=CITIES){
  const loc=locs.join(",").replace(/ /g,"%20");
  for(let i=0;i<ids.length;i+=40){
    const j=await apiJSON(`${HOST}/api/v2/stats/prices/${ids.slice(i,i+40).join(",")}.json?locations=${loc}&qualities=1`);
    for(const x of j){
      const s=fresh(x.sell_price_min_date)?x.sell_price_min:0, b=fresh(x.buy_price_max_date)?x.buy_price_max:0;
      if(!s&&!b) continue; const k=x.item_id.includes("_LEVEL")?x.item_id.split("@")[0]:x.item_id; (target[k]||(target[k]={}))[x.city]=[s,b,s?Date.parse(x.sell_price_min_date+"Z"):0,b?Date.parse(x.buy_price_max_date+"Z"):0];
    }
  }
}
const loadedFam=new Set();
async function ensureFamily(slot,mat){ const key=slot+"_"+mat; if(loadedFam.has(key)) return true; try{ await fetchIds(familyIds(slot,mat),DATA.itens); loadedFam.add(key); return true; }catch(e){ return false; } }
let LIVE=false;
async function loadLive(force){
  const btn=$("reload"); btn.disabled=true; btn.textContent="Atualizando…"; FORCE=!!force; apiJSON.oldest=Infinity;
  try{
    const itens={}; await fetchIds(baseIds(),itens);
    if(Object.keys(itens).length<30) throw new Error("poucos dados");
    let ouro=DATA.ouro; try{ const g=await apiJSON(`${HOST}/api/v2/stats/gold.json?count=168`,30); if(g[0]) ouro=g[0].price; drawGold(g); }catch(e){}
    const when=isFinite(apiJSON.oldest)?new Date(apiJSON.oldest):new Date(); FORCE=false;
    const hh=when.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    DATA={geradoEm:new Date().toISOString(),janela:`ao vivo, ${hh}`,ouro,itens}; LIVE=true; loadedFam.clear();
    COOK_LOADED=false; BM_LOADED.clear(); PLANKS_LOADED=false; WK_LOADED=false; FZ_LOADED=false; EN_LOADED.clear(); OF.loaded.clear(); MK_SEEN.clear(); applyMeta(); recompute(true); btn.textContent="Atualizar"; if(!$("p-cozinha").hidden) renderCook(); if(!$("p-mapas").hidden) renderMaps(); if(!$("p-mercado").hidden) renderBM(); if(!$("p-trab").hidden) renderWK(); if(!$("p-fazenda").hidden) renderFZ(); if(!$("p-encantar").hidden) renderEN(); if(!$("p-craft").hidden) renderOf(); if(!$("p-mk").hidden) renderMk();
  }catch(e){ FORCE=false; $("when").textContent=(DATA.janela||"")+". Não consegui puxar os preços ao vivo agora"; btn.textContent="Tentar de novo"; }
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
  for(let t=4;t<=8;t++) for(let e=0;e<=3;e++){ const m=get(t,e); cells[t+"."+e]=m; if(m) max=Math.max(max,Math.abs(m.p1)); }
  const hr=tbl.createTHead().insertRow(); hr.append(el("th",{text:""})); [0,1,2,3].forEach(e=>hr.append(el("th",{text:`.${e}`,scope:"col"})));
  const tb=tbl.createTBody();
  for(let t=4;t<=8;t++){ const tr=tb.insertRow(); tr.append(el("th",{class:"rh",scope:"row",text:`T${t}`}));
    for(let e=0;e<=3;e++){ const m=cells[t+"."+e], td=tr.insertCell(); td.tabIndex=0;
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
    (t,e,m)=>[["v",`${sgn(m.p1)} por barra com foco`],["",`${R.refName} T${t}.${e} em ${R.city}`],(()=>{ const r=refRoute(st.res,t,e); return r?["",`Melhor rota: compra em ${r.rawC}, vende em ${r.barC}: ${sgn(r.p1)}`]:["k","Sem rota: faltam preços"]; })(),["k",`Sem foco: ${sgn(m.p0)}`],["k",`${R.rawName}: ${fmt(m.raw.p)} (${m.raw.n} cid.) × ${N[t]}`],["k",`Barra anterior: ${fmt(m.prev.p)} (${m.prev.n} cid.)`],["k",`Venda: ${fmt(m.bar.p)} (${m.bar.n} cid.)`],["k",`Custo de foco ${m.fc}, ${dec(m.spf)} pratas por ponto`]]);
  $("matTitle").textContent=`${R.refName}: lucro por barra, com foco, em ${R.city}`;
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
  const tr=L.insertRow(); tr.className="total"; tr.insertCell().textContent="Lucro por barra"; const tc=tr.insertCell(); tc.textContent=sgn(p); tc.className=p>=0?"gain":"loss";
  if(useF){ const t2=L.insertRow(); const a=t2.insertCell(); a.append(`Com ${fmt(pool)} de foco`,el("small",{text:`${fmt(bars)} barras, ${dec(m.spf)} pratas por ponto de foco`})); const b=t2.insertCell(); b.textContent=sgn(bars*p); b.className=p>=0?"gain":"loss"; }
  renderRoute(t,e,p);
  drawHistory($("histRef"),$("histRefNote"),idOf(t,R.ref,e),R.city); $("histRefTitle").textContent=`${R.refName} T${t}.${e} em ${R.city}, últimos 30 dias`;
  v.textContent = m.p0>0 ? `Dá lucro até sem foco (${sgn(m.p0)} por barra). Vale comprar ${R.rawName.toLowerCase()} por ordem de compra e refinar em volume.`
    : m.p1>0 ? `Só compensa com foco: sem ele você perde ${fmt(-m.p0)} por barra.` : `Com estes preços não compensa refinar, nem com foco. Olhe outro tier na tabela.`;
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
  box.append(el("p",{class:"small"},document.createTextNode(`Lucro por barra nessa rota: `),el("strong",{class:pr>=0?"gain":"loss",text:sgn(pr)}),document.createTextNode(` ${useF?"com":"sem"} foco, ${diff>=0?`${fmt(diff)} a mais`:`${fmt(-diff)} a menos`} que a conta acima.${warn?" Atenção: "+warn+".":""}`)));
  const b=el("button",{type:"button",class:"linkbtn",text:"Usar os preços da rota na calculadora"}); b.addEventListener("click",()=>{ $("pRaw").value=Math.round(r.raw.p); $("pPrev").value=Math.round(r.prev.p); $("pBar").value=Math.round(r.bar.p); $("sRaw").textContent=`mais barato, em ${r.rawC}`; $("sPrev").textContent=`mais barato, em ${r.prevC}`; $("sBar").textContent=`mais alto, em ${r.barC}`; calc(false); });
  box.append(b, el("p",{class:"tiny muted",text:"O anúncio mais alto pode demorar a vender, e cada cidade a mais é frete e risco. A conta acima usa o preço típico das cidades, que é mais conservador."}));
}

/* ================= recommendations ================= */
function bestRefining(){ const out=[]; for(const res in RES) for(let t=4;t<=8;t++) for(let e=0;e<=3;e++){ const m=model(res,t,e,{fee:500}); if(m&&!m.thin&&m.p1>0) out.push({res,t,e,m,day:m.p1*Math.floor(10000/m.fc)}); } return out.sort((a,b)=>b.day-a.day); }
function bestCraft(){ const out=[]; for(const key in PF.craft){ if(!(PF.craft[key].lv>0)) continue; const [slot,mat]=key.split("_"); if(!loadedFam.has(key)) continue;
  for(let s=1;s<=3;s++) for(let t=4;t<=8;t++) for(let e=0;e<=3;e++){ const m=craftModel(slot,mat,s,t,e); if(m&&!m.thin&&m.p1>0) out.push({slot,mat,s,t,e,m,day:m.p1*Math.floor(10000/m.fc)}); } } return out.sort((a,b)=>b.day-a.day); }
function rankBuilds(c,onlyMine){
  const tierB={S:3,A:2}; return BUILDS.filter(b=>b.c===c&&(!onlyMine||wl(b.l)>=1))
    .sort((a,b)=>(wl(b.l)-wl(a.l))||((tierB[b.mc]||0)-(tierB[a.mc]||0))||(b.pop-a.pop)); }
function armorGaps(b){ const miss=new Set(); for(const g of b.g){ const t=armorType(g); if(t&&armorLv(t)<1) miss.add(t); } return [...miss]; }
function recItem(title, lines){ const li=el("li"); li.append(el("strong",{text:title})); lines.filter(Boolean).forEach(l=>li.append(el("span",{text:l}))); return li; }
function renderRecs(){
  const r=bestRefining(), box=$("recRefino"); box.textContent="";
  if(!r.length) box.append(el("li",{class:"empty",text:"Com os preços de agora, nenhum refino dá lucro com segurança."}));
  r.slice(0,3).forEach(x=>{ const R=RES[x.res]; const rt=refRoute(x.res,x.t,x.e); box.append(recItem(`${R.refName} T${x.t}.${x.e} em ${R.city}`,[`${sgn(x.m.p1)} por barra, uns ${fmtS(x.day)} com 10.000 de foco`,rt?`Compre ${R.rawName.toLowerCase()} em ${rt.rawC} e venda em ${rt.barC}: ${sgn(rt.p1)} por barra${routeWarn([rt.rawC,R.city,rt.barC])?"; "+routeWarn([rt.rawC,R.city,rt.barC]):""}`:null,`Custo de foco ${x.m.fc} por barra${refFCE(x.res)>0?"":", sem spec"}. Sem foco: ${sgn(x.m.p0)}`])); });
  const cbox=$("recCraft"); cbox.textContent="";
  const lines=Object.keys(PF.craft).filter(k=>PF.craft[k].lv>0);
  if(!lines.length){ cbox.append(el("li",{class:"empty",text:"Marque na sua ficha as peças que você fabrica para ver o melhor craft."})); }
  else{ const c=bestCraft();
    if(!c.length) cbox.append(el("li",{class:"empty",text: lines.every(k=>loadedFam.has(k)) ? "Com os preços de agora, nenhuma das suas linhas dá lucro com segurança." : "Buscando preços das peças…"}));
    c.slice(0,3).forEach(x=>{ const k=x.slot+"_"+x.mat; cbox.append(recItem(`${gearName(x.slot,x.mat,x.s)} T${x.t}.${x.e} em ${CRAFT_CITY[k]}`,[`${sgn(x.m.p1)} por peça, uns ${fmtS(x.day)} com 10.000 de foco`,`Custo de foco ${fmt(x.m.fc)} por peça. Venda típica ${fmt(x.m.item.p)}`,(()=>{ const r=craftRoute(x.slot,x.mat,x.s,x.t,x.e); return r?`Barras em ${r.barC}, venda em ${r.itemC}: ${sgn(r.p1)} por peça`:null; })()])); }); }
  for(const [c,id] of [["brumas","recBrumas"],["corrompidas","recCorr"]]){
    const b=rankBuilds(c,true).slice(0,3), bx=$(id); bx.textContent="";
    if(!b.length) bx.append(el("li",{class:"empty",text:"Nenhuma build da lista usa as armas da sua ficha."}));
    b.forEach(x=>{ const gaps=armorGaps(x); bx.append(recItem(`${nm(x.w)} (${LINE_NAME[x.l]}, spec ${LV_W[wl(x.l)].toLowerCase()})`,[x.g.length?x.g.map(nm).join(", "):"Equipamento: veja no MetaCorrupted",nmFood(x.f)||null,`Patch 3: ${x.p[1]}`,gaps.length?`Atenção: sem spec em ${gaps.join(" e ")} na sua ficha`:null])); });
  }
  const tb=$("recColeta"); tb.textContent="";
  const hr=tb.createTHead().insertRow(); ["Recurso","Seu tier",".0",".1",".2",".3","Onde aparece"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody(); let any=false;
  for(const [k,name,base,bio] of GATHER){ const g=PF.coleta[k]; if(!base||!g||!(g.tier>=4)) continue; any=true; const tr=body.insertRow();
    tr.insertCell().textContent=name; tr.insertCell().textContent=`T${g.tier}, nível ${g.n||0}`;
    for(let e=0;e<=3;e++){ const td=tr.insertCell(); td.className="num"; if(!base){ td.textContent="—"; continue; } const p=typical(idOf(g.tier,base,e),0); td.textContent=p?fmt(p.p):"—"; }
    tr.insertCell().textContent= base ? bio : "Peixe não está na API de preços desta página ainda"; }
  if(!any){ const tr=body.insertRow(); const td=tr.insertCell(); td.colSpan=7; td.textContent="Marque na sua ficha o tier de coleta de cada recurso."; }
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
  if(best.kind==="ref"){ const R=RES[x.res]; b.textContent=`${R.refName.toLowerCase()} T${x.t}.${x.e}`; ans.append(`${who} o seu foco rende mais refinando `,b,` em ${R.city}: `,n,` por barra, uns ${fmtS(x.day)} com 10.000 de foco.`); }
  else if(best.kind==="cook"){ b.textContent=x.name; ans.append(`${who} o seu foco rende mais ${x.kind==="f"?"cozinhando":"preparando"} `,b,` em ${COOK_CITY[x.kind]}: `,n,` por fornada, uns ${fmtS(x.day)} com 10.000 de foco.`); }
  else{ b.textContent=`${gearName(x.slot,x.mat,x.s)} T${x.t}.${x.e}`; ans.append(`${who} o seu foco rende mais fabricando `,b,` em ${CRAFT_CITY[x.slot+"_"+x.mat]}: `,n,` por peça, uns ${fmtS(x.day)} com 10.000 de foco.`); }
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
  renderBuilds(); renderRecs(); renderSpecs(); ["p-mercado","p-encantar","p-custo","p-matchup"].forEach(id=>{ if(!$(id).hidden) ({"p-mercado":renderBM,"p-encantar":renderEN,"p-custo":renderBC,"p-matchup":renderMU})[id](); }); }

/* ================= builds table ================= */
function renderBuilds(){
  const only=$("bOnlyMine").checked, list=rankBuilds(st.bc,only), tb=$("bTable"); tb.textContent="";
  const hr=tb.createTHead().insertRow(); ["Arma","Linha e sua spec","Equipamento citado","Fonte","Patch 3"].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody();
  if(!list.length){ const td=body.insertRow().insertCell(); td.colSpan=5; td.textContent="Nenhuma build desta lista usa as armas da sua ficha. Desmarque o filtro para ver todas."; return; }
  for(const b of list){ const tr=body.insertRow();
    const a=tr.insertCell(); a.append(nm(b.w)); if(b.mc) a.append(" ",el("span",{class:"spec",text:`tier ${b.mc}`}));
    const lv=wl(b.l), c2=tr.insertCell(); const nv=Math.max(PF.armas[b.l]||0,spMax((PF.sp||{})["c:"+b.l])); c2.textContent=nv?`${LINE_NAME[b.l]}: nível ${nv}`:`${LINE_NAME[b.l]}: sem spec`; if(lv>=2) c2.className="gain";
    const gaps=armorGaps(b), g=tr.insertCell(); g.append(b.g.length?b.g.map(nm).join(", "):"Veja na fonte"); if(b.f) g.append(el("small",{class:"blk",text:nmFood(b.f)})); if(gaps.length) g.append(el("small",{class:"blk loss",text:`Sem spec em ${gaps.join(" e ")}`}));
    tr.insertCell().textContent = b.src==="pesquisa" ? "Pesquisa, não conferida" : b.src==="MetaCorrupted" ? "MetaCorrupted" : `AOG, ${b.pop} salvos`;
    const p=tr.insertCell(); p.className=`chg ${b.p[0]}`; p.textContent=b.p[1];
  }
}

/* ================= profile editor ================= */
function segRow(label, val, labels, onSet){ const row=el("div",{class:"lv"}); row.append(el("span",{class:"lbl",text:label})); const seg=el("div",{class:"seg sm",role:"group","aria-label":label});
  labels.forEach((t,i)=>{ const b=el("button",{type:"button",text:t,"aria-pressed":String(i===val)}); b.addEventListener("click",()=>{ [...seg.children].forEach(x=>x.setAttribute("aria-pressed",String(x===b))); onSet(i); }); seg.append(b); }); row.append(seg); return row; }
function numIn(val,max,label,onSet,ph){ const inp=el("input",{type:"number",min:"0",max:String(max),step:"1",inputMode:"numeric",value:val?String(val):"",placeholder:ph||"—","aria-label":label}); inp.className="lvn";
  inp.addEventListener("change",()=>{ let v=Math.round(+inp.value||0); v=Math.max(0,Math.min(max,v)); inp.value=v?String(v):""; onSet(v); }); return inp; }
function lvRow(label,inputs,hint){ const row=el("div",{class:"lvrow"}); row.append(el("span",{class:"lbl",text:label})); const box=el("div",{class:"lvins"}); inputs.forEach(x=>box.append(x)); row.append(box); if(hint) row.append(el("span",{class:"lvh",text:hint})); return row; }
const tagIn = (t,inp) => { const w=el("label",{class:"lvt"}); w.append(el("span",{text:t}),inp); return w; };
const bandTxt = n => ["sem spec","começando","média","alta"][band(n)];
function renderProfile(){
  $("pfName").value=PF.nome||"";
  const g=$("pfGather"); g.textContent="";
  for(const [k,n] of GATHER){ const cur=PF.coleta[k]||(PF.coleta[k]={s:{}}); cur.s=cur.s||{};
    const ins=[]; for(let t=2;t<=8;t++) ins.push(tagIn(`T${t}`,numIn(cur.s[t]||0,100,`${n} T${t}`,x=>{ if(x) cur.s[t]=x; else delete cur.s[t]; saveProfile(); renderGatherHint(row,cur); })));
    const row=lvRow(n,ins," "); g.append(row); renderGatherHint(row,cur); }
  const r=$("pfRefine"); r.textContent="";
  for(const k in RES){ const cur=PF.refino[k]||(PF.refino[k]={m:0,s:{}}); cur.s=cur.s||{};
    const hint=()=>row.querySelector(".lvh").textContent=`foco T6.0: ${fmt(refFocus(k,6,0))}`;
    const ins=[tagIn("Maestria",numIn(cur.m||0,100,`Maestria de ${RES[k].refName}`,x=>{ cur.m=x; saveProfile(); hint(); }))];
    for(let t=2;t<=8;t++) ins.push(tagIn(`T${t}`,numIn(cur.s[t]||0,100,`${RES[k].refName} T${t}`,x=>{ if(x) cur.s[t]=x; else delete cur.s[t]; saveProfile(); hint(); })));
    ins.push(tagIn("Foco T6.0 no jogo",numIn(cur.obs||0,99999,`Custo de foco no jogo para ${RES[k].refName} T6.0`,x=>{ cur.obs=x; saveProfile(); hint(); },"—")));
    const row=lvRow(RES[k].refName,ins," "); r.append(row); hint(); }
  renderSpecs(); renderCookProfile();
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
  for(const [sec,box] of SP_SECS){ const root=$(box); if(!root) continue; root.textContent=""; let sub=null, grid=null;
    for(const g of SPECS.g.filter(x=>x.sec===sec)){
      if(g.sub!==sub){ sub=g.sub; root.append(el("h4",{class:"spsub",text:sub})); grid=el("div",{class:"spgroups"}); root.append(grid); }
      const d=el("details",{class:"spg"}), sm=el("summary"), nmS=el("span",{class:"spn",text:g.nome}), sumS=el("span",{class:"sps",text:spSummary(g)});
      sm.append(nmS,sumS); d.append(sm); const body=el("div",{class:"spgrid"}); d.append(body);
      const upd=()=>{ sumS.textContent=spSummary(g); sumS.classList.toggle("on",sumS.textContent!=="sem spec"); };
      let built=false;
      d.addEventListener("toggle",()=>{ if(!d.open||built) return; built=true;
        body.append(tagIn("Maestria",numIn(spMastery(g.k),g.mmax,`Maestria de ${g.nome}`,x=>{ spSetMastery(g.k,x); saveProfile(); upd(); },"—")));
        for(const [key,pt,en] of g.it){ const label=LANG==="en"?en:pt;
          body.append(tagIn(label,numIn(+(spGet(g.k).s||{})[key]||0,g.max,`${g.nome}: ${label}`,x=>{ const st=spEnsure(g.k); st.s=st.s||{}; if(x) st.s[key]=x; else delete st.s[key]; saveProfile(); upd(); },"—"))); }
        if(g.k.startsWith("a:")){ const kk=g.k.slice(2); body.append(tagIn("Foco T6.0 no jogo",numIn((PF.craft[kk]||{}).obs||0,99999,`Custo de foco no jogo para ${g.nome} T6.0`,x=>{ spEnsure(g.k).obs=x; saveProfile(); upd(); },"—"))); }
      });
      upd(); grid.append(d); } } }
const MEAL_PT = {SOUP:"Sopa",SALAD:"Salada",SEAWEEDSALAD:"Salada de algas",PIE:"Torta",OMELETTE:"Omelete",STEW:"Guisado",SANDWICH:"Sanduíche",ROAST:"Assado",GRILLEDFISH:"Peixe grelhado"};
function cookTypes(kind){ const m={}; for(const id in COOK.r){ const r=COOK.r[id]; if(r[1]!==kind||!r[3]) continue; const tp=cookType(id); if(!m[tp]) m[tp]= MEAL_PT[tp] || r[0].replace(/^Poção\s+((de|da|do)\s+)?/i,"").replace(/\s+(Menor|Maior)$/,""); } return m; }
function renderCookProfile(){ const c=$("pfCook"); c.textContent="";
  for(const [k,n,kind] of [["cozinha","Cozinha","f"],["alquimia","Alquimia","p"]]){ const cur=PF[k]||(PF[k]={m:0,s:{}}); cur.s=cur.s||{};
    const save=()=>{ saveProfile(); renderCookProfile(); };
    const ins=[tagIn("Maestria",numIn(cur.m||0,100,`Maestria de ${n}`,x=>{ cur.m=x; save(); }))];
    const types=cookTypes(kind);
    for(const [tp,label] of Object.entries(types)) ins.push(tagIn(label,numIn(cur.s[tp]??cur.all??0,100,`${n}: ${label}`,x=>{ cur.s[tp]=x; save(); })));
    c.append(lvRow(n,ins)); } }
function renderWho(){ $("who").textContent = IS_EXAMPLE ? "Ficha de exemplo: Oleran" : (PF.nome ? `Ficha: ${PF.nome}` : "Ficha sem nome"); $("exampleBanner").hidden=!IS_EXAMPLE; }
$("pfName").addEventListener("change",()=>{ PF.nome=$("pfName").value.trim().slice(0,40); saveProfile(); });
$("pfCopy").addEventListener("click",()=>{ const code=btoa(unescape(encodeURIComponent(JSON.stringify(PF)))); const done=()=>$("pfStatus").textContent="Código da ficha copiado. Cole em outro navegador em Colar ficha.";
  try{ navigator.clipboard.writeText(code).then(done,()=>{ $("pfPasteBox").hidden=false; $("pfPaste").value=code; $("pfPaste").select(); $("pfStatus").textContent="Copie o código selecionado abaixo."; }); }catch(e){ $("pfPasteBox").hidden=false; $("pfPaste").value=code; } });
$("pfPasteBtn").addEventListener("click",()=>{ $("pfPasteBox").hidden=!$("pfPasteBox").hidden; $("pfPaste").value=""; $("pfPaste").focus(); });
$("pfPasteApply").addEventListener("click",()=>{ try{ const o=JSON.parse(decodeURIComponent(escape(atob($("pfPaste").value.trim())))); if(typeof o!=="object"||!o.armas) throw 0; PF=Object.assign(EMPTY(),migrate(o)); saveProfile(); renderProfile(); $("pfPasteBox").hidden=true; $("pfPasteMsg").textContent=""; }catch(e){ $("pfPasteMsg").textContent="Esse código não é uma ficha válida. Copie de novo pelo botão Copiar minha ficha."; } });
/* Buscar do Albion: o programa do PC abre o site de volta com a ficha depois do "#" (não vai para servidor nenhum). */
$("pfAlbion").href="albion-ficha://iniciar?voltar="+encodeURIComponent(location.origin+location.pathname);
function aplicarFichaDoAlbion(){ const m=/^#ficha=(.+)$/.exec(location.hash); if(!m) return; history.replaceState(null,"",location.pathname+location.search);
  let o=null; try{ o=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1]))))); if(typeof o!=="object"||!o||!o.armas) o=null; }catch(err){ o=null; }
  if(!o){ $("pfStatus").textContent="Não consegui ler a ficha vinda do Albion."; return; }
  if(confirm("Aplicar a ficha lida do Albion? Os níveis do jogo atualizam a sua ficha; o resto que você preencheu é mantido.")){ const mesclar=(a,b)=>{ if(b&&typeof b==="object"&&!Array.isArray(b)){ const r=Object.assign({},a&&typeof a==="object"?a:{}); for(const k in b) r[k]=mesclar(r[k],b[k]); return r; } return ((b===0||b==="")&&a)?a:b; };
    const nomeAntes=(!IS_EXAMPLE&&PF.nome)||""; PF=Object.assign(EMPTY(),mesclar(PF,migrate(o))); if(nomeAntes) PF.nome=nomeAntes; saveProfile(); renderProfile(); $("pfStatus").textContent="Ficha do Albion aplicada (o que você já tinha preenchido foi mantido)."; } }
aplicarFichaDoAlbion(); window.addEventListener("hashchange",aplicarFichaDoAlbion);
$("pfExample").addEventListener("click",()=>{ PF=OLERAN(); saveProfile(); renderProfile(); });
$("pfClear").addEventListener("click",()=>{ PF=EMPTY(); saveProfile(); renderProfile(); });

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
  ACTS.filter(a=>f==="all"||a.tags.includes(f)).forEach(a=>{ const row=el("div",{class:"row",tabIndex:0}); const lbl=el("div",{class:"lbl",text:a.n}); const sub=el("span"); sub.append(el("span",{class:`risk ${a.r}`,text:RISK[a.r],style:"display:inline"})); if(a.d) sub.append(`  ${a.d}`); lbl.append(sub);
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
  COOK_LOADING=fetchIds(ids,DATA.itens,COOK_LOCS).then(()=>{COOK_LOADED=true; return true;}).catch(()=>false).finally(()=>{COOK_LOADING=null;});
  return COOK_LOADING;
}
function cookModel(id){
  const r=COOK.r[id]; if(!r||!r[3]) return null; const [name,kind,q,fo,nut,ing]=r;
  let cost=0, miss=null, thin=false; const parts=[];
  for(const [iid,c] of ing){ const p=typical(iid,0); if(!p){ miss=COOK.n[iid]||iid; break; } cost+=c*p.p; if(p.n<2) thin=true; parts.push({iid,c,p}); }
  const item=typical(id, st.sell==="instant"?1:0);
  if(miss||!item) return {id,name,kind,q,miss:miss||"preço do próprio item"};
  if(item.n<2) thin=true;
  const fee=q*nut*0.1125*feeVal()/100, net=q*item.p*(1-taxOf());
  const r1=rrr(0.15,true,st.daily), r0=rrr(0.15,false,st.daily);
  const p1=net-cost*(1-r1)-fee, p0=net-cost*(1-r0)-fee, fc=Math.max(1,Math.round(fo*Math.pow(0.5,cookFCE(kind,id)/10000)));
  return {id,name,kind,q,cost,fee,net,item,parts,p1,p0,fc,spf:(p1-p0)/fc,day:p1*Math.floor(10000/fc),thin,tier:+id[1]};
}
async function renderCook(){
  const tb=$("ckTable"); tb.textContent="";
  const hr=tb.createTHead().insertRow(); ["Item","Fornada","Lucro com foco","Por ponto de foco","Venda típica",""].forEach(h=>hr.append(el("th",{text:h})));
  const body=tb.createTBody();
  if(!COOK_LOADED){ const td=body.insertRow().insertCell(); td.colSpan=6; td.textContent="Buscando preços dos ingredientes…"; await ensureCook(); if(!COOK_LOADED){ td.textContent="Não consegui buscar os preços agora. Tente atualizar."; return; } return renderCook(); }
  const only=$("ckBuilds").checked;
  const rows=Object.keys(COOK.r).filter(id=>COOK.r[id][1]===ckKind&&(!only||BUILD_FOOD.includes(id))).map(cookModel).filter(Boolean)
    .sort((a,b)=>((b.p1??-1e12)-(a.p1??-1e12)));
  for(const m of rows){ const tr=body.insertRow(); tr.tabIndex=0; tr.className="clickrow";
    const a=tr.insertCell(); a.append(m.name); if(BUILD_FOOD.includes(m.id)) a.append(" ",el("span",{class:"spec",text:"build"}));
    tr.insertCell().textContent=`${m.q} ${m.kind==="f"?(m.q>1?"porções":"porção"):(m.q>1?"poções":"poção")}`;
    if(m.miss){ const td=tr.insertCell(); td.colSpan=3; td.className="muted"; td.textContent=`Sem preço: ${m.miss}`; tr.insertCell(); continue; }
    const c=tr.insertCell(); c.className="num "+(m.p1>=0?"gain":"loss"); c.textContent=sgn(m.p1);
    const d=tr.insertCell(); d.className="num"; d.textContent=dec(m.spf);
    const e=tr.insertCell(); e.className="num"; e.textContent=fmt(m.item.p);
    const f=tr.insertCell(); f.className="tiny muted"; f.textContent=m.thin?"pouca oferta":"";
    const pick=()=>{ ckSel=m.id; renderCookDetail(); $("ckDetail").scrollIntoView({behavior:RM?"auto":"smooth",block:"start"}); };
    tr.addEventListener("click",pick); tr.addEventListener("keydown",ev=>{ if(ev.key==="Enter") pick(); });
  }
  if(ckSel) renderCookDetail();
}
function renderCookDetail(){
  const m=cookModel(ckSel); const box=$("ckDetail"); if(!m||m.miss){ box.hidden=true; return; } box.hidden=false;
  $("ckTitle").textContent=`${m.name} em ${COOK_CITY[m.kind]}`;
  const L=$("ckLedger"); L.textContent="";
  for(const x of m.parts){ const tr=L.insertRow(); const td=tr.insertCell(); td.append(COOK.n[x.iid]||x.iid,el("small",{text:`${x.c} × ${fmt(x.p.p)}`})); tr.insertCell().textContent=sgn(-x.c*x.p.p); }
  const rr=rrr(0.15,true,st.daily);
  [["Volta pelo retorno",`${dec(rr*100)}% dos ingredientes`,m.cost*rr],["Taxa da estação","estimada pela nutrição",-m.fee],["Venda",`${m.q} × ${fmt(m.item.p)} menos taxas`,m.net]].forEach(([a,b,c])=>{ const tr=L.insertRow(); const td=tr.insertCell(); td.append(a,el("small",{text:b})); tr.insertCell().textContent=sgn(c); });
  const tr=L.insertRow(); tr.className="total"; tr.insertCell().textContent="Lucro por fornada"; const tc=tr.insertCell(); tc.textContent=sgn(m.p1); tc.className=m.p1>=0?"gain":"loss";
  const t2=L.insertRow(); const a=t2.insertCell(); a.append("Com 10.000 de foco",el("small",{text:`custo de foco ${fmt(m.fc)} por fornada, ${dec(m.spf)} pratas por ponto`})); const b=t2.insertCell(); b.textContent=sgn(m.day); b.className=m.day>=0?"gain":"loss";
  const sc=bestCity(m.id,st.sell==="instant"?1:0,"max"); if(sc){ const t3=L.insertRow(); const a3=t3.insertCell(); a3.append(`Melhor cidade para vender`,el("small",{text:`${sc.c}, ${fmt(sc.p)} cada`})); t3.insertCell().textContent=sgn(m.q*(sc.p-m.item.p)*(1-taxOf())); }
  drawHistory($("histCook"),$("histCookNote"),m.id,COOK_CITY[m.kind]);
  if(window.gsap&&!RM) gsap.from(box.querySelectorAll(".ledger tr"),{autoAlpha:0,x:-10,stagger:.03,duration:.3,clearProps:"all"});
}
function bestCook(){ if(!COOK_LOADED) return []; const out=[]; for(const id in COOK.r){ const k=COOK.r[id][1]; if(((PF[k==="f"?"cozinha":"alquimia"]||{}).lv||0)===0) continue; const m=cookModel(id); if(m&&!m.miss&&!m.thin&&m.p1>0) out.push(m); } return out.sort((a,b)=>b.day-a.day); }
function renderCookRecs(){
  const box=$("recCook"); box.textContent="";
  const has=((PF.cozinha||{}).lv||0)+((PF.alquimia||{}).lv||0);
  if(!has){ box.append(el("li",{class:"empty",text:"Marque cozinha ou alquimia na sua ficha para ver o que rende mais."})); return; }
  if(!COOK_LOADED){ box.append(el("li",{class:"empty",text:"Buscando preços dos ingredientes…"})); ensureCook().then(ok=>{ if(ok){ renderCookRecs(); renderHero(); } }); return; }
  const c=bestCook(); if(!c.length){ box.append(el("li",{class:"empty",text:"Com os preços de agora, nada da cozinha ou da alquimia dá lucro com segurança."})); return; }
  c.slice(0,3).forEach(m=>box.append(recItem(`${m.name} em ${COOK_CITY[m.kind]}`,[`${sgn(m.p1)} por fornada de ${m.q}, uns ${fmtS(m.day)} com 10.000 de foco`,`Custo de foco ${fmt(m.fc)}. Venda típica ${fmt(m.item.p)} cada`,BUILD_FOOD.includes(m.id)?"As builds usam":null])));
}

/* ================= histórico ================= */
const HIST_CACHE={};
async function drawHistory(svg,note,id,city){
  if(!svg) return; svg.innerHTML=""; note.textContent="Carregando histórico…";
  const key=id+"|"+city; let rows=HIST_CACHE[key];
  if(!rows){ try{ const apiId=/_LEVEL(\d)/.test(id)?`${id}@${id.match(/_LEVEL(\d)/)[1]}`:id;
      const j=await apiJSON(`${HOST}/api/v2/stats/history/${apiId}.json?locations=${encodeURIComponent(city)}&time-scale=24`,360);
      rows=(j.find(x=>x.quality===1)||j[0]||{}).data||[]; HIST_CACHE[key]=rows; }catch(e){ rows=null; } }
  if(!rows||rows.length<3){ note.textContent=`Sem histórico suficiente em ${city}.`; return; }
  rows=rows.slice(-30);
  const W=520,H=150,PL=48,PR=10,PT=10,PB=24, v=rows.map(r=>r.avg_price), lo=Math.min(...v), hi=Math.max(...v), pad=(hi-lo)*0.12||hi*0.05;
  const y0=lo-pad, y1=hi+pad, X=i=>PL+i*(W-PL-PR)/(rows.length-1), Y=p=>PT+(1-(p-y0)/(y1-y0))*(H-PT-PB);
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
  const at=ev=>{ const b=svg.getBoundingClientRect(); const sx=(ev.clientX-b.left)*W/b.width; const i=Math.max(0,Math.min(rows.length-1,Math.round((sx-PL)/((W-PL-PR)/(rows.length-1))))); return i; };
  hit.addEventListener("pointermove",ev=>{ const i=at(ev); cross.setAttribute("x1",X(i)); cross.setAttribute("x2",X(i)); cross.setAttribute("opacity",.6); hd.setAttribute("cx",X(i)); hd.setAttribute("cy",Y(v[i])); hd.setAttribute("opacity",1);
    showTip([["v",`${fmt(v[i])} pratas`],["",new Date(rows[i].timestamp+"Z").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"})],["k",`${fmt(rows[i].item_count)} vendidos no dia em ${city}`]],ev.clientX,ev.clientY); });
  hit.addEventListener("pointerleave",()=>{ cross.setAttribute("opacity",0); hd.setAttribute("opacity",0); tip.hidden=true; });
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
    if(!code){ ol.append(recItem(`Raro de ${x.n} T${x.t}: ${fmt(x.p.p)} cada`,[x.b==="AVALON"?"Sai nas Estradas de Avalon, nos lagos dos corredores.":"Sai nas Ancient Lands, pelos portais do Dragonfire."])); rank++; continue; }
    if(shown.has(code)) continue; shown.add(code);
    const zs=ZONES.filter(z=>z.b===code&&z.t>=x.t&&z.w>0).sort((a,b)=>(b.w-a.w)||(a.r==="ROY"?-1:1)||(b.t-a.t)).slice(0,3);
    ol.append(recItem(`Raro de ${x.n} T${x.t}: ${fmt(x.p.p)} cada`,[zs.length?`Mapas de ${BIOME_PT[code]} T${x.t}+ com mais lagos:`:`Procure zonas de ${BIOME_PT[code]} T${x.t} ou mais.`,...zs.map(zoneLine)])); rank++; }
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
  const prices=[0,1,2,3].map(e=>typical(idOf(tier,base,e),0)).map(p=>p?fmt(p.p):"—");
  gb.append(el("p",{class:"small",text:`${opts.find(o=>o[0]===mapRes)[1]} é o recurso principal da ${BIOME_PT[bio]}. No seu tier (T${tier}), cada unidade vale ${prices.join(", ")} nos encantamentos .0 a .3.`}));
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
    box.append(recItem(`Pescar: raro de ${f.n} T${f.t}`,[`${fmt(f.p.p)} cada`, z?`Ex.: ${zoneLine(z)}`:(f.b==="AVALON"?"Estradas de Avalon":"Ancient Lands")])); }
  for(const [k,n] of GATHER){ const g=PF.coleta[k]; const base=GATHER_KEY[k]; if(!base||!g||!(g.tier>=4)) continue;
    const bio=MAIN_BIOME[base]; const z=ZONES.filter(z=>z.b===bio&&z.r==="OUT"&&z.t>=g.tier).sort((a,b)=>((b.q||0)-(a.q||0))||(b.res-a.res))[0];
    const p=typical(idOf(g.tier,base,1),0);
    box.append(recItem(`Coletar ${n.toLowerCase()} T${g.tier}`,[p?`T${g.tier}.1 a ${fmt(p.p)} por unidade`:null, z?`Ex.: ${zoneLine(z)}`:null])); }
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
