import { Component } from '@angular/core';
import { TreeChartComponent } from './components/tree-chart/tree-chart.component';

@Component({
  selector: 'app-root',
  imports: [TreeChartComponent],
  template: `
    <app-tree-chart title="Potter — Weasley Family" dataPath="assets/data/vault-data.json" />
  `,
})
export class AppComponent {}
