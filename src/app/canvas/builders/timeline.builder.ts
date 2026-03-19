import type { PersonData } from '../../models/person.model';
import {
    CANVAS_CONFIG,
    TIMELINE_AXIS_W,
    TIMELINE_EVENT_H,
    TIMELINE_EVENT_W,
    TIMELINE_GAP,
    TIMELINE_MIN_SPACING,
    TIMELINE_YEAR_W,
} from '../canvas.config';
import { extractYear, timelineAttrs } from '../canvas-helpers.util';
import { HISTORICAL_EVENTS } from '../historical-events.data';
import type { CanvasNode } from '../canvas.types';

/**
 * Builds a historical events timeline to the right of the tree.
 *
 * Layout: a central vertical axis with events alternating left and right.
 * Year badges sit on the axis; event description nodes flank it.
 *
 * Year → Y mapping: average birth year per generation is used as interpolation
 * anchors, so events align with the approximate era of each generation row.
 */
export function buildTimeline(
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

    const yearBadges: CanvasNode[] = [];
    const eventNodes: CanvasNode[] = [];

    relevantEvents.forEach((event, i) => {
        const cy = spacedYs[i];
        const isLeft = i % 2 === 0;
        const align = isLeft ? 'right' : 'left';
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
