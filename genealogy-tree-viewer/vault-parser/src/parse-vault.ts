import { Command } from 'commander';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import matter from 'gray-matter';
import { basename, dirname, join, resolve } from 'path';
import { mapEntry, type MappedEntry } from './mapper.js';

interface VaultExport {
  readonly meta: {
    readonly parsedAt: string;
    readonly vaultPath: string;
    readonly counts: Readonly<Record<string, number>>;
  };
  readonly persons: readonly MappedEntry[];
  readonly families: readonly MappedEntry[];
  readonly places: readonly MappedEntry[];
  readonly events: readonly MappedEntry[];
  readonly sources: readonly MappedEntry[];
  readonly stories: readonly MappedEntry[];
}

const YAML_ENGINE = {
  parse: async (content: string) => {
    // Use gray-matter's default YAML parser but stringify dates back
    const yaml = await import('js-yaml');
    return yaml.load(content, {
      schema: yaml.JSON_SCHEMA, // no date parsing
    });
  },
};

// ─── Recursive date → string converter (fallback) ────

function stringifyDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    // Convert Date back to YYYY-MM-DD string
    const y = obj.getFullYear();
    const m = String(obj.getMonth() + 1).padStart(2, '0');
    const d = String(obj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (Array.isArray(obj)) {
    return obj.map(stringifyDates);
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = stringifyDates(val);
    }
    return result;
  }

  return obj;
}

// ─── Folder scanning ──────────────────────────────────

const FOLDER_CONFIGS = [
  { key: 'persons', folder: 'Persons' },
  { key: 'families', folder: 'Families' },
  { key: 'places', folder: 'Places' },
  { key: 'events', folder: 'Events' },
  { key: 'sources', folder: 'Sources' },
  { key: 'stories', folder: 'Stories' },
] as const;

async function scanFolder(vaultPath: string, folder: string): Promise<MappedEntry[]> {
  const pattern = join(vaultPath, folder, '**/*.md');
  const files = await glob(pattern, { nodir: true });
  const entries: MappedEntry[] = [];

  for (const filePath of files.sort()) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const { data } = matter(raw);

      if (!data || (!data['тип'] && !data['type'])) continue;

      // Convert any Date objects back to strings
      const sanitized = stringifyDates(data) as Record<string, unknown>;

      const id = basename(filePath, '.md');
      entries.push(mapEntry(id, sanitized));
    } catch (err) {
      console.warn(`⚠ Failed to parse: ${filePath}`, (err as Error).message);
    }
  }

  return entries;
}

// ─── Main ─────────────────────────────────────────────

async function main(): Promise<void> {
  const program = new Command();
  program
    .option('--vault <path>', 'Path to Obsidian vault root', '.')
    .option('--out <path>', 'Output JSON path', './vault-data.json')
    .parse();

  const opts = program.opts<{ vault: string; out: string }>();
  const vaultPath = resolve(opts.vault);
  const outPath = resolve(opts.out);

  console.log(`\n📂 Parsing vault: ${vaultPath}`);

  const results = await Promise.all(
    FOLDER_CONFIGS.map(async ({ key, folder }) => {
      const entries = await scanFolder(vaultPath, folder);
      return [key, entries] as const;
    }),
  );

  const data = Object.fromEntries(results) as Record<string, MappedEntry[]>;

  const output: VaultExport = {
    meta: {
      parsedAt: new Date().toISOString(),
      vaultPath,
      counts: Object.fromEntries(FOLDER_CONFIGS.map(({ key }) => [key, data[key].length])),
    },
    persons: data['persons'],
    families: data['families'],
    places: data['places'],
    events: data['events'],
    sources: data['sources'],
    stories: data['stories'],
  };

  const outDir = dirname(outPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ Parsed successfully:`);
  for (const { key } of FOLDER_CONFIGS) {
    console.log(`   ${key}: ${data[key].length}`);
  }
  console.log(`\n📄 Output: ${outPath}\n`);
}

main().catch(console.error);
