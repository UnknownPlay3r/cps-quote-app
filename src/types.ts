export type ServiceFrequency = "12vpa" | "8vpa" | "6vpa" | "4vpa" | "2vpa" | "other";

export type PestType =
  | "rodents"
  | "cockroaches"
  | "ants"
  | "spiders"
  | "fleas"
  | "silverfish"
  | "flies"
  | "wasps";

export type View = "home" | "quote" | "settings";

export type Settings = {
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAbn: string;
  minutesPerStationInstall: number;
  minutesPerStationRoutine: number;
  residualInstallMinutes: number;
  residualRoutineMinutes: number;
  stationHardwareCost: number;
  timeMistPrice: number;
  fcuPrice: number;
  hourlyRate: number;
};

export type QuoteInput = {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  email: string;
  premiseName: string;
  address: string;
  externalBait: boolean;
  externalStations: number;
  externalPlace: string;
  internalBait: boolean;
  internalStations: number;
  internalPlace: string;
  externalResidual: boolean;
  internalResidual: boolean;
  residualCustom: boolean;
  spiderSpotInternal: boolean;
  spiderSpotExternal: boolean;
  timeMist: boolean;
  timeMistCount: number;
  timeMistLocation: string;
  fcu: boolean;
  fcuCount: number;
  fcuLocation: string;
  installMinutes: number;
  serviceMinutes: number;
  timesCustom: boolean;
  installationFee: boolean;
  stationRate: number;
  serviceFee: number;
  serviceFeeLocked: boolean;
  pests: PestType[];
  frequency: ServiceFrequency;
  customFrequency: string;
  treatmentNotes: string;
};

export type QuoteResult = {
  pestLabels: string[];
  stations: number;
  installMinutes: number;
  serviceMinutes: number;
  installFee: number;
  serviceFee: number;
  visitsPerYear: number;
  visitsLabel: string;
  annualService: number;
  serviceCode: string;
  treatmentLines: string[];
};

export const PEST_OPTIONS: {
  value: PestType;
  label: string;
  usesResidual: boolean;
}[] = [
  { value: "ants", label: "Ants", usesResidual: true },
  { value: "cockroaches", label: "Cockroaches", usesResidual: true },
  { value: "spiders", label: "Spiders", usesResidual: true },
  { value: "rodents", label: "Rodents", usesResidual: false },
  { value: "fleas", label: "Fleas", usesResidual: true },
  { value: "silverfish", label: "Silverfish", usesResidual: true },
  { value: "flies", label: "Flies", usesResidual: true },
  { value: "wasps", label: "Wasps", usesResidual: true },
];

export const FREQUENCY_OPTIONS: {
  value: ServiceFrequency;
  label: string;
  visits: number;
}[] = [
  { value: "12vpa", label: "12vpa", visits: 12 },
  { value: "8vpa", label: "8vpa", visits: 8 },
  { value: "6vpa", label: "6vpa", visits: 6 },
  { value: "4vpa", label: "4vpa", visits: 4 },
  { value: "2vpa", label: "2vpa", visits: 2 },
  { value: "other", label: "Other", visits: 0 },
];

export const DEFAULT_SETTINGS: Settings = {
  companyName: "Competitive Pest Services",
  companyPhone: "1300 766 614",
  companyEmail: "",
  companyAbn: "",
  minutesPerStationInstall: 3,
  minutesPerStationRoutine: 2,
  residualInstallMinutes: 20,
  residualRoutineMinutes: 20,
  stationHardwareCost: 35,
  timeMistPrice: 35,
  fcuPrice: 200,
  hourlyRate: 260,
};

export function emptyQuote(): QuoteInput {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customerName: "",
    phone: "",
    email: "",
    premiseName: "",
    address: "",
    externalBait: true,
    externalStations: 10,
    externalPlace: "",
    internalBait: false,
    internalStations: 5,
    internalPlace: "",
    externalResidual: false,
    internalResidual: true,
    residualCustom: false,
    spiderSpotInternal: false,
    spiderSpotExternal: false,
    timeMist: false,
    timeMistCount: 1,
    timeMistLocation: "",
    fcu: false,
    fcuCount: 1,
    fcuLocation: "",
    installMinutes: 30,
    serviceMinutes: 40,
    timesCustom: false,
    installationFee: false,
    stationRate: 35,
    serviceFee: 0,
    serviceFeeLocked: false,
    pests: ["ants", "cockroaches", "spiders", "rodents"],
    frequency: "4vpa",
    customFrequency: "",
    treatmentNotes: "",
  };
}
