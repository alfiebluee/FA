"use client";

import type { ProviderStatus } from "@/lib/aviation/types";

type Props = {
  status: ProviderStatus;
  label?: string;
};

const CONFIG: Record<
  ProviderStatus,
  { dot: string; text: string; label: string; pulse: boolean }
> = {
  live: {
    dot: "bg-[var(--affirm)]",
    text: "text-[var(--text-primary)]",
    label: "LIVE DATA",
    pulse: true,
  },
  demo: {
    dot: "bg-[var(--caution)]",
    text: "text-[var(--caution)]",
    label: "DEMO DATA",
    pulse: false,
  },
  error: {
    dot: "bg-[var(--fault)]",
    text: "text-[var(--fault)]",
    label: "API ERROR",
    pulse: false,
  },
  "rate-limited": {
    dot: "bg-[var(--caution)]",
    text: "text-[var(--caution)]",
    label: "RATE LIMITED",
    pulse: false,
  },
  stale: {
    dot: "bg-[var(--caution)]",
    text: "text-[var(--caution)]",
    label: "STALE DATA",
    pulse: false,
  },
  loading: {
    dot: "bg-[var(--signal)]",
    text: "text-[var(--text-secondary)]",
    label: "CONNECTING",
    pulse: true,
  },
};

export function StatusIndicator({ status, label }: Props) {
  const config = CONFIG[status] ?? CONFIG.loading;

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${config.dot}`}
          />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${config.dot}`} />
      </span>
      <span className={`type-eyebrow text-[9px] ${config.text}`}>
        {label ?? config.label}
      </span>
    </div>
  );
}
