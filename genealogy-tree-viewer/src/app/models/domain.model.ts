export type Gender = 'M' | 'F' | 'unknown';
export type Confidence = 'high' | 'medium' | 'low' | 'speculative';
export type ResearchStatus = 'complete' | 'partial' | 'started' | 'not_started';
export type Priority = 'high' | 'medium' | 'low';
export type MarriageStatus = 'married' | 'widowed' | 'divorced' | 'unknown';

export interface Person {
  readonly id: string;
  readonly surname: string;
  readonly givenName: string;
  readonly patronymic: string;
  readonly gender: Gender;
  readonly birthDate?: string;
  readonly birthPlace?: string;
  readonly deathDate?: string;
  readonly deathPlace?: string;
  readonly baptismDate?: string;
  readonly baptismPlace?: string;
  readonly fatherId?: string;
  readonly motherId?: string;
  readonly familyIds: readonly string[];
  readonly occupation?: string;
  readonly socialClass?: string;
  readonly education?: string;
  readonly religion?: string;
  readonly generation: number;
  readonly residences: readonly string[];
  readonly isAlive?: boolean | null;
  readonly confidence: Confidence;
  readonly researchStatus?: ResearchStatus;
  readonly priority?: Priority;
}

export interface Family {
  readonly id: string;
  readonly husbandId?: string;
  readonly wifeId?: string;
  readonly marriageDate?: string;
  readonly marriagePlace?: string;
  readonly weddingPlace?: string;
  readonly divorceDate?: string;
  readonly marriageStatus: MarriageStatus;
  readonly confidence: Confidence;
  readonly childrenIds: readonly string[]; // computed in service
}

export interface Place {
  readonly id: string;
  readonly name: string;
  readonly placeType?: string;
  readonly modernName?: string;
  readonly currentCountry?: string;
  readonly currentRegion?: string;
  readonly historicalCountry?: string;
  readonly historicalRegion?: string;
  readonly coordinates?: readonly [number, number];
  readonly relevancePeriod?: string;
  readonly exists?: boolean | null;
}

export interface HistoricalEvent {
  readonly id: string;
  readonly title: string;
  readonly eventType: string;
  readonly date?: string;
  readonly endDate?: string;
  readonly placeId?: string;
  readonly participantIds: readonly string[];
  readonly relatedFamilyIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly summary?: string;
  readonly confidence?: Confidence;
}
