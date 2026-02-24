export const COLORS = {
  gender: {
    M: '#4A90D9',
    F: '#D94A8E',
    unknown: '#999999',
  },
  genderFill: {
    M: '#E0EDFF',
    F: '#FFE0ED',
    unknown: '#F0F0F0',
  },
  marriage: '#DAA520',
  parentChild: '#8B8B8B',
  card: {
    bg: '#FFFFFF',
    bgDeceased: '#F8F8F8',
    border: '#E0E0E0',
  },
  band: {
    even: 'rgba(59, 130, 246, 0.04)',
    odd: 'rgba(59, 130, 246, 0.08)',
    text: '#94A3B8',
  },
  timeline: '#64748B',
  text: {
    primary: '#1E293B',
    secondary: '#64748B',
    muted: '#94A3B8',
    faint: '#CBD5E1',
  },
  confidence: {
    high: '#22C55E',
    medium: '#F59E0B',
    low: '#F97316',
    speculative: '#EF4444',
  },
} as const;

export const CONFIDENCE_OPACITY: Readonly<Record<string, number>> = {
  high: 1.0,
  medium: 0.85,
  low: 0.65,
  speculative: 0.5,
};

export const GENERATION_LABELS: Readonly<Record<number, string>> = {
  [-2]: 'Great-grandchildren',
  [-1]: 'Children',
  0: 'Proband',
  1: 'Parents',
  2: 'Grandparents',
  3: 'Great-grandparents',
  4: '2×Great-grandparents',
  5: '3×Great-grandparents',
};

export function getGenerationLabel(gen: number): string {
  return GENERATION_LABELS[gen] ?? `Generation ${gen}`;
}

/** Deterministic HSL color from surname string */
export function surnameColor(surname: string): string {
  let hash = 0;
  for (let i = 0; i < surname.length; i++) {
    hash = surname.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}
