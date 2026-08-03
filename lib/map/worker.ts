import { setWorkerUrl } from "maplibre-gl";

/**
 * Path served from `public/maplibre`, populated by scripts/copy-maplibre-worker.mjs.
 * MapLibre v6 cannot resolve its own worker once bundled, so it has to be told.
 */
const WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

let configured = false;

export function configureMapLibreWorker(): void {
  if (configured || typeof window === "undefined") return;
  setWorkerUrl(new URL(WORKER_URL, window.location.origin).href);
  configured = true;
}
