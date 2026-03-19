import type { Datum } from 'family-chart';
import type { PersonData } from '../models/person.model';
import { CANVAS_CONFIG, CARD_W } from './canvas.config';
import { buildPersonCards } from './builders/cards.builder';
import { buildEdges } from './builders/edges.builder';
import { buildGenerationLabels } from './builders/generation-labels.builder';
import { buildTimeline } from './builders/timeline.builder';
import type { CanvasNode, TreeNodeDatum } from './canvas.types';

/**
 * Builds an Obsidian Canvas JSON object from the current family-chart DOM state.
 *
 * Enrichment applied:
 *  - Cards colored by generation (CANVAS_CONFIG.generationCardColors)
 *  - A thin gender stripe node overlaps the left edge of each card
 *  - Text alignment and border via native Obsidian Canvas styleAttributes
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

    const { cardNodes, stripeNodes } = buildPersonCards(nodeById, personDataMap, genId);
    const { edges, extraNodes } = buildEdges(data, nodeById, personDataMap, genId);

    // Compute tree bounds (card nodes only) — needed for placing side columns
    const treeMinX = cardNodes.length > 0 ? Math.min(...cardNodes.map((n) => n.x)) : 0;
    const treeMaxX = cardNodes.length > 0 ? Math.max(...cardNodes.map((n) => n.x + CARD_W)) : 0;

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
