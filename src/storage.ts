import {
  DEFAULT_SETTINGS,
  type PestType,
  type QuoteInput,
  type ServiceFrequency,
  type Settings,
} from "./types";

const SETTINGS_KEY = "pest-quote-settings";
const QUOTES_KEY = "pest-quote-history";
const SETTINGS_DEFAULTS_VERSION = 2;

type StoredSettings = Partial<Settings> & { defaultsVersion?: number };

const NUMERIC_SETTING_KEYS = [
  "minutesPerStationInstall",
  "minutesPerStationRoutine",
  "residualInstallMinutes",
  "residualRoutineMinutes",
  "stationHardwareCost",
  "timeMistPrice",
  "fcuPrice",
  "hourlyRate",
] as const;

function isUnsetNumber(value: unknown): boolean {
  if (value == null || value === "") return true;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n === 0;
}

function mapFrequency(value: string | undefined): ServiceFrequency {
  if (value === "12vpa" || value === "1/12" || value === "monthly") return "12vpa";
  if (value === "8vpa") return "8vpa";
  if (value === "6vpa" || value === "1/6" || value === "six_year") return "6vpa";
  if (value === "4vpa" || value === "1/4" || value === "quarterly") return "4vpa";
  if (value === "2vpa" || value === "1/2" || value === "biannual") return "2vpa";
  if (value === "other" || value === "4-weekly" || value === "4_weekly") return "other";
  return "4vpa";
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as StoredSettings;
    const { defaultsVersion: storedVersion, ...storedFields } = parsed;
    const merged: Settings = { ...DEFAULT_SETTINGS, ...storedFields };

    const version = Number(storedVersion) || 0;
    if (version < SETTINGS_DEFAULTS_VERSION) {
      if (version < 1) {
        if (!storedFields.companyName || storedFields.companyName === "Your Pest Control") {
          merged.companyName = DEFAULT_SETTINGS.companyName;
        }
        for (const key of NUMERIC_SETTING_KEYS) {
          if (isUnsetNumber(storedFields[key])) {
            merged[key] = DEFAULT_SETTINGS[key];
          }
        }
      }
      if (!String(storedFields.companyPhone ?? "").trim()) {
        merged.companyPhone = DEFAULT_SETTINGS.companyPhone;
      }
      saveSettings(merged);
    }

    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings) {
  const stored: StoredSettings = {
    ...settings,
    defaultsVersion: SETTINGS_DEFAULTS_VERSION,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(stored));
}

export function loadQuotes(): QuoteInput[] {
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuoteInput[];
    return parsed
      .map((quote) => {
        const old = quote as QuoteInput & {
          baitStations?: number;
          treatmentArea?: string;
          customVisits?: number;
          spiderSpotTreat?: boolean;
        };
        const pests = quote.pests?.length ? quote.pests : (["rodents"] as PestType[]);
        const externalStations = quote.externalStations ?? old.baitStations ?? 10;
        const frequency = mapFrequency(quote.frequency);
        const storedFrequency = String(quote.frequency ?? "");
        const fourWeekly = storedFrequency === "4-weekly" || storedFrequency === "4_weekly";
        const customFrequency =
          quote.customFrequency ??
          (old.customVisits != null && old.customVisits > 0
            ? String(old.customVisits)
            : fourWeekly
              ? "13"
              : "");
        return {
          ...quote,
          pests,
          premiseName: quote.premiseName ?? "",
          externalBait: quote.externalBait ?? true,
          externalStations,
          externalPlace: quote.externalPlace ?? "",
          internalBait: quote.internalBait ?? false,
          internalStations: quote.internalStations ?? 5,
          internalPlace: quote.internalPlace ?? "",
          externalResidual: quote.externalResidual ?? false,
          internalResidual: quote.internalResidual ?? pests.some((pest) => pest !== "rodents"),
          residualCustom: quote.residualCustom ?? false,
          spiderSpotInternal: quote.spiderSpotInternal ?? old.spiderSpotTreat ?? false,
          spiderSpotExternal: quote.spiderSpotExternal ?? false,
          timeMist: quote.timeMist ?? false,
          timeMistCount: quote.timeMistCount ?? 1,
          timeMistLocation: quote.timeMistLocation ?? "",
          fcu: quote.fcu ?? false,
          fcuCount: quote.fcuCount ?? 1,
          fcuLocation: quote.fcuLocation ?? "",
          installMinutes: quote.installMinutes ?? 40,
          serviceMinutes: quote.serviceMinutes ?? 40,
          timesCustom: quote.timesCustom ?? false,
          installationFee: quote.installationFee ?? false,
          stationRate: quote.stationRate ?? DEFAULT_SETTINGS.stationHardwareCost,
          serviceFee: quote.serviceFee ?? 0,
          serviceFeeLocked: quote.serviceFeeLocked ?? true,
          treatmentNotes: quote.treatmentNotes ?? old.treatmentArea ?? "",
          frequency,
          customFrequency,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function saveQuote(quote: QuoteInput) {
  const quotes = loadQuotes().filter((q) => q.id !== quote.id);
  quotes.unshift(quote);
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes.slice(0, 80)));
}

export function deleteQuote(id: string) {
  const quotes = loadQuotes().filter((q) => q.id !== id);
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}
