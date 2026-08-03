export type AirportRef = {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  /**
   * Minor fields take far less airline traffic, so they need much stronger
   * evidence before they are allowed to out-compete Heathrow.
   */
  tier: "major" | "minor";
};

export const HEATHROW_REF: AirportRef = {
  icao: "EGLL",
  iata: "LHR",
  name: "London Heathrow",
  city: "London",
  latitude: 51.47,
  longitude: -0.4543,
  tier: "major",
};

/**
 * Competing arrival airports in the London TMA.
 * Used to reject traffic that is clearly inbound somewhere other than Heathrow
 * (Gatwick, Luton, Stansted, City, Southend, Biggin Hill, Northolt).
 */
export const LONDON_AREA_AIRPORTS: AirportRef[] = [
  HEATHROW_REF,
  {
    icao: "EGKK",
    iata: "LGW",
    name: "London Gatwick",
    city: "London",
    latitude: 51.1481,
    longitude: -0.1903,
    tier: "major",
  },
  {
    icao: "EGSS",
    iata: "STN",
    name: "London Stansted",
    city: "London",
    latitude: 51.885,
    longitude: 0.235,
    tier: "major",
  },
  {
    icao: "EGGW",
    iata: "LTN",
    name: "London Luton",
    city: "London",
    latitude: 51.8747,
    longitude: -0.3683,
    tier: "major",
  },
  {
    icao: "EGLC",
    iata: "LCY",
    name: "London City",
    city: "London",
    latitude: 51.5053,
    longitude: 0.0553,
    tier: "major",
  },
  {
    icao: "EGMC",
    iata: "SEN",
    name: "London Southend",
    city: "Southend",
    latitude: 51.5714,
    longitude: 0.6956,
    tier: "minor",
  },
  {
    icao: "EGKB",
    iata: "BQH",
    name: "Biggin Hill",
    city: "London",
    latitude: 51.3308,
    longitude: 0.0325,
    tier: "minor",
  },
  {
    icao: "EGWU",
    iata: null,
    name: "RAF Northolt",
    city: "London",
    latitude: 51.553,
    longitude: -0.4183,
    tier: "minor",
  },
  {
    icao: "EGTK",
    iata: "OXF",
    name: "Oxford Kidlington",
    city: "Oxford",
    latitude: 51.8369,
    longitude: -1.32,
    tier: "minor",
  },
  {
    icao: "EGGD",
    iata: "BRS",
    name: "Bristol",
    city: "Bristol",
    latitude: 51.3827,
    longitude: -2.7191,
    tier: "minor",
  },
];

export const AIRPORTS = {
  EGLL: HEATHROW_REF,
} as const;
