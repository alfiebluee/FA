/**
 * Placeholder for a future official Flightradar24 flight-details integration.
 *
 * IMPORTANT:
 * - Do NOT scrape the Flightradar24 website.
 * - Do NOT use unofficial / reverse-engineered endpoints.
 * - Do NOT mix FR24 live positions with another near-real-time source in a way
 *   that would breach provider terms — when FR24 mode is enabled, use it as a
 *   complete selectable provider mode.
 *
 * Required environment variables (when implementing):
 *   FLIGHT_DETAILS_PROVIDER=fr24
 *   FR24_API_KEY=<your licensed key>
 *   FR24_BASE_URL=<official API base URL from FR24 documentation>
 *
 * ADS-B position data and commercial schedule data are different datasets.
 * Origin, destination, scheduled arrival and terminal typically require a
 * licensed commercial aviation API. Live aircraft selection still works
 * without these fields.
 */

import type { FlightDetailsProvider } from "@/lib/providers/flight-details/interface";
import type { NormalisedAircraft, NormalisedFlightDetails } from "@/lib/aviation/types";

export class Flightradar24PlaceholderProvider implements FlightDetailsProvider {
  readonly name = "flightradar24-placeholder";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly baseUrl: string | undefined,
  ) {}

  async getFlightDetails(
    aircraft: NormalisedAircraft,
  ): Promise<NormalisedFlightDetails | null> {
    void aircraft;
    if (!this.apiKey || !this.baseUrl) {
      console.warn(
        "[FR24] Placeholder provider active — set FR24_API_KEY and FR24_BASE_URL to enable licensed flight details.",
      );
      return null;
    }

    console.warn(
      "[FR24] API credentials present but official adapter is not yet connected. Returning null.",
    );
    return null;
  }
}
