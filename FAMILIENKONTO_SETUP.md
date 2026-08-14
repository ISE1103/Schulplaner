# Familienkonto einrichten – Schulplaner PWA v2.3

Diese Version verwendet **ein gemeinsames Supabase-Benutzerkonto**.
Du und deine Frau meldet euch auf allen Geräten mit derselben E-Mail und demselben Passwort an.
Dadurch verwenden alle Geräte dieselbe Cloud-Datenzeile und erhalten Änderungen in Echtzeit.

## 1. Supabase-Projekt erstellen
1. Gehe zu https://supabase.com und erstelle ein kostenloses Projekt.
2. Öffne im Projekt den **SQL Editor**.
3. Öffne die Datei `SUPABASE_SETUP.sql`, kopiere den gesamten Inhalt hinein und klicke **Run**.

## 2. URL und Schlüssel eintragen
1. Öffne in Supabase die API-/Connect-Einstellungen deines Projekts.
2. Kopiere:
   - Project URL
   - Publishable Key bzw. Anon Key
3. Öffne `supabase-config.js`.
4. Ersetze dort die beiden Platzhalter.

**Niemals einen `service_role`-Schlüssel in die PWA eintragen.**

## 3. GitHub aktualisieren
Lade alle Dateien dieser Version in dein GitHub-Pages-Repository und committe sie.
Insbesondere neu:
- `supabase-config.js`
- `SUPABASE_SETUP.sql`

## 4. Familienkonto erstellen
1. Öffne die PWA nach dem GitHub-Update.
2. Unter **Familienkonto erstellen** eine gemeinsame Familien-E-Mail und ein starkes Passwort eingeben.
3. Falls Supabase E-Mail-Bestätigung verlangt, den Link in der E-Mail bestätigen.
4. Danach anmelden.

## 5. Zweites Smartphone
Auf dem Smartphone deiner Frau dieselbe PWA öffnen bzw. installieren.
Mit **derselben Familien-E-Mail und demselben Passwort** anmelden.

Eine Aufgabe, die auf Gerät A gespeichert wird, sollte danach automatisch auf Gerät B erscheinen.

## Datensicherheit
- GitHub Pages enthält nur den Programmcode.
- Schulplaner-Daten liegen in Supabase.
- Row Level Security erlaubt nur dem angemeldeten Konto Zugriff auf seine Zeile.
- Die Publishable-/Anon-Key darf im Frontend stehen; die Sicherheit entsteht durch Login + RLS.
- `service_role` darf niemals veröffentlicht werden.

## Offline
Die App behält weiterhin eine lokale Kopie.
Bei bestehender Internetverbindung synchronisiert sie Änderungen mit der Cloud.
