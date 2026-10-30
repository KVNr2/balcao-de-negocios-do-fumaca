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
  for (const t of ["t-voce", "t-plano", "t-refino", "t-craft", "t-encantar", "t-cozinha", "t-fazenda", "t-pesca", "t-trab", "t-mk", "t-mercado", "t-builds", "t-pvp", "t-versao"]) {
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
      espada: bdItem("T6_MAIN_SWORD"), barra: barra ? barra.innerText.replace(/\n/g, " | ") : null, naMain: !!(barra && barra.closest(".main")) }; });
  conf("bônus diário casa com a categoria do item", bd.arc === 0.1 && bd.placa === 0.1 && bd.couro === 0 && bd.espada === 0, bd);
  conf("faixa de bônus aparece no topo das páginas", bd.naMain && /Cajados arcanos/.test(bd.barra || "") && /Halloween/.test(bd.barra || ""), bd);

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

  conf("nenhum erro de script no fim", erros.length === 0, erros.slice(0, 5));
  await b.close();
  console.log(ok.map(x => "ok   " + x).join("\n")); if (falhas.length) { console.log(falhas.map(x => "FALHOU " + x).join("\n")); process.exit(1); }
  console.log(`\n${ok.length} testes passaram.`);
})().catch(e => { console.error(e); process.exit(1); });
