#!/usr/bin/env node
/**
 * Obsidian Vault → family-chart JSON
 *
 * Читает заметки persons/ и families/ из хранилища Obsidian
 * и генерирует JSON в формате, совместимом с библиотекой family-chart.
 *
 * Использование:
 *   node scripts/parse-vault.js [путь_к_vault] [выходной_файл]
 *
 * По умолчанию:
 *   vault  = ../  (родительская директория, т.е. корень репозитория)
 *   output = public/family-chart-data.json
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import matter from 'gray-matter';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const vaultPath = resolve(process.argv[2] ?? join(__dirname, '../..'));
const outputPath = resolve(process.argv[3] ?? join(__dirname, '../public/family-chart-data.json'));

const PERSONS_DIR = join(vaultPath, 'persons');
const FAMILIES_DIR = join(vaultPath, 'families');

// Преобразует значение даты (строка или Date) в формат YYYY-MM-DD
function formatDate(value) {
    if (!value) {
        return '';
    }

    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    return String(value);
}

// Извлекает имя файла из Obsidian-ссылки [[Имя]] или возвращает plain-text
function extractLink(value) {
    if (!value) {
        return null;
    }

    const s = String(value).trim();
    const match = s.match(/\[\[\s*([^\]|]+?)\s*\]\]/);
    return match ? match[1].trim() : s || null;
}

// Загружает все .md файлы из директории, возвращает массив { id, frontmatter }
function loadMdFiles(dir) {
    let files;
    try {
        files = readdirSync(dir).filter((f) => f.endsWith('.md'));
    } catch {
        console.warn(`Предупреждение: директория не найдена: ${dir}`);
        return [];
    }

    return files.map((file) => {
        const content = readFileSync(join(dir, file), 'utf-8');
        const { data } = matter(content);
        const id = file.replace(/\.md$/, '').trim();
        return { id, frontmatter: data };
    });
}

// ─── Загрузка данных ───────────────────────────────────────────────────────

const personEntries = loadMdFiles(PERSONS_DIR);
const familyEntries = loadMdFiles(FAMILIES_DIR);

// Map: id (имя файла без .md) → запись персоны
const personsById = new Map(personEntries.map((p) => [p.id, p]));

// ─── Построение узлов ──────────────────────────────────────────────────────

const nodes = personEntries.map(({ id, frontmatter: fm }) => {
    const gender = fm['пол'] === 'М' ? 'M' : 'F';

    const birthDate = formatDate(fm['дата_рождения']);
    const deathDate = formatDate(fm['дата_смерти']);

    const fatherLink = extractLink(fm['отец']);
    const motherLink = extractLink(fm['мать']);

    const parents = [fatherLink, motherLink].filter((link) => link && personsById.has(link));

    return {
        id,
        data: {
            gender,
            firstName: fm['имя'] || '',
            lastName:
                gender === 'F'
                    ? fm['фамилия_при_рождении'] || fm['фамилия'] || ''
                    : fm['фамилия'] || '',
            patronymic: fm['отчество'] || '',
            birthDate,
            deathDate,
            birthPlace: extractLink(fm['место_рождения']) || '',
            deathPlace: extractLink(fm['место_смерти']) || '',
            generation: fm['поколение'] ?? null,
            alive: fm['жив'] === 'да',
            reliability: fm['достоверность'] || '',
            religion: fm['религия'] || '',
            marriages: {},
        },
        rels: {
            parents,
            children: [],
            spouses: [],
        },
    };
});

// Map: id → узел для быстрого доступа
const nodesById = new Map(nodes.map((n) => [n.id, n]));

// ─── Заполнение children ───────────────────────────────────────────────────
// Дети вычисляются из полей отец/мать у персон

for (const node of nodes) {
    for (const parentId of node.rels.parents) {
        const parent = nodesById.get(parentId);
        if (parent && !parent.rels.children.includes(node.id)) {
            parent.rels.children.push(node.id);
        }
    }
}

// ─── Заполнение spouses и marriages из семей ───────────────────────────────

for (const { frontmatter: fm } of familyEntries) {
    const husbandId = extractLink(fm['муж']);
    const wifeId = extractLink(fm['жена']);

    if (!husbandId || !wifeId) {
        continue;
    }

    const husband = nodesById.get(husbandId);
    const wife = nodesById.get(wifeId);

    if (!husband || !wife) {
        const missing = [];
        if (!husband && husbandId) {
            missing.push(`муж: "${husbandId}"`);
        }
        if (!wife && wifeId) {
            missing.push(`жена: "${wifeId}"`);
        }
        console.warn(`Предупреждение: персона не найдена (${missing.join(', ')})`);
        continue;
    }

    if (!husband.rels.spouses.includes(wifeId)) {
        husband.rels.spouses.push(wifeId);
    }
    if (!wife.rels.spouses.includes(husbandId)) {
        wife.rels.spouses.push(husbandId);
    }

    const marriageDate = formatDate(fm['дата_брака']);
    if (marriageDate) {
        husband.data.marriages ??= {};
        husband.data.marriages[wifeId] = marriageDate;
        wife.data.marriages ??= {};
        wife.data.marriages[husbandId] = marriageDate;
    }
}

// ─── Запись результата ────────────────────────────────────────────────────

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(nodes, null, 2), 'utf-8');

console.log(`✓ Сгенерировано ${nodes.length} персон`);
console.log(`✓ Обработано ${familyEntries.length} семей`);
console.log(`✓ Записано в: ${outputPath}`);
