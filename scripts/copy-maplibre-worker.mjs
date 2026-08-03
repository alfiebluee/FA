import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * MapLibre GL JS v6 loads its tile-parsing worker as a separate ES module and
 * resolves the URL from `import.meta.url`. Once bundled that no longer points
 * at node_modules, so the worker silently starts with an empty URL and no tile
 * ever loads. Copying the worker into `public/` lets us hand MapLibre an
 * absolute URL via `setWorkerUrl()`.
 */
const require = createRequire(import.meta.url);
const distDir = dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
const outDir = join(process.cwd(), "public", "maplibre");

// The worker imports the shared chunk relative to itself, so both must ship.
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

await mkdir(outDir, { recursive: true });
for (const file of files) {
  await copyFile(join(distDir, file), join(outDir, file));
}

console.log(`Copied MapLibre worker assets to public/maplibre (${files.length} files)`);
