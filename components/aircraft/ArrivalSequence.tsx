"use client";

import { Info } from "lucide-react";
import type { AssessedAircraft, DisplaySettings } from "@/lib/aviation/types";
import { formatAltitude, formatDistanceKm } from "@/lib/aviation/format";

type Props = {
  aircraft: AssessedAircraft[];
  focusIcao24: string | null;
  settings: DisplaySettings;
  onSelect: (icao24: string) => void;
};

export function ArrivalSequence({ aircraft, focusIcao24, settings, onSelect }: Props) {
  const candidates = aircraft
    .filter(
      (a) =>
        a.assessment.score >= settings.minArrivalScore ||
        a.assessment.classification !== "unlikely-arrival",
    )
    .filter((a) => a.assessment.score >= 25)
    .slice(0, 10);

  return (
    <section className="border-t border-[var(--line)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
          Local arrival sequence
        </h3>
        <div className="group relative">
          <button
            type="button"
            aria-label="About local arrival sequence"
            className="text-[var(--text-secondary)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-64 rounded border border-[var(--line)] bg-[var(--surface-raised)] p-2 text-[11px] leading-relaxed text-[var(--text-secondary)] shadow-lg group-hover:block group-focus-within:block">
            Ranked by local proximity and estimated Heathrow-arrival likelihood, not
            official landing order.
          </div>
        </div>
      </div>

      {candidates.length === 0 ? (
        <p className="py-3 text-sm text-[var(--text-secondary)]">
          No probable Heathrow arrivals in the current scan.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {candidates.map((a) => {
            const active = a.icao24 === focusIcao24;
            return (
              <button
                key={a.icao24}
                type="button"
                onClick={() => onSelect(a.icao24)}
                className={`min-w-[180px] shrink-0 rounded border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
                  active
                    ? "border-[var(--accent)] bg-[var(--surface-raised)]"
                    : "border-[var(--line)] bg-[var(--background)]/60 hover:border-[var(--accent)]/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-[var(--text-primary)]">
                    {a.displayLabel}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--accent)]">
                    {a.assessment.score}
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">
                  {a.inferredAirline ?? a.flightDetails?.airlineName ?? "—"}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[11px] text-[var(--text-secondary)]">
                  <span>{a.aircraftTypeCode ?? "Type unavailable"}</span>
                  <span>{formatAltitude(a.altitudeFeet, settings.units)}</span>
                </div>
                <div className="mt-1 flex justify-between text-[11px]">
                  <span className="text-[var(--text-secondary)]">
                    {formatDistanceKm(
                      a.projection.distanceFromObserverKm,
                      settings.units,
                      false,
                    )}
                  </span>
                  <span className="text-[var(--accent)]">{a.statusLabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
