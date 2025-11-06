# VeriLex – Aufgabenliste für Codex

## Prompt für Codex

Du bist Codex, der Entwickler für das **VeriLex**-Mock-Projekt. Lies die untenstehenden Aufgaben von oben nach unten und arbeite **immer nur an einer Aufgabe gleichzeitig**. Nachdem du eine Aufgabe abgeschlossen hast, markiere sie mit `✅ erledigt` und füge das **Datum der Fertigstellung** hinzu.  Jede Aufgabe steht für ein kleines Feature oder einen Feinschliff.  
Falls du neue Aufgaben entdeckst, füge sie am Ende dieser Liste hinzu.  
Bearbeite keine Aufgaben parallel.  

Beim Umsetzen jeder Aufgabe beachtest du folgende Richtlinien:
* **Web-Technologien**: Baue neue Seiten und Module in **reinem HTML, CSS und JavaScript**, ohne die bestehende `.jsx`-Datei zu verändern. Der vorhandene React-Mock dient nur als Ausgangspunkt und bleibt unangetastet. Du kannst bei Bedarf TailwindCSS für das Styling verwenden. Der Code soll weiterhin ohne Build-Schritt (z. B. via GitHub Pages) ausgeliefert werden können.  
* **Architektur**: Halte dich am bestehenden Prozessfluss und an den User-Stories der JSX-Datei (z. B. Auswahl „Was möchte der Nutzer machen?“, Konto- und Rollenverwaltung). Diese Struktur gilt als Blaupause für den neuen Aufbau in HTML/CSS/JS. Alle Stories und Prozesse müssen sich in der neuen Oberfläche nachvollziehen lassen.  
* **Usability & UX**: Priorisiere einfache Navigation, klares Design und konsistente Interaktion.  
* **Zeitoptimierung**: Wiederkehrende Handlungen sollen automatisierbar oder durch Shortcuts/Autofill-Mechanismen unterstützt sein.  
* **Automation & KI-Integration**: Langfristig soll ein KI-RAG-Agent mit eingeschränktem Zugriff auf Dokumente integriert werden (zugriffsabhängig vom Benutzerprofil).  
* **Dark-Mode, Animationen und sonstige optische Erweiterungen** kommen erst am Ende, wenn alle Hauptfunktionen vorhanden sind.

---

1. **Globale Fehlerbehandlung** – Füge ein zentrales Fehler-Overlay hinzu, das Fehler (JavaScript-Exceptions oder nicht geladene Daten) abfängt und benutzerfreundlich darstellt.
   Status: ✅ erledigt – 2025-11-04

2. **CI/CD-Workflow für GitHub Pages** – Lege eine GitHub Actions Workflow-Datei an (`.github/workflows/deploy.yml`), die das Projekt bei jedem Push auf den `main`-Branch automatisch auf GitHub Pages deployt.
   Status: ✅ erledigt – 2025-11-04

3. **Aktenliste mit Suche** – Erstelle eine übersichtliche Liste aller Demo-Akten. Die Liste soll responsiv im Grid angezeigt werden und eine Suchleiste enthalten, die nach Titel oder Aktennummer filtert. Verwende Platzhalterdaten im JSON-Format. Achte auf klare Darstellung (Titel, Mandant, Friststatus) und Keyboard-Navigation.
   Status: ✅ erledigt – 2025-11-04

4. **Akten-Detailseite & Timeline** – Baue eine Detailseite, die die Historie eines Akts als chronologische Timeline darstellt (Dokumente, Notizen, Fristen, Aktivitäten). Nutze ein responsives Layout mit Seitenleiste für Akteninfos.
   Status: ✅ erledigt – 2025-11-04

5. **Mandats-Wizard (mehrstufig)** – Erstelle einen Wizard mit mehreren Schritten zur Mandatsanlage (Klientendaten → Gegner → Akteninhalt → Abschluss). Jeder Schritt soll eigene Validierung und Fortschrittsanzeige besitzen.
   Status: ✅ erledigt – 2025-11-04

6. **Dokumentenverwaltung (DMS-Mock)** – Implementiere eine Drag-&-Drop-Zone für Datei-Uploads mit Upload-Liste, Vorschau und Delete-Button. Es genügt ein Mock-Verhalten (kein echter Upload).
   Status: ✅ erledigt – 2025-11-04

7. **Dokument-Viewer** – Baue ein modales Fenster zum Anzeigen von PDF-Dokumenten (z. B. über eingebettetes `<iframe>`).
   Status: ✅ erledigt – 2025-11-04

