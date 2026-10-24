"""Leitura educada da API oficial do Albion: ritmo mínimo entre pedidos (vale para todas as conexões) e pausa geral quando vem 429/503.
Sem rotação de IP nem disfarce: só pedir menos e esperar mais."""
import json, threading, time, urllib.request, urllib.error, collections
B = "https://gameinfo.albiononline.com/api/gameinfo"
UA = {"User-Agent": "BalcaoDoFumaca/1.0 (+https://github.com/KVNr2/balcao-de-negocios-do-fumaca)", "Accept": "application/json"}
INTERVALO = 0.6          # s entre pedidos, somando todas as conexões (~1,7 pedido/s)
PAUSA = 60               # s de pausa geral depois de um 429/503 (dobra se repetir, até 5 min)
PRAZO = [None]   # instante (time.time()) depois do qual get() desiste na hora, sem esperar
FALHAS = collections.Counter(); _lock = threading.Lock(); _prox = [0.0]; _pausa = [0.0]; _nivel = [0]; _ok = [0]; TOTAL = [0]; T0 = time.time()
# Métricas (só medem, não mudam o ritmo): uma entrada por tentativa e quanto tempo foi gasto em cada estado
MED = []                                   # (tipo, ok, seg_total, seg_ate_cabecalho, bytes, motivo)
DET = collections.Counter()                # erros de rede por causa (timeout, reset, recusada, dns, tls, corpo, outro)
TEMPO = collections.Counter()              # seg: "fila" (limitador), "pausa" (recuo 429/5xx), "pedido_ok", "pedido_erro", "retentativa"
def _tipo(p):
    p = p.split("?")[0]
    return "events" if p.startswith("/events") else "kills" if p.endswith("/kills") else "deaths" if p.endswith("/deaths") else "outro"
def _causa(e):
    import socket, ssl, http.client
    r = getattr(e, "reason", e)
    if isinstance(r, (socket.timeout, TimeoutError)): return "timeout"
    if isinstance(r, ConnectionResetError): return "reset"
    if isinstance(r, ConnectionRefusedError): return "recusada"
    if isinstance(r, socket.gaierror): return "dns"
    if isinstance(r, ssl.SSLError): return "tls"
    if isinstance(r, (http.client.IncompleteRead, http.client.RemoteDisconnected, json.JSONDecodeError)): return "corpo"
    return "outro"
def _vez():
    with _lock:
        agora = time.time(); base = max(agora, _prox[0]); t = max(base, _pausa[0])
        if PRAZO[0] and t > PRAZO[0]: return False
        _prox[0] = t + INTERVALO
        TEMPO["fila"] += base - agora; TEMPO["pausa"] += t - base
    d = t - time.time()
    if d > 0: time.sleep(d)
    return True
def _recuo():
    with _lock:
        _nivel[0] = min(_nivel[0] + 1, 3); _ok[0] = 0
        fim = time.time() + min(PAUSA * 2 ** (_nivel[0] - 1), 300)
        if fim > _pausa[0]: _pausa[0] = fim
def get(path, tries=4):
    tp = _tipo(path)
    for i in range(tries):
        if not _vez(): FALHAS["prazo"] += 1; return None
        TOTAL[0] += 1; t0 = time.time(); t1 = None; nb = 0
        try:
            with urllib.request.urlopen(urllib.request.Request(B + path, headers=UA), timeout=25) as r:
                t1 = time.time() - t0; raw = r.read(); nb = len(raw)
            d = json.loads(raw); dt = time.time() - t0
            with _lock:
                MED.append((tp, 1, dt, t1, nb, "")); TEMPO["pedido_ok"] += dt
                _ok[0] += 1
                if _ok[0] >= 30: _nivel[0] = max(_nivel[0] - 1, 0); _ok[0] = 0
            return d
        except urllib.error.HTTPError as e:
            dt = time.time() - t0
            with _lock: MED.append((tp, 0, dt, t1, nb, str(e.code))); TEMPO["pedido_erro"] += dt
            FALHAS[e.code] += 1
            if e.code in (404, 400): return None
            if e.code in (429, 503, 502): _recuo()
            else: time.sleep(2 + i)
        except Exception as e:
            dt = time.time() - t0; cz = _causa(e)
            with _lock: MED.append((tp, 0, dt, t1, nb, cz)); TEMPO["pedido_erro"] += dt; DET[cz] += 1
            FALHAS["rede"] += 1; w = 2 + 2 * i; TEMPO["retentativa"] += w; time.sleep(w)
    return None

def _pct(v, p):
    if not v: return None
    v = sorted(v); return round(v[min(len(v) - 1, int(p * len(v)))], 2)
def _resumo(m):
    ok = [x for x in m if x[1]]; tt = [x[2] for x in ok]
    return {"n": len(m), "ok": len(ok), "med": _pct(tt, .5), "media": round(sum(tt) / len(tt), 2) if tt else None, "p90": _pct(tt, .9), "max": round(max(tt), 2) if tt else None,
            "cab": _pct([x[3] for x in ok if x[3] is not None], .5), "kb": round(sum(x[4] for x in ok) / len(ok) / 1024, 1) if ok else None,
            "err_seg": round(sum(x[2] for x in m if not x[1]), 1)}

def registrar(d, modo, extra=None, manter=400):
    """Acrescenta uma linha em d/coleta-log.jsonl (pedidos, falhas por tipo, pausas, duração) e guarda só as últimas `manter`.
    É o único jeito de ver, sem acesso aos logs do GitHub, se a API está aceitando o ritmo."""
    import os
    lin = {"t": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "modo": modo, "pedidos": TOTAL[0],
           "falhas": {str(k): v for k, v in FALHAS.items()}, "nivel": _nivel[0], "seg": round(time.time() - T0)}
    with _lock:
        m = list(MED); lin["tempo"] = _resumo(m); lin["por_tipo"] = {k: _resumo([x for x in m if x[0] == k]) for k in sorted({x[0] for x in m})}
        lin["causas"] = dict(DET); lin["gasto_seg"] = {k: round(v) for k, v in TEMPO.items()}
        lin["taxa"] = round(len(m) / max(time.time() - T0, 1), 3)
    if extra: lin.update(extra)
    f = os.path.join(d, "coleta-log.jsonl")
    try:
        ant = open(f).read().splitlines()[-(manter - 1):] if os.path.exists(f) else []
        open(f, "w").write("\n".join(ant + [json.dumps(lin, ensure_ascii=False)]) + "\n")
    except Exception as e: print("log não gravado:", e)
