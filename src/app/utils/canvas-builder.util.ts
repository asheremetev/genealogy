import type { Datum } from 'family-chart';
import type { PersonData } from '../models/person.model';

interface TreeNodeDatum {
    data: { id: string; data: PersonData };
    x: number;
    y: number;
}

interface CanvasNode {
    id: string;
    type: 'text';
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
}

interface CanvasEdge {
    id: string;
    fromNode: string;
    fromSide: string;
    toNode: string;
    toSide: string;
    toEnd: string;
    color?: string;
    styleAttributes?: { pathfindingMethod: string };
}

/** Must match `cardDim.w` in FamilyTreeService. */
const CARD_W = 220;
/**
 * Horizontal gap between spouse/sibling cards in the canvas.
 * Should satisfy: CARD_W + CARD_X_GAP === cardXSpacing (DEFAULT_TREE_SETTINGS).
 * Keeping them separate means increasing CARD_W doesn't silently collapse the gap.
 */
const CARD_X_GAP = 40;
const CARD_H = 80;
const YEAR_NODE_W = 100;
const YEAR_NODE_H = 28;

/** Extract year string, preserving leading ~ for approximate dates */
function extractYear(dateStr: string): string | null {
    if (!dateStr) return null;
    const approx = dateStr.startsWith('~');
    const match = dateStr.match(/(\d{4})/);
    if (!match) return null;
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
 * Examples:
 *   "Шереметьев Марк Игнатьевич (ок. 1779)" → "Шереметьев Марк Игнатьевич"
 *   "Иван Андреевич (1735)"                 → "Иван Андреевич"
 *   "Ермилий Трофимович"                    → "Ермилий Трофимович" (unchanged)
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

/**
 * Builds an Obsidian Canvas JSON object from the current family-chart DOM state.
 *
 * Enrichment applied:
 *  - Node color based on gender (5 = cyan for males, 1 = red for females)
 *  - Birth/death year + birth place as a subtitle in each node
 *  - Marriage edges route top→top (arc above nodes)
 *  - Small year text nodes (100×28, color 4) placed above each spouse pair
 *  - A full-canvas group node wrapping all nodes (background image can be set in Obsidian)
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
        if (!d?.data?.data?.firstName) return; // skip empty placeholder cards
        nodeById.set(d.data.id, { id: genId(), x: Math.round(d.x), y: Math.round(d.y) });
    });

    // Build nodes with gender color and date subtitle
    const nodes: CanvasNode[] = [...nodeById.entries()].map(([personId, pos]) => {
        const pd = personDataMap.get(personId);
        const alias = displayName(personId);
        const link = alias !== personId ? `[[${personId}|${alias}]]` : `[[${personId}]]`;

        const node: CanvasNode = {
            id: pos.id,
            type: 'text',
            text: link,
            x: pos.x,
            y: pos.y,
            width: CARD_W,
            height: CARD_H,
            color: pd?.gender === 'M' ? '5' : '1',
        };

        if (pd) {
            const dateLine = buildDateLine(pd);
            if (dateLine) node.text = `${link}\n${dateLine}`;
        }

        return node;
    });

    const edges: CanvasEdge[] = [];
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
                color: '4',
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
            nodes.push({
                id: genId(),
                type: 'text',
                text: year,
                x: midX - YEAR_NODE_W / 2,
                y: topY - YEAR_NODE_H - 10,
                width: YEAR_NODE_W,
                height: YEAR_NODE_H,
                color: '4',
            });
        });
    });

    if (nodes.length > 0) {
        const PADDING = 100;
        const minX = Math.min(...nodes.map((n) => n.x)) - PADDING;
        const minY = Math.min(...nodes.map((n) => n.y)) - PADDING;
        const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + PADDING;
        const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + PADDING;

        const bgGroup = {
            id: genId(),
            type: 'group',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };

        // Prepend so the group renders behind all nodes
        nodes.unshift(bgGroup as unknown as CanvasNode);
    }

    return { nodes, edges };
}
