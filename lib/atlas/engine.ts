/**
 * Field Atlas generation engine (server-side).
 *
 * This is the typed port of the offline engine from the original static
 * index.html. It is deterministic, needs no API keys, and sits behind
 * `app/api/atlas/route.ts`, so swapping in an LLM provider only means changing
 * the functions exported from this module.
 */
import type {
  AtlasRequest,
  BookOutline,
  BookPage,
  FieldExtras,
  FieldMap,
  Tier,
  TermOverview,
  Visual,
  VisualItem,
} from "./types";

import { hash } from "./hash";

const split = (s: string) => s.split("|");

const isPhysics = (t: string) => /physics/i.test(t);

const POOL = split(
  "basics|terminology|history|key figures|scope|assumptions|principles|structure|classification|notation|measurement|frameworks|methods|tools|data|analysis|modeling|simulation|case studies|experiments|evidence|theory|critique|ethics|policy|design|systems|networks|dynamics|optimization|prediction|specialties|interdisciplinary links|education|careers|industry|technology|innovation|challenges|open problems|future directions|standards|best practice|common errors|software|instruments|collaboration|communication|research methods|review articles",
);
const SECTION_NAMES = split(
  "Foundations and history|Core concepts|Formal structure|Principles and laws|Methods and techniques|Models and examples|Evidence and practice|Specializations|Applications|Frontiers and open questions",
);
const SUBSECTION_NAMES = split(
  "Origins|Key ideas|Vocabulary|Structure|Rules|Techniques|Tools|Cases|Evidence|Branches|Practice|Impact|Limits|Open questions|Trends",
);

type PhysicsSection = [string, string, [string, string][]];

const PHYSICS_SECTIONS: PhysicsSection[] = [
  ["Measurement and Mathematical Tools", "The language physics is written in.", [["Units and measurement", "SI units|Dimensional analysis|Significant figures|Scaling laws|Error analysis|Order of magnitude"], ["Mathematical tools", "Vectors|Calculus|Differential equations|Linear algebra|Fourier analysis|Probability"]]],
  ["Classical Mechanics", "Motion, force and energy from Newton to Hamilton.", [["Newtonian mechanics", "Newton's laws|Work and energy|Momentum|Rotation|Gravitation|Oscillators"], ["Analytical mechanics", "Lagrangian|Hamiltonian|Phase space|Noether's theorem|Least action|Canonical transformations"]]],
  ["Waves and Optics", "How disturbances and light propagate.", [["Wave phenomena", "Superposition|Interference|Diffraction|Standing waves|Doppler effect|Dispersion"], ["Optics", "Reflection|Refraction|Lenses|Polarization|Lasers|Fiber optics"]]],
  ["Thermodynamics and Statistical Mechanics", "From heat engines to the microscopic origin of entropy.", [["Thermodynamics", "Temperature|Heat engines|Entropy|Free energy|Phase transitions|Laws of thermodynamics"], ["Statistical mechanics", "Boltzmann distribution|Partition function|Ensembles|Ideal gas|Fermi-Dirac statistics|Bose-Einstein statistics"]]],
  ["Electromagnetism", "Electric and magnetic fields unified.", [["Fields and potentials", "Coulomb's law|Electric potential|Magnetic fields|Induction|Maxwell's equations|Gauss's law"], ["Circuits and radiation", "Circuits|Capacitance|Inductance|EM waves|Radiation|Antennas"]]],
  ["Relativity", "Space, time and gravity.", [["Special relativity", "Lorentz transformations|Time dilation|Length contraction|Mass-energy equivalence|Four-vectors|Spacetime diagrams"], ["General relativity", "Equivalence principle|Curved spacetime|Geodesics|Black holes|Gravitational waves|Cosmological solutions"]]],
  ["Quantum Mechanics", "The physics of the very small.", [["Foundations", "Wave function|Schrödinger equation|Uncertainty principle|Operators|Superposition|Measurement problem"], ["Quantum systems", "Particle in a box|Harmonic oscillator|Hydrogen atom|Spin|Entanglement|Perturbation theory"]]],
  ["Atomic, Nuclear and Particle Physics", "Matter from atoms down to quarks.", [["Atomic and molecular", "Atomic spectra|Selection rules|Molecular bonds|Quantum numbers|Zeeman effect|Fine structure"], ["Nuclear and particle", "Radioactivity|Nuclear fission|Nuclear fusion|Standard Model|Quarks|Higgs boson"]]],
  ["Condensed Matter", "Collective behavior of many particles.", [["Solids", "Crystal lattices|Band theory|Semiconductors|Phonons|Superconductivity|Magnetism"], ["Many-body phenomena", "Quantum Hall effect|Topological phases|Renormalization|Critical phenomena|Superfluidity|Liquid crystals"]]],
  ["Astrophysics, Cosmology and Frontiers", "The universe at the largest scales and the open edges.", [["Cosmos", "Stellar structure|Neutron stars|Big Bang|Cosmic microwave background|Dark matter|Dark energy"], ["Frontiers", "Quantum gravity|String theory|Quantum computing|Grand unification|Cosmic inflation|Arrow of time"]]],
];

