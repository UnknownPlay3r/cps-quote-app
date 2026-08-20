import {
  FREQUENCY_OPTIONS,
  PEST_OPTIONS,
  type PestType,
  type QuoteInput,
  type QuoteResult,
  type Settings,
} from "./types";

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatMoney(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  });
}

export function selectedPests(input: QuoteInput): PestType[] {
  return input.pests?.length ? input.pests : [];
}

export function pestLabels(pests: PestType[]): string[] {
  return PEST_OPTIONS.filter((option) => pests.includes(option.value)).map(
    (option) => option.label,
  );
}

export function pestsNeedResidual(pests: PestType[]): boolean {
  return PEST_OPTIONS.some((option) => option.usesResidual && pests.includes(option.value));
}

export function stationCount(input: QuoteInput): number {
  const external = input.externalBait ? Math.max(0, Math.round(Number(input.externalStations) || 0)) : 0;
  const internal = input.internalBait ? Math.max(0, Math.round(Number(input.internalStations) || 0)) : 0;
  return external + internal;
}

export function baitWording(
  count: number,
  location: "external" | "internal",
  place?: string,
): string {
  const n = Math.max(0, Math.round(count));
  const base = `${n} bait station${n === 1 ? "" : "s"} to ${location}`;
  const where = (place ?? "").trim();
  if (!where) return base;
  if (location === "internal") return `${base} to ${where}`;
  return `${base} — ${where}`;
}

export function unitCount(ticked: boolean, count: number | undefined): number {
  if (!ticked) return 0;
  return Math.max(0, Math.round(Number(count) || 0));
}

export function timeMistWording(count: number, location?: string): string {
  const n = Math.max(0, Math.round(count));
  const label = n === 1 ? "Time Mist Unit" : "Time Mist Units";
  const where = (location ?? "").trim();
  const base = `${n} ${label}`;
  return where ? `${base} — ${where}` : base;
}

export function fcuWording(count: number, location?: string): string {
  const n = Math.max(0, Math.round(count));
  const where = (location ?? "").trim();
  const base = `${n} FCU (Fly control unit)`;
  return where ? `${base} — ${where}` : base;
}

export function treatmentLines(input: QuoteInput): string[] {
  const lines: string[] = [];
  if (input.externalBait) {
    lines.push(baitWording(input.externalStations, "external", input.externalPlace));
  }
  if (input.internalBait) {
    lines.push(baitWording(input.internalStations, "internal", input.internalPlace));
  }
  if (input.internalResidual) {
    lines.push("Residual barrier spray to internal");
  }
  if (input.externalResidual) {
    lines.push("Residual barrier spray to external");
  }
  if (input.spiderSpotInternal) {
    lines.push("Spot treat for spiders to internal as required");
  }
  if (input.spiderSpotExternal) {
    lines.push("Spot treat for spiders to external as required");
  }
  if (input.timeMist) {
    lines.push(timeMistWording(input.timeMistCount, input.timeMistLocation));
  }
  if (input.fcu) {
    lines.push(fcuWording(input.fcuCount, input.fcuLocation));
  }
  return lines;
}

export function residualAreas(input: QuoteInput): number {
  return (input.internalResidual ? 1 : 0) + (input.externalResidual ? 1 : 0);
}

export function suggestedTimes(stations: number, residualCount: number, settings: Settings) {
  const sprayService = residualCount * settings.residualRoutineMinutes;
  return {
    installMinutes: Math.max(0, Math.round(stations * settings.minutesPerStationInstall)),
    serviceMinutes: Math.max(
      0,
      Math.round(stations * settings.minutesPerStationRoutine + sprayService),
    ),
  };
}

export function applyGeneratedQuote(input: QuoteInput, settings: Settings): QuoteInput {
  const next = { ...input };
  if (!next.residualCustom) {
    next.internalResidual = pestsNeedResidual(selectedPests(next));
  }
  if (!next.timesCustom) {
    const times = suggestedTimes(stationCount(next), residualAreas(next), settings);
    next.installMinutes = times.installMinutes;
    next.serviceMinutes = times.serviceMinutes;
  }
  return next;
}

export function parseOtherVisits(value: string): number {
  const match = value.trim().match(/(\d+)/);
  if (!match) return 0;
  return Math.max(0, Math.round(Number(match[1]) || 0));
}

export function visitsPerYear(input: QuoteInput): number {
  if (input.frequency === "other") {
    return parseOtherVisits(input.customFrequency ?? "");
  }
  return FREQUENCY_OPTIONS.find((option) => option.value === input.frequency)?.visits ?? 4;
}

export function visitsLabel(input: QuoteInput): string {
  if (input.frequency === "other") {
    const typed = (input.customFrequency ?? "").trim();
    return typed || "—";
  }
  return String(visitsPerYear(input));
}

export function parseMoney(value: string | number | undefined): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return roundMoney(Math.max(0, n));
}

export function equipmentRate(_input: QuoteInput, settings: Settings): number {
  return parseMoney(settings.stationHardwareCost);
}

export function calculateQuote(input: QuoteInput, settings: Settings): QuoteResult {
  const pests = selectedPests(input);
  const stations = stationCount(input);
  const generated = suggestedTimes(stations, residualAreas(input), settings);
  const installMinutes = input.timesCustom
    ? Math.max(0, Math.round(input.installMinutes))
    : generated.installMinutes;
  const serviceMinutes = input.timesCustom
    ? Math.max(0, Math.round(input.serviceMinutes))
    : generated.serviceMinutes;
  const visits = visitsPerYear(input);
  const rate = equipmentRate(input, settings);
  const baitInstall = input.installationFee ? stations * rate : 0;
  const timeMistInstall =
    unitCount(input.timeMist, input.timeMistCount) * parseMoney(settings.timeMistPrice);
  const fcuInstall = unitCount(input.fcu, input.fcuCount) * parseMoney(settings.fcuPrice);
  const installFee = roundMoney(baitInstall + timeMistInstall + fcuInstall);
  const serviceFee =
    input.serviceFee == null || !Number.isFinite(Number(input.serviceFee))
      ? 0
      : parseMoney(input.serviceFee);

  return {
    pestLabels: pestLabels(pests),
    stations,
    installMinutes,
    serviceMinutes,
    installFee,
    serviceFee,
    visitsPerYear: visits,
    visitsLabel: visitsLabel(input),
    annualService: roundMoney(serviceFee * visits),
    serviceCode: input.frequency,
    treatmentLines: treatmentLines(input),
  };
}
