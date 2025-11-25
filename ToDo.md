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
''' Hier startet die alte ToDo Liste -> alle Aufgaben wurden abgearbeitet '''

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
    Status: ✅ erledigt – 2025-11-06

19. **Login-/Logout-Seiten** – Implementiere einfache Anmelde- und Abmelde-Seiten (Mock-Zustand). Keine echte Authentifizierung nötig.
    Status: ✅ erledigt – 2025-11-06

20. **Sicherheits-Hinweisbanner** – Zeige ein Banner, dass die Demo keine echten Daten speichert und nur zu Testzwecken dient.
    Status: ✅ erledigt – 2025-11-07

21. **Datenexport (CSV-Mock)** – Füge eine Exportfunktion hinzu, um Demo-Daten als CSV herunterzuladen.
    Status: ✅ erledigt – 2025-11-07

22. **Mandantenportal-Startseite** – Baue eine Mock-Seite, auf der Mandanten Dokumente sehen oder hochladen können (Platzhalter).
    Status: ✅ erledigt – 2025-11-10

23. **PWA-Grundstruktur** – Füge `manifest.json` und Service Worker hinzu, um eine PWA-Installation zu ermöglichen.
    Status: ✅ erledigt – 2025-11-10

24. **Navigation & Menü** – Implementiere ein responsives Navigationsmenü mit Hamburger-Button.
    Status: ✅ erledigt – 2025-11-10

25. **Dashboard-Übersicht** – Erstelle ein Dashboard mit Platzhalter-Diagrammen für Akten, Leistungen und Rechnungen.
    Status: ✅ erledigt – 2025-11-10

26. **KI-Assistent (Mock)** – Integriere einen Chat-Bereich, der einfache Platzhalter-Antworten liefert.
    Status: ✅ erledigt – 2025-11-10

27. **Rechteprüfung für Dokumente** – Prüfe bei jedem Zugriff, ob der aktuelle Nutzer laut Profil Rechte auf das Dokument hat (Mock-Prüfung).
    Status: ✅ erledigt – 2025-11-10

28. **Pflege dieser ToDo-Liste** – Halte diese Datei aktuell, markiere erledigte Aufgaben und füge neue hinzu.
    Status: ✅ erledigt – 2025-11-10

29. **Dark-Mode-Umschalter** – Implementiere einen Toggle zwischen Hell- und Dunkelmodus (Einstellung im LocalStorage speichern).
    Status: ✅ erledigt – 2025-11-10

30. **Risikomonitor für Mandate** – Erstelle eine Heatmap-Ansicht der Mandatsrisiken mit Filtern, Detailtabelle und Exportfunktion.
    Status: ✅ erledigt – 2025-11-10

31. **Compliance-Checkliste & Prüfplan** – Ergänze ein Modul, das wiederkehrende Kanzlei-Compliance-Prüfpunkte bündelt, Filter und Fortschrittsanzeige bietet sowie eine exportierbare Maßnahmenliste erzeugt.
    Status: ✅ erledigt – 2025-11-10

32. **Team-Auslastungsmonitor** – Visualisiere Kapazitäten, Auslastung und Engpässe pro Teammitglied. Filter nach Rolle und Auslastungsgrad, plus Hinweise zu Maßnahmen.
    Status: ✅ erledigt – 2025-11-10

''' Hier endet die alte ToDo-Liste -> die neue ToDo-Liste startet weiter unten im Dokument '''

# Analyse des Projekts VeriLex

Dieser Abschnitt "Analyse des Projekts Verilex" kann je nach Projektstatus verändert und angepasst werden!
Dieser Abschnitt besteht aus einem Überblick, kritischen Fragen zum Gesamtkonzept, Vorschläge für eine einheitliche Datenstruktur, dem Projektziel und der neuen ToDo-Liste, welche Schritt für Schritt abgearbeitet werden soll. Nach jedem Schritt können die erwähnten Abschnitte upgedatet werden und die ToDos markiert werden.

## Überblick über das bestehende System

Folgende Module sind nach den ersten 32. ToDo Punkten vorhanden (Auswahl):

