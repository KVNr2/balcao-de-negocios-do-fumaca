# Baixa as imagens dos mapas de Avalon do albionmaps.com.br para a pasta imagens\avalon do site.
# Uso: clique duas vezes em baixar-mapas-avalon.bat (ou rode este arquivo no PowerShell).
# Pode ser interrompido e rodado de novo: pula o que já foi baixado.
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "https://www.albionmaps.com.br"
$out  = Join-Path (Split-Path -Parent $PSScriptRoot) "imagens\avalon"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$idxFile = Join-Path $out "index.json"
$idx = @{}
if (Test-Path $idxFile) { (Get-Content $idxFile -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $idx[$_.Name] = $_.Value } }

Write-Host "Abrindo a lista de mapas..."
$list = (Invoke-WebRequest -UseBasicParsing "$base/maps?lang=pt").Content
$links = [regex]::Matches($list, '/maps/(\d+-[A-Za-z0-9\-]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
Write-Host ("{0} mapas encontrados." -f $links.Count)

$n = 0; $ok = 0; $falhou = @()
foreach ($l in $links) {
  $n++
  $slug = ($l -replace '^\d+-', '').ToLower()
  if ($idx.ContainsKey($slug) -and (Test-Path (Join-Path $out $idx[$slug]))) { $ok++; continue }
  try {
    $page = (Invoke-WebRequest -UseBasicParsing "$base/maps/$l?lang=pt").Content
    $m = [regex]::Match($page, '/mapsImg/([^"''\s\)\?]+\.(webp|png|jpg|jpeg))')
    if (-not $m.Success) { throw "sem imagem na página" }
    $file = $slug + "." + $m.Groups[2].Value
    Invoke-WebRequest -UseBasicParsing "$base/mapsImg/$($m.Groups[1].Value)" -OutFile (Join-Path $out $file)
    $idx[$slug] = $file; $ok++
    Write-Host ("[{0}/{1}] {2}" -f $n, $links.Count, $slug)
  } catch {
    $falhou += $slug; Write-Host ("[{0}/{1}] FALHOU {2}: {3}" -f $n, $links.Count, $slug, $_.Exception.Message) -ForegroundColor Yellow
  }
  if ($n % 25 -eq 0) { ($idx | ConvertTo-Json) | Set-Content -Encoding UTF8 $idxFile }
  Start-Sleep -Milliseconds 400
}
($idx | ConvertTo-Json) | Set-Content -Encoding UTF8 $idxFile
Write-Host ""
Write-Host ("Pronto: {0} imagens em {1}" -f $ok, $out)
if ($falhou.Count) { Write-Host ("Falharam {0}: {1}" -f $falhou.Count, ($falhou -join ", ")) -ForegroundColor Yellow }
