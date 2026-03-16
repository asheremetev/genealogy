import type { Datum } from 'family-chart';
import type { CanvasBorder, CanvasTextAlign } from '../models/canvas.model';
import type { PersonData } from '../models/person.model';

interface TreeNodeDatum {
    readonly data: { readonly id: string; readonly data: PersonData };
    readonly x: number;
    readonly y: number;
}

interface CanvasNode {
    readonly id: string;
    readonly type: 'text';
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly color?: string;
    readonly styleAttributes?: {
        readonly textAlign?: CanvasTextAlign;
        readonly border?: CanvasBorder;
    };
}

interface CanvasEdge {
    readonly id: string;
    readonly fromNode: string;
    readonly fromSide: string;
    readonly toNode: string;
    readonly toSide: string;
    readonly toEnd: string;
    readonly color?: string;
    readonly styleAttributes?: {
        readonly pathfindingMethod: string;
    };
}

interface HistoricalEvent {
    readonly year: number;
    readonly label: string;
}

// Must match `cardDim.w` in FamilyTreeService.
// CARD_W + 40 === cardXSpacing in DEFAULT_TREE_SETTINGS (40 is the horizontal gap).
const CARD_W = 220;
const CARD_H = 80;
const YEAR_NODE_W = 100;
const YEAR_NODE_H = 28;

// Generation label column
const GEN_LABEL_W = 80; // wide enough for "G10", "G11" etc.
const GEN_LABEL_GAP = 24;

// Timeline column geometry
// Layout: [event label][year badge]|axis|[year badge][event label]
// Year badge and event label share the same height and touch the axis without gaps.
const TIMELINE_GAP = 80; // gap between rightmost card and timeline area
const TIMELINE_EVENT_W = 300; // wide enough for "Великая Отечественная война" in one line
const TIMELINE_AXIS_W = 4; // vertical axis width
const TIMELINE_YEAR_W = 100; // wide enough for "1670–1672" in one line
const TIMELINE_EVENT_H = 28; // shared height for both year badge and event label
const TIMELINE_MIN_SPACING = TIMELINE_EVENT_H + 6; // min px between consecutive events

/**
 * Russian historical events shown in the canvas timeline.
 * Events outside the family tree's year range (±50 yr) are filtered out automatically.
 * Add, remove, or edit entries freely.
 */
const HISTORICAL_EVENTS: readonly HistoricalEvent[] = [
    { year: 1670, label: 'Восстание Степана Разина' },
    { year: 1703, label: 'Основание Петербурга' },
    { year: 1762, label: 'Эпоха Екатерины II' },
    { year: 1773, label: 'Пугачёвское восстание' },
    { year: 1812, label: 'Отечественная война' },
    { year: 1825, label: 'Восстание декабристов' },
    { year: 1853, label: 'Крымская война' },
    { year: 1861, label: 'Отмена крепостного права' },
    { year: 1877, label: 'Русско-турецкая война' },
    { year: 1881, label: 'Убийство Александра II' },
    { year: 1904, label: 'Русско-японская война' },
    { year: 1905, label: 'Революция 1905 г.' },
    { year: 1914, label: 'Первая мировая война' },
    { year: 1917, label: 'Октябрьская революция' },
    { year: 1918, label: 'Гражданская война' },
    { year: 1941, label: 'Великая Отечественная война' },
    { year: 1945, label: 'Победа в ВОВ' },
    { year: 1961, label: 'Полёт Гагарина' },
    { year: 1991, label: 'Распад СССР' },
    { year: 2020, label: 'Пандемия COVID-19' },
];

/**
 * Central configuration for canvas export appearance.
 * Edit this object to change colors, stripe width, text alignment, and which
 * decorative elements are shown — no other changes required.
 */
