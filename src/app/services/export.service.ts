import { inject, Injectable, signal } from '@angular/core';
import { CanvasExportStrategy } from '../canvas/canvas.export-strategy';
import type { ExportStrategy } from './export/export-strategy';

export type ExportFormat = 'canvas';

@Injectable({ providedIn: 'root' })
export class ExportService {
    private readonly isExportingInternal = signal(false);

    readonly isExporting = this.isExportingInternal.asReadonly();

    private readonly strategies: Record<ExportFormat, ExportStrategy> = {
        canvas: inject(CanvasExportStrategy),
    };

    async export(container: HTMLElement, format: ExportFormat = 'canvas'): Promise<void> {
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
