# Spyglass / MSFX

Die Toolbar-Bitmaps (`toolbar.png`, `toolbar_large.png`), `go.png`, `page.png`, die Ladeanimation und das Internet-Zonensymbol stammen aus **Spyglass / MSFX** von **echelon-theme**.

Quelle: https://github.com/echelon-theme/spyglass

Verwendeter Stand: `f3a6b94d5a9c91046931bda1e7760a469ae7c5aa`.

Die Oberfläche wurde für diesen eigenständigen Electron-/Chromium-Browser neu implementiert. Die Firefox-spezifischen JS-/XUL-Anpassungen werden nicht ausgeführt. Die Bitmap-Ressourcen bleiben unverändert; Browser-Fenstersymbole werden daraus in Windows-Iconformate verpackt.

# YouTube Redux

Quelle: https://github.com/omnidevZero/YouTubeRedux

Version 3.12.0, Commit `27e7fbb203da8add71113363563fd24a2e1e6844`. Copyright (c) the-omnipotent (Projekt von omniZero). MIT-Lizenz liegt unter `vendor/youtube-redux/LICENSE`. Änderungen: Chrome-Sync-Speicher wird durch lokalen Erweiterungsspeicher ersetzt; kein Background-Worker, keine Toolbar-Aktion, keine automatischen Changelog-Fenster; native Einstellungsintegration und feste Manifest-Identität. Content-Skripte, CSS und Bildressourcen stammen aus dem Originalprojekt.

# Legacy Wikipedia

Quelle: https://github.com/sixem/legacy-wikipedia

Commit `fb474a35756653ae522e4f7d598f7a72bc70dc03`. MIT-Lizenz und Originalquellen unter `vendor/upstream/legacy-wikipedia`. Die Navigation wurde in `lib/site-adapters.js` für Electron übertragen. Der Parameter wird bei entsprechender Einstellung nur in der Adressleiste ausgeblendet.

# Old Reddit Redirect

Quelle: https://github.com/tom-james-watson/old-reddit-redirect

Version 3.0.3, Commit `2c4322a785c8c6b2650d5b98806e37b7ead15739`. MIT-Lizenz und Originalquellen unter `vendor/upstream/old-reddit`. Native Anpassung mit direkter `old.reddit.com`-Weiterleitung, Opt-out-Cookie, Cookie-Leisten-CSS und Accept-Header-Anpassung für Bilder; kein Browser-Action-Icon.

# AdGuard-Bibliotheken und Filter

- `@adguard/tsurlfilter` 6.0.3: https://github.com/AdguardTeam/tsurlfilter — GPL-3.0-only.
- `@adguard/scriptlets` 2.5.1: https://github.com/AdguardTeam/Scriptlets — GPL-3.0.
- `@adguard/extended-css` 2.2.1: https://github.com/AdGuardSoftwareLimited/ExtendedCss — GPL-3.0.
- Offizielle AdGuard-Filterlisten 2, 3, 6, 14: https://github.com/AdguardTeam/AdguardFilters. Herkunft, Downloadzeit und konkrete URLs stehen in `vendor/adguard-filters/metadata.json`; die ursprünglichen Listenheader bleiben erhalten.

Die native Filterintegration ist ein angepasstes Browsermodul und nicht die AdGuard-Chrome-Web-Store-Erweiterung. Namen bezeichnen die verwendeten Drittanbieterprojekte und bedeuten keine offizielle Partnerschaft.

Dieser Browser wird mit den AdGuard-Komponenten unter GPL-3.0-only bereitgestellt; der vollständige Lizenztext liegt unter `LICENSE`. Drittanbieter behalten ihre jeweiligen Copyright- und Lizenzhinweise. Der bearbeitbare Anwendungscode und die verwendeten Versionen/Buildskripte liegen im Arbeitsordner; die npm-Abhängigkeiten sind über `pnpm-lock.yaml` festgeschrieben.
