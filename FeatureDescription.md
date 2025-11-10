# VeriLex – Featurebeschreibung

Dieses Dokument liefert eine Übersicht über die in VeriLex implementierten Module. Für jedes Modul werden Zweck, Eingaben, Ausgaben sowie bestehende oder geplante Schnittstellen zu anderen Komponenten beschrieben.  Die Beschreibungen dienen als Grundlage, um einheitliche Datenmodelle und modulübergreifende Verknüpfungen zu definieren.

## Aktenliste & Akten-Detail

Dieses Modul bildet das Herzstück der Anwendung. Es listet alle Mandate (Akten) auf, erlaubt Filterung und Sortierung, und zeigt Detailinformationen inklusive Zeitverlauf (Timeline) und zugehörigen Dokumenten.

**Eingaben:** JSON-Struktur aller Fälle, inklusive Metadaten (Titel, Mandant, Status, Priorität, Fristen).  
**Ausgaben:** Darstellung in Kartenform, Zugriff auf `case-detail.html`.  
**Schnittstellen:**  
- Liest Daten aus dem zentralen `cases`-Store.  
- Übergibt Case-ID an Zeiterfassung, Dokumenten-Management und Rechnungsmodul.  
- Kann Events empfangen (z. B. „neuer Zeiteintrag“ → Timeline aktualisieren).

## Mandats-Wizard

Ermöglicht die Anlage neuer Mandate über ein mehrstufiges Formular.  
Am Ende erzeugt der Wizard ein neues `case`-Objekt im zentralen Datenmodell.

**Eingaben:** Mandantendaten, Gegner, Kategorie, Beschreibung.  
**Ausgaben:** Neues Case-Objekt.  
**Schnittstellen:**  
- Schreibt in `cases`-Store.  
- Übergibt `caseId` an Aktenliste und Kalender.  
- Optionaler Hook zur Risiko-Bewertung beim Anlegen.

## Dokumenten-Management

Verwaltet hochgeladene oder generierte Dokumente.  
Beinhaltet Upload-Funktion, PDF-Vorschau, Statusverwaltung (neu, in Prüfung, freigegeben) und rollenbasierte Zugriffsrechte.

**Eingaben:** Dateien, Kategorien, optional Fallreferenz.  
**Ausgaben:** Eintrag in `documents`-Liste mit Metadaten.  
**Schnittstellen:**  
- Referenziert Akten via `caseId`.  
- Synchronisiert mit Mandantenportal (freigegebene Dokumente).  
- Ereignisgesteuert: Änderungen erzeugen Timeline-Events.

## Zeiterfassung

Ermöglicht Start/Stopp-Tracking von Arbeitszeiten pro Akte.  
Speichert lokale Einträge oder sendet sie an den zentralen Store.

**Eingaben:** Case-Referenz, Aktivität, Dauer, Notiz.  
**Ausgaben:** Neuer `timeEntry`.  
**Schnittstellen:**  
- Verknüpft mit Leistungsübersicht, Rechnungs-Wizard und Dashboard.  
- Liefert Daten an Team-Auslastung.  
- Kann Filter nach Datum und Nutzer auslösen.

## Leistungsübersicht

Aggregiert Zeitdaten aus der Zeiterfassung und gruppiert sie nach Akte, Mandant und Zeitraum.  
Dient als Grundlage für Abrechnung und Performanceanalyse.

**Eingaben:** `timeEntries`-Liste.  
**Ausgaben:** Summen, Diagramme.  
**Schnittstellen:**  
- Liest Daten aus `timeEntries`.  
- Exportiert Summen an Rechnungsmodul.  
- Optional: KPI-Export für Dashboard.

## Rechnungs-Wizard

Berechnet Honorare auf Basis von Zeiteinträgen und erstellt Rechnungen.  
Mehrstufiger Prozess: Auswahl Akte → Zeiten → Vorschau → Abschluss.

**Eingaben:** Zeit- und Kostendaten.  
**Ausgaben:** Rechnungseintrag (`invoice`).  
**Schnittstellen:**  
- Schreibt in `invoices`.  
- Synchronisiert Status mit Offene-Posten-Board.  
- Benachrichtigt Mandantenportal bei Fertigstellung.

## Offene-Posten-Übersicht

Stellt Rechnungen mit Zahlungsstatus dar.  
Kann nach Fälligkeit und Mandant filtern.

**Eingaben:** Rechnungsdaten.  
**Ausgaben:** Tabellenansicht + Summen.  
**Schnittstellen:**  
- Liest `invoices`.  
- Kann Status aktualisieren (z. B. bezahlt).  
- Rückkopplung ans Dashboard (Gesamtumsatz).

## Compliance-Checkliste

Pflegt Aufgabenlisten zu rechtlichen oder organisatorischen Verpflichtungen.  
Ziel: Sicherstellung von Datenschutz, Fristen, Wiedervorlagen.

**Eingaben:** Aufgabenname, Kategorie, Frist, Risiko.  
**Ausgaben:** Erledigungsstatus.  
**Schnittstellen:**  
- Aufgaben können Cases zugeordnet werden.  
- Meldet Fristüberschreitungen an Dashboard + Risiko-Monitor.

## Risiko-Monitor

Bewertet Fälle nach Eintrittswahrscheinlichkeit und Auswirkung.  
Zeigt Heatmap-Matrix und Liste kritischer Fälle.

