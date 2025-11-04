VeriLex – Aufgabenliste für Codex
Prompt für Codex

Du bist Codex, der Entwickler für das VeriLex‑Mock‑Projekt. Lies die untenstehenden Aufgaben von oben nach unten und arbeite immer nur an einer Aufgabe gleichzeitig. Nachdem du eine Aufgabe abgeschlossen hast, markiere sie mit ✅ erledigt und füge das Datum der Fertigstellung hinzu. Jede Aufgabe steht für ein kleines Feature oder einen Feinschliff, mit dem das bestehende Demo weiterentwickelt wird.

Beim Umsetzen jeder Aufgabe beachtest du folgende Richtlinien:

Usability & UX: Achte auf klare Benutzerführung, verständliche Texte, responsive Layouts und barrierefreie Bedienung. Verwende moderne Web‑Design‑Techniken (z. B. flexible Grids, ARIA‑Labels, Dark‑Mode‑Option).

Moderne Technik & Zeitoptimierung: Automatisiere wiederkehrende Schritte, setze wo sinnvoll einen KI/RAG‑Assistenten ein und ermögliche schnelle, intuitive Bedienung. Repetitive Arbeiten sollen mit einem Klick erledigt werden können.

Rollenbasierter Zugriff: Implementiere nur Stub‑Funktionen, aber strukturiere den Code so, dass Rechte pro Benutzerrolle festgelegt werden können. Der KI‑Assistent darf nur auf Daten zugreifen, die dem angemeldeten Profil zugeordnet sind.

Test‑Implementierung: Der Mock soll noch nicht produktiv arbeiten, aber sämtliche wesentlichen Features als funktionales UI enthalten. Daten können aus JSON-Dateien oder LocalStorage kommen. Vermeide serverseitige Back‑End‑Integration.

Web‑Technologien: Baue neue Seiten und Module in reinem HTML, CSS und JavaScript, ohne die bestehende .jsx‑Datei zu verändern. Der vorhandene React‑Mock dient nur als Ausgangspunkt und bleibt unangetastet. Du kannst bei Bedarf TailwindCSS für das Styling verwenden. Der Code soll weiterhin ohne Build‑Schritt (z. B. via GitHub Pages) ausgeliefert werden können.

Vorlage & Prozessfluss: Richte den Aufbau und die Navigationsstruktur der neuen HTML/CSS/JS‑Module am Prozessfluss und an den User‑Stories des bestehenden React/JSX‑Mocks aus. Die Story‑Auswahl („Was möchte der Nutzer machen?“), die mehrstufigen Wizards sowie die Rollenverwaltung dienen als Blaupause für die neue Umsetzung. Auch wenn du keine Komponenten aus der .jsx‑Datei übernimmst, orientiere dich an ihrem Ablauf und der Benutzerführung.

Vorgehensweise

Öffne diese Datei und lies die erste noch nicht erledigte Aufgabe.

Erledige die Aufgabe vollständig. Fokussiere dich auf das geforderte Feature und schreibe sauberen, gut kommentierten Code.

Wenn die Aufgabe abgeschlossen ist, markiere sie mit ✅ erledigt – DD.MM.YYYY und schreibe eine kurze Notiz, was du verändert hast.

Commits sollten nur den Code für diese eine Aufgabe enthalten. Beginne dann mit der nächsten Aufgabe.

Sollte das bestehende README.md der Projektvision widersprechen oder neue Anforderungen beschreiben, passe es an die Vorgaben dieser Aufgabenliste an. Jegliche Änderungen dürfen nicht die vorhandene .jsx‑Datei berühren.

Aufgaben

Globale Fehlerbehandlung – Füge einen Error‑Boundary bzw. eine globale Fehlerkomponente hinzu, die Fehler im Frontend abfängt und den Nutzer freundlich informiert. Zeige verständliche Fehlermeldungen und biete einen „Zurück zur Startseite“‑Link.
Status: ⬜

