import { Injectable } from '@angular/core';
import { getGenerationLabel } from '../constants/theme';
import type { Family, Person } from '../models/domain.model';
import type {
  GenerationBand,
  LayoutConfig,
  LayoutLink,
  LayoutNode,
  TimelineMarker,
  TreeLayout,
} from '../models/layout.model';
import { DEFAULT_LAYOUT } from '../models/layout.model';
import type { ProcessedVault } from '../models/vault.model';

interface FamilyUnit {
  readonly familyId: string | null;
  readonly memberIds: readonly string[];
  readonly childrenIds: readonly string[];
  centerX: number;
}

@Injectable({ providedIn: 'root' })
export class TreeLayoutService {
  public calculate(vault: ProcessedVault, config: LayoutConfig = DEFAULT_LAYOUT): TreeLayout {
    const { persons, families } = vault;

    const genGroups = this.groupByGeneration(persons);
    const sortedGens = Array.from(genGroups.keys()).sort((a, b) => a - b);
    const genUnits = this.buildAllFamilyUnits(sortedGens, genGroups, families, persons);

    this.orderUnits(genUnits, persons, sortedGens);

    const nodes = this.assignPositions(genUnits, persons, config, sortedGens);
    this.resolveOverlaps(nodes, config, sortedGens);
    this.centerParentsOverChildren(nodes, families, config, sortedGens);
    this.resolveOverlaps(nodes, config, sortedGens);
    this.ensureMinX(nodes, config);

    const links = this.buildLinks(nodes, families, config);
    const bands = this.buildBands(sortedGens, genGroups, persons, config);
    const timeline = this.buildTimeline(bands, genGroups, persons);

    const totalWidth = this.computeMax(nodes, (n) => n.x + n.width) + config.padding * 2;
    const totalHeight = this.computeMax(nodes, (n) => n.y + n.height) + config.padding * 2;

    return { nodes, links, bands, timeline, totalWidth, totalHeight };
  }

  // ─── Step 1: Group by generation ──────────────────

  private groupByGeneration(persons: ReadonlyMap<string, Person>): Map<number, string[]> {
    const groups = new Map<number, string[]>();
    for (const [id, person] of persons) {
      const gen = person.generation ?? 0;
      const list = groups.get(gen);
      if (list) list.push(id);
      else groups.set(gen, [id]);
    }
    return groups;
  }

  // ─── Step 2: Build family units ───────────────────

  private buildAllFamilyUnits(
    sortedGens: readonly number[],
    genGroups: ReadonlyMap<number, readonly string[]>,
    families: ReadonlyMap<string, Family>,
    persons: ReadonlyMap<string, Person>,
  ): Map<number, FamilyUnit[]> {
    const result = new Map<number, FamilyUnit[]>();
    for (const gen of sortedGens) {
      const personIds = genGroups.get(gen) ?? [];
      result.set(gen, this.buildFamilyUnits(personIds, families));
    }
    return result;
  }

  private buildFamilyUnits(
    personIds: readonly string[],
    families: ReadonlyMap<string, Family>,
  ): FamilyUnit[] {
    const assigned = new Set<string>();
    const units: FamilyUnit[] = [];

    for (const [famId, family] of families) {
      const members: string[] = [];

      if (family.husbandId && personIds.includes(family.husbandId)) {
        members.push(family.husbandId);
        assigned.add(family.husbandId);
      }
      if (family.wifeId && personIds.includes(family.wifeId)) {
        members.push(family.wifeId);
        assigned.add(family.wifeId);
      }

      if (members.length > 0) {
        units.push({
          familyId: famId,
          memberIds: members,
          childrenIds: family.childrenIds,
          centerX: 0,
        });
      }
    }

    for (const id of personIds) {
      if (!assigned.has(id)) {
        units.push({
          familyId: null,
          memberIds: [id],
          childrenIds: [],
          centerX: 0,
        });
      }
    }

    return units;
  }

  // ─── Step 3: Order units ──────────────────────────

  private orderUnits(
    genUnits: ReadonlyMap<number, FamilyUnit[]>,
    persons: ReadonlyMap<string, Person>,
    sortedGens: readonly number[],
  ): void {
    const gen0Idx = sortedGens.indexOf(0);
    if (gen0Idx === -1) return;

    // Upward: order parents based on children positions
    for (let i = gen0Idx; i < sortedGens.length - 1; i++) {
      const childUnits = genUnits.get(sortedGens[i]) ?? [];
      const parentUnits = genUnits.get(sortedGens[i + 1]) ?? [];
      this.sortByChildIndex(parentUnits, childUnits);
    }

    // Downward: order children based on parent positions
    for (let i = gen0Idx; i > 0; i--) {
      const parentUnits = genUnits.get(sortedGens[i]) ?? [];
      const childUnits = genUnits.get(sortedGens[i - 1]) ?? [];
      this.sortByParentIndex(childUnits, parentUnits, persons);
    }
  }

