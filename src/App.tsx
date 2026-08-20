import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { applyGeneratedQuote, calculateQuote, formatMoney, parseMoney } from "./calc";
import { deleteQuote, loadQuotes, loadSettings, saveQuote, saveSettings } from "./storage";
import cpsLogo from "./assets/cps-logo.png";
import {
  FREQUENCY_OPTIONS,
  PEST_OPTIONS,
  emptyQuote,
  type PestType,
  type QuoteInput,
  type Settings,
  type View,
} from "./types";

const APP_VERSION_LABEL = `Version ${__APP_VERSION__}`;

function makeQuote(settings: Settings): QuoteInput {
  return applyGeneratedQuote(
    {
      ...emptyQuote(),
      stationRate: settings.stationHardwareCost,
      serviceFeeLocked: false,
    },
    settings,
  );
}

function NumberInput({
  value,
  onCommit,
  step,
}: {
  value: number;
  onCommit: (n: number) => void;
  step?: number | string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const money = step === 0.01 || step === "0.01";

  function commit(raw: string) {
    if (raw.trim() === "") {
      onCommit(0);
      return;
    }
    if (money) {
      onCommit(parseMoney(raw));
      return;
    }
    const n = Number(raw);
    onCommit(Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
  }

  return (
    <input
      type="number"
      min={0}
      step={step}
      value={draft ?? (Number.isFinite(value) ? String(value) : "")}
      onFocus={() => setDraft(Number.isFinite(value) ? String(value) : "")}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw.trim() === "" || raw === "-" || raw === "." || raw === "-.") return;
        if (money && (raw.endsWith(".") || raw.endsWith(".0"))) return;
        commit(raw);
      }}
      onBlur={() => {
        commit(draft ?? "");
        setDraft(null);
      }}
    />
  );
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [quotes, setQuotes] = useState<QuoteInput[]>(loadQuotes);
  const [draft, setDraft] = useState<QuoteInput>(() => makeQuote(loadSettings()));
  const result = useMemo(() => calculateQuote(draft, settings), [draft, settings]);

  function openNew() {
    setDraft(makeQuote(settings));
    setView("quote");
  }

  function openExisting(quote: QuoteInput) {
    setDraft(quote);
    setView("quote");
  }

  function persistQuote() {
    if (!draft.premiseName.trim() || !draft.address.trim()) {
      window.alert("Add a premise name and site address before saving.");
      return;
    }
    if (!draft.pests.length) {
      window.alert("Tick at least one pest.");
      return;
    }
    if (draft.frequency === "other" && !draft.customFrequency.trim()) {
      window.alert("Type your Other frequency so it appears in VISITS.");
      return;
    }
    if (draft.timeMist && !draft.timeMistLocation.trim()) {
      window.alert("Enter a location for the Time Mist Unit.");
      return;
    }
    if (draft.fcu && !draft.fcuLocation.trim()) {
      window.alert("Enter a location for the FCU (Fly control unit).");
      return;
    }
    const live = calculateQuote({ ...draft, serviceFeeLocked: false }, settings);
    saveQuote({
      ...draft,
      serviceFee: live.serviceFee,
      serviceFeeLocked: true,
    });
    setDraft((current) => ({
      ...current,
      serviceFee: live.serviceFee,
      serviceFeeLocked: true,
    }));
    setQuotes(loadQuotes());
  }

  function removeQuote(id: string) {
    deleteQuote(id);
    setQuotes(loadQuotes());
    if (draft.id === id) setDraft(makeQuote(settings));
  }

  function updateSettings(next: Settings) {
    setSettings(next);
    saveSettings(next);
  }

  return (
    <>
      <header className="app-header no-print">
        <div className="brand-lockup">
          <img
            className="cps-logo cps-logo-nav"
            src={cpsLogo}
            alt="Competitive Pest Services"
          />
        </div>
        <nav className="nav">
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>
            Quotes
          </button>
          <button className={view === "quote" ? "active" : ""} onClick={openNew}>
            New quote
          </button>
          <button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>
            Rates and times
          </button>
        </nav>
      </header>

      <main className="wrap">
        {view === "home" && (
          <Home
            quotes={quotes}
            settings={settings}
            onNew={openNew}
            onOpen={openExisting}
            onDelete={removeQuote}
          />
        )}
        {view === "quote" && (
          <QuoteEditor
            draft={draft}
            setDraft={setDraft}
            result={result}
            settings={settings}
            onSave={persistQuote}
          />
        )}
        {view === "settings" && (
          <SettingsPanel settings={settings} onChange={updateSettings} />
        )}
      </main>
      <footer className="app-footer no-print">
        Created by Competitive Pest Services · © 2026 Competitive Pest Services · {APP_VERSION_LABEL}
      </footer>
    </>
  );
}