CI/CD‑Workflow für GitHub Pages – Lege eine GitHub Actions Workflow‑Datei an (.github/workflows/deploy.yml), die das Projekt bei jedem Push auf den main‑Branch baut (z. B. HTML/CSS/JS minifizieren) und die statischen Seiten automatisch auf GitHub Pages bereitstellt. Verwende gängige Actions für statische Sites wie actions/deploy-pages.
Status: ⬜

Aktenliste mit Suche – Erstelle eine übersichtliche Liste aller Demo‑Akten. Die Liste soll responsiv im Grid angezeigt werden und eine Suchleiste enthalten, die nach Titel oder Aktennummer filtert. Verwende Platzhalterdaten im JSON-Format. Achte auf klare Darstellung (Titel, Mandant, Friststatus) und Keyboard‑Navigation.
Status: ⬜

Akten-Detailseite & Timeline – Baue eine Detailseite, die die wichtigsten Akteninformationen (Parteien, Streitwert, Beteiligte) anzeigt und eine vertikale Timeline mit Ereignissen und Fristen darstellt. Nutze Dummy‑Events; implementiere Accordion‑Elemente zum Ein‑/Ausklappen.
Status: ⬜

Neuanlage-Wizard für Akten – Implementiere einen mehrstufigen Wizard zur Anlage neuer Akten. Schritte: (1) Stammdaten, (2) Mandanteninformationen, (3) Rechtsgebiet & Streitwert, (4) Zusammenfassung. Baue einen Fortschrittsindikator und validiere Eingaben. Füge einen Platzhalter ein, wo der KI‑Assistent im dritten Schritt ein passendes Rechtsgebiet vorschlägt.
Status: ⬜

Smarte Suchleiste – Ergänze im Kopfbereich eine globale Suchleiste mit Autocomplete. Beim Tippen schlägt sie relevante Akten oder Kontakte aus den vorhandenen JSON‑Daten vor. Stelle sicher, dass die Vorschlagsliste per Tastatur navigiert werden kann.
Status: ⬜

Dokument-Upload mit Klassifikation – Implementiere eine Drag‑&‑Drop‑Zone zum Hochladen von Dokumenten in einer Akte. Zeige hochgeladene Dateien mit Name, Dateityp-Icon und Upload‑Datum an. Erstelle eine Stub‑Funktion, die dem Dokument automatisch Tags (z. B. „Vertrag“, „Klage“) zuweist.
Status: ⬜

Dokumenten-Viewer & Zusammenfassung – Entwickle eine Seite, die ein ausgewähltes Dokument anzeigt (z. B. in einem PDF-Viewer oder als Download-Link) und darunter eine Platzhalter‑Zusammenfassung durch den KI‑Assistenten einblendet. Sorge für klare Buttons (Download, Öffnen in neuem Tab).
Status: ⬜

Generative Schriftsatz-Erstellung – Baue einen Wizard, der aus einer Vorlage einen Schriftsatz generiert. Auswahlschritte: (1) Vorlage wählen, (2) Variablen befüllen, (3) Vorschau und Download. Der Schritt 2 soll die Akten‑ und Personendaten automatisch vorausfüllen; benutze eine Stub‑Funktion für generative KI, um Beispieltext zu erzeugen.
Status: ⬜

Zeiterfassungspanel – Erstelle ein Panel mit Liste aller erfassten Zeiten. Nutzer können neue Einträge manuell hinzufügen (Feld: Beschreibung, Dauer, Akt) oder eine Stoppuhr verwenden, die beim Starten die aktuelle Zeit misst und beim Stoppen einen Eintrag erzeugt. Alle Elemente sollen gut bedienbar sein (große Buttons, Tastatursteuerung).
Status: ⬜

AI‑Zeitvorschläge – Füge eine Box hinzu, die basierend auf Dummy‑Aktivitäten (z. B. Kalendertermine, Telefonate) Vorschläge für Zeitbuchungen macht. Nutzer können Vorschläge per Klick übernehmen. Implementiere die Logik als Stub und konzentriere dich auf die UI.
Status: ⬜

