# Veröffentlichung und Drittanbieter-Ressourcen

Dieses Repository enthält den bearbeitbaren Anwendungscode, die MIT-lizenzierten Quellen und Ressourcen von YouTube Redux, die nativen Anpassungen von Legacy Wikipedia / Old Reddit Redirect sowie die Build-Skripte für die GPL-lizenzierten AdGuard-Bibliotheken.

## Separat bezogene Grafiken

Für Spyglass ist am verwendeten Commit `f3a6b94d5a9c91046931bda1e7760a469ae7c5aa` keine Lizenzdatei angegeben. Die übernommenen Bilder, Animationen und daraus abgeleiteten Icons werden deshalb nicht in dieses Repository hochgeladen. `ui/assets` ist von Git ausgeschlossen.

`pnpm run bootstrap` bezieht die Originalgrafiken direkt aus dem oben genannten Upstream-Commit für den lokalen Build. Dadurch wird keine eigene Lizenz für diese Grafiken behauptet. Vor einer öffentlichen Weitergabe von EXE-Dateien, die diese Ressourcen enthalten, müssen deren Weitergaberechte geklärt werden.

Quelle: [Spyglass](https://github.com/echelon-theme/spyglass). Hintergrund: [GitHub – Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## Reproduzierbarer Build

Voraussetzungen: Windows 10/11, Node.js 24, pnpm 11.25.0 und Windows PowerShell.

```powershell
pnpm install --frozen-lockfile
pnpm run bootstrap
pnpm start
pnpm run dist
```

Die Filterlisten werden von den in `scripts/download-filters.ps1` festgelegten offiziellen AdGuard-URLs bezogen. Der Stand der lokal erzeugten Dateien wird unter `vendor/adguard-filters/metadata.json` gespeichert. Generierte Bibliotheks-Bundles liegen unter `lib/generated`. Diese Downloads und Build-Ausgaben werden nicht als Anwendungscode erneut eingecheckt.

Es werden keine Browserprofile, Cookies, Verläufe, Logs, lokalen Windows-Pfade oder Zugangsdaten veröffentlicht. `dist`, `node_modules`, `reference`, `archive` und `qa` sind von Git ausgeschlossen.
