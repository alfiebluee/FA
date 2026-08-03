import type { NormalisedFlightDetails, NormalisedAircraft } from "@/lib/aviation/types";

export interface FlightDetailsProvider {
  readonly name: string;
  getFlightDetails(aircraft: NormalisedAircraft): Promise<NormalisedFlightDetails | null>;
}
