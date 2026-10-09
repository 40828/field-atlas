interface ConceptNodeProps {
  label: string;
  onClick: () => void;
  dim?: boolean;
  title?: string;
}

/** A tappable concept in the knowledge map. */
export function ConceptNode({ label, onClick, dim = false, title }: ConceptNodeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? `Quick overview of ${label}`}
      className={`group inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-ink/90 transition hover:border-accent hover:bg-tint hover:text-white ${
        dim ? "opacity-20" : ""
      }`}
    >
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-accent/70 transition group-hover:bg-aqua" aria-hidden />
      {label}
    </button>
  );
}
