import type { TermIcon as TermIconData } from "@/lib/atlas/types";

/** Small deterministic flat glyph for a term, drawn from numeric parameters. */
export function TermIconGlyph({ icon }: { icon: TermIconData }) {
  const { seed: h, colors: [a, b, d] } = icon;
  return (
    <svg viewBox="0 0 64 64" className="anim-pop h-12 w-12" aria-hidden>
      <circle cx="32" cy="32" r={18 + (h % 8)} fill={a} opacity="0.85" />
      <rect x={8 + (h % 14)} y={36 + (h % 10)} width="24" height="16" rx="4" fill={b} />
      <circle cx={40 + (h % 14)} cy={16 + (h % 12)} r="9" fill={d} />
      <line x1="8" y1="56" x2="56" y2={8 + (h % 10)} stroke={a} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
