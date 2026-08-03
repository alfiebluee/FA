"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { AircraftSilhouette } from "@/components/aircraft/AircraftSilhouette";
import { visualCategoryFromType } from "@/lib/aviation/aircraft-types";
import type { AssessedAircraft, DisplaySettings } from "@/lib/aviation/types";
import {
  formatAltitude,
  formatDistanceKm,
  formatEtaSeconds,
} from "@/lib/aviation/format";
import { usePrefersReducedMotion } from "@/lib/hooks/useAviationStore";

type Props = {
  aircraft: AssessedAircraft[];
  focusIcao24: string | null;
  settings: DisplaySettings;
  onSelect: (icao24: string) => void;
};

export function SequenceRail({ aircraft, focusIcao24, settings, onSelect }: Props) {
  const reduced = usePrefersReducedMotion();

  const showAll = settings.trafficView === "all";

  const arrivals = aircraft
    .filter((a) => a.relevance === "arrival")
    .slice()
    .sort((a, b) => {
      const aEta = a.assessment.estimatedSecondsToClosestApproach ?? 99_999;
      const bEta = b.assessment.estimatedSecondsToClosestApproach ?? 99_999;
      return aEta - bEta;
    });

  const nearby = showAll
    ? aircraft
        .filter((a) => a.relevance === "context")
        .slice()
        .sort(
          (a, b) =>
            a.assessment.distanceFromObserverKm - b.assessment.distanceFromObserverKm,
        )
    : [];

  const queue = showAll
    ? [...arrivals.slice(0, 6), ...nearby.slice(0, 18)]
    : arrivals.slice(0, 8);

  const heading = showAll ? "Nearby traffic" : "Local arrival sequence";
  const emptyMessage = showAll
    ? "No aircraft reported inside the search radius."
    : "No further Heathrow arrivals routed over the observation point.";

  return (
    <section
      aria-label={heading}
      className="relative border-t border-[var(--line-soft)] bg-[var(--ink-050)]/80 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 px-6 pt-3 lg:px-10">
        <h3 className="type-eyebrow text-[var(--text-tertiary)]">{heading}</h3>
        <div className="group relative flex">
          <button
            type="button"
            aria-label="How this sequence is ordered"
            className="text-[var(--text-tertiary)] transition-colors hover:text-[var(--signal)]"
          >
            <Info className="h-3 w-3" />
          </button>
          <div className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-64 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--ink-200)] p-2.5 text-[11px] leading-relaxed text-[var(--text-secondary)] shadow-2xl group-focus-within:block group-hover:block">
            {showAll
              ? "Heathrow arrivals first, then every other aircraft in the radius by distance. Not an official landing order."
              : "Ranked by local proximity and estimated Heathrow-arrival likelihood, not official landing order."}
          </div>
        </div>
        <span className="ml-auto type-label text-[10px]">
          {showAll
            ? `${arrivals.length} arriving · ${nearby.length} other`
            : `${arrivals.length} overhead ${arrivals.length === 1 ? "track" : "tracks"}`}
        </span>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-6 pb-4 pt-3 lg:px-10">
        <AnimatePresence initial={false} mode="popLayout">
          {queue.length === 0 ? (
            <motion.p
              key="empty"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-3 text-sm text-[var(--text-tertiary)]"
            >
              {emptyMessage}
            </motion.p>
          ) : (
            queue.map((a) => {
              const active = a.icao24 === focusIcao24;
              const isArrival = a.relevance === "arrival";
              const category = visualCategoryFromType(a.aircraftTypeCode, a.category);
              return (
                <motion.button
                  key={a.icao24}
                  layout={!reduced}
                  type="button"
                  onClick={() => onSelect(a.icao24)}
                  initial={reduced ? false : { opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduced
                      ? { opacity: 0 }
                      : { opacity: 0, x: -40, scale: 0.94, filter: "blur(4px)" }
                  }
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`group flex min-w-[196px] shrink-0 items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-[var(--signal)]/55 bg-[var(--signal)]/[0.07]"
                      : isArrival
                        ? "border-[var(--line-soft)] bg-[var(--ink-100)]/60 hover:border-[var(--line-strong)]"
                        : "border-dashed border-[var(--line-soft)] bg-transparent opacity-65 hover:opacity-100"
                  }`}
                >
                  <AircraftSilhouette
                    typeCode={a.aircraftTypeCode}
                    category={category}
                    variant="plan"
                    className={`h-7 w-7 shrink-0 rotate-90 ${
                      active
                        ? "text-[var(--signal-bright)]"
                        : "text-[var(--text-tertiary)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="type-metric text-sm text-[var(--text-primary)]">
                        {a.displayLabel}
                      </span>
                      <span
                        className={`type-metric text-[11px] ${
                          active ? "text-[var(--signal)]" : "text-[var(--text-tertiary)]"
                        }`}
                      >
                        {isArrival
                          ? formatEtaSeconds(
                              a.assessment.estimatedSecondsToClosestApproach,
                            )
                          : formatDistanceKm(
                              a.assessment.distanceFromObserverKm,
                              settings.units,
                              false,
                            )}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--text-tertiary)]">
                      {a.inferredAirline ?? a.aircraftTypeCode ?? "Operator unavailable"}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px]">
                      <span className="type-metric text-[var(--text-secondary)]">
                        {formatAltitude(a.altitudeFeet, settings.units)}
                      </span>
                      <span className="uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                        {isArrival ? a.statusLabel : "Not Heathrow-bound"}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
