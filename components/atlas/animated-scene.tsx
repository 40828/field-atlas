"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { renderScene } from "@/lib/atlas/scenes";

const SEP = "\u0001";

/** An animated SVG illustration picked from the topic words. */
export function AnimatedScene({ strs, small = false }: { strs: string[]; small?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const key = strs.join(SEP);
  const scene = useMemo(() => renderScene(key.split(SEP), uid), [key, uid]);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      svgRef.current?.pauseAnimations?.();
    }
  }, [scene]);

  return (
    <figure
      className={`my-4 rounded-xl border border-line bg-canvas/60 px-3 py-2 text-center ${
        small ? "" : "mx-auto"
      }`}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 240 140"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Animated illustration"
        className={`mx-auto block h-auto w-full ${small ? "max-w-[210px]" : "max-w-[340px]"}`}
        dangerouslySetInnerHTML={{ __html: scene.markup }}
      />
      <figcaption className="mt-1 text-xs text-mute">{scene.caption}</figcaption>
    </figure>
  );
}