  private sortByChildIndex(toSort: FamilyUnit[], reference: readonly FamilyUnit[]): void {
    toSort.sort((a, b) => {
      const aIdx = this.findConnectionIndex(a.childrenIds, reference);
      const bIdx = this.findConnectionIndex(b.childrenIds, reference);
      return aIdx - bIdx;
    });
  }

  private sortByParentIndex(
    toSort: FamilyUnit[],
    reference: readonly FamilyUnit[],
    persons: ReadonlyMap<string, Person>,
  ): void {
    toSort.sort((a, b) => {
      const aParents = this.getParentIds(a.memberIds, persons);
      const bParents = this.getParentIds(b.memberIds, persons);
      return (
        this.findConnectionIndex(aParents, reference) -
        this.findConnectionIndex(bParents, reference)
      );
    });
  }

  private findConnectionIndex(
    searchIds: readonly string[],
    reference: readonly FamilyUnit[],
  ): number {
    for (let i = 0; i < reference.length; i++) {
      if (searchIds.some((id) => reference[i].memberIds.includes(id))) return i;
    }
    return reference.length;
  }

  private getParentIds(
    memberIds: readonly string[],
    persons: ReadonlyMap<string, Person>,
  ): string[] {
    const parents: string[] = [];
    for (const id of memberIds) {
      const p = persons.get(id);
      if (p?.fatherId) parents.push(p.fatherId);
      if (p?.motherId) parents.push(p.motherId);
    }
    return parents;
  }

  // ─── Step 4: Position assignment ──────────────────

  private assignPositions(
    genUnits: ReadonlyMap<number, readonly FamilyUnit[]>,
    persons: ReadonlyMap<string, Person>,
    config: LayoutConfig,
    sortedGens: readonly number[],
  ): LayoutNode[] {
    const nodes: LayoutNode[] = [];
    const maxGen = Math.max(...sortedGens);

    for (const gen of sortedGens) {
      const units = genUnits.get(gen) ?? [];
      const genIndex = maxGen - gen;
      const y = config.padding + genIndex * config.generationGap;

      let currentX = config.padding + config.timelineWidth;

      for (const unit of units) {
        for (let i = 0; i < unit.memberIds.length; i++) {
          const person = persons.get(unit.memberIds[i]);
          if (!person) continue;

          nodes.push({
            id: person.id,
            person,
            x: currentX,
            y,
            width: config.cardWidth,
            height: config.cardHeight,
            generation: gen,
          });

          currentX += config.cardWidth;
          currentX += i < unit.memberIds.length - 1 ? config.coupleGap : 0;
        }
        currentX += config.familyGroupGap;
      }
    }

    return nodes;
  }

  // ─── Step 5: Refinement ───────────────────────────

