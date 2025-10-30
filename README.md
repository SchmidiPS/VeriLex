# VeriLex
Kanzleisoftware für Anwälte und Mitarbeiter

🏛️ VeriLex – SaaS-Plattform für österreichische Anwaltskanzleien

VeriLex ist ein webbasiertes SaaS-Demoprojekt zur digitalen Abbildung juristischer Workflows in österreichischen Kanzleien. Ziel ist die Entwicklung einer modularen, rollenbasierten Plattform, die Anwaltskanzleien, Sekretariate, Buchhaltungen und Kanzleimanager:innen bei der täglichen Arbeit unterstützt – von der Mandatsanlage bis zur Abrechnung.

🎯 Zielsetzung

Der Prototyp dient als funktionales Mockup und technisches Proof-of-Concept, um folgende Ziele zu demonstrieren:

Prozessorientierte Benutzerführung: Jeder juristische Ablauf wird als geführter, mehrstufiger Prozess („Wizard“) umgesetzt.

Rollenbasiertes Arbeiten: Benutzer:innen sehen nur jene Funktionen, die ihrer Rolle entsprechen (z. B. Anwalt, Buchhaltung, Sekretariat).

Automatisierte Unterstützung: Ein integrierter Assistent (Mock-RAG) schlägt Eingaben, Defaults und nächste Schritte vor.

Demo-Aktenverwaltung: Akten können angezeigt, durchsucht und geöffnet werden (Mock-Daten).

Erweiterbarkeit: Architektur ist vorbereitet für spätere Integration von KI-Modulen, ERV-Schnittstellen und revisionssicherem Dokumentenmanagement.

💡 Warum diese Entwicklung?

Österreichische Kanzleien arbeiten derzeit mit einer Vielzahl getrennter Systeme für Mandatsverwaltung, Zeiterfassung, Fakturierung und Dokumentation.
Ziel dieses Projekts ist es, diese Prozesse in einer einheitlichen, intuitiven Plattform zu vereinen und durch intelligente Automatisierung zu vereinfachen.

VeriLex soll langfristig:

Medienbrüche zwischen Anwalt, Sekretariat und Buchhaltung vermeiden,

repetitive Arbeitsschritte automatisieren,

Compliance-Anforderungen (KYC, Datenschutz, Fristen) technisch absichern,

und ein modernes, mandantenorientiertes User-Erlebnis bieten.

⚙️ Technischer Überblick

Frontend: React + TailwindCSS

UI-Konzept: Single-Page-App mit Wizard-Struktur und Modal-Overlays

Rollenmodell: Anwalt, Sekretariat, Kanzleimanager, Buchhaltung

Persistenz: LocalStorage (Demo)

Assistent: Clientseitiger KI-Mock (RAG-ähnlich mit Wissensbasis)

Architekturprinzip: Modularität, Erweiterbarkeit, Barrierefreiheit, Datenvalidierung

Optional geplante Erweiterungen:

Anbindung an ERV (Elektronischer Rechtsverkehr)

Integration einer Mandatsdatenbank / DMS

Authentifizierung & Rechteverwaltung

Automatisierte Rechnungslegung & Controlling-Dashboard

KI-gestützte Schriftsatzanalyse

📋 Funktionsübersicht (aktuell)
Bereich	Beschreibung
🧑‍⚖️ Anwalt	Mandate anlegen, Klagen einbringen, Fristen verwalten
🧾 Buchhaltung	Rechnungen erstellen, offene Posten prüfen, Zahlungsziele verwalten
🧑‍💼 Sekretariat	Gerichtstermine koordinieren, Einladungen versenden
🗂️ Kanzleimanager	Vorlagen & Textbausteine pflegen
🤖 Hilfe-Bot (Mock)	Rollenbewusster Demo-Chat mit RAG-ähnlicher Logik
📁 Akten-Viewer (Demo)	Anzeige und Navigation durch Beispielakten & Dokumente
🧩 Assistent	Schlug automatisch Defaults und Vorschläge vor (per Schrittlogik)
🧱 Anforderungen & Designrichtlinien

Benutzerfreundlichkeit:
Fokus auf einfache Bedienung, klare Struktur, verständliche Texte.

Responsives Layout:
Die Anwendung nutzt 90 % der Bildschirmbreite, dynamisches Grid für Karten und Schritte.

Erweiterbare Architektur:
Jeder Prozess („Story“) besteht aus beliebig vielen, konfigurierbaren Schritten mit definierten Feldern.

Datensicherheit (geplant):
Zugriff über Authentifizierungssystem (OAuth2 oder OpenID Connect), verschlüsselte Speicherung, Logging.

Juristische Kompatibilität (Zukunft):
Strukturierte Eingaben nach österreichischen Normen (ERV, ECLI, Datenschutz, Gebührenordnung).

🧭 Weiterführende Entwicklungsschritte
Phase	Ziel
1. UX-Optimierung	Finalisierung des responsiven Layouts, Dark Mode, vereinheitlichte Navigation
2. Prozess-Engine	Backend-Anbindung, persistente Prozessmodelle, Rechteverwaltung
3. RAG-Integration	Einbindung echter Wissensbasis (Gesetze, Schriftsatzvorlagen, FAQs)
4. Datenbank & Auth	Multiuser-Support mit PostgreSQL + JWT-Auth
5. API & DMS-Integration	Dokumentenimport, automatisierte Schriftsatzverwaltung
6. Go-to-Market Demo	Public Demo für Kanzleien & Juristenverbände
🧩 Lizenz & Mitwirkung

Dieses Projekt dient ausschließlich Forschungs-, Lehr- und Demonstrationszwecken.
Beiträge, Forks oder Erweiterungsvorschläge sind ausdrücklich willkommen.