8. **Vorlagen-Assistent** – Füge ein einfaches Formular hinzu, mit dem Textbausteine oder Vorlagen angezeigt, angepasst und in das Dokument eingefügt werden können.
   Status: ✅ erledigt – 2025-11-04

9. **Zeiterfassung mit Stoppuhr** – Ergänze eine Stoppuhr-Komponente, die die Zeit für eine Tätigkeit misst und als Eintrag in der Leistungsübersicht speichert.
   Status: ✅ erledigt – 2025-11-05

10. **Leistungsübersicht** – Erstelle eine Tabelle aller Leistungen mit Filter- und Summenfunktion (z. B. Stunden nach Mandant).  
    Status: ✅ erledigt – 2025-11-05

11. **Rechnungs-Wizard** – Baue einen Wizard zur Rechnungserstellung auf Basis erfasster Leistungen. Zeige Vorschau und PDF-Export (Dummy).
    Status: ✅ erledigt – 2025-11-05

12. **Offene-Posten-Übersicht (Mock)** – Zeige Rechnungen mit Status „bezahlt“, „überfällig“, „offen“. Keine echte Datenbank nötig.
    Status: ✅ erledigt – 2025-11-05

13. **E-Mail-Integration (Mock)** – Erstelle eine Demo-Inbox mit Nachrichtenliste und Detailansicht. Alle E-Mails sind Dummy-Einträge aus JSON.
    Status: ✅ erledigt – 2025-11-05

14. **ERV-Paket-Builder (Mock)** – Simuliere das Erstellen eines elektronischen Rechtsverkehr-Pakets mit Upload-Liste und Validierungsanzeige.  
    Status: ✅ erledigt – 2025-11-05

15. **Workflow-Designer (Mock)** – Implementiere eine einfache Drag-&-Drop-Fläche, auf der Prozess-Kacheln verbunden werden können.
    Status: ✅ erledigt – 2025-11-06

16. **Fristen-Board** – Baue ein farbcodiertes Board mit Fristen (z. B. grün = offen, rot = überfällig).
    Status: ✅ erledigt – 2025-11-06

17. **Termin-Kalender** – Erstelle eine Kalenderansicht mit anstehenden Gerichtsterminen oder Besprechungen.
    Status: ✅ erledigt – 2025-11-06

18. **Rollen-basierte UI-Sichtbarkeit** – Passe bestehende Seiten/Module so an, dass sie je nach aktuell angemeldeter Rolle angezeigt oder verborgen werden. Für den Mock reicht eine Dropdown-Auswahl.  
    Status: ⬜

19. **Login-/Logout-Seiten** – Implementiere einfache Anmelde- und Abmelde-Seiten (Mock-Zustand). Keine echte Authentifizierung nötig.  
    Status: ⬜

20. **Sicherheits-Hinweisbanner** – Zeige ein Banner, dass die Demo keine echten Daten speichert und nur zu Testzwecken dient.  
    Status: ⬜

21. **Datenexport (CSV-Mock)** – Füge eine Exportfunktion hinzu, um Demo-Daten als CSV herunterzuladen.  
    Status: ⬜

22. **Mandantenportal-Startseite** – Baue eine Mock-Seite, auf der Mandanten Dokumente sehen oder hochladen können (Platzhalter).  
    Status: ⬜

23. **PWA-Grundstruktur** – Füge `manifest.json` und Service Worker hinzu, um eine PWA-Installation zu ermöglichen.  
    Status: ⬜

24. **Navigation & Menü** – Implementiere ein responsives Navigationsmenü mit Hamburger-Button.  
    Status: ⬜

25. **Dashboard-Übersicht** – Erstelle ein Dashboard mit Platzhalter-Diagrammen für Akten, Leistungen und Rechnungen.  
    Status: ⬜

26. **KI-Assistent (Mock)** – Integriere einen Chat-Bereich, der einfache Platzhalter-Antworten liefert.  
    Status: ⬜

27. **Rechteprüfung für Dokumente** – Prüfe bei jedem Zugriff, ob der aktuelle Nutzer laut Profil Rechte auf das Dokument hat (Mock-Prüfung).  
    Status: ⬜

28. **Pflege dieser ToDo-Liste** – Halte diese Datei aktuell, markiere erledigte Aufgaben und füge neue hinzu.  
    Status: ⬜

29. **Dark-Mode-Umschalter** – Implementiere einen Toggle zwischen Hell- und Dunkelmodus (Einstellung im LocalStorage speichern).  
    Status: ⬜
