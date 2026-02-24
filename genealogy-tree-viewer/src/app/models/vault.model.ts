import type { Family, HistoricalEvent, Person, Place } from './domain.model';

export interface RawEntry {
  readonly id: string;
  readonly type: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface RawVaultExport {
  readonly meta: {
    readonly parsedAt: string;
    readonly vaultPath: string;
    readonly counts: Readonly<Record<string, number>>;
  };
  readonly persons: readonly RawEntry[];
  readonly families: readonly RawEntry[];
  readonly places: readonly RawEntry[];
  readonly events: readonly RawEntry[];
  readonly sources: readonly RawEntry[];
  readonly stories: readonly RawEntry[];
}

export interface ProcessedVault {
  readonly persons: ReadonlyMap<string, Person>;
  readonly families: ReadonlyMap<string, Family>;
  readonly places: ReadonlyMap<string, Place>;
  readonly events: readonly HistoricalEvent[];
  readonly personsList: readonly Person[];
  readonly familiesList: readonly Family[];
}