- **Aktenliste & Akten‑Detail**: zeigt eine Liste aller Fälle ("Akten") samt Metadaten; nutzt eine eigene JSON‑Datenstruktur, die nur lokal verfügbar ist.
- **Mandats‑Wizard**: erstellt neue Fälle über ein mehrstufiges Formular und erzeugt am Ende ein neues `case`‑Objekt
- **Dokumenten‑Management**: verwaltet hochgeladene oder erzeugte Dokumente; speichert Dokumente in einer separaten Liste.
- **Zeiterfassung**: enthält eine Stoppuhr‑Komponente und speichert Zeit­einträge (`timeEntries`) in `localStorage`.
- **Leistungsübersicht** und **Rechnungs‑Wizard**: aggregieren Zeit­einträge und generieren Rechnungen; der Rechnungs‑Wizard nutzt ein eigenes JSON‑Array mit Rechnungspositionen.
- **Offene‑Posten‑Übersicht**: zeigt Rechnungen mit Zahlungsstatus; die Daten stammen aus einer statischen Liste in der HTML‑Datei.
- **Compliance‑Checkliste**, **Risiko‑Monitor**, **Team‑Auslastung**, **Kalender**, **Mandantenportal**, **Dashboard**, **Workflow‑Designer**, **AI‑Assistent**, **Account‑Management** u.a. (siehe Feature‑Beschreibung).

Die Module wurden so entwickelt, dass sie in sich schlüssig funktionieren, es fehlt jedoch eine gemeinsame Datenbasis.  Jede Seite bindet eigene JSON‑Daten ein (via `<script type="application/json">`), legt Werte separat in `localStorage` ab oder nutzt kontextlose Mock‑Daten.  Dadurch gibt es **keine übergreifenden Datenflüsse**:  Ein neu angelegter Fall erscheint z. B. nicht automatisch in der Aktenliste anderer Module, und erfasste Zeit­einträge werden nicht zentral ausgewertet.  Die Feature‑Beschreibung benennt dieses Problem und schlägt einen **zentralen Store** mit gemeinsamen Entitäten (Case, Document, TimeEntry, Invoice, ComplianceItem, Workflow, User) vor.

## Kritische Fragen zum Gesamtkonzept

Um eine durchgängige Datenstruktur und ein nutzbares Gesamtsystem aufzubauen, sollten vor der Umsetzung einige Grundfragen geklärt werden:

1. **Zentrale Entitäten**: Welche Objekte müssen projektweit existieren?  Aus der Feature‑Beschreibung ergeben sich `Case`, `Document`, `TimeEntry`, `Invoice`, `ComplianceItem`, `Workflow` und `User`.  Müssen weitere Entitäten wie `Client`, `Task` oder `Appointment` modelliert werden?
2. **Beziehungen zwischen Entitäten**: Wie hängen die Objekte zusammen?  Beispielsweise referenziert ein `TimeEntry` immer einen `Case` und optional einen `User`; ein `Invoice` aggregiert mehrere `TimeEntries`; `ComplianceItem` kann mit einem `Case` verknüpft sein; der `Calendar` zeigt `Case`‑Termine und `ComplianceItem`‑Fristen.  Eine Datenbank‑ oder Store‑Struktur sollte diese Beziehungen abbilden können.
3. **Rollen und Berechtigungen**: Wie wirken sich die Benutzerrollen (Partner, Associate, Assistant, Accounting, Mandant) auf Sichtbarkeit und Datenzugriff aus?  Das bestehende System steuert die UI über `data-visible-for`, speichert aber keine Session im zentralen Modell.  Soll die Berechtigung serverseitig kontrolliert werden oder reicht ein clientseitiger Mock?
4. **Datenspeicherung und Persistenz**: Wie sollen Daten gespeichert werden?  Der Prototyp nutzt `localStorage` für Zeit­einträge; andere Module verwenden statische JSON‑Arrays.  Reicht für das Mock‑System ein gemeinsamer clientseitiger Store oder wird perspektivisch eine Backend‑API benötigt?  Wie können Testdaten beim Start geladen und während der Sitzung verändert werden?
5. **Events und Synchronisation**: Wie können Module auf Änderungen reagieren?  Wenn ein neuer Fall angelegt wird, sollten Aktenliste, Kalender, Zeiterfassung und Rechnungs‑Wizard sofort aktualisiert werden.  Ein Pub/Sub‑Mechanismus oder ein globales Event‑System ist notwendig.
6. **Testdaten und Datenbanken**: Welche Testdaten werden für die integrative Nutzung benötigt?  Aktuell sind die Demo‑Daten veraltet und dupliziert in verschiedenen Dateien.  Sollen mehrere vordefinierte Test‑Datenbanken existieren (z. B. "Standard", "Komplexer Fall")?  Wie können die Daten während einer Sitzung ergänzt oder zurückgesetzt werden?

