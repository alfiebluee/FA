/**
 * Circular angle utilities for aviation headings (degrees, 0–360).
 */

/** Smallest absolute difference between two headings in degrees [0, 180]. */
export function circularHeadingDifference(a: number, b: number): number {
  const diff = Math.abs((((a % 360) + 360) % 360) - (((b % 360) + 360) % 360));
  return diff > 180 ? 360 - diff : diff;
}

/** Normalise a heading into [0, 360). */
export function normaliseHeading(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Signed shortest turn from `from` to `to` in degrees (−180, 180]. */
export function signedHeadingDifference(from: number, to: number): number {
  const a = normaliseHeading(from);
  const b = normaliseHeading(to);
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff <= -180) diff += 360;
  return diff;
}
