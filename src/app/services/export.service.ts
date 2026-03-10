import { Injectable, signal } from '@angular/core';

interface ExportState {
    readonly containerWidth: string;
    readonly containerHeight: string;
    readonly containerOverflow: string;
    readonly wrapperHeight: string;
    readonly wrapperOverflow: string;
    readonly svgWidth: string | null;
    readonly svgHeight: string | null;
    readonly svgOverflow: string | null;
    readonly svgRectWidth: string | null;
    readonly svgRectHeight: string | null;
    /** CSS style.transform (NOT SVG attribute) — family-chart uses CSS transforms in HTML mode */
    readonly gViewTransform: string;
    readonly cardsViewTransform: string;
    readonly f3CanvasOverflow: string;
}

export type ExportFormat = 'png' | 'svg';

/**
 * Exports the family-chart container as PNG or SVG.
 *
 * family-chart HTML mode renders a hybrid DOM:
 *   - svg.main_svg → connecting link paths (D3 SVG)
 *   - div#htmlSvg .cards_view → HTML person cards
 *
 * IMPORTANT: in HTML mode, the D3 zoom is applied via CSS style.transform
 * (NOT the SVG transform attribute) on both svg g.view and #htmlSvg .cards_view.
 * #f3Canvas has overflow:hidden which clips off-screen content.
 *
 * Strategy for full-tree capture:
 *   1. Release overflow clipping on #f3Canvas and SVG.
 *   2. Reset CSS style.transform to identity on both layers.
 *   3. Measure all card elements (getBoundingClientRect) + SVG getBBox for link bounds.
 *   4. Apply an offset CSS transform so all content starts at (padding, padding).
 *   5. Resize container to the full content size.
 *   6. Capture with html-to-image.
 *   7. Restore all original state.
 */
@Injectable({ providedIn: 'root' })
export class ExportService {
    private readonly _isExporting = signal(false);
    readonly isExporting = this._isExporting.asReadonly();

    async export(container: HTMLElement, format: ExportFormat): Promise<void> {
        if (this._isExporting()) {
            return;
        }

        this._isExporting.set(true);

        const state = this._saveState(container);
        try {
            this._prepareForExport(container);
            // Two animation frames: first applies styles, second ensures layout is measured
            await new Promise<void>((r) =>
                requestAnimationFrame(() => requestAnimationFrame(() => r())),
            );

            const filename = `family-tree-${new Date().toISOString().slice(0, 10)}`;

            if (format === 'png') {
                const { toPng } = await import('html-to-image');
                const dataUrl = await toPng(container, {
                    backgroundColor: '#212121',
                    pixelRatio: 2,
                });
                this._download(dataUrl, `${filename}.png`);
            } else {
                const { toSvg } = await import('html-to-image');
                const dataUrl = await toSvg(container, {
                    backgroundColor: '#212121',
                });
                this._download(dataUrl, `${filename}.svg`);
            }
        } finally {
            this._restoreState(container, state);
            this._isExporting.set(false);
        }
    }

    // ─── Private helpers ────────────────────────────────────────────────────

    private _saveState(container: HTMLElement): ExportState {
        const svg = container.querySelector<SVGSVGElement>('svg.main_svg');
        // family-chart stores the zoom in a g.view inside the SVG.
        // In HTML mode D3 applies zoom via CSS style.transform, not SVG transform attribute.
        const gView = container.querySelector<SVGGElement>('svg g.view');
        const cardsView = container.querySelector<HTMLElement>('#htmlSvg .cards_view');
        const f3Canvas = container.querySelector<HTMLElement>('#f3Canvas');
        const wrapper = container.parentElement;

        return {
            containerWidth: container.style.width,
            containerHeight: container.style.height,
            containerOverflow: container.style.overflow,
            wrapperHeight: wrapper?.style.height ?? '',
            wrapperOverflow: wrapper?.style.overflow ?? '',
            svgWidth: svg?.getAttribute('width') ?? null,
            svgHeight: svg?.getAttribute('height') ?? null,
            svgOverflow: svg?.getAttribute('overflow') ?? null,
            svgRectWidth: svg?.querySelector('rect')?.getAttribute('width') ?? null,
            svgRectHeight: svg?.querySelector('rect')?.getAttribute('height') ?? null,
            // CSS style.transform — this is what D3 zoom writes in HTML mode
            gViewTransform: gView?.style.transform ?? '',
            cardsViewTransform: cardsView?.style.transform ?? '',
            f3CanvasOverflow: f3Canvas?.style.overflow ?? '',
        };
    }