## Vorschläge für eine einheitliche Datenstruktur

Um alle Features übergreifend nutzbar zu machen, ist eine zentrale Datenhaltung erforderlich.  Auf Basis der Feature‑Beschreibung sollte ein **zentraler Store** definiert werden, der folgende Entitäten verwaltet:contentReference[oaicite:12]{index=12}:

| Entität | Wichtige Felder | Beziehungen |
|--------|----------------|-------------|
| `Case` | `id`, `caseNumber`, `title`, `clientId`, `status`, `priority`, `deadlines[]` | 1:n zu `Document`, `TimeEntry`, `Invoice`, `ComplianceItem`, `Appointment` |
| `Client` | `id`, `name`, `contact`, `address` | n:m zu `Case` (ein Mandant kann mehrere Fälle haben) |
| `User` | `id`, `name`, `role` | 1:n zu `TimeEntry`, `Document` (erstellt von) |
| `Document` | `id`, `caseId`, `title`, `type`, `status`, `createdAt` | gehört zu einem Fall und ggf. einem Benutzer |
| `TimeEntry` | `id`, `caseId`, `userId`, `activity`, `startedAt`, `endedAt`, `durationMs`, `notes` | referenziert Fall und Nutzer |
| `Invoice` | `id`, `caseId`, `clientId`, `entries[]`, `issueDate`, `dueDate`, `status`, `amount` | aggregiert mehrere `TimeEntry`‑IDs |
| `ComplianceItem` | `id`, `caseId`, `title`, `deadline`, `risk`, `status` | erzeugt Frist‑Events für Kalender/Risiko |
| `Appointment` | `id`, `caseId`, `dateTime`, `type`, `description` | für Kalender und Team‑Auslastung |
| `Task/WorkflowStep` | `id`, `workflowId`, `title`, `assignedTo`, `status` | optional für Prozess‑Designer |

Der zentrale Store kann zunächst im Client (z. B. als JavaScript‑Modul mit Observable/Proxy‑Struktur) implementiert werden.  Jede Entität erhält CRUD‑Funktionen (`createCase`, `updateCase`, …).  Der Store verwaltet auch Ereignisse (z. B. `caseAdded`, `timeEntryAdded`), auf die andere Module reagieren können.


## Projektziel

Die Demo‐Anwendung **VeriLex** soll von einer Sammlung isolierter Funktionsmockups zu einem kohärenten Prototyp einer Kanzlei‑Plattform weiterentwickelt werden.  Kernidee ist die Ablösung der verstreuten JSON‑Daten durch ein **zentrales Datenmodell** mit einheitlichen Entitäten wie Fällen (`Case`), Dokumenten, Zeit­einträgen, Rechnungen und Compliance‑Tasks.  Dadurch können Module wie Mandatsanlage, Zeiterfassung und Rechnungsstellung miteinander kommunizieren und reagieren auf Ereignisse (z. B. ein neuer Zeitbucheintrag aktualisiert Leistungsübersicht und Team‑Auslastung).  Gleichzeitig werden Rollen, Berechtigungen und Testdaten zentral verwaltet, sodass neue Features auf der gleichen Datenbasis aufsetzen können.

## Neue To‑Do‑Liste

1. **Zentrales Datenmodell definieren:** Entwickle ein Schema für die gemeinsamen Entitäten (Case, Client, User, Document, TimeEntry, Invoice, ComplianceItem, Appointment).  Lege Schlüssel, Beziehungen und notwendige Felder fest und dokumentiere diese.  Berücksichtige, dass ein `TimeEntry` zu einem Fall und einem Nutzer gehört, eine Rechnung mehrere Zeit­einträge aggregiert und Compliance‑Tasks Fristen für den Kalender erzeugen.  Das Datenmodell dient als Grundlage für alle weiteren Anpassungen.

