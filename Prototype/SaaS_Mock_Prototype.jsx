import React, { useMemo, useState, useEffect } from "react";

// SaaS Mock UI for an Austrian law-firm platform ("KanzleiPilot")
// TailwindCSS only, single-file demo. Role-based stories, multi-step wizard,
// assistant for defaults/autofill, simple validations, demo Akten-Viewer, Hilfe-Bot.

// --- Mock domain data -------------------------------------------------------
const ROLES = [
  { id: "anwalt", label: "Anwältin/Anwalt" },
  { id: "sekretariat", label: "Sekretariat" },
  { id: "kanzleimanager", label: "Kanzleimanager:in" },
  { id: "buchhaltung", label: "Buchhaltung" },
];

const USER_STORIES = {
  anwalt: [
    {
      id: "mandat",
      title: "Neues Mandat anlegen",
      description:
        "Erfasst Mandant:in, Gegner:in, Streitwert, Aktcode, Zuständiges Gericht & KYC.",
      steps: [
        {
          id: "basis",
          title: "Basisdaten",
          fields: [
            { name: "mandantName", label: "Mandant:in", type: "text", required: true },
            { name: "gegnerName", label: "Gegner:in", type: "text" },
            { name: "streitwert", label: "Streitwert (€)", type: "number" },
            { name: "aktenzeichen", label: "Aktenzeichen (intern)", type: "text" },
          ],
        },
        {
          id: "gericht",
          title: "Gericht & Zuständigkeit",
          fields: [
            {
              name: "gericht",
              label: "Gericht",
              type: "select",
              options: [
                "Bezirksgericht", "Landesgericht", "Oberlandesgericht", "OGH",
              ],
            },
            { name: "bundesland", label: "Bundesland", type: "select", options: [
              "Burgenland","Kärnten","Niederösterreich","Oberösterreich","Salzburg","Steiermark","Tirol","Vorarlberg","Wien"
            ]},
            { name: "erv", label: "ERV-Teilnehmernummer", type: "text" },
          ],
        },
        {
          id: "kyc",
          title: "KYC & Compliance",
          fields: [
            { name: "ausweis", label: "Ausweis verifiziert", type: "checkbox" },
            { name: "pep", label: "PEP-Screening unauffällig", type: "checkbox" },
            { name: "geldwaesche", label: "Geldwäscheprüfung durchgeführt", type: "checkbox" },
          ],
        },
        { id: "review", title: "Zusammenfassung", fields: [] },
      ],
    },
    {
      id: "klage",
      title: "Klage einbringen (ERV)",
      description:
        "Generiert Schriftsatz, lädt Beilagen hoch, prüft Fristen & übermittelt via ERV (Mock).",
      steps: [
        {
          id: "aktenbezug",
          title: "Aktenbezug",
          fields: [
            { name: "aktcode", label: "Aktcode", type: "text", required: true },
            { name: "klagetyp", label: "Klagetyp", type: "select", options: ["Zahlung", "Unterlassung", "Feststellung"] },
          ],
        },
        {
          id: "fristen",
          title: "Fristen",
          fields: [
            { name: "fristtyp", label: "Fristtyp", type: "select", options: ["Einbringungsfrist", "Verbesserungsfrist", "Berufungsfrist"] },
            { name: "fristEnde", label: "Fristende", type: "date" },
            { name: "warnung", label: "Reminder setzen", type: "checkbox" },
          ],
        },
        {
          id: "dokument",
          title: "Schriftsatz",
          fields: [
            { name: "vorlage", label: "Vorlage", type: "select", options: ["Standard-Klage", "Einstweilige Verfügung", "Mahnantrag"] },
            { name: "beilagen", label: "Beilagen (Anzahl)", type: "number" },
          ],
        },
        { id: "review", title: "Prüfen & Senden", fields: [] },
      ],
    },
    {
      id: "zeiten",
      title: "Leistung erfassen",
      description: "Zeit/Leistung für Honorar (RATG/AHK) dokumentieren.",
      steps: [
        {
          id: "eintrag",
          title: "Eintrag",
          fields: [
            { name: "dauer", label: "Dauer (min)", type: "number", required: true },
            { name: "beschreibung", label: "Beschreibung", type: "textarea" },
            { name: "honorarArt", label: "Honorarart", type: "select", options: ["AHK-Pauschale", "RATG", "Stundensatz"] },
          ],
        },
        { id: "review", title: "Bestätigen", fields: [] },
      ],
    },
  ],
  sekretariat: [
    {
      id: "termin",
      title: "Gerichtstermin koordinieren",
      description: "Abstimmung mit Gericht & Mandant:in, Einladungen, Räume & Protokoll.",
      steps: [
        { id: "daten", title: "Termindaten", fields: [
          { name: "datum", label: "Datum", type: "date" },
          { name: "uhrzeit", label: "Uhrzeit", type: "time" },
          { name: "raum", label: "Besprechungsraum", type: "text" },
        ]},
        { id: "einladungen", title: "Einladungen", fields: [
          { name: "teilnehmer", label: "Teilnehmende (Komma-getrennt)", type: "text" },
          { name: "videocall", label: "Videocall-Link erstellen", type: "checkbox" },
        ]},
        { id: "review", title: "Zusammenfassung", fields: [] },
      ],
    },
  ],
  kanzleimanager: [
    {
      id: "vorlagen",
      title: "Vorlagen verwalten",
      description: "Pflege von Textbausteinen & Schriftsatz-Vorlagen.",
      steps: [
        { id: "liste", title: "Vorlagenliste", fields: [
          { name: "suche", label: "Suchen", type: "text" },
        ]},
        { id: "bearb", title: "Bearbeiten", fields: [
          { name: "vorlagenName", label: "Name", type: "text" },
          { name: "inhalt", label: "Inhalt", type: "textarea" },
        ]},
        { id: "review", title: "Übernehmen", fields: [] },
      ],
    },
  ],
  buchhaltung: [
    {
      id: "rechnung",
      title: "Rechnung erstellen",
      description: "Leistungen bündeln, Steuersatz & Zahlungsziel setzen, PDF generieren.",
      steps: [
        { id: "auswahl", title: "Leistungsauswahl", fields: [
          { name: "akt", label: "Aktcode", type: "text" },
          { name: "positionen", label: "Positionen (Anzahl)", type: "number" },
        ]},
        { id: "konditionen", title: "Konditionen", fields: [
          { name: "steuersatz", label: "USt.", type: "select", options: ["0%", "10%", "20%"] },
          { name: "zahlungsziel", label: "Zahlungsziel (Tage)", type: "number" },
        ]},
        { id: "review", title: "Vorschau & PDF", fields: [] },
      ],
    },
  ],
};

