import type { Datum } from 'family-chart';
import type { PersonData } from '../../models/person.model';
import { CANVAS_CONFIG, CARD_W, YEAR_NODE_H, YEAR_NODE_W } from '../canvas.config';
import { alignAttrs, extractYear } from '../canvas-helpers.util';
import type { CanvasEdge, CanvasNode } from '../canvas.types';

export function buildEdges(
    data: Datum[],
    nodeById: Map<string, { id: string; x: number; y: number }>,
    personDataMap: Map<string, PersonData>,
    genId: () => string,
): { edges: CanvasEdge[]; extraNodes: CanvasNode[] } {
    const edges: CanvasEdge[] = [];
    const extraNodes: CanvasNode[] = [];
    const addedEdges = new Set<string>();

    data.forEach((datum) => {
        const fromPos = nodeById.get(datum.id);
        if (!fromPos) return;

        // Parent → child
        (datum.rels.children ?? []).forEach((childId) => {
            const toPos = nodeById.get(childId);
            if (!toPos) return;
            const key = `${datum.id}→${childId}`;
            if (addedEdges.has(key)) return;
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
            if (!toPos) return;
            const key = [datum.id, spouseId].sort().join('—');
            if (addedEdges.has(key)) return;
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

    return { edges, extraNodes };
}
