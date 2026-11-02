/* Testes do Balcão: abre o site com preços simulados (nada sai para a internet) e confere as contas que já deram erro.
   Uso: python3 -m http.server 8766 (na raiz do site) e, em outro terminal, node tests/rodar.js
   Sai com código 1 se algum teste falhar. Roda no GitHub a cada envio (.github/workflows/testes.yml). */
const { chromium } = require("playwright");
const BASE = process.env.SITE || "http://127.0.0.1:8766/";
const falhas = [], ok = [];
const conf = (nome, cond, info) => { (cond ? ok : falhas).push(nome + (cond ? "" : " → " + JSON.stringify(info))); };

/* preços simulados: cada item tem um preço que depende do id e da cidade, sempre o mesmo */
function precoBase(id) { const t = +id[1] || 4, e = +(id.split("@")[1] || 0);
  if (/_ORE|_FIBER|_HIDE|_WOOD|_ROCK/.test(id)) return 30 * Math.pow(2.1, t) * (1 + e);
  if (/METALBAR|CLOTH|LEATHER|PLANKS|STONEBLOCK/.test(id)) return 110 * Math.pow(2.1, t) * (1 + e);
  if (/ALCHEMY_RARE/.test(id)) return 5000 * t;
  return (1800 + (id.length * 137) % 1600) * Math.pow(2.1, t) * (1 + e * 1.2); }
