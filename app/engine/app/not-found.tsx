import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function EngineNotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-sm text-muted-foreground">That page or record is not in your account.</p>
      <Button asChild>
        <Link href="/engine/app">Back to dashboard</Link>
      </Button>
    </div>
  );
}
