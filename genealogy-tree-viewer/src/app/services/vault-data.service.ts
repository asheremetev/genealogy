import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { take } from 'rxjs';
import type {
  Confidence,
  Family,
  Gender,
  HistoricalEvent,
  MarriageStatus,
  Person,
  Place,
} from '../models/domain.model';
import type { ProcessedVault, RawEntry, RawVaultExport } from '../models/vault.model';

type LoadState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'loaded'; readonly data: ProcessedVault }
  | { readonly status: 'error'; readonly message: string };

@Injectable({ providedIn: 'root' })
export class VaultDataService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<LoadState>({ status: 'idle' });

  public readonly vault = computed<ProcessedVault | null>(() => {
    const s = this.state();
    return s.status === 'loaded' ? s.data : null;
  });

  public readonly loading = computed(() => this.state().status === 'loading');
  public readonly error = computed(() => {
    const s = this.state();
    return s.status === 'error' ? s.message : null;
  });

  public load(path = 'assets/data/vault-data.json'): void {
    if (this.state().status === 'loading') {
      return;
    }

    this.state.set({ status: 'loading' });

    this.http
      .get<RawVaultExport>(path)
      .pipe(take(1))
      .subscribe({
        next: (raw) => {
          const data = this.process(raw);
          this.state.set({ status: 'loaded', data });
        },
        error: (err) => {
          this.state.set({ status: 'error', message: String(err.message ?? err) });
        },
      });
  }

  private process(raw: RawVaultExport): ProcessedVault {
    const persons = this.buildPersonsMap(raw.persons);
    const families = this.buildFamiliesMap(raw.families, persons);
    const places = this.buildPlacesMap(raw.places);
    const events = this.buildEventsList(raw.events);

    return {
      persons,
      families,
      places,
      events,
      personsList: Array.from(persons.values()),
      familiesList: Array.from(families.values()),
    };
  }

  private buildPersonsMap(entries: readonly RawEntry[]): ReadonlyMap<string, Person> {
    const map = new Map<string, Person>();
    for (const entry of entries) {
      map.set(entry.id, this.toPerson(entry));
    }
    return map;
  }

  private buildFamiliesMap(
    entries: readonly RawEntry[],
    persons: ReadonlyMap<string, Person>,
  ): ReadonlyMap<string, Family> {
    const map = new Map<string, Family>();

    for (const entry of entries) {
      map.set(entry.id, this.toFamily(entry));
    }

    // Compute childrenIds: scan persons for matching father/mother
    for (const [, person] of persons) {
      if (!person.fatherId && !person.motherId) {
        continue;
      }

      for (const [famId, family] of map) {
        const fatherMatch = family.husbandId === person.fatherId;
        const motherMatch = family.wifeId === person.motherId;

        if (
          (fatherMatch && motherMatch) ||
          (fatherMatch && !family.wifeId) ||
          (!family.husbandId && motherMatch)
        ) {
          // Rebuild with added child (immutable pattern)
          map.set(famId, {
            ...family,
            childrenIds: [...family.childrenIds, person.id],
          });
          break;
        }
      }
    }

    return map;
  }

  private buildPlacesMap(entries: readonly RawEntry[]): ReadonlyMap<string, Place> {
    const map = new Map<string, Place>();
    for (const entry of entries) {
      map.set(entry.id, this.toPlace(entry));
    }
    return map;
  }

  private buildEventsList(entries: readonly RawEntry[]): readonly HistoricalEvent[] {
    return entries.map((e) => this.toEvent(e));
  }

  // ─── Entity mappers ────────────────────────────────

  private toPerson(entry: RawEntry): Person {
    const d = entry.data;
    return {
      id: entry.id,
      surname: this.str(d['surname']),
      givenName: this.str(d['givenName']),
      patronymic: this.str(d['patronymic']),
      gender: (d['gender'] as Gender) ?? 'unknown',
      birthDate: this.optStr(d['birthDate']),
      birthPlace: this.optStr(d['birthPlace']),
      deathDate: this.optStr(d['deathDate']),
      deathPlace: this.optStr(d['deathPlace']),
      baptismDate: this.optStr(d['baptismDate']),
      baptismPlace: this.optStr(d['baptismPlace']),
      fatherId: this.optStr(d['fatherId']),
      motherId: this.optStr(d['motherId']),
      familyIds: this.strArray(d['familyIds']),
      occupation: this.optStr(d['occupation']),
      socialClass: this.optStr(d['socialClass']),
      education: this.optStr(d['education']),
      religion: this.optStr(d['religion']),
      generation: Number(d['generation'] ?? 0),
      residences: this.strArray(d['residences']),
      isAlive: (d['isAlive'] as boolean | null) ?? null,
      confidence: (d['confidence'] as Confidence) ?? 'medium',
      researchStatus: (d['researchStatus'] as any) ?? undefined,
      priority: (d['priority'] as any) ?? undefined,
    };
  }

  private toFamily(entry: RawEntry): Family {
    const d = entry.data;
    return {
      id: entry.id,
      husbandId: this.optStr(d['husbandId']),
      wifeId: this.optStr(d['wifeId']),
      marriageDate: this.optStr(d['marriageDate']),
      marriagePlace: this.optStr(d['marriagePlace']),
      weddingPlace: this.optStr(d['weddingPlace']),
      divorceDate: this.optStr(d['divorceDate']),
      marriageStatus: (d['marriageStatus'] as MarriageStatus) ?? 'unknown',
      confidence: (d['confidence'] as Confidence) ?? 'medium',
      childrenIds: [],
    };
  }

  private toPlace(entry: RawEntry): Place {
    const d = entry.data;
    return {
      id: entry.id,
      name: this.str(d['name'] ?? entry.id),
      placeType: this.optStr(d['placeType']),
      modernName: this.optStr(d['modernName']),
      currentCountry: this.optStr(d['currentCountry']),
      currentRegion: this.optStr(d['currentRegion']),
      historicalCountry: this.optStr(d['historicalCountry']),
      historicalRegion: this.optStr(d['historicalRegion']),
      coordinates: (d['coordinates'] as [number, number]) ?? undefined,
      relevancePeriod: this.optStr(d['relevancePeriod']),
      exists: (d['exists'] as boolean | null) ?? null,
    };
  }

  private toEvent(entry: RawEntry): HistoricalEvent {
    const d = entry.data;
    return {
      id: entry.id,
      title: this.str(d['title'] ?? entry.id),
      eventType: this.str(d['eventType'] ?? 'other'),
      date: this.optStr(d['date']),
      endDate: this.optStr(d['endDate']),
      placeId: this.optStr(d['placeId']),
      participantIds: this.strArray(d['participantIds']),
      relatedFamilyIds: this.strArray(d['relatedFamilyIds']),
      sourceIds: this.strArray(d['sourceIds']),
      summary: this.optStr(d['summary']),
      confidence: (d['confidence'] as Confidence) ?? undefined,
    };
  }

  // ─── Type-safe value extractors ─────────────────────

  private str(val: unknown): string {
    return val != null ? String(val) : '';
  }

  private optStr(val: unknown): string | undefined {
    return val != null && val !== '' ? String(val) : undefined;
  }

  private strArray(val: unknown): readonly string[] {
    if (Array.isArray(val)) return val.map(String);
    return [];
  }
}
