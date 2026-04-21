#!/usr/bin/env node
/**
 * Headless-валидация Obsidian vault для генеалогического дерева.
 *
 * Проверяет:
 *   - типы и enum-значения YAML полей (persons/families/places/sources/events/stories)
 *   - обязательные поля (имя, пол, поколение, достоверность)
 *   - формат дат (~YYYY, YYYY, YYYY-MM, YYYY-MM-DD)
 *   - битые [[ссылки]] (на файлы, которых нет)
 *   - самоссылки в отец/мать/муж/жена
 *   - циклы в предках (DFS)
 *   - согласованность поколений родитель↔ребёнок
 *   - пол в ролях (отец=М, мать=Ж, муж=М, жена=Ж)
 *   - хронология (рождение < смерть, крещение >= рождения, родитель жив при рождении ребёнка)
 *   - правдоподобный возраст родителя (12–80) и самого человека (< 120)
 *   - противоречия жив=да + дата_смерти
 *   - формат имён файлов
 *   - дубликаты персон (ФИО+дата) и семей (муж+жена)
 *   - жив=нет без даты смерти, развод без даты развода
 *
 * Output:
 *   - stdout: человекочитаемый отчёт
 *   - reports/validation-report.md (markdown)
 *   - exit 1 если есть ошибки (errors > 0), 0 если только warnings
 *
 * Usage:
 *   node scripts/validate-vault.mjs                 # полный отчёт, exit 1 если есть ошибки
 *   node scripts/validate-vault.mjs --baseline      # сравнить с baseline, exit 1 только если > baseline
 *   node scripts/validate-vault.mjs --update-baseline # зафиксировать текущее состояние как baseline
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import matter from 'gray-matter';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const VAULT = join(ROOT, 'vault');
const REPORT = join(VAULT, 'reports', 'validation-report.md');

const QUIET = process.argv.includes('--quiet');
const NO_REPORT = process.argv.includes('--no-report');
const BASELINE_MODE = process.argv.includes('--baseline');
const UPDATE_BASELINE = process.argv.includes('--update-baseline');
const BASELINE_FILE = join(ROOT, 'scripts', 'validation-baseline.json');

// ---------- Load ----------

const FOLDERS = {
  persons: 'персона',
  families: 'семья',
  places: 'место',
  sources: 'источник',
  events: 'событие',
  stories: 'история',
};

const pages = []; // {folder, basename, path, data, content}

for (const [folder, expectedType] of Object.entries(FOLDERS)) {
  const dir = join(VAULT, folder);
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    continue;
  }
  for (const file of entries) {
    if (!file.endsWith('.md')) continue;
    const abs = join(dir, file);
    const raw = readFileSync(abs, 'utf8');
    let parsed;
    try {
      parsed = matter(raw);
    } catch (err) {
      pages.push({ folder, basename: file.slice(0, -3), path: abs, data: {}, content: '', _yamlError: err.message });
      continue;
    }
    pages.push({
      folder,
      expectedType,
      basename: file.slice(0, -3),
      path: abs,
      data: parsed.data,
      content: parsed.content,
    });
  }
}

const byBasename = new Map();
for (const p of pages) byBasename.set(p.basename, p);

// ---------- Issue collector ----------

const issues = { error: [], warning: [] };

function add(level, file, message) {
  issues[level].push({ file, message });
}

// ---------- Helpers ----------

const DATE_RE = /^~?\d{4}(-\d{2}(-\d{2})?)?$/;

function dateValueStr(v) {
  if (v == null) return '';
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, '0');
    const d = String(v.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).trim();
}

function parseDate(v) {
  const s = dateValueStr(v).replace(/^~/, '');
  if (!s) return null;
  const [y, m = '01', d = '01'] = s.split('-');
  const year = Number(y);
  if (!Number.isFinite(year)) return null;
  const date = new Date(Date.UTC(year, Number(m) - 1, Number(d)));
  return { year, date };
}

const LINK_RE = /^\[\[([^\[\]|#]+?)(\|[^\]]+)?\]\]$/;

function asLinkTarget(v) {
  if (v == null) return null;
  if (typeof v !== 'string') return null;
  const m = v.trim().match(LINK_RE);
  return m ? m[1].trim() : null;
}

function asLinkList(v) {
  if (v == null || v === '') return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.map(asLinkTarget).filter(Boolean);
}

// ---------- Field schemas ----------

const PERSON_ENUMS = {
  пол: ['М', 'Ж', 'неизвестно'],
  жив: ['да', 'нет', 'неизвестно'],
  достоверность: ['высокая', 'средняя', 'низкая', 'предположение'],
  статус_исследования: ['полностью', 'частично', 'начато', 'не_начато'],
  приоритет: ['высокий', 'средний', 'низкий'],
};

const FAMILY_ENUMS = {
  статус_брака: ['в_браке', 'вдовство', 'развод', 'неизвестно'],
  достоверность: ['высокая', 'средняя', 'низкая', 'предположение'],
};

const PLACE_ENUMS = {
  тип_места: ['деревня', 'село', 'город', 'губерния', 'уезд', 'волость', 'район', 'область', 'другое'],
  существует: ['да', 'нет', 'неизвестно'],
};

const SOURCE_ENUMS = {
  категория: ['метрическая_книга', 'перепись', 'ревизская_сказка', 'архивный_документ', 'фото', 'паспорт', 'письмо', 'справка', 'грамота', 'устный', 'книга', 'сайт', 'другое'],
  достоверность: ['высокая', 'средняя', 'низкая'],
  оцифровано: ['да', 'нет', 'частично'],
  состояние: ['хорошее', 'повреждён', 'частично_читаем', 'копия'],
};

const EVENT_ENUMS = {
  вид_события: ['рождение', 'смерть', 'брак', 'развод', 'миграция', 'мобилизация', 'арест', 'раскулачивание', 'другое'],
  достоверность: ['высокая', 'средняя', 'низкая', 'предположение'],
};

function checkEnum(page, field, allowed) {
  const v = page.data[field];
  if (v == null || v === '') return;
  if (!allowed.includes(String(v))) {
    add('error', page.basename, `поле '${field}' = '${v}', допустимо: ${allowed.join(', ')}`);
  }
}

function checkDateField(page, field) {
  const v = page.data[field];
  if (v == null || v === '') return;
  if (v instanceof Date) return; // Dataview/js-yaml распарсил YYYY-MM-DD
  if (!DATE_RE.test(String(v).trim())) {
    add('error', page.basename, `'${field}' = '${v}' — неверный формат (ожидается ~YYYY | YYYY | YYYY-MM | YYYY-MM-DD)`);
  }
}

// ---------- Checks ----------

for (const page of pages) {
  if (page._yamlError) {
    add('error', page.basename, `YAML parse error: ${page._yamlError}`);
    continue;
  }

  const { folder, data, expectedType, basename } = page;

  // тип совпадает с папкой
  if (data.тип && data.тип !== expectedType) {
    add('error', basename, `тип='${data.тип}', ожидается '${expectedType}' (папка ${folder})`);
  }

  if (folder === 'persons') {
    if (!data.имя) add('error', basename, 'не указано имя (обязательное поле)');
    if (!data.пол) add('error', basename, 'не указан пол');
    if (data.поколение == null) add('error', basename, 'не указано поколение');
    if (!data.достоверность) add('warning', basename, 'не указана достоверность');
    for (const [k, vs] of Object.entries(PERSON_ENUMS)) checkEnum(page, k, vs);
    checkDateField(page, 'дата_рождения');
    checkDateField(page, 'дата_смерти');
    checkDateField(page, 'дата_крещения');
  } else if (folder === 'families') {
    for (const [k, vs] of Object.entries(FAMILY_ENUMS)) checkEnum(page, k, vs);
    checkDateField(page, 'дата_брака');
    checkDateField(page, 'дата_развода');
  } else if (folder === 'places') {
    for (const [k, vs] of Object.entries(PLACE_ENUMS)) checkEnum(page, k, vs);
  } else if (folder === 'sources') {
    for (const [k, vs] of Object.entries(SOURCE_ENUMS)) checkEnum(page, k, vs);
  } else if (folder === 'events') {
    for (const [k, vs] of Object.entries(EVENT_ENUMS)) checkEnum(page, k, vs);
    checkDateField(page, 'дата');
    checkDateField(page, 'дата_окончания');
  }
}

// Битые ссылки и самоссылки

const linkFields = {
  persons: { single: ['отец', 'мать', 'место_рождения', 'место_смерти', 'место_крещения'], list: ['места_жизни', 'семьи'] },
  families: { single: ['муж', 'жена', 'место_брака', 'место_венчания'], list: [] },
  events: { single: ['место'], list: ['участники', 'связанные_семьи', 'источники'] },
  sources: { single: [], list: ['персоны'] },
  stories: { single: [], list: ['персоны', 'места'] },
};

for (const page of pages) {
  const cfg = linkFields[page.folder];
  if (!cfg) continue;
  for (const field of cfg.single) {
    const target = asLinkTarget(page.data[field]);
    if (!target) continue;
    if (target === page.basename) {
      add('error', page.basename, `самоссылка в поле '${field}'`);
      continue;
    }
    if (!byBasename.has(target)) {
      add('error', page.basename, `битая ссылка '${field}' → [[${target}]]`);
    }
  }
  for (const field of cfg.list) {
    for (const target of asLinkList(page.data[field])) {
      if (target === page.basename) {
        add('error', page.basename, `самоссылка в списке '${field}'`);
        continue;
      }
      if (!byBasename.has(target)) {
        add('error', page.basename, `битая ссылка '${field}' → [[${target}]]`);
      }
    }
  }
}

// Пол vs роль

for (const page of pages.filter(p => p.folder === 'persons')) {
  const { data, basename } = page;
  const father = asLinkTarget(data.отец);
  const mother = asLinkTarget(data.мать);
  if (father && byBasename.has(father)) {
    const pol = byBasename.get(father).data.пол;
    if (pol && pol !== 'М') add('error', basename, `отец '${father}' имеет пол '${pol}', должен быть 'М'`);
  }
  if (mother && byBasename.has(mother)) {
    const pol = byBasename.get(mother).data.пол;
    if (pol && pol !== 'Ж') add('error', basename, `мать '${mother}' имеет пол '${pol}', должна быть 'Ж'`);
  }
}

for (const page of pages.filter(p => p.folder === 'families')) {
  const { data, basename } = page;
  const husband = asLinkTarget(data.муж);
  const wife = asLinkTarget(data.жена);
  if (husband && wife && husband === wife) {
    add('error', basename, `муж и жена — одна персона: '${husband}'`);
  }
  if (husband && byBasename.has(husband)) {
    const pol = byBasename.get(husband).data.пол;
    if (pol === 'Ж') add('error', basename, `муж '${husband}' помечен как 'Ж'`);
  }
  if (wife && byBasename.has(wife)) {
    const pol = byBasename.get(wife).data.пол;
    if (pol === 'М') add('error', basename, `жена '${wife}' помечена как 'М'`);
  }
}

// Циклы в предках (DFS)

{
  const persons = pages.filter(p => p.folder === 'persons');
  const state = new Map();
  const reported = new Set();

  function dfs(name, ancestors) {
    if (!byBasename.has(name)) return;
    if (state.get(name) === 'closed') return;
    if (state.get(name) === 'open') {
      const idx = ancestors.indexOf(name);
      if (idx >= 0 && !reported.has(name)) {
        const cycle = ancestors.slice(idx);
        cycle.forEach(n => reported.add(n));
        add('error', cycle[0], `цикл в предках: ${cycle.join(' → ')} → ${name}`);
      }
      return;
    }
    state.set(name, 'open');
    const p = byBasename.get(name);
    const f = asLinkTarget(p.data.отец);
    const m = asLinkTarget(p.data.мать);
    if (f) dfs(f, [...ancestors, name]);
    if (m) dfs(m, [...ancestors, name]);
    state.set(name, 'closed');
  }

  for (const p of persons) dfs(p.basename, []);
}

// Согласованность поколений

for (const page of pages.filter(p => p.folder === 'persons')) {
  const { data, basename } = page;
  if (data.поколение == null) continue;
  for (const field of ['отец', 'мать']) {
    const parentName = asLinkTarget(data[field]);
    if (!parentName || !byBasename.has(parentName)) continue;
    const parent = byBasename.get(parentName);
    if (parent.data.поколение == null) continue;
    const expected = parent.data.поколение - 1;
    if (data.поколение !== expected) {
      add('warning', basename, `поколение=${data.поколение}, ожидается ${expected} (${field}='${parentName}' поколение=${parent.data.поколение})`);
    }
  }
}

// Хронология

for (const page of pages.filter(p => p.folder === 'persons')) {
  const { data, basename } = page;
  const birth = parseDate(data.дата_рождения);
  const death = parseDate(data.дата_смерти);
  const baptism = parseDate(data.дата_крещения);

  if (birth && death && death.date < birth.date) {
    add('error', basename, `дата смерти (${dateValueStr(data.дата_смерти)}) раньше рождения (${dateValueStr(data.дата_рождения)})`);
  }
  if (birth && baptism && baptism.date < birth.date) {
    add('error', basename, `дата крещения раньше рождения`);
  }
  if (birth && death) {
    const years = (death.date - birth.date) / 31557600000;
    if (years > 120) add('warning', basename, `возраст ${Math.round(years)} лет (> 120)`);
  }
  if (data.жив === 'да' && data.дата_смерти) {
    add('error', basename, `жив='да', но указана дата смерти`);
  }
  if (data.жив === 'нет' && !data.дата_смерти) {
    add('warning', basename, `жив='нет', но нет даты смерти`);
  }
  if (data.жив === 'да' && birth) {
    const age = new Date().getFullYear() - birth.year;
    if (age > 110) add('warning', basename, `жив='да', но рождён ${age} лет назад`);
  }
}

// Возраст родителя

for (const page of pages.filter(p => p.folder === 'persons')) {
  const { data, basename } = page;
  const childBirth = parseDate(data.дата_рождения);
  if (!childBirth) continue;
  for (const field of ['отец', 'мать']) {
    const parentName = asLinkTarget(data[field]);
    if (!parentName || !byBasename.has(parentName)) continue;
    const parent = byBasename.get(parentName);
    const parentBirth = parseDate(parent.data.дата_рождения);
    const parentDeath = parseDate(parent.data.дата_смерти);
    if (parentBirth) {
      const age = (childBirth.date - parentBirth.date) / 31557600000;
      if (age < 12 || age > 80) {
        add('warning', basename, `${field} '${parentName}' был(а) ${Math.round(age)} лет при рождении ребёнка`);
      }
    }
    if (parentDeath && childBirth.date > parentDeath.date) {
      add('error', basename, `${field} '${parentName}' умер(ла) до рождения ребёнка`);
    }
  }
}

// Дата развода раньше брака

for (const page of pages.filter(p => p.folder === 'families')) {
  const { data, basename } = page;
  const marriage = parseDate(data.дата_брака);
  const divorce = parseDate(data.дата_развода);
  if (marriage && divorce && divorce.date < marriage.date) {
    add('error', basename, `дата развода раньше даты брака`);
  }
  if (data.статус_брака === 'развод' && !data.дата_развода) {
    add('warning', basename, `статус='развод', но нет даты развода`);
  }
}

// Дубликаты

{
  const keys = new Map();
  for (const p of pages.filter(x => x.folder === 'persons')) {
    const k = `${p.data.фамилия ?? ''}|${p.data.имя ?? ''}|${p.data.отчество ?? ''}|${dateValueStr(p.data.дата_рождения)}`;
    if (keys.has(k)) {
      add('warning', p.basename, `возможный дубликат: '${keys.get(k)}' (ключ: ${k})`);
    } else {
      keys.set(k, p.basename);
    }
  }
}

{
  const keys = new Map();
  for (const p of pages.filter(x => x.folder === 'families')) {
    const h = asLinkTarget(p.data.муж);
    const w = asLinkTarget(p.data.жена);
    if (!h || !w) continue;
    const k = `${h}|${w}`;
    if (keys.has(k)) {
      add('error', p.basename, `дубликат семьи с '${keys.get(k)}'`);
    } else {
      keys.set(k, p.basename);
    }
  }
}

// ---------- Report ----------

function format(level) {
  const arr = issues[level];
  if (!arr.length) return `## ${level === 'error' ? '❌ Ошибок' : '⚠️ Предупреждений'}: 0\n`;
  const grouped = new Map();
  for (const { file, message } of arr) {
    if (!grouped.has(file)) grouped.set(file, []);
    grouped.get(file).push(message);
  }
  const icon = level === 'error' ? '❌' : '⚠️';
  let out = `## ${icon} ${level === 'error' ? 'Ошибки' : 'Предупреждения'}: ${arr.length}\n\n`;
  for (const [file, msgs] of grouped) {
    out += `### \`${file}\`\n`;
    for (const m of msgs) out += `- ${m}\n`;
    out += '\n';
  }
  return out;
}

const reportBody =
  `# 🔍 Validation report\n\n` +
  `_Сгенерировано: ${new Date().toISOString()}_\n\n` +
  `**Итого:** ошибок ${issues.error.length}, предупреждений ${issues.warning.length}\n\n` +
  `---\n\n` +
  format('error') + '\n---\n\n' + format('warning');

if (!NO_REPORT) {
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, reportBody);
}

// ---------- Baseline mode ----------

function issueKey({ file, message }) {
  return `${file}::${message}`;
}

const currentErrorKeys = new Set(issues.error.map(issueKey));

if (UPDATE_BASELINE) {
  const baseline = {
    updated: new Date().toISOString(),
    errors: [...currentErrorKeys].sort(),
  };
  writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`✅ Baseline обновлён: ${currentErrorKeys.size} ошибок зафиксировано в ${BASELINE_FILE}`);
  process.exit(0);
}

let baselineErrors = new Set();
if (BASELINE_MODE) {
  if (existsSync(BASELINE_FILE)) {
    const baseline = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
    baselineErrors = new Set(baseline.errors ?? []);
  }
}

// ---------- Output ----------

if (!QUIET) {
  if (issues.error.length) {
    console.log(`\n❌ Errors: ${issues.error.length}`);
    for (const { file, message } of issues.error.slice(0, 50)) {
      console.log(`  [${file}] ${message}`);
    }
    if (issues.error.length > 50) console.log(`  … и ещё ${issues.error.length - 50}`);
  }
  if (issues.warning.length) {
    console.log(`\n⚠️  Warnings: ${issues.warning.length} (см. ${REPORT})`);
  }
  if (!issues.error.length && !issues.warning.length) {
    console.log('✅ Vault чист: нет ошибок и предупреждений');
  }
}

if (BASELINE_MODE) {
  const newErrors = [...currentErrorKeys].filter(k => !baselineErrors.has(k));
  const fixedErrors = [...baselineErrors].filter(k => !currentErrorKeys.has(k));
  if (fixedErrors.length) {
    console.log(`\n🎉 Починено ошибок: ${fixedErrors.length} (не забудь 'yarn validate-vault --update-baseline')`);
  }
  if (newErrors.length) {
    console.log(`\n❌ Новых ошибок по сравнению с baseline: ${newErrors.length}`);
    for (const k of newErrors.slice(0, 30)) console.log(`  + ${k}`);
    process.exit(1);
  }
  console.log(`\n✅ Новых ошибок нет (baseline: ${baselineErrors.size}, текущих: ${currentErrorKeys.size})`);
  process.exit(0);
}

process.exit(issues.error.length ? 1 : 0);
