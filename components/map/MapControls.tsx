"use client";

import { Crosshair, Globe, Plane, Navigation } from "lucide-react";
import type { MapMode } from "@/lib/aviation/types";

type Props = {
  mode: MapMode;
  onMode: (mode: MapMode) => void;
  displayMode?: boolean;
};

const BUTTONS: {
  mode: MapMode;
  label: string;
  Icon: typeof Plane;
}[] = [
  { mode: "follow", label: "Follow aircraft", Icon: Plane },
  { mode: "overview", label: "Overview", Icon: Globe },
  { mode: "observer", label: "Observation point", Icon: Crosshair },
  { mode: "heathrow", label: "Heathrow", Icon: Navigation },
];

export function MapControls({ mode, onMode, displayMode }: Props) {
  const buttons = displayMode
    ? BUTTONS.filter((b) => b.mode === "follow" || b.mode === "overview")
    : BUTTONS;

  return (
    <div
      role="group"
      aria-label="Map view"
      className="absolute bottom-4 right-4 z-10 flex overflow-hidden rounded-full border border-[var(--line)] bg-[var(--ink-000)]/80 backdrop-blur-xl"
    >
      {buttons.map(({ mode: m, label, Icon }) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onMode(m)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={`relative px-3.5 py-2.5 transition-colors ${
              active
                ? "text-[var(--signal-bright)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {active && (
              <span
                className="absolute inset-x-1 bottom-1 h-px bg-[var(--signal)]"
                aria-hidden
              />
            )}
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