// --- Mini Wissensbasis (Fake RAG) -----------------------------------------
const KB = {
  anwalt: [
    { q: "ERV Paket", a: "Ein ERV‑Paket enthält Metadaten, Datei(en) im zulässigen Format und die Aktenreferenz. Im Mock wird nur die Checkliste simuliert.", tags: ["erv","einreichung","klage"] },
    { q: "Zuständigkeit", a: "BG bis €15.000 Streitwert, darüber LG (vereinfachter Demo‑Daumenwert).", tags: ["gericht","zuständigkeit","streitwert"] },
    { q: "Fristen", a: "Interne Frist +21 Tage, gerichtliche Frist +28 Tage – Mock‑Defaults, editierbar im Schritt 'Fristen'.", tags: ["frist","fristverlängerung"] },
  ],
  buchhaltung: [
    { q: "USt", a: "Unterstützt 0%, 10%, 20% – im Mock frei wählbar. Später: Mandatsbezogene Steuerlogik.", tags: ["steuer","rechnung"] },
    { q: "Zahlungsziel", a: "Standard 14 Tage, optional 30 Tage. Offene Posten werden in der Übersicht hervorgehoben (Demo).", tags: ["offene posten","zahlung"] },
  ],
  sekretariat: [
    { q: "Termin koordinieren", a: "Datum/Uhrzeit festlegen, Raum buchen, Einladungen versenden, optional Videocall. Alles Schritte im Wizard.", tags: ["termin","einladung","videocall"] },
  ],
  kanzleimanager: [
    { q: "Vorlagenpflege", a: "Vorlagen sind bearbeitbar und versionierbar (Demo). Später mit Rechteverwaltung.", tags: ["vorlagen","bausteine"] },
  ],
  generic: [
    { q: "Suche", a: "Du kannst nach Stichwörtern fragen (ERV, Frist, USt). Der Bot durchsucht die rollenbezogene Wissensbasis.", tags: ["hilfe","faq"] },
  ],
};