const toTiers = (rows: string[][]): Tier[] =>
  rows.map(([n, name, desc]) => ({ n, name, desc }));

const PHYSICS_TIERS = toTiers([
  ["I", "Foundations", "Measurement, mathematics and the scientific method."],
  ["II", "Classical Physics", "Mechanics, waves, optics and electromagnetism."],
  ["III", "Thermal and Statistical Physics", "Heat, entropy and the bridge from micro to macro."],
  ["IV", "Quantum Physics", "Wave functions, operators, atoms and matter."],
  ["V", "Relativity and Fields", "Spacetime, gravity and field theory."],
  ["VI", "Frontiers", "Unification, cosmology and open problems."],
]);

const PHYSICS_EQUATIONS: [string, string, string][] = [
  ["Newton's second law", "F = m a = dp/dt", "Net force F equals mass m times acceleration a, or the rate of change of momentum p."],
  ["Maxwell: Gauss and Faraday", "∇·E = ρ/ε₀ ;  ∇×E = −∂B/∂t", "Charges source electric fields; changing magnetic fields induce electric fields."],
  ["Schrödinger equation", "iħ ∂ψ/∂t = Ĥψ", "The wave function ψ evolves under the Hamiltonian Ĥ; ħ is the reduced Planck constant."],
  ["Mass-energy equivalence", "E² = (pc)² + (mc²)²", "Total energy E combines momentum p and rest mass m with the speed of light c."],
  ["Einstein field equations", "Gμν + Λgμν = (8πG/c⁴) Tμν", "Spacetime curvature G responds to the energy-momentum content T."],
  ["Entropy (Boltzmann)", "S = k_B ln Ω", "Entropy S counts the microstates Ω compatible with a macrostate."],
  ["Heisenberg uncertainty", "Δx Δp ≥ ħ/2", "Position and momentum cannot both be sharply defined."],
  ["Euler-Lagrange equation", "d/dt(∂L/∂q̇) − ∂L/∂q = 0", "Motion extremizes the action built from the Lagrangian L."],
];

const PHYSICS_DEFS: Record<string, string> = {
  Entropy: "A measure of the number of microscopic arrangements consistent with a macroscopic state.",
  Action: "The time integral of the Lagrangian; physical paths make it stationary.",
  Boson: "A particle with integer spin that can share quantum states.",
  Fermion: "A particle with half-integer spin obeying the Pauli exclusion principle.",
  Hamiltonian: "The total-energy function or operator that generates time evolution.",
  Spacetime: "The four-dimensional arena combining space and time.",
  Superposition: "A quantum state formed by adding allowed states together.",
  Entanglement: "Correlations between quantum systems that cannot be described separately.",
};

const PHYSICS_VOCAB = split(
  "Entropy|Action|Boson|Fermion|Gauge symmetry|Hamiltonian|Lagrangian|Wave function|Spacetime|Phase transition|Superposition|Entanglement|Renormalization|Momentum|Field|Quantum number|Black body|Lorentz invariance|Phonon|Dark matter",
).map((term) => ({
  term,
  def:
    PHYSICS_DEFS[term] ??
    "A central concept of physics; see its overview for the role it plays in the wider map.",
}));

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

