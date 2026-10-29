"""Posta no Discord as entradas novas de novidades.json (as patch notes do Balcão).

Roda no GitHub Actions a cada push na main que mexe em novidades.json.
Compara com a versão anterior do arquivo (o commit "before" do push) e manda as
entradas cujo "t" não existia antes, num só aviso (até 10 por mensagem).
Cada entrada vira um bloco: título, "O que mudou" (itens) e, quando existirem,
"Como usar" (campo "como") e "Impacto" (campo "impacto").
O endereço do webhook vem do segredo DISCORD_WEBHOOK_PATCHNOTES; sem ele, só
lista o que mandaria e sai sem erro.
"""
import json, os, subprocess, sys, time, urllib.request

ARQ = "novidades.json"
SITE = "https://kvnr2.github.io/balcao-de-negocios-do-fumaca/"


def entradas(txt):
    try:
        return json.loads(txt).get("itens", [])
    except Exception:
        return []


def anterior(before):
    if not before or set(before) == {"0"}:
        return None
    try:
        return entradas(subprocess.run(["git", "show", f"{before}:{ARQ}"], capture_output=True, text=True, check=True).stdout)
    except subprocess.CalledProcessError:
        return None


def corta(s, n):
    s = s or ""
    return s if len(s) <= n else s[: n - 1] + "…"


def bloco(n):
    campos = []
    if n.get("itens"):
        campos.append({"name": "O que mudou", "value": corta("\n".join("• " + x for x in n["itens"]), 1024)})
    if n.get("como"):
        campos.append({"name": "Como usar", "value": corta(n["como"], 1024)})
    if n.get("impacto"):
        campos.append({"name": "Impacto", "value": corta(n["impacto"], 1024)})
    tag = f"Albion Overlay {n['programa']}" if n.get("programa") else "Site"
    return {"title": corta(n.get("titulo", "Atualização do Balcão"), 256), "url": SITE + "#versao", "color": 0xE8AB45,
            "fields": campos, "timestamp": n.get("t"), "footer": {"text": f"Balcão de Negócios do Fumaça · {tag}"}}


def main():
    atuais = entradas(open(ARQ, encoding="utf-8").read())
    antes = anterior(os.environ.get("BEFORE", ""))
    if antes is None:
        print("Sem versão anterior para comparar: nada postado (evita repostar o histórico inteiro).")
        return
    vistos = {n.get("t") for n in antes}
    novas = sorted([n for n in atuais if n.get("t") not in vistos], key=lambda n: n.get("t", ""))
    if not novas:
        print("Nenhuma entrada nova.")
        return
    hook = os.environ.get("DISCORD_WEBHOOK_PATCHNOTES", "").strip()
    for i in range(0, len(novas), 10):
        parte = [bloco(n) for n in novas[i:i + 10]]
        while len(json.dumps(parte)) > 5800 and len(parte) > 1:   # limite de 6000 caracteres por mensagem
            parte.pop()
        if not hook:
            print("Sem webhook configurado; mandaria:", [b["title"] for b in parte])
            continue
        corpo = json.dumps({"username": "Balcão do Fumaça", "content": "**Atualização no Balcão**", "embeds": parte}).encode()
        req = urllib.request.Request(hook, data=corpo, headers={"Content-Type": "application/json", "User-Agent": "balcao-patchnotes"})
        try:
            urllib.request.urlopen(req, timeout=20)
            print("Postadas:", [b["title"] for b in parte])
        except Exception as e:
            print("Falhou ao postar:", e, file=sys.stderr)
            sys.exit(1)
        time.sleep(1.5)


if __name__ == "__main__":
    main()
