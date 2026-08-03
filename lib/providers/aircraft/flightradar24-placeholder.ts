/**
 * Placeholder AircraftPositionProvider for a future official Flightradar24 mode.
 *
 * When FR24 live data mode is enabled, it should be a complete selectable
 * provider — do not combine FR24 live positions with ADSB.lol simultaneously
 * if that would breach provider terms.
 *
 * Required env: AIRCRAFT_PROVIDER=fr24, FR24_API_KEY, FR24_BASE_URL
 */

import type { AircraftPositionProvider } from "@/lib/providers/aircraft/interface";
import type { NormalisedAircraft } from "@/lib/aviation/types";

export class Flightradar24AircraftPlaceholder implements AircraftPositionProvider {
  readonly name = "flightradar24-placeholder";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl: string | undefined,
  ) {}

  async getNearbyAircraft(
    latitude: number,
    longitude: number,
    radiusNm: number,
  ): Promise<NormalisedAircraft[]> {
    void latitude;
    void longitude;
    void radiusNm;
    if (!this.apiKey || !this.baseUrl) {
      throw new Error(
        "Flightradar24 aircraft provider is a placeholder. Configure FR24_API_KEY and FR24_BASE_URL, then implement the official API client.",
      );
    }
    throw new Error(
      "Flightradar24 official aircraft API adapter is not yet implemented. Use AIRCRAFT_PROVIDER=adsblol or mock.",
    );
  }
}
