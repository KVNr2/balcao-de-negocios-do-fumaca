"""Leitura educada da API oficial do Albion: ritmo mínimo entre pedidos (vale para todas as conexões) e pausa geral quando vem 429/503.
Sem rotação de IP nem disfarce: só pedir menos e esperar mais."""
import json, threading, time, urllib.request, urllib.error, collections
B = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "BalcaoDoFumaca/1.0 (+https://github.com/KVNr2/balcao-de-negocios-do-fumaca)", "Accept": "application/json"}
INTERVALO = 0.6          # s entre pedidos, somando todas as conexões (~1,7 pedido/s)
PAUSA = 60               # s de pausa geral depois de um 429/503 (dobra se repetir, até 5 min)
PRAZO = [None]   # instante (time.time()) depois do qual get() desiste na hora, sem esperar
FALHAS = collections.Counter(); _lock = threading.Lock(); _prox = [0.0]; _pausa = [0.0]; _nivel = [0]; _ok = [0]; TOTAL = [0]; T0 = time.time()
def _vez():
    with _lock:
        t = max(time.time(), _prox[0], _pausa[0])
        if PRAZO[0] and t > PRAZO[0]: return False
        _prox[0] = t + INTERVALO
    d = t - time.time()
    if d > 0: time.sleep(d)
    return True
def _recuo():
    with _lock:
        _nivel[0] = min(_nivel[0] + 1, 3); _ok[0] = 0
        fim = time.time() + min(PAUSA * 2 ** (_nivel[0] - 1), 300)
        if fim > _pausa[0]: _pausa[0] = fim
def get(path, tries=4):
    for i in range(tries):
        if not _vez(): FALHAS["prazo"] += 1; return None
        TOTAL[0] += 1
        try:
            with urllib.request.urlopen(urllib.request.Request(B + path, headers=UA), timeout=12) as r:
                d = json.load(r)
            with _lock:
                _ok[0] += 1
                if _ok[0] >= 30: _nivel[0] = max(_nivel[0] - 1, 0); _ok[0] = 0
            return d
        except urllib.error.HTTPError as e:
            FALHAS[e.code] += 1
            if e.code in (404, 400): return None
            if e.code in (429, 503, 502): _recuo()
            else: time.sleep(2 + i)
        except Exception:
            FALHAS["rede"] += 1; time.sleep(2 + 2 * i)
    return None

def registrar(d, modo, extra=None, manter=600):
    """Acrescenta uma linha em d/coleta-log.jsonl (pedidos, falhas por tipo, pausas, duração) e guarda só as últimas `manter`.
    É o único jeito de ver, sem acesso aos logs do GitHub, se a API está aceitando o ritmo."""
    import os
    lin = {"t": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "modo": modo, "pedidos": TOTAL[0],
           "falhas": {str(k): v for k, v in FALHAS.items()}, "nivel": _nivel[0], "seg": round(time.time() - T0)}
    if extra: lin.update(extra)
    f = os.path.join(d, "coleta-log.jsonl")
    try:
        ant = open(f).read().splitlines()[-(manter - 1):] if os.path.exists(f) else []
        open(f, "w").write("\n".join(ant + [json.dumps(lin, ensure_ascii=False)]) + "\n")
    except Exception as e: print("log não gravado:", e)
