import type { Person } from './domain.model';

// ─── Configuration ────────────────────────────────────

export interface LayoutConfig {
  readonly cardWidth: number;
  readonly cardHeight: number;
  readonly coupleGap: number;
  readonly siblingGap: number;
  readonly generationGap: number;
  readonly familyGroupGap: number;
  readonly timelineWidth: number;
  readonly padding: number;
}

export const DEFAULT_LAYOUT: LayoutConfig = {
  cardWidth: 220,
  cardHeight: 120,
  coupleGap: 30,
  siblingGap: 50,
  generationGap: 200,
  familyGroupGap: 80,
  timelineWidth: 100,
  padding: 60,
} as const;

// ─── Layout output ────────────────────────────────────

export interface LayoutNode {
  readonly id: string;
  readonly person: Person;
  x: number; // mutable — adjusted during refinement
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly generation: number;
}

export interface LayoutLink {
  readonly type: 'marriage' | 'parent-child';
  readonly connectedPersonIds: readonly string[]; // ← NEW
  readonly sourceX: number;
  readonly sourceY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly midY?: number;
}

export interface GenerationBand {
  readonly generation: number;
  readonly y: number;
  readonly height: number;
  readonly label: string;
  readonly yearRange: string;
}

export interface TimelineMarker {
  readonly year: number;
  readonly y: number;
}

export interface TreeLayout {
  readonly nodes: readonly LayoutNode[];
  readonly links: readonly LayoutLink[];
  readonly bands: readonly GenerationBand[];
  readonly timeline: readonly TimelineMarker[];
  readonly totalWidth: number;
  readonly totalHeight: number;
}
