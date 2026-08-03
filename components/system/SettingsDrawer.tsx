"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { DisplaySettings, TrafficView } from "@/lib/aviation/types";
import {
  getNotificationPermission,
  type NotificationPermissionState,
} from "@/lib/notifications/notable-alerts";

type Props = {
  open: boolean;
  settings: DisplaySettings;
  onClose: () => void;
  onChange: (partial: Partial<DisplaySettings>) => void;
  onReset: () => void;
  onEnableNotifications: () => Promise<NotificationPermissionState>;
  onDisableNotifications: () => void;
};

export function SettingsDrawer({
  open,
  settings,
  onClose,
  onChange,
  onReset,
  onEnableNotifications,
  onDisableNotifications,
}: Props) {
  const [coordsUnlocked, setCoordsUnlocked] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  // Bump after an async permission change so we re-read Notification.permission
  const [permissionEpoch, setPermissionEpoch] = useState(0);
  void permissionEpoch;
  const permission = getNotificationPermission();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close settings"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-label="Display settings"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-[var(--ink-100)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <h2 className="type-eyebrow text-[var(--text-primary)]">
                Display settings
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
              <section className="space-y-3">
                <h3 className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Observation point
                </h3>
                {!coordsUnlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Reveal and edit precise observer coordinates? Avoid sharing screenshots that include these values.",
                        )
                      ) {
                        setCoordsUnlocked(true);
                      }
                    }}
                    className="w-full rounded border border-[var(--warning)]/40 px-3 py-2 text-left text-[var(--warning)]"
                  >
                    Unlock coordinate editing (privacy warning)
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Latitude">
                      <input
                        type="number"
                        step="0.000001"
                        value={settings.observerLat}
                        onChange={(e) =>
                          onChange({ observerLat: Number(e.target.value) })
                        }
                        className="field-input"
                      />
                    </Field>
                    <Field label="Longitude">
                      <input
                        type="number"
                        step="0.000001"
                        value={settings.observerLon}
                        onChange={(e) =>
                          onChange({ observerLon: Number(e.target.value) })
                        }
                        className="field-input"
                      />
                    </Field>
                  </div>
                )}
              </section>

              <section className="grid grid-cols-2 gap-3">
                <Field label="Search radius (nm)">
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={settings.searchRadiusNm}
                    onChange={(e) => onChange({ searchRadiusNm: Number(e.target.value) })}
                    className="field-input"
                  />
                </Field>
                <Field label="Refresh (ms)">
                  <input
                    type="number"
                    min={4000}
                    max={60000}
                    step={1000}
                    value={settings.refreshIntervalMs}
                    onChange={(e) =>
                      onChange({ refreshIntervalMs: Number(e.target.value) })
                    }
                    className="field-input"
                  />
                </Field>
                <Field label="Min arrival score">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.minArrivalScore}
                    onChange={(e) =>
                      onChange({ minArrivalScore: Number(e.target.value) })
                    }
                    className="field-input"
                  />
                </Field>
              </section>

              <section className="space-y-2">
                <TrafficViewControl
                  value={settings.trafficView}
                  onChange={(trafficView) => onChange({ trafficView })}
                  radiusNm={settings.searchRadiusNm}
                />
                <Toggle
                  label="Desktop alerts for special flights"
                  hint={
                    permission === "denied"
                      ? "Notifications are blocked in the browser. Allow them for this site in system / browser settings, then try again."
                      : permission === "unsupported"
                        ? "This browser does not support desktop notifications."
                        : "Alerts for 747s, A380s, Belugas, An-124s, VIP and military overflights near the observation point — with altitude and timing."
                  }
                  checked={settings.desktopNotifications && permission === "granted"}
                  disabled={permission === "unsupported" || permissionBusy}
                  onChange={(v) => {
                    if (!v) {
                      onDisableNotifications();
                      return;
                    }
                    setPermissionBusy(true);
                    void onEnableNotifications()
                      .then(() => setPermissionEpoch((n) => n + 1))
                      .finally(() => setPermissionBusy(false));
                  }}
                />
                <Toggle
                  label="Show projected paths"
                  checked={settings.showProjectedPaths}
                  onChange={(v) => onChange({ showProjectedPaths: v })}
                />
                <Toggle
                  label="Radar animation"
                  checked={settings.showRadarAnimation}
                  onChange={(v) => onChange({ showRadarAnimation: v })}
                />
                <Toggle
                  label="Map follow mode default"
                  checked={settings.mapFollowMode}
                  onChange={(v) => onChange({ mapFollowMode: v })}
                />
                <Toggle
                  label="Force demo mode"
                  checked={settings.forceDemo}
                  onChange={(v) => onChange({ forceDemo: v })}
                />
              </section>

              <section className="grid grid-cols-2 gap-3">
                <Field label="Units">
                  <select
                    value={settings.units}
                    onChange={(e) =>
                      onChange({ units: e.target.value as DisplaySettings["units"] })
                    }
                    className="field-input"
                  >
                    <option value="aviation">Aviation</option>
                    <option value="metric">Metric</option>
                  </select>
                </Field>
                <Field label="Clock">
                  <select
                    value={settings.clock}
                    onChange={(e) =>
                      onChange({ clock: e.target.value as DisplaySettings["clock"] })
                    }
                    className="field-input"
                  >
                    <option value="24h">24-hour</option>
                    <option value="12h">12-hour</option>
                  </select>
                </Field>
              </section>

              <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                Settings are stored in this browser only. API credentials are never saved
                client-side. Changes apply for this session&apos;s display.
              </p>
            </div>

            <div className="flex gap-2 border-t border-[var(--line)] p-4">
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setCoordsUnlocked(false);
                }}
                className="flex-1 rounded border border-[var(--line)] px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Reset defaults
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2 text-[var(--accent-strong)]"
              >
                Done
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const TRAFFIC_VIEWS: { value: TrafficView; label: string; hint: string }[] = [
  {
    value: "arrivals",
    label: "Heathrow arrivals",
    hint: "Only airline traffic on approach to Heathrow that is routed over the observation point.",
  },
  {
    value: "all",
    label: "All nearby traffic",
    hint: "Every aircraft inside the search radius, including departures, general aviation and helicopters. Non-arrivals are dimmed.",
  },
];

