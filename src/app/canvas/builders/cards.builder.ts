import type { PersonData } from '../../models/person.model';
import { CANVAS_CONFIG, CARD_H, CARD_W } from '../canvas.config';
import { buildDateLine, displayName, formatCardText } from '../canvas-helpers.util';
import type { CanvasNode } from '../canvas.types';

export function buildPersonCards(
    nodeById: Map<string, { id: string; x: number; y: number }>,
    personDataMap: Map<string, PersonData>,
    genId: () => string,
): { cardNodes: CanvasNode[]; stripeNodes: CanvasNode[] } {
    const cardNodes: CanvasNode[] = [];
    const stripeNodes: CanvasNode[] = [];
    const colors = CANVAS_CONFIG.generationCardColors;

    for (const [personId, pos] of nodeById.entries()) {
        const pd = personDataMap.get(personId);
        const alias = displayName(personId);
        const link = alias !== personId ? `[[${personId}|${alias}]]` : `[[${personId}]]`;
        const dateLine = pd ? buildDateLine(pd) : '';
        const generation = pd?.generation ?? 0;
        const cardColor = colors[generation % colors.length];

        cardNodes.push({
            id: pos.id,
            type: 'text',
            text: formatCardText([link, dateLine]),
            x: pos.x,
            y: pos.y,
            width: CARD_W,
            height: CARD_H,
            color: cardColor,
            styleAttributes: {
                ...(CANVAS_CONFIG.textAlign !== 'left' ? { textAlign: CANVAS_CONFIG.textAlign } : {}),
                border: CANVAS_CONFIG.cardBorder,
            },
        });

        stripeNodes.push({
            id: genId(),
            type: 'text',
            text: '',
            x: pos.x,
            y: pos.y,
            width: CANVAS_CONFIG.stripeWidth,
            height: CARD_H,
            color: pd?.gender === 'M' ? CANVAS_CONFIG.maleStripeColor : CANVAS_CONFIG.femaleStripeColor,
        });
    }

    return { cardNodes, stripeNodes };
}
