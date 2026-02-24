import { Injectable } from '@angular/core';
import type { Person } from '../models/domain.model';

@Injectable({ providedIn: 'root' })
export class AncestryService {
  /**
   * Traces the ancestor path from a given person up to the oldest known ancestor.
   * Returns a Set of all person IDs on the path (including the starting person).
   * Uses BFS to traverse fatherId/motherId links.
   */
  public traceAncestors(
    personId: string,
    persons: ReadonlyMap<string, Person>,
  ): ReadonlySet<string> {
    const result = new Set<string>();
    const queue: string[] = [personId];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (result.has(id)) continue;

      const person = persons.get(id);
      if (!person) continue;

      result.add(id);

      if (person.fatherId && persons.has(person.fatherId)) {
        queue.push(person.fatherId);
      }
      if (person.motherId && persons.has(person.motherId)) {
        queue.push(person.motherId);
      }
    }

    return result;
  }

  /**
   * Traces both ancestors (upward) and descendants (downward) from a person.
   * Useful for showing the complete lineage through a person.
   */
  public traceLineage(personId: string, persons: ReadonlyMap<string, Person>): ReadonlySet<string> {
    const result = new Set<string>();

    // Trace ancestors
    const ancestors = this.traceAncestors(personId, persons);
    ancestors.forEach((id) => result.add(id));

    // Trace descendants (BFS downward)
    const queue: string[] = [personId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.add(id);

      for (const [childId, child] of persons) {
        if (result.has(childId)) {
          continue;
        }
        if (child.fatherId === id || child.motherId === id) {
          queue.push(childId);
        }
      }
    }

    return result;
  }
}
