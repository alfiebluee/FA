"use client";

import {
  resolveAirframeProfile,
  type AirframeProfile,
} from "@/lib/aviation/airframe-profiles";
import type { AircraftCategoryVisual } from "@/lib/aviation/types";

type Props = {
  /** ICAO type code, e.g. A388, B77W — drives the airframe proportions */
  typeCode?: string | null;
  category?: AircraftCategoryVisual;
  className?: string;
  variant?: "profile" | "plan";
  /** Extend the landing gear — used on final approach */
  gearDown?: boolean;
  detailed?: boolean;
};

const VIEW_W = 480;
const VIEW_H = 172;
/** Fuselage centreline */
const CY = 98;

/**
 * Original stylised aircraft geometry, drawn from per-family proportions so a
 * given type reads as itself: the A380 is double-decked and four-engined, the
 * 747 carries its forward hump, the 777 is long with oversized nacelles.
 * Interpreted by eye, not a scale drawing of any individual airframe.
 */
export function AircraftSilhouette({
  typeCode,
  category = "unknown",
  className = "",
  variant = "profile",
  gearDown = false,
  detailed = true,
}: Props) {
  const profile = resolveAirframeProfile(typeCode, category);

  if (category === "helicopter") {
    return <Rotorcraft className={className} variant={variant} />;
  }
  if (variant === "plan") {
    return <PlanView profile={profile} className={className} />;
  }
  return (
    <ProfileView
      profile={profile}
      className={className}
      gearDown={gearDown}
      detailed={detailed}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Side profile — nose to the right                                           */
/* -------------------------------------------------------------------------- */

function ProfileView({
  profile: p,
  className,
  gearDown,
  detailed,
}: {
  profile: AirframeProfile;
  className: string;
  gearDown: boolean;
  detailed: boolean;
}) {
  const L = p.length;
  const x0 = (VIEW_W - L) / 2; // tail
  const x1 = x0 + L; // nose
  const hd = p.depth / 2;
  const crown = CY - hd;
  const belly = CY + hd;
  /** x at a fraction of the fuselage length, measured aft-to-forward */
  const at = (f: number) => x0 + L * f;
  /** y in half-depths either side of the centreline */
  const y = (k: number) => CY + hd * k;

  const upperDeck = crown - p.depth * 0.52;
  const tailTipY = y(-0.62);

  // The crown between the nose and the tail cone. A 747 carries its upper deck
  // here, which is why the hump has to be part of the outline rather than a
  // shape floating on top of it.
  const crownLine = p.forwardHump
    ? [
        `C ${at(0.988)} ${y(-0.55)} ${at(0.962)} ${upperDeck + hd * 0.5} ${at(0.925)} ${upperDeck}`,
        `L ${at(0.75)} ${upperDeck}`,
        `C ${at(0.68)} ${upperDeck} ${at(0.66)} ${crown} ${at(0.58)} ${crown}`,
      ].join(" ")
    : `C ${at(0.985)} ${y(-0.5)} ${at(0.945)} ${crown} ${at(0.885)} ${crown}`;

  const fuselage = [
    `M ${x1} ${y(0.12)}`,
    crownLine,
    `L ${at(0.28)} ${crown}`,
    `C ${at(0.16)} ${crown} ${at(0.07)} ${y(-0.88)} ${at(0.008)} ${tailTipY}`,
    `L ${at(0.03)} ${y(-0.16)}`,
    `C ${at(0.13)} ${y(0.78)} ${at(0.24)} ${belly} ${at(0.34)} ${belly}`,
    `L ${at(0.84)} ${belly}`,
    `C ${at(0.925)} ${belly} ${at(0.972)} ${y(0.72)} ${x1} ${y(0.12)}`,
    "Z",
  ].join(" ");

  // Wing-root fairing — the belly bulge that makes the wing join read correctly
  const fairing = p.highWing
    ? null
    : [
        `M ${at(0.68)} ${belly - hd * 0.3}`,
        `C ${at(0.64)} ${belly + hd * 0.55} ${at(0.44)} ${belly + hd * 0.55} ${at(0.36)} ${belly - hd * 0.3}`,
        "Z",
      ].join(" ");

  /*
   * Fin proportions follow a real airliner: a root chord of roughly 0.17 of the
   * fuselage, a leading edge swept back about 40 degrees, and a tip chord about
   * a third of the root that overhangs the tail cone.
   */
  const finTop = crown - p.finHeight;
  const finRootLE = at(0.235);
  const finRootTE = at(0.075);
  const finTipLE = at(0.235 - 0.145);
  const finTipTE = at(0.235 - 0.215);
  const fin = [
    `M ${finRootLE} ${crown + hd * 0.15}`,
    `L ${finTipLE} ${finTop + p.finHeight * 0.06}`,
    `Q ${finTipLE - L * 0.012} ${finTop} ${finTipTE + L * 0.012} ${finTop + p.finHeight * 0.04}`,
    `L ${finTipTE} ${finTop + p.finHeight * 0.09}`,
    `L ${finRootTE} ${y(-0.5)}`,
    "Z",
  ].join(" ");

  const tailplane = p.tTail
    ? [
        `M ${finTipLE + L * 0.01} ${finTop + p.finHeight * 0.1}`,
        `L ${at(-0.045)} ${finTop - p.finHeight * 0.02}`,
        `L ${at(-0.07)} ${finTop + p.finHeight * 0.08}`,
        `L ${finTipTE - L * 0.01} ${finTop + p.finHeight * 0.2}`,
        "Z",
      ].join(" ")
    : [
        // Swept stabiliser projecting just aft of the tail cone
        `M ${at(0.15)} ${y(-0.3)}`,
        `L ${at(-0.03)} ${y(-0.95)}`,
        `L ${at(-0.058)} ${y(-0.74)}`,
        `L ${at(0.085)} ${y(-0.08)}`,
        "Z",
      ].join(" ");

  /*
   * Seen from the side the wing is nearly edge-on, so it reads as a shallow
   * swept sliver under the belly rather than a large blade.
   */
  const wingTipY = p.highWing ? crown - p.depth * 0.22 : belly + p.depth * 0.34;
  const wing = p.highWing
    ? [
        // Straight high wing, seen almost edge-on with a little dihedral
        `M ${at(0.62)} ${crown + hd * 0.25}`,
        `L ${at(0.585)} ${wingTipY}`,
        `L ${at(0.4)} ${wingTipY}`,
        `L ${at(0.35)} ${crown + hd * 0.25}`,
        "Z",
      ].join(" ")
    : [
        `M ${at(0.64)} ${belly - hd * 0.2}`,
        `L ${at(0.42)} ${wingTipY}`,
        `L ${at(0.26)} ${wingTipY + p.depth * 0.07}`,
        `L ${at(0.38)} ${belly + hd * 0.1}`,
        "Z",
      ].join(" ");

  const engines = buildEngines(p, { at, y, belly, crown, hd });

  const cockpit = p.forwardHump
    ? `M ${at(0.945)} ${upperDeck + hd * 0.35} L ${at(0.982)} ${upperDeck + hd * 0.75} L ${at(0.965)} ${upperDeck + hd * 1.0} L ${at(0.928)} ${upperDeck + hd * 0.62} Z`
    : `M ${at(0.9)} ${y(-0.72)} L ${at(0.958)} ${y(-0.42)} L ${at(0.945)} ${y(-0.16)} L ${at(0.888)} ${y(-0.45)} Z`;

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} aria-hidden>
      <g fill="currentColor">
        {!p.highWing && <path d={wing} />}
        {engines.map((e, i) => (
          <path key={`pylon-${i}`} d={e.pylon} />
        ))}
        {fairing && <path d={fairing} />}
        <path d={fuselage} />
        <path d={fin} />
        <path d={tailplane} />
        {p.highWing && <path d={wing} />}
        {engines.map((e, i) => (
          <rect
            key={`nacelle-${i}`}
            x={e.x}
            y={e.y}
            width={e.width}
            height={e.height}
            rx={e.height * 0.42}
          />
        ))}
        <path d={cockpit} opacity="0.35" />
      </g>

      {p.propellers &&
        engines.map((e, i) => (
          <g key={`prop-${i}`} stroke="currentColor" opacity="0.45">
            <line
              x1={e.propCx}
              y1={e.propCy - p.depth * 0.85}
              x2={e.propCx}
              y2={e.propCy + p.depth * 0.85}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        ))}

      {detailed && (
        <>
          <WindowRow
            from={at(0.14)}
            to={at(p.forwardHump ? 0.5 : 0.87)}
            y={p.doubleDeck ? y(-0.5) : y(-0.34)}
            spacing={Math.max(10, L / 28)}
          />
          {p.doubleDeck && (
            <WindowRow
              from={at(0.16)}
              to={at(0.85)}
              y={y(0.18)}
              spacing={Math.max(10, L / 28)}
            />
          )}
          {p.forwardHump && (
            <>
              <WindowRow from={at(0.55)} to={at(0.9)} y={y(-0.34)} spacing={12} />
              <WindowRow
                from={at(0.72)}
                to={at(0.91)}
                y={upperDeck + hd * 0.22}
                spacing={12}
              />
            </>
          )}
        </>
      )}

      {gearDown && (
        <g fill="currentColor">
          <Gear x={at(0.86)} top={belly - hd * 0.2} leg={p.depth * 0.34} scale={p.depth} />
          <Gear x={at(0.52)} top={belly + hd * 0.3} leg={p.depth * 0.32} scale={p.depth} />
          <Gear x={at(0.45)} top={belly + hd * 0.3} leg={p.depth * 0.32} scale={p.depth} />
        </g>
      )}
    </svg>
  );
}

type EngineGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  pylon: string;
  propCx: number;
  propCy: number;
};

function buildEngines(
  p: AirframeProfile,
  ctx: {
    at: (f: number) => number;
    y: (k: number) => number;
    belly: number;
    crown: number;
    hd: number;
  },
): EngineGeometry[] {
  const { at, y, belly, crown, hd } = ctx;
  const height = p.engineRadius * 2;
  const width = p.engineRadius * (p.propellers ? 3.6 : 3);

  // Regional jets carry their engines high on the rear fuselage
  if (p.tailEngines) {
    const cx = at(0.28);
    const top = y(-0.95);
    return [
      {
        x: cx - width / 2,
        y: top,
        width,
        height,
        // Short stub pylon into the fuselage side
        pylon: `M ${cx + width * 0.2} ${top + height * 0.25} L ${cx + width * 0.75} ${top + height * 0.55} L ${cx + width * 0.75} ${top + height * 0.95} L ${cx + width * 0.2} ${top + height * 0.85} Z`,
        propCx: 0,
        propCy: 0,
      },
    ];
  }

  // Turboprops carry long nacelles along the leading edge of a high wing
  if (p.highWing) {
    const top = crown - p.depth * 0.18;
    return [0.55].map((f) => {
      const cx = at(f);
      return {
        x: cx - width / 2,
        y: top,
        width,
        height,
        // Nacelle fairing tapering aft over the wing
        pylon: `M ${cx - width * 0.4} ${top} L ${cx} ${top} L ${cx} ${top + height} L ${cx - width * 0.75} ${top + height * 0.75} Z`,
        propCx: cx + width * 0.46,
        propCy: top + height / 2,
      };
    });
  }

  // Under-wing nacelles, forward of and below the leading edge. The drop values
  // put each nacelle just under the wing surface at its span station.
  const mounts =
    p.engineCount === 4
      ? [
          { fraction: 0.53, drop: 0.2, scale: 1 },
          { fraction: 0.4, drop: 0.36, scale: 0.88 },
        ]
      : [{ fraction: 0.52, drop: 0.2, scale: 1 }];

  return mounts.map(({ fraction, drop, scale }) => {
    const cx = at(fraction);
    const top = belly + p.depth * drop;
    const w = width * scale;
    const h = height * scale;
    return {
      x: cx - w / 2,
      y: top,
      width: w,
      height: h,
      // Pylon rises up and aft from the nacelle to meet the wing
      pylon: `M ${cx - w * 0.1} ${top + h * 0.35} L ${cx - w * 0.5} ${top - hd * 0.9} L ${cx - w * 0.12} ${top - hd * 0.9} L ${cx + w * 0.22} ${top + h * 0.35} Z`,
      propCx: cx + w * 0.55,
      propCy: top + h / 2,
    };
  });
}

