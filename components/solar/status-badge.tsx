import { CheckCircle2, CircleDashed, FilePenLine, Loader2, ShieldCheck, ShieldAlert, Clock, RotateCcw, type LucideIcon } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { APPROVAL_LABELS, STATUS_LABELS } from "@/lib/solar/options";
import type { ApprovalState, CheckStatus, ProposalStatus } from "@/lib/solar/types";

const STATUS_STYLE: Record<ProposalStatus, { variant: BadgeProps["variant"]; icon: LucideIcon; spin?: boolean }> = {
  parsing: { variant: "info", icon: Loader2, spin: true },
  ready: { variant: "success", icon: CheckCircle2 },
  drafted: { variant: "default", icon: FilePenLine },
};

export function StatusBadge({ status }: { status: ProposalStatus }) {
  const { variant, icon: Icon, spin } = STATUS_STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon className={spin ? "animate-spin" : undefined} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const APPROVAL_STYLE: Record<ApprovalState, { variant: BadgeProps["variant"]; icon: LucideIcon }> = {
  "not-submitted": { variant: "outline", icon: CircleDashed },
  pending: { variant: "warning", icon: Clock },
  approved: { variant: "success", icon: ShieldCheck },
  "changes-requested": { variant: "destructive", icon: RotateCcw },
};

export function ApprovalBadge({ approval }: { approval: ApprovalState }) {
  const { variant, icon: Icon } = APPROVAL_STYLE[approval];
  return (
    <Badge variant={variant}>
      <Icon />
      {APPROVAL_LABELS[approval]}
    </Badge>
  );
}

const CHECK_STYLE: Record<CheckStatus, { variant: BadgeProps["variant"]; label: string; icon: LucideIcon }> = {
  pass: { variant: "success", label: "Pass", icon: ShieldCheck },
  review: { variant: "warning", label: "Review", icon: ShieldAlert },
  fail: { variant: "destructive", label: "Fail", icon: ShieldAlert },
};

export function CheckBadge({ status }: { status: CheckStatus }) {
  const { variant, label, icon: Icon } = CHECK_STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon />
      {label}
    </Badge>
  );
}
