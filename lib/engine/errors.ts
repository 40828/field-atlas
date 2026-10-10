/**
 * Failure taxonomy used by the orchestrator to decide what happens to a task:
 *  - RetryableError  → exponential backoff, then try again (network blips, 429s, bad model output)
 *  - ConfigError     → retrying cannot help; the mission is marked blocked with an exact fix
 *  - PermanentError  → fail now, skip retries, cancel dependents
 */
export class RetryableError extends Error {
  readonly retryable = true;
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "RetryableError";
  }
}

export class ConfigError extends Error {
  /** Human-readable instruction describing exactly what to configure. */
  constructor(message: string, readonly fix: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentError";
  }
}

/** Thrown inside handlers when the mission was paused or cancelled mid-flight. */
export class CancelledError extends Error {
  constructor() {
    super("Task cancelled");
    this.name = "CancelledError";
  }
}

/** Never leak secrets: strip anything that looks like a key/token from text we store or show. */
export function redact(text: string): string {
  return text
    .replace(/\b(sk|rk|pk|whsec)_(live|test)?_?[A-Za-z0-9]{8,}/g, "[redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9._\-]{12,}/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{5,}/g, "[redacted-jwt]")
    .slice(0, 2_000);
}

export function errorMessage(err: unknown): string {
  return redact(err instanceof Error ? err.message : String(err));
}
