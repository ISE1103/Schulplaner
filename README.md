# Mein Schulplaner – PWA

Diese Version läuft als responsive Web-App auf iPad, Tablet, Laptop und Desktop.

## Lokal testen
Ein Service Worker funktioniert nicht zuverlässig über file://. Starte deshalb im Ordner einen kleinen Webserver:

Python:
    python -m http.server 8000

Danach im Browser öffnen:
    http://localhost:8000

## Auf dem iPad installieren
1. Die PWA muss über HTTPS erreichbar sein (z. B. auf einem Webserver).
2. In Safari öffnen.
3. Teilen → "Zum Home-Bildschirm".
4. Danach startet sie nahezu wie eine normale App.

## Datenspeicherung
Die aktuelle Version speichert Daten mit localStorage im jeweiligen Browser/Gerät.
Es gibt noch keine Cloud-Synchronisation zwischen mehreren Geräten.

## Dateien
- index.html – Oberfläche
- styles.css – responsives Tablet-/Desktop-Design
- app.js – Schulplaner-Funktionen und lokale Speicherung
- manifest.webmanifest – PWA-Metadaten
- sw.js – Offline-Cache
- icons/ – App-Symbole

## Version 2
- iPhone-Navigation unten
- Backup als JSON exportieren
- Backup wiederherstellen
- Offline-Cache aktualisiert

## Version 2.2
- Stundenplan für iPhone, Android und Tablets optimiert
- Auf Smartphones ein Wochentag pro Ansicht
- Größere touchfreundliche Stundenkarten
- Fach, Lehrer, Raum und Notiz übersichtlicher
- Freie Stunde antippen = direkt neue Stunde für diesen Platz anlegen
- Bestehende Stunde antippen = bearbeiten
- Desktop/Tablet-Mehrspaltenansicht bleibt erhalten


## Version 2.3 – Familienkonto
- gemeinsamer E-Mail/Passwort-Login
- Supabase Cloud-Speicherung
- automatische Echtzeit-Synchronisation zwischen mehreren Geräten
- Row Level Security: nur das angemeldete Familienkonto darf seine Daten lesen/ändern
- lokale Offline-Kopie bleibt erhalten
- siehe `FAMILIENKONTO_SETUP.md` und `SUPABASE_SETUP.sql`


## Version 2.4 – Passwort-Login
- Benutzeroberfläche fragt nur noch nach dem gemeinsamen Familien-Passwort
- technische Supabase-E-Mail bleibt unsichtbar in `supabase-config.js`
- kein Passwort wird im Quellcode gespeichert
- automatische Cloud-Synchronisation bleibt erhalten
- siehe `PASSWORT_LOGIN_SETUP.md`

## Version 2.5 – iPhone Hoch-/Querformat
- Layout reagiert auf Geräte-Drehung und Visual Viewport
- Stundenplan wird nach Rotation neu gerendert
- iPhone-Querformat nutzt eine kompakte Tagesansicht
- Dialoge passen sich an die aktuelle Bildschirmhöhe an
- Safe-Area-Unterstützung für iPhone
- Tablet-Querformat behält Mehrspaltenansicht

## Version 2.6 – iOS Auto-Zoom Fix
- Eingabefelder auf iPhone mindestens 16px Schriftgröße
- verhindert Safari/PWA-Auto-Zoom beim Passwortfeld
- Login-Feld verliert Fokus vor dem Wechsel zur App
- App und Auth-Bildschirm strikt auf Viewport-Breite begrenzt
- zusätzliche Breitenkorrekturen für Hoch- und Querformat

## Version 2.7
- Symbole im iPhone-Querformat verkleinert
- untere Navigation im Querformat kompakter
- Abmelden leert das Passwortfeld und zeigt sofort den gesperrten Login-Bildschirm
- automatisches Schließen wird versucht, soweit iOS/Browser dies zulassen

## Version 2.8
- Im Smartphone-Hochformat werden Montag bis Freitag gleichzeitig angezeigt
- Kein seitliches Wischen mehr nötig, um Freitag zu erreichen
- Wochentagsbuttons passen sich auch an schmale iPhones an

## Version 2.9 – Familienkalender
- Neuer Reiter Familie
- Termine für Lara, Bianca, Ivan und Sonstige
- Mehrere Personen pro Termin möglich
- Sonstige mit frei eintragbarem Namen
- Kategorien, Datum, Start-/Endzeit, Ort und Notiz
- In-App-Erinnerungen: 30 Minuten, 1 Stunde oder 1 Tag vorher
- Filter nach Person
- kommende Familientermine auf der Übersicht
- Familienkalender wird über die bestehende Supabase-Cloud synchronisiert

## Version 2.9.2
- Überschriften und Terminlisten im Familienkalender etwas vom Rand eingerückt
- automatische Kategorie-Symbole:
  - Familie 👨‍👩‍👧
  - Schule 🎓
  - Arzt 🩺
  - Privat 👤
  - Arbeit 💼
  - Freizeit 🎯
  - Veranstaltung 🎉
  - Sonstiges 📌
