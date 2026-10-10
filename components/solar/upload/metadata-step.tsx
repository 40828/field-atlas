"use client";

import { useId, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUILDING_TYPE_OPTIONS, JURISDICTION_SUGGESTIONS, MATERIAL_OPTIONS } from "@/lib/solar/options";
import type { BuildingType, TargetMaterial } from "@/lib/solar/types";
import type { FieldErrors, FieldName, FormValues } from "./types";

interface MetadataStepProps {
  values: FormValues;
  /** Errors already filtered to what should be *displayed* (touched / submitted). */
  errors: FieldErrors;
  serverError: string | null;
  onChange: <K extends FieldName>(name: K, value: FormValues[K]) => void;
  onBlur: (name: FieldName) => void;
  onBack: () => void;
  onNext: () => void;
}

function Field({
  id,
  label,
  hint,
  error,
  required = true,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-brand" aria-hidden>*</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function MetadataStep({ values, errors, serverError, onChange, onBlur, onBack, onNext }: MetadataStepProps) {
  const uid = useId();
  const id = (name: FieldName) => `${uid}-${name}`;
  const describedBy = (name: FieldName, hasHint = false) =>
    errors[name] ? `${id(name)}-error` : hasHint ? `${id(name)}-hint` : undefined;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={id("clientName")} label="Client name" error={errors.clientName} hint="Appears on the proposal cover and in your CRM.">
          <Input
            id={id("clientName")}
            name="clientName"
            autoComplete="organization"
            placeholder="e.g. Meridian Freight Co."
            value={values.clientName}
            onChange={(e) => onChange("clientName", e.target.value)}
            onBlur={() => onBlur("clientName")}
            aria-invalid={!!errors.clientName}
            aria-describedby={describedBy("clientName", true)}
          />
        </Field>

        <Field id={id("address")} label="Property address" error={errors.address} hint="Street number, street name, city and state.">
          <div className="relative">
            <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id={id("address")}
              name="address"
              autoComplete="street-address"
              placeholder="1200 W Buckeye Rd, Phoenix, AZ"
              className="pl-9"
              value={values.address}
              onChange={(e) => onChange("address", e.target.value)}
              onBlur={() => onBlur("address")}
              aria-invalid={!!errors.address}
              aria-describedby={describedBy("address", true)}
            />
          </div>
        </Field>
      </div>

      {/* Building type: native radios styled as cards (full keyboard support) */}
      <fieldset className="flex flex-col gap-2" aria-describedby={errors.buildingType ? `${id("buildingType")}-error` : undefined}>
        <legend className="mb-2 text-sm leading-none font-medium">
          Building type<span className="ml-1 text-brand" aria-hidden>*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {BUILDING_TYPE_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
            const checked = values.buildingType === value;
            return (
              <label
                key={value}
                className={cn(
                  "group relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring",
                  checked
                    ? "border-primary bg-primary/10 shadow-[0_0_0_1px_var(--primary)]"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/40",
                  errors.buildingType && !checked && "border-destructive/40",
                )}
              >
                <input
                  type="radio"
                  name="buildingType"
                  value={value}
                  checked={checked}
                  onChange={() => onChange("buildingType", value as BuildingType)}
                  onBlur={() => onBlur("buildingType")}
                  className="sr-only"
                />
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg transition-colors", checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground")}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                </span>
              </label>
            );
          })}
        </div>
        {errors.buildingType && (
          <p id={`${id("buildingType")}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-3.5" /> {errors.buildingType}
          </p>
        )}
      </fieldset>

      <Field id={id("material")} label="Target material" error={errors.material} hint="The roofing or racking system this proposal will specify.">
        <Select
          value={values.material}
          onValueChange={(v) => onChange("material", v as TargetMaterial)}
          onOpenChange={(open) => !open && onBlur("material")}
          name="material"
        >
          <SelectTrigger
            id={id("material")}
            aria-invalid={!!errors.material}
            aria-describedby={describedBy("material", true)}
          >
            <SelectValue placeholder="Select a material system" />
          </SelectTrigger>
          <SelectContent>
            {MATERIAL_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex flex-col gap-3">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <Field id={id("jurisdiction")} label="Local jurisdiction" error={errors.jurisdiction} hint="City or county that issues the permit.">
            <Input
              id={id("jurisdiction")}
              name="jurisdiction"
              placeholder="City of Phoenix, AZ"
              value={values.jurisdiction}
              onChange={(e) => onChange("jurisdiction", e.target.value)}
              onBlur={() => onBlur("jurisdiction")}
              aria-invalid={!!errors.jurisdiction}
              aria-describedby={describedBy("jurisdiction", true)}
            />
          </Field>
          <Field id={id("zoningCode")} label="Zoning code" error={errors.zoningCode} hint="e.g. C-2, CS-1, M-52">
            <Input
              id={id("zoningCode")}
              name="zoningCode"
              placeholder="C-2"
              className="font-mono uppercase"
              maxLength={12}
              value={values.zoningCode}
              onChange={(e) => onChange("zoningCode", e.target.value)}
              onBlur={() => onBlur("zoningCode")}
              aria-invalid={!!errors.zoningCode}
              aria-describedby={describedBy("zoningCode", true)}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="size-3 text-brand" /> Quick fill
          </span>
          {JURISDICTION_SUGGESTIONS.map((s) => (
            <button
              key={s.jurisdiction}
              type="button"
              onClick={() => {
                onChange("jurisdiction", s.jurisdiction);
                onChange("zoningCode", s.zoningCode);
              }}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {s.jurisdiction} · <span className="font-mono">{s.zoningCode}</span>
            </button>
          ))}
        </div>
      </div>

      {serverError && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {serverError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
        <Button type="submit" size="lg">
          Review details <ArrowRight />
        </Button>
      </div>
    </form>
  );
}