// --- Demo-Akten (anzeigen/öffnen im Mock) ----------------------------------
const DEMO_CASES = [
  {
    id: "2025-TI-00123",
    mandant: "Max Mustermann",
    gegner: "ACME GmbH",
    gericht: "LG Innsbruck",
    status: "aktiv",
    frist: "2025-11-15",
    betrag: 12000,
    docs: [
      { name: "Klageentwurf.pdf" },
      { name: "Beilage_A1_Kaufvertrag.pdf" },
      { name: "Kostenrisiko_Hinweis.txt" },
    ],
  },
  {
    id: "2025-W-00456",
    mandant: "Anna Beispiel",
    gegner: "Mieter XY",
    gericht: "BG Wien",
    status: "wartend",
    frist: "2025-12-02",
    betrag: 3400,
    docs: [
      { name: "Mahnantrag.pdf" },
      { name: "Zustellnachweis.pdf" },
    ],
  },
];

// --- Helpers ----------------------------------------------------------------
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function Field({ field, value, onChange }) {
  const base = "w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500";
  switch (field.type) {
    case "text":
      return (
        <input className={base} value={value || ""} onChange={(e)=>onChange(e.target.value)} placeholder={field.placeholder || ""} />
      );
    case "number":
      return (
        <input type="number" className={base} value={value ?? ""} onChange={(e)=>onChange(e.target.value === "" ? "" : Number(e.target.value))} />
      );
    case "select":
      return (
        <select className={base} value={value || ""} onChange={(e)=>onChange(e.target.value)}>
          <option value="" disabled>Bitte wählen…</option>
          {field.options?.map((o)=> <option key={o} value={o}>{o}</option>)}
        </select>
      );
    case "checkbox":
      return (
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={!!value} onChange={(e)=>onChange(e.target.checked)} />
          <span>{field.help || ""}</span>
        </label>
      );
    case "textarea":
      return (
        <textarea rows={5} className={base} value={value || ""} onChange={(e)=>onChange(e.target.value)} />
      );
    case "date":
      return (
        <input type="date" className={base} value={value || ""} onChange={(e)=>onChange(e.target.value)} />
      );
    case "time":
      return (
        <input type="time" className={base} value={value || ""} onChange={(e)=>onChange(e.target.value)} />
      );
    default:
      return <div className="text-red-600">Unbekanntes Feld</div>;
  }
}

// Simple heuristic assistant rules for defaults and suggestions
function useAssistant(role, storyId, stepId, form) {
  const suggestions = [];
  const defaults = {};

  if (storyId === "klage" && stepId === "fristen") {
    if (!form.fristtyp) defaults.fristtyp = "Einbringungsfrist";
    if (!form.warnung) defaults.warnung = true;
  }

  if (storyId === "mandat" && stepId === "gericht") {
    if (!form.bundesland) defaults.bundesland = "Tirol"; // Mock default
    suggestions.push({
      title: "Gericht vorschlagen",
      text: "Basierend auf Bundesland: Vorschlag 'Landesgericht' als Zuständigkeit.",
      apply: { gericht: form.gericht || "Landesgericht" },
    });
  }

  if (storyId === "zeiten" && stepId === "eintrag") {
    if (!form.honorarArt) defaults.honorarArt = "Stundensatz";
    suggestions.push({
      title: "30-Minuten-Blockung",
      text: "Runde Zeiten automatisch auf 30 Minuten.",
      apply: form.dauer ? { dauer: Math.ceil(form.dauer / 30) * 30 } : {},
    });
  }

  if (storyId === "rechnung" && stepId === "konditionen") {
    if (!form.steuersatz) defaults.steuersatz = "20%";
    if (!form.zahlungsziel) defaults.zahlungsziel = 14;
  }

  return { suggestions, defaults };
}

