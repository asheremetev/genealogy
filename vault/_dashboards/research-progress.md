---
тип: дашборд
название: Прогресс исследования
---

# 🎯 Прогресс исследования

Что ещё нужно найти. Не ошибки — а **список работы**.
Ошибки смотри в [[data-quality|🔍 Качестве данных]].

> [[main-dashboard|← Главная]] · [[data-quality|🔍 Качество]] · [[statistics|📊 Статистика]] · [[data-schema|📐 Схема]]

---

## 📋 Приоритетные задачи

Персоны с высоким приоритетом или не начатым исследованием.

```dataviewjs
const rows = dv.pages('"persons"')
  .where(p => p.тип === "персона" && (p.приоритет === "высокий" || p.статус_исследования === "не_начато"))
  .sort(p => [p.приоритет, p.поколение])
  .limit(25);

if (rows.length > 0) {
  dv.table(
    ["Персона", "Пок.", "Приоритет", "Статус", "Дост."],
    rows.map(p => [p.file.link, p.поколение, p.приоритет, p.статус_исследования, p.достоверность])
  );
} else {
  dv.paragraph("✅ Нет приоритетных или не начатых задач");
}
```

---

## 📈 Статус исследования по поколениям

Сводная таблица — всегда полезна, даже если всё исследовано.

```dataview
TABLE WITHOUT ID
  поколение AS "Пок.",
  length(rows) AS "Всего",
  length(filter(rows, (r) => r.статус_исследования = "полностью")) AS "✅ Полностью",
  length(filter(rows, (r) => r.статус_исследования = "частично")) AS "🔶 Частично",
  length(filter(rows, (r) => r.статус_исследования = "начато")) AS "🔷 Начато",
  length(filter(rows, (r) => r.статус_исследования = "не_начато" OR !r.статус_исследования)) AS "⬜ Нет"
FROM "persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
```

---

## 🔴 Ключевые генеалогические данные

