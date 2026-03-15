import { Injectable } from '@angular/core';
import { downloadDataUrl } from '../../utils/download.util';
import { prepareForExport, restoreExportState, saveExportState } from '../../utils/dom-export.util';
import type { ExportStrategy } from './export-strategy';

@Injectable({ providedIn: 'root' })
export class SvgExportStrategy implements ExportStrategy {
    async export(container: HTMLElement): Promise<void> {
        const state = saveExportState(container);
        try {
            prepareForExport(container);
            await twoFrames();

            const { toSvg } = await import('html-to-image');
            const dataUrl = await toSvg(container, {
                backgroundColor: '#212121',
            });
            downloadDataUrl(dataUrl, `family-tree-${today()}.svg`);
        } finally {
            restoreExportState(container, state);
        }
    }
}

function twoFrames(): Promise<void> {
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}
