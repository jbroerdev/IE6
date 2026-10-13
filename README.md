# Classic Browser 0.3.1

Neu aufgebauter Chromium-Browser mit deutscher Oberfläche auf Basis von [Spyglass / MSFX](https://github.com/echelon-theme/spyglass).

## Windows-Systemtheme

Der Browser benutzt einen **echten Windows-Fensterrahmen**. Titelleiste, Minimieren, Maximieren, Schließen, Systemmenü und Fensterkanten gehören Windows. Ein installiertes XP-Visual-Style wirkt dadurch auf das Fenster, soweit es normale Win32-Fenster im System verändert. Es gibt keine HTML-Titelleiste und keinen fest eingebauten XP-Fensterskin.

Die inneren Bedienelemente übernehmen Windows-Systemfarben und die Systemmenüschrift über `System.Drawing.SystemColors` und `SystemFonts`. Änderungen an Systemfarben werden bei entsprechenden Windows-Nachrichten erneut eingelesen. Spyglass liefert die unveränderten 16-/20-Pixel-Toolbar-Bitmaps, Hover-Zustände, Ladeanimation und kleinen Seiten-/Internet-Symbole. Die Firefox-spezifische XUL-Oberfläche ist für Chromium neu umgesetzt. Die Webseiten-Scrollleisten verwenden die klassische Spyglass-Geometrie mit den Systemfarben.

## Starten

Nach einem lokalen Build liegt die portable Windows-x64-Version unter `dist/Classic Browser 0.3.1.exe`. Doppelklicken genügt; Node.js wird dafür nicht benötigt. Vor dem Wechsel die vorherige Browser-Version vollständig schließen. Eine fertige EXE wird wegen der ungeklärten Weitergaberechte der Spyglass-Grafiken derzeit nicht als GitHub-Release angeboten.

Im vorbereiteten Arbeitsordner startet `Starten.cmd` die aktuelle Entwicklungsversion. Für einen frischen Checkout sind die folgenden Bootstrap-Schritte erforderlich.

### Aus einem frischen GitHub-Checkout bauen

Voraussetzungen: Windows 10/11, Node.js 24 und pnpm 11.25.0.

```powershell
pnpm install --frozen-lockfile
pnpm run bootstrap
pnpm start
```

`pnpm run dist` erzeugt anschließend die portable EXE für den lokalen Gebrauch. Spyglass-Grafiken werden beim Bootstrap aus dem festgeschriebenen Original-Commit geladen und sind wegen der dort fehlenden Lizenzangabe nicht im öffentlichen Repository enthalten. Details zur Veröffentlichung stehen in [PUBLICATION.md](PUBLICATION.md). AdGuard-Filter und Bibliotheks-Bundles werden ebenfalls beim Bootstrap erzeugt.

## Bedienung

- Adressleiste: Webadresse oder Suchbegriff; Strg+L / Alt+D fokussiert die Adresse.
- Zurück/Vorwärts: Alt+Links / Alt+Rechts; Pfeilmenüs zeigen die zugehörigen Seiten.
- Aktualisieren: F5; Abbrechen: Esc; Startseite: Alt+Pos1.
- Favoriten: Strg+D hinzufügen, Strg+I anzeigen; einzelne Einträge in der Leiste entfernen.
- Verlauf: Strg+H; Downloads: Strg+J. Abgeschlossene Downloads lassen sich im Explorer anzeigen.
- Seitensuche: Strg+F; Drucken: Strg+P; Speichern: Strg+S.
- Neues Fenster: Strg+N; Vollbild: F11.
- Video-Vollbild: Vollbildknopf des Videoplayers; Esc oder F11 beendet es. Die vorherige Fensteransicht wird wiederhergestellt, auch bei eingebetteten Videos.
- Extras → Internetoptionen: Startseite, Symbolgröße und Beschriftung ändern.
- Extras → Legacy Wikipedia / Old Reddit Redirect / YouTube Redux / Werbeblocker: integrierte Anpassungen konfigurieren und einzeln abschalten.
- Ansicht: Symbolleisten/Statusleiste ein- und ausblenden, Webseitenzoom ändern.

Favoriten, Verlauf, Einstellungen und Cookies werden im lokalen Benutzerprofil gespeichert. Webinhalte laufen in einer Sandbox ohne Node-Zugriff. Es ist weiterhin Chromium; IE5s Trident-/ActiveX-Verhalten, frei installierbare Chrome-Erweiterungen und Chrome-Kontosynchronisierung sind nicht enthalten.

## Integrierte Webseiten-Anpassungen

Alle vier Funktionen sind ab Werk eingeschaltet und erhalten ausschließlich Einstellungsseiten unter Extras. Es gibt keine Erweiterungsleiste oder zusätzlichen Toolbar-Symbole. Nach Änderungen bereits geöffnete Webseiten neu laden.

- **Legacy Wikipedia:** native Übertragung der `useskin`-Logik. Vector ist voreingestellt; andere Wikipedia-Skins, ausgeblendete Adressparameter und Sprachausnahmen sind konfigurierbar. Veraltete Skins funktionieren nur, solange Wikipedia sie bereitstellt.
- **Old Reddit Redirect:** Reddit-Links öffnen auf `old.reddit.com`; Opt-out-Cookie, ausgeblendete Cookie-Leiste und direkte Bilddarstellung. API-/Anmelde-Domains werden nicht umgeleitet.
- **YouTube Redux 3.12.0:** originale Content-Skripte und Assets mit lokalem statt Chrome-Sync-Speicher. Hintergrund-Worker, Toolbar-Aktion und Changelog-Popups wurden entfernt. Die Einstellungsseite übernimmt die Originaloptionen in die native Browseroberfläche. Eine feste Erweiterungsidentität bewahrt Einstellungen über portable Starts hinweg.
- **Werbefilter:** AdGuards originale `tsurlfilter`-Engine 6.0.3 mit offiziellen Basis-, Tracking- und deutschen Filtern; der Belästigungsfilter ist zusätzlich wählbar. Netzwerkfilter, CSS-/Extended-CSS-Ausblendung und Scriptlets sind integriert. Ausnahmen, eigene Regeln und manuelles Aktualisieren sind unter Extras erreichbar. Filterlisten liegen bereits im Paket, sodass die Erstnutzung keinen Filterdownload braucht.

Der Werbefilter ist eine native Engine-Integration, keine unverändert geladene AdGuard-Web-Store-Erweiterung. Deren Spezialfunktionen wie Filterprotokoll, Elementauswahl, HTML-Response-Umschreiben oder Browser-Integration mit der AdGuard-Desktop-App sind nicht enthalten. YouTube kann seine Oberfläche ändern; die übernommenen Redux-Anpassungen sind an den dokumentierten Upstream-Stand gebunden.

Die Websites werden nicht durch lokale Klone ersetzt. Die Anpassungen verwenden die regulären Websites. Nur Einstellungen und Filterlisten werden lokal gespeichert. Der Browser lädt keine weiteren Erweiterungen automatisch aus dem Web Store.

## Überprüfung

Der Integrationstest verwendet ein separates temporäres Benutzerprofil. Er prüft den nativen Fensterrahmen, Windows-Farben/-Schrift, Bitmap-Ressourcen, Startseite, URL-Auflösung, HTTP-/HTTPS-Navigation, Zurück/Vorwärts, Favoriten, Seitenleisten, Größenänderungen, Seitensuche, Optionen und die Trennung zwischen Webseiten und App-Schnittstelle. Ein laufendes Testvideo prüft Vollbildfläche, Wiederherstellung, Esc, F11, eingebettete Player anderer Herkunft und Navigation aus dem Vollbild. Die integrierten Funktionen werden mit kontrollierten Websites geprüft: Weiterleitungen, tatsächliche Redux-Content-Skripte, Einstellungen und Abschalten, AdGuard-Netzwerkblockierung, kosmetische Filter, Scriptlets, Extended CSS, Website-Ausnahmen und Speicherung. Das prüft die Integration, nicht jede Änderung der Live-Websites. Ausführen unter PowerShell:

```powershell
$env:CLASSIC_SMOKE = '1'
.\node_modules\electron\dist\electron.exe .
```

`CLASSIC_TEST_OUTPUT` legt den Zielordner für Testergebnis und Screenshots fest. Ohne Variable wird ein temporärer QA-Ordner verwendet. Anschließend `CLASSIC_SMOKE` wieder entfernen, bevor der Browser normal gestartet wird.

Quellenhinweise: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Die ursprüngliche Version liegt lokal unter `archive/v0.1`; der neue Browser lädt daraus keine Dateien.

Die AdGuard-Bibliotheken sind für das Paket in `lib/generated` gebündelt. `npm run dist` erstellt sie erneut aus den festgeschriebenen Abhängigkeiten. Für eine vollständige Aktualisierung der eingebauten Drittanbieter-Dateien müssen die in `scripts/prepare-builtins.js` referenzierten Upstream-Checkouts unter `reference` vorhanden sein; anschließend `npm run prepare-builtins` ausführen. Die fertige Version enthält diese Dateien bereits.
