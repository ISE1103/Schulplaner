# Familienkonto mit nur einem Passwort – Schulplaner PWA v2.4

Auf iPhone, Android und Tablet wird jetzt **nur noch das Familien-Passwort** eingegeben.
Technisch benötigt Supabase weiterhin einen Benutzer mit E-Mail + Passwort.
Die E-Mail dient nur als interne Konto-ID und wird in der App nicht angezeigt.

## 1. Supabase-Projekt einrichten
Wenn du v2.3 noch nicht eingerichtet hast:

1. Erstelle ein Supabase-Projekt.
2. Öffne **SQL Editor**.
3. Führe den Inhalt von `SUPABASE_SETUP.sql` aus.

## 2. Gemeinsamen Benutzer einmalig in Supabase anlegen

Im Supabase-Dashboard:

1. Öffne **Authentication → Users**.
2. Lege einen neuen Benutzer an.
3. Verwende eine technische E-Mail, z. B.:
   `schulplaner-familie@example.com`
4. Lege euer gemeinsames, starkes Familien-Passwort fest.
5. Der Benutzer sollte als bestätigt/confirmed angelegt sein.

Die technische E-Mail muss nicht eure private Haupt-E-Mail sein.
Sie wird nur für die Supabase-Anmeldung im Hintergrund verwendet.

## 3. supabase-config.js ausfüllen

Trage dort drei Werte ein:

```js
window.SUPABASE_URL = "DEINE_PROJECT_URL";
window.SUPABASE_PUBLISHABLE_KEY = "DEIN_PUBLISHABLE_ODER_ANON_KEY";
window.FAMILY_LOGIN_EMAIL = "schulplaner-familie@example.com";
```

`FAMILY_LOGIN_EMAIL` muss exakt dieselbe E-Mail sein, die du unter Authentication → Users angelegt hast.

**Niemals den service_role Key in GitHub oder die PWA eintragen.**

## 4. GitHub Pages aktualisieren

Lade alle Dateien dieser Version in dein GitHub-Repository und committe sie.

Danach erscheint beim Öffnen nur:

**Familien-Passwort**
`••••••••`

**Anmelden**

## 5. Zweites Gerät

Auf dem Handy deiner Frau dieselbe PWA öffnen/installieren und dasselbe Passwort eingeben.
Beide Geräte verwenden dann denselben Supabase-Benutzer und damit denselben Schulplaner.

## Sicherheit

Die technische E-Mail steht im öffentlichen Frontend und ist deshalb **nicht geheim**.
Das ist in Ordnung: Der Schutz besteht aus dem Passwort, Supabase Auth und Row Level Security.

Das Passwort steht **nirgendwo im JavaScript-Code** und wird nicht in GitHub gespeichert.

Verwende ein starkes, einzigartiges Passwort, das ihr nicht auch für andere Konten benutzt.
