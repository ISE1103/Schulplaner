# Galerie einrichten

1. In Supabase das Projekt öffnen.
2. SQL Editor -> New query.
3. Den vollständigen Inhalt von `SUPABASE_SETUP.sql` ausführen. Das Skript kann auch bei einer bestehenden Installation erneut ausgeführt werden.
4. Danach die aktualisierten Dateien (`index.html`, `app.js`, `styles.css`, `sw.js`, `SUPABASE_SETUP.sql`) nach GitHub hochladen.
5. GitHub Pages/PWA neu laden. Bei einer installierten PWA ggf. einmal vollständig schließen und erneut öffnen, damit der neue Service-Worker-Cache aktiv wird.

## Galerie

- Personen: Lara, Bianca, Ivan
- Kategorien: Blutbild, Labor, Befund, Arztbrief, Sonstiges
- Dateitypen: JPG, PNG, WebP, PDF
- Maximale Dateigröße: 15 MB
- Storage-Bucket: `member-documents`, privat
- Dateien werden unter `<auth-user-id>/<Person>/...` gespeichert.
- Metadaten liegen in `public.member_documents`.
- RLS und Storage-Policies beschränken den Zugriff auf das angemeldete Familienkonto.

Hinweis: Medizinische Dokumente sind besonders sensible Daten. Die Galerie verwendet deshalb keinen öffentlichen Bucket und zeigt Dateien über zeitlich begrenzte Signed URLs an.
