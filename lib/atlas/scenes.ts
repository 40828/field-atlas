/**
 * Animated SVG scene library (SMIL). Each scene returns the inner markup for a
 * 240x140 viewBox. Markup is generated only from constants and numeric hashes,
 * never from user text, so it is safe to inject with dangerouslySetInnerHTML.
 */
import { hash } from "./hash";

type V = string | number;

const CA = "var(--accent)";
const CB = "var(--aqua)";
const CL = "var(--scene-line)";
const CM = "var(--mute)";
const CC = "var(--surface-2)";
const CT = "var(--tint)";
const OR = "#f5a524";
const RD = "#ef6a3a";

const an = (a: string, v: string, d: V, x = "") =>
  `<animate attributeName="${a}" values="${v}" dur="${d}s" repeatCount="indefinite"${x}/>`;
const tf = (t: string, v: string, d: V, x = "") =>
  `<animateTransform attributeName="transform" type="${t}" values="${v}" dur="${d}s" repeatCount="indefinite"${x}/>`;
const mo = (p: string, d: V, b?: number) =>
  `<animateMotion path="${p}" dur="${d}s" repeatCount="indefinite"${b ? ` begin="${b}s"` : ""}/>`;
const ln = (x1: V, y1: V, x2: V, y2: V, c: string, w: V = 2, x = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${x}/>`;
const ci = (cx: V, cy: V, r: V, f: string, inner = "", x = "") =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${x}>${inner}</circle>`;
const pl = (pts: string, c: string, w: V, x = "") =>
  `<polyline fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" points="${pts}"${x}/>`;
const sp = (x0: number, x1: number, st: number, f: (x: number) => number) => {
  const s: string[] = [];
  for (let x = x0; x <= x1; x += st) s.push(`${x},${f(x).toFixed(1)}`);
  return s.join(" ");
};

const EAS = ' calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"';

type Scene = (h: number, id: string) => string;

const sOsc: Scene = () =>
  ln(70, 12, 170, 12, CM, 4) +
  `<path d="M64,90 A96,96 0 0,0 176,90" fill="none" stroke="${CL}" stroke-width="2" stroke-dasharray="3 4"/><g>` +
  tf("rotate", "-36 120 12;36 120 12;-36 120 12", 2.6, EAS) +
  ln(120, 12, 120, 100, CM, 2) +
  ci(120, 108, 13, CA) +
  "</g>";

const sWave: Scene = (_h, id) => {
  const f = (p: number, a: number) => (x: number) => 70 + a * Math.sin((2 * Math.PI * x) / p);
  return (
    `<defs><clipPath id="c${id}"><rect width="240" height="140"/></clipPath></defs><g clip-path="url(#c${id})">` +
    ln(0, 70, 240, 70, CL, 1.5) +
    "<g>" +
    pl(sp(-80, 320, 4, f(80, 34)), CA, 3.5) +
    tf("translate", "0 0;80 0", 2.4) +
    "</g><g>" +
    pl(sp(-80, 320, 4, f(40, 18)), CB, 2.5, ' opacity=".75"') +
    tf("translate", "0 0;-40 0", 1.6) +
    "</g></g>"
  );
};

const sRip: Scene = () => {
  let o = "";
  const sources: [number, string][] = [
    [80, CA],
    [160, CB],
  ];
  sources.forEach(([cx, col]) => {
    for (let i = 0; i < 3; i++) {
      o +=
        `<circle cx="${cx}" cy="70" r="2" fill="none" stroke="${col}" stroke-width="2.5">` +
        an("r", "2;85", 3, ` begin="${-i}s"`) +
        an("opacity", ".9;0", 3, ` begin="${-i}s"`) +
        "</circle>";
    }
    o += ci(cx, 70, 5, col);
  });
  return o;
};

const sAtom: Scene = () => {
  let o = "";
  const e = "M50,70 a70,24 0 1,1 140,0 a70,24 0 1,1 -140,0";
  for (let i = 0; i < 3; i++) {
    o +=
      `<g transform="rotate(${i * 60} 120 70)"><ellipse cx="120" cy="70" rx="70" ry="24" fill="none" stroke="${CL}" stroke-width="2"/>` +
      ci(0, 0, 5, i % 2 ? CB : CA, mo(e, 2.4 + i * 0.8, i ? -i * 0.7 : 0)) +
      "</g>";
  }
  return o + ci(120, 70, 9, CA, an("r", "8;12;8", 1.6));
};

const sGas: Scene = (h) => {
  let o = `<rect x="14" y="10" width="212" height="120" rx="8" fill="none" stroke="${CM}" stroke-width="2"/>`;
  let s = (h % 2147483646) + 1;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < 14; i++) {
    const x0 = Math.round(26 + r() * 188);
    const x1 = Math.round(26 + r() * 188);
    const y0 = Math.round(22 + r() * 96);
    const y1 = Math.round(22 + r() * 96);
    o += ci(
      x0,
      y0,
      5,
      i % 3 ? CA : CB,
      an("cx", `${x0};${x1};${x0}`, (1.6 + r() * 2).toFixed(1)) +
        an("cy", `${y0};${y1};${y0}`, (1.3 + r() * 2).toFixed(1)),
      ' opacity=".9"',
    );
  }
  return o;
};

