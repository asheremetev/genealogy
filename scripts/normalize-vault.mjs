#!/usr/bin/env node
/**
 * Normalize vault filenames and YAML link references.
 *
 * Fixes:
 *   - Multiple spaces collapsed to single
 *   - "  -" / "-  " in family filenames normalized to " - "
 *   - "( ~1800)" → "(~1800)"
 *   - "Name(~" → "Name (~"
 *   - "~ 1800" → "~1800"
 *   - Trailing/leading spaces inside [[links]]
 *   - дата_*: "~" → пусто; "YYYY-01-01" → "~YYYY" если имя файла (~YYYY)
 *
 * Usage: node scripts/normalize-vault.mjs [--dry-run]
 */

import { readdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import { dirname, extname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT = resolve(__dirname, '../vault');
const DRY = process.argv.includes('--dry-run');

const SCAN_DIRS = ['persons', 'families', 'places', 'sources', 'events', 'stories'];

function normalizeFilename(name, { spouseSeparator = false } = {}) {
  const ext = extname(name);
  let base = name.slice(0, -ext.length);

  base = base
    .replace(/~\s+(\d)/g, '~$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');

  if (spouseSeparator) {
    // Применяется только к именам семей: " - " как разделитель супругов.
    // В persons/places дефис может быть частью имени (Санкт-Петербург,
    // Иванов-Петров) и трогать его нельзя.
    base = base.replace(/\s*-\s*/g, ' - ');
  }

  base = base
    .replace(/\s{2,}/g, ' ')
    .replace(/(\S)\(/g, '$1 (')
    .trim();

  return base + ext;
}

function normalizeLinkTarget(target, opts) {
  return normalizeFilename(target + '.md', opts).slice(0, -3);
}

const renames = new Map();
const linkRenames = new Map();

for (const dir of SCAN_DIRS) {
  const abs = join(VAULT, dir);
  let entries;
  try {
    entries = readdirSync(abs);
  } catch {
    continue;
  }
  for (const file of entries) {
    if (!file.endsWith('.md')) continue;
    const normalized = normalizeFilename(file, { spouseSeparator: dir === 'families' });
    if (normalized !== file) {
      renames.set(join(abs, file), join(abs, normalized));
      linkRenames.set(file.slice(0, -3), normalized.slice(0, -3));
    }
  }
}

const allFiles = [];
for (const dir of SCAN_DIRS) {
  const abs = join(VAULT, dir);
  let entries;
  try {
    entries = readdirSync(abs);
  } catch {
    continue;
  }
  for (const file of entries) {
    if (file.endsWith('.md')) allFiles.push(join(abs, file));
  }
}

const postNames = new Set();
for (const dir of SCAN_DIRS) {
  const abs = join(VAULT, dir);
  let entries;
  try {
    entries = readdirSync(abs);
  } catch {
    continue;
  }
  for (const file of entries) {
    if (!file.endsWith('.md')) continue;
    const final = linkRenames.get(file.slice(0, -3)) ?? file.slice(0, -3);
    postNames.add(final);
  }
}

const LINK_RE = /\[\[([^\[\]|#]+?)(\|[^\]]+)?\]\]/g;

function normalizeDateValue(value, filename) {
  if (value == null) return value;
  const raw = String(value).trim().replace(/^["']|["']$/g, '');
  if (raw === '~' || raw === '') return '';
  const m = filename.match(/\(~(\d{4})\)/);
  if (m) {
    const year = m[1];
    if (raw === `${year}-01-01`) return `~${year}`;
  }
  return raw;
}

function rewriteFile(path) {
  let content = readFileSync(path, 'utf8');
  const original = content;
  const baseName = path.split('/').pop();

  content = content.replace(LINK_RE, (match, target, alias) => {
    const trimmed = target.trim();
    // Try plain normalization first (safe for places/persons — keeps dashes).
    const plain = normalizeLinkTarget(trimmed);
    if (postNames.has(plain)) return `[[${plain}${alias ?? ''}]]`;
    // Fallback: normalize with spouse separator (for family links).
    const withSep = normalizeLinkTarget(trimmed, { spouseSeparator: true });
    if (postNames.has(withSep)) return `[[${withSep}${alias ?? ''}]]`;
    return `[[${trimmed}${alias ?? ''}]]`;
  });

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    let fm = fmMatch[1];
    const dateFields = ['дата_рождения', 'дата_смерти', 'дата_крещения', 'дата_брака', 'дата_развода'];
    for (const field of dateFields) {
      // [ \t] вместо \s — чтобы не захватывать \n и не склеивать строки
      const re = new RegExp(`^(${field}:)[ \\t]*([^\\n]*)$`, 'm');
      const m = fm.match(re);
      if (!m) continue;
      const newVal = normalizeDateValue(m[2], baseName);
      const rendered = newVal === '' ? `${m[1]}` : `${m[1]} ${newVal}`;
      fm = fm.replace(re, rendered);
    }
    content = content.replace(fmMatch[0], `---\n${fm}\n---`);
  }

  if (content !== original) {
    if (!DRY) writeFileSync(path, content);
    return true;
  }
  return false;
}

let rewrittenCount = 0;
for (const path of allFiles) {
  if (rewriteFile(path)) rewrittenCount++;
}

let renamedCount = 0;
for (const [oldPath, newPath] of renames) {
  if (!DRY) {
    try {
      renameSync(oldPath, newPath);
    } catch (err) {
      console.error(`Rename failed: ${oldPath} → ${newPath}: ${err.message}`);
      continue;
    }
  }
  renamedCount++;
  console.log(`RENAME: ${oldPath.replace(VAULT + '/', '')} → ${newPath.replace(VAULT + '/', '')}`);
}

console.log(`\n${DRY ? '[dry-run] ' : ''}Renamed: ${renamedCount} · Content rewrites: ${rewrittenCount}`);
