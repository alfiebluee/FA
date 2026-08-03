"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { AircraftSilhouette } from "@/components/aircraft/AircraftSilhouette";
import { visualCategoryFromType } from "@/lib/aviation/aircraft-types";
import type { AssessedAircraft, DisplaySettings } from "@/lib/aviation/types";
import { formatAltitude, formatDistanceKm, formatSpeed } from "@/lib/aviation/format";

type Props = {
  aircraft: AssessedAircraft;
  settings: DisplaySettings;
  autoFocus: boolean;
  onMakeFocus: () => void;
  onReturnAuto: () => void;
  onClose: () => void;
};

export function SelectedAircraftPanel({
  aircraft,
  settings,
  autoFocus,
  onMakeFocus,
  onReturnAuto,
  onClose,
}: Props) {
  const category = visualCategoryFromType(aircraft.aircraftTypeCode, aircraft.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
      className="pane absolute right-4 top-4 z-20 w-72 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-label text-[9px]">Selected</p>
          <p className="type-metric mt-1 text-xl text-[var(--text-primary)]">
            {aircraft.displayLabel}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
            {aircraft.inferredAirline ?? "Operator unavailable"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close aircraft details"
          className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <AircraftSilhouette
        typeCode={aircraft.aircraftTypeCode}
        category={category}
        variant="profile"
        detailed={false}
        className="my-3 h-12 w-full text-[var(--text-secondary)]"
      />

      <dl className="grid grid-cols-2 gap-y-2 text-xs">
        <Row
          label="Altitude"
          value={formatAltitude(aircraft.altitudeFeet, settings.units)}
        />
        <Row
          label="Speed"
          value={formatSpeed(aircraft.groundSpeedKnots, settings.units)}
        />
        <Row
          label="Distance"
          value={formatDistanceKm(
            aircraft.projection.distanceFromObserverKm,
            settings.units,
            false,
          )}
        />
        <Row label="Score" value={`${aircraft.assessment.score}`} />
      </dl>

      {aircraft.relevance === "context" && (
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--text-tertiary)]">
          {aircraft.assessment.competingAirportIcao
            ? `Trajectory suggests ${aircraft.assessment.competingAirportIcao}, not Heathrow.`
            : (aircraft.assessment.ineligibleReason ??
              "Not routed over the observation point.")}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1.5">
        {aircraft.relevance === "arrival" && (
          <button
            type="button"
            onClick={onMakeFocus}
            className="rounded-[var(--radius-sm)] border border-[var(--signal)]/45 bg-[var(--signal)]/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--signal-bright)] transition-colors hover:bg-[var(--signal)]/16"
          >
            Make focus aircraft
          </button>
        )}
        {!autoFocus && (
          <button
            type="button"
            onClick={onReturnAuto}
            className="rounded-[var(--radius-sm)] border border-[var(--line)] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Return to automatic selection
          </button>
        )}
      </div>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="type-label text-[9px]">{label}</dt>
      <dd className="type-metric mt-0.5 text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}