const sOrb: Scene = () => {
  const e1 = "M30,70 a90,40 0 1,1 180,0 a90,40 0 1,1 -180,0";
  const e2 = "M65,70 a55,25 0 1,1 110,0 a55,25 0 1,1 -110,0";
  return (
    `<ellipse cx="120" cy="70" rx="90" ry="40" fill="none" stroke="${CL}" stroke-width="2"/><ellipse cx="120" cy="70" rx="55" ry="25" fill="none" stroke="${CL}" stroke-width="2"/>` +
    ci(120, 70, 13, OR, an("r", "12;15;12", 2)) +
    ci(0, 0, 6, CA, mo(e1, 7)) +
    ci(0, 0, 4.5, CB, mo(e2, 3.8, -1.5))
  );
};

const sSpace: Scene = () => {
  let o = "";
  for (let i = 0; i < 5; i++) {
    const y = 20 + i * 25;
    o += `<path d="M0,${y} Q120,${y + 1.2 * (70 - y)} 240,${y}" fill="none" stroke="${CL}" stroke-width="2"/>`;
  }
  for (let i = 0; i < 7; i++) {
    const x = 20 + i * 33;
    o += `<path d="M${x},0 Q${Math.round(x + (120 - x) * 0.9)},70 ${x},140" fill="none" stroke="${CL}" stroke-width="2"/>`;
  }
  return (
    o +
    ci(120, 70, 10, OR, an("r", "9;12;9", 2)) +
    ci(0, 0, 5, CA, mo("M10,30 Q120,125 230,30", 4))
  );
};

const sField: Scene = () => {
  const P = [
    "M72,62 C95,15 145,15 168,62",
    "M72,78 C95,125 145,125 168,78",
    "M74,70 L166,70",
    "M68,56 C85,0 155,0 172,56",
    "M68,84 C85,140 155,140 172,84",
  ];
  let o = "";
  P.forEach((d, i) => {
    o +=
      `<path d="${d}" fill="none" stroke="${CL}" stroke-width="2"/>` +
      ci(0, 0, 3.5, CB, mo(d, 2.4, i ? -i * 0.45 : 0));
  });
  return (
    o +
    ci(60, 70, 13, RD) +
    ci(180, 70, 13, CA) +
    '<text x="60" y="76" text-anchor="middle" font-size="18" font-weight="700" fill="#fff">+</text><text x="180" y="75" text-anchor="middle" font-size="20" font-weight="700" fill="#fff">-</text>'
  );
};

const sOpt: Scene = () => {
  const d = "M10,25 L100,70 L160,91 L235,128.5";
  return (
    `<rect x="100" y="0" width="60" height="140" fill="${CT}" stroke="${CL}" stroke-width="2"/>` +
    ln(100, 10, 100, 130, CM, 1.5, ' stroke-dasharray="4 4"') +
    `<path d="${d}" fill="none" stroke="${CA}" stroke-width="3" stroke-linejoin="round"/>` +
    ci(0, 0, 6, OR, mo(d, 3)) +
    ci(10, 25, 7, OR, an("opacity", "1;.4;1", 1.2))
  );
};

const sDna: Scene = (_h, id) => {
  let s1 = "";
  let s2 = "";
  let r = "";
  for (let x = -80; x <= 320; x += 4) {
    const y = 28 * Math.sin((2 * Math.PI * x) / 80);
    s1 += `${x},${(70 + y).toFixed(1)} `;
    s2 += `${x},${(70 - y).toFixed(1)} `;
  }
  for (let x = -80; x <= 320; x += 10) {
    const y = 28 * Math.sin((2 * Math.PI * x) / 80);
    r += ln(x, (70 + y).toFixed(1), x, (70 - y).toFixed(1), (x / 10) % 2 ? CB : OR, 3);
  }
  return (
    `<defs><clipPath id="c${id}"><rect width="240" height="140"/></clipPath></defs><g clip-path="url(#c${id})"><g>` +
    r +
    pl(s1, CA, 4) +
    pl(s2, CB, 4) +
    tf("translate", "0 0;-80 0", 4) +
    "</g></g>"
  );
};

