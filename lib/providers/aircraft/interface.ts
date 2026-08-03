import type { NormalisedAircraft } from "@/lib/aviation/types";

export interface AircraftPositionProvider {
  readonly name: string;
  getNearbyAircraft(
    latitude: number,
    longitude: number,
    radiusNm: number,
  ): Promise<NormalisedAircraft[]>;
}
