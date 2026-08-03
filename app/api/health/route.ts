import { NextResponse } from "next/server";
import { pingLiveProvider } from "@/lib/aviation/service";
import { getServerConfig } from "@/lib/config/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getServerConfig();
    const ping = await pingLiveProvider();
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      aircraftProvider: config.AIRCRAFT_PROVIDER,
      liveProvider: ping,
      timezone: "Europe/London",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
