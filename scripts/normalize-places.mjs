#!/usr/bin/env node
// Приводит все файлы vault/places/*.md к единому шаблону _templates/place.md.
// Сохраняет frontmatter и уникальный текст разделов:
//   - ## 📚 История места
//   - ## 🏛️ Где искать документы (таблица)
//   - ## 📝 Примечания
// Остальная структура (заголовки, dataview/dataviewjs блоки) перезаписывается.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACES_DIR = join(__dirname, '..', 'vault', 'places');

/**
 * Делит файл на frontmatter (как есть, включая ограничители ---) и тело.
 * Не парсит YAML — сохраняет исходное форматирование.
 */
function splitFrontmatter(raw) {
    const match = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
    if (!match) {
        return { frontmatter: '', body: raw };
    }
    return { frontmatter: match[1], body: match[2] };
}

function extractTitle(body) {
    const match = body.match(/^#\s+(.+?)\s*$/m);
    return match ? match[1] : '';
}

/**
 * Извлекает содержимое раздела уровня H2 по заголовку.
 * Возвращает текст между заголовком и следующим H2 (без самого заголовка).
 */
function extractSection(body, heading) {
    const re = new RegExp(
        `^##\\s+${heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*$([\\s\\S]*?)(?=^##\\s+|\\z)`,
        'm',
    );
    const match = body.match(re);
    return match ? match[1].trim() : '';
}

function buildBody(title, history, documents, notes) {
    const historyBlock = history || '> Краткая история, административная принадлежность в разные эпохи.';
    const documentsBlock =
        documents ||
        [
            '| Ресурс              | Ссылка / описание |',
            '| ------------------- | ----------------- |',
            '| Архив               |                   |',
            '| Фонд                |                   |',
            '| FamilySearch        |                   |',
            '| Региональный портал |                   |',
        ].join('\n');
    const notesBlock = notes ? `\n${notes}\n` : '';

    return `# ${title}

> [Главная](_dashboards/main-dashboard.md) · [Качество данных](_dashboards/data-quality.md) · [Схема полей](_schema/data-schema.md)

## 📍 Географические данные

| Поле                              | Значение                                                 |
| --------------------------------- | -------------------------------------------------------- |
| **Тип**                           | \`= this.тип_места\`                                       |
| **Современное название**          | \`= this.современное_название\`                            |
| **Страна / регион (сейчас)**      | \`= this.страна_сейчас\`, \`= this.регион_сейчас\`           |
| **Страна / регион (исторически)** | \`= this.страна_исторически\`, \`= this.регион_исторически\` |
| **Координаты**                    | \`= this.широта\`, \`= this.долгота\`                        |
| **Существует**                    | \`= this.существует\`                                      |

## 🗺️ Карта

\`\`\`dataviewjs
const page = dv.current();
if (!page) {
    dv.paragraph("⚠️ Не удалось получить данные страницы");
} else {
    const lat = page.широта;
    const lng = page.долгота;

    if (lat && lng) {
        const name = page.название || page.file.name;

        dv.paragraph(\`📍 **Координаты:** \${lat}, \${lng}\`);
        dv.paragraph(\`🔗 [OpenStreetMap](https://www.openstreetmap.org/?mlat=\${lat}&mlon=\${lng}#map=14/\${lat}/\${lng}) · [Google Maps](https://www.google.com/maps/@\${lat},\${lng},14z)\`);

        dv.paragraph(\`
\\\`\\\`\\\`leaflet
id: map-\${page.file.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '-')}
height: 400px
coordinates: [\${lat}, \${lng}]
zoom: 12
marker: default, \${lat}, \${lng}, "\${name}"
\\\`\\\`\\\`
        \`);
    } else {
        dv.paragraph("⚠️ Укажи координаты в полях \`широта\` и \`долгота\`");
        dv.paragraph("💡 Как найти: Google Maps → ПКМ на точке → скопировать координаты");
    }
}
\`\`\`

## 👥 Связанные персоны

### Родились здесь

\`\`\`dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  дата_рождения AS "Дата"
FROM "persons"
WHERE место_рождения = this.file.link
SORT дата_рождения ASC
\`\`\`

### Умерли здесь

\`\`\`dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  дата_смерти AS "Дата"
FROM "persons"
WHERE место_смерти = this.file.link
SORT дата_смерти ASC
\`\`\`

### Жили здесь

\`\`\`dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  дата_рождения AS "Рождение",
  дата_смерти AS "Смерть"
FROM "persons"
WHERE contains(места_жизни, this.file.link)
SORT дата_рождения ASC
\`\`\`

### Венчались здесь

\`\`\`dataview
TABLE WITHOUT ID
  file.link AS "Семья",
  дата_брака AS "Дата"
FROM "families"
WHERE место_венчания = this.file.link
SORT дата_брака ASC
\`\`\`

### События здесь

\`\`\`dataview
TABLE WITHOUT ID
  вид_события AS "Тип",
  дата AS "Дата",
  file.link AS "Событие"
FROM "events"
WHERE место = this.file.link
SORT дата ASC
\`\`\`

## 📚 История места

${historyBlock}

## 🏛️ Где искать документы

${documentsBlock}

## 📝 Примечания
${notesBlock}`;
}

async function normalizeFile(filePath) {
    const raw = await readFile(filePath, 'utf8');
    const { frontmatter, body } = splitFrontmatter(raw);

    const history = extractSection(body, '📚 История места');
    const documents = extractSection(body, '🏛️ Где искать документы');
    const notes = extractSection(body, '📝 Примечания');

    const fileName = filePath.split('/').pop().replace(/\.md$/, '');
    const title = extractTitle(body) || fileName;

    const newBody = buildBody(title, history, documents, notes);
    const output = `${frontmatter}\n${newBody}`;

    await writeFile(filePath, output, 'utf8');
    return { file: filePath, hasHistory: !!history, hasDocs: !!documents };
}

async function main() {
    const files = (await readdir(PLACES_DIR))
        .filter((name) => name.endsWith('.md'))
        .map((name) => join(PLACES_DIR, name));

    console.log(`Нормализую ${files.length} файлов в ${PLACES_DIR}`);
    for (const file of files) {
        const result = await normalizeFile(file);
        const flags = [result.hasHistory ? 'история' : '—', result.hasDocs ? 'документы' : '—'].join(', ');
        console.log(`  ✓ ${file.split('/').pop()}  [${flags}]`);
    }
    console.log('Готово.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
