import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    inject,
    OnInit,
    viewChild,
} from '@angular/core';
import 'family-chart/styles/family-chart.css';
import { ExportFormat, ExportService } from '../../services/export.service';
import { FamilyTreeService } from '../../services/family-tree.service';
import { SearchComponent } from '../search/search.component';
import { SettingsPanelComponent } from '../settings-panel/settings-panel.component';

@Component({
    selector: 'app-family-chart',
    templateUrl: './family-tree.component.html',
    styleUrl: './family-tree.component.scss',
    imports: [SearchComponent, SettingsPanelComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamilyTreeComponent implements OnInit, AfterViewInit {
    private readonly treeService = inject(FamilyTreeService);
    private readonly exportService = inject(ExportService);

    private readonly chartContainer =
        viewChild.required<ElementRef<HTMLDivElement>>('chartContainer');

    protected readonly searchOptions = this.treeService.searchOptions;
    protected readonly isLoading = this.treeService.isLoading;
    protected readonly error = this.treeService.error;
    protected readonly isExporting = this.exportService.isExporting;
    protected readonly isCanvasExporting = this.treeService.isCanvasExporting;

    ngOnInit(): void {
        this.treeService.loadData();
    }

    ngAfterViewInit(): void {
        this.treeService.initChart(this.chartContainer().nativeElement);
    }

    protected onPersonSelected(id: string): void {
        this.treeService.navigateTo(id);
    }

    protected onBackToRoot(): void {
        this.treeService.navigateToRoot();
    }

    protected onExport(format: ExportFormat): void {
        this.exportService.export(this.chartContainer().nativeElement, format);
    }

    protected onExportCanvas(): void {
        this.treeService.exportToCanvas();
    }
}
