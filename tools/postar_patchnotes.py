"""Posta no Discord as notas novas de data/patchnotes.json.

Roda no GitHub Actions a cada push na main que mexe em data/patchnotes.json.
Compara com a versão anterior do arquivo (o commit "before" do push) e manda
só as notas cujo "t" não existia antes. O endereço do webhook vem do segredo
DISCORD_WEBHOOK_PATCHNOTES; sem ele, só lista o que mandaria e sai sem erro.
"""
import json, os, subprocess, sys, time, urllib.request

ARQ = "data/patchnotes.json"
SITE = "https://kvnr2.github.io/balcao-de-negocios-do-fumaca/"


def notas(txt):
    try:
        return json.loads(txt).get("notas", [])
    except Exception:
        return []


def anterior(before):
    if not before or set(before) == {"0"}:
        return []
    try:
        return notas(subprocess.run(["git", "show", f"{before}:{ARQ}"], capture_output=True, text=True, check=True).stdout)
    except subprocess.CalledProcessError:
        return []


def corta(s, n):
    s = s or ""
    return s if len(s) <= n else s[: n - 1] + "…"


def embed(n):
    campos = []
    if n.get("mudou"):
        campos.append({"name": "O que mudou", "value": corta("\n".join("• " + x for x in n["mudou"]), 1024)})
    if n.get("como"):
        campos.append({"name": "Como usar", "value": corta(n["como"], 1024)})
    if n.get("impacto"):
        campos.append({"name": "Impacto", "value": corta(n["impacto"], 1024)})
    return {"title": corta(n.get("titulo", "Atualização do Balcão"), 256), "url": SITE + "#versao", "color": 0xE8AB45,
            "fields": campos, "timestamp": n.get("t"), "footer": {"text": "Balcão de Negócios do Fumaça"}}


def main():
    atuais = notas(open(ARQ, encoding="utf-8").read())
    vistos = {n.get("t") for n in anterior(os.environ.get("BEFORE", ""))}
    novas = sorted([n for n in atuais if n.get("t") not in vistos], key=lambda n: n.get("t", ""))
    if not novas:
        print("Nenhuma nota nova.")
        return
    hook = os.environ.get("DISCORD_WEBHOOK_PATCHNOTES", "").strip()
    for n in novas:
        corpo = json.dumps({"username": "Balcão do Fumaça", "embeds": [embed(n)]}).encode()
        if not hook:
            print("Sem webhook configurado; mandaria:", n.get("titulo"))
            continue
        req = urllib.request.Request(hook, data=corpo, headers={"Content-Type": "application/json", "User-Agent": "balcao-patchnotes"})
        try:
            urllib.request.urlopen(req, timeout=20)
            print("Postada:", n.get("titulo"))
        except Exception as e:
            print("Falhou ao postar:", n.get("titulo"), e, file=sys.stderr)
            sys.exit(1)
        time.sleep(1.5)


if __name__ == "__main__":
    main()
