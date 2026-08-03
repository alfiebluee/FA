import type { AircraftPositionProvider } from "@/lib/providers/aircraft/interface";
import type { NormalisedAircraft } from "@/lib/aviation/types";
import { normaliseAdsbLolAircraft } from "@/lib/aviation/normalise";
import { AdsbLolResponseSchema } from "@/lib/validation/aircraft";
import { DEFAULTS } from "@/lib/config/scoring";

export class AdsbLolProvider implements AircraftPositionProvider {
  readonly name = "adsb.lol";

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = DEFAULTS.providerTimeoutMs,
    private readonly retries = DEFAULTS.providerRetries,
  ) {}

  async getNearbyAircraft(
    latitude: number,
    longitude: number,
    radiusNm: number,
  ): Promise<NormalisedAircraft[]> {
    const radius = Math.max(0, Math.min(250, Math.round(radiusNm)));
    const url = `${this.baseUrl.replace(/\/$/, "")}/v2/lat/${latitude}/lon/${longitude}/dist/${radius}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const data = await this.fetchWithTimeout(url);
        const parsed = AdsbLolResponseSchema.safeParse(data);
        if (!parsed.success) {
          throw new Error(`ADSB.lol response validation failed: ${parsed.error.message}`);
        }
        const aircraft: NormalisedAircraft[] = [];
        for (const item of parsed.data.ac) {
          const normalised = normaliseAdsbLolAircraft(item, this.name);
          if (normalised) aircraft.push(normalised);
        }
        return aircraft;
      } catch (err) {
        lastError = err;
        if (attempt < this.retries) {
          await sleep(DEFAULTS.providerBackoffMs * (attempt + 1));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("ADSB.lol request failed");
  }

  private async fetchWithTimeout(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.status === 429) {
        const err = new Error("ADSB.lol rate limited");
        (err as Error & { code?: string }).code = "RATE_LIMITED";
        throw err;
      }
      if (!res.ok) {
        throw new Error(`ADSB.lol HTTP ${res.status}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
