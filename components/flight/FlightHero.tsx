"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AircraftSilhouette } from "@/components/aircraft/AircraftSilhouette";
import { ApproachTimeline } from "@/components/flight/ApproachTimeline";
import { MetricReadout, StaticReadout } from "@/components/flight/MetricReadout";
import { visualCategoryFromType } from "@/lib/aviation/aircraft-types";
import type { AssessedAircraft, DisplaySettings } from "@/lib/aviation/types";
import {
  formatAltitude,
  formatBearing,
  formatDistanceKm,
  formatEtaSeconds,
  formatSpeed,
  formatVerticalRate,
} from "@/lib/aviation/format";
import { usePrefersReducedMotion } from "@/lib/hooks/useAviationStore";

type Props = {
  aircraft: AssessedAircraft;
  settings: DisplaySettings;
};

const PHASE_EYEBROW: Record<string, string> = {
  inbound: "Inbound to Heathrow",
  approaching: "Approaching overhead",
  overhead: "Overhead now",
  "departed-view": "Continuing to Heathrow",
  landing: "On final approach",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.06 } },
  exit: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
};

const rise = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -18,
    filter: "blur(5px)",
    transition: { duration: 0.34, ease: [0.65, 0, 0.35, 1] as const },
  },
};

export function FlightHero({ aircraft, settings }: Props) {
  const reduced = usePrefersReducedMotion();
  const category = visualCategoryFromType(aircraft.aircraftTypeCode, aircraft.category);
  const airline = aircraft.flightDetails?.airlineName ?? aircraft.inferredAirline ?? null;
  const details = aircraft.flightDetails;
  const destinationConfirmed =
    details?.destinationAirportIcao === "EGLL" ||
    details?.destinationAirportIata === "LHR";
  const overhead = aircraft.phase === "overhead";

  const motionProps = reduced
    ? {}
    : { variants: container, initial: "hidden", animate: "show", exit: "exit" };
  const itemProps = reduced ? {} : { variants: rise };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={aircraft.icao24}
        {...motionProps}
        className="relative flex h-full flex-col justify-center gap-6 px-6 py-6 lg:px-10"
      >
        {/* Identity */}
        <motion.div {...itemProps}>
          <div className="flex items-center gap-3">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                overhead ? "bg-[var(--signal-bright)]" : "bg-[var(--signal)]"
              } ${reduced ? "" : "breathe"}`}
            />
            <span className="type-eyebrow text-[var(--signal)]">
              {PHASE_EYEBROW[aircraft.phase] ?? "Inbound to Heathrow"}
            </span>
          </div>

          <p className="mt-5 text-[clamp(0.95rem,1.5vw,1.35rem)] font-light tracking-[0.02em] text-[var(--text-secondary)]">
            {airline ?? "Operator unavailable"}
          </p>
          <h2 className="type-display type-metric mt-1 text-[var(--text-primary)]">
            {aircraft.displayLabel}
          </h2>
          <p className="mt-3 text-sm text-[var(--text-tertiary)]">
            {aircraft.aircraftDescription ?? "Aircraft type unavailable"}
            <span className="mx-2 text-[var(--line-strong)]">/</span>
            {aircraft.registration ?? "Registration unavailable"}
          </p>
        </motion.div>

        {/* Aircraft artwork */}
        <motion.div {...itemProps} className="relative">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent"
            aria-hidden
          />
          <motion.div
            animate={reduced ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <AircraftSilhouette
              typeCode={aircraft.aircraftTypeCode}
              category={category}
              variant="profile"
              gearDown={aircraft.phase === "landing"}
              className="h-[clamp(88px,13vh,150px)] w-full text-[var(--signal)] drop-shadow-[0_0_28px_rgba(110,231,242,0.18)]"
            />
          </motion.div>
        </motion.div>

        {/* Approach progress */}
        <motion.div {...itemProps}>
          <ApproachTimeline aircraft={aircraft} />
        </motion.div>

        {/* Primary metrics */}
        <motion.div
          {...itemProps}
          className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4"
        >
          <MetricReadout
            label="Altitude"
            value={aircraft.altitudeFeet}
            format={(v) =>
              formatAltitude(v == null ? null : Math.round(v), settings.units)
            }
            size="lg"
          />
          <MetricReadout
            label="Ground speed"
            value={aircraft.groundSpeedKnots}
            format={(v) => formatSpeed(v == null ? null : Math.round(v), settings.units)}
            size="lg"
          />
          <MetricReadout
            label="Distance"
            value={aircraft.projection.distanceFromObserverKm}
            format={(v) => formatDistanceKm(v, settings.units, false)}
            size="lg"
            tone={overhead ? "signal" : "default"}
          />
          <MetricReadout
            label="Vertical rate"
            value={aircraft.verticalRateFeetPerMinute}
            format={(v) =>
              formatVerticalRate(v == null ? null : Math.round(v), settings.units)
            }
            size="lg"
            tone={(aircraft.verticalRateFeetPerMinute ?? 0) > 200 ? "caution" : "default"}
          />
        </motion.div>

        {/* Secondary detail */}
        <motion.div
          {...itemProps}
          className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[var(--line-soft)] pt-5 sm:grid-cols-4"
        >
          <StaticReadout
            label="Overhead in"
            value={formatEtaSeconds(
              aircraft.assessment.estimatedSecondsToClosestApproach,
            )}
            tone={overhead ? "signal" : "default"}
          />
          <StaticReadout
            label="Bearing"
            value={formatBearing(aircraft.projection.bearingFromObserver)}
          />
          <StaticReadout
            label="To Heathrow"
            value={formatDistanceKm(
              aircraft.assessment.distanceToHeathrowKm,
              settings.units,
              false,
            )}
          />
          <StaticReadout
            label="Destination"
            value={destinationConfirmed ? "Heathrow (confirmed)" : "Heathrow (probable)"}
            tone={destinationConfirmed ? "signal" : "muted"}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
