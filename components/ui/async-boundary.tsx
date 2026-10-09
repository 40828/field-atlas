"use client";

import { Component, Suspense, useState, type ReactNode } from "react";

export function Loading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-sm text-mute" role="status">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 0.15, 0.3].map((d) => (
          <span
            key={d}
            className="anim-dot block h-2 w-2 rounded-full bg-accent"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </div>
      {label}
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

class ErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
          <p className="text-sm text-danger">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.props.onRetry}
            className="rounded-lg border border-line-strong bg-surface-2 px-4 py-2 text-sm font-semibold transition hover:border-accent"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Suspense + error boundary with a retry button. Children read their data with
 * React's `use()`; a retry remounts them, which triggers a fresh request.
 */
export function Async({ children, label }: { children: ReactNode; label: string }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <ErrorBoundary key={attempt} onRetry={() => setAttempt((a) => a + 1)}>
      <Suspense fallback={<Loading label={label} />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
