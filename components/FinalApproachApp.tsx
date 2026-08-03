"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { FlightHero } from "@/components/flight/FlightHero";
import { ScanningState } from "@/components/flight/ScanningState";
import { SequenceRail } from "@/components/flight/SequenceRail";
import { SelectedAircraftPanel } from "@/components/aircraft/SelectedAircraftPanel";
import { LiveFlightMap } from "@/components/map/LiveFlightMap";
import { SystemHeader } from "@/components/system/SystemHeader";
import { SettingsDrawer } from "@/components/system/SettingsDrawer";
import { PUBLIC_META } from "@/lib/config/public";
import { useAviationStore, usePrefersReducedMotion } from "@/lib/hooks/useAviationStore";
import { useDeadReckoning } from "@/lib/hooks/useDeadReckoning";

export function FinalApproachApp() {
  const searchParams = useSearchParams();
  const store = useAviationStore();
  const { api } = store;
  const reduced = usePrefersReducedMotion();

  const forceDemo =
    searchParams.get("demo") === "true" || searchParams.get("demo") === "1";
  const displayMode =
    searchParams.get("display") === "true" || searchParams.get("display") === "1";

  useEffect(() => {
    api.init({ forceDemo, displayMode });
    return () => api.destroy();
  }, [api, forceDemo, displayMode]);

  const positions = useDeadReckoning(store.aircraft, store.fetchedAt, !reduced);

  const selected = useMemo(
    () => store.aircraft.find((a) => a.icao24 === store.selectedIcao24) ?? null,
    [store.aircraft, store.selectedIcao24],
  );

  const focus = store.focus?.relevance === "arrival" ? store.focus : null;
  const showHero = Boolean(focus) && !store.loading;

  // Everything the provider reported in the radius, whether or not it is
  // currently on screen — so the count is honest before switching view.
  const nearbyCount = store.scannedCount;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[var(--ink-000)] text-[var(--text-primary)]">
      <SystemHeader
        settings={store.settings}
        providerStatus={store.providerStatus}
        providerName={store.providerName}
        fetchedAt={store.fetchedAt}
        isDemo={store.isDemo}
        displayMode={displayMode}
        arrivalCount={store.arrivalCount}
        nearbyCount={nearbyCount}
        onOpenSettings={() => api.setSettingsOpen(true)}
        onTrafficView={(trafficView) => api.setSettings({ trafficView })}
      />

      <AnimatePresence>
        {(store.message || store.offline) && (
          <motion.div
            initial={reduced ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`relative z-20 overflow-hidden border-b text-center text-[11px] ${
              store.offline
                ? "border-[var(--fault)]/25 bg-[var(--fault)]/10 text-[var(--fault)]"
                : "border-[var(--caution)]/25 bg-[var(--caution)]/10 text-[var(--caution)]"
            }`}
          >
            <p className="px-4 py-1.5">
              {store.offline
                ? "Offline — waiting for a network connection."
                : store.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage: ambient map behind, flight in front */}
      <main className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <LiveFlightMap
            aircraft={store.aircraft}
            focus={focus}
            selectedIcao24={store.selectedIcao24}
            trails={store.trails}
            positions={positions}
            settings={store.settings}
            mapMode={store.mapMode}
            onMapMode={(m) => api.setMapMode(m)}
            onSelect={(id) => api.selectAircraft(id)}
            displayMode={displayMode}
          />
        </div>

        {/* Left scrim keeps the hero legible over live tiles */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-[62%] scrim-left lg:block"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 scrim-bottom lg:hidden"
          aria-hidden
        />

        <div className="pointer-events-none relative z-10 flex h-full">
          <div className="pointer-events-auto flex h-full w-full flex-col lg:w-[48%] lg:max-w-[720px]">
            <div className="hairline-grid min-h-0 flex-1 overflow-y-auto lg:overflow-visible">
              <AnimatePresence mode="wait">
                {showHero && focus ? (
                  <FlightHero
                    key={focus.icao24}
                    aircraft={focus}
                    settings={store.settings}
                  />
                ) : (
                  <ScanningState
                    key="scanning"
                    loading={store.loading}
                    scannedCount={store.scannedCount}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {selected && selected.icao24 !== focus?.icao24 && (
            <SelectedAircraftPanel
              key={selected.icao24}
              aircraft={selected}
              settings={store.settings}
              autoFocus={store.autoFocus}
              onMakeFocus={() => api.makeFocus(selected.icao24)}
              onReturnAuto={() => api.returnToAutoFocus()}
              onClose={() => api.selectAircraft(null)}
            />
          )}
        </AnimatePresence>

        {!store.autoFocus && (
          <button
            type="button"
            onClick={() => api.returnToAutoFocus()}
            className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[var(--line-strong)] bg-[var(--ink-100)]/85 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)] backdrop-blur-md transition-colors hover:text-[var(--text-primary)] lg:left-auto lg:right-32 lg:translate-x-0"
          >
            Resume automatic tracking
          </button>
        )}
      </main>

      <SequenceRail
        aircraft={store.aircraft}
        focusIcao24={store.focusIcao24}
        settings={store.settings}
        onSelect={(id) => {
          api.selectAircraft(id);
          // Only Heathrow arrivals can drive the hero; anything else opens as a
          // detail panel so the display does not fall back to the scanning state.
          const target = store.aircraft.find((a) => a.icao24 === id);
          if (target?.relevance === "arrival") api.makeFocus(id);
        }}
      />

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--line-soft)] bg-[var(--ink-000)] px-6 py-1.5 text-[9px] text-[var(--text-tertiary)] lg:px-10">
        <span>{PUBLIC_META.disclaimer}</span>
        <span className="uppercase tracking-[0.16em]">
          Heuristic display · Not for navigation
        </span>
      </footer>

      <SettingsDrawer
        open={store.settingsOpen}
        settings={store.settings}
        onClose={() => api.setSettingsOpen(false)}
        onChange={(p) => api.setSettings(p)}
        onReset={() => api.resetSettings()}
      />
    </div>
  );
}
