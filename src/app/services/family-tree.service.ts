import { computed, Injectable, signal } from '@angular/core';
import type { CardHtmlClass, Chart, Datum } from 'family-chart';
import * as f3 from 'family-chart';
import 'family-chart/styles/family-chart.css';
import type { SearchOption } from '../models/person.model';
import { type PersonData } from '../models/person.model';
import { DEFAULT_TREE_SETTINGS, type TreeSettings } from '../models/tree-settings.model';
import { buildCardHtml } from '../utils/card-html.util';

@Injectable({ providedIn: 'root' })
export class FamilyTreeService {
    private readonly _data = signal<Datum[]>([]);
    private readonly _isLoading = signal(true);
    private readonly _error = signal<string | null>(null);
    readonly data = this._data.asReadonly();
    readonly isLoading = this._isLoading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly settings = signal<TreeSettings>({ ...DEFAULT_TREE_SETTINGS });

    readonly searchOptions = computed<SearchOption[]>(() =>
        this._data().map((d) => {
            const pd = d.data as PersonData;
            const year = pd.birthDate ? ` (${pd.birthDate.slice(0, 4)})` : '';
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
            this._initChartIfReady();
        } catch (e) {
            this._error.set(e instanceof Error ? e.message : 'Ошибка загрузки данных');
            this._isLoading.set(false);
        }
    }

    initChart(container: HTMLElement): void {
        this.container = container;
        this._initChartIfReady();
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
        this.settings.update((s) => ({ ...s, [key]: value }));
        if (!this.chart) {
            return;
        }
        this._applySettingToChart(key, value);
        this.chart.updateTree({ initial: false });
    }

    private _applySettingToChart(key: keyof TreeSettings, value: unknown): void {
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
                chart.setAncestryDepth((value as number | null) ?? 100);
                break;
            case 'progenyDepth':
                chart.setProgenyDepth((value as number | null) ?? 100);
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

    /**
     * Temporarily expands the tree to show all nodes (no depth limit),
     * runs the provided async callback, then restores the original depth settings.
     * Used by CanvasExportStrategy to capture the full layout.
     */
    async withFullTree(fn: () => Promise<void>): Promise<void> {
        if (!this.chart) return;

        const s = this.settings();
        const savedAncestry = s.ancestryDepth;
        const savedProgeny = s.progenyDepth;

        try {
            (this.chart as unknown as { setTransitionTime: (n: number) => void }).setTransitionTime(
                0,
            );
            this.chart.setAncestryDepth(999);
            this.chart.setProgenyDepth(999);
            this.chart.updateTree({ initial: false });

            await new Promise<void>((r) =>
                requestAnimationFrame(() => requestAnimationFrame(() => r())),
            );

            await fn();
        } finally {
            this.chart.setAncestryDepth(savedAncestry ?? 100);
            this.chart.setProgenyDepth(savedProgeny ?? 100);
            (this.chart as unknown as { setTransitionTime: (n: number) => void }).setTransitionTime(
                500,
            );
            this.chart.updateTree({ initial: false });
        }
    }

    private _initChartIfReady(): void {
        if (this.chart || !this.container || this._data().length === 0) {
            return;
        }
        this._initChartInternal(this.container);
    }

    private _findRootPersonId(data: Datum[]): string {
        const existingIds = new Set(data.map((d) => d.id));

        // Персоны без родителей в нашем датасете — истинные корни дерева
        const roots = data.filter(
            (d) =>
                d.rels.parents.length === 0 || !d.rels.parents.some((pid) => existingIds.has(pid)),
        );

        const candidates = roots.length > 0 ? roots : data;

        // Среди корней выбираем персону с максимальным поколением (самый древний предок)
        return candidates.reduce((best, d) => {
            const bestGen = (best.data as PersonData).generation ?? -Infinity;
            const dGen = (d.data as PersonData).generation ?? -Infinity;
            return dGen > bestGen ? d : best;
        }, candidates[0]).id;
    }

    private _initChartInternal(container: HTMLElement): void {
        const data = this._data();
        this.rootPersonId = this._findRootPersonId(data);
        const s = this.settings();

        const chart = f3
            .createChart(container, data)
            .setTransitionTime(500)
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

        chart.setLinkSpouseText((sp1, sp2) => {
            const d1 = sp1.data.data as PersonData;
            const d2 = sp2.data.data as PersonData;
            const date = d1.marriages?.[sp2.data.id] ?? d2.marriages?.[sp1.data.id] ?? '';
            if (!date) {
                return '';
            }
            const year = date.match(/^(\d{4})/)?.[1];
            return year ?? date;
        });

        chart.updateMainId(this.rootPersonId);
        chart.updateTree({ initial: true });

        this.chart = chart;
        this.cardHtml = cardHtml;
    }
}
