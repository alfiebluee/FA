import { z } from "zod";
import { DEFAULTS, HEATHROW } from "@/lib/config/scoring";

const serverEnvSchema = z.object({
  AIRCRAFT_PROVIDER: z.enum(["adsblol", "mock", "fr24"]).default("adsblol"),
  ADSB_LOL_BASE_URL: z.string().url().default("https://api.adsb.lol"),
  FLIGHT_DETAILS_PROVIDER: z.enum(["none", "fr24"]).default("none"),
  FR24_API_KEY: z.string().optional().default(""),
  FR24_BASE_URL: z.string().optional().default(""),
  NEXT_PUBLIC_OBSERVER_LAT: z.coerce.number().min(-90).max(90),
  NEXT_PUBLIC_OBSERVER_LON: z.coerce.number().min(-180).max(180),
  NEXT_PUBLIC_TARGET_AIRPORT: z.string().default("EGLL"),
  NEXT_PUBLIC_SEARCH_RADIUS_NM: z.coerce
    .number()
    .min(1)
    .max(250)
    .default(DEFAULTS.searchRadiusNm),
  NEXT_PUBLIC_REFRESH_INTERVAL_MS: z.coerce
    .number()
    .min(3000)
    .max(60000)
    .default(DEFAULTS.refreshIntervalMs),
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().default(DEFAULTS.mapStyleUrl),
});

export type ServerConfig = z.infer<typeof serverEnvSchema> & {
  heathrow: typeof HEATHROW;
};

export function getServerConfig(): ServerConfig {
  const parsed = serverEnvSchema.safeParse({
    AIRCRAFT_PROVIDER: process.env.AIRCRAFT_PROVIDER ?? "adsblol",
    ADSB_LOL_BASE_URL: process.env.ADSB_LOL_BASE_URL ?? "https://api.adsb.lol",
    FLIGHT_DETAILS_PROVIDER: process.env.FLIGHT_DETAILS_PROVIDER ?? "none",
    FR24_API_KEY: process.env.FR24_API_KEY ?? "",
    FR24_BASE_URL: process.env.FR24_BASE_URL ?? "",
    NEXT_PUBLIC_OBSERVER_LAT: process.env.NEXT_PUBLIC_OBSERVER_LAT ?? "51.59568",
    NEXT_PUBLIC_OBSERVER_LON: process.env.NEXT_PUBLIC_OBSERVER_LON ?? "-0.12603",
    NEXT_PUBLIC_TARGET_AIRPORT: process.env.NEXT_PUBLIC_TARGET_AIRPORT ?? "EGLL",
    NEXT_PUBLIC_SEARCH_RADIUS_NM:
      process.env.NEXT_PUBLIC_SEARCH_RADIUS_NM ?? String(DEFAULTS.searchRadiusNm),
    NEXT_PUBLIC_REFRESH_INTERVAL_MS:
      process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS ?? String(DEFAULTS.refreshIntervalMs),
    NEXT_PUBLIC_MAP_STYLE_URL:
      process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULTS.mapStyleUrl,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server configuration: ${parsed.error.message}`);
  }

  return { ...parsed.data, heathrow: HEATHROW };
}
