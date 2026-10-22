# Baixa só os 21 mapas de Avalon que ficaram sem imagem. Para cada um tenta o nome exato e,
# se o site não tiver, variações do nome (com/sem Al, Et, In, Qi, Si, Sa, Oc).
$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "https://www.albionmaps.com.br"
$out  = Join-Path (Split-Path -Parent $PSScriptRoot) "imagens\avalon"
New-Item -ItemType Directory -Force -Path $out | Out-Null
$idxFile = Join-Path $out "index.json"
$idx = @{}
if (Test-Path $idxFile) { (Get-Content $idxFile -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $idx[$_.Name] = $_.Value } }
$faltam = @('Quatun - Odetum','Quaent - In - Nusis','Qiient - In - Tersom','Qiient - Qi - Odesas','Qiient - In - Vyntum','Qiient - Al - Tersas','Qiient - Et - Qinsum','Qiient - In - Viesis','Qiient - Al - Nusom','Qiient - In - Odetum','Qiitun - Duosum','Secent - Qi - Odesom','Secent - Al - Odetis','Sectun - Al - Vyntis','Secent - Nutum','Secent - Al - Tersum','Sectun - In - Odesis','Setent - Nusum','Settun - Al - Vynsis','Settun - Al - Tersom','Settun - In - Nusis')
$pref = @('Al','Et','In','Qi','Si','Sa','Oc')
function Slug($n) { (($n.ToLower() -replace '[^a-z0-9]+', ' ').Trim() -replace ' ', '-') }
function Variantes($nome) {
  $p = $nome -split ' - '
  $lista = @($nome)
  $sem = @($p[0]) + $p[($p.Count-1)]          # "Qiient - Tersom"
  $lista += ($sem -join ' - ')
  foreach ($x in $pref) { $lista += (@($p[0], $x, $p[$p.Count-1]) -join ' - ') }
  $lista | Select-Object -Unique
}
$ok = 0; $falhou = @(); $n = 0
foreach ($nome in $faltam) {
  $n++; $feito = $false
  foreach ($v in (Variantes $nome)) {
    $file = (Slug $nome) + ".webp"
    try {
      Invoke-WebRequest -UseBasicParsing ("$base/mapsImg/" + [uri]::EscapeDataString($v) + ".webp?v=99999") -OutFile (Join-Path $out $file) -ErrorAction Stop
      $idx[(Slug $nome)] = $file; $feito = $true; $ok++
      Write-Host ("[{0}/{1}] {2}  (usou: {3})" -f $n, $faltam.Count, $nome, $v); break
    } catch { Start-Sleep -Milliseconds 150 }
  }
  if (-not $feito) { $falhou += $nome; Write-Host ("[{0}/{1}] SEM IMAGEM {2}" -f $n, $faltam.Count, $nome) -ForegroundColor Yellow }
  Start-Sleep -Milliseconds 300
}
($idx | ConvertTo-Json) | Set-Content -Encoding UTF8 $idxFile
Write-Host ""
Write-Host ("Pronto: {0} de {1} baixadas. Pasta: {2}" -f $ok, $faltam.Count, $out)
if ($falhou.Count) { Write-Host ("Sem imagem: " + ($falhou -join ", ")) -ForegroundColor Yellow }