export function buildMap(t: string): FieldMap {
  const phys = isPhysics(t);
  let sections: FieldMap["sections"];
  let tiers: Tier[];

  if (phys) {
    sections = PHYSICS_SECTIONS.map(([title, intro, subs]) => ({
      title,
      intro,
      subsections: subs.map(([st, topics]) => ({ title: st, topics: split(topics) })),
    }));
    tiers = PHYSICS_TIERS;
  } else {
    sections = SECTION_NAMES.map((name, i) => ({
      title: name,
      intro: `How ${t} approaches ${name.toLowerCase()}.`,
      subsections: [0, 1].map((j) => {
        const k = i * 2 + j;
        const topics: string[] = [];
        for (let q = 0; q < 6; q++) topics.push(`${t} ${POOL[(k * 6 + q) % POOL.length]}`);
        return { title: SUBSECTION_NAMES[k % SUBSECTION_NAMES.length], topics };
      }),
    }));
    tiers = toTiers([
      ["I", "Foundations", `The vocabulary, history and scope of ${t}.`],
      ["II", "Core Theory", `The central ideas and principles of ${t}.`],
      ["III", "Methods and Tools", `How practitioners of ${t} work.`],
      ["IV", "Models and Cases", "Worked examples and canonical models."],
      ["V", "Applications", `Where ${t} meets the real world.`],
      ["VI", "Frontiers", "Open questions and emerging directions."],
    ]);
  }

  return {
    title: t,
    definition: phys
      ? "Physics is the natural science that studies matter, energy, space and time, and the laws governing their interactions. It spans scales from subatomic particles to the whole cosmos."
      : `${t} is a field of study with its own concepts, methods and applications. This map decomposes it from foundations to frontier research.`,
    centralIdea: phys
      ? "Nature obeys compact mathematical laws, mostly derivable from symmetries and variational principles."
      : `Every part of ${t} can be organized from foundational concepts up through methods to applications.`,
    tiers,
    sections,
  };
}

export function buildExtras(t: string): FieldExtras {
  const phys = isPhysics(t);

  const frontier: [string, string[]][] = phys
    ? [
        ["Fundamental theory", ["Can gravity be quantized?", "What is dark matter?", "Why is the cosmological constant so small?"]],
        ["Quantum foundations", ["What constitutes a measurement?", "Is quantum mechanics complete?", "Can large-scale quantum computers be built?"]],
        ["Complex matter", ["What drives high-temperature superconductivity?", "Is turbulence fully predictable?", "How do topological phases classify matter?"]],
        ["Cosmic origins", ["What set off inflation?", "Why more matter than antimatter?", "What is the arrow of time?"]],
      ]
    : ["Theory", "Methods", "Applications", "Society"].map((a): [string, string[]] => [
        a,
        [
          `What is still unexplained in ${t} ${a.toLowerCase()}?`,
          `Which assumptions of ${t} are most fragile?`,
          `What tools would unlock progress in ${t}?`,
        ],
      ]);

  const connections: [string, string][] = phys
    ? [
        ["Mathematics", "Calculus, linear algebra, differential equations, probability"],
        ["Classical", "Mechanics, waves, thermodynamics, electromagnetism"],
        ["Modern", "Relativity, quantum mechanics, statistical mechanics"],
        ["Fields", "Quantum field theory, Standard Model, general relativity"],
        ["Applied", "Materials, optics, nuclear, astrophysics, devices"],
      ]
    : [
        ["Foundations", `Concepts, history and vocabulary of ${t}`],
        ["Theory", "Principles and formal structure"],
        ["Methods", "Techniques, tools and measurement"],
        ["Models", "Canonical examples and simulations"],
        ["Practice", "Applications and professional use"],
      ];

  const stages: [string, string][] = phys
    ? [
        ["Algebra, trigonometry, vectors", "Describe motion and forces"],
        ["Calculus", "Derive kinematics and energy"],
        ["Newtonian mechanics", "Solve classical dynamics"],
        ["Waves and optics", "Model oscillation and light"],
        ["Electromagnetism", "Use Maxwell's equations"],
        ["Thermodynamics", "Reason about heat and entropy"],
        ["Linear algebra and ODEs", "Handle quantum formalism"],
        ["Quantum mechanics", "Solve atoms and spin systems"],
        ["Special relativity", "Work in four-vectors"],
        ["Statistical and field theory", "Link micro to macro"],
      ]
    : [
        ["Orientation", `Know the scope and vocabulary of ${t}`],
        ["Core concepts", "Explain the main ideas"],
        ["Formal tools", "Read the standard literature"],
        ["Methods", "Apply standard techniques"],
        ["Case studies", "Analyze real examples"],
        ["Specialization", "Choose a subfield"],
        ["Advanced topics", "Engage with current research"],
        ["Original work", "Contribute new results"],
      ];

  const vocabulary = phys
    ? PHYSICS_VOCAB
    : POOL.slice(0, 30).map((w) => ({
        term: `${t} ${w}`,
        def: `The ${w} aspect of ${t}, treated as a distinct area of study.`,
      }));

  return {
    equations: phys
      ? PHYSICS_EQUATIONS.map(([name, formula, meaning]) => ({ name, formula, meaning }))
      : [],
    frontier: frontier.map(([area, questions]) => ({ area, questions })),
    connections: connections.map(([layer, items]) => ({ layer, items })),
    stages: stages.map(([subjects, capability]) => ({ subjects, capability })),
    vocabulary,
  };
}