Rechnungserstellung – Implementiere eine Seite zum Erstellen einer Rechnung. Nutzer wählen abrechenbare Leistungen aus, fügen Auslagen hinzu, wählen Steuersatz und Zahlungsziel. Die Seite erzeugt eine PDF‑Vorschau (Dummy) und bietet den Download. Zeige alle Summen übersichtlich an.
Status: ⬜

Rechnungsübersicht & Status – Erstelle eine Übersicht aller erstellten Rechnungen mit Filter (bezahlt, offen, in Mahnung). Hinterlege Buttons zum Versenden (Stub‑E‑Mail) und markiere Rechnungen als bezahlt. Achte auf Sortierbarkeit und responsive Tabellen.
Status: ⬜

E‑Mail‑Inbox – Baue eine Demo‑Inbox, die E‑Mails als Liste anzeigt. Beim Anklicken wird die Mail geöffnet (Betreff, Absender, Inhalt) und es gibt eine Schaltfläche zum Zuordnen zur Akte. Nutze Dummy‑Mails in JSON. Berücksichtige Tastaturnavigation und klare Lesbarkeit.
Status: ⬜

E‑Mail senden aus Akte – Entwickle ein Formular, um aus einer Akte heraus E‑Mails zu verschicken. Felder: Empfänger (Dropdown aus Kontakten), Betreff, Nachricht, Anhangsauswahl (vorhandene Dokumente). Beziehe Standardwerte (z. B. Betreff „Klage XY – Unterlagen“).
Status: ⬜

ERV‑Paket Builder – Erstelle einen Wizard, der zum Versand an Gerichte ein ERV‑Paket zusammenstellt. Schritte: (1) Dokumente auswählen, (2) Empfänger/Bezirksgericht angeben, (3) Metadaten (Klageart, Streitwert) ergänzen, (4) Validieren (PDF/A‑Check, Signaturplatzhalter). Am Ende soll ein Download bereitstehen.
Status: ⬜

Workflow‑Designer (Drag & Drop) – Baue ein visuelles Tool, mit dem Benutzer einfache Workflows modellieren können: Start‑Knoten, Aktionen (z. B. „Rechnung prüfen“), Entscheidungen. Die Elemente sollen per Drag‑&‑Drop auf einer Zeichenfläche positionierbar sein. Es handelt sich um einen Mock ohne Speicherung.
Status: ⬜

Fristenübersicht – Implementiere eine Seite, die alle Fristen der Kanzlei tabellarisch und farblich (z. B. Rot = überfällig, Gelb = demnächst, Grün = erledigt) darstellt. Benutzer können Fristen hinzufügen oder bearbeiten. Nutze barrierefreie Date‑Picker und Filter (nach Rechtsgebiet, Anwalt).
Status: ⬜

Erinnerungsfunktion – Ergänze die Fristenübersicht um eine lokale Erinnerungsfunktion: Nutzer können festlegen, wie viele Tage vor Fälligkeit eine Benachrichtigung erscheinen soll. Für den Mock reicht ein Browser‑Toast oder ein modales Popup.
Status: ⬜

Benutzerverwaltung & Rollen – Entwickle ein Modul zum Anlegen, Bearbeiten und Löschen von Benutzern. Benutzer erhalten Rollen (Anwalt, Sekretariat, Buchhaltung, Kanzleimanager). Implementiere formularbasierte Verwaltung mit Validierung.
Status: ⬜

Rollenbasierte UI‑Sichtbarkeit – Passe bestehende Seiten/Module so an, dass sie je nach aktuell angemeldeter Rolle angezeigt oder verborgen werden. Für den Mock kannst du eine Dropdown‑Auswahl verwenden, um zwischen den Rollen zu wechseln und zu testen, welche Menüpunkte sichtbar sind.
Status: ⬜

