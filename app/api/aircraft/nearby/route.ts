import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyAircraft } from "@/lib/aviation/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const forceDemo =
      searchParams.get("demo") === "true" || searchParams.get("demo") === "1";
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const radius = searchParams.get("radiusNm");

    const data = await fetchNearbyAircraft({
      forceDemo,
      observerLat: lat ? Number(lat) : undefined,
      observerLon: lon ? Number(lon) : undefined,
      radiusNm: radius ? Number(radius) : undefined,
      includeContextTraffic: searchParams.get("context") === "true",
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.error("[api/aircraft/nearby]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        aircraft: [],
        focusIcao24: null,
        providerStatus: "error",
        providerName: "unknown",
        fetchedAt: new Date().toISOString(),
        observer: { latitude: 0, longitude: 0 },
        searchRadiusNm: 0,
        message: "Failed to retrieve aircraft data.",
        isDemo: false,
        scannedCount: 0,
        arrivalCount: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
