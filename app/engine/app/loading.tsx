export default function Loading() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted/70" />
      <div className="h-48 animate-pulse rounded-xl bg-muted/50" />
    </div>
  );
}
