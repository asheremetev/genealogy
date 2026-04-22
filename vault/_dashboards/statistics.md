---
тип: дашборд
название: Статистика
---

# 📊 Статистика

Обзор объёма и покрытия данных. Не ошибки — а просто числа.

> [[main-dashboard|← Главная]] · [[data-quality|🔍 Качество]] · [[research-progress|🎯 Прогресс]] · [[data-schema|📐 Схема]]

---

## 🔢 Общий объём

```dataviewjs
const count = (folder, type) =>
  dv.pages(`"${folder}"`).where(p => p.тип === type).length;

dv.table(
  ["👤 Персон", "👨‍👩‍👧 Семей", "📅 Событий", "📄 Источников", "📍 Мест", "📖 Историй"],
  [[
    count("persons", "персона"),
    count("families", "семья"),
    count("events", "событие"),
    count("sources", "источник"),
    count("places", "место"),
    count("stories", "история")
  ]]
);
```

---

## 👤 Полнота по персонам

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const total = persons.length;
const pct = n => total > 0 ? `${Math.round(n / total * 100)}%` : "—";

const stats = [
  ["Есть дата рождения", persons.where(p => p.дата_рождения).length],
  ["Есть отец", persons.where(p => p.отец).length],
  ["Есть мать", persons.where(p => p.мать).length],
  ["Пол известен", persons.where(p => p.пол && p.пол !== "неизвестно").length],
  ["Высокая достоверность", persons.where(p => p.достоверность === "высокая").length],
  ["Место рождения известно", persons.where(p => p.место_рождения).length],
];

dv.table(
  ["Показатель", "Кол-во", "% от " + total],
  stats.map(([k, v]) => [k, v, pct(v)])
);
```

---

## 🌳 Поколения

```dataview
TABLE WITHOUT ID
  поколение AS "Пок.",
  length(rows) AS "Всего",
  length(filter(rows, (r) => r.пол = "М")) AS "М",
  length(filter(rows, (r) => r.пол = "Ж")) AS "Ж",
  length(filter(rows, (r) => r.достоверность = "высокая")) AS "Выс. дост.",
  length(filter(rows, (r) => r.отец)) AS "Есть отец",
  length(filter(rows, (r) => r.мать)) AS "Есть мать"
FROM "persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
```

---

## 📄 Источники по категориям

```dataviewjs
const sources = dv.pages('"sources"').where(s => s.тип === "источник");
const counts = {};
sources.forEach(s => {
  const cat = s.категория || "(не указана)";
  counts[cat] = (counts[cat] || 0) + 1;
});

const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
dv.table(["Категория", "Кол-во"], rows);
dv.paragraph(`**Всего источников:** ${sources.length}`);
```

### Покрытие персон источниками по поколениям

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const sources = dv.pages('"sources"').where(s => s.тип === "источник");

const sourcedPaths = new Set();
sources.forEach(s => {
  if (!s.персоны) return;
  (Array.isArray(s.персоны) ? s.персоны : [s.персоны])
    .forEach(per => { if (per?.path) sourcedPaths.add(per.path); });
});

const gens = {};
persons.forEach(p => {
  const g = p.поколение ?? "?";
  if (!gens[g]) gens[g] = { total: 0, sourced: 0 };
  gens[g].total++;
  if (sourcedPaths.has(p.file.path)) gens[g].sourced++;
});

const rows = Object.entries(gens)
  .sort((a, b) => Number(a[0]) - Number(b[0]))
  .map(([g, { total, sourced }]) => [g, total, sourced, `${Math.round(sourced / total * 100)}%`]);

dv.table(["Поколение", "Всего", "С источниками", "%"], rows);
```

---

## 📍 Места по регионам

```dataviewjs
const places = dv.pages('"places"').where(p => p.тип === "место");
const regions = {};

places.forEach(p => {
  const r = p.регион_сейчас || p.регион_исторически || "(регион не указан)";
  if (!regions[r]) regions[r] = { total: 0, withCoords: 0 };
  regions[r].total++;
  if (p.широта && p.долгота) regions[r].withCoords++;
});

const rows = Object.entries(regions)
  .sort((a, b) => b[1].total - a[1].total)
  .map(([r, { total, withCoords }]) => [r, total, withCoords, total - withCoords]);

dv.table(["Регион", "Всего", "С коорд.", "Без коорд."], rows);
```

---

## 🕐 Последние изменения

```dataview
TABLE WITHOUT ID
  file.link AS "Заметка",
  file.folder AS "Раздел",
  file.mday AS "Изменено"
FROM "persons" OR "families" OR "sources" OR "places" OR "stories" OR "events"
SORT file.mday DESC
LIMIT 15
```
