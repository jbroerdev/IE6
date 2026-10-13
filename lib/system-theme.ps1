$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$palette = @{}
$mapping = @{face='Control';text='ControlText';shadow='ControlDark';light='ControlLightLight';dark='ControlDarkDark';window='Window';windowText='WindowText';highlight='Highlight';highlightText='HighlightText';gray='GrayText'}
foreach ($key in $mapping.Keys) {
  $color = [System.Drawing.SystemColors]::($mapping[$key])
  $palette[$key] = '#{0:X2}{1:X2}{2:X2}' -f $color.R,$color.G,$color.B
}
$menuFont = [System.Drawing.SystemFonts]::MenuFont
@{colors=$palette;font=@{family=$menuFont.FontFamily.Name;size=[Math]::Round($menuFont.SizeInPoints*96/72,2)}} | ConvertTo-Json -Compress
