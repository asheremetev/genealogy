import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import type { TreeSettings } from '../../models/tree-settings.model';
import { FamilyTreeService } from '../../services/family-tree.service';

@Component({
    selector: 'app-settings-panel',
    templateUrl: './settings-panel.component.html',
    styleUrl: './settings-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:click)': 'onDocumentClick($event)',
    },
})
export class SettingsPanelComponent {
    private readonly treeService = inject(FamilyTreeService);
    private readonly elementRef = inject(ElementRef<HTMLElement>);

    protected readonly settings = this.treeService.settings;
    protected readonly isOpen = signal(false);
    protected readonly depthSteps = [1, 2, 3, 4, 5] as const;

    protected onDocumentClick(event: MouseEvent): void {
        if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target as Node)) {
            this.isOpen.set(false);
        }
    }

    protected toggle(): void {
        this.isOpen.update((v) => !v);
    }

    protected update<K extends keyof TreeSettings>(key: K, value: TreeSettings[K]): void {
        this.treeService.updateSetting(key, value);
    }
}
