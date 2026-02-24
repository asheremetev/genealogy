import { COMMON_FIELDS, FIELD_MAPS, TYPE_MAP, VALUE_MAPS } from './mappings.js';

export interface MappedEntry {
  readonly id: string;
  readonly type: string;
  readonly data: Readonly<Record<string, unknown>>;
}

/**
 * Extracts display name from Obsidian wikilink.
 * "[[Persons/James Potter (1960)|James]]" → "James Potter (1960)"
 * "[[Godric's Hollow]]" → "Godric's Hollow"
 * Plain string → returned as-is
 */
function resolveWikilink(value: string): string {
  const match = value.match(/\[\[(?:[^\]|]*\/)?([^\]|]+?)(?:\|[^\]]+)?\]\]/);
  return match ? match[1].trim() : value;
}

/**
 * Recursively resolves all wikilinks in any value:
 * strings, arrays, nested objects.
 */
function deepResolveWikilinks(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.includes('[[') ? resolveWikilink(value) : value;
  }

  if (Array.isArray(value)) {
    return value.map(deepResolveWikilinks);
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = deepResolveWikilinks(v);
    }
    return result;
  }

  return value;
}

/**
 * Transforms a single YAML frontmatter record from Russian to English.
 *
 * Pipeline:
 *   1. Resolve all wikilinks to plain text IDs
 *   2. Determine entity type (персона → person)
 *   3. Map field names (фамилия → surname)
 *   4. Map enum values (М → M, высокая → high)
 */
export function mapEntry(id: string, rawData: Readonly<Record<string, unknown>>): MappedEntry {
  // Step 1: resolve wikilinks
  const resolved = deepResolveWikilinks(rawData) as Record<string, unknown>;

  // Step 2: determine entity type
  const ruType = String(resolved['тип'] ?? resolved['type'] ?? 'unknown');
  const enType = (TYPE_MAP[ruType] as string) ?? ruType;

  // Step 3: select field map
  const fieldMap: Readonly<Record<string, string>> = FIELD_MAPS[enType] ?? COMMON_FIELDS;

  // Step 4: map fields and values
  const mapped: Record<string, unknown> = {};

  for (const [ruKey, value] of Object.entries(resolved)) {
    const enKey = fieldMap[ruKey] ?? ruKey;
    const valueMap = VALUE_MAPS[enKey];

    if (valueMap && typeof value === 'string' && value in valueMap) {
      mapped[enKey] = valueMap[value];
    } else {
      mapped[enKey] = value;
    }
  }

  return { id, type: enType, data: Object.freeze(mapped) };
}
