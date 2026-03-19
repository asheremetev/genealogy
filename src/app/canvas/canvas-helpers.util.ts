import type { PersonData } from '../models/person.model';
import { CANVAS_CONFIG } from './canvas.config';
import { PLACE_ABBREVIATIONS } from './place-abbreviations.data';
import type { CanvasBorder, CanvasTextAlign } from './canvas.types';

/** Extract year string, preserving leading ~ for approximate dates. Returns null if not found. */
export function extractYear(dateStr: string): string | null {
    if (!dateStr) return null;
    const approx = dateStr.startsWith('~');
    const match = dateStr.match(/(\d{4})/);
    if (!match) return null;
    return approx ? `~${match[1]}` : match[1];
}

/** Shorten verbose place names to fit in the card width. */
export function shortenPlace(place: string): string {
    if (!place) return '';
    const entry = Object.entries(PLACE_ABBREVIATIONS).find(([key]) => place.includes(key));
    return entry ? entry[1] : place;
}

/**
 * Strip the birth year in parentheses from the end of the person ID.
 * Result is used as the wiki link display alias so the year isn't shown twice.
 */
export function displayName(personId: string): string {
    return personId.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/** Build the subtitle line: "~1779 — 1849 · д. Горбово" */
export function buildDateLine(pd: PersonData): string {
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
export function formatCardText(lines: string[]): string {
    return lines.filter(Boolean).join('\n');
}

/** Returns styleAttributes spread when textAlign is not 'left'. */
export function alignAttrs(): { styleAttributes: { textAlign: CanvasTextAlign } } | Record<never, never> {
    return CANVAS_CONFIG.textAlign !== 'left'
        ? { styleAttributes: { textAlign: CANVAS_CONFIG.textAlign } }
        : {};
}

/**
 * Returns styleAttributes for timeline nodes.
 * @param align  'left' for right-side nodes, 'right' for left-side nodes.
 * @param border Optional border style (year badges use 'dashed').
 */
export function timelineAttrs(
    align: CanvasTextAlign,
    border?: CanvasBorder,
): { styleAttributes: { textAlign: CanvasTextAlign; border?: CanvasBorder } } {
    return border
        ? { styleAttributes: { textAlign: align, border } }
        : { styleAttributes: { textAlign: align, border: 'invisible' } };
}
