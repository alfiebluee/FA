"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center text-[var(--text-primary)]">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--error)]">
            Display fault
          </p>
          <h1 className="text-2xl tracking-wide">FINAL APPROACH</h1>
          <p className="max-w-md text-sm text-[var(--text-secondary)]">
            Something went wrong rendering the display. Reload the page to continue.{" "}
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-[var(--line)] px-4 py-2 text-sm text-[var(--accent)]"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