  private centerParentsOverChildren(
    nodes: LayoutNode[],
    families: ReadonlyMap<string, Family>,
    config: LayoutConfig,
    sortedGens: readonly number[],
  ): void {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const [, family] of families) {
      if (family.childrenIds.length === 0) continue;

      const childNodes = family.childrenIds
        .map((id) => nodeMap.get(id))
        .filter(Boolean) as LayoutNode[];
      if (childNodes.length === 0) continue;

      const childrenCenter = this.averageCenterX(childNodes);

      const parentIds = [family.husbandId, family.wifeId].filter(Boolean) as string[];
      const parentNodes = parentIds.map((id) => nodeMap.get(id)).filter(Boolean) as LayoutNode[];
      if (parentNodes.length === 0) continue;

      const parentCenter = this.averageCenterX(parentNodes);
      const shift = (childrenCenter - parentCenter) * 0.5;

      for (const node of parentNodes) {
        node.x += shift;
      }
    }
  }

  private resolveOverlaps(
    nodes: LayoutNode[],
    config: LayoutConfig,
    sortedGens: readonly number[],
  ): void {
    for (const gen of sortedGens) {
      const genNodes = nodes.filter((n) => n.generation === gen).sort((a, b) => a.x - b.x);

      for (let i = 1; i < genNodes.length; i++) {
        const minX = genNodes[i - 1].x + genNodes[i - 1].width + config.siblingGap;
        if (genNodes[i].x < minX) {
          const push = minX - genNodes[i].x;
          for (let j = i; j < genNodes.length; j++) {
            genNodes[j].x += push;
          }
        }
      }
    }
  }

  private ensureMinX(nodes: LayoutNode[], config: LayoutConfig): void {
    const minAllowed = config.padding + config.timelineWidth;
    const minX = Math.min(...nodes.map((n) => n.x));
    if (minX < minAllowed) {
      const shift = minAllowed - minX;
      for (const node of nodes) node.x += shift;
    }
  }

  // ─── Step 6: Links ───────────────────────────────

  private buildLinks(
    nodes: readonly LayoutNode[],
    families: ReadonlyMap<string, Family>,
    config: LayoutConfig,
  ): readonly LayoutLink[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const links: LayoutLink[] = [];

    for (const [, family] of families) {
      const husband = family.husbandId ? nodeMap.get(family.husbandId) : undefined;
      const wife = family.wifeId ? nodeMap.get(family.wifeId) : undefined;

      // ── Marriage link ──
      if (husband && wife) {
        links.push({
          type: 'marriage',
          connectedPersonIds: [husband.id, wife.id],
          sourceX: husband.x + husband.width,
          sourceY: husband.y + husband.height / 2,
          targetX: wife.x,
          targetY: wife.y + wife.height / 2,
        });
      }

      // ── Parent-child links ──
      const parentNodes = [husband, wife].filter(Boolean) as LayoutNode[];
      if (parentNodes.length === 0) continue;

      const coupleCenter = this.averageCenterX(parentNodes);
      const coupleBottom = parentNodes[0].y + parentNodes[0].height;
      const parentIds = parentNodes.map((n) => n.id);

      for (const childId of family.childrenIds) {
        const child = nodeMap.get(childId);
        if (!child) continue;

        const childCenter = child.x + child.width / 2;
        const midY = coupleBottom + (child.y - coupleBottom) / 2;

        links.push({
          type: 'parent-child',
          connectedPersonIds: [...parentIds, child.id],
          sourceX: coupleCenter,
          sourceY: coupleBottom,
          targetX: childCenter,
          targetY: child.y,
          midY,
        });
      }
    }

    return links;
  }

  // ─── Step 7: Bands & timeline ─────────────────────

  private buildBands(
    sortedGens: readonly number[],
    genGroups: ReadonlyMap<number, readonly string[]>,
    persons: ReadonlyMap<string, Person>,
    config: LayoutConfig,
  ): readonly GenerationBand[] {
    const maxGen = Math.max(...sortedGens);

    return sortedGens.map((gen) => {
      const genIndex = maxGen - gen;
      const y = config.padding + genIndex * config.generationGap - 30;
      const years = this.collectBirthYears(genGroups.get(gen) ?? [], persons);

      return {
        generation: gen,
        y,
        height: config.generationGap,
        label: getGenerationLabel(gen),
        yearRange: this.formatYearRange(years),
      };
    });
  }

  private buildTimeline(
    bands: readonly GenerationBand[],
    genGroups: ReadonlyMap<number, readonly string[]>,
    persons: ReadonlyMap<string, Person>,
  ): readonly TimelineMarker[] {
    return bands
      .map((band) => {
        const years = this.collectBirthYears(genGroups.get(band.generation) ?? [], persons);
        if (years.length === 0) return null;
        const avg = Math.round(years.reduce((a, b) => a + b, 0) / years.length);
        return { year: avg, y: band.y + band.height / 2 };
      })
      .filter(Boolean) as TimelineMarker[];
  }

  // ─── Helpers ──────────────────────────────────────

  private averageCenterX(nodes: readonly LayoutNode[]): number {
    return nodes.reduce((sum, n) => sum + n.x + n.width / 2, 0) / nodes.length;
  }

  private computeMax(nodes: readonly LayoutNode[], fn: (n: LayoutNode) => number): number {
    return nodes.reduce((max, n) => Math.max(max, fn(n)), 0);
  }

  private collectBirthYears(
    ids: readonly string[],
    persons: ReadonlyMap<string, Person>,
  ): number[] {
    return ids
      .map((id) => {
        const p = persons.get(id);
        return p?.birthDate ? this.extractYear(p.birthDate) : null;
      })
      .filter((y): y is number => y !== null);
  }

  private extractYear(dateStr: string): number | null {
    const match = String(dateStr).match(/~?(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }

  private formatYearRange(years: readonly number[]): string {
    if (years.length === 0) return '';
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `~${min}` : `${min}–${max}`;
  }
}
