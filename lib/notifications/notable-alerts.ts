import {
  classifyNotable,
  notableDisplayName,
  shouldNotifyNotable,
  type NotableMatch,
} from "@/lib/aviation/notable-flights";
import {
  formatAltitude,
  formatDistanceKm,
  formatEtaSeconds,
  formatSpeed,
} from "@/lib/aviation/format";
import type { AssessedAircraft, UnitsMode } from "@/lib/aviation/types";

/** Don't re-alert the same airframe for two hours once notified. */
const COOLDOWN_MS = 2 * 60 * 60 * 1000;
/** Drop cooldown entries that have aged out so the map stays bounded. */
const COOLDOWN_PRUNE_MS = COOLDOWN_MS;

const notifiedAt = new Map<string, number>();

export type NotificationPermissionState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  return Notification.permission as "default" | "granted" | "denied";
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermissionState;
  } catch {
    return getNotificationPermission();
  }
}

function estimateSecondsToHeathrow(aircraft: AssessedAircraft): number | null {
  const detailsEta = aircraft.flightDetails?.estimatedArrivalUtc;
  if (detailsEta) {
    const ms = new Date(detailsEta).getTime() - Date.now();
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms / 1000);
  }

  const km = aircraft.assessment.distanceToHeathrowKm;
  const kt = aircraft.groundSpeedKnots;
  if (km == null || kt == null || kt < 40) return null;
  // nm/h → km/s: 1 kt ≈ 0.0005144 km/s
  const kmPerSecond = kt * 1.852 / 3600;
  if (kmPerSecond <= 0) return null;
  return Math.round(km / kmPerSecond);
}

function phasePhrase(aircraft: AssessedAircraft): string {
  switch (aircraft.phase) {
    case "overhead":
      return "Passing overhead now";
    case "approaching":
      return "Approaching overhead";
    case "landing":
      return "On final to Heathrow";
    case "departed-view":
      return "Past the observation point";
    default:
      return "Inbound toward the observation point";
  }
}

export function buildNotableNotification(
  aircraft: AssessedAircraft,
  match: NotableMatch,
  units: UnitsMode,
): { title: string; body: string } {
  const typeName = notableDisplayName(aircraft, match);
  const airline = aircraft.inferredAirline;
  const label = aircraft.displayLabel;

  const title = airline
    ? `${typeName} · ${airline} ${label}`
    : `${typeName} · ${label}`;

  const parts: string[] = [phasePhrase(aircraft), match.reason];

  parts.push(`Altitude ${formatAltitude(aircraft.altitudeFeet, units)}`);

  const overheadEta = aircraft.assessment.estimatedSecondsToClosestApproach;
  if (overheadEta != null && overheadEta >= 0) {
    parts.push(`Overhead in ${formatEtaSeconds(overheadEta)}`);
  } else if (overheadEta != null && overheadEta < 0) {
    parts.push("Just passed overhead");
  }

  const toHeathrow = estimateSecondsToHeathrow(aircraft);
  if (toHeathrow != null) {
    parts.push(`Heathrow in ${formatEtaSeconds(toHeathrow)}`);
  } else if (aircraft.assessment.distanceToHeathrowKm != null) {
    parts.push(
      `To Heathrow ${formatDistanceKm(aircraft.assessment.distanceToHeathrowKm, units, false)}`,
    );
  }

  if (aircraft.groundSpeedKnots != null) {
    parts.push(formatSpeed(aircraft.groundSpeedKnots, units));
  }

  if (aircraft.flightDetails?.destinationAirportName) {
    parts.push(`Dest ${aircraft.flightDetails.destinationAirportName}`);
  } else if (aircraft.relevance === "arrival") {
    parts.push("Dest Heathrow");
  }

  return { title, body: parts.join(" · ") };
}

function pruneCooldowns(now: number) {
  for (const [id, at] of notifiedAt) {
    if (now - at > COOLDOWN_PRUNE_MS) notifiedAt.delete(id);
  }
}

/**
 * Fire desktop notifications for newly seen notable aircraft. Safe to call on
 * every poll — duplicates are suppressed for {@link COOLDOWN_MS}.
 */
export function maybeNotifyNotableAircraft(
  aircraft: AssessedAircraft[],
  options: { enabled: boolean; units: UnitsMode },
): number {
  if (!options.enabled) return 0;
  if (typeof window === "undefined" || typeof Notification === "undefined") return 0;
  if (Notification.permission !== "granted") return 0;

  const now = Date.now();
  pruneCooldowns(now);

  let sent = 0;
  for (const a of aircraft) {
    if (!shouldNotifyNotable(a)) continue;
    const match = classifyNotable(a);
    if (!match) continue;

    const last = notifiedAt.get(a.icao24);
    if (last != null && now - last < COOLDOWN_MS) continue;

    // Prefer alerting a little before overhead rather than after they've gone
    const eta = a.assessment.estimatedSecondsToClosestApproach;
    if (eta != null && eta < -90 && a.assessment.distanceFromObserverKm > 8) {
      continue;
    }

    const { title, body } = buildNotableNotification(a, match, options.units);

    try {
      const notification = new Notification(title, {
        body,
        tag: `final-approach-${a.icao24}`,
        silent: false,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      notifiedAt.set(a.icao24, now);
      sent += 1;
    } catch {
      /* Some browsers throw if the document is not visible / permission raced */
    }
  }

  return sent;
}

/** Test helper — clears the in-memory cooldown map. */
export function resetNotableNotificationState(): void {
  notifiedAt.clear();
}