function Home({
  quotes,
  settings,
  onNew,
  onOpen,
  onDelete,
}: {
  quotes: QuoteInput[];
  settings: Settings;
  onNew: () => void;
  onOpen: (quote: QuoteInput) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <section className="hero">
        <div>
          <h2>Your proposals</h2>
          <p>Tick the treatments, pests, and visits per year, then print the proposal.</p>
          <div className="actions">
            <button className="btn primary" onClick={onNew}>
              Start a quote
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Saved quotes</h2>
        {quotes.length === 0 ? (
          <p className="empty">No quotes yet.</p>
        ) : (
          <div className="quote-list">
            {quotes.map((quote) => {
              const calc = calculateQuote(quote, settings);
              return (
                <article className="card quote-item" key={quote.id}>
                  <div>
                    <h3>{quote.premiseName.trim() || quote.address.trim() || "—"}</h3>
                    <p>
                      {calc.treatmentLines[0] || quote.address}
                      {calc.visitsLabel
                        ? ` · ${/^\d+$/.test(calc.visitsLabel) ? `${calc.visitsLabel} visits` : calc.visitsLabel}`
                        : ""}
                    </p>
                  </div>
                  <div className="actions">
                    <button className="btn" onClick={() => onOpen(quote)}>
                      Open
                    </button>
                    <button className="btn danger" onClick={() => onDelete(quote.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function QuoteEditor({
  draft,
  setDraft,
  result,
  settings,
  onSave,
}: {
  draft: QuoteInput;
  setDraft: Dispatch<SetStateAction<QuoteInput>>;
  result: ReturnType<typeof calculateQuote>;
  settings: Settings;
  onSave: () => void;
}) {
  function patch(partial: Partial<QuoteInput>) {
    setDraft((current) => {
      const next = { ...current, ...partial };
      if ("pests" in partial) {
        return applyGeneratedQuote({ ...next, serviceFeeLocked: false }, settings);
      }
      return next;
    });
  }

  function togglePest(pest: PestType) {
    const pests = draft.pests.includes(pest)
      ? draft.pests.filter((item) => item !== pest)
      : [...draft.pests, pest];
    patch({ pests });
  }

  function updateBait(partial: Partial<QuoteInput>) {
    setDraft((current) =>
      applyGeneratedQuote({ ...current, ...partial, timesCustom: false, serviceFeeLocked: false }, settings),
    );
  }

  function setTimes(partial: { installMinutes?: number; serviceMinutes?: number }) {
    setDraft((current) => ({
      ...current,
      installMinutes: Math.max(0, Math.round(partial.installMinutes ?? current.installMinutes) || 0),
      serviceMinutes: Math.max(0, Math.round(partial.serviceMinutes ?? current.serviceMinutes) || 0),
      timesCustom: true,
      serviceFeeLocked: false,
    }));
  }

  const premiseName = draft.premiseName.trim();
  const siteAddress = draft.address.trim();
  const extraTreatment = draft.treatmentNotes.trim();
  const treatmentDisplay = [...result.treatmentLines, ...(extraTreatment ? [extraTreatment] : [])];

  return (
    <div className="quote-page">
      <section className="card no-print form-card">
        <h2>Job details</h2>
        <div className="fields">
          <div className="row-2">
            <label>
              Premise name
              <input
                value={draft.premiseName}
                onChange={(e) => patch({ premiseName: e.target.value })}
              />
            </label>
            <label>
              Contact name
              <input
                value={draft.customerName}
                onChange={(e) => patch({ customerName: e.target.value })}
              />
            </label>
          </div>
          <label>
            Site address
            <input
              value={draft.address}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </label>
          <div>
            <h3 className="field-heading">Bait stations</h3>
            <p className="field-help">
              Tick External and/or Internal, then type how many and Location(s).
            </p>
            <div className="tick-stack">
              <div className={draft.externalBait ? "mist-block on" : "mist-block"}>
                <div className="mist-head">
                  <label className={draft.externalBait ? "big-tick on" : "big-tick"}>
                    <input
                      type="checkbox"
                      checked={draft.externalBait}
                      onChange={(e) =>
                        updateBait({
                          externalBait: e.target.checked,
                          externalStations:
                            e.target.checked && draft.externalStations <= 0
                              ? 10
                              : draft.externalStations,
                        })
                      }
                    />
                    External
                  </label>
                  {draft.externalBait ? (
                    <label className="bait-count">
                      How many
                      <NumberInput
                        value={draft.externalStations}
                        onCommit={(n) => updateBait({ externalStations: n })}
                      />
                    </label>
                  ) : null}
                </div>
                {draft.externalBait ? (
                  <label className="bait-place mist-place">
                    Location(s)
                    <input
                      value={draft.externalPlace ?? ""}
                      onChange={(e) => patch({ externalPlace: e.target.value })}
                      placeholder="perimeter"
                    />
                  </label>
                ) : null}
              </div>
              <div className={draft.internalBait ? "mist-block on" : "mist-block"}>
                <div className="mist-head">
                  <label className={draft.internalBait ? "big-tick on" : "big-tick"}>
                    <input
                      type="checkbox"
                      checked={draft.internalBait}
                      onChange={(e) =>
                        updateBait({
                          internalBait: e.target.checked,
                          internalStations:
                            e.target.checked && draft.internalStations <= 0
                              ? 5
                              : draft.internalStations,
                        })
                      }
                    />
                    Internal
                  </label>
                  {draft.internalBait ? (
                    <label className="bait-count">
                      How many
                      <NumberInput
                        value={draft.internalStations}
                        onCommit={(n) => updateBait({ internalStations: n })}
                      />
                    </label>
                  ) : null}
                </div>
                {draft.internalBait ? (
                  <label className="bait-place mist-place">
                    Location(s)
                    <input
                      value={draft.internalPlace ?? ""}
                      onChange={(e) => patch({ internalPlace: e.target.value })}
                      placeholder="basement"
                    />
                  </label>
                ) : null}
              </div>
              <label className={draft.installationFee ? "big-tick on" : "big-tick"}>
                <input
                  type="checkbox"
                  checked={draft.installationFee}
                  onChange={(e) =>
                    patch({ installationFee: e.target.checked, serviceFeeLocked: false })
                  }
                />
                Installation fee
              </label>
            </div>
            <p className="field-help">
              When ticked, bait station $ goes on INSTALL FEE only, not TOTAL COST PER SERVICE.
            </p>
          </div>
          <div>
            <h3 className="field-heading">Treatments</h3>
            <p className="field-help">
              Tick residual spray, spider spot treat, Time Mist Unit, and FCU as needed. Each tick
              adds a line on the proposal.
            </p>
            <div className="tick-stack">
              <label className={draft.internalResidual ? "big-tick on" : "big-tick"}>
                <input
                  type="checkbox"
                  checked={draft.internalResidual}
                  onChange={(e) =>
                    setDraft((current) =>
                      applyGeneratedQuote(
                        {
                          ...current,
                          internalResidual: e.target.checked,
                          residualCustom: true,
                          timesCustom: false,
                          serviceFeeLocked: false,
                        },
                        settings,
                      ),
                    )
                  }
                />
                Residual barrier spray to internal
              </label>
              <label className={draft.externalResidual ? "big-tick on" : "big-tick"}>
                <input
                  type="checkbox"
                  checked={draft.externalResidual}
                  onChange={(e) =>
                    setDraft((current) =>
                      applyGeneratedQuote(
                        {
                          ...current,
                          externalResidual: e.target.checked,
                          residualCustom: true,
                          timesCustom: false,
                          serviceFeeLocked: false,
                        },
                        settings,
                      ),
                    )
                  }
                />
                Residual barrier spray to external
              </label>
              <label className={draft.spiderSpotInternal ? "big-tick on" : "big-tick"}>
                <input
                  type="checkbox"
                  checked={draft.spiderSpotInternal}
                  onChange={(e) => patch({ spiderSpotInternal: e.target.checked })}
                />
                Spot treat for spiders to internal as required
              </label>
              <label className={draft.spiderSpotExternal ? "big-tick on" : "big-tick"}>
                <input
                  type="checkbox"
                  checked={draft.spiderSpotExternal}
                  onChange={(e) => patch({ spiderSpotExternal: e.target.checked })}
                />
                Spot treat for spiders to external as required
              </label>
              <div className={draft.timeMist ? "mist-block on" : "mist-block"}>
                <div className="mist-head">
                  <label className={draft.timeMist ? "big-tick on" : "big-tick"}>
                    <input
                      type="checkbox"
                      checked={draft.timeMist}
                      onChange={(e) =>
                        patch({
                          timeMist: e.target.checked,
                          timeMistCount:
                            e.target.checked && draft.timeMistCount <= 0 ? 1 : draft.timeMistCount,
                        })
                      }
                    />
                    Time Mist Unit
                  </label>
                  {draft.timeMist ? (
                    <label className="bait-count">
                      How many
                      <NumberInput
                        value={draft.timeMistCount ?? 1}
                        onCommit={(n) => patch({ timeMistCount: n })}
                      />
                    </label>
                  ) : null}
                </div>
                {draft.timeMist ? (
                  <label className="bait-place mist-place">
                    Location(s)
                    <input
                      value={draft.timeMistLocation ?? ""}
                      onChange={(e) => patch({ timeMistLocation: e.target.value })}
                      placeholder="kitchen"
                    />
                  </label>
                ) : null}
              </div>
              <div className={draft.fcu ? "mist-block on" : "mist-block"}>
                <div className="mist-head">
                  <label className={draft.fcu ? "big-tick on" : "big-tick"}>
                    <input
                      type="checkbox"
                      checked={draft.fcu}
                      onChange={(e) =>
                        patch({
                          fcu: e.target.checked,
                          fcuCount: e.target.checked && draft.fcuCount <= 0 ? 1 : draft.fcuCount,
                        })
                      }
                    />
                    FCU (Fly control unit)
                  </label>
                  {draft.fcu ? (
                    <label className="bait-count">
                      How many
                      <NumberInput
                        value={draft.fcuCount ?? 1}
                        onCommit={(n) => patch({ fcuCount: n })}
                      />
                    </label>
                  ) : null}
                </div>
                {draft.fcu ? (
                  <label className="bait-place mist-place">
                    Location(s)
                    <input
                      value={draft.fcuLocation ?? ""}
                      onChange={(e) => patch({ fcuLocation: e.target.value })}
                      placeholder="kitchen"
                    />
                  </label>
                ) : null}
              </div>
            </div>
          </div>
          <label>
            Extra treatment notes
            <textarea
              value={draft.treatmentNotes}
              onChange={(e) => patch({ treatmentNotes: e.target.value })}
              placeholder="Optional extra wording for the treatment area"
            />
          </label>
          <div>
            <h3 className="field-heading">Pests covered</h3>
            <div className="checklist">
              {PEST_OPTIONS.map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={draft.pests.includes(option.value)}
                    onChange={() => togglePest(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Service frequency</span>
            <div className="chips" style={{ marginTop: 8 }}>
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={draft.frequency === option.value ? "chip on" : "chip"}
                  onClick={() => patch({ frequency: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {draft.frequency === "other" ? (
              <div className="other-freq">
                <label>
                  Type visits per year or a label
                  <input
                    autoFocus
                    value={draft.customFrequency}
                    onChange={(e) => patch({ customFrequency: e.target.value })}
                    placeholder="e.g. 8, 13, 8vpa, or as required"
                  />
                </label>
                <p>
                  This exact text appears in VISITS. If it includes a number, that number is used
                  for the total annual cost.
                </p>
              </div>
            ) : (
              <p className="empty" style={{ padding: "8px 0 0" }}>
                VISITS will show {result.visitsLabel}. Choose Other to type your own value.
              </p>
            )}
          </div>
          <div className="row-2">
            <label>
              Install time (min)
              <NumberInput
                value={draft.installMinutes}
                onCommit={(n) => setTimes({ installMinutes: n })}
              />
            </label>
            <label>
              Service time (min)
              <NumberInput
                value={draft.serviceMinutes}
                onCommit={(n) => setTimes({ serviceMinutes: n })}
              />
            </label>
          </div>
          <p className="empty" style={{ padding: 0 }}>
            {draft.timesCustom
              ? `Install time is set manually. Changing bait station ticks or counts will calculate it again (${settings.minutesPerStationInstall} min per station).`
              : `Install time (calculated): ${result.stations} station${result.stations === 1 ? "" : "s"} × ${settings.minutesPerStationInstall} min = ${result.installMinutes} min.`}
          </p>
        </div>
      </section>

      <section className="proposal">
        <div className="proposal-letterhead">
          <img
            className="cps-logo cps-logo-proposal"
            src={cpsLogo}
            alt="Competitive Pest Services"
          />
          <h2>Your Proposal</h2>
        </div>
        <p className="table-swipe-hint no-print">Swipe sideways to see the full proposal.</p>
        <div className="proposal-scroll">
          <table className="proposal-table">
            <thead>
              <tr>
                <th>PREMISE</th>
                <th>TREATMENT AREA</th>
                <th>PESTS</th>
                <th className="visits-head">VISITS</th>
                <th>INSTALL FEE</th>
                <th>
                  TOTAL COST
                  <br />
                  PER SERVICE
                </th>
                <th>
                  TOTAL ANNUAL
                  <br />
                  COST
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {premiseName ? (
                    <strong>
                      {premiseName}
                      {siteAddress ? " —" : ""}
                    </strong>
                  ) : null}
                  {siteAddress ? (
                    <>
                      {premiseName ? <br /> : null}
                      {premiseName ? siteAddress : <strong>{siteAddress}</strong>}
                    </>
                  ) : null}
                  {!premiseName && !siteAddress ? "—" : null}
                </td>
                <td className="treatment-cell">
                  {treatmentDisplay.length === 0 ? (
                    "—"
                  ) : (
                    <div className="treatment-typed">
                      {treatmentDisplay.map((line, index) => (
                        <div key={`${line}-${index}`}>{line}</div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="pests-cell">
                  {result.pestLabels.length === 0
                    ? "—"
                    : result.pestLabels.map((label) => <div key={label}>{label}</div>)}
                </td>
                <td className="num-cell visits-cell">{result.visitsLabel}</td>
                <td className="price-cell">{formatMoney(result.installFee)}</td>
                <td className="price-cell">{formatMoney(result.serviceFee)}</td>
                <td className="price-cell">{formatMoney(result.annualService)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="proposal-foot">
          <p>
            As part of our commitment to transparent pricing, the quoted rates are secured for 60
            days from the issue date. Due to potential changes in material, labour, and operational
            costs, pricing may be subject to review after this period.
          </p>
          <p className="gst-note">All prices quoted are excluding GST.</p>
        </div>
        <p className="proposal-credit">
          Created by Competitive Pest Services
          <br />
          © 2026 Competitive Pest Services · {APP_VERSION_LABEL}
        </p>
      </section>

      <div className="actions no-print">
        <button className="btn primary" onClick={onSave}>
          Save quote
        </button>
        <button className="btn" onClick={() => window.print()}>
          Print / PDF
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (next: Settings) => void;
}) {
  function patch(partial: Partial<Settings>) {
    onChange({ ...settings, ...partial });
  }

  return (
    <section className="card form-card">
      <h2>Rates and time allowances</h2>
      <p>
        Labour rate × service time sets TOTAL COST PER SERVICE. Bait station $ goes there unless
        Installation fee is ticked — then it goes on INSTALL FEE instead. Time Mist and FCU add to
        INSTALL FEE. Install time is 1 bait station = {settings.minutesPerStationInstall} min.
      </p>
      <div className="fields">
        <div className="row-2">
          <label>
            Business name
            <input
              value={settings.companyName}
              onChange={(e) => patch({ companyName: e.target.value })}
            />
          </label>
          <label>
            Phone
            <input
              value={settings.companyPhone}
              onChange={(e) => patch({ companyPhone: e.target.value })}
            />
          </label>
        </div>
        <div className="row-2">
          <label>
            Minutes per bait station — install
            <NumberInput
              value={settings.minutesPerStationInstall}
              onCommit={(n) => patch({ minutesPerStationInstall: n })}
            />
          </label>
          <label>
            Minutes per bait station — service
            <NumberInput
              value={settings.minutesPerStationRoutine}
              onCommit={(n) => patch({ minutesPerStationRoutine: n })}
            />
          </label>
        </div>
        <div className="row-2">
          <label>
            Internal residual — install (min)
            <NumberInput
              value={settings.residualInstallMinutes}
              onCommit={(n) => patch({ residualInstallMinutes: n })}
            />
          </label>
          <label>
            Internal residual — service (min)
            <NumberInput
              value={settings.residualRoutineMinutes}
              onCommit={(n) => patch({ residualRoutineMinutes: n })}
            />
          </label>
        </div>
        <div className="row-2">
          <label>
            Rate per bait station ($)
            <NumberInput
              value={settings.stationHardwareCost}
              step="0.01"
              onCommit={(n) => patch({ stationHardwareCost: n })}
            />
          </label>
          <label>
            Labour rate ($ per hour)
            <NumberInput
              value={settings.hourlyRate}
              step="0.01"
              onCommit={(n) => patch({ hourlyRate: n })}
            />
          </label>
        </div>
        <p className="field-help">
          TOTAL COST PER SERVICE is service time ÷ 60 × labour rate, plus bait stations × station
          rate only when Installation fee is not ticked. Annual cost is that × visits.
        </p>
        <div className="row-2">
          <label>
            Time Mist Unit ($)
            <NumberInput
              value={settings.timeMistPrice}
              step="0.01"
              onCommit={(n) => patch({ timeMistPrice: n })}
            />
          </label>
          <label>
            FCU (Fly control unit) ($)
            <NumberInput
              value={settings.fcuPrice}
              step="0.01"
              onCommit={(n) => patch({ fcuPrice: n })}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
