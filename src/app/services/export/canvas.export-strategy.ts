import { inject, Injectable } from '@angular/core';
import { buildCanvasJson } from '../../utils/canvas-builder.util';
import { downloadJson } from '../../utils/download.util';
import { FamilyTreeService } from '../family-tree.service';
import type { ExportStrategy } from './export-strategy';

@Injectable({ providedIn: 'root' })
export class CanvasExportStrategy implements ExportStrategy {
    private readonly familyTreeService = inject(FamilyTreeService);

    async export(container: HTMLElement): Promise<void> {
        await this.familyTreeService.withFullTree(async () => {
            const canvasData = buildCanvasJson(container, this.familyTreeService.data());
            downloadJson(canvasData, `family-tree-${today()}.canvas`);
        });
    }
}

function today(): string {
    return new Date().toISOString().slice(0, 10);
}