function Gear({
  x,
  top,
  leg,
  scale,
}: {
  x: number;
  top: number;
  leg: number;
  scale: number;
}) {
  const strut = Math.max(3, scale * 0.075);
  const wheel = Math.max(4, scale * 0.13);
  return (
    <>
      <rect x={x - strut / 2} y={top} width={strut} height={leg} rx={strut / 2} />
      <circle cx={x} cy={top + leg + wheel * 0.7} r={wheel} />
    </>
  );
}

function WindowRow({
  from,
  to,
  y,
  spacing,
}: {
  from: number;
  to: number;
  y: number;
  spacing: number;
}) {
  const windows: number[] = [];
  for (let x = from; x <= to; x += spacing) windows.push(x);
  return (
    <g fill="var(--ink-000)" opacity="0.5">
      {windows.map((x) => (
        <rect key={x} x={x} y={y} width="5" height="4" rx="1.6" />
      ))}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/* Plan view — nose toward the top, used for map markers                      */
/* -------------------------------------------------------------------------- */

function PlanView({
  profile: p,
  className,
}: {
  profile: AirframeProfile;
  className: string;
}) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <g fill="currentColor" dangerouslySetInnerHTML={{ __html: planViewBody(p) }} />
    </svg>
  );
}

/**
 * Plan-view geometry shared with the MapLibre DOM markers, which cannot render
 * React. Returns the inner markup of the silhouette group.
 */
