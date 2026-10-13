param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$lists = @()
foreach ($filterId in @(2,3,6,14)) {
  $url = "https://filters.adtidy.org/extension/chromium/filters/$($filterId)_optimized.txt"
  $content = (Invoke-WebRequest -UseBasicParsing -Uri $url).Content
  if (!$content.Contains('! Title: AdGuard') -or $content.Length -lt 1000) { throw "Invalid AdGuard filter $filterId" }
  [System.IO.File]::WriteAllText((Join-Path $OutputDirectory "$filterId.txt"), $content, [System.Text.UTF8Encoding]::new($false))
  $lists += @{id=$filterId;url=$url;bytes=$content.Length}
  Write-Output "AdGuard filter $filterId : $($content.Length) characters"
}
@{downloaded=[DateTime]::UtcNow.ToString('o');lists=$lists} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $OutputDirectory 'metadata.json') -Encoding UTF8
