"use client";

import { motion } from "framer-motion";
import type { AssessedAircraft } from "@/lib/aviation/types";
import { usePrefersReducedMotion } from "@/lib/hooks/useAviationStore";

/** Path length used to normalise approach progress, from entry to touchdown. */
const PATH_LENGTH_KM = 70;
/** Roughly where the observation point sits along that path. */
const OBSERVER_POSITION = 0.6;

type Props = {
  aircraft: AssessedAircraft;
};

export function ApproachTimeline({ aircraft }: Props) {
  const reduced = usePrefersReducedMotion();
  const remaining = aircraft.assessment.distanceToHeathrowKm;
  const progress = Math.min(1, Math.max(0.02, 1 - remaining / PATH_LENGTH_KM));
  const passedObserver = progress > OBSERVER_POSITION;

  return (
    <div className="w-full select-none">
      <div className="relative h-px w-full bg-[var(--line)]">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-[var(--signal)]/50 to-[var(--signal)]"
          initial={false}
          animate={{ width: `${progress * 100}%` }}
          transition={
            reduced ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
          }
        />

        {/* Observation point node */}
        <div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: `${OBSERVER_POSITION * 100}%` }}
        >
          <span
            className={`block h-2 w-2 -translate-x-1/2 rotate-45 border ${
              passedObserver
                ? "border-[var(--signal)] bg-[var(--signal)]"
                : "border-[var(--text-tertiary)] bg-[var(--ink-000)]"
            }`}
          />
        </div>

        {/* Threshold node */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <span className="block h-2.5 w-2.5 translate-x-1/2 rounded-full border border-[var(--line-strong)] bg-[var(--ink-000)]" />
        </div>

        {/* Aircraft position */}
        <motion.div
          className="absolute top-1/2 z-10 -translate-y-1/2"
          initial={false}
          animate={{ left: `${progress * 100}%` }}
          transition={
            reduced ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <span className="relative block h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--signal-bright)] shadow-[0_0_10px_var(--signal-glow)]">
            {!reduced && (
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--signal)] opacity-60" />
            )}
          </span>
        </motion.div>
      </div>

      <div className="mt-2.5 flex justify-between type-label text-[10px]">
        <span>Inbound</span>
        <span
          className={
            passedObserver ? "text-[var(--signal)]" : "text-[var(--text-tertiary)]"
          }
          style={{
            marginLeft: `${(OBSERVER_POSITION - 0.5) * 40}%`,
          }}
        >
          Overhead
        </span>
        <span>Heathrow</span>
      </div>
    </div>
  );
}