/* ------------------------------------------------------------------ */
/* Term overview                                                       */
/* ------------------------------------------------------------------ */

const EMOJI = split("🔬|⚛️|🧭|📐|🧪|🌌|📊|🧠|⚙️|🔭|🧬|💡");
const ICON_COLORS = ["#7c93ff", "#f0813a", "#4fd1d3", "#e5589a", "#46c06a", "#f5b13d"];

export function buildOverview(term: string, field: string): TermOverview {
  const h = hash(term);
  return {
    summary: `${term} is a recognized topic within ${field}. It organizes a set of related ideas, methods and results that practitioners use to explain observations and make predictions.`,
    keyIdeas: [
      `Defines the central objects and terms of ${term}`,
      "Connects to neighboring topics through shared principles",
      "Is tested by examples, measurement or derivation",
    ],
    example: `A typical use of ${term} is solving a representative problem in ${field} by applying its core definition and checking the result against known cases.`,
    equation: "",
    related: [POOL[h % POOL.length], POOL[(h + 7) % POOL.length], POOL[(h + 19) % POOL.length]].map(
      (w) => `${term.split(" ")[0]} ${w}`,
    ),
    emoji: EMOJI[h % EMOJI.length],
    icon: {
      seed: h,
      colors: [ICON_COLORS[h % 6], ICON_COLORS[(h >>> 3) % 6], ICON_COLORS[(h >>> 6) % 6]],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Book: outline + pages                                               */
/* ------------------------------------------------------------------ */

const PHYSICS_PAGES: Record<string, string[]> = {
  I: ["Units and dimensional analysis", "Vectors and calculus", "Probability and error analysis", "Differential equations", "Fourier analysis", "Scientific modeling"],
  II: ["Newton's laws and the pendulum", "Energy and oscillators", "Gravitation and orbits", "Waves and interference", "Optics: refraction and lenses", "Electric and magnetic fields"],
  III: ["Temperature and heat", "Entropy and the second law", "Gas kinetic theory", "Boltzmann distribution", "Phase transitions", "Heat engines"],
  IV: ["The wave function", "The Schrödinger equation", "The hydrogen atom", "Spin and entanglement", "Quantum particles and fields", "Atomic spectra"],
  V: ["Special relativity", "Spacetime and Lorentz transformations", "Curved spacetime and gravity", "Black holes", "Gravitational waves", "Fields and gauge symmetry"],
  VI: ["Quantum gravity", "Dark matter and dark energy", "Cosmic inflation", "The arrow of time", "Quantum computing", "Grand unification"],
};

export function buildOutline(path: string[], tier: Tier): BookOutline {
  const T = path[path.length - 1] ?? "Field";
  if (isPhysics(T) && PHYSICS_PAGES[tier.n]) {
    return {
      pages: PHYSICS_PAGES[tier.n].map((x) => ({
        title: x,
        summary: `How ${x.toLowerCase()} fits into ${tier.name.toLowerCase()}.`,
      })),
    };
  }
  const topics = [
    "Orientation and scope",
    "Core definitions",
    "Key principles",
    "Worked examples",
    "Methods in practice",
    "Connections and limits",
    "Looking ahead",
  ];
  return {
    pages: topics.map((x) => ({
      title: `${x} in ${T}`,
      summary: `A guided look at ${x.toLowerCase()} for ${tier.name.toLowerCase()}.`,
    })),
  };
}

const PLOTS: { expr: string; fn: (x: number) => number }[] = [
  { expr: "sin(x) · e^(−x/6)", fn: (x) => Math.sin(x) * Math.exp(-x / 6) },
  { expr: "x² / 4", fn: (x) => (x * x) / 4 },
  { expr: "e^(−x²/2)", fn: (x) => Math.exp((-x * x) / 2) },
  { expr: "1 / (1 + e^(−x))", fn: (x) => 1 / (1 + Math.exp(-x)) },
  { expr: "sin(x) + 0.5 sin(3x)", fn: (x) => Math.sin(x) + 0.5 * Math.sin(3 * x) },
];

function plotPoints(fn: (x: number) => number, xmin: number, xmax: number): [number, number][] {
  const N = 140;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = xmin + ((xmax - xmin) * i) / N;
    pts.push([+x.toFixed(3), +fn(x).toFixed(4)]);
  }
  return pts;
}

export function buildPage(
  path: string[],
  tier: Tier,
  pages: { title: string; summary: string }[],
  k: number,
): BookPage {
  const T = path[path.length - 1] ?? "Field";
  const ti = pages[k].title.split(":")[0].toLowerCase();
  const n = tier.name.toLowerCase();
  const ty = k % 5;

  const items: VisualItem[] = [
    ["Observe", "Notice a pattern"],
    ["Model", "Propose a rule"],
    ["Test", "Compare to data"],
    ["Refine", "Improve the model"],
  ].map(([label, note]) => ({ label, note: `${note} in ${T}` }));

  let visual: Visual | null = null;
  if (ty === 0) visual = { type: "flow", title: `How ${T} advances`, caption: "A typical cycle of progress.", items };
  if (ty === 1) visual = { type: "cycle", title: "The working loop", caption: "Understanding returns to observation.", items };
  if (ty === 2)
    visual = {
      type: "compare",
      title: "Two ways of seeing it",
      caption: "Complementary perspectives.",
      left: { name: "Conceptual", points: ["Intuition first", "Qualitative reasoning", "Broad overview"] },
      right: { name: "Formal", points: ["Definitions first", "Quantitative derivation", "Precise limits"] },
    };
  if (ty === 3)
    visual = {
      type: "tree",
      title: `Anatomy of ${n}`,
      caption: "One idea branching into parts.",
      items: [
        { label: tier.name, note: "" },
        { label: "Concepts", note: "What exists" },
        { label: "Laws", note: "How it behaves" },
        { label: "Methods", note: "How we know" },
      ],
    };
  if (ty === 4) {
    const plot = PLOTS[k % PLOTS.length];
    visual = {
      type: "plot",
      title: "A representative relationship",
      caption: "An illustrative curve, not a measured result.",
      expr: plot.expr,
      points: plotPoints(plot.fn, -6, 6),
      xmin: -6,
      xmax: 6,
      xlabel: "input",
      ylabel: "response",
    };
  }

  const h = hash(ti);
  const phys = isPhysics(T);

  return {
    paragraphs: [
      `Every serious study of ${T} begins by asking what must be explained. In this part, ${n}, the focus of this page is ${ti}: the point where scattered observations are gathered into a structure that can be reasoned about and reused.`,
      `The first step is to fix the vocabulary. Terms in ${T} are chosen carefully because small differences in meaning change what can be derived. Readers who master the definitions find that later arguments become short, almost mechanical, rather than mysterious.`,
      `From there the discussion turns to how the ideas are used. A principle is only as valuable as the problems it solves, so practitioners test each idea on simple cases before trusting it on complicated ones. This is how confidence in ${ti} is earned.`,
      `Finally, every framework has limits. Recognizing where the present account of ${ti} stops working is what points toward the next page, the next part of the map, and ultimately the open questions at the edge of ${T}.`,
    ],
    callout: {
      title: "Analogy",
      text: `Think of ${ti} as a map legend: it does not describe the territory itself, but tells you how to read every region of it.`,
    },
    equation: phys && k % 3 === 0 ? { name: "Illustrative: Newton's second law", formula: "F = m a" } : null,
    keyTerms: [
      `${T} ${POOL[h % POOL.length]}`,
      `${T} ${POOL[(h + 5) % POOL.length]}`,
      tier.name,
      `${T} ${POOL[(h + 11) % POOL.length]}`,
      `${T} ${POOL[(h + 23) % POOL.length]}`,
    ],
    visual,
  };
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function runRequest(req: AtlasRequest): unknown {
  const topic = req.path[req.path.length - 1] ?? "Field";
  switch (req.kind) {
    case "map":
      return buildMap(topic);
    case "extras":
      return buildExtras(topic);
    case "term":
      return buildOverview(req.term, topic);
    case "outline":
      return buildOutline(req.path, req.tier);
    case "page":
      return buildPage(req.path, req.tier, req.pages, req.index);
  }
}
