export interface Tier {
  n: string;
  name: string;
  desc: string;
}

export interface Subsection {
  title: string;
  topics: string[];
}

export interface Section {
  title: string;
  intro: string;
  subsections: Subsection[];
}

export interface FieldMap {
  title: string;
  definition: string;
  centralIdea: string;
  tiers: Tier[];
  sections: Section[];
}

export interface Equation {
  name: string;
  formula: string;
  meaning: string;
}

export interface FrontierArea {
  area: string;
  questions: string[];
}

export interface Connection {
  layer: string;
  items: string;
}

export interface Stage {
  subjects: string;
  capability: string;
}

export interface VocabEntry {
  term: string;
  def: string;
}

export interface FieldExtras {
  equations: Equation[];
  frontier: FrontierArea[];
  connections: Connection[];
  stages: Stage[];
  vocabulary: VocabEntry[];
}

/** Deterministic parameters for a tiny generated glyph (rendered in React). */
export interface TermIcon {
  seed: number;
  colors: [string, string, string];
}

export interface TermOverview {
  summary: string;
  keyIdeas: string[];
  example: string;
  equation: string;
  related: string[];
  emoji: string;
  icon: TermIcon;
}

export interface OutlinePage {
  title: string;
  summary: string;
}

export interface BookOutline {
  pages: OutlinePage[];
}

export interface VisualItem {
  label: string;
  note: string;
}

export interface VisualSide {
  name: string;
  points: string[];
}

export type Visual =
  | {
      type: "flow" | "cycle" | "tree";
      title: string;
      caption: string;
      items: VisualItem[];
    }
  | {
      type: "compare";
      title: string;
      caption: string;
      left: VisualSide;
      right: VisualSide;
    }
  | {
      type: "plot";
      title: string;
      caption: string;
      expr: string;
      points: [number, number][];
      xmin: number;
      xmax: number;
      xlabel: string;
      ylabel: string;
    };

export interface BookPage {
  paragraphs: string[];
  callout: { title: string; text: string };
  equation: { name: string; formula: string } | null;
  keyTerms: string[];
  visual: Visual | null;
}

export type AtlasRequest =
  | { kind: "map"; path: string[] }
  | { kind: "extras"; path: string[] }
  | { kind: "term"; path: string[]; term: string }
  | { kind: "outline"; path: string[]; tier: Tier }
  | {
      kind: "page";
      path: string[];
      tier: Tier;
      pages: OutlinePage[];
      index: number;
    };