const CANVAS_CONFIG = {
    /**
     * Card background color for all person nodes.
     * Accepts an Obsidian preset string ('1'–'6') or a CSS hex string like '#2d3748'.
     * Set to undefined to use the default Obsidian card color.
     */
    cardColor: undefined as string | undefined,

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

    /**
     * Text alignment inside person cards and all auxiliary nodes.
     * Applied via Obsidian Canvas native styleAttributes.textAlign.
     */
    textAlign: 'center' as CanvasTextAlign,

    /** Show a G0 / G1 / G2 … label column to the left of the tree. */
    showGenerationLabels: true,
    /**
     * Generation label node color. Obsidian preset ('1'–'6') or CSS hex.
     * '6' renders as purple in the default Obsidian theme.
     */
    generationLabelColor: '6' as string | undefined,

    /** Show a Russian historical events timeline to the right of the tree. */
    showTimeline: true,
    /**
     * Timeline event node color. Obsidian preset ('1'–'6') or CSS hex.
     * '1' renders as gray/red in the default Obsidian theme.
     */
    timelineEventColor: undefined as string | undefined,

    /**
     * Timeline year badge color. Obsidian preset ('1'–'6') or CSS hex.
     * Dashed border styling is not supported in Canvas JSON — use color to distinguish.
     */
    timelineYearColor: '0' as string | undefined,

    /**
     * Timeline vertical axis color. Obsidian preset ('1'–'6') or CSS hex.
     */
    timelineAxisColor: '0' as string | undefined,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract year string, preserving leading ~ for approximate dates */
function extractYear(dateStr: string): string | null {
    if (!dateStr) {
        return null;
    }
    const approx = dateStr.startsWith('~');
    const match = dateStr.match(/(\d{4})/);
    if (!match) {
        return null;
    }
    return approx ? `~${match[1]}` : match[1];
}

/** Shorten verbose place names to fit in the 240px node width */
function shortenPlace(place: string): string {
    if (!place) return '';
    if (place.includes('Санкт-Петербург')) return 'г. СПб';
    if (place.includes('Москва')) return 'г. Москва';
    if (place.includes('Ярославская')) return 'Ярославск. губ.';
    if (place.includes('Псковская') || place.includes('Новосокольн')) return 'Псковская губ.';
    if (place.includes('Горбово')) return 'д. Горбово';
    if (place.includes('Бровцыно')) return 'д. Бровцыно';
    if (place.includes('Парнева')) return 'д. Парнева';
    return place;
}

/**
 * Strip the birth year in parentheses from the end of the person ID.
 * Result is used as the wiki link display alias so the year isn't shown twice.
 */
function displayName(personId: string): string {
    return personId.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/** Build the subtitle line: "~1779 — 1849 · д. Горбово" */
function buildDateLine(pd: PersonData): string {
    const birthYear = extractYear(pd.birthDate);
    const deathYear = extractYear(pd.deathDate);
    const place = shortenPlace(pd.birthPlace);

    let dateLine = '';
    if (birthYear && deathYear) {
        dateLine = `${birthYear} — ${deathYear}`;
    } else if (birthYear) {
        dateLine = birthYear;
    }
    if (place) {
        dateLine = dateLine ? `${dateLine} · ${place}` : place;
    }
    return dateLine;
}

/** Join non-empty text lines into a single string. */
function formatCardText(lines: string[]): string {
    return lines.filter(Boolean).join('\n');
}

/** Returns styleAttributes spread when textAlign is not 'left'. */
function alignAttrs(): { styleAttributes: { textAlign: CanvasTextAlign } } | Record<never, never> {
    return CANVAS_CONFIG.textAlign !== 'left'
        ? { styleAttributes: { textAlign: CANVAS_CONFIG.textAlign } }
        : {};
}

/**
 * Returns styleAttributes for timeline nodes.
 * @param align  'left' for right-side nodes, 'right' for left-side nodes.
 * @param border Optional border style (year badges use 'dashed').
 */
function timelineAttrs(
    align: CanvasTextAlign,
    border?: CanvasBorder,
): { styleAttributes: { textAlign: CanvasTextAlign; border?: CanvasBorder } } {
    return border
        ? { styleAttributes: { textAlign: align, border } }
        : { styleAttributes: { textAlign: align, border: 'invisible' } };
}

// ---------------------------------------------------------------------------
// Generation label column
// ---------------------------------------------------------------------------

/**
 * Builds a column of G0/G1/G2… nodes to the left of the tree.
 * Each label is vertically centered on the average Y of all cards in that generation.
 */
function buildGenerationLabels(
    nodeById: Map<string, { id: string; x: number; y: number }>,
    personDataMap: Map<string, PersonData>,
    treeMinX: number,
    genId: () => string,
): CanvasNode[] {
    const genYs = new Map<number, number[]>();

    for (const [personId, pos] of nodeById.entries()) {
        const gen = personDataMap.get(personId)?.generation;
        if (gen == null) continue;
        const arr = genYs.get(gen) ?? [];
        arr.push(pos.y);
        genYs.set(gen, arr);
    }

    const labelX = treeMinX - GEN_LABEL_GAP - GEN_LABEL_W;
    const nodes: CanvasNode[] = [];

    for (const [gen, ys] of genYs.entries()) {
        const sorted = [...ys].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const medianY =
            sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
        nodes.push({
            id: genId(),
            type: 'text',
            text: `G${gen}`,
            x: labelX,
            y: medianY,
            width: GEN_LABEL_W,
            height: CARD_H,
            color: CANVAS_CONFIG.generationLabelColor,
            ...alignAttrs(),
        });
    }

    return nodes;
}

// ---------------------------------------------------------------------------
// Historical timeline
// ---------------------------------------------------------------------------

/**
 * Builds a historical events timeline to the right of the tree.
 *
 * Layout: a central vertical axis with events alternating left and right.
 * Year badges sit on the axis; event description nodes flank it.
 *
 * Year → Y mapping: average birth year per generation is used as interpolation
 * anchors, so events align with the approximate era of each generation row.
 */
function buildTimeline(
    nodeById: Map<string, { id: string; x: number; y: number }>,
    personDataMap: Map<string, PersonData>,
    treeMaxX: number,
    genId: () => string,
): CanvasNode[] {
    // Collect birth years and Y positions per generation for interpolation anchors
    const genBirthYears = new Map<number, number[]>();
    const genYPositions = new Map<number, number[]>();

    for (const [personId, pos] of nodeById.entries()) {
        const pd = personDataMap.get(personId);
        if (!pd) continue;
        const gen = pd.generation;
        if (gen == null) continue;

        const yearStr = extractYear(pd.birthDate);
        if (yearStr) {
            const year = parseInt(yearStr.replace('~', ''), 10);
            if (!isNaN(year)) {
                const arr = genBirthYears.get(gen) ?? [];
                arr.push(year);
                genBirthYears.set(gen, arr);
            }
        }

        const ys = genYPositions.get(gen) ?? [];
        ys.push(pos.y);
        genYPositions.set(gen, ys);
    }

    // Build sorted (avgBirthYear → avgY) anchors
    const anchors: Array<{ year: number; y: number }> = [];
    for (const [gen, years] of genBirthYears.entries()) {
        const avgYear = Math.round(years.reduce((a, b) => a + b, 0) / years.length);
        const ys = genYPositions.get(gen) ?? [];
        const avgY = Math.round(ys.reduce((a, b) => a + b, 0) / ys.length);
        anchors.push({ year: avgYear, y: avgY });
    }
    anchors.sort((a, b) => a.year - b.year);

    if (anchors.length < 2) return [];

    function yearToY(year: number): number {
        if (year <= anchors[0].year) return anchors[0].y;
        if (year >= anchors[anchors.length - 1].year) return anchors[anchors.length - 1].y;
        for (let i = 0; i < anchors.length - 1; i++) {
            const a = anchors[i];
            const b = anchors[i + 1];
            if (year >= a.year && year <= b.year) {
                const t = (year - a.year) / (b.year - a.year);
                return Math.round(a.y + t * (b.y - a.y));
            }
        }
        return anchors[anchors.length - 1].y;
    }

    // Filter to the data year range with a ±50-year buffer
    const dataMinYear = anchors[0].year;
    const dataMaxYear = anchors[anchors.length - 1].year;
    const relevantEvents = HISTORICAL_EVENTS.filter(
        (e) => e.year >= dataMinYear - 50 && e.year <= dataMaxYear + 50,
    );

    if (relevantEvents.length === 0) return [];

    // Enforce minimum vertical spacing so dense events don't overlap
    const rawYs = relevantEvents.map((e) => yearToY(e.year));
    const spacedYs: number[] = [];
    for (let i = 0; i < rawYs.length; i++) {
        const ideal = rawYs[i];
        const prev = spacedYs[i - 1] ?? -Infinity;
        spacedYs.push(Math.max(ideal, prev + TIMELINE_MIN_SPACING));
    }

    // Timeline geometry:
    //   [← event label] [  year badge  ] [event label →]
    //                         |axis|
    // Year badge is centered on the axis; event labels flank it on left/right.
    const timelineBaseX = treeMaxX + TIMELINE_GAP;
    const axisX = timelineBaseX + TIMELINE_EVENT_W + TIMELINE_YEAR_W / 2 - TIMELINE_AXIS_W / 2;
    const leftEventX = timelineBaseX;
    const yearX = axisX - Math.floor((TIMELINE_YEAR_W - TIMELINE_AXIS_W) / 2);
    const rightEventX =
        axisX + TIMELINE_AXIS_W + Math.ceil((TIMELINE_YEAR_W - TIMELINE_AXIS_W) / 2);

    // Vertical axis — spans from first to last event
    const axisTop = spacedYs[0] - 20;
    const axisBottom = spacedYs[spacedYs.length - 1] + TIMELINE_EVENT_H + 20;

    const axisNode: CanvasNode = {
        id: genId(),
        type: 'text',
        text: '',
        x: axisX,
        y: axisTop,
        width: TIMELINE_AXIS_W,
        height: axisBottom - axisTop,
        color: CANVAS_CONFIG.timelineAxisColor,
    };

    // Year badges and event nodes (year badges rendered after axis to appear on top)
    const yearBadges: CanvasNode[] = [];
    const eventNodes: CanvasNode[] = [];

    relevantEvents.forEach((event, i) => {
        const cy = spacedYs[i];
        const isLeft = i % 2 === 0;
        // Left-side nodes align text to the right (toward axis); right-side to the left.
        const align: CanvasTextAlign = isLeft ? 'right' : 'left';
        const nodeY = cy - TIMELINE_EVENT_H / 2;

        yearBadges.push({
            id: genId(),
            type: 'text',
            text: `${event.year}`,
            x: yearX,
            y: nodeY,
            width: TIMELINE_YEAR_W,
            height: TIMELINE_EVENT_H,
            color: CANVAS_CONFIG.timelineYearColor,
            ...timelineAttrs('center', 'dashed'),
        });

        eventNodes.push({
            id: genId(),
            type: 'text',
            text: event.label,
            x: isLeft ? leftEventX : rightEventX,
            y: nodeY,
            width: TIMELINE_EVENT_W,
            height: TIMELINE_EVENT_H,
            color: CANVAS_CONFIG.timelineEventColor,
            ...timelineAttrs(align),
        });
    });

    // axis first (lowest z), then event labels, then year badges on top of axis
    return [axisNode, ...eventNodes, ...yearBadges];
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Builds an Obsidian Canvas JSON object from the current family-chart DOM state.
 *
 * Enrichment applied:
 *  - All cards share the same color (CANVAS_CONFIG.cardColor)
 *  - A thin gender stripe node overlaps the left edge of each card
 *  - Text alignment via native Obsidian Canvas styleAttributes
 *  - Birth/death year + birth place subtitle in each node
 *  - Marriage edges route top→top (arc above nodes)
 *  - Small year text nodes placed above each spouse pair
 *  - G0/G1/G2… generation label column on the left (toggleable)
 *  - Russian historical events timeline on the right (toggleable)
 *  - A full-canvas group node wrapping everything
 */
export function buildCanvasJson(container: HTMLElement, data: Datum[]): object {
    let counter = 0;
    const genId = (): string => (++counter).toString(16).padStart(16, '0');

    const personDataMap = new Map<string, PersonData>();
    for (const datum of data) {
        personDataMap.set(datum.id, datum.data as PersonData);
    }

    // Read card positions from D3-bound data on each rendered card element
    const nodeById = new Map<string, { id: string; x: number; y: number }>();
    const cards = container.querySelectorAll<HTMLElement>('div.card_cont');

    cards.forEach((card) => {
        const d = (card as unknown as { __data__: TreeNodeDatum }).__data__;
        if (!d?.data?.data?.firstName) {
            return; // skip empty placeholder cards
        }
        nodeById.set(d.data.id, { id: genId(), x: Math.round(d.x), y: Math.round(d.y) });
    });

    // Build person card nodes and gender stripe nodes separately.
    // Stripes are appended after cards so they render on top (left-edge overlay).
    const cardNodes: CanvasNode[] = [];
    const stripeNodes: CanvasNode[] = [];

    for (const [personId, pos] of nodeById.entries()) {
        const pd = personDataMap.get(personId);
        const alias = displayName(personId);
        const link = alias !== personId ? `[[${personId}|${alias}]]` : `[[${personId}]]`;
        const dateLine = pd ? buildDateLine(pd) : '';

        cardNodes.push({
            id: pos.id,
            type: 'text',
            text: formatCardText([link, dateLine]),
            x: pos.x,
            y: pos.y,
            width: CARD_W,
            height: CARD_H,
            color: CANVAS_CONFIG.cardColor,
            ...alignAttrs(),
        });

        // Thin stripe overlapping the left edge of the card — renders on top of the card
        stripeNodes.push({
            id: genId(),
            type: 'text',
            text: '',
            x: pos.x,
            y: pos.y,
            width: CANVAS_CONFIG.stripeWidth,
            height: CARD_H,
            color:
                pd?.gender === 'M'
                    ? CANVAS_CONFIG.maleStripeColor
                    : CANVAS_CONFIG.femaleStripeColor,
        });
    }

    const extraNodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];
    const addedEdges = new Set<string>();

    data.forEach((datum) => {
        const fromPos = nodeById.get(datum.id);
        if (!fromPos) {
            return;
        }

        // Parent → child
        (datum.rels.children ?? []).forEach((childId) => {
            const toPos = nodeById.get(childId);
            if (!toPos) {
                return;
            }
            const key = `${datum.id}→${childId}`;
            if (addedEdges.has(key)) {
                return;
            }
            addedEdges.add(key);
            edges.push({
                id: genId(),
                fromNode: fromPos.id,
                fromSide: 'bottom',
                toNode: toPos.id,
                toSide: 'top',
                toEnd: 'none',
                styleAttributes: { pathfindingMethod: 'square' },
            });
        });

        // Spouse ↔ (once per pair, left→right)
        (datum.rels.spouses ?? []).forEach((spouseId) => {
            const toPos = nodeById.get(spouseId);
            if (!toPos) {
                return;
            }
            const key = [datum.id, spouseId].sort().join('—');
            if (addedEdges.has(key)) {
                return;
            }
            addedEdges.add(key);

            const leftIsFrom = fromPos.x <= toPos.x;
            const leftPersonId = leftIsFrom ? datum.id : spouseId;
            const rightPersonId = leftIsFrom ? spouseId : datum.id;
            const leftPos = leftIsFrom ? fromPos : toPos;
            const rightPos = leftIsFrom ? toPos : fromPos;

            // Marriage edge routes above both nodes so the year label doesn't overlap
            edges.push({
                id: genId(),
                fromNode: leftPos.id,
                fromSide: 'top',
                toNode: rightPos.id,
                toSide: 'top',
                toEnd: 'none',
                color: CANVAS_CONFIG.marriageEdgeColor,
                styleAttributes: { pathfindingMethod: 'square' },
            });

            // Small year text node positioned above the arc midpoint
            const pdLeft = personDataMap.get(leftPersonId);
            const pdRight = personDataMap.get(rightPersonId);
            const marriageDate =
                pdLeft?.marriages?.[rightPersonId] ?? pdRight?.marriages?.[leftPersonId];
            if (!marriageDate) return;

            const year = extractYear(marriageDate);
            if (!year) return;

            const midX = Math.round((leftPos.x + rightPos.x + CARD_W) / 2);
            const topY = Math.min(leftPos.y, rightPos.y);
            extraNodes.push({
                id: genId(),
                type: 'text',
                text: year,
                x: midX - YEAR_NODE_W / 2,
                y: topY - YEAR_NODE_H - 10,
                width: YEAR_NODE_W,
                height: YEAR_NODE_H,
                color: CANVAS_CONFIG.yearNodeColor,
                ...alignAttrs(),
            });
        });
    });

    // Compute tree bounds (card nodes only) — needed for placing side columns
    const treeMinX = cardNodes.length > 0 ? Math.min(...cardNodes.map((n) => n.x)) : 0;
    const treeMaxX = cardNodes.length > 0 ? Math.max(...cardNodes.map((n) => n.x + n.width)) : 0;

    const genLabelNodes = CANVAS_CONFIG.showGenerationLabels
        ? buildGenerationLabels(nodeById, personDataMap, treeMinX, genId)
        : [];

    const timelineNodes = CANVAS_CONFIG.showTimeline
        ? buildTimeline(nodeById, personDataMap, treeMaxX, genId)
        : [];

    // Node order: cards → stripes (on top of cards) → year labels → gen labels → timeline
    const allContent: CanvasNode[] = [
        ...cardNodes,
        ...stripeNodes,
        ...extraNodes,
        ...genLabelNodes,
        ...timelineNodes,
    ];

    if (allContent.length > 0) {
        const PADDING = 100;
        const minX = Math.min(...allContent.map((n) => n.x)) - PADDING;
        const minY = Math.min(...allContent.map((n) => n.y)) - PADDING;
        const maxX = Math.max(...allContent.map((n) => n.x + n.width)) + PADDING;
        const maxY = Math.max(...allContent.map((n) => n.y + n.height)) + PADDING;

        const bgGroup = {
            id: genId(),
            type: 'group',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };

        // Prepend so the group renders behind all nodes
        allContent.unshift(bgGroup as unknown as CanvasNode);
    }

    return { nodes: allContent, edges };
}
