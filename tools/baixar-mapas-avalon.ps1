# Baixa as imagens dos mapas de Avalon do albionmaps.com.br para a pasta imagens\avalon do site.
# A imagem de cada mapa fica em  /mapsImg/<nome do mapa>.webp  (ex.: "Setent - In - Qinsum"), e a lista dos 400 nomes vem do próprio site.
# Uso: clique duas vezes em baixar-mapas-avalon.bat. Pode ser interrompido e rodado de novo: pula o que já foi baixado.
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base  = "https://www.albionmaps.com.br"
$lista = "https://kvnr2.github.io/balcao-de-negocios-do-fumaca/data/avalon.json"
$out   = Join-Path (Split-Path -Parent $PSScriptRoot) "imagens\avalon"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$idxFile = Join-Path $out "index.json"
$idx = @{}
if (Test-Path $idxFile) { (Get-Content $idxFile -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $idx[$_.Name] = $_.Value } }

Write-Host "Abrindo a lista dos mapas..."
$mapas = (Invoke-WebRequest -UseBasicParsing $lista).Content | ConvertFrom-Json
Write-Host ("{0} mapas na lista." -f $mapas.Count)

$n = 0; $ok = 0; $falhou = @()
foreach ($m in $mapas) {
  $n++
  $nome = $m.n
  $slug = (($nome.ToLower() -replace '[^a-z0-9]+', ' ').Trim() -replace ' ', '-')
  if ($idx.ContainsKey($slug) -and (Test-Path (Join-Path $out $idx[$slug]))) { $ok++; continue }
  try {
    $file = "$slug.webp"
    Invoke-WebRequest -UseBasicParsing ("$base/mapsImg/" + [uri]::EscapeDataString($nome) + ".webp?v=99999") -OutFile (Join-Path $out $file)
    $idx[$slug] = $file; $ok++
    Write-Host ("[{0}/{1}] {2}" -f $n, $mapas.Count, $nome)
  } catch {
    $falhou += $nome; Write-Host ("[{0}/{1}] FALHOU {2}: {3}" -f $n, $mapas.Count, $nome, $_.Exception.Message) -ForegroundColor Yellow
  }
  if ($n % 25 -eq 0) { ($idx | ConvertTo-Json) | Set-Content -Encoding UTF8 $idxFile }
  Start-Sleep -Milliseconds 300
}
($idx | ConvertTo-Json) | Set-Content -Encoding UTF8 $idxFile
Write-Host ""
Write-Host ("Pronto: {0} imagens em {1}" -f $ok, $out)
if ($falhou.Count) { Write-Host ("Sem imagem ({0}): {1}" -f $falhou.Count, ($falhou -join ", ")) -ForegroundColor Yellow }