    private _prepareForExport(container: HTMLElement): void {
        const svg = container.querySelector<SVGSVGElement>('svg.main_svg');
        const gView = container.querySelector<SVGGElement>('svg g.view');
        const cardsView = container.querySelector<HTMLElement>('#htmlSvg .cards_view');
        const f3Canvas = container.querySelector<HTMLElement>('#f3Canvas');
        const wrapper = container.parentElement;

        // Step 1: Release overflow clipping so off-screen content is measurable
        if (f3Canvas) {
            f3Canvas.style.overflow = 'visible';
        }
        if (svg) {
            svg.setAttribute('overflow', 'visible');
        }

        // Step 2: Reset both layers to identity via CSS style (NOT SVG attribute!)
        if (gView) {
            gView.style.transform = 'translate(0px,0px) scale(1)';
        }
        if (cardsView) {
            cardsView.style.transform = 'translate(0px,0px) scale(1)';
        }

        // Step 3: Measure content bounds
        // - HTML cards: getBoundingClientRect() in viewport coords → subtract container offset
        // - SVG links: getBBox() returns coords in SVG user space (= CSS pixels when no viewBox)
        //   Note: getBBox() ignores CSS transforms, only reflects SVG coordinate space — correct here
        //   Note: getBBox() returns geometry center of stroke, not visual edge — add SVG_STROKE_BUFFER
        const PADDING = 60;
        // SVG getBBox() reports path geometry, not visual stroke edges.
        // Paths with stroke-width ~2px extend ≈1px beyond the reported bbox; use a generous buffer.
        const SVG_STROKE_BUFFER = 8;
        const containerRect = container.getBoundingClientRect();
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        const cards = container.querySelectorAll<HTMLElement>('#htmlSvg .card_cont');
        cards.forEach((card) => {
            const r = card.getBoundingClientRect();
            minX = Math.min(minX, Math.floor(r.left - containerRect.left));
            minY = Math.min(minY, Math.floor(r.top - containerRect.top));
            maxX = Math.max(maxX, Math.ceil(r.right - containerRect.left));
            maxY = Math.max(maxY, Math.ceil(r.bottom - containerRect.top));
        });

        if (gView) {
            try {
                const bbox = gView.getBBox();
                if (bbox.width > 0 && bbox.height > 0) {
                    minX = Math.min(minX, Math.floor(bbox.x) - SVG_STROKE_BUFFER);
                    minY = Math.min(minY, Math.floor(bbox.y) - SVG_STROKE_BUFFER);
                    maxX = Math.max(maxX, Math.ceil(bbox.x + bbox.width) + SVG_STROKE_BUFFER);
                    maxY = Math.max(maxY, Math.ceil(bbox.y + bbox.height) + SVG_STROKE_BUFFER);
                }
            } catch {
                // getBBox can throw for hidden elements — ignore
            }
        }

        if (!isFinite(minX)) {
            minX = 0;
            minY = 0;
            maxX = containerRect.width;
            maxY = containerRect.height;
        }

        const fullWidth = Math.ceil(maxX - minX + PADDING * 2);
        const fullHeight = Math.ceil(maxY - minY + PADDING * 2);
        const offsetX = -minX + PADDING;
        const offsetY = -minY + PADDING;

        // Step 4: Shift content into view via CSS transforms (both layers must match)
        if (gView) {
            gView.style.transform = `translate(${offsetX}px,${offsetY}px) scale(1)`;
        }
        if (cardsView) {
            cardsView.style.transform = `translate(${offsetX}px,${offsetY}px) scale(1)`;
        }

        // Step 5: Resize SVG to cover the full content area
        if (svg) {
            svg.setAttribute('width', String(fullWidth));
            svg.setAttribute('height', String(fullHeight));
            const bgRect = svg.querySelector('rect');
            if (bgRect) {
                bgRect.setAttribute('width', String(fullWidth));
                bgRect.setAttribute('height', String(fullHeight));
            }
        }

        // Step 6: Resize container (and release parent height constraint)
        if (wrapper) {
            wrapper.style.height = `${fullHeight}px`;
            wrapper.style.overflow = 'visible';
        }
        container.style.width = `${fullWidth}px`;
        container.style.height = `${fullHeight}px`;
        container.style.overflow = 'hidden';
    }

    private _restoreState(container: HTMLElement, state: ExportState): void {
        const svg = container.querySelector<SVGSVGElement>('svg.main_svg');
        const gView = container.querySelector<SVGGElement>('svg g.view');
        const cardsView = container.querySelector<HTMLElement>('#htmlSvg .cards_view');
        const f3Canvas = container.querySelector<HTMLElement>('#f3Canvas');
        const wrapper = container.parentElement;

        // Restore CSS transforms (must match how D3 zoom wrote them)
        if (gView) {
            gView.style.transform = state.gViewTransform;
        }
        if (cardsView) {
            cardsView.style.transform = state.cardsViewTransform;
        }

        if (f3Canvas) {
            f3Canvas.style.overflow = state.f3CanvasOverflow;
        }

        container.style.width = state.containerWidth;
        container.style.height = state.containerHeight;
        container.style.overflow = state.containerOverflow;

        if (wrapper) {
            wrapper.style.height = state.wrapperHeight;
            wrapper.style.overflow = state.wrapperOverflow;
        }

        if (svg) {
            if (state.svgWidth !== null) {
                svg.setAttribute('width', state.svgWidth);
            } else {
                svg.removeAttribute('width');
            }
            if (state.svgHeight !== null) {
                svg.setAttribute('height', state.svgHeight);
            } else {
                svg.removeAttribute('height');
            }
            if (state.svgOverflow !== null) {
                svg.setAttribute('overflow', state.svgOverflow);
            } else {
                svg.removeAttribute('overflow');
            }

            const bgRect = svg.querySelector('rect');
            if (bgRect) {
                if (state.svgRectWidth) {
                    bgRect.setAttribute('width', state.svgRectWidth);
                }
                if (state.svgRectHeight) {
                    bgRect.setAttribute('height', state.svgRectHeight);
                }
            }
        }
    }

    private _download(dataUrl: string, filename: string): void {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