const sEcon: Scene = () =>
  ln(30, 10, 30, 122, CM, 2) +
  ln(30, 122, 224, 122, CM, 2) +
  ln(30, 120, 210, 30, CB, 3.5) +
  "<g>" +
  ln(30, 30, 210, 120, CA, 3.5) +
  tf("translate", "0 0;30 0;0 0", 4, EAS) +
  "</g>" +
  ci(120, 75, 7, OR, tf("translate", "0 0;15 -7.5;0 0", 4, EAS)) +
  `<text x="214" y="26" font-size="13" font-weight="700" fill="${CB}">S</text><text x="212" y="116" font-size="13" font-weight="700" fill="${CA}">D</text>`;

const sNet: Scene = () => {
  const layers: [number, number][] = [
    [40, 3],
    [120, 4],
    [200, 2],
  ];
  const pos: [number, number][][] = layers.map(([x, count]) => {
    const a: [number, number][] = [];
    for (let i = 0; i < count; i++) a.push([x, 70 + (i - (count - 1) / 2) * 34]);
    return a;
  });
  let e = "";
  let p = "";
  let n = "";
  let k = 0;
  for (let i = 0; i < 2; i++) {
    pos[i].forEach((u) => {
      pos[i + 1].forEach((v) => {
        e += ln(u[0], u[1], v[0], v[1], CL, 1.5);
        p += ci(0, 0, 3, CB, mo(`M${u[0]},${u[1]} L${v[0]},${v[1]}`, 1.8, -(k++) * 0.17));
      });
    });
  }
  pos.forEach((a, li) => {
    a.forEach((u, ui) => {
      n +=
        `<circle cx="${u[0]}" cy="${u[1]}" r="9" fill="${CC}" stroke="${CA}" stroke-width="2.5">` +
        an("r", "9;11;9", 1.8, ` begin="${-(li * 0.5 + ui * 0.2)}s"`) +
        "</circle>";
    });
  });
  return e + n + p;
};

const sMusic: Scene = () => {
  let o = "";
  const xs = [40, 80, 120, 160, 200];
  const ys = [78, 66, 54, 70, 46];
  for (let i = 0; i < 5; i++) o += ln(10, 40 + i * 10, 230, 40 + i * 10, CL, 1.5);
  xs.forEach((x, i) => {
    const t = Math.min(0.9, Math.max(0.1, (x - 20) / 200));
    o +=
      ln(x + 5, ys[i], x + 5, ys[i] - 28, CM, 2) +
      ci(
        x,
        ys[i],
        5,
        i % 2 ? CB : CA,
        an(
          "r",
          "5;5;10;5;5",
          3,
          ` keyTimes="0;${(t - 0.05).toFixed(2)};${t.toFixed(2)};${(t + 0.08).toFixed(2)};1"`,
        ),
      );
  });
  return o + "<g>" + ln(20, 30, 20, 94, OR, 3) + tf("translate", "0 0;200 0", 3) + "</g>";
};

const sMol: Scene = () => {
  let o = "";
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
    const x = (120 + 46 * Math.cos(a)).toFixed(1);
    const y = (70 + 46 * Math.sin(a)).toFixed(1);
    o +=
      ln(120, 70, x, y, CM, 4) +
      ci(x, y, 12, i ? CB : RD, an("r", "11;13;11", 1.4, ` begin="${i ? -i * 0.4 : 0}s"`));
  }
  return "<g>" + o + ci(120, 70, 16, CA) + tf("rotate", "0 120 70;360 120 70", 9) + "</g>";
};

const sMath: Scene = () => {
  const f = (x: number) => 70 - 40 * Math.sin((2 * Math.PI * (x - 20)) / 100);
  let d = "M20,70";
  for (let x = 24; x <= 220; x += 4) d += ` L${x},${f(x).toFixed(1)}`;
  return (
    ln(14, 70, 230, 70, CL, 1.5) +
    ln(20, 14, 20, 126, CL, 1.5) +
    `<path d="${d}" fill="none" stroke="${CA}" stroke-width="3" stroke-linejoin="round" opacity=".5"/>` +
    ci(0, 0, 7, OR, mo(d, 5))
  );
};

