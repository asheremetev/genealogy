import { computed, Injectable, signal } from '@angular/core';
import type { CardHtmlClass, Chart, Datum } from 'family-chart';
import * as f3 from 'family-chart';
import type { SearchOption } from '../models/person.model';
import { type PersonData } from '../models/person.model';
import { DEFAULT_TREE_SETTINGS, type TreeSettings } from '../models/tree-settings.model';
import { buildCardHtml, extractYear } from '../utils/card-html.util';

const CHART_TRANSITION_MS = 500;
const FULL_TREE_DEPTH = 999;
const DEPTH_FALLBACK = 100;

/** Augments the Chart type with the undocumented `setTransitionTime` method. */
interface ChartWithTransition extends Chart {
    setTransitionTime(ms: number): void;
}

@Injectable({ providedIn: 'root' })
export class FamilyTreeService {
    private readonly _data = signal<Datum[]>([]);
    private readonly _isLoading = signal(true);
    private readonly _error = signal<string | null>(null);
    private readonly _settings = signal<TreeSettings>({ ...DEFAULT_TREE_SETTINGS });

    readonly data = this._data.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly settings = this._settings.asReadonly();

    readonly searchOptions = computed<SearchOption[]>(() =>
        this._data().map((d) => {
            const pd = d.data as PersonData;
            const year = pd.birthDate ? ` (${extractYear(pd.birthDate)})` : '';
            const label =
                [pd.lastName, pd.firstName, pd.patronymic].filter(Boolean).join(' ') + year;
            return { label: label || d.id, value: d.id };
        }),
    );

    private chart: Chart | null = null;
    private cardHtml: CardHtmlClass | null = null;
    private container: HTMLElement | null = null;
    private rootPersonId: string | null = null;

    async loadData(): Promise<void> {
        try {
            const res = await fetch('/family-chart-data.json');
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            const data: Datum[] = await res.json();
            this._data.set(data);
            this._isLoading.set(false);
            this.initChartIfReady();
        } catch (e) {
            this._error.set(e instanceof Error ? e.message : 'Ошибка загрузки данных');
            this._isLoading.set(false);
        }
    }

    initChart(container: HTMLElement): void {
        this.container = container;
        this.initChartIfReady();
    }

    navigateTo(id: string): void {
        if (!this.chart) {
            return;
        }

        this.chart.updateMainId(id);
        this.chart.updateTree({ initial: false });
    }

    navigateToRoot(): void {
        if (this.rootPersonId) {
            this.navigateTo(this.rootPersonId);
        }
    }

    updateSetting<K extends keyof TreeSettings>(key: K, value: TreeSettings[K]): void {
        this._settings.update((s) => ({ ...s, [key]: value }));
        if (!this.chart) {
            return;
        }
        this.applySettingToChart(key, value);
        this.chart.updateTree({ initial: false });
    }

    /**
     * Temporarily expands the tree to show all nodes (no depth limit),
     * runs the provided async callback, then restores the original depth settings.
     * Used by CanvasExportStrategy to capture the full layout.
     */
    async withFullTree(fn: () => Promise<void>): Promise<void> {
        if (!this.chart) return;

        const chart = this.chart as ChartWithTransition;
        const s = this._settings();
        const savedAncestry = s.ancestryDepth;
        const savedProgeny = s.progenyDepth;

        try {
            chart.setTransitionTime(0);
            chart.setAncestryDepth(FULL_TREE_DEPTH);
            chart.setProgenyDepth(FULL_TREE_DEPTH);
            chart.updateTree({ initial: false });

            await new Promise<void>((r) =>
                requestAnimationFrame(() => requestAnimationFrame(() => r())),
            );

            await fn();
        } finally {
            chart.setAncestryDepth(savedAncestry ?? DEPTH_FALLBACK);
            chart.setProgenyDepth(savedProgeny ?? DEPTH_FALLBACK);
            chart.setTransitionTime(CHART_TRANSITION_MS);
            chart.updateTree({ initial: false });
        }
    }

