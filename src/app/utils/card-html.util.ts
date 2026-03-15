import type { TreeDatum } from 'family-chart';
import { RELIGION_ICONS, type PersonData } from '../models/person.model';

export function buildCardHtml(d: TreeDatum): string {
    const data = d.data.data as PersonData;
    return d.depth === 0 ? buildMainCardHtml(data) : buildSecondaryCardHtml(data);
}

function buildMainCardHtml(data: PersonData): string {
    const fullName = [data.lastName, data.firstName, data.patronymic].filter(Boolean).join(' ');
    const livingDot = data.alive ? '<span class="living-dot" title="Живёт">●</span>' : '';
    const dates = formatDateRange(data.birthDate, data.deathDate);
    const place = formatPlace(data.birthPlace, data.deathPlace);
    const badges = buildBadges(data);
    const genderClass = data.gender === 'M' ? 'gender-m' : 'gender-f';

    return `
        <div class="card card-main ${genderClass}">
            <div class="card-name-full">${escapeHtml(fullName)} ${livingDot}</div>
            ${dates ? `<div class="card-dates">${escapeHtml(dates)}</div>` : ''}
            ${place ? `<div class="card-place">${escapeHtml(place)}</div>` : ''}
            ${badges ? `<div class="card-badges">${badges}</div>` : ''}
        </div>
    `;
}

function buildSecondaryCardHtml(data: PersonData): string {
    const name = [data.lastName, data.firstName, data.patronymic].filter(Boolean).join(' ');
    const dates = formatDateRange(data.birthDate, data.deathDate);
    const badges = buildBadges(data);
    const genderClass = data.gender === 'M' ? 'gender-m' : 'gender-f';

    return `
        <div class="card card-secondary ${genderClass}">
            <div class="card-name">
                ${escapeHtml(name)}
            </div>
            <div class="card-meta">
                ${dates ? `<span class="card-year">${escapeHtml(dates)}</span>` : ''} ${badges}
            </div>
        </div>
    `;
}

function buildBadges(data: PersonData): string {
    const parts: string[] = [];

    if (data.generation !== null) {
        parts.push(
            `<span class="gen-badge" title="Поколение ${data.generation}">G${data.generation}</span>`,
        );
    }

    const religionIcon = getReligionIcon(data);
    if (religionIcon) {
        parts.push(
            `<span class="religion-icon" title="${escapeHtml(data.religion ?? '')}">${religionIcon}</span>`,
        );
    }

    return parts.join('');
}

function getReligionIcon(data: PersonData): string {
    if (!data.religion) {
        return '';
    }
    return RELIGION_ICONS[data.religion.toLowerCase()] ?? '';
}

function formatDateRange(birthDate: string, deathDate: string): string {
    const birth = extractYear(birthDate);
    const death = extractYear(deathDate);

    if (birth && death) {
        return `${birth} – ${death}`;
    }

    if (birth) {
        return birth;
    }

    return '';
}

function formatPlace(birthPlace: string, deathPlace: string): string {
    if (birthPlace && deathPlace && birthPlace !== deathPlace) {
        return `${birthPlace} → ${deathPlace}`;
    }
    return birthPlace || deathPlace;
}

export function extractYear(date: string): string {
    if (!date) {
        return '';
    }

    const match = date.match(/^(\d{4})/);
    return match ? match[1] : date;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
