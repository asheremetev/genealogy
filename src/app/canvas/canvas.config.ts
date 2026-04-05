import type { CanvasBorder, CanvasTextAlign } from './canvas.types';

// Must match `cardDim.w` in FamilyTreeService.
// CARD_W + 40 === cardXSpacing in DEFAULT_TREE_SETTINGS (40 is the horizontal gap).
export const CARD_W = 220;
export const CARD_H = 80;
export const YEAR_NODE_W = 100;
export const YEAR_NODE_H = 28;

// Generation label column
export const GEN_LABEL_W = 80;
export const GEN_LABEL_GAP = 24;

// Timeline column geometry
// Layout: [event label][year badge]|axis|[year badge][event label]
export const TIMELINE_GAP = 80;
export const TIMELINE_EVENT_W = 300;
export const TIMELINE_AXIS_W = 4;
export const TIMELINE_YEAR_W = 100;
export const TIMELINE_EVENT_H = 28;
export const TIMELINE_MIN_SPACING = TIMELINE_EVENT_H + 6;

export const CANVAS_CONFIG = {
    /**
     * Card background color per generation (index cycles).
     * Accepts Obsidian preset strings '1'–'6' or CSS hex.
     */
    generationCardColors: ['1', '2', '3', '4', '5', '6'] as string[],

    /** Border style for person cards. */
    cardBorder: 'thin' as CanvasBorder,

    /** Male gender stripe color — vertical bar on the left edge of each card (CSS hex). */
    maleStripeColor: '#3b82f6',
    /** Female gender stripe color — vertical bar on the left edge of each card (CSS hex). */
    femaleStripeColor: '#ef4444',

    /** Stripe width in pixels. Obsidian's internal text padding (~16 px) keeps text clear. */
    stripeWidth: 8,

    /** Marriage edge color. Obsidian preset ('1'–'6') or CSS hex. */
    marriageEdgeColor: '4',

    /** Year label node color. Same format as marriageEdgeColor. */
    yearNodeColor: '4',

    /** Text alignment inside person cards and all auxiliary nodes. */
    textAlign: 'center' as CanvasTextAlign,

    /** Show a G0/G1/G2… label column to the left of the tree. */
    showGenerationLabels: true,

    /** Generation label color per generation (index cycles). Obsidian preset or hex. */
    generationLabelColors: ['1', '2', '3', '4', '5', '6'] as string[],

    /** Show a Russian historical events timeline to the right of the tree. */
    showTimeline: true,

    /** Timeline event node color. Obsidian preset or CSS hex. */
    timelineEventColor: undefined as string | undefined,

    /** Timeline year badge color. Obsidian preset or CSS hex. */
    timelineYearColor: '0' as string | undefined,

    /** Timeline vertical axis color. Obsidian preset or CSS hex. */
    timelineAxisColor: '0' as string | undefined,

    /** Show a title block in the top-left corner of the exported canvas. */
    showTitle: true,

    /** Title text displayed in the top-left corner. */
    titleText: 'Генеалогическое древо моей семьи',

    /**
     * Markdown heading level that controls the visual font size in Obsidian.
     * 1 = largest (# H1), 2 = ## H2, … 6 = smallest.
     */
    titleHeadingLevel: 1 as 1 | 2 | 3 | 4 | 5 | 6,

    /** Title node color. Obsidian preset ('1'–'6') or CSS hex. */
    titleColor: '1' as string | undefined,

    /** Title node width in pixels. */
    titleWidth: 700,

    /** Title node height in pixels. */
    titleHeight: 100,
};
