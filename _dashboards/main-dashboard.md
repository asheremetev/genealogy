# 🌳 Главная панель

> Закрепи эту заметку (`Pin`) или установи как стартовую.
>
> [Качество данных](_dashboards/data-quality.md) · [Сценарии](_config/scenarios.md) · [Схема данных](_schema/data-schema.md)

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

### Нет даты рождения

```dataview
LIST
FROM "persons"
WHERE тип = "персона" AND !дата_рождения
LIMIT 15
```

### Нет родителей (поколение > 0)

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  поколение AS "Поколение"
FROM "persons"
WHERE тип = "персона" AND (!отец AND !мать) AND поколение > 0
SORT поколение ASC
LIMIT 15
```

---

## 👥 Все персоны

```dataview
TABLE WITHOUT ID
  file.link AS "Имя",
  поколение AS "Пок.",
  дата_рождения AS "Рождение",
  место_рождения AS "Место",
  дата_смерти AS "Смерть",
  достоверность AS "Дост."
FROM "persons"
WHERE тип = "персона"
SORT поколение ASC, дата_рождения ASC
```

---

## 📋 Прогресс по поколениям

```dataview
TABLE WITHOUT ID
  поколение AS "Поколение",
  length(rows) AS "Найдено",
  length(filter(rows, (r) => r.достоверность = "высокая")) AS "Выс. дост.",
  length(filter(rows, (r) => r.отец)) AS "Есть отец",
  length(filter(rows, (r) => r.мать)) AS "Есть мать"
FROM "persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
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
  существует AS "Сущ."
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

- 📂 [persons](persons/) — все персоны
- 📂 [families](families/) — семьи
- 📂 [places](places/) — места
- 📂 [sources](sources/) — источники
- 📂 [stories](stories/) — истории
- 📂 [events](events/) — события
- 📓 [Журнал исследования](reports/research-log.md)
- ⚙️ [Настройка плагинов](_config/plugin-setup.md)
- 📘 [Сценарии](_config/scenarios.md)