Login‑ & MFA‑Mock – Baue eine Anmeldeseite mit Benutzername/Passwort und implementiere eine nachfolgende Seite für die Eingabe eines Einmalcodes (MFA). Dies dient nur der UI‑Darstellung; es wird keine echte Authentifizierung durchgeführt.
Status: ⬜

Session‑Bar & Abmeldung – Ergänze die Anwendung um eine Kopfzeile mit Anzeigenamen des aktuellen Benutzers und einem „Abmelden“‑Button. Nach Klick soll eine Logout‑Bestätigungsseite erscheinen.
Status: ⬜

Sicherheitsplaceholder – Füge in den Einstellungen einen Bereich „Sicherheit“ hinzu, der Optionen wie „Datenverschlüsselung“ (nur Info), „Audit‑Logs anzeigen“ (Stub‑Button) und „Datenspeicherort“ (Dropdown) beinhaltet. Keine Funktionalität, aber klare UI.
Status: ⬜

Integrationsübersicht – Entwickle eine Seite, die angebundene Dienste (ERV, Firmenbuch, eBanking, Payment) als Liste mit Statusschaltern zeigt. Aktionen wie „Verbinden“ oder „Trennen“ sind Stub‑Buttons.
Status: ⬜

Datenexport – Erstelle ein Modul, mit dem Daten (z. B. Aktenliste oder Zeitaufzeichnungen) als CSV heruntergeladen werden können. Der Nutzer wählt im Dropdown, welche Daten exportiert werden sollen.
Status: ⬜

Mandantenportal Dashboard – Baue eine eigene Startseite für Mandanten, die nach Login eine Liste ihrer laufenden Akten, Nachrichten und hochladbaren Dokumente enthält. Achte auf einfache Sprache und klare Navigation.
Status: ⬜

PWA‑Support – Implementiere eine manifest.json und einen Service Worker, um das Demo offlinefähig zu machen. Zeige einen Install‑Button in der Navigationsleiste und erkläre in einem Dialog, wie Nutzer die App zum Startbildschirm hinzufügen können.
Status: ⬜

Responsive Navigation – Gestalte eine Navigation, die sich auf mobilen Geräten in ein Hamburger‑Menü verwandelt und auf dem Desktop als Seitenleiste erscheint. Nutze ARIA‑Attribute für die Zugänglichkeit.
Status: ⬜

Analytics Dashboard – Füge ein Dashboard hinzu, das mittels Diagrammen (z. B. Chart.js oder recharts) Statistikwerte wie erfasste Stunden, Rechnungsvolumen und offene Fristen anzeigt. Nutze fiktive Daten und achte auf Farbkontraste und Legenden.
Status: ⬜

AI‑Assistent Panel – Integriere eine Seitenleiste oder ein Chatfenster, in dem ein RAG‑Assistent einfache Fragen beantworten kann. Implementiere einen Stub, der vordefinierte Antworten ausgibt. Die UI soll an moderne Chat‑Interfaces angelehnt sein (z. B. Blasen, Input‑Feld mit Senden‑Button).
Status: ⬜

Rechteprüfung für Assistenten – Entwickle in der KI‑Stub‑Funktion eine einfache Rechteprüfung: Überprüfe die Rolle des aktuellen Nutzers, bevor Dokumentinhalte zurückgegeben werden. Wenn die Rolle keinen Zugriff hat, gib einen Hinweis aus.
Status: ⬜

Diese Aufgabenliste pflegen – Halte diese TODO.md stets aktuell: Wenn Aufgaben erledigt sind, markiere sie; wenn neue Aufgaben hinzukommen oder sich Anforderungen ändern, füge diese hinzu.
Status: ⬜

Dark‑Mode‑Umschalter – Implementiere einen Toggle zum Umschalten zwischen Hell‑ und Dunkelmodus. Die Einstellung soll gespeichert werden (LocalStorage) und alle Seiten/Module entsprechend ändern. Da der Dark‑Mode keine wesentliche Kernfunktion darstellt, wird er ganz am Ende dieser Liste umgesetzt.
Status: ⬜
