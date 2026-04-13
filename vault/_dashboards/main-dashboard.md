# 🌳 Главная панель

> Закрепи эту заметку (`Pin`) или установи как стартовую.
>
> [[data-quality|Качество данных]] · [[scenarios|Сценарии]] · [[data-schema|Схема данных]] · [[persons-list|Все персоны]]

---

## 📊 Статистика

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона").length;
const families = dv.pages('"families"').where(p => p.тип === "семья").length;
const sources = dv.pages('"sources"').where(p => p.тип === "источник").length;
const places = dv.pages('"places"').where(p => p.тип === "место").length;
const stories = dv.pages('"stories"').where(p => p.тип === "история").length;
const events = dv.pages('"events"').where(p => p.тип === "событие").length;

dv.table(
  ["👤 Персон", "👨‍👩‍👧 Семей", "📄 Источников", "📍 Мест", "📖 Историй", "📅 Событий"],
  [[persons, families, sources, places, stories, events]]
);
```

---

## ⚠️ Требуют внимания

### Низкая достоверность

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  достоверность AS "Достоверность",
  поколение AS "Поколение"
FROM "persons"
WHERE достоверность = "предположение" OR достоверность = "низкая"
SORT поколение ASC
LIMIT 15
```

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const noBirth = persons.where(p => !p.дата_рождения).length;
const noParents = persons.where(p => p.поколение > 0 && !p.отец && !p.мать).length;
if (noBirth > 0 || noParents > 0) {
  dv.paragraph(`⚠️ Без даты рождения: **${noBirth}** · Без родителей (пок. > 0): **${noParents}** → [[data-quality|Подробнее]]`);
} else {
  dv.paragraph("✅ Даты рождения и родители заполнены у всех");
}
```

---

## 📄 Последние источники

```dataview
TABLE WITHOUT ID
  file.link AS "Источник",
  категория AS "Тип",
  год_документа AS "Год",
  оцифровано AS "Оцифр."
FROM "sources"
SORT file.cday DESC
LIMIT 10
```

### Требуют оцифровки

```dataview
TABLE WITHOUT ID
  file.link AS "Документ",
  архив AS "Архив",
  фонд AS "Фонд"
FROM "sources"
WHERE оцифровано = "нет" OR оцифровано = "частично"
SORT год_документа ASC
LIMIT 10
```

---

## 🗺️ Места

```dataview
TABLE WITHOUT ID
  file.link AS "Место",
  тип_места AS "Тип",
  существует AS "Сущ.",
  широта AS "Шир.",
  долгота AS "Долг."
FROM "places"
SORT file.name ASC
```

---

## ✅ Открытые задачи

```dataview
TASK
FROM "persons" OR "sources" OR "places" OR "reports"
WHERE !completed
LIMIT 25
```

---

## 🕐 Последние изменения

```dataview
TABLE WITHOUT ID
  file.link AS "Заметка",
  file.folder AS "Раздел",
  file.mday AS "Изменено"
FROM "persons" OR "families" OR "sources" OR "places" OR "stories"
SORT file.mday DESC
LIMIT 10
```

---

## 🔗 Навигация

- 👥 [[persons-list|Все персоны и поколения]]
- 📂 [[data-quality|Качество данных]]
- 📓 [[research-log|Журнал исследования]]
- 📘 [[scenarios|Сценарии работы]]
- 📐 [[data-schema|Схема данных]]
- ⚙️ [[plugin-setup|Настройка плагинов]]
