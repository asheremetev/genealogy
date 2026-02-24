import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import * as d3 from 'd3';

import { COLORS, CONFIDENCE_OPACITY, surnameColor } from '../../constants/theme';
import type { Person } from '../../models/domain.model';
import type {
  GenerationBand,
  LayoutLink,
  LayoutNode,
  TimelineMarker,
  TreeLayout,
} from '../../models/layout.model';
import { DEFAULT_LAYOUT } from '../../models/layout.model';
import type { ProcessedVault } from '../../models/vault.model';
import type { ViewMode } from '../../models/view.model';
import { AncestryService } from '../../services/ancestry.service';
import { ExportService } from '../../services/export.service';
import { TreeLayoutService } from '../../services/tree-layout.service';
import { VaultDataService } from '../../services/vault-data.service';

// ─── D3 type aliases ──────────────────────────────────

type SvgSel = d3.Selection<SVGSVGElement, unknown, null, undefined>;
type GSel = d3.Selection<SVGGElement, unknown, null, undefined>;

// ─── Graph mode types ─────────────────────────────────

interface GraphNode extends d3.SimulationNodeDatum {
  readonly id: string;
  readonly person: Person;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  readonly linkType: 'marriage' | 'parent-child';
}

// ─── Surname entry ────────────────────────────────────

interface SurnameEntry {
  readonly name: string;
  readonly count: number;
}

@Component({
  selector: 'app-tree-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree-chart.component.html',
  styleUrl: './tree-chart.component.scss',
})
export class TreeChartComponent {
  // ═══ Dependencies ═══════════════════════════════════

  public readonly vaultDataService = inject(VaultDataService);
  private readonly layoutService = inject(TreeLayoutService);
  private readonly exportService = inject(ExportService);
  private readonly ancestryService = inject(AncestryService);
  private readonly destroyRef = inject(DestroyRef);

  // ═══ Inputs ═════════════════════════════════════════

  public readonly title = input('Genealogy Tree');
  public readonly dataPath = input('assets/data/vault-data.json');

  // ═══ View queries ═══════════════════════════════════

  private readonly svgEl = viewChild.required<ElementRef<SVGSVGElement>>('svgElement');
  private readonly wrapperEl = viewChild.required<ElementRef<HTMLDivElement>>('svgWrapper');

  // ═══ Core state ═════════════════════════════════════

  protected readonly viewMode = signal<ViewMode>('tree');
  protected readonly selectedPerson = signal<Person | null>(null);
  protected readonly highlightedIds = signal<ReadonlySet<string> | null>(null);
  protected readonly activeSurname = signal<string | null>(null);
  protected readonly surnamesPanelOpen = signal(false);
  private readonly svgReady = signal(false);

  // ═══ Computed ═══════════════════════════════════════

  protected readonly layout = computed<TreeLayout | null>(() => {
    const vault = this.vaultDataService.vault();
    return vault ? this.layoutService.calculate(vault, DEFAULT_LAYOUT) : null;
  });