const agora = () => new Date(Date.now() - 2 * 3600e3).toISOString().slice(0, 19);
async function simular(p) {
  await p.route(/^https:\/\/(?!127\.0\.0\.1).*\.(png|jpg|webp|woff2?|css)(\?.*)?$/, r => r.abort());
  await p.route("https://cdn.jsdelivr.net/**", r => r.abort());
  await p.route("https://albionmarket.gg/**", r => r.abort());
  await p.route("**/rest/v1/**", r => r.fulfill({ json: [] }));
  await p.route("**/api/v2/stats/**", route => { const u = decodeURIComponent(route.request().url());
    if (u.includes("gold")) return route.fulfill({ json: [{ price: 8300, timestamp: "2026-10-28T00:00:00" }] });
    if (u.includes("festivities")) { const tk = d => String(BigInt(d.getTime() + 62135596800000) * 10000n);
      return route.fulfill({ json: { Events: [
        { Kind: 2, UniqueName: "COMMON_ARCANESTAFF", StartTime: tk(new Date(Date.now() - 3600e3)), EndTime: tk(new Date(Date.now() + 8 * 3600e3)) },
        { Kind: 2, UniqueName: "COMMON_PLATE_ARMOR", StartTime: tk(new Date(Date.now() - 3600e3)), EndTime: tk(new Date(Date.now() + 8 * 3600e3)) },
        { Kind: 0, UniqueName: "HALLOWEEN2026", StartTime: tk(new Date(Date.now() - 864e5)), EndTime: tk(new Date(Date.now() + 9 * 864e5)) }],
        ExpiresAt: new Date(Date.now() + 8 * 3600e3).toISOString() } }); }
    const ids = (u.split(/\/(?:prices|history)\//)[1] || "").split(".json")[0].split(",").filter(Boolean);
    const locs = ((u.split("locations=")[1] || "").split("&")[0] || "Caerleon").split(",");
    if (u.includes("/history/")) return route.fulfill({ json: ids.flatMap(id => locs.map(l => ({ item_id: id, location: l, quality: 1,
      data: [0, 1, 2, 3, 4, 5, 6].map(d => ({ timestamp: new Date(Date.now() - d * 864e5).toISOString().slice(0, 19), item_count: 20 + (id.length + l.length) % 30, avg_price: Math.round(precoBase(id)) })) }))) });
    if (!u.includes("/prices/")) return route.fulfill({ json: [] });
    const out = []; for (const id of ids) for (const c of locs) { const s = Math.round(precoBase(id) * (0.9 + ((c.length * 7 + (+id[1] || 4)) % 5) / 20));
      out.push({ item_id: id, city: c, quality: 1, sell_price_min: s, sell_price_min_date: agora(), buy_price_max: Math.round(s * .85), buy_price_max_date: agora() }); }
    route.fulfill({ json: out }); });
}

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const erros = []; p.on("pageerror", e => erros.push(e.message));
  await simular(p); await p.goto(BASE); await p.waitForTimeout(3000);

  /* 1. as páginas abrem sem erro */
  for (const t of ["t-voce", "t-plano", "t-refino", "t-craft", "t-encantar", "t-cozinha", "t-fazenda", "t-pesca", "t-trab", "t-mk", "t-mercado", "t-transp", "t-rot", "t-compras", "t-builds", "t-pvp", "t-versao"]) {
    await p.evaluate(t => { const x = document.getElementById(t); if (x) x.click(); }, t); await p.waitForTimeout(2500); }
  conf("páginas abrem sem erro de script", erros.length === 0, erros.slice(0, 5));

  /* 2. retorno de recursos (cidade com bônus de craft 15%, com e sem foco; refino 40%) */
  const rr = await p.evaluate(() => [rrr(0.15, true, 0), rrr(0.15, false, 0), rrr(0.40, true, 0), rrr(0, false, 0)]);
  conf("retorno de recursos", Math.abs(rr[0] - 0.4792) < 0.001 && Math.abs(rr[1] - 0.2481) < 0.001 && Math.abs(rr[2] - 0.5392) < 0.001 && Math.abs(rr[3] - 0.1525) < 0.001, rr);

  /* 3. Cozinha: preços carregados e ingrediente raro sem retorno */
  await p.evaluate(() => document.getElementById("t-cozinha").click()); await p.waitForTimeout(6000);
  const ck = await p.evaluate(async () => { await ensureCook(); const ids = Object.keys(COOK.r); const com = ids.filter(i => DATA.itens[i]).length;
    const m = cookModel("T3_POTION_MOB_RESET"); return { com, tot: ids.length, fix: m && m.fix, rare: m && m.parts.find(x => x.iid === "T3_ALCHEMY_RARE_PANTHER").p.p,
      ret: m && m.ret, cost: m && m.cost, p1: m && m.p1, net: m && m.net, fee: m && m.fee, r1: rrr(0.15, true, st.daily) }; });
  conf("Cozinha carrega o preço de quase todos os pratos", ck.com / ck.tot > 0.9, ck);
  conf("ingrediente raro não volta no retorno", ck.fix === ck.rare && Math.abs(ck.p1 - (ck.net - (ck.cost - ck.fix) * (1 - ck.r1) - ck.fix - ck.fee)) < 1, ck);

  /* 4. teto de foco: o que passa do teto conta sem foco */
  const mix = await p.evaluate(() => { SRC.tetoOn = true; SRC.teto = 1000; const m = focMix(30, 100, 50, 10); return m; });
  conf("teto de foco divide com e sem foco", mix.k === 10 && mix.tot === 10 * 50 + 20 * 10 && mix.foc === 1000, mix);

  /* 5. Plano do dia: a combinação respeita foco, dinheiro e mercado */
  const pl = await p.evaluate(() => { const mk = (n, q, f, pF, p0, inv, inv0, vol) => ({ name: n, q, f, pF, p0, inv, inv0, cap: Math.floor(vol * 4 * 0.8 / q) });
    const it = [mk("Resist", 5, 38, 7489, 3563, 8850, 12776, 5657), mk("Tecelao", 1, 2527, 50387, 42371, 29604, 37620, 30.7), mk("Judic", 1, 1299, 21523, 17515, 17273, 21282, 14.6), mk("Omelete", 1, 81, 22521, 3677, 42904, 61748, 588)];
    const r = C => { const p = plOtimo(it, C, 30000); return { L: p.reduce((a, x) => a + x.lucro, 0), I: p.reduce((a, x) => a + x.inv, 0), F: p.reduce((a, x) => a + x.foc, 0), n: p.map(x => x.name + x.modo + x.n) }; };
    return { c10: r(10e6), c30: r(30e6), sem: r(0) }; });
  conf("plano cabe no dinheiro e no foco", pl.c10.I <= 10e6 && pl.c10.F <= 30000 && pl.c30.I <= 30e6 && pl.c30.F <= 30000, pl);
  conf("plano rende o esperado com 10M (~9,4M)", pl.c10.L > 9.2e6, pl.c10);
  conf("plano usa o foco quando sobra dinheiro", pl.c30.F > 29000, pl.c30);

  /* 6. teleporte pelo peso */
  const tp = await p.evaluate(async () => { await pesoLoad(); return [tpCusto("T8_2H_HAMMER", "Thetford"), tpCusto("T8_ARMOR_PLATE_SET1", "Bridgewatch"), tpCusto("T8_2H_HAMMER", "Lymhurst")]; });
  conf("custo de teleporte pelo peso", tp[0] === 11902 && tp[1] === 2976 && tp[2] === 0, tp);

  /* 7. bônus diário de produção: a categoria do jogo casa com o item e entra no retorno */
  const bd = await p.evaluate(async () => { for (let i = 0; i < 40 && !(window.BONUS_DIA && window.BONUS_DIA.pct); i++) await new Promise(f => setTimeout(f, 250));
    for (let i = 0; i < 40 && !BONUS_CAT; i++) await new Promise(f => setTimeout(f, 250));
    const barra = document.querySelector(".fx-barra");
    return { arc: bdItem("T6_MAIN_ARCANESTAFF@1"), arcArt: bdItem("T6_2H_ARCANE_RINGPAIR_AVALON"), placa: bdItem("T5_ARMOR_PLATE_SET2"), couro: bdItem("T5_ARMOR_LEATHER_SET1"),
      espada: bdItem("T6_MAIN_SWORD"), barra: barra ? barra.innerText.replace(/\n/g, " | ") : null, naMain: !!(barra && barra.closest(".vip-top") && !barra.querySelector(".fx-x")) }; });
  conf("bônus diário casa com a categoria do item", bd.arc === 0.1 && bd.placa === 0.1 && bd.couro === 0 && bd.espada === 0, bd);
  conf("faixa de bônus aparece no cabeçalho, sem botão de fechar", bd.naMain && /Cajados arcanos/.test(bd.barra || "") && /Halloween/.test(bd.barra || ""), bd);

  /* 8. conjuntos de builds: principais = mínimo, opcionais até o máximo, salvo no aparelho */
  const cj = await p.evaluate(async () => { document.getElementById("t-builds").click();
    for (let i = 0; i < 80 && !document.querySelector("#bList .bcard"); i++) await new Promise(f => setTimeout(f, 250));
    localStorage.removeItem("conjuntos"); CJ = []; CJ_ED = null; renderBuilds();
    document.querySelector("#bConj .btn").click();
    for (let i = 0; i < 6; i++) { const b = [...document.querySelectorAll("#bList .cj-add")].find(x => !x.disabled && /Pôr/.test(x.textContent)); if (b) b.click(); }
    const c = CJ[0], cheio = [...document.querySelectorAll("#bList .cj-add")].some(x => x.disabled);
    c.min = 2; c.max = 3; cjAjusta(c); cjSalvar();
    const salvo = JSON.parse(localStorage.getItem("conjuntos") || "[]")[0] || {};
    return { p: salvo.p && salvo.p.length, o: salvo.o && salvo.o.length, txt: cjTexto(c).split("\n").length, cheio6: cheio }; });
  conf("conjunto de builds guarda principais e opcionais", cj.p === 2 && cj.o === 1 && cj.txt === 6, cj);

  /* 9. Refino: T2 e T3 na lista, e refinar sem foco */
  const rf = await p.evaluate(async () => { document.getElementById("t-refino").click();
    OF.tiers.clear(); OF.tiers.add(2); OF.tiers.add(3); renderOf();
    for (let i = 0; i < 60; i++) { await new Promise(f => setTimeout(f, 250)); if (document.querySelectorAll("#p-refino .of-rec").length) break; }
    const com = [...document.querySelectorAll("#p-refino .of-rec")].map(x => x.textContent);
    const it = ofItems("refine").find(x => x.id === "T3_PLANKS"), mF = ofModel(it);
    const fc = document.getElementById("ofFocus"); fc.checked = false; fc.dispatchEvent(new Event("change"));
    for (let i = 0; i < 20; i++) { await new Promise(f => setTimeout(f, 250)); if (/sem foco/.test(document.querySelector("#p-refino .of-rec")?.textContent || "")) break; }
    const sem = [...document.querySelectorAll("#p-refino .of-rec")].map(x => x.textContent), mS = ofModel(it);
    fc.checked = true; fc.dispatchEvent(new Event("change")); OF.tiers.clear();
    return { nCom: com.length, focoCom: /foco/.test(com[0] || ""), nSem: sem.length, semFoco: /sem foco/.test(sem[0] || ""), rrF: mF && mF.rr, rrS: mS && mS.rr, nS: mS && mS.N, fcS: mS && mS.fc, ing: it && it.ing.map(g => g.id + "x" + g.n) }; });
  conf("refino mostra T2 e T3 e refina sem foco", rf.nCom >= 5 && rf.semFoco && rf.nS === 100 && rf.fcS === 0 && rf.rrS < rf.rrF && String(rf.ing) === "T3_WOODx2,T2_PLANKSx1", rf);

  /* 10. compra em mais de uma cidade: vale a mais barata entre as marcadas */
  const bc = await p.evaluate(() => { const id = "T5_PLANKS", r = DATA.itens[id] || {}; const cs = SHOP_LOCS.filter(c => r[c] && r[c][0] > 0);
    const dois = cs.slice(0, 2), esperado = Math.min(...dois.map(c => r[c][0]));
    OF.buyS = "inst"; OF.buyC = new Set(dois); const b = pickBuy(id); OF.buyC = new Set(); OF.buyS = "auto"; ofCards();
    const lista = document.querySelectorAll("#ofBuyList .of-opt").length;
    return { SHOP_N: SHOP_LOCS.length, dois, p: b && b.p, c: b && b.c, esperado, lista, ui: !!document.querySelector("#bmBuyC.msel") }; });
  const oc = await p.evaluate(() => { DATA.itens.T9_TESTE = { Lymhurst: [2576, 0, 1, 0], Brecilien: [2850, 1805, 1, 1], Martlock: [2775, 2400, 1, 1] };
    OF.buyS = "ordem"; const a = pickBuy("T9_TESTE"); OF.buyC = new Set(["Lymhurst"]); const b = pickBuy("T9_TESTE"); OF.buyC = new Set(); OF.buyS = "auto"; delete DATA.itens.T9_TESTE;
    return { a, b }; });
  conf("ordem de compra ignora lance perdido e cai na compra na hora sem ordem", oc.a.p === 2400 && oc.a.mode === "ordem" && oc.b.p === 2576 && oc.b.mode === "inst", oc);
  const au = await p.evaluate(() => { DATA.itens.T9_VENDA = { Lymhurst: [100000, 60000, 1, 1], Martlock: [98000, 97000, 1, 1], Thetford: [102000, 0, 1, 0], Caerleon: [180000, 0, 1, 0] };
    const pega = s => { OF.sellS = s; const x = pickSell("T9_VENDA"); return x && [x.p, x.c, x.mode]; };
    const o = { auto: pega("auto"), ordem: pega("ordem"), inst: pega("inst") }; OF.sellS = "auto"; delete DATA.itens.T9_VENDA; return o; });
  conf("estratégia de venda: automático pesa as taxas e ignora anúncio fora da curva", String(au.ordem) === "102000,Thetford,ordem" && String(au.inst) === "97000,Martlock,inst" && String(au.auto) === "102000,Thetford,ordem", au);
  conf("compra aceita mais de uma cidade", bc.dois.length === 2 && bc.p === bc.esperado && bc.dois.includes(bc.c) && bc.lista === 1 + bc.SHOP_N && bc.ui, bc);

  /* 11. Cozinha: estratégia e cidades de venda */
  const cv = await p.evaluate(async () => { document.getElementById("t-cozinha").click(); await new Promise(f => setTimeout(f, 4000));
    DATA.itens.T9_SOPA = { Lymhurst: [1000, 600, 1, 1], Martlock: [980, 970, 1, 1], Thetford: [1020, 0, 1, 0], Caerleon: [1800, 0, 1, 0] };
    const o = {}; for (const s of ["auto", "ordem", "inst", "tipico"]) { CKV.s = s; const x = ckSale("T9_SOPA"); o[s] = x && [x.p, x.c, x.mode]; }
    CKV.s = "auto"; CKV.c = new Set(["Lymhurst"]); o.lym = ckSale("T9_SOPA"); CKV.c = new Set(); delete DATA.itens.T9_SOPA;
    document.querySelector('#ckVS [data-v="inst"]').click(); for (let i = 0; i < 40 && !/na hora/.test(document.querySelector("#ckTable .ck-venda small")?.textContent || ""); i++) await new Promise(f => setTimeout(f, 500));
    o.cel = document.querySelector("#ckTable .ck-venda small")?.textContent || ""; document.querySelector('#ckVS [data-v="auto"]').click();
    o.ui = !!document.querySelector("#ckVC.msel"); return o; });
  conf("Cozinha escolhe a venda pela estratégia e pela cidade", String(cv.ordem) === "1020,Thetford,ordem" && String(cv.inst) === "970,Martlock,inst" && String(cv.auto) === "1020,Thetford,ordem" && cv.tipico[2] === "tipico" && cv.lym.c === "Lymhurst" && /na hora/.test(cv.cel) && cv.ui, cv);

  /* 12. Transporte: rota com lucro depois das taxas, carga pela montaria e pelo que o destino vende */
  const tr = await p.evaluate(async () => { document.getElementById("t-transp").click(); await new Promise(f => setTimeout(f, 6000)); await bagData();
    const id = "T1_FACTION_FOREST_TOKEN_1"; DATA.itens[id] = { Lymhurst: [3000, 2900, 1, 1], Martlock: [4000, 3500, 1, 1], Thetford: [4100, 0, 1, 0] };
    OF2.hs[id + "|Martlock"] = { vol: 100, avg: 4000 }; OF2.hs[id + "|Thetford"] = { vol: 10, avg: 4100 };
    Object.assign(TR, { grp: "hearts", buy: "auto", sell: "auto", mount: "T8_MOUNT_OX", cash: "", dias: 3, seguro: false }); TR.de = new Set(["Lymhurst"]); TR.para = new Set(["Martlock", "Thetford"]);
    const rs = trRoutes([{ api: id, id, nm: "x", t: 1, e: 0, kind: "Coração" }]); TR.de = new Set(); TR.para = new Set();
    return { n: rs.length, r: rs.map(r => [r.b, Math.round(r.lucro), r.n, r.lim.join("+"), r.buy.mode, r.sell.mode]), cards: document.querySelectorAll(".tr-card").length }; });
  conf("transporte calcula rota, carga e limite de vendas", tr.n === 2 && tr.r[0][0] === "Martlock" && tr.r[0][2] === 300 && tr.r[1][2] === 30 && tr.r[1][3] === "vendas", tr);

  /* 13. Rotação de craft: bônus só na cidade certa, foco da visita respeitado, ordens por cidade */
  const rot = await p.evaluate(async () => { localStorage.removeItem("rotacao"); document.getElementById("t-rot").click(); await new Promise(f => setTimeout(f, 5000));
    const it = rotCatalogo().find(x => x.city === "Martlock" && x.t === 6 && x.e === 0); ROT.itens = { Martlock: [it.id] }; await rotEnsure(document.getElementById("rotNote"));
    const a = rotModel(it, "Martlock"), b = rotModel(it, "Lymhurst"), pl = rotPlano("Martlock", rotFocoVisita(), 0);
    renderRot(); await new Promise(f => setTimeout(f, 3000));
    return { cat: rotCatalogo().length, rA: a.rF, rB: b.rF, foco: pl.foco, max: rotFocoVisita(), n: pl.linhas[0] && (pl.linhas[0].nF + pl.linhas[0].nN), hoje: /Martlock/.test(document.getElementById("rotHoje").textContent), ord: document.querySelectorAll("#rotOrd table").length }; });
  conf("rotação aplica bônus da cidade, respeita o foco e lista as ordens", rot.cat > 1000 && rot.rA > rot.rB && rot.foco <= rot.max && rot.n > 0 && rot.hoje && rot.ord === 1, rot);
  const rdet = await p.evaluate(async () => { const it = rotCatalogo().find(x => x.city === "Martlock" && x.t === 6 && x.e === 0); ROT.itens = { Martlock: [it.id] }; ROT.qtd = {};
    await renderRot(); const inp = document.querySelector("#rotCid .rot-q input"); const sug = inp && +inp.value;
    inp.value = "12"; inp.dispatchEvent(new Event("change")); await new Promise(f => setTimeout(f, 1500));
    const l = rotPlano("Martlock", rotFocoVisita(), 0).linhas[0], d = document.querySelector("#rotCid .rot-det");
    const r = { sug, n: l.nF + l.nN, salvo: ROT.qtd.Martlock && ROT.qtd.Martlock[it.id], mats: d.querySelectorAll(".rot-mt tbody tr img, .rot-mt tbody tr .ico").length, cmp: d.querySelectorAll(".rot-det2 .rot-cmp tbody tr").length, linhas: d.querySelectorAll(".rot-plf").length };
    ROT.qtd = {}; rotSave(); return r; });
  conf("rotação: quantidade escolhida vale e fica salva; cidade mostra materiais com imagem e detalhes", rdet.sug > 0 && rdet.n === 12 && rdet.salvo === 12 && rdet.mats > 0 && rdet.cmp === 6 && rdet.linhas === 2, rdet);
  const rtet = await p.evaluate(() => { const it = rotCatalogo().find(x => x.city === "Martlock" && x.t === 6 && x.e === 0); ROT.itens = { Martlock: [it.id] }; ROT.qtd = {};
    const m = rotModel(it, "Martlock"); ROT.vDias = 3; ROT.fatia = 50; const a = rotPlano("Martlock", rotFocoVisita(), 0).linhas[0];
    ROT.vDias = 6; const b = rotPlano("Martlock", rotFocoVisita(), 0).linhas[0]; ROT.vDias = 3;
    return { vol: m.vol, a: a.n, b: b.n, esperado: Math.floor(m.vol * 0.5 * 3) }; });
  conf("rotação: sugestão não passa do que você vende no prazo", rtet.a === rtet.esperado && rtet.b >= rtet.a, rtet);
  const hmed = await p.evaluate(() => { const dia = i => new Date(Date.now() - i * 864e5).toISOString().slice(0, 10) + "T00:00:00";
    const pico = histDias([{ data: [[1, 40], [2, 3], [3, 2], [4, 3], [5, 2], [6, 3], [7, 2]].map(([d, n]) => ({ timestamp: dia(d), item_count: n, avg_price: 100 })) }]);
    const lento = histDias([{ data: [{ timestamp: dia(3), item_count: 1, avg_price: 80e6 }] }]);
    const hoje = histDias([{ data: [{ timestamp: dia(0), item_count: 500, avg_price: 1 }] }]);
    return { pico: pico.vol, media: pico.media, lento: lento.vol, hoje: hoje.vol, nota: !!volNota(pico) }; });
  conf("vendas por dia: mediana dos 7 dias, item lento usa a média, hoje não conta", hmed.pico === 3 && hmed.media > 7 && Math.abs(hmed.lento - 1 / 7) < 1e-9 && hmed.hoje === 0 && hmed.nota, hmed);
  const cenc2 = await p.evaluate(async () => { document.getElementById("t-cozinha").click(); await new Promise(f => setTimeout(f, 1500)); await ensureCook();
    const a = cookModel("T8_MEAL_STEW"), b = cookModel("T8_MEAL_STEW@2"), pz = cookModel("T6_POTION_HEAL@3"), mol = b && b.parts.find(x => x.iid === "T1_FISHSAUCE_LEVEL2");
    SRC.ckO = { ...(SRC.ckO || {}), T1_FISHSAUCE_LEVEL2: "faco" }; const f = cookModel("T8_MEAL_STEW@2"), mf = f && f.parts.find(x => x.iid === "T1_FISHSAUCE_LEVEL2");
    const esperado = 45 * ckBuy("T1_FISHCHOPS").p + 3 * ckBuy("T1_SEAWEED").p; delete SRC.ckO.T1_FISHSAUCE_LEVEL2;
    CK_ENC.clear(); CK_ENC.add(2); await renderCook(); const linhas = [...document.querySelectorAll("#ckTable tbody tr[data-fav]")].map(tr => tr.dataset.fav);
    CK_ENC.clear(); CK_ENC.add(0); renderCook();
    const craft = ofItems("meal").find(x => x.id === "T8_MEAL_STEW@1");
    return { nome: b && b.name, mol: mol && mol.c, custo: a && b && mol ? Math.round(b.cost - a.cost - mol.c * mol.p.p) : null, foco: COOK.r["T8_MEAL_STEW@2"][3], ext: pz && pz.parts.some(x => x.iid === "T1_ALCHEMY_EXTRACT_LEVEL3"),
      faco: mf && mf.p.src === "faco" && Math.round(mf.p.p) === Math.round(esperado), linhas: linhas.length, so2: linhas.every(x => x.endsWith("@2")), craftE: craft && craft.e }; });
  conf("cozinha: comida e poção encantadas com molho de peixe e extrato arcano no custo", cenc2.nome === "Guisado de Carne .2" && cenc2.mol === 90 && cenc2.custo === 0 && cenc2.foco === 1152 && cenc2.ext && cenc2.faco && cenc2.linhas > 0 && cenc2.so2 && cenc2.craftE === 1, cenc2);
  const pxv = await p.evaluate(async () => { const id = "T4_TESTE_VENDA", H = (c, vol, avg) => { OF2.hs[id + "|" + c] = { vol, avg }; };
    const r = { Bridgewatch: [130000, 0], "Fort Sterling": [110000, 100000], Lymhurst: [120000, 0] };
    H("Bridgewatch", 0, 0); H("Fort Sterling", 18, 105000); H("Lymhurst", 16, 122000);
    const sem = PX.melhorVenda(r, Object.keys(r), "auto"), com = PX.melhorVenda(r, Object.keys(r), "auto", { id });
    const cap = PX.melhorVenda({ Lymhurst: [200000, 0] }, ["Lymhurst"], "auto", { id });
    const capQ = PX.melhorVenda({ Lymhurst: [200000, 0] }, ["Lymhurst"], "auto", { id, qual: 3 });
    H("Fort Sterling", 0.5, 105000); H("Lymhurst", 0.4, 122000); const pouco = PX.melhorVenda(r, Object.keys(r), "ordem", { id });
    const ordem = PX.melhorVenda({ "Fort Sterling": [0, 90000] }, ["Fort Sterling"], "auto", { id });
    const velho = window.apiJSON; window.apiJSON = async () => [{ item_id: "X", city: "Black Market", buy_price_max: 17000, buy_price_max_date: new Date().toISOString().slice(0, 19), sell_price_min: 0 },
      { item_id: "X", city: "Bridgewatch", sell_price_min: 130000, sell_price_min_date: new Date().toISOString().slice(0, 19), buy_price_max: 0 }];
    let menu; try { menu = (await imPrecos(["X"], 1, true)).X; } finally { window.apiJSON = velho; }
    return { sem: sem && sem.c, com: com && com.c + ":" + com.p, cap: cap && cap.p + ":" + cap.anuncio, capQ: capQ && capQ.p, pouco: pouco && pouco.c + ":" + !!pouco.semSaida, ordem: ordem && ordem.mode + ":" + !!ordem.semSaida, menuP: menu && menu.p, menuC: menu && menu.c }; });
  conf("venda: anúncio só conta onde o item vende, com teto de 1,3× o preço médio da cidade", pxv.sem === "Bridgewatch" && pxv.com === "Lymhurst:120000" && pxv.cap === "158600:200000" && pxv.capQ === 200000 && pxv.pouco === "Lymhurst:true" && pxv.ordem === "inst:false", pxv);
  conf("menu do item: anúncio aparece mesmo quando a ordem de compra vem primeiro", pxv.menuP === 130000 && pxv.menuC === "Bridgewatch", pxv);
  const v2 = await p.evaluate(async () => { const id = "T4_TESTE_V2", H = (c, vol, avg) => { OF2.hs[id + "|" + c] = { vol, avg }; };
    const r = { Bridgewatch: [130000, 0], "Fort Sterling": [110000, 0], Lymhurst: [120000, 0], Martlock: [125000, 0] };
    H("Bridgewatch", 0, 0); H("Fort Sterling", 18, 105000); H("Lymhurst", 16, 122000); H("Martlock", 0.5, 120000);
    const a = PX.melhorVenda(r, Object.keys(r), "ordem", { id }), b = PX.segunda(r, Object.keys(r), "ordem", { id }), so1 = PX.segunda({ Lymhurst: [120000, 0] }, ["Lymhurst"], "ordem", { id });
    const it = rotCatalogo().find(x => x.city === "Lymhurst" && x.t === 5 && x.e === 0); await rotEnsure(document.getElementById("rotNote")); const m = rotModel(it, "Lymhurst");
    return { a: a && a.c, b: b && b.c, so1, rot: !m.venda2 || (m.venda2.c !== m.venda.c && m.venda2.k <= m.venda.k), txt: m.venda2 ? rotV2Txt(m).startsWith("2ª cidade:") : true }; });
  conf("venda: segunda cidade de venda é a segunda que deixa mais prata entre as que vendem", v2.a === "Lymhurst" && v2.b === "Fort Sterling" && v2.so1 === null && v2.rot && v2.txt, v2);
  const ckc = await p.evaluate(async () => { document.getElementById("t-cozinha").click(); await new Promise(f => setTimeout(f, 800)); await ensureCook();
    const id = "T7_MULLEIN", r = DATA.itens[id] || {}, cs = Object.keys(r).filter(c => r[c][0] > 0); const c1 = cs[0];
    CKV.b.clear(); const todas = ckBuy(id); CKV.b.add(c1); const uma = ckBuy(id); CKV.b.clear();
    feeSetK("ck:p", 500); feeSetK("ck:f", 500); const pz = cookModel("T7_POTION_STONESKIN"); feeSetK("ck:f", 900); const pzF = cookModel("T7_POTION_STONESKIN"); feeSetK("ck:p", 800); const pz2 = cookModel("T7_POTION_STONESKIN");
    await renderCook(); const ui = document.querySelector("#ckFee input"), fk = ui && ui.closest(".fee-ui").dataset.fk; ui.value = "700"; ui.dispatchEvent(new Event("input")); await new Promise(f => setTimeout(f, 450));
    const salvo = JSON.parse(localStorage.getItem("taxasEstacao") || "{}"); feeSetK("ck:f", 500); feeSetK("ck:p", 500);
    const it = rotCatalogo().find(x => x.city === "Lymhurst" && x.t === 5 && x.e === 0); await rotEnsure(document.getElementById("rotNote"));
    feeSetK("rot:Lymhurst", 0); const r0 = rotModel(it, "Lymhurst"), m0 = rotModel(it, "Martlock"); feeSetK("rot:Lymhurst", 1000); const r1 = rotModel(it, "Lymhurst"), m1 = rotModel(it, "Martlock"); feeSetK("rot:Lymhurst", 500);
    feeSetK("craft", 0); const refino = +document.getElementById("fee").value; feeSetK("craft", 500);
    return { c1, uma: uma && uma.p, esperado: r[c1] && r[c1][0], todas: !!todas, potFee: pz && Math.round(pz.fee), esperadoFee: Math.round(5 * COOK.r.T7_POTION_STONESKIN[4] * 0.1125 * 5), nut: COOK.r.T7_POTION_STONESKIN[4],
      separado: pzF.fee === pz.fee && pz2.fee > pz.fee, fk, salvo: salvo["ck:f"], rot0: r0.fee === 0, rot1: r1.fee > 0, outra: m0.fee === m1.fee, refino }; });
  conf("taxa da estação: cada estação com o seu valor (cozinha, alquimia, cidade da rotação, craft e refino), poção com taxa, cidades de compra", ckc.uma === ckc.esperado && ckc.todas && ckc.potFee === ckc.esperadoFee && ckc.nut === 1899 && ckc.separado && ckc.fk === "ck:f" && ckc.salvo === 700 && ckc.rot0 && ckc.rot1 && ckc.outra && ckc.refino === 500, ckc);
  const refl = await p.evaluate(async () => { document.getElementById("t-refino").click(); await new Promise(f => setTimeout(f, 3000));
    const velho = window.histFetch; let solta; window.histFetch = () => new Promise(f => { solta = f; }); for (const k in OF2.hs) delete OF2.hs[k];
    const ini = Date.now(); await Promise.race([renderOf(), new Promise(f => setTimeout(f, 8000))]); const ms = Date.now() - ini;
    const linhas = document.querySelectorAll("#ofTable .of-row").length, aviso = /Conferindo em quais cidades/.test(document.getElementById("ofNote").textContent);
    window.histFetch = velho; if (solta) solta(); await new Promise(f => setTimeout(f, 1500)); return { ms, linhas, aviso }; });
  conf("refino: a lista aparece sem esperar as vendas por cidade (que chegam depois)", refl.linhas > 0 && refl.aviso && refl.ms < 8000, refl);
  const renc = await p.evaluate(async () => { const it = rotCatalogo().find(x => x.city === "Lymhurst" && x.t === 5 && x.e === 2); ROT.itens = { Lymhurst: [it.id] }; ROT.qtd = {};
    ROT.enc = "runas"; await rotEnsure(document.getElementById("rotNote")); const a = rotModel(it, "Lymhurst");
    ROT.enc = "craft"; const b = rotModel(it, "Lymhurst"); ROT.enc = "auto"; const c = rotModel(it, "Lymhurst");
    ROT.enc = "runas"; ROT.qtd = { Lymhurst: { [it.id]: 3 } }; const comp = rotCompras(rotPlano("Lymhurst", rotFocoVisita(), 0)).map(x => x.id); ROT.enc = "auto"; ROT.qtd = {};
    return { usa: a.enc && a.enc.usa, runas: a.mats.filter(x => x.g.enc).map(x => x.g.id + ":" + x.g.n), semRuna: b.mats.every(x => !x.g.enc), auto: c.enc && c.enc.usa, menor: c.enc && Math.min(c.enc.a, c.enc.b) === (c.enc.usa === "runas" ? c.enc.b : c.enc.a), comp }; });
  conf("rotação: item .2 pode ser .0 + runas e almas, com os materiais na compra", renc.usa === "runas" && renc.runas.length === 2 && /RUNE/.test(renc.runas[0]) && /SOUL/.test(renc.runas[1]) && renc.semRuna && renc.menor && renc.comp.some(x => /_SOUL$/.test(x)), renc);
  const cenc = await p.evaluate(async () => { document.getElementById("t-craft").click(); await new Promise(f => setTimeout(f, 3000));
    OF.tiers.clear(); OF.tiers.add(5); OF.enchs.clear(); OF.enchs.add(2); await ensureOfG("g:espada", null); const it = ofItems("g:espada").find(x => x.e === 2 && x.encR);
    if (!it) return { it: false }; const r = {}; for (const w of ["runas", "craft", "auto"]) { OF2.enc = w; const m = ofModel(it); r[w] = { usa: m.enc && m.enc.usa, ids: m.parts.map(x => x.id), a: m.enc && m.enc.a, b: m.enc && m.enc.b, fc1: m.fc1 }; }
    OF2.enc = "auto"; OF.tiers.clear(); OF.enchs.clear(); return { it: true, ...r }; });
  conf("craft: item .2 por .0 + runas e almas, ou já encantado, ou o mais barato", cenc.it && cenc.runas.usa === "runas" && cenc.runas.ids.some(x => /_RUNE$/.test(x)) && cenc.runas.ids.some(x => /_SOUL$/.test(x)) && !cenc.runas.ids.some(x => /_LEVEL/.test(x))
    && cenc.craft.usa === "craft" && !cenc.craft.ids.some(x => /_RUNE$|_SOUL$/.test(x)) && cenc.auto.usa === (cenc.auto.b < cenc.auto.a ? "runas" : "craft") && cenc.runas.fc1 < cenc.craft.fc1, cenc);
  const r4 = await p.evaluate(() => { const it = rotCatalogo().find(x => x.city === "Martlock" && x.t === 6 && x.e === 4); try { return { ok: rotRotaEnc(it) === null && !!rotModel(it, "Martlock") }; } catch (e) { return { ok: false, err: e.message }; } });
  conf("rotação: item .4 não quebra (sem caminho de encantar)", r4.ok, r4);

  const rf2 = await p.evaluate(() => { const it = rotCatalogo().find(x => x.city === "Martlock" && x.t === 6 && x.e === 0); ROT.itens = { Martlock: [it.id] };
    const m = rotModel(it, "Martlock"); ROT.minPct = String(Math.ceil(m.pct * 100) + 5); const fora = rotPlano("Martlock", rotFocoVisita(), 0).linhas[0];
    ROT.minPct = ""; ROT.minVol = String((m.vol || 0) + 1000); const fora2 = rotPlano("Martlock", rotFocoVisita(), 0).linhas[0]; ROT.minVol = "";
    return { f1: fora.fora && fora.nF + fora.nN === 0, f2: fora2.fora && fora2.nF + fora2.nN === 0, tem: ROT.cidades.includes("Thetford") }; });
  conf("rotação: filtros de lucro % e vendas tiram o item do plano; Thetford na lista", rf2.f1 && rf2.f2 && rf2.tem, rf2);

  const e0 = await p.evaluate(async () => { ROT.enchs = [0];
    await rotSugCalc("Fort Sterling", () => {}, "spec"); const k = Object.keys(ROT_SUG).find(x => x.startsWith("Fort Sterling")); const l = (ROT_SUG[k] && ROT_SUG[k].lista) || [];
    ROT.enchs = []; return { n: l.length, enc: l.map(x => x.m.it.e) }; });
  conf("rotação: só sem encantamento", e0.enc.every(e => e === 0), e0);

  const bmr = await p.evaluate(() => { const id = "T9_BMTESTE"; DATA.itens[id] = { Lymhurst: [100000, 0, 1, 0], "Black Market": [0, 150000, 0, 1] };
    ROT.bm = true; const a = rotVenda(id); ROT.bm = false; const b = rotVenda(id); ROT.bm = true; delete DATA.itens[id]; return { a: a && a.c, b: b && b.c }; });
  conf("rotação: venda no Mercado Negro liga e desliga", bmr.a === "Black Market" && bmr.b === "Lymhurst", bmr);

  const rfl = await p.evaluate(() => { const id = "T9_VTESTE"; DATA.itens[id] = { Lymhurst: [100000, 90000, 1, 1], Martlock: [98000, 0, 1, 0], Thetford: [99000, 0, 1, 0], Caerleon: [250000, 0, 1, 0] };
    const o = {}; ROT.vendaC = []; ROT.venda = "auto"; o.auto = rotVenda(id); ROT.venda = "inst"; o.inst = rotVenda(id); ROT.venda = "auto"; ROT.vendaC = ["Martlock"]; o.mart = rotVenda(id); ROT.vendaC = [];
    const t6 = rotCatalogo().filter(it => { ROT.tiers = [6]; ROT.grupo = "armaduras"; return rotCatOk(it); }); ROT.tiers = []; ROT.grupo = ""; delete DATA.itens[id];
    return { auto: o.auto && [o.auto.c, o.auto.mode], inst: o.inst && [o.inst.c, o.inst.mode], mart: o.mart && o.mart.c, t6: t6.length, ok6: t6.every(it => it.t === 6 && it.grp === "armaduras") }; });
  conf("rotação: filtros de venda, cidade, tier e tipo", rfl.auto[0] !== "Caerleon" && rfl.inst[1] === "inst" && rfl.mart === "Martlock" && rfl.t6 > 0 && rfl.ok6, rfl);

  const pts = await p.evaluate(() => { const id = "T1_FACTION_FOREST_TOKEN_1"; DATA.itens[id] = { Lymhurst: [3000, 2900, 1, 1], Martlock: [4000, 3500, 1, 1], Thetford: [4100, 0, 1, 0] };
    Object.assign(TR, { pontos: true, qtdPontos: "50", seguro: false, sell: "auto" }); TR.de = new Set(); TR.para = new Set();
    const rs = trRoutes([{ api: id, id, nm: "x", home: "Lymhurst", t: 1, e: 0, kind: "Coração" }]); TR.pontos = false; TR.qtdPontos = "";
    const lo = TR_LOADED; lo.add("X"); const tem = lo.has("X");
    return { origens: [...new Set(rs.map(r => r.a))], custo: rs.every(r => r.buy.k === 0), n: rs.map(r => r.n), mesma: rs.some(r => r.b === "Lymhurst"), tem }; });
  conf("transporte: corações por pontos de facção saem sem custo da cidade da facção", String(pts.origens) === "Lymhurst" && pts.custo && pts.n.every(n => n <= 50) && pts.mesma && pts.tem, pts);

  /* 14. motor único de preços: as quatro páginas dão o mesmo resultado para o mesmo preço */
  const px = await p.evaluate(() => { const id = "T9_PXTESTE"; DATA.itens[id] = { Lymhurst: [1000, 950, 1, 1], Martlock: [980, 600, 1, 1], Thetford: [1020, 0, 1, 0], Caerleon: [1800, 0, 1, 0], "Black Market": [0, 1100, 0, 1] };
    const o = { teto: Math.round(PX.teto(DATA.itens[id])) };
    o.cMart = PX.compra(DATA.itens[id], "Martlock", "ordem"); o.cLance = PX.compra(DATA.itens[id], "Lymhurst", "ordem", { lance: 1 }).p; o.vBM = PX.venda(DATA.itens[id], "Black Market", "ordem", Infinity).mode;
    OF.sellS = "auto"; OF.sellC = new Set(["Lymhurst", "Martlock", "Thetford", "Caerleon"]); const a = pickSell(id); OF.sellC = new Set();
    CKV.s = "auto"; CKV.c = new Set(["Lymhurst", "Martlock", "Thetford", "Caerleon"]); const b = ckSale(id); CKV.c = new Set();
    TR.sell = "auto"; const tt = PX.teto(DATA.itens[id]); const c = ["Lymhurst", "Martlock", "Thetford", "Caerleon"].map(x => trSell(DATA.itens[id], x, tt)).filter(Boolean).sort((x, y) => y.k - x.k)[0];
    ROT.venda = "auto"; ROT.vendaC = ["Lymhurst", "Martlock", "Thetford", "Caerleon"]; ROT.bm = false; const d = rotVenda(id); ROT.vendaC = []; ROT.bm = true;
    OF.buyS = "auto"; const e = pickBuy(id); OF.buyS = "auto"; delete DATA.itens[id];
    return { ...o, cMart: o.cMart.mode, venda: [a, b, c, d].map(x => x && x.c + ":" + x.mode + ":" + x.p), compra: e && e.c + ":" + e.mode + ":" + e.p }; });
  conf("motor único: teto, lance perdido, Mercado Negro e as quatro páginas iguais", px.teto === 1313 && px.cMart === "inst" && px.cLance === 951 && px.vBM === "inst" && new Set(px.venda).size === 1 && px.venda[0] === "Thetford:ordem:1020" && px.compra === "Lymhurst:ordem:950", px);

  /* 15. qualidade pela spec: confere com o exemplo do Albion Free Market (750 pontos: Excelente ou melhor 8,97%, Obra-prima 0,847%) */
  const ql = await p.evaluate(() => { const c = qualChances(750), z = qualChances(0); return { exc: (c[4] + c[5]) * 100, op: c[5] * 100, soma: c.slice(1).reduce((a, b) => a + b, 0), n0: z[1] }; });
  conf("chances de qualidade pela spec", Math.abs(ql.exc - 8.972) < 0.01 && Math.abs(ql.op - 0.8468) < 0.005 && Math.abs(ql.soma - 1) < 1e-9 && Math.abs(ql.n0 - 0.689) < 1e-9, ql);

  const rref = await p.evaluate(async () => { const it = rotCatalogo().find(x => x.city === "Martlock" && x.t === 6 && x.e === 0 && x.ing.some(g => /METALBAR|LEATHER|CLOTH|PLANKS/.test(g.id)));
    ROT.itens = { Martlock: [it.id] }; ROT.refinar = true; await rotEnsure(document.getElementById("rotNote"));
    const g = it.ing.find(g => /METALBAR|LEATHER|CLOTH|PLANKS/.test(g.id)), ref = rotRef(g.id, false), refF = rotRef(g.id, true), m = rotModel(it, "Martlock");
    const usa = m.mats.some(x => x.m.use.mode === "refino"); renderRot(); await new Promise(f => setTimeout(f, 2500));
    const ord = document.getElementById("rotOrd").textContent; ROT.refinar = false;
    return { ok: !!ref, menorComFoco: refF && ref && refF.k < ref.k, usa, ordRaw: usa ? /para refinar em/.test(ord) : true, spf: m.refSpf }; });
  conf("rotação: refinar você mesmo entra no custo e nas ordens", rref.ok && rref.menorComFoco && rref.ordRaw, rref);

  /* 16. Lista de compras: soma o mesmo material na mesma cidade, separa por cidade e marca comprado */
  const lc = await p.evaluate(async () => { localStorage.removeItem("compras"); LC = [];
    lcAdd([{ id: "T5_PLANKS", q: 10, nm: "Tábua T5", c: "Lymhurst", p: 1000, modo: "ordem" }, { id: "T5_METALBAR", q: 4, nm: "Barra T5", c: "Martlock", p: 2000, modo: "inst" }], "Craft: A");
    lcAdd([{ id: "T5_PLANKS", q: 5.2, nm: "Tábua T5", c: "Lymhurst", p: 1100, modo: "ordem" }], "Rotação: Lymhurst");
    document.getElementById("t-compras").click(); await new Promise(f => setTimeout(f, 800));
    const cards = document.querySelectorAll("#lcBox .lc-c").length, linhas = document.querySelectorAll("#lcBox .lc-i").length;
    document.querySelector("#lcBox .lc-i input").click(); await new Promise(f => setTimeout(f, 300));
    const salvo = JSON.parse(localStorage.getItem("compras")); const t = salvo.find(i => i.id === "T5_PLANKS");
    const badge = document.querySelector("#t-compras .fl").textContent; localStorage.removeItem("compras"); LC = [];
    return { cards, linhas, q: t.q, origem: t.origem.length, feito: salvo.some(i => i.feito), badge }; });
  conf("lista de compras soma, separa por cidade e marca comprado", lc.cards === 2 && lc.linhas === 2 && lc.q === 16 && lc.origem === 2 && lc.feito && /1 item/.test(lc.badge), lc);

  conf("nenhum erro de script no fim", erros.length === 0, erros.slice(0, 5));
  await b.close();
  console.log(ok.map(x => "ok   " + x).join("\n")); if (falhas.length) { console.log(falhas.map(x => "FALHOU " + x).join("\n")); process.exit(1); }
  console.log(`\n${ok.length} testes passaram.`);
})().catch(e => { console.error(e); process.exit(1); });
