"""Resume o coleta-log.jsonl da branch pvp-dados por hora: pedidos, tempo de resposta, erros e onde o tempo foi gasto.
Uso: python3 tools/ler_log.py caminho/coleta-log.jsonl"""
import json, sys, collections
L = [json.loads(l) for l in open(sys.argv[1])]
H = collections.defaultdict(list)
for l in L: H[l["t"][:13]].append(l)
print("hora(UTC)  rod  pedidos  ok%   med  p90   max   kb  rede%  causas                         tempo gasto (s)")
for h, ls in sorted(H.items()):
    ped = sum(l["pedidos"] for l in ls); tl = [l.get("tempo") for l in ls if l.get("tempo")]
    n = sum(t["n"] for t in tl); ok = sum(t["ok"] for t in tl)
    f = lambda k: [t[k] for t in tl if t.get(k) is not None]
    med = sorted(f("med")); p90 = f("p90"); mx = f("max"); kb = f("kb")
    cz = collections.Counter(); gs = collections.Counter()
    for l in ls:
        cz.update(l.get("causas", {})); gs.update(l.get("gasto_seg", {}))
    rede = sum(l["falhas"].get("rede", 0) for l in ls)
    print(f"{h[11:]}h  {len(ls):>4} {ped:>7} {100*ok/n if n else 0:>4.0f}% {med[len(med)//2] if med else 0:>5.1f} {max(p90) if p90 else 0:>4.1f} {max(mx) if mx else 0:>5.1f} {sum(kb)/len(kb) if kb else 0:>4.0f} {100*rede/ped if ped else 0:>5.0f}%  {dict(cz)!s:<30} {dict(gs)}")
