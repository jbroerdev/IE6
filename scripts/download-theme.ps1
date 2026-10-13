param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$revision = 'f3a6b94d5a9c91046931bda1e7760a469ae7c5aa'
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
foreach ($filename in @('toolbar.png','toolbar_large.png','page.png','go.png','userChrome.css')) {
  $url = "https://raw.githubusercontent.com/echelon-theme/spyglass/$revision/profile/chrome/$filename"
  Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile (Join-Path $OutputDirectory $filename)
}
Write-Output "Spyglass resources fetched from upstream revision $revision."
