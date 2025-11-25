// Central data model definition for VeriLex
// Provides schema metadata and sample dataset to support the unified store implementation.

(function (global) {
  const enums = {
    caseStatus: ["neu", "in Bearbeitung", "wartet", "abgeschlossen"],
    priority: ["hoch", "mittel", "niedrig"],
    documentStatus: ["entwurf", "final", "archiviert"],
    documentType: ["Schriftsatz", "Beweis", "Vertrag", "Notiz"],
    invoiceStatus: ["entwurf", "versendet", "bezahlt", "überfällig"],
    complianceStatus: ["offen", "in Prüfung", "erledigt"],
    riskLevel: ["niedrig", "mittel", "hoch"],
    appointmentType: ["Hearing", "Frist", "Mandantentermin", "Internal"]
  };

  const entities = {
    Case: {
      name: "Case",
      primaryKey: "id",
      description:
        "Repräsentiert ein Mandat bzw. eine Akte und bündelt alle relevanten Vorgänge.",
      fields: [
        { name: "id", type: "string", required: true, description: "UUID / Kurz-ID" },
        { name: "caseNumber", type: "string", required: true, description: "Aktenzeichen (unique)" },
        { name: "title", type: "string", required: true, description: "Bezeichnung des Falls" },
        { name: "clientId", type: "string", required: true, description: "Verweis auf Client" },
        { name: "status", type: "enum", enum: "caseStatus", required: true, description: "Bearbeitungsstand" },
        { name: "priority", type: "enum", enum: "priority", required: true, description: "Dringlichkeit" },
        { name: "category", type: "string", required: false, description: "Fachgebiet / Typ" },
        { name: "openedAt", type: "date", required: true, description: "Anlagedatum" },
        { name: "closedAt", type: "date", required: false, description: "Abschlussdatum" },
        {
          name: "assignedUsers",
          type: "string[]",
          required: false,
          description: "IDs der beteiligten Nutzer"
        },
        {
          name: "deadlines",
          type: "Deadline[]",
          required: false,
          description: "Fristen mit Titel, Datum, Risiko"
        }
      ],
      relationships: [
        { type: "belongsTo", target: "Client", via: "clientId" },
        { type: "hasMany", target: "Document", via: "caseId" },
        { type: "hasMany", target: "TimeEntry", via: "caseId" },
        { type: "hasMany", target: "Invoice", via: "caseId" },
        { type: "hasMany", target: "ComplianceItem", via: "caseId" },
        { type: "hasMany", target: "Appointment", via: "caseId" }
      ],
      indexes: [
        { name: "caseNumber", unique: true },
        { name: "clientId" },
        { name: "status" }
      ]
    },
    Client: {
      name: "Client",
      primaryKey: "id",
      description: "Mandant oder Organisation, für die Fälle geführt werden.",
      fields: [
        { name: "id", type: "string", required: true, description: "UUID / Kurz-ID" },
        { name: "name", type: "string", required: true, description: "Mandantenname" },
        { name: "contactEmail", type: "string", required: true, description: "Primäre E-Mail" },
        { name: "phone", type: "string", required: false, description: "Telefonnummer" },
        { name: "organizationType", type: "string", required: false, description: "z. B. Unternehmen, Privat" },
        { name: "address", type: "string", required: false, description: "Postanschrift" },
        { name: "preferredBilling", type: "string", required: false, description: "z. B. Pauschale, nach Stunden" }
      ],
      relationships: [{ type: "hasMany", target: "Case", via: "clientId" }]
    },
    User: {
      name: "User",
      primaryKey: "id",
      description: "Personen mit Rollen- und Berechtigungsbezug.",
      fields: [
        { name: "id", type: "string", required: true, description: "UUID / Kurz-ID" },
        { name: "name", type: "string", required: true, description: "Anzeigename" },
        { name: "role", type: "string", required: true, description: "Rolle, z. B. Partner" },
        { name: "email", type: "string", required: true, description: "Login-/Kontaktadresse" },
        { name: "billableRate", type: "number", required: false, description: "Stundensatz" },
        { name: "availability", type: "string", required: false, description: "Kapazitätshinweis" }
      ],
      relationships: [
        { type: "hasMany", target: "TimeEntry", via: "userId" },
        { type: "hasMany", target: "Document", via: "createdBy" }
      ]
    },
    Document: {
      name: "Document",
      primaryKey: "id",
      description: "Akte angehängte Dokumente mit Status und Typ.",
      fields: [
        { name: "id", type: "string", required: true, description: "UUID / Kurz-ID" },
        { name: "caseId", type: "string", required: true, description: "Verweis auf Case" },
        { name: "title", type: "string", required: true, description: "Dokumenttitel" },
        { name: "type", type: "enum", enum: "documentType", required: true, description: "Klassifikation" },
        { name: "status", type: "enum", enum: "documentStatus", required: true, description: "Bearbeitungsstand" },
        { name: "createdAt", type: "date", required: true, description: "Erstellzeit" },
        { name: "createdBy", type: "string", required: true, description: "User-ID des Verfassers" },
        { name: "tags", type: "string[]", required: false, description: "Schlagwörter" }
      ],
      relationships: [
        { type: "belongsTo", target: "Case", via: "caseId" },
        { type: "belongsTo", target: "User", via: "createdBy" }
      ]
    },
    TimeEntry: {
      name: "TimeEntry",
      primaryKey: "id",
      description: "Zeitbuchung für Abrechnung und Kapazitätsplanung.",
      fields: [
        { name: "id", type: "string", required: true, description: "UUID / Kurz-ID" },
        { name: "caseId", type: "string", required: true, description: "Verweis auf Case" },
        { name: "userId", type: "string", required: true, description: "Verweis auf User" },
        { name: "activity", type: "string", required: true, description: "Kurzbeschreibung" },
        { name: "startedAt", type: "date", required: true, description: "Startzeit" },
        { name: "endedAt", type: "date", required: true, description: "Endzeit" },
        { name: "durationMinutes", type: "number", required: true, description: "Dauer in Minuten" },
        { name: "notes", type: "string", required: false, description: "Interne Notiz" },
        { name: "billableRate", type: "number", required: false, description: "Stundensatz zum Buchungszeitpunkt" },
        { name: "invoiceId", type: "string", required: false, description: "Verknüpfte Rechnung" }
      ],
      relationships: [
        { type: "belongsTo", target: "Case", via: "caseId" },
        { type: "belongsTo", target: "User", via: "userId" },
        { type: "belongsTo", target: "Invoice", via: "invoiceId" }
      ],
      indexes: [{ name: "caseId" }, { name: "userId" }, { name: "invoiceId" }]
    },
    Invoice: {
      name: "Invoice",
      primaryKey: "id",
      description: "Abrechnungsdokument, aggregiert Zeitbuchungen.",
      fields: [
        { name: "id", type: "string", required: true, description: "UUID / Kurz-ID" },
        { name: "caseId", type: "string", required: true, description: "Verweis auf Case" },
        { name: "clientId", type: "string", required: true, description: "Verweis auf Client" },
        { name: "entryIds", type: "string[]", required: true, description: "Liste von TimeEntry-IDs" },
        { name: "issueDate", type: "date", required: true, description: "Rechnungsdatum" },
        { name: "dueDate", type: "date", required: true, description: "Fälligkeitsdatum" },
        { name: "status", type: "enum", enum: "invoiceStatus", required: true, description: "Bezahlstatus" },
        { name: "totalNet", type: "number", required: true, description: "Nettobetrag" },
        { name: "taxRate", type: "number", required: true, description: "MwSt.-Satz (z. B. 0.19)" },
        { name: "currency", type: "string", required: true, description: "ISO-Währung, z. B. EUR" }
      ],
      relationships: [
        { type: "belongsTo", target: "Case", via: "caseId" },
        { type: "belongsTo", target: "Client", via: "clientId" },
        { type: "hasMany", target: "TimeEntry", via: "invoiceId" }
      ],
      indexes: [{ name: "status" }, { name: "clientId" }]
    },
    ComplianceItem: {
      name: "ComplianceItem",
      primaryKey: "id",
      description: "Aufgabe mit Frist und Risikobewertung.",
      fields: [
        { name: "id", type: "string", required: true, description: "UUID / Kurz-ID" },
        { name: "caseId", type: "string", required: true, description: "Verweis auf Case" },
        { name: "title", type: "string", required: true, description: "Kurzbeschreibung" },
        { name: "deadline", type: "date", required: true, description: "Fälligkeitsdatum" },
        { name: "risk", type: "enum", enum: "riskLevel", required: true, description: "Risikostufe" },
        { name: "status", type: "enum", enum: "complianceStatus", required: true, description: "Bearbeitungsstand" },
        { name: "ownerId", type: "string", required: false, description: "Verantwortlicher User" },
        { name: "notes", type: "string", required: false, description: "Hinweise" }
      ],
      relationships: [
        { type: "belongsTo", target: "Case", via: "caseId" },
        { type: "belongsTo", target: "User", via: "ownerId" },
        { type: "creates", target: "Appointment", via: "relatedComplianceItemId" }
      ]
    },
    Appointment: {
      name: "Appointment",
      primaryKey: "id",
      description: "Kalendereintrag, ggf. abgeleitet aus Fristen.",
      fields: [
        { name: "id", type: "string", required: true, description: "UUID / Kurz-ID" },
        { name: "caseId", type: "string", required: true, description: "Verweis auf Case" },
        { name: "dateTime", type: "date", required: true, description: "Terminzeitpunkt" },
        { name: "type", type: "enum", enum: "appointmentType", required: true, description: "Kategorie" },
        { name: "description", type: "string", required: true, description: "Termininhalt" },
        { name: "participants", type: "string[]", required: false, description: "User-IDs" },
        { name: "location", type: "string", required: false, description: "Ort / Online-Link" },
        { name: "relatedComplianceItemId", type: "string", required: false, description: "Ableitung aus Compliance-Task" }
      ],
      relationships: [
        { type: "belongsTo", target: "Case", via: "caseId" },
        { type: "hasMany", target: "User", via: "participants" },
        { type: "dependsOn", target: "ComplianceItem", via: "relatedComplianceItemId" }
      ]
    }
  };

  const sampleData = {
    clients: [
      {
        id: "cl-lexon",
        name: "Lexon Industries GmbH",
        contactEmail: "legal@lexon.example",
        phone: "+49 30 111111",
        organizationType: "Unternehmen",
        address: "Leipziger Platz 1, 10117 Berlin",
        preferredBilling: "nach Stunden"
      },
      {
        id: "cl-hartmann",
        name: "Kanzlei Hartmann & Partner",
        contactEmail: "kontakt@hartmann.example",
        phone: "+49 89 222222",
        organizationType: "Rechtsabteilung",
        address: "Brienner Straße 20, 80333 München",
        preferredBilling: "Pauschale"
      }
    ],
    users: [
      {
        id: "u-partner",
        name: "Dr. Jana Keller",
        role: "Partner",
        email: "jana.keller@verilex.example",
        billableRate: 320,
        availability: "60% verfügbar"
      },
      {
        id: "u-associate",
        name: "Lukas Stern",
        role: "Associate",
        email: "lukas.stern@verilex.example",
        billableRate: 190,
        availability: "80% verfügbar"
      },
      {
        id: "u-accounting",
        name: "Mira Scholz",
        role: "Accounting",
        email: "mira.scholz@verilex.example",
        billableRate: null,
        availability: "100% verfügbar"
      }
    ],
    cases: [
      {
        id: "ca-2045",
        caseNumber: "VX-2045",
        title: "Produkthaftung – Lexon",
        clientId: "cl-lexon",
        status: "in Bearbeitung",
        priority: "hoch",
        category: "Produkthaftung",
        openedAt: "2025-10-02",
        closedAt: null,
        assignedUsers: ["u-partner", "u-associate"],
        deadlines: [
          { id: "dl-1", title: "Stellungnahme Gericht", date: "2025-11-30", risk: "hoch" },
          { id: "dl-2", title: "Beweismittel einreichen", date: "2025-12-07", risk: "mittel" }
        ]
      },
      {
        id: "ca-2046",
        caseNumber: "VX-2046",
        title: "Vertragsprüfung – Lieferanten",
        clientId: "cl-hartmann",
        status: "wartet",
        priority: "mittel",
        category: "Vertragsrecht",
        openedAt: "2025-09-15",
        closedAt: null,
        assignedUsers: ["u-associate"],
        deadlines: []
      }
    ],
    documents: [
      {
        id: "doc-01",
        caseId: "ca-2045",
        title: "Klageerwiderung Entwurf",
        type: "Schriftsatz",
        status: "entwurf",
        createdAt: "2025-11-10T09:00:00Z",
        createdBy: "u-associate",
        tags: ["Entwurf", "Verhandlung"]
      },
      {
        id: "doc-02",
        caseId: "ca-2045",
        title: "Gutachten Produktsicherheit",
        type: "Beweis",
        status: "final",
        createdAt: "2025-11-12T14:00:00Z",
        createdBy: "u-partner",
        tags: ["Gutachten"]
      }
    ],
    timeEntries: [
      {
        id: "te-5001",
        caseId: "ca-2045",
        userId: "u-associate",
        activity: "Aktenstudium & Notizen",
        startedAt: "2025-11-18T08:30:00Z",
        endedAt: "2025-11-18T10:00:00Z",
        durationMinutes: 90,
        notes: "Schadenanalyse und erste Argumente gesammelt",
        billableRate: 190,
        invoiceId: null
      },
      {
        id: "te-5002",
        caseId: "ca-2046",
        userId: "u-partner",
        activity: "Vertragsklauseln prüfen",
        startedAt: "2025-11-20T13:00:00Z",
        endedAt: "2025-11-20T14:45:00Z",
        durationMinutes: 105,
        notes: "Lieferantenschutzklauseln kommentiert",
        billableRate: 320,
        invoiceId: "inv-301"
      }
    ],
    invoices: [
      {
        id: "inv-301",
        caseId: "ca-2046",
        clientId: "cl-hartmann",
        entryIds: ["te-5002"],
        issueDate: "2025-11-21",
        dueDate: "2025-12-05",
        status: "versendet",
        totalNet: 560,
        taxRate: 0.19,
        currency: "EUR"
      }
    ],
    complianceItems: [
      {
        id: "co-21",
        caseId: "ca-2045",
        title: "Produktsicherheits-Checkliste",
        deadline: "2025-11-29",
        risk: "hoch",
        status: "in Prüfung",
        ownerId: "u-partner",
        notes: "Abgleich mit EU-Richtlinien notwendig"
      }
    ],
    appointments: [
      {
        id: "ap-11",
        caseId: "ca-2045",
        dateTime: "2025-12-01T09:30:00Z",
        type: "Hearing",
        description: "Gütetermin vor LG Berlin",
        participants: ["u-partner", "u-associate"],
        location: "LG Berlin, Saal 3",
        relatedComplianceItemId: "co-21"
      }
    ]
  };

  const dataModel = {
    entities,
    enums,
    sampleData,
    globalRules: {
      idFormat: "präfix-basierte Kurz-IDs (z. B. ca-2045) für die Demo",
      timestampFormat: "ISO-8601 (YYYY-MM-DD oder YYYY-MM-DDTHH:mm:ssZ)",
      currency: "EUR als Standardwährung",
      defaultTaxRate: 0.19
    }
  };

  function cloneSampleData() {
    return JSON.parse(JSON.stringify(sampleData));
  }

  global.verilexDataModel = dataModel;
  global.cloneVerilexSampleData = cloneSampleData;
})(typeof window !== "undefined" ? window : globalThis);
