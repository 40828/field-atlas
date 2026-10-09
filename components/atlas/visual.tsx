import type { ReactNode } from "react";
import type { Visual, VisualItem } from "@/lib/atlas/types";

function Steps({ items, delay = 0.25, base = 0 }: { items: VisualItem[]; delay?: number; base?: number }) {
  return (
    <div className="mt-2 grid">
      {items.map((x, i) => (
        <div key={i} className="vs" style={{ animationDelay: `${base + i * delay}s` }}>
          <span className="vn">{i + 1}</span>
          <div>
            <b className="font-sans text-[0.95rem]">{x.label}</b>
            <div className="font-sans text-sm text-mute">{x.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Cycle({ items }: { items: VisualItem[] }) {
  const n = items.length;
  const cx = 180;
  const cy = 120;
  const R = 88;
  const orbit = `M${cx},${cy - R} a${R},${R} 0 1,1 0,${2 * R} a${R},${R} 0 1,1 0,${-2 * R}`;
  return (
    <>
      <svg viewBox="0 0 360 240" className="mx-auto block h-auto w-full max-w-[560px]">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--line-strong)" strokeWidth="3" />
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          pathLength={1}
          className="plot-line"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <circle r="6" fill="var(--aqua)">
          <animateMotion dur="6s" repeatCount="indefinite" path={orbit} />
        </circle>
        {items.map((_, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          const px = cx + R * Math.cos(a);
          const py = cy + R * Math.sin(a);
          return (
            <g key={i}>
              <circle cx={px} cy={py} r="15" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="2.5" />
              <text x={px} y={py + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--ink)">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <Steps items={items} delay={0.2} base={0.4} />
    </>
  );
}

function Plot({ v }: { v: Extract<Visual, { type: "plot" }> }) {
  const { points, xmin: x0, xmax: x1 } = v;
  let lo = Infinity;
  let hi = -Infinity;
  for (const [, y] of points) {
    if (Number.isFinite(y)) {
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  if (lo > hi) return null;
  if (hi - lo < 1e-9) {
    hi += 1;
    lo -= 1;
  }
  const pd = (hi - lo) * 0.08;
  lo -= pd;
  hi += pd;

  const W = 600;
  const H = 320;
  const L = 52;
  const Rr = 16;
  const T = 16;
  const B = 44;
  const X = (a: number) => L + ((a - x0) / (x1 - x0)) * (W - L - Rr);
  const Y = (b: number) => T + ((hi - b) / (hi - lo)) * (H - T - B);
  const axisY = Math.min(Math.max(Y(0), T), H - B);
  const axisX = Math.min(Math.max(X(0), L), W - Rr);
  const d = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${X(x).toFixed(1)},${Y(y).toFixed(1)}`)
    .join("");
  const fmt = (n: number) => String(+n.toPrecision(3));
  const label = { fontSize: 15, fill: "var(--mute)" };

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[560px]">
        <line x1={L} y1={axisY} x2={W - Rr} y2={axisY} stroke="var(--mute)" strokeWidth="1.5" />
        <line x1={axisX} y1={T} x2={axisX} y2={H - B} stroke="var(--mute)" strokeWidth="1.5" />
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="plot-line"
        />
        <text x={L} y={H - 24} textAnchor="start" {...label}>{fmt(x0)}</text>
        <text x={W - Rr} y={H - 24} textAnchor="end" {...label}>{fmt(x1)}</text>
        <text x={L - 6} y={H - B} textAnchor="end" {...label}>{fmt(lo + pd)}</text>
        <text x={L - 6} y={T + 10} textAnchor="end" {...label}>{fmt(hi - pd)}</text>
        {v.xlabel && (
          <text x={(L + W - Rr) / 2} y={H - 6} textAnchor="middle" {...label}>{v.xlabel}</text>
        )}
        {v.ylabel && (
          <text x={14} y={H / 2} textAnchor="middle" transform={`rotate(-90 14 ${H / 2})`} {...label}>
            {v.ylabel}
          </text>
        )}
      </svg>
      <div className="mt-2 text-center font-mono text-xs text-mute">y = {v.expr}</div>
    </>
  );
}

/** Renders the explanatory graphic attached to a reader page. */
export function VisualBlock({ visual: v }: { visual: Visual }) {
  let body: ReactNode = null;

  if (v.type === "flow") body = <Steps items={v.items} />;
  else if (v.type === "cycle") body = <Cycle items={v.items} />;
  else if (v.type === "compare") {
    body = (
      <div className="vc mt-2 grid gap-3 sm:grid-cols-2">
        {[v.left, v.right].map((side) => (
          <div key={side.name} className="font-sans">
            <b>{side.name}</b>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {side.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  } else if (v.type === "tree" && v.items.length > 1) {
    body = (
      <div className="mt-2 flex flex-col items-center font-sans">
        <div className="vt-root rounded-xl bg-accent px-4 py-2 text-center font-bold text-[#0a0f1f]">
          {v.items[0].label}
        </div>
        <div className="relative mt-5 grid w-full grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
          <div className="absolute top-[-10px] right-[8%] left-[8%] h-0.5 bg-line-strong" />
          {v.items.slice(1).map((x, i) => (
            <div
              key={i}
              className="vt-kid rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              style={{ animationDelay: `${0.3 + i * 0.2}s` }}
            >
              <b>{x.label}</b>
              <div className="text-mute">{x.note}</div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (v.type === "plot") body = <Plot v={v} />;

  if (!body) return null;

  return (
    <figure className="my-6 rounded-2xl border border-line-strong bg-surface-2 p-4 font-sans">
      <div className="text-xs font-bold tracking-[0.1em] text-aqua uppercase">{v.title}</div>
      {body}
      {v.caption && <figcaption className="mt-2 text-sm text-mute">{v.caption}</figcaption>}
    </figure>
  );
}
