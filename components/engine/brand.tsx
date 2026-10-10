export function EngineMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M8 20.5c3.2-1.2 5.1-4.8 6.2-8.6.4 2.8 1.4 5.4 3.3 7.2 1.5 1.4 3.5 2.2 5.5 2.4"
        className="stroke-primary-foreground"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="22.5" cy="11" r="2.1" className="fill-primary-foreground" />
    </svg>
  );
}

export function EngineWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      Autonomous Money Engine
    </span>
  );
}