**Eingaben:** Case-Attribute, Compliance-Status, Fristen.  
**Ausgaben:** Risikoscores + Farben.  
**Schnittstellen:**  
- Liest Cases + Compliance-Items.  
- Benachrichtigt Dashboard und Team.

## Team-Auslastung

Zeigt Arbeitsbelastung pro Mitarbeiter.  
Verknüpft mit Zeiterfassung und Kalender.

**Eingaben:** Zeit-Einträge, Rollen, Sollstunden.  
**Ausgaben:** Balkendiagramm, Kapazitätswarnung.  
**Schnittstellen:**  
- Liest aus `timeEntries`.  
- Verknüpft mit Kalender (Urlaube, Termine).  
- Liefert Kennzahlen ans Dashboard.

## Kalender

Globale Übersicht über Fristen, Termine und Meetings.  
Enthält Filter nach Akte, Benutzer und Kategorie.

**Eingaben:** Terminobjekte.  
**Ausgaben:** Monats- und Wochenansicht.  
**Schnittstellen:**  
- Liest Fristen aus Cases.  
- Nimmt neue Einträge aus Akten oder Compliance entgegen.  
- Verknüpft mit Benachrichtigungssystem.

## Mandantenportal

Frontend für Mandanten mit eingeschränkten Rechten.  
Erlaubt Ansicht freigegebener Dokumente, Nachrichten, Aufgaben.

**Eingaben:** Mandanten-ID, Filter, Dokumente.  
**Ausgaben:** Aktivitätenfeed, Uploads.  
**Schnittstellen:**  
- Liest freigegebene Dokumente.  
- Erhält Rechnungen und Statusupdates.  
- Sendet Uploads an Dokumenten-Modul.

## Dashboard

Zentrale Startseite mit Kennzahlen (aktive Akten, offene Rechnungen, Stunden).  
Soll künftig dynamisch aus dem Datenmodell generieren.

**Eingaben:** Aggregierte Daten.  
**Ausgaben:** Diagramme, Metriken.  
**Schnittstellen:**  
- Liest Cases, Invoices, TimeEntries.  
- Verlinkt zu Detailmodulen.  
- Empfängt Updates über Pub/Sub.

## Workflow-Designer

Tool zur visuellen Prozessgestaltung.  
Dient aktuell der Demonstration von Abläufen (Drag-and-Drop).

**Eingaben:** Workflow-Schritte.  
**Ausgaben:** JSON-Definition.  
**Schnittstellen:**  
- Kann Workflow-Vorlagen speichern.  
- Optionale Integration zur Automatisierung (Tasks generieren).

## AI-Assistent

Kontextuelles Hilfesystem mit vorgefertigten Antworten.  
Zukünftig Anbindung an echte KI-API geplant.

**Eingaben:** Nutzerfragen, aktuelle Seite.  
**Ausgaben:** Textantwort, Handlungsempfehlungen.  
**Schnittstellen:**  
- Zugriff auf Metadaten der aktiven Akte.  
- Schnittstelle zum Dokumenten- und Wissensmodul.

## Account-Management & Rollen

Verwaltet Benutzer, Rollen und Rechte.  
Rollen beeinflussen Sichtbarkeit von Modulen und Funktionen.

**Eingaben:** Benutzerprofil, Rollenmatrix.  
**Ausgaben:** Zugriffskonfiguration.  
**Schnittstellen:**  
- Gilt systemweit für alle Module.  
- Steuert Navigation und Filter.  
- Zentrale Authentifizierung (Login-Modul).

## Login-System

Einfacher Auth-Prototyp mit Testaccounts.  
Muss mit Account-Management verschmolzen werden.

**Eingaben:** Benutzername, Passwort.  
**Ausgaben:** JWT-Session oder LocalStorage-Token.  
**Schnittstellen:**  
- Prüft Rolle beim Login.  
- Übergibt Session an `app.js`.

## Globale Navigation

Sidebar und Header-Navigation, generiert aus Rollen-Daten.  
Sorgt für konsistentes Benutzererlebnis.

**Eingaben:** Rollenrechte.  
**Ausgaben:** Navigationsstruktur.  
**Schnittstellen:**  
- Liest aus Rollen-Modul.  
- Aktualisiert UI bei Rollenwechsel.  
- Einheitliche Links zu allen Modulen.

## Notification-System (geplant)

Event-basiertes System für Erinnerungen und Systemmeldungen.  
Soll Fristen, Rechnungen und Uploads verfolgen.

**Eingaben:** Ereignisse.  
**Ausgaben:** Toasts, Mails, Hinweise.  
**Schnittstellen:**  
- Empfängt Signale aus allen Modulen.  
- Wird Dashboard und Kalender informieren.

## Datenmodell (zentraler Store)

Zukünftige gemeinsame Basis für alle Module.

**Entitäten:**  
- Case  
- Document  
- TimeEntry  
- Invoice  
- ComplianceItem  
- Workflow  
- User  

**Schnittstellen:**  
- CRUD-API (lokal oder Backend).  
- Ereignisse für Reaktivität.  
- Einheitliche Identifikatoren (`caseId`, `userId`).

## Benachrichtigungssystem (zukünftig)

Verwaltet E-Mail- und Systembenachrichtigungen.  
Sorgt für User-Feedback bei Änderungen oder neuen Einträgen.

## Erweiterbarkeit

Jedes Modul ist unabhängig, nutzt aber denselben Store und dieselben Events.  
Ziel: modulare, aber integrierte Architektur mit klaren Schnittstellen.
