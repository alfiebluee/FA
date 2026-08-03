"use client";

type Props = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="h-px w-16 bg-[var(--accent)]/40" />
      <h2 className="text-xl tracking-[0.12em] text-[var(--text-primary)]">{title}</h2>
      <p className="max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
        {message}
      </p>
    </div>
  );
}