  protected readonly surnames = computed<readonly SurnameEntry[]>(() => {
    const vault = this.vaultDataService.vault();
    if (!vault) return [];

    const counts = new Map<string, number>();
    for (const person of vault.personsList) {
      if (person.surname) {
        counts.set(person.surname, (counts.get(person.surname) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  /**
   * Unified set of "active" person IDs considering both
   * ancestor highlight and surname filter.
   * null = everything active (no filter).
   */
  private readonly activePersonIds = computed<ReadonlySet<string> | null>(() => {
    const highlighted = this.highlightedIds();
    if (highlighted) return highlighted;

    const surname = this.activeSurname();
    if (!surname) return null;

    const vault = this.vaultDataService.vault();
    if (!vault) return null;

    const ids = new Set<string>();
    for (const person of vault.personsList) {
      if (person.surname === surname) ids.add(person.id);
    }
    return ids;
  });

  // ═══ D3 state (mutable, assigned once) ══════════════

  private svg!: SvgSel;
  private rootGroup!: GSel;
  private zoom!: d3.ZoomBehavior<SVGSVGElement, unknown>;
  private simulation: d3.Simulation<GraphNode, GraphLink> | null = null;
  private lastTreeLayout: TreeLayout | null = null;

  // ═══ Constructor (reactive wiring) ══════════════════

  constructor() {
    // Load data
    effect(() => {
      const path = this.dataPath();
      untracked(() => this.vaultDataService.load(path));
    });

    // Init SVG after first render
    afterNextRender(() => {
      this.initSvg();
      this.svgReady.set(true);
    });

    // Render when layout/mode/data changes
    effect(() => {
      const layout = this.layout();
      const mode = this.viewMode();
      const ready = this.svgReady();
      const vault = this.vaultDataService.vault();

      if (!ready || !vault) return;

      untracked(() => {
        if (mode === 'tree' && layout) {
          this.stopSimulation();
          this.renderTree(layout);
          this.fitToScreen();
        } else if (mode === 'graph') {
          this.renderGraph(vault);
        }
      });
    });

    // Update opacities reactively when filter/highlight changes
    effect(() => {
      this.activePersonIds(); // track dependency
      const ready = this.svgReady();
      if (!ready) return;
      untracked(() => this.updateOpacities());
    });

    // Window resize
    const onResize = () => {
      if (this.svgReady()) this.fitToScreen();
    };
    window.addEventListener('resize', onResize);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('resize', onResize);
      this.stopSimulation();
    });
  }

  // ═══ Public actions (template) ══════════════════════

  public setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  public toggleSurnamePanel(): void {
    this.surnamesPanelOpen.update((v) => !v);
  }

  public toggleSurnameFilter(surname: string): void {
    this.activeSurname.update((current) => (current === surname ? null : surname));
  }

  public clearSurnameFilter(): void {
    this.activeSurname.set(null);
  }

  public highlightAncestors(personId: string): void {
    const vault = this.vaultDataService.vault();
    if (!vault) return;
    const ids = this.ancestryService.traceAncestors(personId, vault.persons);
    this.highlightedIds.set(ids);
  }

  public clearHighlight(): void {
    this.highlightedIds.set(null);
  }

  public clearSelection(): void {
    this.selectedPerson.set(null);
    this.highlightedIds.set(null);
  }

  public selectPersonById(id: string): void {
    const vault = this.vaultDataService.vault();
    const person = vault?.persons.get(id);
    if (person) {
      this.selectedPerson.set(person);
      this.highlightAncestors(person.id);
    }
  }

  public getSurnameColor(name: string): string {
    return surnameColor(name);
  }

  public onZoomIn(): void {
    this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.3);
  }

  public onZoomOut(): void {
    this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.7);
  }

  public onFitToScreen(): void {
    this.fitToScreen();
  }

  public async onExportPdf(): Promise<void> {
    await this.exportService.toPdf(this.svgEl().nativeElement);
  }

  public onExportPng(): void {
    this.exportService.toPng(this.svgEl().nativeElement);
  }

  public onPrint(): void {
    this.exportService.print();
  }

  // ═══ SVG init ═══════════════════════════════════════

  private initSvg(): void {
    this.svg = d3.select(this.svgEl().nativeElement);
    this.rootGroup = this.svg.append('g').attr('class', 'root');

    this.zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 5])
      .on('zoom', (e: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.rootGroup.attr('transform', e.transform.toString());
      });

    this.svg.call(this.zoom);
    this.svg.on('dblclick.zoom', () => this.fitToScreen());
    this.svg.on('click', () => {
      this.selectedPerson.set(null);
      this.highlightedIds.set(null);
    });

    this.appendDefs();
  }