export function planViewBody(p: AirframeProfile): string {
  const cx = 60;
  const halfWidth = 3.2 + (p.depth / 64) * 4.6;
  const span = Math.min(58, 40 * p.spanRatio + (p.length / 480) * 22);
  const sweep = p.highWing ? 6 : 30;
  const rootLead = p.highWing ? 42 : 48;
  const rootTrail = rootLead + 22;
  const tipLead = rootLead + sweep;
  const tipTrail = tipLead + (p.highWing ? 8 : 7);

  const wing = (dir: 1 | -1) =>
    `<path d="M${cx + dir * (halfWidth - 0.8)} ${rootLead} L${cx + dir * span} ${tipLead} L${cx + dir * span} ${tipTrail} L${cx + dir * (halfWidth - 0.8)} ${rootTrail} Z"/>`;

  const fuselage = `<path d="M${cx} 4 C${cx + halfWidth * 0.6} 12 ${cx + halfWidth} 24 ${cx + halfWidth} 40 L${cx + halfWidth} 80 C${cx + halfWidth} 96 ${cx + halfWidth * 0.5} 108 ${cx} 116 C${cx - halfWidth * 0.5} 108 ${cx - halfWidth} 96 ${cx - halfWidth} 80 L${cx - halfWidth} 40 C${cx - halfWidth} 24 ${cx - halfWidth * 0.6} 12 ${cx} 4 Z"/>`;

  const tailSpan = span * 0.42;
  const tailplane =
    `<path d="M${cx + 3} 94 L${cx + tailSpan} 105 L${cx + tailSpan} 110 L${cx + 3} 103 Z"/>` +
    `<path d="M${cx - 3} 94 L${cx - tailSpan} 105 L${cx - tailSpan} 110 L${cx - 3} 103 Z"/>`;

  let engines = "";
  if (p.tailEngines) {
    engines =
      `<rect x="${cx + halfWidth}" y="86" width="6" height="14" rx="3"/>` +
      `<rect x="${cx - halfWidth - 6}" y="86" width="6" height="14" rx="3"/>`;
  } else if (p.propellers) {
    const spanFraction = span * 0.5;
    engines =
      `<ellipse cx="${cx + spanFraction}" cy="${rootLead + 10}" rx="3.4" ry="8"/>` +
      `<ellipse cx="${cx - spanFraction}" cy="${rootLead + 10}" rx="3.4" ry="8"/>` +
      `<circle cx="${cx + spanFraction}" cy="${rootLead + 2}" r="9" opacity="0.28"/>` +
      `<circle cx="${cx - spanFraction}" cy="${rootLead + 2}" r="9" opacity="0.28"/>`;
  } else {
    const w = 5.5 + p.engineRadius * 0.22;
    const inboard = span * 0.42;
    const nacelle = (x: number, y: number, scale = 1) =>
      `<rect x="${x - (w * scale) / 2}" y="${y}" width="${w * scale}" height="${16 * scale}" rx="${(w * scale) / 2}"/>`;
    engines =
      nacelle(cx + inboard, rootLead + 6) + nacelle(cx - inboard, rootLead + 6);
    if (p.engineCount === 4) {
      const outboard = span * 0.72;
      engines +=
        nacelle(cx + outboard, rootLead + 16, 0.85) +
        nacelle(cx - outboard, rootLead + 16, 0.85);
    }
  }

  return wing(1) + wing(-1) + fuselage + tailplane + engines;
}

/* -------------------------------------------------------------------------- */
/* Rotorcraft                                                                 */
/* -------------------------------------------------------------------------- */

function Rotorcraft({
  className,
  variant,
}: {
  className: string;
  variant: "profile" | "plan";
}) {
  if (variant === "plan") {
    return (
      <svg viewBox="0 0 120 120" className={className} fill="currentColor" aria-hidden>
        <circle
          cx="56"
          cy="52"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.3"
        />
        <ellipse cx="56" cy="52" rx="13" ry="21" />
        <path d="M56 70 L60 70 L62 108 L54 108 Z" />
        <path d="M46 104 L70 104 L70 109 L46 109 Z" opacity="0.8" />
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} aria-hidden>
      <g fill="currentColor">
        <path d="M346 92 C346 70 310 58 274 58 L216 58 C174 58 148 70 140 92 C134 108 152 120 186 122 L314 122 C338 120 346 106 346 92 Z" />
        <path d="M176 104 L76 96 L48 92 L48 102 L172 116 Z" />
        <path d="M54 64 L82 64 L74 96 L46 96 Z" opacity="0.85" />
        <rect x="168" y="122" width="7" height="20" rx="3" />
        <rect x="296" y="122" width="7" height="20" rx="3" />
        <rect x="142" y="140" width="200" height="6" rx="3" />
      </g>
      <g stroke="currentColor" strokeLinecap="round">
        <line x1="76" y1="40" x2="420" y2="40" strokeWidth="4" opacity="0.75" />
        <line x1="246" y1="40" x2="246" y2="58" strokeWidth="7" />
        <g strokeWidth="3" opacity="0.5">
          <line x1="32" y1="60" x2="92" y2="88" />
          <line x1="32" y1="88" x2="92" y2="60" />
        </g>
      </g>
    </svg>
  );
}
