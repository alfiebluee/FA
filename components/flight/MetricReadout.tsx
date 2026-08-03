"use client";

import { useInterpolatedNumber } from "@/lib/hooks/useAviationStore";

type Props = {
  label: string;
  value: number | null;
  format: (value: number | null) => string;
  unit?: string;
  size?: "lg" | "md";
  tone?: "default" | "signal" | "caution";
};

/** Animated numeric readout — interpolates between polls rather than snapping. */
export function MetricReadout({
  label,
  value,
  format,
  unit,
  size = "md",
  tone = "default",
}: Props) {
  const animated = useInterpolatedNumber(value);
  const display = format(animated == null ? null : animated);

  const toneClass =
    tone === "signal"
      ? "text-[var(--signal-bright)]"
      : tone === "caution"
        ? "text-[var(--caution)]"
        : "text-[var(--text-primary)]";

  return (
    <div className="min-w-0">
      <div className="type-label">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`type-metric whitespace-nowrap ${toneClass} ${
            size === "lg"
              ? "text-[clamp(1.25rem,1.9vw,1.75rem)]"
              : "text-[clamp(1rem,1.4vw,1.25rem)]"
          }`}
        >
          {display}
        </span>
        {unit ? (
          <span className="text-[0.7rem] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

type StaticProps = {
  label: string;
  value: string;
  tone?: "default" | "signal" | "muted";
};

export function StaticReadout({ label, value, tone = "default" }: StaticProps) {
  return (
    <div className="min-w-0">
      <div className="type-label">{label}</div>
      <div
        className={`mt-1 truncate text-sm ${
          tone === "signal"
            ? "text-[var(--signal-bright)]"
            : tone === "muted"
              ? "text-[var(--text-tertiary)]"
              : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
