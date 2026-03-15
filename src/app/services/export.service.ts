import { inject, Injectable, signal } from '@angular/core';
import { CanvasExportStrategy } from './export/canvas.export-strategy';
import type { ExportStrategy } from './export/export-strategy';
import { PngExportStrategy } from './export/png.export-strategy';
import { SvgExportStrategy } from './export/svg.export-strategy';

export type ExportFormat = 'png' | 'svg' | 'canvas';

@Injectable({ providedIn: 'root' })
export class ExportService {
    private readonly isExportingInternal = signal(false);

    readonly isExporting = this.isExportingInternal.asReadonly();

    private readonly strategies: Record<ExportFormat, ExportStrategy> = {
        png: inject(PngExportStrategy),
        svg: inject(SvgExportStrategy),
        canvas: inject(CanvasExportStrategy),
    };

    async export(container: HTMLElement, format: ExportFormat): Promise<void> {
        if (this.isExportingInternal()) {
            return;
        }

        this.isExportingInternal.set(true);
        try {
            await this.strategies[format].export(container);
        } finally {
            this.isExportingInternal.set(false);
        }
    }
}
