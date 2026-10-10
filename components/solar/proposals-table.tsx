"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileSearch,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyWhole, formatDate, formatInt } from "@/lib/solar/format";
import { BUILDING_TYPE_LABELS, MATERIAL_LABELS, STATUS_LABELS } from "@/lib/solar/options";
import { PROPOSAL_STATUSES, type BuildingType, type Proposal, type ProposalStatus } from "@/lib/solar/types";
import { ApprovalBadge, StatusBadge } from "./status-badge";

type StatusFilter = ProposalStatus | "all";
type TypeFilter = BuildingType | "all";
type SortKey = "createdAt" | "squareFeet" | "estimatedValue";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 6;

function SortHead({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === column;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 uppercase transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3", active ? "text-brand" : "opacity-50")} />
      </button>
    </TableHead>
  );
}

export function ProposalsTable({ proposals }: { proposals: Proposal[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: proposals.length, parsing: 0, ready: 0, drafted: 0 };
    for (const p of proposals) c[p.status] += 1;
    return c;
  }, [proposals]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = proposals.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (type !== "all" && p.buildingType !== type) return false;
      if (!q) return true;
      return [p.id, p.projectName, p.clientName, p.address, p.jurisdiction]
        .some((field) => field.toLowerCase().includes(q));
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return cmp * dir;
    });
  }, [proposals, query, status, type, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = query !== "" || status !== "all" || type !== "all";

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
    setPage(1);
  }

  function reset() {
    setQuery("");
    setStatus("all");
    setType("all");
    setPage(1);
  }

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search client, project, address or ID…"
            aria-label="Search proposals"
            className="h-9 pl-9"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter by processing status"
          className="flex w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1 lg:w-auto"
        >
          {(["all", ...PROPOSAL_STATUSES] as const).map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:flex-none",
                  active
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all" ? "All" : STATUS_LABELS[s]}
                <span
                  className={cn(
                    "num rounded px-1.5 text-[11px]",
                    active ? "bg-primary/20 text-brand" : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[s]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 lg:ml-auto">
          <Select
            value={type}
            onValueChange={(v) => {
              setType(v as TypeFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filter by building type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All building types</SelectItem>
              {(Object.keys(BUILDING_TYPE_LABELS) as BuildingType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {BUILDING_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="hidden xl:table-cell">Building</TableHead>
            <SortHead label="Sq Ft" column="squareFeet" sort={sort} onSort={toggleSort} className="hidden text-right md:table-cell" />
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Approval</TableHead>
            <SortHead label="Value" column="estimatedValue" sort={sort} onSort={toggleSort} className="hidden text-right sm:table-cell" />
            <SortHead label="Uploaded" column="createdAt" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((p) => {
            const processing = p.status === "parsing";
            return (
              <TableRow key={p.id} className="group">
                <TableCell className="max-w-[16rem]">
                  <div className="flex flex-col gap-0.5">
                    {processing ? (
                      <span className="truncate font-medium text-foreground/80">{p.projectName}</span>
                    ) : (
                      <Link
                        href={`/dashboard/proposals/${p.id}`}
                        className="truncate font-medium transition-colors hover:text-brand focus-visible:text-brand focus-visible:outline-none"
                      >
                        {p.projectName}
                      </Link>
                    )}
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.id} · {MATERIAL_LABELS[p.material]}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[12rem] truncate text-muted-foreground">{p.clientName}</TableCell>
                <TableCell className="hidden text-muted-foreground xl:table-cell">
                  {BUILDING_TYPE_LABELS[p.buildingType]}
                </TableCell>
                <TableCell className="num hidden text-right md:table-cell">{formatInt(p.squareFeet)}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <ApprovalBadge approval={p.approval} />
                </TableCell>
                <TableCell className="num hidden text-right font-medium sm:table-cell">
                  {formatCurrencyWhole(p.estimatedValue)}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(p.createdAt)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Actions for ${p.projectName}`}
                        className="opacity-60 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild disabled={processing}>
                        <Link href={`/dashboard/proposals/${p.id}`}>
                          <ExternalLink /> Open proposal
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => navigator.clipboard?.writeText(p.id)}>
                        <Copy /> Copy proposal ID
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <FileSearch className="size-5" />
          </span>
          <div>
            <p className="font-medium">No blueprints match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search term or clear the filters.</p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Footer / pagination */}
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
        <p aria-live="polite">
          {filtered.length === 0
            ? "0 results"
            : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={safePage <= 1}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft />
          </Button>
          <span className="num px-2 text-xs">
            {safePage} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={safePage >= pageCount}
            onClick={() => setPage(safePage + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
