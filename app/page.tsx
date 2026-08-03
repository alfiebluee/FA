import { Suspense } from "react";
import { FinalApproachApp } from "@/components/FinalApproachApp";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";

export default function HomePage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-dvh items-center justify-center bg-[var(--background)] text-[var(--text-secondary)]">
            <p className="text-sm tracking-[0.2em] uppercase">FINAL APPROACH</p>
          </div>
        }
      >
        <FinalApproachApp />
      </Suspense>
    </ErrorBoundary>
  );
}
