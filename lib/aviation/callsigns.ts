/**
 * Common Heathrow airline ICAO callsign prefixes.
 * Display enhancement only — does NOT confirm destination.
 */
export const AIRLINE_PREFIXES: Record<string, string> = {
  BAW: "British Airways",
  SHT: "British Airways",
  VIR: "Virgin Atlantic",
  AAL: "American Airlines",
  UAL: "United Airlines",
  DAL: "Delta Air Lines",
  ACA: "Air Canada",
  AFR: "Air France",
  KLM: "KLM",
  DLH: "Lufthansa",
  SWR: "Swiss",
  EIN: "Aer Lingus",
  IBE: "Iberia",
  TAP: "TAP Air Portugal",
  SAS: "Scandinavian Airlines",
  FIN: "Finnair",
  UAE: "Emirates",
  QTR: "Qatar Airways",
  ETD: "Etihad Airways",
  SIA: "Singapore Airlines",
  THA: "Thai Airways",
  JAL: "Japan Airlines",
  ANA: "All Nippon Airways",
  CPA: "Cathay Pacific",
  QFA: "Qantas",
  ANZ: "Air New Zealand",
  RYR: "Ryanair",
  EZY: "easyJet",
  EZS: "easyJet",
  WZZ: "Wizz Air",
  BEE: "Flybe",
  TOM: "TUI Airways",
  ICE: "Icelandair",
  AUA: "Austrian Airlines",
  LOT: "LOT Polish Airlines",
  AZA: "ITA Airways",
  RAM: "Royal Air Maroc",
  ETH: "Ethiopian Airlines",
  SAA: "South African Airways",
  MAS: "Malaysia Airlines",
  KAL: "Korean Air",
  AAR: "Asiana Airlines",
  CCA: "Air China",
  CSN: "China Southern",
  CES: "China Eastern",
  GFA: "Gulf Air",
  OMA: "Oman Air",
  MSR: "EgyptAir",
  THY: "Turkish Airlines",
  AEE: "Aegean Airlines",
  BEL: "Brussels Airlines",
  NAX: "Norwegian",
  WMT: "Wizz Air Malta",
  RUK: "Ryanair UK",
  BAWX: "British Airways",
};

/** Extract ICAO airline prefix from a callsign (e.g. BAW123 → BAW). */
export function extractCallsignPrefix(callsign: string | null): string | null {
  if (!callsign) return null;
  const cleaned = callsign.trim().toUpperCase().replace(/\s+/g, "");
  if (cleaned.length < 3) return null;
  // Most ICAO callsigns: 3 letter airline + digits
  const match = cleaned.match(/^([A-Z]{3})\d/);
  if (match) return match[1];
  // Some are 3 letters only or registration-style
  if (/^[A-Z]{3}/.test(cleaned)) return cleaned.slice(0, 3);
  return null;
}

export function lookupAirlineFromCallsign(callsign: string | null): string | null {
  const prefix = extractCallsignPrefix(callsign);
  if (!prefix) return null;
  return AIRLINE_PREFIXES[prefix] ?? null;
}

/** Turn ICAO-style callsign into a readable flight label; preserve raw callsign. */
export function formatFlightLabel(callsign: string | null): string {
  if (!callsign) return "UNKNOWN";
  return callsign.trim().toUpperCase().replace(/\s+/g, "");
}

export function isCommercialCallsign(callsign: string | null): boolean {
  return lookupAirlineFromCallsign(callsign) != null;
}
