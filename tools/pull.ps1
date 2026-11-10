# Rapatrie dans ce dossier les fichiers d'une branche du dépôt GitHub (le PC n'a pas Git).
# Ne télécharge que les fichiers absents ou différents. Usage : .\tools\pull.ps1 phase-0
param([string]$Branch = 'main')
$ErrorActionPreference = 'Stop'
$repo = 'ceboo75/game1'
$root = Split-Path -Parent $PSScriptRoot
$headers = @{ 'User-Agent' = 'game1-sync' }

# On passe par le numéro du commit : les adresses par nom de branche sont mises en cache plusieurs minutes.
$commit = (Invoke-RestMethod -TimeoutSec 60 -Headers $headers "https://api.github.com/repos/$repo/branches/$Branch").commit.sha
$tree = Invoke-RestMethod -TimeoutSec 60 -Headers $headers "https://api.github.com/repos/$repo/git/trees/$($commit)?recursive=1"
$sha1 = [Security.Cryptography.SHA1]::Create()
$n = 0
foreach ($e in $tree.tree) {
  if ($e.type -ne 'blob') { continue }
  $dest = Join-Path $root ($e.path -replace '/', '\')
  if (Test-Path $dest) {
    $b = [IO.File]::ReadAllBytes($dest)
    $h = [Text.Encoding]::ASCII.GetBytes("blob $($b.Length)`0")
    $local = -join ($sha1.ComputeHash([byte[]]($h + $b)) | ForEach-Object { $_.ToString('x2') })
    if ($local -eq $e.sha) { continue }
  }
  New-Item -ItemType Directory -Force (Split-Path -Parent $dest) | Out-Null
  Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 "https://raw.githubusercontent.com/$repo/$commit/$($e.path)" -OutFile $dest
  "maj : $($e.path)"
  $n++
}
"$n fichier(s) mis a jour depuis $Branch ($($commit.Substring(0, 7)))"
