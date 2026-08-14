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
