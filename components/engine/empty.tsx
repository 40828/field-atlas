import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 py-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{body}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
