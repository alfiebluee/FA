"use client";

type Props = {
  className?: string;
  compact?: boolean;
};

/** Glideslope mark: a descending path meeting the threshold. */
export function BrandGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden fill="none">
      <path
        d="M2 4 L22 20"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.45"
        strokeDasharray="2 2.5"
      />
      <path d="M24 22 L26 22" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <path d="M4 24 L26 24" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M15.5 10.5 L18.6 14.2 L23.4 15.6 L18.9 16.4 L16.6 20.4 L15.9 16.6 L11.4 15 L16 14.2 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BrandMark({ className = "", compact }: Props) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <BrandGlyph className="h-5 w-5 text-[var(--signal)]" />
      <span className="flex items-baseline gap-[0.45em] leading-none">
        <span className="text-[0.95rem] font-light tracking-[0.3em] text-[var(--text-secondary)]">
          FINAL
        </span>
        <span className="text-[0.95rem] font-medium tracking-[0.3em] text-[var(--text-primary)]">
          APPROACH
        </span>
      </span>
      {!compact && (
        <span className="ml-1 hidden h-3 w-px bg-[var(--line-strong)] lg:block" />
      )}
    </div>
  );
}
