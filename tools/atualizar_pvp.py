#!/usr/bin/env python3
"""Atualiza data/pvp.json: builds e jogadores do PvP por conteúdo (Hellgate 2v2/5v5, Corrompidas, Brumas solo, Depths), servidor US (Americas).
Fonte: API oficial (gameinfo.albiononline.com). O conteúdo de cada morte é deduzido por uma árvore treinada com os rótulos do killboard-1 (tools/treinar_pvp.py).
Jogadores: sementes em data/pvp-sementes.json (criadas dos rótulos na primeira vez e renovadas a cada rodada pelos mais ativos de cada conteúdo).
Janela: últimos 30 dias. Se algo falhar ou vierem poucos eventos, NÃO sobrescreve o arquivo atual."""
import json, os, re, sys, time, datetime, collections, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pvp_comum as C
import papel_arma
B = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0 Safari/537.36", "Accept": "application/json"}
DIAS = 30; PAGINAS = int(os.environ.get("PVP_PAGINAS", "3")); ORCAMENTO = int(os.environ.get("PVP_MINUTOS", "25")) * 60; SEMENTES_POR = int(os.environ.get("PVP_SEMENTES", "45")); CONF = 0.7
CONT = ["hg2", "hg5", "corrompida", "solo", "depths"]
SLOT = {"MainHand": "w", "OffHand": "o", "Head": "h", "Armor": "a", "Shoes": "s", "Cape": "c", "Potion": "p", "Food": "f"}
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
FALHAS = collections.Counter()
import api_suave
get = api_suave.get; FALHAS = api_suave.FALHAS
def base(t):
    m = re.match(r"T(\d)_(.+?)(?:@(\d))?$", t or ""); return m.group(2) if m else None
def pessoas(e):
    """(vitoriosos, vítima): vitoriosos = quem matou e quem ajudou (dano ou cura), sem repetir."""
    v = e["Victim"]; vistos = {}; 
    for p in [e["Killer"]] + [p for p in (e.get("Participants") or []) if p.get("_g") or (p.get("DamageDone") or 0) > 0 or (p.get("SupportHealingDone") or 0) > 0]:
        if p.get("Id") and p["Id"] not in vistos: vistos[p["Id"]] = p
    return list(vistos.values()), v
def topo(cn, n=1):
    """itens mais usados juntando as variações de tier e encantamento do mesmo item; devolve a variação mais comum de cada um"""
    g = {}
    for ty, q in cn.items():
        b = base(ty) or ty; r = g.setdefault(b, [0, ty, 0]); r[0] += q
        if q > r[2]: r[1], r[2] = ty, q
    return [r[1] for r in sorted(g.values(), key=lambda r: -r[0])[:n]]
def chave(p):
    eq = p.get("Equipment") or {}; w = base((eq.get("MainHand") or {}).get("Type"))
    if not w: return None
    o = base((eq.get("OffHand") or {}).get("Type")) or ""
    return f"{w}|{o}"
def tamanho(c, e):
    n = len(e.get("GroupMembers") or [])
    if c == "hg2": return 2
    if c == "hg5": return 5
    if c in ("corrompida", "solo"): return 1
    return 1 if n <= 1 else 2 if n == 2 else 3
