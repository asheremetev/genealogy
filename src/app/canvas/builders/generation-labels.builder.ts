import type { PersonData } from '../../models/person.model';
import { CANVAS_CONFIG, CARD_H, GEN_LABEL_GAP, GEN_LABEL_W } from '../canvas.config';
import { alignAttrs } from '../canvas-helpers.util';
import type { CanvasNode } from '../canvas.types';

/**
 * Builds a column of G0/G1/G2… nodes to the left of the tree.
 * Each label is vertically centered on the median Y of all cards in that generation.
 */
export function buildGenerationLabels(
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
    const colors = CANVAS_CONFIG.generationLabelColors;
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
            color: colors[gen % colors.length],
            ...alignAttrs(),
        });
    }

    return nodes;
}
