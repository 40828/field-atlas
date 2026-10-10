export function IncomeDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground ${className}`}>
      Autonomous Money Engine pursues an objective. It does not promise income, collect deposits for
      “guaranteed profit,” or treat a model estimate as cash.
    </p>
  );
}
