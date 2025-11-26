# ToDo – Mandats-Wizard Daten im zentralen Store nutzbar machen

Die neuen Akten aus dem Mandats-Wizard landen bereits im zentralen Store (`persistMandateToStore` legt Client + Case an und setzt den aktiven Kontext). Damit die Akten in allen geforderten Modulen erscheinen, müssen folgende Stellen auf den Store gehoben bzw. mit ihm synchronisiert werden.

- [ ] **Leistungsübersicht (assets/js/performance-overview.js)**
  - Aktuell liest die Seite Zeitbuchungen aus `localStorage` (`verilex:time-entries`) und nutzt eine eingebettete JSON-Liste als Akten/Client-Stammdaten. Dadurch tauchen neue Akten und TimeEntries aus dem Store nicht auf.
  - Umbau: `verilexStore.getAll('TimeEntry')` als Quelle verwenden, Case/Client-Metadaten aus `verilexStore.getAll('Case'|'Client')` ableiten und die Filter/Export-Logik daran anpassen. Auf `storeReady`/`storeChanged` abonnieren, damit nach Mandatsanlage automatisch aktualisiert wird.

- [ ] **Fristen-Board (assets/js/deadline-board.js)**
  - Das Board arbeitet ausschließlich mit dem Inline-JSON (`#deadline-data`). Fristen aus neuen Akten (Case.deadlines, ComplianceItem, Appointment vom Wizard) fehlen dadurch.
  - Umbau: Fristen und Termine aus dem Store aggregieren (`Case.deadlines`, `ComplianceItem`, `Appointment`) und in die Status-Buckets mappen. Events vom Store abonnieren, damit neue Deadlines/Termine sofort erscheinen.

- [ ] **E-Mail-Inbox (assets/js/email-integration.js)**
  - Mails werden einmalig aus dem Inline-Seed in den Store gespiegelt, die Case-Zuordnung basiert aber auf `caseId` und nicht auf Aktenzeichen. Neue Akten ohne passende `caseId` in den Seed-Daten tauchen daher nicht als zuordenbare Akten auf.
  - Anpassung: Bei der Normalisierung zusätzlich nach `caseNumber` gegen die Store-Cases matchen und eine Zuordnung herstellen. Optional ein Filter/Dummy-Mail-Builder, der den aktuell aktiven Fall (`verilexStore.getActiveCase()`) nutzt, damit frisch angelegte Akten sofort im Posteingang als Bezug wählbar sind.

- [ ] **Regression-Check für bereits angebundene Module**
  - **Zeiterfassung** (assets/js/time-tracking.js), **Terminkalender** (assets/js/calendar.js), **Team-Auslastung** (assets/js/team-capacity.js), **Risiko-Monitor** (assets/js/risk-monitor.js), **Aktenhistorie** (assets/js/case-detail.js), **Rechnungs-Wizard** (assets/js/invoice-wizard.js) und **Offene Posten** (assets/js/open-items.js) lesen schon aus dem Store. Beim Umbau oben sicherstellen, dass ihre Store-Events unverändert bleiben (z. B. `storeChanged` auf `Case`/`TimeEntry`), damit neue Akten aus dem Wizard weiterhin sofort erscheinen.
