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
      },
      {
        id: "cl-greentech",
        name: "GreenTech Holding",
        contactEmail: "office@greentech.example",
        phone: "+49 221 454545",
        organizationType: "Konzern",
        address: "Rheinufer 7, 50678 Köln",
        preferredBilling: "nach Stunden"
      },
      {
        id: "cl-petersen",
        name: "Erbengemeinschaft Petersen",
        contactEmail: "kontakt@petersen.example",
        phone: "+49 40 818181",
        organizationType: "Privat",
        address: "Am Fleet 5, 20457 Hamburg",
        preferredBilling: "Pauschale"
      },
      {
        id: "cl-futurelabs",
        name: "FutureLabs GmbH",
        contactEmail: "legal@futurelabs.example",
        phone: "+49 351 343434",
        organizationType: "Technologie",
        address: "Innovation Campus 1, 01069 Dresden",
        preferredBilling: "nach Stunden"
      },
      {
        id: "cl-schmidt",
        name: "Eva Schmidt",
        contactEmail: "eva.schmidt@example.com",
        phone: "+49 511 252525",
        organizationType: "Privat",
        address: "Lavesstraße 12, 30159 Hannover",
        preferredBilling: "nach Stunden"
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
      },
      {
        id: "ca-2047",
        caseNumber: "VX-2047",
        title: "Nachlassverwaltung Petersen",
        clientId: "cl-petersen",
        status: "in Bearbeitung",
        priority: "mittel",
        category: "Erbrecht",
        openedAt: "2025-08-21",
        closedAt: null,
        assignedUsers: ["u-partner"],
        deadlines: [
          { id: "dl-3", title: "Auseinandersetzungsplan finalisieren", date: "2025-11-22", risk: "mittel" }
        ]
      },
      {
        id: "ca-2048",
        caseNumber: "VX-2048",
        title: "Datenschutz-Audit FutureLabs",
        clientId: "cl-futurelabs",
        status: "in Bearbeitung",
        priority: "hoch",
        category: "Datenschutz",
        openedAt: "2025-09-02",
        closedAt: null,
        assignedUsers: ["u-associate"],
        deadlines: [
          { id: "dl-4", title: "Auditbericht abgeben", date: "2025-11-18", risk: "hoch" }
        ]
      },
      {
        id: "ca-2049",
        caseNumber: "VX-2049",
        title: "Arbeitsrechtliche Beratung Schmidt",
        clientId: "cl-schmidt",
        status: "wartet",
        priority: "mittel",
        category: "Arbeitsrecht",
        openedAt: "2025-10-10",
        closedAt: null,
        assignedUsers: ["u-associate"],
        deadlines: [
          { id: "dl-5", title: "Güteverhandlung vorbereiten", date: "2025-11-27", risk: "mittel" }
        ]
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
        uploadedAt: "2025-11-10T09:00:00Z",
        createdBy: "u-associate",
        uploadedBy: "Lukas Stern",
        mimeType: "application/pdf",
        size: 512000,
        tags: ["Entwurf", "Verhandlung"]
      },
      {
        id: "doc-02",
        caseId: "ca-2045",
        title: "Gutachten Produktsicherheit",
        type: "Beweis",
        status: "final",
        createdAt: "2025-11-12T14:00:00Z",
        uploadedAt: "2025-11-12T14:00:00Z",
        createdBy: "u-partner",
        uploadedBy: "Dr. Jana Keller",
        mimeType: "application/pdf",
        size: 245760,
        tags: ["Gutachten"]
      },
      {
        id: "doc-03",
        caseId: "ca-2045",
        title: "Klageentwurf.pdf",
        type: "Schriftsatz",
        status: "Entwurf – finale Prüfung läuft",
        createdAt: "2025-10-29T08:30:00Z",
        uploadedAt: "2025-10-29T08:30:00Z",
        createdBy: "u-partner",
        uploadedBy: "RAin Dr. Hannah Keller",
        mimeType: "application/pdf",
        size: 584312,
        tags: ["Klage", "Entwurf"],
        notes: "Vor Versand an Mandantin prüfen.",
        viewerUrl: "assets/mock/verilex-demo.pdf",
        permissions: {
          view: ["partner", "associate"],
          manage: ["partner"]
        }
      },
      {
        id: "doc-04",
        caseId: "ca-2046",
        title: "Beweisfoto_A1.jpg",
        type: "Beweis",
        status: "Freigegeben",
        createdAt: "2025-10-20T14:12:00Z",
        uploadedAt: "2025-10-20T14:12:00Z",
        createdBy: "u-associate",
        uploadedBy: "Syndikus RA Tim Berger",
        mimeType: "image/jpeg",
        size: 341233,
        tags: ["Beweis", "Bild"],
        notes: "Referenz für Abschnitt 4 des Schriftsatzes.",
        permissions: {
          view: ["partner", "associate", "assistant"],
          manage: ["partner", "associate"]
        }
      },
      {
        id: "doc-05",
        caseId: "ca-2046",
        title: "Vergleichsentwurf.docx",
        type: "Vertrag",
        status: "Feedback des Mandanten erforderlich",
        createdAt: "2025-10-05T09:04:00Z",
        uploadedAt: "2025-10-05T09:04:00Z",
        createdBy: "u-partner",
        uploadedBy: "RAin Dr. Hannah Keller",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 214560,
        tags: ["Vergleich", "ToDo"],
        notes: "Mandantenfeedback bis Ende KW45 einarbeiten.",
        permissions: {
          view: ["partner"],
          manage: ["partner"]
        }
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
      },
      {
        id: "te-5003",
        caseId: "ca-2047",
        userId: "u-partner",
        activity: "Nachlassgespräch mit Erben",
        startedAt: "2025-10-12T09:00:00Z",
        endedAt: "2025-10-12T10:30:00Z",
        durationMinutes: 90,
        notes: "Status und Verteilung abgestimmt",
        billableRate: 320,
        invoiceId: null
      },
      {
        id: "te-5004",
        caseId: "ca-2048",
        userId: "u-associate",
        activity: "Auditinterviews Technikteam",
        startedAt: "2025-11-05T13:00:00Z",
        endedAt: "2025-11-05T15:30:00Z",
        durationMinutes: 150,
        notes: "Offene Maßnahmen für TOMs gesammelt",
        billableRate: 190,
        invoiceId: null
      },
      {
        id: "te-5005",
        caseId: "ca-2049",
        userId: "u-associate",
        activity: "Arbeitsvertrag Nachprüfung",
        startedAt: "2025-10-28T08:15:00Z",
        endedAt: "2025-10-28T10:00:00Z",
        durationMinutes: 105,
        notes: "Klauseln vorbereitet",
        billableRate: 180,
        invoiceId: null
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
      },
      {
        id: "inv-302",
        caseId: "ca-2045",
        clientId: "cl-lexon",
        entryIds: ["te-5001"],
        issueDate: "2025-11-22",
        dueDate: "2025-12-15",
        status: "versendet",
        totalNet: 2150,
        taxRate: 0.19,
        currency: "EUR"
      },
      {
        id: "inv-303",
        caseId: "ca-2047",
        clientId: "cl-petersen",
        entryIds: ["te-5003"],
        issueDate: "2025-10-10",
        dueDate: "2025-10-30",
        status: "überfällig",
        totalNet: 2765,
        taxRate: 0.19,
        currency: "EUR",
        paidDate: null
      },
      {
        id: "inv-304",
        caseId: "ca-2048",
        clientId: "cl-futurelabs",
        entryIds: ["te-5004"],
        issueDate: "2025-11-08",
        dueDate: "2025-11-22",
        status: "bezahlt",
        totalNet: 1150,
        taxRate: 0.19,
        currency: "EUR",
        paidDate: "2025-11-15"
      },
      {
        id: "inv-305",
        caseId: "ca-2049",
        clientId: "cl-schmidt",
        entryIds: ["te-5005"],
        issueDate: "2025-11-12",
        dueDate: "2025-11-28",
        status: "versendet",
        totalNet: 850,
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