const sGen: Scene = (h) => {
  const v = h % 3;
  let o = "";
  if (v === 0) {
    for (let i = 0; i < 4; i++) {
      o +=
        `<circle cx="120" cy="70" r="6" fill="none" stroke="${i % 2 ? CB : CA}" stroke-width="3">` +
        an("r", "6;62", 3.2, ` begin="${-i * 0.8}s"`) +
        an("opacity", "1;0", 3.2, ` begin="${-i * 0.8}s"`) +
        "</circle>";
    }
    o += ci(120, 70, 8, CA);
  } else if (v === 1) {
    for (let i = 0; i < 6; i++) {
      const rx = 24 + i * 13;
      const ry = 10 + i * 7;
      o += ci(
        0,
        0,
        4.5,
        i % 2 ? CB : CA,
        mo(
          `M${120 - rx},70 a${rx},${ry} 0 1,1 ${2 * rx},0 a${rx},${ry} 0 1,1 ${-2 * rx},0`,
          2.5 + i * 0.6,
          i ? -i * 0.5 : 0,
        ),
      );
    }
    o += ci(120, 70, 6, OR);
  } else {
    for (let i = 0; i < 11; i++) {
      const d = (1.6 + (i % 4) * 0.35).toFixed(2);
      o +=
        `<rect x="${22 + i * 19}" y="60" width="12" height="20" rx="4" fill="${i % 2 ? CB : CA}" opacity=".85">` +
        an("height", "20;100;40;90;20", d, ` begin="${-i * 0.2}s"`) +
        an("y", "60;20;50;25;60", d, ` begin="${-i * 0.2}s"`) +
        "</rect>";
    }
  }
  return o;
};

const SCENES: [RegExp, string, Scene][] = [
  [/music|melod|chord|pitch|rhythm|tempo|symphon|sonata|counterpoint/, "Notes sounding as a playhead sweeps the staff", sMusic],
  [/\bgenes?\b|genetic|genom|\bdna\b|\brna\b|protein|chromos|mutat|heredit|allele|evolution|\bcells?\b/, "A double helix with paired rungs", sDna],
  [/neural|machine learning|deep learning|network|algorithm|gradient|regression|classif|artificial|comput|backprop|\bai\b/, "Signals flowing through a layered network", sNet],
  [/atom|electron|quantum|nuclear|nucle|\bspin\b|particle|boson|fermion|quark|hydrogen|orbital|wave function|photon|higgs|standard model|schr|entangle/, "Electrons moving around a nucleus", sAtom],
  [/relativ|spacetime|lorentz|gravitational|curved|geodesic|black hole|einstein|equivalence principle|cosmic inflation|expansion|big bang|dark energy|curvature/, "A mass bending spacetime and a path through it", sSpace],
  [/econom|market|supply|demand|price|trade|inflation|\bgdp\b|financ|monetar|utility|game theory/, "Demand shifts and the market equilibrium moves", sEcon],
  [/field|electric|magnet|maxwell|charge|coulomb|induct|capacit|current|voltage|gauss|circuit|antenna|radiation/, "Field lines flowing from positive to negative charge", sField],
  [/interfer|diffract|superposition|ripple|doppler|standing wave/, "Two sources whose ripples overlap and interfere", sRip],
  [/wave|fourier|sound|acoustic|oscillation|signal|frequenc|dispers|vibrat/, "Traveling waves: the pattern moves, the medium only oscillates", sWave],
  [/optic|light|lens|refract|reflect|laser|polariz|spectr|fiber|photonic|\bray\b/, "A light ray bending as it enters and leaves glass", sOpt],
  [/entropy|thermo|heat|\bgas|temperature|statistic|boltzmann|diffusion|phase transition|ensemble|brownian|kinetic|fermi-dirac|bose/, "Particles in thermal motion colliding in a box", sGas],
  [/orbit|gravit|planet|cosmo|cosmic|stellar|\bstars?\b|universe|astro|galax|solar|kepler|neutron|dark matter/, "Bodies orbiting a central mass", sOrb],
  [/oscillat|pendulum|harmonic|spring|newton|mechanic|force|momentum|motion|lagrang|hamilton|least action|noether|kinematic|rotation|energy/, "A pendulum trading height for speed", sOsc],
  [/molecul|chem|\bbond|crystal|lattice|solid|matter|material|reaction|semiconduct|superconduct|phonon/, "A molecule rotating, bonds holding the atoms together", sMol],
  [/math|calculus|algebra|vector|function|probab|equation|derivat|integral|differential|geometry|\bunits?\b|dimension/, "A point tracing a function along its curve", sMath],
];

function pickScene(strs: string[]): number {
  for (const s of strs) {
    const lower = (s || "").toLowerCase();
    for (let j = 0; j < SCENES.length; j++) if (SCENES[j][0].test(lower)) return j;
  }
  return -1;
}

export interface SceneResult {
  markup: string;
  caption: string;
}

/** Picks the most relevant scene for a set of strings (topic, path, titles). */
export function renderScene(strs: string[], id: string): SceneResult {
  const j = pickScene(strs);
  const h = hash(strs[0] || "x");
  if (j < 0) return { markup: sGen(h, id), caption: "Abstract motion for this topic" };
  return { markup: SCENES[j][2](h, id), caption: SCENES[j][1] };
}
