import { CANVAS_CONFIG } from '../canvas.config';
import type { CanvasNode } from '../canvas.types';

const GROUP_PADDING = 100;
const INNER_PADDING = 20;

/**
 * Builds a title text node positioned in the top-left corner of the canvas,
 * just inside the outer group boundary.
 *
 * @param allContent - all nodes built so far (used to determine canvas bounds)
 * @param genId - ID generator
 */
export function buildTitle(allContent: CanvasNode[], genId: () => string): CanvasNode {
    const minX = Math.min(...allContent.map((n) => n.x));
    const minY = Math.min(...allContent.map((n) => n.y));

    const x = minX - GROUP_PADDING + INNER_PADDING;
    const y = minY - GROUP_PADDING + INNER_PADDING;

    const prefix = '#'.repeat(CANVAS_CONFIG.titleHeadingLevel);
    const text = `${prefix} ${CANVAS_CONFIG.titleText}`;

    return {
        id: genId(),
        type: 'text',
        text,
        x,
        y,
        width: CANVAS_CONFIG.titleWidth,
        height: CANVAS_CONFIG.titleHeight,
        color: CANVAS_CONFIG.titleColor,
        styleAttributes: {
            textAlign: 'left',
            border: 'invisible',
        },
    };
}