def main():
    arv = C.carregar(); corte = datetime.datetime.utcnow() - datetime.timedelta(days=DIAS)
    sem_f = os.path.join(ROOT, "data", "pvp-sementes.json")
    if os.path.exists(sem_f): sem = json.load(open(sem_f))
    else:
        rot = json.load(open(os.path.join(HERE, "rotulos-killboard1-us.json"))); cnt = {c: collections.Counter() for c in CONT}; nomes = {}
        def um(i):
            return i, get(f"/events/{i}")
        ids = [(i, l) for i, l in rot.items() if l in CONT]
        with ThreadPoolExecutor(8) as ex:
            for (i, l), (_, e) in zip(ids, ex.map(lambda x: um(x[0]), ids)):
                if not isinstance(e, dict) or "Killer" not in e: continue
                for p in [e["Killer"], e["Victim"]]:
                    if p.get("Id"): cnt[l][p["Id"]] += 1; nomes[p["Id"]] = p.get("Name")
        sem = {c: [[i, nomes[i]] for i, _ in cnt[c].most_common(SEMENTES_POR)] for c in CONT}
        print("sementes criadas:", {c: len(v) for c, v in sem.items()})
    jog = {}
    for c in CONT:
        for i, n in sem.get(c, []): jog[i] = n
    print("jogadores a ler:", len(jog))
    eventos = {}
    inicio = time.time()
    DADOS = os.environ.get("PVP_DADOS", "")
    if DADOS:
        import gzip, glob
        corte_d = (datetime.datetime.utcnow() - datetime.timedelta(days=DIAS)).strftime("%Y-%m-%d")
        # Américas (PVP_DADOS), Europa (PVP_DADOS_EU) e Ásia (PVP_DADOS_SGP): uma branch de dados por servidor. Os ids de morte são por servidor, então a chave leva o servidor
        for srv, raiz in (("us", DADOS), ("eu", os.environ.get("PVP_DADOS_EU", "")), ("sgp", os.environ.get("PVP_DADOS_SGP", ""))):
            if not raiz: continue
            for arq in sorted(glob.glob(os.path.join(raiz, "eventos", "*.jsonl.gz"))):
                if os.path.basename(arq)[:10] < corte_d: continue
                for l in gzip.open(arq, "rt", encoding="utf-8"):
                    try: r = json.loads(l); eventos[(srv, r["id"])] = dict(C.desempacotar(r), _s=srv)
                    except Exception: pass
        print("eventos lidos do acervo (coletor):", len(eventos), flush=True)
    MODO_ARM = len(eventos) >= int(os.environ.get("PVP_MIN_ARM", "3000"))
    if MODO_ARM: jog = {}
    def uma(args):
        pid, tipo = args
        out = []
        for pg in range(PAGINAS):
            if time.time() - inicio > ORCAMENTO: break
            r = get(f"/players/{pid}/{tipo}?limit=51&offset={pg * 51}")
            if not isinstance(r, list) or not r: break
            out += [x for x in r if isinstance(x, dict) and "Killer" in x]
            try:
                if datetime.datetime.strptime(r[-1]["TimeStamp"][:19], "%Y-%m-%dT%H:%M:%S") < corte: break
            except Exception: pass
        return out
    tarefas = [(pid, t) for pid in jog for t in ("kills", "deaths")]
    with ThreadPoolExecutor(int(os.environ.get("PVP_THREADS", "3"))) as ex:
        for k, evs in enumerate(ex.map(uma, tarefas)):
            for e in evs: eventos[e["EventId"]] = e
            if k % 50 == 0: print("lidas", k, "de", len(tarefas), "listas;", len(eventos), "eventos;", int(time.time() - inicio), "s; falhas", dict(FALHAS), flush=True)
    print("eventos únicos:", len(eventos), "falhas:", dict(FALHAS))
    # classificar e agregar
    S = {}   # (conteudo, tamanho) -> dados
    ativos = {c: collections.Counter() for c in CONT}; nomes_at = {}
    n_class = collections.Counter(); datas = []
    def ag(c, t):
        return S.setdefault((c, t), {"b": {}, "p": {}, "x": collections.defaultdict(lambda: [0, 0]), "n": 0})
    cl = []; cnt_j = collections.Counter()
    for e in eventos.values():
        try:
            if datetime.datetime.strptime(e["TimeStamp"][:19], "%Y-%m-%dT%H:%M:%S") < corte: continue
            if e.get("_x") and e.get("_m") != arv.get("_v"): pr = C.prever_vetor(arv, e["_x"])   # modelo mudou: reclassifica com o atual
            elif "_c" in e: pr = {e["_c"]: 1.0}
            else: pr = C.prever(arv, C.feat(e))
        except Exception: continue
        c = max(pr, key=pr.get)
        if c not in CONT or pr[c] < CONF or not C.cabe(c, e): continue
        cl.append((c, e))
        venc, v = pessoas(e)
        for p in venc + [v]: cnt_j[(c, p.get("Id"))] += 1
    def exp(c, pid): return True      # todos os jogadores entram (a fama de PvP não é usada: ela pode vir de ZvZ)
    def xp(c, pid): return None
    n_keep = collections.Counter(); n_srv = collections.Counter()
    GRUPO = ("hg2", "hg5", "depths")    # lutas em grupo: o resultado é da luta (qual grupo ganhou), não de cada morte
    GAP = 150                            # s entre mortes seguidas com jogadores em comum para valerem como a mesma luta
    def comp_reg(A, t, time, ganhou):
        """composição = as armas do grupo (só vale com o grupo completo: t jogadores, todos com arma)"""
        if len(time) != t: return
        ps = sorted(((base((((p.get("Equipment") or {}).get("MainHand")) or {}).get("Type")) or "", chave(p) or "", p) for p in time), key=lambda x: (x[0], x[1]))
        if any(not w for w, _, _ in ps): return
        key = "+".join(w for w, _, _ in ps)
        C_ = A.setdefault("comp", {}).setdefault(key, {"v": 0, "d": 0, "m": [{"gear": collections.defaultdict(collections.Counter), "ip": [], "jog": set(), "k": collections.Counter()} for _ in ps]})
        C_["v" if ganhou else "d"] += 1
        for mm, (w, k, p) in zip(C_["m"], ps):
            mm["jog"].add(p.get("Id")); mm["k"][k] += 1
            if p.get("AverageItemPower"): mm["ip"].append(p["AverageItemPower"])
            for sl, js in SLOT.items():
                ty = ((p.get("Equipment") or {}).get(sl) or {}).get("Type")
                if ty: mm["gear"][js][ty] += 1
    def registrar(c, t, ganhadores, perdedores, nev):
        """uma luta (ou uma morte, nos conteúdos solo): cada jogador conta uma vez, como vencedor ou perdedor"""
        A = ag(c, t); A["n"] += 1; A["ev"] = A.get("ev", 0) + nev
        if c in GRUPO:
            for time, ganhou in ((ganhadores, True), (perdedores, False)): comp_reg(A, t, time, ganhou)
        kperd = {chave(p) for p in perdedores} - {None}; kvs = {chave(p) for p in ganhadores} - {None}
        def reg(p, ganhou):
            k = chave(p)
            if not k: return
            b = A["b"].setdefault(k, {"v": 0, "d": 0, "ip": [], "jog": set(), "gear": collections.defaultdict(collections.Counter), "par": collections.Counter()})
            b["v" if ganhou else "d"] += 1; b["jog"].add(p.get("Id"))
            if p.get("AverageItemPower"): b["ip"].append(p["AverageItemPower"])
            for sl, js in SLOT.items():
                ty = ((p.get("Equipment") or {}).get(sl) or {}).get("Type")
                if ty: b["gear"][js][ty] += 1
            if ganhou:
                for o in ganhadores:
                    ko = chave(o)
                    if ko and ko != k: b["par"][ko] += 1
            pl = A["p"].setdefault(p.get("Id"), {"xp": xp(c, p.get("Id")), "nome": p.get("Name"), "v": 0, "d": 0, "ip": [], "b": collections.Counter(), "guild": p.get("GuildName") or "", "g": {}})
            pl["v" if ganhou else "d"] += 1
            gk = pl["g"].setdefault(k, collections.defaultdict(collections.Counter))
            for sl, js in SLOT.items():
                ty = ((p.get("Equipment") or {}).get(sl) or {}).get("Type")
                if ty: gk[js][ty] += 1
            if p.get("AverageItemPower"): pl["ip"].append(p["AverageItemPower"])
            pl["b"][k] += 1; ativos[c][p.get("Id")] += 1; nomes_at[p.get("Id")] = p.get("Name")
        for p in ganhadores: reg(p, True)
        for p in perdedores: reg(p, False)
        for kk in kvs:
            for kz in kperd: A["x"][(kk, kz)][0] += 1      # kk venceu kz
    def segs(e): return datetime.datetime.strptime(e["TimeStamp"][:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=datetime.timezone.utc).timestamp()
    def lutas(c, evs):
        """junta as mortes de uma mesma luta (jogadores em comum, até GAP s entre elas), separa os dois lados e diz qual ganhou:
        o lado com menos mortes; empate fica de fora. Devolve (tamanho, ganhadores, perdedores, nº de mortes)"""
        evs = sorted(evs, key=lambda x: x[0]["TimeStamp"]); n = len(evs); pai = list(range(n)); ts = [segs(x[0]) for x in evs]
        def f(i):
            while pai[i] != i: pai[i] = pai[pai[i]]; i = pai[i]
            return i
        ult = {}
        for i, (e, venc, v) in enumerate(evs):
            for p in venc + ([v] if v else []):
                pid = p.get("Id")
                if not pid: continue
                if pid in ult and ts[i] - ult[pid][0] <= GAP: pai[f(i)] = f(ult[pid][1])
                ult[pid] = (ts[i], i)
        grupos = collections.defaultdict(list)
        for i in range(n): grupos[f(i)].append(i)
        out = []
        for idx in grupos.values():
            adj = collections.defaultdict(list); info = {}; mortos = set()
            for i in idx:
                e, venc, v = evs[i]; ids = [p["Id"] for p in venc if p.get("Id")]
                for p in venc + ([v] if v else []):
                    if p.get("Id") and p["Id"] not in info: info[p["Id"]] = p
                for x in ids:
                    for y in ids:
                        if x != y: adj[x].append((y, 0))
                if v and v.get("Id"):
                    mortos.add(v["Id"])
                    for x in ids: adj[x].append((v["Id"], 1)); adj[v["Id"]].append((x, 1))
            cor = {}; ok = True
            for s in info:
                if s in cor: continue
                cor[s] = 0; pilha = [s]
                while pilha:
                    x = pilha.pop()
                    for y, dd in adj[x]:
                        nc = cor[x] ^ dd
                        if y not in cor: cor[y] = nc; pilha.append(y)
                        elif cor[y] != nc: ok = False
            if not ok or len(set(cor.values())) < 2:     # não deu para separar os lados: conta cada morte sozinha
                for i in idx:
                    e, venc, v = evs[i]; out.append((tamanho(c, e), venc, [v] if v else [], 1))
                continue
            lado = {0: [], 1: []}
            for pid, cc in cor.items(): lado[cc].append(info[pid])
            m = [sum(1 for p in lado[s] if p["Id"] in mortos) for s in (0, 1)]
            if m[0] == m[1]: continue      # empate ou luta incompleta demais: não conta
            w = 0 if m[0] < m[1] else 1
            out.append((max(tamanho(c, evs[i][0]) for i in idx), lado[w], lado[1 - w], len(idx)))
        return out
    por_c = collections.defaultdict(list)
    for c, e in cl:
        n_class[c] += 1; datas.append(e["TimeStamp"])
        venc, v = pessoas(e)
        if not venc and v is None: continue
        n_keep[c] += 1; n_srv[e.get("_s", "us")] += 1
        if c in GRUPO: por_c[c].append((e, venc, v))
        else: registrar(c, tamanho(c, e), venc, [v] if v else [], 1)
    for c, evs in por_c.items():
        for t, gan, per, nev in lutas(c, evs): registrar(c, t, gan, per, nev)
    try: ant = json.load(open(os.path.join(ROOT, "data", "pvp.json")))["janela"].get("experientes", 0)
    except Exception: ant = 0
    if ant and not MODO_ARM and sum(n_keep.values()) < 0.6 * ant:
        print("muito menos eventos que o arquivo atual:", sum(n_keep.values()), "contra", ant, "- não sobrescrevo"); sys.exit(1)
    if sum(n_keep.values()) < 300:
        print("poucos eventos classificados:", dict(n_keep), "de", dict(n_class), "- não sobrescrevo"); sys.exit(1)
    # sementes novas: os mais ativos de cada conteúdo
    novas = {c: [[i, nomes_at[i]] for i, _ in ativos[c].most_common(SEMENTES_POR)] for c in CONT}
    for c in CONT:
        ja = {i for i, _ in novas[c]}
        for i, n in sem.get(c, []):
            if i not in ja and len(novas[c]) < SEMENTES_POR + 15: novas[c].append([i, n])
    grind = json.load(open(os.path.join(ROOT, "data", "builds-grind.json")))["builds"]
    CAT = {"hg2": ["HELLGATE_2V2"], "hg5": ["HELLGATE_5V5"], "corrompida": ["CORRUPTED_DUNGEON"], "solo": ["MISTS_SOLO", "MISTS_DUO"], "depths": ["ABYSSAL_DEPTHS_2V2", "ABYSSAL_DEPTHS_3V3"]}
    def sk_de(c, w):
        ach = [g for g in grind if g["k"] in CAT[c] and base(g.get("w")) == w and g.get("sk")]
        if not ach: ach = [g for g in grind if base(g.get("w")) == w and g.get("sk")]
        return max(ach, key=lambda g: g.get("pop", 0))["sk"] if ach else None
    out = {"fonte": "API oficial do Albion (Américas, Europa e Ásia), todos os jogadores; conteúdo deduzido do tipo de luta (precisão ~94% nos testes)", "atualizado": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"),
           "janela": {"dias": DIAS, "eventos": sum(n_keep.values()), "classificados": sum(n_class.values()), "experientes": sum(n_keep.values()), "fama_min": 0, "de": min(datas), "ate": max(datas), "por_conteudo": dict(n_keep), "por_servidor": dict(n_srv)}, "conteudos": {}}
    MINB = 4
    for (c, t), A in sorted(S.items()):
        if A.get("ev", 0) < 15: continue
        bs = []
        for k, b in A["b"].items():
            n = b["v"] + b["d"]
            if n < MINB: continue
            w, o = k.split("|")
            row = {"id": f"{c}{t}:{k}", "k": c, "wc": w, "n": n, "v": b["v"], "d": b["d"], "wr": round(100 * b["v"] / n, 1), "jog": len(b["jog"]), "ip": round(sum(b["ip"]) / len(b["ip"])) if b["ip"] else 0}
            for js, cn in b["gear"].items():
                top = topo(cn, 2)
                row[js] = top
            if not any(row.get(sl) for sl in ("h", "a", "s")): continue   # sem cabeça, peito e botas nos dados: não é uma build, só uma arma
            if row.get("w"):
                if len(row["w"]) > 1: row["w2"] = row["w"][1]
                row["w"] = row["w"][0]
            bs.append((n, k, row, b))
        bs.sort(key=lambda x: -x[0]); bs = bs[:60]
        chaves = {k for _, k, _, _ in bs}; lista = []
        for n, k, row, b in bs:
            ctr = []; fr = []
            lista.append(row)
        # relações (counter / fraco): usa só pares entre as builds listadas
        rel = collections.defaultdict(dict)
        for (a, z), (g, _) in A["x"].items():
            if a in chaves and z in chaves: rel[a][z] = g
        for _, k, row, b in bs:
            vs, cs = [], []
            for z in chaves:
                if z == k: continue
                g1 = rel[k].get(z, 0); g2 = rel[z].get(k, 0); m = g1 + g2
                if m < 3: continue
                (vs if g1 > g2 else cs).append((round(100 * (g1 if g1 > g2 else g2) / m), m, z))
            row["fraco"] = [[z, p, m] for p, m, z in sorted(vs, key=lambda x: (-x[0], -x[1]))[:5] if p >= 60]
            row["counter"] = [[z, p, m] for p, m, z in sorted(cs, key=lambda x: (-x[0], -x[1]))[:5] if p >= 60]
            row["parc"] = [[z, g] for z, g in b["par"].most_common(4)] if t > 1 else []
            sk = sk_de(c, k.split("|")[0]); 
            if sk: row["sk"] = sk
        jogs = []
        for pid, pl in A["p"].items():
            n = pl["v"] + pl["d"]
            if n < 5: continue
            jogs.append({"xp": pl["xp"], "nome": pl["nome"], "guild": pl["guild"], "n": n, "v": pl["v"], "d": pl["d"], "wr": round(100 * pl["v"] / n, 1), "ip": round(sum(pl["ip"]) / len(pl["ip"])) if pl["ip"] else 0, "b": [[k, q, {js: topo(cn, 1) for js, cn in pl["g"].get(k, {}).items() if cn}] for k, q in pl["b"].most_common(3)]})
        jogs.sort(key=lambda x: (-x["n"])); jogs = jogs[:80]
        # armas populares: soma por arma, sem o corte mínimo das builds (mostra o que mais aparece mesmo com poucas lutas)
        arm = {}
        for k, b in A["b"].items():
            w = k.split("|")[0]; a = arm.setdefault(w, [0, 0]); a[0] += b["v"]; a[1] += b["d"]
        armas = sorted(([w, v + d, v, d, round(100 * v / (v + d), 1)] for w, (v, d) in arm.items() if v + d >= 2), key=lambda x: (-x[1], -x[4]))[:40]
        comps = []
        for key, C_ in A.get("comp", {}).items():
            n = C_["v"] + C_["d"]
            if n < (1 if c == "hg5" else 3): continue
            ms = []
            for mm in C_["m"]:
                row = {"k": mm["k"].most_common(1)[0][0], "ip": round(sum(mm["ip"]) / len(mm["ip"])) if mm["ip"] else 0}
                for js, cn in mm["gear"].items(): row[js] = topo(cn, 2)
                if row.get("w"):
                    if len(row["w"]) > 1: row["w2"] = row["w"][1]
                    row["w"] = row["w"][0]
                ms.append(row)
            comps.append({"id": f"{c}{t}:C:{key}", "ws": key.split("+"), "n": n, "v": C_["v"], "d": C_["d"], "wr": round(100 * C_["v"] / n, 1), "ip": round(sum(m["ip"] for m in ms) / len(ms)), "m": ms})
        comps.sort(key=lambda x: (-x["n"], -x["wr"])); comps = comps[:40]
        out["conteudos"][f"{c}:{t}"] = {"eventos": A.get("ev", 0), "lutas": A["n"], "armas": armas, "comps": comps, "builds": [r for _, _, r, _ in bs], "jogadores": jogs}
    # função (tank, healer, support, range, melee) de cada arma que aparece, para o filtro por função da aba
    _ws = set()
    for v in out["conteudos"].values():
        _ws.update(x["wc"] for x in v["builds"]); _ws.update(x[0] for x in v["armas"])
        for x in v.get("comps") or []: _ws.update(x["ws"])
    out["roles"] = {w: papel_arma.papel(w) for w in sorted(_ws) if papel_arma.papel(w)}
    json.dump(out, open(os.path.join(ROOT, "data", "pvp.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    if not MODO_ARM: json.dump(novas, open(sem_f, "w"), ensure_ascii=False, separators=(",", ":"))
    print("ok:", {k: (v["eventos"], len(v["builds"]), len(v["jogadores"])) for k, v in out["conteudos"].items()})
main()
