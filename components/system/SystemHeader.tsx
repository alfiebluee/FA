"use client";

import { motion } from "framer-motion";
import { Maximize2, Minimize2, SlidersHorizontal } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { StatusIndicator } from "@/components/system/StatusIndicator";
import { formatLondonTime, formatRelativeAge } from "@/lib/aviation/format";
import { PUBLIC_META } from "@/lib/config/public";
import type { DisplaySettings, ProviderStatus, TrafficView } from "@/lib/aviation/types";
import { useFullscreen, useLocalClock } from "@/lib/hooks/useAviationStore";

type Props = {
  settings: DisplaySettings;
  providerStatus: ProviderStatus;
  providerName: string;
  fetchedAt: string | null;
  isDemo: boolean;
  displayMode?: boolean;
  arrivalCount: number;
  nearbyCount: number;
  onOpenSettings: () => void;
  onTrafficView: (view: TrafficView) => void;
};

export function SystemHeader({
  settings,
  providerStatus,
  providerName,
  fetchedAt,
  isDemo,
  displayMode,
  arrivalCount,
  nearbyCount,
  onOpenSettings,
  onTrafficView,
}: Props) {
  const now = useLocalClock();
  const { isFullscreen, toggle } = useFullscreen();
  const status: ProviderStatus = isDemo ? "demo" : providerStatus;

  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center justify-between gap-4 border-b border-[var(--line-soft)] bg-[var(--ink-000)]/70 px-6 backdrop-blur-xl lg:px-10">
      <div className="flex min-w-0 items-center gap-4">
        <BrandMark />
        <p className="hidden truncate type-label text-[10px] lg:block">
          {PUBLIC_META.observationPointLabel}
        </p>
      </div>

      <div className="flex items-center gap-5 md:gap-7">
        {!displayMode && (
          <TrafficViewSwitch
            value={settings.trafficView}
            arrivalCount={arrivalCount}
            nearbyCount={nearbyCount}
            onChange={onTrafficView}
          />
        )}

        <div className="hidden items-baseline gap-2 sm:flex">
          <span className="type-metric text-sm text-[var(--text-primary)]">
            {now ? formatLondonTime(now, settings.clock) : "--:--:--"}
          </span>
          <span className="type-label text-[9px]">London</span>
        </div>

        <div className="flex items-center gap-2.5">
          <StatusIndicator status={status} />
          <span className="hidden type-label text-[9px] md:inline">
            {providerName || "—"}
            {now ? ` · ${formatRelativeAge(fetchedAt, now.getTime())}` : ""}
          </span>
        </div>

        {!displayMode && (
          <div className="flex items-center gap-1">
            <IconButton
              label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={() => void toggle()}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </IconButton>
            <IconButton label="Open settings" onClick={onOpenSettings}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * Front-of-house switch between the curated Heathrow-arrival display and the
 * raw picture of everything inside the search radius.
 */
function TrafficViewSwitch({
  value,
  arrivalCount,
  nearbyCount,
  onChange,
}: {
  value: TrafficView;
  arrivalCount: number;
  nearbyCount: number;
  onChange: (view: TrafficView) => void;
}) {
  const options: { value: TrafficView; label: string; count: number }[] = [
    { value: "arrivals", label: "Arrivals", count: arrivalCount },
    { value: "all", label: "All traffic", count: nearbyCount },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Traffic view"
      className="flex items-center gap-0.5 rounded-full border border-[var(--line-soft)] bg-[var(--ink-100)]/60 p-0.5"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className="relative rounded-full px-3 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
          >
            {selected && (
              <motion.span
                layoutId="header-traffic-view"
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 rounded-full border border-[var(--signal)]/45 bg-[var(--signal)]/12"
              />
            )}
            <span
              className={`relative flex items-baseline gap-1.5 text-[10px] uppercase tracking-[0.14em] ${
                selected ? "text-[var(--signal-bright)]" : "text-[var(--text-tertiary)]"
              }`}
            >
              {option.label}
              <span className="type-metric text-[10px] tabular-nums opacity-70">
                {option.count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-[var(--radius-sm)] border border-transparent p-2 text-[var(--text-tertiary)] transition-colors hover:border-[var(--line)] hover:text-[var(--text-primary)]"
    >
      {children}
    </button>
  );
}
