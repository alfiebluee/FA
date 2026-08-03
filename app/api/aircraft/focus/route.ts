import { NextRequest, NextResponse } from "next/server";
import { fetchNearbyAircraft } from "@/lib/aviation/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const forceDemo =
      request.nextUrl.searchParams.get("demo") === "true" ||
      request.nextUrl.searchParams.get("demo") === "1";

    const data = await fetchNearbyAircraft({ forceDemo });
    const focus = data.aircraft.find((a) => a.icao24 === data.focusIcao24) ?? null;

    return NextResponse.json({
      focus,
      focusIcao24: data.focusIcao24,
      providerStatus: data.providerStatus,
      providerName: data.providerName,
      fetchedAt: data.fetchedAt,
      isDemo: data.isDemo,
      message: data.message,
    });
  } catch (err) {
    console.error("[api/aircraft/focus]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { focus: null, error: "Failed to select focus aircraft." },
      { status: 502 },
    );
  }
}