2. **Zentralen Store mit CRUD‑API und Event‑Bus implementieren:** Erstelle ein JavaScript‑Modul, das die Entitäten verwaltet, CRUD‑Funktionen bereitstellt und Änderungen per Events (Publish/Subscribe) an andere Module meldet.  Die Daten können zunächst im Browser (z. B. mit `localStorage`) persistiert werden, sollten aber über eine klare API zugänglich sein.  Beim Hinzufügen oder Ändern von Datensätzen werden passende Events wie `caseAdded` oder `invoiceUpdated` ausgelöst.  Spätere Erweiterungen auf ein Backend sollen dabei einfach möglich sein.

3. **Module auf den Store umstellen:** Ersetze die in HTML eingebetteten JSON‑Arrays (z. B. die Fallliste im Dashboard, die Zeit­einträge im Rechnungs‑Wizard und die Rechnungen in der Offene‑Posten‑Übersicht) durch Abfragen an den zentralen Store.  Das Mandats‑Wizard schreibt neue Fälle mit `addCase()`, die Zeiterfassung speichert Einträge mit `addTimeEntry()` und alle Übersichten lesen die Daten dynamisch.  Registriere Event‑Listener, damit UI‑Komponenten automatisch aktualisiert werden, sobald sich Daten ändern.  Entferne Duplikate und redundante Mock‑Daten aus den HTML‑Dateien.

4. **Rollen‑ und Account‑Management integrieren:** Führe den Login‑Prototyp mit dem Account‑Modul zusammen, sodass Benutzer, Rollen und Berechtigungen im zentralen Store verwaltet werden.  Die Navigation und die Sichtbarkeit der Module werden dynamisch anhand der aktiven Rolle gesteuert (statt nur über statische `data‑visible‑for`‑Attribute).  Implementiere einfache Mock‑Funktionen zum Anlegen von Nutzern und zum Rollenwechsel.  Spätere Erweiterungen auf echte Authentifizierung bleiben möglich.

5. **Testdaten konsolidieren und verwaltbar machen:** Lösche die verstreuten Demo‑Datenblöcke und hinterlege stattdessen ein oder mehrere JSON‑Files mit konsistenten Beispiel­daten.  Beim Start der Anwendung können diese Dateien in den Store geladen werden, und es soll eine Funktion geben, die den Store auf einen ausgewählten Datensatz zurücksetzt oder erweitert.  Damit können während einer Sitzung neue Testfälle, Dokumente oder Zeit­einträge hinzugenommen werden, ohne dass andere Module brechen.  Diese Testdaten dienen zugleich als Vorlage für spätere Migrationen auf eine echte Datenbank.

6. **Benachrichtigungs‑ und Ereignissystem entwickeln:** Baue auf dem Event‑Bus ein Benachrichtigungssystem auf, das Fristüberschreitungen, neue Dokumente, unbezahlte Rechnungen oder neu angelegte Mandate erkennt.  Diese Ereignisse sollen Toasts, Badge‑Zähler oder Einträge im Dashboard erzeugen, damit Anwender sofort reagieren können.  Implementiere einfache Filter, um nur für die aktuell angemeldete Rolle relevante Benachrichtigungen anzuzeigen.  Die Kalender‑ und Risiko‑Module können diese Events nutzen, um ihre Darstellungen zu aktualisieren.

7. **Integration und Erweiterung der Fachmodule:** Verbinde das Compliance‑Modul mit dem Risiko‑Monitor, indem Compliance‑Tasks ein Risikoscore generieren und im Store ablegen; der Monitor liest diese Werte aus und erstellt Heatmaps.  Koppelt die Team‑Auslastung und den Kalender an die Zeiterfassung, sodass neue Einträge automatisch in der Kapazitätsübersicht und bei Terminen erscheinen.  Überprüfe die Berechnung der Leistungsübersicht und der Rechnungen anhand der Zeit­einträge im Store, und ergänze fehlende Felder wie Stundensätze oder Steuersätze.  Pflege die UI so, dass Nutzer Änderungen an Daten sofort sehen.

Durch diese Schritte entsteht eine modulare, aber integrierte Architektur.  Jede Funktion agiert nicht mehr isoliert, sondern greift auf dieselbe Datenbasis zu und synchronisiert Änderungen sofort.  Gleichzeitig wird die Wartbarkeit verbessert, da Testdaten und Geschäftslogik zentral definiert sind.