    private initChartIfReady(): void {
        if (this.chart || !this.container || this._data().length === 0) {
            return;
        }
        this.createChart(this.container);
    }

    private findRootPersonId(data: Datum[]): string {
        const existingIds = new Set(data.map((d) => d.id));

        // Persons without known parents in the dataset are true tree roots.
        const roots = data.filter(
            (d) =>
                d.rels.parents.length === 0 || !d.rels.parents.some((pid) => existingIds.has(pid)),
        );

        const candidates = roots.length > 0 ? roots : data;

        // Among roots, pick the person with the highest generation value (oldest ancestor).
        return candidates.reduce((best, d) => {
            const bestGen = (best.data as PersonData).generation ?? -Infinity;
            const dGen = (d.data as PersonData).generation ?? -Infinity;
            return dGen > bestGen ? d : best;
        }, candidates[0]).id;
    }

    private createChart(container: HTMLElement): void {
        const data = this._data();
        this.rootPersonId = this.findRootPersonId(data);
        const s = this._settings();

        const chart = f3
            .createChart(container, data)
            .setTransitionTime(CHART_TRANSITION_MS)
            .setCardXSpacing(s.cardXSpacing)
            .setCardYSpacing(s.cardYSpacing)
            .setSingleParentEmptyCard(false)
            .setShowSiblingsOfMain(s.showSiblings)
            .setSortChildrenFunction((a, b) => {
                const aDate = (a.data as PersonData).birthDate ?? '';
                const bDate = (b.data as PersonData).birthDate ?? '';
                return aDate.localeCompare(bDate);
            });

        if (s.ancestryDepth !== null) {
            chart.setAncestryDepth(s.ancestryDepth);
        }
        if (s.progenyDepth !== null) {
            chart.setProgenyDepth(s.progenyDepth);
        }
        if (s.orientation === 'horizontal') {
            chart.setOrientationHorizontal();
        }

        const cardHtml = chart
            .setCardHtml()
            .setCardInnerHtmlCreator(buildCardHtml)
            .setCardDim({ w: 220, h: 80, height_auto: true })
            .setMiniTree(s.miniTree);

        if (s.hoverPathToMain) {
            cardHtml.setOnHoverPathToMain();
        }

        chart.setLinkSpouseText((sp1, sp2) => this.buildSpouseYearLabel(sp1.data, sp2.data));

        chart.updateMainId(this.rootPersonId);
        chart.updateTree({ initial: true });

        this.chart = chart;
        this.cardHtml = cardHtml;
    }

    private buildSpouseYearLabel(d1: Datum, d2: Datum): string {
        const pd1 = d1.data as PersonData;
        const pd2 = d2.data as PersonData;
        const date = pd1.marriages?.[d2.id] ?? pd2.marriages?.[d1.id] ?? '';
        return extractYear(date);
    }

    private applySettingToChart(key: keyof TreeSettings, value: unknown): void {
        const chart = this.chart!;
        const cardHtml = this.cardHtml!;
        switch (key) {
            case 'showSiblings':
                chart.setShowSiblingsOfMain(value as boolean);
                break;
            case 'hoverPathToMain':
                if (value) {
                    cardHtml.setOnHoverPathToMain();
                } else {
                    cardHtml.unsetOnHoverPathToMain();
                }
                break;
            case 'miniTree':
                cardHtml.setMiniTree(value as boolean);
                break;
            case 'ancestryDepth':
                chart.setAncestryDepth((value as number | null) ?? DEPTH_FALLBACK);
                break;
            case 'progenyDepth':
                chart.setProgenyDepth((value as number | null) ?? DEPTH_FALLBACK);
                break;
            case 'cardXSpacing':
                chart.setCardXSpacing(value as number);
                break;
            case 'cardYSpacing':
                chart.setCardYSpacing(value as number);
                break;
            case 'orientation':
                if (value === 'horizontal') {
                    chart.setOrientationHorizontal();
                } else {
                    chart.setOrientationVertical();
                }
                break;
        }
    }
}