// --- Main component ---------------------------------------------------------
export default function App() {
  const [role, setRole] = useState(ROLES[0].id);
  const stories = USER_STORIES[role] || [];
  const [selectedStory, setSelectedStory] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [autoApply, setAutoApply] = useState(true);
  const [form, setForm] = useState({});
  // Demo-Account: Rollen im Profil konfigurierbar
  const [profileRoles, setProfileRoles] = useState({
    anwalt: true,
    sekretariat: false,
    kanzleimanager: false,
    buchhaltung: false,
  });
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState("");
  const [showCases, setShowCases] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Compute current story/step
  const current = useMemo(() => {
    const story = stories.find((s) => s.id === selectedStory);
    if (!story) return null;
    return { story, step: story.steps[stepIndex] };
  }, [stories, selectedStory, stepIndex]);

  // Assistant suggestions & defaults
  const { suggestions, defaults } = useAssistant(
    role,
    current?.story?.id,
    current?.step?.id,
    form
  );

  // Auto-apply defaults when entering a step
  useEffect(() => {
    if (!current || !autoApply) return;
    if (Object.keys(defaults).length === 0) return;
    setForm((f) => ({ ...defaults, ...f }));
  }, [current?.step?.id, autoApply]);

  function handleStart(storyId) {
    setSelectedStory(storyId);
    setStepIndex(0);
    setForm({});
  }

  // Persistenz: profileRoles & role in localStorage speichern/laden
  useEffect(() => {
    try {
      const savedRoles = localStorage.getItem("profileRoles");
      if (savedRoles) setProfileRoles(JSON.parse(savedRoles));
      const savedRole = localStorage.getItem("role");
      if (savedRole && ROLES.some((r) => r.id === savedRole)) setRole(savedRole);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("profileRoles", JSON.stringify(profileRoles)); } catch {}
  }, [profileRoles]);
  useEffect(() => {
    try { localStorage.setItem("role", role); } catch {}
  }, [role]);

  // Auto-Umschalten: wird aktuelle Rolle deaktiviert, zur nächsten aktiven springen
  useEffect(() => {
    if (!profileRoles[role]) {
      const firstActive = ROLES.find((r) => profileRoles[r.id]);
      if (firstActive) { setRole(firstActive.id); reset(); }
    }
  }, [profileRoles]);

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function canContinue() {
    if (!current) return false;
    const fields = current.step.fields || [];
    for (const fld of fields) {
      if (fld.required && (form[fld.name] === undefined || form[fld.name] === "")) {
        return false;
      }
    }
    return true;
  }

  function next() {
    if (!current) return;
    if (stepIndex < current.story.steps.length - 1) setStepIndex(stepIndex + 1);
  }
  function prev() {
    if (!current) return;
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }
  function reset() {
    setSelectedStory(null);
    setStepIndex(0);
    setForm({});
  }

  // Renderers ---------------------------------------------------------------
  function Header() {
    const steps = current?.story?.steps || [];
    const pct = steps.length ? Math.round(((stepIndex + 1) / steps.length) * 100) : 0;
    return (
      <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-800 to-blue-600 text-white border-b border-blue-700">
        <div className="mx-auto max-w-[90%] px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-2xl bg-blue-600" />
            <div>
              <div className="text-sm text-white/80">KanzleiPilot · Demo</div>
              <div className="font-semibold">{selectedStory ? current?.story.title : "User Stories & Workflows"}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCases(true)}
              className="px-3 py-2 rounded-xl border bg-white text-gray-900 hover:bg-gray-50"
              title="Demo-Akten anzeigen"
            >Akten</button>
            <div className="hidden sm:block w-64">
              <div className="text-xs text-white/80 mb-1">Fortschritt {pct}%</div>
              <div className="h-2 w-full rounded bg-white/30">
                <div className="h-2 rounded bg-white" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <button
              onClick={() => setShowProfile(true)}
              className="px-3 py-2 rounded-xl border bg-white text-gray-900 hover:bg-gray-50"
            >Profil / Einstellungen</button>
          </div>
        </div>
      </div>
    );
  }

  function RolePicker() {
    return (
      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => {
          const enabled = !!profileRoles[r.id];
          return (
            <button
              key={r.id}
              onClick={() => {
                if (!enabled) return;
                setRole(r.id);
                reset();
              }}
              disabled={!enabled}
              className={classNames(
                "px-3 py-2 rounded-xl border text-sm truncate",
                !enabled ? "opacity-40 cursor-not-allowed" : role === r.id ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
              )}
              title={!enabled ? "In Profil deaktiviert" : r.label}
            >
              {r.label}
            </button>
          );
        })}
      </div>
    );
  }

  function StoryGrid() {
    if (!stories.length) return <div>Für diese Rolle sind keine Stories hinterlegt.</div>;
    const roleEnabled = !!profileRoles[role];
    const q = search.trim().toLowerCase();
    const filtered = !q
      ? stories
      : stories.filter((s) =>
          (s.title || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q)
        );

    if (filtered.length === 0) return <div className="mt-4 text-sm text-gray-600">Keine Stories zur Suche gefunden.</div>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
        {filtered.map((s) => (
          <div key={s.id} className={classNames("relative rounded-2xl border p-4 shadow-sm transition", !roleEnabled && "opacity-40")}>            
            {!roleEnabled && (
              <div className="absolute inset-0 rounded-2xl bg-white/60 backdrop-blur-sm grid place-items-center text-sm">In Profil deaktiviert</div>
            )}
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="font-semibold truncate" title={s.title}>{s.title}</div>
                <div className="text-sm text-gray-600 mt-1 line-clamp-3">{s.description}</div>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">{s.steps.length} Schritte</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex -space-x-2">
                {s.steps.map((st) => (
                  <div key={st.id} title={st.title} className="h-2 w-6 rounded bg-gray-200" />
                ))}
              </div>
              <button onClick={() => roleEnabled && handleStart(s.id)} disabled={!roleEnabled} className={classNames("px-3 py-1.5 rounded-xl text-sm", roleEnabled ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed")}>Start</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function StepSidebar() {
    if (!current) return null;
    return (
      <div className="hidden lg:block lg:w-64">
        <div className="rounded-2xl border p-3">
          <div className="font-semibold mb-2">Schritte</div>
          <ol className="space-y-2">
            {current.story.steps.map((st, i) => (
              <li key={st.id} className="flex items-center gap-2">
                <div className={classNames(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs",
                  i < stepIndex ? "bg-green-500 text-white" : i === stepIndex ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                )}>{i+1}</div>
                <button onClick={() => setStepIndex(i)} className={classNames("text-sm", i===stepIndex?"font-semibold":"text-gray-700 hover:text-black")}>{st.title}</button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  function AssistantPanel() {
    if (!current) return null;
    return (
      <div className="lg:w-80">
        <div className="rounded-2xl border p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Assistent</div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={autoApply} onChange={(e)=>setAutoApply(e.target.checked)} />
              Auto-Vorauswahl
            </label>
          </div>
          {Object.keys(defaults).length > 0 && (
            <div className="mt-3 text-xs text-gray-600">
              Voreinstellungen vorgeschlagen: {Object.keys(defaults).join(", ")}
            </div>
          )}
          <div className="mt-3 space-y-2">
            {suggestions.map((s, idx) => (
              <div key={idx} className="rounded-xl border p-2">
                <div className="text-sm font-medium">{s.title}</div>
                <div className="text-xs text-gray-600">{s.text}</div>
                <button
                  className="mt-2 text-xs px-2 py-1 rounded-lg bg-blue-600 text-white"
                  onClick={() => setForm((f)=>({ ...f, ...s.apply }))}
                >Vorschlag übernehmen</button>
              </div>
            ))}
            {suggestions.length === 0 && (
              <div className="text-sm text-gray-500">Keine spezifischen Vorschläge für diesen Schritt.</div>
            )}
          </div>
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700">
            <div className="font-semibold mb-1">Nächste Schritte</div>
            <ul className="list-disc ml-4 space-y-1">
              <li>Pflichtfelder ausfüllen (mit * markiert).</li>
              <li>Bei Unsicherheit: Schrittübersicht links nutzen.</li>
              <li>Zum Abschluss im Review prüfen & bestätigen.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  function StepForm() {
    if (!current) return null;
    const { step } = current;

    if (step.id === "review") {
      return (
        <div className="rounded-2xl border p-4">
          <div className="font-semibold mb-2">Zusammenfassung</div>
          <pre className="text-xs bg-gray-50 p-3 rounded-xl overflow-auto">{JSON.stringify(form, null, 2)}</pre>
          <div className="mt-4 flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl bg-green-600 text-white" onClick={reset}>Abschließen (Mock)</button>
            <button className="px-3 py-2 rounded-xl border" onClick={prev}>Zurück</button>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Schritt {stepIndex + 1} von {current.story.steps.length}</div>
            <div className="font-semibold text-lg">{step.title}</div>
          </div>
          <div className="text-xs text-gray-500">Story: {current.story.title}</div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4">
          {step.fields.map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                {f.label} {f.required && <span className="text-red-600">*</span>}
              </label>
              <Field field={f} value={form[f.name]} onChange={(v)=>updateField(f.name, v)} />
              {f.help && <div className="text-xs text-gray-500">{f.help}</div>}
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <button className="px-3 py-2 rounded-xl border" onClick={prev} disabled={stepIndex===0}>Zurück</button>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl border" onClick={reset}>Abbrechen</button>
            <button
              className={classNames("px-3 py-2 rounded-xl text-white", canContinue()?"bg-blue-600":"bg-gray-400 cursor-not-allowed")}
              onClick={next}
              disabled={!canContinue()}
            >Weiter</button>
          </div>
        </div>
      </div>
    );
  }

  function ProfileModal() {
    if (!showProfile) return null;
    const toggle = (key) => setProfileRoles((p) => ({ ...p, [key]: !p[key] }));
    return (
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm grid place-items-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white border shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Profil & Rollen</div>
            <button className="px-2 py-1 rounded-lg border" onClick={() => setShowProfile(false)}>Schließen</button>
          </div>
          <div className="text-sm text-gray-600 mb-3">Aktiviere, welche Rollen dein Demo-Account besitzt. Deaktivierte Rollen werden in der UI ausgegraut.</div>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r)=> (
              <label key={r.id} className="flex items-center gap-2 rounded-xl border p-3">
                <input type="checkbox" className="h-4 w-4" checked={!!profileRoles[r.id]} onChange={()=>toggle(r.id)} />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 text-xs text-gray-600">Hinweis: Die Auswahl wirkt sich auf die Rollenwahl und die Startbarkeit der zugehörigen User-Stories aus.</div>
        </div>
      </div>
    );
  }

  function CasesModal() {
    if (!showCases) return null;
    const selected = DEMO_CASES.find((c) => c.id === selectedCaseId) || DEMO_CASES[0];
    return (
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm grid place-items-center p-4">
        <div className="w-full max-w-3xl rounded-2xl bg-white border shadow-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold">Demo‑Akten</div>
            <button className="px-2 py-1 rounded-lg border" onClick={() => setShowCases(false)}>Schließen</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1 rounded-xl border p-2">
              <div className="text-xs text-gray-600 mb-2">Akte wählen</div>
              <ul className="space-y-1">
                {DEMO_CASES.map((c) => (
                  <li key={c.id}>
                    <button
                      className={"w-full text-left px-2 py-1 rounded-lg " + ((selected?.id === c.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50")}
                      onClick={() => setSelectedCaseId(c.id)}
                    >
                      <div className="font-medium text-sm">{c.id}</div>
                      <div className="text-xs text-gray-600 truncate">{c.mandant} vs. {c.gegner}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2 rounded-xl border p-3">
              {selected && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{selected.id} · {selected.gericht}</div>
                      <div className="text-sm text-gray-600">Mandant: {selected.mandant} · Gegner: {selected.gegner}</div>
                    </div>
                    <div className="text-xs text-gray-600">Status: {selected.status} · Frist: {selected.frist} · Betrag: €{selected.betrag}</div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Dokumente</div>
                    <ul className="list-disc ml-5 text-sm">
                      {selected.docs.map((d, i) => (
                        <li key={i} className="flex items-center justify-between">
                          <span>{d.name}</span>
                          <button className="text-xs px-2 py-1 rounded-lg border hover:bg-gray-50" onClick={() => alert("Öffnen (Mock): " + d.name)}>Öffnen</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function HelpBot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
      { from: "bot", text: "Hallo! Ich bin der Demo‑Hilfe‑Bot. Frage mich etwas zu deiner Rolle oder zu einem Prozess." },
    ]);
    const [input, setInput] = useState("");

    function replyFor(prompt) {
      const p = prompt.toLowerCase();
      if (role === "anwalt") {
        if (p.includes("erv") || p.includes("einreichen")) return "Für die Klage‑Einreichung prüfe ich: Aktenzeichen, Zuständigkeit (BG/LG), Beilagenliste und generiere ein ERV‑Paket (Mock).";
        if (p.includes("frist")) return "Fristen: intern +21 Tage, gerichtlich +28 Tage sind Standard‑Defaults im Mock. Erinnerungen aktivierbar.";
        return "Als Anwalt siehst du: Mandate, Klage‑Assistent, Fristen. Frag nach ERV, Fristen oder Beilagen.";
      }
      if (role === "buchhaltung") {
        if (p.includes("offen") || p.includes("zahlung")) return "Buchhaltung: Übersicht Offene Posten, Zahlungsziel (14/30 Tage), USt 0/10/20% – alles im Demo konfigurierbar.";
        return "Als Buchhaltung kannst du Rechnungen generieren und Offene Posten prüfen (Mock).";
      }
      if (role === "sekretariat") {
        return "Sekretariat: Gerichtstermine koordinieren, Einladungen versenden, Videocall‑Links – im Wizard als Schritte umgesetzt.";
      }
      if (role === "kanzleimanager") {
        return "Kanzleimanager: Vorlagenverwaltung und (später) Benutzerrechte. Hier im Mock: JSON‑konfigurierbare Stories.";
      }
      return "Frage nach Rollen, Stories oder Fristen.";
    }

    function send() {
      const t = input.trim();
      if (!t) return;
      setMessages((m) => [...m, { from: "user", text: t }, { from: "bot", text: replyFor(t) }]);
      setInput("");
    }

    return (
      <>
        <button
          className="fixed bottom-6 right-6 z-40 rounded-full bg-blue-600 text-white px-4 py-3 shadow-lg hover:bg-blue-700"
          onClick={() => setOpen((o) => !o)}
          aria-label="Hilfe-Bot öffnen"
        >{open ? "×" : "Hilfe"}</button>
        {open && (
          <div className="fixed bottom-20 right-6 z-40 w-80 max-h-[70vh] rounded-2xl border bg-white shadow-xl flex flex-col">
            <div className="px-3 py-2 border-b text-sm font-semibold">Demo‑Hilfe‑Bot (Mock)</div>
            <div className="p-3 space-y-2 overflow-auto text-sm">
              {messages.map((m, i) => (
                <div key={i} className={m.from === "bot" ? "text-gray-800" : "text-blue-700 text-right"}>{m.text}</div>
              ))}
            </div>
            <div className="p-2 border-t flex gap-2">
              <input className="flex-1 rounded-lg border px-2 py-1 text-sm" value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Frage eingeben…"/>
              <button className="rounded-lg bg-blue-600 text-white px-3 text-sm" onClick={send}>Senden</button>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- DEV: minimal smoke tests (run once) ---------------------------------
  useEffect(() => {
    // Basic invariants
    console.assert(Array.isArray(ROLES) && ROLES.length >= 1, "ROLES missing");
    console.assert(USER_STORIES.anwalt?.length >= 1, "Stories for anwalt missing");
    // Field types known
    const knownTypes = new Set(["text","number","select","checkbox","textarea","date","time"]);
    const unknown = Object.values(USER_STORIES).flat().some(story => story.steps.some(step => step.fields?.some(f => !knownTypes.has(f.type))));
    console.assert(!unknown, "Unknown field type encountered");
  }, []);

  // --- Layout --------------------------------------------------------------
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900">
        <Header />
        <main className="mx-auto max-w-[90%] px-8 py-8">
          {/* Role & Story selection */}
          {!selectedStory && (
            <div>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold">Rollenbasierte User Stories</h1>
                  <p className="text-sm text-gray-600">Wähle die Rolle, starte einen Prozess. Jeder Prozess ist ein geführter, mehrstufiger Flow.</p>
                </div>
                <RolePicker />
              </div>

              {/* Suche/Filter */}
              <div className="mt-3 max-w-md">
                <input
                  type="text"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Stories filtern… (Titel, Beschreibung)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <StoryGrid />
            </div>
          )}

          {/* Wizard */}
          {selectedStory && (
            <div className="grid grid-cols-1 lg:grid-cols-[16rem_1fr_20rem] gap-4">
              <StepSidebar />
              <StepForm />
              <AssistantPanel />
            </div>
          )}
        </main>
        <footer className="mt-10 border-t">
          <div className="mx-auto max-w-[90%] px-8 py-6 text-xs text-gray-600 flex items-center justify-between">
            <div>© {new Date().getFullYear()} – Demo Mock • Nicht produktiv • AT-Kanzlei-Workflows</div>
            <div className="opacity-70">Prototyp · v0.1</div>
          </div>
        </footer>
      </div>

      {/* Portalled/overlay components outside main flow */}
      <ProfileModal />
      <CasesModal />
      <HelpBot />
    </>
  );
}