Здесь — поля, которые не обязательны по [[data-schema|схеме]], но критически важны
для генеалогии. Их отсутствие — работа, а не ошибка.
Обязательные поля схемы (`имя`, `пол`, `поколение`, `достоверность`) проверяются в [[data-quality#Персоны-незаполнены-обязательные-поля-схемы|Качестве данных]].

### Без даты рождения

```dataviewjs
const rows = dv.pages('"persons"')
  .where(p => p.тип === "персона" && !p.дата_рождения)
  .sort(p => p.поколение);

if (rows.length > 0) {
  dv.table(["Персона", "Пок.", "Дост."],
    rows.map(p => [p.file.link, p.поколение, p.достоверность]));
} else {
  dv.paragraph("✅ У всех персон указана дата рождения");
}
```

### Без родителей (поколение > 0)

```dataviewjs
const rows = dv.pages('"persons"')
  .where(p => p.тип === "персона" && p.поколение > 0 && !p.отец && !p.мать)
  .sort(p => p.поколение);

if (rows.length > 0) {
  dv.table(["Персона", "Пок.", "Приоритет"],
    rows.map(p => [p.file.link, p.поколение, p.приоритет]));
} else {
  dv.paragraph("✅ У всех персон с поколением > 0 указан хотя бы один родитель");
}
```

### Замужние женщины без фамилии при рождении

```dataviewjs
const marriedWivesPaths = new Set(
  dv.pages('"families"')
    .where(f => f.тип === "семья" && f.жена?.path)
    .map(f => f.жена.path)
    .array()
);

const women = dv.pages('"persons"').where(p =>
  p.тип === "персона" &&
  p.пол === "Ж" &&
  !p.фамилия_при_рождении &&
  marriedWivesPaths.has(p.file.path)
);

if (women.length > 0) {
  dv.table(["Персона", "Текущая фамилия", "Поколение"],
    women.map(p => [p.file.link, p.фамилия, p.поколение]));
} else {
  dv.paragraph("✅ У всех замужних женщин указана фамилия при рождении");
}
```

---

## 🟡 Факультативная полнота

### Жив = "нет", но нет даты смерти

```dataviewjs
const rows = dv.pages('"persons"')
  .where(p => p.тип === "персона" && p.жив === "нет" && !p.дата_смерти)
  .sort(p => p.поколение);

if (rows.length > 0) {
  dv.table(["Персона", "Пок."], rows.map(p => [p.file.link, p.поколение]));
} else {
  dv.paragraph("✅ У всех умерших указана дата смерти (или она неизвестна — жив = «неизвестно»)");
}
```

### Статус брака "развод", но нет даты развода

```dataviewjs
const rows = dv.pages('"families"')
  .where(f => f.тип === "семья" && f.статус_брака === "развод" && !f.дата_развода);

if (rows.length > 0) {
  dv.table(["Семья", "Муж", "Жена"], rows.map(f => [f.file.link, f.муж, f.жена]));
} else {
  dv.paragraph("✅ У всех разводов указана дата");
}
```

### Семьи без даты брака

```dataviewjs
const rows = dv.pages('"families"')
  .where(f => f.тип === "семья" && f.муж && f.жена && !f.дата_брака);

if (rows.length > 0) {
  dv.table(["Семья", "Муж", "Жена"], rows.map(f => [f.file.link, f.муж, f.жена]));
} else {
  dv.paragraph("✅ У всех семей указана дата брака");
}
```

### Места без координат

```dataviewjs
const rows = dv.pages('"places"')
  .where(p => p.тип === "место" && (!p.широта || !p.долгота))
  .sort(p => p.file.name);

if (rows.length > 0) {
  dv.table(["Место", "Тип", "Страна"],
    rows.map(p => [p.file.link, p.тип_места, p.страна_сейчас]));
} else {
  dv.paragraph("✅ У всех мест есть координаты");
}
```

---

## 📄 Работа с источниками

### Источники без привязки к персонам

```dataviewjs
const rows = dv.pages('"sources"')
  .where(s => s.тип === "источник" && (!s.персоны || (Array.isArray(s.персоны) && s.персоны.length === 0)));

if (rows.length > 0) {
  dv.table(["Источник", "Тип", "Год"],
    rows.map(s => [s.file.link, s.категория, s.год_документа]));
} else {
  dv.paragraph("✅ Все источники привязаны к персонам");
}
```

### Персоны без источников

Приоритет — ранние поколения.

```dataviewjs
const sourcedPaths = new Set();
dv.pages('"sources"').where(s => s.тип === "источник").forEach(s => {
  if (!s.персоны) return;
  (Array.isArray(s.персоны) ? s.персоны : [s.персоны])
    .forEach(per => { if (per?.path) sourcedPaths.add(per.path); });
});

const unsourced = dv.pages('"persons"')
  .where(p => p.тип === "персона" && !sourcedPaths.has(p.file.path))
  .sort(p => p.поколение);

if (unsourced.length > 0) {
  dv.table(["Персона", "Поколение"],
    unsourced.map(p => [p.file.link, p.поколение]));
} else {
  dv.paragraph("✅ Все персоны связаны с источниками");
}
```

### Требуют оцифровки

```dataviewjs
const rows = dv.pages('"sources"')
  .where(s => s.тип === "источник" && (s.оцифровано === "нет" || s.оцифровано === "частично"))
  .sort(s => s.год_документа);

if (rows.length > 0) {
  dv.table(["Документ", "Архив", "Фонд", "Оцифр."],
    rows.map(s => [s.file.link, s.архив, s.фонд, s.оцифровано]));
} else {
  dv.paragraph("✅ Все источники оцифрованы");
}
```

---

## ⚠️ Низкая достоверность

```dataviewjs
const rows = dv.pages('"persons"')
  .where(p => p.тип === "персона" && (p.достоверность === "предположение" || p.достоверность === "низкая"))
  .sort(p => p.поколение);

if (rows.length > 0) {
  dv.table(["Персона", "Дост.", "Пок.", "Статус"],
    rows.map(p => [p.file.link, p.достоверность, p.поколение, p.статус_исследования]));
} else {
  dv.paragraph("✅ У всех персон средняя или высокая достоверность");
}
```