  private appendDefs(): void {
    const defs = this.svg.append('defs');

    const mkShadow = (id: string, blur: number, dy: number) => {
      const f = defs.append('filter').attr('id', id);
      f.append('feDropShadow')
        .attr('dx', 0)
        .attr('dy', dy)
        .attr('stdDeviation', blur)
        .attr('flood-color', 'rgba(0,0,0,0.1)');
    };
    mkShadow('shadow', 3, 2);
    mkShadow('shadow-hover', 8, 4);

    // Glow filter for highlighted nodes
    const glow = defs.append('filter').attr('id', 'glow');
    glow
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 6)
      .attr('flood-color', '#3B82F6')
      .attr('flood-opacity', 0.5);
  }

  private fitToScreen(): void {
    const layout = this.lastTreeLayout ?? this.layout();
    if (!layout && this.viewMode() === 'tree') return;

    const wrapper = this.wrapperEl().nativeElement;
    const wW = wrapper.clientWidth;
    const wH = wrapper.clientHeight;

    // For graph mode, use bounding box of root group
    let tW: number, tH: number;
    if (this.viewMode() === 'graph') {
      const bbox = this.rootGroup.node()?.getBBox();
      if (!bbox) return;
      tW = bbox.width + 200;
      tH = bbox.height + 200;
    } else {
      tW = layout!.totalWidth;
      tH = layout!.totalHeight;
    }

    const scale = Math.min(wW / tW, wH / tH) * 0.9;
    const tx = (wW - tW * scale) / 2;
    const ty = (wH - tH * scale) / 2;

    this.svg
      .transition()
      .duration(500)
      .call(this.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  // ═══ Opacity engine ═════════════════════════════════

  private computeNodeOpacity(personId: string, person: Person): number {
    const active = this.activePersonIds();
    if (active && !active.has(personId)) return 0.1;
    return CONFIDENCE_OPACITY[person.confidence] ?? 1.0;
  }

  private isLinkActive(connectedIds: readonly string[]): boolean {
    const active = this.activePersonIds();
    if (!active) return true;
    return connectedIds.some((id) => active.has(id));
  }

  private updateOpacities(): void {
    if (!this.rootGroup) return;

    const mode = this.viewMode();
    const active = this.activePersonIds();
    const highlightSet = this.highlightedIds();

    // ── Update cards / graph nodes ──
    const nodeSelector = mode === 'tree' ? '.card' : '.graph-node';
    this.rootGroup
      .selectAll<SVGGElement, LayoutNode | GraphNode>(nodeSelector)
      .transition()
      .duration(300)
      .attr('opacity', (d) => {
        const id = d.id;
        const person = d.person;
        return this.computeNodeOpacity(id, person);
      });

    // ── Highlighted border (tree mode cards only) ──
    if (mode === 'tree') {
      this.rootGroup
        .selectAll<SVGGElement, LayoutNode>('.card')
        .select('.bg')
        .transition()
        .duration(300)
        .attr('stroke', (d) => (highlightSet?.has(d.id) ? '#3B82F6' : COLORS.card.border))
        .attr('stroke-width', (d) => (highlightSet?.has(d.id) ? 2.5 : 1.5));
    }

    // ── Update links ──
    this.rootGroup
      .selectAll<SVGElement, LayoutLink | GraphLink>('.link-group')
      .transition()
      .duration(300)
      .attr('opacity', (d: any) => {
        if (!active) return d.type === 'marriage' || d.linkType === 'marriage' ? 0.8 : 0.6;
        const ids: string[] =
          d.connectedPersonIds ??
          [d.source?.id ?? d.source, d.target?.id ?? d.target].filter(Boolean);
        return ids.some((id: string) => active.has(id)) ? 0.7 : 0.05;
      });
  }

  // ═══ TREE MODE RENDERING ════════════════════════════

  private renderTree(layout: TreeLayout): void {
    this.lastTreeLayout = layout;
    this.rootGroup.selectAll('*').remove();
    this.renderBands(layout.bands, layout.totalWidth);
    this.renderTimeline(layout.timeline);
    this.renderTreeLinks(layout.links);
    this.renderTreeNodes(layout.nodes);
    this.updateOpacities();
  }

  private renderBands(bands: readonly GenerationBand[], totalWidth: number): void {
    const g = this.rootGroup.append('g').attr('class', 'layer-bands');

    g.selectAll<SVGRectElement, GenerationBand>('rect')
      .data(bands)
      .enter()
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => d.y)
      .attr('width', totalWidth)
      .attr('height', (d) => d.height)
      .attr('fill', (_, i) => (i % 2 === 0 ? COLORS.band.even : COLORS.band.odd))
      .attr('rx', 4);

    g.selectAll<SVGTextElement, GenerationBand>('text')
      .data(bands)
      .enter()
      .append('text')
      .attr('x', 12)
      .attr('y', (d) => d.y + 22)
      .attr('fill', COLORS.band.text)
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .text((d) => `${d.label}${d.yearRange ? ` (${d.yearRange})` : ''}`);
  }

  private renderTimeline(markers: readonly TimelineMarker[]): void {
    if (markers.length === 0) return;
    const g = this.rootGroup.append('g').attr('class', 'layer-timeline');
    const x = DEFAULT_LAYOUT.padding + DEFAULT_LAYOUT.timelineWidth / 2;

    g.append('line')
      .attr('x1', x)
      .attr('y1', markers[0].y - 10)
      .attr('x2', x)
      .attr('y2', markers[markers.length - 1].y + 10)
      .attr('stroke', COLORS.timeline)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.4);

    const mg = g
      .selectAll<SVGGElement, TimelineMarker>('g.marker')
      .data(markers)
      .enter()
      .append('g')
      .attr('class', 'marker');

    mg.append('circle')
      .attr('cx', x)
      .attr('cy', (d) => d.y)
      .attr('r', 4)
      .attr('fill', COLORS.timeline)
      .attr('opacity', 0.6);

    mg.append('text')
      .attr('x', x - 10)
      .attr('y', (d) => d.y + 5)
      .attr('text-anchor', 'end')
      .attr('fill', COLORS.timeline)
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text((d) => d.year);
  }

  private renderTreeLinks(links: readonly LayoutLink[]): void {
    const g = this.rootGroup.append('g').attr('class', 'layer-links');

    // Marriage links
    const marriages = links.filter((l) => l.type === 'marriage');
    const marriageGroups = g
      .selectAll<SVGGElement, LayoutLink>('g.marriage')
      .data(marriages)
      .enter()
      .append('g')
      .attr('class', 'marriage link-group');

    marriageGroups.each(function (d) {
      const sel = d3.select(this);
      const midX = (d.sourceX + d.targetX) / 2;

      sel
        .append('line')
        .attr('x1', d.sourceX)
        .attr('y1', d.sourceY)
        .attr('x2', d.targetX)
        .attr('y2', d.targetY)
        .attr('stroke', COLORS.marriage)
        .attr('stroke-width', 3);

      sel
        .append('circle')
        .attr('cx', midX)
        .attr('cy', d.sourceY)
        .attr('r', 6)
        .attr('fill', 'white')
        .attr('stroke', COLORS.marriage)
        .attr('stroke-width', 2);

      sel
        .append('text')
        .attr('x', midX)
        .attr('y', d.sourceY + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .text('♥');
    });

    // Parent-child links
    const pcLinks = links.filter((l) => l.type === 'parent-child');
    g.selectAll<SVGPathElement, LayoutLink>('path.pc')
      .data(pcLinks)
      .enter()
      .append('path')
      .attr('class', 'pc link-group')
      .attr('d', (d) => this.buildParentChildPath(d))
      .attr('fill', 'none')
      .attr('stroke', COLORS.parentChild)
      .attr('stroke-width', 2);
  }

  private buildParentChildPath(link: LayoutLink): string {
    const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty, midY } = link;
    const my = midY ?? (sy + ty) / 2;
    const r = 8;

    if (Math.abs(sx - tx) < 1) return `M${sx},${sy} L${tx},${ty}`;

    const dir = tx > sx ? 1 : -1;
    return [
      `M${sx},${sy}`,
      `L${sx},${my - r}`,
      `Q${sx},${my} ${sx + dir * r},${my}`,
      `L${tx - dir * r},${my}`,
      `Q${tx},${my} ${tx},${my + r}`,
      `L${tx},${ty}`,
    ].join(' ');
  }

  private renderTreeNodes(nodes: readonly LayoutNode[]): void {
    const g = this.rootGroup.append('g').attr('class', 'layer-nodes');

    const cards = g
      .selectAll<SVGGElement, LayoutNode>('g.card')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'card')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer');

    cards.each((d, i, els) => this.renderCard(d3.select(els[i]), d));

    cards
      .on('click', (event: MouseEvent, d: LayoutNode) => {
        event.stopPropagation();
        const isSame = this.selectedPerson()?.id === d.person.id;
        this.selectedPerson.set(isSame ? null : d.person);
        if (isSame) {
          this.highlightedIds.set(null);
        } else {
          this.highlightAncestors(d.person.id);
        }
      })
      .on('mouseenter', function () {
        d3.select(this).select('.bg').attr('filter', 'url(#shadow-hover)');
      })
      .on('mouseleave', function () {
        d3.select(this).select('.bg').attr('filter', 'url(#shadow)');
      });
  }

  private renderCard(g: GSel, node: LayoutNode): void {
    const { person, width, height } = node;
    const deceased = person.isAlive === false || !!person.deathDate;
    const genderColor = COLORS.gender[person.gender] ?? COLORS.gender.unknown;

    // Background
    g.append('rect')
      .attr('class', 'bg')
      .attr('width', width)
      .attr('height', height)
      .attr('rx', 10)
      .attr('fill', deceased ? COLORS.card.bgDeceased : COLORS.card.bg)
      .attr('stroke', COLORS.card.border)
      .attr('stroke-width', 1.5)
      .attr('filter', 'url(#shadow)');

    // Gender accent bar
    g.append('rect')
      .attr('width', width)
      .attr('height', 5)
      .attr('rx', 10)
      .attr('fill', genderColor);
    g.append('rect').attr('y', 3).attr('width', width).attr('height', 3).attr('fill', genderColor);

    // Generation badge (top-left, moved away from confidence dot)
    g.append('rect')
      .attr('x', 6)
      .attr('y', 9)
      .attr('width', 26)
      .attr('height', 14)
      .attr('rx', 4)
      .attr('fill', 'rgba(0,0,0,0.06)');

    g.append('text')
      .attr('x', 19)
      .attr('y', 19)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', '600')
      .attr('fill', COLORS.text.muted)
      .text(`G${person.generation}`);

    // Deceased marker (top-right)
    if (deceased) {
      g.append('text')
        .attr('x', width - 14)
        .attr('y', 22)
        .attr('text-anchor', 'end')
        .attr('font-size', '14px')
        .attr('opacity', 0.5)
        .text('†');
    }

    // Name
    const fullName = this.formatName(person);
    g.append('text')
      .attr('x', 14)
      .attr('y', 38)
      .attr('font-size', '14px')
      .attr('font-weight', '700')
      .attr('fill', COLORS.text.primary)
      .text(this.truncate(fullName, 24));

    // Dates
    const dates = this.formatDates(person, deceased);
    g.append('text')
      .attr('x', 14)
      .attr('y', 56)
      .attr('font-size', '12px')
      .attr('fill', COLORS.text.secondary)
      .text(dates);

    // Birth place
    if (person.birthPlace) {
      g.append('text')
        .attr('x', 14)
        .attr('y', 74)
        .attr('font-size', '11px')
        .attr('fill', COLORS.text.muted)
        .text(`📍 ${this.truncate(person.birthPlace, 28)}`);
    }

    // Occupation
    if (person.occupation) {
      g.append('text')
        .attr('x', 14)
        .attr('y', 92)
        .attr('font-size', '11px')
        .attr('fill', COLORS.text.muted)
        .text(this.truncate(person.occupation, 28));
    }

    // Confidence dot (bottom-right)
    g.append('circle')
      .attr('cx', width - 16)
      .attr('cy', height - 16)
      .attr('r', 5)
      .attr('fill', COLORS.confidence[person.confidence] ?? '#999');
  }

  // ═══ GRAPH MODE RENDERING ═══════════════════════════

  private renderGraph(vault: ProcessedVault): void {
    this.stopSimulation();
    this.rootGroup.selectAll('*').remove();

    const { graphNodes, graphLinks } = this.buildGraphData(vault);
    if (graphNodes.length === 0) return;

    const linkGroup = this.rootGroup.append('g').attr('class', 'layer-graph-links');
    const nodeGroup = this.rootGroup.append('g').attr('class', 'layer-graph-nodes');

    // ── Links ──
    const linkLines = linkGroup
      .selectAll<SVGLineElement, GraphLink>('line')
      .data(graphLinks)
      .enter()
      .append('line')
      .attr('class', 'link-group')
      .attr('stroke', (d) => (d.linkType === 'marriage' ? COLORS.marriage : COLORS.parentChild))
      .attr('stroke-width', (d) => (d.linkType === 'marriage' ? 3 : 1.5))
      .attr('stroke-dasharray', (d) => (d.linkType === 'marriage' ? '8,4' : 'none'))
      .attr('opacity', (d) => (d.linkType === 'marriage' ? 0.7 : 0.4));

    // ── Nodes ──
    const nodeGroups = nodeGroup
      .selectAll<SVGGElement, GraphNode>('g.graph-node')
      .data(graphNodes, (d) => d.id)
      .enter()
      .append('g')
      .attr('class', 'graph-node')
      .style('cursor', 'grab');

    nodeGroups.each((d, i, els) => this.renderGraphNode(d3.select(els[i]), d));

    nodeGroups.on('click', (event: MouseEvent, d: GraphNode) => {
      event.stopPropagation();
      const isSame = this.selectedPerson()?.id === d.person.id;
      this.selectedPerson.set(isSame ? null : d.person);
      if (isSame) {
        this.highlightedIds.set(null);
      } else {
        this.highlightAncestors(d.person.id);
      }
    });

    // ── Force simulation ──
    this.simulation = d3
      .forceSimulation<GraphNode, GraphLink>(graphNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(graphLinks)
          .id((d) => d.id)
          .distance((d) => (d.linkType === 'marriage' ? 100 : 180))
          .strength(0.5),
      )
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(600, 400))
      .force('collision', d3.forceCollide(55))
      .force(
        'y',
        d3
          .forceY<GraphNode>()
          .y((d) => (d.person.generation ?? 0) * 200)
          .strength(0.12),
      );

    this.simulation.on('tick', () => {
      linkLines
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      nodeGroups.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // ── Drag behavior ──
    const sim = this.simulation;
    const dragBehavior = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeGroups.call(dragBehavior);

    // Fit to screen after simulation settles a bit
    setTimeout(() => this.fitToScreen(), 800);
    this.updateOpacities();
  }

  private buildGraphData(vault: ProcessedVault): {
    graphNodes: GraphNode[];
    graphLinks: GraphLink[];
  } {
    const graphNodes: GraphNode[] = vault.personsList.map((person) => {
      const treeNode = this.lastTreeLayout?.nodes.find((n) => n.id === person.id);
      return {
        id: person.id,
        person,
        x: treeNode ? treeNode.x + treeNode.width / 2 : 400 + Math.random() * 400,
        y: treeNode ? treeNode.y + treeNode.height / 2 : 300 + Math.random() * 300,
      };
    });

    const nodeIdSet = new Set(graphNodes.map((n) => n.id));
    const graphLinks: GraphLink[] = [];

    // Marriage links from families
    for (const family of vault.familiesList) {
      if (
        family.husbandId &&
        family.wifeId &&
        nodeIdSet.has(family.husbandId) &&
        nodeIdSet.has(family.wifeId)
      ) {
        graphLinks.push({
          source: family.husbandId as any,
          target: family.wifeId as any,
          linkType: 'marriage',
        });
      }
    }

    // Parent-child links from persons
    for (const person of vault.personsList) {
      if (person.fatherId && nodeIdSet.has(person.fatherId)) {
        graphLinks.push({
          source: person.fatherId as any,
          target: person.id as any,
          linkType: 'parent-child',
        });
      }
      if (person.motherId && nodeIdSet.has(person.motherId)) {
        graphLinks.push({
          source: person.motherId as any,
          target: person.id as any,
          linkType: 'parent-child',
        });
      }
    }

    return { graphNodes, graphLinks };
  }

  private renderGraphNode(g: GSel, node: GraphNode): void {
    const { person } = node;
    const deceased = person.isAlive === false || !!person.deathDate;
    const genderStroke = COLORS.gender[person.gender] ?? COLORS.gender.unknown;
    const genderFill = COLORS.genderFill[person.gender] ?? COLORS.genderFill.unknown;
    const r = 35;

    // Main circle
    g.append('circle')
      .attr('r', r)
      .attr('fill', genderFill)
      .attr('stroke', genderStroke)
      .attr('stroke-width', deceased ? 1.5 : 2.5);

    // Deceased dashed overlay
    if (deceased) {
      g.append('circle')
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', genderStroke)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.6);
    }

    // Surname (bold, above center)
    g.append('text')
      .attr('y', -6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('fill', COLORS.text.primary)
      .text(this.truncate(person.surname, 12));

    // Given name (below center)
    g.append('text')
      .attr('y', 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', COLORS.text.secondary)
      .text(this.truncate(person.givenName, 12));

    // Generation badge
    g.append('text')
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', COLORS.text.faint)
      .text(`G${person.generation}`);

    // Confidence dot
    g.append('circle')
      .attr('cx', r - 8)
      .attr('cy', r - 8)
      .attr('r', 5)
      .attr('fill', COLORS.confidence[person.confidence] ?? '#999')
      .attr('stroke', 'white')
      .attr('stroke-width', 1.5);

    // Deceased marker
    if (deceased) {
      g.append('text')
        .attr('x', -(r - 8))
        .attr('y', -(r - 12))
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', COLORS.text.muted)
        .text('†');
    }
  }

  private stopSimulation(): void {
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }
  }

  // ═══ Helpers ════════════════════════════════════════

  private formatName(p: Person): string {
    return [p.surname, p.givenName].filter(Boolean).join(' ');
  }

  private formatDates(p: Person, deceased: boolean): string {
    const birth = p.birthDate ?? '?';
    const death = p.deathDate ?? (deceased ? '?' : '');
    return death ? `${birth} — ${death}` : String(birth);
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
  }
}