function TrafficViewControl({
  value,
  onChange,
  radiusNm,
}: {
  value: TrafficView;
  onChange: (value: TrafficView) => void;
  radiusNm: number;
}) {
  const active = TRAFFIC_VIEWS.find((v) => v.value === value) ?? TRAFFIC_VIEWS[0];

  return (
    <div className="space-y-2 rounded-[var(--radius-sm)] border border-[var(--line)] px-3 py-3">
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        Traffic view
      </span>
      <div
        role="radiogroup"
        aria-label="Traffic view"
        className="grid grid-cols-2 gap-1 rounded-[var(--radius-sm)] bg-[var(--ink-000)] p-1"
      >
        {TRAFFIC_VIEWS.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className="relative rounded-[6px] px-2 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
            >
              {selected && (
                <motion.span
                  layoutId="traffic-view-pill"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 rounded-[6px] border border-[var(--signal)]/45 bg-[var(--signal)]/12"
                />
              )}
              <span
                className={`relative ${
                  selected
                    ? "text-[var(--signal-bright)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
        {active.hint}
        {value === "all" && ` Radius is currently ${radiusNm} nm.`}
      </p>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--line)] px-3 py-2 ${
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[var(--text-primary)]">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            {hint}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border border-[var(--line-strong)] bg-[var(--ink-000)] px-[3px] transition-colors peer-checked:border-[var(--signal)]/60 peer-checked:bg-[var(--signal)]/25 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--signal)]"
      >
        <span
          className={`h-3.5 w-3.5 rounded-full transition-transform duration-200 ${
            checked
              ? "translate-x-4 bg-[var(--signal-bright)]"
              : "translate-x-0 bg-[var(--text-tertiary)]"
          }`}
        />
      </span>
    </label>
  );
}
