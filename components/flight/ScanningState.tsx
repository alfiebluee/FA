"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/lib/hooks/useAviationStore";

type Props = {
  scannedCount: number;
  loading?: boolean;
};

export function ScanningState({ scannedCount, loading }: Props) {
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col justify-center gap-6 px-6 py-10 lg:px-10"
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-1.5 w-1.5 rounded-full bg-[var(--signal)] ${reduced ? "" : "breathe"}`}
        />
        <span className="type-eyebrow text-[var(--signal)]">
          {loading ? "Acquiring" : "Standing by"}
        </span>
      </div>

      <h2 className="type-display text-[var(--text-primary)]">
        {loading ? (
          "TUNING IN"
        ) : (
          <>
            SCANNING
            <br />
            THE APPROACH
          </>
        )}
      </h2>

      <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
        {loading
          ? "Contacting the ADS-B network and building the local arrival picture."
          : "No high-confidence Heathrow arrival is currently routed over the observation point. The next inbound will appear here automatically."}
      </p>

      <div className="relative h-px w-full max-w-md overflow-hidden bg-[var(--line)]">
        {!reduced && (
          <motion.span
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--signal)] to-transparent"
            animate={{ x: ["-100%", "320%"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {scannedCount > 0 && (
        <p className="type-label text-[10px]">
          {scannedCount} aircraft in range · none matching the Heathrow approach corridor
        </p>
      )}
    </motion.div>
  );
}
