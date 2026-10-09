"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface CardProps {
  id?: string;
  title?: ReactNode;
  sub?: ReactNode;
  eyebrow?: string;
  children?: ReactNode;
  className?: string;
}

/** Surface panel that fades/slides in (and animates its bars) when scrolled into view. */
export function Card({ id, title, sub, eyebrow, children, className = "" }: CardProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.06 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id={id}
      className={`rv ${shown ? "in" : ""} rounded-2xl border border-line bg-surface/80 p-5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] backdrop-blur-sm sm:p-6 ${className}`}
    >
      {eyebrow && (
        <p className="mb-1 font-mono text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
          {eyebrow}
        </p>
      )}
      {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
      {sub && <p className="mt-1 text-sm leading-6 text-mute">{sub}</p>}
      {children}
    </section>
  );
}
