import type { FlightDetailsProvider } from "@/lib/providers/flight-details/interface";
import type { NormalisedAircraft, NormalisedFlightDetails } from "@/lib/aviation/types";

/** Default: no schedule/route enrichment. Position-based selection still works. */
export class NullFlightDetailsProvider implements FlightDetailsProvider {
  readonly name = "none";

  async getFlightDetails(
    aircraft: NormalisedAircraft,
  ): Promise<NormalisedFlightDetails | null> {
    void aircraft;
    return null;
  }
}
